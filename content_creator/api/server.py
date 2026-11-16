import logging
import mimetypes
import os
import re
import socket
import sys
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from content_creator.config.settings import DEFAULT_PORTS, OUTPUT_DIR, PROJECT_LOCAL_ROOT
from content_creator.routes.assets import post_add_asset_to_group, post_create_asset_group
from content_creator.routes.audiobook import (
    post_audiobook_analyze,
    post_audiobook_assemble,
    post_audiobook_extract,
    post_audiobook_prompts,
    post_audiobook_render,
    post_audiobook_status,
    post_audiobook_voice_sample,
)
from content_creator.routes.skills import post_skills_get, post_skills_list
from content_creator.routes.blender import (
    post_blender_capabilities,
    post_blender_render,
    post_blender_status,
    post_blender_write_script,
)
from content_creator.routes.character_sheet import post_generate, post_sheet_inspect, post_sheet_start, post_sheet_status
from content_creator.routes.character_generator import post_i2i, post_t2i
from content_creator.routes.script_to_prompt import post_script_to_prompt
from content_creator.routes.system import post_capabilities, post_models
from content_creator.routes.video_generation import (
    post_audio_black_video,
    post_combine,
    post_extract_last_frame,
    post_finalize_draft,
    post_start,
    post_status,
    post_upload_asset,
    post_upload_local,
)
from content_creator.routes.seedream_studio import post_seedream_config, post_seedream_generate, post_seedream_save_image
from content_creator.routes.seed_audio import post_seed_audio_config, post_seed_audio_generate, post_seed_audio_optimize, post_seed_audio_replace_audio, post_seed_audio_upload, post_seed_audio_upload_video
from content_creator.routes.skeleton import post_skeleton_generate
from content_creator.routes.motion_blockout import (
    post_motion_blockout_generate,
)
from content_creator.routes.video_editor import post_video_editor_export, post_video_editor_status
from content_creator.routes.hybrid_studio import (
    post_hybrid_analyze,
    post_hybrid_probe,
    post_hybrid_background,
    post_hybrid_finalize,
)
from content_creator.routes.seed_audio_10 import post_seed_audio_10_config, post_seed_audio_10_generate
from content_creator.routes.visual_understanding import post_vu_analyze, post_vu_config, post_vu_video_to_prompt
from content_creator.routes.film_tools import (
    post_mask,
    post_previz_plan,
    post_previz_schematic,
    post_previz_schematic_edit,
    post_previz_animatic_prompt,
    post_previz_cut_prompt,
    post_location_plan,
    post_location_render,
)
from content_creator.routes.video_enhancer import (
    post_video_enhancer_config,
    post_video_enhancer_save,
    post_video_enhancer_submit,
    post_video_enhancer_task,
    post_video_enhancer_upload,
)
from content_creator.routes.text_overlay import post_text_overlay_generate
from content_creator.routes.storyboard import post_storyboard_generate, post_storyboard_prompt
from content_creator.routes.project_storage import (
    post_create_project_folder,
    post_load_projects,
    post_save_projects,
    post_delete_project_folder_file,
    post_list_project_folder,
    post_save_to_project_folder,
)
from content_creator.utils.http import json_response, read_json_body



log = logging.getLogger("content_creator.server")

def _pick_host() -> str:
    return "127.0.0.1"


def _pick_port() -> int:
    for port in DEFAULT_PORTS:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind((_pick_host(), port))
                return port
            except OSError:
                continue
    if len(DEFAULT_PORTS) == 1:
        raise RuntimeError(f"Port {DEFAULT_PORTS[0]} is not available. Stop the process using it and try again.")
    return 0


def make_handler(*, index_html) -> type[BaseHTTPRequestHandler]:
    def index_bytes_now() -> bytes:
        return (index_html() if callable(index_html) else index_html).encode("utf-8")
    static_dir = Path(__file__).resolve().parents[2] / "static"

    class Handler(BaseHTTPRequestHandler):
        def _serve_static(self, name: str, method: str) -> None:
            # Precompiled frontend (scripts/build-frontend.js); "?v=" only busts the browser cache.
            if name.startswith("build/"):
                build_name = os.path.basename(name.split("?")[0])
                build_path = static_dir / "build" / build_name
                if not build_name or not build_path.is_file():
                    self.send_error(HTTPStatus.NOT_FOUND)
                    return
                self._send_file(str(build_path), build_name, method)
                return
            name = os.path.basename(name)
            if not name:
                self.send_error(HTTPStatus.NOT_FOUND)
                return
            path = static_dir / name
            if not path.exists() or not path.is_file():
                self.send_error(HTTPStatus.NOT_FOUND)
                return
            if name.endswith(".js") or name.endswith(".jsx"):
                content_type = "application/javascript; charset=utf-8"
            elif name.endswith(".css"):
                content_type = "text/css; charset=utf-8"
            else:
                content_type = mimetypes.guess_type(name)[0] or "application/octet-stream"
            size = path.stat().st_size
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(size))
            if name.endswith((".jsx", ".css")):
                self.send_header("Cache-Control", "no-store")
            self.end_headers()
            if method == "GET":
                self.wfile.write(path.read_bytes())

        def _send_file(self, path: str, name: str, method: str) -> None:
            """Serves a file with HTTP Range support, which browsers need to seek
            inside <video>/<audio> (the Video Editor and every preview player)."""
            size = os.path.getsize(path)
            start, end = 0, size - 1
            status = HTTPStatus.OK
            m = re.match(r"bytes=(\d*)-(\d*)$", (self.headers.get("Range") or "").strip())
            if m and (m.group(1) or m.group(2)) and size:
                if m.group(1):
                    start = int(m.group(1))
                    end = min(int(m.group(2)), size - 1) if m.group(2) else size - 1
                else:  # suffix range: the last N bytes
                    start = max(0, size - int(m.group(2)))
                if start > end or start >= size:
                    self.send_response(HTTPStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
                    self.send_header("Content-Range", f"bytes */{size}")
                    self.end_headers()
                    return
                status = HTTPStatus.PARTIAL_CONTENT
            self.send_response(status)
            self.send_header("Content-Type", mimetypes.guess_type(name)[0] or "application/octet-stream")
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("Content-Length", str(end - start + 1))
            if status == HTTPStatus.PARTIAL_CONTENT:
                self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
            self.end_headers()
            if method != "GET":
                return
            try:
                with open(path, "rb") as f:
                    f.seek(start)
                    left = end - start + 1
                    while left > 0:
                        chunk = f.read(min(1024 * 1024, left))
                        if not chunk:
                            break
                        self.wfile.write(chunk)
                        left -= len(chunk)
            except (BrokenPipeError, ConnectionResetError):
                pass  # The player cancelled the request, e.g. after a seek.

        def do_HEAD(self) -> None:
            if self.path.startswith("/static/"):
                self._serve_static(self.path[len("/static/") :], "HEAD")
                return
            if self.path.startswith("/files/"):
                name = self.path[len("/files/") :]
                name = os.path.basename(name)
                if not name:
                    self.send_error(HTTPStatus.NOT_FOUND)
                    return
                path = os.path.join(OUTPUT_DIR, name)
                if not os.path.isfile(path):
                    self.send_error(HTTPStatus.NOT_FOUND)
                    return
                self._send_file(path, name, "HEAD")
                return
            if self.path.startswith("/project-files/"):
                rest = self.path[len("/project-files/") :]
                project_slug, _, name = rest.partition("/")
                project_slug = os.path.basename(project_slug)
                name = os.path.basename(name)
                if not project_slug or not name:
                    self.send_error(HTTPStatus.NOT_FOUND)
                    return
                path = os.path.join(PROJECT_LOCAL_ROOT, project_slug, name)
                if not os.path.isfile(path):
                    self.send_error(HTTPStatus.NOT_FOUND)
                    return
                self._send_file(path, name, "HEAD")
                return

            if self.path not in ("/", "/index.html"):
                self.send_error(HTTPStatus.NOT_FOUND)
                return
            index_bytes = index_bytes_now()
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(index_bytes)))
            self.end_headers()

        def _serve_download(self) -> None:
            """GET /download?url=...&name=... — saves any result under the name the app chose
            ("<project>-<model>.<ext>"). Local results (/files/, /project-files/) are read from disk;
            remote results (http/https, e.g. BytePlus links) are streamed through, because browsers
            ignore a download name on links to other sites."""
            import urllib.parse
            import urllib.request

            q = urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query)
            src = (q.get("url") or [""])[0].strip()
            name = os.path.basename((q.get("name") or [""])[0].strip().replace("\\", "/")) or "download"
            disposition = "attachment; filename*=UTF-8''" + urllib.parse.quote(name)
            ascii_name = re.sub(r'[^A-Za-z0-9._ -]+', "_", name)
            disposition = f'attachment; filename="{ascii_name}"; ' + disposition.split("; ", 1)[1]
            ctype = mimetypes.guess_type(name)[0] or "application/octet-stream"

            local = None
            path_part = urllib.parse.urlsplit(src).path if src.startswith(("http://127.0.0.1", "http://localhost")) else src
            if path_part.startswith("/files/"):
                local = os.path.join(OUTPUT_DIR, os.path.basename(urllib.parse.unquote(path_part[len("/files/"):].split("?")[0])))
            elif path_part.startswith("/project-files/"):
                slug, _, fname = urllib.parse.unquote(path_part[len("/project-files/"):].split("?")[0]).partition("/")
                local = os.path.join(PROJECT_LOCAL_ROOT, os.path.basename(slug), os.path.basename(fname))
            if local is not None:
                if not os.path.isfile(local):
                    self.send_error(HTTPStatus.NOT_FOUND)
                    return
                self.send_response(HTTPStatus.OK)
                self.send_header("Content-Type", ctype)
                self.send_header("Content-Length", str(os.path.getsize(local)))
                self.send_header("Content-Disposition", disposition)
                self.end_headers()
                with open(local, "rb") as f:
                    while True:
                        chunk = f.read(1 << 16)
                        if not chunk:
                            break
                        self.wfile.write(chunk)
                return
            if not src.startswith(("http://", "https://")):
                self.send_error(HTTPStatus.BAD_REQUEST, "url must be a /files/ path or an http(s) link")
                return
            try:
                with urllib.request.urlopen(urllib.request.Request(src, headers={"User-Agent": "ContentCreator"}), timeout=120) as r:
                    self.send_response(HTTPStatus.OK)
                    self.send_header("Content-Type", ctype if ctype != "application/octet-stream" else (r.headers.get("Content-Type") or ctype))
                    if r.headers.get("Content-Length"):
                        self.send_header("Content-Length", r.headers["Content-Length"])
                    self.send_header("Content-Disposition", disposition)
                    self.end_headers()
                    while True:
                        chunk = r.read(1 << 16)
                        if not chunk:
                            break
                        self.wfile.write(chunk)
            except Exception as e:  # noqa: BLE001 — report the failure as a plain HTTP error
                try:
                    self.send_error(HTTPStatus.BAD_GATEWAY, f"Could not fetch the file: {type(e).__name__}")
                except Exception:
                    pass

        def do_GET(self) -> None:
            if self.path.startswith("/download?"):
                self._serve_download()
                return
            if self.path.startswith("/static/"):
                self._serve_static(self.path[len("/static/") :], "GET")
                return
            if self.path.startswith("/files/"):
                name = self.path[len("/files/") :]
                name = os.path.basename(name)
                if not name:
                    self.send_error(HTTPStatus.NOT_FOUND)
                    return
                path = os.path.join(OUTPUT_DIR, name)
                if not os.path.isfile(path):
                    self.send_error(HTTPStatus.NOT_FOUND)
                    return
                self._send_file(path, name, "GET")
                return
            if self.path.startswith("/project-files/"):
                rest = self.path[len("/project-files/") :]
                project_slug, _, name = rest.partition("/")
                project_slug = os.path.basename(project_slug)
                name = os.path.basename(name)
                if not project_slug or not name:
                    self.send_error(HTTPStatus.NOT_FOUND)
                    return
                path = os.path.join(PROJECT_LOCAL_ROOT, project_slug, name)
                if not os.path.isfile(path):
                    self.send_error(HTTPStatus.NOT_FOUND)
                    return
                self._send_file(path, name, "GET")
                return

            if self.path not in ("/", "/index.html"):
                self.send_error(HTTPStatus.NOT_FOUND)
                return
            index_bytes = index_bytes_now()
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(index_bytes)))
            self.end_headers()
            self.wfile.write(index_bytes)

        def do_POST(self) -> None:
            json_routes = {
                "/api/system/capabilities": post_capabilities,
                "/api/system/models": post_models,
                "/api/assets/create_group": post_create_asset_group,
                "/api/assets/add_to_group": post_add_asset_to_group,
                "/api/video/start": post_start,
                "/api/hybrid/analyze": post_hybrid_analyze,
                "/api/hybrid/probe": post_hybrid_probe,
                "/api/hybrid/background": post_hybrid_background,
                "/api/hybrid/finalize": post_hybrid_finalize,
                "/api/visual-understanding/config": post_vu_config,
                "/api/visual-understanding/analyze": post_vu_analyze,
                "/api/visual-understanding/video-to-prompt": post_vu_video_to_prompt,
                "/api/video/status": post_status,
                "/api/video/finalize-draft": post_finalize_draft,
                "/api/video/combine": post_combine,
                "/api/video/audio_black": post_audio_black_video,
                "/api/video/upload_asset": post_upload_asset,
                "/api/video/upload_local": post_upload_local,
                "/api/video/extract_last_frame": post_extract_last_frame,
                "/api/skeleton/generate": post_skeleton_generate,
                "/api/t2i": post_t2i,
                "/api/i2i": post_i2i,
                "/api/character-sheet/start": post_sheet_start,
                "/api/character-sheet/inspect": post_sheet_inspect,
                "/api/character-sheet/status": post_sheet_status,
                "/api/storyboard/prompt": post_storyboard_prompt,
                "/api/storyboard/generate": post_storyboard_generate,
                "/api/film/mask": post_mask,
                "/api/film/previz/plan": post_previz_plan,
                "/api/film/previz/schematic": post_previz_schematic,
                "/api/film/previz/schematic-edit": post_previz_schematic_edit,
                "/api/film/previz/animatic-prompt": post_previz_animatic_prompt,
                "/api/film/previz/cut-prompt": post_previz_cut_prompt,
                "/api/film/location/plan": post_location_plan,
                "/api/film/location/render": post_location_render,
                "/api/text-overlay/generate": post_text_overlay_generate,
                "/api/seed-audio/config": post_seed_audio_config,
                "/api/seed-audio-10/config": post_seed_audio_10_config,
                "/api/seed-audio-10/generate": post_seed_audio_10_generate,
                "/api/seed-audio/upload": post_seed_audio_upload,
                "/api/seed-audio/generate": post_seed_audio_generate,
                "/api/seed-audio/optimize": post_seed_audio_optimize,
                "/api/seed-audio/replace-audio": post_seed_audio_replace_audio,
                "/api/seed-audio/upload-video": post_seed_audio_upload_video,
                "/api/blender/capabilities": post_blender_capabilities,
                "/api/motion-blockout/generate": post_motion_blockout_generate,
                "/api/video-editor/export": post_video_editor_export,
                "/api/video-editor/status": post_video_editor_status,
                "/api/video-enhancer/config": post_video_enhancer_config,
                "/api/video-enhancer/submit": post_video_enhancer_submit,
                "/api/video-enhancer/task": post_video_enhancer_task,
                "/api/video-enhancer/upload": post_video_enhancer_upload,
                "/api/video-enhancer/save": post_video_enhancer_save,
                "/api/seedream/config": post_seedream_config,
                "/api/audiobook/extract": post_audiobook_extract,
                "/api/skills/list": post_skills_list,
                "/api/skills/get": post_skills_get,
                "/api/audiobook/analyze": post_audiobook_analyze,
                "/api/audiobook/status": post_audiobook_status,
                "/api/audiobook/prompts": post_audiobook_prompts,
                "/api/audiobook/voice-sample": post_audiobook_voice_sample,
                "/api/audiobook/render": post_audiobook_render,
                "/api/audiobook/assemble": post_audiobook_assemble,
                "/api/seedream/generate": post_seedream_generate,
                "/api/seedream/save-image": post_seedream_save_image,
                "/api/blender/write-script": post_blender_write_script,
                "/api/blender/render": post_blender_render,
                "/api/blender/status": post_blender_status,
                "/api/projects/load": post_load_projects,
                "/api/projects/save": post_save_projects,
                "/api/projects/create_folder": post_create_project_folder,
                "/api/projects/save_to_folder": post_save_to_project_folder,
                "/api/projects/list_folder": post_list_project_folder,
                "/api/projects/delete_folder_file": post_delete_project_folder_file,
            }
            if self.path == "/api/generate":
                post_generate(self)
                return
            if self.path == "/api/script-to-prompt":
                post_script_to_prompt(self)
                return

            handler = json_routes.get(self.path)
            if not handler:
                self.send_error(HTTPStatus.NOT_FOUND)
                return

            try:
                payload = read_json_body(self)
            except ValueError as e:
                json_response(self, HTTPStatus.BAD_REQUEST, {"error": str(e)})
                return
            except Exception:
                json_response(self, HTTPStatus.BAD_REQUEST, {"error": "Invalid JSON body"})
                return

            handler(self, payload)

        def log_request(self, code="-", size="-") -> None:
            # Method, path without query string, status. Headers are never logged.
            status = int(code) if str(code).isdigit() else 0
            path = (self.path or "").split("?", 1)[0]
            log.log(logging.WARNING if status >= 500 else logging.INFO,
                    "%s %s %s", self.command, path, code)

        def log_message(self, format: str, *args) -> None:
            return

    return Handler


def run(*, index_html) -> None:
    host = _pick_host()
    port = _pick_port()
    httpd = ThreadingHTTPServer((host, port), make_handler(index_html=index_html))
    actual_port = httpd.server_address[1]
    log.info("Content Creator listening on %s:%s", host, actual_port)
    sys.stdout.write(f"http://localhost:{actual_port}/\n")
    sys.stdout.flush()
    httpd.serve_forever()
