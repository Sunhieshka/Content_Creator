// Character Generation and Character Sheets tools.
//
// Rendered by App in frontend/app.jsx, which passes in the state and handlers each view reads.
// The tool's state stays in App because it is saved per project and shared between tools
// (e.g. Character Sheets feed Video Generation and Long Duration).

function renderCharacterGenerationTool({
  activeProjectGroupId, addGeneratedAssetToProjectGroup, charEngineer, charGenTab, downloadImage,
  i2iAssetId, i2iError, i2iGroupId, i2iImage, i2iLoading, i2iMeta, i2iPrompt, i2iSourceImages,
  isProjectToolContext, linkGeneratedCharacterToWorldBuilding, onClearCharacterGeneration,
  onGenerateI2I, onGenerateT2I, onPickI2ISource, projectMode, removeWbLinkedRefs, renderModelLine,
  saveGeneratedAssetToProjectFolder, setCharEngineer, setCharGenTab, setI2iPrompt,
  setI2iSourceImages, setModalImageUrl, setProjectAssetGroupError, setProjectLocalFilesError,
  setT2iPrompt, setUseI2IForSheets, setUseI2IForVideoAll, setUseI2IForWb, setUseT2IForSheets,
  setUseT2IForVideoAll, setUseT2IForWb, t2iAssetId, t2iError, t2iGroupId, t2iImage, t2iLoading,
  t2iMeta, t2iPrompt, useI2IForSheets, useI2IForVideoAll, useI2IForWb, useT2IForSheets,
  useT2IForVideoAll, useT2IForWb
}) {
  return (
      <>
    {!projectMode ? <div className="tool-heading">Character Generation</div> : null}
    <div className="card">
      <div className="tabs" role="radiogroup" aria-label="Character generation mode">
        <button
          className={"tab-btn" + (charGenTab === "t2i" ? " active" : "")}
          role="radio"
          aria-checked={charGenTab === "t2i"}
          onClick={() => setCharGenTab("t2i")}
        >
          Text to image
        </button>
        <button
          className={"tab-btn" + (charGenTab === "i2i" ? " active" : "")}
          role="radio"
          aria-checked={charGenTab === "i2i"}
          onClick={() => setCharGenTab("i2i")}
        >
          Image to image
        </button>
      </div>

      <label className="sheet-chip checkbox-chip" data-checked={charEngineer ? "true" : "false"} style={{ marginBottom: 6 }}>
        <input type="checkbox" checked={charEngineer} onChange={(e) => setCharEngineer(e.target.checked)} />
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5"></path>
        </svg>
        Reference-ready character (Seed LLM)
      </label>
      <div className="video-hint" style={{ marginTop: 0, marginBottom: 12 }}>
        {charEngineer
          ? "Seed LLM locks a character bible (garment construction, sides of one-sided items, colors) and writes the prompt for one full-body image on a white background, with a neutral expression. Character Sheets reuse that bible when this image is a reference."
          : "Your prompt is sent to Seedream as written (Seedream's own prompt optimizer is on)."}
      </div>

      {charGenTab === "t2i" ? (
        <div>
          <div className="field-label" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>Text prompt</span>
            <button className="btn-link" type="button" onClick={() => setT2iPrompt(CHARACTER_TEMPLATE)}>Use description template</button>
          </div>
          <textarea
            aria-label="Text prompt"
            className={"video-input char-textarea" + (t2iError ? " input-error" : "")}
            value={t2iPrompt}
            onChange={(e) => setT2iPrompt(e.target.value)}
            placeholder="Describe the character to generate…"
          />
          {/[[][^\]]{2,}[\]]/.test(t2iPrompt) ? (
            <div className="video-hint">Replace every [placeholder] in the template with your character's details — anything left in brackets is guessed.</div>
          ) : null}
          {t2iError ? <div className="error-box">{t2iError}</div> : null}
        </div>
      ) : (
        <div>
          <div className="field-label">Upload reference images</div>
          <div
            className="upload-zone"
            role="button"
            tabIndex="0"
            aria-label="Upload reference image"
            onClick={() => document.getElementById("i2iFile").click()}
          >
            <div className="upload-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9"></path>
                <path d="M3 15l4-4a2 2 0 0 1 2.8 0l2.2 2.2a2 2 0 0 0 2.8 0L21 9"></path>
                <path d="M3 21h18"></path>
              </svg>
            </div>
            <p className="upload-text">{i2iSourceImages.length ? `${i2iSourceImages.length} image${i2iSourceImages.length === 1 ? "" : "s"} selected` : "Click to upload images"}</p>
            <p className="upload-sub">PNG / JPG / WEBP / AVIF supported · Up to 9 images</p>
          </div>
          <input
            id="i2iFile"
            className="sr-only"
            type="file"
            accept={REFERENCE_IMAGE_ACCEPT}
            multiple
            onChange={(e) => onPickI2ISource(e.target.files)}
          />
          {i2iSourceImages.length ? (
            <div className="file-chips" style={{ marginTop: 12 }}>
              {i2iSourceImages.map((it, idx) => (
                <span className="chip" key={it.name + idx}>
                  Image {idx + 1}: {it.name}
                  <span className="remove" onClick={() => setI2iSourceImages((prev) => prev.filter((_, i) => i !== idx))} role="button" tabIndex="0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18"></path>
                      <path d="M6 6l12 12"></path>
                    </svg>
                  </span>
                </span>
              ))}
            </div>
          ) : null}

          <div className="field-label" style={{ marginTop: 12 }}>Transformation prompt</div>
          <textarea
            className={"video-input char-textarea" + (i2iError ? " input-error" : "")}
            value={i2iPrompt}
            onChange={(e) => setI2iPrompt(e.target.value)}
            placeholder="Describe how to transform the source image…"
          />
          {i2iError ? <div className="error-box">{i2iError}</div> : null}
        </div>
      )}
      <hr className="divider" />
      {renderModelLine([["image", "character images"], ["prompt", "reference-ready character bible and prompt"]])}
    </div>

    <div className="btn-row" style={{ marginTop: 0 }}>
      <button
        className="btn-primary"
        aria-disabled={(charGenTab === "t2i" ? (t2iLoading || !t2iPrompt.trim()) : (i2iLoading || !i2iPrompt.trim() || !i2iSourceImages.length))}
        disabled={charGenTab === "t2i" ? (t2iLoading || !t2iPrompt.trim()) : (i2iLoading || !i2iPrompt.trim() || !i2iSourceImages.length)}
        onClick={charGenTab === "t2i" ? onGenerateT2I : onGenerateI2I}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
          <path d="M12 2l1.2 3.6L17 7l-3.8 1.4L12 12l-1.2-3.6L7 7l3.8-1.4L12 2Z"></path>
          <path d="M5 12l.8 2.4L8 15l-2.2.6L5 18l-.8-2.4L2 15l2.2-.6L5 12Z"></path>
          <path d="M19 13l.8 2.4L22 16l-2.2.6L19 19l-.8-2.4L16 16l2.2-.6L19 13Z"></path>
        </svg>
        {charGenTab === "t2i" ? (t2iLoading ? "Generating…" : "Generate character image") : (i2iLoading ? "Generating…" : "Generate character image")}
      </button>
      <button className="btn-ghost" onClick={onClearCharacterGeneration} disabled={t2iLoading || i2iLoading}>
        Clear
      </button>
    </div>

    {charGenTab === "t2i" && t2iImage ? (
      <div className="t2i-preview">
        <div className="t2i-header">
          <div className="result-label">Text-to-image Result</div>
          <div style={{ display: "flex", gap: 8 }}>
            {isProjectToolContext("character-generation") ? (
              <button
                className="btn-action"
                disabled={!activeProjectGroupId}
                onClick={() => {
                  addGeneratedAssetToProjectGroup({
                    toolKey: "character-generation",
                    dataUrl: t2iImage,
                    name: "Character (T2I)",
                    keyHint: "t2i",
                    resultKey: "t2iImage",
                  }).catch((e) => setProjectAssetGroupError(String(e?.message || e)));
                }}
              >
                Add to asset group
              </button>
            ) : null}
            {isProjectToolContext("character-generation") ? (
              <button
                className="btn-action"
                onClick={() => {
                  saveGeneratedAssetToProjectFolder({
                    toolKey: "character-generation",
                    dataUrl: t2iImage,
                    name: "Character (T2I)",
                  }).catch((e) => setProjectLocalFilesError(String(e?.message || e)));
                }}
              >
                Save locally
              </button>
            ) : null}
            <button className="btn-action" onClick={() => downloadImage(t2iImage, window.__ccImageModel, "png")}>Download</button>
          </div>
        </div>
        <img className="preview-image" src={t2iImage} alt="t2i" onClick={() => setModalImageUrl(t2iImage)} style={{ cursor: "zoom-in" }} />
        <div style={{ padding: "10px 14px", display: "grid", gap: 10 }}>
          <label className="sheet-chip checkbox-chip" data-checked={useT2IForSheets ? "true" : "false"}>
            <input type="checkbox" checked={useT2IForSheets} onChange={(e) => setUseT2IForSheets(e.target.checked)} />
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5"></path>
            </svg>
            Use this image as reference for Character sheet generation
          </label>
          <label className="sheet-chip checkbox-chip" data-checked={useT2IForVideoAll ? "true" : "false"}>
            <input type="checkbox" checked={useT2IForVideoAll} onChange={(e) => setUseT2IForVideoAll(e.target.checked)} />
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5"></path>
            </svg>
            Use this image as reference for Video generation
          </label>
          <label className="sheet-chip checkbox-chip" data-checked={useT2IForWb ? "true" : "false"}>
            <input
              type="checkbox"
              checked={useT2IForWb}
              onChange={(e) => {
                const next = !!e.target.checked;
                setUseT2IForWb(next);
                if (next) {
                  linkGeneratedCharacterToWorldBuilding("t2i");
                } else {
                  removeWbLinkedRefs("wb-t2i");
                }
              }}
            />
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5"></path>
            </svg>
            Use this image as reference for Storyboard subject
          </label>
          {t2iMeta?.prompt ? (
            <details className="csq-details">
              <summary>Engineered prompt & character bible</summary>
              <pre className="csq-pre">{t2iMeta.prompt}</pre>
              {t2iMeta.bible ? <pre className="csq-pre">{JSON.stringify(t2iMeta.bible, null, 2)}</pre> : null}
            </details>
          ) : null}
          {t2iAssetId ? <div className="t2i-meta">asset://{t2iAssetId}</div> : null}
          {t2iGroupId ? <div className="t2i-meta">group: {t2iGroupId}</div> : null}
        </div>
      </div>
    ) : null}

    {charGenTab === "i2i" && i2iImage ? (
      <div className="t2i-preview">
        <div className="t2i-header">
          <div className="result-label">Image-to-image Result</div>
          <div style={{ display: "flex", gap: 8 }}>
            {isProjectToolContext("character-generation") ? (
              <button
                className="btn-action"
                disabled={!activeProjectGroupId}
                onClick={() => {
                  addGeneratedAssetToProjectGroup({
                    toolKey: "character-generation",
                    dataUrl: i2iImage,
                    name: "Character (I2I)",
                    keyHint: "i2i",
                    resultKey: "i2iImage",
                  }).catch((e) => setProjectAssetGroupError(String(e?.message || e)));
                }}
              >
                Add to asset group
              </button>
            ) : null}
            {isProjectToolContext("character-generation") ? (
              <button
                className="btn-action"
                onClick={() => {
                  saveGeneratedAssetToProjectFolder({
                    toolKey: "character-generation",
                    dataUrl: i2iImage,
                    name: "Character (I2I)",
                  }).catch((e) => setProjectLocalFilesError(String(e?.message || e)));
                }}
              >
                Save locally
              </button>
            ) : null}
            <button className="btn-action" onClick={() => downloadImage(i2iImage, window.__ccImageModel, "png")}>Download</button>
          </div>
        </div>
        <img className="preview-image" src={i2iImage} alt="i2i" onClick={() => setModalImageUrl(i2iImage)} style={{ cursor: "zoom-in" }} />
        <div style={{ padding: "10px 14px", display: "grid", gap: 10 }}>
          <label className="sheet-chip checkbox-chip" data-checked={useI2IForSheets ? "true" : "false"}>
            <input type="checkbox" checked={useI2IForSheets} onChange={(e) => setUseI2IForSheets(e.target.checked)} />
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5"></path>
            </svg>
            Use this image as reference for character sheet generation
          </label>
          <label className="sheet-chip checkbox-chip" data-checked={useI2IForVideoAll ? "true" : "false"}>
            <input type="checkbox" checked={useI2IForVideoAll} onChange={(e) => setUseI2IForVideoAll(e.target.checked)} />
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5"></path>
            </svg>
            Use this image directly for video (all references)
          </label>
          <label className="sheet-chip checkbox-chip" data-checked={useI2IForWb ? "true" : "false"}>
            <input
              type="checkbox"
              checked={useI2IForWb}
              onChange={(e) => {
                const next = !!e.target.checked;
                setUseI2IForWb(next);
                if (next) {
                  linkGeneratedCharacterToWorldBuilding("i2i");
                } else {
                  removeWbLinkedRefs("wb-i2i");
                }
              }}
            />
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5"></path>
            </svg>
            Link with Storyboard
          </label>
          {i2iMeta?.prompt ? (
            <details className="csq-details">
              <summary>Engineered prompt & character bible</summary>
              <pre className="csq-pre">{i2iMeta.prompt}</pre>
              {i2iMeta.bible ? <pre className="csq-pre">{JSON.stringify(i2iMeta.bible, null, 2)}</pre> : null}
            </details>
          ) : null}
          {i2iAssetId ? <div className="t2i-meta">asset://{i2iAssetId}</div> : null}
          {i2iGroupId ? <div className="t2i-meta">group: {i2iGroupId}</div> : null}
        </div>
      </div>
    ) : null}
      </>
    );
}

function renderCharacterSheetsTool({
  activeProject, activeProjectId, addGeneratedAssetToProjectGroup, error, i2iImage, i2iMeta,
  isProjectToolContext, projectMode, readFileAsDataUrl, renderModelLine,
  saveGeneratedAssetToProjectFolder, seedreamLocal, seedreamUpdater, setError, setModalImageUrl,
  setProjectAssetGroupError, setProjectLocalFilesError, t2iImage, t2iMeta, useSheetsIn
}) {
  return (
      <>
        {!projectMode ? <div className="tool-heading">Character Sheets</div> : null}
        {window.CharacterSheetBatch ? (
          <window.CharacterSheetBatch
            key={projectMode ? `sheets-${activeProjectId}` : "sheets-local"}
            state={projectMode ? activeProject?.results?.sheetBatch : seedreamLocal.sheetBatch}
            update={seedreamUpdater("sheetBatch")}
            linked={[
              t2iImage ? { key: `t2i:${t2iImage.slice(-40)}`, label: "text-to-image character", image: t2iImage, bible: t2iMeta?.bible || null } : null,
              i2iImage ? { key: `i2i:${i2iImage.slice(-40)}`, label: "image-to-image character", image: i2iImage, bible: i2iMeta?.bible || null } : null,
            ].filter(Boolean)}
            modelLine={renderModelLine([["image", "sheet images"], ["prompt", "character bible, sheet prompts and QA checks"]])}
            onUse={(target, items) => useSheetsIn(target, items).catch((e) => setError(String(e?.message || e)))}
            onZoom={(url) => setModalImageUrl(url)}
            projectActions={isProjectToolContext("character-sheets") ? {
              addToGroup: (url, name) => addGeneratedAssetToProjectGroup({ toolKey: "character-sheets", sourceUrl: url, name, keyHint: "sheet" }).catch((e) => setProjectAssetGroupError(String(e?.message || e))),
              saveLocal: async (url, name) => {
                try {
                  const blob = await (await fetch(url)).blob();
                  const dataUrl = await readFileAsDataUrl(new File([blob], `${name}.png`, { type: blob.type || "image/png" }));
                  await saveGeneratedAssetToProjectFolder({ toolKey: "character-sheets", dataUrl, name });
                } catch (e) { setProjectLocalFilesError(String(e?.message || e)); }
              },
            } : null}
          />
        ) : <div className="error-box">Character Sheets did not load (static/character-sheets.jsx). Reload the page.</div>}
        {error ? <div className="error-box">{error}</div> : null}
      </>
    );
}

function renderSheetQaView({
  setModalImageUrl, setSheetQaView, sheetQa, sheetQaView, useSheetAttempt
}) {
  const qa = sheetQa;
  if (!qa) return null;
  const attempts = qa.attempts || [];
  const chosenNo = qa.result?.attempt;
  const view = attempts.find((a) => a.number === sheetQaView) || attempts.find((a) => a.number === chosenNo) || attempts[attempts.length - 1];
  const failedCriteria = view ? view.groups.flatMap((g) => g.criteria.filter((c) => !c.passed).map((c) => ({ ...c, group: g.name }))) : [];
  return (
    <div className="csq">
      {(qa.steps || []).length ? (
        <div className="csq-steps">
          {qa.steps.map((st) => <span key={st.key} className={"csq-step csq-" + st.state}>{st.label}</span>)}
        </div>
      ) : null}
      {qa.status === "running" ? <div className="video-hint">{qa.stage}… This usually takes 5–8 minutes.</div> : null}
      {qa.result ? (
        <div className={"csq-verdict " + (qa.result.passed ? "csq-ok" : "csq-warn")}>
          {qa.result.passed
            ? `Passed all ${qa.result.criteria_total} checks`
            : `Best attempt delivered · ${qa.result.criteria_passed}/${qa.result.criteria_total} checks passed`}
          {` · attempt ${qa.result.attempt} of ${attempts.length}`}{qa.result.chosenByUser ? " (your choice)" : ""}
        </div>
      ) : null}
      {attempts.length ? (
        <div className="csq-attempts">
          {attempts.map((a) => (
            <div key={a.number} className={"csq-attempt" + (view && view.number === a.number ? " is-active" : "")} onClick={() => setSheetQaView(a.number)}>
              <img src={a.image} alt={`Attempt ${a.number}`} />
              <div className="csq-attempt-meta">
                <b>Attempt {a.number}</b> · {a.mode === "edit" ? "edit" : "generated"}
                <span className={a.passed ? "csq-pass" : "csq-fail"}>{a.criteria_passed}/{a.criteria_total}</span>
              </div>
              <div className="csq-attempt-actions">
                <button className="btn-link" onClick={(e) => { e.stopPropagation(); setModalImageUrl(a.image); }}>View</button>
                {a.number !== chosenNo && qa.status === "done" ? (
                  <button className="btn-link" onClick={(e) => { e.stopPropagation(); useSheetAttempt(a); }}>Use this one</button>
                ) : a.number === chosenNo ? <span className="csq-chosen">Delivered</span> : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {view && failedCriteria.length ? (
        <div className="csq-failed">
          <div className="field-label">Failing checks · attempt {view.number}</div>
          {failedCriteria.map((c) => (
            <div key={c.id} className="csq-fail-row">
              <b>{c.group}:</b> {c.short || c.text}
              {c.note ? <div className="csq-note">{c.note}</div> : null}
            </div>
          ))}
        </div>
      ) : null}
      {view && view.changes && view.changes.length ? (
        <div className="video-hint">Retry changes: {view.changes.join(" · ")}</div>
      ) : null}
      {view ? (
        <details className="csq-details">
          <summary>Checklist · attempt {view.number}</summary>
          {view.groups.map((g) => (
            <div key={g.id} className="csq-group">
              <div className="csq-group-head"><span className={g.passed ? "csq-pass" : "csq-fail"}>{g.passed ? "✓" : "✗"}</span> {g.name}</div>
              {g.criteria.map((c) => (
                <div key={c.id} className="csq-crit">
                  <span className={c.passed ? "csq-pass" : "csq-fail"}>{c.passed ? "✓" : "✗"}</span> {c.short || c.text}
                </div>
              ))}
            </div>
          ))}
        </details>
      ) : null}
      {qa.prompt ? (
        <details className="csq-details">
          <summary>Character bible & prompt</summary>
          {(qa.review_fixes || []).length ? <div className="video-hint">Review fixed: {qa.review_fixes.join(" · ")}</div> : null}
          <pre className="csq-pre">{qa.prompt}</pre>
          {view && view.number > 1 ? <pre className="csq-pre">{`Attempt ${view.number} (${view.mode}):
${view.prompt}`}</pre> : null}
          {qa.bible ? <pre className="csq-pre">{JSON.stringify(qa.bible, null, 2)}</pre> : null}
        </details>
      ) : null}
    </div>
  );
}
