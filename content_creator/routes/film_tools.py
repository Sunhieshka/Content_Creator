"""Routes for the FilmAgent-derived tools: Previz, Character Masking, Location
Variations. Each takes JSON and returns JSON; errors
come back as {"error": "..."}."""

from http import HTTPStatus
from http.server import BaseHTTPRequestHandler

from content_creator.services import film_tools as ft
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


def post_mask(h, p):
    _run(h, lambda: ft.mask(_s(p, "image"), _s(p, "targets")))


def post_previz_plan(h, p):
    _run(h, lambda: {"plan": ft.previz_plan(_s(p, "brief"), _s(p, "camera"))})


def post_previz_schematic(h, p):
    _run(h, lambda: ft.previz_schematic(p.get("plan") or {}))


def post_previz_schematic_edit(h, p):
    _run(h, lambda: ft.previz_schematic_edit(_s(p, "url"), _s(p, "instruction")))


def post_previz_animatic_prompt(h, p):
    _run(h, lambda: {"prompt": ft.previz_animatic_prompt(p.get("plan") or {})})


def post_previz_cut_prompt(h, p):
    _run(h, lambda: {"prompt": ft.previz_cut_prompt(_s(p, "video"), p.get("plan") or {})})


def post_location_plan(h, p):
    _run(h, lambda: ft.location_plan(_s(p, "image"), _s(p, "direction"), p.get("count") or 4))


def post_location_render(h, p):
    _run(h, lambda: ft.location_render(_s(p, "source"), _s(p, "instruction")))
