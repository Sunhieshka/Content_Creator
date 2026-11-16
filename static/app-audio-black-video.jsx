// Audio to Black Video tool.
//
// Rendered by App in frontend/app.jsx, which passes in the state and handlers each view reads.
// The tool's state stays in App because it is saved per project and shared between tools
// (e.g. Character Sheets feed Video Generation and Long Duration).

function renderAudioBlackVideoTool({
  audioBlackUploads, downloadImage, ffmpegAvailable, onAddAudioBlackFiles, onAddAudioBlackImage,
  onGenerateAudioBlackVideo, removeAudioBlackUpload, updateAudioBlackUpload
}) {
  return (
      <>
    <div className="tool-heading">Audio to Black Video</div>
    <div className="card">
      <div className="video-hint" style={{ marginBottom: 12 }}>
        Upload one or more audio files and convert each one into a 1920x1080 MP4 with the original audio track.
      </div>
      <div className="video-hint" style={{ marginBottom: 12 }}>
        Optionally upload one image per audio file to use as the still visual. If no image is provided, the tool uses a black screen.
      </div>

      <input
        id="audio-black-input"
        type="file"
        accept="audio/*"
        multiple
        style={{ display: "none" }}
        onChange={async (e) => {
          try {
            await onAddAudioBlackFiles(e.target.files);
          } catch (err) {
            alert(String(err?.message || err));
          }
          e.target.value = "";
        }}
      />

      <div className="field-label">Audio files</div>
      <div
        className="upload-zone"
        role="button"
        tabIndex="0"
        aria-label="Upload audio files"
        onClick={() => document.getElementById("audio-black-input").click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            document.getElementById("audio-black-input").click();
          }
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={async (e) => {
          e.preventDefault();
          const files = Array.from(e.dataTransfer.files || []).filter((f) => (f.type || "").startsWith("audio/"));
          if (!files.length) return;
          try {
            await onAddAudioBlackFiles(files);
          } catch (err) {
            alert(String(err?.message || err));
          }
        }}
      >
        <div className="upload-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13"></path>
            <circle cx="6" cy="18" r="3"></circle>
            <circle cx="18" cy="16" r="3"></circle>
          </svg>
        </div>
        <p className="upload-text">{audioBlackUploads.length ? `${audioBlackUploads.length} audio file${audioBlackUploads.length === 1 ? "" : "s"} uploaded — drop or click to add more` : "Drop audio files here, or click to upload"}</p>
        <p className="upload-sub">Any audio format · one 1920×1080 MP4 per file</p>
      </div>

      <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
        {audioBlackUploads.length === 0 ? (
          <div className="video-hint">No audio files uploaded yet.</div>
        ) : audioBlackUploads.map((item) => (
          <div key={item.id} className="ag-card" style={{ marginBottom: 0 }}>
            <input
              id={`audio-black-image-${item.id}`}
              type="file"
              accept={REFERENCE_IMAGE_ACCEPT}
              style={{ display: "none" }}
              onChange={async (e) => {
                try {
                  const file = e.target.files && e.target.files[0];
                  if (file) await onAddAudioBlackImage(item.id, file);
                } catch (err) {
                  updateAudioBlackUpload(item.id, { error: String(err?.message || err) });
                }
                e.target.value = "";
              }}
            />
            <div className="ag-header">
              <div>
                <div className="ag-title">{item.name}</div>
                <div className="ag-count">
                  {item.loading ? "Generating…" : item.resultUrl ? "Video ready" : "Ready to convert"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  className="btn-ghost"
                  disabled={item.loading}
                  onClick={() => document.getElementById(`audio-black-image-${item.id}`).click()}
                >
                  {item.imageDataUrl ? "Change Image" : "Add Image"}
                </button>
                <button
                  className="btn-combine"
                  disabled={!ffmpegAvailable || item.loading}
                  onClick={() => onGenerateAudioBlackVideo(item.id)}
                >
                  {item.loading ? "Generating…" : "Generate"}
                </button>
                <button className="ag-btn-delete" onClick={() => removeAudioBlackUpload(item.id)}>Remove</button>
              </div>
            </div>
            <div className="ag-body">
              <audio controls style={{ width: "100%" }}>
                <source src={item.audioDataUrl} />
              </audio>
              {item.imageDataUrl ? (
                <div style={{ marginTop: 12 }}>
                  <div className="video-hint" style={{ marginBottom: 8 }}>
                    Using image: {item.imageName || "uploaded image"}
                  </div>
                  <img
                    src={item.imageDataUrl}
                    alt={item.imageName || "Uploaded still image"}
                    className="text-overlay-img"
                    style={{ maxHeight: 220, objectFit: "contain", background: "#000" }}
                  />
                  <div style={{ marginTop: 8 }}>
                    <button
                      className="btn-ghost"
                      onClick={() => updateAudioBlackUpload(item.id, { imageDataUrl: "", imageName: "" })}
                    >
                      Remove Image
                    </button>
                  </div>
                </div>
              ) : null}
              {item.error ? <div className="error-box" style={{ marginTop: 12 }}>{item.error}</div> : null}
              {item.resultUrl ? (
                <div className="video-wrap" style={{ marginTop: 14 }}>
                  <video className="video-player" controls src={item.resultUrl} />
                  <div className="result-footer">
                    <button className="btn-action" onClick={() => downloadImage(item.resultUrl, "Black Video", "mp4")}>Download</button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {!ffmpegAvailable ? <div className="error-box" style={{ marginTop: 14 }}>ffmpeg is not available, so audio-to-video conversion is disabled.</div> : null}
    </div>
      </>
    );
}
