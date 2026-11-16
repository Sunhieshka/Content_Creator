"""Visual Understanding: ask a Seed 2.x vision-language model about images and videos.

Images go into the request as input_image (downscaled by fit_for_llm when over the 10 MiB
limit). Videos always go through the ModelArk Files API: the upload names the model in
preprocess_configs.video.model, and that model decides how the video is preprocessed — Seed 2.0
Mini and Lite also extract the audio track (speech, music, sound effects), Seed 2.0 Pro and Seed
2.1 Turbo see the frames only. The Files API takes up to 512 MB, so long clips work, and an
uploaded file is reused for 7 days for the same (file, model, fps).

Follow-up questions pass previous_response_id, so the media is not sent again.
"""

from __future__ import annotations

import hashlib
import json
import os
import tempfile
import threading
import time
import urllib.error
import urllib.request

from content_creator.config.settings import OUTPUT_DIR
from content_creator.services import seedream_studio
from content_creator.utils.llm_images import fit_for_llm

MODELS = [
    {"id": "seed-2-0-mini-260428", "label": "Seed 2.0 Mini", "audio": True, "note": "fastest · hears audio"},
    {"id": "seed-2-0-lite-260428", "label": "Seed 2.0 Lite", "audio": True, "note": "balanced · hears audio"},
    {"id": "seed-2-0-pro-260328", "label": "Seed 2.0 Pro", "audio": False, "note": "strongest reasoning · frames only"},
    {"id": "dola-seed-2-1-turbo-260628", "label": "Seed 2.1 Turbo", "audio": False, "note": "fast · frames only"},
]
DEFAULT_MODEL = MODELS[1]["id"]
MAX_IMAGES = 10
MAX_VIDEO_BYTES = 512 * 1024 * 1024       # Files API limit
MIN_FPS, MAX_FPS, DEFAULT_FPS = 0.2, 5.0, 1.0
FILE_TTL_S = 6 * 24 * 3600                # uploads live 7 days; reuse for a little less
UPLOAD_WAIT_S = 15 * 60
RESPONSE_TIMEOUT_S = 15 * 60

SYSTEM = (
    "You are an expert in visual understanding. Answer from what is actually in the provided images "
    "and video: be specific and concrete, cite timestamps (mm:ss) for events in a video, and say so "
    "plainly when something cannot be determined from the media. Follow the user's requested output "
    "format exactly."
)
AUDIO_NOTE = " The video's audio track is included: use speech, music and sound effects as evidence too."
NO_AUDIO_NOTE = (" You receive the video's frames only; its audio track is not given to you, although the video may "
                 "well have sound. Never claim what is said or heard, and never say the video is silent; if the "
                 "question needs the audio, say that it needs a model that hears audio (Seed 2.0 Mini or Lite).")

_uploads: dict = {}                       # (sha1, model, fps) -> (file_id, uploaded_at)
_uploads_lock = threading.Lock()


def config() -> dict:
    return {"configured": bool(seedream_studio._api_key()), "models": MODELS, "default_model": DEFAULT_MODEL,
            "fps": {"min": MIN_FPS, "max": MAX_FPS, "default": DEFAULT_FPS}, "max_images": MAX_IMAGES}


def _model(model_id: str) -> dict:
    m = next((x for x in MODELS if x["id"] == model_id), None)
    if not m:
        raise ValueError(f"Unknown model: {model_id}")
    return m


# ---- ModelArk plumbing ----------------------------------------------------------------------

def _ark():
    from byteplussdkarkruntime import Ark

    key = seedream_studio._api_key()
    if not key:
        raise RuntimeError("No ARK API key. Set ARK_API_KEY in .env and restart.")
    return Ark(base_url=seedream_studio._base_url(), api_key=key, timeout=UPLOAD_WAIT_S)


def _post(path: str, body: dict) -> dict:
    req = urllib.request.Request(
        f"{seedream_studio._base_url()}{path}",
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {seedream_studio._api_key()}"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=RESPONSE_TIMEOUT_S) as resp:
            return json.loads(resp.read().decode("utf-8") or "{}")
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", "replace")
        try:
            err = json.loads(raw).get("error") or {}
            msg = err.get("message") if isinstance(err, dict) else str(err)
        except ValueError:
            msg = raw[:600]
        raise RuntimeError(msg or f"HTTP {e.code}") from None


# ---- video ----------------------------------------------------------------------------------

def _video_path(ref: str) -> tuple:
    """(local path, is_temp) for a /files/ URL or an http(s) URL (downloaded to a temp file)."""
    if ref.startswith("/files/"):
        name = os.path.basename(ref[len("/files/"):].split("?")[0])
        path = os.path.join(OUTPUT_DIR, name)
        if not name or not os.path.isfile(path):
            raise ValueError(f"Video not found on the server: {name or ref}")
        return path, False
    if ref.startswith(("http://", "https://")):
        fd, path = tempfile.mkstemp(prefix="vu-", suffix=os.path.splitext(ref.split("?")[0])[1] or ".mp4")
        with os.fdopen(fd, "wb") as f, urllib.request.urlopen(
                urllib.request.Request(ref, headers={"User-Agent": "Mozilla/5.0"}), timeout=300) as resp:
            while chunk := resp.read(1 << 20):
                f.write(chunk)
                if f.tell() > MAX_VIDEO_BYTES:
                    break
        return path, True
    raise ValueError("Expected the video as a /files/ URL or an http(s) URL.")


def _sha1(path: str) -> str:
    h = hashlib.sha1()
    with open(path, "rb") as f:
        while chunk := f.read(1 << 20):
            h.update(chunk)
    return h.hexdigest()


def upload_video(ref: str, model: str, fps: float) -> str:
    """Uploads the video to the Files API, preprocessed for `model`; returns its file_id."""
    path, is_temp = _video_path(ref)
    try:
        size = os.path.getsize(path)
        if size > MAX_VIDEO_BYTES:
            raise ValueError("The video is over the 512 MB limit for visual understanding.")
        key = (_sha1(path), model, fps)
        with _uploads_lock:
            hit = _uploads.get(key)
        if hit and time.time() - hit[1] < FILE_TTL_S:
            return hit[0]
        ark = _ark()
        with open(path, "rb") as f:
            created = ark.files.create(file=f, purpose="user_data",
                                       preprocess_configs={"video": {"model": model, "fps": fps}})
        done = ark.files.wait_for_processing(created.id, poll_interval=2.0, max_wait_seconds=UPLOAD_WAIT_S)
        if done.status != "active":
            detail = getattr(done, "error", None) or getattr(done, "status_details", None) or ""
            raise RuntimeError(f"The video could not be processed{': ' + str(detail) if detail else ''}.")
        with _uploads_lock:
            _uploads[key] = (done.id, time.time())
        return done.id
    finally:
        if is_temp:
            try:
                os.remove(path)
            except OSError:
                pass


# ---- ask ------------------------------------------------------------------------------------

def _output_text(data: dict) -> tuple:
    """(answer text, reasoning summary) from a /responses result."""
    text, thought = [], []
    for item in data.get("output") or []:
        if item.get("type") == "message":
            text += [c.get("text") or "" for c in item.get("content") or [] if c.get("type") == "output_text"]
        elif item.get("type") == "reasoning":
            thought += [s.get("text") or "" for s in item.get("summary") or []]
    return "".join(text).strip(), "\n".join(thought).strip()


def analyze(prompt: str, model: str = DEFAULT_MODEL, images: list | None = None, video: str = "",
            fps: float = DEFAULT_FPS, thinking: bool = True, previous_response_id: str = "") -> dict:
    """One question about the media. A follow-up passes previous_response_id and no media."""
    m = _model(model or DEFAULT_MODEL)
    prompt = (prompt or "").strip()
    if not prompt:
        raise ValueError("Write a question or instruction.")
    images = [x for x in (images or []) if x]
    if len(images) > MAX_IMAGES:
        raise ValueError(f"At most {MAX_IMAGES} images per request.")
    if not previous_response_id and not images and not video:
        raise ValueError("Add at least one image or a video.")
    fps = max(MIN_FPS, min(MAX_FPS, float(fps or DEFAULT_FPS)))

    started = time.time()
    content: list = []
    for ref in images:
        content.append({"type": "input_image", "detail": "high", "image_url": fit_for_llm(seedream_studio._resolve(ref))})
    if video:
        content.append({"type": "input_video", "file_id": upload_video(video, m["id"], fps)})
    content.append({"type": "input_text", "text": prompt})
    uploaded_s = time.time() - started

    body = {"model": m["id"], "input": [{"role": "user", "content": content}]}
    if previous_response_id:
        body["previous_response_id"] = previous_response_id
    else:
        body["instructions"] = SYSTEM + ((AUDIO_NOTE if m["audio"] else NO_AUDIO_NOTE) if video else "")
    if not thinking:
        body["thinking"] = {"type": "disabled"}
    data = _post("/responses", body)
    text, reasoning = _output_text(data)
    if not text:
        raise RuntimeError("The model returned no answer.")
    usage = data.get("usage") or {}
    return {"id": data.get("id") or "", "text": text, "reasoning": reasoning, "model": m["id"],
            "audio": bool(video) and m["audio"], "usage": {k: usage.get(k) for k in ("input_tokens", "output_tokens", "total_tokens")},
            "seconds": round(time.time() - started, 1), "upload_seconds": round(uploaded_s, 1)}


# ---- Video -> video-generation prompt ----------------------------------------------------------
# Seed LLM watches a video and writes the Seedance prompt(s) that would recreate it. Clips longer
# than the target model's maximum are split into the fewest shots: each one filled to the maximum
# before the next starts (a boundary may move a little to land on a natural cut). Every shot uses
# the Script to Prompt layout ("SHOT n", "IN THIS SHOT:", timed beats, "N second total runtime"),
# so the Breakdown cards, Video Generation and Long Duration read it the same way.

V2P_SYSTEM = """You are a film analyst and Seedance prompt writer. You watch a video and write the video-generation \
prompt(s) that would recreate it as exactly as possible: the same people, wardrobe, setting, props, staging, \
action, timing, camera work, lighting, colour, visual style and sound.

Write {shots} shot(s), covering the video's whole {duration:.1f} s in order:
{plan}
You may move a boundary by up to 3 s to land on a natural cut or pause, but every shot must be between 4 and \
{max_s} seconds and the shots must cover the whole video with no gaps or overlaps.

For EACH shot output exactly this layout (plain text, no markdown, no bold):
SHOT n

IN THIS SHOT: every person (by a short consistent name, e.g. "the woman in the red coat"), the location and \
the key props.

STYLE: the medium (live-action photography, 2D or 3D animation…), camera/lens look, colour grade, lighting \
(direction, softness, colour, practical sources) and overall mood, as seen.

SUBJECTS: for each person, a precise appearance description so they can be recreated without reference \
images: age range, build, skin tone, face, hair, every garment with colour and material, accessories. Keep \
the same wording for the same person in every shot.

SETTING: the location, time of day, weather, set dressing and background activity.

SHOT DESCRIPTION: timed beats that together fill the shot exactly, e.g. "0–3s: …", "3–7s: …", restarting at \
0 s in every shot. Each beat gives the shot size, camera angle and camera movement, then what happens: \
movement, gestures, expressions, eye-lines and every visible change. When the camera cuts inside a shot, \
start the beat with "Cut to:".

DIALOGUE & SOUND: every spoken line verbatim in double quotes with the speaker and delivery (tone, volume, \
pace), at its beat time; then music (genre, instruments, tempo, mood) and sound effects with their times. \
{audio_rule}

End the shot with its own line: "<length> second total runtime." using that shot's length in whole seconds.

Rules: describe only what is in the video, concretely and in present tense; never invent story beyond it. \
Do not include any on-screen text, subtitles, captions, titles, logos or watermarks — leave them out \
entirely. No commentary before, between or after the shots."""

V2P_AUDIO = "Use the audio track you hear."
V2P_NO_AUDIO = ("You see the frames only and cannot hear the audio: do not invent dialogue or sounds. Write "
                "\"(audio not analysed)\" in this section, but still note visible lip movement as \"speaks\".")


def _plan_shots(duration: float, max_s: int) -> list[tuple[int, int]]:
    """Fewest shots: fill each to max_s before the next; a short tail (< 4 s) joins the last full shot by
    splitting the final stretch evenly."""
    total = max(1, int(round(duration)))
    n = max(1, -(-total // max_s))
    bounds, start = [], 0
    for i in range(n):
        end = total if i == n - 1 else start + max_s
        bounds.append((start, end))
        start = end
    if len(bounds) > 1 and bounds[-1][1] - bounds[-1][0] < 4:
        a, b = bounds[-2][0], bounds[-1][1]
        mid = a + (b - a + 1) // 2
        bounds[-2:] = [(a, mid), (mid, b)]
    return bounds


def video_to_prompt(video: str, model: str = DEFAULT_MODEL, fps: float = 2.0, thinking: bool = True,
                    max_shot_seconds: int = 30) -> dict:
    """Seedance prompt(s) that recreate `video`, split into shots of at most max_shot_seconds."""
    from content_creator.services.hybrid_studio import probe

    if not video:
        raise ValueError("Add a video.")
    m = _model(model or DEFAULT_MODEL)
    max_s = max(4, min(30, int(max_shot_seconds or 30)))
    fps = max(MIN_FPS, min(MAX_FPS, float(fps or 2.0)))
    duration = float(probe(video).get("duration") or 0)
    if duration <= 0:
        raise ValueError("Could not read the video's length.")
    plan = _plan_shots(duration, max_s)
    instructions = V2P_SYSTEM.format(
        shots=len(plan), duration=duration, max_s=max_s,
        plan="\n".join(f"- SHOT {i + 1}: {a}–{b} s of the video ({b - a} s)" for i, (a, b) in enumerate(plan)),
        audio_rule=V2P_AUDIO if m["audio"] else V2P_NO_AUDIO)

    started = time.time()
    content = [{"type": "input_video", "file_id": upload_video(video, m["id"], fps)},
               {"type": "input_text", "text": "Write the Seedance prompt(s) that recreate this video exactly."}]
    body = {"model": m["id"], "instructions": instructions, "input": [{"role": "user", "content": content}]}
    if not thinking:
        body["thinking"] = {"type": "disabled"}
    data = _post("/responses", body)
    text, reasoning = _output_text(data)
    if not text:
        raise RuntimeError("The model returned no prompt.")
    usage = data.get("usage") or {}
    return {"text": text.strip(), "reasoning": reasoning, "model": m["id"], "audio": m["audio"],
            "duration": round(duration, 1), "shots": len(plan), "max_shot_seconds": max_s,
            "usage": {k: usage.get(k) for k in ("input_tokens", "output_tokens", "total_tokens")},
            "seconds": round(time.time() - started, 1)}
