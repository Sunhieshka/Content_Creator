import socket
import urllib.error
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler

from content_creator.services.seedream_studio import config, generate, save_image
from content_creator.utils.http import json_response


def post_seedream_config(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    json_response(handler, HTTPStatus.OK, config())


def post_seedream_save_image(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    """Payload: {data_url, hint?} -> {url: /files/...}. Used for uploads and repaired layers."""
    try:
        url = save_image(str(payload.get("data_url") or ""), str(payload.get("hint") or "upload"))
        json_response(handler, HTTPStatus.OK, {"url": url})
    except ValueError as e:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": {"message": str(e)}})


def post_seedream_generate(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    """Payload: a ModelArk /images/generations body. `model` may be 'pro' or 'flash'."""
    try:
        status, data = generate(payload)
    except ValueError as e:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": {"message": str(e)}})
        return
    except (socket.timeout, TimeoutError):
        json_response(handler, HTTPStatus.GATEWAY_TIMEOUT, {"error": {"message": "ModelArk did not respond in time."}})
        return
    except urllib.error.URLError as e:
        json_response(handler, HTTPStatus.BAD_GATEWAY, {"error": {"message": f"Could not reach ModelArk: {e.reason}"}})
        return
    try:
        json_response(handler, status, data)
    except (BrokenPipeError, ConnectionResetError):
        pass
