// Skeleton Reference tool.
//
// Rendered by App in frontend/app.jsx, which passes in the state and handlers each view reads.
// The tool's state stays in App because it is saved per project and shared between tools
// (e.g. Character Sheets feed Video Generation and Long Duration).

function renderSkeletonReferenceTool({
  downloadImage, onAddSkeletonVideos, onGenerateSkeletonVideo, removeSkeletonUpload,
  setSkeletonAllPeople, setSkeletonGenerateOverlay, setSkeletonGenerateSkeleton, setSkeletonKptThr,
  setSkeletonMode, skeletonAllPeople, skeletonAvailable, skeletonGenerateOverlay,
  skeletonGenerateSkeleton, skeletonKptThr, skeletonMode, skeletonUploads
}) {
  return (
      <>
    <div className="tool-heading">Skeleton Reference</div>
    <div className="card">
      <div className="video-hint" style={{ marginBottom: 12 }}>
        Upload a video and generate a DWPose/RTMPose skeleton reference — a black-background skeleton track plus an overlay sanity-check — for pose-driven video generation.
      </div>

      <div className="config-grid" style={{ marginTop: 0, marginBottom: 14 }}>
        <div>
          <div className="field-label">Processing mode</div>
          <select className="select-input" value={skeletonMode} onChange={(e) => setSkeletonMode(e.target.value)}>
            <option value="lightweight">lightweight</option>
            <option value="balanced">balanced</option>
            <option value="performance">performance</option>
          </select>
        </div>
        <div>
          <div className="field-label">Keypoint confidence threshold</div>
          <input
            className="select-input"
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={skeletonKptThr}
            onChange={(e) => setSkeletonKptThr(e.target.value)}
          />
        </div>
        <div>
          <div className="field-label">Subject selection</div>
          <select className="select-input" value={skeletonAllPeople ? "all" : "primary"} onChange={(e) => setSkeletonAllPeople(e.target.value === "all")}>
            <option value="primary">Primary subject only</option>
            <option value="all">Keep every detected person</option>
          </select>
        </div>
      </div>

      <div className="sheet-chip-row" style={{ marginBottom: 14 }}>
        <label className="sheet-chip checkbox-chip" data-checked={skeletonGenerateSkeleton ? "true" : "false"}>
          <input type="checkbox" checked={skeletonGenerateSkeleton} onChange={(e) => setSkeletonGenerateSkeleton(e.target.checked)} />
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5"></path>
          </svg>
          Skeleton reference
        </label>
        <label className="sheet-chip checkbox-chip" data-checked={skeletonGenerateOverlay ? "true" : "false"}>
          <input type="checkbox" checked={skeletonGenerateOverlay} onChange={(e) => setSkeletonGenerateOverlay(e.target.checked)} />
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5"></path>
          </svg>
          Overlay reference
        </label>
      </div>
      {!skeletonGenerateSkeleton && !skeletonGenerateOverlay ? (
        <div className="error-box" style={{ marginBottom: 14 }}>Select at least one output before generating.</div>
      ) : null}

      <input
        id="skeleton-videos-input"
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        multiple
        style={{ display: "none" }}
        onChange={async (e) => {
          try {
            await onAddSkeletonVideos(e.target.files);
          } catch (err) {
            alert(String(err?.message || err));
          }
          e.target.value = "";
        }}
      />

      <div className="field-label">Videos</div>
      <div
        className="upload-zone"
        role="button"
        tabIndex="0"
        aria-label="Upload videos for skeleton reference"
        onClick={() => document.getElementById("skeleton-videos-input").click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            document.getElementById("skeleton-videos-input").click();
          }
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={async (e) => {
          e.preventDefault();
          const files = Array.from(e.dataTransfer.files || []).filter((f) => (f.type || "").startsWith("video/"));
          if (!files.length) return;
          try {
            await onAddSkeletonVideos(files);
          } catch (err) {
            alert(String(err?.message || err));
          }
        }}
      >
        <div className="upload-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="23 7 16 12 23 17 23 7"></polygon>
            <rect x="1" y="5" width="15" height="14" rx="2"></rect>
          </svg>
        </div>
        <p className="upload-text">{skeletonUploads.length ? `${skeletonUploads.length} video${skeletonUploads.length === 1 ? "" : "s"} uploaded — drop or click to add more` : "Drop videos here, or click to upload"}</p>
        <p className="upload-sub">MP4 · WEBM · MOV</p>
      </div>

      <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
        {skeletonUploads.length === 0 ? (
          <div className="video-hint">No videos uploaded yet.</div>
        ) : skeletonUploads.map((item) => (
          <div key={item.id} className="ag-card" style={{ marginBottom: 0 }}>
            <div className="ag-header">
              <div>
                <div className="ag-title">{item.name}</div>
                <div className="ag-count">
                  {item.loading ? "Generating…" : (item.skeletonUrl || item.overlayUrl) ? "Reference generated" : "Not generated yet"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  className="btn-combine"
                  disabled={!skeletonAvailable || item.loading || (!skeletonGenerateSkeleton && !skeletonGenerateOverlay)}
                  onClick={() => onGenerateSkeletonVideo(item.id)}
                >
                  {item.loading ? "Generating…" : "Generate"}
                </button>
                <button className="ag-btn-delete" onClick={() => removeSkeletonUpload(item.id)}>Remove</button>
              </div>
            </div>
            <div className="ag-body">
              {item.error ? <div className="error-box">{item.error}</div> : null}
              {item.skeletonUrl || item.overlayUrl ? (
                <div className={item.skeletonUrl && item.overlayUrl ? "config-grid" : undefined} style={{ marginTop: 14 }}>
                  {item.skeletonUrl ? (
                    <div className="video-wrap" style={{ marginTop: 0 }}>
                      <div className="video-hint">Skeleton preview</div>
                      <video className="video-player" controls src={item.skeletonUrl} />
                      <div className="result-footer">
                        <button className="btn-action" onClick={() => downloadImage(item.skeletonUrl, "Skeleton", "mp4")}>Download skeleton</button>
                      </div>
                    </div>
                  ) : null}
                  {item.overlayUrl ? (
                    <div className="video-wrap" style={{ marginTop: 0 }}>
                      <div className="video-hint">Overlay preview</div>
                      <video className="video-player" controls src={item.overlayUrl} />
                      <div className="result-footer">
                        <button className="btn-action" onClick={() => downloadImage(item.overlayUrl, "Skeleton Overlay", "mp4")}>Download overlay</button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {!skeletonAvailable ? (
        <div className="error-box" style={{ marginTop: 14 }}>
          Skeleton reference generation is not available on this server (missing rtmlib/opencv or ffmpeg — run pip install -r requirements.txt).
        </div>
      ) : null}
    </div>
      </>
    );
}
