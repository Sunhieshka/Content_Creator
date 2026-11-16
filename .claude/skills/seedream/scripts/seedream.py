#!/usr/bin/env python3
"""Minimal CLI wrapper for BytePlus ModelArk Seedream image generation."""

import argparse
import base64
import json
import mimetypes
import os
import pathlib
import ssl
import sys
from typing import Optional
import urllib.error
import urllib.parse
import urllib.request

DEFAULT_BASE_URL = "https://ark.ap-southeast.bytepluses.com/api/v3"
DEFAULT_MODEL = "seedream-5-0-260128"

# Aspect-ratio presets. Each maps to a legal "<W>x<H>" string where
# W*H >= 3,686,400 (the Seedream 5.x minimum-pixel floor). Values were
# chosen to hit the floor or slightly above — no wasted pixels.
ASPECT_PRESETS = {
    "portrait-9x16":  "1440x2560",  # 9:16 full-screen bg (TikTok portrait stage)
    "landscape-16x9": "2560x1440",  # 16:9 banner / end-card / wide hero
    "portrait-3x4":   "1920x2560",  # 3:4 character / portrait hero
    "landscape-4x3":  "2560x1920",  # 4:3 device mockup / wide product shot
    "portrait-2x3":   "1568x2352",  # 2:3 poster / photo-style portrait
    "landscape-3x2":  "2352x1568",  # 3:2 photo-style landscape
    "square":         "2048x2048",  # 1:1 sprite / cutout (same as "2K")
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Call BytePlus ModelArk Seedream via /images/generations."
    )
    parser.add_argument("--prompt", required=True, help="Prompt sent to the model.")
    parser.add_argument(
        "--model",
        default=DEFAULT_MODEL,
        help=f"Model ID to invoke. Default: {DEFAULT_MODEL}",
    )
    parser.add_argument(
        "--base-url",
        default=os.getenv("ARK_BASE_URL", DEFAULT_BASE_URL),
        help=f"ModelArk base URL. Default: {DEFAULT_BASE_URL}",
    )
    parser.add_argument(
        "--response-format",
        choices=("url",),
        default="url",
        help='Response format requested from the API. This skill standardizes on "url".',
    )
    parser.add_argument(
        "--size",
        default=None,
        help=(
            'Image size. Accepts shorthand "2K" (2048x2048) or "3K" (3072x3072), '
            'or explicit "<W>x<H>" where W*H >= 3,686,400 (e.g. "1440x2560", '
            '"2560x1440"). "1K", "512x512", and "adaptive" are rejected by '
            'Seedream 5.x. Mutually exclusive with --aspect. Defaults to "2K" '
            'if neither is given.'
        ),
    )
    parser.add_argument(
        "--aspect",
        choices=sorted(ASPECT_PRESETS.keys()),
        default=None,
        help=(
            "Convenience preset that resolves to a legal <W>x<H> for --size. "
            "Pick by asset role: portrait-9x16 for full-screen bg, "
            "landscape-16x9 for banner/end-card, portrait-3x4 for character, "
            "square for sprites. Mutually exclusive with --size."
        ),
    )
    parser.add_argument(
        "--image",
        action="append",
        default=[],
        help="Reference image URL, data URL, or local file path. Repeat for multiple images.",
    )
    parser.add_argument(
        "--seed",
        type=int,
        help="Optional random seed.",
    )
    parser.add_argument(
        "--guidance-scale",
        type=float,
        help="Optional guidance scale.",
    )
    parser.add_argument(
        "--sequential-image-generation",
        choices=("auto", "disabled"),
        help="Use auto for image sets, disabled for single-image generation on supported models.",
    )
    parser.add_argument(
        "--output-dir",
        help="Directory used to store response.json and any decoded/downloaded images.",
    )
    parser.add_argument(
        "--download-urls",
        action="store_true",
        help="Download returned URLs when response_format=url.",
    )
    parser.add_argument(
        "--extra",
        action="append",
        default=[],
        metavar="KEY=VALUE",
        help="Extra JSON field to include in the request body. VALUE may be JSON.",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=180,
        help="Request timeout in seconds.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the request JSON and exit without calling the API.",
    )

    watermark_group = parser.add_mutually_exclusive_group()
    watermark_group.add_argument(
        "--watermark",
        dest="watermark",
        action="store_true",
        help="Request a watermarked result.",
    )
    watermark_group.add_argument(
        "--no-watermark",
        dest="watermark",
        action="store_false",
        help="Request a non-watermarked result.",
    )
    parser.set_defaults(watermark=None)

    return parser.parse_args()


def jsonish(value: str):
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        lowered = value.lower()
        if lowered == "true":
            return True
        if lowered == "false":
            return False
        if lowered == "null":
            return None
        return value


def parse_extra_fields(items):
    payload = {}
    for item in items:
        if "=" not in item:
            raise ValueError(f"Invalid --extra value: {item!r}. Expected KEY=VALUE.")
        key, raw_value = item.split("=", 1)
        key = key.strip()
        if not key:
            raise ValueError(f"Invalid --extra value: {item!r}. Empty key.")
        payload[key] = jsonish(raw_value.strip())
    return payload


def file_to_data_url(path_str: str) -> str:
    path = pathlib.Path(path_str).expanduser().resolve()
    data = path.read_bytes()
    mime_type, _ = mimetypes.guess_type(path.name)
    if not mime_type:
        mime_type = "application/octet-stream"
    encoded = base64.b64encode(data).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


def normalize_image_input(value: str) -> str:
    parsed = urllib.parse.urlparse(value)
    if parsed.scheme in {"http", "https", "data"}:
        return value
    return file_to_data_url(value)


def resolve_size(args: argparse.Namespace) -> str:
    if args.size is not None and args.aspect is not None:
        raise ValueError("--size and --aspect are mutually exclusive; pick one.")
    if args.aspect is not None:
        return ASPECT_PRESETS[args.aspect]
    if args.size is not None:
        return args.size
    return "2K"


def build_payload(args: argparse.Namespace) -> dict:
    payload = {
        "model": args.model,
        "prompt": args.prompt,
        "size": resolve_size(args),
        "response_format": "url",
    }
    if args.image:
        images = [normalize_image_input(item) for item in args.image]
        payload["image"] = images[0] if len(images) == 1 else images
    if args.seed is not None:
        payload["seed"] = args.seed
    if args.guidance_scale is not None:
        payload["guidance_scale"] = args.guidance_scale
    if args.sequential_image_generation:
        payload["sequential_image_generation"] = args.sequential_image_generation
    if args.watermark is not None:
        payload["watermark"] = args.watermark
    payload.update(parse_extra_fields(args.extra))
    return payload


def call_api(base_url: str, api_key: str, payload: dict, timeout: int) -> dict:
    request = urllib.request.Request(
        url=base_url.rstrip("/") + "/images/generations",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"ModelArk request failed with HTTP {exc.code}: {body}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"ModelArk request failed: {exc}") from exc


def ensure_output_dir(path_str: Optional[str]):
    if not path_str:
        return None
    path = pathlib.Path(path_str).expanduser().resolve()
    path.mkdir(parents=True, exist_ok=True)
    return path


def write_json(output_dir: pathlib.Path, payload: dict) -> None:
    (output_dir / "response.json").write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def extract_urls(response: dict) -> list[str]:
    urls = []
    data = response.get("data")
    if not isinstance(data, list):
        return urls
    for item in data:
        if not isinstance(item, dict):
            continue
        url = item.get("url")
        if isinstance(url, str) and url:
            urls.append(url)
    return urls


def write_urls(output_dir: pathlib.Path, urls: list[str]) -> None:
    (output_dir / "urls.txt").write_text("\n".join(urls) + ("\n" if urls else ""), encoding="utf-8")


def infer_extension_from_url(url: str) -> str:
    suffix = pathlib.Path(urllib.parse.urlparse(url).path).suffix.lower()
    return suffix if suffix else ".png"


def download_to_file(url: str, destination: pathlib.Path, timeout: int) -> None:
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


def save_outputs(response: dict, output_dir: Optional[pathlib.Path], download_urls: bool, timeout: int):
    data = response.get("data")
    urls = extract_urls(response)
    if not isinstance(data, list):
        if output_dir:
            write_json(output_dir, response)
            write_urls(output_dir, urls)
        return

    if output_dir:
        write_json(output_dir, response)
        write_urls(output_dir, urls)

    for index, item in enumerate(data, start=1):
        if not isinstance(item, dict):
            continue
        if output_dir and download_urls and isinstance(item.get("url"), str):
            target = output_dir / f"image-{index:03d}{infer_extension_from_url(item['url'])}"
            download_to_file(item["url"], target, timeout=timeout)


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
            'ARK_API_KEY is not set. Ask the user for the key, run export ARK_API_KEY="..." in the current shell session, then rerun this command.',
            file=sys.stderr,
        )
        return 2

    try:
        response = call_api(args.base_url, api_key, payload, args.timeout)
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        return 1

    output_dir = ensure_output_dir(args.output_dir)
    try:
        save_outputs(response, output_dir, args.download_urls, args.timeout)
    except Exception as exc:
        print(f"Request succeeded but saving outputs failed: {exc}", file=sys.stderr)
        return 1

    print(json.dumps(response, indent=2, ensure_ascii=False))
    urls = extract_urls(response)
    if urls:
        print("Image URLs:", file=sys.stderr)
        for index, url in enumerate(urls, start=1):
            print(f"{index}. {url}", file=sys.stderr)
    if output_dir:
        print(f"Saved response artifacts to {output_dir}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
