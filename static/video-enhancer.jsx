/* video-enhancer.jsx — Video Enhancer: BytePlus AI MediaKit video quality enhancement.
 *
 * Ported from CineForge's Video Enhancer. A form generator over MEDIAKIT_TOOLS —
 * the standard/professional tool and the speed-first "fast" one share one
 * submit/poll contract, proxied by /api/video-enhancer/* (MEDIAKIT_API_KEY in .env).
 *
 * Two things about MediaKit shape the UI:
 *   • Input is a URL the service downloads server-side, so a local file is first
 *     uploaded to the app's TOS bucket to get a public link.
 *   • result.video_url expires 24 h after the task finishes. Runs are kept in
 *     localStorage and re-polled on mount (which also renews a link with under
 *     2 h left), and "Save to outputs" keeps a local copy that never expires.
 *
 * Idempotency: with no client_token, MediaKit replays the same task for the same
 * video + version + resolution for 24 h, so every submit sends a unique token
 * unless the user pins one. Uses the app's own design classes.
 */
(function () {
  "use strict";
  const { useState, useEffect, useRef, useMemo, useCallback } = React;

  const VENH_RUNS_KEY = "cc_video_enhancer_runs_v1";
  const VENH_FORM_KEY = "cc_video_enhancer_form_v1";
  const VENH_POLL_MS = 6000;
  // Consecutive failed polls tolerated before the UI says anything (~18s).
  const VENH_POLL_GRACE = 3;
  const MEDIAKIT_TERMINAL = ["completed", "failed"];

  async function venhPost(path, body) {
    let res;
    try {
      res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) });
    } catch (netErr) {
      throw new Error(`Network error — is the app server running? (${netErr.message})`);
    }
    const data = await res.json().catch(() => ({}));
    return { res, data };
  }

  async function mediakitSubmit(tool, body) {
    const { res, data } = await venhPost("/api/video-enhancer/submit", { tool, body });
    // A 200 with success:false is the documented way a bad parameter comes back.
    if (!res.ok || data?.success === false) throw new Error(mediakitErrorOf(data) || `HTTP ${res.status}`);
    const taskId = data?.task_id || "";
    if (!taskId) throw new Error(`Submit succeeded but no task_id was returned:\n${JSON.stringify(data).slice(0, 300)}`);
    return { taskId, raw: data };
  }

  async function mediakitGetTask(taskId) {
    const { res, data } = await venhPost("/api/video-enhancer/task", { task_id: taskId });
    if (!res.ok) throw new Error(mediakitErrorOf(data) || `HTTP ${res.status}`);
    return data;
  }

  // "" | "running" | "completed" | "failed"
  function mediakitStatusOf(task) {
    return String(task?.status || "").toLowerCase();
  }

  // Errors arrive as {code, type, message, param} on submit and on a failed task.
  function mediakitErrorOf(payload) {
    const e = payload?.error;
    if (!e) return payload?.message || "";
    if (typeof e === "string") return e;
    const head = [e.code, e.type].filter(Boolean).join(" / ");
    const tail = e.param ? `${e.message || ""} (parameter: ${e.param})` : (e.message || "");
    return [head, tail].filter(Boolean).join(": ");
  }

  // Timestamps come back as seconds — sometimes as numbers, sometimes as strings.
  function mediakitTs(v) {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n * 1000 : 0;
  }

  // ── Tool registry ───────────────────────────────────────────────────────────
  // `fields` drive the generated form. Everything the two enhancement APIs accept
  // is listed here; the two tools genuinely differ (the fast tool has no
  // tool_version / scene / style / bit depth / codec, and its resolution ladder
  // and resolution_limit range both stop lower), so the field lists are written
  // out per tool rather than shared and patched.
  //
  // `when(form)` hides a field that the current settings make inert.
  // `exclusiveWith` marks the resolution / resolution_limit pair, which the API
  // rejects outright when both are sent.

  const MEDIAKIT_RES_FULL = ["240p", "360p", "480p", "540p", "720p", "1080p", "2k", "4k", "6k", "8k"];
  const MEDIAKIT_RES_LITE = ["240p", "360p", "480p", "540p", "720p", "1080p", "2k", "4k"];

  // Shared tail: every tool takes these four control parameters.
  function mediakitCommonFields() {
    return [
      { key: "client_token", label: "Client token (idempotency)", type: "text", group: "Delivery", wide: true,
        hint: "Up to 64 printable ASCII characters. Reusing one replays the original task instead of rendering again; leave blank and the app sends a fresh unique token per submit." },
      { key: "queue_id", label: "Queue ID", type: "text", group: "Delivery", wide: true, placeholder: "q00a9731598092652e4a95292434198",
        hint: "Routes the task to a specific queue for cost attribution. Blank uses the default queue of the project behind your API key." },
      { key: "callback_url", label: "Callback URL", type: "text", group: "Delivery", wide: true, placeholder: "https://example.com/callback",
        hint: "Optional, and normally left blank: MediaKit POSTs the result to this URL from the public internet, and this app's server is local-only (127.0.0.1) with no route to receive one. You need a public HTTPS endpoint of your own — or a tunnel to one — for this to do anything. The app polls either way, so nothing is lost by skipping it." },
      { key: "callback_args", label: "Callback args", type: "text", group: "Delivery", wide: true,
        hint: "Returned as-is in the completion event, to tie it back to your own records. Max 512 bytes." },
    ];
  }

  // What each option is for, shown as points under its field. From the AI
  // MediaKit "Video quality enhancement" guide.
  const VENH_NOTES = {
    tool_version: {
      fast: "Speed-first: lightweight super-resolution plus quality enhancement for latency-sensitive work (live, short video). About 3 min per minute of video (RTF ≈ 3). Input up to 2K; output up to 4K. No scene, style, bit-depth or codec controls.",
      standard: "Everyday distribution: 10+ algorithms balancing speed and cost. About 6–10 min per minute of video.",
      professional: "Cinema-grade, large-model restoration: 30+ algorithms, about 10× the price, 25–60 min per minute. Tier follows output resolution — ≤1080p Medium, 2K Premium, ≥4K Ultimate. Unlocks bit depth and codec.",
    },
    scene: {
      "": "General content (common).",
      common: "General content with no special profile.",
      ugc: "UGC short video: repairs blur, blocking and colour banding from repeated compression.",
      short_series: "Short drama: enhances people and strengthens detail for more immersion.",
      aigc: "AI-generated footage: super-resolves to 2K/4K and redraws detail.",
      old_film: "Classic film: temporal denoising, scratch and flicker removal, colour-cast fix. With Professional it uses a dedicated 4K restoration template.",
    },
    enhance_style: {
      "": "Same as hd.",
      hd: "Moderate strength for a sharp, clear image.",
      natural: "Gentler enhancement with fewer sharpening artifacts — for realistic texture when the \"AI look\" must be avoided.",
    },
    bitrate_level: {
      "": "Same as medium.",
      low: "Smallest files: previews, drafts, bandwidth-limited delivery.",
      medium: "Recommended balance of quality and file size.",
      high: "Most detail, largest files: masters and large-screen playback.",
    },
    bit_depth: {
      "": "8-bit, or whatever the chosen codec needs.",
      "8": "256 levels/channel. TV, social, web: most compatible, small files, no HDR.",
      "10": "1,024 levels. Recommended for premium work: removes sky banding, supports HDR — streaming, refined short dramas.",
      "12": "4,096 levels. Film masters, commercials, theatrical: grading latitude. MP4 output is dithered to 10-bit.",
      "16": "65,536 levels. VFX and 3D render masters. Input ≤40 s, bitrate ignored, tasks run one at a time.",
    },
    codec: {
      "": "Picked from bit depth: 8 → h264, 10/12 → h265, 16 → ffv1.",
      h264: "8-bit MP4. Widest compatibility: broadcast, social, web.",
      h265: "8/10/12-bit MP4. Mainstream HD; 10-bit for HDR distribution, 12-bit for grading.",
      prores: "10-bit 4:2:2 MOV. Visually lossless intermediate for grading and editing.",
      ffv1: "16-bit lossless MOV. Precise compositing and master archiving.",
      exr: "16-bit half-float OpenEXR image sequence — not a video file.",
    },
  };

  const MEDIAKIT_TOOLS = [
    {
      id: "enhance-video",
      label: "Video quality enhancement (standard / professional)",
      blurb: "Denoise, colour enhancement, artifact removal and super-resolution. Standard runs 10+ algorithms; professional runs 30+ and unlocks high bit depth and mezzanine codecs.",
      inputNote: "Publicly reachable HTTP/HTTPS URL. mp4, flv, ts, avi, mov, wmv, mkv. Up to 2K input, ≤10 GB recommended.",
      fields: [
        { key: "video_url", label: "Source video URL", type: "text", required: true, picker: "video", group: "Source", wide: true,
          placeholder: "https://example.com/source.mp4",
          hint: "Must be publicly downloadable — MediaKit fetches it server-side, and HEADs it first, so hosts that reject HEAD fail the download." },

        { key: "tool_version", label: "Tool version", type: "select", group: "Enhancement", hidden: true,
          options: ["standard", "professional"], default: "standard",
          hint: "standard: balances speed and quality for distribution. professional: shot-level, cinema-grade; required for bit depth and codec control." },
        { key: "scene", label: "Scene template", type: "select", group: "Enhancement",
          options: ["", "common", "ugc", "short_series", "aigc", "old_film"],
          hint: "Presets tuned per content type. Defaults to common." },
        { key: "enhance_style", label: "Enhancement style", type: "select", group: "Enhancement",
          options: ["", "hd", "natural"],
          hint: "Both versions. hd (default) sharpens more; natural eases off for fewer sharpening artifacts." },

        { key: "resolution", label: "Target resolution", type: "select", group: "Output",
          options: [""].concat(MEDIAKIT_RES_FULL), exclusiveWith: "resolution_limit",
          hint: "Upscales to this level. Mutually exclusive with the short-side limit below." },
        { key: "resolution_limit", label: "Short-side limit (px)", type: "number", group: "Output",
          min: 128, max: 4320, placeholder: "1920", exclusiveWith: "resolution",
          hint: "Scales proportionally so the short side hits this value. Range 128–4320. Mutually exclusive with target resolution." },
        { key: "fps", label: "Target frame rate", type: "number", group: "Output", min: 15, max: 120, placeholder: "keeps source fps",
          hint: "Range 15–120. Leave blank to keep the source rate; going past 4× the source is not recommended." },
        { key: "bitrate_level", label: "Bitrate level", type: "select", group: "Output",
          options: ["", "low", "medium", "high"],
          hint: "Defaults to medium. The real bitrate is derived from resolution and frame rate — see the reference table." },
        { key: "bitrate", label: "Exact bitrate (kbps)", type: "number", group: "Output", min: 10, max: 150000, placeholder: "8000",
          hint: "Range 10–150000. Overrides bitrate level when both are set." },

        { key: "bit_depth", label: "Bit depth", type: "select", group: "Professional",
          options: ["", "8", "10", "12", "16"], numeric: true,
          when: (f) => f.tool_version === "professional",
          hint: "8 → h264/h265 · 10 → h265/prores · 12 → h265 · 16 → ffv1/exr. 16-bit caps input at 40s, ignores bitrate settings and runs one task at a time." },
        { key: "codec", label: "Codec", type: "select", group: "Professional",
          options: ["", "h264", "h265", "prores", "ffv1", "exr"],
          when: (f) => f.tool_version === "professional",
          hint: "Setting a codec requires a bit depth too, and the pair must be valid. prores, ffv1 and exr ignore bitrate and bitrate level." },
      ].concat(mediakitCommonFields()),
    },
    {
      id: "enhance-video-fast",
      label: "Video quality enhancement (fast)",
      blurb: "Fast: lightweight super-resolution plus intelligent quality enhancement, speed-first for latency-sensitive work such as live streaming and short video. About 3 min per minute of video. No scene, style, bit-depth or codec controls.",
      inputNote: "Publicly reachable HTTP/HTTPS URL. mp4, flv, ts, avi, mov, wmv, mkv. Short side 360–1440, long side 360–2560, ≤10 GB recommended.",
      fields: [
        { key: "video_url", label: "Source video URL", type: "text", required: true, picker: "video", group: "Source", wide: true,
          placeholder: "https://example.com/source.mp4",
          hint: "Must be publicly downloadable — MediaKit fetches it server-side, and HEADs it first. Input resolution is capped at 2K: short side 360–1440, long side 360–2560." },

        { key: "resolution", label: "Target resolution", type: "select", group: "Output",
          options: [""].concat(MEDIAKIT_RES_LITE), exclusiveWith: "resolution_limit",
          hint: "Fast tops out at 4k; the video is aligned to this level. Mutually exclusive with the short-side limit below." },
        { key: "resolution_limit", label: "Short-side limit (px)", type: "number", group: "Output",
          min: 128, max: 2160, placeholder: "1280", exclusiveWith: "resolution",
          hint: "Locks the short side to this many pixels and scales proportionally (640×480 at 720 → 960×720). Range 128–2160 on Fast. Mutually exclusive with target resolution." },
        { key: "fps", label: "Target frame rate", type: "number", group: "Output", min: 15, max: 120, placeholder: "keeps source fps",
          hint: "Range 15–120. Leave blank to keep the source rate; going past 4× the source is not recommended." },
        { key: "bitrate_level", label: "Bitrate level", type: "select", group: "Output",
          options: ["", "low", "medium", "high"],
          hint: "Defaults to medium (recommended). The real bitrate is derived from resolution and frame rate — see the reference table." },
        { key: "bitrate", label: "Exact bitrate (kbps)", type: "number", group: "Output", min: 10, max: 150000, placeholder: "8000",
          hint: "Range 10–150000. Overrides bitrate level when both are set." },
      ].concat(mediakitCommonFields()),
    },
  ];

  // Target output bitrate in Mbps per {resolution, fps band} at each level. The
  // service then swings 0.8–1.5× around these depending on content complexity.
  // Same table for both tools.
  const MEDIAKIT_BITRATE_TABLE = [
    { res: "240p",  fps: "15–30",  low: 0.3,  medium: 0.45, high: 0.6 },
    { res: "240p",  fps: "30–60",  low: 0.65, medium: 0.9,  high: 1.2 },
    { res: "240p",  fps: "60–120", low: 1.5,  medium: 2.2,  high: 2.8 },
    { res: "360p",  fps: "15–30",  low: 0.6,  medium: 0.85, high: 1.2 },
    { res: "360p",  fps: "30–60",  low: 1,    medium: 1.5,  high: 2 },
    { res: "360p",  fps: "60–120", low: 1.7,  medium: 2.5,  high: 3.2 },
    { res: "480p",  fps: "15–30",  low: 1.2,  medium: 1.8,  high: 2.3 },
    { res: "480p",  fps: "30–60",  low: 2.1,  medium: 3,    high: 3.9 },
    { res: "480p",  fps: "60–120", low: 3.5,  medium: 5,    high: 6.5 },
    { res: "540p",  fps: "15–30",  low: 1.7,  medium: 2.5,  high: 3.2 },
    { res: "540p",  fps: "30–60",  low: 2.8,  medium: 4,    high: 5.2 },
    { res: "540p",  fps: "60–120", low: 4.2,  medium: 6,    high: 7.8 },
    { res: "720p",  fps: "15–30",  low: 2.8,  medium: 4,    high: 5.2 },
    { res: "720p",  fps: "30–60",  low: 5.6,  medium: 8,    high: 10 },
    { res: "720p",  fps: "60–120", low: 8.4,  medium: 12,   high: 15 },
    { res: "1080p", fps: "15–30",  low: 5,    medium: 7,    high: 9 },
    { res: "1080p", fps: "30–60",  low: 10,   medium: 14,   high: 18 },
    { res: "1080p", fps: "60–120", low: 15,   medium: 22,   high: 28 },
    { res: "2k",    fps: "15–30",  low: 10,   medium: 15,   high: 20 },
    { res: "2k",    fps: "30–60",  low: 17,   medium: 24,   high: 32 },
    { res: "2k",    fps: "60–120", low: 28,   medium: 40,   high: 52 },
    { res: "4k",    fps: "15–30",  low: 21,   medium: 30,   high: 39 },
    { res: "4k",    fps: "30–60",  low: 32,   medium: 45,   high: 58 },
    { res: "4k",    fps: "60–120", low: 53,   medium: 75,   high: 100 },
    { res: "8k",    fps: "15–30",  low: 42,   medium: 60,   high: 78 },
    { res: "8k",    fps: "30–60",  low: 63,   medium: 90,   high: 120 },
    { res: "8k",    fps: "60–120", low: 84,   medium: 120,  high: 150 },
  ];

  // Valid bit-depth → codec pairings, used to validate before submitting.
  const MEDIAKIT_DEPTH_CODECS = {
    "8":  ["h264", "h265"],
    "10": ["h265", "prores"],
    "12": ["h265"],
    "16": ["ffv1", "exr"],
  };

  // codec → output container. Straight from the docs' combination table: note
  // ffv1 comes out as MOV (not the mkv you would guess), and exr is not a video
  // file at all but an image sequence.
  const MEDIAKIT_CODEC_OUTPUT = {
    h264:   { container: "MP4", ext: "mp4", depths: [8] },
    h265:   { container: "MP4", ext: "mp4", depths: [8, 10, 12] },
    prores: { container: "MOV", ext: "mov", depths: [10] },
    ffv1:   { container: "MOV", ext: "mov", depths: [16] },
    exr:    { container: "EXR image sequence", ext: "exr", depths: [16], sequence: true },
  };

  // Which codec a submitted body actually produces. With no codec the tool picks
  // one from the bit depth: 8 → h264, 10/12 → h265, 16 → ffv1.
  const MEDIAKIT_DEFAULT_CODEC = { "8": "h264", "10": "h265", "12": "h265", "16": "ffv1" };

  // What the browser gets back, and whether it is worth putting in a <video>.
  // Deliberately conservative: only 8/10-bit MP4 is offered as a preview. ProRes,
  // FFV1 and EXR cannot play in Chrome at all, and 12-bit HEVC is beyond what
  // standard players decode — for those the UI shows a download instead of a
  // player that would just sit there broken.
  function mediakitOutputFormat(body) {
    const b = body || {};
    const depth = b.bit_depth !== undefined && b.bit_depth !== null ? String(b.bit_depth) : "8";
    const codec = b.codec || MEDIAKIT_DEFAULT_CODEC[depth] || "h264";
    const out = MEDIAKIT_CODEC_OUTPUT[codec] || MEDIAKIT_CODEC_OUTPUT.h264;
    const playable = out.ext === "mp4" && Number(depth) <= 10;
    let why = "";
    if (!playable) {
      if (out.sequence) why = "EXR output is a 16-bit image sequence, not a video file — nothing can play it in a browser.";
      else if (out.ext === "mov") why = `${codec} in a MOV container does not play in Chrome.`;
      else why = `${depth}-bit ${codec} is beyond what browser players decode.`;
    }
    return { codec, depth, container: out.container, ext: out.ext, sequence: !!out.sequence, playable, why };
  }

  // Prefer the extension MediaKit actually used in the result URL; the table is
  // the fallback when the URL carries no useful suffix.
  function mediakitFilename(taskId, videoUrl, body) {
    let ext = "";
    const path = String(videoUrl || "").split("#")[0].split("?")[0];
    const m = path.match(/\.([A-Za-z0-9]{2,5})$/);
    if (m) ext = m[1].toLowerCase();
    if (!ext) ext = mediakitOutputFormat(body).ext;
    return `${taskId}.${ext}`;
  }

  function venhLoad(key, fallback) {
    try {
      const raw = JSON.parse(localStorage.getItem(key) || "null");
      return raw && typeof raw === typeof fallback && Array.isArray(raw) === Array.isArray(fallback) ? raw : fallback;
    } catch (e) { return fallback; }
  }

  function venhFmtElapsed(ms) {
    const s = Math.max(0, Math.round(ms / 1000));
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ${String(s % 60).padStart(2, "0")}s`;
    return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
  }

  // Fields are declared flat with a `group`; render them in declaration order,
  // grouped, so the form reads as Source → Enhancement → Output → Delivery.
  function venhGroups(tool, form) {
    const out = [];
    (tool.fields || []).forEach((f) => {
      if (f.hidden || (f.when && !f.when(form))) return;
      const name = f.group || "";
      const last = out[out.length - 1];
      if (last && last.name === name) last.fields.push(f);
      else out.push({ name, fields: [f] });
    });
    return out;
  }

  // Turn the form's strings into the typed JSON MediaKit expects, dropping blanks
  // so an untouched field means "let the service default it".
  function venhBuildBody(tool, form) {
    const body = {};
    (tool.fields || []).forEach((f) => {
      if (f.when && !f.when(form)) return;
      const raw = form[f.key];
      if (raw === undefined || raw === null || String(raw).trim() === "") return;
      if (f.type === "number" || f.numeric) {
        const n = Number(raw);
        if (Number.isFinite(n)) body[f.key] = n;
      } else {
        body[f.key] = String(raw).trim();
      }
    });
    return body;
  }

  // Everything the API would reject, caught before spending a submit.
  function venhValidate(tool, form, body) {
    const errs = [];
    (tool.fields || []).forEach((f) => {
      if (f.when && !f.when(form)) return;
      const v = body[f.key];

      if (f.required && (v === undefined || v === "")) {
        errs.push(`${f.label} is required.`);
        return;
      }
      if (v === undefined) return;

      if (f.type === "number") {
        if (f.min !== undefined && v < f.min) errs.push(`${f.label} must be at least ${f.min}.`);
        if (f.max !== undefined && v > f.max) errs.push(`${f.label} must be at most ${f.max}.`);
      }
      // resolution / resolution_limit are rejected outright when sent together.
      if (f.exclusiveWith && body[f.exclusiveWith] !== undefined) {
        const other = (tool.fields || []).find((x) => x.key === f.exclusiveWith);
        const pair = [f.label, other ? other.label : f.exclusiveWith].sort().join(" and ");
        const msg = `${pair} cannot both be set — the API rejects the request.`;
        if (!errs.includes(msg)) errs.push(msg);
      }
    });

    if (body.video_url && !/^https?:\/\//i.test(body.video_url)) {
      errs.push("Source video URL must be a public http:// or https:// link — MediaKit downloads it server-side. Use Upload file for a local video.");
    }
    if (body.client_token && body.client_token.length > 64) {
      errs.push("Client token must be 64 characters or fewer.");
    }
    if (body.callback_args && new Blob([body.callback_args]).size > 512) {
      errs.push("Callback args must be 512 bytes or fewer.");
    }
    if (body.callback_url && !/^https?:\/\//i.test(body.callback_url)) {
      errs.push("Callback URL must start with http:// or https://.");
    }
    // Codec without a depth is under-specified, and the pairs are fixed.
    if (body.codec) {
      if (body.bit_depth === undefined) {
        errs.push("Setting a codec also requires a bit depth.");
      } else {
        const allowed = MEDIAKIT_DEPTH_CODECS[String(body.bit_depth)] || [];
        if (!allowed.includes(body.codec)) {
          errs.push(`${body.bit_depth}-bit depth supports ${allowed.join(" or ")}, not ${body.codec}.`);
        }
      }
    }
    return errs;
  }

  // Warnings are things the API accepts but that will not do what the form says.
  function venhWarnings(tool, form, body) {
    const out = [];
    // Surface the output container before submitting — picking exr or ffv1 has a
    // much bigger consequence (no browser playback, huge files) than the field
    // itself suggests.
    if (body.codec || body.bit_depth !== undefined) {
      const f = mediakitOutputFormat(body);
      out.push(`Output: ${f.container}, ${f.depth}-bit ${f.codec}.${f.playable ? "" : " Not playable in the browser — the task card will offer a download only."}`);
    }
    if (body.bitrate !== undefined && body.bitrate_level) {
      out.push("Both an exact bitrate and a bitrate level are set — the exact bitrate wins.");
    }
    if (String(body.bit_depth) === "16") {
      out.push("16-bit depth: the input must be under 40s, bitrate settings are ignored, and these tasks run one at a time, so expect a long wait.");
    }
    if (["prores", "ffv1", "exr"].includes(body.codec)) {
      out.push(`${body.codec} ignores both bitrate and bitrate level.`);
    }
    if (body.client_token) {
      out.push("A fixed client token is idempotent for 24 h: resubmitting with it returns the original task instead of a new render.");
    }
    return out;
  }

  // Output short side in px for a resolution level ("2k" is 1440, "4k" 2160…).
  const VENH_RES_SHORT = { "240p": 240, "360p": 360, "480p": 480, "540p": 540, "720p": 720, "1080p": 1080, "2k": 1440, "4k": 2160, "6k": 3240, "8k": 4320 };

  // Estimated processing time = video duration × RTF (real-time factor), per
  // the guide's table. `meta` is the source's {duration, w, h} when known.
  function venhEstimate(toolId, body, meta) {
    const dur = meta?.duration || 0;
    if (toolId === "enhance-video-fast") {
      return { label: "Fast", rtf: dur ? [3, 3] : null, durMs: dur * 1000,
               note: dur ? "Average RTF about 3." : "Average RTF about 3 — a 1-minute video takes about 3 minutes." };
    }
    const notes = [];
    let label, rtf;
    if ((body.tool_version || "standard") === "standard") {
      label = "Standard";
      rtf = !dur ? null : dur > 20 ? [6, 10] : [22, 22];
      if (!dur) notes.push("RTF 6–10 for clips over 20 s, about 22 for 20 s or less.");
    } else {
      const srcShort = meta?.w && meta?.h ? Math.min(meta.w, meta.h) : 0;
      // No target set: the output keeps the source size.
      const outShort = body.resolution ? VENH_RES_SHORT[body.resolution] : body.resolution_limit || srcShort;
      if (!outShort) {
        label = "Professional";
        rtf = [25, 60];
        notes.push("Tier depends on output resolution: Medium ≤1080p (25×), Premium 2K (40×), Ultimate ≥4K (60×).");
      } else if (outShort <= 1080) { label = "Pro · Medium"; rtf = [25, 25]; }
      else if (outShort <= 1440) { label = "Pro · Premium"; rtf = [40, 40]; }
      else { label = "Pro · Ultimate"; rtf = [60, 60]; }
      notes.push("Professional costs about 10× Standard.");
      if (String(body.bit_depth) === "16") notes.push("16-bit tasks run one at a time, so queueing adds to this.");
    }
    return { label, rtf, durMs: dur * 1000, note: notes.join(" ") };
  }

  function venhRange(lo, hi) {
    return lo === hi ? `~${venhFmtElapsed(lo)}` : `${venhFmtElapsed(lo)}–${venhFmtElapsed(hi)}`;
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ""));
      r.onerror = () => reject(r.error || new Error("Could not read the file."));
      r.readAsDataURL(file);
    });
  }

  const VENH_PRE = { fontSize: 11, fontFamily: "var(--mono)", maxHeight: 200, overflow: "auto", background: "var(--surface-2)", border: "0.5px solid var(--border)", borderRadius: 6, padding: 9, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" };

  function VideoEnhancer() {
    const [config, setConfig] = useState(null);
    const [toolId, setToolId] = useState(() => MEDIAKIT_TOOLS[0].id);
    const [forms, setForms] = useState(() => venhLoad(VENH_FORM_KEY, {}));
    const [runs, setRuns] = useState(() => venhLoad(VENH_RUNS_KEY, []));
    const [err, setErr] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState("");  // field key being uploaded
    const [expanded, setExpanded] = useState({});
    const [showBitrates, setShowBitrates] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [infoOpen, setInfoOpen] = useState({});  // field key → details shown
    const [sourceMeta, setSourceMeta] = useState(null);  // {url, duration, w, h} of the previewed source
    // An untouched form is "invalid" only because the required URL is blank;
    // don't shout about that before the user has typed anything.
    const [touched, setTouched] = useState(false);
    const [now, setNow] = useState(Date.now());
    const fileRef = useRef(null);
    const uploadKeyRef = useRef("");

    const hasKey = !!config?.has_server_key;
    const tool = useMemo(() => MEDIAKIT_TOOLS.find((t) => t.id === toolId) || MEDIAKIT_TOOLS[0], [toolId]);
    const form = forms[toolId] || {};

    const body = useMemo(() => venhBuildBody(tool, form), [tool, form]);
    const errors = useMemo(() => venhValidate(tool, form, body), [tool, form, body]);
    const warnings = useMemo(() => venhWarnings(tool, form, body), [tool, form, body]);

    useEffect(() => {
      venhPost("/api/video-enhancer/config").then(({ data }) => setConfig(data || {})).catch(() => setConfig({}));
    }, []);
    useEffect(() => {
      try { localStorage.setItem(VENH_RUNS_KEY, JSON.stringify(runs.slice(0, 40))); } catch (e) {}
    }, [runs]);
    useEffect(() => {
      try { localStorage.setItem(VENH_FORM_KEY, JSON.stringify(forms)); } catch (e) {}
    }, [forms]);

    // Drives the "expires in" countdown on finished runs.
    useEffect(() => {
      const h = setInterval(() => setNow(Date.now()), 30000);
      return () => clearInterval(h);
    }, []);

    const setField = useCallback((key, value) => {
      setTouched(true);
      setForms((prev) => ({ ...prev, [toolId]: { ...(prev[toolId] || {}), [key]: value } }));
    }, [toolId]);

    function clearForm() {
      setForms((prev) => ({ ...prev, [toolId]: {} }));
      setErr(""); setTouched(false);
    }

    const patchRun = useCallback((taskId, patch) => {
      setRuns((prev) => prev.map((r) => (r.taskId === taskId ? { ...r, ...patch } : r)));
    }, []);

    const runsRef = useRef(runs);
    runsRef.current = runs;

    // One poller for every unfinished run, including ones restored from a
    // previous session — MediaKit keeps a task queryable well past a refresh.
    useEffect(() => {
      if (!hasKey) return;
      let stopped = false;

      async function tick() {
        const pending = runsRef.current.filter((r) => !MEDIAKIT_TERMINAL.includes(r.status));
        for (const r of pending) {
          if (stopped) return;
          try {
            const task = await mediakitGetTask(r.taskId);
            const status = mediakitStatusOf(task) || "running";
            patchRun(r.taskId, {
              status,
              task,
              error: status === "failed" ? (mediakitErrorOf(task) || "Task failed with no detail.") : "",
              pollError: "",
              pollFails: 0,
              updatedAt: Date.now(),
            });
          } catch (e) {
            // A failed poll says nothing about the task — it runs on BytePlus, not
            // here. Only surface it once it has failed VENH_POLL_GRACE times
            // running, so a blip doesn't paint a red error over a task that is fine.
            setRuns((prev) => prev.map((x) => {
              if (x.taskId !== r.taskId) return x;
              const fails = (x.pollFails || 0) + 1;
              return { ...x, pollFails: fails, pollError: fails >= VENH_POLL_GRACE ? e.message : "", updatedAt: Date.now() };
            }));
          }
        }
      }

      tick();
      const h = setInterval(tick, VENH_POLL_MS);
      return () => { stopped = true; clearInterval(h); };
    }, [hasKey, patchRun]);

    // Re-polling a finished task is also how its result link gets renewed: the
    // service extends the expiry whenever under 2 h remain on a queried task.
    async function refresh(taskId) {
      setErr("");
      try {
        const task = await mediakitGetTask(taskId);
        patchRun(taskId, { task, status: mediakitStatusOf(task) || "running", pollError: "", updatedAt: Date.now() });
        setNow(Date.now());
      } catch (e) {
        patchRun(taskId, { pollError: e.message, updatedAt: Date.now() });
      }
    }

    async function submit() {
      setErr("");
      setTouched(true);
      if (errors.length) { setErr(errors[0]); return; }

      // Without a token MediaKit replays the last task for the same video +
      // version + resolution for 24 h, so "Submit" would silently no-op on a
      // second press. Send a unique one unless the user pinned their own.
      const payload = { ...body };
      if (!payload.client_token) {
        payload.client_token = `cc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      }

      setSubmitting(true);
      try {
        const { taskId } = await mediakitSubmit(tool.id, payload);
        setRuns((prev) => [{
          taskId,
          toolId: tool.id,
          label: tool.label,
          body: payload,
          estimate: estimate.rtf && estimate.durMs ? { lo: estimate.durMs * estimate.rtf[0], hi: estimate.durMs * estimate.rtf[1], label: estimate.label } : null,
          status: "running",
          startedAt: Date.now(),
          updatedAt: Date.now(),
        }, ...prev]);
        setExpanded((prev) => ({ ...prev, [taskId]: true }));
      } catch (e) {
        setErr(e.message);
      } finally {
        setSubmitting(false);
      }
    }

    // MediaKit can only read public URLs, so a local file goes to the app's TOS
    // bucket first (as-is — resizing it would defeat the enhancement).
    async function uploadFile(file) {
      const key = uploadKeyRef.current;
      if (!file || !key) return;
      setErr(""); setUploading(key);
      try {
        const dataUrl = await readFileAsDataUrl(file);
        const { res, data } = await venhPost("/api/video-enhancer/upload", { video_data_url: dataUrl });
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        setField(key, data.video_url || "");
      } catch (e) {
        setErr(`Upload failed: ${e.message}`);
      } finally {
        setUploading("");
      }
    }

    // The result link dies 24 h after the task finishes; copy it to outputs/.
    async function saveCopy(run) {
      const url = run.task?.result?.video_url;
      if (!url) return;
      patchRun(run.taskId, { saveState: "saving", saveError: "" });
      try {
        const { res, data } = await venhPost("/api/video-enhancer/save", { url, task_id: run.taskId });
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        patchRun(run.taskId, { saveState: "saved", localUrl: data.file_url });
      } catch (e) {
        patchRun(run.taskId, { saveState: "error", saveError: e.message });
      }
    }

    // Clipboard writes need a secure context; localhost counts, but fall back to
    // showing the URL for selection if the write is refused.
    const copyLink = useCallback(async (run) => {
      const url = run.task?.result?.video_url;
      if (!url) return;
      try {
        await navigator.clipboard.writeText(url);
        patchRun(run.taskId, { copied: Date.now(), showRaw: false });
      } catch (e) {
        patchRun(run.taskId, { showRaw: true });
      }
    }, [patchRun]);

    function renderField(f) {
      const v = form[f.key] ?? "";
      // The excluded half of the resolution / resolution_limit pair goes inert
      // rather than disappearing, so the trade-off stays visible.
      const off = !!(f.exclusiveWith && String(form[f.exclusiveWith] ?? "").trim() !== "");

      return (
        <div key={f.key} style={{ gridColumn: f.wide ? "1 / -1" : undefined, minWidth: 0, opacity: off ? 0.45 : 1 }}>
          <div className="field-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {f.label}
            {VENH_NOTES[f.key] || f.hint ? (
              <button type="button" aria-label={`About ${f.label}`} aria-expanded={!!infoOpen[f.key]}
                onClick={() => setInfoOpen((p) => ({ ...p, [f.key]: !p[f.key] }))}
                style={{ width: 16, height: 16, padding: 0, borderRadius: "50%", border: "1px solid var(--border-2)", background: infoOpen[f.key] ? "var(--accent-2)" : "var(--surface)", color: infoOpen[f.key] ? "#fff" : "var(--text-secondary)", fontSize: 10, fontWeight: 600, fontStyle: "italic", fontFamily: "Georgia, serif", lineHeight: "14px", cursor: "pointer", textTransform: "none" }}>i</button>
            ) : null}
          </div>

          {f.type === "select" && (
            <select className="select-input" value={v} disabled={off} onChange={(e) => setField(f.key, e.target.value)}>
              {f.options.map((o) => (
                <option key={o || "_default"} value={o}>
                  {o === "" ? `Default${f.default ? ` (${f.default})` : ""}` : o}
                </option>
              ))}
            </select>
          )}

          {f.type === "number" && (
            <input className="select-input" type="number" value={v} disabled={off} min={f.min} max={f.max}
              placeholder={f.placeholder || ""} onChange={(e) => setField(f.key, e.target.value)} />
          )}

          {f.type === "text" && (
            <input className="select-input" value={v} disabled={off} placeholder={f.placeholder || ""}
              onChange={(e) => setField(f.key, e.target.value)} />
          )}

          {infoOpen[f.key] && f.hint && !VENH_NOTES[f.key] ? <div className="video-hint" style={{ marginTop: 6, padding: "8px 10px", borderRadius: 6, background: "var(--surface-2)", lineHeight: 1.5 }}>{f.hint}</div> : null}
          {infoOpen[f.key] && VENH_NOTES[f.key] ? (
            <ul style={{ margin: "6px 0 0", padding: "8px 10px 8px 24px", borderRadius: 6, background: "var(--surface-2)", fontSize: 11, lineHeight: 1.5, color: "var(--text-secondary)" }}>
              {f.options.filter((o) => VENH_NOTES[f.key][o]).map((o) => (
                <li key={o || "_default"} style={o === v ? { color: "var(--text-primary)" } : null}>
                  <strong style={{ fontWeight: 500 }}>{o || "Default"}</strong> — {VENH_NOTES[f.key][o]}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      );
    }

    // Same cell as a Video Generation variant: header, player, meta, actions.
    function renderRun(r) {
      const open = !!expanded[r.taskId];
      const result = r.task?.result || null;
      const videoUrl = result?.video_url || "";
      const expiresAt = mediakitTs(r.task?.expires_at);
      const fmt = mediakitOutputFormat(r.body);
      const leftMs = expiresAt ? expiresAt - now : 0;
      const status = r.status || "running";
      const name = mediakitFilename(r.taskId, videoUrl, r.body);
      const elapsed = venhFmtElapsed((r.updatedAt || Date.now()) - r.startedAt);
      const est = r.estimate ? ` of ${venhRange(r.estimate.lo, r.estimate.hi)}` : "";
      const stateText = status === "completed" ? `Done · ${elapsed}` : status === "failed" ? "Failed" : `Enhancing · ${elapsed}${est}`;
      const source = String(r.body?.video_url || "").split("?")[0].split("/").pop();

      return (
        <div key={r.taskId} className="variant-cell">
          <div className="variant-head">
            <span className="variant-label">{r.toolId === "enhance-video-fast" ? "fast" : (r.body?.tool_version || "standard")}</span>
            <span className="variant-state" style={status === "completed" ? { color: "var(--success)" } : status === "failed" ? { color: "var(--danger)" } : null}>{stateText}</span>
          </div>

          {result && fmt.playable ? (
            // preload="metadata" so opening the cell does not start pulling a
            // multi-gigabyte file just to show a poster frame.
            <video className="video-player" src={r.localUrl || videoUrl} controls preload="metadata" style={{ border: "none", borderRadius: 0, aspectRatio: "16 / 9" }} />
          ) : (
            <div className={"variant-placeholder" + (result || status === "failed" ? "" : " pulse")}>
              {result ? `${fmt.container} ready — ${fmt.why}` : status === "failed" ? "Enhancement failed" : "Enhancing…"}
            </div>
          )}

          <div className="variant-meta">
            {result
              ? [result.resolution, result.fps ? `${result.fps} fps` : "", result.duration ? `${Number(result.duration).toFixed(1)}s` : "", fmt.container].filter(Boolean).join(" · ")
              : source || r.taskId}
          </div>
          {result && !r.localUrl && expiresAt > 0 && (
            <div className="variant-meta" style={{ paddingTop: 2, color: leftMs < 2 * 3600 * 1000 ? "var(--danger)" : undefined }}>
              {leftMs > 0 ? `Link expires in ${venhFmtElapsed(leftMs)}` : "Link expired — resubmit to re-render"}
            </div>
          )}
          {r.localUrl && <div className="variant-meta" style={{ paddingTop: 2 }}>Saved to outputs — kept permanently</div>}

          {r.pollError && <div className="error-box">Can't reach the app server ({r.pollError}). The task keeps running on BytePlus.</div>}
          {r.error && <div className="error-box">{r.error}</div>}
          {r.saveState === "error" && <div className="error-box">Saving failed: {r.saveError}</div>}
          {r.showRaw && (
            <div style={{ padding: "8px 10px 0" }}>
              <input className="select-input" readOnly value={videoUrl} onFocus={(e) => e.target.select()} style={{ fontFamily: "var(--mono)", fontSize: 11 }} />
            </div>
          )}

          {result ? (
            <div className="result-footer">
              {r.localUrl ? (
                <a className="btn-action" href={r.localUrl} download data-model="Video Enhancer" data-ext={name.split(".").pop()}>Download</a>
              ) : (
                <button className="btn-action" onClick={() => saveCopy(r)} disabled={r.saveState === "saving"}
                  title="Copy the result into outputs/ so it outlives the 24 h link">
                  {r.saveState === "saving" ? "Saving…" : "Save"}
                </button>
              )}
              <button className="btn-action" onClick={() => copyLink(r)} title="Copy the public link (expires 24 h after the task finished)">
                {r.copied && Date.now() - r.copied < 4000 ? "Copied" : "Copy URL"}
              </button>
              <button className="btn-action" onClick={() => refresh(r.taskId)} title="Re-query the task; renews the link when under 2 h remain">Renew</button>
            </div>
          ) : null}
          <div style={{ display: "flex", gap: 12, padding: result ? "0 10px 10px" : "8px 10px 10px" }}>
            <button className="btn-link" onClick={() => setExpanded((p) => ({ ...p, [r.taskId]: !open }))}>{open ? "Hide details" : "Details"}</button>
            <button className="btn-link" style={{ color: "var(--text-secondary)" }} onClick={() => setRuns((prev) => prev.filter((x) => x.taskId !== r.taskId))}>Remove</button>
          </div>

          {open && (
            <div style={{ padding: "0 10px 10px" }}>
              <div className="field-label">Task ID</div>
              <pre style={VENH_PRE}>{r.taskId}</pre>
              <div className="field-label" style={{ marginTop: 10 }}>Submitted body</div>
              <pre style={VENH_PRE}>{JSON.stringify(r.body, null, 2)}</pre>
              <div className="field-label" style={{ marginTop: 10 }}>Task response</div>
              <pre style={VENH_PRE}>{r.task ? JSON.stringify(r.task, null, 2) : "—"}</pre>
            </div>
          )}
        </div>
      );
    }

    const sourceUrl = String(form.video_url || "").trim();
    const meta = sourceMeta && sourceMeta.url === sourceUrl ? sourceMeta : null;
    const estimate = venhEstimate(tool.id, body, meta);
    const groups = venhGroups(tool, form).filter((g) => g.name !== "Source");
    const mainGroups = groups.filter((g) => g.name !== "Delivery");
    const delivery = groups.find((g) => g.name === "Delivery");
    const GROUP_TITLES = { Enhancement: "Enhancement", Output: "Output Settings", Professional: "Professional Output" };
    const blockedReason = !config ? "" : !hasKey ? "Add MEDIAKIT_API_KEY to .env to enable enhancement."
      : !sourceUrl ? "Upload a video or paste a public URL to enable enhancement." : (touched && errors[0]) || "";

    return (
      <div className="card">
        <input ref={fileRef} type="file" className="sr-only" accept="video/*,.mkv,.flv,.ts,.wmv"
          onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ""; uploadFile(f); }} />

        {config && !hasKey && (
          <div className="error-box" style={{ marginTop: 0, marginBottom: 14 }}>
            No AI MediaKit API key. Add <code>MEDIAKIT_API_KEY</code> to <code>.env</code> and restart the app.
            It is a separate credential from <code>ARK_API_KEY</code> — create one on the Settings page of the AI MediaKit console.
          </div>
        )}

        <div className="field-label">Tool version</div>
        <div className="tabs" role="radiogroup" aria-label="Tool version">
          {[["fast", "Fast"], ["standard", "Standard"], ["professional", "Professional"]].map(([v, label]) => {
            const current = toolId === "enhance-video-fast" ? "fast" : ((forms["enhance-video"] || {}).tool_version || "standard");
            return (
              <button key={v} className={"tab-btn" + (current === v ? " active" : "")} role="radio" aria-checked={current === v}
                      onClick={() => {
                        if (v === "fast") {
                          setForms((prev) => {
                            const url = (prev["enhance-video"] || {}).video_url;
                            const cur = prev["enhance-video-fast"] || {};
                            return { ...prev, "enhance-video-fast": { ...cur, video_url: cur.video_url || url || "" } };
                          });
                          setToolId("enhance-video-fast");
                          return;
                        }
                        // Standard / Professional share one tool; the source URL carries over from Fast.
                        setForms((prev) => {
                          const fastUrl = (prev["enhance-video-fast"] || {}).video_url;
                          const cur = prev["enhance-video"] || {};
                          return { ...prev, "enhance-video": { ...cur, tool_version: v, video_url: cur.video_url || fastUrl || "" } };
                        });
                        setToolId("enhance-video");
                      }}>
                {label}
              </button>
            );
          })}
        </div>
        <div className="video-hint" style={{ marginTop: 0 }}>
          {VENH_NOTES.tool_version[toolId === "enhance-video-fast" ? "fast" : ((forms["enhance-video"] || {}).tool_version || "standard")]}
        </div>

        <hr className="divider" />
        <div className="field-label">Source Video</div>
        <div className="tile-grid sa-compact-tiles" style={{ gridTemplateColumns: "auto minmax(0, 1fr)" }}>
          <div className="upload-tile" role="button" tabIndex="0" aria-label="Upload a video"
            onClick={() => { if (!uploading) { uploadKeyRef.current = "video_url"; fileRef.current && fileRef.current.click(); } }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m22 8-6 4 6 4V8Z"></path>
              <rect x="2" y="6" width="14" height="12" rx="2"></rect>
            </svg>
            <div className="tile-title">{uploading ? "Uploading…" : "Upload video"}</div>
          </div>
          <div className="upload-tile" style={{ cursor: "default" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
            <div className="tile-title">Public URL</div>
            <div style={{ display: "flex", gap: 6, width: "100%" }}>
              <input className="video-input sa-input" style={{ height: 30, fontSize: 12 }} placeholder="https://example.com/source.mp4"
                value={form.video_url || ""} onChange={(e) => setField("video_url", e.target.value)} />
              {sourceUrl ? <button className="btn-action btn-inline" onClick={() => setField("video_url", "")}>Clear</button> : null}
            </div>
          </div>
        </div>
        <div className="video-hint">{tool.inputNote}</div>
        {/^https?:\/\//i.test(sourceUrl) && (
          <div className="video-wrap" style={{ maxWidth: 420 }}>
            <video className="video-player" src={sourceUrl} controls preload="metadata"
              onLoadedMetadata={(e) => setSourceMeta({ url: sourceUrl, duration: e.currentTarget.duration || 0, w: e.currentTarget.videoWidth, h: e.currentTarget.videoHeight })} />
          </div>
        )}

        {mainGroups.map((g) => (
          <React.Fragment key={g.name}>
            <hr className="divider" />
            <div className="field-label">{GROUP_TITLES[g.name] || g.name}</div>
            <div className="config-grid" style={{ marginTop: 0 }}>{g.fields.map(renderField)}</div>
          </React.Fragment>
        ))}

        {warnings.length > 0 && (
          <div className="video-hint" style={{ marginTop: 12, lineHeight: 1.55 }}>
            {warnings.map((w) => <div key={w}>⚠ {w}</div>)}
          </div>
        )}

        <hr className="divider" />
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <button className="btn-link" onClick={() => setShowAdvanced((v) => !v)}>{showAdvanced ? "▾" : "▸"} Advanced (client token, queue, callback)</button>
          <button className="btn-link" onClick={() => setShowBitrates((v) => !v)}>{showBitrates ? "▾" : "▸"} Bitrate reference</button>
        </div>
        {showAdvanced && delivery && (
          <div className="config-grid">{delivery.fields.map(renderField)}</div>
        )}
        {showBitrates && (
          <div style={{ marginTop: 10 }}>
            <div className="video-hint" style={{ marginTop: 0 }}>
              Target output bitrate in Mbps per level. The service swings 0.8–1.5× around these with content complexity.
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, marginTop: 8 }}>
              <thead>
                <tr>{["Res", "fps", "Low", "Medium", "High"].map((h) => <th key={h} style={{ textAlign: "left", padding: "4px 6px", color: "var(--text-secondary)", fontWeight: 500, borderBottom: "0.5px solid var(--border)" }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {MEDIAKIT_BITRATE_TABLE.map((row) => (
                  <tr key={`${row.res}-${row.fps}`}>
                    {[row.res, row.fps, row.low, row.medium, row.high].map((c, i) => (
                      <td key={i} style={{ padding: "4px 6px", borderBottom: "0.5px solid var(--border)", color: i === 1 ? "var(--text-secondary)" : undefined }}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <hr className="divider" />
        <div className="field-label">Estimated Processing Time</div>
        <div style={{ fontSize: 13 }}>
          {estimate.rtf && estimate.durMs
            ? <>{venhRange(estimate.durMs * estimate.rtf[0], estimate.durMs * estimate.rtf[1])} <span style={{ color: "var(--text-secondary)" }}>for this {venhFmtElapsed(estimate.durMs)} video · {estimate.label}, RTF {estimate.rtf[0] === estimate.rtf[1] ? `≈${estimate.rtf[0]}` : `${estimate.rtf[0]}–${estimate.rtf[1]}`}×</span></>
            : estimate.rtf
              ? <>{estimate.rtf[0] === estimate.rtf[1] ? `~${estimate.rtf[0]}` : `${estimate.rtf[0]}–${estimate.rtf[1]}`} min per minute of video <span style={{ color: "var(--text-secondary)" }}>· {estimate.label}</span></>
              : <>{estimate.label === "Standard" ? "6–10 min per minute of video" : estimate.label} <span style={{ color: "var(--text-secondary)" }}>{estimate.label === "Standard" ? "· Standard" : ""}</span></>}
        </div>
        <div className="video-hint" style={{ marginTop: 4, lineHeight: 1.5 }}>
          {estimate.note} {!meta && tool.id !== "enhance-video-fast" ? (sourceUrl ? "The estimate uses the source length once its preview loads. " : "Add a source video to estimate from its length. ") : ""}
          Estimated time = video length × RTF. Input resolution, bitrate and the queue also affect it.
        </div>

        {err && <div className="error-box">{err}</div>}

        <div className="btn-row">
          <button className="btn-primary" onClick={submit} disabled={!hasKey || submitting || !!uploading || errors.length > 0}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"></path></svg>
            {submitting ? "Submitting…" : "Enhance Video"}
          </button>
          <button className="btn-ghost" onClick={clearForm}>Clear</button>
        </div>
        {blockedReason && <div className="video-hint">{blockedReason}</div>}

        {runs.length > 0 && (
          <>
            <hr className="divider" />
            <div className="field-label">Results ({runs.length})</div>
            <div className="video-hint" style={{ marginTop: 0, marginBottom: 10 }}>
              Tasks keep polling across reloads. Result links expire 24 h after a task finishes — Save keeps a copy in outputs/.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))", gap: 10, alignItems: "start" }}>
              {runs.map(renderRun)}
            </div>
          </>
        )}
      </div>
    );
  }

  window.VideoEnhancer = VideoEnhancer;
})();
