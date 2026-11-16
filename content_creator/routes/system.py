from http import HTTPStatus
from http.server import BaseHTTPRequestHandler

from content_creator.services import model_settings
from content_creator.services.long_duration import has_ffmpeg
from content_creator.services.skeleton import has_skeleton_support
from content_creator.utils.http import json_response


def post_capabilities(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    json_response(handler, HTTPStatus.OK, {
        "ffmpeg": has_ffmpeg(),
        "skeleton": has_skeleton_support() and has_ffmpeg(),
        "models": model_settings.config(),
    })


def post_models(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    """Payload: {prompt?, image?} -> the new app-wide model choice (see services/model_settings.py)."""
    try:
        json_response(handler, HTTPStatus.OK, model_settings.set_models(str(payload.get("prompt") or ""), str(payload.get("image") or "")))
    except ValueError as e:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": str(e)})
