// Seed Audio Studio: the Seed Audio tool (sidebar and project tool).
// Loaded before App (frontend/app.jsx); everything here is a page-wide global, as it was when it
// lived at the top of the app script.

// ---- Seed Audio (Seed Audio 1.5, early access) ----
// Ported from the standalone Seed Audio Studio (Documents/audio1.5). The
// panel is stateless: it renders `state` and writes through `update(fn)`,
// so the same component backs the sidebar tool (browser-local state) and
// a "seed-audio" project tool (state in project.results.seedAudio).
// Backend: content_creator/services/seed_audio.py, /api/seed-audio/*.
const SEED_AUDIO_MODES = [
  { id: "fix", tip: "", label: "Dialogue Fix", blurb: "Seedance 2.5 + Seed Audio 1.5: re-voice a generated video with correct pronunciation and more natural delivery, then swap it in as the video's audio.", usesPrompt: true, audio: { role: "reference_audio", min: 0, max: 6, minSec: 2, maxSec: 30, maxTotalSec: 180, maxMB: 15 }, video: { role: "reference_video" } },
  { id: "tts", tip: "Structure: simple description (subject + characteristics + constraints), audio script (opening → events in order → transitions → ending), or timeline ([Speakers] + [Timeline] rows). Give every voice age, gender, register, texture, emotion and pace; keep BGM instrumental and below the voice.", label: "Text to Audio", blurb: "Generate speech from a prompt: lines, voice, emotion, pace.", usesPrompt: true, audio: null, video: null },
  { id: "voice", tip: "Tag each speaker with its clip: Name（@Audio1, emotion, delivery）：“line”. Describe the setting and mic (e.g. close-miked, no reverb). One clip per speaker, used consistently.", label: "Voice Reference", blurb: "Clone timbre / performance from 1–6 reference clips.", usesPrompt: true, audio: { role: "reference_audio", min: 1, max: 6, minSec: 2, maxSec: 30, maxTotalSec: 180, maxMB: 15 }, video: null },
  { id: "dub", tip: "Write the complete dialogue in order, aligned to what happens on screen; add ambience/SFX cues and say what not to add. Use @AudioN for reference voices.", label: "Video Dubbing", blurb: "Reproduce lines and timing from a video, optionally with reference voices.", usesPrompt: true, audio: { role: "reference_audio", min: 0, max: 6, minSec: 2, maxSec: 30, maxTotalSec: 180, maxMB: 15 }, video: { role: "reference_video" } },
  { id: "translate", label: "Video Translation", blurb: "Dub a source video into another language. No text prompt allowed.", usesPrompt: false, audio: null, video: { role: "dubbing_video" } },
  { id: "separate", tip: "Name every track you want back, e.g. mixed, dialogue_mara, dialogue_john, sfx, bgm.", label: "Stem Separation", blurb: "Split one track into vocals, SFX and background music.", usesPrompt: true, audio: { role: "separate_audio", min: 1, max: 1, minSec: 2, maxSec: 360, maxTotalSec: 360, maxMB: 90 }, video: null },
];

// Starter prompts, one per structure in the Seed Audio 1.5 prompt guide
// (.claude/skills/seed-audio-prompts/SKILL.md): simple description, audio
// script, and timeline script. Reference voices are addressed as @Audio1, @Audio2, …
const SEED_AUDIO_TEMPLATES = {
  tts: [
    { name: "Voice-over (dry)", text: `[Recording Constraints] Generate only this speaker as dry, close-miked speech. Do not include music, sound effects, ambient noise, room reverb, a second speaker, or silence at the beginning or end. Allow only natural breaths between sentences. Do not leave long pauses.
A young adult female voice, soft and youthful with a breathy quality, speaking at a steady pace in a calm, natural tone. Deliver the following continuously: “The sea surface is calm today. Let the morning take its time.”` },
    { name: "Two-person dialogue", text: `A young adult English woman with a clear, bright voice and a natural British accent speaks quickly, frustration turning into helpless laughter. A young adult English man with a warm, textured baritone and a British accent speaks with animated concern and fond, restrained humour.
Woman（exasperated, breathless）：“I cannot believe I let you talk me into this. My umbrella has given up.”
Man（apologetic but smiling）：“I said it might rain. I did not say the sky would take it personally.”
Woman（trying to stay annoyed, then laughing）：“This is not rain. This is a full betrayal.”` },
    { name: "Ad with BGM", text: `Elegant coffee commercial. A warm acoustic BGM with gentle jazz guitar chords creates a calm early-morning cafe atmosphere; the music stays low and understated beneath the voice and fades out naturally after the final line.
Woman（natural American English accent, warm low-mid register, velvety and intimate tone, poised advertising delivery）：“Some mornings deserve more than just coffee. Take a moment, brew something exceptional.”
The final words are delivered softly with a subtle smile as the guitar decays gently.` },
    { name: "Drama scene (script)", text: `Cinematic drama. In a vast stone hall, slow footsteps are heard first, with faint armor clinks and distant dripping water. The footsteps suddenly stop. A young woman says in a low, tense voice, “Wait, something is coming.” As soon as she finishes, a deep roar sounds in the distance, followed by heavy impacts drawing closer. Low strings enter and gradually build, staying below the voices. A sword is drawn with a metallic scrape, and a middle-aged man shouts urgently, “Get back!” The instant his shout ends, a violent impact erupts and the music shifts into intense orchestral scoring, then quickly fades, leaving only hurried breathing and the hall's echo.` },
    { name: "Timeline script", text: `[General Requirements]
Audio drama, calm and intimate, 24 seconds. Speak only the dialogue. Do not read character names, timecodes, or instructions aloud.
[Speakers]
Mara: 30 years old, female, low smoky alto, intimate and breathy, slightly husky, restrained delivery shifting from calm recollection to quiet fear.
[Timeline]
00:00-00:24 [Background] An abandoned coastal lighthouse at night. Distant waves below the cliffs, soft wind through a cracked window. Close-miked, subtle natural reverb, very quiet noise floor.
00:00-00:24 [Music] Sparse low cello drones, tense and atmospheric, slowly building while staying quiet beneath the voice.
00:00-00:04 Mara (quiet, reflective, breathy, very slow): I used to think the lighthouse was warning ships away from the rocks.
00:04-00:07 Mara (faintly amused, nostalgic, unhurried): That was the story Dad told me.
00:07-00:12 Mara (slower, intimate, measured pauses): But every night, just before midnight, the light turned toward our house.
00:12-00:14 Mara (silent pause, holding back unease):
00:14-00:18 Mara (uneasy, slightly trembling, slow): I never told anyone what I saw in the window.
00:18-00:24 Mara (quietly terrified, barely audible): It looked exactly like me.` },
    { name: "Sound effect", text: "A heavy metal pipe falls onto a metal surface, a dull, low-pitched, weighty impact with a dense metallic thud. The sound is close and clear against a quiet background. No speech or music." },
    { name: "Ambience", text: "Inside a warm, intimate cafe, soft jazz piano plays quietly in the background, with indistinct distant conversation, occasional light clinks of porcelain cups, and the steam of an espresso machine. Close-miked, natural and layered in depth, no intelligible dialogue, relaxed and comfortable." },
    { name: "Ambient SFX sequence", text: "Ambient sound and sound effects only. A narrow alley at night under steady, fine rain. Footsteps splash through puddles in the distance, gradually drawing closer. Keys gently clink nearby, then a key enters the lock and turns. A wooden door creaks open and the footsteps move indoors. Once the door closes, the rain becomes muffled, leaving only water dripping from clothes before fading into silence. No speech or music." },
    { name: "Background music", text: "Instrumental music only. A warm, soothing piece begins with solo piano, introducing the melody through sparse, gentle notes. Soft sustained strings gradually enter beneath the piano. In the middle section, light percussion joins and the melody opens up. Near the end, the percussion drops out first, the strings soften, and the piano resolves on a stable chord that fades naturally. No speech. Duration: 15 seconds." },
    { name: "Song", text: `Genre: Modern lo-fi hip-hop, chill boom-bap beat, 92 BPM, 4/4. Vocal: Male rap, smooth mid-tone flow, natural pronunciation, not aggressive. Instrument: Warm sampled piano loop, soft kick and snare, gentle vinyl crackle, low muted bassline. Mood: Calm, reflective, hopeful, late-night vibe. No loud drops. Structure: Intro (4 bars) → Verse → Hook → Outro (4 bars fade out)
Lyrics
[Intro] Yeah, look
[Verse] Woke up to the sound of the city glow / Got a whole lot of dreams that I still gotta grow
[Hook] We ride through the night, follow the light / One step at a time, gonna make it right
[Outro] One step at a time, make it right` },
  ],
  voice: [
    { name: "Single voice", text: "Indoor office setting, close-miked speech, no noticeable reverb. The speaker (young adult male, deep steady voice, presenter, @Audio1) addresses the camera at a steady, moderate pace in an even tone: “Welcome to BytePlus console.”" },
    { name: "Ad with my voice", text: `Warm, refined acoustic BGM with soft brushed drums and gentle jazz guitar, kept low beneath the voice and fading out after the final line.
Woman（@Audio1, warm low-mid register, velvety and intimate tone, poised and quietly confident delivery）：“Some mornings deserve more than just coffee. Take a moment, brew something exceptional.”` },
    { name: "Two speakers", text: `【BGM】Low cello pulses and sparse piano notes establish a tense suspense score, continuing beneath all dialogue without covering the voices
【SFX】A deserted parking garage at night, with continuous ventilation hum and scattered water drips echoing against concrete
Emma（@Audio1，angry，sharply calling out）：Ryan！Stop！
Ryan（@Audio2，irritated，snapping at her）：What do you want？
Emma（@Audio1，accusing him directly，strong and forceful）：The USB drive. You took it from my desk.
Ryan（@Audio2，angry denial，raised voice）：I didn't take anything！` },
  ],
  dub: [
    { name: "Re-perform with my voice", text: `Re-perform the lines from the reference video with the voice of @Audio1, matching its pacing, emotion, and lip timing. Speak only the dialogue. Do not read speaker names or directions aloud.
Speaker（@Audio1, emotion and delivery）：“Paste the exact line spoken in the video here.”` },
    { name: "Scene script", text: `Setting: 〈where the scene happens and its acoustics〉. Do not add non-diegetic music or sounds that are not in the scene.
〈Continuous ambience〉 can be heard throughout. 〈First sound event〉. A 〈voice description〉 says, “〈line 1〉”. 〈Next sound event, in order〉. A 〈voice description〉 replies, “〈line 2〉”. End with 〈how the sounds resolve〉.` },
    { name: "Timed cues", text: `[SFX] The elevator suddenly jolts with a heavy metallic crash; the cabin rattles as passengers gasp.
Operator（@Audio1, quiet, coldly calm, almost monotone）through the smartphone speaker: “911 emergency. What's going on.”
Man（@Audio2, urgent and worried）: “We're trapped in an elevator. It stopped between floors.”
[BGM] A suspense score begins at exactly 5 seconds: sustained low cellos and a deep synth bass pulse, below the voices. At exactly 10 seconds, stop the BGM abruptly with no fade.` },
  ],
  separate: [
    { name: "Vocals / SFX / BGM", text: "Split this audio into separate tracks and name them: dialogue (all speech), sfx (sound effects), bgm (background music), and mixed (the complete original mix). Provide the name and content description for each track." },
    { name: "Per speaker", text: "Split this audio into separate tracks, one per speaker plus effects and music, and name them: dialogue_speaker1, dialogue_speaker2, sfx, bgm. Provide the name and content description for each track." },
  ],
};

// Dialogue Fix pre-prompt (system instructions): fix how lines are said,
// never what is said or who says it.
const SEED_AUDIO_FIX_INSTRUCTIONS = `Use the reference video as the source of truth and re-perform its dialogue.
1. Correct pronunciation and improve natural delivery.
2. Preserve each character's original voice timbre, pitch, and style.
3. Keep exact dialogue and timing, aligned with the lip movements in the video.
4. Maintain emotions, pauses, and speaking pace.
5. Do not change character identity or dialogue content.
Speak only the dialogue. Do not read speaker names, emotion tags, or directions aloud. Do not add music or sound effects that are not in the video.`;

function seedAudioFixPrompt(state) {
  const dialogue = (state.fixDialogue || "").trim();
  const instructions = (state.fixInstructions ?? SEED_AUDIO_FIX_INSTRUCTIONS).trim();
  return dialogue ? `${instructions}

Dialogue to keep exactly (speaker: line):
${dialogue}` : instructions;
}

const SEED_AUDIO_OUTPUT_FORMATS = ["wav", "mp3", "pcm", "ogg_opus"];
const SEED_AUDIO_SAMPLE_RATES = [8000, 16000, 24000, 32000, 44100, 48000];
const SEED_AUDIO_LANGUAGES = [
  ["en", "English"], ["zh", "Chinese"], ["ja", "Japanese"], ["ko", "Korean"], ["de", "German"],
  ["fr", "French"], ["pt-BR", "Portuguese (Brazil)"], ["pt-PT", "Portuguese (Portugal)"], ["th", "Thai"],
  ["id", "Indonesian"], ["vi", "Vietnamese"], ["ms", "Malay"], ["fil", "Filipino"], ["it", "Italian"],
  ["ru", "Russian"], ["nl", "Dutch"], ["pl", "Polish"], ["tr", "Turkish"], ["sv", "Swedish"],
  ["es-ES", "Spanish (Castilian)"], ["es-MX", "Spanish (Mexico)"], ["ar", "Arabic"], ["fi", "Finnish"],
  ["da", "Danish"], ["no", "Norwegian"], ["cs", "Czech"], ["hu", "Hungarian"], ["el", "Greek"],
  ["ro", "Romanian"], ["hi", "Hindi"],
];
const SEED_AUDIO_DEFAULT_OUTPUT = { format: "wav", sampleRate: 44100, speechRate: 0, loudnessRate: 0, pitchRate: 0 };

// Modes whose result is a video: the Seed Audio track replaces the source
// video's original audio automatically when the generation finishes.
const SEED_AUDIO_VIDEO_OUTPUT_MODES = ["fix", "dub", "translate"];

// Which returned audio becomes the video's soundtrack: the full mix when the
// model labels tracks, otherwise the first one.
function seedAudioSoundtrackIndex(audios) {
  const i = (audios || []).findIndex((a) => !a.type || a.type === "mixed");
  return i >= 0 ? i : 0;
}

function defaultSeedAudioState() {
  return {
    mode: "tts",
    prompt: SEED_AUDIO_TEMPLATES.tts[0].text,
    library: [],
    selectedIds: [],
    videoUrl: "",
    output: { ...SEED_AUDIO_DEFAULT_OUTPUT },
    dubbing: { targetLanguage: "en", glossaries: [] },
    fixInstructions: SEED_AUDIO_FIX_INSTRUCTIONS,
    fixDialogue: "",
    jobs: [],
  };
}

// Abort controllers of in-flight generations, keyed by job id. Module-level
// so switching tools/projects mid-generation keeps Cancel working; a
// "running" job with no controller was interrupted by a page reload.
const seedAudioControllers = {};
let seedAudioConfigPromise = null;
function fetchSeedAudioConfig() {
  if (!seedAudioConfigPromise) {
    seedAudioConfigPromise = fetch("/api/seed-audio/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        return data;
      })
      .catch((e) => { seedAudioConfigPromise = null; throw e; });
  }
  return seedAudioConfigPromise;
}

const seedAudioUid = () => Math.random().toString(36).slice(2, 10);

function seedAudioFormatDuration(sec) {
  if (sec == null) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function seedAudioFormatBytes(n) {
  if (!n) return "";
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

// Reads duration via a media element; works for /files/ URLs and most remote URLs.
function seedAudioProbeDuration(src) {
  return new Promise((resolve) => {
    const el = new Audio();
    el.preload = "metadata";
    let settled = false;
    const done = (v) => {
      if (settled) return;
      settled = true;
      el.removeAttribute("src");
      resolve(v);
    };
    el.onloadedmetadata = () => done(Number.isFinite(el.duration) ? el.duration : null);
    el.onerror = () => done(null);
    setTimeout(() => done(null), 10000);
    el.src = src;
  });
}

function seedAudioReadDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// MediaRecorder produces webm/ogg; the API only accepts wav/mp3, so re-encode to 16-bit PCM WAV.
async function seedAudioBlobToWav(blob) {
  const ctx = new AudioContext();
  const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
  ctx.close();
  const rate = buf.sampleRate;
  const data = buf.getChannelData(0);
  const out = new DataView(new ArrayBuffer(44 + data.length * 2));
  const str = (o, s) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  out.setUint32(4, 36 + data.length * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  out.setUint32(16, 16, true);
  out.setUint16(20, 1, true);
  out.setUint16(22, 1, true);
  out.setUint32(24, rate, true);
  out.setUint32(28, rate * 2, true);
  out.setUint16(32, 2, true);
  out.setUint16(34, 16, true);
  str(36, "data");
  out.setUint32(40, data.length * 2, true);
  for (let i = 0; i < data.length; i++) {
    const v = Math.max(-1, Math.min(1, data[i]));
    out.setInt16(44 + i * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true);
  }
  return new File([out], `recording-${new Date().toISOString().slice(11, 19).split(":").join("")}.wav`, { type: "audio/wav" });
}

function buildSeedAudioRequest({ model, mode, prompt, selectedAudios, videoUrl, output, dubbing }) {
  const spec = SEED_AUDIO_MODES.find((m) => m.id === mode);
  const content = [];
  if (spec.usesPrompt && prompt.trim()) content.push({ type: "text", text: prompt.trim() });
  if (spec.audio) {
    // Order matters: the prompt refers to @Audio1, @Audio2, ... in this order.
    for (const a of selectedAudios) content.push({ type: "audio_url", audio_url: { url: a.src }, role: spec.audio.role });
  }
  if (spec.video && videoUrl.trim()) content.push({ type: "video_url", video_url: { url: videoUrl.trim() }, role: spec.video.role });
  const body = { content };
  if (model) body.model = model;
  if (mode === "translate") {
    const glossaries = dubbing.glossaries.filter((g) => g.source.trim() && g.target.trim());
    body.dubbing_config = { target_language: dubbing.targetLanguage, ...(glossaries.length ? { glossaries } : {}) };
  } else {
    body.output_format = output.format;
    body.audio_config = {
      sample_rate: output.format === "ogg_opus" ? 48000 : output.sampleRate,
      speech_rate: output.speechRate,
      loudness_rate: output.loudnessRate,
      pitch_rate: output.pitchRate,
    };
  }
  return body;
}

function validateSeedAudioRequest({ mode, prompt, selectedAudios, videoUrl }) {
  const spec = SEED_AUDIO_MODES.find((m) => m.id === mode);
  const errors = [];
  if (spec.usesPrompt && !prompt.trim()) errors.push("Write a prompt.");
  if (spec.audio) {
    const { min, max, minSec, maxSec, maxTotalSec } = spec.audio;
    if (selectedAudios.length < min) errors.push(`Select at least ${min} audio clip${min > 1 ? "s" : ""}.`);
    if (selectedAudios.length > max) errors.push(`Select at most ${max} audio clip${max > 1 ? "s" : ""}.`);
    for (const a of selectedAudios) {
      if (a.duration != null && (a.duration < minSec || a.duration > maxSec)) {
        errors.push(`"${a.name}" is ${a.duration.toFixed(1)}s; must be ${minSec}–${maxSec}s.`);
      }
    }
    const total = selectedAudios.reduce((s, a) => s + (a.duration || 0), 0);
    if (total > maxTotalSec) errors.push(`Total reference duration ${total.toFixed(0)}s exceeds ${maxTotalSec}s.`);
  }
  if (spec.video) {
    const url = videoUrl.trim();
    if (!url) errors.push("Enter a public video URL.");
    else if (!url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("tos://")) errors.push("The video must be a public http(s) URL or tos:// URI.");
  }
  return errors;
}

// Short text for project tool headers.
function seedAudioHeaderStatus(state) {
  const jobs = (state && state.jobs) || [];
  if (jobs.some((j) => j.status === "running" && seedAudioControllers[j.id])) return "Generating…";
  const done = jobs.filter((j) => j.status === "done").length;
  if (done) return `${done} generation${done !== 1 ? "s" : ""}`;
  return "Ready";
}

function SeedAudioElapsed({ since }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return <span>{seedAudioFormatDuration((now - since) / 1000)}</span>;
}

function SeedAudioStudio({ state, update, videoOptions, skills = [], modelPicker }) {
  // Seed Audio skills ticked in the project: when present, Seed LLM rewrites the
  // prompt with them (server side) before it goes to Seed Audio.
  const skillLabels = skills.map((id) => (SKILL_CATALOG.find((sk) => sk.id === id) || { label: id }).label);
  const s = { ...defaultSeedAudioState(), ...(state || {}) };
  const set = (patch) => update((prev) => ({ ...defaultSeedAudioState(), ...(prev || {}), ...(typeof patch === "function" ? patch({ ...defaultSeedAudioState(), ...(prev || {}) }) : patch) }));
  const [config, setConfig] = useState(null);
  const [configError, setConfigError] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState(() => { try { return sessionStorage.getItem("cc_seed_audio_key") || ""; } catch (e) { return ""; } });
  const [model, setModel] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [showPresets, setShowPresets] = useState(false);
  const [notice, setNotice] = useState("");
  const [busyUpload, setBusyUpload] = useState(false);
  const [recording, setRecording] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [openJson, setOpenJson] = useState(null);
  const recorderRef = useRef(null);
  const fileRef = useRef(null);
  const videoFileRef = useRef(null);
  const [videoUpload, setVideoUpload] = useState({ busy: false, error: "", warning: "" });

  useEffect(() => {
    fetchSeedAudioConfig().then(setConfig).catch((e) => setConfigError(String(e?.message || e)));
  }, []);
  useEffect(() => {
    try { sessionStorage.setItem("cc_seed_audio_key", apiKey); } catch (e) {}
  }, [apiKey]);

  const spec = SEED_AUDIO_MODES.find((m) => m.id === s.mode) || SEED_AUDIO_MODES[0];
  const selectedAudios = spec.audio ? s.selectedIds.map((id) => s.library.find((x) => x.id === id)).filter(Boolean) : [];
  const isFix = spec.id === "fix";
  const effectivePrompt = isFix ? seedAudioFixPrompt(s) : s.prompt;
  const errors = validateSeedAudioRequest({ mode: spec.id, prompt: effectivePrompt, selectedAudios, videoUrl: s.videoUrl });
  // Seed Audio refuses to re-voice a video without the words to speak (SpeechContentNotSpecifiedByPrompt).
  if (isFix && !s.fixDialogue.trim()) errors.unshift("Paste the dialogue spoken in the video.");
  const maxConcurrency = config?.max_concurrency || 2;
  const running = Object.keys(seedAudioControllers).length;
  const needsKey = !!config && !config.has_server_key && !apiKey.trim();
  const canGenerate = errors.length === 0 && running < maxConcurrency && !needsKey && !configError;
  const ogg = s.output.format === "ogg_opus";

  function switchMode(id) {
    const tpl = SEED_AUDIO_TEMPLATES[id]?.[0]?.text;
    // Swap in a starter prompt only if the current one is empty or an untouched template.
    const isTemplate = Object.values(SEED_AUDIO_TEMPLATES).flat().some((t) => t.text === s.prompt);
    const nextSpec = SEED_AUDIO_MODES.find((m) => m.id === id);
    set((prev) => ({
      mode: id,
      prompt: tpl && (!prev.prompt.trim() || isTemplate) ? tpl : prev.prompt,
      selectedIds: nextSpec.audio ? prev.selectedIds.slice(0, nextSpec.audio.max) : prev.selectedIds,
    }));
  }

  function addLibraryItem(item) {
    const full = { id: seedAudioUid(), createdAt: Date.now(), ...item };
    set((prev) => {
      const prevSpec = SEED_AUDIO_MODES.find((m) => m.id === prev.mode);
      // Auto-select the new clip when there is room.
      const room = prevSpec.audio && prev.selectedIds.length < prevSpec.audio.max;
      const selectedIds = !prevSpec.audio ? prev.selectedIds : prevSpec.audio.max === 1 ? [full.id] : room ? [...prev.selectedIds, full.id] : prev.selectedIds;
      return { library: [full, ...prev.library], selectedIds };
    });
  }

  async function uploadClip(file, kind) {
    const res = await fetch("/api/seed-audio/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audio_data_url: await seedAudioReadDataUrl(file), filename: file.name }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Upload failed (HTTP ${res.status})`);
    const duration = await seedAudioProbeDuration(data.file_url);
    addLibraryItem({ name: file.name, kind, src: data.file_url, size: file.size, duration });
  }

  async function addFiles(fileList) {
    setNotice("");
    setBusyUpload(true);
    try {
      for (const file of Array.from(fileList || [])) {
        const ext = file.name.split(".").pop().toLowerCase();
        if (!["wav", "mp3"].includes(ext)) { setNotice(`"${file.name}" skipped: only WAV and MP3 are supported.`); continue; }
        if (file.size > 90 * 1024 * 1024) { setNotice(`"${file.name}" skipped: larger than 90 MB.`); continue; }
        await uploadClip(file, "upload");
      }
    } catch (e) {
      setNotice(String(e?.message || e));
    } finally {
      setBusyUpload(false);
    }
  }

  async function addUrl() {
    const url = urlInput.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      setNotice("Enter a public http(s) URL to a WAV or MP3 file.");
      return;
    }
    setNotice("");
    const duration = await seedAudioProbeDuration(url);
    const name = decodeURIComponent(url.split("?")[0].split("/").pop() || "remote audio");
    addLibraryItem({ name, kind: "url", src: url, duration });
    setUrlInput("");
  }

  async function toggleRecording() {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        try {
          setBusyUpload(true);
          await uploadClip(await seedAudioBlobToWav(new Blob(chunks, { type: rec.mimeType })), "recording");
        } catch (e) {
          setNotice(String(e?.message || e));
        } finally {
          setBusyUpload(false);
        }
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch (e) {
      setNotice(`Microphone unavailable: ${e.message}`);
    }
  }

  // Seed Audio reads videos only from public URLs, so a local file is
  // uploaded to TOS first; uploads are remembered in the source dropdown.
  async function uploadSourceVideo(file) {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setVideoUpload({ busy: false, error: `"${file.name}" is not a video file.`, warning: "" });
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      setVideoUpload({ busy: false, error: `"${file.name}" is larger than 500 MB.`, warning: "" });
      return;
    }
    setVideoUpload({ busy: true, error: "", warning: "" });
    try {
      const localUrl = URL.createObjectURL(file);
      const duration = await new Promise((resolve) => {
        const el = document.createElement("video");
        el.preload = "metadata";
        el.onloadedmetadata = () => resolve(Number.isFinite(el.duration) ? el.duration : null);
        el.onerror = () => resolve(null);
        el.src = localUrl;
      });
      URL.revokeObjectURL(localUrl);
      const res = await fetch("/api/seed-audio/upload-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_data_url: await seedAudioReadDataUrl(file) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Upload failed (HTTP ${res.status})`);
      set((prev) => ({
        videoUrl: data.video_url,
        uploadedVideos: [{ url: data.video_url, name: file.name, duration }, ...(prev.uploadedVideos || []).filter((v) => v.url !== data.video_url)],
      }));
      const warning = duration != null && (duration < 4 || duration > 360) ? `This video is ${duration.toFixed(1)}s; Seed Audio accepts 4–360s.` : "";
      setVideoUpload({ busy: false, error: "", warning });
    } catch (e) {
      setVideoUpload({ busy: false, error: String(e?.message || e), warning: "" });
    }
  }

  function toggleSelected(id) {
    if (!spec.audio) return;
    if (!s.selectedIds.includes(id) && spec.audio.max > 1 && s.selectedIds.length >= spec.audio.max) {
      setNotice(`This mode accepts up to ${spec.audio.max} clips.`);
      return;
    }
    set((prev) => {
      if (prev.selectedIds.includes(id)) return { selectedIds: prev.selectedIds.filter((x) => x !== id) };
      if (spec.audio.max === 1) return { selectedIds: [id] };
      if (prev.selectedIds.length >= spec.audio.max) return {};
      return { selectedIds: [...prev.selectedIds, id] };
    });
  }

  function moveSelected(id, dir) {
    set((prev) => {
      const i = prev.selectedIds.indexOf(id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.selectedIds.length) return {};
      const next = [...prev.selectedIds];
      [next[i], next[j]] = [next[j], next[i]];
      return { selectedIds: next };
    });
  }

  function removeClip(id) {
    set((prev) => ({ library: prev.library.filter((x) => x.id !== id), selectedIds: prev.selectedIds.filter((x) => x !== id) }));
  }

  // Preset Seed Audio voices (shared list: window.SEED_AUDIO_VOICE_PRESETS in static/audiobook.jsx).
  // A preset is sent as reference audio "speaker://<voice id>", so it takes an @AudioN slot like a clip.
  const voicePresets = window.SEED_AUDIO_VOICE_PRESETS || [];
  const [presetPreview, setPresetPreview] = useState({});

  function addPreset(voiceId) {
    const p = voicePresets.find((x) => x.id === voiceId);
    if (!p) return;
    const itemId = `preset-${voiceId}`;
    set((prev) => {
      const has = prev.library.some((x) => x.id === itemId);
      const library = has ? prev.library : [{
        id: itemId, kind: "preset voice", presetId: voiceId, src: `speaker://${voiceId}`, duration: null, size: 0,
        name: `${p.name}${p.gender ? ` — ${p.gender}` : ""}${p.accent ? `, ${p.accent}` : ""}${p.use ? ` · ${p.use}` : ""}`, about: p.about,
      }, ...prev.library];
      let selectedIds = prev.selectedIds;
      if (spec.audio && !selectedIds.includes(itemId)) {
        if (spec.audio.max === 1) selectedIds = [itemId];
        else if (selectedIds.length < spec.audio.max) selectedIds = [...selectedIds, itemId];
      }
      return { library, selectedIds };
    });
    if (spec.audio && spec.audio.max > 1 && !s.selectedIds.includes(itemId) && s.selectedIds.length >= spec.audio.max) {
      setNotice(`Added ${p.name} to the list; this mode already has ${spec.audio.max} references selected.`);
    }
  }

  async function previewPreset(item) {
    const p = voicePresets.find((x) => x.id === item.presetId) || { name: "this voice" };
    setPresetPreview((prev) => ({ ...prev, [item.id]: { loading: true } }));
    try {
      const res = await fetch("/api/audiobook/voice-sample", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset: item.presetId, line: `Hi, I'm ${p.name}. This is how I sound reading your lines, from a calm sentence to an excited one!` }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setPresetPreview((prev) => ({ ...prev, [item.id]: { url: data.url } }));
    } catch (e) {
      setPresetPreview((prev) => ({ ...prev, [item.id]: { error: String(e?.message || e) } }));
    }
  }

  function clipIssue(item) {
    if (!spec.audio) return null;
    if (item.duration != null && (item.duration < spec.audio.minSec || item.duration > spec.audio.maxSec)) return `${spec.audio.minSec}–${spec.audio.maxSec}s required`;
    if (item.size && item.size > spec.audio.maxMB * 1024 * 1024) return `>${spec.audio.maxMB} MB`;
    return null;
  }

  // "Optimise prompt": see (and keep or edit) the skill-optimised prompt before generating.
  const [optPreview, setOptPreview] = useState({ loading: false, text: "", error: "" });
  async function optimisePreview() {
    setOptPreview({ loading: true, text: "", error: "" });
    try {
      const res = await fetch("/api/seed-audio/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: effectivePrompt, skills, mode: spec.id, n_audio: selectedAudios.length, has_video: !!(spec.video && s.videoUrl.trim()) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setOptPreview({ loading: false, text: data.optimized_prompt, error: "" });
    } catch (e) {
      setOptPreview({ loading: false, text: "", error: String(e?.message || e) });
    }
  }

  function insertRef(n) {
    set((prev) => ({ prompt: `${prev.prompt}${prev.prompt && !prev.prompt.endsWith(" ") ? " " : ""}@Audio${n}` }));
  }

  async function generate() {
    const body = buildSeedAudioRequest({ model: model.trim(), mode: spec.id, prompt: effectivePrompt, selectedAudios, videoUrl: s.videoUrl, output: s.output, dubbing: s.dubbing });
    const id = seedAudioUid();
    const ctrl = new AbortController();
    seedAudioControllers[id] = ctrl;
    // Captured now, so the result lands in the project that started it.
    const write = update;
    const patchJob = (p) => write((prev) => {
      const base = { ...defaultSeedAudioState(), ...(prev || {}) };
      return { ...base, jobs: base.jobs.map((j) => (j.id === id ? { ...j, ...p } : j)) };
    });
    const job = {
      id,
      mode: spec.id,
      prompt: isFix ? (s.fixDialogue.trim() || "Dialogue fix (pronunciation + delivery)") : spec.usesPrompt ? s.prompt : `Translate video → ${s.dubbing.targetLanguage}`,
      createdAt: Date.now(),
      status: "running",
      optimizing: !!(skills.length && spec.usesPrompt && effectivePrompt.trim()),
      skillLabels,
      requestPreview: body,
      form: { mode: spec.id, prompt: s.prompt, selectedIds: s.selectedIds, videoUrl: s.videoUrl, output: s.output, dubbing: s.dubbing, fixInstructions: s.fixInstructions, fixDialogue: s.fixDialogue },
    };
    write((prev) => {
      const base = { ...defaultSeedAudioState(), ...(prev || {}) };
      return { ...base, jobs: [job, ...base.jobs] };
    });
    try {
      // With Seed Audio skills ticked: optimise first, so the new prompt is on the job even if
      // the generation then fails, and generate from it without optimising again.
      let sendBody = body;
      if (job.optimizing) {
        const optRes = await fetch("/api/seed-audio/optimize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: effectivePrompt, skills, mode: spec.id, n_audio: selectedAudios.length, has_video: !!(spec.video && s.videoUrl.trim()) }),
          signal: ctrl.signal,
        });
        const opt = await optRes.json().catch(() => ({}));
        if (!optRes.ok) throw new Error(opt.error || `Prompt optimisation failed (HTTP ${optRes.status})`);
        patchJob({ optimizedPrompt: opt.optimized_prompt, optimizing: false });
        sendBody = { ...body, content: body.content.map((c) => (c.type === "text" ? { ...c, text: opt.optimized_prompt } : c)) };
      }
      const res = await fetch("/api/seed-audio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: sendBody, api_key: apiKey.trim() || undefined, skills, mode: spec.id, skip_optimize: true }),
        signal: ctrl.signal,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const err = data?.error;
        let message = `${res.status}: ${(err && typeof err === "object" ? err.message : err) || data?.message || res.statusText}`;
        // Dubbing checks the prompt's lines against the speech it hears in the video;
        // garbled or mispronounced source speech in a non-Latin script fails that check.
        if (err && typeof err === "object" && err.code === "SpeechContentNotSpecifiedByPrompt" && job.form.videoUrl) {
          message += " — Seed Audio could not match the lines in your prompt to the speech it hears in the video. Make sure every spoken line is included, in order. If the dialogue is in a non-Latin script (e.g. Tamil, Hindi), write it romanised instead (e.g. 'Adhu naan dhaan kannu') and add 'Spoken in Tamil' to the prompt.";
        }
        throw new Error(message);
      }
      patchJob({ status: "done", result: data });
      const audios = data?.content?.audios || [];
      if (SEED_AUDIO_VIDEO_OUTPUT_MODES.includes(job.mode) && job.form.videoUrl && audios.length) {
        replaceOriginalAudio({ ...job, result: data }, seedAudioSoundtrackIndex(audios), write);
      }
    } catch (e) {
      patchJob(e.name === "AbortError" ? { status: "cancelled" } : { status: "error", error: String(e?.message || e) });
    } finally {
      delete seedAudioControllers[id];
    }
  }

  // Dialogue Fix step 3: mute the source video and attach this audio.
  async function replaceOriginalAudio(job, index, writeTo) {
    const audio = (job.result?.content?.audios || [])[index] || {};
    const write = writeTo || update;
    const patchFinal = (p) => write((prev) => {
      const base = { ...defaultSeedAudioState(), ...(prev || {}) };
      return { ...base, jobs: base.jobs.map((j) => (j.id === job.id ? { ...j, finals: { ...(j.finals || {}), [index]: { ...((j.finals || {})[index] || {}), ...p } } } : j)) };
    });
    patchFinal({ loading: true, error: "" });
    try {
      const res = await fetch("/api/seed-audio/replace-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_url: job.form.videoUrl, audio_url: audio.local_url || audio.url }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      patchFinal({ loading: false, url: data.file_url });
    } catch (e) {
      patchFinal({ loading: false, error: String(e?.message || e) });
    }
  }

  async function useAsReference(audio, job) {
    const src = audio.local_url || audio.url;
    addLibraryItem({
      name: `${audio.description || audio.type || "generated"} · ${new Date(job.createdAt).toLocaleTimeString()}`,
      kind: "generated",
      src,
      duration: await seedAudioProbeDuration(src),
    });
  }

  function reuse(job) {
    const f = job.form;
    if (!f) return;
    set((prev) => ({
      mode: f.mode,
      prompt: f.prompt,
      videoUrl: f.videoUrl,
      output: f.output,
      dubbing: f.dubbing,
      ...(f.fixInstructions != null ? { fixInstructions: f.fixInstructions, fixDialogue: f.fixDialogue || "" } : {}),
      selectedIds: f.selectedIds.filter((id) => prev.library.some((x) => x.id === id)),
    }));
  }

  const ratePct = (v) => `${v > 0 ? "+" : ""}${v} (${(1 + v / 100).toFixed(2)}×)`;
  const sliders = [
    { key: "speechRate", label: "Speech rate", min: -50, max: 100, fmt: ratePct },
    { key: "loudnessRate", label: "Loudness", min: -50, max: 100, fmt: ratePct },
    { key: "pitchRate", label: "Pitch", min: -12, max: 12, fmt: (v) => `${v > 0 ? "+" : ""}${v} st` },
  ];
  const usableVideos = [
    ...(s.uploadedVideos || []).map((v, i) => ({ key: `upload-${i}`, url: v.url, name: `Uploaded: ${v.name}` })),
    ...(videoOptions || []).filter((v) => (v.url || "").startsWith("http")),
  ];
  const selectedTotal = selectedAudios.reduce((acc, a) => acc + (a.duration || 0), 0);

  return (
    <div className="card">
      {modelPicker || null}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div className="video-hint" style={{ margin: 0 }}>
          Seed Audio 1.5 · early access{running ? ` · ${running} running` : ""}
        </div>
        <button className="btn-action btn-inline" onClick={() => setShowSettings((v) => !v)}>{showSettings ? "Hide settings" : "Settings"}</button>
      </div>
      {showSettings ? (
        <div className="config-grid" style={{ marginTop: 0, marginBottom: 12 }}>
          <div>
            <div className="field-label">API key {config?.has_server_key ? "(server key from .env is active)" : ""}</div>
            <input className="video-input sa-input" type="password" placeholder={config?.has_server_key ? "Optional override" : "Paste your Seed Audio API key"} value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
            <div className="video-hint">Kept for this browser tab only.</div>
          </div>
          <div>
            <div className="field-label">Model / endpoint ID</div>
            <input className="video-input sa-input" placeholder={`${config?.model || ""} (server default)`} value={model} onChange={(e) => setModel(e.target.value)} />
          </div>
        </div>
      ) : null}
      {configError ? <div className="error-box" style={{ marginBottom: 12 }}>Seed Audio backend unavailable ({configError}). Restart the app server.</div> : null}
      {!configError && needsKey ? (
        <div className="error-box" style={{ marginBottom: 12 }}>
          No Seed Audio key configured. Add <code>SEED_AUDIO_API_KEY</code> to <code>.env</code> and restart, or paste one in Settings.
        </div>
      ) : null}

      <div className="tabs" role="radiogroup" aria-label="Seed Audio mode">
        {SEED_AUDIO_MODES.map((m) => (
          <button key={m.id} className={"tab-btn" + (spec.id === m.id ? " active" : "")} role="radio" aria-checked={spec.id === m.id} onClick={() => switchMode(m.id)}>
            {m.label}
          </button>
        ))}
      </div>
      <div className="video-hint" style={{ marginBottom: 12 }}>{spec.blurb}</div>
      {SEED_AUDIO_VIDEO_OUTPUT_MODES.includes(spec.id) ? (
        <div className="video-hint" style={{ marginBottom: 12 }}>
          Output: a video. When generation finishes, the source video's original audio is removed and replaced with the Seed Audio track; the audio stays available as a separate download.
        </div>
      ) : null}

      {isFix ? (() => {
        const fixJobs = s.jobs.filter((j) => j.mode === "fix" && j.form?.videoUrl === s.videoUrl && s.videoUrl);
        const steps = [
          { n: 1, title: "Create video with Seedance 2.5", done: !!s.videoUrl.trim(), hint: "Generate the video with the complete dialogue in Video Generation (Seedance 2.5), then pick it below." },
          { n: 2, title: "Generate corrected dialogue", done: fixJobs.some((j) => j.status === "done"), hint: "Seed Audio 1.5 re-performs the video's lines with correct pronunciation, keeping voices and timing." },
          { n: 3, title: "Replace the original audio", done: fixJobs.some((j) => Object.values(j.finals || {}).some((f) => f.url)), hint: "Automatic: the Seedance audio is removed and the corrected track attached as soon as step 2 finishes." },
          { n: 4, title: "Final output", done: fixJobs.some((j) => Object.values(j.finals || {}).some((f) => f.url)), hint: "Same visuals, voices, timing and dialogue — with correct pronunciation. Compare and download below." },
        ];
        return (
          <div className="sa-steps">
            {steps.map((st) => (
              <div key={st.n} className={"sa-step" + (st.done ? " done" : "")}>
                <div className="sa-step-n">{st.done ? "✓" : st.n}</div>
                <div>
                  <div className="sa-step-title">{st.title}</div>
                  <div className="sa-step-hint">{st.hint}</div>
                </div>
              </div>
            ))}
          </div>
        );
      })() : null}

      {isFix ? (
        <>
          <div className="field-label">Pre-prompt (system instructions)</div>
          <textarea className="video-input" rows="6" value={s.fixInstructions} onChange={(e) => set({ fixInstructions: e.target.value })} />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
            <button className="btn-action btn-inline" disabled={s.fixInstructions === SEED_AUDIO_FIX_INSTRUCTIONS} onClick={() => set({ fixInstructions: SEED_AUDIO_FIX_INSTRUCTIONS })}>Reset instructions</button>
          </div>
          <div className="field-label">Dialogue (required)</div>
          <textarea
            className="video-input"
            rows="4"
            value={s.fixDialogue}
            onChange={(e) => set({ fixDialogue: e.target.value })}
            placeholder={"Paste the exact lines from the video prompt, one per line, e.g.\nArjun（young adult male, warm mid-range voice, relaxed and friendly）：Yaar, chai bahut acchi hai aaj!\nRiya（young adult female, bright clear voice, cheerful）：Haan, bilkul! Aaj ka mausam bhi perfect hai."}
          />
          <div className="video-hint">Seed Audio needs the complete text to speak — reuse the dialogue from your Seedance prompt, one line per speaker as Name（voice, emotion, delivery）：line. Add @Audio1, @Audio2 inside the brackets to use library voices. Knowing the intended words is what lets it fix mispronunciations instead of copying them. Reference voices from the library are optional — without them the voices in the video are kept.</div>
        </>
      ) : null}

      {spec.usesPrompt && !isFix ? (
        <>
          <div className="field-label">Prompt</div>
          {spec.tip ? <div className="video-hint" style={{ marginBottom: 8 }}>{spec.tip} Full guide: Seed Audio Prompt Guide skill.</div> : null}
          {SEED_AUDIO_TEMPLATES[spec.id] ? (
            <div className="tabs">
              {SEED_AUDIO_TEMPLATES[spec.id].map((t) => (
                <button key={t.name} className="tab-btn" onClick={() => set({ prompt: t.text })}>{t.name}</button>
              ))}
            </div>
          ) : null}
          <textarea
            className="video-input"
            rows="6"
            value={s.prompt}
            onChange={(e) => set({ prompt: e.target.value })}
            placeholder="Describe the lines to speak, the voice, language, emotion, pace, and any music or sound effects…"
          />
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {spec.audio && spec.audio.max > 1 ? selectedAudios.map((a, i) => (
                <button key={a.id} className="btn-action btn-inline" title={`Insert @Audio${i + 1} (${a.name})`} onClick={() => insertRef(i + 1)}>+ @Audio{i + 1}</button>
              )) : null}
            </div>
            <span className="video-hint" style={{ margin: 0 }}>{s.prompt.length} chars</span>
          </div>
          {skills.length && !isFix ? (
            <div style={{ marginTop: 8 }}>
              <button className="btn-action btn-inline" disabled={optPreview.loading || !s.prompt.trim()} onClick={optimisePreview}>
                {optPreview.loading ? "Optimising with skills…" : "Optimise prompt (preview)"}
              </button>
              {optPreview.error ? <div className="error-box" style={{ marginTop: 6 }}>{optPreview.error}</div> : null}
              {optPreview.text ? (
                <div className="ag-card" style={{ marginTop: 8, marginBottom: 0 }}>
                  <div className="ag-header">
                    <div className="ag-title">Optimised prompt <span className="ag-count">({skillLabels.join(", ")})</span></div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button className="btn-action btn-inline" onClick={() => navigator.clipboard && navigator.clipboard.writeText(optPreview.text)}>Copy</button>
                      <button className="btn-action btn-inline" title="Put it in the prompt box to edit. Generate optimises again unless you untick the skill." onClick={() => { set({ prompt: optPreview.text }); setOptPreview({ loading: false, text: "", error: "" }); }}>Use as my prompt</button>
                      <button className="ag-btn-delete" onClick={() => setOptPreview({ loading: false, text: "", error: "" })}>Close</button>
                    </div>
                  </div>
                  <div className="ag-body"><pre className="text-overlay-prompt-text" style={{ whiteSpace: "pre-wrap", fontSize: 12, margin: 0 }}>{optPreview.text}</pre></div>
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}

      {spec.video ? (
        <>
          <hr className="divider" />
          <div className="field-label">{spec.id === "translate" ? "Source video" : isFix ? "Seedance 2.5 video (step 1)" : "Reference video"}</div>
          <div className="video-hint" style={{ marginBottom: 8 }}>Upload a video (sent to your TOS bucket) or use a public MP4/MOV URL / tos:// URI · 4–360s · 480p–1080p · 12–60 fps</div>
          {isFix && !usableVideos.length ? (
            <div className="video-hint" style={{ marginBottom: 8 }}>No Seedance videos in this workspace yet — generate one in Video Generation, upload one, or paste its public URL.</div>
          ) : null}
          {usableVideos.length ? (
            <select className="select-input" style={{ marginBottom: 8 }} value={usableVideos.some((v) => v.url === s.videoUrl) ? s.videoUrl : ""} onChange={(e) => e.target.value && set({ videoUrl: e.target.value })}>
              <option value="">Pick an uploaded or generated video…</option>
              {usableVideos.map((v) => <option key={v.key} value={v.url}>{v.name}</option>)}
            </select>
          ) : null}
          <input ref={videoFileRef} type="file" accept="video/mp4,video/quicktime,video/webm,video/*" style={{ display: "none" }} onChange={(e) => { uploadSourceVideo(e.target.files && e.target.files[0]); e.target.value = ""; }} />
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn-action btn-inline" style={{ height: 36 }} disabled={videoUpload.busy} onClick={() => videoFileRef.current?.click()}>
              {videoUpload.busy ? "Uploading…" : "Upload video"}
            </button>
            <input className="video-input sa-input" placeholder="…or paste a public URL: https://media.example.com/source.mp4" value={s.videoUrl} onChange={(e) => set({ videoUrl: e.target.value })} />
          </div>
          {videoUpload.busy ? <div className="video-hint" style={{ marginTop: 6 }}>Uploading to your TOS bucket so Seed Audio can read it (large files take a while)…</div> : null}
          {videoUpload.error ? <div className="error-box" style={{ marginTop: 6 }}>{videoUpload.error}</div> : null}
          {videoUpload.warning ? <div className="text-overlay-warn" style={{ marginTop: 6, fontSize: 12 }}>{videoUpload.warning}</div> : null}
          {s.videoUrl.trim().startsWith("http") ? <video className="video-player" style={{ marginTop: 8, maxHeight: 260 }} controls src={s.videoUrl.trim()} /> : null}
        </>
      ) : null}

      {spec.id === "translate" ? (
        <>
          <hr className="divider" />
          <div className="field-label">Target language</div>
          <select className="select-input" value={s.dubbing.targetLanguage} onChange={(e) => set((prev) => ({ dubbing: { ...prev.dubbing, targetLanguage: e.target.value } }))}>
            {SEED_AUDIO_LANGUAGES.map(([code, name]) => <option key={code} value={code}>{name} ({code})</option>)}
          </select>
          <div className="video-hint">Source language (zh / en) is auto-detected.</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
            <div className="field-label" style={{ margin: 0 }}>Glossary (optional)</div>
            <button className="btn-action btn-inline" onClick={() => set((prev) => ({ dubbing: { ...prev.dubbing, glossaries: [...prev.dubbing.glossaries, { source: "", target: "" }] } }))}>+ Add term</button>
          </div>
          {s.dubbing.glossaries.map((g, i) => (
            <div key={i} style={{ display: "flex", gap: 6, marginTop: 6 }}>
              {["source", "target"].map((field) => (
                <input
                  key={field}
                  className="video-input sa-input"
                  placeholder={field === "source" ? "火山方舟" : "ModelArk"}
                  value={g[field]}
                  onChange={(e) => set((prev) => ({ dubbing: { ...prev.dubbing, glossaries: prev.dubbing.glossaries.map((x, j) => (j === i ? { ...x, [field]: e.target.value } : x)) } }))}
                />
              ))}
              <button className="ag-btn-delete" onClick={() => set((prev) => ({ dubbing: { ...prev.dubbing, glossaries: prev.dubbing.glossaries.filter((_, j) => j !== i) } }))}>Remove</button>
            </div>
          ))}
        </>
      ) : null}

      <hr className="divider" />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div className="field-label" style={{ margin: 0 }}>Audio library</div>
        {spec.audio ? (
          <span className="video-hint" style={{ margin: 0 }}>
            {selectedAudios.length}/{spec.audio.max} selected · {seedAudioFormatDuration(selectedTotal)}{spec.audio.maxTotalSec < 360 ? ` / ${seedAudioFormatDuration(spec.audio.maxTotalSec)}` : ""}
          </span>
        ) : null}
      </div>
      <div className="video-hint" style={{ marginBottom: 8 }}>
        {spec.audio
          ? `Select ${spec.audio.max === 1 ? "one clip" : `up to ${spec.audio.max} clips`} · ${spec.audio.minSec}–${spec.audio.maxSec}s each · WAV/MP3 ≤ ${spec.audio.maxMB} MB. Selection order = @Audio1, @Audio2, … in the prompt.`
          : "This mode does not use reference audio. Clips stay saved for later."}
      </div>
      <input ref={fileRef} type="file" accept=".wav,.mp3,audio/wav,audio/mpeg" multiple style={{ display: "none" }} onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
      <div className="tile-grid sa-compact-tiles">
        <div
          className="upload-tile"
          role="button"
          tabIndex="0"
          style={dragging ? { borderColor: "var(--accent-2)", color: "var(--accent-2)" } : undefined}
          onClick={() => fileRef.current?.click()}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileRef.current?.click(); } }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
          <div className="tile-title" title="WAV / MP3 · or drop files here">{busyUpload ? "Uploading…" : "Upload WAV / MP3"}</div>
          <div className="tile-meta">WAV / MP3 · drop here</div>
        </div>
        <div
          className="upload-tile"
          role="button"
          tabIndex="0"
          style={recording ? { borderColor: "var(--danger)", color: "var(--danger)" } : undefined}
          onClick={toggleRecording}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleRecording(); } }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"></rect><path d="M5 10a7 7 0 0 0 14 0"></path><line x1="12" y1="17" x2="12" y2="22"></line></svg>
          <div className="tile-title">{recording ? "Stop recording" : "Record voice"}</div>
          <div className="tile-meta">{recording ? "Recording…" : "Microphone → WAV"}</div>
        </div>
        <div
          className="upload-tile"
          role="button"
          tabIndex="0"
          aria-expanded={showPresets}
          style={showPresets ? { borderColor: "var(--accent-2)", color: "var(--accent-2)" } : undefined}
          onClick={() => setShowPresets((v) => !v)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setShowPresets((v) => !v); } }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"></circle><path d="M4 21a8 8 0 0 1 16 0"></path></svg>
          <div className="tile-title">Preset voices</div>
          <div className="tile-meta">{showPresets ? "Hide voices" : `Browse ${voicePresets.length} voices`}</div>
        </div>
        <div className="upload-tile" style={{ cursor: "default" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
          <div className="tile-title">Public URL</div>
          <div style={{ display: "flex", gap: 6, width: "100%" }}>
            <input className="video-input sa-input" style={{ height: 30, fontSize: 12 }} placeholder="https://…/voice.wav" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addUrl()} />
            <button className="btn-action btn-inline" disabled={!urlInput.trim()} onClick={addUrl}>Add</button>
          </div>
        </div>
      </div>
      {notice ? <div className="text-overlay-warn" style={{ marginTop: 6, fontSize: 12 }}>{notice}</div> : null}
      {showPresets && window.SeedAudioVoiceGallery && voicePresets.length ? (
        <div style={{ marginTop: 8, maxHeight: 460, overflowY: "auto", paddingRight: 2 }}>
          <window.SeedAudioVoiceGallery onUse={spec.audio ? (id) => { addPreset(id); } : null} useLabel="Use as reference voice" />
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 8, marginTop: 10, maxHeight: 420, overflowY: "auto" }}>
        {s.library.length === 0 ? <div className="video-hint">No clips yet. Upload, record, paste a URL or choose a preset voice.</div> : null}
        {s.library.map((item) => {
          const order = s.selectedIds.indexOf(item.id);
          const isSel = !!spec.audio && order >= 0;
          const issue = clipIssue(item);
          return (
            <div key={item.id} className="ag-card" style={{ marginBottom: 0, borderColor: isSel ? "var(--accent-2)" : undefined }}>
              <div className="ag-header">
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <button
                    className={"tab-btn" + (isSel ? " active" : "")}
                    disabled={!spec.audio}
                    title={isSel ? `@Audio${order + 1}` : "Select as reference"}
                    onClick={() => toggleSelected(item.id)}
                  >
                    {isSel ? `@Audio${order + 1}` : "Select"}
                  </button>
                  <div style={{ minWidth: 0 }}>
                    <div className="ag-title" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.name}>{item.name}</div>
                    <div className="ag-count">
                      {item.presetId ? `preset voice · ${item.about || item.presetId}` : <>{item.kind} · {seedAudioFormatDuration(item.duration)}{item.size ? ` · ${seedAudioFormatBytes(item.size)}` : ""}</>}
                      {issue ? <span className="text-overlay-warn"> · ⚠ {issue}</span> : null}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {isSel && spec.audio.max > 1 ? (
                    <>
                      <button className="btn-action btn-inline" title="Move up" onClick={() => moveSelected(item.id, -1)}>▲</button>
                      <button className="btn-action btn-inline" title="Move down" onClick={() => moveSelected(item.id, 1)}>▼</button>
                    </>
                  ) : null}
                  <button className="ag-btn-delete" onClick={() => removeClip(item.id)}>Remove</button>
                </div>
              </div>
              <div className="ag-body">
                {item.presetId ? (
                  (voicePresets.find((p) => p.id === item.presetId) || {}).sample ? (
                    <audio controls preload="none" src={voicePresets.find((p) => p.id === item.presetId).sample} style={{ width: "100%" }} />
                  ) : presetPreview[item.id]?.url ? (
                    <audio controls autoPlay preload="none" src={presetPreview[item.id].url} style={{ width: "100%" }} />
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button className="btn-action btn-inline" disabled={!!presetPreview[item.id]?.loading} onClick={() => previewPreset(item)}>{presetPreview[item.id]?.loading ? "Generating preview…" : "Preview voice"}</button>
                      <span className="ag-count">{presetPreview[item.id]?.error ? <span className="text-overlay-warn">{presetPreview[item.id].error}</span> : <code>{item.presetId}</code>}</span>
                    </div>
                  )
                ) : (
                  <audio controls preload="none" src={item.src} style={{ width: "100%" }} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {spec.id !== "translate" ? (
        <>
          <hr className="divider" />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="field-label" style={{ margin: 0 }}>Output</div>
            <button className="btn-action btn-inline" onClick={() => set({ output: { ...SEED_AUDIO_DEFAULT_OUTPUT } })}>Reset</button>
          </div>
          <div className="config-grid" style={{ marginTop: 8 }}>
            <div>
              <div className="field-label">Format</div>
              <select className="select-input" value={s.output.format} onChange={(e) => set((prev) => ({ output: { ...prev.output, format: e.target.value } }))}>
                {SEED_AUDIO_OUTPUT_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <div className="field-label">Sample rate</div>
              <select className="select-input" disabled={ogg} value={ogg ? 48000 : s.output.sampleRate} onChange={(e) => set((prev) => ({ output: { ...prev.output, sampleRate: Number(e.target.value) } }))}>
                {SEED_AUDIO_SAMPLE_RATES.map((r) => <option key={r} value={r}>{r.toLocaleString()} Hz</option>)}
              </select>
            </div>
            {sliders.map((sl) => (
              <div key={sl.key} style={{ gridColumn: "1 / -1" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div className="field-label">{sl.label}</div>
                  <span className="video-hint" style={{ margin: 0 }}>{sl.fmt(s.output[sl.key])}</span>
                </div>
                <input
                  type="range"
                  style={{ width: "100%" }}
                  min={sl.min}
                  max={sl.max}
                  step="1"
                  value={s.output[sl.key]}
                  title="Double-click to reset"
                  onChange={(e) => set((prev) => ({ output: { ...prev.output, [sl.key]: Number(e.target.value) } }))}
                  onDoubleClick={() => set((prev) => ({ output: { ...prev.output, [sl.key]: 0 } }))}
                />
              </div>
            ))}
          </div>
        </>
      ) : null}

      <hr className="divider" />
      {errors.length ? (
        <div className="video-hint" style={{ marginBottom: 6 }}>
          {errors.map((e) => <div key={e}>• {e}</div>)}
        </div>
      ) : null}
      <div className="btn-row">
        <button className="btn-primary" disabled={!canGenerate} onClick={generate}>
          {running >= maxConcurrency ? "Wait for a generation to finish" : "Generate audio"}
        </button>
      </div>
      {skills.length && spec.usesPrompt ? (
        <div className="video-hint" style={{ marginTop: 6 }}>
          Your prompt is optimised by Seed LLM with {skillLabels.join(", ")} before it is sent to Seed Audio. Untick the skill in the project to send it as written.
        </div>
      ) : null}
      <div className="video-hint" style={{ marginTop: 6 }}>
        Requests are synchronous and can take a few minutes for long audio or video. Results are copied to <code>outputs/</code>, so they keep playing after ModelArk's 24-hour links expire.
      </div>

      <hr className="divider" />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="field-label" style={{ margin: 0 }}>Generations</div>
        {s.jobs.length ? (
          <button className="btn-action btn-inline" onClick={() => set((prev) => ({ jobs: prev.jobs.filter((j) => j.status === "running" && seedAudioControllers[j.id]) }))}>Clear finished</button>
        ) : null}
      </div>
      {s.jobs.length === 0 ? <div className="video-hint" style={{ marginTop: 6 }}>Your generated audio will appear here.</div> : null}
      <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
        {s.jobs.map((job) => {
          const modeInfo = SEED_AUDIO_MODES.find((m) => m.id === job.mode);
          const live = job.status === "running" && !!seedAudioControllers[job.id];
          const status = job.status === "running" && !live ? "interrupted" : job.status;
          const audios = job.result?.content?.audios || [];
          const ext = { ogg_opus: "ogg", pcm: "pcm", mp3: "mp3" }[job.result?.output_format] || "wav";
          return (
            <div key={job.id} className="ag-card" style={{ marginBottom: 0 }}>
              <div className="ag-header">
                <div style={{ minWidth: 0 }}>
                  <div className="ag-title">
                    {modeInfo?.label || job.mode}
                    <span className="ag-count" style={{ marginLeft: 8 }}>
                      {live ? <>{job.optimizing ? "Optimising prompt, then generating…" : "Generating…"} <SeedAudioElapsed since={job.createdAt} /></> : null}
                      {status === "done" ? "Done" : null}
                      {status === "error" ? "Failed" : null}
                      {status === "cancelled" ? "Cancelled" : null}
                      {status === "interrupted" ? "Interrupted (page reloaded)" : null}
                      {job.result?.usage?.duration_ms != null ? ` · ${seedAudioFormatDuration(job.result.usage.duration_ms / 1000)} audio` : ""}
                    </span>
                  </div>
                  {job.prompt ? <div className="ag-count" style={{ whiteSpace: "pre-wrap" }}>{job.prompt.length > 220 ? `${job.prompt.slice(0, 220)}…` : job.prompt}</div> : null}
                  {job.optimizedPrompt ? (
                    <details style={{ marginTop: 4 }} open>
                      <summary className="ag-count" style={{ cursor: "pointer" }}>Optimised prompt sent to Seed Audio{job.skillLabels?.length ? ` (${job.skillLabels.join(", ")})` : ""}</summary>
                      <div className="ag-count" style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>{job.optimizedPrompt}</div>
                      <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                        <button className="btn-action btn-inline" onClick={() => navigator.clipboard && navigator.clipboard.writeText(job.optimizedPrompt)}>Copy</button>
                        <button className="btn-action btn-inline" onClick={() => set({ prompt: job.optimizedPrompt })}>Use as my prompt</button>
                      </div>
                    </details>
                  ) : null}
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {live ? (
                    <button className="ag-btn-delete" onClick={() => seedAudioControllers[job.id]?.abort()}>Cancel</button>
                  ) : (
                    <>
                      <button className="btn-action btn-inline" title="Load these settings into the form" onClick={() => reuse(job)}>Reuse</button>
                      <button className="btn-action btn-inline" onClick={() => setOpenJson(openJson === job.id ? null : job.id)}>JSON</button>
                      <button className="ag-btn-delete" onClick={() => set((prev) => ({ jobs: prev.jobs.filter((j) => j.id !== job.id) }))}>Remove</button>
                    </>
                  )}
                </div>
              </div>
              {status === "error" || audios.length || openJson === job.id ? (
              <div className="ag-body">
              {status === "error" ? <div className="error-box" style={{ marginTop: 0 }}>{job.error}</div> : null}
              {audios.map((a, i) => {
                const playable = a.local_url || a.url;
                return (
                  <div key={i} style={{ marginTop: i ? 12 : 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <div className="ag-count">
                        {a.type ? <span className="skill-lib-tag" style={{ marginLeft: 0, marginRight: 6 }}>{a.type}</span> : null}
                        {a.description || ""}
                        {!a.local_url ? <span className="text-overlay-warn"> · not saved locally — ModelArk link expires after 24h</span> : null}
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        {SEED_AUDIO_VIDEO_OUTPUT_MODES.includes(job.mode) && job.form?.videoUrl ? (
                          <button className="btn-action btn-inline" disabled={!!job.finals?.[i]?.loading} title="Mute the source video and attach this audio" onClick={() => replaceOriginalAudio(job, i)}>
                            {job.finals?.[i]?.loading ? "Building video…" : job.finals?.[i]?.url ? "Rebuild video" : "Make video with this audio"}
                          </button>
                        ) : null}
                        <button className="btn-action btn-inline" title="Add to the audio library to use as a reference voice" onClick={() => useAsReference(a, job)}>+ Library</button>
                        <a className="btn-action btn-inline" href={playable} download data-model="Seed Audio 1.5" target={a.local_url ? undefined : "_blank"} rel="noreferrer" style={{ textDecoration: "none" }}>{SEED_AUDIO_VIDEO_OUTPUT_MODES.includes(job.mode) ? "Download audio" : "Download"}</a>
                      </div>
                    </div>
                    <audio controls src={playable} style={{ width: "100%", marginTop: 4 }} />
                    {job.finals?.[i]?.loading ? <div className="video-hint" style={{ marginTop: 8 }}>Removing the original audio and attaching this track…</div> : null}
                    {job.finals?.[i]?.error ? <div className="error-box" style={{ marginTop: 8 }}>Could not build the video: {job.finals[i].error}</div> : null}
                    {job.finals?.[i]?.url ? (
                      <div className="sa-compare">
                        <div>
                          <div className="field-label">Original video (Seedance 2.5 audio)</div>
                          <video className="video-player" controls preload="metadata" src={job.form.videoUrl} />
                        </div>
                        <div>
                          <div className="field-label">Final video (Seed Audio 1.5 audio)</div>
                          <video className="video-player" controls preload="metadata" src={job.finals[i].url} />
                          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                            <a className="btn-action btn-inline" href={job.finals[i].url} download data-model="Seed Audio 1.5" data-ext="mp4" style={{ textDecoration: "none" }}>Download final video</a>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
              {openJson === job.id ? (
                <pre className="text-overlay-prompt-text" style={{ marginTop: 8, maxHeight: 300, overflow: "auto", whiteSpace: "pre-wrap", fontSize: 11 }}>
                  {JSON.stringify({ request: job.requestPreview, response: job.result ?? job.error }, null, 2)}
                </pre>
              ) : null}
              </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
