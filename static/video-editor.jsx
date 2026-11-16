/* video-editor.jsx — Video Editor: trim, split, arrange and join clips on a timeline.
 *
 * Works like a regular NLE: import clips into the media bin, put them on the
 * timeline, trim by dragging clip edges, split at the playhead, drag clips to
 * reorder, and export one MP4. The timeline is a single ripple track — clips
 * always butt up against each other, so trimming one moves everything after it.
 *
 * Preview plays the sequence with two <video> elements: while one plays, the
 * next clip is cued in the other, so the cut swaps elements instead of waiting
 * on a seek. Export runs server-side with ffmpeg (/api/video-editor/*); imports
 * go through /api/video/upload_local so every clip has a /files/ URL.
 *
 * State ({media, clips, settings, exports}) comes from props — browser-local for
 * the sidebar tool, project.results.videoEditor inside a project.
 * Uses the app's own design classes.
 */
(function () {
  "use strict";
  const { useState, useEffect, useRef, useMemo, useCallback } = React;

  const TRACK_H = 64;
  const THUMBS = 10;
  const MIN_CLIP = 0.1;
  const FRAME = 1 / 30;
  const DEFAULT_SETTINGS = { resolution: "source", fit: "fit", fps: 30, quality: "standard", fade: 0, fade_ends: false };

  let _seq = 0;
  function newId(p) { return `${p}${Date.now().toString(36)}${(++_seq).toString(36)}`; }

  function fmt(t, withFrac) {
    t = Math.max(0, t || 0);
    const m = Math.floor(t / 60), s = t - m * 60;
    return `${String(m).padStart(2, "0")}:${withFrac ? s.toFixed(2).padStart(5, "0") : String(Math.floor(s)).padStart(2, "0")}`;
  }

  function readDataUrl(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ""));
      r.onerror = () => reject(r.error || new Error("Could not read the file."));
      r.readAsDataURL(file);
    });
  }

  function post(path, body) {
    return fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) })
      .then((r) => r.json().catch(() => ({})).then((d) => { if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`); return d; }));
  }

  // Duration, size and a strip of thumbnails. Thumbnails need pixel access, so
  // a cross-origin URL without CORS just gets none.
  function probeMedia(url, cors = true) {
    return new Promise((resolve, reject) => {
      const v = document.createElement("video");
      v.muted = true; v.preload = "auto";
      if (cors) v.crossOrigin = "anonymous";
      // A host without CORS refuses the anonymous request outright; retry plain
      // (the preview still plays and the export downloads it server-side).
      v.onerror = () => (cors ? probeMedia(url, false).then(resolve, reject) : reject(new Error("This file could not be opened as a video.")));
      v.onloadedmetadata = async () => {
        const duration = v.duration, w = v.videoWidth, h = v.videoHeight;
        const thumbs = [];
        try {
          const th = 72, tw = Math.max(1, Math.round(th * (w / h || 16 / 9)));
          const c = document.createElement("canvas"); c.width = tw; c.height = th;
          const ctx = c.getContext("2d");
          for (let i = 0; i < THUMBS; i++) {
            await new Promise((res) => { v.onseeked = res; v.currentTime = Math.min(duration - 0.05, ((i + 0.5) / THUMBS) * duration); });
            ctx.drawImage(v, 0, 0, tw, th);
            thumbs.push(c.toDataURL("image/jpeg", 0.6));
          }
        } catch (e) { thumbs.length = 0; }
        v.removeAttribute("src"); v.load();
        resolve({ duration, width: w, height: h, thumbs });
      };
      v.src = url;
    });
  }

  function seqInfo(clips) {
    const starts = [];
    let t = 0;
    for (const c of clips) { starts.push(t); t += c.out - c.in; }
    return { starts, total: t };
  }

  function locate(clips, starts, T) {
    for (let i = 0; i < clips.length; i++) {
      const d = clips[i].out - clips[i].in;
      if (T < starts[i] + d - 1e-4 || i === clips.length - 1) return { i, local: clips[i].in + Math.max(0, Math.min(d, T - starts[i])) };
    }
    return null;
  }

  function niceStep(pps) {
    for (const s of [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300]) if (s * pps >= 70) return s;
    return 600;
  }

  const ICON = {
    play: <path d="M7 4v16l13-8z" fill="currentColor" stroke="none"></path>,
    pause: <g fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect></g>,
    split: <g><path d="M12 3v18"></path><path d="m8 8-4 4 4 4"></path><path d="m16 8 4 4-4 4"></path></g>,
    trash: <g><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M6 6l1 14h10l1-14"></path></g>,
    copy: <g><rect x="9" y="9" width="12" height="12" rx="2"></rect><path d="M5 15V5a2 2 0 0 1 2-2h10"></path></g>,
    undo: <g><path d="M9 14 4 9l5-5"></path><path d="M4 9h11a5 5 0 0 1 0 10h-3"></path></g>,
    redo: <g><path d="m15 14 5-5-5-5"></path><path d="M20 9H9a5 5 0 0 0 0 10h3"></path></g>,
    start: <g><path d="M6 5v14"></path><path d="M18 5 9 12l9 7z" fill="currentColor"></path></g>,
    end: <g><path d="M18 5v14"></path><path d="m6 5 9 7-9 7z" fill="currentColor"></path></g>,
    plus: <g><path d="M12 5v14"></path><path d="M5 12h14"></path></g>,
    film: <g><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="M7 4v16M17 4v16M2 9h5M17 9h5M2 15h5M17 15h5"></path></g>,
    mute: <g><path d="M11 5 6 9H2v6h4l5 4z"></path><path d="m22 9-6 6M16 9l6 6"></path></g>,
  };
  function Icon({ name, size = 14 }) {
    return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{ICON[name]}</svg>;
  }

  const TOOL_BTN = { display: "inline-flex", alignItems: "center", gap: 5, height: 30 };

  function VideoEditor({ state, update }) {
    const s = state || {};
    const media = useMemo(() => (s.media || []).filter((m) => m.url && !m.url.startsWith("blob:")), [s.media]);
    const mediaById = useMemo(() => Object.fromEntries(media.map((m) => [m.id, m])), [media]);
    const clips = useMemo(() => (s.clips || []).filter((c) => mediaById[c.mediaId]), [s.clips, mediaById]);
    // Exports always use the defaults: the first clip's size, fit with black bars, 30 fps, standard quality, hard cuts.
    const settings = DEFAULT_SETTINGS;
    const exportsList = s.exports || [];
    const { starts, total } = useMemo(() => seqInfo(clips), [clips]);

    const [pending, setPending] = useState([]);   // imports still uploading: {id, name}
    const [error, setError] = useState("");
    const [selectedId, setSelectedId] = useState(null);
    const [T, setT] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [pps, setPps] = useState(40);           // timeline zoom, pixels per second
    const [drag, setDrag] = useState(null);       // {kind:"move", id, x, target} while reordering
    const [dropAt, setDropAt] = useState(null);   // insert index while dragging from the bin
    const [urlInput, setUrlInput] = useState("");
    const [job, setJob] = useState(null);
    const [, forceHistory] = useState(0);

    const rootRef = useRef(null);
    const fileRef = useRef(null);
    const scrollRef = useRef(null);
    const vRefs = [useRef(null), useRef(null)];
    const activeRef = useRef(0);
    const curIdxRef = useRef(0);
    const tRef = useRef(0);
    const playRef = useRef(false);
    const rafRef = useRef(0);
    const cutTimerRef = useRef(0);
    const lastSyncRef = useRef(0);
    const headRef = useRef(null);
    const timeRef = useRef(null);
    const histRef = useRef({ past: [], future: [] });
    const fitDoneRef = useRef(false);

    const live = useRef({});
    live.current = { clips, starts, total, mediaById, pps };

    const set = useCallback((fn) => update((prev) => fn({ media: [], clips: [], settings: {}, exports: [], ...(prev || {}) })), [update]);

    // ── Editing with undo ───────────────────────────────────────────────────────
    const commitClips = useCallback((next, record = true) => {
      if (record) {
        histRef.current.past.push(live.current.clips);
        if (histRef.current.past.length > 100) histRef.current.past.shift();
        histRef.current.future = [];
        forceHistory((n) => n + 1);
      }
      set((p) => ({ ...p, clips: next }));
    }, [set]);

    function undo() {
      const h = histRef.current;
      if (!h.past.length) return;
      h.future.push(clips);
      commitClips(h.past.pop(), false);
      forceHistory((n) => n + 1);
    }
    function redo() {
      const h = histRef.current;
      if (!h.future.length) return;
      h.past.push(clips);
      commitClips(h.future.pop(), false);
      forceHistory((n) => n + 1);
    }

    function addToTimeline(m, index) {
      const clip = { id: newId("c"), mediaId: m.id, in: 0, out: m.duration, volume: 1, muted: false };
      const next = clips.slice();
      next.splice(index === undefined ? next.length : index, 0, clip);
      commitClips(next);
      setSelectedId(clip.id);
    }

    function splitAtPlayhead() {
      const loc = locate(clips, starts, tRef.current);
      if (!loc) return;
      const c = clips[loc.i];
      if (loc.local - c.in < MIN_CLIP || c.out - loc.local < MIN_CLIP) return;
      const a = { ...c, out: loc.local }, b = { ...c, id: newId("c"), in: loc.local };
      const next = clips.slice();
      next.splice(loc.i, 1, a, b);
      commitClips(next);
      setSelectedId(b.id);
    }

    function deleteSelected() {
      if (!selectedId) return;
      const i = clips.findIndex((c) => c.id === selectedId);
      if (i < 0) return;
      commitClips(clips.filter((c) => c.id !== selectedId));
      const nb = clips[i + 1] || clips[i - 1];
      setSelectedId(nb ? nb.id : null);
    }

    function duplicateSelected() {
      const i = clips.findIndex((c) => c.id === selectedId);
      if (i < 0) return;
      const copy = { ...clips[i], id: newId("c") };
      const next = clips.slice();
      next.splice(i + 1, 0, copy);
      commitClips(next);
      setSelectedId(copy.id);
    }

    function patchClip(id, patch, record = true) {
      commitClips(clips.map((c) => (c.id === id ? { ...c, ...patch } : c)), record);
    }

    // ── Import ──────────────────────────────────────────────────────────────────
    async function importFiles(fileList) {
      const files = Array.from(fileList || []).filter((f) => (f.type || "").startsWith("video/") || /\.(mp4|mov|webm|mkv|m4v)$/i.test(f.name));
      if (!files.length) return;
      setError("");
      for (const file of files) {
        const tmpId = newId("p");
        setPending((p) => [...p, { id: tmpId, name: file.name }]);
        try {
          const blobUrl = URL.createObjectURL(file);
          const meta = await probeMedia(blobUrl);
          URL.revokeObjectURL(blobUrl);
          const { file_url } = await post("/api/video/upload_local", { video_data_url: await readDataUrl(file), filename: file.name });
          set((p) => ({ ...p, media: [...(p.media || []), { id: newId("m"), name: file.name, url: file_url, ...meta }] }));
        } catch (e) {
          setError(`${file.name}: ${e.message}`);
        } finally {
          setPending((p) => p.filter((x) => x.id !== tmpId));
        }
      }
    }

    async function importUrl() {
      const url = urlInput.trim();
      if (!/^(https?:\/\/|\/files\/|\/project-files\/)/i.test(url)) { setError("Paste an http(s) link or an app /files/ link."); return; }
      setError("");
      const tmpId = newId("p");
      const name = decodeURIComponent(url.split("?")[0].split("/").pop() || "clip.mp4");
      setPending((p) => [...p, { id: tmpId, name }]);
      try {
        const meta = await probeMedia(url);
        set((p) => ({ ...p, media: [...(p.media || []), { id: newId("m"), name, url, ...meta }] }));
        setUrlInput("");
      } catch (e) {
        setError(`${name}: ${e.message}`);
      } finally {
        setPending((p) => p.filter((x) => x.id !== tmpId));
      }
    }

    function removeMedia(m) {
      const used = clips.filter((c) => c.mediaId === m.id).length;
      if (used && !window.confirm(`"${m.name}" is used by ${used} clip${used === 1 ? "" : "s"} on the timeline. Remove it and those clips?`)) return;
      if (used) commitClips(clips.filter((c) => c.mediaId !== m.id));
      set((p) => ({ ...p, media: (p.media || []).filter((x) => x.id !== m.id) }));
    }

    // ── Preview playback ────────────────────────────────────────────────────────
    function cue(el, url, t) {
      return new Promise((resolve) => {
        if (!el) { resolve(); return; }
        const go = () => {
          if (Math.abs(el.currentTime - t) < 0.01) { resolve(); return; }
          const done = () => { el.removeEventListener("seeked", done); resolve(); };
          el.addEventListener("seeked", done);
          el.currentTime = t;
        };
        if (el.getAttribute("src") !== url) {
          el.onloadedmetadata = () => { el.onloadedmetadata = null; go(); };
          el.src = url;
        } else if (el.readyState >= 1) go();
        else el.onloadedmetadata = () => { el.onloadedmetadata = null; go(); };
      });
    }

    function applyVolume(el, c) {
      if (el && c) el.volume = c.muted ? 0 : Math.min(1, c.volume ?? 1);
    }

    function showActive(idx) {
      activeRef.current = idx;
      vRefs.forEach((r, k) => { if (r.current) r.current.style.visibility = k === idx ? "visible" : "hidden"; });
    }

    function paintHead(t) {
      tRef.current = t;
      if (headRef.current) headRef.current.style.transform = `translateX(${t * live.current.pps}px)`;
      if (timeRef.current) timeRef.current.textContent = fmt(t, true);
      const now = performance.now();
      if (now - lastSyncRef.current > 150) { lastSyncRef.current = now; setT(t); }
    }

    function preloadNext(i) {
      const { clips: cl, mediaById: mb } = live.current;
      const next = cl[i + 1];
      const other = vRefs[1 - activeRef.current].current;
      if (next && other) cue(other, mb[next.mediaId].url, next.in);
    }

    async function seek(t, preload = true) {
      const { clips: cl, starts: st, total: tot, mediaById: mb } = live.current;
      t = Math.max(0, Math.min(tot, t));
      paintHead(t);
      setT(t);
      const loc = locate(cl, st, t);
      if (!loc) return;
      curIdxRef.current = loc.i;
      const el = vRefs[activeRef.current].current;
      applyVolume(el, cl[loc.i]);
      await cue(el, mb[cl[loc.i].mediaId].url, loc.local);
      if (preload) preloadNext(loc.i);
    }

    function stop() {
      playRef.current = false;
      setPlaying(false);
      cancelAnimationFrame(rafRef.current);
      clearTimeout(cutTimerRef.current);
      vRefs.forEach((r) => r.current && r.current.pause());
      setT(tRef.current);
    }

    // One playback step: move the playhead, and cut to the next clip once the
    // current one reaches its out point. Runs on animation frames for a smooth
    // playhead, on the video's timeupdate events, and on a timer set for the
    // exact out point — so cuts land on time even when frames are throttled
    // (a background tab paints about once a second).
    function step() {
      if (!playRef.current) return;
      const { clips: cl, starts: st, mediaById: mb } = live.current;
      const i = curIdxRef.current;
      const c = cl[i];
      const cur = vRefs[activeRef.current].current;
      if (!c || !cur) { stop(); return; }
      const ct = cur.currentTime;
      clearTimeout(cutTimerRef.current);
      if (ct >= c.out - 0.02 || cur.ended) {
        if (i + 1 >= cl.length) { cur.pause(); paintHead(live.current.total); stop(); return; }
        const nextEl = vRefs[1 - activeRef.current].current;
        const nc = cl[i + 1];
        applyVolume(nextEl, nc);
        // Usually cued already by preloadNext; cue() returns at once if so.
        cue(nextEl, mb[nc.mediaId].url, nc.in).then(() => { if (playRef.current) nextEl.play().catch(() => {}); });
        cur.pause();
        showActive(1 - activeRef.current);
        curIdxRef.current = i + 1;
        paintHead(st[i + 1]);
        preloadNext(i + 1);
        cutTimerRef.current = setTimeout(step, Math.max(0, (nc.out - nc.in) * 1000 - 20));
        return;
      }
      paintHead(st[i] + Math.max(0, ct - c.in));
      cutTimerRef.current = setTimeout(step, Math.max(0, (c.out - ct) * 1000 - 20) / Math.max(0.1, cur.playbackRate || 1));
    }

    async function play() {
      const { total: tot } = live.current;
      if (!tot) return;
      if (tRef.current >= tot - 0.03) await seek(0);
      else await seek(tRef.current);
      playRef.current = true;
      setPlaying(true);
      const el = vRefs[activeRef.current].current;
      try { await el.play(); } catch (e) { /* autoplay policies: the user's click allows it */ }
      const frame = () => {
        if (!playRef.current) return;
        step();
        rafRef.current = requestAnimationFrame(frame);
      };
      rafRef.current = requestAnimationFrame(frame);
      step();
    }

    function togglePlay() { if (playRef.current) stop(); else play(); }

    // Re-cue the frame under the playhead whenever the edit changes.
    useEffect(() => {
      if (playRef.current) stop();
      if (!clips.length) { paintHead(0); setT(0); return; }
      seek(Math.min(tRef.current, total));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clips]);

    useEffect(() => () => { playRef.current = false; cancelAnimationFrame(rafRef.current); clearTimeout(cutTimerRef.current); }, []);

    // Zoom to fit once there is something on the timeline.
    useEffect(() => {
      if (fitDoneRef.current || !total || !scrollRef.current) return;
      fitDoneRef.current = true;
      fitZoom();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [total]);

    useEffect(() => { paintHead(tRef.current); }, [pps]);

    function fitZoom() {
      const w = (scrollRef.current?.clientWidth || 800) - 40;
      setPps(Math.max(4, Math.min(400, w / Math.max(1, live.current.total))));
    }

    // ── Timeline pointer interaction ────────────────────────────────────────────
    function timeAtClientX(clientX) {
      const el = scrollRef.current;
      const r = el.getBoundingClientRect();
      return (clientX - r.left + el.scrollLeft - 12) / pps;
    }

    function startScrub(e) {
      if (e.button !== 0) return;
      stop();
      const move = (ev) => seek(timeAtClientX(ev.clientX), false);
      const up = (ev) => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); seek(timeAtClientX(ev.clientX)); };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      seek(timeAtClientX(e.clientX), false);
    }

    function startTrim(e, c, edge) {
      e.stopPropagation();
      if (e.button !== 0) return;
      stop();
      setSelectedId(c.id);
      const m = mediaById[c.mediaId];
      const x0 = e.clientX, in0 = c.in, out0 = c.out, before = clips;
      let moved = false;
      const move = (ev) => {
        const dt = (ev.clientX - x0) / live.current.pps;
        moved = true;
        const patch = edge === "in"
          ? { in: Math.max(0, Math.min(out0 - MIN_CLIP, in0 + dt)) }
          : { out: Math.min(m.duration, Math.max(in0 + MIN_CLIP, out0 + dt)) };
        commitClips(live.current.clips.map((x) => (x.id === c.id ? { ...x, ...patch } : x)), false);
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        if (moved) { histRef.current.past.push(before); histRef.current.future = []; forceHistory((n) => n + 1); }
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    }

    function insertIndexAt(clientX) {
      const t = timeAtClientX(clientX);
      const { clips: cl, starts: st } = live.current;
      let idx = cl.length;
      for (let i = 0; i < cl.length; i++) if (t < st[i] + (cl[i].out - cl[i].in) / 2) { idx = i; break; }
      return idx;
    }

    function startMove(e, c) {
      if (e.button !== 0) return;
      e.stopPropagation();
      setSelectedId(c.id);
      const x0 = e.clientX;
      let dragging = false;
      const move = (ev) => {
        if (!dragging && Math.abs(ev.clientX - x0) < 5) return;
        dragging = true;
        setDrag({ id: c.id, target: insertIndexAt(ev.clientX), dx: ev.clientX - x0 });
      };
      const up = (ev) => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        if (!dragging) { stop(); seek(timeAtClientX(ev.clientX)); return; }
        setDrag(null);
        const target = insertIndexAt(ev.clientX);
        const from = live.current.clips.findIndex((x) => x.id === c.id);
        let to = target > from ? target - 1 : target;
        if (to === from) return;
        const next = live.current.clips.slice();
        const [it] = next.splice(from, 1);
        next.splice(to, 0, it);
        commitClips(next);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    }

    // ── Keyboard ────────────────────────────────────────────────────────────────
    function onKeyDown(e) {
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      const mod = e.metaKey || e.ctrlKey;
      const k = e.key;
      let handled = true;
      if (k === " ") togglePlay();
      else if (mod && k.toLowerCase() === "z" && e.shiftKey) redo();
      else if (mod && k.toLowerCase() === "z") undo();
      else if (mod && k.toLowerCase() === "y") redo();
      else if (mod && k.toLowerCase() === "d") duplicateSelected();
      else if ((mod && k.toLowerCase() === "b") || (!mod && k.toLowerCase() === "s")) splitAtPlayhead();
      else if (k === "Delete" || k === "Backspace") deleteSelected();
      else if (k === "ArrowLeft") { stop(); seek(tRef.current - (e.shiftKey ? 1 : FRAME)); }
      else if (k === "ArrowRight") { stop(); seek(tRef.current + (e.shiftKey ? 1 : FRAME)); }
      else if (k === "Home") { stop(); seek(0); }
      else if (k === "End") { stop(); seek(total); }
      else if (k === "=" || k === "+") setPps((p) => Math.min(400, p * 1.25));
      else if (k === "-") setPps((p) => Math.max(4, p / 1.25));
      else handled = false;
      if (handled) e.preventDefault();
    }

    // ── Export ──────────────────────────────────────────────────────────────────
    async function exportVideo() {
      setError("");
      stop();
      try {
        const { job_id } = await post("/api/video-editor/export", {
          clips: clips.map((c) => ({ url: mediaById[c.mediaId].url, in: c.in, out: c.out, volume: c.volume, muted: c.muted })),
          settings,
        });
        setJob({ id: job_id, status: "running", stage: "Starting…", progress: 0 });
      } catch (e) {
        setError(`Export failed: ${e.message}`);
      }
    }

    useEffect(() => {
      if (!job || job.status !== "running") return undefined;
      const h = setInterval(async () => {
        try {
          const j = await post("/api/video-editor/status", { job_id: job.id });
          setJob(j);
          if (j.status === "done") {
            set((p) => ({ ...p, exports: [{ id: j.id, url: j.file_url, width: j.width, height: j.height, fps: j.fps, bytes: j.bytes, duration: total, clips: clips.length, at: Date.now() }, ...(p.exports || [])].slice(0, 10) }));
          }
        } catch (e) {
          setJob((x) => ({ ...x, status: "error", error: e.message }));
        }
      }, 1000);
      return () => clearInterval(h);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [job && job.id, job && job.status]);

    function addExportToBin(x) {
      probeMedia(x.url).then((meta) => set((p) => ({ ...p, media: [...(p.media || []), { id: newId("m"), name: `Export ${new Date(x.at).toLocaleTimeString()}.mp4`, url: x.url, ...meta }] })))
        .catch((e) => setError(e.message));
    }

    // ── Render ──────────────────────────────────────────────────────────────────
    const selected = clips.find((c) => c.id === selectedId) || null;
    const selMedia = selected ? mediaById[selected.mediaId] : null;
    const tickStep = niceStep(pps);
    const timelineW = Math.max((total + 4) * pps, (scrollRef.current?.clientWidth || 600));
    const ticks = [];
    for (let t = 0; t * pps <= timelineW; t += tickStep) ticks.push(t);
    const canUndo = histRef.current.past.length > 0, canRedo = histRef.current.future.length > 0;
    const first = clips[0] ? mediaById[clips[0].mediaId] : null;
    const aspect = first && first.width ? first.width / first.height : 16 / 9;

    return (
      <div ref={rootRef} tabIndex={0} onKeyDown={onKeyDown} style={{ outline: "none" }}
        onMouseDown={(e) => { const tag = (e.target.tagName || "").toLowerCase(); if (!["input", "textarea", "select", "button", "a", "video"].includes(tag)) rootRef.current.focus({ preventScroll: true }); }}>
        <input ref={fileRef} type="file" className="sr-only" accept="video/*,.mkv,.mov,.m4v" multiple
          onChange={(e) => { importFiles(e.target.files); e.target.value = ""; }} />

        <div className="card">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
            {/* ── Viewer ── */}
            <div style={{ minWidth: 0, flex: "1 1 100%" }}>
              <div className="field-label">Preview</div>
              <div style={{ position: "relative", width: "100%", aspectRatio: String(aspect), maxHeight: "76vh", minHeight: 360, margin: "0 auto", background: "#000", borderRadius: 6, overflow: "hidden" }}>
                {[0, 1].map((k) => (
                  <video key={k} ref={vRefs[k]} playsInline preload="auto" onTimeUpdate={() => step()} onEnded={() => step()}
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", visibility: k === 0 ? "visible" : "hidden" }} />
                ))}
                {!clips.length && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,.6)", fontSize: 12, textAlign: "center", padding: 16 }}>
                    Import clips, then add them to the timeline to start editing.
                  </div>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                <button className="btn-action btn-inline" style={TOOL_BTN} onClick={() => { stop(); seek(0); }} title="Go to start (Home)" disabled={!total}><Icon name="start" /></button>
                <button className="btn-action btn-inline" style={{ ...TOOL_BTN, minWidth: 64, color: "var(--text-primary)" }} onClick={togglePlay} disabled={!total} title="Play / pause (Space)">
                  <Icon name={playing ? "pause" : "play"} />{playing ? "Pause" : "Play"}
                </button>
                <button className="btn-action btn-inline" style={TOOL_BTN} onClick={() => { stop(); seek(total); }} title="Go to end (End)" disabled={!total}><Icon name="end" /></button>
                <span style={{ fontFamily: "var(--mono)", fontSize: 12, marginLeft: 6 }}>
                  <span ref={timeRef}>{fmt(T, true)}</span><span style={{ color: "var(--text-secondary)" }}> / {fmt(total, true)}</span>
                </span>
              </div>
            </div>

            {/* ── Media bin ── */}
            <div style={{ minWidth: 0, flex: "1 1 100%" }}>
              <div className="field-label">Media ({media.length})</div>
              <div className="upload-zone" role="button" tabIndex="0" style={{ padding: "12px 10px" }}
                onClick={() => fileRef.current.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); importFiles(e.dataTransfer.files); }}>
                <p className="upload-text" style={{ marginBottom: 2 }}>Drop videos here, or click to import</p>
                <p className="upload-sub">MP4 · MOV · WEBM · MKV</p>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <input className="select-input" style={{ height: 32, padding: "0 9px", fontSize: 12, minWidth: 0 }} placeholder="…or paste a video link"
                  value={urlInput} onChange={(e) => setUrlInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && importUrl()} />
                <button className="btn-action btn-inline" disabled={!urlInput.trim()} onClick={importUrl}>Add</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 8, marginTop: 10, maxHeight: 260, overflowY: "auto" }}>
                {pending.map((p) => (
                  <div key={p.id} className="video-hint" style={{ margin: 0, padding: "6px 8px", border: "0.5px dashed var(--border-2)", borderRadius: 6 }}>Importing {p.name}…</div>
                ))}
                {media.map((m) => (
                  <div key={m.id} draggable onDragStart={(e) => { e.dataTransfer.setData("text/x-cc-media", m.id); e.dataTransfer.effectAllowed = "copy"; }}
                    style={{ display: "flex", gap: 8, alignItems: "center", padding: 6, border: "0.5px solid var(--border)", borderRadius: 6, background: "var(--surface)", cursor: "grab" }}
                    title="Drag onto the timeline, or press +">
                    <div style={{ width: 64, height: 36, flex: "0 0 64px", borderRadius: 4, background: "#000", overflow: "hidden" }}>
                      {m.thumbs && m.thumbs[0] ? <img src={m.thumbs[Math.floor(THUMBS / 2)] || m.thumbs[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : null}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</div>
                      <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{fmt(m.duration, true)}{m.width ? ` · ${m.width}×${m.height}` : ""}</div>
                    </div>
                    <button className="btn-icon" title="Add to the end of the timeline" onClick={() => addToTimeline(m)}><Icon name="plus" /></button>
                    <button className="btn-icon" title="Remove from media" onClick={() => removeMedia(m)}><Icon name="trash" /></button>
                  </div>
                ))}
                {!media.length && !pending.length && <div className="video-hint" style={{ marginTop: 0 }}>No media yet.</div>}
              </div>
            </div>
          </div>

          {error && <div className="error-box">{error}</div>}

          {/* ── Timeline ── */}
          <hr className="divider" />
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            <div className="field-label" style={{ margin: "0 8px 0 0" }}>Timeline</div>
            <button className="btn-action btn-inline" style={TOOL_BTN} onClick={splitAtPlayhead} disabled={!clips.length} title="Split at playhead (S or ⌘B)"><Icon name="split" />Split</button>
            <button className="btn-action btn-inline" style={TOOL_BTN} onClick={deleteSelected} disabled={!selected} title="Delete clip (Delete)"><Icon name="trash" />Delete</button>
            <button className="btn-action btn-inline" style={TOOL_BTN} onClick={duplicateSelected} disabled={!selected} title="Duplicate clip (⌘D)"><Icon name="copy" />Duplicate</button>
            <button className="btn-action btn-inline" style={TOOL_BTN} onClick={undo} disabled={!canUndo} title="Undo (⌘Z)"><Icon name="undo" /></button>
            <button className="btn-action btn-inline" style={TOOL_BTN} onClick={redo} disabled={!canRedo} title="Redo (⇧⌘Z)"><Icon name="redo" /></button>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Zoom</span>
            <input type="range" min={Math.log(4)} max={Math.log(400)} step={0.01} value={Math.log(pps)} onChange={(e) => setPps(Math.exp(parseFloat(e.target.value)))} style={{ width: 120 }} />
            <button className="btn-action btn-inline" style={TOOL_BTN} onClick={fitZoom} disabled={!total} title="Fit the whole timeline">Fit</button>
          </div>

          <div ref={scrollRef} style={{ overflowX: "auto", overflowY: "hidden", border: "0.5px solid var(--border)", borderRadius: 6, background: "var(--surface-2)", userSelect: "none" }}
            onDragOver={(e) => { if (Array.from(e.dataTransfer.types).includes("text/x-cc-media") || Array.from(e.dataTransfer.types).includes("Files")) { e.preventDefault(); setDropAt(insertIndexAt(e.clientX)); } }}
            onDragLeave={() => setDropAt(null)}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/x-cc-media");
              const at = insertIndexAt(e.clientX);
              setDropAt(null);
              if (id && mediaById[id]) addToTimeline(mediaById[id], at);
              else if (e.dataTransfer.files && e.dataTransfer.files.length) importFiles(e.dataTransfer.files);
            }}>
            <div style={{ position: "relative", width: timelineW + 24, padding: "0 12px" }}>
              {/* Ruler */}
              <div onPointerDown={startScrub} style={{ position: "relative", height: 24, cursor: "pointer", borderBottom: "0.5px solid var(--border)" }}>
                {ticks.map((t) => (
                  <div key={t} style={{ position: "absolute", left: t * pps, top: 0, height: "100%", borderLeft: "1px solid var(--border-2)", paddingLeft: 3, fontSize: 10, color: "var(--text-secondary)", fontFamily: "var(--mono)", lineHeight: "22px" }}>{fmt(t)}</div>
                ))}
              </div>
              {/* Track */}
              <div onPointerDown={startScrub} style={{ position: "relative", height: TRACK_H + 16, cursor: "text" }}>
                {!clips.length && (
                  <div style={{ position: "absolute", left: 0, right: 0, top: 8, height: TRACK_H, border: "1.5px dashed var(--border-2)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "var(--text-secondary)" }}>
                    Drag clips here from Media, or press + on a clip
                  </div>
                )}
                {clips.map((c, i) => {
                  const m = mediaById[c.mediaId];
                  const d = c.out - c.in;
                  const w = Math.max(6, d * pps);
                  const tileW = Math.max(24, TRACK_H * (m.width && m.height ? m.width / m.height : 16 / 9));
                  const tiles = m.thumbs && m.thumbs.length ? Math.min(60, Math.ceil(w / tileW)) : 0;
                  const isSel = c.id === selectedId;
                  const dragging = drag && drag.id === c.id;
                  return (
                    <div key={c.id} onPointerDown={(e) => startMove(e, c)}
                      style={{ position: "absolute", left: starts[i] * pps, top: 8, width: w, height: TRACK_H, borderRadius: 6, overflow: "hidden", cursor: "grab",
                        background: "#2b2b33", boxShadow: isSel ? "0 0 0 2px var(--accent-2)" : "0 0 0 1px rgba(0,0,0,.25)",
                        opacity: dragging ? 0.55 : 1, transform: dragging ? `translateX(${drag.dx}px)` : undefined, zIndex: dragging ? 3 : isSel ? 2 : 1 }}>
                      <div style={{ position: "absolute", inset: 0, display: "flex", pointerEvents: "none" }}>
                        {Array.from({ length: tiles }, (_, k) => {
                          const t = c.in + Math.min(d, (k + 0.5) * (tileW / pps));
                          const th = m.thumbs[Math.max(0, Math.min(THUMBS - 1, Math.floor((t / m.duration) * THUMBS)))];
                          return <img key={k} src={th} alt="" draggable={false} style={{ height: "100%", width: tileW, flex: `0 0 ${tileW}px`, objectFit: "cover", opacity: 0.85 }} />;
                        })}
                      </div>
                      <div style={{ position: "absolute", left: 8, right: 8, bottom: 4, display: "flex", gap: 4, alignItems: "center", fontSize: 10, color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,.8)", pointerEvents: "none", whiteSpace: "nowrap", overflow: "hidden" }}>
                        {c.muted ? <Icon name="mute" size={11} /> : null}
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</span>
                        <span style={{ opacity: 0.8 }}>{d.toFixed(1)}s</span>
                      </div>
                      {["in", "out"].map((edge) => (
                        <div key={edge} onPointerDown={(e) => startTrim(e, c, edge)} title={edge === "in" ? "Drag to trim the start" : "Drag to trim the end"}
                          style={{ position: "absolute", top: 0, bottom: 0, [edge === "in" ? "left" : "right"]: 0, width: 8, cursor: "ew-resize",
                            background: isSel ? "var(--accent-2)" : "rgba(255,255,255,.18)", borderRadius: edge === "in" ? "6px 0 0 6px" : "0 6px 6px 0" }} />
                      ))}
                    </div>
                  );
                })}
                {(drag || dropAt !== null) && (() => {
                  const idx = drag ? drag.target : dropAt;
                  const x = idx >= clips.length ? total * pps : starts[idx] * pps;
                  return <div style={{ position: "absolute", left: x - 1, top: 2, width: 3, height: TRACK_H + 12, background: "var(--accent)", borderRadius: 2, zIndex: 5, pointerEvents: "none" }} />;
                })()}
              </div>
              {/* Playhead */}
              <div ref={headRef} style={{ position: "absolute", left: 12, top: 0, bottom: 0, width: 0, transform: `translateX(${T * pps}px)`, pointerEvents: "none", zIndex: 6 }}>
                <div style={{ position: "absolute", left: -6, top: 0, width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "8px solid #E11D48" }} />
                <div style={{ position: "absolute", left: -1, top: 0, bottom: 0, width: 2, background: "#E11D48" }} />
              </div>
            </div>
          </div>
          <div className="video-hint">
            Drag clip edges to trim · drag a clip to reorder · click the ruler to move the playhead · Space play · S split · Delete remove · ⌘Z undo · ←/→ one frame (⇧ one second)
          </div>

          {/* ── Selected clip ── */}
          {selected && selMedia && (
            <>
              <hr className="divider" />
              <div className="field-label">Selected clip — {selMedia.name}</div>
              <div className="config-grid" style={{ marginTop: 0, gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
                <div>
                  <div className="field-label">Start in source (s)</div>
                  <input className="select-input" type="number" step="0.05" min={0} max={selected.out - MIN_CLIP} value={+selected.in.toFixed(2)}
                    onChange={(e) => { const v = parseFloat(e.target.value); if (Number.isFinite(v)) patchClip(selected.id, { in: Math.max(0, Math.min(selected.out - MIN_CLIP, v)) }); }} />
                </div>
                <div>
                  <div className="field-label">End in source (s)</div>
                  <input className="select-input" type="number" step="0.05" min={selected.in + MIN_CLIP} max={selMedia.duration} value={+selected.out.toFixed(2)}
                    onChange={(e) => { const v = parseFloat(e.target.value); if (Number.isFinite(v)) patchClip(selected.id, { out: Math.min(selMedia.duration, Math.max(selected.in + MIN_CLIP, v)) }); }} />
                </div>
                <div>
                  <div className="field-label">Duration</div>
                  <div style={{ height: 38, display: "flex", alignItems: "center", fontFamily: "var(--mono)", fontSize: 12 }}>{(selected.out - selected.in).toFixed(2)}s of {selMedia.duration.toFixed(2)}s</div>
                </div>
                <div>
                  <div className="field-label">Volume — {selected.muted ? "muted" : `${Math.round((selected.volume ?? 1) * 100)}%`}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, height: 38 }}>
                    <input type="range" min={0} max={2} step={0.05} value={selected.volume ?? 1} disabled={selected.muted} style={{ flex: 1 }}
                      onChange={(e) => patchClip(selected.id, { volume: parseFloat(e.target.value) }, false)} />
                    <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                      <input type="checkbox" checked={!!selected.muted} onChange={(e) => patchClip(selected.id, { muted: e.target.checked })} />Mute
                    </label>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button className="btn-action btn-inline" onClick={() => patchClip(selected.id, { in: 0, out: selMedia.duration })}>Reset trim</button>
                <button className="btn-action btn-inline" onClick={() => { stop(); seek(starts[clips.indexOf(selected)]); }}>Go to clip start</button>
              </div>
              <div className="video-hint">Preview plays at up to 100% volume; above 100% is applied in the export.</div>
            </>
          )}

          {/* ── Export ── */}
          <hr className="divider" />
          <div className="btn-row">
            <button className="btn-primary" onClick={exportVideo} disabled={!clips.length || (job && job.status === "running")}>
              {job && job.status === "running" ? `${job.stage} ${Math.round((job.progress || 0) * 100)}%` : `Export MP4 · ${fmt(total, true)}`}
            </button>
          </div>
          {job && job.status === "error" && <div className="error-box">{job.error}</div>}

          {exportsList.length > 0 && (
            <>
              <div className="field-label" style={{ marginTop: 16 }}>Exports</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))", gap: 10 }}>
                {exportsList.map((x) => (
                  <div key={x.id} className="variant-cell">
                    <div className="variant-head">
                      <span className="variant-label">{new Date(x.at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      <span className="variant-state">{x.clips} clip{x.clips === 1 ? "" : "s"} · {fmt(x.duration, true)}</span>
                    </div>
                    <video className="video-player" src={x.url} controls preload="metadata" style={{ border: "none", borderRadius: 0 }} />
                    <div className="variant-meta">{x.width}×{x.height} · {x.fps} fps{x.bytes ? ` · ${(x.bytes / 1e6).toFixed(1)} MB` : ""}</div>
                    <div className="result-footer">
                      <a className="btn-action" href={x.url} download data-model="Video Editor" data-ext="mp4">Download</a>
                      <button className="btn-action" onClick={() => addExportToBin(x)}>Add to media</button>
                      {window.sendBlenderClipToVideo ? <button className="btn-action" onClick={() => window.sendBlenderClipToVideo({ videoUrl: x.url, name: `edit-${x.id}` }).catch((e) => setError(e.message))}>To Video Gen</button> : null}
                      <button className="btn-action" onClick={() => set((p) => ({ ...p, exports: (p.exports || []).filter((y) => y.id !== x.id) }))}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  window.VideoEditor = VideoEditor;
})();
