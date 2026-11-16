import os
import subprocess
import uuid

from content_creator.services.long_duration import ffmpeg_missing_message, get_ffmpeg_path

VALID_MODES = ("performance", "balanced", "lightweight")


def has_skeleton_support() -> bool:
    try:
        import cv2  # noqa: F401
        import numpy  # noqa: F401
        from rtmlib import Wholebody, draw_skeleton  # noqa: F401
    except Exception:
        return False
    return True


def _pick_primary(keypoints, scores, kpt_thr, prev_center, frame_w, frame_h):
    import numpy as np

    if len(keypoints) <= 1:
        return keypoints, scores, prev_center
    best, best_val = 0, -1e18
    for p in range(len(keypoints)):
        valid = keypoints[p][scores[p] > kpt_thr]
        if len(valid) < 4:
            continue
        area = float((valid[:, 0].max() - valid[:, 0].min()) * (valid[:, 1].max() - valid[:, 1].min()))
        center = valid.mean(axis=0)
        dist = float(np.linalg.norm(center - prev_center)) if prev_center is not None else 0.0
        val = area - dist * max(frame_w, frame_h) * 0.5
        if val > best_val:
            best, best_val = p, val
    sel = keypoints[best][scores[best] > kpt_thr]
    next_center = sel.mean(axis=0) if len(sel) else prev_center
    return keypoints[best : best + 1], scores[best : best + 1], next_center


def generate_skeleton_reference(
    *,
    input_path: str,
    output_dir: str,
    mode: str = "balanced",
    kpt_thr: float = 0.43,
    all_people: bool = False,
    generate_skeleton: bool = True,
    generate_overlay: bool = True,
) -> dict:
    """Runs DWPose/RTMPose whole-body extraction on input_path and writes an
    OpenPose-style skeleton video and/or an overlay sanity-check video into
    output_dir. Returns {"skeleton": <path>, "overlay": <path>} for whichever
    outputs were generated."""

    if not generate_skeleton and not generate_overlay:
        raise RuntimeError("At least one output (skeleton or overlay) must be enabled.")
    if mode not in VALID_MODES:
        raise RuntimeError(f"mode must be one of {', '.join(VALID_MODES)}")
    if not (0.0 <= kpt_thr <= 1.0):
        raise RuntimeError("kpt_thr must be between 0 and 1")
    if not has_skeleton_support():
        raise RuntimeError(
            "Skeleton reference generation requires opencv-python-headless, numpy, and rtmlib "
            "(pip install -r requirements.txt)."
        )

    ffmpeg = get_ffmpeg_path()
    if not ffmpeg:
        raise RuntimeError(ffmpeg_missing_message())

    import cv2
    import numpy as np
    from rtmlib import Wholebody, draw_skeleton

    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video: {input_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    os.makedirs(output_dir, exist_ok=True)
    job_id = uuid.uuid4().hex
    skel_raw = os.path.join(output_dir, f"skeleton-raw-{job_id}.mp4")
    over_raw = os.path.join(output_dir, f"overlay-raw-{job_id}.mp4")

    model = Wholebody(to_openpose=True, mode=mode, backend="onnxruntime", device="cpu")
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    w_skel = cv2.VideoWriter(skel_raw, fourcc, fps, (w, h)) if generate_skeleton else None
    w_over = cv2.VideoWriter(over_raw, fourcc, fps, (w, h)) if generate_overlay else None

    prev_center = None
    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            keypoints, scores = model(frame)
            if not all_people:
                keypoints, scores, prev_center = _pick_primary(keypoints, scores, kpt_thr, prev_center, w, h)
            if w_skel is not None:
                black = np.zeros_like(frame)
                w_skel.write(draw_skeleton(black, keypoints, scores, openpose_skeleton=True, kpt_thr=kpt_thr))
            if w_over is not None:
                w_over.write(draw_skeleton(frame.copy(), keypoints, scores, openpose_skeleton=True, kpt_thr=kpt_thr))
    finally:
        cap.release()
        if w_skel is not None:
            w_skel.release()
        if w_over is not None:
            w_over.release()

    result: dict = {}
    for raw_path, key in ((skel_raw, "skeleton"), (over_raw, "overlay")):
        if not os.path.exists(raw_path):
            continue
        final_path = os.path.join(output_dir, f"{key}-{job_id}.mp4")
        p = subprocess.run(
            [
                ffmpeg,
                "-y",
                "-loglevel",
                "error",
                "-i",
                raw_path,
                "-c:v",
                "libx264",
                "-pix_fmt",
                "yuv420p",
                "-crf",
                "18",
                final_path,
            ],
            capture_output=True,
            text=True,
        )
        os.remove(raw_path)
        if p.returncode != 0 or not os.path.exists(final_path):
            raise RuntimeError(f"ffmpeg re-encode failed for {key}: {(p.stderr or '').strip()[:4000]}")
        result[key] = final_path

    return result
