// Long Duration tool.
//
// Rendered by App in frontend/app.jsx, which passes in the state and handlers each view reads.
// The tool's state stays in App because it is saved per project and shared between tools
// (e.g. Character Sheets feed Video Generation and Long Duration).

function renderLongDurationTool({
  activeProjectGroupId, activeProjectId, addGeneratedAssetToProjectGroup, addLongShotRefAudios,
  addLongShotRefImages, addLongShotRefVideos, applyLongShotUpdate, applyLongShotVariantUpdate,
  downloadImage, ffmpegAvailable, formatElapsed, isProjectToolContext, isTextOverlayProjectId,
  longAutoTextOverlays, longCombineError, longCombineLoading, longCombineTake, longCombineVideoCount,
  longCombinedUrl, longDuration, longExpanded, longFps, longModel, longModelSpec, longOutputFormat,
  longRatio, longReadyShotsCount, longResolution, longSeed, longSharedPool, longShotDuration,
  longShotImageNumbers, longShotPool, longShotTextOverlayTarget, longShots, onAddLongShot,
  onClearLongShot, onCombineLongShots, onGenerateLongShot, onUploadShotASeedVideo,
  openLongShotAssetReferencePicker, projectMode, promptSkillsSummary, renderTextOverlaySection,
  saveGeneratedAssetToProjectFolder, selectLongShotVariant, setLongAutoTextOverlays,
  setLongCombinePick, setLongDuration, setLongExpanded, setLongExtraRefImages, setLongFps,
  setLongLinkedSheetRefs, setLongModel, setLongOutputFormat, setLongRatio, setLongResolution,
  setLongSeed, setLongShots, setModalImageUrl, setProjectAssetGroupError, setProjectLocalFilesError,
  setShotASeedError, setShotASeedSource, setShotASeedSourceUrl, setShotASeedVideoAssetId,
  setShotASeedVideoAssetUrl, setShotASeedVideoDataUrl, setShotASeedVideoName,
  setUseVideoRefVideosForShotA, shotASeedError, shotASeedLoading, shotASeedSource,
  shotASeedVideoAssetId, shotASeedVideoName, suggestLongShotRoles, updateLongShot
}) {
  return (
      <>
    {!projectMode ? <div className="tool-heading">Long Duration</div> : null}
    <div className="long-context">Generate shots sequentially — each shot uses the previous shot's last frame as its start frame.</div>
    <div className="card">
      {longSharedPool.length ? (
        <div style={{ marginBottom: 14 }}>
          <div className="field-label">Shared references <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>— each shot chooses which of these it uses</span></div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {longSharedPool.map((it) => (
              <div key={it.poolKey} style={{ width: 120, border: "0.5px solid var(--border-2)", borderRadius: 10, overflow: "hidden", position: "relative", background: "#fff" }}>
                <img src={it.dataUrl} alt="" style={{ width: "100%", height: 70, objectFit: "cover", display: "block", cursor: "zoom-in" }} onClick={() => setModalImageUrl(it.dataUrl)} />
                <div style={{ fontSize: 11.5, padding: "4px 6px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={it.name}>{it.name}</div>
                <button type="button" aria-label={`Remove ${it.name}`} onClick={() => {
                  setLongLinkedSheetRefs((prev) => (prev || []).filter((x) => (x.key || x.name) !== (it.key || it.name)));
                  setLongExtraRefImages((prev) => (prev || []).filter((x) => (x.key || x.name) !== (it.key || it.name)));
                }} style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: 10, border: 0, background: "rgba(0,0,0,.6)", color: "#fff", cursor: "pointer", fontSize: 12, lineHeight: "20px", padding: 0 }}>×</button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <div className="field-label">Long Duration Settings</div>
      <div className="config-grid" style={{ marginTop: 0, marginBottom: 14 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <div className="field-label">Model</div>
          <select
            className="select-input"
            value={longModelSpec.id}
            onChange={(e) => {
              const nextId = e.target.value;
              const clamped = clampVideoSettingsToModel(nextId, longResolution, longDuration, MIN_LONG_DURATION);
              setLongModel(nextId);
              setLongResolution(clamped.resolution);
              setLongDuration(clamped.duration);
            }}
          >
            {VIDEO_MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
          <div className="video-hint">
            {longModelSpec.id} · max {longModelSpec.maxDuration}s · {longModelSpec.resolutions.map((r) => RESOLUTION_LABELS[r] || r).join(" / ")} · used for every shot in the sequence
          </div>
          <VideoFormatTable currentId={longModelSpec.id} />
        </div>
        <div>
          <div className="field-label">Resolution</div>
          <select className="select-input" value={longResolution} onChange={(e) => setLongResolution(e.target.value)}>
            {longModelSpec.resolutions.map((r) => (
              <option key={r} value={r}>{RESOLUTION_LABELS[r] || r}</option>
            ))}
          </select>
        </div>
        <div>
          <div className="field-label">Frame rate</div>
          <select className="select-input" value={String(longFps)} onChange={(e) => setLongFps(Number(e.target.value))}>
            <option value="24">24fps</option>
          </select>
        </div>
        <div>
          <div className="field-label">Output format</div>
          <select className="select-input" value={longModelSpec.mov && !false && longOutputFormat === "mov" ? "mov" : "mp4"} disabled={!longModelSpec.mov || false} onChange={(e) => setLongOutputFormat(e.target.value)}>
            <option value="mp4">MP4</option>
            {longModelSpec.mov ? <option value="mov">MOV</option> : null}
          </select>
          <div className="video-hint">{!longModelSpec.mov ? "MOV is available on Seedance 2.5 and 2.5 flash." : false ? "Drafts are MP4." : longOutputFormat === "mov" ? "Full-colour 4:4:4 for grading and keying. A playable MP4 preview is made for the app; download the MOV from the result." : "MOV (4:4:4, PCM audio) is available for this model."}</div>
          <YuvExplainer />
        </div>
        <div>
          <div className="field-label">Default duration <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>— for shots whose prompt states no runtime</span></div>
          <DurationInput value={longDuration} min={MIN_LONG_DURATION} max={longModelSpec.maxDuration} onChange={(v) => setLongDuration(v)} />
        </div>
        <div>
          <div className="field-label">Ratio</div>
          <RatioInput value={longRatio} onChange={setLongRatio} />
        </div>
        <div>
          <div className="field-label">Seed</div>
          <input
            className="text-input"
            type="number"
            min="-1"
            max="4294967295"
            step="1"
            value={String(longSeed)}
            onChange={(e) => {
              const value = e.target.value.trim();
              setLongSeed(value === "" ? -1 : Number(value));
            }}
            placeholder="-1 for random"
          />
        </div>
      </div>
      {longShots.map((s, idx) => {
        const expanded = longExpanded[s.label] !== false;
        const isDone = !!s.videoUrl;
        const readyTakes = (s.variants || []).filter((v) => !!v.url).length;
        const statusText = (() => {
          if (s.loading) return "Generating…";
          if (s.error) return "Error";
          if (isDone) return `Done · ${s.generatedDuration || longShotDuration(s).value}s${readyTakes > 1 ? ` · ${readyTakes} takes` : ""}`;
          return "No result yet";
        })();
        return (
          <div key={s.label} className={"shot-card" + (expanded ? "" : " collapsed") + (isDone ? " done" : "")} style={{ marginTop: idx === 0 ? 0 : 12 }}>
            <div
              className="shot-header"
              role="button"
              tabIndex="0"
              aria-expanded={expanded}
              aria-label={`${s.label}, ${expanded ? "expanded" : "collapsed"}`}
              onClick={() => setLongExpanded((prev) => ({ ...prev, [s.label]: !(prev[s.label] !== false) }))}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setLongExpanded((prev) => ({ ...prev, [s.label]: !(prev[s.label] !== false) }));
                }
              }}
            >
              <div className="shot-left">
                <span className="shot-tag">{s.label.replace("SHOT", "Shot")}</span>
                <span className="shot-status">{statusText}</span>
              </div>
              <svg className="shot-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6"></path>
              </svg>
            </div>

            {expanded ? (
              <div className="shot-body">
                {longSharedPool.length ? (
                  <div style={{ marginBottom: 12 }}>
                    <div className="field-label">References in this shot <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>— only the selected ones are sent</span></div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {longSharedPool.map((it) => {
                        const on = longShotPool(s).some((x) => x.poolKey === it.poolKey);
                        return (
                          <label key={it.poolKey} className="sheet-chip checkbox-chip" data-checked={on ? "true" : "false"}>
                            <input type="checkbox" checked={on} disabled={s.loading} onChange={() => {
                              const current = longShotPool(s).map((x) => x.poolKey);
                              const next = on ? current.filter((k) => k !== it.poolKey) : longSharedPool.map((x) => x.poolKey).filter((k) => k === it.poolKey || current.includes(k));
                              updateLongShot(idx, { poolKeys: next });
                            }} />
                            <img src={it.dataUrl} alt="" style={{ width: 18, height: 18, borderRadius: 4, objectFit: "cover" }} />
                            {it.name}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <div className="field-label" style={{ margin: 0, flex: 1 }}>Reference roles <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>— added to the start of the prompt as written</span></div>
                    <button type="button" className="btn-link" disabled={s.loading} onClick={() => updateLongShot(idx, { refRoles: suggestLongShotRoles(idx, s) })}>Fill from references</button>
                  </div>
                  <textarea className="video-input" rows="3" disabled={s.loading} value={s.refRoles || ""}
                            onChange={(e) => updateLongShot(idx, { refRoles: e.target.value })}
                            placeholder={"@Image2 is Annelise Voss\n@Image3 is Ingrid Falkenrath"} style={{ fontSize: 12.5 }} />
                  {(() => {
                    const nums = longShotImageNumbers(idx, s);
                    const parts = [nums.hasStart ? "Image 1 = start frame" : null, ...nums.pool.map((r) => `Image ${r.n} = ${r.name}`), ...nums.uploads.map((r) => `Image ${r.n} = ${r.name}`)].filter(Boolean);
                    return parts.length ? <div className="video-hint" style={{ marginTop: 4 }}>Numbering for this shot: {parts.join(" · ")}</div> : null;
                  })()}
                </div>
                <div className="tile-grid">
                  <input
                    className="sr-only"
                    id={`shot-${idx}-images`}
                    type="file"
                    accept={REFERENCE_IMAGE_ACCEPT}
                    multiple
                    disabled={s.loading}
                    onChange={async (e) => {
                      updateLongShot(idx, { refImageError: "" });
                      await addLongShotRefImages(idx, e.target.files);
                      e.target.value = "";
                    }}
                  />
                  <div className="upload-tile" role="button" tabIndex="0" onClick={() => document.getElementById(`shot-${idx}-images`).click()}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="16" rx="2"></rect>
                      <path d="m3 16 5-5 4 4 5-6 4 5"></path>
                    </svg>
                    <div className="tile-title">Reference images</div>
                    <div className="tile-meta">{(s.refImages || []).length ? `${(s.refImages || []).length} of ${getVideoModelSpec(longModel).refs.images}` : `0–${getVideoModelSpec(longModel).refs.images}`}</div>
                  </div>

                  <div
                    className="upload-tile"
                    role="button"
                    tabIndex="0"
                    onClick={() => {
                      updateLongShot(idx, { refImageError: "" });
                      if (!projectMode || !activeProjectId) {
                        updateLongShot(idx, { refImageError: "Open long duration inside a project to use its asset group." });
                        return;
                      }
                      openLongShotAssetReferencePicker(activeProjectId, idx);
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="16" rx="2"></rect>
                      <path d="M3 10h18"></path>
                      <path d="M8 15h8"></path>
                      <path d="M8 18h5"></path>
                    </svg>
                    <div className="tile-title">Asset group</div>
                    <div className="tile-meta">
                      {(
                        (s.refImages || []).filter((x) => x?.origin === "group").length +
                        (idx > 0 ? (s.refVideos || []).filter((x) => x?.origin === "group").length : (shotASeedSource === "group" && shotASeedVideoAssetId ? 1 : 0))
                      ) ? `${
                        (s.refImages || []).filter((x) => x?.origin === "group").length +
                        (idx > 0 ? (s.refVideos || []).filter((x) => x?.origin === "group").length : (shotASeedSource === "group" && shotASeedVideoAssetId ? 1 : 0))
                      } selected` : "Project only"}
                    </div>
                  </div>

                  <input
                    className="sr-only"
                    id={`shot-${idx}-audio`}
                    type="file"
                    accept="audio/*"
                    multiple
                    disabled={s.loading}
                    onChange={async (e) => {
                      updateLongShot(idx, { refAudioError: "" });
                      await addLongShotRefAudios(idx, e.target.files);
                      e.target.value = "";
                    }}
                  />
                  <div className="upload-tile" role="button" tabIndex="0" onClick={() => document.getElementById(`shot-${idx}-audio`).click()}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18V5l12-2v13"></path>
                      <circle cx="7" cy="18" r="3"></circle>
                      <circle cx="19" cy="16" r="3"></circle>
                    </svg>
                    <div className="tile-title">Reference audio</div>
                    <div className="tile-meta">{`${(s.refAudios || []).length ? `${(s.refAudios || []).length} of ` : "0–"}${getVideoModelSpec(longModel).refs.audios} · ≤${getVideoModelSpec(longModel).refs.audioSec}s`}</div>
                  </div>

                  {idx === 0 ? (
                    <>
                      <input
                        className="sr-only"
                        id={`shot-a-seed`}
                        type="file"
                        accept="video/*"
                        disabled={shotASeedLoading || s.loading}
                        onChange={(e) => {
                          const f = e.target.files && e.target.files[0];
                          onUploadShotASeedVideo(f);
                          e.target.value = "";
                        }}
                      />
                      <div className="upload-tile" role="button" tabIndex="0" onClick={() => document.getElementById(`shot-a-seed`).click()}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m22 8-6 4 6 4V8Z"></path>
                          <rect x="2" y="6" width="14" height="12" rx="2"></rect>
                        </svg>
                        <div className="tile-title">Reference video</div>
                        <div className="tile-meta">{shotASeedVideoName ? "1 selected" : "Optional"}</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <input
                        className="sr-only"
                        id={`shot-${idx}-videos`}
                        type="file"
                        accept="video/*"
                        multiple
                        disabled={s.loading}
                        onChange={async (e) => {
                          updateLongShot(idx, { refVideoError: "" });
                          await addLongShotRefVideos(idx, e.target.files);
                          e.target.value = "";
                        }}
                      />
                      <div className="upload-tile" role="button" tabIndex="0" onClick={() => document.getElementById(`shot-${idx}-videos`).click()}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m22 8-6 4 6 4V8Z"></path>
                          <rect x="2" y="6" width="14" height="12" rx="2"></rect>
                        </svg>
                        <div className="tile-title">Reference video</div>
                        <div className="tile-meta">{`${(s.refVideos || []).length ? `${(s.refVideos || []).length} of ` : "0–"}${getVideoModelSpec(longModel).refs.videos} · ≤${getVideoModelSpec(longModel).refs.videoSec}s`}</div>
                      </div>
                    </>
                  )}
                </div>

                {(s.refImages || []).length ? (
                  <div className="file-chips">
                    {(s.refImages || []).map((it, iIdx) => (
                      <span className="chip" key={`shot-${idx}-img-${it.name}-${iIdx}`}>
                        Image {iIdx + 1}: {it.name}
                        <span
                          className="remove"
                          onClick={() => setLongShots((prev) => prev.map((sh, j) => j === idx ? { ...sh, refImages: (sh.refImages || []).filter((_, k) => k !== iIdx) } : sh))}
                          role="button"
                          tabIndex="0"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6 6 18"></path>
                            <path d="M6 6l12 12"></path>
                          </svg>
                        </span>
                      </span>
                    ))}
                  </div>
                ) : null}

                {(s.refAudios || []).length ? (
                  <div className="file-chips">
                    {(s.refAudios || []).map((it, aIdx) => (
                      <span className="chip" key={`shot-${idx}-aud-${it.name}-${aIdx}`}>
                        Audio {aIdx + 1}: {it.name} ({Math.round(Number(it.duration || 0) * 10) / 10}s)
                        <span
                          className="remove"
                          onClick={() => setLongShots((prev) => prev.map((sh, j) => j === idx ? { ...sh, refAudios: (sh.refAudios || []).filter((_, k) => k !== aIdx) } : sh))}
                          role="button"
                          tabIndex="0"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6 6 18"></path>
                            <path d="M6 6l12 12"></path>
                          </svg>
                        </span>
                      </span>
                    ))}
                  </div>
                ) : null}

                {idx === 0 && shotASeedVideoName ? (
                  <div className="file-chips">
                    <span className="chip">
                      Video: {shotASeedVideoName}
                      <span
                        className="remove"
                        onClick={() => {
                          setUseVideoRefVideosForShotA(false);
                          setShotASeedError("");
                          setShotASeedVideoName("");
                          setShotASeedVideoDataUrl("");
                          setShotASeedVideoAssetId("");
                          setShotASeedVideoAssetUrl("");
                          setShotASeedSource("");
                          setShotASeedSourceUrl("");
                        }}
                        role="button"
                        tabIndex="0"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 6 6 18"></path>
                          <path d="M6 6l12 12"></path>
                        </svg>
                      </span>
                    </span>
                  </div>
                ) : null}

                {idx > 0 && (s.refVideos || []).length ? (
                  <div className="file-chips">
                    {(s.refVideos || []).map((it, vIdx) => (
                      <span className="chip" key={`shot-${idx}-vid-${it.name}-${vIdx}`}>
                        Video {vIdx + 1}: {it.name} ({Math.round(Number(it.duration || 0) * 10) / 10}s)
                        <span
                          className="remove"
                          onClick={() => setLongShots((prev) => prev.map((sh, j) => j === idx ? { ...sh, refVideos: (sh.refVideos || []).filter((_, k) => k !== vIdx) } : sh))}
                          role="button"
                          tabIndex="0"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6 6 18"></path>
                            <path d="M6 6l12 12"></path>
                          </svg>
                        </span>
                      </span>
                    ))}
                  </div>
                ) : null}

                {shotASeedError && idx === 0 ? <div className="error-box">{shotASeedError}</div> : null}
                {s.refVideoError ? <div className="error-box">{s.refVideoError}</div> : null}
                {s.refImageError ? <div className="error-box">{s.refImageError}</div> : null}
                {s.refAudioError ? <div className="error-box">{s.refAudioError}</div> : null}

                <textarea
                  className="video-input shot-prompt"
                  value={s.prompt}
                  disabled={s.loading}
                  onChange={(e) => updateLongShot(idx, { prompt: e.target.value })}
                  placeholder={`Describe this shot…`}
                />
                {(() => {
                  const d = longShotDuration(s);
                  const spec = getVideoModelSpec(longModel);
                  return (
                    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "10px 0 4px", flexWrap: "wrap" }}>
                      <div className="field-label" style={{ margin: 0, minWidth: 70 }}>Duration</div>
                      <div style={{ flex: "1 1 260px", maxWidth: 420 }}>
                        <DurationInput value={d.value} min={MIN_LONG_DURATION} max={spec.maxDuration} disabled={s.loading}
                                       onChange={(v) => updateLongShot(idx, { duration: v })} />
                      </div>
                      <span className="video-hint" style={{ margin: 0 }}>
                        {d.source === "prompt"
                          ? (d.stated > spec.maxDuration ? `From the prompt (${d.stated}s, capped at Seedance ${spec.label}'s ${spec.maxDuration}s)` : "From the prompt's runtime")
                          : d.source === "set" ? "Set for this shot" : "Default — the prompt states no runtime"}
                      </span>
                      {d.source === "set" && runtimeFromPrompt(s.prompt) ? (
                        <button type="button" className="btn-link" disabled={s.loading} onClick={() => updateLongShot(idx, { duration: 0 })}>Use the prompt's {runtimeFromPrompt(s.prompt)}s</button>
                      ) : null}
                    </div>
                  );
                })()}

                {projectMode && isTextOverlayProjectId(activeProjectId)
                  ? renderTextOverlaySection(longShotTextOverlayTarget(idx), {
                    auto: longAutoTextOverlays,
                    onToggleAuto: setLongAutoTextOverlays,
                    busy: s.loading,
                    keyPrefix: `long-${s.label}`,
                  })
                  : null}

                <div className="shot-actions">
                  <button
                    className="btn-primary"
                    aria-label={`Generate ${s.label.replace("SHOT", "Shot")}`}
                    disabled={s.loading || (idx === 0 && shotASeedLoading) || (idx > 0 && !longShots[idx - 1].videoUrl)}
                    onClick={() => onGenerateLongShot(idx)}
                  >
                    {s.loading
                      ? `Generating… ${(s.variants || []).filter((v) => v.url || v.error).length}/${(s.variants || []).length || VIDEO_VARIANT_COUNT}`
                      : "Generate"}
                  </button>
                  <button
                    className="btn-ghost"
                    disabled={s.loading}
                    onClick={() => onClearLongShot(idx)}
                  >
                    Clear
                  </button>
                </div>

                {s.generatedPrompt ? (
                  <div className="video-hint" style={{ marginBottom: 4 }}>{promptSkillsSummary()}</div>
                ) : null}
                {s.generatedPrompt ? (
                  <div className="video-status">
                    Generated prompt (LLM):
                    <div style={{ marginTop: 8, fontFamily: "var(--mono)", fontSize: 12, whiteSpace: "pre-wrap", border: "0.5px solid var(--border)", borderRadius: "var(--radius-sm)", padding: 10, background: "var(--surface-2)" }}>
                      {s.generatedPrompt}
                    </div>
                  </div>
                ) : null}
                {s.error ? <div className="error-box">{s.error}</div> : null}
                {(s.variants || []).length ? (
                  <>
                    <div className="variant-row">
                      {(s.variants || []).map((variant, vIdx) => {
                        const isSelected = variant.url && vIdx === (Number(s.selectedVariant) || 0);
                        const takeName = `${s.label || `Shot ${idx + 1}`} — Take ${vIdx + 1}`;
                        // The chosen take is what the next shot starts
                        // from, so name that shot on the button.
                        const nextShotLabel = (longShots[idx + 1]?.label || "").replace("SHOT", "Shot");
                        return (
                          <div className={"variant-cell" + (isSelected ? " selected" : "")} key={`shot-${idx}-take-${vIdx}`}>
                            <div className="variant-head">
                              <span className="variant-label">Take {vIdx + 1}</span>
                              <span className="variant-state">
                                {variant.error
                                  ? "failed"
                                  : variant.url
                                    ? (isSelected ? (nextShotLabel ? `for ${nextShotLabel}` : "in sequence") : "ready")
                                    : `${variant.status || "queued"}${formatElapsed(variant.startedAt) ? ` · ${formatElapsed(variant.startedAt)}` : ""}`}
                              </span>
                            </div>
                            {variant.url ? (
                              <video className="video-player" controls src={variant.url} />
                            ) : (
                              <div className="variant-placeholder">{variant.error ? "Generation failed" : `Generating… ${formatElapsed(variant.startedAt)}`}</div>
                            )}
                            {variant.taskId ? <div className="variant-meta">Task ID: {variant.taskId}</div> : null}
                            {variant.error ? <div className="error-box">{variant.error}</div> : null}
                            {variant.url ? (
                              <div className="result-footer">
                                <button
                                  className="btn-action"
                                  disabled={isSelected || s.loading}
                                  onClick={() => selectLongShotVariant(idx, s.label, vIdx)}
                                >
                                  {nextShotLabel
                                    ? (isSelected ? `Passed to ${nextShotLabel}` : `Use for ${nextShotLabel}`)
                                    : (isSelected ? "In sequence" : "Use this take")}
                                </button>
                                {isProjectToolContext("long-duration") ? (
                                  <button
                                    className="btn-action"
                                    disabled={!activeProjectGroupId}
                                    onClick={() => {
                                      addGeneratedAssetToProjectGroup({
                                        toolKey: "long-duration",
                                        sourceUrl: variant.url,
                                        name: takeName,
                                        keyHint: `${(s.label || `shot-${idx + 1}`).toLowerCase().replace(/\s+/g, "-")}-${vIdx + 1}`,
                                        type: "video",
                                        // Only the take that is in the sequence owns the shot's saved asset id.
                                        resultKey: isSelected ? `longShot:${s.label}` : "",
                                      }).catch((e) => setProjectAssetGroupError(String(e?.message || e)));
                                    }}
                                  >
                                    Add to asset group
                                  </button>
                                ) : null}
                                {isProjectToolContext("long-duration") ? (
                                  <button
                                    className="btn-action"
                                    onClick={() => {
                                      saveGeneratedAssetToProjectFolder({
                                        toolKey: "long-duration",
                                        sourceUrl: variant.url,
                                        name: takeName,
                                      }).then((data) => {
                                        if (!data?.file_url) return;
                                        applyLongShotVariantUpdate(activeProjectId, idx, s.label, vIdx, { url: data.file_url });
                                        if (isSelected) applyLongShotUpdate(activeProjectId, idx, s.label, { videoUrl: data.file_url });
                                      }).catch((e) => setProjectLocalFilesError(String(e?.message || e)));
                                    }}
                                  >
                                    Save locally
                                  </button>
                                ) : null}
                                <button className="btn-action" onClick={() => downloadImage(variant.url, videoModelName(variant.model || longModel), "mp4")}>{variant.movUrl ? "Download MP4 preview" : "Download"}</button>
                                {variant.movUrl ? <button className="btn-action" title="H.264 YUV 4:4:4 with PCM audio" onClick={() => downloadImage(variant.movUrl, videoModelName(variant.model || longModel), "mov")}>Download MOV</button> : null}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                    {s.videoUrl ? (
                      <div className="video-hint">
                        {longShots[idx + 1]
                          ? `The selected take is the one that gets combined, and ${(longShots[idx + 1].label || "").replace("SHOT", "Shot")} starts from its last frame.`
                          : "The selected take is the one that gets combined."}
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}

      <div
        className="add-shot-row"
        role="button"
        tabIndex="0"
        onClick={onAddLongShot}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onAddLongShot();
          }
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
          <path d="M12 5v14"></path>
          <path d="M5 12h14"></path>
        </svg>
        Add shot
      </div>

      {longShots.some((sh) => (sh.variants || []).some((v) => v && v.url)) ? (
        <div className="card" style={{ marginTop: 12, padding: 14 }}>
          <div className="field-label">Takes to combine <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>— click the take to use from each shot</span></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {longShots.map((sh, si) => {
              const takes = (sh.variants || []).map((v, ti) => ({ ...v, ti })).filter((v) => v && v.url);
              if (!takes.length) return null;
              const chosen = longCombineTake(sh);
              const next = longShots[si + 1];
              const breaks = chosen && next && (next.variants || []).some((v) => v && v.url) && next.startedFromTake != null && next.startedFromTake !== chosen.idx;
              return (
                <div key={`pick-${sh.label}`}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span className="shot-tag">{sh.label.replace("SHOT", "Shot")}</span>
                    <span className="video-hint" style={{ margin: 0 }}>{chosen ? `Take ${chosen.idx + 1}` : "Skipped"}</span>
                    <span style={{ flex: 1 }}></span>
                    <button type="button" className="btn-link" onClick={() => setLongCombinePick((p) => ({ ...p, [sh.label]: chosen ? "skip" : undefined }))}>{chosen ? "Skip this shot" : "Include"}</button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
                    {takes.map((v) => {
                      const on = chosen && chosen.idx === v.ti;
                      return (
                        <div key={v.ti} role="button" tabIndex="0" aria-pressed={!!on}
                             onClick={() => setLongCombinePick((p) => ({ ...p, [sh.label]: v.ti }))}
                             onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setLongCombinePick((p) => ({ ...p, [sh.label]: v.ti })); } }}
                             style={{ borderRadius: 10, overflow: "hidden", cursor: "pointer", border: on ? "2px solid var(--accent-2)" : "1px solid var(--border-2)", background: "#fff" }}>
                          <video src={v.url} muted playsInline preload="metadata" controls style={{ width: "100%", display: "block", background: "#000" }} onClick={(e) => e.stopPropagation()} />
                          <div style={{ padding: "5px 8px", fontSize: 12, fontWeight: on ? 600 : 400, color: on ? "var(--accent-2)" : "var(--text-secondary)" }}>
                            {on ? "✓ " : ""}Take {v.ti + 1}{Number(sh.selectedVariant) === v.ti ? " · next shot's start" : ""}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {breaks ? (
                    <div className="video-hint" style={{ color: "#B45309", marginTop: 4 }}>
                      {next.label.replace("SHOT", "Shot")} continues from Take {next.startedFromTake + 1} of this shot, so Take {chosen.idx + 1} may not match its first frame.
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
      <div className="combine-bar">
        <div className="combine-left">{longCombineVideoCount} videos ready to combine</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {longCombinedUrl ? (
            <button className="btn-ghost" onClick={() => downloadImage(longCombinedUrl, videoModelName(longModel), "mp4")}>Download</button>
          ) : null}
          <button
            className="btn-combine"
            aria-disabled={!ffmpegAvailable || longCombineLoading || longCombineVideoCount < 2 || longReadyShotsCount < 1}
            disabled={!ffmpegAvailable || longCombineLoading || longCombineVideoCount < 2 || longReadyShotsCount < 1}
            onClick={onCombineLongShots}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <path d="M7 7h10"></path>
              <path d="M7 12h10"></path>
              <path d="M7 17h10"></path>
              <path d="M4 7h.01"></path>
              <path d="M4 12h.01"></path>
              <path d="M4 17h.01"></path>
            </svg>
            {longCombineLoading ? "Combining…" : "Combine"}
          </button>
        </div>
      </div>

      {!ffmpegAvailable ? <div className="error-box">ffmpeg is not available, so combining videos is disabled.</div> : null}
      {longCombineError ? <div className="error-box">{longCombineError}</div> : null}
      {longCombinedUrl ? (
        <div className="video-wrap">
          <video className="video-player" controls src={longCombinedUrl} />
          <div className="result-footer">
            {isProjectToolContext("long-duration") ? (
              <button
                className="btn-action"
                disabled={!activeProjectGroupId}
                onClick={() => {
                  addGeneratedAssetToProjectGroup({
                    toolKey: "long-duration",
                    sourceUrl: new URL(longCombinedUrl, window.location.origin).href,
                    name: "Combined Long Duration",
                    keyHint: "long-combined",
                    type: "video",
                    resultKey: "longCombined",
                  }).catch((e) => setProjectAssetGroupError(String(e?.message || e)));
                }}
              >
                Add to asset group
              </button>
            ) : null}
            {isProjectToolContext("long-duration") ? (
              <button
                className="btn-action"
                onClick={() => {
                  saveGeneratedAssetToProjectFolder({
                    toolKey: "long-duration",
                    sourceUrl: new URL(longCombinedUrl, window.location.origin).href,
                    name: "Combined Long Duration",
                  }).catch((e) => setProjectLocalFilesError(String(e?.message || e)));
                }}
              >
                Save locally
              </button>
            ) : null}
            <button className="btn-action" onClick={() => downloadImage(longCombinedUrl, videoModelName(longModel), "mp4")}>Download</button>
          </div>
        </div>
      ) : null}
    </div>
      </>
    );
}
