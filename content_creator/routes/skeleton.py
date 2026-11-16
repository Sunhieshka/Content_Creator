import base64
import os
import tempfile
import urllib.request
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler

from content_creator.config.settings import OUTPUT_DIR
from content_creator.services.skeleton import VALID_MODES, generate_skeleton_reference
from content_creator.utils.http import json_response


def _fetch_video_to_temp(video_url: str) -> str:
    v = (video_url or "").strip()
    if not v:
        raise RuntimeError("video_url is required")

    fd, path = tempfile.mkstemp(suffix=".mp4")
    os.close(fd)
    try:
        if v.startswith("data:"):
            if ";base64," not in v:
                raise RuntimeError("video_data_url must be a base64 data URL")
            _, b64 = v.split(",", 1)
            with open(path, "wb") as f:
                f.write(base64.b64decode(b64))
            return path
        if v.startswith("http"):
            req = urllib.request.Request(v, headers={"User-Agent": "Mozilla/5.0", "Accept": "*/*"})
            with urllib.request.urlopen(req) as resp:
                data = resp.read()
            with open(path, "wb") as f:
                f.write(data)
            return path
    except Exception:
        os.remove(path)
        raise
    os.remove(path)
    raise RuntimeError("video_url must be an http(s) URL or a data URL")


def post_skeleton_generate(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    video_url = str(payload.get("video_url") or payload.get("video_data_url") or "").strip()
    mode = str(payload.get("mode") or "balanced").strip()
    generate_skeleton = payload.get("generate_skeleton", True)
    generate_overlay = payload.get("generate_overlay", True)
    all_people = bool(payload.get("all_people"))

    if not video_url:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "video_url is required"})
        return
    if not generate_skeleton and not generate_overlay:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "Select at least one output to generate."})
        return
    if mode not in VALID_MODES:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": f"mode must be one of {', '.join(VALID_MODES)}"})
        return
    try:
        kpt_thr = float(payload.get("kpt_thr", 0.43))
    except (TypeError, ValueError):
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "kpt_thr must be a number"})
        return
    if not (0.0 <= kpt_thr <= 1.0):
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "kpt_thr must be between 0 and 1"})
        return

    tmp_path = ""
    try:
        tmp_path = _fetch_video_to_temp(video_url)
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        result = generate_skeleton_reference(
            input_path=tmp_path,
            output_dir=OUTPUT_DIR,
            mode=mode,
            kpt_thr=kpt_thr,
            all_people=all_people,
            generate_skeleton=bool(generate_skeleton),
            generate_overlay=bool(generate_overlay),
        )
        response = {}
        if "skeleton" in result:
            response["skeleton_url"] = "/files/" + os.path.basename(result["skeleton"])
        if "overlay" in result:
            response["overlay_url"] = "/files/" + os.path.basename(result["overlay"])
        json_response(handler, HTTPStatus.OK, response)
    except Exception as e:
        json_response(handler, HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(e)})
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)
