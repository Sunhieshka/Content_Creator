#!/usr/bin/env python3
"""
Sprite post-processor: remove backgrounds and crop to content.
Works with rembg (AI-based) or PIL trim methods.
Used in the playable-ads pipeline after Seedream generation.

Usage:
  python3 post_process_sprites.py --input path/to/image.jpeg --output path/to/output.png
  python3 post_process_sprites.py --input-dir generated/seedream/cannon_base --output-dir sprites/ --method rembg
"""

import argparse
import os
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Optional rembg import — fall back gracefully if not installed
# ---------------------------------------------------------------------------
try:
    from rembg import remove as rembg_remove
    REMBG_AVAILABLE = True
except ImportError:
    REMBG_AVAILABLE = False


# ---------------------------------------------------------------------------
# PIL imports (required)
# ---------------------------------------------------------------------------
try:
    from PIL import Image
except ImportError:
    print("ERROR: Pillow is required. Install it with: pip3 install Pillow", file=sys.stderr)
    sys.exit(1)


# ---------------------------------------------------------------------------
# Core processing functions
# ---------------------------------------------------------------------------

def _crop_to_alpha(img: Image.Image, padding: int = 0) -> Image.Image:
    """Crop an RGBA image to the bounding box of non-transparent pixels,
    then add *padding* transparent pixels on all sides."""
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    bbox = img.getbbox()
    if bbox is None:
        # Fully transparent — return as-is with padding
        return _add_padding(img, padding)
    cropped = img.crop(bbox)
    return _add_padding(cropped, padding)


def _add_padding(img: Image.Image, padding: int) -> Image.Image:
    """Add *padding* transparent pixels on every side."""
    if padding <= 0:
        return img
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    new_w = img.width + 2 * padding
    new_h = img.height + 2 * padding
    canvas = Image.new("RGBA", (new_w, new_h), (0, 0, 0, 0))
    canvas.paste(img, (padding, padding))
    return canvas


def process_rembg(input_path: str, padding: int = 0) -> Image.Image:
    """Remove background using rembg (AI-based) and crop to content."""
    if not REMBG_AVAILABLE:
        raise RuntimeError(
            "rembg is not installed. Install with: pip3 install rembg onnxruntime"
        )
    with open(input_path, "rb") as f:
        input_data = f.read()
    output_data = rembg_remove(input_data)
    import io
    img = Image.open(io.BytesIO(output_data)).convert("RGBA")
    return _crop_to_alpha(img, padding)


def process_trim_white(input_path: str, threshold: int = 240, padding: int = 0) -> Image.Image:
    """Crop away white/near-white borders using PIL pixel detection."""
    img = Image.open(input_path).convert("RGBA")
    r, g, b, a = img.split()
    # Build a mask: pixel is foreground if it is NOT near-white
    # near-white: R >= threshold, G >= threshold, B >= threshold
    import PIL.ImageChops as ImageChops
    r_arr = r.point(lambda x: 255 if x >= threshold else 0)
    g_arr = g.point(lambda x: 255 if x >= threshold else 0)
    b_arr = b.point(lambda x: 255 if x >= threshold else 0)

    # near_white_mask: 255 where all channels are near-white
    near_white = ImageChops.multiply(ImageChops.multiply(r_arr, g_arr), b_arr)
    # alpha_mask: 0 where near-white (make transparent), 255 elsewhere
    new_alpha = near_white.point(lambda x: 0 if x == 255 else 255)
    img.putalpha(new_alpha)
    return _crop_to_alpha(img, padding)


def process_trim_color(
    input_path: str,
    color: tuple,
    threshold: int = 30,
    padding: int = 0,
) -> Image.Image:
    """Crop away a specific solid color background using PIL pixel detection.

    Args:
        color: (R, G, B) tuple of the background color to remove.
        threshold: per-channel tolerance (default 30).
    """
    img = Image.open(input_path).convert("RGBA")
    data = img.load()
    width, height = img.size
    cr, cg, cb = color

    for y in range(height):
        for x in range(width):
            pr, pg, pb, pa = data[x, y]
            if (
                abs(pr - cr) <= threshold
                and abs(pg - cg) <= threshold
                and abs(pb - cb) <= threshold
            ):
                data[x, y] = (pr, pg, pb, 0)

    return _crop_to_alpha(img, padding)


# ---------------------------------------------------------------------------
# Chroma key (green screen) function — PIL only, no OpenCV
# ---------------------------------------------------------------------------

def remove_green_screen(
    input_path: str,
    output_path: str,
    hue_low: int = 40,
    hue_high: int = 80,
    sat_min: int = 80,
) -> None:
    """Remove a green-screen background from a single image frame using PIL HSV.

    Converts the image to HSV color space (manually via colorsys) and masks
    pixels whose hue falls within [hue_low, hue_high] (degrees, 0-360) and
    saturation >= sat_min (0-255). Designed for post-processing individual
    frames extracted from Seedance green-screen videos.

    Args:
        input_path:  Path to the input image (JPEG or PNG).
        output_path: Path for the output transparent PNG.
        hue_low:     Lower bound of green hue range in degrees (default 40).
        hue_high:    Upper bound of green hue range in degrees (default 80).
        sat_min:     Minimum saturation (0-255) for a pixel to be keyed (default 80).
    """
    import colorsys

    img = Image.open(input_path).convert("RGBA")
    data = img.load()
    width, height = img.size

    for y in range(height):
        for x in range(width):
            r, g, b, a = data[x, y]
            # Normalise to 0-1 for colorsys
            h, s, v = colorsys.rgb_to_hsv(r / 255.0, g / 255.0, b / 255.0)
            h_deg = h * 360.0
            s_255 = s * 255.0
            if hue_low <= h_deg <= hue_high and s_255 >= sat_min:
                data[x, y] = (r, g, b, 0)

    out_dir = os.path.dirname(output_path)
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)
    img.save(output_path, "PNG")
    print(f"Green screen removed: {output_path}")


# ---------------------------------------------------------------------------
# Single-file processing entry point
# ---------------------------------------------------------------------------

def process_single(
    input_path: str,
    output_path: str,
    method: str,
    padding: int = 0,
    threshold: int = 240,
    color: tuple = None,
) -> None:
    """Process a single image file and save the result as PNG."""
    effective_method = method

    if method == "rembg" and not REMBG_AVAILABLE:
        print(
            "WARNING: rembg is not available (onnxruntime may not be installed). "
            "Falling back to trim-white method.",
            file=sys.stderr,
        )
        effective_method = "trim-white"

    if effective_method == "rembg":
        result = process_rembg(input_path, padding=padding)
    elif effective_method == "trim-white":
        result = process_trim_white(input_path, threshold=threshold, padding=padding)
    elif effective_method == "trim-color":
        if color is None:
            print("ERROR: --color is required for trim-color method.", file=sys.stderr)
            sys.exit(1)
        result = process_trim_color(input_path, color=color, threshold=threshold, padding=padding)
    else:
        print(f"ERROR: Unknown method '{effective_method}'.", file=sys.stderr)
        sys.exit(1)

    out_dir = os.path.dirname(output_path)
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)

    result.save(output_path, "PNG", optimize=True)
    size_kb = os.path.getsize(output_path) / 1024
    print(f"Saved: {output_path}  |  {result.width}x{result.height}px  |  {size_kb:.1f} KB")


# ---------------------------------------------------------------------------
# Batch processing
# ---------------------------------------------------------------------------

SUPPORTED_EXTENSIONS = {".jpeg", ".jpg", ".png", ".webp", ".bmp", ".tiff", ".tif"}


def process_batch(
    input_dir: str,
    output_dir: str,
    method: str,
    padding: int = 0,
    threshold: int = 240,
    color: tuple = None,
) -> None:
    """Process all supported images in *input_dir* and write PNGs to *output_dir*."""
    input_path = Path(input_dir)
    if not input_path.is_dir():
        print(f"ERROR: input-dir '{input_dir}' is not a directory.", file=sys.stderr)
        sys.exit(1)

    files = [
        f for f in sorted(input_path.iterdir())
        if f.is_file() and f.suffix.lower() in SUPPORTED_EXTENSIONS
    ]

    if not files:
        print(f"WARNING: No supported image files found in '{input_dir}'.", file=sys.stderr)
        return

    os.makedirs(output_dir, exist_ok=True)
    print(f"Batch processing {len(files)} file(s) from '{input_dir}' → '{output_dir}'")

    for f in files:
        out_name = f.stem + ".png"
        out_path = str(Path(output_dir) / out_name)
        process_single(
            input_path=str(f),
            output_path=out_path,
            method=method,
            padding=padding,
            threshold=threshold,
            color=color,
        )


# ---------------------------------------------------------------------------
# CLI argument parsing
# ---------------------------------------------------------------------------

def parse_color(color_str: str) -> tuple:
    """Parse a color string like '0,255,0' into an (R, G, B) tuple."""
    try:
        parts = [int(c.strip()) for c in color_str.split(",")]
        if len(parts) != 3:
            raise ValueError("Expected exactly 3 components.")
        for p in parts:
            if not (0 <= p <= 255):
                raise ValueError(f"Component {p} out of range 0-255.")
        return tuple(parts)
    except Exception as e:
        print(f"ERROR: Invalid --color value '{color_str}': {e}", file=sys.stderr)
        sys.exit(1)


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Remove backgrounds from Seedream sprite images and crop to content. "
            "Outputs transparent PNGs ready for HTML embedding."
        )
    )

    # Input / output (single file)
    parser.add_argument(
        "--input", "-i",
        metavar="PATH",
        help="Path to input JPEG or PNG image.",
    )
    parser.add_argument(
        "--output", "-o",
        metavar="PATH",
        help="Path for output PNG (single-file mode).",
    )

    # Input / output (batch)
    parser.add_argument(
        "--input-dir",
        metavar="DIR",
        help="Directory of images to process (batch mode).",
    )
    parser.add_argument(
        "--output-dir",
        metavar="DIR",
        help="Directory where processed PNGs are saved (batch mode).",
    )

    # Processing options
    parser.add_argument(
        "--method",
        choices=["rembg", "trim-white", "trim-color"],
        default="rembg",
        help=(
            "Background removal method. "
            "'rembg' uses AI (requires onnxruntime); "
            "'trim-white' removes near-white borders via PIL; "
            "'trim-color' removes a specific color via PIL. "
            "Default: rembg (falls back to trim-white if rembg is unavailable)."
        ),
    )
    parser.add_argument(
        "--padding",
        type=int,
        default=0,
        metavar="PX",
        help="Pixels of transparent padding to add on all sides after cropping. Default: 0.",
    )
    parser.add_argument(
        "--threshold",
        type=int,
        default=240,
        metavar="N",
        help=(
            "Per-channel threshold for trim-white (0-255). "
            "Pixels with R, G, B all >= threshold are treated as background. "
            "Also used as tolerance for trim-color. Default: 240."
        ),
    )
    parser.add_argument(
        "--color",
        metavar="R,G,B",
        help=(
            "Background color to remove in trim-color mode, e.g. '0,255,0' for green. "
            "Required when --method trim-color is used."
        ),
    )

    args = parser.parse_args()

    # Validate mutual exclusion of single vs batch modes
    single_mode = args.input is not None or args.output is not None
    batch_mode = args.input_dir is not None or args.output_dir is not None

    if single_mode and batch_mode:
        print(
            "ERROR: Use either --input/--output (single) or --input-dir/--output-dir (batch), not both.",
            file=sys.stderr,
        )
        sys.exit(1)

    if not single_mode and not batch_mode:
        parser.print_help()
        sys.exit(1)

    # Parse color if needed
    parsed_color = None
    if args.color:
        parsed_color = parse_color(args.color)

    if single_mode:
        if args.input is None:
            print("ERROR: --input is required in single-file mode.", file=sys.stderr)
            sys.exit(1)
        if args.output is None:
            print("ERROR: --output is required in single-file mode.", file=sys.stderr)
            sys.exit(1)
        process_single(
            input_path=args.input,
            output_path=args.output,
            method=args.method,
            padding=args.padding,
            threshold=args.threshold,
            color=parsed_color,
        )
    else:
        if args.input_dir is None:
            print("ERROR: --input-dir is required in batch mode.", file=sys.stderr)
            sys.exit(1)
        if args.output_dir is None:
            print("ERROR: --output-dir is required in batch mode.", file=sys.stderr)
            sys.exit(1)
        process_batch(
            input_dir=args.input_dir,
            output_dir=args.output_dir,
            method=args.method,
            padding=args.padding,
            threshold=args.threshold,
            color=parsed_color,
        )


if __name__ == "__main__":
    main()
