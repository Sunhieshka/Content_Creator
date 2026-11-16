// Blender 3D tool.
// Loaded before App (frontend/app.jsx); everything here is a page-wide global, as it was when it
// lived at the top of the app script.

// ---- Blender 3D ----
// Describe a scene -> Seed LLM writes a Blender (bpy) script -> Blender
// renders it headless to MP4. Same stateless pattern as SeedAudioStudio:
// renders `state`, writes through `update(fn)`; sidebar state is
// browser-local, project state lives in project.results.blender3d.
// Backend: content_creator/services/blender.py, /api/blender/*.
const BLENDER_TEMPLATES = [
  { name: "Product turntable", text: "A sleek matte-black wireless earbuds case with a glossy lid sits on a round white pedestal, slowly rotating 360 degrees over the full duration. Soft studio three-point lighting, light grey seamless backdrop, gentle reflections, camera slightly above eye level with a subtle slow push-in." },
  { name: "Logo reveal", text: "Bold 3D extruded text 'NOVA' in metallic gold rises from below while rotating into place, then holds front-facing. Dark navy background, a warm rim light sweeping across the letters, small glowing particles drifting upward, camera slowly dollying in." },
  { name: "Low-poly landscape", text: "A low-poly stylised landscape with rolling green hills, a few pine trees, and a calm blue lake at sunset. The camera flies slowly forward over the hills toward the lake. Warm orange sun low on the horizon, soft purple sky." },
  { name: "Motion graphics", text: "Abstract motion graphics: a grid of colourful glossy spheres and cubes bounces in a wave pattern, rippling from the centre outward, on a clean white floor. Pastel colours (coral, mint, lilac), soft shadows, top-down 45-degree camera slowly orbiting." },
  { name: "Isometric room", text: "An isometric cosy bedroom diorama cut away on two sides: a bed, a desk with a laptop and lamp, a bookshelf, a plant, and a rug. Warm lamp light glows on, a ceiling fan spins. Camera orbits the diorama slowly. Soft pastel palette." },
  { name: "Blockout (Seedance ref)", workflow: "character-blocking", text: "Two mannequins on a flat floor: A (red, 1.8 m) walks from the left to the centre and stops; B (blue, 1.7 m) turns to face A. Static eye-level wide shot." },
  // Seedance reference workflows (Awesome-Blender-Seedance-Workflow-Usecases).
  { name: "Push-in", workflow: "camera-blockout", text: "Grey-box café interior: a counter, three tables and a standing figure behind the counter. The camera starts wide at the door and slowly pushes in to a medium shot of the figure over the full duration, with a light handheld shake." },
  { name: "Orbit", workflow: "camera-blockout", text: "A figure stands on a low round plinth in an empty grey-box hall with four tall pillars. The camera orbits 180 degrees around the figure at chest height, constant speed." },
  { name: "Crane reveal", workflow: "camera-blockout", text: "A figure stands at the start of a grey-box city street lined with blocky buildings. The camera starts low behind the figure and cranes up and back, tilting down to reveal the whole street." },
  { name: "Chase", workflow: "character-blocking", text: "Rooftop chase: a red runner sprints along a lane, vaults a low wall and swerves around a vent block; a blue pursuer follows two seconds behind. Camera tracks alongside at hip height with handheld shake." },
  { name: "Dialogue", workflow: "character-blocking", text: "Two people talk across a small table: A (red, 1.8 m) gestures while speaking, then B (blue, 1.68 m) leans in and answers with a hand gesture. The camera arcs slowly from over A's shoulder to a side two-shot." },
  { name: "Ambush", workflow: "character-blocking", text: "Three blue figures walk down an alley in a line; at the halfway point two red figures step out from behind crates on both sides and raise their arms to aim. Camera low and behind the blue group, pushing forward." },
  { name: "Stage A/B/C", workflow: "marker-stage", text: "Marker stage for a three-person scene: A stands front-left facing B, B stands at the back centre facing the camera, C stands front-right facing A. Slow high-angle camera drift from left to right." },
  { name: "Proxy layout", workflow: "proxy-layout", text: "A market street: two rows of stall blocks, four people as coloured blocks walking between them, one vehicle-sized block driving slowly across the far end. High wide static camera." },
  { name: "4 cuts", workflow: "multi-cut", text: "A fighter walks forward and throws a punch at a standing dummy. Four hard cuts at equal intervals: wide establishing, low angle, close-up on the fist, overhead." },
  { name: "Focus pull", workflow: "focus-pull", text: "A figure in the foreground on the left, a second figure far in the background on the right. Focus starts on the foreground figure, then racks to the background figure halfway through." },
  { name: "Dance", workflow: "choreography", text: "One mannequin dances a 2-step groove: bounce on every beat, alternating arm swings, a hip twist each bar and a full turn every 4 seconds. Front camera, slow small arc." },
  { name: "Clay city", workflow: "clay-pass", text: "A clay city block: simple buildings with window rows, street lamps, two parked cars and a figure walking along the pavement. The camera flies slowly down the street at first-floor height." },
];
const BLENDER_ENGINES = [
  { id: "eevee", label: "EEVEE (fast, good look)" },
  { id: "cycles", label: "Cycles (slow, photoreal)" },
  { id: "workbench", label: "Workbench (fastest, clay preview)" },
];

function defaultBlenderState() {
  return {
    description: BLENDER_TEMPLATES[0].text,
    script: "",
    settings: { engine: "eevee", aspect: "16:9", resolution: "720p", fps: 24, duration: 5, samples: 64, workflow: "scene", black_frames: { enabled: false, every: 0.5, hold: 0.125 } },
    autoFix: true,
    renders: [],
  };
}

function blenderHeaderStatus(state) {
  const renders = (state && state.renders) || [];
  if (renders.some((r) => r.status === "queued" || r.status === "running")) return "Rendering…";
  const done = renders.filter((r) => r.status === "done" && r.kind === "video").length;
  if (done) return `${done} video${done !== 1 ? "s" : ""}`;
  return (state && state.script) ? "Script ready" : "Ready";
}

async function blenderPost(path, body) {
  const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

let blenderCapsPromise = null;

// Blender clip -> Video Generation: reference video (@Video1), start frame as a
// reference image, Seedance prompt template if the prompt is empty. Handled in App.
function sendBlenderClipToVideo({ videoUrl, posterUrl, name, prompt }) {
  return new Promise((resolve, reject) => {
    window.dispatchEvent(new CustomEvent("cc-blender-to-video", { detail: { videoUrl, posterUrl, name, prompt, done: (err) => (err ? reject(err) : resolve()) } }));
  });
}
window.sendBlenderClipToVideo = sendBlenderClipToVideo;

function BlenderStudio({ state, update }) {
  const s = { ...defaultBlenderState(), ...(state || {}) };
  s.settings = { ...defaultBlenderState().settings, ...(s.settings || {}) };
  const set = (patch) => update((prev) => {
    const base = { ...defaultBlenderState(), ...(prev || {}) };
    return { ...base, ...(typeof patch === "function" ? patch(base) : patch) };
  });
  const setSetting = (key, value) => set((prev) => ({ settings: { ...defaultBlenderState().settings, ...(prev.settings || {}), [key]: value } }));
  const [caps, setCaps] = useState(null);
  const [capsError, setCapsError] = useState("");
  const [writing, setWriting] = useState(false);
  const [writeError, setWriteError] = useState("");
  const [openLog, setOpenLog] = useState(null);
  const [notice, setNotice] = useState("");
  const workflows = caps?.workflows || [];
  const workflow = workflows.find((w) => w.id === s.settings.workflow) || workflows[0] || { id: "scene", label: "Free 3D scene", blurb: "", cases: [], seedance: "" };
  const templates = BLENDER_TEMPLATES.filter((t) => (t.workflow || "scene") === workflow.id);

  function chooseWorkflow(w) {
    const first = BLENDER_TEMPLATES.find((t) => (t.workflow || "scene") === w.id);
    set((prev) => ({
      settings: { ...defaultBlenderState().settings, ...(prev.settings || {}), workflow: w.id, ...(w.defaults || {}) },
      description: first ? first.text : prev.description,
      script: "",
    }));
  }

  async function sendToVideo(r) {
    setNotice("Adding to Video Generation…");
    try {
      await sendBlenderClipToVideo({ videoUrl: r.videoUrl, posterUrl: r.posterUrl, name: `blender-${r.id}`, prompt: r.seedancePrompt });
      setNotice("");
    } catch (e) {
      setNotice(String(e?.message || e));
    }
  }

  useEffect(() => {
    if (!blenderCapsPromise) blenderCapsPromise = blenderPost("/api/blender/capabilities").catch((e) => { blenderCapsPromise = null; throw e; });
    blenderCapsPromise.then(setCaps).catch((e) => setCapsError(String(e?.message || e)));
  }, []);

  // Poll unfinished render jobs. The server keeps jobs in memory, so this
  // also resumes after switching tools or reloading the page.
  const pendingIds = s.renders.filter((r) => r.status === "queued" || r.status === "running").map((r) => r.id).join(",");
  useEffect(() => {
    if (!pendingIds) return undefined;
    const write = update;
    let stopped = false;
    const tick = async () => {
      for (const id of pendingIds.split(",")) {
        let job;
        try {
          job = await blenderPost("/api/blender/status", { job_id: id });
        } catch (e) {
          job = { status: "error", stage: "Failed", error: String(e?.message || e) };
        }
        if (stopped) return;
        write((prev) => {
          const base = { ...defaultBlenderState(), ...(prev || {}) };
          const finished = job.status === "done" || job.status === "error";
          return {
            ...base,
            // Show the script the job wrote (or fixed) once it's known.
            script: finished && job.script && (!base.script.trim() || job.fixed) ? job.script : base.script,
            renders: base.renders.map((r) => (r.id !== id ? r : {
              ...r,
              status: job.status,
              stage: job.stage,
              progress: job.progress || 0,
              framesDone: job.frames_done || 0,
              framesTotal: job.frames_total || r.framesTotal,
              videoUrl: job.video_url || r.videoUrl || "",
              imageUrl: job.image_url || r.imageUrl || "",
              posterUrl: job.poster_url || r.posterUrl || "",
              seedancePrompt: job.seedance_prompt || r.seedancePrompt || "",
              error: job.error || "",
              log: job.log || r.log || "",
              script: job.script || r.script,
              fixed: !!job.fixed,
            })),
          };
        });
      }
    };
    tick();
    const timer = setInterval(tick, 2000);
    return () => { stopped = true; clearInterval(timer); };
  }, [pendingIds]);

  async function writeScript() {
    setWriting(true);
    setWriteError("");
    try {
      const data = await blenderPost("/api/blender/write-script", { description: s.description, settings: s.settings });
      set({ script: data.script });
    } catch (e) {
      setWriteError(String(e?.message || e));
    } finally {
      setWriting(false);
    }
  }

  async function fixWithAi(render) {
    setWriting(true);
    setWriteError("");
    try {
      const data = await blenderPost("/api/blender/write-script", { script: render.script || s.script, log: render.log || render.error, workflow: (render.settings || s.settings).workflow });
      set({ script: data.script });
    } catch (e) {
      setWriteError(String(e?.message || e));
    } finally {
      setWriting(false);
    }
  }

  async function startRender(kind) {
    const write = update;
    try {
      const data = await blenderPost("/api/blender/render", {
        description: s.description,
        script: s.script,
        settings: s.settings,
        kind,
        auto_fix: s.autoFix,
      });
      const entry = {
        id: data.job_id,
        kind,
        status: "queued",
        stage: s.script.trim() ? "Queued" : "Writing Blender script (Seed LLM)",
        progress: 0,
        framesDone: 0,
        framesTotal: kind === "preview" ? 1 : Math.round(s.settings.duration * s.settings.fps),
        description: s.description,
        settings: s.settings,
        script: s.script,
        createdAt: Date.now(),
      };
      write((prev) => {
        const base = { ...defaultBlenderState(), ...(prev || {}) };
        return { ...base, renders: [entry, ...base.renders] };
      });
    } catch (e) {
      setWriteError(String(e?.message || e));
    }
  }

  const busy = s.renders.some((r) => r.status === "queued" || r.status === "running");
  const frames = Math.round(s.settings.duration * s.settings.fps);
  const unavailable = caps && !caps.available;

  return (
    <div className="card">
      <div className="video-hint" style={{ marginBottom: 12 }}>
        Describe a 3D scene; Seed LLM writes a Blender script and Blender renders it to MP4 on this machine.
        {caps?.available ? ` Blender ${caps.version || ""} detected.` : ""}
      </div>
      {capsError ? <div className="error-box" style={{ marginBottom: 12 }}>Blender backend unavailable ({capsError}). Restart the app server.</div> : null}
      {unavailable ? (
        <div className="error-box" style={{ marginBottom: 12 }}>
          Blender is not installed. Run <code>brew install --cask blender</code> (or set <code>BLENDER_PATH</code> in <code>.env</code>), then restart the app.
        </div>
      ) : null}

      <div className="field-label">Workflow</div>
      <div className="tabs" style={{ flexWrap: "wrap" }}>
        {workflows.map((w) => (
          <button key={w.id} className={"tab-btn" + (w.id === workflow.id ? " active" : "")} onClick={() => chooseWorkflow(w)}>{w.label}</button>
        ))}
      </div>
      {workflow.blurb ? (
        <div className="video-hint" style={{ margin: "6px 0 10px" }}>
          {workflow.blurb}
          {workflow.cases && workflow.cases.length ? ` From Blender + Seedance cases ${workflow.cases.join(", ")}.` : ""}
          {workflow.id !== "scene" ? " The result is a Seedance motion reference: send it to Video Generation, where it becomes @Video1." : ""}
        </div>
      ) : null}

      <div className="field-label">Scene description</div>
      <div className="tabs">
        {templates.map((t) => (
          <button key={t.name} className="tab-btn" onClick={() => set({ description: t.text, script: "" })}>{t.name}</button>
        ))}
      </div>
      <textarea
        className="video-input"
        rows="5"
        value={s.description}
        onChange={(e) => set({ description: e.target.value })}
        placeholder="Describe the objects, materials, lighting, camera move and animation…"
      />

      <hr className="divider" />
      <div className="field-label">Render settings</div>
      <div className="config-grid" style={{ marginTop: 0 }}>
        <div>
          <div className="field-label">Engine</div>
          <select className="select-input" value={s.settings.engine} onChange={(e) => setSetting("engine", e.target.value)}>
            {BLENDER_ENGINES.map((en) => <option key={en.id} value={en.id}>{en.label}</option>)}
          </select>
        </div>
        <div>
          <div className="field-label">Aspect ratio</div>
          <select className="select-input" value={s.settings.aspect} onChange={(e) => setSetting("aspect", e.target.value)}>
            {["16:9", "9:16", "1:1", "4:3"].map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <div className="field-label">Resolution</div>
          <select className="select-input" value={s.settings.resolution} onChange={(e) => setSetting("resolution", e.target.value)}>
            {["480p", "720p", "1080p"].map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <div className="field-label">Frame rate</div>
          <select className="select-input" value={String(s.settings.fps)} onChange={(e) => setSetting("fps", Number(e.target.value))}>
            {[24, 25, 30].map((f) => <option key={f} value={f}>{f} fps</option>)}
          </select>
        </div>
        <div>
          <div className="field-label">Duration</div>
          <select className="select-input" value={String(s.settings.duration)} onChange={(e) => setSetting("duration", Number(e.target.value))}>
            {[2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 30].map((d) => <option key={d} value={d}>{d}s</option>)}
          </select>
        </div>
        {s.settings.engine === "cycles" ? (
          <div>
            <div className="field-label">Cycles samples</div>
            <select className="select-input" value={String(s.settings.samples)} onChange={(e) => setSetting("samples", Number(e.target.value))}>
              {[16, 32, 64, 128, 256].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        ) : null}
      </div>
      <div className="video-hint" style={{ marginTop: 6 }}>
        {frames} frames. Changing duration or frame rate after writing the script is fine — scripts animate over the whole frame range.
        {s.settings.engine === "cycles" ? " Cycles is much slower; try a preview frame first." : ""}
      </div>
      <label className="sheet-chip checkbox-chip" data-checked={s.settings.black_frames?.enabled ? "true" : "false"} style={{ marginTop: 10 }}>
        <input type="checkbox" checked={!!s.settings.black_frames?.enabled} onChange={() => setSetting("black_frames", { ...(s.settings.black_frames || {}), enabled: !s.settings.black_frames?.enabled })} />
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>
        Keyframe + black frames
      </label>
      {s.settings.black_frames?.enabled ? (
        <div className="config-grid" style={{ marginTop: 6 }}>
          <div>
            <div className="field-label">Key pose every</div>
            <select className="select-input" value={String(s.settings.black_frames.every)} onChange={(e) => setSetting("black_frames", { ...s.settings.black_frames, every: Number(e.target.value) })}>
              {[0.25, 0.5, 0.75, 1, 1.5, 2].map((v) => <option key={v} value={v}>{v}s</option>)}
            </select>
          </div>
          <div>
            <div className="field-label">Show key pose for</div>
            <select className="select-input" value={String(s.settings.black_frames.hold)} onChange={(e) => setSetting("black_frames", { ...s.settings.black_frames, hold: Number(e.target.value) })}>
              {[0.042, 0.083, 0.125, 0.25, 0.5].map((v) => <option key={v} value={v}>{v < 0.1 ? `${Math.round(v * s.settings.fps)} frame${Math.round(v * s.settings.fps) === 1 ? "" : "s"}` : `${v}s`}</option>)}
            </select>
          </div>
        </div>
      ) : null}
      <div className="video-hint" style={{ marginTop: 4 }}>
        Case 31: when Seedance copies the rough in-between motion too literally, keep only the key poses and black out the frames between them.
      </div>

      <hr className="divider" />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div className="field-label" style={{ margin: 0 }}>Blender script</div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn-action btn-inline" disabled={writing || !s.description.trim()} onClick={writeScript}>
            {writing ? "Writing…" : s.script ? "Rewrite with AI" : "Write script with AI"}
          </button>
          {s.script ? <button className="btn-action btn-inline" onClick={() => set({ script: "" })}>Clear</button> : null}
        </div>
      </div>
      <div className="video-hint" style={{ margin: "4px 0 8px" }}>
        Optional: leave empty and Render writes it for you. Edit freely — the app adds render settings after it. The script runs locally in Blender with full access to this machine, so only run code you trust.
      </div>
      <textarea
        className="video-input"
        rows={s.script ? 14 : 4}
        style={{ fontFamily: "var(--mono)", fontSize: 12 }}
        value={s.script}
        onChange={(e) => set({ script: e.target.value })}
        placeholder="import bpy, math, mathutils&#10;# The AI-written scene script appears here…"
        spellCheck={false}
      />
      {writeError ? <div className="error-box" style={{ marginTop: 8 }}>{writeError}</div> : null}
      <label className="sheet-chip checkbox-chip" data-checked={s.autoFix ? "true" : "false"} style={{ marginTop: 10 }}>
        <input type="checkbox" checked={!!s.autoFix} onChange={() => set((prev) => ({ autoFix: !prev.autoFix }))} />
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>
        If the script errors, let AI fix it and re-render once
      </label>

      <div className="btn-row">
        <button className="btn-ghost" style={{ flex: "0 0 auto", width: "auto" }} disabled={busy || unavailable || (!s.script.trim() && !s.description.trim())} onClick={() => startRender("preview")}>
          Preview frame
        </button>
        <button className="btn-primary" disabled={busy || unavailable || (!s.script.trim() && !s.description.trim())} onClick={() => startRender("video")}>
          {busy ? "Rendering…" : "Render video"}
        </button>
      </div>

      {workflow.id !== "scene" && caps?.seedance_tips?.length ? (
        <details style={{ marginTop: 10 }}>
          <summary className="video-hint" style={{ cursor: "pointer" }}>Tips for using Blender references in Seedance</summary>
          <ul className="video-hint" style={{ margin: "6px 0 0 16px" }}>{caps.seedance_tips.map((t) => <li key={t}>{t}</li>)}</ul>
        </details>
      ) : null}

      <hr className="divider" />
      {notice ? <div className="video-hint" style={{ marginBottom: 6 }}>{notice}</div> : null}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="field-label" style={{ margin: 0 }}>Renders</div>
        {s.renders.some((r) => r.status === "done" || r.status === "error") ? (
          <button className="btn-action btn-inline" onClick={() => set((prev) => ({ renders: prev.renders.filter((r) => r.status === "queued" || r.status === "running") }))}>Clear finished</button>
        ) : null}
      </div>
      {s.renders.length === 0 ? <div className="video-hint" style={{ marginTop: 6 }}>Rendered videos and preview frames appear here.</div> : null}
      <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
        {s.renders.map((r) => {
          const live = r.status === "queued" || r.status === "running";
          const pct = Math.round((r.progress || 0) * 100);
          return (
            <div key={r.id} className="ag-card" style={{ marginBottom: 0 }}>
              <div className="ag-header">
                <div style={{ minWidth: 0 }}>
                  <div className="ag-title">
                    {r.kind === "preview" ? "Preview frame" : "Video"}
                    <span className="ag-count" style={{ marginLeft: 8 }}>
                      {live ? `${r.stage || "Working"}${r.kind === "video" && r.framesDone ? ` · ${r.framesDone}/${r.framesTotal} frames (${pct}%)` : ""}` : null}
                      {r.status === "done" ? "Done" : null}
                      {r.status === "error" ? "Failed" : null}
                      {r.fixed ? " · script auto-fixed" : ""}
                      {r.settings ? ` · ${r.settings.engine} · ${r.settings.resolution} ${r.settings.aspect} · ${r.settings.duration}s @ ${r.settings.fps}fps` : ""}
                    </span>
                  </div>
                  <div className="ag-count">{(r.description || "").length > 160 ? `${r.description.slice(0, 160)}…` : r.description}</div>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {!live && r.script && r.script !== s.script ? (
                    <button className="btn-action btn-inline" title="Put this render's script back in the editor" onClick={() => set({ script: r.script })}>Load script</button>
                  ) : null}
                  {r.log ? <button className="btn-action btn-inline" onClick={() => setOpenLog(openLog === r.id ? null : r.id)}>Log</button> : null}
                  {!live ? <button className="ag-btn-delete" onClick={() => set((prev) => ({ renders: prev.renders.filter((x) => x.id !== r.id) }))}>Remove</button> : null}
                </div>
              </div>
              <div className="ag-body">
              {live && r.kind === "video" ? (
                <div style={{ height: 4, background: "var(--surface-2)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, var(--accent), var(--accent-2))", transition: "width .4s" }} />
                </div>
              ) : null}
              {r.status === "error" ? (
                <>
                  <div className="error-box" style={{ marginTop: 0 }}>{r.error || "Render failed."}</div>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                    <button className="btn-action btn-inline" disabled={writing || !(r.script || s.script)} onClick={() => fixWithAi(r)}>{writing ? "Fixing…" : "Fix script with AI"}</button>
                  </div>
                </>
              ) : null}
              {r.videoUrl ? (
                <div className="video-wrap" style={{ marginTop: 0 }}>
                  <video className="video-player" controls loop src={r.videoUrl} />
                  <div className="result-footer" style={{ flexWrap: "wrap", gap: 6 }}>
                    <a className="btn-action btn-inline" href={r.videoUrl} download data-model="Blender" data-ext="mp4" style={{ textDecoration: "none" }}>Download video</a>
                    {r.posterUrl ? <a className="btn-action btn-inline" href={r.posterUrl} download data-model="Blender Start Frame" data-ext="png" style={{ textDecoration: "none" }} title="First frame: turn it into a realistic start frame (Seedream) for Seedance">Start frame</a> : null}
                    <button className="btn-action btn-inline" onClick={() => sendToVideo(r)}>Send to Video Generation</button>
                  </div>
                  {r.seedancePrompt ? (
                    <details style={{ marginTop: 6 }}>
                      <summary className="ag-count" style={{ cursor: "pointer" }}>Seedance prompt for this reference</summary>
                      <pre className="text-overlay-prompt-text" style={{ whiteSpace: "pre-wrap", fontSize: 12, marginTop: 6 }}>{r.seedancePrompt}</pre>
                      <button className="btn-action btn-inline" onClick={() => navigator.clipboard && navigator.clipboard.writeText(r.seedancePrompt)}>Copy</button>
                    </details>
                  ) : null}
                </div>
              ) : null}
              {r.imageUrl ? (
                <div>
                  <img src={r.imageUrl} alt="Blender preview frame" className="text-overlay-img" style={{ maxHeight: 360, objectFit: "contain", background: "#000", width: "100%" }} />
                  <div className="result-footer">
                    <a className="btn-action btn-inline" href={r.imageUrl} download data-model="Blender Preview" data-ext="png" style={{ textDecoration: "none" }}>Download frame</a>
                  </div>
                </div>
              ) : null}
              {live && r.kind !== "video" ? <div className="video-hint" style={{ marginTop: 0 }}>{r.stage || "Working…"}</div> : null}
              {openLog === r.id ? (
                <pre className="text-overlay-prompt-text" style={{ marginTop: 8, maxHeight: 300, overflow: "auto", whiteSpace: "pre-wrap", fontSize: 11 }}>{r.log}</pre>
              ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
