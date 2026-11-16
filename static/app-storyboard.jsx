// Storyboard tool.
//
// Rendered by App in frontend/app.jsx, which passes in the state and handlers each view reads.
// The tool's state stays in App because it is saved per project and shared between tools
// (e.g. Character Sheets feed Video Generation and Long Duration).

function renderStoryboardTool({
  activeProjectGroupId, addGeneratedAssetToProjectGroup, isProjectToolContext, onClearWorldBuilding,
  onWbAddRefImages, onWbAddRefVideos, onWbGeneratePrompts, projectMode, removeLongLinkedRefs,
  removeVideoLinkedRefs, renderModelLine, saveGeneratedAssetToProjectFolder, setModalImageUrl,
  setProjectAssetGroupError, setProjectLocalFilesError, setUseWbStoryboardForLong,
  setUseWbStoryboardForVideo, setWbAction, setWbCamera, setWbCameraTipsOpen, setWbCoreOpen,
  setWbEnvironment, setWbLighting, setWbQuality, setWbRefImages, setWbRefVideos, setWbScript,
  setWbStyle, setWbSubject, useWbStoryboardForLong, useWbStoryboardForVideo, wbAction, wbCamera,
  wbCameraTipsOpen, wbCoreOpen, wbEnvironment, wbError, wbGenerateLoading, wbLighting, wbPromptText,
  wbPromptsLoading, wbQuality, wbRefImages, wbRefVideos, wbScript, wbStoryboardImage, wbStyle,
  wbSubject
}) {
  return (
      <>
    {!projectMode ? <div className="tool-heading">Storyboard</div> : null}
    <div className="card">
      <div className="video-hint" style={{ marginBottom: 14 }}>
        Paste your script and the AI will generate a cinematic 3x3 storyboard sheet. Reference images/videos and the 7 core elements are all optional — use them to add precision.
      </div>

      {/* ── Script input (primary) ── */}
      <div className="field-label" style={{ marginBottom: 6 }}>Script <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>— paste your scene or full screenplay here</span></div>
      <textarea
        className="video-input"
        rows="6"
        placeholder={"INT. COFFEE SHOP - DAY\n\nSARA walks in, scanning the crowd. She spots MIKE sitting at a corner table, staring at his phone. Their eyes meet...\n\nYou can paste any format: screenplay, scene outline, or plain description."}
        value={wbScript}
        onChange={(e) => setWbScript(e.target.value)}
        style={{ marginBottom: 14 }}
      />

      {/* ── Reference assets ── */}
      <div className="field-label" style={{ marginBottom: 8 }}>Reference images / videos <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional, up to 4 each)</span></div>
      <div className="tile-grid" style={{ marginBottom: 0 }}>
        <input
          className="sr-only"
          id="wb-ref-images"
          type="file"
          accept={REFERENCE_IMAGE_ACCEPT}
          multiple
          onChange={(e) => e.target.files && onWbAddRefImages(e.target.files)}
        />
        <div className="upload-tile" role="button" tabIndex="0" aria-label="Upload storyboard reference images" onClick={() => document.getElementById("wb-ref-images").click()}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="2"></rect>
            <path d="m3 16 5-5 4 4 5-6 4 5"></path>
            <path d="M12 8v6"></path>
            <path d="M9 11h6"></path>
          </svg>
          <div className="tile-title">Images</div>
          <div className="tile-meta">{wbRefImages.length ? `${wbRefImages.length} selected` : "0–4"}</div>
        </div>
        <input
          className="sr-only"
          id="wb-ref-videos"
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          multiple
          onChange={(e) => e.target.files && onWbAddRefVideos(e.target.files)}
        />
        <div className="upload-tile" role="button" tabIndex="0" aria-label="Upload storyboard reference videos" onClick={() => document.getElementById("wb-ref-videos").click()}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          <div className="tile-title">Videos</div>
          <div className="tile-meta">{wbRefVideos.length ? `${wbRefVideos.length} selected` : "0–4"}</div>
        </div>
      </div>
      {(wbRefImages.length || wbRefVideos.length) ? (
        <div className="file-chips" style={{ marginTop: 10 }}>
          {wbRefImages.map((img, idx) => (
            <span className="chip" key={`wb-ref-img-${img.name}-${idx}`}>
              Img {idx + 1}: {img.name}
              <span className="remove" onClick={() => setWbRefImages((prev) => prev.filter((_, i) => i !== idx))} role="button" tabIndex="0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"></path><path d="M6 6l12 12"></path></svg>
              </span>
            </span>
          ))}
          {wbRefVideos.map((vid, idx) => (
            <span className="chip" key={`wb-ref-vid-${vid.name}-${idx}`}>
              Vid {idx + 1}: {vid.name}
              <span className="remove" onClick={() => setWbRefVideos((prev) => prev.filter((_, i) => i !== idx))} role="button" tabIndex="0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"></path><path d="M6 6l12 12"></path></svg>
              </span>
            </span>
          ))}
        </div>
      ) : null}

      {/* ── 7 Core elements (optional / collapsible) ── */}
      <div style={{ marginTop: 16, border: "1px solid var(--border)", borderRadius: 10 }}>
        <button
          type="button"
          onClick={() => setWbCoreOpen((prev) => !prev)}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 14px", background: "transparent", border: "none", color: "inherit", cursor: "pointer", textAlign: "left" }}
        >
          <span className="field-label" style={{ marginBottom: 0 }}>
            7 Core elements
            <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "var(--text-secondary)", marginLeft: 6 }}>(optional — override or refine the script)</span>
          </span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, color: "var(--text-secondary)", flexShrink: 0, transform: wbCoreOpen ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform .15s" }}>
            <path d="M6 9l6 6 6-6"></path>
          </svg>
        </button>
        {wbCoreOpen ? (
          <div style={{ padding: "0 14px 14px" }}>
            <div className="config-grid" style={{ marginTop: 0, marginBottom: 10 }}>
              <div>
                <div className="field-label">Subject</div>
                <textarea className="video-input char-textarea" rows="2" placeholder='e.g. "middle-aged Viking king with a facial scar and white wolf-fur cloak"' value={wbSubject} onChange={(e) => setWbSubject(e.target.value)} />
              </div>
              <div>
                <div className="field-label">Action</div>
                <textarea className="video-input char-textarea" rows="2" placeholder='e.g. "slowly draws his battle axe while staring at distant enemy ships"' value={wbAction} onChange={(e) => setWbAction(e.target.value)} />
              </div>
              <div>
                <div className="field-label">Environment</div>
                <textarea className="video-input char-textarea" rows="2" placeholder='e.g. "snow-covered northern coast during a blizzard"' value={wbEnvironment} onChange={(e) => setWbEnvironment(e.target.value)} />
              </div>
              <div>
                <div className="field-label">Lighting</div>
                <textarea className="video-input char-textarea" rows="2" placeholder='e.g. "low-angle cold blue light with contrasting orange firelight"' value={wbLighting} onChange={(e) => setWbLighting(e.target.value)} />
              </div>
              <div>
                <div className="field-label">Camera</div>
                <textarea className="video-input char-textarea" rows="2" placeholder="e.g. &quot;wide shot with a slow push-in to the character&#39;s face&quot;" value={wbCamera} onChange={(e) => setWbCamera(e.target.value)} />
                <div style={{ marginTop: 8, border: "1px solid var(--border)", borderRadius: 10, background: "var(--panel)" }}>
                  <button
                    type="button"
                    onClick={() => setWbCameraTipsOpen((prev) => !prev)}
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 12, background: "transparent", border: "none", color: "inherit", cursor: "pointer", textAlign: "left" }}
                  >
                    <span className="field-label" style={{ marginBottom: 0 }}>Camera angle helper</span>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{wbCameraTipsOpen ? "Hide" : "Show"}</span>
                  </button>
                  {wbCameraTipsOpen ? (
                    <div style={{ padding: "0 12px 12px", fontSize: 12, color: "var(--text-secondary)", display: "grid", gap: 6, lineHeight: 1.5 }}>
                      <div><strong style={{ color: "var(--text-primary)" }}>Push-in</strong> - moves toward the subject. Builds tension. Creates intimacy. Use it slowly.</div>
                      <div><strong style={{ color: "var(--text-primary)" }}>Pull-back</strong> - retreats to reveal. Isolation. Scale. Endings. The reveal shot.</div>
                      <div><strong style={{ color: "var(--text-primary)" }}>Pan</strong> - horizontal rotation, camera stays fixed. Suspense lives in what you haven&apos;t shown yet.</div>
                      <div><strong style={{ color: "var(--text-primary)" }}>Tilt</strong> - vertical version of the pan. Tilt up on a hero. They look powerful immediately.</div>
                      <div><strong style={{ color: "var(--text-primary)" }}>Tracking shot</strong> - camera travels with the subject. Energy. Forward motion. You feel like you&apos;re there.</div>
                      <div><strong style={{ color: "var(--text-primary)" }}>Arc / orbit</strong> - circles the subject. Hero moments. Product showcases. Keep it under 30 degrees.</div>
                      <div><strong style={{ color: "var(--text-primary)" }}>Crane / jib</strong> - sweeps vertically on a boom. Grandeur. Scale. The &quot;god-view&quot; of cinematography.</div>
                      <div><strong style={{ color: "var(--text-primary)" }}>Zoom</strong> - focal length changes, camera doesn&apos;t move. Flatter look than a dolly. Fast zoom = music video energy.</div>
                      <div><strong style={{ color: "var(--text-primary)" }}>Dolly zoom</strong> - camera goes one way, lens goes the other. Background warps. Subject stays still. Pure psychological dread.</div>
                      <div><strong style={{ color: "var(--text-primary)" }}>Whip pan / crash zoom</strong> - extreme speed for transitions. Shock. Comedy. Stops the scroll every time.</div>
                      <div><strong style={{ color: "var(--text-primary)" }}>Handheld</strong> - natural shake, no stabilisation. Add &quot;subtle&quot; or the model goes full earthquake.</div>
                      <div><strong style={{ color: "var(--text-primary)" }}>Static + angles</strong> - low, high, Dutch, bird&apos;s-eye, worm&apos;s-eye. Low angle = power. Dutch angle = unease. Bird&apos;s-eye = scale.</div>
                    </div>
                  ) : null}
                </div>
              </div>
              <div>
                <div className="field-label">Style</div>
                <textarea className="video-input char-textarea" rows="2" placeholder='e.g. "cinematic 8K photorealism with film grain"' value={wbStyle} onChange={(e) => setWbStyle(e.target.value)} />
              </div>
            </div>
            <div>
              <div className="field-label">Quality</div>
              <textarea className="video-input char-textarea" rows="2" placeholder='e.g. "sharp details, realistic depth of field"' value={wbQuality} onChange={(e) => setWbQuality(e.target.value)} />
            </div>
          </div>
        ) : null}
      </div>

      <hr className="divider" />
      {renderModelLine([["image", "3×3 storyboard sheet"], ["prompt", "storyboard and video prompt writing"]])}
      <div className="btn-row" style={{ marginTop: 14, marginBottom: 14 }}>
        <button
          className="btn-primary"
          disabled={wbPromptsLoading || wbGenerateLoading || (!wbScript.trim() && !wbSubject.trim() && !wbAction.trim() && !wbEnvironment.trim() && !wbLighting.trim() && !wbCamera.trim() && !wbStyle.trim() && !wbQuality.trim() && !wbRefImages.length)}
          onClick={onWbGeneratePrompts}
        >
          {wbPromptsLoading ? "Generating prompts…" : (wbGenerateLoading ? "Generating storyboard image…" : "Generate storyboard")}
        </button>
        <button className="btn-ghost" onClick={onClearWorldBuilding} disabled={wbPromptsLoading || wbGenerateLoading}>
          Clear
        </button>
      </div>

      {wbPromptText ? (
        <div style={{ marginBottom: 14 }}>
          <div className="field-label" style={{ marginBottom: 8 }}>Generated Seedream storyboard prompt</div>
          <textarea
            className="video-input char-textarea"
            rows="16"
            value={wbPromptText}
            readOnly
          />
        </div>
      ) : null}

      {wbError ? <div className="error-box" style={{ marginTop: 10 }}>{wbError}</div> : null}

      {wbStoryboardImage ? (
        <div style={{ marginTop: 16 }}>
          <div className="field-label" style={{ marginBottom: 10 }}>Storyboard image</div>
          <div className="video-hint" style={{ marginBottom: 10 }}>One 3x3 cinematic storyboard sheet with 9 sequential panels and thin separators only, with no text or description strips below the panels.</div>
          <img
            src={wbStoryboardImage}
            alt="Storyboard sheet"
            style={{ width: "100%", maxWidth: 760, borderRadius: 10, border: "1px solid var(--border)", cursor: "zoom-in", display: "block" }}
            onClick={() => setModalImageUrl(wbStoryboardImage)}
          />
          {isProjectToolContext("storyboard") ? (
            <div className="sheet-link-row" style={{ marginTop: 12 }}>
              <button
                className="btn-action"
                disabled={!activeProjectGroupId}
                onClick={() => {
                  addGeneratedAssetToProjectGroup({
                    toolKey: "storyboard",
                    dataUrl: wbStoryboardImage,
                    name: "Storyboard",
                    keyHint: "storyboard",
                    resultKey: "storyboard",
                  }).catch((e) => setProjectAssetGroupError(String(e?.message || e)));
                }}
              >
                Add to asset group
              </button>
            </div>
          ) : null}
          {isProjectToolContext("storyboard") ? (
            <div className="sheet-link-row" style={{ marginTop: 12 }}>
              <button
                className="btn-action"
                onClick={() => {
                  saveGeneratedAssetToProjectFolder({
                    toolKey: "storyboard",
                    dataUrl: wbStoryboardImage,
                    name: "Storyboard",
                  }).catch((e) => setProjectLocalFilesError(String(e?.message || e)));
                }}
              >
                Save locally
              </button>
            </div>
          ) : null}
          <div className="sheet-link-row" style={{ marginTop: 12 }}>
            <label className="sheet-chip checkbox-chip" data-checked={useWbStoryboardForVideo ? "true" : "false"}>
              <input
                type="checkbox"
                checked={useWbStoryboardForVideo}
                onChange={(e) => {
                  const next = !!e.target.checked;
                  setUseWbStoryboardForVideo(next);
                  if (!next) removeVideoLinkedRefs("wb-storyboard");
                }}
              />
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5"></path>
              </svg>
              Use as reference for video generation
            </label>
            <label className="sheet-chip checkbox-chip" data-checked={useWbStoryboardForLong ? "true" : "false"}>
              <input
                type="checkbox"
                checked={useWbStoryboardForLong}
                onChange={(e) => {
                  const next = !!e.target.checked;
                  setUseWbStoryboardForLong(next);
                  if (!next) removeLongLinkedRefs("wb-storyboard");
                }}
              />
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5"></path>
              </svg>
              Use as reference for long duration generation
            </label>
          </div>
        </div>
      ) : null}
    </div>
      </>
    );
}
