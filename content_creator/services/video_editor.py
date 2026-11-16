"""Video Editor export: a timeline of trimmed clips -> one MP4, with ffmpeg.

Each clip is cut to its [in, out) range and re-encoded to one common format —
size (letterboxed or cropped to fill), frame rate, H.264 yuv420p, 48 kHz stereo
AAC, silent audio added where a clip has none or is muted — so the segments can
then be joined losslessly with the concat demuxer. Optional fades go on each
segment's own edges, so they never need overlapping clips.

Exports take a while for long timelines, so they run as background jobs polled
by id, like Blender renders.
"""

import os
import re
import shutil
import subprocess
import tempfile
import threading
import time
import urllib.parse
import urllib.request
import uuid
from typing import Optional

from content_creator.config.settings import OUTPUT_DIR, PROJECT_LOCAL_ROOT
from content_creator.services.long_duration import ffmpeg_missing_message, get_ffmpeg_path

QUALITY_CRF = {"high": 18, "standard": 21, "draft": 27}
MAX_CLIPS = 200
DOWNLOAD_TIMEOUT_S = 300

_jobs: dict = {}
_lock = threading.Lock()


def _even(n: float) -> int:
    v = max(2, int(round(n)))
    return v - (v % 2)


def _set(job_id: str, **patch) -> None:
    with _lock:
        _jobs[job_id].update(patch)


def get_job(job_id: str) -> Optional[dict]:
    with _lock:
        job = _jobs.get(job_id)
        return dict(job) if job else None


def _resolve(url: str, tmp: str, index: int) -> str:
    """Local path for a clip URL: /files/…, /project-files/<slug>/…, or http(s) (downloaded)."""
    path = urllib.parse.urlparse(url).path if url.startswith(("http://localhost", "http://127.0.0.1")) else url
    if path.startswith("/files/"):
        local = os.path.join(OUTPUT_DIR, os.path.basename(urllib.parse.unquote(path)))
    elif path.startswith("/project-files/"):
        slug, _, name = path[len("/project-files/"):].partition("/")
        local = os.path.join(PROJECT_LOCAL_ROOT, os.path.basename(slug), os.path.basename(urllib.parse.unquote(name)))
    elif url.startswith(("http://", "https://")):
        local = os.path.join(tmp, f"src-{index}.bin")
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Accept": "*/*"})
        with urllib.request.urlopen(req, timeout=DOWNLOAD_TIMEOUT_S) as resp, open(local, "wb") as f:
            shutil.copyfileobj(resp, f, 1024 * 1024)
    else:
        raise ValueError(f"Unsupported clip source: {url[:80]}")
    if not os.path.isfile(local):
        raise ValueError(f"Clip file not found: {url[:80]}")
    return local


def _probe(ffmpeg: str, path: str) -> dict:
    p = subprocess.run([ffmpeg, "-hide_banner", "-i", path], capture_output=True, text=True)
    err = p.stderr or ""
    m = re.search(r"Stream #.*?Video:.*?\b(\d{2,5})x(\d{2,5})\b", err)
    return {"w": int(m.group(1)) if m else 0, "h": int(m.group(2)) if m else 0, "audio": bool(re.search(r"Stream #.*?Audio:", err))}


def normalize_settings(raw: dict, first: dict) -> dict:
    res = str(raw.get("resolution") or "source")
    m = re.fullmatch(r"(\d{2,5})x(\d{2,5})", res)
    if m:
        w, h = int(m.group(1)), int(m.group(2))
    else:
        w, h = first.get("w") or 1920, first.get("h") or 1080
        # Keep "source" encodable: cap the long edge at 4K.
        scale = min(1.0, 3840 / max(w, h))
        w, h = w * scale, h * scale
    try:
        fps = max(1, min(60, int(raw.get("fps") or 30)))
    except (TypeError, ValueError):
        fps = 30
    try:
        fade = max(0.0, min(2.0, float(raw.get("fade") or 0)))
    except (TypeError, ValueError):
        fade = 0.0
    return {
        "w": _even(w), "h": _even(h), "fps": fps,
        "fit": "fill" if raw.get("fit") == "fill" else "fit",
        "crf": QUALITY_CRF.get(str(raw.get("quality") or "standard"), 21),
        "fade": fade,
        "fade_ends": bool(raw.get("fade_ends")),
    }


def _segment_cmd(ffmpeg: str, src: str, info: dict, clip: dict, s: dict, out: str, first: bool, last: bool) -> list:
    start = max(0.0, float(clip["in"]))
    dur = max(0.04, float(clip["out"]) - start)
    w, h = s["w"], s["h"]
    if s["fit"] == "fill":
        geo = f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h}"
    else:
        geo = f"scale={w}:{h}:force_original_aspect_ratio=decrease,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2:color=black"
    vf = [geo, "setsar=1", f"fps={s['fps']}"]
    af = ["aresample=48000"]
    # Fades between clips ("dip to black"), plus at the very start/end if asked.
    fd = min(s["fade"], dur / 2)
    fade_in = fd > 0 and (not first or s["fade_ends"])
    fade_out = fd > 0 and (not last or s["fade_ends"])
    if fade_in:
        vf.append(f"fade=t=in:st=0:d={fd:.3f}")
        af.append(f"afade=t=in:st=0:d={fd:.3f}")
    if fade_out:
        vf.append(f"fade=t=out:st={dur - fd:.3f}:d={fd:.3f}")
        af.append(f"afade=t=out:st={dur - fd:.3f}:d={fd:.3f}")
    vf.append("format=yuv420p")
    volume = 0.0 if clip.get("muted") else max(0.0, min(2.0, float(clip.get("volume", 1) if clip.get("volume") is not None else 1)))
    use_src_audio = info["audio"] and volume > 0
    if use_src_audio and abs(volume - 1) > 1e-3:
        af.insert(1, f"volume={volume:.3f}")

    cmd = [ffmpeg, "-y", "-hide_banner", "-ss", f"{start:.3f}", "-t", f"{dur:.3f}", "-i", src]
    if not use_src_audio:
        cmd += ["-f", "lavfi", "-t", f"{dur:.3f}", "-i", "anullsrc=r=48000:cl=stereo"]
    cmd += ["-map", "0:v:0", "-map", "0:a:0" if use_src_audio else "1:a:0",
            "-vf", ",".join(vf), "-af", ",".join(af),
            "-c:v", "libx264", "-preset", "veryfast", "-crf", str(s["crf"]), "-r", str(s["fps"]),
            "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
            "-t", f"{dur:.3f}", "-movflags", "+faststart", out]
    return cmd


def start_export(clips: list, settings: dict) -> str:
    ffmpeg = get_ffmpeg_path()
    if not ffmpeg:
        raise RuntimeError(ffmpeg_missing_message())
    clean = []
    for c in (clips or [])[:MAX_CLIPS]:
        url = str((c or {}).get("url") or "").strip()
        try:
            a, b = float(c.get("in", 0)), float(c.get("out", 0))
        except (TypeError, ValueError):
            continue
        if url and b - a > 0.02:
            clean.append({"url": url, "in": a, "out": b, "volume": c.get("volume"), "muted": bool(c.get("muted"))})
    if not clean:
        raise ValueError("Add at least one clip to the timeline.")
    job_id = uuid.uuid4().hex[:12]
    with _lock:
        _jobs[job_id] = {"id": job_id, "status": "running", "stage": "Preparing…", "progress": 0.0, "file_url": "", "error": "", "started": time.time()}
    threading.Thread(target=_run, args=(job_id, ffmpeg, clean, settings or {}), daemon=True).start()
    return job_id


def _run(job_id: str, ffmpeg: str, clips: list, raw_settings: dict) -> None:
    try:
        with tempfile.TemporaryDirectory(prefix="video-editor-") as tmp:
            sources, infos = {}, {}
            for i, c in enumerate(clips):
                if c["url"] not in sources:
                    _set(job_id, stage=f"Loading clip {i + 1} of {len(clips)}…")
                    sources[c["url"]] = _resolve(c["url"], tmp, i)
                    infos[c["url"]] = _probe(ffmpeg, sources[c["url"]])
            s = normalize_settings(raw_settings, infos[clips[0]["url"]])

            seg_paths = []
            for i, c in enumerate(clips):
                _set(job_id, stage=f"Encoding clip {i + 1} of {len(clips)}…", progress=i / (len(clips) + 1))
                out = os.path.join(tmp, f"seg-{i:04d}.mp4")
                cmd = _segment_cmd(ffmpeg, sources[c["url"]], infos[c["url"]], c, s, out, i == 0, i == len(clips) - 1)
                p = subprocess.run(cmd, capture_output=True, text=True)
                if p.returncode != 0 or not os.path.isfile(out):
                    raise RuntimeError(f"Clip {i + 1} failed to encode: {(p.stderr or '').strip()[-1500:]}")
                seg_paths.append(out)

            _set(job_id, stage="Joining clips…", progress=len(clips) / (len(clips) + 1))
            list_path = os.path.join(tmp, "segments.txt")
            with open(list_path, "w", encoding="utf-8") as f:
                for path in seg_paths:
                    f.write(f"file '{path}'\n")
            os.makedirs(OUTPUT_DIR, exist_ok=True)
            name = f"edit-{int(time.time() * 1000)}-{uuid.uuid4().hex[:6]}.mp4"
            out_path = os.path.join(OUTPUT_DIR, name)
            p = subprocess.run([ffmpeg, "-y", "-hide_banner", "-f", "concat", "-safe", "0", "-i", list_path,
                                "-c", "copy", "-movflags", "+faststart", out_path], capture_output=True, text=True)
            if p.returncode != 0 or not os.path.isfile(out_path):
                raise RuntimeError(f"Joining the clips failed: {(p.stderr or '').strip()[-1500:]}")
        _set(job_id, status="done", stage="Done", progress=1.0, file_url="/files/" + name,
             width=s["w"], height=s["h"], fps=s["fps"], bytes=os.path.getsize(out_path))
    except Exception as e:  # noqa: BLE001 — the job record carries the message to the UI
        _set(job_id, status="error", stage="Failed", error=str(e))
