from http import HTTPStatus
from http.server import BaseHTTPRequestHandler

from content_creator.services.text_overlay import (
    MAX_OVERLAYS,
    MAX_PLAN_ENTRIES,
    SEEDREAM_MODEL_ID,
    SEEDREAM_MODEL_LABEL,
    generate_overlay_images,
    normalize_references,
    plan_text_overlays,
)
from content_creator.utils.http import json_response


def post_text_overlay_generate(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    """Plan (when no overlays are given) and render text overlay images.

    Payload:
      prompt       — the video prompt; required when overlays is omitted.
      overlays     — optional pre-planned/edited overlays to (re)render.
      style_guide, screen_style_guide, backdrop — the shared style, reused so
                     a regenerated overlay matches its siblings.
      ratio        — the video ratio, used for overlay graphic size.
      anchors      — optional {"overlay": img, "screen": img} style references.
      references   — the video tool's own reference images, [{image, name}],
                     numbered 1..N; the planner reuses or renders from them.
      max_overlays — how many rendered overlays fit beside those references.
    """
    prompt = str(payload.get("prompt") or "").strip()
    overlays = payload.get("overlays")
    ratio = str(payload.get("ratio") or "16:9").strip()
    anchors = payload.get("anchors") or {}
    if "references" not in payload:
        # Every current page sends `references` (possibly empty). A request
        # without it comes from a tab loaded before the server was updated,
        # which would silently ignore the brand logo and let Seedream invent one.
        json_response(
            handler,
            HTTPStatus.CONFLICT,
            {"error": "This page is out of date and does not send your reference images. Reload the browser tab, then build the overlays again."},
        )
        return
    references_payload = payload.get("references") or []
    if overlays is not None and not isinstance(overlays, list):
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "overlays must be a list"})
        return
    if not isinstance(anchors, dict):
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "anchors must be an object"})
        return
    if not isinstance(references_payload, list):
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "references must be a list"})
        return
    if overlays is None and not prompt:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "prompt is required"})
        return
    try:
        max_overlays = int(payload.get("max_overlays") or MAX_OVERLAYS)
    except (TypeError, ValueError):
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "max_overlays must be a number"})
        return
    if max_overlays < 1:
        json_response(
            handler,
            HTTPStatus.BAD_REQUEST,
            {"error": "No reference image slots are left for text overlays — Seedance accepts 9 in total. Remove a reference image."},
        )
        return
    try:
        references = normalize_references(references_payload)
        if overlays is None:
            plan = plan_text_overlays(prompt=prompt, references=references, max_overlays=max_overlays)
        else:
            plan = {
                "style_guide": str(payload.get("style_guide") or "").strip(),
                "screen_style_guide": str(payload.get("screen_style_guide") or "").strip(),
                "backdrop": str(payload.get("backdrop") or "").strip(),
                "overlays": overlays[:MAX_PLAN_ENTRIES],
            }
        rendered = generate_overlay_images(plan=plan, ratio=ratio, anchors=anchors, references=references) if plan["overlays"] else []
        json_response(
            handler,
            HTTPStatus.OK,
            {
                "style_guide": plan["style_guide"],
                "screen_style_guide": plan["screen_style_guide"],
                "backdrop": plan["backdrop"],
                "overlays": rendered,
                "image_model": SEEDREAM_MODEL_ID,
                "image_model_label": SEEDREAM_MODEL_LABEL,
            },
        )
    except Exception as e:
        json_response(handler, HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(e)})
