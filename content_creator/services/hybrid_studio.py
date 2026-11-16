"""Hybrid Studio: put the people from a green- (or blue-) screen video into a new location.

Seedance 2.5 regenerates the video in "video editing" mode: the green-screen clip is the reference
video (the performance — faces, bodies, clothes, every movement, expression and lip movement, the
camera), and the background image is the reference for the location. The output follows the input
clip's length and aspect ratio (ratio "adaptive", duration -1), so clips must be 4–30 s.

This module holds the parts that run here: reading and checking the clip, generating a background
plate that matches its camera, and finishing the result (keeping a local copy and, optionally, the
clip's original audio). The generation itself goes through /api/video/start from the page.
"""

from __future__ import annotations

import json
import math
import os
import shutil
import subprocess
import time
import uuid

from content_creator.config.settings import OUTPUT_DIR

FFMPEG = shutil.which("ffmpeg") or "ffmpeg"
FFPROBE = shutil.which("ffprobe") or "ffprobe"
MIN_SECONDS, MAX_SECONDS = 4, 30   # Seedance 2.5 video editing


# ---- files ---------------------------------------------------------------------------------

def local_path(url: str) -> str:
    """A /files/<name> URL -> its path in OUTPUT_DIR (http(s) URLs are passed to ffmpeg as-is)."""
    if url.startswith("/files/"):
        name = os.path.basename(url[len("/files/"):].split("?")[0])
        path = os.path.join(OUTPUT_DIR, name)
        if not os.path.isfile(path):
            raise ValueError(f"File not found on the server: {name}")
        return path
    if url.startswith(("http://", "https://")):
        return url
    raise ValueError("Expected a /files/ URL or an http(s) URL.")


def probe(url: str) -> dict:
    """{width, height, duration, fps, has_audio, is_image} of a video or image."""
    out = subprocess.run([FFPROBE, "-v", "error", "-show_streams", "-show_format", "-of", "json", local_path(url)],
                         capture_output=True, text=True, timeout=60)
    if out.returncode != 0:
        raise ValueError("Could not read this file: " + (out.stderr.strip()[-300:] or "unknown format"))
    data = json.loads(out.stdout or "{}")
    vs = next((s for s in data.get("streams") or [] if s.get("codec_type") == "video"), None)
    if not vs:
        raise ValueError("No video or image found in this file.")
    fmt = data.get("format") or {}
    num, _, den = str(vs.get("avg_frame_rate") or vs.get("r_frame_rate") or "0/1").partition("/")
    fps = float(num) / float(den or 1) if float(den or 1) else 0.0
    duration = float(vs.get("duration") or fmt.get("duration") or 0)
    is_image = (fmt.get("format_name") or "").startswith(("image2", "png_pipe", "jpeg_pipe", "webp_pipe")) or duration == 0 or fps == 0
    return {"width": int(vs.get("width") or 0), "height": int(vs.get("height") or 0), "duration": round(duration, 3),
            "fps": round(fps, 3) if fps else 25.0, "is_image": bool(is_image),
            "has_audio": any(s.get("codec_type") == "audio" for s in data.get("streams") or [])}


def _frame_rgb(url: str, at: float, w: int = 96) -> tuple:
    """One frame, scaled to w px wide, as raw RGB bytes: (bytes, width, height)."""
    info = probe(url)
    h = max(2, int(round(w * info["height"] / max(1, info["width"]) / 2)) * 2)
    cmd = [FFMPEG, "-v", "error"]
    if not info["is_image"]:
        cmd += ["-ss", f"{max(0.0, min(at, max(0.0, info['duration'] - 0.1))):.3f}"]
    cmd += ["-i", local_path(url), "-frames:v", "1", "-vf", f"scale={w}:{h}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    out = subprocess.run(cmd, capture_output=True, timeout=60)
    if out.returncode != 0 or len(out.stdout) < w * h * 3:
        raise ValueError("Could not read a frame: " + out.stderr.decode("utf-8", "replace")[-300:])
    return out.stdout, w, h


def _px(buf: bytes, i: int) -> tuple:
    return buf[3 * i], buf[3 * i + 1], buf[3 * i + 2]


def _is_key(rgb: tuple, key: tuple, tol: float = 70.0) -> bool:
    # Close to the screen colour, and the key channel clearly dominant.
    r, g, b = rgb
    kr, kg, kb = key
    dist = math.sqrt((r - kr) ** 2 + (g - kg) ** 2 + (b - kb) ** 2)
    if kg >= kb:
        return dist < tol or (g > 80 and g > r * 1.35 and g > b * 1.35)
    return dist < tol or (b > 80 and b > r * 1.35 and b > g * 1.2)


# ---- analysis -------------------------------------------------------------------------------
def analyze(video_url: str) -> dict:
    """The clip's facts, the screen colour (detected from the frame borders of a few sampled
    frames), how much of the frame it covers, and whether the length suits Seedance editing."""
    info = probe(video_url)
    times = [0.0] if info["is_image"] else [info["duration"] * f for f in (0.1, 0.5, 0.9)]
    border = []
    for t in times:
        buf, w, h = _frame_rgb(video_url, t)
        for x in range(w):
            border += [_px(buf, x), _px(buf, (h - 1) * w + x)]
        for y in range(h):
            border += [_px(buf, y * w), _px(buf, y * w + w - 1)]
    # Keep border pixels where green or blue dominates, then take their median.
    screenish = [p for p in border if max(p[1], p[2]) > 60 and max(p[1], p[2]) > p[0] * 1.25]
    pool = screenish or border
    key = tuple(sorted(c[k] for c in pool)[len(pool) // 2] for k in range(3))
    kind = "green" if key[1] >= key[2] else "blue"
    buf, w, h = _frame_rgb(video_url, times[len(times) // 2])
    cover = sum(1 for i in range(w * h) if _is_key(_px(buf, i), key)) / float(w * h)
    length_ok = MIN_SECONDS <= info["duration"] <= MAX_SECONDS
    return {**info, "key_color": "#%02x%02x%02x" % key, "screen": kind, "screen_share": round(cover, 3),
            "screen_found": len(screenish) > len(border) * 0.3, "length_ok": length_ok,
            "length_note": "" if length_ok else f"Seedance video editing needs a {MIN_SECONDS}–{MAX_SECONDS} s clip; this one is {info['duration']:.1f} s. Trim it in the Video Editor first."}


# ---- AI regeneration: finishing --------------------------------------------------------------

def finalize(result_url: str, source_url: str, keep_audio: bool = True) -> dict:
    """Saves Seedance's result in OUTPUT_DIR (its link expires after 24 h) and, when asked, lays
    the green-screen clip's original audio back over it so speech stays exactly as recorded."""
    import urllib.request

    if not result_url:
        raise ValueError("No generated video to finish.")
    raw = f"hybrid-ai-raw-{int(time.time() * 1000)}-{uuid.uuid4().hex[:6]}.mp4"
    raw_path = os.path.join(OUTPUT_DIR, raw)
    if result_url.startswith("/files/"):
        raw_path = local_path(result_url)
    else:
        req = urllib.request.Request(result_url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=300) as resp, open(raw_path, "wb") as f:
            f.write(resp.read())
    src = probe(source_url) if source_url else {"has_audio": False}
    if not (keep_audio and src.get("has_audio")):
        return {"url": "/files/" + os.path.basename(raw_path), "audio": "generated"}
    name = f"hybrid-ai-{int(time.time() * 1000)}-{uuid.uuid4().hex[:6]}.mp4"
    out = subprocess.run([FFMPEG, "-v", "error", "-y", "-i", raw_path, "-i", local_path(source_url),
                          "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
                          "-shortest", "-movflags", "+faststart", os.path.join(OUTPUT_DIR, name)],
                         capture_output=True, text=True, timeout=300)
    if out.returncode != 0:
        return {"url": "/files/" + os.path.basename(raw_path), "audio": "generated",
                "warning": "Could not attach the original audio: " + out.stderr.strip()[-200:]}
    return {"url": "/files/" + name, "audio": "original"}


# ---- background generation ------------------------------------------------------------------

def extract_frame(video_url: str, at: float = 0.5) -> str:
    """A full-size frame of the video as a /files/ PNG (the reference for background plates)."""
    info = probe(video_url)
    at = max(0.0, min(at, max(0.0, info["duration"] - 0.05)))
    name = f"hybrid-frame-{int(time.time() * 1000)}-{uuid.uuid4().hex[:6]}.png"
    out = subprocess.run([FFMPEG, "-v", "error", "-y", "-ss", f"{at:.3f}", "-i", local_path(video_url), "-frames:v", "1",
                          os.path.join(OUTPUT_DIR, name)], capture_output=True, text=True, timeout=60)
    if out.returncode != 0:
        raise RuntimeError("Could not extract a frame: " + out.stderr.strip()[-300:])
    return "/files/" + name


BG_PLATE_PROMPT = (
    "[Image 1] is a frame filmed on a {screen} screen. Create ONLY the background plate for it: {description}. "
    "Match [Image 1]'s camera exactly — the same camera height, angle, lens and perspective, the same horizon "
    "line and the same floor plane where the people stand — so the people can be composited back in and look "
    "filmed there. Light the location so it suits the people's existing light (direction, softness and colour). "
    "The plate is EMPTY: no people, no green or blue screen, no text, no watermark."
)


def generate_background(video_url: str, description: str, screen: str = "green", model: str = "pro") -> dict:
    from content_creator.services import seedream_studio

    if not (description or "").strip():
        raise ValueError("Describe the background you want.")
    info = probe(video_url)
    ref = extract_frame(video_url, info["duration"] * 0.5)
    prompt = BG_PLATE_PROMPT.format(screen=screen, description=description.strip())
    ratio = info["width"] / max(1, info["height"])
    size = "2560x1440" if ratio >= 1.5 else "1440x2560" if ratio <= 0.67 else "2048x2048"
    status, data = seedream_studio.generate({"model": model, "prompt": prompt, "image": ref, "size": size,
                                             "output_format": "png", "watermark": False})
    if not (200 <= status < 300):
        raise RuntimeError(((data or {}).get("error") or {}).get("message") or f"Seedream HTTP {status}")
    first = (data.get("data") or [{}])[0]
    url = first.get("local_url") or first.get("url")
    if not url:
        raise RuntimeError("The image model returned no background.")
    return {"url": url, "reference": ref, "prompt": prompt}
