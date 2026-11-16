/* skill-library.jsx — workspace Skill Library: every skill document, searchable.
 *
 * Lists .claude/skills/ (via /api/skills/list),
 * enriched with the app's SKILL_CATALOG (label, hint, project type) and how many
 * projects have each skill selected. Uses the app's own design classes.
 */
(function () {
  "use strict";
  var useState = React.useState, useEffect = React.useEffect;

  function post(path, body) {
    return fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || ("HTTP " + r.status)); return d; }); });
  }

  function kb(n) { return n >= 1024 ? (n / 1024).toFixed(n >= 10240 ? 0 : 1) + " KB" : n + " B"; }

  function SkillLibrary(props) {
    var catalog = props.catalog || [];
    var projects = props.projects || [];
    var types = props.projectTypes || [];
    var listS = useState(null), errS = useState(""), queryS = useState(""), libS = useState("all");
    var openS = useState({}), textS = useState({});

    useEffect(function () {
      post("/api/skills/list").then(function (d) { listS[1](d); }).catch(function (e) { errS[1](e.message); });
    }, []);

    var byId = {};
    catalog.forEach(function (c) { byId[c.id] = c; });
    var usage = {};
    projects.forEach(function (p) { (p.skills || []).forEach(function (id) { (usage[id] = usage[id] || []).push(p.name); }); });
    var typeLabel = function (k) { if (k === "universal") return "Every project"; var t = types.filter(function (x) { return x.key === k; })[0]; return t ? t.label : k; };

    var data = listS[0];
    var alwaysOn = data ? data.always_on : "sd25_pe_skill";
    var skills = (data ? data.skills : []).map(function (s) {
      var c = byId[s.id];
      return Object.assign({}, s, {
        label: c ? c.label : s.name,
        hint: c ? c.hint : s.description,
        projectType: c ? c.projectType : "",
        library: c ? c.library : (s.library === "Claude Code skills" ? "Claude Code (live copies)" : s.library),
        inCatalog: !!c,
      });
    });
    var libraries = [];
    skills.forEach(function (s) { if (libraries.indexOf(s.library) < 0) libraries.push(s.library); });
    var terms = queryS[0].trim().toLowerCase().split(/\s+/).filter(Boolean);
    var visible = skills.filter(function (s) {
      if (libS[0] !== "all" && s.library !== libS[0]) return false;
      var hay = [s.label, s.name, s.id, s.hint, s.library, typeLabel(s.projectType)].join(" ").toLowerCase();
      return terms.every(function (t) { return hay.indexOf(t) >= 0; });
    });

    function toggle(id) {
      var open = Object.assign({}, openS[0]);
      if (open[id]) { delete open[id]; openS[1](open); return; }
      open[id] = true; openS[1](open);
      if (!textS[0][id]) {
        post("/api/skills/get", { id: id }).then(function (d) {
          textS[1](function (prev) { var n = Object.assign({}, prev); n[id] = d.text; return n; });
        }).catch(function (e) {
          textS[1](function (prev) { var n = Object.assign({}, prev); n[id] = "Could not load: " + e.message; return n; });
        });
      }
    }

    var grouped = {};
    visible.forEach(function (s) { (grouped[s.library] = grouped[s.library] || []).push(s); });

    return (
      <div className="card">
        <div className="video-hint" style={{ marginTop: 0, marginBottom: 12 }}>
          Every skill in this workspace. In a project, the skills you tick under <b>Skills</b> are added to the
          <b> Seedance 2.5 Optimizer</b> when Video Generation and Long Duration write the prompt; with none ticked, only the
          Seedance 2.5 Optimizer is used. Large selections are sent as condensed digests (written once per skill and cached).
        </div>
        <div className="proj-filter-row">
          <div className="proj-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input className="video-input sa-input" placeholder="Search skills by name, purpose or library…" value={queryS[0]}
                   onChange={function (e) { queryS[1](e.target.value); }} onKeyDown={function (e) { if (e.key === "Escape") queryS[1](""); }} />
            {queryS[0] ? <button className="proj-search-clear" onClick={function () { queryS[1](""); }}>×</button> : null}
          </div>
        </div>
        <div className="tabs" style={{ margin: "10px 0 0" }}>
          <button className={"tab-btn" + (libS[0] === "all" ? " active" : "")} onClick={function () { libS[1]("all"); }}>All · {skills.length}</button>
          {libraries.map(function (lib) {
            var n = skills.filter(function (s) { return s.library === lib; }).length;
            return <button key={lib} className={"tab-btn" + (libS[0] === lib ? " active" : "")} onClick={function () { libS[1](libS[0] === lib ? "all" : lib); }}>{lib} · {n}</button>;
          })}
        </div>
        {errS[0] ? <div className="error-box">{errS[0]}</div> : null}
        {!data && !errS[0] ? <div className="video-hint">Loading skills…</div> : null}
        {data && !visible.length ? <div className="video-hint">No skills match “{queryS[0]}”.</div> : null}

        {Object.keys(grouped).map(function (lib) {
          return (
            <React.Fragment key={lib}>
              <hr className="divider" />
              <div className="field-label">{lib} · {grouped[lib].length}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 380px), 1fr))", gap: 10, alignItems: "start" }}>
                {grouped[lib].map(function (s) {
                  var used = usage[s.id] || [];
                  var isAlways = s.id === alwaysOn;
                  return (
                    <div key={s.id + s.path} className="ag-card" style={{ marginBottom: 0, gridColumn: openS[0][s.id] ? "1 / -1" : undefined }}>
                      <div className="ag-header">
                        <div style={{ minWidth: 0 }}>
                          <div className="ag-title">
                            {s.label}
                            {isAlways ? <span className="skill-badge skill-badge-on">Always on</span> : null}
                            {s.live ? <span className="skill-badge">Live in Claude Code</span> : null}
                            {!s.inCatalog && !isAlways ? <span className="skill-badge skill-badge-muted">Reference only</span> : null}
                          </div>
                          <div className="ag-count">
                            {s.projectType ? typeLabel(s.projectType) + " projects" : "Not offered in projects"} · {kb(s.chars)}
                            {s.inCatalog && !isAlways ? " · selected in " + used.length + " project" + (used.length === 1 ? "" : "s") : ""}
                          </div>
                        </div>
                        <div className="ab-actions">
                          <button className="btn-action btn-inline" onClick={function () { toggle(s.id); }}>{openS[0][s.id] ? "Hide" : "View skill"}</button>
                        </div>
                      </div>
                      <div className="ag-body">
                        <div className="skill-desc">{s.hint}</div>
                        <div className="skill-path">{s.path}</div>
                        {openS[0][s.id] ? (
                          <React.Fragment>
                            {used.length ? <div className="video-hint">Selected in: {used.slice(0, 12).join(", ")}{used.length > 12 ? " and " + (used.length - 12) + " more" : ""}</div> : null}
                            <pre className="skill-text">{textS[0][s.id] || "Loading…"}</pre>
                          </React.Fragment>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  window.SkillLibrary = SkillLibrary;
})();
