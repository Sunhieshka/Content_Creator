from http import HTTPStatus
from http.server import BaseHTTPRequestHandler

from content_creator.services.characters import (
    generate_character_sheets,
    to_data_url,
)
from content_creator.services import character_sheet_qa
from content_creator.utils.http import json_response
from content_creator.utils.multipart import parse_multipart


def post_sheet_start(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    """Sheet job: bible -> prompt -> generate (background). QA runs later via /inspect."""
    refs = [str(x).strip() for x in payload.get("images") or [] if str(x).strip().startswith(("data:", "http"))]
    notes = str(payload.get("notes") or "").strip()
    if not refs and len(notes) < 3:
        json_response(handler, HTTPStatus.BAD_REQUEST,
                      {"error": "Upload a reference image or write a character description."})
        return
    bible = payload.get("bible") if isinstance(payload.get("bible"), dict) and payload.get("bible") else None
    job_id = character_sheet_qa.start_sheet_job(refs[:character_sheet_qa.MAX_SEEDREAM_REFS],
                                                notes, bible)
    json_response(handler, HTTPStatus.OK, {"job_id": job_id, "max_attempts": character_sheet_qa.MAX_ATTEMPTS})


def post_sheet_inspect(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    """Runs the QA checklist + inspection (+ one retry) on a finished sheet job."""
    try:
        character_sheet_qa.start_inspect_job(str(payload.get("job_id") or ""))
    except ValueError as e:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": str(e)})
        return
    json_response(handler, HTTPStatus.OK, {"job_id": payload.get("job_id"), "max_attempts": character_sheet_qa.MAX_ATTEMPTS})


def post_sheet_status(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    job = character_sheet_qa.get_job(str(payload.get("job_id") or ""))
    if not job:
        json_response(handler, HTTPStatus.NOT_FOUND, {"error": "This sheet job is no longer running (the server restarted). Generate again."})
        return
    json_response(handler, HTTPStatus.OK, job)


def post_generate(handler: BaseHTTPRequestHandler) -> None:
    content_type = handler.headers.get("Content-Type") or ""
    if "multipart/form-data" not in content_type:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "Expected multipart/form-data"})
        return

    form = parse_multipart(handler)
    image_fields = form.getlist("images")
    generated_images = form.getlist("generated_images")
    generated_image_legacy = str(form.getfirst("generated_image", "") or "")
    selected_sheet_keys: list[str] = [item.value for item in form.getlist("sheet_options") if item.value]

    reference_image_data_urls: list[str] = []
    if generated_image_legacy.strip().startswith("data:"):
        reference_image_data_urls.append(generated_image_legacy.strip())
    for item in generated_images:
        v = item.value.strip()
        if v.startswith("data:"):
            reference_image_data_urls.append(v)
    for item in image_fields:
        if not item.filename:
            continue
        raw = item.data
        if not raw:
            continue
        reference_image_data_urls.append(to_data_url(item.filename, raw))

    if not reference_image_data_urls:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "No images uploaded."})
        return

    try:
        images = generate_character_sheets(reference_image_data_urls, selected_sheet_keys)
        json_response(handler, HTTPStatus.OK, {"images": images})
    except Exception as e:
        json_response(handler, HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(e)})
