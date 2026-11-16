---
name: seedance-2-0
description: "Unified Seedance 2.0 skill for prompt design and async video generation via the BytePlus ModelArk API. Use for text-to-video, image-to-video, reference-driven prompting, Chinese prompt optimization, camera/motion/lighting/style direction, audio/lip-sync guidance, content-filter-safe rewrites, troubleshooting, and submitting Seedance generation tasks from code."
allowed-tools:
  - Read
  - Write
  - Bash
  - WebFetch
---

# Seedance 2.0

This skill is the single entry point for Seedance 2.0 in this workspace. Prompt guidance that used to live across multiple `seedance-*` skills is consolidated here and split into on-demand references.

## Use this skill for

- Turning a vague idea into a production-ready Seedance prompt
- Writing or compressing Chinese prompts
- Planning camera, motion, lighting, character, style, VFX, and audio direction
- Rewriting prompts to avoid slop, copyright collisions, and content-filter blocks
- Troubleshooting drift, jitter, broken lip-sync, or weak outputs
- Submitting Seedance generation through the Python CLI

## Loading map

- Read [workflow](references/workflow.md) when the user needs ideation, genre routing, or I2V/T2V decision rules.
- Read [prompt-guidance](references/prompt-guidance.md) when building or compressing the actual prompt text.
- Read [shot-design](references/shot-design.md) for camera, motion, lighting, characters, style, and VFX.
- Read [audio](references/audio.md) for dialogue, music, lip-sync, and beat-sync.
- Read [safety](references/safety.md) for copyright, content filters, anti-slop rewrites, and troubleshooting.
- Read [examples](references/examples.md) for genre templates and Chinese examples.
- Read [vocabulary-zh](references/vocabulary-zh.md) when the user wants prompt-ready Chinese film language.
- Read [platform](references/platform.md) for operational constraints, asset budgets, and pipeline notes.

## Core rules

1. Intent over micromanagement. Tell the model what happens and how it should feel.
2. References beat description. If the user has assets, use them as `--image` / `--video` inputs.
3. In I2V, describe motion and camera only. Do not restate the image.
4. One primary camera move per shot.
5. Keep prompts dense. Default target: 30-100 Chinese words or one compact paragraph.
6. Use the API CLI below. No cookies, no browser automation, no background cron polling.
7. If `ARK_API_KEY` is missing, stop and ask the user to export it or define it through the agent runtime secret/config mechanism. `SEEDANCE_MODEL` has a sensible default (`dreamina-seedance-2-0-260128`) and only needs setting to switch variants (e.g. `-fast-260128`).
8. When a downstream consumer (like `playable-html5`) needs the actual MP4 on disk, always run with `--poll`. Do not hand off a task id without the file.

## Generation CLI

Single supported entrypoint — `scripts/seedance.py`. It is a stdlib-only
(`urllib`) wrapper over `POST /contents/generations/tasks` plus a
`GET /contents/generations/tasks/{id}` poller.

```bash
python3 scripts/seedance.py \
  --prompt "银色咖啡机置于现代厨房台面。晨光切入，蒸汽缓慢升起，镜头缓推到咖啡液流入玻璃杯的特写。" \
  --duration 5 \
  --resolution 720p \
  --ratio 9:16 \
  --output-dir generated/seedance/coffee_hero \
  --poll
```

On success the script writes three artifacts into `--output-dir`:

- `submit.json` — raw response from task creation (contains the task id)
- `final.json` — raw response from the final polled task status
- `video.mp4` — the downloaded clip (only when `--poll` was set and the task reached `succeeded`)

It also prints a final JSON blob to stdout with the task id, terminal status,
video URL, and video path — easy to capture from a parent agent:

```json
{
  "task_id": "cgt-20260424-…",
  "status": "succeeded",
  "video_path": "/abs/path/generated/seedance/coffee_hero/video.mp4",
  "video_url": "https://…mp4"
}
```

## CLI inputs

- `--prompt` (required): prompt text, Chinese or English
- `--model` (optional): defaults to `$SEEDANCE_MODEL` → `dreamina-seedance-2-0-260128`. Override to try `-fast-260128` or a newer build.
- `--image` (optional, repeatable): reference image URL, `data:` URL, or local file path. Local files are auto-encoded as base64 data URLs before submission.
- `--video` (optional, repeatable): reference video URL or local file path. Same handling as `--image`.
- `--duration`: `5` or `10`. Default `5`.
- `--resolution`: `480p` or `720p`. Default `720p`.
- `--ratio`: `16:9`, `4:3`, `1:1`, `3:4`, `9:16`, `21:9`, `9:21`, `adaptive`. Default `9:16` — chosen to match the portrait stage used by playable ads. Override when the playable's Creative Direction Document specifies a different stage aspect.
- `--generate-audio` / `--no-generate-audio`: off by default; most playable slots are silent loops over the stage.
- `--watermark` / `--no-watermark`: off by default.
- `--output-dir` (required): where `submit.json` / `final.json` / `video.mp4` will land.
- `--poll`: poll until terminal state and download the MP4. Without this flag the script returns immediately after task submission.
- `--poll-interval`: seconds between polls. Default `10`.
- `--poll-timeout`: total poll budget. Default `900`.
- `--timeout`: per-request HTTP timeout. Default `120`.
- `--dry-run`: print the request JSON and exit without calling the API. Useful for verifying aspect / prompt before burning credits.

## Credentials

- `ARK_API_KEY` (required): shared with the Seedream skill. Export in the shell or provide it through the agent runtime secret/config mechanism.
- `SEEDANCE_MODEL` (optional): defaults to `dreamina-seedance-2-0-260128`, the current public unified ID for Seedance 2.0. Override to switch to `-fast-260128` or a newer build.
- `ARK_BASE_URL` (optional): defaults to `https://ark.ap-southeast.bytepluses.com/api/v3`.

If `ARK_API_KEY` is missing, the CLI prints the exact export command and
exits with code 2. Treat that as a blocker for Seedance generation — use the
CSS/Canvas fallback documented in the playable-html5 skill for the affected
motion slot.

## Submit-then-poll pattern

The CLI is designed to be called end-to-end (`--poll` flag) in most cases so
the caller gets a file, not a task id. A two-phase flow is still supported
for long runs where you want to submit many tasks in parallel and then poll
them together:

```bash
# phase 1 — submit only
python3 scripts/seedance.py --prompt "…" --output-dir generated/seedance/slot_a
# prints {"task_id": "…", "status": "queued"}

# phase 2 — poll by reissuing the same command with --poll is NOT enough
# (it would submit a second task). Instead, curl the task endpoint directly:
curl -H "Authorization: Bearer $ARK_API_KEY" \
  "$ARK_BASE_URL/contents/generations/tasks/$TASK_ID"
```

When in doubt, pass `--poll` on the first call. Do not deliver a final
playable that references a video still in queue.

## Validate every generated video — never trust the first output

Seedance's success status means "the task finished", not "the clip is correct". A succeeded task can still deliver the wrong aspect, the wrong duration, a black/frozen frame, or a scene that doesn't match what the brief described. Every MP4 goes through a validation loop before it reaches `index.html`.

For Seedance specifically:

### 1. Mechanical check

Run the seedream skill's `scripts/validate-asset.py` on the downloaded MP4 with the aspect and duration you asked for:

```bash
python3 ../seedream/scripts/validate-asset.py \
  generated/seedance/lead_in/video.mp4 \
  --expected-size 1080x1920 \
  --expected-duration 5 \
  --duration-tolerance 0.4 \
  --json
```

The script uses `ffprobe` (required) to check: video stream present, dimensions, aspect, orientation, duration within tolerance, file non-trivially sized. Non-zero exit = read the JSON failures and feed them into the retry prompt.

Note: the duration field returned by the API is sometimes a float like `4.97` or `5.04`. Default tolerance of `0.5s` absorbs this; tighten only if the playable logic depends on exact seconds.

### 2. Semantic check — sample 3 frames, `Read` each

Mechanical pass is not enough — the scene can still be wrong game / wrong style / frozen. Sample three frames with ffmpeg and open each with the `Read` tool:

```bash
VIDEO=generated/seedance/lead_in/video.mp4
OUT=generated/seedance/lead_in/frames
mkdir -p "$OUT"
ffmpeg -y -ss 0.1         -i "$VIDEO" -frames:v 1 "$OUT/frame_start.png"
ffmpeg -y -ss 2.5         -i "$VIDEO" -frames:v 1 "$OUT/frame_mid.png"
ffmpeg -y -sseof -0.2     -i "$VIDEO" -frames:v 1 "$OUT/frame_end.png"
```

Then `Read` all three and confirm:

- subject matches the prompt in each frame
- style matches reference screenshots (when `--image` was used)
- the three frames are the same scene (not a scene change, not frozen on one frame)
- no unwanted text / watermark / logos

A frozen video is the most common silent failure — if start and end frames are pixel-identical, that's a fail, not a loop.

### 3. Retry up to 3 times total

Fail class → retry change:

| Failure                  | Retry change                                              |
| ------------------------ | --------------------------------------------------------- |
| Aspect / duration wrong  | Fix `--ratio` / `--duration`; keep prompt.                |
| Frozen / no motion       | Strengthen motion verbs in the prompt; new seed.          |
| Wrong subject            | Rewrite prompt; add `--image` if a reference exists.      |
| Wrong style              | Add style keywords; add `--image` from screenshots.       |
| Unwanted scene change    | Add "single continuous shot, no cuts" to the prompt.      |

Three attempts is the ceiling. Keep every attempt on disk (`video_attempt1.mp4`, …) so the reviewer can pick one after a blocker.

### 4. Record every attempt in build-notes

Each Seedance clip gets a block under `## Asset validation` in `build-notes.md` with the spec, each attempt's mechanical + semantic outcome, and the accepted file path (or `pending blocker`). The pipeline's validation stage verifies this is present — missing entries block the run.
