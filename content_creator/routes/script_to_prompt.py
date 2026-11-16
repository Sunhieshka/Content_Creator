from http import HTTPStatus
from http.server import BaseHTTPRequestHandler

from content_creator.services.script_to_prompt import (
    extract_text_from_pdf_bytes,
    generate_character_sheet_prompts,
    generate_location_prompts,
    generate_seedance_prompts_from_script,
)
from concurrent.futures import ThreadPoolExecutor
from content_creator.utils.http import json_response
from content_creator.utils.multipart import parse_multipart


def post_script_to_prompt(handler: BaseHTTPRequestHandler) -> None:
    content_type = handler.headers.get("Content-Type") or ""
    if "multipart/form-data" not in content_type:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "Expected multipart/form-data"})
        return

    form = parse_multipart(handler)

    script_text = str(form.getfirst("script_text", "") or "").strip()
    pdf_fields = form.getlist("script_pdf")
    pdf_text = ""

    if pdf_fields and pdf_fields[0].filename:
        raw = pdf_fields[0].data
        if raw:
            pdf_text = extract_text_from_pdf_bytes(raw)

    combined_parts = [part for part in [script_text, pdf_text] if part.strip()]
    if not combined_parts:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "Paste a script or upload a PDF."})
        return

    try:
        # Video prompts, character sheet descriptions and location directions come from the same script, in parallel.
        script = "\n\n".join(combined_parts)
        with ThreadPoolExecutor(max_workers=3) as pool:
            video_f = pool.submit(generate_seedance_prompts_from_script, script)
            chars_f = pool.submit(generate_character_sheet_prompts, script)
            locs_f = pool.submit(generate_location_prompts, script)
            prompts = video_f.result()
            # The video prompts are still useful on their own if either extra list fails.
            try:
                characters = chars_f.result()
            except Exception:
                characters = []
            try:
                locations = locs_f.result()
            except Exception:
                locations = []
        json_response(handler, HTTPStatus.OK, {"prompts": prompts, "characters": characters, "locations": locations})
    except Exception as e:
        json_response(handler, HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(e)})
