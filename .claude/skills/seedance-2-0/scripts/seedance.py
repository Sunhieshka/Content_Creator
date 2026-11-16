#!/usr/bin/env python3
"""Minimal CLI wrapper for BytePlus ModelArk Seedance video generation.

The script mirrors the surface of ``seedream.py`` so the two asset-generation
skills share a single mental model. It submits a generation task against
``/contents/generations/tasks``, optionally polls the task endpoint until a
terminal state, and downloads the resulting MP4 into ``--output-dir``.

Auth: set ``ARK_API_KEY`` (shared with Seedream). No Jimeng cookies required.
"""
from __future__ import annotations

import argparse
import base64
import json
import mimetypes
import os
import pathlib
import shutil
import ssl
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

DEFAULT_BASE_URL = "https://ark.ap-southeast.bytepluses.com/api/v3"
DEFAULT_MODEL = "dreamina-seedance-2-0-260128"
DEFAULT_RESOLUTION = "720p"
DEFAULT_RATIO = "9:16"
DEFAULT_DURATION = 5

VALID_RESOLUTIONS = ("480p", "720p")
VALID_RATIOS = ("16:9", "4:3", "1:1", "3:4", "9:16", "21:9", "9:21", "adaptive")
VALID_DURATIONS = (5, 10)

TERMINAL_STATES = {"succeeded", "failed", "cancelled", "canceled"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Call BytePlus ModelArk Seedance via /contents/generations/tasks."
    )
    parser.add_argument("--prompt", required=True, help="Prompt sent to the model.")
    parser.add_argument(
        "--model",
        default=os.getenv("SEEDANCE_MODEL", DEFAULT_MODEL),
        help=f"Model ID. Defaults to $SEEDANCE_MODEL or {DEFAULT_MODEL}.",
    )
    parser.add_argument(
        "--base-url",
        default=os.getenv("ARK_BASE_URL", DEFAULT_BASE_URL),
        help=f"ModelArk base URL. Default: {DEFAULT_BASE_URL}",
    )
    parser.add_argument(
        "--duration",
        type=int,
        default=DEFAULT_DURATION,
        choices=list(VALID_DURATIONS),
        help=f"Video duration in seconds. Default: {DEFAULT_DURATION}.",
    )
    parser.add_argument(
        "--resolution",
        default=DEFAULT_RESOLUTION,
        choices=VALID_RESOLUTIONS,
        help=f"Output resolution. Default: {DEFAULT_RESOLUTION}.",
    )
    parser.add_argument(
        "--ratio",
        default=DEFAULT_RATIO,
        choices=VALID_RATIOS,
        help=f"Aspect ratio. Default: {DEFAULT_RATIO}.",
    )
    parser.add_argument(
        "--image",
        action="append",
        default=[],
        help="Reference image URL, data URL, or local file path. Repeat for multiple images.",
    )
    parser.add_argument(
        "--video",
        action="append",
        default=[],
        help="Reference video URL or local file path. Repeat for multiple videos.",
    )
    parser.add_argument(
        "--generate-audio",
        action=argparse.BooleanOptionalAction,
        default=False,
        help="Whether Seedance should synthesize audio. Default off.",
    )
    parser.add_argument(
        "--watermark",
        action=argparse.BooleanOptionalAction,
        default=False,
        help="Whether the returned video carries a watermark. Default off.",
    )
    parser.add_argument(
        "--output-dir",
        required=True,
        help="Directory used to store submit.json, final.json, and the downloaded MP4.",
    )
    parser.add_argument(
        "--poll",
        action="store_true",
        help="Poll the task until it reaches a terminal state and download the MP4.",
    )
    parser.add_argument(
        "--poll-interval",
        type=int,
        default=10,
        help="Seconds between polls when --poll is set. Default: 10.",
    )
    parser.add_argument(
        "--poll-timeout",
        type=int,
        default=900,
        help="Total seconds to wait for task completion. Default: 900.",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=120,
        help="Per-request HTTP timeout in seconds. Default: 120.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the request JSON and exit without calling the API.",
    )
    return parser.parse_args()


def file_to_data_url(path_str: str) -> str:
    path = pathlib.Path(path_str).expanduser().resolve()
    data = path.read_bytes()
    mime_type, _ = mimetypes.guess_type(path.name)
    if not mime_type:
        mime_type = "application/octet-stream"
    encoded = base64.b64encode(data).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


def normalize_media_url(value: str) -> str:
    parsed = urllib.parse.urlparse(value)
    if parsed.scheme in {"http", "https", "data"}:
        return value
    return file_to_data_url(value)


def build_payload(args: argparse.Namespace) -> dict:
    content = [{"type": "text", "text": args.prompt}]
    for image in args.image:
        content.append({
            "type": "image_url",
            "image_url": {"url": normalize_media_url(image)},
            "role": "reference_image",
        })
    for video in args.video:
        content.append({
            "type": "video_url",
            "video_url": {"url": normalize_media_url(video)},
            "role": "reference_video",
        })
    return {
        "model": args.model,
        "content": content,
        "duration": args.duration,
        "resolution": args.resolution,
        "ratio": args.ratio,
        "generate_audio": args.generate_audio,
        "watermark": args.watermark,
    }


def call_json(url: str, api_key: str, method: str, payload: dict | None, timeout: int) -> dict:
    headers = {"Authorization": f"Bearer {api_key}"}
    data: bytes | None = None
    if payload is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(url=url, data=data, headers=headers, method=method)
    try:
        with urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"ModelArk {method} {url} failed HTTP {exc.code}: {body}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"ModelArk {method} {url} failed: {exc}") from exc


def submit_task(base_url: str, api_key: str, payload: dict, timeout: int) -> dict:
    return call_json(
        base_url.rstrip("/") + "/contents/generations/tasks",
        api_key,
        "POST",
        payload,
        timeout,
    )


def get_task(base_url: str, api_key: str, task_id: str, timeout: int) -> dict:
    url = (
        base_url.rstrip("/")
        + "/contents/generations/tasks/"
        + urllib.parse.quote(task_id, safe="")
    )
    return call_json(url, api_key, "GET", None, timeout)


def extract_video_url(response: dict) -> str | None:
    content = response.get("content")
    if isinstance(content, dict):
        url = content.get("video_url")
        if isinstance(url, str) and url:
            return url
    data = response.get("data")
    if isinstance(data, dict):
        url = data.get("video_url")
        if isinstance(url, str) and url:
            return url
    url = response.get("video_url")
    if isinstance(url, str) and url:
        return url
    return None


def download_mp4(url: str, destination: pathlib.Path, timeout: int) -> None:
    curl = shutil.which("curl")
    if curl:
        tmp = destination.with_name(destination.name + ".tmp")
        if tmp.exists():
            tmp.unlink()
        result = subprocess.run(
            [
                curl,
                "-L",
                "--fail",
                "--silent",
                "--show-error",
                "--max-time",
                str(timeout),
                "--config",
                "-",
                "-o",
                str(tmp),
            ],
            input="url = " + json.dumps(url) + "\n",
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            if tmp.exists():
                tmp.unlink()
            error = result.stderr.strip() or result.stdout.strip() or "curl download failed"
            raise RuntimeError(error)
        tmp.replace(destination)
        return

    request = urllib.request.Request(url, method="GET")
    with urlopen(request, timeout=timeout) as response:
        destination.write_bytes(response.read())


def urlopen(request: urllib.request.Request, timeout: int):
    context = ssl_context()
    if context is None:
        return urllib.request.urlopen(request, timeout=timeout)
    return urllib.request.urlopen(request, timeout=timeout, context=context)


def ssl_context():
    verify = os.getenv("PLAYABLE_MODEL_VERIFY_SSL", "true").strip().lower()
    if verify in {"0", "false", "no", "off"}:
        return ssl._create_unverified_context()
    return None


def ensure_output_dir(path_str: str) -> pathlib.Path:
    path = pathlib.Path(path_str).expanduser().resolve()
    path.mkdir(parents=True, exist_ok=True)
    return path


def write_json(output_dir: pathlib.Path, name: str, payload: dict) -> None:
    (output_dir / name).write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def download_final_video(
    output_dir: pathlib.Path,
    final: dict,
    task_id: str,
    timeout: int,
) -> int:
    status = str(final.get("status", "")).lower()
    if status != "succeeded":
        print(f"Task ended with status={status!r}", file=sys.stderr)
        return 1

    video_url = extract_video_url(final)
    if not video_url:
        print(
            f"Task succeeded but no video URL was found. See {output_dir}/final.json",
            file=sys.stderr,
        )
        return 1

    target = output_dir / "video.mp4"
    try:
        download_timeout = max(timeout, int(os.getenv("SEEDANCE_DOWNLOAD_TIMEOUT", "300")))
        download_mp4(video_url, target, download_timeout)
    except Exception as exc:
        print(f"Task succeeded but downloading the MP4 failed: {exc}", file=sys.stderr)
        return 1

    print(f"Downloaded Seedance video to {target}", file=sys.stderr)
    print(
        json.dumps(
            {
                "task_id": task_id,
                "status": status,
                "video_path": str(target),
                "video_url_available": True,
            },
            indent=2,
        )
    )
    return 0


def poll_until_done(
    base_url: str,
    api_key: str,
    task_id: str,
    interval: int,
    total_timeout: int,
    per_request_timeout: int,
) -> dict:
    deadline = time.monotonic() + total_timeout
    latest: dict = {}
    while True:
        latest = get_task(base_url, api_key, task_id, per_request_timeout)
        status = str(latest.get("status", "")).lower()
        print(f"  seedance task={task_id} status={status}", file=sys.stderr, flush=True)
        if status in TERMINAL_STATES:
            return latest
        if time.monotonic() >= deadline:
            raise TimeoutError(
                f"Polling timed out after {total_timeout}s. Last status={status!r}"
            )
        time.sleep(interval)


def main() -> int:
    args = parse_args()

    try:
        payload = build_payload(args)
    except Exception as exc:
        print(f"Failed to build request: {exc}", file=sys.stderr)
        return 2

    if args.dry_run:
        print(json.dumps(payload, indent=2, ensure_ascii=False))
        return 0

    api_key = os.getenv("ARK_API_KEY")
    if not api_key:
        print(
            'ARK_API_KEY is not set. Export it in the current shell or define it in agent/.env, then rerun.',
            file=sys.stderr,
        )
        return 2

    output_dir = ensure_output_dir(args.output_dir)

    submit_path = output_dir / "submit.json"
    final_path = output_dir / "final.json"
    if args.poll and final_path.is_file() and not (output_dir / "video.mp4").is_file():
        try:
            final = json.loads(final_path.read_text(encoding="utf-8"))
        except Exception as exc:
            print(f"Failed to resume existing final.json: {exc}", file=sys.stderr)
            return 1
        task_id = str(final.get("id") or final.get("task_id") or "")
        if not task_id and submit_path.is_file():
            try:
                submit_response = json.loads(submit_path.read_text(encoding="utf-8"))
                task_id = str(submit_response.get("id") or submit_response.get("task_id") or "")
            except Exception:
                task_id = ""
        if not task_id:
            print(
                f"No task id found while resuming {output_dir}/final.json",
                file=sys.stderr,
            )
            return 1
        print(f"Resuming Seedance download from {final_path}", file=sys.stderr)
        return download_final_video(output_dir, final, task_id, args.timeout)

    if args.poll and submit_path.is_file() and not (output_dir / "video.mp4").is_file():
        try:
            submit_response = json.loads(submit_path.read_text(encoding="utf-8"))
        except Exception as exc:
            print(f"Failed to resume existing submit.json: {exc}", file=sys.stderr)
            return 1
        print(f"Resuming Seedance task from {submit_path}", file=sys.stderr)
    else:
        try:
            submit_response = submit_task(args.base_url, api_key, payload, args.timeout)
        except Exception as exc:
            print(str(exc), file=sys.stderr)
            return 1

        write_json(output_dir, "submit.json", submit_response)

    task_id = submit_response.get("id") or submit_response.get("task_id")
    if not task_id:
        print(
            f"No task id returned. Submit response written to {output_dir}/submit.json",
            file=sys.stderr,
        )
        return 1

    print(f"Seedance task id: {task_id}", file=sys.stderr)

    if not args.poll:
        print(
            "Submitted without --poll. Re-run with --poll, or poll via GET "
            f"{args.base_url.rstrip('/')}/contents/generations/tasks/{task_id}",
            file=sys.stderr,
        )
        print(
            json.dumps(
                {"task_id": task_id, "status": submit_response.get("status", "queued")},
                indent=2,
            )
        )
        return 0

    try:
        final = poll_until_done(
            args.base_url,
            api_key,
            task_id,
            args.poll_interval,
            args.poll_timeout,
            args.timeout,
        )
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        return 1

    write_json(output_dir, "final.json", final)
    return download_final_video(output_dir, final, task_id, args.timeout)


if __name__ == "__main__":
    raise SystemExit(main())
