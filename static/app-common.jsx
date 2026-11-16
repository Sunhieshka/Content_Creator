// Shared constants, helpers and small components used across the app's tools.
// Loaded before App (frontend/app.jsx); everything here is a page-wide global, as it was when it
// lived at the top of the app script.
// The React hooks destructured below are also used by the other app-*.jsx files and by App.

const { useCallback, useEffect, useMemo, useRef, useState } = React;
// Fill-in template for Character Generation (from the Character Sheet Studio workflow).
const CHARACTER_TEMPLATE = "A [gender/age descriptor] with a [body build] and [skin tone/texture] skin. [Hair color, length, style]. [Face shape/cheekbones], [nose shape], and [eye color/shape] eyes. [Distinguishing facial features]. [Small unique detail: piercing, tattoo, mark - and which side]."
// Character Sheets with no reference image: the description template from Character Sheet Studio
// (Documents/character-sheet-workflow, ui/src/components/DescriptionForm.jsx).
const SHEET_DESCRIPTION_TEMPLATE = `A [gender/age descriptor, e.g. "woman in her mid-30s"] with a [body build] and [skin tone/texture] skin. [Hair color, length, style]. [Face shape/cheekbones], [nose shape], and [eye color/shape] eyes[, with expression detail if relevant]. [Distinguishing facial features: scars, freckles, wrinkles, facial hair, etc.] [Small unique detail: piercing, tattoo, mark].

They/She/He [wears/is dressed in] a [main garment: color, material, condition] over/with a [secondary garment]. [Notable wear/damage details — stains, patches, fraying, etc.]. [Bottoms/footwear]. [Accessories: jewelry, tools, glasses, belts, bags — with condition/style details].

Their/Her/His posture is [general stance — relaxed, rigid, alert, etc.], [specific body position — hands, weight, head tilt]. Expression: [emotional tone — one or two words, or a short phrase]. Lighting: [light source, color temperature, direction, mood]. Setting: [location], [background details, blurred or in focus], [any atmospheric elements — dust, mist, rain, etc.].`;
  + " They/She/He [wears/is dressed in] a [main garment: color, material, condition] over/with a [secondary garment]. [Notable wear/damage details]. [Bottoms/footwear]. [Accessories: jewelry, tools, glasses, belts, bags - and which side; say what is worn on top where garments overlap]."
  + " Style: [photorealistic / 3D animated / anime / painted].";
const REFERENCE_IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/avif";

// Selectable video generation models. Must mirror VIDEO_MODELS in
// content_creator/services/video.py — the API enforces the same
// per-model duration/resolution limits and rejects anything else.
const VIDEO_MODELS = [
  // refs: reference limits — image count, video count and total seconds, audio count and total seconds.
  { id: "dreamina-seedance-2-5-260628", label: "2.5", maxDuration: 30, draft: true, mov: true, tenBit: ["1080p", "4k"], hevc: ["4k"], resolutions: ["480p", "720p", "1080p", "4k"], refs: { images: 30, videos: 10, videoSec: 30, videoClipSec: [4, 30], audios: 10, audioSec: 30 } },
  // 2.5 flash: near-2.5 quality, ~2x faster and ~34% cheaper; 480p/720p, up to 10 images, 5 videos, 5 audios.
  { id: "dreamina-seedance-2-5-flash-261115", label: "2.5 flash", maxDuration: 30, mov: true, resolutions: ["480p", "720p"], refs: { images: 10, videos: 5, videoSec: 30, videoClipSec: [4, 30], audios: 5, audioSec: 30 } },
  { id: "dreamina-seedance-2-0-260128", label: "2.0", maxDuration: 15, tenBit: ["4k"], resolutions: ["480p", "720p", "1080p", "4k"], refs: { images: 9, videos: 3, videoSec: 15, audios: 3, audioSec: 15 } },
  { id: "dreamina-seedance-2-0-fast-260128", label: "2.0 fast", maxDuration: 15, resolutions: ["480p", "720p"], refs: { images: 9, videos: 3, videoSec: 15, audios: 3, audioSec: 15 } },
  { id: "dreamina-seedance-2-0-mini-260615", label: "2.0 mini", maxDuration: 15, resolutions: ["480p", "720p"], refs: { images: 9, videos: 3, videoSec: 15, audios: 3, audioSec: 15 } },
];
const DEFAULT_VIDEO_MODEL_ID = VIDEO_MODELS[0].id;
// Colour (product docs, shown in VideoFormatTable): every model is SDR, Rec.709. tenBit lists the
// resolutions that come out 10-bit, the rest are 8-bit; hevc lists those encoded as 10-bit H.265
// (2.5 at 4K: MP4 Main10 + AAC, MOV Rext 4:4:4 + PCM); everything else is H.264.

const MIN_VIDEO_DURATION = 4;
// Long Duration shots can be as short as a single Video Generation clip.
const MIN_LONG_DURATION = 4;
// Every Video Generation run launches this many videos from one prompt and
// one set of references, so the results can be compared side by side.
// Mirrors MAX_VIDEO_VARIANTS in content_creator/services/video.py.
const VIDEO_VARIANT_COUNT = 3;

function emptyVideoVariants() {
  return Array.from({ length: VIDEO_VARIANT_COUNT }, () => ({ taskId: "", status: "", url: "", error: "" }));
}

// Text Overlay projects only. Seedream-rendered images of every on-screen
// text (overlays and laptop/phone screens) that are passed to Seedance as
// references — see content_creator/services/text_overlay.py. forPrompt is
// the prompt they were built from, so a changed prompt is rebuilt.
function defaultTextOverlayState() {
  return { overlays: [], styleGuide: "", screenStyleGuide: "", backdrop: "", forPrompt: "", forRefs: "", loading: false, error: "" };
}
const RESOLUTION_LABELS = { "480p": "480P", "720p": "720P", "1080p": "1080P", "4k": "4K" };

function getVideoModelSpec(modelId) {
  return VIDEO_MODELS.find((m) => m.id === modelId) || VIDEO_MODELS[0];
}
// Model name used in download file names, e.g. "Seedance 2.5 flash".
function videoModelName(modelId) {
  return `Seedance ${getVideoModelSpec(modelId).label}`;
}

// Adds media to a reference list within a model's count and total-length
// limits. Returns the kept list and, if anything was dropped, why.
function capReferenceMedia(existing, incoming, maxCount, maxSeconds, noun, clipRange) {
  let error = "";
  if (clipRange) {
    const bad = (incoming || []).filter((it) => clipOutOfRange(it, clipRange));
    if (bad.length) {
      error = `Each reference ${noun} must be ${clipRange[0]}–${clipRange[1]} seconds long. Skipped: ${bad.map((it) => `${it.name || noun} (${Number(it.duration).toFixed(1)}s)`).join(", ")}.`;
      incoming = (incoming || []).filter((it) => !bad.includes(it));
    }
  }
  const room = Math.max(0, maxCount - (existing || []).length);
  const accepted = (incoming || []).slice(0, room);
  if ((incoming || []).length > accepted.length) error = `Max ${maxCount} reference ${noun}s for this model. Extra files were ignored.`;
  const kept = [];
  let total = 0;
  for (const it of [...(existing || []), ...accepted]) {
    const d = Number(it?.duration || 0);
    if (total + d > maxSeconds + 1e-6) {
      error = `Reference ${noun}s must total ${maxSeconds} seconds or less for this model. Extra files were ignored.`;
      break;
    }
    kept.push(it);
    total += d;
  }
  return { list: kept, error };
}

// True when a clip's known length falls outside [min, max] seconds; an unknown length passes.
function clipOutOfRange(item, [min, max]) {
  const d = Number(item?.duration || 0);
  return d > 0 && (d < min - 1e-6 || d > max + 1e-6);
}

// Reads a video's length from its URL (data:, /files/ or remote), or null.
function probeVideoDuration(src) {
  return new Promise((resolve) => {
    const el = document.createElement("video");
    el.preload = "metadata";
    let settled = false;
    const done = (v) => {
      if (settled) return;
      settled = true;
      el.removeAttribute("src");
      resolve(v);
    };
    el.onloadedmetadata = () => done(Number.isFinite(el.duration) && el.duration > 0 ? el.duration : null);
    el.onerror = () => done(null);
    setTimeout(() => done(null), 10000);
    el.src = src;
  });
}

// Fills in the length of reference videos added without one (asset group picks).
async function withVideoDurations(list) {
  return Promise.all((list || []).map(async (x) => {
    if (Number(x?.duration || 0) > 0) return x;
    const src = x?.dataUrl || x?.assetUrl;
    const duration = src ? await probeVideoDuration(src) : null;
    return duration ? { ...x, duration } : x;
  }));
}

// Why a set of references breaks a model's limits ("" when it fits).
function referenceLimitError(spec, imageCount, videos, audios) {
  const r = spec.refs;
  const secs = (list) => (list || []).reduce((acc, x) => acc + Number(x?.duration || 0), 0);
  if (imageCount > r.images) return `Seedance ${spec.label} takes at most ${r.images} reference images (this shot has ${imageCount}).`;
  if ((videos || []).length > r.videos) return `Seedance ${spec.label} takes at most ${r.videos} reference videos.`;
  const badClip = r.videoClipSec && (videos || []).find((x) => clipOutOfRange(x, r.videoClipSec));
  if (badClip) return `Seedance ${spec.label}: each reference video must be ${r.videoClipSec[0]}–${r.videoClipSec[1]} seconds long — "${badClip.name || "video"}" is ${Number(badClip.duration).toFixed(1)}s.`;
  if (secs(videos) > r.videoSec + 1e-6) return `Seedance ${spec.label}: reference videos must total ${r.videoSec} seconds or less.`;
  if ((audios || []).length > r.audios) return `Seedance ${spec.label} takes at most ${r.audios} reference audios.`;
  if (secs(audios) > r.audioSec + 1e-6) return `Seedance ${spec.label}: reference audios must total ${r.audioSec} seconds or less.`;
  return "";
}

// Ratio dropdown plus an Adaptive chip (like Smart length). Adaptive is stored as the
// ratio itself; turning it off restores the last fixed ratio.
const FIXED_RATIOS = ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"];
function ImageViewer({ src, onClose }) {
  const MIN = 1, MAX = 8;
  const [v, setV] = useState({ z: 1, x: 0, y: 0 });
  const stageRef = useRef(null);
  const drag = useRef(null);
  useEffect(() => { setV({ z: 1, x: 0, y: 0 }); }, [src]);
  // Zoom so the point under (mx, my) — relative to the stage centre — stays put.
  const zoomAt = (factor, mx = 0, my = 0) => setV((o) => {
    const z = Math.max(MIN, Math.min(MAX, o.z * factor));
    if (z === MIN) return { z, x: 0, y: 0 };
    return { z, x: mx - ((mx - o.x) * z) / o.z, y: my - ((my - o.y) * z) / o.z };
  });
  const fromCentre = (e) => {
    const r = stageRef.current.getBoundingClientRect();
    return [e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2];
  };
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return undefined;
    const onWheel = (e) => { e.preventDefault(); const [mx, my] = fromCentre(e); zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, mx, my); };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "+" || e.key === "=") zoomAt(1.25);
      else if (e.key === "-") zoomAt(1 / 1.25);
      else if (e.key === "0") setV({ z: 1, x: 0, y: 0 });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const onPointerDown = (e) => {
    if (v.z <= 1) return;
    drag.current = { sx: e.clientX, sy: e.clientY, x: v.x, y: v.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (d) setV((o) => ({ ...o, x: d.x + e.clientX - d.sx, y: d.y + e.clientY - d.sy }));
  };
  const endDrag = () => { drag.current = null; };
  const onDoubleClick = (e) => {
    if (v.z > 1) { setV({ z: 1, x: 0, y: 0 }); return; }
    const [mx, my] = fromCentre(e);
    zoomAt(2.5, mx, my);
  };
  return (
    <>
      <div className="modal-header">
        <div className="modal-title">Preview</div>
        <div className="zoom-tools">
          <button className="modal-close" title="Zoom out (-)" onClick={() => zoomAt(1 / 1.25)} disabled={v.z <= MIN}>−</button>
          <button className="modal-close" title="Fit to screen (0)" onClick={() => setV({ z: 1, x: 0, y: 0 })}>{Math.round(v.z * 100)}%</button>
          <button className="modal-close" title="Zoom in (+)" onClick={() => zoomAt(1.25)} disabled={v.z >= MAX}>+</button>
          <button className="modal-close" onClick={onClose}>Close</button>
        </div>
      </div>
      <div
        ref={stageRef}
        className="zoom-stage"
        style={{ cursor: v.z > 1 ? (drag.current ? "grabbing" : "grab") : "zoom-in" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={onDoubleClick}
      >
        <img src={src} alt="preview" draggable={false} style={{ transform: `translate(${v.x}px, ${v.y}px) scale(${v.z})` }} />
      </div>
    </>
  );
}

// Plain-language note shown under the Output format choice.
function YuvExplainer() {
  return (
    <details className="yuv-explainer">
      <summary>What does YUV mean?</summary>
      <p>YUV is a way of storing colour that splits each pixel into brightness and colour.</p>
      <ul>
        <li><b>Y</b> is brightness, the black-and-white picture. Our eyes are most sensitive to this, so it&apos;s always kept in full detail.</li>
        <li><b>U and V</b> are colour: how far each pixel leans towards blue and towards red.</li>
      </ul>
      <p>The numbers after it say how much colour detail is kept:</p>
      <ul>
        <li><b>4:4:4:</b> every pixel keeps its own colour, so nothing is thrown away. It&apos;s best for colour grading, green-screen keying and compositing, where edges and colour need to stay clean. Files are larger.</li>
        <li><b>4:2:0:</b> each 2×2 block of pixels shares one colour value, keeping only a quarter of the colour detail. You rarely notice it when watching, which is why streaming, phones and MP4 use it. Fine colour edges, such as red text or hair against a green screen, can look soft or fringed.</li>
      </ul>
    </details>
  );
}

// Collapsible per-model table of bit depth and colour formats, shown under the model pickers.
// Built from VIDEO_MODELS, so a new model or resolution shows up here by itself.
function VideoFormatTable({ currentId }) {
  const res = (list) => (list.length ? list.map((r) => RESOLUTION_LABELS[r] || r).join(" / ") : "—");
  return (
    <details className="yuv-explainer video-format-table">
      <summary>Bit depth and colour formats for every model</summary>
      <div className="vft-scroll">
        <table>
          <thead>
            <tr>
              <th>Model</th>
              <th>8-bit</th>
              <th>10-bit</th>
              <th>MP4 · YUV 4:2:0 · AAC</th>
              <th>MOV · YUV 4:4:4 · PCM</th>
            </tr>
          </thead>
          <tbody>
            {VIDEO_MODELS.map((m) => {
              const ten = m.tenBit || [];
              const hevc = m.hevc || [];
              const codec = hevc.length ? `H.264; H.265 Main10 at ${res(hevc)}` : "H.264";
              return (
                <tr key={m.id} className={m.id === currentId ? "vft-current" : ""}>
                  <td>{m.label}</td>
                  <td>{res(m.resolutions.filter((r) => !ten.includes(r)))}</td>
                  <td>{res(m.resolutions.filter((r) => ten.includes(r)))}</td>
                  <td>{codec}</td>
                  <td>{m.mov ? (hevc.length ? `Yes (H.265 Rext at ${res(hevc)})` : "Yes") : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p>All models are SDR, Rec.709. MP4 is YUV 4:2:0 with AAC audio, MOV is YUV 4:4:4 with PCM audio. Drafts are 480p MP4.</p>
    </details>
  );
}

function RatioInput({ value, onChange }) {
  const adaptive = value === "adaptive";
  const lastFixed = useRef(FIXED_RATIOS.includes(value) ? value : "16:9");
  if (!adaptive && FIXED_RATIOS.includes(value)) lastFixed.current = value;
  return (
    <div className="duration-row" style={{ gap: 8 }}>
      <select className="select-input" value={adaptive ? lastFixed.current : value} disabled={adaptive} onChange={(e) => onChange(e.target.value)} style={{ flex: 1, minWidth: 0 }}>
        {FIXED_RATIOS.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
      <label className="sheet-chip checkbox-chip" data-checked={adaptive ? "true" : "false"}>
        <input type="checkbox" checked={adaptive} onChange={(e) => onChange(e.target.checked ? "adaptive" : lastFixed.current)} />
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5"></path>
        </svg>
        Adaptive
      </label>
    </div>
  );
}

// Duration as a slider plus an exact number box: any whole second from the minimum
// to the selected model's limit.
function DurationInput({ value, min, max, disabled, onChange }) {
  const v = Math.min(max, Math.max(min, Number(value) || min));
  const commit = (n) => onChange(Math.min(max, Math.max(min, Math.round(Number(n) || min))));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
      <input type="range" min={min} max={max} step="1" value={v} disabled={disabled}
             onChange={(e) => commit(e.target.value)} style={{ flex: 1, minWidth: 80, accentColor: "var(--accent-2)" }} aria-label="Duration in seconds" />
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <input type="number" className="select-input" min={min} max={max} step="1" value={v} disabled={disabled}
               onChange={(e) => commit(e.target.value)} style={{ width: 64, padding: "0 8px", textAlign: "center" }} aria-label="Duration seconds" />
        <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>s</span>
      </div>
    </div>
  );
}

// The runtime a Script to Prompt shot states ("28 second total runtime."), or 0.
function runtimeFromPrompt(text) {
  const all = [...String(text || "").matchAll(/(\d{1,3})\s*(?:-|–)?\s*sec(?:ond)?s?\s+total\s+runtime/gi)];
  return all.length ? Number(all[all.length - 1][1]) || 0 : 0;
}

function videoDurationOptions(modelId, minDuration = MIN_VIDEO_DURATION) {
  const spec = getVideoModelSpec(modelId);
  const out = [];
  for (let i = minDuration; i <= spec.maxDuration; i += 1) out.push(i);
  return out;
}

// Resolution and duration are model-constrained, so switching models has
// to pull a now-unsupported value back into range here rather than let
// the generation fail at submit time.
function clampVideoSettingsToModel(modelId, resolution, duration, minDuration = MIN_VIDEO_DURATION) {
  const spec = getVideoModelSpec(modelId);
  const nextResolution = spec.resolutions.includes(resolution)
    ? resolution
    : spec.resolutions[spec.resolutions.length - 1];
  const raw = Number(duration);
  const safe = Number.isFinite(raw) ? raw : minDuration;
  return {
    resolution: nextResolution,
    duration: Math.min(Math.max(safe, minDuration), spec.maxDuration),
  };
}

// Mirrors README.md "Project Types" — one entry per skill in .claude/skills/. `id` is the
// Film-Making library id (mapped to its folder by FILM_LIVE_ALIASES in
// content_creator/services/skills.py) or the skill folder name.
const SKILL_CATALOG = [
  // Short Drama — Film-Making library (.claude/skills/)
  { id: "tig_scene_engine_skill", label: "Scene Engine", library: "Film-Making", projectType: "short-drama", hint: "A 5-element dramatic engine (Goal/Obstacle/Tactic/Reversal/Value Shift). Use to write a new scene from scratch, or to audit an existing scene/sequence for structural weakness." },
  { id: "tig_acting_task_skill", label: "Acting Task", library: "Film-Making", projectType: "short-drama", hint: "Writes a scene's ACTING TASK block — goal/obstacle/tactic expressed as eye-work. Use whenever a prompt needs character acting direction, or a character reads dead, glassy, or over-acted." },
  { id: "acting_system_skill", label: "Acting System", library: "Film-Making", projectType: "short-drama", hint: "Meisner-based system for reusable master character profiles, per-scene adaptation, and voice prompts. Use to build a character's reusable acting bible or diagnose a flat/lifeless performance." },
  { id: "dialogue_quality_bar_skill", label: "Dialogue Quality Bar", library: "Film-Making", projectType: "short-drama", hint: "Diagnoses and rewrites mechanical, robotic-sounding dialogue. Use whenever a user says lines sound bad/unnatural, or before writing a tense multi-line confrontation exchange." },
  { id: "tig_blocking_map_skill", label: "Blocking Map", library: "Film-Making", projectType: "short-drama", hint: "Generates a color-coded staging diagram plus connector text for who stands where. Use for multi-character shots, or when characters swap positions between shot sizes." },
  { id: "camera", label: "Camera Shot Setups", library: "Film-Making", projectType: "short-drama", hint: "A reference table of 19 shot/angle/movement setups with matching lens choices. Use as a lookup whenever a shot needs precise camera vocabulary." },
  { id: "cinematography_skills", label: "Cinematic Prompt", library: "Film-Making", projectType: "short-drama", hint: "Appends only a Camera/Lens/Focal-Length/Aperture block to an existing prompt. Use when a prompt should look more cinematic without rewriting or expanding its content." },
  { id: "additional_camera_angle_helpers", label: "Camera Angle Helpers", library: "Film-Making", projectType: "short-drama", hint: "Maps emotional intent (power, vulnerability, tension, scale) to angle+framing+motion combinations. Use when a shot needs stronger or more dynamic angle language." },
  { id: "compose", label: "Seedance Compose", library: "Film-Making", projectType: "short-drama", hint: "Builds one Seedance shot's action prompt from ordered keyframe images plus optional draft text. Use once keyframes are approved and need turning into shot text." },
  { id: "direct", label: "Seedance Direct", library: "Film-Making", projectType: "short-drama", hint: "Reshapes an existing Seedance shot prompt's tone and pacing from one director's note. Use to restyle a shot's feel without changing its events, images, or dialogue." },
  { id: "Film_script_to_prompts_skill", label: "Script to Seedance 2.0", library: "Film-Making", projectType: "short-drama", hint: "Converts a full film script or screenplay excerpt into a shot list of Seedance 2.0 prompts. Use when a script needs to become production-ready shot-by-shot prompts." },
  { id: "sd25_pe_skill", label: "Seedance 2.5 Optimizer", library: "Film-Making", projectType: "universal", hint: "The official, comprehensive Seedance 2.5 prompt optimizer covering T2V, references, keyframes, and editing. Mandatory for every Video Generation and Long Duration prompt in every project type, not short-drama only." },
  { id: "cinedance_skill", label: "CINEDANCE Director", library: "Film-Making", projectType: "short-drama", hint: "A 4-D director-agent system for Seedance 2.0 with optics, physics, and lighting locks. Use for rigorous, high-budget-look 2.0 shots built from a scene idea." },
  { id: "hindi_dialogue_prompt", label: "Hindi Dialogue Phonetics", library: "Film-Making", projectType: "short-drama", hint: "Converts Hindi dialogue into a phonetic-only string. Use when Hindi lines need pronunciation-safe text for AI text-to-speech or lip-sync video models." },
  { id: "output_audio_sensitivity", label: "Audio Compliance", library: "Film-Making", projectType: "short-drama", hint: "A word-substitution and phrasing guide for Seedance 2.0 audio prompts. Use when native audio generation is being blocked by copyright filters." },
  { id: "lira_image_prompts_skill", label: "Lira Image Prompts", library: "Film-Making", projectType: "short-drama", hint: "Routes and builds image prompts across Soul, Nano Banana Pro, Seedream 4.5, and GPT Image 2. Use for any still-image generation or edit task, not video." },
  // Seed Audio — .claude/skills/seed-audio-prompts/ (Seed Audio 1.5 prompt guide)
  { id: "seed-audio-prompts", label: "Seed Audio Prompt Guide", library: "Seed Audio", projectType: "seed-audio", hint: "Seed Audio 1.5 prompt structures — simple description, audio script, and timeline scripts; voice design, dialogue and vocal actions, ambience/SFX, instrumental BGM, @Audio reference voices, dubbing, and named separate tracks. Use whenever a Seed Audio prompt needs writing, structuring, or fixing." },
  // Seed Audio — .claude/skills/seedaudio-prompt-optimizer/ (SeedAudio 1.5 prompt optimizer v1.3.0, English, + references/)
  { id: "seedaudio-prompt-optimizer", label: "SeedAudio Prompt Optimizer", library: "Seed Audio", projectType: "seed-audio", hint: "SeedAudio 1.5 prompt optimizer (v1.3.0, English) — rewrites a rough sound request, bare dialogue, or an existing prompt into one submit-ready Seed Audio prompt while keeping every line verbatim; converts Seedance video/storyboard prompts into sound scripts; @音频X reference binding, video dubbing/scoring, [start s:end s] timelines (≤360s), and track extraction (≤6 tracks). Use to optimize a Seed Audio prompt before generating." },
  // Seed Audio — .claude/skills/video-dub-audio-gen/ (Seedance shot prompts -> filter-safe Video Dubbing script)
  { id: "video-dub-audio-gen", label: "Video Dub Audio Gen", library: "Seed Audio", projectType: "seed-audio", hint: "Turns a dubbing request written as Seedance shot prompts (timecodes, camera directions, dialogue inside action text, 'X's voice must match @Audio1') into a clean Video Dubbing script: every spoken line verbatim and in order as Name（@AudioN, delivery）：“line”, unassigned speakers described, plus optional BGM / ambience / SFX in sound-only wording that passes the safety filter. Use for redubs, pronunciation fixes and adding a soundtrack to a dub." },
];

function skillsForProjectType(projectType) {
  // "universal" skills (currently just the Seedance 2.5 prompt
  // optimizer) apply to every project type, not just the type they're
  // grouped under in the catalog comments above.
  // Audiobook projects share the Seed Audio skills (the Seed Audio prompt guide).
  const types = projectType === "audiobook" ? ["audiobook", "seed-audio"] : [projectType];
  return SKILL_CATALOG.filter((s) => types.includes(s.projectType) || s.projectType === "universal");
}
