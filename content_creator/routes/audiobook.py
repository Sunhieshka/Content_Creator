from http import HTTPStatus
from http.server import BaseHTTPRequestHandler

from content_creator.services import audiobook as ab
from content_creator.utils.http import json_response


def _err(handler, status, e):
    json_response(handler, status, {"error": str(e)})


def post_audiobook_extract(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    """{filename, data_url} -> {text, words, est_minutes, headings}."""
    try:
        text = ab.extract_text(str(payload.get("filename") or ""), str(payload.get("data_url") or ""))
    except (ValueError, RuntimeError) as e:
        return _err(handler, HTTPStatus.BAD_REQUEST, e)
    except Exception as e:
        return _err(handler, HTTPStatus.INTERNAL_SERVER_ERROR, f"Could not read the document: {e}")
    words = len(text.split())
    json_response(handler, HTTPStatus.OK, {
        "text": text, "words": words, "est_minutes": round(ab.est_seconds(text) / 60, 1),
        "headings": ab.count_headings(text),
    })


def post_audiobook_analyze(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    """{text, options:{style, length, narrator}} -> {job_id}."""
    text = str(payload.get("text") or "").strip()
    if not text:
        return _err(handler, HTTPStatus.BAD_REQUEST, "No document text.")
    json_response(handler, HTTPStatus.OK, {"job_id": ab.start_analysis(text, payload.get("options") or {})})


def post_audiobook_status(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    job = ab.get_job(str(payload.get("job_id") or ""))
    if not job:
        return _err(handler, HTTPStatus.NOT_FOUND, "Job not found (the server may have restarted).")
    json_response(handler, HTTPStatus.OK, job)


def post_audiobook_prompts(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    """{book:{cast, options}, voices:{name:url}, segments:[…]} -> {prompts:{id:{prompt, refs}}}."""
    book = payload.get("book") or {}
    voices = payload.get("voices") or {}
    out = {}
    for seg in payload.get("segments") or []:
        try:
            out[seg["id"]] = ab.build_prompt(seg, book, voices)
        except Exception as e:
            out[seg.get("id", "?")] = {"error": str(e)}
    json_response(handler, HTTPStatus.OK, {"prompts": out})


def post_audiobook_voice_sample(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    """{name, voice, line, language} -> {url}: a short TTS sample used as the voice reference.
    {preset, line, language} -> {url}: a preview of a preset voice (speaker://<id>); the
    preset itself — not this preview — is what segments reference."""
    line = str(payload.get("line") or "").strip()
    voice = str(payload.get("voice") or "").strip()
    preset = str(payload.get("preset") or "").strip()
    lang = str(payload.get("language") or "")
    if ab.engine_of({"audioEngine": payload.get("engine")}) == "1.0":
        return _voice_sample_10(handler, line, voice, preset, lang)
    # Optional Seed Audio endpoint chosen for this book; blank uses the server default.
    model = str(payload.get("model") or "").strip()
    if preset:
        if not line:
            return _err(handler, HTTPStatus.BAD_REQUEST, "A sample line is required.")
        lang = str(payload.get("language") or "")
        body = {"content": [{"type": "text", "text": f"Speaker (@Audio1){' speaking ' + lang if lang else ''}: “{line}”"},
                            {"type": "audio_url", "audio_url": {"url": "speaker://" + preset.replace("speaker://", "")}, "role": "reference_audio"}],
                "output_format": "wav", "audio_config": {"sample_rate": 44100, "speech_rate": 0, "loudness_rate": 0, "pitch_rate": 0}}
        if model:
            body["model"] = model
        try:
            return json_response(handler, HTTPStatus.OK, ab._seed_audio_once(body))
        except Exception as e:
            return _err(handler, HTTPStatus.BAD_GATEWAY, e)
    if not line or not voice:
        return _err(handler, HTTPStatus.BAD_REQUEST, "A voice description and a sample line are required.")
    body = {"content": [{"type": "text", "text": ab.sample_prompt(str(payload.get("name") or ""), voice, line, str(payload.get("language") or ""))}],
            "output_format": "wav", "audio_config": {"sample_rate": 44100, "speech_rate": 0, "loudness_rate": 0, "pitch_rate": 0}}
    if model:
        body["model"] = model
    try:
        res = ab._seed_audio_once(body)
        # A sample far longer than its text means the model padded it or read extra
        # words; regenerate once with a stricter prompt.
        expected_s = len(line.split()) / 2.5 + 2
        if ab._duration_s(ab._local_path(res["url"])) > max(12.0, expected_s * 2.5):
            body["content"][0]["text"] = ab.strict_sample_prompt(voice, line, str(payload.get("language") or ""))
            res = ab._seed_audio_once(body)
        # Samples become reference audio, which must be 1.8-30 s.
        res["url"] = ab.fit_reference_clip(res["url"])
        res["duration_ms"] = int(ab._duration_s(ab._local_path(res["url"])) * 1000)
    except Exception as e:
        return _err(handler, HTTPStatus.BAD_GATEWAY, e)
    json_response(handler, HTTPStatus.OK, res)


def _voice_sample_10(handler, line: str, voice: str, preset: str, lang: str) -> None:
    """Seed Audio 1.0 version of the voice sample / preset preview."""
    if not line or not (voice or preset):
        return _err(handler, HTTPStatus.BAD_REQUEST, "A voice description and a sample line are required.")
    try:
        if preset:
            prompt = f'Use @Audio1 as the speaker, dry and close-miked, and read exactly{" in " + lang if lang else ""}: "{line}"'
            return json_response(handler, HTTPStatus.OK, ab.seed_audio_10_once(prompt, ["speaker://" + preset.replace("speaker://", "")]))
        res = ab.seed_audio_10_once(ab.sample_prompt_10(voice, line, lang), [])
        # Samples become reference audio, which must be 1.8-30 s.
        res["url"] = ab.fit_reference_clip(res["url"])
        res["duration_ms"] = int(ab._duration_s(ab._local_path(res["url"])) * 1000)
    except PermissionError as e:
        return _err(handler, HTTPStatus.UNAUTHORIZED, e)
    except Exception as e:
        return _err(handler, HTTPStatus.BAD_GATEWAY, e)
    json_response(handler, HTTPStatus.OK, res)


def post_audiobook_render(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    """{items:[{id, prompt, refs}], audio:{speech_rate, format, engine: "1.0"|"1.5", model}} -> {job_id}."""
    items = [i for i in (payload.get("items") or []) if isinstance(i, dict) and i.get("id") and i.get("prompt")]
    if not items:
        return _err(handler, HTTPStatus.BAD_REQUEST, "Nothing to render.")
    json_response(handler, HTTPStatus.OK, {"job_id": ab.start_render(items, payload.get("audio") or {})})


def post_audiobook_assemble(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    """{parts:[{url, chapter}], title, pause_ms, chapter_pause_ms} -> {m4b_url, mp3_url, duration_ms, chapters}."""
    try:
        res = ab.assemble(payload.get("parts") or [], str(payload.get("title") or "Audiobook"),
                          int(payload.get("pause_ms") or 600), int(payload.get("chapter_pause_ms") or 1800))
    except ValueError as e:
        return _err(handler, HTTPStatus.BAD_REQUEST, e)
    except Exception as e:
        return _err(handler, HTTPStatus.INTERNAL_SERVER_ERROR, f"Assembly failed: {e}")
    json_response(handler, HTTPStatus.OK, res)
