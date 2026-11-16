/* character-sheets.jsx — Character Sheets for several characters at once.
 *
 * Each character card has its own references and notes and runs its own sheet job, so
 * "Generate all" renders every character in parallel. A sheet is generated without QA;
 * "Inspect & retry" on a finished sheet has Seed LLM check it against a QA checklist and
 * retry once (edit or regenerate) if anything fails.
 *
 * Props:
 *   state, update   per-project or browser-local storage ({characters: [...]})
 *   linked          [{key, label, image, bible}] — Character Generation results linked here
 *   modelLine       the shared model picker (rendered by the app)
 *   onUse(target, items)   target "video" | "long" | "wb"; items [{name, dataUrl}]
 *   onZoom(url)     opens the app's full-size viewer
 *   projectActions  optional {addToGroup(url, name), saveLocal(url, name)}
 */
(function () {
  "use strict";
  const { useState, useEffect, useRef } = React;

  const MAX_REFS = 4;
  const TEMPLATE = "Name and role:\nAge, build, skin tone:\nFace and hair:\nOutfit — every garment, how it is worn, what is on top:\nAccessories (and which side they are on):\n";

  function readDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ""));
      r.onerror = () => reject(r.error || new Error("Could not read the file."));
      r.readAsDataURL(blob);
    });
  }
  async function post(path, body) {
    const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || d.error) throw new Error(d.error || `HTTP ${r.status}`);
    return d;
  }
  async function toDataUrl(url) {
    if (!url || url.startsWith("data:")) return url;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Could not load ${url}`);
    return readDataUrl(await r.blob());
  }
  let seq = 0;
  const newId = () => `c${Date.now().toString(36)}${(++seq).toString(36)}`;
  const blank = (n) => ({ id: newId(), name: `Character ${n}`, refs: [], notes: "", bible: null, jobId: "", qa: null, image: "", error: "", busy: "" });

  // The job without the big data URL; the sheet itself is kept as its /files/ URL.
  function compact(job) {
    const result = job.result ? Object.assign({}, job.result) : null;
    if (result) delete result.image_data_url;
    return { status: job.status, stage: job.stage, error: job.error || "", steps: job.steps || [], inspected: !!job.inspected,
             attempts: job.attempts || [], bible: job.bible, prompt: job.prompt, review_fixes: job.review_fixes || [], result };
  }

  function QaPanel({ qa, onZoom }) {
    const [view, setView] = useState(null);
    if (!qa || !qa.inspected) return null;
    const attempts = (qa.attempts || []).filter((a) => a.groups);
    const chosen = qa.result && qa.result.attempt;
    const shown = attempts.find((a) => a.number === view) || attempts.find((a) => a.number === chosen) || attempts[attempts.length - 1];
    const failing = shown ? shown.groups.flatMap((g) => g.criteria.filter((c) => !c.passed).map((c) => Object.assign({}, c, { group: g.name }))) : [];
    return (
      <div className="csq" style={{ marginTop: 10 }}>
        {qa.result && qa.status === "done" ? (
          <div className={"csq-verdict " + (qa.result.passed ? "csq-ok" : "csq-warn")}>
            {qa.result.passed ? `Passed all ${qa.result.criteria_total} checks` : `Best attempt kept · ${qa.result.criteria_passed}/${qa.result.criteria_total} checks passed`}
            {` · attempt ${qa.result.attempt} of ${attempts.length}`}
          </div>
        ) : null}
        {attempts.length > 1 ? (
          <div className="csq-attempts">
            {attempts.map((a) => (
              <div key={a.number} className={"csq-attempt" + (shown && shown.number === a.number ? " is-active" : "")} onClick={() => setView(a.number)}>
                <img src={a.image} alt={`Attempt ${a.number}`} onDoubleClick={() => onZoom(a.image)} />
                <div className="csq-attempt-meta"><b>Attempt {a.number}</b> · {a.mode === "edit" ? "edit" : "generated"}
                  <span className={a.passed ? "csq-pass" : "csq-fail"}>{a.criteria_passed}/{a.criteria_total}</span></div>
              </div>
            ))}
          </div>
        ) : null}
        {failing.length ? (
          <div className="csq-failed">
            <div className="field-label">Failing checks · attempt {shown.number}</div>
            {failing.map((c) => <div key={c.id} className="csq-fail-row"><b>{c.group}:</b> {c.short || c.text}{c.note ? <div className="csq-note">{c.note}</div> : null}</div>)}
          </div>
        ) : null}
        {shown && shown.changes && shown.changes.length ? <div className="video-hint">Retry changes: {shown.changes.join(" · ")}</div> : null}
        {shown ? (
          <details className="csq-details">
            <summary>Checklist · attempt {shown.number}</summary>
            {shown.groups.map((g) => (
              <div key={g.id} className="csq-group">
                <div className="csq-group-head"><span className={g.passed ? "csq-pass" : "csq-fail"}>{g.passed ? "✓" : "✗"}</span> {g.name}</div>
                {g.criteria.map((c) => <div key={c.id} className="csq-crit"><span className={c.passed ? "csq-pass" : "csq-fail"}>{c.passed ? "✓" : "✗"}</span> {c.short || c.text}</div>)}
              </div>
            ))}
          </details>
        ) : null}
      </div>
    );
  }

  function CharacterSheetBatch({ state, update, linked, modelLine, onUse, onZoom, projectActions }) {
    const chars = (state && state.characters && state.characters.length) ? state.characters : [blank(1)];
    const setChars = (fn) => update((prev) => {
      const cur = (prev && prev.characters && prev.characters.length) ? prev.characters : [blank(1)];
      return Object.assign({}, prev || {}, { characters: fn(cur) });
    });
    const patch = (id, p) => setChars((cs) => cs.map((c) => (c.id === id ? Object.assign({}, c, typeof p === "function" ? p(c) : p) : c)));
    const pollers = useRef({});
    const charsRef = useRef(chars);
    charsRef.current = chars;
    const fileRefs = useRef({});
    const [dragOver, setDragOver] = useState("");

    // Resume polling for jobs still running (after a reload or a tool switch).
    useEffect(() => {
      chars.forEach((c) => { if (c.jobId && c.qa && c.qa.status === "running") poll(c.id, c.jobId); });
    }, []); // eslint-disable-line

    async function poll(id, jobId) {
      if (pollers.current[jobId]) return;
      pollers.current[jobId] = true;
      try {
        for (;;) {
          await new Promise((r) => setTimeout(r, 3000));
          const r = await fetch("/api/character-sheet/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ job_id: jobId }) });
          const job = await r.json();
          if (!r.ok) throw new Error(job.error || "Lost track of the sheet job.");
          const qa = compact(job);
          if (job.status === "running") { patch(id, { qa }); continue; }
          if (job.status === "done") {
            const image = (job.result && job.result.image) || "";
            patch(id, { qa, image, busy: "", error: "" });
            // Long Duration picks the sheet up as this character's reference (see frontend/app.jsx, cc-reference-ready).
            const c = charsRef.current.find((x) => x.id === id);
            if (image && c) window.dispatchEvent(new CustomEvent("cc-reference-ready", { detail: { kind: "character", name: c.name, url: image } }));
          }
          else patch(id, { qa, busy: "", error: job.error || "Character sheet generation failed." });
          break;
        }
      } catch (e) {
        patch(id, { busy: "", error: e.message });
      } finally {
        delete pollers.current[jobId];
      }
    }

    async function generate(c) {
      if (!c.refs.length && c.notes.trim().length < 3) { patch(c.id, { error: "Add a reference image or describe the character." }); return; }
      patch(c.id, { busy: "generate", error: "", image: "", qa: { status: "running", stage: "Starting", steps: [], attempts: [] } });
      try {
        const images = [];
        for (const u of c.refs) images.push(await toDataUrl(u));
        const d = await post("/api/character-sheet/start", { images, notes: c.notes, bible: c.bible || null });
        patch(c.id, { jobId: d.job_id });
        poll(c.id, d.job_id);
      } catch (e) { patch(c.id, { busy: "", error: e.message, qa: null }); }
    }

    async function inspect(c) {
      patch(c.id, { busy: "inspect", error: "" });
      try {
        await post("/api/character-sheet/inspect", { job_id: c.jobId });
        patch(c.id, (cur) => ({ qa: Object.assign({}, cur.qa, { status: "running", stage: "Inspecting" }) }));
        poll(c.id, c.jobId);
      } catch (e) { patch(c.id, { busy: "", error: e.message }); }
    }

    async function addFiles(id, files) {
      const list = Array.from(files || []).filter((f) => /^image\//.test(f.type));
      const urls = [];
      for (const f of list) {
        const d = await post("/api/seedream/save-image", { data_url: await readDataUrl(f), hint: "sheet-ref" });
        urls.push(d.url);
      }
      patch(id, (c) => ({ refs: c.refs.concat(urls).slice(0, MAX_REFS) }));
    }

    function addLinked(l) {
      setChars((cs) => {
        const empty = cs.find((c) => !c.refs.length && !c.notes.trim() && !c.image && !c.busy);
        const fill = { name: l.label, refs: [l.image], bible: l.bible || null, linkKey: l.key };
        if (empty) return cs.map((c) => (c.id === empty.id ? Object.assign({}, c, fill) : c));
        return cs.concat([Object.assign(blank(cs.length + 1), fill)]);
      });
    }

    const runnable = chars.filter((c) => !c.busy && (c.refs.length || c.notes.trim().length >= 3));
    const usedLinks = new Set(chars.map((c) => c.linkKey).filter(Boolean));
    const freshLinks = (linked || []).filter((l) => l.image && !usedLinks.has(l.key));
    const done = chars.filter((c) => c.image);

    return (
      <div className="card">
        <div className="video-hint" style={{ marginBottom: 12 }}>
          One 16:9 sheet per character: face close-up, front, side and back. Add as many characters as you need and generate them all at once; each one runs in parallel. After a sheet is made, <b>Inspect &amp; retry</b> has Seed LLM check it against a QA checklist and your references, and fix it once if anything is wrong.
        </div>

        {freshLinks.length ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
            <span className="field-label" style={{ margin: 0 }}>From Character Generation</span>
            {freshLinks.map((l) => (
              <button key={l.key} type="button" className="btn-action btn-inline" onClick={() => addLinked(l)}>
                <img src={l.image} alt="" style={{ width: 20, height: 20, objectFit: "cover", borderRadius: 4 }} /> Add {l.label}
              </button>
            ))}
          </div>
        ) : null}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {chars.map((c, i) => (
            <div key={c.id} style={{ border: "0.5px solid var(--border-2)", borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontWeight: 700, color: "var(--accent-2)", fontSize: 13 }}>{String(i + 1).padStart(2, "0")}</span>
                <input className="video-input" style={{ height: 34, minHeight: 0, padding: "0 10px", fontWeight: 600, flex: 1 }} value={c.name} onChange={(e) => patch(c.id, { name: e.target.value })} aria-label="Character name" />
                {chars.length > 1 ? <button type="button" className="btn-action btn-inline" disabled={!!c.busy} onClick={() => setChars((cs) => cs.filter((x) => x.id !== c.id))}>Remove</button> : null}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.25fr)", gap: 14 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
                  <div className="field-label" style={{ margin: 0 }}>References <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>— 0–{MAX_REFS}</span></div>
                  <input ref={(el) => { fileRefs.current[c.id] = el; }} type="file" className="sr-only" accept="image/*" multiple
                         onChange={(e) => { addFiles(c.id, e.target.files).catch((err) => patch(c.id, { error: err.message })); e.target.value = ""; }} />
                  <div className="tile-grid" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))", margin: 0 }}
                       onDragOver={(e) => { e.preventDefault(); setDragOver(c.id); }} onDragLeave={() => setDragOver("")}
                       onDrop={(e) => { e.preventDefault(); setDragOver(""); addFiles(c.id, e.dataTransfer.files).catch((err) => patch(c.id, { error: err.message })); }}>
                    {c.refs.map((u, k) => (
                      <div key={u + k} style={{ position: "relative", aspectRatio: "3 / 4", borderRadius: 8, overflow: "hidden", border: "0.5px solid var(--border-2)", background: "#F4F4F6" }}>
                        <img src={u} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onClick={() => onZoom(u)} />
                        <button type="button" aria-label="Remove reference" onClick={() => patch(c.id, (cc) => ({ refs: cc.refs.filter((_, j) => j !== k), bible: k === 0 && cc.linkKey ? null : cc.bible }))}
                                style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: 10, border: 0, background: "rgba(0,0,0,.6)", color: "#fff", cursor: "pointer", fontSize: 12, lineHeight: "20px", padding: 0 }}>×</button>
                      </div>
                    ))}
                    {c.refs.length < MAX_REFS ? (
                      <div className="upload-tile" role="button" tabIndex="0" style={{ minHeight: 0, aspectRatio: "3 / 4", borderColor: dragOver === c.id ? "var(--accent-2)" : undefined }}
                           onClick={() => fileRefs.current[c.id] && fileRefs.current[c.id].click()}
                           onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileRefs.current[c.id].click(); } }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                        <div className="tile-meta">Add</div>
                      </div>
                    ) : null}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div className="field-label" style={{ margin: 0 }}>{c.refs.length ? "Notes (optional)" : "Description"}</div>
                    {!c.refs.length ? <button type="button" className="btn-link" onClick={() => patch(c.id, { notes: TEMPLATE })}>Use template</button> : null}
                  </div>
                  <textarea className="video-input" style={{ minHeight: c.refs.length ? 70 : 120, fontSize: 12.5 }} value={c.notes} onChange={(e) => patch(c.id, { notes: e.target.value })}
                            placeholder={c.refs.length ? "What the references don't show: the back of the outfit, which side a bag or scar is on…" : "No reference? Describe the character: face and hair, every garment, accessories and which side they are on…"} />
                  {c.bible ? <div className="video-hint" style={{ margin: 0 }}>Uses the character bible from Character Generation.</div> : null}
                  {c.error ? <div className="error-box" style={{ margin: 0 }}>{c.error}</div> : null}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
                  {c.image ? (
                    <img src={c.image} alt={`${c.name} sheet`} onClick={() => onZoom(c.image)} style={{ width: "100%", borderRadius: 10, display: "block", border: "0.5px solid var(--border)", cursor: "zoom-in" }} />
                  ) : (
                    <div className={c.busy ? "pulse" : ""} style={{ aspectRatio: "16 / 9", borderRadius: 10, background: "#F4F4F6", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", fontSize: 12.5, textAlign: "center", padding: 10 }}>
                      {c.qa && c.qa.status === "running" ? `${c.qa.stage}…` : "The sheet appears here"}
                    </div>
                  )}
                  {c.qa && (c.qa.steps || []).length ? (
                    <div className="csq-steps">{c.qa.steps.filter((st) => st.state !== "skipped").map((st) => <span key={st.key} className={"csq-step csq-" + st.state}>{st.label}</span>)}</div>
                  ) : null}
                  {c.qa && c.qa.status === "running" && c.busy === "inspect" ? <div className="video-hint" style={{ margin: 0 }}>{c.qa.stage}… inspection takes a few minutes.</div> : null}
                  {c.image ? (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button type="button" className="btn-action btn-inline" disabled={!!c.busy || !c.jobId} onClick={() => inspect(c)}
                              title="Seed LLM checks the sheet against a QA checklist and your references, and retries once if anything fails">
                        {c.busy === "inspect" ? "Inspecting…" : c.qa && c.qa.inspected ? "Inspect again" : "Inspect & retry"}
                      </button>
                      <a className="btn-action btn-inline" href={c.image} download data-model={window.__ccImageModel || "Seedream"} data-ext="png">Download</a>
                      <button type="button" className="btn-action btn-inline" onClick={() => onUse("video", [{ name: c.name, url: c.image }])}>Use in video</button>
                      <button type="button" className="btn-action btn-inline" onClick={() => onUse("long", [{ name: c.name, url: c.image }])}>Use in long duration</button>
                      <button type="button" className="btn-action btn-inline" onClick={() => onUse("wb", [{ name: c.name, url: c.image }])}>Use in storyboard</button>
                      {projectActions ? <button type="button" className="btn-action btn-inline" onClick={() => projectActions.addToGroup(c.image, `${c.name} sheet`)}>Add to asset group</button> : null}
                      {projectActions ? <button type="button" className="btn-action btn-inline" onClick={() => projectActions.saveLocal(c.image, `${c.name} sheet`)}>Save locally</button> : null}
                    </div>
                  ) : null}
                  <QaPanel qa={c.qa} onZoom={onZoom} />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                <button type="button" className="btn-action" disabled={!!c.busy} onClick={() => generate(c)}>
                  {c.busy === "generate" ? "Generating…" : c.image ? "Generate again" : "Generate this one"}
                </button>
              </div>
            </div>
          ))}
        </div>

        <button type="button" className="btn-action" style={{ marginTop: 12, width: "100%", borderStyle: "dashed" }} onClick={() => setChars((cs) => cs.concat([blank(cs.length + 1)]))}>
          + Add character
        </button>

        <hr className="divider" />
        {modelLine}
        <div className="btn-row">
          <button type="button" className="btn-primary" disabled={!runnable.length} onClick={() => runnable.forEach(generate)}>
            {chars.some((c) => c.busy === "generate") ? "Generating…" : runnable.length > 1 ? `Generate ${runnable.length} character sheets` : "Generate character sheet"}
          </button>
          {done.length > 1 ? (
            <button type="button" className="btn-ghost" onClick={() => onUse("video", done.map((c) => ({ name: c.name, url: c.image })))}>Use all in video</button>
          ) : null}
        </div>
      </div>
    );
  }

  window.CharacterSheetBatch = CharacterSheetBatch;
})();
