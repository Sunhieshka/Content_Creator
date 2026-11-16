"""Routes for Visual Understanding (Seed 2.x VLM over images and video). JSON in, JSON out; errors as {"error": "..."}."""

from http import HTTPStatus
from http.server import BaseHTTPRequestHandler

from content_creator.services import visual_understanding as vu
from content_creator.utils.http import json_response


def _run(handler: BaseHTTPRequestHandler, fn) -> None:
    try:
        json_response(handler, HTTPStatus.OK, fn())
    except ValueError as e:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": str(e)})
    except Exception as e:  # model / network failures
        json_response(handler, HTTPStatus.BAD_GATEWAY, {"error": str(e)})


def _s(p: dict, k: str) -> str:
    return str(p.get(k) or "").strip()


def post_vu_config(h, p):
    _run(h, vu.config)


def post_vu_analyze(h, p):
    _run(h, lambda: vu.analyze(
        _s(p, "prompt"), _s(p, "model") or vu.DEFAULT_MODEL,
        images=[str(x) for x in (p.get("images") or []) if x], video=_s(p, "video"),
        fps=p.get("fps") or vu.DEFAULT_FPS, thinking=p.get("thinking", True) is not False,
        previous_response_id=_s(p, "previous_response_id")))


def post_vu_video_to_prompt(h, p):
    _run(h, lambda: vu.video_to_prompt(
        _s(p, "video"), _s(p, "model") or vu.DEFAULT_MODEL, fps=p.get("fps") or 2.0,
        thinking=p.get("thinking", True) is not False, max_shot_seconds=p.get("max_shot_seconds") or 30))
