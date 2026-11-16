#!/usr/bin/env node
// Precompiles the frontend so the browser no longer downloads Babel (3 MB) and compiles
// ~1.2 MB of JSX on every page load.
//
//   node scripts/build-frontend.js           build what changed
//   node scripts/build-frontend.js --force   rebuild everything
//
// Output: static/build/<name>.js (+ .js.map) and static/build/manifest.json, which maps each
// source to the sha256 of the text it was built from. The server (content_creator/frontend.py)
// compares those hashes to decide whether the build is current, and runs this script itself
// when it is not.
//
// The compile options are the ones Babel standalone applies to each <script type="text/babel">
// tag (see transformScriptTags in static/babel.min.js), so the compiled code is the same code
// the browser produced before:
//   - static/*.jsx tags carry data-presets="react"   -> presets ["react"]
//   - the inline app (frontend/app.jsx) has none     -> presets ["react", "env"]
//   - plugins (no data-plugins on any tag)           -> class-properties, object-rest-spread, flow-strip-types
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "static", "build");
const MANIFEST = path.join(OUT_DIR, "manifest.json");
const PLUGINS = ["transform-class-properties", "transform-object-rest-spread", "transform-flow-strip-types"];

function sha256(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

// Every compiled unit, in page order: the static tools listed in the shell, then the app.
function units() {
  const shell = fs.readFileSync(path.join(ROOT, "frontend", "index.html"), "utf8");
  const list = [];
  for (const m of shell.matchAll(/<script type="text\/babel" data-presets="([^"]*)" src="\/static\/([^"]+)\.jsx"><\/script>/g)) {
    list.push({ name: m[2], src: path.join(ROOT, "static", m[2] + ".jsx"), url: `/static/${m[2]}.jsx`, presets: m[1].split(",").map((s) => s.trim()) });
  }
  list.push({ name: "app", src: path.join(ROOT, "frontend", "app.jsx"), url: "frontend/app.jsx", presets: ["react", "env"] });
  return list;
}

function loadBabel() {
  const ctx = vm.createContext({ window: {}, self: {}, console });
  ctx.global = ctx;
  vm.runInContext(fs.readFileSync(path.join(ROOT, "static", "babel.min.js"), "utf8"), ctx);
  return ctx.Babel || ctx.window.Babel;
}

function main() {
  const force = process.argv.includes("--force");
  fs.mkdirSync(OUT_DIR, { recursive: true });
  let manifest = {};
  try { manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8")); } catch (e) { manifest = {}; }

  let Babel = null;
  const next = {};
  let built = 0;
  let failed = 0;
  for (const u of units()) {
    const text = fs.readFileSync(u.src, "utf8");
    const hash = sha256(text);
    const outJs = path.join(OUT_DIR, u.name + ".js");
    if (!force && manifest[u.name] && manifest[u.name].hash === hash && fs.existsSync(outJs)) {
      next[u.name] = manifest[u.name];
      continue;
    }
    Babel = Babel || loadBabel();
    try {
      const res = Babel.transform(text, {
        filename: u.url, sourceFileName: u.url, presets: u.presets, plugins: PLUGINS,
        targets: { browsers: undefined }, sourceMaps: true, compact: true, comments: false,
      });
      fs.writeFileSync(outJs, res.code + `\n//# sourceMappingURL=${u.name}.js.map\n`);
      fs.writeFileSync(outJs + ".map", JSON.stringify(res.map));
      next[u.name] = { hash, out: u.name + ".js", version: sha256(res.code).slice(0, 12) };
      built++;
    } catch (e) {
      failed++;
      console.error(`FAIL ${path.relative(ROOT, u.src)}: ${e.message.split("\n")[0]}`);
    }
  }
  if (failed) process.exit(1); // keep the old manifest so the server sees the build as stale
  fs.writeFileSync(MANIFEST, JSON.stringify(next, null, 1));
  console.log(`frontend build: ${built} compiled, ${Object.keys(next).length - built} up to date`);
}

main();
