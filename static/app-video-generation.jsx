// Video Generation tool: one panel per generation, plus the Text Overlay section it shares with Long Duration.
//
// Rendered by App in frontend/app.jsx, which passes in the state and handlers each view reads.
// The tool's state stays in App because it is saved per project and shared between tools
// (e.g. Character Sheets feed Video Generation and Long Duration).

function renderVideoPanelView({
  activeProjectGroupId, activeProjectId, activeSection, addGeneratedAssetToProjectGroup,
  applyVideoCloneUpdate, applyVideoJobUpdate, applyVideoVariantUpdate, downloadImage,
  duplicateVideoPanel, finalizeDraftVariant, formatDuration, formatElapsed, getMediaDurationSeconds,
  getVideoReferencePreviewLabel, i2iImage, isProjectToolContext, isTextOverlayProjectId,
  loadReferenceImagesForProject, loading, onClearVideoPanel, onGenerateVideoFor,
  openProjectAssetReferencePicker, projectMode, promptSkillsSummary, readFileAsDataUrl,
  removeVideoPanel, renderTextOverlaySection, saveGeneratedAssetToProjectFolder,
  saveRefUploadLocally, selectVideoVariant, setProjectAssetGroupError, setProjectLocalFilesError,
  setUseVideoRefVideosForShotA, shotASeedLoading, t2iImage, useI2IForVideoAll, useT2IForVideoAll,
  useVideoRefVideosForShotA, variantGenSeconds, videoDisabledHint, videoLoading,
  videoPanelTextOverlayTarget, videoUrl
}, inst) {
  const spec = getVideoModelSpec(inst.model);
  const sheetRefCount = (inst.extraRefImages || []).filter((x) => x?.origin === "sheet").length;
  const refLimits = spec.refs;
  const maxUploadRefCount = Math.max(0, refLimits.images - sheetRefCount);
  const prompt = inst.prompt || "";
  const panelDisabled = inst.loading || (inst.isMain && loading) || !prompt.trim();
  const panelDisabledHint = inst.isMain
    ? videoDisabledHint
    : (inst.loading || prompt.trim() ? "" : "Enter a video prompt to enable video generation.");
  const usesCharacterImage = inst.isMain && ((useI2IForVideoAll && i2iImage) || (useT2IForVideoAll && t2iImage));
  const imagesInputId = `video-extra-images-${inst.id}`;
  const audioInputId = `video-audio-${inst.id}`;
  const refVideosInputId = `video-ref-videos-${inst.id}`;
  const applyPanelUpdate = (patch) => {
    const jobProjectId = (activeSection === "projects" && activeProjectId) ? activeProjectId : null;
    if (inst.isMain) applyVideoJobUpdate(jobProjectId, patch);
    else applyVideoCloneUpdate(jobProjectId, inst.id, patch);
  };

  return (
    <div className="card" key={`video-panel-${inst.id}`}>
      <div className="panel-head">
        <div className="panel-title">{inst.isMain ? "Video Context" : `${inst.title} · Video Context`}</div>
        <div className="panel-head-actions">
          <button
            className="btn-icon"
            title="Duplicate this tool for another generation"
            aria-label="Duplicate video generation tool"
            onClick={() => duplicateVideoPanel(inst)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14"></path>
              <path d="M5 12h14"></path>
            </svg>
          </button>
          {!inst.isMain ? (
            <button
              className="btn-icon"
              title="Remove this duplicated tool"
              aria-label="Remove duplicated video generation tool"
              disabled={inst.loading}
              onClick={() => removeVideoPanel(inst.id)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18"></path>
                <path d="M6 6l12 12"></path>
              </svg>
            </button>
          ) : null}
        </div>
      </div>
      <textarea
        className="video-input video-prompt"
        value={prompt}
        onChange={(e) => inst.set("prompt", e.target.value)}
        placeholder="Describe the video motion, camera, and scene…"
      />
      {sheetRefCount > 0 ? (
        <div className="video-hint">Uses generated sheets 1–3 as asset references · model: {spec.id}</div>
      ) : null}
      {usesCharacterImage ? (
        <div className="video-hint">IMAGE 1: Character generated</div>
      ) : sheetRefCount > 0 ? (
        <div className="video-hint">IMAGE 1–{Math.min(3, sheetRefCount)}: Character sheet references (based on selected sheets)</div>
      ) : null}
      {projectMode && isTextOverlayProjectId(activeProjectId) ? (
        <>
          <hr className="divider" />
          {renderTextOverlaySection(videoPanelTextOverlayTarget(inst), {
            auto: inst.autoTextOverlays !== false,
            onToggleAuto: (value) => inst.set("autoTextOverlays", value),
            busy: inst.loading,
            keyPrefix: `video-${inst.id}`,
          })}
        </>
      ) : null}
      <hr className="divider" />
      <div className="field-label">Additional References</div>
      <div className="tile-grid">
        <input
          className="sr-only"
          id={imagesInputId}
          type="file"
          accept={REFERENCE_IMAGE_ACCEPT}
          multiple
          onChange={async (e) => {
            inst.set("refUploadError", "");
            const files = Array.from(e.target.files || []);
            try {
              const items = await loadReferenceImagesForProject(files, "video-ref");
              items.forEach((it) => saveRefUploadLocally(it.dataUrl, it.name));
              inst.set("extraRefImages", (prev) => {
                const sheetCount = (prev || []).filter((x) => x?.origin === "sheet").length;
                const existingUploads = (prev || []).filter((x) => x?.origin !== "sheet").length;
                const maxUploads = Math.max(0, refLimits.images - sheetCount);
                const remaining = Math.max(0, maxUploads - existingUploads);
                const accepted = items.slice(0, remaining);
                if (items.length > accepted.length) {
                  if (sheetCount > 0) {
                    inst.set("refUploadError", `Max ${maxUploads} additional reference images allowed when ${sheetCount} sheet image${sheetCount === 1 ? "" : "s"} are linked. Extra files were ignored.`);
                  } else {
                    inst.set("refUploadError", `Max ${refLimits.images} reference images for Seedance ${spec.label}. Extra files were ignored.`);
                  }
                }
                return [...(prev || []), ...accepted].slice(0, refLimits.images);
              });
            } catch (err) {
              inst.set("refUploadError", String(err?.message || err));
            }
            e.target.value = "";
          }}
        />
        <div className="upload-tile" role="button" tabIndex="0" aria-label="Upload additional reference images" onClick={() => document.getElementById(imagesInputId).click()}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="2"></rect>
            <path d="m3 16 5-5 4 4 5-6 4 5"></path>
            <path d="M12 8v6"></path>
            <path d="M9 11h6"></path>
          </svg>
          <div className="tile-title">Reference images</div>
          <div className="tile-meta">{(inst.extraRefImages || []).length ? `${(inst.extraRefImages || []).length} of ${refLimits.images}` : `0–${maxUploadRefCount}`}</div>
        </div>

        <div
          className="upload-tile"
          role="button"
          tabIndex="0"
          aria-label="Select project asset group references"
          onClick={() => {
            inst.set("refUploadError", "");
            if (!projectMode || !activeProjectId) {
              inst.set("refUploadError", "Open video generation inside a project to use its asset group.");
              return;
            }
            openProjectAssetReferencePicker(activeProjectId, inst);
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
            {projectMode && activeProjectGroupId
              ? `${(inst.extraRefImages || []).filter((x) => x?.origin === "group").length + (inst.refVideos || []).filter((x) => x?.origin === "group").length} selected`
              : "Project only"}
          </div>
        </div>

        <input
          className="sr-only"
          id={audioInputId}
          type="file"
          accept="audio/*"
          multiple
          onChange={async (e) => {
            inst.set("audioUploadError", "");
            const files = Array.from(e.target.files || []);
            if (!files.length) return;

            const nextItems = [];
            for (const f of files) {
              const duration = await getMediaDurationSeconds(f);
              const dataUrl = await readFileAsDataUrl(f);
              nextItems.push({ name: f.name, dataUrl, duration });
              saveRefUploadLocally(dataUrl, f.name);
            }
            inst.set("audioRefs", (prev) => {
              const capped = capReferenceMedia(prev || [], nextItems, refLimits.audios, refLimits.audioSec, "audio");
              if (capped.error) inst.set("audioUploadError", capped.error);
              return capped.list;
            });
            e.target.value = "";
          }}
        />
        <div className="upload-tile" role="button" tabIndex="0" aria-label="Upload audio references" onClick={() => document.getElementById(audioInputId).click()}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13"></path>
            <circle cx="7" cy="18" r="3"></circle>
            <circle cx="19" cy="16" r="3"></circle>
          </svg>
          <div className="tile-title">Audio</div>
          <div className="tile-meta">{(inst.audioRefs || []).length ? `${(inst.audioRefs || []).length} of ${refLimits.audios} · ≤${refLimits.audioSec}s` : `0–${refLimits.audios} · ≤${refLimits.audioSec}s`}</div>
        </div>

        <input
          className="sr-only"
          id={refVideosInputId}
          type="file"
          accept="video/*"
          multiple
          onChange={async (e) => {
            inst.set("refVideoUploadError", "");
            const files = Array.from(e.target.files || []);
            if (!files.length) return;

            const nextItems = [];
            for (const f of files) {
              const duration = await getMediaDurationSeconds(f);
              const dataUrl = await readFileAsDataUrl(f);
              nextItems.push({ name: f.name, dataUrl, duration });
              saveRefUploadLocally(dataUrl, f.name);
            }
            inst.set("refVideos", (prev) => {
              const capped = capReferenceMedia(prev || [], nextItems, refLimits.videos, refLimits.videoSec, "video", refLimits.videoClipSec);
              if (capped.error) inst.set("refVideoUploadError", capped.error);
              return capped.list;
            });
            e.target.value = "";
          }}
        />
        <div className="upload-tile" role="button" tabIndex="0" aria-label="Upload reference videos" onClick={() => document.getElementById(refVideosInputId).click()}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m22 8-6 4 6 4V8Z"></path>
            <rect x="2" y="6" width="14" height="12" rx="2"></rect>
          </svg>
          <div className="tile-title">Reference videos</div>
          <div className="tile-meta">{(inst.refVideos || []).length ? `${(inst.refVideos || []).length} of ${refLimits.videos} · ≤${refLimits.videoSec}s` : `0–${refLimits.videos} · ≤${refLimits.videoSec}s`}</div>
        </div>
      </div>


      {inst.refUploadError ? <div className="error-box">{inst.refUploadError}</div> : null}
      {inst.audioUploadError ? <div className="error-box">{inst.audioUploadError}</div> : null}
      {inst.refVideoUploadError ? <div className="error-box">{inst.refVideoUploadError}</div> : null}

      {(inst.extraRefImages || []).length || (inst.audioRefs || []).length || (inst.refVideos || []).length ? (
        <div className="file-chips">
          {(inst.extraRefImages || []).map((it, idx) => (
            <span className="chip" key={`vi-${it.name}-${idx}`}>
              Img {idx + 1}: {it.name}
              {getVideoReferencePreviewLabel(it) ? ` -> ${getVideoReferencePreviewLabel(it)}` : ""}
              <span className="remove" onClick={() => inst.set("extraRefImages", (prev) => (prev || []).filter((_, i) => i !== idx))} role="button" tabIndex="0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18"></path>
                  <path d="M6 6l12 12"></path>
                </svg>
              </span>
            </span>
          ))}
          {(inst.audioRefs || []).map((it, idx) => (
            <span className="chip" key={`va-${it.name}-${idx}`}>
              Audio {idx + 1}: {it.name} ({Math.round(Number(it.duration || 0) * 10) / 10}s)
              <span className="remove" onClick={() => inst.set("audioRefs", (prev) => (prev || []).filter((_, i) => i !== idx))} role="button" tabIndex="0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18"></path>
                  <path d="M6 6l12 12"></path>
                </svg>
              </span>
            </span>
          ))}
          {(inst.refVideos || []).map((it, idx) => (
            <span className="chip" key={`vv-${it.name}-${idx}`}>
              Vid {idx + 1}: {it.name} ({Math.round(Number(it.duration || 0) * 10) / 10}s)
              {getVideoReferencePreviewLabel(it) ? ` -> ${getVideoReferencePreviewLabel(it)}` : ""}
              <span className="remove" onClick={() => inst.set("refVideos", (prev) => (prev || []).filter((_, i) => i !== idx))} role="button" tabIndex="0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18"></path>
                  <path d="M6 6l12 12"></path>
                </svg>
              </span>
            </span>
          ))}
        </div>
      ) : null}
      <hr className="divider" />
      <div className="field-label">Output Settings</div>
      <div className="config-grid" style={{ marginTop: 0 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <div className="field-label">Model</div>
          <select
            className="select-input"
            value={spec.id}
            onChange={(e) => {
              const nextId = e.target.value;
              const clamped = clampVideoSettingsToModel(nextId, inst.resolution, inst.duration);
              inst.set("model", nextId);
              inst.set("resolution", clamped.resolution);
              inst.set("duration", clamped.duration);
            }}
          >
            {VIDEO_MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
          <div className="video-hint">
            {spec.id} · max {spec.maxDuration}s · {spec.resolutions.map((r) => RESOLUTION_LABELS[r] || r).join(" / ")}
          </div>
          <VideoFormatTable currentId={spec.id} />
        </div>
        {spec.draft ? (
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="sheet-chip checkbox-chip" data-checked={inst.draftMode ? "true" : "false"}>
              <input type="checkbox" checked={!!inst.draftMode} onChange={(e) => inst.set("draftMode", e.target.checked)} />
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5"></path>
              </svg>
              Draft mode (optional)
            </label>
            {inst.draftMode ? (
              <div className="video-hint">
                Step 1 renders a quick 480p draft to check the scene, shots, motion and prompt. If it looks right, press <b>Make final 1080p</b> or <b>Make final 4K</b> on that variation: the final video reuses the draft's prompt, references, duration, ratio, seed and audio. Drafts cost the same as a normal 480p video and expire after 7 days.
              </div>
            ) : null}
          </div>
        ) : null}
        <div>
          <div className="field-label">Resolution</div>
          <select className="select-input" value={spec.draft && inst.draftMode ? "480p" : inst.resolution} disabled={!!(spec.draft && inst.draftMode)} onChange={(e) => inst.set("resolution", e.target.value)}>
            {spec.resolutions.map((r) => (
              <option key={r} value={r}>{RESOLUTION_LABELS[r] || r}</option>
            ))}
          </select>
        </div>
        <div>
          <div className="field-label">Frame rate</div>
          <select className="select-input" value={String(inst.fps)} onChange={(e) => inst.set("fps", Number(e.target.value))}>
            <option value="24">24fps</option>
          </select>
        </div>
        <div>
          <div className="field-label">Output format</div>
          <select className="select-input" value={spec.mov && !!!(spec.draft && inst.draftMode) && inst.outputFormat === "mov" ? "mov" : "mp4"} disabled={!spec.mov || !!(spec.draft && inst.draftMode)} onChange={(e) => inst.set("outputFormat", e.target.value)}>
            <option value="mp4">MP4</option>
            {spec.mov ? <option value="mov">MOV</option> : null}
          </select>
          <div className="video-hint">{!spec.mov ? "MOV is available on Seedance 2.5 and 2.5 flash." : !!(spec.draft && inst.draftMode) ? "Drafts are MP4." : inst.outputFormat === "mov" ? "Full-colour 4:4:4 for grading and keying. A playable MP4 preview is made for the app; download the MOV from the result." : "MOV (4:4:4, PCM audio) is available for this model."}</div>
          <YuvExplainer />
        </div>
        <div>
          <div className="field-label">Duration</div>
          <div className="duration-row" style={{ gap: 8 }}>
            <DurationInput value={inst.duration} min={MIN_VIDEO_DURATION} max={spec.maxDuration} disabled={inst.smartLength} onChange={(v) => inst.set("duration", v)} />
            <label className="sheet-chip checkbox-chip" data-checked={inst.smartLength ? "true" : "false"}>
              <input type="checkbox" checked={!!inst.smartLength} onChange={(e) => inst.set("smartLength", e.target.checked)} />
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5"></path>
              </svg>
              Smart length
            </label>
          </div>
        </div>
        <div>
          <div className="field-label">Ratio</div>
          <RatioInput value={inst.ratio} onChange={(v) => inst.set("ratio", v)} />
        </div>
      </div>
      <hr className="divider" />
      <div className="btn-row" style={{ marginTop: 0 }}>
        <button className="btn-primary" disabled={panelDisabled} onClick={() => onGenerateVideoFor(inst)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <polygon points="6 3 20 12 6 21 6 3"></polygon>
          </svg>
          {inst.loading
            ? `Generating… ${(inst.variants || []).filter((v) => v.url || v.error).length}/${(inst.variants || []).length || VIDEO_VARIANT_COUNT} done`
            : "Generate Video"}
        </button>
        <button className="btn-ghost" onClick={() => onClearVideoPanel(inst)} disabled={inst.loading}>
          Clear
        </button>
      </div>
      {panelDisabledHint ? <div className="video-hint">{panelDisabledHint}</div> : null}

      {inst.error ? <div className="error-box">{inst.error}</div> : null}

      {inst.generatedPrompt ? (
        <div className="video-status">
          Generated prompt (LLM):
          <div className="video-hint" style={{ marginTop: 2 }}>{promptSkillsSummary()}</div>
          <div style={{ marginTop: 8, fontFamily: "var(--mono)", fontSize: 12, whiteSpace: "pre-wrap", border: "0.5px solid var(--border)", borderRadius: "var(--radius-sm)", padding: 10, background: "var(--surface-2)" }}>
            {inst.generatedPrompt}
          </div>
        </div>
      ) : null}

      {(inst.variants || []).length ? (
        <div className="variant-row">
          {(inst.variants || []).map((variant, idx) => {
            const variantName = `${inst.isMain ? "Generated Video" : `Generated Video (${inst.title})`} — Variation ${idx + 1}`;
            const isSelected = !!variant.url && idx === (Number(inst.selectedVariant) || 0);
            const selectedState = inst.isMain ? "for Shot A" : "selected";
            return (
              <div className={"variant-cell" + (isSelected ? " selected" : "")} key={`variant-${inst.id}-${idx}`}>
                <div className="variant-head">
                  <span className="variant-label">Variation {idx + 1}{variant.draft ? " · Draft 480p" : variant.final ? ` · Final ${RESOLUTION_LABELS[variant.finalResolution || "1080p"]}` : ""}</span>
                  <span className="variant-state">
                    {variant.error
                      ? "failed"
                      : variant.url
                        ? (isSelected ? selectedState : "ready")
                        : `${variant.status || "queued"}${formatElapsed(variant.startedAt) ? ` · ${formatElapsed(variant.startedAt)}` : ""}`}
                  </span>
                </div>
                {variant.url ? (
                  <video className="video-player" controls src={variant.url} />
                ) : (
                  <div className="variant-placeholder">
                    {variant.error ? "Generation failed" : `Generating… ${formatElapsed(variant.startedAt)}`}
                  </div>
                )}
                {variant.taskId ? <div className="variant-meta">Task ID: {variant.taskId}</div> : null}
                {variant.draft && variant.url ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
                    {variant.finalizing ? (
                      <button className="btn-primary" style={{ flex: "none" }} disabled>
                        {`Making final ${RESOLUTION_LABELS[variant.finalResolution || "1080p"]}… ${variant.finalStatus || ""}`}
                      </button>
                    ) : (
                      <div style={{ display: "flex", gap: 6 }}>
                        {["1080p", "4k"].map((res) => (
                          <button key={res} className="btn-primary" style={{ flex: 1 }}
                                  disabled={!!(variant.draftCreatedAt && Date.now() - variant.draftCreatedAt > 7 * 864e5)}
                                  onClick={() => finalizeDraftVariant(inst, idx, variant, res)}>
                            {res === "1080p" ? "Looks good — make final 1080p" : "Make final 4K"}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="video-hint" style={{ margin: 0 }}>Reuses this draft's prompt, references, duration, ratio and seed. Draft ids expire after 7 days.</div>
                    {variant.finalError ? <div className="error-box" style={{ margin: 0 }}>{variant.finalError}</div> : null}
                  </div>
                ) : null}
                {variant.final && variant.draftUrl ? <div className="variant-meta">From draft {variant.draftTaskId} · <a href={variant.draftUrl} target="_blank" rel="noreferrer">view draft</a></div> : null}
                {variant.error ? <div className="error-box">{variant.error}</div> : null}
                {variant.url ? (
                  <div className="result-footer">
                    <button
                      className="btn-action"
                      disabled={isSelected || inst.loading}
                      onClick={() => selectVideoVariant(inst, idx)}
                    >
                      {inst.isMain
                        ? (isSelected ? "Passed to Shot A" : "Use for Shot A")
                        : (isSelected ? "Selected" : "Use this one")}
                    </button>
                    {isProjectToolContext("video-generation") ? (
                      <button
                        className="btn-action"
                        disabled={!activeProjectGroupId}
                        onClick={() => {
                          addGeneratedAssetToProjectGroup({
                            toolKey: "video-generation",
                            sourceUrl: variant.url,
                            name: variantName,
                            keyHint: `video-main-${idx + 1}`,
                            type: "video",
                            // Only the panel's canonical result owns the
                            // project's saved video id.
                            resultKey: inst.isMain && isSelected ? "videoMain" : "",
                          }).catch((e) => setProjectAssetGroupError(String(e?.message || e)));
                        }}
                      >
                        Add to asset group
                      </button>
                    ) : null}
                    {isProjectToolContext("video-generation") ? (
                      <button
                        className="btn-action"
                        onClick={() => {
                          saveGeneratedAssetToProjectFolder({
                            toolKey: "video-generation",
                            sourceUrl: variant.url,
                            name: variantName,
                          }).then((data) => {
                            if (!data?.file_url) return;
                            applyVideoVariantUpdate(
                              (activeSection === "projects" && activeProjectId) ? activeProjectId : null,
                              inst.id,
                              idx,
                              { url: data.file_url },
                            );
                            if (isSelected) applyPanelUpdate({ url: data.file_url });
                          }).catch((e) => setProjectLocalFilesError(String(e?.message || e)));
                        }}
                      >
                        Save locally
                      </button>
                    ) : null}
                    <button className="btn-action" onClick={() => downloadImage(variant.url, videoModelName(variant.model || inst.model), "mp4")}>{variant.movUrl ? "Download MP4 preview" : "Download"}</button>
                    {variant.movUrl ? <button className="btn-action" title="H.264 YUV 4:4:4 with PCM audio" onClick={() => downloadImage(variant.movUrl, videoModelName(variant.model || inst.model), "mov")}>Download MOV</button> : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {(inst.variants || []).some((v) => v.url && variantGenSeconds(v) > 0) ? (
        <div className="video-hint" style={{ marginTop: 8 }}>
          Generation time:{" "}
          {(inst.variants || []).map((v, i) => {
            const secs = variantGenSeconds(v);
            if (!v.url || !secs) return null;
            return { i, text: `Variation ${i + 1} — ${formatDuration(secs)}${v.final && v.draftGenSeconds ? ` (final ${RESOLUTION_LABELS[v.finalResolution || "1080p"]}; draft took ${formatDuration(v.draftGenSeconds)})` : ""}` };
          }).filter(Boolean).map((x) => x.text).join(" · ")}
        </div>
      ) : null}

      {inst.isMain && (inst.variants || []).filter((v) => !!v.url).length > 1 ? (
        <div className="video-hint">The selected variation is the one passed to Long Duration Shot A.</div>
      ) : null}

      {inst.isMain && inst.url ? (
        <div style={{ marginTop: 10 }}>
          <label className="sheet-chip checkbox-chip" data-checked={useVideoRefVideosForShotA ? "true" : "false"} data-disabled={!videoUrl || videoLoading || shotASeedLoading ? "true" : "false"}>
            <input
              type="checkbox"
              disabled={!videoUrl || videoLoading || shotASeedLoading}
              checked={useVideoRefVideosForShotA}
              onChange={(e) => setUseVideoRefVideosForShotA(!!e.target.checked)}
            />
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5"></path>
            </svg>
            Use generated video as reference for long duration Shot A
          </label>
        </div>
      ) : null}
    </div>
  );
}

function renderTextOverlaySectionView({
  isCoveredTextOverlay, onBuildTextOverlays, onEditTextOverlay, onRegenerateTextOverlay,
  onRemoveTextOverlay, onRenderCoveredTextOverlay, setModalImageUrl, textOverlayHasContent,
  textOverlayReferenceSignature
}, target, { auto, onToggleAuto, busy, keyPrefix }) {
  const state = { ...defaultTextOverlayState(), ...(target.current || {}) };
  const overlays = state.overlays || [];
  const prompt = (target.prompt || "").trim();
  const references = target.references || [];
  const promptChanged = !!state.forPrompt && state.forPrompt !== prompt;
  const refsChanged = !!state.forPrompt && (state.forRefs || "") !== textOverlayReferenceSignature(references);
  const locked = !!state.loading || !!busy;
  const anchorIndex = {};
  [false, true].forEach((allowReferences) => overlays.forEach((o, i) => {
    if (!o.image || anchorIndex[o.kind] !== undefined) return;
    if (!allowReferences && (o.use_references || []).length) return;
    anchorIndex[o.kind] = i;
  }));
  const renderedCount = overlays.filter((o) => !isCoveredTextOverlay(o)).length;
  const coveredCount = overlays.length - renderedCount;
  const status = state.loading
    ? "Rendering…"
    : overlays.length
      ? [
        renderedCount ? `${renderedCount} image${renderedCount === 1 ? "" : "s"}` : "",
        coveredCount ? `${coveredCount} from references` : "",
      ].filter(Boolean).join(" · ")
      : state.forPrompt ? "No on-screen text found" : "Not built yet";
  const referenceLabel = (n) => {
    const ref = references[n - 1];
    return ref ? `reference ${n} (${ref.name})` : `reference ${n}`;
  };
  return (
    <div className="text-overlay-box">
      <div className="text-overlay-head">
        <div className="field-label" style={{ margin: 0 }}>Text Overlays</div>
        <span className="variant-state">{status}</span>
      </div>
      <div className="video-hint">
        Every readable text — overlays and laptop, phone or monitor screens — is rendered with Seedream 5.0 Pro first and passed to Seedance as a reference image, so the spelling stays exact. The first image of each kind is the style anchor: the rest match its font, size, colour and design.
      </div>
      <div className="video-hint">
        {references.length
          ? `Your ${references.length} reference image${references.length === 1 ? " is" : "s are"} used too: a moment a reference already shows is not regenerated, and logos or products are rendered from the reference. Room for ${Math.max(0, target.maxOverlays)} overlay image${target.maxOverlays === 1 ? "" : "s"} beside them.`
          : "Add your brand logo or product under Reference images and overlays that need it are rendered from it."}
      </div>
      <div className="text-overlay-actions">
        <label className="sheet-chip checkbox-chip" data-checked={auto ? "true" : "false"} data-disabled={locked ? "true" : "false"}>
          <input type="checkbox" checked={auto} disabled={locked} onChange={(e) => onToggleAuto(!!e.target.checked)} />
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5"></path>
          </svg>
          Build automatically on Generate
        </label>
        <button className="btn-ghost" style={{ flex: "none", whiteSpace: "nowrap" }} disabled={locked || !prompt} onClick={() => onBuildTextOverlays(target)}>
          {state.forPrompt ? "Rebuild from prompt" : "Detect & render now"}
        </button>
      </div>
      {promptChanged || refsChanged ? (
        <div className="video-hint">
          {`The ${promptChanged && refsChanged ? "prompt and reference images" : promptChanged ? "prompt" : "reference images"} changed since these were built — `}
          {auto ? "they will be rebuilt on Generate." : "automatic build is off, so these images are used as they are."}
        </div>
      ) : null}
      {state.error ? <div className="error-box">{state.error}</div> : null}
      {overlays.length ? (
        <div className="variant-row">
          {overlays.map((o, i) => {
            const covered = isCoveredTextOverlay(o);
            const coveredRef = covered ? references[o.covered_by_reference - 1] : null;
            const usedRefs = o.use_references || [];
            return (
              <div className="variant-cell" key={`${keyPrefix}-overlay-${o.id || i}`}>
                <div className="variant-head">
                  <span className="variant-label">{o.shot || `Text ${i + 1}`}</span>
                  <span className="variant-state">
                    {o.kind === "screen" ? `${o.device || "device"} screen` : "overlay"}
                    {covered ? " · from reference" : anchorIndex[o.kind] === i ? " · style anchor" : ""}
                  </span>
                </div>
                {covered ? (
                  coveredRef ? (
                    <img className="text-overlay-img" src={coveredRef.image} alt={coveredRef.name} onClick={() => setModalImageUrl(coveredRef.image)} />
                  ) : (
                    <div className="variant-placeholder">Reference image {o.covered_by_reference} is no longer attached</div>
                  )
                ) : o.image ? (
                  <img className="text-overlay-img" src={o.image} alt={o.text} onClick={() => setModalImageUrl(o.image)} />
                ) : (
                  <div className="variant-placeholder">{state.loading ? "Rendering…" : o.error ? "Render failed" : "Not rendered yet"}</div>
                )}
                <div className="text-overlay-body">
                  {covered ? (
                    <>
                      <div className="text-overlay-static">{o.text || "Reference image"}</div>
                      <div className="video-hint">Already shown by {referenceLabel(o.covered_by_reference)} — used as-is, not regenerated.</div>
                    </>
                  ) : (
                    <>
                      <textarea
                        className="video-input text-overlay-text"
                        value={o.text || ""}
                        disabled={locked}
                        placeholder={usedRefs.length ? "No extra text — only the reference logo" : ""}
                        aria-label={`Exact text for ${o.shot || `text ${i + 1}`}`}
                        onChange={(e) => onEditTextOverlay(target, i, e.target.value)}
                      />
                      {usedRefs.length ? (
                        <div className="video-hint">Rendered from {usedRefs.map(referenceLabel).join(", ")}</div>
                      ) : null}
                      {o.stale ? (
                        <div className="video-hint">Text edited — it is re-rendered on Generate, or re-render it now.</div>
                      ) : o.image && (o.text || "").trim() ? (
                        o.spelling_verified
                          ? <div className="video-hint">Spelling checked against the render</div>
                          : <div className="video-hint text-overlay-warn">Spelling could not be confirmed — check the image</div>
                      ) : null}
                      {o.invented ? <div className="video-hint">Wording invented from the prompt's description</div> : null}
                      {o.image_prompt ? (
                        <details className="text-overlay-prompt">
                          <summary>Seedream 5.0 Pro prompt</summary>
                          <div className="text-overlay-prompt-text">{o.image_prompt}</div>
                          {o.image_model ? <div className="video-hint">{o.image_model}{o.image_inputs ? ` · image-to-image from ${o.image_inputs} image${o.image_inputs === 1 ? "" : "s"}` : " · text-to-image"}</div> : null}
                        </details>
                      ) : null}
                    </>
                  )}
                </div>
                {o.error ? <div className="error-box">{o.error}</div> : null}
                <div className="result-footer">
                  {covered ? (
                    <button className="btn-action" disabled={locked || !coveredRef} onClick={() => onRenderCoveredTextOverlay(target, i)}>Render instead</button>
                  ) : (
                    <button className="btn-action" disabled={locked || !textOverlayHasContent(o)} onClick={() => onRegenerateTextOverlay(target, i)}>Re-render</button>
                  )}
                  <button className="btn-action" disabled={locked} onClick={() => onRemoveTextOverlay(target, i)}>Remove</button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
      {state.styleGuide ? <div className="video-hint">Shared overlay style: {state.styleGuide}</div> : null}
      {state.screenStyleGuide && overlays.some((o) => o.kind === "screen") ? <div className="video-hint">Shared screen style: {state.screenStyleGuide}</div> : null}
    </div>
  );
}
