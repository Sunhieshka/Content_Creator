import socket
import urllib.error
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler

from content_creator.services.seed_audio import BusyError, config, generate, replace_video_audio, save_reference, upload_source_video
from content_creator.services.seed_audio_prompt import fix_mojibake, optimize_prompt, seed_audio_skill_ids
from content_creator.utils.http import json_response


def post_seed_audio_config(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    json_response(handler, HTTPStatus.OK, config())


def post_seed_audio_upload(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    """Stores a WAV/MP3 reference clip. Payload: {audio_data_url, filename}."""
    data_url = str(payload.get("audio_data_url") or "").strip()
    filename = str(payload.get("filename") or "clip.wav").strip()
    if not data_url.startswith("data:"):
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "audio_data_url must be a data URL"})
        return
    try:
        json_response(handler, HTTPStatus.OK, {"file_url": save_reference(data_url, filename)})
    except Exception as e:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": str(e)})


def post_seed_audio_generate(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    """Payload: {body: <Seed Audio request body>, api_key?: override, skills?: [ids], mode?: str}.

    When Seed Audio skills are selected, Seed LLM first rewrites the body's text prompt
    with those skills; the response then carries optimized_prompt / original_prompt.
    """
    body = payload.get("body")
    if not isinstance(body, dict) or not body.get("content"):
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "body needs a non-empty 'content' list."})
        return
    extra: dict = {}
    # The panel optimises first (/api/seed-audio/optimize) so the new prompt shows even if generation fails,
    # then sends it here with skip_optimize.
    skill_ids = [] if payload.get("skip_optimize") else seed_audio_skill_ids(payload.get("skills") or [])
    body = dict(body, content=[dict(c, text=fix_mojibake(str(c["text"]))) if isinstance(c, dict) and c.get("type") == "text" and c.get("text") else c
                               for c in body["content"]])
    text_item = next((c for c in body["content"] if isinstance(c, dict) and c.get("type") == "text" and str(c.get("text") or "").strip()), None)
    if skill_ids and text_item:
        original = str(text_item["text"])
        try:
            optimized, applied = optimize_prompt(
                original,
                skill_ids,
                mode=str(payload.get("mode") or ""),
                n_audio=sum(1 for c in body["content"] if isinstance(c, dict) and c.get("type") == "audio_url"),
                has_video=any(isinstance(c, dict) and c.get("type") == "video_url" for c in body["content"]),
            )
        except Exception as e:
            json_response(handler, HTTPStatus.BAD_GATEWAY, {"error": f"Prompt optimisation with the selected skills failed: {e}"})
            return
        body = dict(body, content=[dict(c, text=optimized) if c is text_item else c for c in body["content"]])
        extra = {"original_prompt": original, "optimized_prompt": optimized, "applied_skills": applied}
    try:
        status, data = generate(body, api_key_override=str(payload.get("api_key") or ""))
    except BusyError as e:
        json_response(handler, HTTPStatus.TOO_MANY_REQUESTS, {"error": str(e)})
        return
    except ValueError as e:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": str(e)})
        return
    except (socket.timeout, TimeoutError):
        json_response(handler, HTTPStatus.GATEWAY_TIMEOUT, {"error": "ModelArk did not respond in time."})
        return
    except urllib.error.URLError as e:
        json_response(handler, HTTPStatus.BAD_GATEWAY, {"error": f"Could not reach ModelArk: {e.reason}"})
        return
    if extra and isinstance(data, dict):
        data = dict(data, **extra)
    try:
        json_response(handler, status, data)
    except (BrokenPipeError, ConnectionResetError):
        pass  # The browser cancelled while ModelArk was still working.


def post_seed_audio_replace_audio(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    """Dialogue Fix: mute a video and attach a Seed Audio track. Payload: {video_url, audio_url}."""
    video_url = str(payload.get("video_url") or "").strip()
    audio_url = str(payload.get("audio_url") or "").strip()
    if not video_url or not audio_url:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "video_url and audio_url are required"})
        return
    try:
        json_response(handler, HTTPStatus.OK, {"file_url": replace_video_audio(video_url, audio_url)})
    except ValueError as e:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": str(e)})
    except Exception as e:
        json_response(handler, HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(e)})


def post_seed_audio_upload_video(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    """Uploads a source video for dubbing/translation. Payload: {video_data_url}. Returns {video_url}."""
    data_url = str(payload.get("video_data_url") or "").strip()
    try:
        json_response(handler, HTTPStatus.OK, {"video_url": upload_source_video(data_url)})
    except ValueError as e:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": str(e)})
    except Exception as e:
        json_response(handler, HTTPStatus.INTERNAL_SERVER_ERROR, {"error": f"Upload failed: {e}"})


def post_seed_audio_optimize(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    """Payload: {prompt, skills, mode, n_audio, has_video} -> {optimized_prompt, applied_skills}.
    Seed LLM rewrites the prompt with the project's Seed Audio skills, without generating audio."""
    prompt = str(payload.get("prompt") or "").strip()
    skill_ids = seed_audio_skill_ids(payload.get("skills") or [])
    if not prompt:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "Write a prompt first."})
        return
    if not skill_ids:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "Tick a Seed Audio skill in this project to optimise prompts."})
        return
    try:
        n_audio = int(payload.get("n_audio") or 0)
    except (TypeError, ValueError):
        n_audio = 0
    try:
        optimized, applied = optimize_prompt(prompt, skill_ids, mode=str(payload.get("mode") or ""),
                                             n_audio=n_audio, has_video=bool(payload.get("has_video")))
    except Exception as e:
        json_response(handler, HTTPStatus.BAD_GATEWAY, {"error": f"Prompt optimisation with the selected skills failed: {e}"})
        return
    json_response(handler, HTTPStatus.OK, {"optimized_prompt": optimized, "applied_skills": applied, "original_prompt": prompt})
