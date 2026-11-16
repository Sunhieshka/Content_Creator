from http import HTTPStatus
from http.server import BaseHTTPRequestHandler

from content_creator.services.skills import ALWAYS_ON, FULL_TEXT_BUDGET, list_skills, read_skill
from content_creator.utils.http import json_response


def post_skills_list(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    json_response(handler, HTTPStatus.OK, {"skills": list_skills(), "always_on": ALWAYS_ON, "full_text_budget": FULL_TEXT_BUDGET})


def post_skills_get(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    skill = read_skill(str(payload.get("id") or ""))
    if not skill:
        json_response(handler, HTTPStatus.NOT_FOUND, {"error": "Skill not found"})
        return
    json_response(handler, HTTPStatus.OK, skill)
