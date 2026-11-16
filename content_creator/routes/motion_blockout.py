import time
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler

from content_creator.services.motion_blockout import generate_scene
from content_creator.utils.http import json_response


def post_motion_blockout_generate(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    """Payload: {description} -> {content, duration_ms} (raw scene JSON text from Seed LLM)."""
    description = str(payload.get("description") or "").strip()
    if not description:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "Describe the shot first."})
        return
    t0 = time.time()
    try:
        content = generate_scene(description)
    except Exception as e:
        json_response(handler, HTTPStatus.INTERNAL_SERVER_ERROR, {"error": f"Scene generation failed: {e}"})
        return
    json_response(handler, HTTPStatus.OK, {"content": content, "duration_ms": int((time.time() - t0) * 1000)})

