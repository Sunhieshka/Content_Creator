"""Seed Audio 1.0 — non-streaming "reference-to-audio" TTS on the BytePlus Voice API.

One request turns a text prompt into up to 120 s of audio: speech, multi-role conversation,
background music and sound effects together (T2A). Up to 3 reference audios (@Audio1–@Audio3:
an uploaded clip, a remote URL or a voice ID) steer the voices (TA2A), or one reference image
gives a character's voice. English and Chinese.

Endpoint: POST https://voice.ap-southeast-1.bytepluses.com/api/v3/tts/create with an X-Api-Key
header (the BytePlus Voice key in SEED_AUDIO_API_KEY). The audio
comes back Base64-encoded and is saved in OUTPUT_DIR, since the returned url lasts 2 hours.
"""

from __future__ import annotations

import base64
import json
import os
import threading
import time
import urllib.error
import urllib.request
import uuid

from dotenv import load_dotenv

from content_creator.config.settings import OUTPUT_DIR, PROJECT_ROOT, get_env

load_dotenv(dotenv_path=os.path.join(PROJECT_ROOT, ".env"))

MODEL = "seed-audio-1.0"
DEFAULT_URL = "https://voice.ap-southeast-1.bytepluses.com/api/v3/tts/create"
MAX_PROMPT_CHARS = 3000
MAX_AUDIO_REFS = 3
MAX_REF_BYTES = 10 * 1024 * 1024
MAX_OUTPUT_SECONDS = 120
PRICE_PER_MINUTE_USD = 0.15
FORMATS = ("wav", "mp3", "pcm", "ogg_opus")
SAMPLE_RATES = (8000, 16000, 24000, 32000, 44100, 48000)
TIMEOUT_S = 300

_slots = threading.BoundedSemaphore(4)


def _api_key() -> str:
    return get_env("SEED_AUDIO_API_KEY") or ""


def _url() -> str:
    return get_env("SEED_AUDIO_10_URL", DEFAULT_URL) or DEFAULT_URL


def config() -> dict:
    return {"model": MODEL, "has_key": bool(_api_key()), "max_prompt_chars": MAX_PROMPT_CHARS,
            "max_audio_refs": MAX_AUDIO_REFS, "max_output_seconds": MAX_OUTPUT_SECONDS,
            "price_per_minute_usd": PRICE_PER_MINUTE_USD, "formats": list(FORMATS), "sample_rates": list(SAMPLE_RATES)}


def _local_b64(url: str) -> str:
    name = os.path.basename(url[len("/files/"):].split("?")[0])
    path = os.path.join(OUTPUT_DIR, name)
    if not name or not os.path.isfile(path):
        raise ValueError(f"Reference file not found on the server: {name or url}")
    if os.path.getsize(path) > MAX_REF_BYTES:
        raise ValueError(f"{name} is over the 10 MB reference limit.")
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("ascii")


def _reference(ref: dict) -> dict:
    """One UI reference -> one API reference ({speaker} | {audio_data} | {audio_url} | {image_data} | {image_url})."""
    kind, value = ref.get("kind"), str(ref.get("value") or "").strip()
    if not value:
        raise ValueError("A reference is empty.")
    if kind == "speaker":
        return {"speaker": value}
    is_image = kind == "image"
    if value.startswith("/files/"):
        return {("image_data" if is_image else "audio_data"): _local_b64(value)}
    if value.startswith("data:"):
        return {("image_data" if is_image else "audio_data"): value.partition(",")[2]}
    if value.startswith(("http://", "https://")):
        return {("image_url" if is_image else "audio_url"): value}
    raise ValueError("A reference must be an uploaded file, an http(s) URL or a voice ID.")


def _clamp(v, lo, hi, default=0) -> int:
    try:
        return max(lo, min(hi, int(v)))
    except (TypeError, ValueError):
        return default


def generate(text_prompt: str, references: list | None = None, audio_config: dict | None = None) -> dict:
    key = _api_key()
    if not key:
        raise PermissionError("No Seed Audio key. Add SEED_AUDIO_API_KEY to .env and restart.")
    text_prompt = (text_prompt or "").strip()
    if not text_prompt:
        raise ValueError("Write a prompt.")
    if len(text_prompt) > MAX_PROMPT_CHARS:
        raise ValueError(f"The prompt is {len(text_prompt)} characters; Seed Audio 1.0 takes at most {MAX_PROMPT_CHARS}.")
    refs = [r for r in (references or []) if isinstance(r, dict)]
    images = [r for r in refs if r.get("kind") == "image"]
    audios = [r for r in refs if r.get("kind") != "image"]
    if images and audios:
        raise ValueError("Use either reference audio or one reference image, not both.")
    if len(images) > 1:
        raise ValueError("Only one reference image per request.")
    if len(audios) > MAX_AUDIO_REFS:
        raise ValueError(f"At most {MAX_AUDIO_REFS} reference audios (@Audio1–@Audio{MAX_AUDIO_REFS}).")

    cfg = audio_config or {}
    fmt = cfg.get("format") if cfg.get("format") in FORMATS else "wav"
    rate = int(cfg.get("sample_rate") or 24000)
    body = {
        "model": MODEL,
        "text_prompt": text_prompt,
        "audio_config": {
            "format": fmt,
            "sample_rate": rate if rate in SAMPLE_RATES else 24000,
            "speech_rate": _clamp(cfg.get("speech_rate"), -50, 100),
            "loudness_rate": _clamp(cfg.get("loudness_rate"), -50, 100),
            "pitch_rate": _clamp(cfg.get("pitch_rate"), -12, 12),
        },
        "watermark": {},
    }
    if refs:
        body["references"] = [_reference(r) for r in refs]

    started = time.time()
    req = urllib.request.Request(_url(), data=json.dumps(body).encode("utf-8"), method="POST",
                                 headers={"Content-Type": "application/json", "X-Api-Key": key})
    with _slots:
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT_S) as resp:
                status, raw, logid = resp.status, resp.read(), resp.headers.get("X-Tt-Logid") or ""
        except urllib.error.HTTPError as e:
            status, raw, logid = e.code, e.read(), e.headers.get("X-Tt-Logid") or ""
    try:
        data = json.loads(raw.decode("utf-8") or "{}")
    except ValueError:
        data = {"message": raw.decode("utf-8", "replace")}
    audio_b64 = data.get("audio") or ""
    if status >= 300 or not audio_b64:
        msg = data.get("message") or f"HTTP {status}"
        raise RuntimeError(f"Seed Audio 1.0: {msg}" + (f" (code {data.get('code')})" if data.get("code") else "") + (f" · log id {logid}" if logid else ""))

    ext = {"ogg_opus": "ogg"}.get(fmt, fmt)
    name = f"seed-audio-10-{int(time.time() * 1000)}-{uuid.uuid4().hex[:6]}.{ext}"
    with open(os.path.join(OUTPUT_DIR, name), "wb") as f:
        f.write(base64.b64decode(audio_b64))
    billed = float(data.get("original_duration") or data.get("duration") or 0)
    return {"url": "/files/" + name, "format": fmt, "duration": data.get("duration"),
            "original_duration": data.get("original_duration"),
            "cost_usd": round(min(billed, MAX_OUTPUT_SECONDS) / 60 * PRICE_PER_MINUTE_USD, 4),
            "seconds": round(time.time() - started, 1), "log_id": logid}
