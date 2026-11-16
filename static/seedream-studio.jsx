/* seedream-studio.jsx — Seedream 5.0 tools for the Content Creator app.
 *
 *   SeedreamImageTool   text-to-image / image-to-image (up to 10 references)
 *   SeedreamLayerTool   layer decomposition + per-layer editing on a canvas
 *                       (ported from Documents/seedream-layer-seperation/seedream-layer-studio)
 *   SeedreamEditTool    interactive editing with <point>/<bbox> coordinates and free-form marks
 *
 * One IIFE so nothing here collides with frontend/app.jsx's globals; the three tools and
 * their default-state helpers are the only things put on window. Each tool is
 * stateless towards the app: it renders `state` and writes through `update(fn)`,
 * so the same component backs the sidebar tool and a project tool.
 *
 * Backend: content_creator/services/seedream_studio.py (/api/seedream/*). Every
 * image is referenced as a same-origin /files/ URL (uploads and results are saved
 * server-side), so canvases can read pixels and projects survive ModelArk's 24 h
 * URL expiry. Styles: static/seedream-studio.css, every class prefixed "sd-".
 */
(function () {
  "use strict";

  var useState = React.useState;
  var useEffect = React.useEffect;
  var useRef = React.useRef;
  var useMemo = React.useMemo;

  // =========================================================== shared constants
  var MODELS = [
    { id: "pro", label: "Seedream 5.0 pro", hint: "Best quality" },
    { id: "flash", label: "Seedream 5.0 flash", hint: "Faster, cheaper" },
    { id: "5.5", label: "Seedream 5.5", hint: "Most realistic, transparent output" },
  ];
  var SIZE_TIERS = ["1K", "1.5K", "2K"];
  var ASPECTS = ["auto", "1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3", "21:9"];
  var MAX_INPUT_IMAGES = 14;  // Seedream 5.0 takes up to 14 reference images
  var MAX_REFERENCE_IMAGES = 6;   // per layer edit: the layer itself + up to 6
  var MIN_CUSTOM_PIXELS = 921600;
  var MAX_CUSTOM_PIXELS = 4624220;

  function uid() { return Math.random().toString(36).slice(2, 10); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function modelLabel(id) { var m = MODELS.filter(function (x) { return x.id === id; })[0]; return m ? m.label : id; }

  // ================================================================== API log
  // Every call any of the three tools makes, newest first, shared by all of them.
  var ApiLog = (function () {
    var entries = [];
    var listeners = [];
    var nextId = 1;
    function emit() { listeners.forEach(function (fn) { fn(entries.slice()); }); }
    return {
      subscribe: function (fn) {
        listeners.push(fn);
        fn(entries.slice());
        return function () { listeners = listeners.filter(function (l) { return l !== fn; }); };
      },
      start: function (label, detail, request) {
        var entry = { id: nextId++, label: label, detail: detail || null,
                      request: request ? redactPayload(request) : null,
                      status: "pending", startedAt: Date.now() };
        entries = [entry].concat(entries).slice(0, 40);
        emit();
        return entry.id;
      },
      finish: function (id, ok, result, response) {
        entries = entries.map(function (e) {
          if (e.id !== id) return e;
          return Object.assign({}, e, { status: ok ? "ok" : "error", result: result,
            response: response === undefined ? e.response : response, ms: Date.now() - e.startedAt });
        });
        emit();
      },
      clear: function () { entries = []; emit(); },
    };
  })();

  /* A payload with base64 image data collapsed, so the log stays readable and small. */
  function redactPayload(value, depth) {
    depth = depth || 0;
    if (depth > 6) return "…";
    if (Array.isArray(value)) return value.map(function (v) { return redactPayload(v, depth + 1); });
    if (value && typeof value === "object") {
      var out = {};
      Object.keys(value).forEach(function (k) { out[k] = redactPayload(value[k], depth + 1); });
      return out;
    }
    if (typeof value === "string" && value.indexOf("data:") === 0) {
      var comma = value.indexOf(",");
      return (comma > 0 ? value.slice(0, comma + 1) : "data:") + "…[" + Math.round(value.length / 1024) + " KB base64]";
    }
    return value;
  }

  // ================================================================ ARK client
  async function seedreamGenerate(body, label, detail) {
    var logId = ApiLog.start(label, detail, body);
    var resp;
    try {
      resp = await fetch("/api/seedream/generate", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
    } catch (err) {
      ApiLog.finish(logId, false, "server unreachable", { error: String(err && err.message || err) });
      throw new Error("Could not reach the app server.");
    }
    var data = await resp.json().catch(function () { return null; });
    if (!resp.ok || !data || data.error) {
      var message = (data && data.error && (data.error.message || data.error)) || ("HTTP " + resp.status);
      ApiLog.finish(logId, false, message, data || { status: resp.status });
      throw new Error(String(message));
    }
    var count = (data.data || []).length;
    ApiLog.finish(logId, true, count + (count === 1 ? " image" : " images") +
      (data.usage && data.usage.total_tokens ? " · " + data.usage.total_tokens.toLocaleString() + " tokens" : ""), data);
    return data;
  }

  /* The permanent same-origin copy the server saved; the ModelArk URL only as a fallback. */
  function itemUrl(item) { return (item && (item.local_url || item.url)) || ""; }

  async function saveImage(dataUrl, hint) {
    var resp = await fetch("/api/seedream/save-image", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data_url: dataUrl, hint: hint || "upload" }),
    });
    var data = await resp.json().catch(function () { return {}; });
    if (!resp.ok) throw new Error((data.error && data.error.message) || ("Upload failed (HTTP " + resp.status + ")"));
    return data.url;
  }

  // ============================================================ image helpers
  function readFileAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(new Error("could not read " + file.name)); };
      reader.readAsDataURL(file);
    });
  }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error("could not decode image")); };
      img.src = src;
    });
  }

  function canvasToObjectUrl(canvas) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (blob) resolve(URL.createObjectURL(blob));
        else reject(new Error("could not encode the image"));
      }, "image/png");
    });
  }

  async function blobUrlToDataUrl(url) {
    var blob = await (await fetch(url)).blob();
    return await new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(reader.error); };
      reader.readAsDataURL(blob);
    });
  }

  /* True when a decoded image carries at least one non-opaque pixel. */
  async function hasTransparency(url) {
    var img = await loadImage(url);
    var side = Math.min(96, Math.max(img.naturalWidth, img.naturalHeight));
    var scale = side / Math.max(img.naturalWidth, img.naturalHeight);
    var canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    var data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (var i = 3; i < data.length; i += 4) if (data[i] < 250) return true;
    return false;
  }

  /* Upload an image file: resize into the API's limits, keep PNG (and its alpha)
   * when the file may carry transparency, otherwise JPEG. Saved server-side, so
   * the returned url is a /files/ path the backend sends as a data URI. */
  async function uploadImageFile(file, opts) {
    opts = opts || {};
    var maxSide = opts.maxSide || 4096;
    var img = await loadImage(await readFileAsDataUrl(file));
    var w = img.naturalWidth, h = img.naturalHeight;
    var warning = "";
    if (opts.minPixels && w * h < opts.minPixels) {
      warning = w + "×" + h + " is below the " + Math.round(Math.sqrt(opts.minPixels)) + "² minimum for this tool; the request may be rejected.";
    }
    var aspect = w / h;
    if (aspect > 16 || aspect < 1 / 16) warning = "Aspect ratio " + aspect.toFixed(2) + " is outside the allowed 1:16–16:1 range.";
    var scale = Math.min(1, maxSide / Math.max(w, h), Math.sqrt(36000000 / (w * h)));
    var outW = Math.max(1, Math.round(w * scale)), outH = Math.max(1, Math.round(h * scale));
    var canvas = document.createElement("canvas");
    canvas.width = outW; canvas.height = outH;
    var ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, outW, outH);
    var maybeAlpha = /png|webp|gif/i.test(file.type);
    var png = maybeAlpha && !opts.forceJpeg;
    var dataUrl = png ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.92);
    var url = await saveImage(dataUrl, opts.hint || "upload");
    var alpha = png ? await hasTransparency(dataUrl) : false;
    return { id: uid(), url: url, name: file.name, width: outW, height: outH, hasAlpha: alpha, warning: warning };
  }

  /* Saves as "<project>-<model>.<ext>" (window.ccDownload / ccDownloadName in frontend/index.html). */
  function triggerDownload(blobOrUrl, model, ext) {
    if (typeof blobOrUrl === "string") { window.ccDownload(blobOrUrl, model, ext); return; }
    var url = URL.createObjectURL(blobOrUrl);
    var link = document.createElement("a");
    link.href = url; link.download = window.ccDownloadName(model, "", ext);
    link.setAttribute("data-cc-raw", "1");
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
  }
  function modelLabel(id) { var m = MODELS.find(function (x) { return x.id === id; }); return m ? m.label : "Seedream"; }

  function extOf(url) { return /\.jpe?g(\?|$)/i.test(url || "") ? "jpg" : "png"; }

  /* Run `worker` over every item, at most `limit` in flight. */
  async function runPool(items, limit, worker) {
    var next = 0;
    var size = Math.max(1, Math.min(limit || 1, items.length));
    async function drain() {
      while (next < items.length) {
        var index = next++;
        try { await worker(items[index], index); } catch (err) { /* worker records its own error */ }
      }
    }
    var runners = [];
    for (var i = 0; i < size; i++) runners.push(drain());
    await Promise.all(runners);
  }

  // ========================================================= cross-tool handoff
  // "Send to …" buttons park an image here and ask the app to open the target
  // tool; the target picks it up on mount (or immediately, if already open).
  var pendingHandoff = {};
  function sendToTool(tool, payload) {
    pendingHandoff[tool] = (pendingHandoff[tool] || []).concat([payload]);
    window.dispatchEvent(new CustomEvent("seedream-open", { detail: { tool: tool } }));
    window.dispatchEvent(new CustomEvent("seedream-handoff", { detail: { tool: tool } }));
  }
  function useHandoff(tool, onItems) {
    var ref = useRef(onItems);
    ref.current = onItems;
    useEffect(function () {
      function take() {
        var items = pendingHandoff[tool];
        if (items && items.length) { pendingHandoff[tool] = []; ref.current(items); }
      }
      take();
      function onEvent(e) { if (e.detail && e.detail.tool === tool) take(); }
      window.addEventListener("seedream-handoff", onEvent);
      return function () { window.removeEventListener("seedream-handoff", onEvent); };
    }, [tool]);
  }

  // ============================================================ shared UI bits
  function SectionTitle(props) {
    return (
      <div className="sd-section-title">
        {props.num ? <span className="sd-section-num">{props.num}</span> : null}
        <h2>{props.children}</h2>
        {props.aside ? <span className="sd-section-aside">{props.aside}</span> : null}
      </div>
    );
  }

  function Select(props) {
    return (
      <label className="sd-setting">
        <span className="sd-setting-label">{props.label}{props.hint ? <em>{props.hint}</em> : null}</span>
        <select value={props.value} disabled={props.disabled} onChange={function (e) { props.onChange(e.target.value); }}>
          {props.options.map(function (o) {
            var value = typeof o === "string" ? o : o.value;
            var text = typeof o === "string" ? o : o.label;
            return <option key={value} value={value}>{text}</option>;
          })}
        </select>
      </label>
    );
  }

  function Check(props) {
    return (
      <label className={"sd-check" + (props.disabled ? " is-disabled" : "")} title={props.title || ""}>
        <input type="checkbox" checked={!!props.checked} disabled={props.disabled}
               onChange={function () { props.onChange(!props.checked); }} />
        <span>{props.label}</span>
      </label>
    );
  }

  /* Model / size / format / speed controls shared by the generate and edit tools. */
  function OutputSettings(props) {
    var s = props.settings;
    var set = props.onChange;
    return (
      <div className="sd-settings-grid">
        <Select label="Model" value={s.model} onChange={function (v) { set({ model: v, fastMode: v === "pro" ? s.fastMode : false }); }}
                options={MODELS.map(function (m) { return { value: m.id, label: m.label + " — " + m.hint }; })} />
        <Select label="Resolution" value={s.size} onChange={function (v) { set({ size: v }); }}
                hint="1.5K costs the same as 1K" options={SIZE_TIERS} />
        {props.onAspect ? (
          <Select label="Aspect ratio" value={props.aspect} onChange={props.onAspect}
                  options={ASPECTS.map(function (a) { return { value: a, label: a === "auto" ? "From prompt" : a }; })} />
        ) : null}
        <Select label="Format" value={s.outputFormat} disabled={props.forcePng || (s.model === "5.5" && s.background === "transparent")}
                onChange={function (v) { set({ outputFormat: v }); }} options={["png", "jpeg"]} />
        {s.model === "5.5" ? (
          <Select label="Background" value={s.background || "auto"} hint="Seedream 5.5 — transparent needs PNG"
                  onChange={function (v) { set(v === "transparent" ? { background: v, outputFormat: "png" } : { background: v }); }}
                  options={[{ value: "auto", label: "Auto" }, { value: "transparent", label: "Transparent" }, { value: "opaque", label: "Opaque" }]} />
        ) : null}
        <div className="sd-checks">
          <Check label="Fast mode" disabled={s.model !== "pro"} checked={s.model === "pro" && s.fastMode}
                 title="Faster prompt optimization — Seedream 5.0 pro only"
                 onChange={function (v) { set({ fastMode: v }); }} />
          <Check label="AI watermark" checked={s.watermark} onChange={function (v) { set({ watermark: v }); }} />
        </div>
      </div>
    );
  }

  // Seedream 5.5 only: native RGBA output for text-to-image and image-to-image.
  function addBackground(body, s) {
    if (s.model === "5.5" && s.background && s.background !== "auto") body.background = s.background;
    return body;
  }

  function optimizeOptions(s) {
    return { mode: s.model === "pro" && s.fastMode ? "fast" : "standard" };
  }

  function JsonBlock(props) {
    var text = useMemo(function () {
      try { return JSON.stringify(props.value, null, 2); } catch (err) { return String(props.value); }
    }, [props.value]);
    return (
      <div className="sd-json-block">
        <div className="sd-json-head"><span>{props.label}</span>
          <button onClick={function () { navigator.clipboard.writeText(text).catch(function () {}); }}>copy</button>
        </div>
        <pre>{text}</pre>
      </div>
    );
  }

  function ApiLogRow(props) {
    var entry = props.entry;
    var openState = useState(false);
    return (
      <div className={"sd-apilog-row is-" + entry.status}>
        <button className="sd-apilog-line" onClick={function () { openState[1](!openState[0]); }}>
          <span className="sd-apilog-caret">{openState[0] ? "▾" : "▸"}</span>
          <strong>{entry.label}</strong>
          <span>{entry.status === "pending" ? "running…" : ((entry.ms || 0) / 1000).toFixed(1) + "s"}</span>
        </button>
        {entry.detail ? <div className="sd-apilog-detail">{entry.detail}</div> : null}
        {entry.result ? <div className="sd-apilog-detail">{String(entry.result)}</div> : null}
        {openState[0] ? (
          <div className="sd-apilog-raw">
            <div className="sd-apilog-endpoint">POST /api/seedream/generate → ModelArk /images/generations</div>
            {entry.request ? <JsonBlock label="Request" value={entry.request} /> : null}
            {entry.response ? <JsonBlock label="Response" value={entry.response} /> : null}
          </div>
        ) : null}
      </div>
    );
  }

  function ApiLogPanel() {
    var entriesState = useState([]);
    var openState = useState(false);
    useEffect(function () { return ApiLog.subscribe(entriesState[1]); }, []);
    var entries = entriesState[0];
    var pending = entries.filter(function (e) { return e.status === "pending"; }).length;
    return (
      <div className={"sd-apilog" + (openState[0] ? " is-open" : "")}>
        <div className="sd-apilog-bar">
          <button className="sd-apilog-toggle" onClick={function () { openState[1](!openState[0]); }}>
            <span className={pending ? "sd-dot sd-dot-live" : "sd-dot"} />
            API activity <span className="sd-apilog-count">{entries.length}</span>
          </button>
          {openState[0] && entries.length ? (
            <button className="sd-apilog-icon" title="Clear the log" onClick={function () { ApiLog.clear(); }}>Clear</button>
          ) : null}
        </div>
        {openState[0] ? (
          <div className="sd-apilog-body">
            {entries.length === 0 ? <p className="sd-notice">No calls yet.</p>
              : entries.map(function (e) { return <ApiLogRow key={e.id} entry={e} />; })}
          </div>
        ) : null}
      </div>
    );
  }

  function Dropzone(props) {
    var inputRef = useRef(null);
    var dragState = useState(false);
    function take(list) {
      var files = Array.prototype.slice.call(list || []).filter(function (f) { return /^image\//.test(f.type); });
      if (files.length) props.onFiles(props.multiple ? files : [files[0]]);
    }
    return (
      <div className={"sd-dropzone" + (dragState[0] ? " is-dragging" : "") + (props.compact ? " is-compact" : "")}
           onClick={function () { inputRef.current.click(); }}
           onDragOver={function (e) { e.preventDefault(); dragState[1](true); }}
           onDragLeave={function () { dragState[1](false); }}
           onDrop={function (e) { e.preventDefault(); dragState[1](false); take(e.dataTransfer.files); }}>
        {props.children || (
          <React.Fragment>
            <div className="sd-dropzone-mark">＋</div>
            <strong>{props.title || "Upload an image"}</strong>
            <span>{props.subtitle || "PNG, JPG or WEBP · drop it here or click"}</span>
          </React.Fragment>
        )}
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple={!!props.multiple} hidden
               onChange={function (e) { take(e.target.files); e.target.value = ""; }} />
      </div>
    );
  }

  /* Download / continue-in-another-tool actions for any finished image. */
  function ImageActions(props) {
    var url = props.url;
    var name = props.name || "seedream";
    var except = props.except || "";
    return (
      <div className="sd-image-actions">
        <button className="sd-btn sd-btn-ghost sd-btn-small"
                onClick={function () { triggerDownload(url, modelLabel(props.model), extOf(url)); }}>Download</button>
        {except !== "image" ? <button className="sd-btn sd-btn-ghost sd-btn-small" title="Use as a reference image in Seedream Image Generation"
                onClick={function () { sendToTool("image", { url: url, name: name }); }}>Use as reference</button> : null}
        {except !== "edit" ? <button className="sd-btn sd-btn-ghost sd-btn-small" title="Open in Seedream Interactive Edit"
                onClick={function () { sendToTool("edit", { url: url, name: name }); }}>Interactive edit</button> : null}
        {except !== "layers" ? <button className="sd-btn sd-btn-ghost sd-btn-small" title="Split into layers in Seedream Layer Separation"
                onClick={function () { sendToTool("layers", { url: url, name: name }); }}>Separate layers</button> : null}
        {props.extra}
      </div>
    );
  }

  function Elapsed(props) {
    var nowState = useState(Date.now());
    useEffect(function () {
      var t = setInterval(function () { nowState[1](Date.now()); }, 1000);
      return function () { clearInterval(t); };
    }, []);
    return <span>{Math.round((nowState[0] - props.since) / 1000)}s</span>;
  }

  // Generation calls outlive the component that started them (switching tools
  // mid-call is normal), so in-flight ids live here and results go through the
  // `update` captured when the call started.
  var inFlight = {};

  // =====================================================================
  // 1. IMAGE GENERATION
  // =====================================================================
  function defaultImageState() {
    return {
      settings: { model: "pro", size: "2K", outputFormat: "png", fastMode: false, watermark: false },
      prompt: "",
      aspect: "auto",
      refs: [],
      results: [],
    };
  }

  // The composer fields one parallel panel owns. The first panel's live at the top
  // of the tool state (as before); extra panels live in extraPanels[].
  function panelFields(src, settingsDefault) {
    return {
      settings: Object.assign({}, defaultImageState().settings, settingsDefault || {}, (src && src.settings) || {}),
      prompt: (src && src.prompt) || "",
      aspect: (src && src.aspect) || "auto",
      refs: (src && src.refs) || [],
    };
  }

  function panelPrompt(p) {
    var text = (p.prompt || "").trim();
    if (p.aspect !== "auto") text += (text ? " " : "") + "Aspect ratio " + p.aspect + ".";
    return text;
  }

  /* One prompt + references + settings column. Several run side by side. */
  function ImageComposer(props) {
    var p = props.panel;
    var set = props.onChange;
    var errState = useState("");
    var uploadingState = useState(false);

    async function addRefs(files) {
      errState[1]("");
      uploadingState[1](true);
      try {
        var room = MAX_INPUT_IMAGES - p.refs.length;
        var added = [];
        for (var i = 0; i < Math.min(room, files.length); i++) {
          added.push(await uploadImageFile(files[i], { maxSide: 2048, hint: "ref" }));
        }
        set(function (prev) { return { refs: (prev.refs || []).concat(added).slice(0, MAX_INPUT_IMAGES) }; });
        if (files.length > room) errState[1]("At most " + MAX_INPUT_IMAGES + " reference images.");
      } catch (err) {
        errState[1](err.message);
      } finally {
        uploadingState[1](false);
      }
    }

    return (
      <div className="sd-image-compose">
        <SectionTitle num="01">Prompt</SectionTitle>
        <textarea className="sd-field" rows={6} value={p.prompt}
                  placeholder="Describe the image. Seedream 5.0 renders text in 15 languages natively — put exact wording in quotes."
                  onChange={function (e) { set({ prompt: e.target.value }); }} />

        <SectionTitle num="02" aside={p.refs.length + " / " + MAX_INPUT_IMAGES}>Reference images</SectionTitle>
        <div className="sd-ref-tiles">
          {p.refs.length < MAX_INPUT_IMAGES ? (
            <Dropzone multiple onFiles={addRefs}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="m3 16 5-5 4 4 5-6 4 5"></path></svg>
              <strong>{uploadingState[0] ? "Uploading…" : "Add images"}</strong>
              <span>{p.refs.length ? p.refs.length + " of " + MAX_INPUT_IMAGES : "0–" + MAX_INPUT_IMAGES}</span>
            </Dropzone>
          ) : null}
          {p.refs.map(function (r, i) {
            return (
              <div className="sd-ref-tile" key={r.id} title={r.name}>
                <img src={r.url} alt="" />
                <span className="sd-ref-num">{i + 1}</span>
                <button title="Remove" aria-label={"Remove reference " + (i + 1)} onClick={function () { set(function (prev) { return { refs: prev.refs.filter(function (x) { return x.id !== r.id; }) }; }); }}>×</button>
              </div>
            );
          })}
        </div>
        <p className="sd-help">Optional. With references this is image-to-image: refer to them as “Image 1”, “Image 2”… in the prompt.</p>

        <SectionTitle num="03">Model and output</SectionTitle>
        <OutputSettings settings={p.settings} aspect={p.aspect} onAspect={function (v) { set({ aspect: v }); }}
                        onChange={function (patch) { set(function (prev) { return { settings: Object.assign({}, prev.settings, patch) }; }); }} />
        {errState[0] ? <p className="sd-notice sd-notice-error">{errState[0]}</p> : null}
        <button className="sd-btn sd-btn-primary" disabled={!panelPrompt(p)}
                onClick={props.onGenerate}>{props.running ? "Generate another" : "Generate image"}</button>
      </div>
    );
  }

  var MAX_IMAGE_PANELS = 6;

  function ImageTool(props) {
    var s = Object.assign(defaultImageState(), props.state || {});
    s.settings = Object.assign(defaultImageState().settings, s.settings || {});
    var extraPanels = s.extraPanels || [];
    var update = props.update;
    function set(patch) {
      update(function (prev) {
        var base = Object.assign(defaultImageState(), prev || {});
        return Object.assign({}, base, typeof patch === "function" ? patch(base) : patch);
      });
    }
    // Patches one panel: "main" is the top-level fields, else an extraPanels[] entry.
    function setPanel(panelId, patch) {
      set(function (prev) {
        if (panelId === "main") return typeof patch === "function" ? patch(prev) : patch;
        return { extraPanels: (prev.extraPanels || []).map(function (x) {
          if (x.id !== panelId) return x;
          var cur = panelFields(x);
          return Object.assign({}, x, typeof patch === "function" ? patch(cur) : patch);
        }) };
      });
    }
    function addPanel() {
      // A new panel starts empty but keeps the first panel's model and output settings.
      set(function (prev) {
        var list = prev.extraPanels || [];
        if (list.length + 1 >= MAX_IMAGE_PANELS) return {};
        return { extraPanels: list.concat([Object.assign({ id: uid() }, panelFields(null, prev.settings))]) };
      });
    }
    function removePanel(panelId) {
      set(function (prev) { return { extraPanels: (prev.extraPanels || []).filter(function (x) { return x.id !== panelId; }) }; });
    }

    useHandoff("image", function (items) {
      set(function (prev) {
        var refs = (prev.refs || []).concat(items.map(function (it) {
          return { id: uid(), url: it.url, name: it.name || "image", hasAlpha: /\.png/i.test(it.url) };
        }));
        return { refs: refs.slice(0, MAX_INPUT_IMAGES) };
      });
    });

    var panels = [Object.assign({ id: "main" }, panelFields(s))].concat(extraPanels.map(function (x) {
      return Object.assign({ id: x.id }, panelFields(x));
    }));
    function panelRunning(panelId) {
      return s.results.some(function (r) { return r.status === "running" && inFlight[r.id] && (r.panelId || "main") === panelId; });
    }
    var readyPanels = panels.filter(function (p) { return panelPrompt(p); });

    async function generate(panel) {
      var prompt = panelPrompt(panel);
      if (!prompt) return;
      var id = uid();
      var write = update;
      var settings = panel.settings;
      var body = {
        model: settings.model,
        prompt: prompt,
        size: settings.size,
        output_format: settings.outputFormat,
        watermark: !!settings.watermark,
        optimize_prompt_options: optimizeOptions(settings),
      };
      addBackground(body, settings);
      if (panel.refs.length) body.image = panel.refs.map(function (r) { return r.url; });
      var entry = { id: id, status: "running", prompt: prompt, model: settings.model, size: body.size,
                    refCount: panel.refs.length, panelId: panel.id, createdAt: Date.now(), images: [] };
      inFlight[id] = true;
      function patchResult(p) {
        write(function (prev) {
          var base = Object.assign(defaultImageState(), prev || {});
          return Object.assign({}, base, { results: base.results.map(function (r) { return r.id === id ? Object.assign({}, r, p) : r; }) });
        });
      }
      write(function (prev) {
        var base = Object.assign(defaultImageState(), prev || {});
        return Object.assign({}, base, { results: [entry].concat(base.results) });
      });
      try {
        var data = await seedreamGenerate(body, "Generate · " + modelLabel(settings.model),
          prompt.slice(0, 120) + (panel.refs.length ? " · " + panel.refs.length + " reference(s)" : ""));
        var images = (data.data || []).map(function (it) {
          return { url: itemUrl(it), size: it.size || "", saved: !!it.local_url };
        }).filter(function (x) { return x.url; });
        if (!images.length) throw new Error("The response contained no image.");
        patchResult({ status: "done", images: images });
      } catch (err) {
        patchResult({ status: "error", error: err.message });
      } finally {
        delete inFlight[id];
      }
    }

    function panelTitle(index) { return panels.length > 1 ? "Generation " + (index + 1) : "Generation"; }

    // Results belong to the panel that made them; results from a removed panel stay with the first one.
    var panelIds = panels.map(function (p) { return p.id; });
    function resultsFor(panelId) {
      return s.results.filter(function (r) {
        var owner = panelIds.indexOf(r.panelId || "main") >= 0 ? (r.panelId || "main") : "main";
        return owner === panelId;
      });
    }
    function removeResult(id) {
      set(function (prev) { return { results: prev.results.filter(function (x) { return x.id !== id; }) }; });
    }

    function renderResult(r, panel) {
      var live = r.status === "running" && inFlight[r.id];
      return (
        <div className="sd-result" key={r.id}>
          <div className="sd-result-head">
            <strong>{modelLabel(r.model)}</strong>
            <span>{r.size}{r.refCount ? " · " + r.refCount + " ref" : ""}</span>
            <span className="sd-result-status">
              {live ? <React.Fragment>Generating… <Elapsed since={r.createdAt} /></React.Fragment>
                : r.status === "running" ? "Interrupted" : r.status === "error" ? "Failed" : ""}
            </span>
            {!live ? <button className="sd-x" title="Remove" onClick={function () { removeResult(r.id); }}>×</button> : null}
          </div>
          <p className="sd-result-prompt">{r.prompt}</p>
          {r.status === "error" ? <p className="sd-notice sd-notice-error">{r.error}</p> : null}
          {live ? <div className="sd-result-placeholder"><span className="sd-spinner" /></div> : null}
          {(r.images || []).map(function (im, i) {
            return (
              <div key={i} className="sd-result-image">
                <a href={im.url} onClick={function (e) { e.preventDefault(); if (window.openImageViewer) window.openImageViewer(im.url); }} style={{ cursor: "zoom-in" }} className="sd-checker"><img src={im.url} alt="" /></a>
                <ImageActions url={im.url} model={r.model} name={"seedream-" + r.id + "-" + (i + 1)} except="none"
                  extra={<button className="sd-btn sd-btn-ghost sd-btn-small" onClick={function () {
                    setPanel(panel.id, { prompt: r.prompt.replace(/ ?Aspect ratio [0-9:]+\.$/, "") });
                  }}>Reuse prompt</button>} />
              </div>
            );
          })}
        </div>
      );
    }

    var canAdd = panels.length < MAX_IMAGE_PANELS;
    var plusIcon = (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14"></path><path d="M5 12h14"></path>
      </svg>
    );
    var closeIcon = (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6 6 18"></path><path d="M6 6l12 12"></path>
      </svg>
    );

    return (
      <div className="sd-root sd-tool">
        <div className="sd-image-cards">
          {panels.map(function (p, i) {
            var title = panelTitle(i);
            var running = panelRunning(p.id);
            var results = resultsFor(p.id);
            return (
              <section className="sd-panel sd-image-card" key={p.id}>
                <div className="sd-image-card-head">
                  <strong>{title}</strong>
                  {running ? <span className="sd-muted">generating…</span> : null}
                  <div className="sd-image-card-actions">
                    {canAdd ? (
                      <button className="btn-icon" title="Add another generation — each one runs in parallel"
                              aria-label="Add a generation" onClick={addPanel}>{plusIcon}</button>
                    ) : null}
                    {p.id !== "main" ? (
                      <button className="btn-icon" title="Remove this generation" aria-label={"Remove " + title}
                              onClick={function () { removePanel(p.id); }}>{closeIcon}</button>
                    ) : null}
                  </div>
                </div>
                <div className="sd-image-card-body">
                  <ImageComposer panel={p} running={running}
                                 onChange={function (patch) { setPanel(p.id, patch); }}
                                 onGenerate={function () { generate(p); }} />
                  <div className="sd-image-card-results">
                    <SectionTitle num="04" aside={results.length ? String(results.length) : null}>Results</SectionTitle>
                    {results.length === 0 ? (
                      <div className="sd-image-card-empty">Generated images appear here.</div>
                    ) : (
                      <div className="sd-results">{results.map(function (r) { return renderResult(r, p); })}</div>
                    )}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
        <div className="sd-image-panels-foot">
          {panels.length > 1 ? (
            <button className="sd-btn sd-btn-primary" disabled={!readyPanels.length}
                    onClick={function () { readyPanels.forEach(function (p) { generate(p); }); }}>
              {"Generate all (" + readyPanels.length + ")"}
            </button>
          ) : null}
          <p className="sd-help">Typical time: flash ≈ 10–20 s, pro ≈ 30–60 s. Use ＋ to add generations that run in parallel. Results are saved to <code>outputs/</code>.</p>
        </div>
      </div>
    );
  }

  // =====================================================================
  // 2. LAYER SEPARATION — port of Seedream Layer Studio
  // =====================================================================

  // ---- prompts (prompts/*.txt in the reference) ----
  var PROMPT_DECOMPOSE = "{instruction}\n\nSeparate the image into clean, independently editable layers. Each layer must\ncontain exactly one element with everything behind it removed and a fully\ntransparent background. Do not duplicate an element across two layers.";
  var PROMPT_LAYER_EDIT_NATIVE = "{instruction}\n\nThis image is a single isolated layer cut out of a larger composition. Keep the\nobject's overall shape, framing and proportions identical, and keep the\nbackground fully transparent. Do not add text, borders or watermarks.";
  var PROMPT_LAYER_EDIT_NATIVE_REFS = "{instruction}\n\nThe FIRST image is the layer to edit — a single object isolated from a larger\ncomposition, on a transparent background. The images that follow are references:\nuse them only for the appearance, style, colour or detail they demonstrate, and\nnever copy their framing or background.\n\nKeep the edited object's overall shape, framing and proportions identical to the\nfirst image, and keep the background fully transparent. Do not add text, borders\nor watermarks.";
  var PROMPT_LAYER_EDIT = "{instruction}\n\nThis image is a single isolated layer cut out of a larger composition. Keep the\nobject's overall shape, framing and proportions identical.\n\nEverything around the object is a flat {keycolour} background. That colour is a\nplaceholder standing in for transparency, never part of the design: leave it\nexactly as it is — one flat, unshaded {keycolour}, covering every pixel outside\nthe object, with no gradient, shadow, texture or reflection on it. Do not use\n{keycolour} anywhere in the object itself, and do not add text, borders or\nwatermarks.";
  var PROMPT_LAYER_EDIT_REFS = "{instruction}\n\nThe FIRST image is the layer to edit — a single object isolated from a larger\ncomposition. The images that follow are references: use them only for the\nappearance, style, colour or detail they demonstrate, and never copy their\nframing or background.\n\nKeep the edited object's overall shape, framing and proportions identical to the\nfirst image.\n\nEverything around the object in the first image is a flat {keycolour}\nbackground. That colour is a placeholder standing in for transparency, never\npart of the design: leave it exactly as it is — one flat, unshaded {keycolour},\ncovering every pixel outside the object, with no gradient, shadow, texture or\nreflection on it. Do not use {keycolour} anywhere in the object itself, and do\nnot add text, borders or watermarks.";

  function fillTemplate(template, values) {
    return template.replace(/\{(\w+)\}/g, function (m, key) {
      return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : m;
    }).trim();
  }

  // ---- chroma backing & alpha repair (verbatim logic from the reference lib.jsx) ----
  // Used when a layer edit carries reference images: transparent-background mode
  // accepts exactly one input image, so the layer goes out on a flat key colour
  // and the alpha is rebuilt in the browser from what comes back.
  var KEY_COLOURS = [
    { name: "magenta", r: 255, g: 0, b: 255 }, { name: "green", r: 0, g: 255, b: 0 },
    { name: "blue", r: 0, g: 0, b: 255 }, { name: "cyan", r: 0, g: 255, b: 255 },
    { name: "yellow", r: 255, g: 255, b: 0 }, { name: "red", r: 255, g: 0, b: 0 },
  ];
  var KEY_COLOUR_DRIFT = 90;
  var DEFAULT_TOLERANCE = 40;
  var MAX_TOLERANCE = 120;

  function keyedTolerance(keyColour) {
    var wanted = Math.round(((keyColour && keyColour.headroom) || 0) * 0.18 / 2) * 2;
    return clamp(wanted, DEFAULT_TOLERANCE, MAX_TOLERANCE);
  }

  var COLOUR_WORDS = {
    pink: [255, 105, 180], magenta: [255, 0, 255], fuchsia: [255, 0, 255], rose: [244, 130, 140],
    red: [220, 40, 40], crimson: [190, 30, 60], orange: [255, 140, 30], amber: [255, 180, 40],
    yellow: [250, 220, 60], gold: [212, 175, 55], golden: [212, 175, 55], brass: [200, 165, 90],
    green: [40, 180, 80], emerald: [30, 160, 110], lime: [160, 220, 60], teal: [30, 150, 150],
    cyan: [40, 210, 220], turquoise: [50, 200, 190], blue: [40, 90, 220], navy: [25, 40, 90],
    indigo: [70, 60, 180], purple: [140, 60, 190], violet: [150, 80, 220], lavender: [200, 180, 240],
    brown: [120, 80, 50], tan: [200, 170, 130], beige: [225, 210, 185], cream: [245, 238, 220],
    ivory: [250, 245, 232], white: [250, 250, 250], silver: [200, 200, 205], grey: [140, 140, 140],
    gray: [140, 140, 140], black: [25, 25, 25], charcoal: [55, 55, 60], bronze: [160, 110, 60],
    copper: [190, 115, 70], marble: [242, 242, 240],
  };

  function instructionColours(instruction) {
    var found = [];
    (String(instruction || "").toLowerCase().match(/[a-z]+/g) || []).forEach(function (word) {
      var rgb = COLOUR_WORDS[word];
      if (rgb && found.indexOf(rgb) === -1) found.push(rgb);
    });
    return found;
  }

  async function chooseKeyColour(url, instruction) {
    var img = await loadImage(url);
    var scale = Math.min(1, 128 / Math.max(img.naturalWidth, img.naturalHeight));
    var w = Math.max(1, Math.round(img.naturalWidth * scale));
    var h = Math.max(1, Math.round(img.naturalHeight * scale));
    var canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);
    var px = ctx.getImageData(0, 0, w, h).data;
    var solid = 0;
    for (var s = 0; s < w * h; s++) if (px[s * 4 + 3] >= 200) solid++;
    var floorAlpha = solid > 0 ? 200 : 24;
    var asked = instructionColours(instruction);
    var best = KEY_COLOURS[0], bestScore = -1;
    KEY_COLOURS.forEach(function (c) {
      var buckets = new Int32Array(129), counted = 0;
      for (var i = 0; i < w * h; i++) {
        var o = i * 4;
        if (px[o + 3] < floorAlpha) continue;
        var dr = px[o] - c.r, dg = px[o + 1] - c.g, db = px[o + 2] - c.b;
        var step = Math.round(Math.sqrt(dr * dr + dg * dg + db * db) / 4);
        buckets[step > 128 ? 128 : step]++;
        counted++;
      }
      if (!counted) return;
      var ignorable = Math.floor(counted * 0.005), seen = 0, score = 512;
      for (var b = 0; b < buckets.length; b++) { seen += buckets[b]; if (seen > ignorable) { score = b * 4; break; } }
      asked.forEach(function (rgb) {
        var ar = rgb[0] - c.r, ag = rgb[1] - c.g, ab = rgb[2] - c.b;
        var away = Math.sqrt(ar * ar + ag * ag + ab * ab);
        if (away < score) score = away;
      });
      if (score > bestScore) { bestScore = score; best = c; }
    });
    return { name: best.name, r: best.r, g: best.g, b: best.b, headroom: bestScore < 0 ? 442 : bestScore };
  }

  async function compositeOnKeyColour(url, colour) {
    var img = await loadImage(url);
    var canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    var ctx = canvas.getContext("2d");
    ctx.fillStyle = "rgb(" + colour.r + "," + colour.g + "," + colour.b + ")";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL("image/png");
  }

  function backgroundReference(px, w, h) {
    var ch = [[], [], []];
    var stepX = Math.max(1, Math.floor(w / 400)), stepY = Math.max(1, Math.floor(h / 400));
    function take(x, y) { var o = (y * w + x) * 4; ch[0].push(px[o]); ch[1].push(px[o + 1]); ch[2].push(px[o + 2]); }
    for (var x = 0; x < w; x += stepX) { take(x, 0); take(x, h - 1); if (h > 3) { take(x, 1); take(x, h - 2); } }
    for (var y = 0; y < h; y += stepY) { take(0, y); take(w - 1, y); if (w > 3) { take(1, y); take(w - 2, y); } }
    function median(v) { v.sort(function (a, b) { return a - b; }); return v[Math.floor(v.length / 2)]; }
    return { r: median(ch[0]), g: median(ch[1]), b: median(ch[2]) };
  }

  async function returnedOnKeyColour(url, keyColour) {
    if (!keyColour) return false;
    var img = await loadImage(url);
    var canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    var ref = backgroundReference(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
    var dr = ref.r - keyColour.r, dg = ref.g - keyColour.g, db = ref.b - keyColour.b;
    return Math.sqrt(dr * dr + dg * dg + db * db) <= KEY_COLOUR_DRIFT;
  }

  function colourDistance(px, o, ref) {
    var dr = px[o] - ref.r, dg = px[o + 1] - ref.g, db = px[o + 2] - ref.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  function measureSpan(px, w, h, ref) {
    var STEP = 4, buckets = new Int32Array(129), total = w * h;
    for (var i = 0; i < total; i++) { var d = Math.round(colourDistance(px, i * 4, ref) / STEP); buckets[d > 128 ? 128 : d]++; }
    var quiet = Math.max(1, Math.floor(total * 0.0008)), end = 1;
    while (end < buckets.length && buckets[end] > quiet) end++;
    var content = 0, k;
    for (k = end; k < buckets.length; k++) content += buckets[k];
    if (content < total * 0.02) return 0;
    var wanted = content * 0.2, seen = 0;
    for (k = end; k < buckets.length; k++) { seen += buckets[k]; if (seen >= wanted) return k * STEP; }
    return 128 * STEP;
  }

  function keyRamp(tolerance, span) {
    var floor, ceiling;
    if (span > 0) { floor = Math.min(tolerance, span * 0.45); ceiling = span * 0.9; }
    else { floor = Math.max(0, tolerance * 0.5); ceiling = tolerance * 1.5; }
    if (ceiling <= floor) ceiling = floor + 1;
    return { alphaAt: function (d, existing) {
      if (d <= floor) return 0;
      if (d >= ceiling) return existing;
      return Math.round(existing * (d - floor) / (ceiling - floor));
    } };
  }

  function keyAxis(ref) {
    var channels = [ref.r, ref.g, ref.b], high = [], low = [];
    channels.forEach(function (v, i) { (v >= 128 ? high : low).push(i); });
    if (!high.length || !low.length) return null;
    var lowest = Math.min.apply(null, high.map(function (i) { return channels[i]; }));
    var highest = Math.max.apply(null, low.map(function (i) { return channels[i]; }));
    var spread = lowest - highest;
    return spread < 60 ? null : { high: high, low: low, spread: spread };
  }

  function keyness(px, o, ref, axis) {
    var high = 255, low = 0, i;
    for (i = 0; i < axis.high.length; i++) high = Math.min(high, px[o + axis.high[i]]);
    for (i = 0; i < axis.low.length; i++) low = Math.max(low, px[o + axis.low[i]]);
    return (high - low) / axis.spread;
  }

  function borderIsPlate(px, w, h, ref, axis) {
    var plate = 0, seen = 0;
    var stepX = Math.max(1, Math.floor(w / 200)), stepY = Math.max(1, Math.floor(h / 200));
    function look(x, y) { seen++; if (keyness(px, (y * w + x) * 4, ref, axis) >= 0.45) plate++; }
    for (var x = 0; x < w; x += stepX) { look(x, 0); look(x, h - 1); }
    for (var y = 0; y < h; y += stepY) { look(0, y); look(w - 1, y); }
    return seen > 0 && plate / seen >= 0.7;
  }

  function alphaSolver(px, w, h, ref, tolerance) {
    var axis = keyAxis(ref);
    if (axis && !borderIsPlate(px, w, h, ref, axis)) axis = null;
    var ramp = axis ? null : keyRamp(tolerance, measureSpan(px, w, h, ref));
    var noise = Math.round(255 * 0.25 * tolerance / MAX_TOLERANCE);
    return { alphaAt: function (o, existing) {
      var a;
      if (axis) {
        var k = keyness(px, o, ref, axis);
        a = Math.min(existing, k <= 0 ? 255 : k >= 1 ? 0 : Math.round(255 * (1 - k)));
      } else {
        a = ramp.alphaAt(colourDistance(px, o, ref), existing);
      }
      return a <= noise ? 0 : a;
    } };
  }

  function unmixBackground(px, o, ref, alpha) {
    if (alpha <= 0 || alpha >= 255) return;
    var a = alpha / 255, ch = [ref.r, ref.g, ref.b];
    for (var c = 0; c < 3; c++) {
      var v = (px[o + c] - ch[c] * (1 - a)) / a;
      px[o + c] = v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
    }
  }

  async function readPixels(url) {
    var img = await loadImage(url);
    var w = img.naturalWidth, h = img.naturalHeight;
    var canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    return { canvas: canvas, ctx: ctx, image: ctx.getImageData(0, 0, w, h), w: w, h: h };
  }

  async function colorKeyBackground(url, tolerance) {
    var r = await readPixels(url), px = r.image.data;
    var ref = backgroundReference(px, r.w, r.h), solver = alphaSolver(px, r.w, r.h, ref, tolerance);
    for (var i = 0; i < r.w * r.h; i++) {
      var o = i * 4, a = solver.alphaAt(o, px[o + 3]);
      px[o + 3] = a;
      unmixBackground(px, o, ref, a);
    }
    r.ctx.putImageData(r.image, 0, 0);
    return await canvasToObjectUrl(r.canvas);
  }

  async function knockOutBackground(url, tolerance) {
    var r = await readPixels(url), px = r.image.data, w = r.w, h = r.h;
    var ref = backgroundReference(px, w, h), solver = alphaSolver(px, w, h, ref, tolerance);
    var visited = new Uint8Array(w * h), stack = new Int32Array(w * h), top = 0;
    function seed(i) {
      if (visited[i] || solver.alphaAt(i * 4, px[i * 4 + 3]) !== 0) return;
      visited[i] = 1; stack[top++] = i;
    }
    for (var x = 0; x < w; x++) { seed(x); seed((h - 1) * w + x); }
    for (var y = 0; y < h; y++) { seed(y * w); seed(y * w + w - 1); }
    while (top > 0) {
      var i = stack[--top];
      px[i * 4 + 3] = 0;
      var cx = i % w, cy = (i - cx) / w;
      if (cx > 0) seed(i - 1); if (cx < w - 1) seed(i + 1);
      if (cy > 0) seed(i - w); if (cy < h - 1) seed(i + w);
    }
    top = 0;
    for (var p = 0; p < w * h; p++) if (visited[p]) stack[top++] = p;
    while (top > 0) {
      var from = stack[--top], fx = from % w, fy = (from - fx) / w, nb = [];
      if (fx > 0) nb.push(from - 1); if (fx < w - 1) nb.push(from + 1);
      if (fy > 0) nb.push(from - w); if (fy < h - 1) nb.push(from + w);
      for (var n = 0; n < nb.length; n++) {
        var at = nb[n];
        if (visited[at]) continue;
        var a = solver.alphaAt(at * 4, px[at * 4 + 3]);
        if (a >= 255) continue;
        visited[at] = 1; px[at * 4 + 3] = a;
        unmixBackground(px, at * 4, ref, a);
        stack[top++] = at;
      }
    }
    r.ctx.putImageData(r.image, 0, 0);
    return await canvasToObjectUrl(r.canvas);
  }

  async function applyAlphaMatte(editedUrl, matteUrl) {
    var r = await readPixels(editedUrl);
    var matte = await loadImage(matteUrl);
    var mc = document.createElement("canvas");
    mc.width = r.w; mc.height = r.h;
    var mctx = mc.getContext("2d");
    mctx.imageSmoothingQuality = "high";
    var fit = Math.min(r.w / matte.naturalWidth, r.h / matte.naturalHeight);
    var mw = matte.naturalWidth * fit, mh = matte.naturalHeight * fit;
    mctx.drawImage(matte, (r.w - mw) / 2, (r.h - mh) / 2, mw, mh);
    var mask = mctx.getImageData(0, 0, r.w, r.h).data;
    for (var i = 3; i < r.image.data.length; i += 4) r.image.data[i] = mask[i];
    r.ctx.putImageData(r.image, 0, 0);
    return await canvasToObjectUrl(r.canvas);
  }

  var ALPHA_MODES = [
    { id: "raw", label: "Use as returned", hint: "Replaces the layer with exactly what the model sent back — including its flat backing colour." },
    { id: "colorkey", label: "Drop the background colour", hint: "Clears every pixel matching the background, including gaps enclosed by the shape — the insides of o, a and e.", tunable: true },
    { id: "knockout", label: "Re-cut from background", hint: "Clears only background connected to the edge, so enclosed gaps stay filled.", tunable: true },
    { id: "matte", label: "Keep original silhouette", hint: "Reuses the cutout's alpha. Only for edits that keep the same outline." },
  ];
  var FIT_MODES = [
    { id: "box", label: "Keep the same box", hint: "The layer keeps the exact size and aspect ratio it had. The edit fills it." },
    { id: "aspect", label: "Keep the size, take the new shape", hint: "Same visual area and centre, but the returned aspect ratio." },
  ];

  async function deriveAlpha(opaqueUrl, matteUrl, mode, tolerance) {
    if (mode === "raw") return opaqueUrl;
    if (mode === "colorkey") return await colorKeyBackground(opaqueUrl, tolerance);
    if (mode === "knockout") return await knockOutBackground(opaqueUrl, tolerance);
    return await applyAlphaMatte(opaqueUrl, matteUrl);
  }

  function boxForFit(previousBox, aspect, mode) {
    if (mode !== "aspect" || !aspect) return Object.assign({}, previousBox);
    var area = previousBox.w * previousBox.h, w = Math.sqrt(area * aspect), h = w / aspect;
    return { x: previousBox.x + (previousBox.w - w) / 2, y: previousBox.y + (previousBox.h - h) / 2, w: w, h: h };
  }

  function editSignature(edit) {
    return JSON.stringify([((edit && edit.prompt) || "").trim(),
      ((edit && edit.references) || []).map(function (r) { return r.id; })]);
  }
  function isEditPending(edit) {
    if (!edit || !(edit.prompt || "").trim() || edit.status === "running") return false;
    return editSignature(edit) !== edit.ranSignature;
  }

  // ---- zip (STORE only — PNG/JPEG are already compressed) ----
  var crcTable = null;
  function crc32(bytes) {
    if (!crcTable) {
      crcTable = new Uint32Array(256);
      for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1); crcTable[n] = c >>> 0; }
    }
    var crc = 0xffffffff;
    for (var i = 0; i < bytes.length; i++) crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[i]) & 0xff];
    return (crc ^ 0xffffffff) >>> 0;
  }
  function buildZip(files) {
    var enc = new TextEncoder(), chunks = [], central = [], offset = 0;
    function u16(v) { return [v & 0xff, (v >>> 8) & 0xff]; }
    function u32(v) { return [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff]; }
    files.forEach(function (f) {
      var nb = enc.encode(f.name), crc = crc32(f.bytes), size = f.bytes.length;
      var lh = [].concat(u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(size), u32(size), u16(nb.length), u16(0));
      chunks.push(new Uint8Array(lh), nb, f.bytes);
      central.push(new Uint8Array([].concat(u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(size), u32(size), u16(nb.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset))));
      central.push(nb);
      offset += lh.length + nb.length + size;
    });
    var cStart = offset, cSize = 0;
    central.forEach(function (part) { chunks.push(part); cSize += part.length; });
    chunks.push(new Uint8Array([].concat(u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(cSize), u32(cStart), u16(0))));
    return new Blob(chunks, { type: "application/zip" });
  }
  async function bytesFromUrl(url) {
    var resp = await fetch(url);
    if (!resp.ok) throw new Error("could not read image for download");
    return new Uint8Array(await resp.arrayBuffer());
  }
  function layerFilename(layer, index, ext) {
    var slug = (layer.name || "layer").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
    return "layer-" + String(index + 1).padStart(2, "0") + (slug ? "-" + slug : "") + "." + (ext || "png");
  }
  function parseSize(sizeString, fw, fh) {
    var m = /^(\d+)\s*x\s*(\d+)$/i.exec(String(sizeString || "").trim());
    return m ? { width: parseInt(m[1], 10), height: parseInt(m[2], 10) } : { width: fw, height: fh };
  }

  // ---- canvas ----
  var MIN_LAYER_SIZE = 8;
  var HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

  function resizeBox(start, handle, dx, dy, lockAspect) {
    var L = handle.indexOf("w") !== -1, R = handle.indexOf("e") !== -1;
    var T = handle.indexOf("n") !== -1, B = handle.indexOf("s") !== -1;
    var left = L ? start.x + dx : start.x, right = R ? start.x + start.w + dx : start.x + start.w;
    var top = T ? start.y + dy : start.y, bottom = B ? start.y + start.h + dy : start.y + start.h;
    var w = Math.max(MIN_LAYER_SIZE, right - left), h = Math.max(MIN_LAYER_SIZE, bottom - top);
    if (lockAspect && start.w > 0 && start.h > 0) {
      var ratio = start.w / start.h;
      if ((L || R) && (T || B)) { if (w / h > ratio) h = w / ratio; else w = h * ratio; }
      else if (L || R) h = w / ratio; else w = h * ratio;
    }
    var x = L ? start.x + start.w - w : R ? start.x : start.x + (start.w - w) / 2;
    var y = T ? start.y + start.h - h : B ? start.y : start.y + (start.h - h) / 2;
    return { x: x, y: y, w: w, h: h };
  }

  function LayerCanvas(props) {
    var doc = props.doc, selectedId = props.selectedId, onSelect = props.onSelect, onGeometry = props.onGeometry;
    var wrapRef = useRef(null), stageRef = useRef(null), gestureRef = useRef(null);
    var stateRef = useRef({ layers: [], scale: 1 });
    var vp = useState({ width: 0, height: 0 });
    var shift = useState(false);
    var zoomS = useState(1);   // multiplies the fit-to-canvas scale; 1 = Fit
    var infoS = useState(false);

    useEffect(function () {
      var node = wrapRef.current;
      if (!node) return undefined;
      var obs = new ResizeObserver(function (entries) {
        var box = entries[0].contentRect;
        vp[1]({ width: box.width, height: box.height });
      });
      obs.observe(node);
      return function () { obs.disconnect(); };
    }, []);

    var baseW = (doc && doc.base && doc.base.width) || 0, baseH = (doc && doc.base && doc.base.height) || 0;
    var scale = 1;
    if (baseW && baseH && vp[0].width && vp[0].height) scale = Math.min((vp[0].width - 24) / baseW, (vp[0].height - 70) / baseH, 2);   // small images are enlarged to fill the canvas
    var fitScale = scale;
    scale = fitScale * zoomS[0];
    stateRef.current = { layers: (doc && doc.layers) || [], scale: scale };
    function zoomBy(f) { zoomS[1](function (z) { return Math.max(0.25, Math.min(6, z * f)); }); }

    // Auto-arrange: lays the visible layers out in a grid over the canvas, each scaled to
    // fit its cell with its aspect ratio kept, so every layer can be seen on its own.
    function autoArrange() {
      var items = (doc.layers || []).filter(function (l) { return l.visible; });
      if (!items.length) return;
      var cols = Math.ceil(Math.sqrt(items.length * baseW / baseH));
      var rows = Math.ceil(items.length / cols);
      var gap = Math.round(Math.min(baseW, baseH) * 0.02);
      var cw = (baseW - gap * (cols + 1)) / cols, ch = (baseH - gap * (rows + 1)) / rows;
      items.forEach(function (l, i) {
        var c = i % cols, r = Math.floor(i / cols);
        var f = Math.min(cw / l.w, ch / l.h);
        var w = Math.max(MIN_LAYER_SIZE, l.w * f), h = Math.max(MIN_LAYER_SIZE, l.h * f);
        onGeometry(l.id, { x: gap + c * (cw + gap) + (cw - w) / 2, y: gap + r * (ch + gap) + (ch - h) / 2, w: w, h: h });
      });
    }

    useEffect(function () {
      function onKey(e) { if (e.key === "Shift") shift[1](e.type === "keydown"); }
      window.addEventListener("keydown", onKey); window.addEventListener("keyup", onKey);
      return function () { window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onKey); };
    }, []);

    function begin(e, layer, handle) {
      e.preventDefault(); e.stopPropagation();
      onSelect(layer.id);
      gestureRef.current = { id: layer.id, handle: handle, sx: e.clientX, sy: e.clientY, box: { x: layer.x, y: layer.y, w: layer.w, h: layer.h } };
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ }
    }
    function move(e) {
      var g = gestureRef.current;
      if (!g) return;
      var sc = stateRef.current.scale || 1, dx = (e.clientX - g.sx) / sc, dy = (e.clientY - g.sy) / sc;
      if (g.handle === "move") onGeometry(g.id, { x: g.box.x + dx, y: g.box.y + dy });
      else onGeometry(g.id, resizeBox(g.box, g.handle, dx, dy, e.shiftKey));
    }
    function end(e) {
      if (!gestureRef.current) return;
      gestureRef.current = null;
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (err) { /* released */ }
    }

    // Native, non-passive wheel listener: scales the layer under the cursor.
    useEffect(function () {
      var node = stageRef.current;
      if (!node) return undefined;
      function onWheel(e) {
        var host = e.target.closest ? e.target.closest("[data-layer-id]") : null;
        if (!host) return;
        var id = host.getAttribute("data-layer-id");
        var layer = stateRef.current.layers.filter(function (l) { return String(l.id) === id; })[0];
        if (!layer) return;
        e.preventDefault();
        var f = e.deltaY < 0 ? 1.05 : 1 / 1.05;
        var w = Math.max(MIN_LAYER_SIZE, layer.w * f), h = Math.max(MIN_LAYER_SIZE, layer.h * f);
        onGeometry(layer.id, { x: layer.x + (layer.w - w) / 2, y: layer.y + (layer.h - h) / 2, w: w, h: h });
      }
      node.addEventListener("wheel", onWheel, { passive: false });
      return function () { node.removeEventListener("wheel", onWheel); };
    }, [doc, onGeometry]);

    if (!doc) {
      return (
        <div className="sd-canvas-wrap" ref={wrapRef}>
          <div className="sd-canvas-empty">
            <div className="sd-canvas-empty-mark">◳</div>
            <h2>Your layer canvas</h2>
            <p>Upload an image and separate it into layers. The result becomes an interactive stack you can move, resize and re-generate.</p>
          </div>
        </div>
      );
    }
    var visible = doc.layers.filter(function (l) { return l.visible; });
    return (
      <div className="sd-canvas-wrap" ref={wrapRef}>
        <div className="sd-canvas-tools">
          <button type="button" className={"sd-info-btn" + (infoS[0] ? " is-on" : "")} aria-label="Canvas controls" aria-expanded={infoS[0]}
                  title="Canvas controls" onClick={function () { infoS[1](!infoS[0]); }}>i</button>
          <button type="button" className="sd-btn sd-btn-ghost sd-btn-small" onClick={autoArrange} title="Spread the visible layers out in a grid so each can be seen">Auto-arrange</button>
          <button type="button" className="sd-btn sd-btn-ghost sd-btn-small" onClick={function () { zoomS[1](1); }} title="Fit the image to the canvas">Fit</button>
          <div className="sd-zoom">
            <button type="button" aria-label="Zoom out" onClick={function () { zoomBy(1 / 1.25); }}>−</button>
            <span>{Math.round(scale * 100)}%</span>
            <button type="button" aria-label="Zoom in" onClick={function () { zoomBy(1.25); }}>+</button>
          </div>
        </div>
        {infoS[0] ? (
          <div className="sd-canvas-info" role="dialog" aria-label="Canvas controls">
            <div className="sd-canvas-info-head"><strong>Canvas controls</strong>
              <button type="button" aria-label="Close" onClick={function () { infoS[1](false); }}>×</button></div>
            <ul>
              <li><b>Select</b> — click a layer (or pick it in the Layers list).</li>
              <li><b>Move</b> — drag a layer.</li>
              <li><b>Resize</b> — drag a corner or edge handle; hold <kbd>Shift</kbd> to keep the aspect ratio.</li>
              <li><b>Scale</b> — scroll over a layer to scale it from its centre.</li>
              <li><b>Zoom</b> — − / + in the toolbar; <b>Fit</b> shows the whole image. Scroll the canvas to pan when zoomed in.</li>
              <li><b>Auto-arrange</b> — spreads the visible layers out in a grid; <b>Reset layers</b> in the Layers list puts them back.</li>
              <li><b>Deselect</b> — click the empty canvas.</li>
            </ul>
          </div>
        ) : null}
        <div className="sd-canvas-scroll">
        <div className="sd-stage" ref={stageRef} style={{ width: baseW * scale + "px", height: baseH * scale + "px" }}
             onPointerDown={function (e) { if (e.target === stageRef.current) onSelect(null); }}>
          {doc.showBase && doc.base.url ? <img className="sd-stage-base" src={doc.base.url} draggable={false} alt="" /> : null}
          {visible.map(function (layer) {
            var sel = layer.id === selectedId;
            return (
              <div key={layer.id} className={"sd-layer" + (sel ? " is-selected" : "")} data-layer-id={layer.id}
                   style={{ left: layer.x * scale + "px", top: layer.y * scale + "px", width: layer.w * scale + "px",
                            height: layer.h * scale + "px", zIndex: doc.layers.indexOf(layer) + 2, opacity: layer.opacity }}
                   onPointerDown={function (e) { begin(e, layer, "move"); }} onPointerMove={move}
                   onPointerUp={end} onPointerCancel={end} title={layer.name || "layer"}>
                <img src={layer.url} draggable={false} alt={layer.name || ""} />
                {sel ? (
                  <React.Fragment>
                    <span className="sd-layer-tag">{layer.name || "layer"}</span>
                    {HANDLES.map(function (hd) {
                      return <span key={hd} className={"sd-handle sd-handle-" + hd}
                                   onPointerDown={function (e) { begin(e, layer, hd); }} onPointerMove={move}
                                   onPointerUp={end} onPointerCancel={end} />;
                    })}
                  </React.Fragment>
                ) : null}
              </div>
            );
          })}
        </div>
        </div>
        <div className="sd-canvas-status">
          <span>{baseW} × {baseH}</span>
          <span>{visible.length} of {doc.layers.length} layers shown</span>
          <span className={shift[0] ? "sd-hint sd-hint-on" : "sd-hint"}>{shift[0] ? "Shift — aspect locked" : "Hold Shift to lock aspect"}</span>
        </div>
      </div>
    );
  }

  // ---- panels ----
  function LayersPanel(props) {
    var ordered = props.layers.slice().reverse();
    return (
      <section className="sd-panel">
        <SectionTitle num="03" aside={String(props.layers.length)}>Layers</SectionTitle>
        {props.layers.length ? (
          <div className="sd-btn-row sd-btn-row-tight">
            <button className="sd-btn sd-btn-ghost" onClick={props.onDownloadAll} disabled={props.zipping}>{props.zipping ? "Packing…" : "Download all (.zip)"}</button>
            <button className="sd-btn sd-btn-ghost" onClick={props.onExport}>Export PNG</button>
            <button className="sd-btn sd-btn-ghost" onClick={props.onResetAll}>Reset layers</button>
          </div>
        ) : null}
        <div className="sd-layer-list">
          {ordered.map(function (layer) {
            var index = props.layers.indexOf(layer);
            var edit = props.edits[layer.id] || {};
            return (
              <div key={layer.id} className={"sd-layer-row" + (layer.id === props.selectedId ? " is-selected" : "")}
                   onClick={function () { props.onSelect(layer.id); }}>
                <div className="sd-layer-thumb">
                  <img src={layer.url} alt="" />
                  {edit.status === "running" || edit.alphaBusy ? <span className="sd-layer-spinner" /> : null}
                </div>
                <div className="sd-layer-meta">
                  <strong>{layer.name || "Layer " + (index + 1)}</strong>
                  <span>{edit.status === "running" ? "editing…" : edit.status === "error" ? "edit failed" : layer.editedFrom ? "edited" : (layer.description || "—")}</span>
                </div>
                <div className="sd-layer-actions">
                  <button title="Download this layer as PNG" onClick={function (e) { e.stopPropagation(); props.onDownloadLayer(layer.id); }}>⤓</button>
                  <button title={layer.visible ? "Hide layer" : "Show layer"} onClick={function (e) { e.stopPropagation(); props.onToggle(layer.id); }}>{layer.visible ? "◉" : "○"}</button>
                  <button title="Bring forward" disabled={index === props.layers.length - 1} onClick={function (e) { e.stopPropagation(); props.onReorder(layer.id, 1); }}>▲</button>
                  <button title="Send backward" disabled={index === 0} onClick={function (e) { e.stopPropagation(); props.onReorder(layer.id, -1); }}>▼</button>
                </div>
              </div>
            );
          })}
          {props.base ? (
            <div className={"sd-layer-row sd-layer-row-base" + (props.selectedId === null ? " is-selected" : "")} onClick={function () { props.onSelect(null); }}>
              <div className="sd-layer-thumb"><img src={props.base.url} alt="" /></div>
              <div className="sd-layer-meta"><strong>Background</strong><span>Flattened base · fixed</span></div>
              <div className="sd-layer-actions">
                <button title="Download the base image" onClick={function (e) { e.stopPropagation(); props.onDownloadBase(); }}>⤓</button>
                <button title={props.showBase ? "Hide background" : "Show background"} onClick={function (e) { e.stopPropagation(); props.onToggleBase(); }}>{props.showBase ? "◉" : "○"}</button>
              </div>
            </div>
          ) : <p className="sd-notice">No layers yet.</p>}
        </div>
      </section>
    );
  }

  function EditPanel(props) {
    var layer = props.layer, edit = props.edit, refInputRef = useRef(null);
    var isRunning = edit.status === "running";
    var refs = edit.references || [];
    var nativeMode = nativeLayerEdit(props.settings, refs.length);
    var showAlpha = !!(layer && layer.opaqueEditUrl) || !nativeMode;
    return (
      <section className="sd-panel">
        <SectionTitle num="04" aside={props.runningCount ? props.runningCount + " running" : null}>Edit layer</SectionTitle>
        {props.pendingCount > 1 ? (
          <button className="sd-btn sd-btn-primary sd-btn-batch" onClick={props.onRunAll}>Run {props.pendingCount} edits in parallel</button>
        ) : null}
        {!layer ? <p className="sd-notice">Select a layer on the canvas or in the list to edit it.</p> : (
          <React.Fragment>
            <div className="sd-edit-target">
              <img src={layer.url} alt="" />
              <div><strong>{layer.name || "Layer"}</strong><span>{Math.round(layer.w)} × {Math.round(layer.h)} px on canvas</span></div>
            </div>
            <textarea className="sd-field" rows={3} value={edit.prompt || ""}
                      placeholder="Describe the change, e.g. “make the jacket red leather” or “turn it into a brass statue”."
                      onChange={function (e) { props.onPatch(layer.id, { prompt: e.target.value }); }} />
            <div className="sd-refs">
              <div className="sd-refs-head"><span>Reference images</span><span className="sd-refs-count">{refs.length} / {MAX_REFERENCE_IMAGES}</span></div>
              <div className="sd-refs-strip">
                {refs.map(function (ref) {
                  return (
                    <div className="sd-ref-chip" key={ref.id} title={ref.name}>
                      <img src={ref.url} alt="" />
                      <button title="Remove" onClick={function () { props.onRemoveReference(layer.id, ref.id); }}>×</button>
                    </div>
                  );
                })}
                {refs.length < MAX_REFERENCE_IMAGES ? <button className="sd-ref-add-btn" onClick={function () { refInputRef.current.click(); }} title="Add reference images">＋</button> : null}
              </div>
              <input ref={refInputRef} type="file" accept="image/*" multiple hidden
                     onChange={function (e) { props.onAddReferences(layer.id, e.target.files); e.target.value = ""; }} />
            </div>

            <p className={"sd-notice" + (nativeMode ? " sd-notice-ok" : "")}>
              {nativeMode
                ? "Native transparency: the layer is sent as a transparent PNG with background: transparent, and comes back transparent — no repair needed."
                : refs.length
                  ? "With reference images the request has several inputs, which transparent mode doesn't allow — so the layer goes out on a flat backing colour and the alpha is rebuilt below."
                  : "Chroma-plate mode (Settings): the layer goes out on a flat backing colour and the alpha is rebuilt below."}
            </p>

            {showAlpha ? (
              <div className="sd-alpha-modes">
                <div className="sd-refs-head"><span>Transparency repair</span>{layer.opaqueEditUrl ? <span className="sd-refs-count">{edit.alphaBusy ? "applying…" : "re-applies instantly"}</span> : null}</div>
                {ALPHA_MODES.map(function (mode) {
                  var on = (edit.alphaMode || "raw") === mode.id;
                  return (
                    <label key={mode.id} className={"sd-alpha-mode" + (on ? " is-on" : "")}>
                      <input type="radio" name={"sd-alpha-" + layer.id} checked={on} onChange={function () { props.onAlphaMode(layer.id, mode.id); }} />
                      <span><strong>{mode.label}</strong><em>{mode.hint}</em></span>
                    </label>
                  );
                })}
                {(function () {
                  var active = ALPHA_MODES.filter(function (m) { return m.id === (edit.alphaMode || "raw"); })[0];
                  if (!active || !active.tunable) return null;
                  var value = edit.tolerance === undefined ? DEFAULT_TOLERANCE : edit.tolerance;
                  return (
                    <div className={"sd-tolerance" + (edit.alphaBusy ? " is-busy" : "")}>
                      <div className="sd-refs-head"><span>Tolerance</span><span className="sd-refs-count">{value}</span></div>
                      <input type="range" min={4} max={MAX_TOLERANCE} step={2} value={value}
                             onChange={function (e) { props.onTolerance(layer.id, Number(e.target.value)); }} />
                      <em>{!layer.opaqueEditUrl ? "Takes effect on the next edit."
                        : layer.editKeyed ? "The layer came back on the flat " + ((layer.editKeyColour || {}).name || "") + " it was sent on — a clean key; the slider is only a noise floor."
                        : "The model changed the backing colour, so the key is read off whatever came back. Raise it until the specks go; lower it if edges get eaten."}</em>
                    </div>
                  );
                })()}
              </div>
            ) : null}

            <div className="sd-alpha-modes">
              <div className="sd-refs-head"><span>Fit</span>{layer.preEditBox ? <span className="sd-refs-count">re-applies instantly</span> : null}</div>
              {FIT_MODES.map(function (mode) {
                var on = (edit.fitMode || "box") === mode.id;
                return (
                  <label key={mode.id} className={"sd-alpha-mode" + (on ? " is-on" : "")}>
                    <input type="radio" name={"sd-fit-" + layer.id} checked={on} onChange={function () { props.onFitMode(layer.id, mode.id); }} />
                    <span><strong>{mode.label}</strong><em>{mode.hint}</em></span>
                  </label>
                );
              })}
            </div>

            {edit.error ? <p className="sd-notice sd-notice-error">{edit.error}</p> : null}
            <button className="sd-btn sd-btn-primary" disabled={isRunning || !(edit.prompt || "").trim()} onClick={function () { props.onRun(layer.id); }}>
              {isRunning ? "Editing…" : props.isPending ? "Edit selected layer" : "Run this edit again"}
            </button>
            <div className="sd-btn-row">
              <button className="sd-btn sd-btn-ghost" disabled={!layer.editedFrom} onClick={function () { props.onRevert(layer.id); }}>Revert pixels</button>
              <button className="sd-btn sd-btn-ghost" onClick={function () { props.onResetGeometry(layer.id); }}>Reset position</button>
            </div>
          </React.Fragment>
        )}
      </section>
    );
  }

  // ---- layer tool ----
  function defaultLayerState() {
    return {
      settings: { model: "pro", size: "auto", outputFormat: "jpeg", watermark: false,
                  editModel: "pro", editSize: "2K", editTransparency: "native", concurrency: 3,
                  maxLayers: 30, textRecognition: false },
      source: null,
      instruction: "",
      doc: null,
      edits: {},
    };
  }

  // Seedream 5.5 layer_decomposition_options.max_images: base + layers, 2–100.
  function clampLayers(n) { return Math.max(2, Math.min(100, Math.round(Number(n) || 30))); }

  // Layer edits run on Seedream 5.5 when it did the separation, else on editModel.
  function layerEditModel(settings) { return settings.model === "5.5" ? "5.5" : settings.editModel; }

  // Native transparency takes one transparent PNG on 5.0; 5.5 also takes reference images.
  function nativeLayerEdit(settings, refCount) {
    return settings.editTransparency === "native" && (refCount === 0 || layerEditModel(settings) === "5.5");
  }

  function layerFromItem(item, baseW, baseH) {
    var box = (item.bounding_box || {}).absolute;
    var g = (box && box.length === 4) ? { x: box[0], y: box[1], w: box[2] - box[0], h: box[3] - box[1] } : { x: 0, y: 0, w: baseW, h: baseH };
    var url = itemUrl(item);
    return Object.assign({
      id: uid(), url: url, originalUrl: url, editedFrom: null, opaqueEditUrl: null,
      editKeyColour: null, editKeyed: false, preEditBox: null, editedAspect: null,
      name: item.name || "", description: item.description || "", zIndex: item.z_index || 0,
      text: (item.text_recognition && item.text_recognition.text) || "", textRecognition: item.text_recognition || null,
      visible: true, opacity: 1, origin: Object.assign({}, g),
    }, g);
  }

  /* What gets saved with the project: blob: URLs (browser-repaired layers) are
   * swapped for the server copy once it exists, else the last saved pixels. */
  function serializeDoc(doc) {
    if (!doc) return null;
    return Object.assign({}, doc, { layers: doc.layers.map(function (l) {
      var url = l.url;
      if (url.indexOf("blob:") === 0) url = (l.persistFor === l.url && l.persistUrl) || l.savedUrl || l.originalUrl;
      return Object.assign({}, l, { url: url, savedUrl: url, persistFor: null, persistUrl: null });
    }) });
  }

  function serializeEdits(edits) {
    var out = {};
    Object.keys(edits).forEach(function (id) {
      var e = edits[id];
      out[id] = Object.assign({}, e, {
        status: e.status === "running" ? "" : e.status, alphaBusy: false,
      });
    });
    return out;
  }

  function LayerTool(props) {
    var initial = useMemo(function () {
      var s = Object.assign(defaultLayerState(), props.state || {});
      s.settings = Object.assign(defaultLayerState().settings, s.settings || {});
      return s;
    }, []);
    var update = props.update;
    var settingsS = useState(initial.settings);
    var sourceS = useState(initial.source);
    var instructionS = useState(initial.instruction || "");
    var docS = useState(initial.doc);
    var editsS = useState(serializeEdits(initial.edits || {}));
    var selS = useState(null);
    var busyS = useState("");
    var zipS = useState(false);
    var errS = useState("");
    var uploadS = useState(false);
    var showSettings = useState(false);

    var settings = settingsS[0], source = sourceS[0], doc = docS[0], edits = editsS[0], selectedId = selS[0];
    var docRef = useRef(doc), editsRef = useRef(edits), settingsRef = useRef(settings), alphaRunRef = useRef({});
    docRef.current = doc; editsRef.current = edits; settingsRef.current = settings;

    // Persist (debounced) to the project / browser.
    useEffect(function () {
      var t = setTimeout(function () {
        update(function () {
          return { settings: settings, source: source, instruction: instructionS[0],
                   doc: serializeDoc(docRef.current), edits: serializeEdits(editsRef.current) };
        });
      }, 600);
      return function () { clearTimeout(t); };
    }, [settings, source, instructionS[0], doc, edits]);

    // Browser-repaired layers live as blob: URLs; once a layer settles, upload its
    // pixels so the project keeps the repaired layer, not the raw response.
    useEffect(function () {
      if (!doc) return undefined;
      var pending = doc.layers.filter(function (l) { return l.url.indexOf("blob:") === 0 && l.persistFor !== l.url; });
      if (!pending.length) return undefined;
      var t = setTimeout(function () {
        pending.forEach(async function (l) {
          var blobUrl = l.url;
          try {
            var url = await saveImage(await blobUrlToDataUrl(blobUrl), "layer");
            updateLayer(l.id, function (cur) { return cur.url === blobUrl ? { persistFor: blobUrl, persistUrl: url } : {}; });
          } catch (err) { /* stays unsaved; the original pixels are kept on reload */ }
        });
      }, 1500);
      return function () { clearTimeout(t); };
    }, [doc]);

    useHandoff("layers", function (items) {
      var it = items[items.length - 1];
      loadImage(it.url).then(function (img) {
        sourceS[1]({ url: it.url, name: it.name || "image", width: img.naturalWidth, height: img.naturalHeight,
                     warning: img.naturalWidth * img.naturalHeight < 262144 ? "Below the 512×512 minimum for layer decomposition." : "" });
      });
    });

    function setSettings(patch) { settingsS[1](function (cur) { return Object.assign({}, cur, patch); }); }
    function findLayer(d, id) { return d ? d.layers.filter(function (l) { return l.id === id; })[0] || null : null; }
    var selectedLayer = findLayer(doc, selectedId);
    var selectedEdit = (selectedId && edits[selectedId]) || {};
    var runningCount = Object.keys(edits).filter(function (id) { return edits[id].status === "running"; }).length;
    var pendingCount = doc ? doc.layers.filter(function (l) { return isEditPending(edits[l.id]); }).length : 0;

    function updateLayer(id, patch) {
      docS[1](function (cur) {
        if (!cur) return cur;
        return Object.assign({}, cur, { layers: cur.layers.map(function (l) {
          if (l.id !== id) return l;
          return Object.assign({}, l, typeof patch === "function" ? patch(l) : patch);
        }) });
      });
    }
    function patchEdit(id, patch) {
      editsS[1](function (cur) {
        var next = Object.assign({}, cur);
        next[id] = Object.assign({ prompt: "", references: [], alphaMode: "raw", fitMode: "box", tolerance: DEFAULT_TOLERANCE }, cur[id], patch);
        return next;
      });
    }
    function reorderLayer(id, dir) {
      docS[1](function (cur) {
        if (!cur) return cur;
        var layers = cur.layers.slice(), from = layers.findIndex(function (l) { return l.id === id; }), to = from + dir;
        if (from < 0 || to < 0 || to >= layers.length) return cur;
        var moved = layers.splice(from, 1)[0];
        layers.splice(to, 0, moved);
        return Object.assign({}, cur, { layers: layers });
      });
    }
    function resetGeometry(id) { var l = findLayer(doc, id); if (l) updateLayer(id, Object.assign({}, l.origin)); }
    function revertPixels(id) {
      var l = findLayer(doc, id);
      if (l && l.editedFrom) updateLayer(id, Object.assign({ url: l.originalUrl, editedFrom: null, opaqueEditUrl: null, preEditBox: null, editedAspect: null }, l.preEditBox || {}));
    }
    function resetAll() {
      if (!doc) return;
      docS[1](Object.assign({}, doc, { showBase: true, layers: doc.layers.map(function (l) {
        return Object.assign({}, l, l.origin, { url: l.originalUrl, editedFrom: null, opaqueEditUrl: null, preEditBox: null, editedAspect: null, visible: true });
      }) }));
      editsS[1]({});
    }

    async function pickSource(files) {
      errS[1]("");
      uploadS[1](true);
      try {
        var up = await uploadImageFile(files[0], { maxSide: 6000, minPixels: 262144, forceJpeg: !/png/i.test(files[0].type), hint: "layer-source" });
        sourceS[1](up);
      } catch (err) { errS[1](err.message); }
      finally { uploadS[1](false); }
    }

    async function addReferences(layerId, fileList) {
      errS[1]("");
      var existing = (editsRef.current[layerId] || {}).references || [];
      var files = Array.prototype.slice.call(fileList || []).slice(0, MAX_REFERENCE_IMAGES - existing.length);
      try {
        var prepared = [];
        for (var i = 0; i < files.length; i++) prepared.push(await uploadImageFile(files[i], { maxSide: 1536, forceJpeg: true, hint: "layer-ref" }));
        patchEdit(layerId, { references: existing.concat(prepared) });
      } catch (err) { errS[1](err.message); }
    }
    function removeReference(layerId, refId) {
      var existing = (editsRef.current[layerId] || {}).references || [];
      patchEdit(layerId, { references: existing.filter(function (r) { return r.id !== refId; }) });
    }

    async function separateLayers() {
      if (!source) return;
      errS[1]("");
      busyS[1]("decompose");
      try {
        var body = {
          model: settings.model, layer_decomposition: true, image: source.url, size: settings.size,
          output_format: settings.outputFormat, watermark: !!settings.watermark,
          optimize_prompt_options: { mode: "standard" },
        };
        if (settings.model === "5.5") {
          body.layer_decomposition_options = { max_images: clampLayers(settings.maxLayers), text_recognition: !!settings.textRecognition };
        }
        var instruction = instructionS[0].trim();
        if (instruction) body.prompt = fillTemplate(PROMPT_DECOMPOSE, { instruction: instruction });
        var data = await seedreamGenerate(body, "Layer decomposition · " + modelLabel(settings.model),
          source.width + "×" + source.height + " · size " + settings.size);
        var items = (data.data || []).slice();
        var baseItem = items.filter(function (i) { return (i.z_index || 0) === 0; })[0] || items[0];
        if (!baseItem) throw new Error("The response contained no images.");
        var layers = items.filter(function (i) { return i !== baseItem; }).sort(function (a, b) { return (a.z_index || 0) - (b.z_index || 0); });
        var dims = parseSize(baseItem.size, source.width, source.height);
        docS[1]({
          base: { url: itemUrl(baseItem), width: dims.width, height: dims.height, format: baseItem.output_format || settings.outputFormat },
          showBase: true,
          layers: layers.map(function (it) { return layerFromItem(it, dims.width, dims.height); }),
        });
        selS[1](null);
        editsS[1]({});
      } catch (err) { errS[1](err.message); }
      finally { busyS[1](""); }
    }

    async function reapplyAlpha(layerId, mode, tolerance) {
      var layer = findLayer(docRef.current, layerId);
      if (!layer || !layer.opaqueEditUrl) return;
      var run = (alphaRunRef.current[layerId] || 0) + 1;
      alphaRunRef.current[layerId] = run;
      patchEdit(layerId, { alphaBusy: true });
      try {
        var url = await deriveAlpha(layer.opaqueEditUrl, layer.originalUrl, mode, tolerance);
        if (alphaRunRef.current[layerId] !== run) { if (url !== layer.opaqueEditUrl) URL.revokeObjectURL(url); return; }
        updateLayer(layerId, { url: url });
      } catch (err) { errS[1](err.message); }
      finally { if (alphaRunRef.current[layerId] === run) patchEdit(layerId, { alphaBusy: false }); }
    }

    async function runEdit(layerId) {
      var layer = findLayer(docRef.current, layerId);
      var edit = editsRef.current[layerId] || {};
      var prompt = (edit.prompt || "").trim();
      if (!layer || !prompt) return;
      var cur = settingsRef.current;
      var refs = edit.references || [];
      var signature = editSignature(edit);
      var native = nativeLayerEdit(cur, refs.length);
      var editModel = layerEditModel(cur);
      patchEdit(layerId, { status: "running", error: "" });
      try {
        var keyColour = null, body;
        if (native) {
          // The layer is already a transparent PNG; send it as-is.
          var layerSrc = layer.url.indexOf("blob:") === 0 ? await blobUrlToDataUrl(layer.url) : layer.url;
          var nativeImages = [layerSrc].concat(refs.map(function (r) { return r.url; }));
          body = { model: editModel, prompt: fillTemplate(refs.length ? PROMPT_LAYER_EDIT_NATIVE_REFS : PROMPT_LAYER_EDIT_NATIVE, { instruction: prompt }),
                   image: nativeImages.length === 1 ? nativeImages[0] : nativeImages, background: "transparent", output_format: "png", size: cur.editSize,
                   watermark: !!cur.watermark, optimize_prompt_options: { mode: "standard" } };
        } else {
          keyColour = await chooseKeyColour(layer.url, prompt);
          var plate = await compositeOnKeyColour(layer.url, keyColour);
          var images = [plate].concat(refs.map(function (r) { return r.url; }));
          body = { model: editModel,
                   prompt: fillTemplate(refs.length ? PROMPT_LAYER_EDIT_REFS : PROMPT_LAYER_EDIT, { instruction: prompt, keycolour: keyColour.name }),
                   image: images.length === 1 ? images[0] : images, output_format: "png", size: cur.editSize,
                   watermark: !!cur.watermark, optimize_prompt_options: { mode: "standard" } };
        }
        var data = await seedreamGenerate(body, "Layer edit · " + (layer.name || "layer") + (native ? " · native alpha" : " · chroma plate"),
          refs.length ? prompt + " · " + refs.length + " reference image(s)" : prompt);
        var first = (data.data || [])[0];
        var returnedUrl = itemUrl(first);
        if (!returnedUrl) throw new Error("The edit returned no image.");

        var opaqueUrl = null, finalUrl = returnedUrl, keyed = false;
        var live = editsRef.current[layerId] || edit;
        var alphaMode = live.alphaMode || "raw";
        var tolerance = live.tolerance === undefined ? DEFAULT_TOLERANCE : live.tolerance;
        if (!(await hasTransparency(returnedUrl))) {
          opaqueUrl = returnedUrl;
          keyed = await returnedOnKeyColour(opaqueUrl, keyColour);
          if (keyed) {
            if (!live.alphaModeTouched) alphaMode = "colorkey";
            if (!live.toleranceTouched) tolerance = keyedTolerance(keyColour);
          }
          finalUrl = await deriveAlpha(opaqueUrl, layer.originalUrl, alphaMode, tolerance);
        }
        var img = await loadImage(finalUrl);
        var aspect = img.naturalWidth / img.naturalHeight;
        var fresh = findLayer(docRef.current, layerId) || layer;
        var previousBox = fresh.preEditBox || { x: fresh.x, y: fresh.y, w: fresh.w, h: fresh.h };
        alphaRunRef.current[layerId] = (alphaRunRef.current[layerId] || 0) + 1;
        updateLayer(layerId, Object.assign({
          url: finalUrl, editedFrom: layer.originalUrl, opaqueEditUrl: opaqueUrl, editKeyColour: keyColour,
          editKeyed: keyed, preEditBox: previousBox, editedAspect: aspect,
        }, boxForFit(previousBox, aspect, edit.fitMode || "box")));
        patchEdit(layerId, { status: "done", error: "", ranSignature: signature, alphaBusy: false, alphaMode: alphaMode, tolerance: tolerance });
      } catch (err) {
        patchEdit(layerId, { status: "error", error: err.message });
      }
    }

    async function runAllEdits() {
      var d = docRef.current;
      if (!d) return;
      var ids = d.layers.filter(function (l) { return isEditPending(editsRef.current[l.id]); }).map(function (l) { return l.id; });
      if (ids.length) await runPool(ids, settingsRef.current.concurrency, runEdit);
    }

    function setAlphaMode(id, mode) {
      patchEdit(id, { alphaMode: mode, alphaModeTouched: true });
      var e = editsRef.current[id] || {};
      reapplyAlpha(id, mode, e.tolerance === undefined ? DEFAULT_TOLERANCE : e.tolerance);
    }
    function setTolerance(id, value) {
      patchEdit(id, { tolerance: value, toleranceTouched: true });
      reapplyAlpha(id, (editsRef.current[id] || {}).alphaMode || "raw", value);
    }
    function setFitMode(id, mode) {
      patchEdit(id, { fitMode: mode });
      var l = findLayer(docRef.current, id);
      if (l && l.preEditBox) updateLayer(id, boxForFit(l.preEditBox, l.editedAspect, mode));
    }

    async function downloadLayer(id) {
      var l = findLayer(doc, id);
      if (!l) return;
      try { triggerDownload(await (await fetch(l.url)).blob(), modelLabel(settings.model) + " Layer Separation", "png"); }
      catch (err) { errS[1]("Download failed: " + err.message); }
    }
    async function downloadBase() {
      if (!doc) return;
      try { triggerDownload(await (await fetch(doc.base.url)).blob(), modelLabel(settings.model) + " Layer Separation", extOf(doc.base.url)); }
      catch (err) { errS[1]("Download failed: " + err.message); }
    }
    async function downloadAll() {
      if (!doc) return;
      errS[1]("");
      zipS[1](true);
      try {
        var baseName = "base." + extOf(doc.base.url);
        var files = [{ name: baseName, bytes: await bytesFromUrl(doc.base.url) }];
        var manifest = { base: { file: baseName, width: doc.base.width, height: doc.base.height }, layers: [] };
        for (var i = 0; i < doc.layers.length; i++) {
          var l = doc.layers[i], name = layerFilename(l, i, "png");
          files.push({ name: name, bytes: await bytesFromUrl(l.url) });
          manifest.layers.push({ file: name, stack_order: i, z_index: l.zIndex, name: l.name, description: l.description,
            visible: l.visible, edited: !!l.editedFrom,
            box: { x: Math.round(l.x), y: Math.round(l.y), width: Math.round(l.w), height: Math.round(l.h) },
            original_box: { x: Math.round(l.origin.x), y: Math.round(l.origin.y), width: Math.round(l.origin.w), height: Math.round(l.origin.h) } });
        }
        files.push({ name: "manifest.json", bytes: new TextEncoder().encode(JSON.stringify(manifest, null, 2)) });
        triggerDownload(buildZip(files), modelLabel(settings.model) + " Layer Separation", "zip");
      } catch (err) { errS[1]("Could not package the layers: " + err.message); }
      finally { zipS[1](false); }
    }

    async function compositeBlob() {
      var canvas = document.createElement("canvas");
      canvas.width = doc.base.width; canvas.height = doc.base.height;
      var ctx = canvas.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      if (doc.showBase) ctx.drawImage(await loadImage(doc.base.url), 0, 0, canvas.width, canvas.height);
      for (var i = 0; i < doc.layers.length; i++) {
        var l = doc.layers[i];
        if (!l.visible) continue;
        ctx.globalAlpha = l.opacity;
        ctx.drawImage(await loadImage(l.url), l.x, l.y, l.w, l.h);
      }
      ctx.globalAlpha = 1;
      return canvas;
    }
    async function exportComposite() {
      if (!doc) return;
      try {
        var canvas = await compositeBlob();
        var blob = await new Promise(function (r) { canvas.toBlob(r, "image/png"); });
        triggerDownload(blob, modelLabel(settings.model) + " Layer Separation", "png");
      } catch (err) { errS[1]("Export failed: " + err.message); }
    }
    async function sendComposite(tool) {
      if (!doc) return;
      try {
        var url = await saveImage((await compositeBlob()).toDataURL("image/png"), "composite");
        sendToTool(tool, { url: url, name: "layers-composite" });
      } catch (err) { errS[1]("Could not send the composite: " + err.message); }
    }

    return (
      <div className="sd-root sd-tool sd-layers">
        {errS[0] ? (
          <div className="sd-banner sd-banner-error"><span>{errS[0]}</span><button onClick={function () { errS[1](""); }}>×</button></div>
        ) : null}
        <div className="sd-layer-top">
          <section className="sd-panel sd-source sd-layer-setup">
            <div className="sd-layer-setup-grid">
              <div className="sd-source-col">
                <SectionTitle num="01">Source image</SectionTitle>
                <Dropzone onFiles={pickSource}>
                  {source ? (
                    <React.Fragment>
                      <img src={source.url} alt="source" />
                      <div className="sd-dropzone-meta">{source.width} × {source.height} · click to replace</div>
                    </React.Fragment>
                  ) : uploadS[0] ? <strong>Uploading…</strong> : null}
                </Dropzone>
                {source && source.warning ? <p className="sd-notice sd-notice-warn">{source.warning}</p> : null}
              </div>
              <div className="sd-source-col">
                <SectionTitle num="02" aside="optional">Layer instructions</SectionTitle>
                <textarea className="sd-field sd-layer-instructions" value={instructionS[0]}
                          placeholder={"Say how to split the image, e.g. “separate each character, the sign and the background sky”.\nOr name regions: <bbox>x1 y1 x2 y2</bbox> (0–999). Leave empty to let the model decide."}
                          onChange={function (e) { instructionS[1](e.target.value); }} />
              </div>
            </div>
            <div className="sd-layer-actions">
              <Select label="Separation model" hint={settings.model === "5.5" ? "Up to 99 layers" : "Up to 16 layers · Flash is faster"} value={settings.model}
                      onChange={function (v) { setSettings({ model: v }); }}
                      options={MODELS.map(function (m) { return { value: m.id, label: m.label + " — " + m.hint }; })} />
              {settings.model === "5.5" ? (
                <React.Fragment>
                  <label className="sd-setting">
                    <span className="sd-setting-label">Max images<em>base + layers</em></span>
                    <input type="number" min="2" max="100" step="1" value={settings.maxLayers}
                           title="Base image + layers, 2–100. Higher splits finer."
                           onChange={function (e) { setSettings({ maxLayers: e.target.value }); }}
                           onBlur={function () { setSettings({ maxLayers: clampLayers(settings.maxLayers) }); }} />
                  </label>
                  <Check label="Text recognition" checked={!!settings.textRecognition}
                         title="Return rich-text OCR (font, colour, bold, italic…) for formatted text layers"
                         onChange={function (v) { setSettings({ textRecognition: v }); }} />
                </React.Fragment>
              ) : null}
              <button className="sd-btn sd-btn-ghost" disabled={(!source && !doc && !instructionS[0]) || busyS[0] === "decompose"}
                      title="Clear the image, instructions and layers to try a new one"
                      onClick={function () {
                        if (doc && !window.confirm("Clear this image and its layers to start a new one? Saved layer files stay in outputs/.")) return;
                        sourceS[1](null); instructionS[1](""); docS[1](null); editsS[1]({}); selS[1](null); errS[1]("");
                      }}>Clear and start new</button>
              <button className="sd-btn sd-btn-primary" disabled={!source || busyS[0] === "decompose"} onClick={separateLayers}>
                {busyS[0] === "decompose" ? "Separating… (60–120 s)" : "Separate layers"}
              </button>
            </div>
          </section>
          <div className="sd-canvas-col">
            <LayerCanvas doc={doc} selectedId={selectedId} onSelect={selS[1]} onGeometry={updateLayer} />
            {doc ? (
              <div className="sd-image-actions sd-canvas-actions">
                <span className="sd-muted">Composite:</span>
                <button className="sd-btn sd-btn-ghost sd-btn-small" onClick={exportComposite}>Export PNG</button>
                <button className="sd-btn sd-btn-ghost sd-btn-small" onClick={function () { sendComposite("edit"); }}>Interactive edit</button>
                <button className="sd-btn sd-btn-ghost sd-btn-small" onClick={function () { sendComposite("image"); }}>Use as reference</button>
              </div>
            ) : null}
          </div>
        </div>
        <div className="sd-two-col">
          <LayersPanel layers={(doc && doc.layers) || []} base={doc && doc.base} edits={edits} showBase={doc ? doc.showBase : true}
            selectedId={selectedId} zipping={zipS[0]} onSelect={selS[1]}
            onToggle={function (id) { var l = findLayer(doc, id); updateLayer(id, { visible: !l.visible }); }}
            onToggleBase={function () { docS[1](Object.assign({}, doc, { showBase: !doc.showBase })); }}
            onReorder={reorderLayer} onDownloadLayer={downloadLayer} onDownloadBase={downloadBase}
            onDownloadAll={downloadAll} onExport={exportComposite} onResetAll={resetAll} />
          <EditPanel layer={selectedLayer} edit={selectedEdit} settings={settings} pendingCount={pendingCount}
            isPending={isEditPending(selectedEdit)} runningCount={runningCount} onPatch={patchEdit}
            onAddReferences={addReferences} onRemoveReference={removeReference} onAlphaMode={setAlphaMode}
            onFitMode={setFitMode} onTolerance={setTolerance} onRun={runEdit} onRunAll={runAllEdits}
            onRevert={revertPixels} onResetGeometry={resetGeometry} />
        </div>
      </div>
    );
  }

  // =====================================================================
  // 3. INTERACTIVE EDIT — points, boxes and free-form marks
  // =====================================================================
  // Coordinates are normalized per image to 0–999 (top-left 0,0; bottom-right
  // 999,999) and written into the prompt as `Image N <point>x y</point>` or
  // `Image N <bbox>x1 y1 x2 y2</bbox>`. Free-form marks are painted onto the
  // image that is sent, and described in words ("the area circled in red").
  var MARK_COLOURS = ["#ff2d55", "#2563eb", "#16a34a", "#f59e0b"];
  var EDIT_EXAMPLES = [
    "Replace the object at Image 1 <bbox>x1 y1 x2 y2</bbox> with a crown.",
    "Replace the area <bbox>x1 y1 x2 y2</bbox> in Image 1 with a garden, and keep everything else unchanged.",
    "Place the subject from Image 1 <bbox>…</bbox> at the position in Image 2 <bbox>…</bbox>.",
    "Edit the image based on the hand-drawn marks: add a ceramic coffee cup in the area circled in red. Remove all marks. Keep the composition unchanged.",
  ];

  function defaultEditState() {
    return {
      settings: { model: "pro", size: "2K", outputFormat: "png", fastMode: false, watermark: false },
      prompt: "",
      images: [],
      tool: "bbox",
      markColour: MARK_COLOURS[0],
      results: [],
    };
  }

  function norm(v) { return clamp(Math.round(v * 1000), 0, 999); }

  function annotationToken(ann, label) {
    return label + " " + (ann.type === "point"
      ? "<point>" + ann.x + " " + ann.y + "</point>"
      : "<bbox>" + ann.x1 + " " + ann.y1 + " " + ann.x2 + " " + ann.y2 + "</bbox>");
  }

  function EditImageCard(props) {
    var image = props.image, tool = props.tool, label = props.label;
    var overlayRef = useRef(null);
    // The gesture in progress lives in a ref: pointer events can arrive faster
    // than React re-renders, and a handler reading state from its closure would
    // see a stale (or null) draft and drop the stroke. The tick only repaints.
    var draftRef = useRef(null);
    var tick = useState(0);
    var draft = draftRef.current;
    function setDraft(d) { draftRef.current = d; tick[1](function (n) { return n + 1; }); }
    // Marks are stored as a fraction of the image's longer side; on screen they are drawn
    // at that fraction of the displayed image, so what you see matches what is sent.
    var stageRef = useRef(null);
    var stageSide = useState(0);
    useEffect(function () {
      var node = stageRef.current;
      if (!node) return undefined;
      var obs = new ResizeObserver(function (en) { var b = en[0].contentRect; stageSide[1](Math.max(b.width, b.height)); });
      obs.observe(node);
      return function () { obs.disconnect(); };
    }, []);
    function px(w) { return stageSide[0] ? Math.max(1.5, (w || 0.008) * stageSide[0]) : 4; }

    function rel(e) {
      var r = overlayRef.current.getBoundingClientRect();
      return { x: clamp((e.clientX - r.left) / r.width, 0, 1), y: clamp((e.clientY - r.top) / r.height, 0, 1) };
    }
    function down(e) {
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      var p = rel(e);
      if (tool === "bbox") setDraft({ type: "bbox", start: p, cur: p });
      if (tool === "circle") setDraft({ type: "circle", start: p, cur: p });
      if (tool === "brush") setDraft({ type: "brush", points: [[p.x, p.y]] });
    }
    function move(e) {
      var d = draftRef.current;
      if (!d) return;
      var p = rel(e);
      if (d.type === "bbox" || d.type === "circle") setDraft(Object.assign({}, d, { cur: p }));
      else setDraft(Object.assign({}, d, { points: d.points.concat([[p.x, p.y]]) }));
    }
    function up() {
      var d = draftRef.current;
      if (!d) return;
      if (d.type === "bbox") {
        var x1 = Math.min(d.start.x, d.cur.x), x2 = Math.max(d.start.x, d.cur.x);
        var y1 = Math.min(d.start.y, d.cur.y), y2 = Math.max(d.start.y, d.cur.y);
        if (x2 - x1 > 0.01 && y2 - y1 > 0.01) props.onAnnotate({ type: "bbox", x1: norm(x1), y1: norm(y1), x2: norm(x2), y2: norm(y2) });
      } else if (d.type === "circle") {
        // A circle is a painted mark like the marker: an ellipse through the dragged box.
        var cx = (d.start.x + d.cur.x) / 2, cy = (d.start.y + d.cur.y) / 2;
        var rx = Math.abs(d.cur.x - d.start.x) / 2, ry = Math.abs(d.cur.y - d.start.y) / 2;
        if (rx > 0.005 && ry > 0.005) {
          var pts = [];
          for (var k = 0; k <= 64; k++) { var a = (k / 64) * Math.PI * 2; pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); }
          props.onStroke({ id: uid(), colour: props.markColour, width: props.markWidth || 0.008, points: pts });
        }
      } else if (d.points.length > 1) {
        props.onStroke({ id: uid(), colour: props.markColour, width: props.markWidth || 0.008, points: d.points });
      }
      setDraft(null);
    }

    var strokes = image.strokes || [];
    var anns = image.annotations || [];
    return (
      <div className="sd-edit-card">
        <div className="sd-edit-card-head">
          <strong>{label}</strong>
          <span className="sd-muted">{image.width}×{image.height}</span>
          <span className="sd-grow" />
          {strokes.length ? <button className="sd-link" onClick={props.onClearStrokes}>Clear marks</button> : null}
          <button className="sd-link" disabled={props.index === 0} title="Move earlier (renumbers images)" onClick={function () { props.onMove(-1); }}>◀</button>
          <button className="sd-link" disabled={props.isLast} title="Move later (renumbers images)" onClick={function () { props.onMove(1); }}>▶</button>
          <button className="sd-x" title="Remove image" onClick={props.onRemove}>×</button>
        </div>
        <div className={"sd-edit-stage sd-tool-" + tool} ref={stageRef}>
          <img src={image.url} alt={label} draggable={false} />
          <svg className="sd-edit-svg" viewBox="0 0 1000 1000" preserveAspectRatio="none">
            {strokes.map(function (s) {
              return <polyline key={s.id} points={s.points.map(function (p) { return p[0] * 1000 + "," + p[1] * 1000; }).join(" ")}
                               fill="none" stroke={s.colour} strokeWidth={px(s.width)} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />;
            })}
            {draft && draft.type === "brush" ? (
              <polyline points={draft.points.map(function (p) { return p[0] * 1000 + "," + p[1] * 1000; }).join(" ")}
                        fill="none" stroke={props.markColour} strokeWidth={px(props.markWidth)} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            ) : null}
            {anns.filter(function (a) { return a.type === "bbox"; }).map(function (a) {
              return <rect key={a.id} x={a.x1} y={a.y1} width={a.x2 - a.x1} height={a.y2 - a.y1} fill="rgba(37,99,235,.12)"
                           stroke="#2563eb" strokeWidth="2" vectorEffect="non-scaling-stroke" />;
            })}
            {draft && draft.type === "circle" ? (
              <ellipse cx={(draft.start.x + draft.cur.x) * 500} cy={(draft.start.y + draft.cur.y) * 500}
                       rx={Math.abs(draft.cur.x - draft.start.x) * 500} ry={Math.abs(draft.cur.y - draft.start.y) * 500}
                       fill="none" stroke={props.markColour} strokeWidth={px(props.markWidth)} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
            ) : null}
            {draft && draft.type === "bbox" ? (
              <rect x={Math.min(draft.start.x, draft.cur.x) * 1000} y={Math.min(draft.start.y, draft.cur.y) * 1000}
                    width={Math.abs(draft.cur.x - draft.start.x) * 1000} height={Math.abs(draft.cur.y - draft.start.y) * 1000}
                    fill="rgba(37,99,235,.10)" stroke="#2563eb" strokeWidth="2" strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
            ) : null}
          </svg>
          {anns.map(function (a) {
            var left = (a.type === "point" ? a.x : a.x1) / 10, top = (a.type === "point" ? a.y : a.y1) / 10;
            return <span key={a.id} className={"sd-ann-badge" + (a.type === "point" ? " is-point" : "")} style={{ left: left + "%", top: top + "%" }}>{a.n}</span>;
          })}
          <div ref={overlayRef} className="sd-edit-overlay" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
        </div>
        {anns.length ? (
          <div className="sd-ann-list">
            {anns.map(function (a) {
              var token = annotationToken(a, label);
              return (
                <span key={a.id} className="sd-ann-chip">
                  <b>{a.n}</b> <code>{token.replace(label + " ", "")}</code>
                  <button className="sd-link" title="Insert into the prompt" onClick={function () { props.onInsert(token); }}>insert</button>
                  <button className="sd-x" title="Remove marker (and its text in the prompt)" onClick={function () { props.onRemoveAnnotation(a.id, token); }}>×</button>
                </span>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  }

  /* The image as sent: marks painted on at the image's own resolution. */
  async function flattenWithStrokes(image) {
    if (!(image.strokes || []).length) return image.url;
    var img = await loadImage(image.url);
    var w = img.naturalWidth, h = img.naturalHeight;
    var canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    image.strokes.forEach(function (s) {
      ctx.strokeStyle = s.colour;
      ctx.lineWidth = Math.max(3, s.width * Math.max(w, h));
      ctx.beginPath();
      s.points.forEach(function (p, i) { if (i === 0) ctx.moveTo(p[0] * w, p[1] * h); else ctx.lineTo(p[0] * w, p[1] * h); });
      ctx.stroke();
    });
    return canvas.toDataURL("image/png");
  }

  function EditTool(props) {
    var s = Object.assign(defaultEditState(), props.state || {});
    s.settings = Object.assign(defaultEditState().settings, s.settings || {});
    var update = props.update;
    function set(patch) {
      update(function (prev) {
        var base = Object.assign(defaultEditState(), prev || {});
        return Object.assign({}, base, typeof patch === "function" ? patch(base) : patch);
      });
    }
    var promptRef = useRef(null);
    var errS = useState("");
    var uploadS = useState(false);

    function addImages(list) {
      set(function (prev) {
        var images = (prev.images || []).concat(list.map(function (it) {
          return { id: uid(), url: it.url, name: it.name || "image", width: it.width || 0, height: it.height || 0, annotations: [], strokes: [], nextN: 1 };
        }));
        return { images: images.slice(0, MAX_INPUT_IMAGES) };
      });
      list.forEach(function (it) {
        if (it.width) return;
        loadImage(it.url).then(function (img) {
          set(function (prev) { return { images: prev.images.map(function (x) { return x.url === it.url && !x.width ? Object.assign({}, x, { width: img.naturalWidth, height: img.naturalHeight }) : x; }) }; });
        }).catch(function () {});
      });
    }
    useHandoff("edit", addImages);

    async function upload(files) {
      errS[1]("");
      uploadS[1](true);
      try {
        var room = MAX_INPUT_IMAGES - s.images.length, added = [];
        for (var i = 0; i < Math.min(room, files.length); i++) added.push(await uploadImageFile(files[i], { maxSide: 4096, hint: "edit" }));
        addImages(added);
        if (files.length > room) errS[1]("At most " + MAX_INPUT_IMAGES + " images per edit.");
      } catch (err) { errS[1](err.message); }
      finally { uploadS[1](false); }
    }

    function insertText(text) {
      var el = promptRef.current;
      set(function (prev) {
        var p = prev.prompt || "";
        var at = el && document.activeElement === el ? el.selectionStart : p.length;
        var before = p.slice(0, at), after = p.slice(at);
        var pad = before && !/\s$/.test(before) ? " " : "";
        return { prompt: before + pad + text + (after && !/^\s/.test(after) ? " " : "") + after };
      });
    }

    function patchImage(id, fn) {
      set(function (prev) { return { images: prev.images.map(function (x) { return x.id === id ? Object.assign({}, x, fn(x)) : x; }) }; });
    }

    function annotate(image, label, ann) {
      var n = image.nextN || ((image.annotations || []).length + 1);
      var full = Object.assign({ id: uid(), n: n }, ann);
      patchImage(image.id, function (x) { return { annotations: (x.annotations || []).concat([full]), nextN: n + 1 }; });
      insertText(annotationToken(full, label));
    }

    function removeAnnotation(image, annId, token) {
      patchImage(image.id, function (x) { return { annotations: x.annotations.filter(function (a) { return a.id !== annId; }) }; });
      set(function (prev) { return { prompt: (prev.prompt || "").split(token).join("").replace(/[ \t]{2,}/g, " ").trim() }; });
    }

    /* Renumber "Image N" mentions in the prompt when the image order changes. */
    function reorderImages(next, mapping) {
      set(function (prev) {
        var prompt = (prev.prompt || "").replace(/Image\s+(\d+)/g, function (m, n) {
          var to = mapping[Number(n)];
          return to ? "Image " + to : m;
        });
        return { images: next, prompt: prompt };
      });
    }
    function moveImage(index, dir) {
      var to = index + dir;
      if (to < 0 || to >= s.images.length) return;
      var next = s.images.slice();
      var tmp = next[index]; next[index] = next[to]; next[to] = tmp;
      var mapping = {}; mapping[index + 1] = to + 1; mapping[to + 1] = index + 1;
      reorderImages(next, mapping);
    }
    function removeImage(index) {
      var next = s.images.filter(function (_, i) { return i !== index; });
      var mapping = {};
      for (var k = index + 2; k <= s.images.length; k++) mapping[k] = k - 1;
      reorderImages(next, mapping);
    }

    var hasStrokes = s.images.some(function (im) { return (im.strokes || []).length; });
    var running = s.results.some(function (r) { return r.status === "running" && inFlight[r.id]; });

    async function generate() {
      var prompt = (s.prompt || "").trim();
      if (!prompt || !s.images.length) return;
      var id = uid(), write = update, settings = s.settings;
      var snapshot = s.images.map(function (im) { return { url: im.url, name: im.name, marked: !!(im.strokes || []).length }; });
      var entry = { id: id, status: "running", prompt: prompt, model: settings.model, inputs: snapshot, createdAt: Date.now(), images: [] };
      inFlight[id] = true;
      function patchResult(p) {
        write(function (prev) {
          var base = Object.assign(defaultEditState(), prev || {});
          return Object.assign({}, base, { results: base.results.map(function (r) { return r.id === id ? Object.assign({}, r, p) : r; }) });
        });
      }
      write(function (prev) {
        var base = Object.assign(defaultEditState(), prev || {});
        return Object.assign({}, base, { results: [entry].concat(base.results) });
      });
      try {
        var images = [];
        for (var i = 0; i < s.images.length; i++) images.push(await flattenWithStrokes(s.images[i]));
        var body = { model: settings.model, prompt: prompt, image: images.length === 1 ? images[0] : images, size: settings.size,
                     output_format: settings.outputFormat, watermark: !!settings.watermark, optimize_prompt_options: optimizeOptions(settings) };
        addBackground(body, settings);
        var data = await seedreamGenerate(body, "Interactive edit · " + modelLabel(settings.model), prompt.slice(0, 160));
        var out = (data.data || []).map(function (it) { return { url: itemUrl(it), size: it.size || "" }; }).filter(function (x) { return x.url; });
        if (!out.length) throw new Error("The edit returned no image.");
        patchResult({ status: "done", images: out });
      } catch (err) {
        patchResult({ status: "error", error: err.message });
      } finally {
        delete inFlight[id];
      }
    }

    function continueFrom(url, replaceIndex) {
      loadImage(url).then(function (img) {
        set(function (prev) {
          var item = { id: uid(), url: url, name: "edit result", width: img.naturalWidth, height: img.naturalHeight, annotations: [], strokes: [], nextN: 1 };
          var images = prev.images.slice();
          if (replaceIndex !== undefined && images[replaceIndex]) images[replaceIndex] = item; else images.push(item);
          return { images: images.slice(0, MAX_INPUT_IMAGES) };
        });
      });
    }

    var tools = [
      { id: "bbox", label: "▭ Box", hint: "Drag a box → <bbox>" },
      { id: "circle", label: "◯ Circle", hint: "Drag to circle an area in the marker colour" },
      { id: "brush", label: "✎ Marker", hint: "Draw free-form marks on the image" },
    ];
    // Older states may still have the removed point tool selected.
    var activeTool = s.tool === "point" ? "bbox" : s.tool;

    return (
      <div className="sd-root sd-tool">
        <section className="sd-panel">
          <div className="sd-toolbar">
            <SectionTitle num="01" aside={s.images.length + " / " + MAX_INPUT_IMAGES}>Images</SectionTitle>
            <div className="sd-chips">
              {tools.map(function (t) {
                return <button key={t.id} title={t.hint} className={"sd-chip" + (activeTool === t.id ? " is-on" : "")} onClick={function () { set({ tool: t.id }); }}>{t.label}</button>;
              })}
              {activeTool !== "bbox" ? MARK_COLOURS.map(function (c) {
                return <button key={c} className={"sd-swatch" + (s.markColour === c ? " is-on" : "")} style={{ background: c }} title="Mark colour" onClick={function () { set({ markColour: c }); }} />;
              }) : null}
              {activeTool !== "bbox" ? (
                <label className="sd-thickness" title="Marker thickness">
                  <span>Thickness</span>
                  <input type="range" min="0.002" max="0.04" step="0.001" value={s.markWidth || 0.008}
                         onChange={function (e) { set({ markWidth: Number(e.target.value) }); }} />
                  <span className="sd-thickness-dot" style={{ width: Math.round(4 + (s.markWidth || 0.008) * 500) + "px", height: Math.round(4 + (s.markWidth || 0.008) * 500) + "px", background: s.markColour }}></span>
                </label>
              ) : null}
            </div>
          </div>
          <p className="sd-help">
            {activeTool === "bbox" ? "Drag a box on an image — its normalized coordinates (0–999) go into the prompt as Image N <bbox>x1 y1 x2 y2</bbox>."
              : activeTool === "circle" ? "Drag on an image to circle the area to change, then describe it by colour (“the area circled in red”). Circles are painted onto the image that is sent; ask the model to remove them."
              : "Draw on an image to mark the area to change, then describe it by colour (“the area circled in red”). Marks are painted onto the image that is sent; ask the model to remove them."}
          </p>
          <div className="sd-edit-grid">
            {s.images.map(function (im, i) {
              var label = "Image " + (i + 1);
              return (
                <EditImageCard key={im.id} image={im} index={i} isLast={i === s.images.length - 1} label={label} tool={activeTool} markColour={s.markColour} markWidth={s.markWidth || 0.008}
                  onAnnotate={function (ann) { annotate(im, label, ann); }}
                  onStroke={function (st) { patchImage(im.id, function (x) { return { strokes: (x.strokes || []).concat([st]) }; }); }}
                  onClearStrokes={function () { patchImage(im.id, function () { return { strokes: [] }; }); }}
                  onRemoveAnnotation={function (annId, token) { removeAnnotation(im, annId, token); }}
                  onInsert={insertText}
                  onMove={function (d) { moveImage(i, d); }}
                  onRemove={function () { removeImage(i); }} />
              );
            })}
            {s.images.length < MAX_INPUT_IMAGES ? (
              <div className={s.images.length ? "" : "sd-edit-drop-full"}>
                <Dropzone multiple onFiles={upload} title={uploadS[0] ? "Uploading…" : s.images.length ? "Add images" : "Drop images here, or click to upload"} subtitle={"Up to " + MAX_INPUT_IMAGES + " · each becomes Image 1, Image 2, …"} />
              </div>
            ) : null}
          </div>

            <SectionTitle num="02">Edit instruction</SectionTitle>
            <textarea ref={promptRef} className="sd-field sd-mono" rows={6} value={s.prompt}
                      placeholder="e.g. Replace the object at Image 1 <bbox>420 360 620 560</bbox> with a crown."
                      onChange={function (e) { set({ prompt: e.target.value }); }} />
            <div className="sd-row-label">Patterns <em>click to insert</em></div>
            <div className="sd-examples">
              {EDIT_EXAMPLES.map(function (ex) {
                return <button key={ex} className="sd-example" onClick={function () { insertText(ex); }}>{ex}</button>;
              })}
            </div>
            <p className="sd-help">Tips: when a box holds several subjects, name the one you mean (“the person on the left”). To protect something, box it too and say “keep … unchanged”.</p>

            <SectionTitle num="03">Output</SectionTitle>
            <OutputSettings settings={s.settings} onChange={function (p) { set(function (prev) { return { settings: Object.assign({}, prev.settings, p) }; }); }} />
            {hasStrokes ? <p className="sd-notice">Marked images are sent with the marks painted on.</p> : null}
            {errS[0] ? <p className="sd-notice sd-notice-error">{errS[0]}</p> : null}
            <button className="sd-btn sd-btn-primary" disabled={!s.images.length || !(s.prompt || "").trim()} onClick={generate}>
              {running ? "Run another edit" : "Apply edit"}
            </button>
        </section>

        <section className="sd-panel">
          <SectionTitle aside={s.results.length ? String(s.results.length) : null}>Results</SectionTitle>
          {s.results.length === 0 ? <p className="sd-notice">Edited images appear here, next to their inputs.</p> : null}
          <div className="sd-results">
            {s.results.map(function (r) {
              var live = r.status === "running" && inFlight[r.id];
              return (
                <div className="sd-result sd-result-wide" key={r.id}>
                  <div className="sd-result-head">
                    <strong>{modelLabel(r.model)}</strong>
                    <span>{(r.inputs || []).length} input{(r.inputs || []).length === 1 ? "" : "s"}</span>
                    <span className="sd-result-status">{live ? <React.Fragment>Editing… <Elapsed since={r.createdAt} /></React.Fragment> : r.status === "running" ? "Interrupted" : r.status === "error" ? "Failed" : ""}</span>
                    {!live ? <button className="sd-x" title="Remove" onClick={function () { set(function (prev) { return { results: prev.results.filter(function (x) { return x.id !== r.id; }) }; }); }}>×</button> : null}
                  </div>
                  <p className="sd-result-prompt sd-mono">{r.prompt}</p>
                  {r.status === "error" ? <p className="sd-notice sd-notice-error">{r.error}</p> : null}
                  <div className="sd-before-after">
                    <div className="sd-inputs">
                      {(r.inputs || []).map(function (inp, i) {
                        return <div key={i} className="sd-input-thumb sd-checker" title={"Image " + (i + 1) + (inp.marked ? " (marked)" : "")}><img src={inp.url} alt="" /><span>{i + 1}</span></div>;
                      })}
                    </div>
                    <div className="sd-arrow">→</div>
                    <div className="sd-outputs">
                      {live ? <div className="sd-result-placeholder"><span className="sd-spinner" /></div> : null}
                      {(r.images || []).map(function (im, i) {
                        return (
                          <div key={i} className="sd-result-image">
                            <a href={im.url} onClick={function (e) { e.preventDefault(); if (window.openImageViewer) window.openImageViewer(im.url); }} style={{ cursor: "zoom-in" }} className="sd-checker"><img src={im.url} alt="" /></a>
                            <ImageActions url={im.url} model={r.model} name={"seedream-edit-" + r.id} except="edit"
                              extra={<React.Fragment>
                                <button className="sd-btn sd-btn-ghost sd-btn-small" title="Replace Image 1 with this result and keep editing" onClick={function () { continueFrom(im.url, 0); }}>Keep editing</button>
                                <button className="sd-btn sd-btn-ghost sd-btn-small" onClick={function () { continueFrom(im.url); }}>Add as input</button>
                              </React.Fragment>} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    );
  }

  // =================================================================== exports
  function headerStatus(state, kind) {
    var st = state || {};
    if (kind === "layers") {
      var doc = st.doc;
      return doc ? doc.layers.length + " layers" : (st.source ? "Image ready" : "Ready");
    }
    var results = st.results || [];
    if (results.some(function (r) { return r.status === "running" && inFlight[r.id]; })) return kind === "edit" ? "Editing…" : "Generating…";
    var done = results.filter(function (r) { return r.status === "done"; }).length;
    return done ? done + " result" + (done === 1 ? "" : "s") : "Ready";
  }

  window.SeedreamImageTool = ImageTool;
  window.SeedreamLayerTool = LayerTool;
  window.SeedreamEditTool = EditTool;
  window.seedreamHeaderStatus = headerStatus;
})();
