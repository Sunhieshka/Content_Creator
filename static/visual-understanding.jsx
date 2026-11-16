/* visual-understanding.jsx — Visual Understanding: ask a Seed 2.x vision-language model about images and video.
 *
 * Up to 10 images and/or one video go to /api/visual-understanding/analyze with a question. Seed 2.0
 * Mini and Lite also hear the video's audio track; Seed 2.0 Pro and Seed 2.1 Turbo see its frames
 * only. Answers form a thread: a follow-up sends previous_response_id, so the media is not re-sent.
 * State comes from props ({state, update}).
 */
(function () {
  "use strict";
  const { useState, useRef, useEffect } = React;

  // Mirrors content_creator/services/visual_understanding.py MODELS (refreshed from /config on mount).
  const FALLBACK_MODELS = [
    { id: "seed-2-0-mini-260428", label: "Seed 2.0 Mini", audio: true, note: "fastest · hears audio" },
    { id: "seed-2-0-lite-260428", label: "Seed 2.0 Lite", audio: true, note: "balanced · hears audio" },
    { id: "seed-2-0-pro-260328", label: "Seed 2.0 Pro", audio: false, note: "strongest reasoning · frames only" },
    { id: "dola-seed-2-1-turbo-260628", label: "Seed 2.1 Turbo", audio: false, note: "fast · frames only" },
  ];
  const MAX_IMAGES = 10;

  const PRESETS = [
    { label: "Describe", text: "Describe in detail what you see: subjects, setting, action, composition, lighting, colour and mood." },
    { label: "Transcribe", audio: true, text: "Transcribe every line of speech with mm:ss timestamps and speaker labels, then list the music and sound effects with their timestamps." },
    { label: "Shot list", video: true, text: "Break the video into shots. For each shot give the mm:ss start–end, shot size, camera angle and movement, what happens, and any dialogue or sound." },
    { label: "Seedance prompt", text: "Reverse-engineer a Seedance 2.5 video-generation prompt that would recreate this: subject, action, setting, camera, lighting, style and (for video) timing and audio. Output only the prompt." },
    { label: "Read text", text: "Extract all visible text (signs, captions, UI, labels, documents) exactly as written, with where it appears." },
    { label: "Compare", images: 2, text: "Compare the images: list what is the same and what differs (subjects, wardrobe, setting, framing, lighting, colour). Note any continuity errors." },
    { label: "Ad review", text: "Review this as an ad creative: hook in the first seconds, message clarity, branding, call to action, pacing, and three concrete improvements." },
    { label: "Safety check", text: "Check for content-policy risks: violence, nudity, minors, real people or logos, dangerous acts, misleading claims. List each with where it appears and severity." },
  ];

  function post(path, body) {
    return fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) })
      .then((r) => r.json().catch(() => ({})).then((d) => {
        const err = d.error && (d.error.message || d.error);
        if (!r.ok || err) throw new Error(err || `HTTP ${r.status}`);
        return d;
      }));
  }
  function readDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ""));
      r.onerror = () => reject(r.error || new Error("Could not read the file."));
      r.readAsDataURL(blob);
    });
  }
  async function uploadFile(file) {
    if (/^image\//.test(file.type)) return (await post("/api/seedream/save-image", { data_url: await readDataUrl(file), hint: "vu" })).url;
    return (await post("/api/video/upload_local", { video_data_url: await readDataUrl(file), filename: file.name })).file_url;
  }
  const uid = () => Math.random().toString(36).slice(2, 10);

  // Seedance models the "Video → video prompt" mode can write for (max seconds per shot).
  const FALLBACK_TARGETS = [
    { id: "dreamina-seedance-2-5-260628", label: "Seedance 2.5", maxDuration: 30 },
    { id: "dreamina-seedance-2-5-flash-261115", label: "Seedance 2.5 flash", maxDuration: 30 },
    { id: "dreamina-seedance-2-0-260128", label: "Seedance 2.0", maxDuration: 15 },
  ];

  // "SHOT n" blocks -> [{ body, seconds }].
  function splitShots(text) {
    const parts = String(text || "").replace(/\r/g, "").split(/^\s*SHOT\s+\d+\s*:?\s*$/gim).map((x) => x.trim()).filter(Boolean);
    return parts.map((body) => {
      const m = [...body.matchAll(/(\d{1,3})\s*(?:-|–)?\s*sec(?:ond)?s?\s+total\s+runtime/gi)].pop();
      return { body, seconds: m ? Number(m[1]) : 0 };
    });
  }

  function VisualUnderstanding({ state, update, videoModels, onUsePrompt }) {
    const defaults = { model: FALLBACK_MODELS[1].id, images: [], video: null, prompt: "", fps: 1, thinking: true, thread: [],
                       mode: "ask", v2pTarget: "", v2pFps: 2, v2pResult: null };
    const s = Object.assign({}, defaults, state || {});
    const set = (patch) => update((prev) => Object.assign({}, defaults, prev || {}, typeof patch === "function" ? patch(Object.assign({}, defaults, prev || {})) : patch));
    const [models, setModels] = useState(FALLBACK_MODELS);
    const [configured, setConfigured] = useState(true);
    const [busy, setBusy] = useState("");
    const [error, setError] = useState("");
    const [followUp, setFollowUp] = useState("");
    const [copied, setCopied] = useState("");
    const imgRef = useRef(null), videoRef = useRef(null);

    useEffect(() => {
      post("/api/visual-understanding/config").then((c) => {
        if (Array.isArray(c.models) && c.models.length) setModels(c.models);
        setConfigured(!!c.configured);
      }).catch(() => {});
    }, []);

    const model = models.find((m) => m.id === s.model) || models[1] || models[0];
    const hasMedia = s.images.length > 0 || !!s.video;
    const last = s.thread[s.thread.length - 1];
    // A follow-up continues the last answer only on the same model; new media starts a fresh thread.
    const canFollowUp = !!(last && last.id && last.model === model.id);

    async function addFiles(files) {
      const list = Array.from(files || []);
      if (!list.length) return;
      setError("");
      const imgs = list.filter((f) => /^image\//.test(f.type));
      const vids = list.filter((f) => /^video\//.test(f.type));
      if (list.length > imgs.length + vids.length) setError("Only images and videos are supported.");
      if (vids.length > 1) setError("One video per analysis — the first one was used.");
      const room = MAX_IMAGES - s.images.length;
      if (imgs.length > room) setError(`At most ${MAX_IMAGES} images — the extra ones were skipped.`);
      try {
        for (const [i, f] of imgs.slice(0, Math.max(0, room)).entries()) {
          setBusy(`Uploading image ${i + 1} of ${Math.min(imgs.length, room)}…`);
          const url = await uploadFile(f);
          set((cur) => ({ images: [...cur.images, { url, name: f.name }], thread: [] }));
        }
        if (vids[0]) {
          if (vids[0].size > 512 * 1024 * 1024) throw new Error("The video is over the 512 MB limit.");
          setBusy("Uploading the video…");
          const url = await uploadFile(vids[0]);
          set({ video: { url, name: vids[0].name, size: vids[0].size }, thread: [] });
        }
      } catch (e) { setError(e.message); }
      setBusy("");
    }

    const targets = (videoModels && videoModels.length ? videoModels : FALLBACK_TARGETS);
    const target = targets.find((t) => t.id === s.v2pTarget) || targets[0];
    const v2pShots = s.v2pResult ? splitShots(s.v2pResult.text) : [];

    async function videoToPrompt() {
      if (!s.video) { setError("Add a video."); return; }
      setError("");
      setBusy(`${model.label} is watching the video and writing the prompt — long clips take a few minutes…`);
      try {
        const d = await post("/api/visual-understanding/video-to-prompt",
          { video: s.video.url, model: model.id, fps: s.v2pFps, thinking: s.thinking, max_shot_seconds: target.maxDuration });
        set({ v2pResult: { text: d.text, model: d.model, audio: d.audio, duration: d.duration, target: target.id,
                           usage: d.usage, seconds: d.seconds, video: s.video.name } });
      } catch (e) { setError(e.message); }
      setBusy("");
    }

    function editV2pShot(idx, body) {
      const shots = v2pShots.map((x) => x.body);
      shots[idx] = body;
      set((cur) => ({ v2pResult: Object.assign({}, cur.v2pResult, { text: shots.map((b, i) => `SHOT ${i + 1}\n\n${b}`).join("\n\n") }) }));
    }

    async function ask(question, isFollowUp) {
      const q = (question || "").trim();
      if (!q) { setError("Write a question or pick a preset."); return; }
      if (!isFollowUp && !hasMedia) { setError("Add at least one image or a video."); return; }
      setError("");
      setBusy(isFollowUp ? "Thinking…" : s.video ? `Uploading the video to ${model.label} and analysing — long clips take a minute or two…` : `Analysing with ${model.label}…`);
      try {
        const d = await post("/api/visual-understanding/analyze", isFollowUp
          ? { prompt: q, model: model.id, thinking: s.thinking, previous_response_id: last.id }
          : { prompt: q, model: model.id, thinking: s.thinking, images: s.images.map((i) => i.url), video: s.video?.url || "", fps: s.fps });
        const turn = { key: uid(), q, a: d.text, reasoning: d.reasoning, id: d.id, model: d.model, audio: isFollowUp ? !!last?.audio : d.audio,
                       hadVideo: isFollowUp ? !!last?.hadVideo : !!s.video, usage: d.usage, seconds: d.seconds, at: Date.now() };
        set((cur) => ({ thread: isFollowUp ? [...cur.thread, turn] : [turn] }));
        if (isFollowUp) setFollowUp("");
      } catch (e) { setError(e.message); }
      setBusy("");
    }

    function copy(key, text) {
      try { navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(""), 1400); } catch (e) {}
    }

    const tile = { position: "relative", border: "0.5px solid var(--border-2)", borderRadius: 10, overflow: "hidden", background: "#000" };
    const removeBtn = { position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: 11, border: "none", background: "rgba(0,0,0,.6)", color: "#fff", cursor: "pointer", fontSize: 13, lineHeight: "22px", padding: 0 };
    const badge = (on) => ({ display: "inline-block", fontSize: 10.5, fontWeight: 500, padding: "1px 6px", borderRadius: 6, marginLeft: 6,
                             background: on ? "var(--success-bg)" : "var(--surface-2)", color: on ? "var(--success)" : "var(--text-secondary)",
                             border: `0.5px solid ${on ? "var(--success-border)" : "var(--border)"}` });

    const modelPicker = (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8, marginBottom: 16 }} role="radiogroup">
        {models.map((m) => {
          const on = m.id === model.id;
          return (
            <button key={m.id} type="button" role="radio" aria-checked={on} onClick={() => set({ model: m.id })}
                    style={{ textAlign: "left", padding: "10px 12px", borderRadius: 10, cursor: "pointer", font: "inherit",
                             border: on ? "1px solid var(--accent)" : "0.5px solid var(--border-2)",
                             background: on ? "rgba(37,99,235,0.06)" : "var(--surface)", color: "var(--text-primary)" }}>
              <div style={{ fontWeight: 500 }}>{m.label}<span style={badge(m.audio)}>{m.audio ? "video + audio" : "frames only"}</span></div>
              <div style={{ fontSize: 11.5, color: "var(--text-secondary)", marginTop: 2 }}>{m.note}</div>
            </button>
          );
        })}
      </div>
    );

    const tabs = (
      <div className="tabs" role="radiogroup" aria-label="Visual Understanding mode" style={{ marginBottom: 12 }}>
        <button type="button" role="radio" aria-checked={s.mode !== "v2p"} className={"tab-btn" + (s.mode !== "v2p" ? " active" : "")} onClick={() => set({ mode: "ask" })}>Ask about images &amp; video</button>
        <button type="button" role="radio" aria-checked={s.mode === "v2p"} className={"tab-btn" + (s.mode === "v2p" ? " active" : "")} onClick={() => set({ mode: "v2p" })}>Video → video generation prompt</button>
      </div>
    );

    const v2pView = (
      <>
        <div className="card">
          <div className="video-hint" style={{ marginBottom: 14 }}>
            Seed LLM watches a video and writes the Seedance prompt that recreates it as exactly as it can: the same people, wardrobe, setting, action and timing, camera work, lighting, style, dialogue and sound. Videos longer than the chosen model's maximum are split into the fewest shots, each filled to the maximum. On-screen text is left out.
          </div>
          {!configured ? <div className="error-box" style={{ marginBottom: 12 }}>No ARK API key configured. Add <code>ARK_API_KEY</code> to <code>.env</code> and restart.</div> : null}

          <div className="field-label">Video</div>
          <input ref={videoRef} type="file" className="sr-only" accept="video/*" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
          {s.video ? (
            <div style={{ ...tile, maxWidth: 420 }}>
              <video src={s.video.url} controls playsInline style={{ width: "100%", height: 200, display: "block", objectFit: "contain" }} />
              <button type="button" style={removeBtn} aria-label="Remove video" onClick={() => set({ video: null, thread: [] })}>×</button>
            </div>
          ) : (
            <div className="upload-tile" role="button" tabIndex="0" style={{ minHeight: 140 }} onClick={() => videoRef.current.click()}
                 onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}>
              <div className="tile-title">Upload a video</div>
              <div className="tile-meta">MP4 or MOV, up to 512 MB</div>
            </div>
          )}

          <div className="field-label" style={{ marginTop: 16 }}>Understanding model</div>
          {modelPicker}
          {!model.audio ? <div className="video-hint" style={{ marginTop: -8, marginBottom: 12 }}>{model.label} sees frames only, so dialogue and sound are not written. For speech and music, pick Seed 2.0 Mini or Lite.</div> : null}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <div>
              <div className="field-label">Prompt for</div>
              <select className="select-input" value={target.id} onChange={(e) => set({ v2pTarget: e.target.value })}>
                {targets.map((t) => <option key={t.id} value={t.id}>{t.label} · up to {t.maxDuration}s per shot</option>)}
              </select>
            </div>
            <div>
              <div className="field-label">Frame sampling — {Number(s.v2pFps).toFixed(1)} fps</div>
              <input type="range" min="0.5" max="5" step="0.5" value={s.v2pFps} onChange={(e) => set({ v2pFps: Number(e.target.value) })} style={{ width: "100%" }} aria-label="Frames per second" />
              <div className="video-hint">Higher catches fast action and exact timing; lower is faster for long, slow clips.</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 12 }}>
            <label className="sheet-chip checkbox-chip" data-checked={s.thinking ? "true" : "false"} style={{ height: 34 }}>
              <input type="checkbox" checked={s.thinking} onChange={(e) => set({ thinking: e.target.checked })} style={{ marginRight: 6 }} />
              Deep thinking
            </label>
            <span style={{ flex: 1 }}></span>
            <button type="button" className="btn-primary" disabled={!s.video || !!busy || !configured} onClick={videoToPrompt}>
              {busy ? "Writing…" : "Generate video prompt"}
            </button>
          </div>
          {error ? <div className="error-box" style={{ marginTop: 12 }}>{error}</div> : null}
          {busy ? <div className="video-hint pulse" style={{ marginTop: 12 }}>{busy}</div> : null}
        </div>

        {s.v2pResult ? (
          <div className="card">
            <div className="s2p-breakdown" style={{ marginTop: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div className="s2p-breakdown-title" style={{ flex: 1 }}>Video generation prompt</div>
                {onUsePrompt && v2pShots.length > 1 ? (
                  <button type="button" className="btn-action" onClick={() => onUsePrompt("long", v2pShots, s.v2pResult.target)}>Send all to Long Duration</button>
                ) : null}
                <button type="button" className="btn-link" onClick={() => copy("v2p-all", s.v2pResult.text)}>{copied === "v2p-all" ? "Copied" : "Copy all"}</button>
              </div>
              <div className="s2p-breakdown-meta">
                {v2pShots.length} shot{v2pShots.length === 1 ? "" : "s"} · {s.v2pResult.duration}s video · for {(targets.find((t) => t.id === s.v2pResult.target) || target).label} · {(models.find((m) => m.id === s.v2pResult.model) || {}).label || s.v2pResult.model}{s.v2pResult.audio ? " (video + audio)" : " (frames only)"} · {s.v2pResult.seconds}s
              </div>
              <div className="s2p-shot-grid">
                {v2pShots.map((sh, idx) => (
                  <div key={idx} className="s2p-shot">
                    <div className="s2p-shot-head">
                      <span><strong>Shot {idx < 26 ? String.fromCharCode(65 + idx) : idx + 1}</strong>{sh.seconds ? <span className="s2p-shot-secs"> · {sh.seconds}s</span> : null}</span>
                      <span style={{ display: "flex", gap: 10 }}>
                        <button type="button" className="s2p-shot-use" onClick={() => copy(`v2p-${idx}`, sh.body)}>{copied === `v2p-${idx}` ? "Copied" : "Copy"}</button>
                        {onUsePrompt ? <button type="button" className="s2p-shot-use" onClick={() => onUsePrompt("video", [sh], s.v2pResult.target)}>Use in Video Generation</button> : null}
                      </span>
                    </div>
                    <textarea className="s2p-shot-text" style={{ height: 220 }} value={sh.body} spellCheck={false} onChange={(e) => editV2pShot(idx, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </>
    );

    const askView = (
      <>
        <div className="card">
          <div className="video-hint" style={{ marginBottom: 14 }}>
            Ask a Seed vision-language model about images and video — describe, transcribe, break down shots, read text, compare, or reverse-engineer a prompt. Seed 2.0 Mini and Lite also hear the video's audio; Seed 2.0 Pro and Seed 2.1 Turbo see frames only.
          </div>
          {!configured ? <div className="error-box" style={{ marginBottom: 12 }}>No ARK API key configured. Add <code>ARK_API_KEY</code> to <code>.env</code> and restart.</div> : null}

          <div className="field-label">Model</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8, marginBottom: 16 }} role="radiogroup">
            {models.map((m) => {
              const on = m.id === model.id;
              return (
                <button key={m.id} type="button" role="radio" aria-checked={on} onClick={() => set({ model: m.id })}
                        style={{ textAlign: "left", padding: "10px 12px", borderRadius: 10, cursor: "pointer", font: "inherit",
                                 border: on ? "1px solid var(--accent)" : "0.5px solid var(--border-2)",
                                 background: on ? "rgba(37,99,235,0.06)" : "var(--surface)", color: "var(--text-primary)" }}>
                  <div style={{ fontWeight: 500 }}>{m.label}<span style={badge(m.audio)}>{m.audio ? "video + audio" : "frames only"}</span></div>
                  <div style={{ fontSize: 11.5, color: "var(--text-secondary)", marginTop: 2 }}>{m.note}</div>
                </button>
              );
            })}
          </div>

          <div className="field-label">Images and video <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>— up to {MAX_IMAGES} images and one video (≤ 512 MB)</span></div>
          <input ref={imgRef} type="file" className="sr-only" accept="image/*,video/*" multiple onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
          <input ref={videoRef} type="file" className="sr-only" accept="video/*" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
          {hasMedia ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8 }}
                 onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}>
              {s.video ? (
                <div style={{ ...tile, gridColumn: "span 2" }}>
                  <video src={s.video.url} controls playsInline style={{ width: "100%", height: 140, display: "block", objectFit: "contain" }} />
                  <button type="button" style={removeBtn} aria-label="Remove video" onClick={() => set({ video: null, thread: [] })}>×</button>
                </div>
              ) : null}
              {s.images.map((img, i) => (
                <div key={img.url + i} style={tile}>
                  <img src={img.url} alt={img.name || ""} style={{ width: "100%", height: 140, display: "block", objectFit: "cover" }} />
                  <span style={{ position: "absolute", left: 6, bottom: 6, background: "rgba(0,0,0,.6)", color: "#fff", fontSize: 10.5, borderRadius: 5, padding: "1px 5px" }}>Image {i + 1}</span>
                  <button type="button" style={removeBtn} aria-label={`Remove image ${i + 1}`} onClick={() => set((cur) => ({ images: cur.images.filter((_, j) => j !== i), thread: [] }))}>×</button>
                </div>
              ))}
              {s.images.length < MAX_IMAGES ? (
                <div className="upload-tile" role="button" tabIndex="0" style={{ minHeight: 140 }} onClick={() => imgRef.current.click()}>
                  <div className="tile-title">+ Add</div>
                  <div className="tile-meta">{s.video ? "images" : "images or a video"}</div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="upload-tile" role="button" tabIndex="0" style={{ minHeight: 140 }} onClick={() => imgRef.current.click()}
                 onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              <div className="tile-title">Upload images or a video</div>
              <div className="tile-meta">Drop files here · JPG, PNG, WebP · MP4, MOV</div>
            </div>
          )}
          {s.video && !model.audio ? (
            <div className="video-hint" style={{ color: "#B45309", marginTop: 8 }}>
              {model.label} sees the video's frames only. For speech, music or sound effects,{" "}
              <button type="button" className="btn-link" style={{ fontSize: "inherit" }} onClick={() => set({ model: models.find((m) => m.audio)?.id || model.id })}>switch to a model that hears audio</button>.
            </div>
          ) : null}

          {s.video ? (
            <div style={{ marginTop: 14 }}>
              <div className="field-label">Frame sampling — {Number(s.fps).toFixed(1)} fps</div>
              <input type="range" min="0.2" max="5" step="0.1" value={s.fps} onChange={(e) => set({ fps: Number(e.target.value), thread: [] })} style={{ width: "100%" }} aria-label="Frames per second" />
              <div className="video-hint">Higher catches fast action and exact timings; lower is faster and cheaper for long, slow clips.</div>
            </div>
          ) : null}

          <hr className="divider" />

          <div className="field-label">Question or instruction</div>
          <div className="sheet-chip-row" style={{ marginBottom: 8, flexWrap: "wrap" }}>
            {PRESETS.map((p) => {
              const off = (p.video && !s.video) || (p.audio && !(s.video && model.audio)) || (p.images && s.images.length < p.images);
              const why = p.video ? "Needs a video" : p.audio ? "Needs a video and a model that hears audio" : p.images ? `Needs ${p.images}+ images` : "";
              return (
                <button key={p.label} type="button" className="sheet-chip" disabled={off} title={off ? why : p.text}
                        style={off ? { opacity: 0.45, cursor: "not-allowed" } : null} onClick={() => set({ prompt: p.text })}>{p.label}</button>
              );
            })}
          </div>
          <textarea className="video-input" rows="4" value={s.prompt} onChange={(e) => set({ prompt: e.target.value })}
                    onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !busy) ask(s.prompt, false); }}
                    placeholder="e.g. What is the character wearing, and when do they first speak?" />

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
            <label className="sheet-chip checkbox-chip" data-checked={s.thinking ? "true" : "false"} style={{ height: 34 }}>
              <input type="checkbox" checked={s.thinking} onChange={(e) => set({ thinking: e.target.checked })} style={{ marginRight: 6 }} />
              Deep thinking
            </label>
            <span className="video-hint" style={{ margin: 0, flex: 1 }}>{s.thinking ? "Slower, better on reasoning and counting." : "Faster, for plain descriptions and transcripts."}</span>
            <button type="button" className="btn-primary" disabled={!hasMedia || !s.prompt.trim() || !!busy || !configured} onClick={() => ask(s.prompt, false)}>
              {busy && !s.thread.length ? "Analysing…" : "Analyse"}
            </button>
          </div>
          {error ? <div className="error-box" style={{ marginTop: 12 }}>{error}</div> : null}
          {busy ? <div className="video-hint pulse" style={{ marginTop: 12 }}>{busy}</div> : null}
        </div>

        {s.thread.length ? (
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div className="field-label" style={{ margin: 0, flex: 1 }}>Answer</div>
              <button type="button" className="btn-link" onClick={() => set({ thread: [] })}>Clear</button>
            </div>
            {s.thread.map((t, i) => {
              const m = models.find((x) => x.id === t.model);
              return (
                <div key={t.key} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 6 }}>
                    <strong style={{ color: "var(--text-primary)", fontWeight: 500 }}>{i ? "Follow-up: " : "Q: "}</strong>{t.q}
                  </div>
                  <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", background: "var(--surface-2)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "12px 14px", lineHeight: 1.6 }}>{t.a}</div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 6, fontSize: 11.5, color: "var(--text-secondary)" }}>
                    <span>{m?.label || t.model}{t.hadVideo ? (t.audio ? " · video + audio" : " · frames only") : ""} · {t.seconds}s{t.usage?.total_tokens ? ` · ${t.usage.total_tokens.toLocaleString()} tokens` : ""}</span>
                    <span style={{ flex: 1 }}></span>
                    {t.reasoning ? <details style={{ fontSize: 11.5 }}><summary style={{ cursor: "pointer" }}>Reasoning</summary><div style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>{t.reasoning}</div></details> : null}
                    <button type="button" className="btn-link" onClick={() => copy(t.key, t.a)}>{copied === t.key ? "Copied" : "Copy"}</button>
                  </div>
                </div>
              );
            })}
            {canFollowUp ? (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <textarea className="video-input" rows="2" style={{ flex: 1, minHeight: 0, height: 64 }} value={followUp} onChange={(e) => setFollowUp(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !busy) { e.preventDefault(); ask(followUp, true); } }}
                          placeholder="Ask a follow-up about the same media…" />
                <button type="button" className="btn-action" style={{ flex: "0 0 auto", width: 80, height: 40 }} disabled={!followUp.trim() || !!busy} onClick={() => ask(followUp, true)}>Ask</button>
              </div>
            ) : last ? <div className="video-hint">Model changed — press Analyse to start a new thread with {model.label}.</div> : null}
          </div>
        ) : null}
      </>
    );

    return (
      <>
        {tabs}
        {s.mode === "v2p" ? v2pView : askView}
      </>
    );
  }

  window.VisualUnderstanding = VisualUnderstanding;
  window.visualUnderstandingHeaderStatus = (st) => {
    const n = (st?.thread || []).length;
    if (st?.mode === "v2p" && st?.v2pResult) return "Video prompt ready";
    return n ? `${n} answer${n === 1 ? "" : "s"}` : "Image & video Q&A";
  };
})();
