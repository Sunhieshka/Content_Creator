import base64
import urllib.request
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler

from content_creator.services.assets import create_asset_from_data_url, create_asset_group, load_asset_env
from content_creator.services.long_duration import ensure_video_data_url_mp4
from content_creator.utils.http import json_response


def post_create_asset_group(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    name = str(payload.get("name") or "").strip()
    description = str(payload.get("description") or "").strip()

    if not name:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "name is required"})
        return

    try:
        env = load_asset_env()
        group_id = create_asset_group(
            name=name,
            description=description or f"Project asset group for {name}",
            region=env.region,
            project_name=env.project_name,
        )
        json_response(
            handler,
            HTTPStatus.OK,
            {
                "group_id": group_id,
                "project_name": env.project_name,
                "region": env.region,
            },
        )
    except Exception as e:
        json_response(handler, HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(e)})


def post_add_asset_to_group(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    group_id = str(payload.get("group_id") or "").strip()
    data_url = str(payload.get("data_url") or "").strip()
    source_url = str(payload.get("source_url") or "").strip()
    key_hint = str(payload.get("key_hint") or "generated").strip() or "generated"
    asset_type = str(payload.get("asset_type") or "Image").strip() or "Image"

    if not group_id:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "group_id is required"})
        return
    if not data_url and not source_url:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "data_url or source_url is required"})
        return

    # A file URL sent as data_url (e.g. "/files/x.png") is fetched like a source_url.
    if data_url and not data_url.startswith("data:"):
        source_url, data_url = source_url or data_url, ""

    try:
        resolved_data_url = data_url
        if not resolved_data_url:
            if source_url.startswith("/"):
                host = handler.headers.get("Host") or "127.0.0.1:8000"
                scheme = "https" if str(handler.headers.get("X-Forwarded-Proto") or "").lower() == "https" else "http"
                source_url = f"{scheme}://{host}{source_url}"
            if not source_url.startswith("http"):
                json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "source_url must be an http(s) or absolute local URL"})
                return
            with urllib.request.urlopen(source_url) as resp:
                raw = resp.read()
                mime = (resp.headers.get("Content-Type") or ("video/mp4" if asset_type.lower() == "video" else "image/png")).split(";", 1)[0].strip()
            resolved_data_url = "data:" + mime + ";base64," + base64.b64encode(raw).decode("utf-8")
        if not resolved_data_url.startswith("data:"):
            json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "Resolved asset content must be a data URL"})
            return
        if asset_type.lower() == "video":
            resolved_data_url = ensure_video_data_url_mp4(video_data_url=resolved_data_url)
        asset = create_asset_from_data_url(
            data_url=resolved_data_url,
            group_id=group_id,
            key_hint=key_hint,
            asset_type=asset_type,
        )
        json_response(handler, HTTPStatus.OK, asset)
    except Exception as e:
        json_response(handler, HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(e)})
