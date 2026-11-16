from http import HTTPStatus
from http.server import BaseHTTPRequestHandler

from content_creator.services.blender import (
    capabilities,
    fix_script,
    get_job,
    normalize_settings,
    start_job,
    write_script,
)
from content_creator.utils.http import json_response


def post_blender_capabilities(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    json_response(handler, HTTPStatus.OK, capabilities())


def post_blender_write_script(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    """Payload: {description, settings} -> {script}. Or {script, log} -> fixed {script}."""
    try:
        if payload.get("log") and payload.get("script"):
            script = fix_script(str(payload["script"]), str(payload["log"]), str(payload.get("workflow") or "scene"))
        else:
            description = str(payload.get("description") or "").strip()
            if not description:
                json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "Describe the scene first."})
                return
            script = write_script(description, normalize_settings(payload.get("settings") or {}))
        json_response(handler, HTTPStatus.OK, {"script": script})
    except ValueError as e:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": str(e)})
    except Exception as e:
        json_response(handler, HTTPStatus.INTERNAL_SERVER_ERROR, {"error": f"Script writing failed: {e}"})


def post_blender_render(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    """Payload: {description, script, settings, kind: 'video'|'preview', auto_fix} -> {job_id}.

    With an empty script, the job writes one from the description first.
    """
    kind = str(payload.get("kind") or "video")
    if kind not in ("video", "preview"):
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "kind must be 'video' or 'preview'"})
        return
    try:
        job_id = start_job(
            description=str(payload.get("description") or ""),
            script=str(payload.get("script") or ""),
            settings=payload.get("settings") or {},
            kind=kind,
            auto_fix=payload.get("auto_fix", True) is not False,
        )
        json_response(handler, HTTPStatus.OK, {"job_id": job_id})
    except ValueError as e:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": str(e)})
    except RuntimeError as e:
        json_response(handler, HTTPStatus.SERVICE_UNAVAILABLE, {"error": str(e)})


def post_blender_status(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    job = get_job(str(payload.get("job_id") or ""))
    if not job:
        json_response(handler, HTTPStatus.NOT_FOUND, {"error": "Render job not found (the server may have restarted)."})
        return
    json_response(handler, HTTPStatus.OK, job)

