/* canvas.jsx — Canvas: a node board for wiring assets and tools together.
 *
 * Drag tools from the palette (or drop files from the computer) onto the board,
 * then drag from an output dot to an input dot to connect them. Connected text
 * becomes a tool's prompt; connected images, videos and audio become its
 * references. Three tools run right here — Image (Seedream), Video (Seedance)
 * and Audio (Seed Audio) — and each result is an output that can feed the next
 * node. Every other app tool can be placed as a shortcut that opens it.
 *
 * Ports are typed (text / image / video / audio): a connection only joins
 * matching types. Inputs marked "many" take several connections.
 *
 * State ({nodes, edges, view}) comes from props — browser-local for the sidebar
 * tool, project.results.canvas inside a project. Uses the app's design classes.
 */
(function () {
  "use strict";
  const { useState, useEffect, useRef, useCallback } = React;

  const NODE_W = 260;
  const HEAD_H = 40;
  const PORT_ROW = 26;
  const PORT_TOP = HEAD_H + 10;
  // Note colours: [background, swatch].
  const NOTE_COLOURS = { yellow: ["#FEF9C3", "#FACC15"], pink: ["#FCE7F3", "#F472B6"], blue: ["#DBEAFE", "#60A5FA"], green: ["#DCFCE7", "#4ADE80"] };
  const KIND_COLOUR = { text: "#64748B", image: "#2563EB", video: "#7C6FE3", audio: "#DB2777" };
  const VIDEO_MODELS = [
    ["dreamina-seedance-2-5-260628", "Seedance 2.5", 30],
    ["dreamina-seedance-2-5-flash-261115", "Seedance 2.5 flash", 30],
    ["dreamina-seedance-2-0-260128", "Seedance 2.0", 15],
    ["dreamina-seedance-2-0-fast-260128", "Seedance 2.0 fast", 15],
  ];

  // What each node type looks like and which ports it has.
  const TYPES = {
    text: { title: "Prompt", group: "Assets", icon: "text", inputs: [], outputs: [["text", "text"]] },
    // A sticky note: free text for the board, never fed into a tool.
    note: { title: "Note", group: "Assets", icon: "note", inputs: [], outputs: [] },
    image: { title: "Image", group: "Assets", icon: "image", inputs: [], outputs: [["image", "image"]] },
    video: { title: "Video", group: "Assets", icon: "video", inputs: [], outputs: [["video", "video"]] },
    audio: { title: "Audio", group: "Assets", icon: "audio", inputs: [], outputs: [["audio", "audio"]] },
    "gen-image": { title: "Image · Seedream", group: "Generate", icon: "image", run: true,
      inputs: [["prompt", "text", "Prompt"], ["images", "image", "Reference images", true]], outputs: [["image", "image"]] },
    "gen-video": { title: "Video · Seedance", group: "Generate", icon: "video", run: true,
      inputs: [["prompt", "text", "Prompt"], ["images", "image", "Reference images", true], ["videos", "video", "Reference videos", true], ["audios", "audio", "Reference audio", true]],
      outputs: [["video", "video"]] },
    "gen-audio": { title: "Audio · Seed Audio", group: "Generate", icon: "audio", run: true,
      inputs: [["prompt", "text", "Script"], ["audios", "audio", "Reference voices", true]], outputs: [["audio", "audio"]] },
    tool: { title: "Tool", group: "Tools", icon: "tool", inputs: [], outputs: [] },
  };

  // App tools that can be placed as "open in tool" shortcuts.
  const SHORTCUT_TOOLS = [
    ["character-generation", "Character Generation"], ["character-sheets", "Character Sheets"], ["script-to-prompt", "Script to Prompt"],
    ["storyboard", "Storyboard"], ["previz", "Previz"], ["character-masking", "Character Masking"], ["location-variations", "Location Variations"], ["seedream-layers", "Layer Separation"], ["seedream-edit", "Interactive Edit"],
    ["long-duration", "Long Duration"], ["video-editor", "Video Editor"], ["video-enhancer", "Video Enhancer"], ["hybrid-studio", "Hybrid Studio"],
    ["audiobook", "Audiobook Creator"], ["motion-blockout", "Motion Blockout"], ["skeleton-reference", "Skeleton Reference"],
  ];

  const ICONS = {
    text: <g><path d="M4 6h16M4 12h16M4 18h10"></path></g>,
    note: <g><path d="M15 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9z"></path><path d="M15 3v6h6"></path></g>,
    image: <g><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><path d="m21 15-5-5L5 21"></path></g>,
    video: <g><path d="m22 8-6 4 6 4V8z"></path><rect x="2" y="6" width="14" height="12" rx="2"></rect></g>,
    audio: <g><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></g>,
    tool: <g><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect></g>,
    upload: <g><path d="M12 15V3M7 8l5-5 5 5M4 21h16"></path></g>,
    play: <path d="M7 4v16l13-8z" fill="currentColor" stroke="none"></path>,
    x: <g><path d="M18 6 6 18M6 6l12 12"></path></g>,
    chevL: <path d="m15 18-6-6 6-6"></path>,
    chevR: <path d="m9 18 6-6-6-6"></path>,
    arrange: <g><rect x="3" y="4" width="6" height="5" rx="1"></rect><rect x="3" y="15" width="6" height="5" rx="1"></rect><rect x="15" y="9.5" width="6" height="5" rx="1"></rect><path d="M9 6.5h3v11H9M12 12h3"></path></g>,
    fit: <g><path d="M3 8V3h5M21 8V3h-5M3 16v5h5M21 16v5h-5"></path></g>,
  };
  // Seedream 5.5 renders 1K–2K only; 5.0 pro / flash also go to 4K.
  function imageSizesFor(model) { return model === "5.5" ? ["1K", "1.5K", "2K"] : ["1K", "2K", "4K"]; }

  function Icon({ name, size = 15 }) {
    return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[name]}</svg>;
  }

  let _seq = 0;
  function newId(p) { return `${p}${Date.now().toString(36)}${(++_seq).toString(36)}`; }

  function post(path, body) {
    return fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) })
      .then((r) => r.json().catch(() => ({})).then((d) => {
        if (!r.ok) throw new Error((d.error && (d.error.message || d.error)) || `HTTP ${r.status}`);
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

  async function urlToDataUrl(url) {
    if (url.startsWith("data:")) return url;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Could not load ${url} (HTTP ${res.status}).`);
    return readDataUrl(await res.blob());
  }

  function mediaDuration(url, kind) {
    return new Promise((resolve) => {
      const el = document.createElement(kind === "video" ? "video" : "audio");
      el.preload = "metadata";
      el.onloadedmetadata = () => resolve(el.duration || 0);
      el.onerror = () => resolve(0);
      el.src = url;
    });
  }

  function kindOfFile(file) {
    const t = file.type || "";
    if (t.startsWith("image/")) return "image";
    if (t.startsWith("video/")) return "video";
    if (t.startsWith("audio/")) return "audio";
    return "";
  }

  function portsOf(node) {
    const t = TYPES[node.type] || TYPES.tool;
    return { inputs: t.inputs, outputs: t.outputs };
  }

  // Board coordinates of a port's dot.
  function portPoint(node, side, index) {
    return { x: node.x + (side === "in" ? 0 : NODE_W), y: node.y + PORT_TOP + index * PORT_ROW + PORT_ROW / 2 };
  }

  // The value a node offers on its output: text, or the URL of its asset or chosen result.
  function outputValue(node) {
    const d = node.data || {};
    if (node.type === "text") return (d.text || "").trim();
    if (["image", "video", "audio"].includes(node.type)) return d.url || "";
    return d.results && d.results.length ? d.results[d.selected || 0] : "";
  }

  function defaultData(type) {
    if (type === "text") return { text: "" };
    if (type === "note") return { text: "", color: "yellow" };
    if (type === "gen-image") return { model: "pro", size: "2K", text: "" };
    if (type === "gen-video") return { model: VIDEO_MODELS[0][0], duration: 5, resolution: "720p", ratio: "16:9", text: "" };
    if (type === "gen-audio") return { text: "" };
    return {};
  }

  function Canvas({ state, update, onOpenTool }) {
    const s = state || {};
    const nodes = s.nodes || [];
    const edges = s.edges || [];
    const view = s.view || { x: 40, y: 40, zoom: 1 };

    const [selectedId, setSelectedId] = useState(null);
    const [paletteOpen, setPaletteOpen] = useState(() => { try { return localStorage.getItem("cc_canvas_palette") !== "0"; } catch (e) { return true; } });
    const [wire, setWire] = useState(null);   // {from:{node,port,kind}, x, y} while dragging a connection
    const [error, setError] = useState("");
    const [uploading, setUploading] = useState(0);
    const boardRef = useRef(null);
    const fileRef = useRef(null);
    const live = useRef({});
    live.current = { nodes, edges, view };

    const set = useCallback((fn) => update((prev) => fn({ nodes: [], edges: [], view: { x: 40, y: 40, zoom: 1 }, ...(prev || {}) })), [update]);
    const patchNode = useCallback((id, patch) => set((p) => ({ ...p, nodes: p.nodes.map((n) => (n.id === id ? { ...n, data: { ...(n.data || {}), ...(typeof patch === "function" ? patch(n.data || {}) : patch) } } : n)) })), [set]);

    function toBoard(clientX, clientY) {
      const r = boardRef.current.getBoundingClientRect();
      const v = live.current.view;
      return { x: (clientX - r.left - v.x) / v.zoom, y: (clientY - r.top - v.y) / v.zoom };
    }

    function addNode(type, at, data) {
      const id = newId("n");
      const pos = at || (() => {
        const r = boardRef.current.getBoundingClientRect();
        const c = toBoard(r.left + r.width / 2, r.top + r.height / 2);
        return { x: c.x - NODE_W / 2 + (nodes.length % 5) * 18, y: c.y - 60 + (nodes.length % 5) * 18 };
      })();
      set((p) => ({ ...p, nodes: [...p.nodes, { id, type, x: Math.round(pos.x), y: Math.round(pos.y), data: { ...defaultData(type), ...(data || {}) } }] }));
      setSelectedId(id);
      return id;
    }

    function removeNode(id) {
      set((p) => ({ ...p, nodes: p.nodes.filter((n) => n.id !== id), edges: p.edges.filter((e) => e.from.node !== id && e.to.node !== id) }));
      setSelectedId(null);
    }

    // ── Uploads: every local file becomes an asset node ──
    async function uploadFiles(fileList, at) {
      const files = Array.from(fileList || []).filter((f) => kindOfFile(f));
      if (!files.length) { setError("Drop images, videos or audio files."); return; }
      setError("");
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const kind = kindOfFile(f);
        const pos = at ? { x: at.x + i * 24, y: at.y + i * 24 } : null;
        const id = addNode(kind, pos, { name: f.name, uploading: true });
        setUploading((n) => n + 1);
        try {
          const dataUrl = await readDataUrl(f);
          const res = kind === "image"
            ? await post("/api/seedream/save-image", { data_url: dataUrl, hint: "canvas" })
            : await post("/api/video/upload_local", { video_data_url: dataUrl, filename: f.name });
          const url = res.url || res.file_url;
          const duration = kind === "image" ? 0 : await mediaDuration(url, kind);
          patchNode(id, { url, duration, uploading: false });
        } catch (e) {
          patchNode(id, { uploading: false, error: e.message });
        } finally {
          setUploading((n) => n - 1);
        }
      }
    }

    // ── Pan, zoom, node drag ──
    function onBoardPointerDown(e) {
      if (e.button !== 0 || e.target !== e.currentTarget) return;
      setSelectedId(null);
      const start = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
      const move = (ev) => set((p) => ({ ...p, view: { ...p.view, x: start.vx + ev.clientX - start.x, y: start.vy + ev.clientY - start.y } }));
      const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    }

    function onWheel(e) {
      e.preventDefault();
      const r = boardRef.current.getBoundingClientRect();
      const v = live.current.view;
      const zoom = Math.max(0.3, Math.min(2, v.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1)));
      const mx = e.clientX - r.left, my = e.clientY - r.top;
      set((p) => ({ ...p, view: { zoom, x: mx - ((mx - v.x) * zoom) / v.zoom, y: my - ((my - v.y) * zoom) / v.zoom } }));
    }
    useEffect(() => {
      const el = boardRef.current;
      if (!el) return undefined;
      el.addEventListener("wheel", onWheel, { passive: false });
      return () => el.removeEventListener("wheel", onWheel);
    });

    function startNodeDrag(e, node) {
      if (e.button !== 0) return;
      e.stopPropagation();
      setSelectedId(node.id);
      const start = { x: e.clientX, y: e.clientY, nx: node.x, ny: node.y };
      const move = (ev) => {
        const z = live.current.view.zoom;
        const x = Math.round(start.nx + (ev.clientX - start.x) / z), y = Math.round(start.ny + (ev.clientY - start.y) / z);
        set((p) => ({ ...p, nodes: p.nodes.map((n) => (n.id === node.id ? { ...n, x, y } : n)) }));
      };
      const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    }

    // Notes resize from their bottom-right corner (width and text height, in board units).
    function startNoteResize(e, node) {
      if (e.button !== 0) return;
      e.stopPropagation(); e.preventDefault();
      const d = node.data || {};
      const start = { x: e.clientX, y: e.clientY, w: d.w || NODE_W, h: d.h || 150 };
      const move = (ev) => {
        const z = live.current.view.zoom;
        patchNode(node.id, { w: Math.round(Math.max(160, Math.min(900, start.w + (ev.clientX - start.x) / z))),
                             h: Math.round(Math.max(80, Math.min(1200, start.h + (ev.clientY - start.y) / z))) });
      };
      const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    }

    // ── Connections: drag from an output dot, release on a matching input dot ──
    function startWire(e, node, portIndex) {
      e.stopPropagation();
      e.preventDefault();
      const [port, kind] = portsOf(node).outputs[portIndex];
      const p = toBoard(e.clientX, e.clientY);
      setWire({ from: { node: node.id, port, kind, index: portIndex }, x: p.x, y: p.y });
      const move = (ev) => { const q = toBoard(ev.clientX, ev.clientY); setWire((w) => (w ? { ...w, x: q.x, y: q.y } : w)); };
      const up = (ev) => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        const el = document.elementFromPoint(ev.clientX, ev.clientY);
        const dot = el && el.closest && el.closest("[data-in-port]");
        setWire(null);
        if (!dot) return;
        const toNode = dot.getAttribute("data-node"), toPort = dot.getAttribute("data-in-port"), toKind = dot.getAttribute("data-kind");
        const many = dot.getAttribute("data-many") === "1";
        if (toNode === node.id) return;
        if (toKind !== kind) { setError(`A ${kind} output can't connect to ${/^[aeiou]/.test(toKind) ? "an" : "a"} ${toKind} input.`); return; }
        setError("");
        set((pr) => {
          let next = pr.edges.filter((ed) => !(ed.from.node === node.id && ed.to.node === toNode && ed.to.port === toPort));
          if (!many) next = next.filter((ed) => !(ed.to.node === toNode && ed.to.port === toPort));
          return { ...pr, edges: [...next, { id: newId("e"), from: { node: node.id, port }, to: { node: toNode, port: toPort } }] };
        });
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    }

    // ── Running a tool node ──
    function inputsFor(nodeId) {
      const byPort = {};
      edges.filter((e) => e.to.node === nodeId).forEach((e) => {
        const src = nodes.find((n) => n.id === e.from.node);
        const v = src && outputValue(src);
        if (v) (byPort[e.to.port] = byPort[e.to.port] || []).push(v);
      });
      return byPort;
    }

    async function runNode(node) {
      const ins = inputsFor(node.id);
      const d = node.data || {};
      const prompt = [...(ins.prompt || []), (d.text || "").trim()].filter(Boolean).join("\n\n");
      if (!prompt && node.type !== "gen-image") { patchNode(node.id, { error: "Connect a Prompt node or type a prompt." }); return; }
      patchNode(node.id, { running: true, error: "", stage: "Starting…", startedAt: Date.now() });
      try {
        let url = "";
        if (node.type === "gen-image") {
          if (!prompt) throw new Error("Connect a Prompt node or type a prompt.");
          const images = ins.images || [];
          const body = { model: d.model || "pro", prompt, size: d.size || "2K", output_format: "png", watermark: false };
          if (images.length) body.image = images.length === 1 ? images[0] : images;
          patchNode(node.id, { stage: "Generating image…" });
          const data = await post("/api/seedream/generate", body);
          const first = (data.data || [])[0] || {};
          url = first.local_url || first.url || "";
        } else if (node.type === "gen-video") {
          patchNode(node.id, { stage: "Preparing references…" });
          const reference_images = await Promise.all((ins.images || []).map(urlToDataUrl));
          const videos = await Promise.all((ins.videos || []).map(urlToDataUrl));
          const audios = await Promise.all((ins.audios || []).map(urlToDataUrl));
          const start = await post("/api/video/start", {
            content: prompt, model: d.model, reference_images, videos, audios, variants: 1,
            config: { resolution: d.resolution || "720p", ratio: d.ratio || "16:9", frames_per_second: 24, duration: Number(d.duration) || 5 },
          });
          const taskId = (start.task_ids && start.task_ids[0]) || start.task_id;
          if (!taskId) throw new Error("No video task was started.");
          for (;;) {
            await new Promise((r) => setTimeout(r, 3000));
            const st = await post("/api/video/status", { task_id: taskId });
            const task = st.task || {};
            patchNode(node.id, { stage: `Rendering · ${task.status || "queued"}` });
            if (task.status === "succeeded") { url = task.video_url || task.file_url || ""; break; }
            if (task.status === "failed" || task.status === "cancelled") throw new Error((task.error && task.error.message) || "Video generation failed.");
          }
        } else if (node.type === "gen-audio") {
          const content = [{ type: "text", text: prompt }].concat((ins.audios || []).map((u) => ({ type: "audio_url", audio_url: { url: u }, role: "reference_audio" })));
          patchNode(node.id, { stage: "Generating audio…" });
          const data = await post("/api/seed-audio/generate", { body: { content, output_format: "wav", audio_config: { sample_rate: 44100, speech_rate: 0, loudness_rate: 0, pitch_rate: 0 } } });
          const a = ((data.content || {}).audios || [])[0] || {};
          url = a.local_url || a.url || "";
        }
        if (!url) throw new Error("The tool returned no result.");
        patchNode(node.id, (cur) => ({ running: false, stage: "", results: [url, ...(cur.results || [])].slice(0, 8), selected: 0 }));
      } catch (e) {
        patchNode(node.id, { running: false, stage: "", error: e.message });
      }
    }

    // ── Keyboard: delete the selected node ──
    function onKeyDown(e) {
      const tag = (e.target.tagName || "").toLowerCase();
      if (["input", "textarea", "select"].includes(tag)) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) { e.preventDefault(); removeNode(selectedId); }
    }

    function fitView() {
      if (!nodes.length || !boardRef.current) { set((p) => ({ ...p, view: { x: 40, y: 40, zoom: 1 } })); return; }
      const r = boardRef.current.getBoundingClientRect();
      const minX = Math.min(...nodes.map((n) => n.x)), minY = Math.min(...nodes.map((n) => n.y));
      const maxX = Math.max(...nodes.map((n) => n.x + NODE_W)), maxY = Math.max(...nodes.map((n) => n.y + 260));
      const zoom = Math.max(0.3, Math.min(1.2, Math.min((r.width - 80) / (maxX - minX), (r.height - 80) / (maxY - minY))));
      set((p) => ({ ...p, view: { zoom, x: 40 - minX * zoom, y: 40 - minY * zoom } }));
    }

    function togglePalette() {
      const next = !paletteOpen;
      setPaletteOpen(next);
      try { localStorage.setItem("cc_canvas_palette", next ? "1" : "0"); } catch (e) { /* not stored */ }
    }

    // Zoom buttons zoom around the middle of the board.
    function zoomBy(factor) {
      const r = boardRef.current.getBoundingClientRect();
      const v = live.current.view;
      const zoom = Math.max(0.3, Math.min(2, v.zoom * factor));
      const mx = r.width / 2, my = r.height / 2;
      set((p) => ({ ...p, view: { zoom, x: mx - ((mx - v.x) * zoom) / v.zoom, y: my - ((my - v.y) * zoom) / v.zoom } }));
    }

    // Rough rendered height of a node, for laying out columns without overlaps.
    function estHeight(node) {
      // Use the node's real rendered height (offsetHeight ignores the zoom transform).
      const el = boardRef.current && boardRef.current.querySelector(`[data-node-id="${node.id}"]`);
      if (el && el.offsetHeight) return el.offsetHeight;
      const { inputs, outputs } = portsOf(node);
      const ports = Math.max(inputs.length, outputs.length) * PORT_ROW + (inputs.length || outputs.length ? 10 : 0);
      const d = node.data || {};
      let body = 110;
      if (node.type === "text" || node.type === "note") body = 130;
      else if (node.type === "image" || node.type === "video") body = 175;
      else if (node.type === "audio") body = 90;
      else if (TYPES[node.type] && TYPES[node.type].run) body = (node.type === "gen-video" ? 250 : 210) + ((d.results || []).length ? 170 : 0);
      return HEAD_H + ports + body;
    }

    // Auto-arrange: sources on the left, each node one column right of what feeds it.
    function autoArrange() {
      if (!nodes.length) return;
      const depth = {};
      nodes.forEach((n) => { depth[n.id] = 0; });
      for (let pass = 0; pass < nodes.length; pass++) {
        let changed = false;
        edges.forEach((e) => {
          if (depth[e.from.node] === undefined || depth[e.to.node] === undefined) return;
          const want = depth[e.from.node] + 1;
          if (want > depth[e.to.node] && want < nodes.length) { depth[e.to.node] = want; changed = true; }
        });
        if (!changed) break;
      }
      // Unconnected shortcut nodes go in their own column at the end.
      const linked = new Set();
      edges.forEach((e) => { linked.add(e.from.node); linked.add(e.to.node); });
      const maxDepth = Math.max(0, ...nodes.filter((n) => linked.has(n.id)).map((n) => depth[n.id]));
      nodes.forEach((n) => { if (!linked.has(n.id) && n.type === "tool") depth[n.id] = maxDepth + 1; });
      const order = { text: 0, image: 1, video: 2, audio: 3 };
      const cols = {};
      nodes.forEach((n) => { (cols[depth[n.id]] = cols[depth[n.id]] || []).push(n); });
      // A column taller than MAX_COL wraps into another column beside it.
      const MAX_COL = 1100;
      const pos = {};
      let x = 0;
      const widthOf = (n) => (n.type === "note" && n.data && n.data.w) || NODE_W;
      Object.keys(cols).map(Number).sort((a, b) => a - b).forEach((c) => {
        let y = 0;
        let colW = NODE_W;
        cols[c].sort((a, b) => (order[a.type] ?? 9) - (order[b.type] ?? 9) || a.y - b.y).forEach((n) => {
          const h = estHeight(n);
          if (y > 0 && y + h > MAX_COL) { x += colW + 40; y = 0; colW = NODE_W; }
          pos[n.id] = { x, y };
          colW = Math.max(colW, widthOf(n));
          y += h + 36;
        });
        x += colW + 110;
      });
      const r = boardRef.current.getBoundingClientRect();
      const maxX = Math.max(...nodes.map((n) => pos[n.id].x + widthOf(n)));
      const maxY = Math.max(...nodes.map((n) => pos[n.id].y + estHeight(n)));
      const zoom = Math.max(0.3, Math.min(1, Math.min((r.width - 80) / maxX, (r.height - 100) / maxY)));
      set((p) => ({ ...p, nodes: p.nodes.map((n) => (pos[n.id] ? { ...n, x: pos[n.id].x, y: pos[n.id].y } : n)), view: { zoom, x: 40, y: 60 } }));
    }

    // ── Rendering ──
    function renderMedia(kind, url, height = 120) {
      if (!url) return null;
      if (kind === "image") return <img src={url} alt="" draggable={false} style={{ width: "100%", height, objectFit: "cover", borderRadius: 8, display: "block", background: "#F4F4F6" }} />;
      if (kind === "video") return <video src={url} controls muted playsInline preload="metadata" style={{ width: "100%", height, objectFit: "cover", borderRadius: 8, display: "block", background: "#000" }} />;
      return <audio src={url} controls preload="none" style={{ width: "100%", height: 34 }} />;
    }

    function renderBody(node) {
      const d = node.data || {};
      const kindOut = (portsOf(node).outputs[0] || [])[1];
      if (node.type === "note") {
        return (
          <>
            <textarea value={d.text || ""} placeholder="Write a note…" onChange={(e) => patchNode(node.id, { text: e.target.value })}
                      onPointerDown={(e) => e.stopPropagation()}
                      style={{ height: Math.max(60, (d.h || 150) - 24), fontSize: 13, lineHeight: 1.45, resize: "none", border: 0, outline: "none", background: "transparent", fontFamily: "inherit", color: "#1E1E2E", width: "100%", boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: 6 }}>
              {Object.keys(NOTE_COLOURS).map((k) => (
                <button key={k} type="button" aria-label={`${k} note`} onPointerDown={(e) => e.stopPropagation()} onClick={() => patchNode(node.id, { color: k })}
                        style={{ width: 16, height: 16, borderRadius: 8, cursor: "pointer", background: NOTE_COLOURS[k][1], border: (d.color || "yellow") === k ? "2px solid #1E1E2E" : "1px solid rgba(0,0,0,.15)", padding: 0 }} />
              ))}
            </div>
          </>
        );
      }
      if (node.type === "text") {
        return <textarea className="video-input" value={d.text || ""} placeholder="Write a prompt or script…" onChange={(e) => patchNode(node.id, { text: e.target.value })}
                         onPointerDown={(e) => e.stopPropagation()} style={{ minHeight: 90, fontSize: 12.5, resize: "vertical" }} />;
      }
      if (["image", "video", "audio"].includes(node.type)) {
        return (
          <>
            {d.uploading ? <div className="video-hint" style={{ margin: 0 }}>Uploading…</div> : renderMedia(node.type, d.url)}
            <div style={{ fontSize: 11.5, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {d.name || node.type}{d.duration ? ` · ${d.duration.toFixed(1)}s` : ""}
            </div>
            {d.error ? <div className="error-box" style={{ margin: 0 }}>{d.error}</div> : null}
          </>
        );
      }
      if (node.type === "tool") {
        return (
          <>
            <div className="video-hint" style={{ margin: 0 }}>Opens in a panel beside the board — close it to come back to your canvas.</div>
            <button type="button" className="btn-action" onClick={() => onOpenTool && onOpenTool(d.tool)}>Open {d.label}</button>
          </>
        );
      }
      const ins = inputsFor(node.id);
      const results = d.results || [];
      return (
        <>
          <textarea className="video-input" value={d.text || ""} onPointerDown={(e) => e.stopPropagation()}
                    placeholder={ins.prompt ? "Optional extra instructions (added to the connected prompt)" : "Type a prompt, or connect a Prompt node"}
                    onChange={(e) => patchNode(node.id, { text: e.target.value })} style={{ minHeight: 56, fontSize: 12.5, resize: "vertical" }} />
          {node.type === "gen-image" ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <select className="select-input" style={{ height: 32, padding: "0 8px", fontSize: 12 }} value={d.model}
                      onChange={(e) => patchNode(node.id, { model: e.target.value, size: imageSizesFor(e.target.value).includes(d.size) ? d.size : "2K" })}>
                <option value="pro">Seedream 5.0 Pro</option><option value="flash">Seedream 5.0 Flash</option><option value="5.5">Seedream 5.5</option>
              </select>
              <select className="select-input" style={{ height: 32, padding: "0 8px", fontSize: 12 }} value={d.size} onChange={(e) => patchNode(node.id, { size: e.target.value })}>
                {imageSizesFor(d.model).map((sz) => <option key={sz}>{sz}</option>)}
              </select>
            </div>
          ) : null}
          {node.type === "gen-video" ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <select className="select-input" style={{ height: 32, padding: "0 8px", fontSize: 12, gridColumn: "1 / -1" }} value={d.model} onChange={(e) => patchNode(node.id, { model: e.target.value })}>
                {VIDEO_MODELS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
              <select className="select-input" style={{ height: 32, padding: "0 8px", fontSize: 12 }} value={d.duration} onChange={(e) => patchNode(node.id, { duration: Number(e.target.value) })}>
                {[4, 5, 6, 8, 10, 12, 15, 20, 30].filter((n) => n <= ((VIDEO_MODELS.find((m) => m[0] === d.model) || VIDEO_MODELS[0])[2])).map((n) => <option key={n} value={n}>{n} s</option>)}
              </select>
              <select className="select-input" style={{ height: 32, padding: "0 8px", fontSize: 12 }} value={d.ratio} onChange={(e) => patchNode(node.id, { ratio: e.target.value })}>
                {["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"].map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
          ) : null}
          <button type="button" className="btn-primary" style={{ height: 36, minHeight: 36, flex: "none", fontSize: 12.5 }} disabled={!!d.running} onClick={() => runNode(node)}>
            {d.running ? (d.stage || "Working…") : "Run"}
          </button>
          {d.error ? <div className="error-box" style={{ margin: 0 }}>{d.error}</div> : null}
          {results.length ? (
            <>
              {renderMedia(kindOut, results[d.selected || 0], 130)}
              {results.length > 1 ? (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {results.map((r, i) => (
                    <button key={r} type="button" onClick={() => patchNode(node.id, { selected: i })}
                            style={{ height: 22, minWidth: 26, borderRadius: 6, border: i === (d.selected || 0) ? "1.5px solid var(--accent-2)" : "0.5px solid var(--border-2)", background: "#fff", fontSize: 11, cursor: "pointer" }}>{i + 1}</button>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}
        </>
      );
    }

    function edgePath(a, b) {
      const dx = Math.max(40, Math.abs(b.x - a.x) / 2);
      return `M${a.x} ${a.y} C${a.x + dx} ${a.y}, ${b.x - dx} ${b.y}, ${b.x} ${b.y}`;
    }

    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    const paletteItems = [
      ["Assets", [["text", "Prompt", "text"], ["note", "Note", "note"]]],
      ["Generate", [["gen-image", "Image · Seedream", "image"], ["gen-video", "Video · Seedance", "video"], ["gen-audio", "Audio · Seed Audio", "audio"]]],
    ];

    return (
      <div className="card" style={{ padding: 0, overflow: "hidden" }} tabIndex={0} onKeyDown={onKeyDown}>
        <input ref={fileRef} type="file" className="sr-only" multiple accept="image/*,video/*,audio/*" onChange={(e) => { uploadFiles(e.target.files); e.target.value = ""; }} />
        <div style={{ display: "flex", minHeight: 640, height: "calc(100vh - 140px)" }}>

          {/* Palette */}
          {paletteOpen ? <aside aria-label="Add to canvas" style={{ width: 220, flex: "none", borderRight: "0.5px solid var(--border)", padding: 14, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14, background: "var(--surface)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: -6 }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>Add to canvas</span>
              <button type="button" aria-label="Collapse panel" title="Collapse panel" onClick={togglePalette}
                      style={{ width: 28, height: 28, border: "0.5px solid var(--border-2)", borderRadius: 7, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}><Icon name="chevL" size={14} /></button>
            </div>
            <div>
              <div className="field-label">Upload</div>
              <div className="upload-zone" role="button" tabIndex="0" style={{ padding: "14px 10px" }} onClick={() => fileRef.current.click()}
                   onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileRef.current.click(); } }}>
                <div className="upload-icon" style={{ marginBottom: 6 }}><Icon name="upload" size={20} /></div>
                <p className="upload-text">{uploading ? `Uploading ${uploading}…` : "Add assets"}</p>
                <p className="upload-sub">Images · videos · audio — or drop files on the board</p>
              </div>
            </div>
            {paletteItems.map(([group, items]) => (
              <div key={group}>
                <div className="field-label">{group}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {items.map(([type, label, icon]) => (
                    <button key={type} type="button" draggable
                            onDragStart={(e) => { e.dataTransfer.setData("text/x-cc-node", JSON.stringify({ type })); e.dataTransfer.effectAllowed = "copy"; }}
                            onClick={() => addNode(type)}
                            className="btn-action" style={{ justifyContent: "flex-start", height: 36, gap: 8, color: "var(--text-primary)", cursor: "grab" }}>
                      <span style={{ color: KIND_COLOUR[(TYPES[type].outputs[0] || [])[1]] || "var(--text-secondary)" }}><Icon name={icon} /></span>{label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div>
              <div className="field-label">Other tools</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {SHORTCUT_TOOLS.map(([tool, label]) => (
                  <button key={tool} type="button" draggable
                          onDragStart={(e) => { e.dataTransfer.setData("text/x-cc-node", JSON.stringify({ type: "tool", data: { tool, label } })); e.dataTransfer.effectAllowed = "copy"; }}
                          onClick={() => addNode("tool", null, { tool, label })}
                          className="btn-action" style={{ justifyContent: "flex-start", height: 32, gap: 8, cursor: "grab" }}>
                    <Icon name="tool" size={13} />{label}
                  </button>
                ))}
              </div>
            </div>
          </aside> : null}

          {/* Board */}
          <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
            <div style={{ position: "absolute", top: 10, left: 12, right: 12, zIndex: 5, display: "flex", gap: 8, alignItems: "center", pointerEvents: "none" }}>
              {!paletteOpen ? (
                <button type="button" className="btn-action btn-inline" style={{ pointerEvents: "auto", background: "#fff", gap: 6 }} onClick={togglePalette} title="Show the upload and tools panel">
                  <Icon name="chevR" size={13} />Add
                </button>
              ) : null}
              <span className="video-hint" style={{ margin: 0, background: "rgba(255,255,255,.9)", padding: "4px 8px", borderRadius: 6 }}>
                Drag from an output dot to an input dot to connect · drag the board to pan · scroll to zoom · Delete removes the selected node
              </span>
              <span style={{ flex: 1 }} />
              <button type="button" className="btn-action btn-inline" style={{ pointerEvents: "auto", background: "#fff", gap: 6 }} onClick={autoArrange} disabled={!nodes.length} title="Line nodes up left to right by how they connect"><Icon name="arrange" size={13} />Auto-arrange</button>
              <button type="button" className="btn-action btn-inline" style={{ pointerEvents: "auto", background: "#fff", gap: 6 }} onClick={fitView}><Icon name="fit" size={13} />Fit</button>
              <div style={{ pointerEvents: "auto", display: "flex", alignItems: "center", background: "#fff", border: "0.5px solid var(--border-2)", borderRadius: 8, overflow: "hidden" }}>
                <button type="button" aria-label="Zoom out" title="Zoom out" onClick={() => zoomBy(1 / 1.2)} style={{ width: 30, height: 30, border: 0, background: "transparent", cursor: "pointer", fontSize: 16, color: "var(--text-primary)" }}>−</button>
                <button type="button" title="Reset to 100%" onClick={() => zoomBy(1 / view.zoom)} style={{ minWidth: 48, height: 30, border: 0, borderLeft: "0.5px solid var(--border)", borderRight: "0.5px solid var(--border)", background: "transparent", cursor: "pointer", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>{Math.round(view.zoom * 100)}%</button>
                <button type="button" aria-label="Zoom in" title="Zoom in" onClick={() => zoomBy(1.2)} style={{ width: 30, height: 30, border: 0, background: "transparent", cursor: "pointer", fontSize: 16, color: "var(--text-primary)" }}>+</button>
              </div>
            </div>
            {error ? <div className="error-box" style={{ position: "absolute", left: 12, top: 44, zIndex: 6, margin: 0 }} role="alert">{error}</div> : null}
            <div ref={boardRef} onPointerDown={onBoardPointerDown}
                 onDragOver={(e) => e.preventDefault()}
                 onDrop={(e) => {
                   e.preventDefault();
                   const at = toBoard(e.clientX, e.clientY);
                   const raw = e.dataTransfer.getData("text/x-cc-node");
                   if (raw) { const it = JSON.parse(raw); addNode(it.type, { x: at.x - NODE_W / 2, y: at.y - 20 }, it.data); return; }
                   if (e.dataTransfer.files && e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files, at);
                 }}
                 style={{ position: "absolute", inset: 0, overflow: "hidden", cursor: "grab", background: "#F7F7F9",
                          backgroundImage: "radial-gradient(#D9DAE0 1px, transparent 1px)", backgroundSize: `${20 * view.zoom}px ${20 * view.zoom}px`,
                          backgroundPosition: `${view.x}px ${view.y}px` }}>
              {!nodes.length ? (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                  <div style={{ textAlign: "center", color: "var(--text-secondary)", maxWidth: 360 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>Build a flow</div>
                    Drop files here or add assets, then drag tools from the left and connect them. A Prompt and an image into Video · Seedance is a good start.
                  </div>
                </div>
              ) : null}
              <div style={{ position: "absolute", left: 0, top: 0, transformOrigin: "0 0", transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` }}>
                <svg style={{ position: "absolute", left: 0, top: 0, width: 1, height: 1, overflow: "visible" }}>
                  {edges.map((e) => {
                    const a = byId[e.from.node], b = byId[e.to.node];
                    if (!a || !b) return null;
                    const ai = portsOf(a).outputs.findIndex((p) => p[0] === e.from.port);
                    const bi = portsOf(b).inputs.findIndex((p) => p[0] === e.to.port);
                    if (ai < 0 || bi < 0) return null;
                    const kind = portsOf(a).outputs[ai][1];
                    const d = edgePath(portPoint(a, "out", ai), portPoint(b, "in", bi));
                    return (
                      <g key={e.id}>
                        <path d={d} fill="none" stroke="transparent" strokeWidth="14" style={{ cursor: "pointer", pointerEvents: "stroke" }}
                              onPointerDown={(ev) => ev.stopPropagation()}
                              onClick={() => set((p) => ({ ...p, edges: p.edges.filter((x) => x.id !== e.id) }))}><title>Click to disconnect</title></path>
                        <path d={d} fill="none" stroke={KIND_COLOUR[kind]} strokeWidth="2.2" style={{ pointerEvents: "none" }} />
                      </g>
                    );
                  })}
                  {wire ? (() => {
                    const a = byId[wire.from.node];
                    return a ? <path d={edgePath(portPoint(a, "out", wire.from.index), { x: wire.x, y: wire.y })} fill="none" stroke={KIND_COLOUR[wire.from.kind]} strokeWidth="2.2" strokeDasharray="6 4" /> : null;
                  })() : null}
                </svg>

                {nodes.map((node) => {
                  const t = TYPES[node.type] || TYPES.tool;
                  const { inputs, outputs } = portsOf(node);
                  const rows = Math.max(inputs.length, outputs.length);
                  const sel = node.id === selectedId;
                  const accent = KIND_COLOUR[(outputs[0] || [])[1]] || "#64748B";
                  const title = node.type === "tool" ? (node.data && node.data.label) || "Tool" : t.title;
                  return (
                    <div key={node.id} data-node-id={node.id} onPointerDown={(e) => { e.stopPropagation(); setSelectedId(node.id); }}
                         style={{ position: "absolute", left: node.x, top: node.y, width: node.type === "note" ? ((node.data && node.data.w) || NODE_W) : NODE_W, background: node.type === "note" ? NOTE_COLOURS[(node.data && node.data.color) || "yellow"][0] : "#fff", borderRadius: 12,
                                  border: sel ? "1.5px solid var(--accent-2)" : "0.5px solid #D1D5DB",
                                  boxShadow: sel ? "0 0 0 3px rgba(124,111,227,0.15), 0 8px 24px rgba(16,24,40,.10)" : "0 2px 8px rgba(16,24,40,.06)" }}>
                      <div onPointerDown={(e) => startNodeDrag(e, node)}
                           style={{ height: HEAD_H, display: "flex", alignItems: "center", gap: 8, padding: "0 10px", borderBottom: "0.5px solid var(--border)", cursor: "move", userSelect: "none" }}>
                        <span style={{ width: 24, height: 24, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", background: `${accent}18`, color: accent }}><Icon name={t.icon} size={14} /></span>
                        <span style={{ fontWeight: 600, fontSize: 12.5, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</span>
                        <button type="button" aria-label={`Remove ${title}`} onPointerDown={(e) => e.stopPropagation()} onClick={() => removeNode(node.id)}
                                style={{ width: 24, height: 24, border: 0, background: "transparent", color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="x" size={13} /></button>
                      </div>
                      {rows ? (
                        <div style={{ position: "relative", padding: "10px 0 0", height: rows * PORT_ROW }}>
                          {inputs.map(([port, kind, label, many], i) => {
                            const count = edges.filter((e) => e.to.node === node.id && e.to.port === port).length;
                            return (
                              <div key={port} style={{ position: "absolute", left: 0, top: 10 + i * PORT_ROW, height: PORT_ROW, display: "flex", alignItems: "center", gap: 8 }}>
                                <span data-in-port={port} data-node={node.id} data-kind={kind} data-many={many ? "1" : "0"} title={`${label} (${kind}${many ? ", several" : ""})`}
                                      style={{ width: 14, height: 14, marginLeft: -7, borderRadius: "50%", background: count ? KIND_COLOUR[kind] : "#fff", border: `2px solid ${KIND_COLOUR[kind]}`, boxSizing: "border-box" }} />
                                <span style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>{label}{count ? ` · ${count}` : ""}</span>
                              </div>
                            );
                          })}
                          {outputs.map(([port, kind], i) => (
                            <div key={port} style={{ position: "absolute", right: 0, top: 10 + i * PORT_ROW, height: PORT_ROW, display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 11.5, color: "var(--text-secondary)", textTransform: "capitalize" }}>{kind}</span>
                              <span onPointerDown={(e) => startWire(e, node, i)} title={`Drag to connect this ${kind}`}
                                    style={{ width: 14, height: 14, marginRight: -7, borderRadius: "50%", background: KIND_COLOUR[kind], border: "2px solid #fff", boxShadow: `0 0 0 1.5px ${KIND_COLOUR[kind]}`, cursor: "crosshair" }} />
                            </div>
                          ))}
                        </div>
                      ) : null}
                      <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>{renderBody(node)}</div>
                      {node.type === "note" ? (
                        <span title="Drag to resize" onPointerDown={(e) => startNoteResize(e, node)}
                              style={{ position: "absolute", right: 2, bottom: 2, width: 16, height: 16, cursor: "nwse-resize",
                                       background: "linear-gradient(135deg, transparent 50%, rgba(0,0,0,.28) 50%, rgba(0,0,0,.28) 60%, transparent 60%, transparent 72%, rgba(0,0,0,.28) 72%, rgba(0,0,0,.28) 82%, transparent 82%)" }} />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  window.CanvasTool = Canvas;
})();
