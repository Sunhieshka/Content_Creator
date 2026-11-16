# Content Creator

A browser-based studio for AI film, ad and audio production on BytePlus ModelArk. It covers characters, reference sheets, storyboards, video, audio and post-production. **Seedream** makes the images, **Seedance** the video and **Seed Audio** the sound, and **Seed LLM** writes and refines the prompts in between. A Python backend serves a React UI, precompiled automatically on startup.

> **Seed Audio 1.5 is temporarily unavailable.** Use **Seed Audio 1.0** (Seed Audio tool → Model → Seed Audio 1.0). Everything that runs on Seed Audio 1.5 is on hold until it's back: its modes (Dialogue Fix, Voice Reference, Video Dubbing, Video Translation, Stem Separation). The Audiobook Creator runs on Seed Audio 1.0.

This README covers the app and the skill library in `.claude/skills/`.

## Contents

- [Quickstart](#quickstart)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Projects](#projects)
- [Tools](#tools)
- [Models](#models)
- [Video Parameters and Reference Limits](#video-parameters-and-reference-limits)
- [Downloads and Storage](#downloads-and-storage)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Development](#development)
- [Skills in Prompt Optimisation](#skills-in-prompt-optimisation)
- [Film-Making Skill Library](#film-making-skill-library)
- [Other Installed Skills](#other-installed-skills)

## Quickstart

```bash
git clone <repo-url>
cd ContentCreator

python3.12 -m venv venv
source venv/bin/activate      # macOS / Linux
# venv\Scripts\activate       # Windows

pip install -r requirements.txt

cp .env.example .env          # then fill in your keys
python app.py
```

The server prints its URL on startup. The default is **http://localhost:8000/**. To use other ports, set `CONTENT_CREATOR_PORTS` (for example `8001,8002`).

## Prerequisites

| Item | Notes |
|---|---|
| Python | 3.12 |
| Node.js | Recommended (any recent version). The server uses it to precompile the UI so pages load fast; without it the UI still works but loads in ~6 s instead of under 1 s. No `npm install` needed |
| ffmpeg | Required. Used for Long Duration and Combine Videos stitching, last-frame extraction, MOV previews, audio replacement, Video Editor export, audiobook assembly and Skeleton Reference re-encoding |
| Blender | Optional. Only the Blender 3D tool needs it (`brew install --cask blender`, or set `BLENDER_PATH`) |
| Skeleton Reference | `opencv-python-headless`, `numpy`, `onnxruntime` and `rtmlib` come from `requirements.txt`. rtmlib downloads its pose weights to `~/.cache/rtmlib` on first use |
| API keys | BytePlus ModelArk console → API Keys. See the next section for the optional keys |

## Environment Variables

Copy `.env.example` to `.env`. Never commit `.env`.

| Variable | Required | Default | Description |
|---|---|---|---|
| `ARK_API_KEY` | Yes | — | ModelArk key for every LLM, image and video call |
| `BYTEPLUS_AK` / `BYTEPLUS_SK` | Yes | — | BytePlus access/secret key for TOS uploads |
| `TOS_BUCKET_NAME` | Yes | — | TOS bucket for uploaded media |
| `TOS_REGION` | Yes | `ap-southeast-1` | TOS region |
| `ARK_PROJECT` | Yes | `default` | ModelArk project for asset registration |
| `ARK_MODEL_ENDPOINT` | Yes | — | ModelArk model used when registering assets |
| `TOS_ENDPOINT` | No | — | Custom TOS address |
| `TOS_PUBLIC_URL_PREFIX` | No | — | Public URL prefix for TOS objects |
| `TOS_PREFIX` | No | `ark-assets` | Key prefix for TOS uploads |
| `SEED_AUDIO_API_KEY` | For Seed Audio | — | BytePlus Voice key for Seed Audio 1.0. (Seed Audio 1.5, temporarily unavailable, falls back to `ARK_API_KEY` without it.) |
| `SEED_AUDIO_10_URL` | No | built-in | Seed Audio 1.0 URL override |
| `SEED_AUDIO_MODEL` | For Seed Audio 1.5 | — | Seed Audio 1.5 model ID |
| `SEED_AUDIO_BASE_URL` | No | built-in | ModelArk base URL override for Seed Audio 1.5 |
| `MEDIAKIT_API_KEY` | No | — | BytePlus AI MediaKit key for the Video Enhancer (separate from `ARK_API_KEY`) |
| `MEDIAKIT_REGION` | No | `ap-southeast-1` | AI MediaKit region |
| `BLENDER_PATH` | No | auto-detected | Blender executable for Blender 3D |
| `CONTENT_CREATOR_PORTS` | No | `8000` | Comma-separated ports to try in order |
| `FRONTEND_MODE` | No | compiled | `babel` serves the page compiled in the browser instead of precompiled (slower; for debugging) |
| `LOG_LEVEL` | No | `INFO` | `DEBUG` also logs every request (method, path, status; never headers or query strings) |

## Projects

**Clear.** On the main dashboard, tools that remember their inputs and results between visits (the Seedream tools, Audiobook Creator, Previz, Character Masking, Location Variations, Visual Understanding, Canvas, Video Editor, Video Enhancer, Hybrid Studio, Seed Audio, Blender 3D and Motion Blockout) have a **Clear** button next to the title. It empties that tool; projects keep their own copy, and files already in `outputs/` stay. Script to Prompt, Character Generation, Storyboard, Video Generation and Long Duration have their own Clear buttons inside the tool.

**Projects** (sidebar → Projects → New Project) groups work by type. Each project keeps its own drafts, results, asset groups and local files. A type decides which tools a project shows and which skills it offers. `PROJECT_TYPES` and the per-type tool lists are in [frontend/app.jsx](frontend/app.jsx).

| Type | What the project is for |
|---|---|
| Short Drama | Scripted, dialogue-led episodes with recurring characters and locations, written as a script and turned into a run of connected shots. |
| Short Film | A self-contained story told in a few minutes, with one arc, a small cast and a deliberate visual style. |
| Feature Film | Long-form work built scene by scene: sequences, recurring cast and locations, and continuity across many shots. |
| Animation | Animated stories in any style (3D, 2D, anime, claymation) with stylised characters and worlds kept consistent from shot to shot. |
| Music Video | Visuals cut to a song: performance, mood and rhythm-driven shots built around an existing track. |
| Text Overlay | Videos whose on-screen text (titles, captions, phone or app screens) must be spelled exactly; see below for how it works. |
| Seed Audio | Audio work on its own or on top of video: voice-overs, dialogue fixes, dubbing, reference-voice cloning, sound effects and music. |
| Audiobook | A book or document narrated as a full audiobook, exported as MP3 and M4B with chapter markers. |
| Hybrid Studio | Moving the people from a green-screen video into a new location, keeping their performance and the camera move. |
| Seedream | Still images only: generating, editing and combining images, and splitting them into layers. |
| Custom | An open project for anything that doesn't fit the types above. |

**Legacy types.** Ad Commercial, Product Catalogue, Social Content, Narrated Fable and Playable Ad are no longer offered for new projects. Existing projects of those types still open, keep their label and filter on the Projects page, and work like a film project. The lists are `PROJECT_TYPES` and `LEGACY_PROJECT_TYPES` in [frontend/app.jsx](frontend/app.jsx).

**Text Overlay** projects change how Video Generation and Long Duration work, so on-screen text is spelled exactly:

1. **Plan.** Seed LLM reads the prompt and the tool's reference images. It lists every readable text moment per shot with its exact wording, plus one shared typography style and one shared screen-UI style. Quoted lines are restored verbatim if the LLM drifts. A moment that a reference image already shows (such as a logo card) is taken from the reference instead of being rendered again.
2. **Render.** Seedream 5.0 Pro renders each remaining moment, as typography on a flat backdrop or as flat full-bleed UI for screens. The first image of each kind is the style anchor, and later ones are generated from it. The LLM transcribes each render back and it is re-rendered up to 2 times until the text matches character for character.
3. **Generate.** The images are added to the Seedance references, and a block naming each one's `[Image N]`, shot and exact text is appended to the prompt.

This runs automatically on **Generate**. The *Text Overlays* box can also build overlays ahead of time, fix a word and re-render, or remove one. At most 8 overlays are rendered per generation. Code: [content_creator/services/text_overlay.py](content_creator/services/text_overlay.py).

## Tools

Every tool is in the sidebar. Most also run inside projects (see [Projects](#projects)).

### Story and planning

- **Script to Prompt.** Paste a script or upload a PDF. Seed LLM breaks it into per-shot Seedance prompts, shown as an editable **Breakdown** grid (shot, runtime, prompt), plus character and location descriptions. Every shot starts with an `IN THIS SHOT:` line naming the characters, location and key props on screen. When it finishes, the results are passed on automatically:
  - character descriptions go to **Character Sheets**, and location directions go to **Location Variations**;
  - shot *n*'s prompt goes into Long Duration shot *n*.

  A card or shot you have edited yourself is never overwritten.
- **Storyboard.** A script, plus optional references and the 7 core elements, becomes a cinematic 3×3 storyboard sheet and a ready-to-use video prompt.
- **Previz.** Scene text becomes a blocking plan (set pieces, up to 6 colour-coded actors, shots with camera, framing, move, action and timing). That turns into a top-down floor plan (Seedream), then a Seedance blockout animatic. Seed LLM then watches the animatic and writes the real shot prompt. **Send to Video Generation** adds the animatic as the motion reference.
- **Visual Understanding.** Two modes:
  - **Ask about images & video:** ask Seed 2.0 questions about up to 10 images or a video.
  - **Video → video generation prompt:** Seed LLM watches a video and writes shot-by-shot Seedance prompts to recreate it. Each shot is editable, can be copied, sent to Video Generation, or sent all together to Long Duration.

### Characters and locations

- **Character Generation.** Text-to-image or image-to-image with Seedream. With **Reference-ready character** on (the default), Seed LLM first writes a locked *character bible*. It records every given detail, one concrete choice for anything left open, each garment's construction with a `must_not_have` list, and the side of every one-sided item. From the bible it writes the prompt for one full-body 1440×2560 image: head to shoes, neutral expression, white background.
- **Character Sheets.** One QA-checked 16:9 sheet (2560×1440) per character on a light grey studio background: a face close-up, then front, side (exact 90° profile) and back full-body views. Several characters can be generated at once. The pipeline is in `services/character_sheet_qa.py`, with prompts in `services/character_prompts.py`:
  1. **Bible and prompt.** Seed LLM (vision) writes a character bible from the references, and a review pass removes contradictions.
  2. **Checklist and first image, in parallel.** The checklist has standard groups (face, hair, body, outfit, accessories, view-correct details, angles, layout, style) plus up to 18 character-specific checks. Seedream draws attempt 1 at the same time.
  3. **Inspection.** A continuity audit converts raw positions into the character's left and right in each view. The checklist inspection judges the sheet using those facts. Any check the inspector skips counts as failed.
  4. **At most one retry.** If any check fails, the best sheet is edited with per-panel instructions, or regenerated if the layout is wrong. The attempt with the fewest critical failures is delivered.

  A finished sheet is added to Long Duration automatically (see [Long Duration](#video)).
- **Location Variations**. A location image, or a description that first builds the location plate, becomes N coverage angles or states (time of day, weather, season). Each one is a Seedream edit of the same plate, so the architecture stays fixed. The plate is added to Long Duration automatically.
- **Character Masking.** Replaces the people in up to 8 images with flat colour silhouettes, for blocking and staging plates.

### Image (Seedream)

Seedream 5.0 **pro** (best quality), 5.0 **flash** (faster, cheaper) or **5.5** (most realistic, transparent output):

- **Seedream Image.** Text-to-image and image-to-image with up to 14 references. Each generation is one card: prompt, references and settings on top, that card's results underneath. The **+** on a card's header adds another generation (up to 6) that runs in parallel; **Generate all** runs every card with a prompt. Size is a resolution tier (1K, 1.5K, 2K) or exact pixels. Options: PNG or JPEG, fast mode, watermark, transparent background.
- **Layer Separation.** Splits an image (at least 512×512) into a base plus up to 16 named transparent layers. Arrange them on a canvas, edit any layer from a prompt, and export a flattened PNG, single layers, or a `.zip` with a geometry `manifest.json`.
- **Interactive Edit.** Edits up to 14 images with **Box**, **Point** and **Mark** annotations written into the prompt.

Results can be sent between the three tools. Every image is saved to `outputs/seedream-*`, because ModelArk links expire after 24 hours. Code: [content_creator/services/seedream_studio.py](content_creator/services/seedream_studio.py), [static/seedream-studio.jsx](static/seedream-studio.jsx).

### Video

- **Video Generation.** A prompt plus optional reference images, videos and audio goes to Seedance after Seed LLM refines it.
  - Every run makes **three variations in parallel**. Under them, the app shows how long each one took to generate.
  - Reference images are sent straight to Seedance (as a data URL or link), not through the asset library.
  - Pick the model per generation: 2.5, 2.5 flash, 2.0, 2.0 fast or 2.0 mini. Resolution, duration and reference limits follow the model, and a collapsible table under the picker lists every model's bit depth and colour formats (MP4 YUV 4:2:0, MOV YUV 4:4:4 with PCM).
  - **Output format:** MP4, or **MOV** on 2.5 and 2.5 flash. MOV is H.264 YUV 4:4:4 with PCM audio, for grading and keying. A browser-playable MP4 preview is made next to it, and **Download MOV** saves the original. The UI explains what YUV means.
  - **Draft mode** (2.5): render a quick 480p draft, then **Make final 1080p** or **Make final 4K** reuses its prompt, references, duration, ratio and seed.
  - The **+** on the panel header duplicates the tool into an independent generation.
- **Long Duration.** Build a sequence shot by shot, where each shot can start from the previous shot's last frame, then stitch them with ffmpeg.
  - Each shot makes three takes. The selected take is the one that gets combined and that the next shot starts from.
  - Shared references (character sheets, location plates, uploads) form a pool, and each shot picks the ones it uses.
  - Each shot has a role box that is sent with the references, for example `@Image2 is the character Maya (character sheet).`
  - **Automatic mapping.** When a character sheet or location plate finishes, it joins the pool. Every shot whose `IN THIS SHOT:` line names it (whole-word match) picks it up, characters first and then the location. That shot's role lines are rewritten automatically, unless you have edited them by hand.
- **Hybrid Studio.** Puts the people from a green-screen video into a new location. Seedance 2.5 or 2.5 flash regenerates the clip in video-editing mode, using the clip for performance and camera and a background image for the location. The original audio can be laid back over the result.
- **Combine Videos.** Merges any uploaded videos in order with ffmpeg.
- **Audio to Black Video.** Turns an audio file into a black video with that soundtrack.

### Post-production

- **Video Editor.** Trim, split, arrange and join clips on a timeline, with a media bin, undo/redo, keyboard shortcuts and a sequence preview. **Export** runs ffmpeg on the server and writes `outputs/edit-*.mp4`.
- **Video Enhancer.** BytePlus AI MediaKit enhancement: denoise, colour, artifact removal, and super-resolution up to 8K. Standard and professional (`enhance-video`) and lite (`enhance-video-fast`) modes are available. Needs `MEDIAKIT_API_KEY`. Result links expire after 24 hours, so use **Save to outputs**.

### Audio

- **Seed Audio.** A **Model** dropdown switches between the two versions. It opens on Seed Audio 1.0, because **Seed Audio 1.5 is temporarily unavailable**.
  - **Seed Audio 1.0** (`seed-audio-1.0`, BytePlus Voice API). One prompt becomes a finished audio scene: voices, multi-role dialogue with emotion, background music and sound effects together. English and Chinese, up to 120 s per generation, about $0.15 per generated minute. It has three modes:
    - **Text to audio:** describe the scene, every voice, the music and the effects in the prompt.
    - **Text + reference audio:** up to 3 clips (WAV/MP3, ≤ 30 s, ≤ 10 MB) or voice IDs, tagged `@Audio1`–`@Audio3` in the prompt.
    - **Voice from image:** one character image (JPEG/PNG/WebP, ≤ 10 MB) sets the voice.

    The prompt can be up to 3000 characters. Settings: format (WAV, MP3, OGG Opus, PCM), sample rate (8–48 kHz), speed, volume and pitch. Code: [content_creator/services/seed_audio_10.py](content_creator/services/seed_audio_10.py), [static/seed-audio-10.jsx](static/seed-audio-10.jsx).
  - **Seed Audio 1.5** (ModelArk, early access). **Temporarily unavailable**: the modes below return errors until the service is back. Modes:

    | Mode | What it does |
    |---|---|
    | Dialogue Fix | Re-performs a Seedance video's dialogue with correct pronunciation, keeping voices and timing, then swaps the audio into the video |
    | Text to Audio | Speech from a prompt: lines, voice, emotion, pace |
    | Voice Reference | Clones timbre and performance from 1–6 reference clips (2–30 s each, ≤ 180 s total) |
    | Video Dubbing | Re-performs a video's lines and timing, optionally with reference voices |
    | Video Translation | Dubs a video into one of 30 languages, with an optional glossary |
    | Stem Separation | Splits one track (2–360 s) into vocals, SFX and background music |

    For dubbing, translation and Dialogue Fix the output is a video. The server uses ffmpeg to drop the source audio and attach the Seed Audio track. Dubbing needs a public video URL, and **Upload video** sends a local file to TOS for one. At most 2 generations run at once. Code: [content_creator/services/seed_audio.py](content_creator/services/seed_audio.py).
- **Audiobook Creator.** Turns a book or document (PDF, DOCX, EPUB, TXT, Markdown or pasted text, up to about 100k words) into a narrated MP3 and M4B with chapter markers, using Seed LLM and Seed Audio. The **Audio model** dropdown picks the engine:
  - **Seed Audio 1.0** (default): up to 2 minutes and 3000 prompt characters per call, up to 3 locked voices per segment, English and Chinese. Prompts are written as compact prose.
  - **Seed Audio 1.5** (**temporarily unavailable**): up to 6 minutes per call (4 with reference clips), up to 6 locked voices, more languages.

  Steps:
  1. **Split.** Every word is kept and verified word for word. Chapters come from headings. Sound cues (`SFX:`, `MUSIC:`, `[BGM: …]`) become directions instead of being read aloud. Segments are packed up to the engine's per-call limit and re-packed automatically if you switch engines; a take that comes back cut off (or a 1.0 prompt over 3000 characters) is split in two and re-rendered.
  2. **Cast and label.** Seed LLM casts the narrator and, optionally, each character. Code splits the text into spans, so the text sent to Seed Audio is always exactly the book's.
  3. **Voices.** Choose preset voices (Megan, Clark, Valentino, or any voice ID) or lock voices with short generated or uploaded samples sent as `@Audio1…`.
  4. **Render and assemble.** Segments render two at a time in the background, surviving reloads. ffmpeg joins them with pauses and levels loudness to about −18 LUFS.

  Code: [content_creator/services/audiobook.py](content_creator/services/audiobook.py), [static/audiobook.jsx](static/audiobook.jsx).

### 3D and motion (sidebar only)

- **Blender 3D.** Describe a 3D scene. Seed LLM writes a Blender Python script, and Blender renders it headless to MP4 (EEVEE, Cycles or Workbench, up to 30 s). Workflows produce Seedance motion references: camera blockout, character and action blocking, marker stage, proxy layout, multi-camera cuts, focus test, mannequin choreography and clay pass. Each comes with a matching Seedance prompt template. Ready-made helpers (`Mannequin`, `Cam`, markers, cuts) are in `services/blender_helpers.py`.
- **Motion Blockout.** Grey-box motion references rendered entirely in the browser (three.js, no Blender). Seed LLM lays out primitives on keyframed paths plus a camera move, or load one of 17 worked examples. Everything stays editable. **Render MP4** encodes in the browser.
- **Skeleton Reference.** Turns any video into a DWPose/RTMPose skeleton track (on a black background) plus an overlay check video. Runs locally with no API calls.

### Workspace

- **Canvas.** A node board. Drop in media, add Prompt, Image (Seedream), Video (Seedance) and Audio (Seed Audio) nodes, and wire outputs into inputs.
- **Skill Library.** Lists every skill in `.claude/skills/`, with search, filters, the project type each skill belongs to, and the full text.
- **Image viewer.** Clicking any image opens an in-page zoom preview (1–8×, wheel to zoom, drag to pan, `+`/`-`/`0`/`Esc`).

## Models

| Model | Model ID | Used for |
|---|---|---|
| Seed 2.1 Turbo (default LLM) | `dola-seed-2-1-turbo-260628` | Prompt writing and every LLM step |
| Seed 2.0 Pro / Lite / Mini | `seed-2-0-pro-260328` / `seed-2-0-lite-260428` / `seed-2-0-mini-260428` | Selectable LLMs. Lite is the default for Visual Understanding, and Lite and Mini also hear video audio |
| Seedream 5.0 Pro (default image model) | `dola-seedream-5-0-pro-260628` | Character Generation, Character Sheets, Storyboard, location and text-overlay renders |
| Seedream 5.0 Flash | `dola-seedream-5-0-flash-260915` | Faster, cheaper image model |
| Seedream 5.5 | `dola-seedream-5-5-261028` | Seedream tools: most realistic, transparent output |
| Seedance 2.5 (default) | `dreamina-seedance-2-5-260628` | Video, up to 30 s, 480p/720p/1080p/4K, MOV, draft mode. 4K is 10-bit H.265/HEVC (MP4 Main10 + AAC, MOV Rext 4:4:4 + PCM): 3840×2160 (16:9), 2160×3840 (9:16), 2880×2880 (1:1) |
| Seedance 2.5 flash | `dreamina-seedance-2-5-flash-261115` | Video, up to 30 s, 480p/720p, MOV |
| Seedance 2.0 | `dreamina-seedance-2-0-260128` | Video, up to 15 s, 480p–4k |
| Seedance 2.0 fast / mini | `dreamina-seedance-2-0-fast-260128` / `dreamina-seedance-2-0-mini-260615` | Video, up to 15 s, 480p/720p |
| Seed Audio 1.5 | `SEED_AUDIO_MODEL` | Seed Audio 1.5 modes, and Audiobook Creator when 1.5 is chosen. **Temporarily unavailable** |
| Seed Audio 1.0 | `seed-audio-1.0` | Seed Audio 1.0, and Audiobook Creator (default) |

**Choosing models.** Tools that call Seed LLM or Seedream show **LLM** and **Image model** pickers. The choice is app-wide, saved in `outputs/model_settings.json` (`services/model_settings.py`, `/api/system/models`). Text Overlay always renders with Seedream 5.0 Pro, and the Seedream tools have their own model switch.

## Video Parameters and Reference Limits

| Parameter | Values |
|---|---|
| `resolution` | 480p, 720p, 1080p, 4k (depends on the model) |
| `ratio` | 21:9, 16:9, 4:3, 1:1, 3:4, 9:16 |
| `duration` | 4–30 s on 2.5 and 2.5 flash, 4–15 s on 2.0 models |
| `frames_per_second` | 24 |
| `output_format` | MP4, or MOV on 2.5 and 2.5 flash |

| Model | Reference images | Reference videos | Reference audio |
|---|---|---|---|
| Seedance 2.5 | 30 | 10 (4–30 s each, ≤ 30 s total) | 10 (≤ 30 s total) |
| Seedance 2.5 flash | 10 | 5 (4–30 s each, ≤ 30 s total) | 5 (≤ 30 s total) |
| Seedance 2.0 / fast / mini | 9 | 3 (≤ 15 s total) | 3 (≤ 15 s total) |

In Long Duration, a shot's start frame and text overlays count toward its model's image limit. Images shown to Seed LLM are capped at 10 MiB. Larger ones are downscaled to a ≤ 2048 px JPEG for the prompt-writing call only, while Seedance and Seedream still get the original ([content_creator/utils/llm_images.py](content_creator/utils/llm_images.py)).

## Downloads and Storage

- **Download names.** Every download is saved as `<project name>-<model used>.<ext>`, for example `The Glass Ledger-Seedance 2.5 flash.mp4`. Outside a project the prefix is `Content Creator`. Tools without a model use the tool's name (`Combined`, `Video Editor`, `Video Enhancer`). Downloads go through `window.ccDownload` and the `/download?url=&name=` route, which also renames files hosted elsewhere (such as BytePlus result links). A new download button should use `window.ccDownload(url, model, ext)` or an `<a download data-model="…">` link.
- **Projects** are stored server-side in `outputs/projects.json`, written atomically with a backup at `outputs/projects.json.bak`. Per-project local files are in `outputs/projects/<project>/`.
- **Generated media** is copied into `outputs/`, because ModelArk and MediaKit links expire after 24 hours. `outputs/` is user content and is not committed to git.

## Project Structure

```text
ContentCreator/
├── app.py                     # Entry point: boots the server
├── frontend/                  # The page: index.html shell, styles.css, app.jsx (App: state, handlers, layout)
├── requirements.txt           # Dependencies, pinned
├── pyproject.toml             # Package metadata, dev extra (pytest, ruff), ruff and pytest config
├── .env.example
├── tests/                     # pytest suite (no API keys or network needed)
├── static/                    # Vendored React + Babel, tool components (*.jsx)
│   ├── app-*.jsx              # App code split per tool (shared helpers, Seed Audio, Blender 3D, the inline tools' views)
│   └── build/                 # Precompiled JS (generated)
├── .claude/skills/            # Installed skill packages (also read by the Skill Library)
├── scripts/                   # build-frontend.js, check-frontend.sh
├── outputs/                   # Generated media, projects.json, model settings
└── content_creator/
    ├── api/server.py          # ThreadingHTTPServer, route table, /files/ and /download
    ├── config/settings.py     # Env vars, defaults, output paths
    ├── config/logging_setup.py # LOG_LEVEL, request logging, header redaction
    ├── models/                # Dataclasses
    ├── routes/                # One HTTP handler module per feature
    ├── services/              # Business logic and SDK calls
    │   ├── video.py               # Seedance tasks, MOV handling, Seed LLM prompt refinement
    │   ├── long_duration.py       # ffmpeg combine + last-frame extraction
    │   ├── script_to_prompt.py    # Script/PDF → shot prompts, characters, locations
    │   ├── characters.py          # Character Generation (Seedream)
    │   ├── character_sheet_qa.py  # QA-checked character sheet pipeline
    │   ├── character_prompts.py   # Sheet spec, bible, checklist and inspection prompts
    │   ├── film_tools.py          # Previz, Character Masking, Location Variations
    │   ├── storyboard.py          # 3×3 storyboard sheets
    │   ├── visual_understanding.py # Image/video Q&A and video → prompt
    │   ├── hybrid_studio.py       # Green-screen → new location
    │   ├── text_overlay.py        # Exact on-screen text for Text Overlay projects
    │   ├── seedream_studio.py     # Seedream image, layers, interactive edit
    │   ├── seed_audio.py          # Seed Audio 1.5
    │   ├── seed_audio_10.py       # Seed Audio 1.0
    │   ├── audiobook.py           # Audiobook Creator
    │   ├── video_editor.py        # Timeline export (ffmpeg)
    │   ├── video_enhancer.py      # AI MediaKit
    │   ├── blender*.py            # Blender 3D, helpers, workflows
    │   ├── motion_blockout.py     # Motion Blockout
    │   ├── skeleton.py            # DWPose/RTMPose skeleton video
    │   ├── skills.py              # Skill Library + skills sent with prompts
    │   ├── model_settings.py      # App-wide LLM / image model choice
    │   └── assets.py              # TOS uploads and asset registration
    └── utils/                 # HTTP helpers, LLM image downscaling
```

## Architecture

```text
Browser (React, precompiled to static/build/ by scripts/build-frontend.js)
        │  fetch /api/*
        ▼
app.py ──► content_creator/api/server.py  (ThreadingHTTPServer)
              │
              ├── routes/*  ──►  services/*
              │                    ├── ModelArk: Seed LLM · Seedream · Seedance · Seed Audio 1.5
              │                    ├── BytePlus Voice: Seed Audio 1.0
              │                    ├── AI MediaKit: Video Enhancer
              │                    ├── BytePlus TOS: public links for uploads
              │                    └── local: ffmpeg · Blender · rtmlib
              ├── /files/<name>     generated media in outputs/
              └── /download?url=…   downloads under "<project>-<model>" names
```

## Development

```bash
pip install -e ".[dev]"         # pytest + ruff

ruff check .                    # lint (correctness rules; config in pyproject.toml)
pytest                          # tests: server routes, downloads, skills, Seed Audio 1.0 validation
scripts/check-frontend.sh       # full rebuild of the frontend; fails on any JSX syntax error (needs Node)
```

- **Frontend.** `frontend/app.jsx` is the main app (state, handlers, sidebar and layout), `static/app-*.jsx` hold its shared helpers and the views of the tools whose state App keeps (Script to Prompt, Character Generation and Sheets, Storyboard, Video Generation, Long Duration, Combine Videos, Audio to Black Video, Skeleton Reference, plus Seed Audio and Blender 3D), and the other `static/*.jsx` are self-contained tools. Each view is a plain function App calls with the values it reads, so the state stays in one place: these tools save per project and feed each other (sheets into video, video into Long Duration). To add a value to a view, add it to the view's parameter list and to App's call. `frontend/index.html` is the page shell and `frontend/styles.css` its stylesheet. `scripts/build-frontend.js` precompiles the JSX into `static/build/` with the bundled Babel (same settings the browser used), so the browser skips the 3 MB Babel download and the compile step. There is no command to remember: on startup and on every page load the server checks the sources against `static/build/manifest.json` and rebuilds only what changed. Edit a file and reload the page; a change to `app.jsx` takes a few seconds to rebuild, a tool file well under a second.
- **Without Node** (or if a build fails) the server logs a warning and serves the page the old way, compiled in the browser, so the app still works, just slower to load. `FRONTEND_MODE=babel` forces that mode.
- **Backend.** Add a route by writing a handler in `content_creator/routes/`, its logic in `content_creator/services/`, and registering the path in the route table in `content_creator/api/server.py`.
- **Logging.** Use `logging.getLogger("content_creator.<module>")`. Never log API keys or auth headers; `redact_headers()` in `content_creator/config/logging_setup.py` masks them if you need to log headers.
- **Python version.** 3.12. Multipart uploads are parsed by `content_creator/utils/multipart.py` (standard-library `email` parser), not the `cgi` module that Python 3.13 removed. Going past 3.12 needs a newer `numpy` pin: 2.0.2 has no 3.13 wheels.

## Skills in Prompt Optimisation

When Video Generation or Long Duration runs inside a project, Seed LLM rewrites the prompt before it goes to Seedance:

- The **Seedance 2.5 Optimizer** (`.claude/skills/sd25-pe/SKILL.md`) is always applied. It's shown as "Always on" in a project's Skills.
- The **skills ticked in the project** are added to it. They supply craft such as acting, dialogue and camera. New projects start with none ticked.
- If the ticked skills total more than about 60k characters, each one is sent as a condensed digest, cached in `outputs/skill_digests/`.
- Each generated prompt shows what optimised it, and the server returns `applied_skills`.

Code: [content_creator/services/skills.py](content_creator/services/skills.py), `refine_video_prompt` in [content_creator/services/video.py](content_creator/services/video.py).

**Skills by project type**

| Project type | Skills |
|---|---|
| Short Drama, Short Film, Feature Film, Animation, Music Video, Text Overlay, Custom (and the legacy types) | The whole film-making library (below): 17 skills to tick, on top of the always-on Seedance 2.5 Optimizer |
| Seed Audio, Audiobook | The Seed Audio skills: `seed-audio-prompts`, `seedaudio-prompt-optimizer`, `video-dub-audio-gen` |
| Hybrid Studio, Seedream | Only the always-on Seedance 2.5 Optimizer (Hybrid Studio); none for Seedream |

---

## Film-Making Skill Library

The film-making library covers acting direction, dialogue, camera language, Seedance prompt construction and audio compliance. This section maps which file to use and, where two files compete for the same job, which one wins.

All files are installed under `.claude/skills/` and trigger automatically for Claude Code in this project. Every film-making skill now lives only there (the old `docs_film_making/` copy is gone); the app reads the same files by their library ids.

### All film-making skill files

| File | What it does |
|---|---|
| [cinedance](.claude/skills/cinedance/SKILL.md) | 4-D director-agent persona for Seedance 2.0: optics decision trees, physics/lighting/blocking locks, anti-drift rules. Turns a scene into a full prose Seedance 2.0 prompt. |
| [film-script-to-seedance](.claude/skills/film-script-to-seedance/SKILL.md) | Converts a script into a shot list of full prose Seedance 2.0 prompts (REFERENCES/SHOT DESCRIPTION/CINEMATOGRAPHY/AUDIO), defaulting to 15 s shots with last-frame chaining. |
| [acting-system](.claude/skills/acting-system/SKILL.md) | Meisner-based acting-direction system: master character profiles, per-scene adaptation, a voice-prompt formula and a 0–5 performance scale. |
| [additional-camera-angle-helpers](.claude/skills/additional-camera-angle-helpers/SKILL.md) | Camera-angle cookbook mapping emotional intent (power, vulnerability, tension, scale) to angle + framing + motion. |
| [camera-shot-setups](.claude/skills/camera-shot-setups/SKILL.md) | Reference table of 19 shot/angle/movement setups with lens lines. Raw vocabulary, not a skill. |
| [cinematic-prompt](.claude/skills/cinematic-prompt/SKILL.md) | Appends only a 4-parameter cinematography block (Camera/Lens/Focal Length/Aperture) to an existing prompt. |
| [seedance-compose](.claude/skills/seedance-compose/SKILL.md) | Builds one Seedance shot's action text from ordered keyframe images plus optional draft text; outputs JSON. |
| [dialogue-quality-bar](.claude/skills/dialogue-quality-bar/SKILL.md) | Fixes mechanical, "screenplay-thesis" dialogue: a 3-beat confrontation template and 5 diagnostic tests. |
| [seedance-direct](.claude/skills/seedance-direct/SKILL.md) | Reshapes an existing shot prompt's tone and pacing from one director's note, locking events, image tags and dialogue; outputs JSON. |
| [hindi-dialogue-phonetics](.claude/skills/hindi-dialogue-phonetics/SKILL.md) | Converts Hindi dialogue into a phonetic-only string for TTS and lip-sync models. |
| [seedance-audio-guidelines](.claude/skills/seedance-audio-guidelines/SKILL.md) | Word substitutions and phrasing that keep Seedance 2.0's native audio from being blocked by copyright filters. |
| [sd25-pe](.claude/skills/sd25-pe/SKILL.md) | Official prompt optimizer for all of Seedance 2.5: text-to-video, multi-reference, keyframes, storyboards, blockouts, editing, extension, audio editing. |

### 1. Performance direction

| File | Status | What it does |
|---|---|---|
| [acting-system](.claude/skills/acting-system/SKILL.md) | **[live]** `acting-system` | Reusable master character profiles, per-scene adaptation, voice-prompt formula, 0–5 scale. |
| [dialogue-quality-bar](.claude/skills/dialogue-quality-bar/SKILL.md) | **[live]** `dialogue-quality-bar` | Fixes *what* characters say, not how they perform it. |

Use **acting-system** for a character's reusable bible across a project or for a "dead-eyed" character. If the problem is the *words*, use **dialogue-quality-bar** first.

### 2. Camera and angle language

| File | Status | What it does |
|---|---|---|
| [camera-shot-setups](.claude/skills/camera-shot-setups/SKILL.md) | reference | 19 setups with lens lines. Raw data. |
| [cinematic-prompt](.claude/skills/cinematic-prompt/SKILL.md) | **[live]** `cinematic-prompt` | Appends only a 4-parameter block and leaves the rest of the prompt alone. |
| [additional-camera-angle-helpers](.claude/skills/additional-camera-angle-helpers/SKILL.md) | **[live]** `additional-camera-angle-helpers` | Maps intent ("make it feel powerful") to angle, framing and motion. |

`camera.md` is the vocabulary. Use `cinematography_skills.md` when the prompt body must not change, and `additional_camera_angle_helpers.md` when iterating on feel. CINEDANCE, sd25_pe and compose/direct each restate camera rules independently.

### 3. Full Seedance shot prompts

| File | Status | What it does |
|---|---|---|
| [seedance-compose](.claude/skills/seedance-compose/SKILL.md) | **[live]** `seedance-compose` | One shot from ordered keyframes → JSON action text. |
| [seedance-direct](.claude/skills/seedance-direct/SKILL.md) | **[live]** `seedance-direct` | Reshapes an existing shot prompt from one director's note. JSON out. |
| [film-script-to-seedance](.claude/skills/film-script-to-seedance/SKILL.md) | **[live]** `film-script-to-seedance` | Whole script → Seedance **2.0** prose prompts. |
| [sd25-pe](.claude/skills/sd25-pe/SKILL.md) | **[live]** `sd25-pe` | Official optimizer for **Seedance 2.5**. |
| [cinedance](.claude/skills/cinedance/SKILL.md) | reference | Director-agent persona for **Seedance 2.0**. |

**Which one wins:**
- **The target model decides first.** For Seedance 2.5, use `sd25-pe`. For Seedance 2.0, use CINEDANCE (the default: more rigorous) or `Film_script_to_prompts_skill.md` (when its 4-block format is wanted), and never mix both in one project.
- **Whole script vs. one shot.** A full script goes to `Film_script_to_prompts_skill.md` (2.0) or `sd25-pe` (2.5). One shot from keyframes goes to `compose.md`. A tone or pacing note on an existing prompt goes to `direct.md`.
- `compose.md` and `direct.md` return JSON that expects a separate step to turn it into a full prompt. No such step exists in this repo, so finish their output into a full prompt by hand.

### 4. Language-specific dialogue

| File | Status | What it does |
|---|---|---|
| [hindi-dialogue-phonetics](.claude/skills/hindi-dialogue-phonetics/SKILL.md) | **[live]** `hindi-dialogue-phonetics` | Hindi dialogue → phonetic-only string for lip-sync. |

### 5. Copyright and compliance

| File | Status | What it does |
|---|---|---|
| [seedance-audio-guidelines](.claude/skills/seedance-audio-guidelines/SKILL.md) | reference | Phrasing that keeps Seedance 2.0 native audio from being blocked. |

### Quick decision path

1. How a character performs → `acting-system`.
2. What a character says → `dialogue-quality-bar`, then `hindi-dialogue-phonetics` for Hindi TTS.
3. Camera language only → §2, by granularity.
4. Full shot or script → Seedance prompt → §3, by model and scope.
5. Native audio getting blocked → `seedance-audio-guidelines`.

### Known gaps

- Seven reference files with frontmatter (`cinematic-prompt`, `additional-camera-angle-helpers`, `dialogue-quality-bar`, `hindi-dialogue-phonetics`, `film-script-to-seedance`, `seedance-compose`, `seedance-direct`) can become live skills once copied to `.claude/skills/<name>/SKILL.md`. `camera.md` and `output_audio_sensitivity.md` are raw reference data and have no header on purpose.
- Camera rules are restated in several files and aren't kept in sync.

---

## Other Installed Skills

These packages in `.claude/skills/` trigger for Claude Code in this project and appear in the Skill Library. They are not tied to a project type.

| Skill | What it does |
|---|---|
| [seed-audio-prompts](.claude/skills/seed-audio-prompts/SKILL.md) | Seed Audio 1.5 prompt guide (1.5 is temporarily unavailable): prompt structures, voice design, dialogue, ambience and SFX, BGM, `@Audio1` reference voices, dubbing, separate tracks. |
| [seedaudio-prompt-optimizer](.claude/skills/seedaudio-prompt-optimizer/SKILL.md) | Optimises rough audio prompts or visual prompts into Seed Audio prompts. |
| [video-dub-audio-gen](.claude/skills/video-dub-audio-gen/SKILL.md) | Turns Seedance shot prompts into a clean Seed Audio 1.5 video-dubbing script. |
| [seedream](.claude/skills/seedream/SKILL.md) | Calls Seedream 4.x/5.x to generate, edit and combine images, via a bundled script. |
| [seedance-2-0](.claude/skills/seedance-2-0/SKILL.md) | Seedance 2.0 prompt design and async generation tasks, via a bundled script. |

`seedream` and `seedance-2-0` call the APIs. `sd25-pe` only writes prompt text.
