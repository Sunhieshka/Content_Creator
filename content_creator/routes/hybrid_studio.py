"""Routes for Hybrid Studio (green-screen → new location with Seedance). JSON in, JSON out; errors as {"error": "..."}."""

from http import HTTPStatus
from http.server import BaseHTTPRequestHandler

from content_creator.services import hybrid_studio as hs
from content_creator.utils.http import json_response


def _run(handler: BaseHTTPRequestHandler, fn) -> None:
    try:
        json_response(handler, HTTPStatus.OK, fn())
    except ValueError as e:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": str(e)})
    except Exception as e:
        json_response(handler, HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(e)})


def _s(p: dict, k: str) -> str:
    return str(p.get(k) or "").strip()


def post_hybrid_analyze(h, p):
    _run(h, lambda: hs.analyze(_s(p, "video")))


def post_hybrid_probe(h, p):
    _run(h, lambda: hs.probe(_s(p, "url")))


def post_hybrid_finalize(h, p):
    _run(h, lambda: hs.finalize(_s(p, "result"), _s(p, "video"), p.get("keep_audio", True) is not False))


def post_hybrid_background(h, p):
    _run(h, lambda: hs.generate_background(_s(p, "video"), _s(p, "description"), _s(p, "screen") or "green", _s(p, "model") or "pro"))
