"""Blender 3D tool: text description -> Seed LLM writes a bpy script -> Blender renders it headless.

The LLM only builds the scene and its animation. Render settings, the frame range
and the output are owned by a fixed header/footer added here, so a generated (or
hand-edited) script can't break them. Blender renders PNG frames, which are
encoded to H.264 MP4 with the app's ffmpeg (robust across Blender versions).
Renders take minutes, so they run as background jobs polled by job id.
"""

import glob
import os
import re
import shutil
import subprocess
import tempfile
import threading
import time
import uuid
from typing import Optional

from content_creator.config.settings import OUTPUT_DIR
from content_creator.services import blender_workflows
from content_creator.services.blender_helpers import HELPERS, HELPERS_DOC

ENGINES = ("eevee", "cycles", "workbench")
ASPECTS = {"16:9": (16, 9), "9:16": (9, 16), "1:1": (1, 1), "4:3": (4, 3)}
HEIGHTS = {"480p": 480, "720p": 720, "1080p": 1080}
MAX_SECONDS = 30
RENDER_TIMEOUT_S = 60 * 60
LOG_TAIL_CHARS = 4000

SCRIPT_RULES = """You write Python scripts for Blender {version} (bpy API) that build and animate a 3D scene. The app runs your script headless and renders it to video.

Hard rules:
1. Start with: import bpy, math, mathutils (random is allowed only with random.seed(<fixed int>)). No other imports. No file I/O, network, subprocess, or os calls.
2. The app has ALREADY reset Blender to an empty scene and defined these globals — use them, do not redefine them: FPS (int), FRAME_START (=1), FRAME_END (int, last frame), DURATION_S (float), RES_X, RES_Y (ints). Use scene = bpy.context.scene.
3. Build everything yourself: objects/meshes (bpy.ops.mesh.primitive_* or bmesh), materials, lights, world background, and exactly one camera assigned to scene.camera. Aim the camera with a 'TRACK_TO' constraint on an empty or the subject, and frame the subject fully for a RES_X x RES_Y frame.
4. Materials: mat = bpy.data.materials.new(name); mat.use_nodes = True; bsdf = mat.node_tree.nodes.get("Principled BSDF"). Only set these inputs, each guarded with `if "<name>" in bsdf.inputs:` — "Base Color" (RGBA 4-tuple), "Metallic", "Roughness", "Alpha", "Emission Color" (RGBA), "Emission Strength", "Transmission Weight", "Coat Weight". Never use "Specular", "Emission" or "Subsurface" (renamed in recent versions).
5. World: create bpy.data.worlds.new if scene.world is None; set the "Background" node's "Color" and "Strength".
6. Scale and exposure (light intensity falls off with the square of distance, so these go together):
   - Never model at real-world size. Scale the scene so the main subject is about 2 units across (even earbuds or a ring), centred near the origin and resting on the ground at z=0.
   - Camera 6-10 units from the subject, lens 50-85 mm (cam_data.lens), the subject filling about 60% of the frame.
   - Lights 4-7 units from the subject: AREA key 300-600 W (size 2-4), fill 100-250 W, rim 200-400 W; or a SUN with strength 2-4 for outdoor scenes. POINT 200-800 W. Use bpy.data.lights.new + bpy.data.objects.new + link to scene.collection. Three-point lighting for products and characters.
   - World "Background" Strength 0.2-0.6 for studio scenes (up to 1.0 for outdoor skies). Backdrops and floors use mid-grey or the requested colour (never pure white 1.0 — use at most 0.8) so dark products stay readable and nothing clips to white.
   - Dark products need contrast: a lighter backdrop or a strong rim light, plus some Roughness (0.3-0.6) so highlights show their shape.
7. Contact and smoothness: objects that sit on something must touch it exactly (compute z from the heights: bottom of the object = top of the surface below), never float unless the description says so. Curved primitives need enough segments (cylinders/cones vertices=64, UV spheres segments=64 ring_count=32) and smooth shading (for p in mesh.polygons: p.use_smooth = True); add a BEVEL modifier (width ~0.02-0.05, segments 3) to hard-edged boxes for realistic highlights.
8. Animation: keyframe everything with obj.keyframe_insert(data_path=..., frame=...) between FRAME_START and FRAME_END so motion spans the full duration. For smooth constant motion (turntables), set the F-curve keyframe interpolation to 'LINEAR' via obj.animation_data.action.fcurves when it exists — guard with hasattr/try, since the action API changes between versions.
9. Text: bpy.data.curves.new(name, type='FONT'); set .body, .size, .extrude (0.1-0.2), .bevel_depth (~0.02), .align_x = 'CENTER', .align_y = 'CENTER'; then bpy.data.objects.new and link. Font text lies flat in the XY plane by default — stand it upright facing the camera with rotation_euler = (math.radians(90), 0, 0) and put the camera on the -Y side looking toward +Y, so the letter faces (not their sides) are seen. Size text so the whole word is about 4 units wide and fully inside the frame with margin.
   Framing: compute camera distance from the subject's width and the lens so everything described stays in frame for the whole animation (distance ~= 1.4 * width / (2 * tan(fov/2)), fov = cam_data.angle). Small decorative elements (particles, sparkles, dust) must be tiny (radius 0.01-0.04) and sparse (20-60), placed around and behind the subject, not in front of it.
10. Do NOT set render engine, resolution, fps, frame range, output paths or file formats, and never call bpy.ops.render or bpy.ops.wm.save*. The app does that after your script.
11. Prefer bpy.data API over bpy.ops where possible; if you use bpy.ops, make sure the right object is active/selected. Keep the script self-contained and under ~250 lines. Make it look good: pleasing composition, soft shadows, a ground plane or backdrop unless the description says otherwise.

Return ONLY the Python script, no explanations, no markdown fences."""

FIX_INSTRUCTIONS = """The script below failed in Blender {version}. Fix the error and return the full corrected script, following every rule above. Change only what is needed; keep the scene the same.

Error log (tail):
{log}

Script:
{script}"""


# ---- Blender discovery -------------------------------------------------------

_version_cache: dict = {}


def find_blender() -> str:
    for candidate in (
        os.getenv("BLENDER_PATH", "").strip(),
        shutil.which("blender") or "",
        "/Applications/Blender.app/Contents/MacOS/Blender",
        os.path.expanduser("~/Applications/Blender.app/Contents/MacOS/Blender"),
    ):
        if candidate and os.path.isfile(candidate) and os.access(candidate, os.X_OK):
            return candidate
    return ""


def blender_version(path: str) -> str:
    if path in _version_cache:
        return _version_cache[path]
    try:
        out = subprocess.run([path, "--version"], capture_output=True, text=True, timeout=60).stdout
        m = re.search(r"Blender\s+(\d+\.\d+(?:\.\d+)?)", out)
        version = m.group(1) if m else ""
    except Exception:
        version = ""
    _version_cache[path] = version
    return version


def capabilities() -> dict:
    path = find_blender()
    return {"available": bool(path), "path": path, "version": blender_version(path) if path else "",
            "workflows": blender_workflows.public_list(), "seedance_tips": blender_workflows.SEEDANCE_TIPS}


# ---- Script writing (Seed LLM) -----------------------------------------------

def _llm(system_prompt: str, user_prompt: str) -> str:
    from byteplussdkarkruntime import Ark

    from content_creator.services.characters import _extract_output_text
    from content_creator.services.model_settings import prompt_model

    resp = Ark().responses.create(
        model=prompt_model(),
        input=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": [{"type": "input_text", "text": user_prompt}]},
        ],
        temperature=0.2,
        # Thinking makes a script take ~5 minutes instead of seconds.
        thinking={"type": "disabled"},
    )
    return _strip_fences(_extract_output_text(resp))


def _strip_fences(text: str) -> str:
    text = (text or "").strip()
    m = re.search(r"```(?:python|py)?\s*\n(.*?)```", text, re.S)
    return (m.group(1) if m else text).strip()


def _system_prompt(workflow: str) -> str:
    version = capabilities()["version"] or "4.x"
    rules = blender_workflows.get(workflow)["rules"]
    return SCRIPT_RULES.format(version=version) + "\n\n" + HELPERS_DOC + ("\n\n" + rules if rules else "")


def write_script(description: str, settings: dict) -> str:
    user = (
        f"Scene to create ({settings['duration']} seconds at {settings['fps']} fps, "
        f"{settings['aspect']} frame):\n{description.strip()}"
    )
    if settings.get("workflow", "scene") != "scene":
        # Restated next to the request: models skip these when they only sit in the long system prompt.
        user += (
            "\n\nChecklist: (1) a camera that moves with walking/running figures uses cam.follow(<rearmost figure>, f0, f1,"
            " offset=(0, -5, <height>)) or keeps their speed -- it never closes in on, passes or enters a figure;"
            " (2) keep the camera >= 3 m from every figure unless a close-up is asked; (3) set every facing with"
            " facing_toward(...); (4) helpers only, plain colours, minimal set."
        )
    return _llm(_system_prompt(settings.get("workflow", "scene")), user)


def fix_script(script: str, log: str, workflow: str = "scene") -> str:
    version = capabilities()["version"] or "4.x"
    return _llm(
        _system_prompt(workflow),
        FIX_INSTRUCTIONS.format(version=version, log=log[-LOG_TAIL_CHARS:], script=script),
    )


# ---- Settings & wrapper -------------------------------------------------------

def normalize_settings(raw: dict) -> dict:
    engine = str(raw.get("engine") or "eevee").lower()
    aspect = str(raw.get("aspect") or "16:9")
    height_key = str(raw.get("resolution") or "720p")
    try:
        fps = int(raw.get("fps") or 24)
    except (TypeError, ValueError):
        fps = 24
    try:
        duration = float(raw.get("duration") or 5)
    except (TypeError, ValueError):
        duration = 5.0
    try:
        samples = int(raw.get("samples") or 64)
    except (TypeError, ValueError):
        samples = 64
    if engine not in ENGINES:
        raise ValueError(f"engine must be one of {', '.join(ENGINES)}")
    if aspect not in ASPECTS:
        raise ValueError(f"aspect must be one of {', '.join(ASPECTS)}")
    if height_key not in HEIGHTS:
        raise ValueError(f"resolution must be one of {', '.join(HEIGHTS)}")
    fps = fps if fps in (24, 25, 30) else 24
    workflow = str(raw.get("workflow") or "scene")
    workflow = workflow if workflow in blender_workflows.WORKFLOW_BY_ID else "scene"
    # Keyframe + black frames (case 31): show `hold` seconds of every `every` seconds, black in between.
    black = raw.get("black_frames") if isinstance(raw.get("black_frames"), dict) else {}
    try:
        every_s = max(0.1, min(10.0, float(black.get("every") or 0.5)))
        hold_s = max(1.0 / fps, min(every_s, float(black.get("hold") or 0.125)))
    except (TypeError, ValueError):
        every_s, hold_s = 0.5, 0.125
    black_frames = {"enabled": bool(black.get("enabled")), "every": every_s, "hold": hold_s}
    duration = max(1.0, min(float(MAX_SECONDS), duration))
    aw, ah = ASPECTS[aspect]
    short = HEIGHTS[height_key]
    if aw >= ah:
        res_y, res_x = short, int(round(short * aw / ah / 2)) * 2
    else:
        res_x, res_y = short, int(round(short * ah / aw / 2)) * 2
    return {
        "engine": engine, "aspect": aspect, "resolution": height_key, "fps": fps, "duration": duration,
        "workflow": workflow, "black_frames": black_frames,
        "samples": max(8, min(1024, samples)), "res_x": res_x, "res_y": res_y,
        "frame_end": max(1, int(round(duration * fps))),
    }


def _wrap(script: str, s: dict, frames_dir: str, still_frame: Optional[int]) -> str:
    header = f"""import bpy
bpy.ops.wm.read_factory_settings(use_empty=True)
FPS = {s['fps']}
FRAME_START = 1
FRAME_END = {s['frame_end']}
DURATION_S = {s['duration']}
RES_X = {s['res_x']}
RES_Y = {s['res_y']}
""" + HELPERS + """
# ---- user script ----
"""
    footer = f"""
# ---- render settings (added by the app) ----
import bpy as _bpy
_scene = _bpy.context.scene
if _scene.camera is None:
    _cams = [o for o in _scene.objects if o.type == 'CAMERA']
    if not _cams:
        raise RuntimeError("The script did not create a camera.")
    _scene.camera = _cams[0]
_engines = {{"eevee": ["BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"], "cycles": ["CYCLES"], "workbench": ["BLENDER_WORKBENCH"]}}[{s['engine']!r}]
for _e in _engines:
    try:
        _scene.render.engine = _e
        break
    except TypeError:
        continue
if _scene.world is None:
    _scene.world = _bpy.data.worlds.new("World")
    _scene.world.color = (0.5, 0.5, 0.52)
if _scene.render.engine == "BLENDER_WORKBENCH":
    try:
        _sh = _scene.display.shading
        _sh.light = "STUDIO"
        _sh.color_type = "MATERIAL"
        _sh.show_shadows = True
        _sh.shadow_intensity = 0.35
        _sh.show_cavity = True
    except Exception:
        pass
if _scene.render.engine == "CYCLES":
    _scene.cycles.samples = {s['samples']}
    try:
        _scene.cycles.use_denoising = True
    except Exception:
        pass
    try:
        _prefs = _bpy.context.preferences.addons["cycles"].preferences
        for _dt in ("METAL", "OPTIX", "CUDA", "HIP", "ONEAPI"):
            try:
                _prefs.compute_device_type = _dt
                _prefs.get_devices()
                if any(d.type == _dt for d in _prefs.devices):
                    for _d in _prefs.devices:
                        _d.use = True
                    _scene.cycles.device = "GPU"
                    break
            except Exception:
                continue
    except Exception:
        pass
_scene.render.resolution_x = {s['res_x']}
_scene.render.resolution_y = {s['res_y']}
_scene.render.resolution_percentage = 100
_scene.render.fps = {s['fps']}
_scene.frame_start = 1
_scene.frame_end = {s['frame_end']}
_scene.render.image_settings.file_format = "PNG"
_scene.render.image_settings.color_mode = "RGB"
_scene.render.use_file_extension = True
"""
    if still_frame is None:
        footer += f"""_scene.render.filepath = {os.path.join(frames_dir, 'frame_')!r}
_bpy.ops.render.render(animation=True)
"""
    else:
        footer += f"""_scene.frame_set({still_frame})
_scene.render.filepath = {os.path.join(frames_dir, 'still.png')!r}
_bpy.ops.render.render(write_still=True)
"""
    return header + script.strip() + "\n" + footer


# ---- Jobs ---------------------------------------------------------------------

_jobs: dict = {}
_jobs_lock = threading.Lock()
_render_slot = threading.Semaphore(1)  # one Blender render at a time; it uses the whole GPU


def _set(job_id: str, **patch) -> None:
    with _jobs_lock:
        _jobs[job_id].update(patch)


def get_job(job_id: str) -> Optional[dict]:
    with _jobs_lock:
        job = _jobs.get(job_id)
        return dict(job) if job else None


def start_job(*, description: str, script: str, settings: dict, kind: str, auto_fix: bool) -> str:
    """kind: 'video' or 'preview'. Writes a script first when none is given."""
    blender = find_blender()
    if not blender:
        raise RuntimeError("Blender is not installed. Install it (brew install --cask blender) or set BLENDER_PATH, then restart.")
    s = normalize_settings(settings)
    if not script.strip() and not description.strip():
        raise ValueError("Describe the scene or provide a script.")
    job_id = uuid.uuid4().hex[:12]
    with _jobs_lock:
        _jobs[job_id] = {
            "id": job_id, "kind": kind, "status": "queued", "stage": "Queued", "progress": 0.0,
            "frames_done": 0, "frames_total": 1 if kind == "preview" else s["frame_end"],
            "script": script, "settings": s, "video_url": "", "image_url": "", "poster_url": "", "error": "", "log": "",
            "workflow": s["workflow"], "seedance_prompt": blender_workflows.get(s["workflow"])["seedance"],
            "fixed": False, "created": time.time(),
        }
    threading.Thread(target=_run_job, args=(job_id, blender, description, script, s, kind, auto_fix), daemon=True).start()
    return job_id


def _run_blender(job_id: str, blender: str, script: str, s: dict, kind: str) -> tuple:
    """Returns (ok, log, out_url)."""
    with tempfile.TemporaryDirectory(prefix="blender-job-") as tmp:
        frames_dir = os.path.join(tmp, "frames")
        os.makedirs(frames_dir)
        still = max(1, s["frame_end"] // 2) if kind == "preview" else None
        script_path = os.path.join(tmp, "scene.py")
        with open(script_path, "w", encoding="utf-8") as f:
            f.write(_wrap(script, s, frames_dir, still))
        cmd = [blender, "-b", "--factory-startup", "-noaudio", "--python-exit-code", "1", "--python", script_path]
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, errors="replace")
        log_lines = []
        started = time.time()
        for line in proc.stdout:
            log_lines.append(line)
            if len(log_lines) > 400:
                del log_lines[:200]
            if kind == "video":
                done = len(glob.glob(os.path.join(frames_dir, "frame_*.png")))
                _set(job_id, frames_done=done, progress=round(done / s["frame_end"], 3))
            if time.time() - started > RENDER_TIMEOUT_S:
                proc.kill()
                log_lines.append("\n[app] Render timed out.\n")
                break
        code = proc.wait()
        log = "".join(log_lines)
        if code != 0 or "Traceback (most recent call last)" in log or "Error: Python:" in log:
            return False, log, ""

        if kind == "preview":
            src = os.path.join(frames_dir, "still.png")
            if not os.path.isfile(src):
                return False, log + "\n[app] Blender finished but wrote no image.", ""
            name = f"blender-preview-{int(time.time() * 1000)}-{job_id[:6]}.png"
            shutil.copyfile(src, os.path.join(OUTPUT_DIR, name))
            return True, log, "/files/" + name

        frames = sorted(glob.glob(os.path.join(frames_dir, "frame_*.png")))
        if not frames:
            return False, log + "\n[app] Blender finished but rendered no frames.", ""
        _set(job_id, stage="Encoding video", progress=1.0, frames_done=len(frames))
        from content_creator.services.long_duration import ffmpeg_missing_message, get_ffmpeg_path

        ffmpeg = get_ffmpeg_path()
        if not ffmpeg:
            return False, ffmpeg_missing_message(), ""
        # The first frame doubles as the start frame Seedance workflows pair with the blockout.
        poster = f"blender-{int(time.time() * 1000)}-{job_id[:6]}-start.png"
        shutil.copyfile(frames[0], os.path.join(OUTPUT_DIR, poster))
        _set(job_id, poster_url="/files/" + poster)
        first = int(re.search(r"frame_(\d+)\.png$", frames[0]).group(1))
        pad = len(re.search(r"frame_(\d+)\.png$", frames[0]).group(1))
        name = f"blender-{int(time.time() * 1000)}-{job_id[:6]}.mp4"
        out_path = os.path.join(OUTPUT_DIR, name)
        p = subprocess.run(
            [ffmpeg, "-y", "-framerate", str(s["fps"]), "-start_number", str(first),
             "-i", os.path.join(frames_dir, f"frame_%0{pad}d.png"),
             *_black_frame_filter(s),
             "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "medium",
             "-movflags", "+faststart", out_path],
            capture_output=True, text=True,
        )
        if p.returncode != 0 or not os.path.isfile(out_path):
            return False, log + "\n[app] ffmpeg failed: " + (p.stderr or "")[-1500:], ""
        return True, log, "/files/" + name


def _black_frame_filter(s: dict) -> list:
    """Keyframe + black frames (case 31): keep `hold` of every `every` seconds, black out the rest, so Seedance
    takes the key poses and timing from the reference without copying robotic in-between motion."""
    b = s.get("black_frames") or {}
    if not b.get("enabled"):
        return []
    period = max(2, int(round(b["every"] * s["fps"])))
    hold = max(1, min(period - 1, int(round(b["hold"] * s["fps"]))))
    return ["-vf", f"drawbox=x=0:y=0:w=iw:h=ih:color=black:t=fill:enable='gte(mod(n,{period}),{hold})'"]


def _run_job(job_id: str, blender: str, description: str, script: str, s: dict, kind: str, auto_fix: bool) -> None:
    try:
        if not script.strip():
            _set(job_id, status="running", stage="Writing Blender script (Seed LLM)")
            script = write_script(description, s)
            _set(job_id, script=script)
        _set(job_id, status="running", stage="Waiting for the renderer")
        with _render_slot:
            _set(job_id, stage="Rendering preview frame" if kind == "preview" else "Rendering frames")
            ok, log, url = _run_blender(job_id, blender, script, s, kind)
            if not ok and auto_fix and ("Traceback" in log or "Error" in log):
                _set(job_id, stage="Script failed — fixing it (Seed LLM)", log=log[-LOG_TAIL_CHARS:])
                script = fix_script(script, log, s["workflow"])
                _set(job_id, script=script, fixed=True, frames_done=0, progress=0.0,
                     stage="Rendering preview frame" if kind == "preview" else "Rendering frames (fixed script)")
                ok, log, url = _run_blender(job_id, blender, script, s, kind)
        if ok:
            key = "image_url" if kind == "preview" else "video_url"
            _set(job_id, status="done", stage="Done", progress=1.0, log=log[-LOG_TAIL_CHARS:], **{key: url})
        else:
            err = _first_error(log)
            _set(job_id, status="error", stage="Failed", error=err, log=log[-LOG_TAIL_CHARS:])
    except Exception as e:
        _set(job_id, status="error", stage="Failed", error=str(e))


def _first_error(log: str) -> str:
    lines = [l.strip() for l in log.splitlines() if l.strip()]
    for i, line in enumerate(lines):
        if line.startswith("Traceback"):
            tail = [l for l in lines[i + 1:i + 40] if not l.startswith("File ") and not l.startswith("^")]
            for l in reversed(tail):
                if re.match(r"^[A-Za-z_.]*(Error|Exception)\b", l):
                    return l
    for line in reversed(lines):
        if "Error" in line or "[app]" in line:
            return line
    return "Blender failed (see log)."
