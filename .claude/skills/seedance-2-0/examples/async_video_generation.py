"""End-to-end example for the Seedance ModelArk API CLI.

Mirrors the pattern used by downstream pipelines: submit a task, poll until
terminal state, and download the MP4 into a per-slot output directory.

Run from the skill root so that `scripts/seedance.py` resolves:

    cd agent/skills/seedance-2-0
    python examples/async_video_generation.py

Requires `ARK_API_KEY` and `SEEDANCE_MODEL` in the environment (or a parent
`agent/.env` loaded by the orchestrator).
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path


SKILL_ROOT = Path(__file__).resolve().parent.parent
SEEDANCE_CLI = SKILL_ROOT / "scripts" / "seedance.py"


def submit_tiktok_coffee_ad(output_dir: Path) -> int:
    prompt = (
        "银色咖啡机置于现代厨房台面。晨光从窗边切入，蒸汽缓慢升起。"
        "镜头缓推到咖啡液流入玻璃杯的特写，暖琥珀色调，短促手持感。"
    )
    cmd = [
        sys.executable,
        str(SEEDANCE_CLI),
        "--prompt", prompt,
        "--image", "https://example.com/product.jpg",
        "--duration", "5",
        "--resolution", "720p",
        "--ratio", "9:16",
        "--output-dir", str(output_dir),
        "--poll",
    ]
    return subprocess.run(cmd, check=False).returncode


if __name__ == "__main__":
    output_dir = SKILL_ROOT / "generated" / "coffee_hero"
    sys.exit(submit_tiktok_coffee_ad(output_dir))
