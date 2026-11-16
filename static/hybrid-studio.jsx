/* hybrid-studio.jsx — Hybrid Studio: put the people from a green-screen video into a new location.
 *
 * Seedance 2.5 regenerates the video in video-editing mode: the green-screen clip is the
 * reference video (the performance and camera) and the background image is the reference for the
 * location. The result keeps the clip's length and aspect ratio; optionally the clip's original
 * audio is laid back over it. /api/hybrid/* handles checks, background plates and finishing;
 * /api/video/start runs the generation. State comes from props ({state, update}).
 */
(function () {
  "use strict";
  const { useState, useRef, useEffect } = React;

  // Both run Seedance 2.5 video editing; flash is ~2x faster and ~34% cheaper, 480p/720p only.
  const MODELS = [
    { id: "dreamina-seedance-2-5-260628", label: "Seedance 2.5", resolutions: ["480p", "720p", "1080p"], tenBit: ["1080p"] },
    { id: "dreamina-seedance-2-5-flash-261115", label: "Seedance 2.5 flash", resolutions: ["480p", "720p"] },
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
  async function toDataUrl(url) { return readDataUrl(await (await fetch(url)).blob()); }
  async function uploadFile(file) {
    if (/^image\//.test(file.type)) return (await post("/api/seedream/save-image", { data_url: await readDataUrl(file), hint: "hybrid-bg" })).url;
    return (await post("/api/video/upload_local", { video_data_url: await readDataUrl(file), filename: file.name })).file_url;
  }
  function fmt(sec) { return sec ? `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}` : "0:00"; }

  // The instruction Seedance receives. Reference video = the performance; reference image = the place.
  function buildPrompt(screen, direction) {
    return [
      `Video editing. Replace the ${screen || "green"}-screen background of the reference video with the location shown in the reference image.`,
      "Keep every person exactly as in the reference video: the same face, hair, clothes and body, and every movement, gesture, expression, lip movement and their timing; keep the camera framing and movement.",
      "Place them naturally inside the location from the reference image: light them with that location's light sources (direction, colour and softness), add natural contact shadows and reflections, and match focus, depth of field and film grain so they look filmed there.",
      `Remove every trace of the ${screen || "green"} screen and its colour spill.`,
      direction && direction.trim() ? `Direction: ${direction.trim()}` : "",
      "No text.",
    ].filter(Boolean).join(" ");
  }

  function HybridStudio({ state, update }) {
    const defaults = { video: null, info: null, bg: null, bgPrompt: "", bgModel: "pro", direction: "", model: MODELS[0].id, resolution: "720p",
                       keepAudio: true, prompt: "", promptEdited: false, runs: [] };
    const s = Object.assign({}, defaults, state || {});
    const set = (patch) => update((prev) => Object.assign({}, defaults, prev || {}, typeof patch === "function" ? patch(Object.assign({}, defaults, prev || {})) : patch));
    const modelSpec = MODELS.find((m) => m.id === s.model) || MODELS[0];
    const patchRun = (id, p) => set((cur) => ({ runs: cur.runs.map((r) => (r.id === id ? Object.assign({}, r, p) : r)) }));
    const [busy, setBusy] = useState("");
    const [error, setError] = useState("");
    const [showPrompt, setShowPrompt] = useState(false);
    const videoRef = useRef(null), bgRef = useRef(null);
    const polling = useRef({});

    const prompt = s.promptEdited && s.prompt ? s.prompt : buildPrompt(s.info?.screen, s.direction);

    useEffect(() => { s.runs.forEach((r) => { if (r.status === "running" && r.taskId) poll(r.id, r.taskId, r.video, r.keepAudio); }); }, []); // eslint-disable-line

    async function pickVideo(file) {
      if (!file) return;
      setError(""); setBusy("Uploading the green-screen video…");
      try {
        const url = await uploadFile(file);
        setBusy("Checking the clip…");
        const info = await post("/api/hybrid/analyze", { video: url });
        set({ video: { url, name: file.name }, info });
      } catch (e) { setError(e.message); }
      setBusy("");
    }
    async function pickBackground(file) {
      if (!file) return;
      if (!/^image\//.test(file.type)) { setError("Use an image for the background."); return; }
      setError(""); setBusy("Uploading the background…");
      try { set({ bg: { url: await uploadFile(file), name: file.name } }); } catch (e) { setError(e.message); }
      setBusy("");
    }
    async function generateBackground() {
      if (!s.video) { setError("Add the green-screen video first — its frame is used to match the camera."); return; }
      if (!s.bgPrompt.trim()) { setError("Describe the background."); return; }
      setError(""); setBusy("Generating a background that matches the camera…");
      try {
        const d = await post("/api/hybrid/background", { video: s.video.url, description: s.bgPrompt, screen: s.info?.screen, model: s.bgModel });
        set({ bg: { url: d.url, name: "Generated background" } });
      } catch (e) { setError(e.message); }
      setBusy("");
    }

    async function poll(runId, taskId, video, keepAudio) {
      if (polling.current[taskId]) return;
      polling.current[taskId] = true;
      try {
        for (;;) {
          await new Promise((r) => setTimeout(r, 6000));
          const st = await post("/api/video/status", { task_id: taskId });
          const t = st.task || {};
          if (t.status === "succeeded") {
            patchRun(runId, { stage: "saving" });
            const fin = await post("/api/hybrid/finalize", { result: t.video_url || t.file_url, video: video, keep_audio: keepAudio });
            patchRun(runId, { status: "done", url: fin.url, audio: fin.audio, warning: fin.warning || "" });
            break;
          }
          if (t.status === "failed" || t.status === "cancelled" || t.status === "expired") throw new Error((t.error && t.error.message) || `Generation ${t.status}.`);
          patchRun(runId, { stage: t.status || "queued" });
        }
      } catch (e) { patchRun(runId, { status: "error", error: e.message }); }
      finally { delete polling.current[taskId]; }
    }

    async function generate() {
      setError("");
      const id = `r${Date.now().toString(36)}`;
      const run = { id, status: "running", stage: "uploading", video: s.video.url, videoName: s.video.name, bg: s.bg.url,
                    model: modelSpec.label, resolution: s.resolution, keepAudio: s.keepAudio, prompt, startedAt: Date.now() };
      set((cur) => ({ runs: [run].concat(cur.runs).slice(0, 12) }));
      try {
        const [vid, img] = await Promise.all([toDataUrl(s.video.url), toDataUrl(s.bg.url)]);
        patchRun(id, { stage: "starting" });
        const d = await post("/api/video/start", {
          content: prompt, model: modelSpec.id, videos: [vid], reference_images: [img], audios: [], variants: 1,
          // Video editing: the output follows the input clip's aspect ratio and length.
          config: { resolution: s.resolution, ratio: "adaptive", frames_per_second: 24, duration: -1 },
        });
        const taskId = (d.task_ids && d.task_ids[0]) || d.task_id;
        if (!taskId) throw new Error("No task was started.");
        patchRun(id, { taskId, stage: "queued" });
        poll(id, taskId, s.video.url, s.keepAudio);
      } catch (e) { patchRun(id, { status: "error", error: e.message }); }
    }

    const lengthBad = s.info && !s.info.length_ok;
    const running = s.runs.some((r) => r.status === "running");
    const step = (n, title, done) => (
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{ width: 24, height: 24, borderRadius: 12, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, background: done ? "var(--accent-2)" : "#EEF0F4", color: done ? "#fff" : "var(--text-secondary)" }}>{n}</span>
        <span style={{ fontWeight: 600, fontSize: 14 }}>{title}</span>
      </div>
    );
    const tile = { border: "0.5px solid var(--border-2)", borderRadius: 10, overflow: "hidden", background: "#000" };

    return (
      <>
        <div className="card">
          <div className="video-hint" style={{ marginBottom: 14 }}>
            Put the people from a green-screen video into a new location. Seedance 2.5 regenerates the video using the green-screen clip as the performance (faces, clothes, every movement, expression and lip movement, the camera) and your image as the place — re-lit, with shadows and reflections, so they look filmed there.
          </div>
          {error ? <div className="error-box" style={{ marginBottom: 12 }}>{error}</div> : null}
          {busy ? <div className="video-hint pulse" style={{ marginBottom: 12 }}>{busy}</div> : null}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 18 }}>
            <div>
              {step(1, "Green-screen video", !!s.video && !lengthBad)}
              <input ref={videoRef} type="file" className="sr-only" accept="video/*" onChange={(e) => { pickVideo(e.target.files[0]); e.target.value = ""; }} />
              {s.video ? (
                <div style={tile}>
                  <video src={s.video.url} controls muted playsInline style={{ width: "100%", display: "block", maxHeight: 230 }} />
                  <div style={{ background: "#fff", padding: "8px 10px", fontSize: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ width: 14, height: 14, borderRadius: 4, background: s.info?.key_color, border: "1px solid rgba(0,0,0,.15)" }} title="Detected screen colour"></span>
                    <span>{s.info?.screen} screen</span>
                    <span style={{ color: "var(--text-secondary)" }}>{s.info?.width}×{s.info?.height} · {fmt(s.info?.duration)}{s.info?.has_audio ? " · has audio" : ""}</span>
                    <span style={{ flex: 1 }}></span>
                    <button type="button" className="btn-link" onClick={() => videoRef.current.click()}>Replace</button>
                  </div>
                </div>
              ) : (
                <div className="upload-tile" role="button" tabIndex="0" style={{ minHeight: 160 }} onClick={() => videoRef.current.click()}
                     onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pickVideo(e.dataTransfer.files[0]); }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8Z"></path><rect x="2" y="6" width="14" height="12" rx="2"></rect></svg>
                  <div className="tile-title">Upload the green-screen video</div>
                  <div className="tile-meta">Green or blue screen · 4–30 seconds</div>
                </div>
              )}
              {lengthBad ? <div className="error-box" style={{ marginTop: 8 }}>{s.info.length_note}</div> : null}
              {s.info && !s.info.screen_found ? <div className="video-hint" style={{ color: "#B45309" }}>The frame edges don't look like a green or blue screen — it will still work if the background is plain.</div> : null}
            </div>

            <div>
              {step(2, "Background image", !!s.bg)}
              <input ref={bgRef} type="file" className="sr-only" accept="image/*" onChange={(e) => { pickBackground(e.target.files[0]); e.target.value = ""; }} />
              {s.bg ? (
                <div style={tile}>
                  <img src={s.bg.url} alt="" style={{ width: "100%", display: "block", maxHeight: 230, objectFit: "cover" }} />
                  <div style={{ background: "#fff", padding: "8px 10px", fontSize: 12, display: "flex", gap: 8 }}>
                    <span>{s.bg.name}</span><span style={{ flex: 1 }}></span>
                    <button type="button" className="btn-link" onClick={() => set({ bg: null })}>Change</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div className="upload-tile" role="button" tabIndex="0" style={{ minHeight: 70 }} onClick={() => bgRef.current.click()}
                       onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pickBackground(e.dataTransfer.files[0]); }}>
                    <div className="tile-title">Upload the background image</div>
                  </div>
                  <div style={{ textAlign: "center", fontSize: 11.5, color: "var(--text-secondary)" }}>or generate one that matches the clip's camera</div>
                  <textarea className="video-input" rows="3" value={s.bgPrompt} onChange={(e) => set({ bgPrompt: e.target.value })}
                            placeholder="e.g. A sunlit rooftop café in Lisbon at golden hour, terracotta roofs and the river behind" style={{ fontSize: 12.5 }} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <select className="select-input" style={{ width: 170 }} value={s.bgModel} onChange={(e) => set({ bgModel: e.target.value })}>
                      <option value="pro">Seedream 5.0 Pro</option><option value="flash">Seedream 5.0 Flash</option><option value="5.5">Seedream 5.5</option>
                    </select>
                    <button type="button" className="btn-action" style={{ flex: 1 }} disabled={!!busy || !s.video} onClick={generateBackground}>Generate background</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <hr className="divider" />
          {step(3, "Settings", false)}
          <div className="field-label">Extra direction <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>— optional</span></div>
          <textarea className="video-input" rows="2" value={s.direction} onChange={(e) => set({ direction: e.target.value, promptEdited: false })}
                    placeholder="e.g. warm evening light from the left, light breeze in her hair" style={{ fontSize: 12.5 }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginTop: 12, alignItems: "end" }}>
            <div>
              <div className="field-label">Model</div>
              <select className="select-input" value={modelSpec.id} onChange={(e) => {
                const next = MODELS.find((m) => m.id === e.target.value) || MODELS[0];
                set((cur) => ({ model: next.id, resolution: next.resolutions.includes(cur.resolution) ? cur.resolution : "720p" }));
              }}>
                {MODELS.map((m) => <option key={m.id} value={m.id}>{m.label} · video editing</option>)}
              </select>
            </div>
            <div>
              <div className="field-label">Resolution</div>
              <select className="select-input" value={s.resolution} onChange={(e) => set({ resolution: e.target.value })}>
                {modelSpec.resolutions.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="video-hint" style={{ gridColumn: "1 / -1", margin: 0 }}>
              Colour: SDR · {(modelSpec.tenBit || []).includes(s.resolution) ? "10-bit" : "8-bit"} · Rec.709 · MP4 YUV 4:2:0{modelSpec.tenBit && !modelSpec.tenBit.includes(s.resolution) ? " (2.5 is 10-bit at 1080p)" : ""}. No Seedance model outputs HDR; HDR delivery has to be done in post.
            </div>
            <label className="sheet-chip checkbox-chip" data-checked={s.keepAudio ? "true" : "false"} style={{ height: 40 }}>
              <input type="checkbox" checked={!!s.keepAudio} onChange={(e) => set({ keepAudio: e.target.checked })} />
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>
              Keep the original audio
            </label>
          </div>
          <div className="video-hint">Length and aspect ratio follow the green-screen clip.{s.keepAudio ? " The clip's own audio is laid back over the result, so speech stays exactly as recorded." : " Seedance generates new audio."}</div>
          <button type="button" className="btn-link" style={{ marginTop: 6 }} onClick={() => setShowPrompt(!showPrompt)}>{showPrompt ? "Hide the prompt" : "Show / edit the prompt"}</button>
          {showPrompt ? (
            <div style={{ marginTop: 6 }}>
              <textarea className="video-input" rows="6" value={prompt} onChange={(e) => set({ prompt: e.target.value, promptEdited: true })} style={{ fontSize: 12.5 }} />
              {s.promptEdited ? <button type="button" className="btn-link" onClick={() => set({ promptEdited: false, prompt: "" })}>Reset to the automatic prompt</button> : null}
            </div>
          ) : null}
          <div className="btn-row">
            <button type="button" className="btn-primary" disabled={!s.video || !s.bg || lengthBad || !!busy} onClick={generate}>
              {running ? "Generate another" : "Generate video"}
            </button>
          </div>
        </div>

        {s.runs.length ? (
          <div className="card">
            {step(4, "Results", s.runs.some((r) => r.status === "done"))}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {s.runs.map((r) => (
                <div key={r.id} style={{ border: "0.5px solid var(--border-2)", borderRadius: 12, padding: 12 }}>
                  <div className="video-hint" style={{ margin: "0 0 8px" }}>
                    {r.videoName} · {r.model ? r.model + " · " : ""}{r.resolution} · {r.status === "running" ? `${r.stage || "running"}… (usually 2–5 minutes)` : r.status === "error" ? "failed" : r.audio === "original" ? "done · original audio" : "done · generated audio"}
                  </div>
                  {r.status === "error" ? <div className="error-box" style={{ margin: 0 }}>{r.error}</div> : null}
                  {r.status === "running" ? <div className="pulse" style={{ aspectRatio: "16 / 9", maxHeight: 220, borderRadius: 10, background: "#F4F4F6" }}></div> : null}
                  {r.status === "done" ? (
                    <>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div>
                          <div className="video-hint" style={{ margin: "0 0 4px" }}>Green-screen original</div>
                          <video src={r.video} controls muted playsInline style={{ width: "100%", borderRadius: 8, background: "#000", display: "block" }} />
                        </div>
                        <div>
                          <div className="video-hint" style={{ margin: "0 0 4px" }}>In the new location</div>
                          <video src={r.url} controls playsInline style={{ width: "100%", borderRadius: 8, background: "#000", display: "block" }} />
                        </div>
                      </div>
                      {r.warning ? <div className="video-hint" style={{ color: "#B45309" }}>{r.warning}</div> : null}
                      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                        <a className="btn-action btn-inline" href={r.url} download data-model={`Seedance ${r.model || ""}`.trim()} data-ext="mp4">Download</a>
                        <button type="button" className="btn-action btn-inline" onClick={() => window.dispatchEvent(new CustomEvent("cc-send-to-video", { detail: { video: r.url, name: "hybrid", done: () => {} } }))}>Use in Video Generation</button>
                      </div>
                    </>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </>
    );
  }

  window.HybridStudio = HybridStudio;
})();
