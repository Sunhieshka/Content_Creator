---
name: seedream
description: "Use BytePlus ModelArk Seedream models to generate, edit, and combine images from text prompts and reference images. Trigger this skill when the agent needs to call Seedream 4.x or 5.x through the ModelArk image generation API, prepare image-generation payloads, turn local images into API-ready inputs, save returned images, or apply Seedream prompt patterns for text-to-image, image editing, multi-image fusion, or image-set generation."
allowed-tools:
  - Read
  - Write
  - Bash
  - WebFetch
---

# Seedream

## Overview

Use this skill to call BytePlus Seedream from an agent without re-deriving the ModelArk image API every time. Prefer the bundled script for reliable CLI execution and use the reference doc when model IDs or parameters need to be checked against the official docs.

## Workflow

1. Confirm prerequisites.
   - Require `ARK_API_KEY` in the environment.
   - If `ARK_API_KEY` is already present in the current shell, use it directly and continue without asking the user.
   - If `ARK_API_KEY` is missing, ask the user to provide it.
   - After the user provides it, run `export ARK_API_KEY="..."` in the current shell session, then run the generation command yourself. Do not switch to passing the key as a CLI argument.
   - Do not stop at printing a command for the user if you can execute it yourself in the terminal session.
   - Only ask the user to execute commands manually if you already tried to execute them and the environment explicitly blocked the run in a way you cannot resolve.
   - Default the data-plane base URL to `https://ark.ap-southeast.bytepluses.com/api/v3`.
   - If the user asks for the latest or a specific production model ID, re-check the current BytePlus docs before invoking.

2. Choose the execution path.
   - Use `scripts/seedream.py` for direct API calls from the terminal.
   - Use raw `curl` or the OpenAI-compatible SDK only when the user explicitly wants that form.
   - Read [references/modelark-api.md](./references/modelark-api.md) before using advanced parameters such as multi-image input, `sequential_image_generation`, or prompt enhancement.

3. Build the request around the user task.
   - If the source prompt is vague, first rewrite it yourself into a concise, concrete Seedream prompt by following the prompt enhancement instruction below.
   - Text-to-image: pass `prompt`, `model`, and optionally `size` and `watermark`. This skill always sends `response_format=url`.
   - Image editing or reference generation: pass one or more `--image` values plus a prompt that states what must change and what must stay fixed.
   - Image-set generation: use `--sequential-image-generation auto`.
   - Single-image generation: use `--sequential-image-generation disabled` when you need deterministic single-image behavior on models that support both modes.

4. Save the result in a usable form.
   - This skill always requests hosted image URLs.
   - Add `--download-urls` if local files are needed.
   - Keep `response.json` and `urls.txt` when the user will need request tracing or downstream processing.

## Reference images — use them whenever they exist

For any real product (game, app, physical good, brand), **text-only generation will not match the real visual**. Seedream can see images you pass via `--image`, and it will match their palette, composition, character style, and UI tone. The difference between text-only and reference-mode is not subtle — it is the difference between a generic "strategy game battlefield" and the actual battlefield players of that game would recognize.

### When to use reference mode

Use `--image` whenever **any** of these are true:

- The pipeline has downloaded screenshots to `research/product-screenshots/` (via the ad-research skill's `fetch-app-screenshots.py`). This happens automatically for any Google Play / App Store URL.
- The Creative Direction Document marks the asset as `generation_mode: reference` with a `reference_screenshots:` list.
- The user provided product photos in the conversation.
- You are generating a visually-identifying asset: background, character, sprite, UI chrome, end-card hero art.

Use text-only only when:

- The asset is abstract / non-identifying (particles, flashes, glows).
- No product URL or user-supplied image exists (pure concept ad).
- The user explicitly waived visual reference in `research/visual-reference-waiver.md`.

### How to invoke reference mode

Pick the **1–3 most relevant** screenshots for the asset you're generating — not all of them. A background asset should reference screenshots that show the environment; a character sprite should reference screenshots that show a character of the same tier/class. Passing everything dilutes the signal.

```bash
python3 scripts/seedream.py \
  --prompt "Top-down battlefield map in the style of the reference images, warm sandy earth, green grass patches, command tower silhouette in the distance, 45-degree isometric view, no units on the field." \
  --image ../research/product-screenshots/screenshot-03.jpg \
  --image ../research/product-screenshots/screenshot-05.jpg \
  --aspect portrait-9x16 \
  --no-watermark \
  --output-dir generated/seedream/game_bg
```

### Prompt-writing rules for reference mode

- **Say what to keep.** State explicitly which visual properties of the references must carry over: palette, terrain texture, character proportion, UI chrome style, lighting register.
- **Say what to change.** Reference images almost always contain UI elements, text overlays, characters, or HUD that you don't want in the output. Explicitly exclude them: "remove all HUD overlays and text", "no character visible", "no buttons".
- **Refer to the references positionally.** "In the style of Image 1's battlefield texture, but with Image 2's lighting." Not "like the references."
- **Don't describe what the references already show.** If the reference is a merge-game battlefield, don't also write "cartoon military battlefield with sandy earth and grass patches" — that's redundant and can confuse the model when descriptions disagree with pixels. Say "match the environment style of the reference images" and focus your words on what's *different*.

### Common mistake to avoid

Do not pass `--image` once and assume it applied to all later calls. Each `seedream.py` invocation is independent. If you generate six assets for a run, you need to pass the appropriate `--image` flags on each of the six calls. Build a small loop in bash if you're generating a batch:

```bash
for asset_id in game_bg unit_lv1 unit_lv2 unit_lv3 army_reveal_bg end_card_bg; do
  # The CDD's asset table specifies which screenshots each asset references.
  # Read reference_screenshots: from the CDD per asset; do not guess.
  python3 scripts/seedream.py \
    --prompt "$(lookup_prompt $asset_id)" \
    --image "research/product-screenshots/$(lookup_ref_screenshot $asset_id)" \
    --aspect "$(lookup_aspect $asset_id)" \
    --output-dir "generated/seedream/$asset_id"
done
```

## Size / aspect ratio — read this before every asset

**Do not assume the output must be square.** The `size` parameter accepts more than the shorthand aliases:

- Shorthand aliases: `"2K"` (= 2048×2048) and `"3K"` (= 3072×3072) — both 1:1.
- **Custom `"<W>x<H>"`** — any dimensions you want, as long as **total pixels ≥ 3,686,400** (roughly 1920×1920). This is how you get non-square outputs.
- `"adaptive"`, `"1K"`, and `"512x512"` are **rejected** by the current Seedream 5.x endpoint — do not retry them.

Do not conclude from a `"1K"` / `"adaptive"` rejection that only `"2K"` and `"3K"` are accepted — that inference skips the `"<W>x<H>"` form. Custom WxH works fine; never fall back to square sizes just because the aliases failed.

### Choose size by asset role, not by default

Picking the right aspect ratio up front avoids wasted pixels and prevents composition damage during downstream resize. Use this table:

| Asset role | Recommended `size` | Aspect | Why |
|---|---|---|---|
| Full-screen background (portrait stage, 9:16) | `1440x2560` | 9:16 | Matches TikTok portrait stage — zero cropping loss |
| Full-screen background (landscape stage) | `2560x1440` | 16:9 | Horizontal headroom for composition |
| End-card / banner / army-reveal hero | `2560x1440` | 16:9 | Wide visual real estate for crowds, logos, CTA text |
| Sprite / character / cutout (will be alpha-cut) | `2048x2048` | 1:1 | 1:1 is fine after rembg — the subject gets tightly cropped anyway |
| Portrait hero / talking head | `1920x2560` | 3:4 | Standard portrait composition for characters |
| Wide product shot / device mockup | `2560x1920` | 4:3 | Covers phone-in-hand, laptop, car interior |
| UI plate / diegetic screen capture | match the device's native ratio | — | e.g. `1440x2560` for a phone UI screen |

**Rule of thumb:** never default to `"2K"` for a background. Only use 1:1 when the downstream use is a cutout that will be cropped to content anyway (sprites).

If unsure about a role, compute: any `WxH` with `W*H >= 3_686_400` is legal. `1440*2560 = 3_686_400` exactly hits the floor; `1536*2400 = 3_686_400` also works.

## Bundled Script

Run the bundled wrapper when you want a low-friction ModelArk call without installing an SDK:

```bash
export ARK_API_KEY="..."
python3 scripts/seedream.py \
  --model seedream-5-0-260128 \
  --prompt "Vibrant close-up editorial portrait, sculptural hat, rich color blocking, dramatic studio lighting." \
  --size 1920x2560 \
  --response-format url \
  --no-watermark \
  --output-dir out/editorial-portrait
```

The `--size` value is passed through to the API verbatim. For convenience, the script also accepts `--aspect` (`portrait-9x16`, `landscape-16x9`, `portrait-3x4`, `landscape-4x3`, `square`) which fills in a legal `W×H` at the minimum-pixel floor so you do not have to compute dimensions manually. `--aspect` and `--size` are mutually exclusive.

If the key is not set yet, the expected interaction is:

1. Ask the user for `ARK_API_KEY`.
2. Run `export ARK_API_KEY="..."` in the active shell session.
3. Run `python3 scripts/seedream.py ...` yourself so the program reads the key from the environment automatically.

When working in a session-based terminal, keep the `export` and the later Python execution in the same shell session.
Do not convert this into a "please run this locally" answer unless actual terminal execution is blocked after you try.

Use one or more reference images by repeating `--image`:

```bash
python3 scripts/seedream.py \
  --model seedream-4-0-250828 \
  --prompt "Dress the person in Image 1 with the outfit from Image 2, keep pose and camera angle unchanged." \
  --image ./subject.png \
  --image ./outfit.png \
  --response-format url \
  --download-urls \
  --output-dir out/composite
```

The script accepts local file paths, remote URLs, and `data:` URLs for `--image`. Local files are converted into `data:` URLs automatically.
The script returns hosted image URLs in the API response, prints each concrete URL, and writes them to `urls.txt` when `--output-dir` is provided.

## Validate every generated image — never trust the first output

Seedream will occasionally return an image that is the wrong size, the wrong orientation, visibly blank, carries a non-identity EXIF rotation tag, or shows a subject that doesn't match the prompt. An agent that links the first output straight into `index.html` is how runs end up with sideways backgrounds and "wrong game" visuals. Every generation **must** go through a validation loop.

The validation loop:

### 1. Mechanical check (cheap, script)

Run `scripts/validate-asset.py` on every downloaded image. Give it the same size/orientation you asked Seedream for:

```bash
python3 scripts/validate-asset.py \
  out/editorial-portrait/image-001.png \
  --expected-size 1920x2560 \
  --min-variance 8 \
  --json
```

Exit 0 = pass. Non-zero = read the `failures[]` in the JSON and feed it into the retry prompt. The script catches: file missing, decoder fail, size mismatch, orientation flip, non-identity EXIF `Orientation`, and near-blank canvases.

### 2. Semantic check (agent `Read`s the file)

Mechanical pass is not enough — the image can still be the wrong subject or style. After the script returns 0, open the PNG with the `Read` tool and confirm, in one sentence each:

- subject matches the prompt
- style matches the reference screenshots (when `--image` was used)
- no unwanted text, watermark, or UI chrome
- framing leaves the headroom / subject placement the brief requires

### 3. Retry up to 3 times total

On failure, don't regenerate blindly — map the failure class to the right fix:

| Failure                          | Retry change                                            |
| -------------------------------- | ------------------------------------------------------- |
| Size / orientation wrong         | Fix `--size` or `--aspect`; keep prompt and seed.       |
| EXIF rotation                    | Regenerate with a new seed.                             |
| Blank / low variance             | Strengthen the subject line of the prompt; new seed.    |
| Wrong subject                    | Rewrite the prompt; quote the reference screenshot.     |
| Wrong style                      | Add style keywords; switch to `--image` mode if refs exist. |
| Composition / framing off        | Keep prompt; change seed only.                          |

Three attempts is a **ceiling**. Stop on the first pass. After three failures keep all three attempts on disk and record a `## Blockers` line in `build-notes.md` naming the asset and the three failure reasons — do not silently accept a bad asset.

### 4. Record every attempt

Each asset must have an entry under `## Asset validation` in `build-notes.md` listing every attempt with its mechanical + semantic outcome. The pipeline's validation stage checks that every asset the CDD listed has such an entry — missing entries block the run.

## Prompt Enhancement Instruction

When the user gives a rough brief, silently rewrite it before calling Seedream. Do not call another model just to optimize the prompt.

Use this instruction internally:

```text
Rewrite the user's brief into one Seedream-ready prompt.

Rules:
- Keep the prompt in natural language, not keyword soup.
- Prefer concise and precise wording. Add only details that improve control.
- Include, when relevant: output type, subject, action, environment, composition, lighting, style, and any text that must appear in the image.
- If text must appear in the image, wrap the exact text in double quotation marks.
- For image editing or reference-based generation, state exactly what must change and what must remain unchanged.
- For multi-image tasks, refer to each input as Image 1, Image 2, and so on, and assign each image a clear role.
- Preserve all user constraints, brand requirements, and safety-critical details.
- Return only the final prompt text.
```

Apply the rewrite pattern in this order:

- Identify the task type: text-to-image, image edit, reference-based generation, multi-image composition, or image-set generation.
- Preserve all explicit user constraints.
- Add the missing minimum details: output type, subject, action, setting, composition, lighting, style, text-in-image, and preservation constraints.
- Stop once the prompt is concrete enough to control the result.

Examples:

- Raw brief: `summer coffee poster`
- Better prompt: `Design a premium but approachable summer coffee poster for a cafe. Show a clear plastic cup of iced cold brew with visible condensation on a sunlit outdoor table, warm late-afternoon light, crisp commercial photography, clean layout, and the headline "Summer Cold Brew".`

- Raw brief: `make the bag look like leather`
- Better prompt: `Replace the bag material with premium brown leather, keeping the product angle, overall bag shape, hardware placement, and background lighting unchanged.`

## Prompting Rules

- Write prompts in natural language, not keyword soup.
- State the intended output type when it matters: poster, logo, storyboard frame, product render, UI mockup.
- For visible text inside the image, wrap the literal text in double quotes.
- For edit tasks, explicitly say what must remain unchanged.
- For multi-image prompts, refer to images by index and assign each image a role.
- Prefer concise and precise prompts on Seedream 4.x and 5.x. Do not “enhance” by blindly making the prompt longer.

## References

- Read [references/modelark-api.md](./references/modelark-api.md) for the official endpoint, model/version notes, prompt enhancement recommendations, and parameter guidance distilled from BytePlus documentation.

## Constraints

- Do not hard-code API keys.
- Do not ask the user to add the API key as a command-line flag to `seedream.py`.
- Prefer `export ARK_API_KEY="..."` in the active shell session so the script can read it via `os.getenv`.
- Do not default to handing the user a shell snippet to run. Execute the command yourself whenever the environment permits it.
- Do not assume a model ID is current if the user asks for the latest one; verify against BytePlus docs first.
- Treat unsupported parameters conservatively. When in doubt, send only documented fields plus explicit user requirements.

## Sprite Post-Processing

Game sprites and character art generated by Seedream almost always have white borders and solid backgrounds that must be removed before use in Canvas or DOM rendering. Always post-process sprite assets before embedding in HTML.

### When to post-process

Post-process any asset that will be:
- Composited over a background (character sprites, game objects, enemies, weapons)
- Used as a Canvas drawImage element with transparency
- Treated as a cutout (fish sprites, boss characters, cannon, reward items)

Do NOT post-process:
- Full-screen backgrounds (ocean_bg, reward_screen_bg) — they are meant to fill the canvas
- Abstract textures or patterns used as fills

### Prompt guidance for clean extraction

When generating sprite assets that will be post-processed, always add to the prompt:
- `"white background"` or `"isolated on white background"` — makes rembg extraction more accurate
- `"character sprite for game use, clean edges"` — tells the model to keep edges sharp
- `"centered composition"` — reduces wasted border space
- `"transparent background"` — even though Seedream outputs JPEG, this hint improves edge quality
- **NEVER use complex gradient or detailed backgrounds** for sprite assets — they confuse the AI extractor

For spritesheet assets (multiple sprites in one image):
- Add `"horizontal arrangement, equal spacing, white background, game sprite sheet format, each character separated, no overlap"` to the prompt
- Request fewer characters per image (2-3 max) for cleaner separation

### Post-processing workflow

After Seedream generation, run the post-processor on every sprite asset:

```bash
# Single asset
python3 scripts/post_process_sprites.py \
  --input generated/seedream/cannon_base/image-001.jpeg \
  --output sprites/cannon_base.png \
  --method rembg

# Batch a whole directory
python3 scripts/post_process_sprites.py \
  --input-dir generated/seedream/fish_small \
  --output-dir sprites/ \
  --method rembg \
  --padding 4
```

The script outputs a PNG with transparent background, cropped to content bounding box. Use this PNG in HTML (embed as base64) instead of the original JPEG.

### Tool priority

1. **rembg** (best): AI-based background removal. Handles complex edges, hair, fins, irregular shapes. Requires `onnxruntime` (install once: `pip3 install rembg onnxruntime`). Downloads a 176MB model on first use.
2. **trim-white** (fallback): PIL-based white border removal. Works when content is clearly separated from a white/solid background. Fast, no model download.
3. **trim-color**: For removing a specific solid color background (e.g., green screen stills).

### Size budget

After post-processing, resize if the PNG is too large for the 5MB HTML budget:
```python
from PIL import Image
img = Image.open("sprite.png")
# Resize to max 512px on longest side while preserving aspect ratio
max_side = 512
ratio = min(max_side / img.width, max_side / img.height)
if ratio < 1:
    img = img.resize((int(img.width * ratio), int(img.height * ratio)), Image.LANCZOS)
img.save("sprite_small.png", optimize=True)
```

### Spritesheet handling after crop

For a multi-fish spritesheet (e.g., fish_small with 4 fish in a row):
- After rembg + crop, the resulting PNG contains all fish in a tight row without white borders
- The JS code should divide `img.width / N` for N fish, where N is known from the asset brief
- Store the fish `variant` index as a fixed property of each fish object (set once in spawnFish), never re-derive it from position (doing so causes rapid flickering)
