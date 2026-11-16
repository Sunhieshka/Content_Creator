import base64
import json
import mimetypes
import os
import re
import shutil
import tempfile
import threading
import time
import urllib.request
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler

from content_creator.config.settings import OUTPUT_DIR, PROJECT_LOCAL_ROOT
from content_creator.utils.http import json_response

# The project list itself (names, drafts, results, asset groups) lives here
# rather than in the browser. It used to live only in localStorage, where a
# handful of base64 reference uploads would blow past the ~5MB per-origin
# quota — and because the failing write was swallowed, every project created
# after that point silently vanished on the next reload.
PROJECTS_FILE = os.path.join(OUTPUT_DIR, "projects.json")
_projects_lock = threading.Lock()


def _read_projects_file() -> list:
    try:
        with open(PROJECTS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        return []
    except Exception:
        # A corrupt file must not wipe the list — the last good backup, if any,
        # is what a caller can fall back to.
        return []
    if isinstance(data, dict):
        projects = data.get("projects")
        return projects if isinstance(projects, list) else []
    return data if isinstance(data, list) else []


def post_load_projects(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    try:
        with _projects_lock:
            projects = _read_projects_file()
            exists = os.path.exists(PROJECTS_FILE)
        json_response(handler, HTTPStatus.OK, {"projects": projects, "initialized": exists})
    except Exception as e:
        json_response(handler, HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(e)})


def post_save_projects(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    projects = payload.get("projects")
    if not isinstance(projects, list):
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "projects must be a list"})
        return
    try:
        with _projects_lock:
            os.makedirs(OUTPUT_DIR, exist_ok=True)
            # Keep one generation of history, then swap the new file in
            # atomically so an interrupted write can never truncate the list.
            if os.path.exists(PROJECTS_FILE):
                try:
                    shutil.copyfile(PROJECTS_FILE, PROJECTS_FILE + ".bak")
                except Exception:
                    pass
            fd, tmp_path = tempfile.mkstemp(dir=OUTPUT_DIR, prefix=".projects-", suffix=".json")
            try:
                with os.fdopen(fd, "w", encoding="utf-8") as f:
                    json.dump({"projects": projects}, f)
                    f.flush()
                    os.fsync(f.fileno())
                os.replace(tmp_path, PROJECTS_FILE)
            except Exception:
                try:
                    os.unlink(tmp_path)
                except Exception:
                    pass
                raise
        json_response(handler, HTTPStatus.OK, {"ok": True, "count": len(projects)})
    except Exception as e:
        json_response(handler, HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(e)})


def _safe_slug(value: str, fallback: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9_-]+", "-", (value or "").strip()).strip("-")
    return slug or fallback


def _project_dir(project_id: str) -> str:
    return os.path.join(PROJECT_LOCAL_ROOT, _safe_slug(project_id, "project"))


def post_create_project_folder(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    project_id = str(payload.get("project_id") or "").strip()
    if not project_id:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "project_id is required"})
        return
    try:
        os.makedirs(_project_dir(project_id), exist_ok=True)
        json_response(handler, HTTPStatus.OK, {"ok": True})
    except Exception as e:
        json_response(handler, HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(e)})


def post_save_to_project_folder(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    project_id = str(payload.get("project_id") or "").strip()
    name = str(payload.get("name") or "").strip() or "asset"
    data_url = str(payload.get("data_url") or "").strip()
    source_url = str(payload.get("source_url") or "").strip()
    if not project_id:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "project_id is required"})
        return
    if not data_url and not source_url:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "data_url or source_url is required"})
        return
    try:
        target_dir = _project_dir(project_id)
        os.makedirs(target_dir, exist_ok=True)

        if data_url:
            if ";base64," not in data_url:
                raise RuntimeError("data_url must be a base64 data URL")
            header, b64 = data_url.split(",", 1)
            mime = header.split(";", 1)[0].replace("data:", "").strip() or "application/octet-stream"
            raw = base64.b64decode(b64)
        else:
            if not source_url.startswith("http"):
                raise RuntimeError("source_url must be an http(s) URL")
            req = urllib.request.Request(source_url, headers={"User-Agent": "Mozilla/5.0", "Accept": "*/*"})
            with urllib.request.urlopen(req) as resp:
                raw = resp.read()
                mime = (resp.headers.get("Content-Type") or "application/octet-stream").split(";", 1)[0].strip()

        if not raw:
            raise RuntimeError("Downloaded/decoded file is empty")

        existing_ext = os.path.splitext(name)[1]
        guessed_ext = mimetypes.guess_extension(mime) or ""
        if guessed_ext == ".jpe":
            guessed_ext = ".jpg"
        ext = existing_ext or guessed_ext or ".bin"
        stem = _safe_slug(os.path.splitext(name)[0], "asset")
        filename = f"{stem}-{int(time.time() * 1000)}{ext}"
        target_path = os.path.join(target_dir, filename)
        with open(target_path, "wb") as f:
            f.write(raw)

        json_response(handler, HTTPStatus.OK, {
            "filename": filename,
            "file_url": f"/project-files/{os.path.basename(target_dir)}/{filename}",
            "size": len(raw),
        })
    except Exception as e:
        json_response(handler, HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(e)})


def post_list_project_folder(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    project_id = str(payload.get("project_id") or "").strip()
    if not project_id:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "project_id is required"})
        return
    try:
        target_dir = _project_dir(project_id)
        if not os.path.isdir(target_dir):
            json_response(handler, HTTPStatus.OK, {"files": []})
            return
        entries = []
        for name in os.listdir(target_dir):
            path = os.path.join(target_dir, name)
            if not os.path.isfile(path):
                continue
            stat = os.stat(path)
            entries.append({
                "name": name,
                "url": f"/project-files/{os.path.basename(target_dir)}/{name}",
                "size": stat.st_size,
                "mtime": int(stat.st_mtime * 1000),
            })
        entries.sort(key=lambda e: e["mtime"], reverse=True)
        json_response(handler, HTTPStatus.OK, {"files": entries})
    except Exception as e:
        json_response(handler, HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(e)})


def post_delete_project_folder_file(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    project_id = str(payload.get("project_id") or "").strip()
    filename = os.path.basename(str(payload.get("filename") or "").strip())
    if not project_id or not filename:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "project_id and filename are required"})
        return
    try:
        target_path = os.path.join(_project_dir(project_id), filename)
        if not os.path.isfile(target_path):
            json_response(handler, HTTPStatus.NOT_FOUND, {"error": "File not found"})
            return
        os.remove(target_path)
        json_response(handler, HTTPStatus.OK, {"ok": True})
    except Exception as e:
        json_response(handler, HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(e)})
