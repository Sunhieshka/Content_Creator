#!/usr/bin/env python3
"""Mechanical asset validator for generated images and videos.

Runs fast, cheap checks that catch the common generation failures before
the agent spends a turn "looking" at the file:

  * File exists and is non-trivially sized
  * Decoder (PIL / ffprobe) can open it
  * Dimensions / orientation / aspect ratio match what was asked for
  * EXIF rotation tag is absent or identity (rotated tags = display-rotated)
  * Image is not a flat/blank canvas (pixel stdev above floor)
  * Video duration is within tolerance of requested duration

Exit codes:
  0  pass
  1  unexpected runtime error (see stderr)
  2  file missing or too small
  3  decoder could not open
  4  dimension / aspect / orientation mismatch
  5  EXIF rotation tag present and non-identity
  6  pixel variance below floor (blank-looking image)
  7  video duration outside tolerance

With --json the full report is also written to stdout so the caller can
parse reasons and feed them back into the retry prompt.

Usage examples:

  validate-asset.py out.png --expected-size 1440x2560
  validate-asset.py bg.png  --expected-orientation portrait --min-variance 8
  validate-asset.py clip.mp4 --expected-size 1080x1920 --expected-duration 5 --duration-tolerance 0.4
"""

from __future__ import annotations

import argparse
import json
import math
import os
import pathlib
import shutil
import subprocess
import sys
from typing import Any, Dict, List, Optional, Tuple

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif"}
VIDEO_EXTS = {".mp4", ".webm", ".mov", ".m4v"}

EXIT_OK = 0
EXIT_RUNTIME = 1
EXIT_MISSING = 2
EXIT_DECODE = 3
EXIT_DIMENSION = 4
EXIT_EXIF_ROTATION = 5
EXIT_BLANK = 6
EXIT_DURATION = 7


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("path", help="Path to image or video file to validate.")
    p.add_argument("--expected-size", help='Exact "<W>x<H>" the generator was asked for.')
    p.add_argument(
        "--expected-aspect",
        help='Aspect ratio as "W:H" (e.g. "9:16"). Allows any resolution at that ratio.',
    )
    p.add_argument(
        "--aspect-tolerance",
        type=float,
        default=0.02,
        help="Relative tolerance for aspect match. Default 0.02 (2%%).",
    )
    p.add_argument(
        "--expected-orientation",
        choices=("portrait", "landscape", "square"),
        help="Weakest orientation check — just verifies W<H / W>H / W==H.",
    )
    p.add_argument(
        "--min-bytes",
        type=int,
        default=None,
        help="Minimum file size in bytes. Defaults: 10000 image, 50000 video.",
    )
    p.add_argument(
        "--min-variance",
        type=float,
        default=5.0,
        help="Minimum per-channel pixel stdev (images only). Default 5.0.",
    )
    p.add_argument(
        "--expected-duration",
        type=float,
        default=None,
        help="Expected video duration in seconds (videos only).",
    )
    p.add_argument(
        "--duration-tolerance",
        type=float,
        default=0.5,
        help="Allowed deviation from expected duration. Default 0.5s.",
    )
    p.add_argument(
        "--allow-exif-rotation",
        action="store_true",
        help="Skip EXIF-rotation check. Default off (rotated EXIF = fail).",
    )
    p.add_argument("--json", action="store_true", help="Emit JSON report to stdout.")
    return p.parse_args()


def parse_wh(spec: str) -> Tuple[int, int]:
    w, _, h = spec.lower().partition("x")
    return int(w), int(h)


def parse_ratio(spec: str) -> float:
    a, _, b = spec.partition(":")
    return float(a) / float(b)


def fail(report: Dict[str, Any], code: int, reason: str) -> int:
    report["ok"] = False
    report["exit_code"] = code
    report["reason"] = reason
    report["failures"].append(reason)
    return code


def check_image(args: argparse.Namespace, report: Dict[str, Any]) -> int:
    try:
        from PIL import Image, ExifTags  # noqa: F401
    except ImportError:
        print("Pillow is required for image validation. pip install Pillow", file=sys.stderr)
        return EXIT_RUNTIME

    try:
        img = Image.open(args.path)
        img.load()
    except Exception as e:  # noqa: BLE001
        return fail(report, EXIT_DECODE, f"PIL could not open: {e}")

    w, h = img.size
    report["width"] = w
    report["height"] = h
    report["mode"] = img.mode
    report["format"] = img.format

    # Expected exact size.
    if args.expected_size:
        ew, eh = parse_wh(args.expected_size)
        if (w, h) != (ew, eh):
            return fail(
                report,
                EXIT_DIMENSION,
                f"size {w}x{h} != expected {ew}x{eh}",
            )

    # Expected aspect.
    if args.expected_aspect:
        expected_ratio = parse_ratio(args.expected_aspect)
        actual_ratio = w / h
        if abs(actual_ratio - expected_ratio) / expected_ratio > args.aspect_tolerance:
            return fail(
                report,
                EXIT_DIMENSION,
                f"aspect {w}:{h} ({actual_ratio:.3f}) outside tol of expected {args.expected_aspect} ({expected_ratio:.3f})",
            )

    # Expected orientation.
    if args.expected_orientation:
        actual = "portrait" if h > w else "landscape" if w > h else "square"
        if actual != args.expected_orientation:
            return fail(
                report,
                EXIT_DIMENSION,
                f"orientation {actual} (w={w}, h={h}) != expected {args.expected_orientation}",
            )

    # EXIF rotation tag — if present and non-identity, the displayed image
    # will be rotated relative to pixel layout. This is the most common
    # cause of "my portrait image is showing sideways" in the wild.
    if not args.allow_exif_rotation:
        try:
            exif = img.getexif()
        except Exception:  # noqa: BLE001
            exif = None
        if exif:
            # 0x0112 == Orientation. 1 = identity; 2-8 = flipped/rotated.
            orientation = exif.get(0x0112, 1)
            report["exif_orientation"] = orientation
            if orientation not in (0, 1, None):
                return fail(
                    report,
                    EXIT_EXIF_ROTATION,
                    f"EXIF Orientation={orientation} (non-identity). Strip or re-export.",
                )

    # Variance check — flag near-blank canvases.
    if args.min_variance > 0:
        try:
            rgb = img.convert("RGB")
            from PIL import ImageStat
            stat = ImageStat.Stat(rgb)
            stds = stat.stddev  # list of per-channel stdev
            report["pixel_stddev"] = [round(s, 2) for s in stds]
            if max(stds) < args.min_variance:
                return fail(
                    report,
                    EXIT_BLANK,
                    f"pixel stdev {max(stds):.2f} < floor {args.min_variance} (blank-ish image)",
                )
        except Exception as e:  # noqa: BLE001
            # Variance is a soft check — failure to compute doesn't fail the asset.
            report["variance_error"] = str(e)

    return EXIT_OK


def ffprobe_json(path: str) -> Dict[str, Any]:
    if not shutil.which("ffprobe"):
        raise RuntimeError("ffprobe not found on PATH. Install ffmpeg.")
    out = subprocess.run(
        [
            "ffprobe",
            "-v", "error",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            path,
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    return json.loads(out.stdout)


def check_video(args: argparse.Namespace, report: Dict[str, Any]) -> int:
    try:
        meta = ffprobe_json(args.path)
    except subprocess.CalledProcessError as e:
        return fail(report, EXIT_DECODE, f"ffprobe failed: {e.stderr.strip()}")
    except Exception as e:  # noqa: BLE001
        return fail(report, EXIT_DECODE, f"ffprobe error: {e}")

    video_streams = [s for s in meta.get("streams", []) if s.get("codec_type") == "video"]
    if not video_streams:
        return fail(report, EXIT_DECODE, "no video stream found")
    vs = video_streams[0]
    w = int(vs.get("width", 0))
    h = int(vs.get("height", 0))
    duration = float(meta.get("format", {}).get("duration", 0.0))
    report["width"] = w
    report["height"] = h
    report["duration"] = round(duration, 3)
    report["codec"] = vs.get("codec_name")

    if w == 0 or h == 0:
        return fail(report, EXIT_DECODE, "could not read video dimensions")

    if args.expected_size:
        ew, eh = parse_wh(args.expected_size)
        if (w, h) != (ew, eh):
            return fail(report, EXIT_DIMENSION, f"size {w}x{h} != expected {ew}x{eh}")

    if args.expected_aspect:
        expected_ratio = parse_ratio(args.expected_aspect)
        actual_ratio = w / h
        if abs(actual_ratio - expected_ratio) / expected_ratio > args.aspect_tolerance:
            return fail(
                report,
                EXIT_DIMENSION,
                f"aspect {w}:{h} outside tol of expected {args.expected_aspect}",
            )

    if args.expected_orientation:
        actual = "portrait" if h > w else "landscape" if w > h else "square"
        if actual != args.expected_orientation:
            return fail(
                report,
                EXIT_DIMENSION,
                f"orientation {actual} != expected {args.expected_orientation}",
            )

    if args.expected_duration is not None:
        if abs(duration - args.expected_duration) > args.duration_tolerance:
            return fail(
                report,
                EXIT_DURATION,
                f"duration {duration:.2f}s outside ±{args.duration_tolerance}s of expected {args.expected_duration}s",
            )

    return EXIT_OK


def main() -> int:
    args = parse_args()
    report: Dict[str, Any] = {
        "path": args.path,
        "ok": True,
        "failures": [],
    }

    path = pathlib.Path(args.path)
    if not path.exists():
        code = fail(report, EXIT_MISSING, "file does not exist")
    else:
        size_bytes = path.stat().st_size
        report["bytes"] = size_bytes
        ext = path.suffix.lower()
        report["kind"] = (
            "image" if ext in IMAGE_EXTS
            else "video" if ext in VIDEO_EXTS
            else "unknown"
        )
        min_bytes = args.min_bytes
        if min_bytes is None:
            min_bytes = 50_000 if report["kind"] == "video" else 10_000
        report["min_bytes"] = min_bytes

        if size_bytes < min_bytes:
            code = fail(report, EXIT_MISSING, f"file is {size_bytes} bytes (< {min_bytes})")
        elif report["kind"] == "image":
            code = check_image(args, report)
        elif report["kind"] == "video":
            code = check_video(args, report)
        else:
            code = fail(report, EXIT_DECODE, f"unknown extension {ext}")

    # Make sure exit_code is always set.
    if "exit_code" not in report:
        report["exit_code"] = code

    if args.json:
        print(json.dumps(report, indent=2))
    elif report["ok"]:
        summary = f"OK {args.path}"
        if "width" in report:
            summary += f"  {report['width']}x{report['height']}"
        if "duration" in report:
            summary += f"  {report['duration']}s"
        print(summary)
    else:
        print(f"FAIL {args.path}  [{report['exit_code']}] {report['reason']}", file=sys.stderr)
        for f in report["failures"][1:]:
            print(f"  + {f}", file=sys.stderr)

    return report["exit_code"]


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        sys.exit(130)
    except Exception as e:  # noqa: BLE001
        print(f"validate-asset: unexpected error: {e}", file=sys.stderr)
        sys.exit(EXIT_RUNTIME)
