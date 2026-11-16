import socket
import urllib.error
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler

from content_creator.services.video_enhancer import config, get_task, save_result, submit, upload_source
from content_creator.utils.http import json_response


def post_video_enhancer_config(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    json_response(handler, HTTPStatus.OK, config())


def _relay(handler: BaseHTTPRequestHandler, call) -> None:
    try:
        status, data = call()
    except ValueError as e:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": {"message": str(e)}})
        return
    except (socket.timeout, TimeoutError):
        json_response(handler, HTTPStatus.GATEWAY_TIMEOUT, {"error": {"message": "AI MediaKit did not respond in time."}})
        return
    except urllib.error.URLError as e:
        json_response(handler, HTTPStatus.BAD_GATEWAY, {"error": {"message": f"Could not reach AI MediaKit: {e.reason}"}})
        return
    json_response(handler, status, data)


def post_video_enhancer_submit(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    """Payload: {tool, body} -> MediaKit's {success, task_id, request_id} verbatim."""
    _relay(handler, lambda: submit(str(payload.get("tool") or ""), payload.get("body") or {}))


def post_video_enhancer_task(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    """Payload: {task_id} -> MediaKit's task object verbatim."""
    _relay(handler, lambda: get_task(str(payload.get("task_id") or "").strip()))


def post_video_enhancer_upload(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    """Payload: {video_data_url} -> {video_url} (public TOS URL MediaKit can download)."""
    try:
        json_response(handler, HTTPStatus.OK, {"video_url": upload_source(str(payload.get("video_data_url") or ""))})
    except ValueError as e:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": str(e)})
    except Exception as e:
        json_response(handler, HTTPStatus.INTERNAL_SERVER_ERROR, {"error": f"Upload failed: {e}"})


def post_video_enhancer_save(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    """Payload: {url, task_id} -> {file_url} (local copy that outlives the 24 h link)."""
    try:
        json_response(handler, HTTPStatus.OK, {"file_url": save_result(str(payload.get("url") or "").strip(), str(payload.get("task_id") or ""))})
    except ValueError as e:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": str(e)})
    except Exception as e:
        json_response(handler, HTTPStatus.INTERNAL_SERVER_ERROR, {"error": f"Saving the result failed: {e}"})
