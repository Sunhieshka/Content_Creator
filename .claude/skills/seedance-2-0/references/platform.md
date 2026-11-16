# Platform

Use this file for submission constraints and production pipeline notes.

## Supported code path

This skill exposes one code entrypoint — a thin CLI over the BytePlus ModelArk
Seedance REST API. All traffic goes to
`https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks`.

```bash
python3 scripts/seedance.py \
  --prompt "…" \
  --duration 5 \
  --resolution 720p \
  --ratio 9:16 \
  --output-dir generated/seedance/<slot_id> \
  --poll
```

It performs:

1. optional reference upload (image or video URL / local path → data URL)
2. POST the task
3. if `--poll` is set, GET the task on a timer until terminal state, then
   download the MP4 into `--output-dir/video.mp4`

No cookies, no browser session, no Jimeng / Dreamina dependency.

## Credentials

- Required: `ARK_API_KEY` (same key Seedream uses). Read from the shell,
  agent runtime secret/config mechanism, or a parent process.
- Optional: `SEEDANCE_MODEL` — defaults to `dreamina-seedance-2-0-260128`
  (current public unified ID). Override to switch to `-fast-260128` or a
  newer BytePlus build.
- Optional: `ARK_BASE_URL` — override the default base URL if routing to a
  different region.

If `ARK_API_KEY` is missing, the script exits with code 2. Use the
CSS/Canvas fallback path in the playable-html5 skill rather than silently
dropping the motion slot.

## Working assumptions

These values come from the repository's Seedance notes. Confirm in live docs
if precision matters.

- short clips are safer than long clips (5s >> 10s for first-try success)
- supported aspect ratios: `16:9`, `4:3`, `1:1`, `3:4`, `9:16`, `21:9`, `9:21`,
  `adaptive`
- supported resolutions: `480p`, `720p`
- supported durations: `5` or `10` seconds
- image references are usually easier to control than text-only generations
- shorter prompts generally fail less often than verbose ones

## Asset budget habits

Keep the request simple:

- one hero subject
- only the references needed for this clip
- one camera move
- one primary style anchor

## Polling guidance

- typical success latency: 30-180s depending on duration and queue depth
- default poll interval: 10s, total timeout 900s — adjust per slot if needed
- a task can reach `failed` — always check `status` in the returned JSON
  before assuming a video is on disk

## Suggested downstream pipeline

1. generate a short proof clip
2. iterate until motion and identity are correct
3. upscale or interpolate only after the base clip works
4. composite exact audio, graphics, or subtitles in post if needed

## Operational warning

Do not treat repository notes about policy or platform behavior as live
guarantees. If the user asks for current model IDs, regional routing, or
quota limits, verify against current official docs before answering.
