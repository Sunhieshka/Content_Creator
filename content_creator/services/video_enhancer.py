"""Video Enhancer: BytePlus AI MediaKit video quality enhancement.

Ported from CineForge's Video Enhancer. Two tools share one submit/poll contract:
  POST /api/v1/tools/enhance-video       standard / professional enhancement
  POST /api/v1/tools/enhance-video-fast  speed-first "lite" variant
  GET  /api/v1/tasks/{task_id}           generic poll for every tool

MediaKit downloads the source itself, so it needs a public URL: local files are
put in the app's TOS bucket as-is (no resize — the point is to upscale them).
A finished task's result.video_url expires 24 h after completion, so the panel
can copy the result into OUTPUT_DIR to keep it.
"""

import base64
import json
import os
import re
import shutil
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from typing import Tuple

from dotenv import load_dotenv

from content_creator.config.settings import OUTPUT_DIR, PROJECT_ROOT, get_env

load_dotenv(dotenv_path=os.path.join(PROJECT_ROOT, ".env"))

DEFAULT_REGION = "ap-southeast-1"
TOOLS = ("enhance-video", "enhance-video-fast")
REQUEST_TIMEOUT_S = 60
DOWNLOAD_TIMEOUT_S = 600
UPLOAD_EXTS = {"video/mp4": ".mp4", "video/quicktime": ".mov", "video/x-matroska": ".mkv", "video/webm": ".webm",
               "video/x-msvideo": ".avi", "video/x-flv": ".flv", "video/mp2t": ".ts", "video/x-ms-wmv": ".wmv"}


def _api_key() -> str:
    # A separate credential from ARK_API_KEY — created in the AI MediaKit console.
    return get_env("MEDIAKIT_API_KEY") or ""


def _region() -> str:
    return (get_env("MEDIAKIT_REGION", DEFAULT_REGION) or DEFAULT_REGION).strip().lower()


def _base_url() -> str:
    return f"https://mediakit.{_region()}.bytepluses.com/api/v1"


def config() -> dict:
    return {"has_server_key": bool(_api_key()), "region": _region()}


def _call(method: str, url: str, body: dict = None) -> Tuple[int, dict]:
    key = _api_key()
    if not key:
        raise ValueError("No AI MediaKit API key. Set MEDIAKIT_API_KEY in .env and restart the app.")
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    })
    try:
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT_S) as resp:
            status, text = resp.status, resp.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        status, text = e.code, e.read().decode("utf-8", "replace")
    try:
        return status, json.loads(text)
    except ValueError:
        return status, {"error": {"message": f"AI MediaKit returned non-JSON (HTTP {status}): {text[:300]}"}}


def submit(tool: str, body: dict) -> Tuple[int, dict]:
    # The tool name lands in the upstream path, so it is checked, not interpolated blind.
    if tool not in TOOLS:
        raise ValueError(f"Unknown MediaKit tool {tool!r}; expected one of {', '.join(TOOLS)}.")
    return _call("POST", f"{_base_url()}/tools/{tool}", body or {})


def get_task(task_id: str) -> Tuple[int, dict]:
    if not task_id:
        raise ValueError("task_id is required")
    return _call("GET", f"{_base_url()}/tasks/{urllib.parse.quote(task_id, safe='')}")


def upload_source(data_url: str) -> str:
    """Puts a local video in the TOS bucket untouched and returns its public URL."""
    from content_creator.services.assets import _new_tos_client, load_asset_env

    if not data_url.startswith("data:video/") or ";base64," not in data_url:
        raise ValueError("Upload a video file (mp4, mov, mkv, avi, flv, ts or wmv).")
    header, b64 = data_url.split(",", 1)
    mime = header[5:].split(";", 1)[0].lower()
    env = load_asset_env()
    key = f"{env.tos_prefix}/{time.strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex}-enhance-source{UPLOAD_EXTS.get(mime, '.mp4')}".lstrip("/")
    _new_tos_client(env).put_object(env.tos_bucket, key, content=base64.b64decode(b64), content_type=mime)
    return f"{env.tos_public_url_prefix}/{key}"


def save_result(url: str, task_id: str) -> str:
    """Copies a finished result into OUTPUT_DIR before its 24 h link expires. Returns a /files/ URL."""
    if not url.startswith(("http://", "https://")):
        raise ValueError("Result URL must be http(s).")
    path_ext = os.path.splitext(urllib.parse.urlparse(url).path)[1].lower()
    ext = path_ext if re.fullmatch(r"\.[a-z0-9]{2,5}", path_ext or "") else ".mp4"
    stem = re.sub(r"[^A-Za-z0-9_-]", "-", task_id or "")[:60].strip("-") or uuid.uuid4().hex[:8]
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    name = f"enhanced-{stem}{ext}"
    out_path = os.path.join(OUTPUT_DIR, name)
    if not os.path.isfile(out_path):
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Accept": "*/*"})
        tmp = out_path + ".part"
        # Streamed to disk: professional masters can be several GB.
        with urllib.request.urlopen(req, timeout=DOWNLOAD_TIMEOUT_S) as resp, open(tmp, "wb") as f:
            shutil.copyfileobj(resp, f, 1024 * 1024)
        os.replace(tmp, out_path)
    return "/files/" + name
