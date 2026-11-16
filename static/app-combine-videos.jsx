// Combine Videos tool.
//
// Rendered by App in frontend/app.jsx, which passes in the state and handlers each view reads.
// The tool's state stays in App because it is saved per project and shared between tools
// (e.g. Character Sheets feed Video Generation and Long Duration).

function renderCombineVideosTool({
  combineError, combineLoading, combineResultUrl, combineUploads, downloadImage, ffmpegAvailable,
  onAddCombineVideos, onCombineUploadedVideos, removeCombineUpload, setCombineError,
  setCombineUploads
}) {
  return (
      <>
    <div className="tool-heading">Combine Videos</div>
    <div className="card">
      <div className="video-hint" style={{ marginBottom: 12 }}>
        Upload videos, keep them in the same order they were uploaded, combine them, and download the final merged video.
      </div>

      <input
        id="combine-videos-input"
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        multiple
        style={{ display: "none" }}
        onChange={async (e) => {
          try {
            await onAddCombineVideos(e.target.files);
          } catch (err) {
            setCombineError(String(err?.message || err));
          }
          e.target.value = "";
        }}
      />

      <div
        className="upload-tile"
        role="button"
        tabIndex="0"
        aria-label="Upload videos to combine"
        onClick={() => document.getElementById("combine-videos-input").click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            document.getElementById("combine-videos-input").click();
          }
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        Upload Videos
      </div>

      <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
        {combineUploads.length === 0 ? (
          <div className="video-hint">No videos uploaded yet.</div>
        ) : combineUploads.map((item, idx) => (
          <div key={item.id} className="ag-card" style={{ marginBottom: 0 }}>
            <div className="ag-head">
              <div>
                <div className="ag-title">{idx + 1}. {item.name}</div>
                <div className="ag-count">Will be combined in this order</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="ag-btn-delete" onClick={() => removeCombineUpload(item.id)}>Remove</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="combine-bar" style={{ marginTop: 14 }}>
        <div className="combine-left">{combineUploads.length} video{combineUploads.length !== 1 ? "s" : ""} ready</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {combineUploads.length > 0 ? (
            <button className="btn-ghost" onClick={() => setCombineUploads([])}>Clear</button>
          ) : null}
          {combineResultUrl ? (
            <button className="btn-ghost" onClick={() => downloadImage(combineResultUrl, "Combined", "mp4")}>Download</button>
          ) : null}
          <button
            className="btn-combine"
            disabled={!ffmpegAvailable || combineLoading || combineUploads.length < 2}
            onClick={onCombineUploadedVideos}
          >
            {combineLoading ? "Combining…" : "Combine"}
          </button>
        </div>
      </div>

      {!ffmpegAvailable ? <div className="error-box">ffmpeg is not available, so combining videos is disabled.</div> : null}
      {combineError ? <div className="error-box">{combineError}</div> : null}
      {combineResultUrl ? (
        <div className="video-wrap">
          <video className="video-player" controls src={combineResultUrl} />
          <div className="result-footer">
            <button className="btn-action" onClick={() => downloadImage(combineResultUrl, "Combined", "mp4")}>Download</button>
          </div>
        </div>
      ) : null}
    </div>
      </>
    );
}
