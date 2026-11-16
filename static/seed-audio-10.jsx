/* seed-audio-10.jsx — Seed Audio 1.0: one prompt -> speech, conversation, music and sound effects together.
 *
 * Three ways to set the voices (they cannot be mixed in one request):
 *   - Text only (T2A): describe every voice, the setting, music and sound effects in the prompt.
 *   - Reference audio (TA2A): up to 3 clips or voice IDs, tagged in the prompt as @Audio1–@Audio3.
 *   - Reference image: one character image gives the voice; the prompt can be just the lines.
 * Generation goes to /api/seed-audio-10/generate (up to 120 s of audio, prompt up to 3000 characters).
 * State comes from props ({state, update}).
 */
(function () {
  "use strict";
  const { useState, useRef, useEffect } = React;

  const MAX_CHARS = 3000;
  const MAX_AUDIO_REFS = 3;
  const PRICE_PER_MIN = 0.15;
  const FORMATS = [["wav", "WAV"], ["mp3", "MP3"], ["ogg_opus", "OGG Opus"], ["pcm", "PCM (raw)"]];
  const SAMPLE_RATES = [8000, 16000, 24000, 32000, 44100, 48000];

  const MODES = [
    { id: "t2a", label: "Text to audio", blurb: "Describe the setting, every voice (gender, age, accent, emotion, pace), the music and the sound effects, and write what each character says. Seed Audio 1.0 generates it all as one track." },
    { id: "ta2a", label: "Text + reference audio", blurb: "Add up to 3 reference voices (a 30 s clip or a voice ID) and tag them in the prompt as @Audio1, @Audio2, @Audio3, saying who each one voices." },
    { id: "image", label: "Voice from image", blurb: "Upload one character image; the voice is designed from it. The prompt can be just the lines to speak." },
  ];

  // Prompt-guide examples (Seed Audio 1.0 product guide): environment, music/SFX, action, voices, lines.
  const TEMPLATES = {
    t2a: [
      { name: "Campus dialogue", text: `School bell "ring-a-ling" fading from near to far, after-school hallway environment with distant footsteps, student chatter, occasional locker "clack," and hallway reverb. Jake (teenage male, American accent, bright youthful voice, sunny and cocky) says playfully and teasingly: "Hey, Emma—you free Saturday? My treat, that new amusement park!" A backpack zipper "zzzip." Emma (teenage female, American accent, sweet soft airy voice, shy) lowers her voice, flustered: "Uh… I still haven't finished my homework." Jake coaxes, dragging his words: "You can do it Sunday~ it's just half a day!" Emma mutters, softening: "But… it's due Monday…" Jake says gently: "I'll do it with you, then we head out, deal?" Emma can't help laughing, conceding shyly: "…Fine, just half a day, okay?" Jake, excited: "Deal!" Ends with both footsteps fading away.` },
      { name: "Football goal", text: `Inside a huge football stadium, with the deafening roar of tens of thousands of fans throughout the background. The commentator (middle-aged male, British accent, rich and penetrating voice, classic sports commentary, extremely exhilarated) shouts in a rapid, soaring, full-throated tone: "OH, HE SCORES!!! WHAT A GOAL! He beats two men and buries it in the top corner — UNBELIEVABLE! The stadium is on its feet!!!" He draws out the word "GOAL" with a voice slightly hoarse from excitement, and the crowd's cheering erupts at the moment of the goal and continues to the end.` },
      { name: "Sitcom", text: `Opens with a classic upbeat sitcom intro tune—bright electric-guitar strumming, cheerful bass, crisp drums, playful and bouncy; plays a few seconds then fades out. Inside a pet store, relaxed atmosphere, very faint room tone. Dave (man around 30, American accent, low voice, forced composure, pretend-expert) says smugly: "Oh~ this Golden Retriever is so well taken care of. How old's the little guy?" Lily (young woman around 25, American accent, bright lively voice, blunt) sincerely blurts out: "Sir… that's an alpaca." Immediately a classic sitcom canned laughter bursts out, fading loud to soft. Dave freezes, voice cracking mid-sentence: "I… I know that, I mean it… it really looks like a Golden Retriever." Audience laughter erupts louder. Ends with audience laughter mixed with scattered applause.` },
      { name: "Sci-fi narration", text: `The music is underpinned by a deep synthesizer pad, accented with synth drum beats, creating a tense and uneasy mood. In the background, a low humming sound with electronic sound effects. The narrator (female, slightly lower pitch, mechanical quality) says in a grave tone: "With rapid population growth and global warming, Earth will no longer be suitable for human habitation." Then a voice as if from a television, with slight reverberation: "Humanity has begun searching for a new habitable place." An electronic chime of a screen being tapped, then a chime of data loading. A burst of alarm sounds; the music stops. The broadcaster (middle-aged male, deep resonant voice) announces seriously: "Emergency notice. All technical personnel, assemble in the command pod immediately."` },
    ],
    ta2a: [
      { name: "Two-voice podcast", text: `[Ambient street sounds: passing cars, distant chatter, a faint breeze.] Marcus (a male voice, smooth and confident, warm playful broadcaster tone, the actor is @Audio1), upbeat and inviting, says: "Hey there! Quick question—what's the most embarrassing thing that's ever happened to you?" Tyler (a younger male voice, slightly nervous, expressive with a light laugh, the actor is @Audio2), letting out a long groan and a pained laugh, says: "Oh, you do NOT want to know. Okay, fine, but this stays between us... and the entire internet, apparently." [Both burst out laughing; street ambience swells and fades out.]` },
      { name: "Narrator line", text: `A quiet late-night convenience store, a fridge humming softly. Use @Audio1 as the narrator voice, calm and close-miked, and read naturally: "Welcome to the store. We never close — and tonight, neither do you."` },
    ],
    image: [
      { name: "Lines only", text: `"I've walked this road a thousand times, but tonight it feels different. Stay close, and don't look back."` },
    ],
  };

  function post(path, body) {
    return fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) })
      .then((r) => r.json().catch(() => ({})).then((d) => {
        const err = d.error && (d.error.message || d.error);
        if (!r.ok || err) throw new Error(err || `HTTP ${r.status}`);
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
  function audioSeconds(url) {
    return new Promise((resolve) => {
      const a = new Audio();
      a.preload = "metadata";
      a.onloadedmetadata = () => resolve(a.duration || 0);
      a.onerror = () => resolve(0);
      a.src = url;
    });
  }
  const uid = () => Math.random().toString(36).slice(2, 10);

  function SeedAudio10({ state, update, modelPicker }) {
    const defaults = { mode: "t2a", prompt: "", audioRefs: [], image: null, format: "mp3", sampleRate: 48000,
                       speechRate: 0, loudnessRate: 0, pitchRate: 0, jobs: [] };
    const s = Object.assign({}, defaults, state || {});
    const set = (patch) => update((prev) => Object.assign({}, defaults, prev || {}, typeof patch === "function" ? patch(Object.assign({}, defaults, prev || {})) : patch));
    const [cfg, setCfg] = useState(null);
    const [busy, setBusy] = useState("");
    const [error, setError] = useState("");
    const [voiceId, setVoiceId] = useState("");
    const audioRef = useRef(null), imageRef = useRef(null);

    useEffect(() => { post("/api/seed-audio-10/config").then(setCfg).catch(() => setCfg({ has_key: false })); }, []);

    const mode = MODES.find((m) => m.id === s.mode) || MODES[0];
    const chars = s.prompt.length;
    const refsForMode = s.mode === "ta2a" ? s.audioRefs.map((r) => ({ kind: r.kind, value: r.value }))
      : s.mode === "image" && s.image ? [{ kind: "image", value: s.image.url }] : [];

    async function addAudio(files) {
      setError("");
      const list = Array.from(files || []).filter((f) => /\.(wav|mp3)$/i.test(f.name) || /audio\/(wav|x-wav|mpeg|mp3)/.test(f.type));
      if (!list.length) { setError("Reference audio must be WAV or MP3."); return; }
      try {
        for (const f of list.slice(0, MAX_AUDIO_REFS - s.audioRefs.length)) {
          if (f.size > 10 * 1024 * 1024) throw new Error(`${f.name} is over 10 MB.`);
          const dataUrl = await readDataUrl(f);
          const secs = await audioSeconds(dataUrl);
          if (secs > 30.5) throw new Error(`${f.name} is ${secs.toFixed(1)} s; reference clips can be at most 30 s.`);
          setBusy(`Uploading ${f.name}…`);
          const d = await post("/api/seed-audio/upload", { audio_data_url: dataUrl, filename: f.name });
          set((cur) => ({ audioRefs: [...cur.audioRefs, { id: uid(), kind: "audio", value: d.file_url, name: f.name, seconds: secs }].slice(0, MAX_AUDIO_REFS) }));
        }
      } catch (e) { setError(e.message); }
      setBusy("");
    }

    function addVoiceId() {
      const v = voiceId.trim();
      if (!v || s.audioRefs.length >= MAX_AUDIO_REFS) return;
      set((cur) => ({ audioRefs: [...cur.audioRefs, { id: uid(), kind: "speaker", value: v, name: `Voice ID ${v}` }] }));
      setVoiceId("");
    }

    async function addImage(files) {
      const f = Array.from(files || [])[0];
      if (!f) return;
      setError("");
      if (!/image\/(jpeg|png|webp)/.test(f.type)) { setError("The reference image must be JPEG, PNG or WebP."); return; }
      if (f.size > 10 * 1024 * 1024) { setError("The reference image is over 10 MB."); return; }
      try {
        setBusy("Uploading the image…");
        const d = await post("/api/seedream/save-image", { data_url: await readDataUrl(f), hint: "seed-audio-10" });
        set({ image: { url: d.url, name: f.name } });
      } catch (e) { setError(e.message); }
      setBusy("");
    }

    async function generate() {
      setError("");
      if (!s.prompt.trim()) { setError("Write a prompt or pick an example."); return; }
      if (chars > MAX_CHARS) { setError(`The prompt is ${chars} characters; the limit is ${MAX_CHARS}.`); return; }
      if (s.mode === "ta2a" && !s.audioRefs.length) { setError("Add at least one reference voice, or switch to Text to audio."); return; }
      if (s.mode === "image" && !s.image) { setError("Add a character image."); return; }
      const id = uid();
      const job = { id, status: "running", mode: s.mode, prompt: s.prompt, refs: s.mode === "ta2a" ? s.audioRefs.map((r) => r.name) : s.mode === "image" ? [s.image.name] : [], startedAt: Date.now() };
      set((cur) => ({ jobs: [job, ...cur.jobs].slice(0, 20) }));
      const patch = (p) => set((cur) => ({ jobs: cur.jobs.map((j) => (j.id === id ? Object.assign({}, j, p) : j)) }));
      try {
        const d = await post("/api/seed-audio-10/generate", {
          text_prompt: s.prompt, references: refsForMode,
          audio_config: { format: s.format, sample_rate: s.sampleRate, speech_rate: s.speechRate, loudness_rate: s.loudnessRate, pitch_rate: s.pitchRate },
        });
        patch({ status: "done", url: d.url, format: d.format, duration: d.duration, cost: d.cost_usd, seconds: d.seconds });
      } catch (e) { patch({ status: "error", error: e.message }); }
    }

    const slider = (label, key, min, max, fmt) => (
      <div>
        <div className="field-label">{label} — {fmt(s[key])}</div>
        <input type="range" min={min} max={max} step="1" value={s[key]} onChange={(e) => set({ [key]: Number(e.target.value) })} style={{ width: "100%" }} aria-label={label} />
      </div>
    );
    const rateFmt = (v) => (v === 0 ? "normal" : `${(v >= 0 ? 1 + v / 100 : 1 + v / 100).toFixed(2)}×`);
    const tile = { position: "relative", border: "0.5px solid var(--border-2)", borderRadius: 10, padding: "8px 10px", background: "var(--surface-2)", fontSize: 12.5 };
    const removeBtn = { border: 0, background: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: 15, padding: 0, marginLeft: 8 };

    return (
      <>
        <div className="card">
          {modelPicker || null}
          <div className="video-hint" style={{ marginBottom: 12 }}>
            Seed Audio 1.0 turns one prompt into a finished audio scene: voices, multi-role conversation with emotion, background music and sound effects together. Up to 2 minutes per generation, English and Chinese, about ${PRICE_PER_MIN.toFixed(2)} per generated minute.
          </div>
          {cfg && !cfg.has_key ? (
            <div className="error-box" style={{ marginBottom: 12 }}>
              No Seed Audio key. Add <code>SEED_AUDIO_API_KEY</code> to <code>.env</code> and restart.
            </div>
          ) : null}

          <div className="tabs" role="radiogroup" aria-label="Seed Audio 1.0 mode">
            {MODES.map((m) => (
              <button key={m.id} type="button" role="radio" aria-checked={s.mode === m.id} className={"tab-btn" + (s.mode === m.id ? " active" : "")} onClick={() => set({ mode: m.id })}>{m.label}</button>
            ))}
          </div>
          <div className="video-hint" style={{ marginBottom: 12 }}>{mode.blurb}</div>

          <div className="field-label">Prompt</div>
          <div className="sheet-chip-row" style={{ marginBottom: 8, flexWrap: "wrap" }}>
            {(TEMPLATES[s.mode] || []).map((t) => (
              <button key={t.name} type="button" className="sheet-chip" title={t.text} onClick={() => set({ prompt: t.text })}>{t.name}</button>
            ))}
          </div>
          <textarea className="video-input" rows="8" value={s.prompt} onChange={(e) => set({ prompt: e.target.value })}
                    placeholder={s.mode === "image" ? "The lines to speak, e.g. “Stay close, and don't look back.”" : "Setting and ambience → music and sound effects → each character (gender, age, accent, voice, emotion) → what they say, in order."} />
          <div className="video-hint" style={{ textAlign: "right", color: chars > MAX_CHARS ? "var(--danger, #c0392b)" : undefined }}>{chars.toLocaleString()} / {MAX_CHARS.toLocaleString()} characters</div>

          {s.mode === "ta2a" ? (
            <div style={{ marginTop: 10 }}>
              <div className="field-label">Reference voices <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>— up to {MAX_AUDIO_REFS}; WAV or MP3, ≤ 30 s and ≤ 10 MB each, or a voice ID</span></div>
              <input ref={audioRef} type="file" style={{ display: "none" }} accept=".wav,.mp3,audio/wav,audio/mpeg" multiple onChange={(e) => { addAudio(e.target.files); e.target.value = ""; }} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 8 }}>
                {s.audioRefs.map((r, i) => (
                  <div key={r.id} style={tile}>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <strong style={{ marginRight: 6 }}>@Audio{i + 1}</strong>
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}{r.seconds ? ` · ${r.seconds.toFixed(1)} s` : ""}</span>
                      <button type="button" style={removeBtn} aria-label="Remove" onClick={() => set((cur) => ({ audioRefs: cur.audioRefs.filter((x) => x.id !== r.id) }))}>×</button>
                    </div>
                    {r.kind === "audio" ? <audio controls src={r.value} style={{ width: "100%", height: 32, marginTop: 6 }} /> : null}
                  </div>
                ))}
              </div>
              {s.audioRefs.length < MAX_AUDIO_REFS ? (
                <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  <button type="button" className="btn-action" onClick={() => audioRef.current.click()}>Upload clip</button>
                  <input className="video-input" style={{ flex: "1 1 200px", height: 36, minHeight: 0 }} placeholder="or a voice ID (Doubao TTS or a cloned voice)" value={voiceId} onChange={(e) => setVoiceId(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addVoiceId(); }} />
                  <button type="button" className="btn-action" disabled={!voiceId.trim()} onClick={addVoiceId}>Add voice ID</button>
                </div>
              ) : null}
              <div className="video-hint">References are numbered in order; say in the prompt which character each one voices, e.g. “Marcus (warm broadcaster tone, the actor is @Audio1)”.</div>
            </div>
          ) : null}

          {s.mode === "image" ? (
            <div style={{ marginTop: 10 }}>
              <div className="field-label">Character image <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>— one JPEG, PNG or WebP, ≤ 10 MB</span></div>
              <input ref={imageRef} type="file" style={{ display: "none" }} accept="image/jpeg,image/png,image/webp" onChange={(e) => { addImage(e.target.files); e.target.value = ""; }} />
              {s.image ? (
                <div style={{ position: "relative", width: 160 }}>
                  <img src={s.image.url} alt="" style={{ width: 160, height: 160, objectFit: "cover", borderRadius: 10, border: "0.5px solid var(--border-2)", display: "block" }} />
                  <button type="button" aria-label="Remove image" onClick={() => set({ image: null })}
                          style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: 11, border: "none", background: "rgba(0,0,0,.6)", color: "#fff", cursor: "pointer", padding: 0 }}>×</button>
                </div>
              ) : (
                <div className="upload-tile" role="button" tabIndex="0" style={{ minHeight: 120, maxWidth: 260 }} onClick={() => imageRef.current.click()}>
                  <div className="tile-title">Upload image</div>
                  <div className="tile-meta">The character whose voice to create</div>
                </div>
              )}
            </div>
          ) : null}

          <hr className="divider" />
          <div className="field-label" style={{ marginBottom: 8 }}>Output</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <div>
              <div className="field-label">Format</div>
              <select className="select-input" value={s.format} onChange={(e) => set({ format: e.target.value })}>
                {FORMATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <div className="field-label">Sample rate</div>
              <select className="select-input" value={s.sampleRate} onChange={(e) => set({ sampleRate: Number(e.target.value) })}>
                {SAMPLE_RATES.map((r) => <option key={r} value={r}>{(r / 1000).toFixed(r % 1000 ? 1 : 0)} kHz</option>)}
              </select>
            </div>
            {slider("Speed", "speechRate", -50, 100, rateFmt)}
            {slider("Volume", "loudnessRate", -50, 100, rateFmt)}
            {slider("Pitch", "pitchRate", -12, 12, (v) => (v === 0 ? "normal" : `${v > 0 ? "+" : ""}${v}`))}
          </div>

          <div className="btn-row" style={{ marginTop: 14 }}>
            <button type="button" className="btn-primary" disabled={!!busy || !s.prompt.trim() || chars > MAX_CHARS || (cfg && !cfg.has_key)} onClick={generate}>Generate audio</button>
            <button type="button" className="btn-ghost" onClick={() => set({ prompt: "", audioRefs: [], image: null })}>Clear</button>
          </div>
          {error ? <div className="error-box" style={{ marginTop: 10 }}>{error}</div> : null}
          {busy ? <div className="video-hint pulse" style={{ marginTop: 10 }}>{busy}</div> : null}
        </div>

        {s.jobs.length ? (
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
              <div className="field-label" style={{ margin: 0, flex: 1 }}>Results</div>
              <button type="button" className="btn-link" onClick={() => set((cur) => ({ jobs: cur.jobs.filter((j) => j.status === "running") }))}>Clear finished</button>
            </div>
            {s.jobs.map((j) => (
              <div key={j.id} style={{ borderTop: "0.5px solid var(--border)", padding: "10px 0" }}>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>
                  {(MODES.find((m) => m.id === j.mode) || MODES[0]).label}{j.refs?.length ? ` · ${j.refs.join(", ")}` : ""} ·{" "}
                  {j.status === "running" ? <span className="pulse">generating…</span> : j.status === "error" ? "failed" : `${Number(j.duration || 0).toFixed(1)} s · ${j.seconds}s to generate${j.cost != null ? ` · ≈ $${j.cost.toFixed(3)}` : ""}`}
                </div>
                <div style={{ fontSize: 12.5, whiteSpace: "pre-wrap", maxHeight: 64, overflow: "auto", marginBottom: 6 }}>{j.prompt}</div>
                {j.status === "done" ? (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    {j.format !== "pcm" ? <audio controls src={j.url} style={{ flex: "1 1 280px", height: 36 }} /> : <span className="video-hint" style={{ margin: 0, flex: 1 }}>Raw PCM can't be previewed in the browser.</span>}
                    <a className="btn-action btn-inline" href={j.url} download data-model="Seed Audio 1.0">Download</a>
                    <button type="button" className="btn-link" onClick={() => set({ prompt: j.prompt })}>Reuse prompt</button>
                  </div>
                ) : j.status === "error" ? <div className="error-box" style={{ marginTop: 4 }}>{j.error}</div> : null}
              </div>
            ))}
          </div>
        ) : null}
      </>
    );
  }

  window.SeedAudio10 = SeedAudio10;
})();
