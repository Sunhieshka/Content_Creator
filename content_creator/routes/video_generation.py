import base64
import json
import os
import re
import time
import urllib.request
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler

from content_creator.config.settings import OUTPUT_DIR
from content_creator.services.assets import (
    create_group_and_asset_from_data_url,
    normalize_asset_url,
)
from content_creator.services.long_duration import (
    audio_data_url_to_black_video,
    combine_videos_ffmpeg,
    ensure_video_data_url_mp4,
    extract_last_frame_data_url_from_video_data_url,
)
from content_creator.services.video import (
    DEFAULT_VIDEO_MODEL_ID,
    DRAFT_FINAL_RESOLUTION,
    DRAFT_FINAL_RESOLUTIONS,
    DRAFT_RESOLUTION,
    MAX_VIDEO_VARIANTS,
    MIN_VIDEO_DURATION,
    VIDEO_MODELS,
    create_final_from_draft,
    create_video_task,
    refine_video_prompt,
    get_video_task,
)
from content_creator.services.text_overlay import (
    MAX_OVERLAYS,
    build_overlay_prompt_block,
    resolve_image_input,
)
from content_creator.utils.http import json_response
from content_creator.utils.llm_images import fit_for_llm

DEBUG_SERVER_URL = os.getenv("DEBUG_SERVER_URL", "")
DEBUG_SESSION_ID = os.getenv("DEBUG_SESSION_ID", "asset-url-seq-image")


def _report_debug_event(hypothesis_id: str, msg: str, data: dict) -> None:
    if not DEBUG_SERVER_URL:
        return
    try:
        urllib.request.urlopen(
            urllib.request.Request(
                DEBUG_SERVER_URL,
                data=json.dumps(
                    {
                        "sessionId": DEBUG_SESSION_ID,
                        "runId": "pre-fix",
                        "hypothesisId": hypothesis_id,
                        "location": "content_creator/routes/video_generation.py",
                        "msg": msg,
                        "data": data,
                    }
                ).encode(),
                headers={"Content-Type": "application/json"},
            )
        ).read()
    except Exception:
        pass



def _direct_image(value: str) -> str:
    """A reference image as Seedance takes it directly: a data URL (oversized ones
    downscaled) or an http(s) link. Local /files/ images are read in; only a bare
    asset id (an image already in an asset group with no other copy) stays asset://."""
    v = (value or "").strip()
    if v.startswith("/files/"):
        name = os.path.basename(v[len("/files/"):].split("?")[0])
        path = os.path.join(OUTPUT_DIR, name)
        if not name or not os.path.isfile(path):
            raise FileNotFoundError(f"Reference image not found: {v}")
        ext = os.path.splitext(name)[1].lower().lstrip(".")
        mime = {"jpg": "jpeg", "jpeg": "jpeg", "webp": "webp", "gif": "gif"}.get(ext, "png")
        with open(path, "rb") as f:
            v = f"data:image/{mime};base64," + base64.b64encode(f.read()).decode("ascii")
    if v.startswith("data:"):
        return fit_for_llm(v)
    if v.startswith(("http://", "https://")):
        return v
    return normalize_asset_url(v)

def _local_video_data_url(url: str) -> str:
    """A video this app saved under /files/ as a data URL."""
    name = os.path.basename(url[len("/files/"):].split("?")[0])
    path = os.path.join(OUTPUT_DIR, name)
    if not name or not os.path.isfile(path):
        raise FileNotFoundError(f"Video not found: {url}")
    mime = "video/quicktime" if name.lower().endswith(".mov") else "video/mp4"
    with open(path, "rb") as f:
        return f"data:{mime};base64," + base64.b64encode(f.read()).decode("ascii")


def _looks_like_asset_processing_error(message: str) -> bool:
    m = (message or "").lower()
    return "asset is still processing" in m or "still processing and is not available yet" in m


def post_combine(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    video_urls = payload.get("video_urls") or []
    if not isinstance(video_urls, list) or len(video_urls) < 2:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "video_urls must contain at least 2 items"})
        return
    try:
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        out_path = combine_videos_ffmpeg(video_urls=[str(u) for u in video_urls], output_dir=OUTPUT_DIR)
        file_url = "/files/" + os.path.basename(out_path)
        json_response(handler, HTTPStatus.OK, {"file_url": file_url})
    except Exception as e:
        json_response(handler, HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(e)})


def post_upload_asset(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    video_url = str(payload.get("video_url") or "").strip()
    video_data_url = str(payload.get("video_data_url") or "").strip()
    if not video_data_url and not video_url:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "video_url or video_data_url is required"})
        return
    if video_data_url and not video_data_url.startswith("data:"):
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "video_data_url must be a data URL"})
        return
    try:
        data_url = video_data_url
        if not data_url:
            if not video_url.startswith("http"):
                json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "video_url must be an http(s) URL"})
                return
            with urllib.request.urlopen(video_url) as resp:
                raw = resp.read()
                mime = (resp.headers.get("Content-Type") or "video/mp4").split(";", 1)[0].strip() or "video/mp4"
            data_url = "data:" + mime + ";base64," + base64.b64encode(raw).decode("utf-8")
        data_url = ensure_video_data_url_mp4(video_data_url=data_url)
        asset = create_group_and_asset_from_data_url(
            data_url=data_url,
            key_hint="video",
            asset_type="Video",
        )
        json_response(
            handler,
            HTTPStatus.OK,
            {"asset_id": asset.get("asset_id") or "", "asset_url": asset.get("asset_url") or ""},
        )
    except Exception as e:
        json_response(handler, HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(e)})


def post_audio_black_video(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    audio_url = str(payload.get("audio_url") or "").strip()
    audio_data_url = str(payload.get("audio_data_url") or "").strip()
    image_data_url = str(payload.get("image_data_url") or "").strip()
    if not audio_data_url and not audio_url:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "audio_url or audio_data_url is required"})
        return
    if audio_data_url and not audio_data_url.startswith("data:"):
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "audio_data_url must be a data URL"})
        return
    if image_data_url and not image_data_url.startswith("data:"):
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "image_data_url must be a data URL"})
        return
    try:
        data_url = audio_data_url
        if not data_url:
            if not audio_url.startswith("http"):
                json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "audio_url must be an http(s) URL"})
                return
            with urllib.request.urlopen(audio_url) as resp:
                raw = resp.read()
                mime = (resp.headers.get("Content-Type") or "audio/mpeg").split(";", 1)[0].strip() or "audio/mpeg"
            data_url = "data:" + mime + ";base64," + base64.b64encode(raw).decode("utf-8")
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        out_path = audio_data_url_to_black_video(audio_data_url=data_url, output_dir=OUTPUT_DIR, image_data_url=image_data_url)
        json_response(handler, HTTPStatus.OK, {"file_url": "/files/" + os.path.basename(out_path)})
    except Exception as e:
        json_response(handler, HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(e)})


def post_upload_local(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    video_data_url = str(payload.get("video_data_url") or "").strip()
    filename = str(payload.get("filename") or "").strip() or "uploaded.mp4"
    if not video_data_url:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "video_data_url is required"})
        return
    if not video_data_url.startswith("data:"):
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "video_data_url must be a data URL"})
        return
    try:
        header, b64 = video_data_url.split(",", 1)
        mime = header.split(";", 1)[0].replace("data:", "").strip() or "video/mp4"
        ext = ".mp4"
        if "/" in mime:
            guess = mime.split("/", 1)[1].strip().lower()
            if guess:
                ext = "." + ("mp4" if guess == "quicktime" else guess)
        safe_name = os.path.basename(filename)
        stem, name_ext = os.path.splitext(safe_name)
        # Keep the file's own extension when it has a sensible one (audio/mpeg would
        # otherwise land as .mpeg); the Canvas tool uploads images and audio here too.
        if re.fullmatch(r"\.[A-Za-z0-9]{2,5}", name_ext or ""):
            ext = name_ext.lower()
        stem = "".join(ch if ch.isalnum() or ch in ("-", "_") else "-" for ch in (stem or "uploaded")).strip("-") or "uploaded"
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        out_name = f"{stem}-{int(time.time() * 1000)}{ext}"
        out_path = os.path.join(OUTPUT_DIR, out_name)
        with open(out_path, "wb") as f:
            f.write(base64.b64decode(b64))
        json_response(handler, HTTPStatus.OK, {"file_url": "/files/" + out_name})
    except Exception as e:
        json_response(handler, HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(e)})


def post_extract_last_frame(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    v = str(payload.get("video") or "").strip()
    try:
        if v.startswith("/files/"):
            v = _local_video_data_url(v)
        if v.startswith("http"):
            with urllib.request.urlopen(v) as resp:
                raw = resp.read()
                mime = (resp.headers.get("Content-Type") or "video/mp4").split(";", 1)[0].strip() or "video/mp4"
            v = "data:" + mime + ";base64," + base64.b64encode(raw).decode("utf-8")
        if not v.startswith("data:"):
            json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "video must be a data URL or http(s) URL"})
            return
        image = extract_last_frame_data_url_from_video_data_url(video_data_url=v)
        json_response(handler, HTTPStatus.OK, {"image": image})
    except Exception as e:
        json_response(handler, HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(e)})


def post_start(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    ui_content = str(payload.get("content") or "").strip()
    reference_images = payload.get("reference_images") or []
    prompt_reference_images = payload.get("prompt_reference_images") or []
    reference_assets = payload.get("reference_assets") or []
    extra_reference_images = payload.get("extra_reference_images") or []
    reference_image_roles = payload.get("reference_image_roles") or []
    # Pre-rendered text overlay images — sent only by Text Overlay projects.
    text_overlays_payload = payload.get("text_overlays") or []
    if not isinstance(text_overlays_payload, list):
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "text_overlays must be a list"})
        return
    text_overlays = [
        o for o in text_overlays_payload
        if isinstance(o, dict) and str(o.get("image") or "").strip()
    ]
    # Moments a user reference image already shows: no image of their own,
    # only a line in the prompt block.
    covered_text_overlays = [
        o for o in text_overlays_payload
        if isinstance(o, dict) and not str(o.get("image") or "").strip() and o.get("covered_by_reference")
    ]
    if len(text_overlays) > MAX_OVERLAYS:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": f"text_overlays must contain at most {MAX_OVERLAYS} items"})
        return
    audios_payload = payload.get("audios")
    audio_inputs: list[str] = []
    if isinstance(audios_payload, list):
        audio_inputs = [str(x).strip() for x in audios_payload if str(x).strip()]
    audio_legacy = str(payload.get("audio") or "").strip()
    if audio_legacy:
        audio_inputs.append(audio_legacy)
    videos_payload = payload.get("videos")
    video_urls: list[str] = []
    if isinstance(videos_payload, list):
        video_urls = [str(x).strip() for x in videos_payload if str(x).strip()]
    video_data_url = str(payload.get("video") or "").strip()
    draft_task_id = str(payload.get("draft_task_id") or "").strip()
    draft = bool(payload.get("draft"))
    # "@Image2 is Character A" lines typed per shot; put at the start of the final prompt verbatim.
    reference_roles_text = str(payload.get("reference_roles_text") or "").strip()[:4000]
    start_frame_url = str(payload.get("start_frame_url") or "").strip()
    start_from_ref_video_last_frame = bool(payload.get("start_from_ref_video_last_frame"))
    config = payload.get("config") or {}
    # How many videos to generate from this one prompt. They share a single
    # prompt refinement and a single reference upload, then run as independent
    # tasks in parallel, so the variations differ only by the model's own
    # sampling — not by a re-worded prompt.
    try:
        variants = int(payload.get("variants") or 1)
    except Exception:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "variants must be a number"})
        return
    if variants < 1 or variants > MAX_VIDEO_VARIANTS:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": f"variants must be between 1 and {MAX_VIDEO_VARIANTS}"})
        return
    model = str(payload.get("model") or "").strip() or DEFAULT_VIDEO_MODEL_ID
    if model not in VIDEO_MODELS:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": f"Unknown video model: {model}"})
        return
    model_spec = VIDEO_MODELS[model]
    # Checked after the legacy singular field is merged in — checking first let
    # `audios` plus `audio` through one over the limit.
    if len(audio_inputs) > model_spec["max_ref_audios"]:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": f"Seedance {model_spec['label']} takes at most {model_spec['max_ref_audios']} reference audios"})
        return
    if not ui_content:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "content is required"})
        return
    if not isinstance(reference_images, list):
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "reference_images must be a list"})
        return
    if prompt_reference_images is not None and not isinstance(prompt_reference_images, list):
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "prompt_reference_images must be a list"})
        return
    if reference_image_roles is not None and not isinstance(reference_image_roles, list):
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "reference_image_roles must be a list"})
        return
    if reference_assets is not None and not isinstance(reference_assets, list):
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "reference_assets must be a list"})
        return

    try:
        resolution = str(config.get("resolution") or "").strip() or None
        ratio = str(config.get("ratio") or "").strip() or None
        fps = config.get("frames_per_second")
        duration = config.get("duration")
        seed = config.get("seed")
        output_format = str(config.get("output_format") or "mp4").strip().lower()
        if output_format not in ("mp4", "mov"):
            json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "output_format must be mp4 or mov"})
            return
        if output_format == "mov" and not model_spec.get("mov"):
            json_response(handler, HTTPStatus.BAD_REQUEST, {"error": f"MOV output is only available for Seedance 2.5 and 2.5 flash, not {model_spec['label']}."})
            return

        if draft:
            if not model_spec.get("draft"):
                json_response(handler, HTTPStatus.BAD_REQUEST, {"error": f"Draft mode is not available for Seedance {model_spec['label']}."})
                return
            resolution = DRAFT_RESOLUTION  # drafts are always 480p
        if resolution and resolution not in ("480p", "720p", "1080p", "4k"):
            json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "Invalid resolution"})
            return
        if resolution and resolution not in model_spec["resolutions"]:
            supported = ", ".join(model_spec["resolutions"])
            json_response(
                handler,
                HTTPStatus.BAD_REQUEST,
                {"error": f"{model_spec['label']} supports only {supported} — {resolution} is not available."},
            )
            return
        # "adaptive" (with duration -1): video editing, where the output follows the input video.
        if ratio and ratio not in ("21:9", "16:9", "4:3", "1:1", "3:4", "9:16", "adaptive"):
            json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "Invalid ratio"})
            return
        if fps is not None:
            try:
                fps = int(fps)
            except Exception:
                json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "Invalid frame rate"})
                return
            if fps != 24:
                json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "Only 24fps is supported"})
                return
        if duration is not None:
            try:
                duration = int(duration)
            except Exception:
                json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "Invalid duration"})
                return
            max_duration = int(model_spec["max_duration"])
            if duration != -1 and (duration < MIN_VIDEO_DURATION or duration > max_duration):
                json_response(
                    handler,
                    HTTPStatus.BAD_REQUEST,
                    {"error": f"{model_spec['label']} supports {MIN_VIDEO_DURATION}-{max_duration} seconds"},
                )
                return
        if seed is not None:
            try:
                seed = int(seed)
            except Exception:
                json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "Invalid seed"})
                return
            if seed < -1 or seed > (2**32 - 1):
                json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "Seed must be between -1 and 4294967295"})
                return

        prompt_image_inputs = prompt_reference_images if isinstance(prompt_reference_images, list) and prompt_reference_images else reference_images

        # A bare asset id / asset:// handle can't be read by the prompt LLM ("invalid scheme"),
        # so it is left out of prompt writing (with its role line); Seedance still receives it below.
        role_inputs = reference_image_roles if isinstance(reference_image_roles, list) else []
        prompt_reference_urls: list[str] = []
        prompt_reference_roles: list[str] = []
        for i, raw in enumerate(prompt_image_inputs):
            v = str(raw).strip()
            if v.startswith("/files/"):
                v = _direct_image(v)
            if v.startswith(("data:", "http://", "https://")):
                prompt_reference_urls.append(v)
                prompt_reference_roles.append(str(role_inputs[i]) if i < len(role_inputs) else "")

        # Prompt optimisation runs for every generation: the Seedance 2.5 optimizer
        # always, plus the skills selected in the project (payload "skills").
        project_skills = [str(x) for x in (payload.get("skills") or []) if str(x).strip()]
        applied_skills: list = []
        if ui_content or prompt_reference_urls:
            refine_content = ui_content
            if text_overlays:
                refine_content += (
                    "\n\nNote for prompt writing: the exact on-screen text is supplied separately as extra reference images, "
                    "and a block mapping each text to its image number is appended after your prompt. Keep every on-screen "
                    "text string verbatim in double quotes, do not add any other on-screen text, and do not assign image "
                    "numbers to the text images yourself."
                )
            if reference_roles_text:
                refine_content += (
                    "\n\nReference roles (these exact lines are placed before your prompt, so refer to each "
                    "subject by the same image number and do not renumber the images):\n" + reference_roles_text
                )
            generated_prompt, applied_skills = refine_video_prompt(
                ui_content=refine_content,
                images=prompt_reference_urls,
                roles=prompt_reference_roles if role_inputs else None,
                skill_ids=project_skills,
            )
        else:
            generated_prompt = ui_content

        asset_urls: list[str] = []
        if isinstance(reference_assets, list):
            for a in reference_assets:
                a = str(a).strip()
                if a:
                    asset_urls.append(normalize_asset_url(a))

        # Reference images go to Seedance directly (as data URLs or http links),
        # not through the asset library. Oversized data URLs are downscaled.
        for x in reference_images:
            v = str(x).strip()
            if not v:
                continue
            asset_urls.append(_direct_image(v))

        start_ref = ""
        if start_frame_url:
            start_ref = _direct_image(start_frame_url)

        if isinstance(extra_reference_images, list):
            for raw in extra_reference_images:
                v = str(raw).strip()
                if not v:
                    continue
                asset_urls.append(_direct_image(v))

        overlay_urls: list[str] = [_direct_image(resolve_image_input(str(o.get("image")))) for o in (text_overlays or [])]

        # Audio goes to the model as a reference_audio content item, the same
        # way reference videos are handed over. The file itself is passed
        # straight through — it is not uploaded as an asset first, and it is
        # never mentioned in the prompt text.
        reference_audios: list[str] = []
        for raw in audio_inputs:
            v = (raw or "").strip()
            if not v:
                continue
            if v.startswith("data:") or v.startswith("http"):
                reference_audios.append(v)
            else:
                reference_audios.append(normalize_asset_url(v))

        reference_videos: list[str] = []
        for raw in [*video_urls, video_data_url]:
            v = (raw or "").strip()
            if not v:
                continue
            ref_video = ""
            if v.startswith("/files/"):
                v = ensure_video_data_url_mp4(video_data_url=_local_video_data_url(v))
            if v.startswith("data:"):
                video_asset = create_group_and_asset_from_data_url(
                    data_url=v,
                    key_hint="video",
                    asset_type="Video",
                )
                video_asset_id = video_asset.get("asset_id") or ""
                if video_asset_id:
                    ref_video = f"asset://{video_asset_id}"
            elif v.startswith("http"):
                ref_video = v
            else:
                ref_video = normalize_asset_url(v)
            if ref_video:
                reference_videos.append(ref_video)
        # #region debug-point B:video-reference-normalization
        _report_debug_event(
            "B",
            "[DEBUG] Video reference normalization summary",
            {
                "reference_assets_in": [str(x).strip() for x in reference_assets if str(x).strip()],
                "reference_images_in": [str(x).strip() for x in reference_images if str(x).strip()],
                "extra_reference_images_in": [str(x).strip() for x in extra_reference_images if str(x).strip()],
                "video_urls_in": [str(x).strip() for x in video_urls if str(x).strip()],
                "asset_urls_out": asset_urls,
                "reference_videos_out": reference_videos,
            },
        )
        # #endregion
        if reference_videos and start_from_ref_video_last_frame:
            generated_prompt = generated_prompt + " Use the last frame of the reference video as the start frame for this shot."
        if reference_roles_text:
            generated_prompt = reference_roles_text + "\n\n" + generated_prompt.lstrip()

        task_reference_images = list(asset_urls)
        # Overlays go last so they never renumber the images the refined prompt
        # already refers to.
        overlay_offset = len(task_reference_images)
        task_reference_images.extend(overlay_urls)
        task_start_ref = start_ref
        if task_start_ref and (task_reference_images or reference_videos):
            task_reference_images = [task_start_ref, *task_reference_images]
            task_start_ref = ""
            overlay_offset += 1
        if overlay_urls or covered_text_overlays:
            max_images = model_spec["max_ref_images"]
            if len(task_reference_images) > max_images:
                raise ValueError(
                    f"Too many reference images: {len(task_reference_images)} including {len(overlay_urls)} text overlay "
                    f"image(s). Seedance {model_spec['label']} accepts at most {max_images} — remove some references or overlays."
                )
            generated_prompt = generated_prompt.rstrip() + "\n\n" + build_overlay_prompt_block(
                text_overlays, overlay_offset + 1, covered_text_overlays
            )

        def _create_task_with_retry() -> str:
            created_id = ""
            last_err = None
            for attempt in range(8):
                try:
                    # #region debug-point A:long-duration-payload
                    try:
                        urllib.request.urlopen(
                            urllib.request.Request(
                                "http://127.0.0.1:7777/event",
                                data=json.dumps(
                                    {
                                        "sessionId": "long-duration-mixed-frame",
                                        "runId": "pre-fix",
                                        "hypothesisId": "A",
                                        "location": "video_generation.py:post_start",
                                        "msg": "[DEBUG] Long duration payload composition",
                                        "data": {
                                            "has_start_ref": bool(start_ref),
                                            "has_task_start_ref": bool(task_start_ref),
                                            "start_ref_kind": (
                                                "asset"
                                                if start_ref.startswith("asset://")
                                                else ("http" if start_ref.startswith("http") else ("none" if not start_ref else "other"))
                                            ),
                                            "reference_image_count": len(asset_urls),
                                            "task_reference_image_count": len(task_reference_images),
                                            "reference_video_count": len(reference_videos),
                                            "audio_ref_count": len(reference_audios),
                                            "start_from_ref_video_last_frame": bool(start_from_ref_video_last_frame),
                                            "has_reference_images": bool(asset_urls),
                                            "start_ref_moved_into_reference_images": bool(start_ref and not task_start_ref and task_reference_images),
                                            "has_reference_videos": bool(reference_videos),
                                        },
                                        "ts": int(time.time() * 1000),
                                    }
                                ).encode("utf-8"),
                                headers={"Content-Type": "application/json"},
                                method="POST",
                            ),
                            timeout=1,
                        ).read()
                    except Exception:
                        pass
                    # #endregion
                    created_id = create_video_task(
                        prompt=generated_prompt,
                        reference_images=task_reference_images,
                        first_frame_image=task_start_ref or None,
                        reference_videos=reference_videos,
                        reference_audios=reference_audios,
                        draft_task_id=draft_task_id or None,
                        ratio=ratio,
                        resolution=resolution,
                        duration=duration,
                        frames_per_second=fps,
                        seed=seed,
                        model=model,
                        draft=draft,
                        output_format=output_format,
                    )
                    last_err = None
                    break
                except Exception as e:
                    # #region debug-point B:long-duration-error
                    try:
                        urllib.request.urlopen(
                            urllib.request.Request(
                                "http://127.0.0.1:7777/event",
                                data=json.dumps(
                                    {
                                        "sessionId": "long-duration-mixed-frame",
                                        "runId": "pre-fix",
                                        "hypothesisId": "B",
                                        "location": "video_generation.py:post_start",
                                        "msg": "[DEBUG] Long duration create_video_task error",
                                        "data": {
                                            "error": str(e),
                                            "has_start_ref": bool(start_ref),
                                            "has_task_start_ref": bool(task_start_ref),
                                            "reference_image_count": len(asset_urls),
                                            "task_reference_image_count": len(task_reference_images),
                                            "reference_video_count": len(reference_videos),
                                            "start_from_ref_video_last_frame": bool(start_from_ref_video_last_frame),
                                        },
                                        "ts": int(time.time() * 1000),
                                    }
                                ).encode("utf-8"),
                                headers={"Content-Type": "application/json"},
                                method="POST",
                            ),
                            timeout=1,
                        ).read()
                    except Exception:
                        pass
                    # #endregion
                    last_err = e
                    if not _looks_like_asset_processing_error(str(e)):
                        raise
                    time.sleep(min(1.5 * (2**attempt), 20))
            if last_err is not None:
                raise last_err
            return created_id

        task_ids: list[str] = []
        create_err = None
        for _ in range(variants):
            try:
                created = _create_task_with_retry()
            except Exception as e:
                create_err = e
                continue
            if created:
                task_ids.append(created)
        # One variant failing does not waste the ones that were accepted; only
        # a run where nothing started is reported as an error.
        if not task_ids:
            if create_err is not None:
                raise create_err
            raise RuntimeError("No video task id returned.")
        task_id = task_ids[0]

        json_response(
            handler,
            HTTPStatus.OK,
            {"task_id": task_id, "task_ids": task_ids, "generated_prompt": generated_prompt, "model": model,
             "applied_skills": applied_skills},
        )
    except Exception as e:
        json_response(handler, HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(e)})


def post_status(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    task_id = str(payload.get("task_id") or "").strip()
    if not task_id:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "task_id is required"})
        return
    try:
        task = get_video_task(task_id=task_id)
        json_response(handler, HTTPStatus.OK, {"task": task})
    except Exception as e:
        json_response(handler, HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(e)})


def post_finalize_draft(handler: BaseHTTPRequestHandler, payload: dict) -> None:
    """Draft mode step 2: the final 1080p or 4K video from a draft's task id."""
    draft_task_id = str(payload.get("draft_task_id") or "").strip()
    model = str(payload.get("model") or "").strip() or DEFAULT_VIDEO_MODEL_ID
    if not draft_task_id:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "draft_task_id is required"})
        return
    spec = VIDEO_MODELS.get(model)
    if not spec or not spec.get("draft"):
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "Draft mode is only available for Seedance 2.5."})
        return
    resolution = str(payload.get("resolution") or DRAFT_FINAL_RESOLUTION).strip().lower()
    if resolution not in DRAFT_FINAL_RESOLUTIONS:
        json_response(handler, HTTPStatus.BAD_REQUEST, {"error": "The final video can be 1080p or 4K."})
        return
    try:
        task_id = create_final_from_draft(draft_task_id=draft_task_id, model=model, resolution=resolution)
    except Exception as e:
        json_response(handler, HTTPStatus.BAD_GATEWAY, {"error": str(e)})
        return
    json_response(handler, HTTPStatus.OK, {"task_id": task_id, "task_ids": [task_id]})
