from http import HTTPStatus
from http.server import BaseHTTPRequestHandler

from content_creator.services.characters import (
    generate_character_image_from_i2i,
    generate_character_image_from_text,
)
from content_creator.services.character_sheet_qa import generate_character
from content_creator.utils.http import json_response


def _engineered(handler: BaseHTTPRequestHandler, request: str, images: list) -> None:
    """Reference-ready mode: Seed LLM writes a locked character bible and prompt, then Seedream draws
    one full-body character image (see services/character_sheet_qa.py)."""
    try:
        out = generate_character(request, images or None)
        json_response(handler, HTTPStatus.OK, {"image": out["image"], "file": out["file"],
                                               "prompt": out["prompt"], "bible": out["bible"]})
    except Exception as e:
        json_response(handler, HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(e)})


def post_t2i(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    prompt = str(payload.get("prompt") or "").strip()
    if not prompt:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "prompt is required"})
        return
    if payload.get("engineer"):
        _engineered(handler, prompt, [])
        return
    try:
        image = generate_character_image_from_text(prompt=prompt)
        if not image:
            json_response(handler, HTTPStatus.INTERNAL_SERVER_ERROR, {"error": "No image was generated"})
            return
        json_response(handler, HTTPStatus.OK, {"image": image})
    except Exception as e:
        json_response(handler, HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(e)})


def post_i2i(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    prompt = str(payload.get("prompt") or "").strip()
    images_payload = payload.get("images")
    image_data_urls: list[str] = []
    if isinstance(images_payload, list):
        image_data_urls = [str(x).strip() for x in images_payload if str(x).strip().startswith("data:")]
    else:
        image_in = str(payload.get("image") or "").strip()
        if image_in.startswith("data:"):
            image_data_urls = [image_in]
    if not image_data_urls:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "images must contain at least 1 data URL"})
        return
    if len(image_data_urls) > 9:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "images must contain at most 9 items"})
        return
    if not prompt:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "prompt is required"})
        return
    if payload.get("engineer"):
        _engineered(handler, prompt, image_data_urls)
        return
    try:
        image = generate_character_image_from_i2i(prompt=prompt, image_data_urls=image_data_urls)
        if not image:
            json_response(handler, HTTPStatus.INTERNAL_SERVER_ERROR, {"error": "No image was generated"})
            return
        json_response(handler, HTTPStatus.OK, {"image": image})
    except Exception as e:
        json_response(handler, HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(e)})
