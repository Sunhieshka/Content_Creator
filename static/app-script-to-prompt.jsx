// Script to Prompt tool.
//
// Rendered by App in frontend/app.jsx, which passes in the state and handlers each view reads.
// The tool's state stays in App because it is saved per project and shared between tools
// (e.g. Character Sheets feed Video Generation and Long Duration).

function renderScriptToPromptTool({
  activeProject, activeProjectId, applyProjectJobUpdate, editScriptShot,
  fillLongShotPromptFromScript, nextShotLabel, onClearScriptToPrompt, onGenerateScriptToPrompt,
  onScriptPdfSelected, parsedScriptPromptShots, projectMode, renderModelLine, scriptPdfFile,
  scriptPdfInputRef, scriptPromptError, scriptPromptLoading, scriptPromptOutput, scriptShotBody,
  scriptSourceText, seedreamLocal, sendScriptCharactersToSheets, sendScriptLocationsToVariations,
  setScriptPdfFile, setScriptPromptOutput, setScriptSourceText
}) {
  return (
      <>
    {!projectMode ? <div className="tool-heading">Script to Prompt</div> : null}
    <div className="card">
      <div className="video-hint" style={{ marginBottom: 12 }}>Paste a film script or upload a PDF to convert it into Seedance-style shot prompts using the local Film Script to Prompts skill context.</div>

      <div style={{ marginBottom: 14 }}>
        <div className="field-label">Script text</div>
        <textarea
          className="video-input char-textarea"
          rows="10"
          placeholder="Paste a screenplay excerpt, scene breakdown, or full script here..."
          value={scriptSourceText}
          onChange={(e) => setScriptSourceText(e.target.value)}
        />
      </div>

      <div className="field-label" style={{ marginBottom: 10 }}>PDF upload</div>
      <div className="tile-grid">
        <input
          ref={scriptPdfInputRef}
          className="sr-only"
          id="script-pdf-input"
          type="file"
          accept="application/pdf,.pdf"
          onChange={(e) => e.target.files && onScriptPdfSelected(e.target.files)}
        />
        <div className="upload-tile" role="button" tabIndex="0" aria-label="Upload script PDF" onClick={() => document.getElementById("script-pdf-input").click()}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <path d="M14 2v6h6"></path>
            <path d="M12 18v-6"></path>
            <path d="M9 15h6"></path>
          </svg>
          <div className="tile-title">Script PDF</div>
          <div className="tile-meta">{scriptPdfFile ? scriptPdfFile.name : "Optional"}</div>
        </div>
      </div>

      {scriptPdfFile ? (
        <div className="file-chips">
          <span className="chip">
            {scriptPdfFile.name}
            <span className="remove" onClick={() => {
              setScriptPdfFile(null);
              if (scriptPdfInputRef.current) scriptPdfInputRef.current.value = "";
            }} role="button" tabIndex="0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18"></path>
                <path d="M6 6l12 12"></path>
              </svg>
            </span>
          </span>
        </div>
      ) : null}

      <hr className="divider" />
      {renderModelLine([["prompt", "script to Seedance shot prompts"]])}
      <div className="btn-row" style={{ marginTop: 14 }}>
        <button className="btn-primary" disabled={scriptPromptLoading || (!scriptSourceText.trim() && !scriptPdfFile)} onClick={onGenerateScriptToPrompt}>
          {scriptPromptLoading ? "Generating…" : "Generate prompts"}
        </button>
        <button className="btn-ghost" onClick={onClearScriptToPrompt} disabled={scriptPromptLoading && !scriptSourceText.trim() && !scriptPdfFile && !scriptPromptOutput}>
          Clear
        </button>
      </div>

      {scriptPromptError ? <div className="error-box" style={{ marginTop: 10 }}>{scriptPromptError}</div> : null}

      {scriptPromptOutput ? (() => {
        const chars = ((projectMode ? activeProject?.results?.scriptCharacters : seedreamLocal.scriptCharacters) || {}).items || [];
        const locs = ((projectMode ? activeProject?.results?.scriptLocations : seedreamLocal.scriptLocations) || {}).items || [];
        const isShots = parsedScriptPromptShots.length > 1 || /^SHOT\s+\d+\b/m.test(scriptPromptOutput);
        const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
        return (
          <div className="s2p-breakdown">
            <div className="s2p-breakdown-title">Breakdown</div>
            <div className="s2p-breakdown-meta">
              {[plural(isShots ? parsedScriptPromptShots.length : 1, "shot"), plural(chars.length, "character"), plural(locs.length, "location")].join(" · ")} — edit them in the next steps.
            </div>
            {isShots ? (
              <div className="s2p-shot-grid">
                {parsedScriptPromptShots.map((shotText, idx) => {
                  const body = scriptShotBody(shotText);
                  const secs = runtimeFromPrompt(body);
                  return (
                    <div key={`script-shot-${idx}`} className="s2p-shot">
                      <div className="s2p-shot-head">
                        <span><strong>{nextShotLabel(idx).replace("SHOT ", "Shot ")}</strong>{secs ? <span className="s2p-shot-secs"> · {secs}s</span> : null}</span>
                        <button type="button" className="s2p-shot-use" title="Put this prompt into the matching Long Duration shot" onClick={() => fillLongShotPromptFromScript(idx, body)}>Add to long shot</button>
                      </div>
                      <textarea
                        className="s2p-shot-text"
                        value={body}
                        spellCheck={false}
                        onChange={(e) => editScriptShot(idx, e.target.value)}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <textarea
                className="s2p-shot-text"
                style={{ height: 360 }}
                value={scriptPromptOutput}
                onChange={(e) => applyProjectJobUpdate(projectMode ? activeProjectId : null, "scriptJob", { output: e.target.value }, { output: setScriptPromptOutput })}
              />
            )}
          </div>
        );
      })() : null}
      {(() => {
        const chars = ((projectMode ? activeProject?.results?.scriptCharacters : seedreamLocal.scriptCharacters) || {}).items || [];
        if (!chars.length) return null;
        return (
          <div style={{ marginTop: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div className="field-label" style={{ margin: 0, flex: 1 }}>Character sheet prompts · {chars.length} character{chars.length === 1 ? "" : "s"}</div>
              <button className="btn-action" onClick={() => sendScriptCharactersToSheets(chars)}>Send all to Character Sheets</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
              {chars.map((c, idx) => (
                <div key={`script-char-${idx}`} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                    {c.role ? <div className="video-hint" style={{ margin: 0 }}>{c.role}</div> : null}
                  </div>
                  <div style={{ whiteSpace: "pre-wrap", fontSize: 12.5, lineHeight: 1.55, border: "0.5px solid var(--border)", borderRadius: "var(--radius-sm)", padding: 10, background: "var(--surface-2)", flex: 1 }}>{c.description}</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn-action" onClick={() => navigator.clipboard && navigator.clipboard.writeText(c.description)}>Copy</button>
                    <button className="btn-action" onClick={() => sendScriptCharactersToSheets([c])}>Send to Character Sheets</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
      {(() => {
        const locs = ((projectMode ? activeProject?.results?.scriptLocations : seedreamLocal.scriptLocations) || {}).items || [];
        if (!locs.length) return null;
        return (
          <div style={{ marginTop: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div className="field-label" style={{ margin: 0, flex: 1 }}>Location variation prompts · {locs.length} location{locs.length === 1 ? "" : "s"}</div>
              <button className="btn-action" onClick={() => sendScriptLocationsToVariations(locs)}>Send all to Location Variations</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
              {locs.map((l, idx) => (
                <div key={`script-loc-${idx}`} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{l.name}</div>
                    {l.scenes ? <div className="video-hint" style={{ margin: 0 }}>{l.scenes}</div> : null}
                  </div>
                  <div style={{ whiteSpace: "pre-wrap", fontSize: 12.5, lineHeight: 1.55, border: "0.5px solid var(--border)", borderRadius: "var(--radius-sm)", padding: 10, background: "var(--surface-2)", flex: 1 }}>{l.direction}</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn-action" onClick={() => navigator.clipboard && navigator.clipboard.writeText(l.direction)}>Copy</button>
                    <button className="btn-action" onClick={() => sendScriptLocationsToVariations([l])}>Send to Location Variations</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
      </>
    );
}
