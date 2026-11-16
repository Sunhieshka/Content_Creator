/* film-tools.jsx — pre-production tools ported from FilmAgent.
 *
 *   window.CharacterMasking     — people in a frame → flat colour silhouettes (blue, green,
 *                                 yellow, red, purple, left to right) for blocking plates.
 *   window.LocationVariations   — one location → N coverage angles / states, edit-locked to
 *                                 the source so the architecture stays the same.
 *   window.PrevizTool           — scene text → blocking plan → top-down schematic →
 *                                 Seedance blockout animatic → a real shot prompt.
 *
 * Every step is one button press. State comes from props ({state, update}) so it lives in
 * the project, or in the browser for the sidebar tools. Backend: /api/film/*.
 */
(function () {
  "use strict";
  const { useState, useRef } = React;

  // ---------- shared helpers ----------
  function post(path, body) {
    return fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) })
      .then((r) => r.json().catch(() => ({})).then((d) => {
        if (!r.ok || d.error) throw new Error((d.error && (d.error.message || d.error)) || `HTTP ${r.status}`);
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
  async function uploadImage(file) {
    const d = await post("/api/seedream/save-image", { data_url: await readDataUrl(file), hint: "film" });
    return d.url;
  }
  async function toDataUrl(url) {
    if (!url || url.startsWith("data:")) return url;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Could not load ${url}`);
    return readDataUrl(await r.blob());
  }
  // Runs async jobs a few at a time.
  async function pool(items, limit, fn) {
    let i = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) { const k = i++; await fn(items[k], k); }
    });
    await Promise.all(workers);
  }
  function sendToVideo({ prompt, images, video, name }) {
    return new Promise((resolve, reject) => {
      window.dispatchEvent(new CustomEvent("cc-send-to-video", { detail: { prompt, images, video, name, done: (err) => (err ? reject(err) : resolve()) } }));
    });
  }
  function useStore(state, update, defaults) {
    const s = { ...defaults, ...(state || {}) };
    const set = (patch) => update((prev) => ({ ...defaults, ...(prev || {}), ...(typeof patch === "function" ? patch({ ...defaults, ...(prev || {}) }) : patch) }));
    return [s, set];
  }
  // Saves as "<project>-<image model>.<ext>" (window.ccDownload in frontend/index.html).
  function download(url) {
    window.ccDownload(url, window.__ccImageModel || "Seedream", "png");
  }

  const SILHOUETTE = [["Blue", "#2563EB"], ["Green", "#16A34A"], ["Yellow", "#EAB308"], ["Red", "#DC2626"], ["Purple", "#7C3AED"]];
  const BLOCK_HEX = { BLUE: "#2563EB", GREEN: "#16A34A", YELLOW: "#EAB308", RED: "#DC2626", PURPLE: "#7C3AED", ORANGE: "#EA580C" };

  function Label({ children, hint }) {
    return <div className="field-label" style={{ marginBottom: 6 }}>{children}{hint ? <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}> — {hint}</span> : null}</div>;
  }

  // The standard upload box (same look as every other tool).
  function UploadTiles({ id, label, images, onAdd, onRemove, max = 1, accept = "image/*" }) {
    const ref = useRef(null);
    const [busy, setBusy] = useState(false);
    async function add(files) {
      setBusy(true);
      try {
        const list = Array.from(files || []).filter((f) => (f.type || "").startsWith("image/")).slice(0, Math.max(0, max - images.length));
        const urls = [];
        for (const f of list) urls.push(await uploadImage(f));
        onAdd(urls);
      } finally { setBusy(false); }
    }
    return (
      <div className="tile-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}
           onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); add(e.dataTransfer.files); }}>
        <input ref={ref} id={id} type="file" className="sr-only" accept={accept} multiple={max > 1} onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
        {images.length < max ? (
          <div className="upload-tile" role="button" tabIndex="0" onClick={() => ref.current.click()}
               onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ref.current.click(); } }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="m3 16 5-5 4 4 5-6 4 5"></path></svg>
            <div className="tile-title">{busy ? "Uploading…" : label}</div>
            <div className="tile-meta">{images.length} / {max}</div>
          </div>
        ) : null}
        {images.map((u, i) => (
          <div key={u + i} style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: "0.5px solid var(--border-2)", minHeight: 92, background: "#F4F4F6" }}>
            <img src={u} alt="" style={{ width: "100%", height: "100%", maxHeight: 160, objectFit: "cover", display: "block" }} />
            <button type="button" aria-label="Remove image" onClick={() => onRemove(i)}
                    style={{ position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: 12, border: 0, background: "rgba(0,0,0,.6)", color: "#fff", cursor: "pointer" }}>×</button>
          </div>
        ))}
      </div>
    );
  }

  function ResultImage({ url, name, children }) {
    return (
      <div style={{ border: "0.5px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
        <a href={url} onClick={(e) => { e.preventDefault(); if (window.openImageViewer) window.openImageViewer(url); }} style={{ cursor: "zoom-in" }}><img src={url} alt={name || ""} style={{ width: "100%", display: "block", background: "#F4F4F6" }} /></a>
        <div style={{ padding: 10, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {name ? <span style={{ fontSize: 12.5, fontWeight: 600, flex: "1 1 100%" }}>{name}</span> : null}
          <button type="button" className="btn-action btn-inline" onClick={() => download(url)}>Download</button>
          {children}
        </div>
      </div>
    );
  }

  function Spinner({ text }) {
    return <span className="video-hint" style={{ margin: 0 }}>{text}</span>;
  }

  // =====================================================================
  // CHARACTER MASKING
  // =====================================================================
  function CharacterMasking({ state, update }) {
    const [s, set] = useStore(state, update, { images: [], targets: "", results: [] });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    async function run() {
      if (!s.images.length) { setError("Upload at least one image."); return; }
      setError(""); setBusy(true);
      const batch = s.images.map((src) => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, source: src, targets: s.targets, status: "running" }));
      set((p) => ({ results: [...batch, ...p.results].slice(0, 24) }));
      await pool(batch, 3, async (item) => {
        try {
          const d = await post("/api/film/mask", { image: item.source, targets: item.targets });
          set((p) => ({ results: p.results.map((r) => (r.id === item.id ? { ...r, status: "done", url: d.url } : r)) }));
        } catch (e) {
          set((p) => ({ results: p.results.map((r) => (r.id === item.id ? { ...r, status: "error", error: e.message } : r)) }));
        }
      });
      setBusy(false);
    }

    return (
      <>
        <div className="card">
          <div className="video-hint" style={{ marginBottom: 14 }}>
            Replaces people in a frame with flat colour silhouettes while the set, camera and light stay the same. Use the result as a blocking or staging reference: in a video prompt, bind each colour to a character.
          </div>
          <Label hint="optional — leave empty to mask every person">What to mask</Label>
          <textarea className="video-input" rows="3" value={s.targets} onChange={(e) => set({ targets: e.target.value })}
                    placeholder="e.g. the two men at the bar, but not the bartender" style={{ marginBottom: 14 }} />
          <Label hint="up to 8, each is masked separately">Images</Label>
          <UploadTiles id="cm-images" label="Images" max={8} images={s.images}
                       onAdd={(urls) => set((p) => ({ images: [...p.images, ...urls].slice(0, 8) }))}
                       onRemove={(i) => set((p) => ({ images: p.images.filter((_, k) => k !== i) }))} />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", margin: "14px 0" }}>
            <span className="field-label" style={{ margin: 0 }}>Colour order, left to right</span>
            {SILHOUETTE.map(([n, c]) => (
              <span key={n} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, padding: "3px 8px", borderRadius: 999, border: "0.5px solid var(--border-2)" }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: c }}></span>{n}
              </span>
            ))}
          </div>
          <div className="video-hint" style={{ marginBottom: 12 }}>Model: Seedream 5.0 Pro · image edit</div>
          {error ? <div className="error-box">{error}</div> : null}
          <button type="button" className="btn-primary" style={{ width: "100%" }} disabled={busy || !s.images.length} onClick={run}>
            {busy ? "Masking…" : `Mask ${s.images.length > 1 ? `${s.images.length} images` : "image"}`}
          </button>
        </div>

        {s.results.length ? (
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
              <div className="field-label" style={{ margin: 0, flex: 1 }}>Results</div>
              <button type="button" className="btn-action btn-inline" onClick={() => set({ results: [] })}>Clear</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {s.results.map((r) => (
                <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <div className="video-hint" style={{ margin: "0 0 4px" }}>Original</div>
                    <img src={r.source} alt="" style={{ width: "100%", borderRadius: 10, display: "block", border: "0.5px solid var(--border)" }} />
                  </div>
                  <div>
                    <div className="video-hint" style={{ margin: "0 0 4px" }}>Masked{r.targets ? ` · ${r.targets}` : ""}</div>
                    {r.status === "done" ? (
                      <ResultImage url={r.url}>
                        <button type="button" className="btn-action btn-inline" onClick={() => sendToVideo({ images: [r.url], name: "mask" })}>Use in Video Generation</button>
                      </ResultImage>
                    ) : r.status === "error" ? <div className="error-box">{r.error}</div> : <div style={{ aspectRatio: "16 / 9", borderRadius: 10, background: "#F4F4F6", display: "flex", alignItems: "center", justifyContent: "center" }}><Spinner text="Masking…" /></div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </>
    );
  }

  // =====================================================================
  // LOCATION VARIATIONS
  // =====================================================================
  // Several locations, each with its own direction, image and coverage; "Generate all" runs
  // them in parallel. Older single-location state is read as the first location.
  let locSeq = 0;
  const newLoc = (n, patch) => Object.assign({ id: `loc${Date.now().toString(36)}${(++locSeq).toString(36)}`, name: `Location ${n}`,
    images: [], direction: "", count: 4, source: "", anchor: false, items: [], stage: "", error: "" }, patch || {});

  function LocationVariations({ state, update }) {
    const raw = state || {};
    const legacy = !raw.locations && (raw.direction || (raw.images || []).length || (raw.items || []).length)
      ? [newLoc(1, { direction: raw.direction || "", images: raw.images || [], count: raw.count || 4, source: raw.source || "", anchor: !!raw.anchor, items: raw.items || [] })] : null;
    const locs = (raw.locations && raw.locations.length) ? raw.locations : (legacy || [newLoc(1)]);
    const setLocs = (fn) => update((prev) => {
      const p = prev || {};
      const cur = (p.locations && p.locations.length) ? p.locations : (legacy || [newLoc(1)]);
      return { locations: fn(cur) };
    });
    const patch = (id, pt) => setLocs((ls) => ls.map((l) => (l.id === id ? Object.assign({}, l, typeof pt === "function" ? pt(l) : pt) : l)));
    const patchItem = (locId, itemId, pt) => patch(locId, (l) => ({ items: l.items.map((x) => (x.id === itemId ? Object.assign({}, x, pt) : x)) }));
    const running = useRef({});

    // A stage left over from a reload is not running any more.
    React.useEffect(() => { setLocs((ls) => ls.map((l) => (l.stage && !running.current[l.id] ? Object.assign({}, l, { stage: "" }) : l))); }, []); // eslint-disable-line

    async function renderItems(loc, items, source) {
      await pool(items, 4, async (it) => {
        patchItem(loc.id, it.id, { status: "running", error: "" });
        try {
          const d = await post("/api/film/location/render", { source, instruction: it.prompt });
          patchItem(loc.id, it.id, { status: "done", url: d.url });
        } catch (e) { patchItem(loc.id, it.id, { status: "error", error: e.message }); }
      });
    }

    async function run(loc) {
      if (!loc.images.length && !loc.direction.trim()) { patch(loc.id, { error: "Upload a location image, or describe the location." }); return; }
      running.current[loc.id] = true;
      patch(loc.id, { error: "", stage: loc.images.length ? "Planning coverage…" : "Building the location plate, then planning…" });
      try {
        const d = await post("/api/film/location/plan", { image: loc.images[0] || "", direction: loc.direction, count: loc.count });
        const items = d.items.map((it, i) => Object.assign({}, it, { id: `${Date.now()}-${i}`, status: "queued" }));
        patch(loc.id, { source: d.source, anchor: !!d.anchor, items, stage: "Rendering variations…" });
        // The location plate is the location's reference in Long Duration (see frontend/app.jsx, cc-reference-ready).
        if (d.source) window.dispatchEvent(new CustomEvent("cc-reference-ready", { detail: { kind: "location", name: loc.name, url: d.source } }));
        await renderItems(loc, items, d.source);
      } catch (e) { patch(loc.id, { error: e.message }); }
      delete running.current[loc.id];
      patch(loc.id, { stage: "" });
    }

    const runnable = locs.filter((l) => !l.stage && (l.images.length || l.direction.trim()));
    const busy = locs.some((l) => l.stage);

    return (
      <>
        <div className="card">
          <div className="video-hint" style={{ marginBottom: 14 }}>
            Coverage of a location: new camera angles, times of day, weather or seasons. Each variation is an edit of the same source image, so the architecture and set dressing stay the same. With no image, the location is built from your description first. Add several locations and generate them all at once.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {locs.map((loc, i) => (
              <div key={loc.id} style={{ border: "0.5px solid var(--border-2)", borderRadius: 12, padding: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontWeight: 700, color: "var(--accent-2)", fontSize: 13 }}>{String(i + 1).padStart(2, "0")}</span>
                  <input className="video-input" style={{ height: 34, minHeight: 0, padding: "0 10px", fontWeight: 600, flex: 1 }} value={loc.name}
                         aria-label="Location name" onChange={(e) => patch(loc.id, { name: e.target.value })} />
                  <select className="select-input" style={{ width: 150, height: 34 }} value={loc.count} disabled={!!loc.stage}
                          onChange={(e) => patch(loc.id, { count: Number(e.target.value) })} aria-label="Number of variations">
                    {[2, 3, 4, 5, 6, 8].map((n) => <option key={n} value={n}>{n} variations</option>)}
                  </select>
                  {locs.length > 1 ? <button type="button" className="btn-action btn-inline" disabled={!!loc.stage} onClick={() => setLocs((ls) => ls.filter((x) => x.id !== loc.id))}>Remove</button> : null}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 200px", gap: 12 }}>
                  <div>
                    <Label hint="describe the place, and/or what to explore">Direction</Label>
                    <textarea className="video-input" rows="4" value={loc.direction} disabled={!!loc.stage} onChange={(e) => patch(loc.id, { direction: e.target.value })}
                              placeholder="e.g. A rain-soaked Mumbai chawl courtyard. Explore: a low wide, an aerial, golden hour, and night with lit windows" />
                  </div>
                  <div>
                    <Label hint="optional">Location image</Label>
                    <UploadTiles id={`lv-image-${loc.id}`} label="Location" max={1} images={loc.images}
                                 onAdd={(urls) => patch(loc.id, { images: urls.slice(0, 1) })} onRemove={() => patch(loc.id, { images: [] })} />
                  </div>
                </div>
                {loc.error ? <div className="error-box" style={{ marginTop: 10 }}>{loc.error}</div> : null}
                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10, marginTop: 10 }}>
                  {loc.stage ? <Spinner text={loc.stage} /> : null}
                  <button type="button" className="btn-action" disabled={!!loc.stage} onClick={() => run(loc)}>{loc.items.length ? "Generate again" : "Generate this one"}</button>
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="btn-action" style={{ marginTop: 12, width: "100%", borderStyle: "dashed" }} onClick={() => setLocs((ls) => ls.concat([newLoc(ls.length + 1)]))}>+ Add location</button>
          <div className="video-hint" style={{ margin: "14px 0 12px" }}>Models: Seed LLM plans the coverage · Seedream 5.0 Pro renders</div>
          <button type="button" className="btn-primary" style={{ width: "100%" }} disabled={!runnable.length} onClick={() => runnable.forEach(run)}>
            {busy && !runnable.length ? "Generating…" : runnable.length > 1 ? `Generate ${runnable.length} locations` : "Generate variations"}
          </button>
        </div>

        {locs.filter((l) => l.items.length).map((loc) => (
          <div className="card" key={`res-${loc.id}`}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 12, gap: 8 }}>
              <div className="field-label" style={{ margin: 0, flex: 1 }}>{loc.name} · coverage</div>
              <button type="button" className="btn-action btn-inline" disabled={!!loc.stage} onClick={() => renderItems(loc, loc.items.filter((x) => x.status !== "done"), loc.source)}>Render missing</button>
              <button type="button" className="btn-action btn-inline" onClick={() => patch(loc.id, { items: [], source: "" })}>Clear</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
              {loc.anchor && loc.source ? <ResultImage url={loc.source} name={`${loc.name} — plate (source)`} /> : null}
              {loc.items.map((it) => (
                <div key={it.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {it.status === "done" ? <ResultImage url={it.url} name={it.label}>
                    <button type="button" className="btn-action btn-inline" onClick={() => sendToVideo({ images: [it.url], name: it.label })}>Use in Video</button>
                  </ResultImage>
                    : <div style={{ aspectRatio: "16 / 9", borderRadius: 12, background: "#F4F4F6", display: "flex", alignItems: "center", justifyContent: "center", padding: 10, textAlign: "center" }}>
                        {it.status === "error" ? <span className="error-box" style={{ margin: 0 }}>{it.error}</span> : <Spinner text={it.status === "running" ? `Rendering ${it.label}…` : `${it.label} — queued`} />}
                      </div>}
                  <textarea className="video-input" rows="2" value={it.prompt} style={{ fontSize: 12.5 }}
                            onChange={(e) => patchItem(loc.id, it.id, { prompt: e.target.value })} />
                  <button type="button" className="btn-action btn-inline" disabled={it.status === "running"} onClick={() => renderItems(loc, [it], loc.source)}>Re-render with this instruction</button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </>
    );
  }

  // =====================================================================
  // PREVIZ
  // =====================================================================
  const ANIMATIC_MODELS = [["dreamina-seedance-2-5-260628", "Seedance 2.5"], ["dreamina-seedance-2-5-flash-261115", "Seedance 2.5 flash"], ["dreamina-seedance-2-0-260128", "Seedance 2.0"], ["dreamina-seedance-2-0-fast-260128", "Seedance 2.0 fast"]];

  function PrevizTool({ state, update }) {
    const [s, set] = useStore(state, update, {
      brief: "", camera: "", plan: null, schematic: "", schematicEdit: "", animaticPrompt: "",
      model: ANIMATIC_MODELS[0][0], resolution: "480p", animatic: "", cutPrompt: "",
    });
    const [busy, setBusy] = useState("");
    const [error, setError] = useState("");
    const plan = s.plan;
    const total = plan ? plan.shots.reduce((n, x) => n + (Number(x.seconds) || 0), 0) : 0;

    async function step(label, fn) {
      setError(""); setBusy(label);
      try { await fn(); } catch (e) { setError(e.message); }
      setBusy("");
    }
    const block = () => step("Blocking the scene…", async () => {
      const d = await post("/api/film/previz/plan", { brief: s.brief, camera: s.camera });
      const p = await post("/api/film/previz/animatic-prompt", { plan: d.plan });
      set({ plan: d.plan, schematic: "", animatic: "", cutPrompt: "", animaticPrompt: p.prompt });
    });
    const draw = () => step("Drawing the schematic…", async () => {
      const d = await post("/api/film/previz/schematic", { plan });
      const p = await post("/api/film/previz/animatic-prompt", { plan });
      set({ schematic: d.url, animatic: "", cutPrompt: "", animaticPrompt: p.prompt });
    });
    const editSchematic = () => step("Editing the schematic…", async () => {
      const d = await post("/api/film/previz/schematic-edit", { url: s.schematic, instruction: s.schematicEdit });
      set({ schematic: d.url, schematicEdit: "", animatic: "" });
    });
    const animate = () => step("Rendering the animatic…", async () => {
      const start = await post("/api/video/start", {
        content: s.animaticPrompt, model: s.model, reference_images: [await toDataUrl(s.schematic)], videos: [], audios: [], variants: 1,
        config: { resolution: s.resolution, ratio: "16:9", frames_per_second: 24, duration: Math.max(4, Math.min(15, total || 8)) },
      });
      const taskId = (start.task_ids && start.task_ids[0]) || start.task_id;
      if (!taskId) throw new Error("No video task was started.");
      for (;;) {
        await new Promise((r) => setTimeout(r, 4000));
        const st = await post("/api/video/status", { task_id: taskId });
        const t = st.task || {};
        setBusy(`Rendering the animatic · ${t.status || "queued"}`);
        if (t.status === "succeeded") { set({ animatic: t.video_url || t.file_url || "", cutPrompt: "" }); break; }
        if (t.status === "failed" || t.status === "cancelled") throw new Error((t.error && t.error.message) || "The animatic failed.");
      }
    });
    const writeCut = () => step("Watching the animatic…", async () => {
      const d = await post("/api/film/previz/cut-prompt", { video: s.animatic, plan });
      set({ cutPrompt: d.prompt });
    });
    const editPlan = (fn) => set((p) => ({ plan: fn(p.plan) }));
    const editShot = (i, patch) => editPlan((p) => ({ ...p, shots: p.shots.map((x, k) => (k === i ? { ...x, ...patch } : x)) }));

    const stepHead = (n, title, done) => (
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{ width: 24, height: 24, borderRadius: 12, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, background: done ? "var(--accent-2)" : "#EEF0F4", color: done ? "#fff" : "var(--text-secondary)" }}>{n}</span>
        <span style={{ fontWeight: 600, fontSize: 14 }}>{title}</span>
      </div>
    );

    return (
      <>
        <div className="card">
          {stepHead(1, "Describe the scene", !!plan)}
          <Label hint="who is there, where, and what happens">Scene</Label>
          <textarea className="video-input" rows="5" value={s.brief} onChange={(e) => set({ brief: e.target.value })} style={{ marginBottom: 12 }}
                    placeholder={"INT. TEA STALL - MORNING\nPriya pours chai behind the counter. Arjun walks in from the street, hesitates at the door, then crosses to the counter and orders. Priya slides a glass over; he sits on the bench by the window."} />
          <Label hint="optional">Camera preference</Label>
          <input className="video-input" style={{ height: 40, minHeight: 0, padding: "0 12px", marginBottom: 12 }} value={s.camera} onChange={(e) => set({ camera: e.target.value })} placeholder="e.g. handheld, stay on Arjun, end on a close-up" />
          <div className="video-hint" style={{ marginBottom: 12 }}>Model: Seed LLM plans the blocking · the whole cut is held to 15 s (one animatic)</div>
          <button type="button" className="btn-primary" style={{ width: "100%" }} disabled={!!busy || !s.brief.trim()} onClick={block}>{busy === "Blocking the scene…" ? busy : plan ? "Block again" : "Block the scene"}</button>
        </div>

        {plan ? (
          <div className="card">
            {stepHead(2, `Blocking plan · ${plan.shots.length} shots · ${total}s`, !!s.schematic)}
            {plan.scene ? <div style={{ fontSize: 13, marginBottom: 10 }}>{plan.scene}</div> : null}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginBottom: 12 }}>
              <div>
                <Label>Actors</Label>
                {plan.actors.map((a) => (
                  <div key={a.name} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5, marginBottom: 6 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 6, background: BLOCK_HEX[a.color] || "#999", marginTop: 3, flex: "none" }}></span>
                    <span><b>{a.name}</b> · {a.color.toLowerCase()}{a.start ? ` · starts ${a.start}` : ""}</span>
                  </div>
                ))}
              </div>
              <div>
                <Label>Set</Label>
                {plan.set.map((x) => <div key={x.name} style={{ fontSize: 12.5, marginBottom: 6 }}><b>{x.name}</b>{x.where ? ` · ${x.where}` : ""}</div>)}
              </div>
            </div>
            <Label hint="edit before drawing">Shots</Label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              {plan.shots.map((x, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "54px 1fr 70px", gap: 8, alignItems: "start", padding: 10, border: "0.5px solid var(--border)", borderRadius: 10 }}>
                  <div style={{ fontWeight: 600, fontSize: 12.5, paddingTop: 6 }}>CAM {i + 1}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <input className="video-input" style={{ height: 34, minHeight: 0, padding: "0 12px", fontSize: 12.5 }} value={[x.camera.from, x.camera.framing, x.camera.move].filter(Boolean).join(" · ")}
                           onChange={(e) => { const [from, framing, move] = e.target.value.split("·").map((t) => t.trim()); editShot(i, { camera: { from: from || "", framing: framing || "", move: move || "" } }); }} />
                    <textarea className="video-input" rows="2" style={{ fontSize: 12.5 }} value={x.action} onChange={(e) => editShot(i, { action: e.target.value })} />
                  </div>
                  <select className="select-input" style={{ height: 34, fontSize: 12.5 }} value={x.seconds} onChange={(e) => editShot(i, { seconds: Number(e.target.value) })}>
                    {Array.from({ length: 15 }, (_, k) => k + 1).map((n) => <option key={n} value={n}>{n}s</option>)}
                  </select>
                </div>
              ))}
            </div>
            {total > 15 ? <div className="error-box">The cut runs {total}s; one animatic renders at most 15s. Shorten some shots.</div> : null}
            <div className="video-hint" style={{ marginBottom: 12 }}>Model: Seedream 5.0 Pro draws the top-down floor plan</div>
            <button type="button" className="btn-primary" style={{ width: "100%" }} disabled={!!busy || total > 15} onClick={draw}>{busy === "Drawing the schematic…" ? busy : s.schematic ? "Redraw schematic" : "Draw schematic"}</button>
          </div>
        ) : null}

        {s.schematic ? (
          <div className="card">
            {stepHead(3, "Schematic → animatic", !!s.animatic)}
            <ResultImage url={s.schematic} name="Top-down schematic" />
            <div style={{ display: "flex", gap: 8, margin: "10px 0 14px" }}>
              <input className="video-input" style={{ height: 40, minHeight: 0, padding: "0 12px", flex: 1 }} value={s.schematicEdit} onChange={(e) => set({ schematicEdit: e.target.value })}
                     placeholder="Change the drawing, e.g. move the bench to the left wall; add CAM 3 behind the counter" />
              <button type="button" className="btn-action" disabled={!!busy || !s.schematicEdit.trim()} onClick={editSchematic}>{busy === "Editing the schematic…" ? "Editing…" : "Edit"}</button>
            </div>
            <Label hint="written from the plan; edit freely">Animatic prompt</Label>
            <textarea className="video-input" rows="6" style={{ fontSize: 12.5, marginBottom: 12 }} value={s.animaticPrompt} onChange={(e) => set({ animaticPrompt: e.target.value })} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 12 }}>
              <div><Label>Video model</Label>
                <select className="select-input" value={s.model} onChange={(e) => set({ model: e.target.value })}>{ANIMATIC_MODELS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select></div>
              <div><Label>Resolution</Label>
                <select className="select-input" value={s.resolution} onChange={(e) => set({ resolution: e.target.value })}><option>480p</option><option>720p</option></select></div>
              <div><Label>Length</Label><div className="video-input" style={{ height: 40, display: "flex", alignItems: "center" }}>{Math.max(4, Math.min(15, total || 8))} s · 16:9</div></div>
            </div>
            <button type="button" className="btn-primary" style={{ width: "100%" }} disabled={!!busy} onClick={animate}>{busy.startsWith("Rendering the animatic") ? busy : s.animatic ? "Render animatic again" : "Render animatic"}</button>
          </div>
        ) : null}

        {s.animatic ? (
          <div className="card">
            {stepHead(4, "Animatic → shot prompt", !!s.cutPrompt)}
            <video src={s.animatic} controls playsInline style={{ width: "100%", borderRadius: 12, background: "#000", display: "block", marginBottom: 12 }} />
            <div className="video-hint" style={{ marginBottom: 12 }}>The Seed LLM watches the animatic and writes the real scene: people instead of blocks, with the same moves, cameras and cuts. Send it to Video Generation with the animatic as the motion reference.</div>
            <button type="button" className="btn-primary" style={{ width: "100%", marginBottom: 12 }} disabled={!!busy} onClick={writeCut}>{busy === "Watching the animatic…" ? busy : s.cutPrompt ? "Write it again" : "Write shot prompt"}</button>
            {s.cutPrompt ? (
              <>
                <textarea className="video-input" rows="7" style={{ fontSize: 12.5, marginBottom: 10 }} value={s.cutPrompt} onChange={(e) => set({ cutPrompt: e.target.value })} />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" className="btn-action" onClick={() => sendToVideo({ prompt: s.cutPrompt, video: s.animatic, name: "previz-animatic" }).catch((e) => setError(e.message))}>Send to Video Generation</button>
                  <button type="button" className="btn-action" onClick={() => navigator.clipboard && navigator.clipboard.writeText(s.cutPrompt)}>Copy prompt</button>
                </div>
              </>
            ) : null}
          </div>
        ) : null}
        {error ? <div className="error-box" role="alert">{error}</div> : null}
      </>
    );
  }

  window.CharacterMasking = CharacterMasking;
  window.LocationVariations = LocationVariations;
  window.PrevizTool = PrevizTool;
})();
