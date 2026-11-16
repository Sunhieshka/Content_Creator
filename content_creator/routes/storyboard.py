from http import HTTPStatus
from http.server import BaseHTTPRequestHandler

from content_creator.services.storyboard import (
    generate_storyboard_image,
    generate_storyboard_prompts,
)
from content_creator.utils.http import json_response


def post_storyboard_prompt(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    script = str(payload.get("script") or "").strip()
    subject = str(payload.get("subject") or "").strip()
    action = str(payload.get("action") or "").strip()
    environment = str(payload.get("environment") or "").strip()
    lighting = str(payload.get("lighting") or "").strip()
    camera = str(payload.get("camera") or "").strip()
    style = str(payload.get("style") or "").strip()
    quality = str(payload.get("quality") or "").strip()
    refs_raw = payload.get("referenceImages") or []
    reference_images: list[str] = [str(x) for x in refs_raw if str(x).startswith("data:")]

    has_any_input = script or subject or action or environment or lighting or camera or style or quality or reference_images
    if not has_any_input:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "Provide a script, at least one core element, or a reference image to generate a storyboard."})
        return

    try:
        prompts = generate_storyboard_prompts(
            script=script,
            subject=subject,
            action=action,
            environment=environment,
            lighting=lighting,
            camera=camera,
            style=style,
            quality=quality,
            reference_image_data_urls=reference_images,
        )
        json_response(handler, HTTPStatus.OK, {"prompt": prompts})
    except Exception as e:
        json_response(handler, HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(e)})


def post_storyboard_generate(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    prompt = str(payload.get("prompt") or "").strip()
    if not prompt:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "A storyboard prompt is required"})
        return

    refs_raw = payload.get("referenceImages") or []
    reference_images: list[str] = [str(x) for x in refs_raw if str(x).startswith("data:")]

    try:
        image = generate_storyboard_image(prompt=prompt, reference_image_data_urls=reference_images)
        json_response(handler, HTTPStatus.OK, {"image": image})
    except Exception as e:
        json_response(handler, HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(e)})
