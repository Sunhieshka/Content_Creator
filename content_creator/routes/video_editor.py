from http import HTTPStatus
from http.server import BaseHTTPRequestHandler

from content_creator.services.video_editor import get_job, start_export
from content_creator.utils.http import json_response


def post_video_editor_export(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    """Payload: {clips: [{url, in, out, volume, muted}], settings: {resolution, fit, fps, quality, fade, fade_ends}} -> {job_id}."""
    try:
        json_response(handler, HTTPStatus.OK, {"job_id": start_export(payload.get("clips") or [], payload.get("settings") or {})})
    except ValueError as e:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": str(e)})
    except RuntimeError as e:
        json_response(handler, HTTPStatus.SERVICE_UNAVAILABLE, {"error": str(e)})


def post_video_editor_status(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    job = get_job(str(payload.get("job_id") or ""))
    if not job:
        json_response(handler, HTTPStatus.NOT_FOUND, {"error": "Export job not found (the server may have restarted)."})
        return
    json_response(handler, HTTPStatus.OK, job)
