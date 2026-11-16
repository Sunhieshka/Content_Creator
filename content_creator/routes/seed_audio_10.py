"""Routes for Seed Audio 1.0 (BytePlus Voice TTS). JSON in, JSON out; errors as {"error": "..."}."""

from http import HTTPStatus

from content_creator.services import seed_audio_10 as sa10
from content_creator.utils.http import json_response


def post_seed_audio_10_config(h, p):
    json_response(h, HTTPStatus.OK, sa10.config())


def post_seed_audio_10_generate(h, p):
    try:
        json_response(h, HTTPStatus.OK, sa10.generate(str(p.get("text_prompt") or ""), p.get("references") or [],
                                                      p.get("audio_config") or {}))
    except PermissionError as e:
        json_response(h, HTTPStatus.UNAUTHORIZED, {"error": str(e)})
    except ValueError as e:
        json_response(h, HTTPStatus.BAD_REQUEST, {"error": str(e)})
    except Exception as e:
        json_response(h, HTTPStatus.BAD_GATEWAY, {"error": str(e)})
