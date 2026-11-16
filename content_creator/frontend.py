"""Builds the page the server sends for "/".

Sources (frontend/):
  index.html  page shell: head, small inline helper scripts, a <script> tag per static/*.jsx tool
  styles.css  stylesheet, inlined into the shell's <style> tag
  app.jsx     main React app, inlined into the shell's <script type="text/babel"> tag

Two ways to serve them:
  compiled (default)  JSX precompiled by scripts/build-frontend.js into static/build/*.js. The page
                      loads plain scripts, so the browser skips Babel (3 MB) and the compile step.
  babel               the original page: the browser downloads Babel and compiles the JSX itself.

In the default mode the build is checked on every page load (sha256 of each source against
static/build/manifest.json) and rebuilt with Node when a source changed, so editing a .jsx file
and reloading the page works as before. If Node is missing or a build fails, the babel page is
served instead and the reason is logged. FRONTEND_MODE=babel forces the babel page.
"""
import hashlib
import json
import logging
import re
import shutil
import subprocess
import threading
from pathlib import Path

from content_creator.config.settings import get_env

ROOT = Path(__file__).resolve().parents[1]
FRONTEND_DIR = ROOT / "frontend"
BUILD_DIR = ROOT / "static" / "build"
MANIFEST = BUILD_DIR / "manifest.json"
BUILD_SCRIPT = ROOT / "scripts" / "build-frontend.js"
_STYLE_INDENT = " " * 6
_TOOL_TAG = re.compile(r'<script type="text/babel" data-presets="[^"]*" src="/static/([^"]+)\.jsx"></script>')
_BABEL_TAG = '<script src="/static/babel.min.js"></script>'

log = logging.getLogger("content_creator.frontend")
_build_lock = threading.Lock()
_last_problem = [None]


def _read(name: str) -> str:
    return (FRONTEND_DIR / name).read_text(encoding="utf-8")


def _shell_with_css() -> str:
    css = "\n".join(_STYLE_INDENT + line if line else line for line in _read("styles.css").split("\n"))
    return _read("index.html").replace("<!--@include:styles.css-->", "\n" + css + "    ", 1)


def babel_page() -> str:
    """The original page: inline app JSX compiled in the browser by Babel."""
    return _shell_with_css().replace("<!--@include:app.jsx-->", "\n" + _read("app.jsx") + "    ", 1)


def _sources(shell: str) -> dict:
    files = {m.group(1): ROOT / "static" / (m.group(1) + ".jsx") for m in _TOOL_TAG.finditer(shell)}
    files["app"] = FRONTEND_DIR / "app.jsx"
    return files


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _manifest() -> dict:
    try:
        return json.loads(MANIFEST.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def _current(manifest: dict, sources: dict) -> bool:
    for name, path in sources.items():
        entry = manifest.get(name)
        if not entry or entry.get("hash") != _sha256(path) or not (BUILD_DIR / entry.get("out", "")).is_file():
            return False
    return True


def build() -> str:
    """Runs the Node build. Returns "" on success, else the reason it could not build."""
    node = shutil.which("node")
    if not node:
        return "Node.js was not found on PATH"
    try:
        proc = subprocess.run([node, str(BUILD_SCRIPT)], cwd=str(ROOT), capture_output=True, text=True, timeout=300)
    except (OSError, subprocess.TimeoutExpired) as e:
        return f"frontend build could not run: {e}"
    if proc.returncode != 0:
        return "frontend build failed: " + (proc.stderr or proc.stdout).strip()[:2000]
    log.info(proc.stdout.strip())
    return ""


def compiled_page(manifest: dict) -> str:
    """The shell with every Babel tag swapped for its precompiled script. `defer` keeps the
    scripts in page order and runs them after the document is parsed, as Babel did."""
    def tool(m):
        entry = manifest[m.group(1)]
        return f'<script defer src="/static/build/{entry["out"]}?v={entry["version"]}"></script>'

    shell = _TOOL_TAG.sub(tool, _shell_with_css())
    shell = shell.replace("    " + _BABEL_TAG + "\n", "", 1)
    app = manifest["app"]
    start = shell.index('<script type="text/babel">')
    end = shell.index("</script>", start) + len("</script>")
    return shell[:start] + f'<script defer src="/static/build/{app["out"]}?v={app["version"]}"></script>' + shell[end:]


def _report(problem) -> None:
    if problem != _last_problem[0]:
        if problem:
            log.warning("Serving the in-browser Babel page (slower to load). %s", problem)
        _last_problem[0] = problem


def current_page() -> str:
    """The page for "/" (see the module docstring)."""
    if (get_env("FRONTEND_MODE") or "").strip().lower() == "babel":
        return babel_page()
    try:
        sources = _sources(_read("index.html"))
        with _build_lock:
            manifest = _manifest()
            if not _current(manifest, sources):
                problem = build()
                manifest = _manifest()
                if not problem and not _current(manifest, sources):
                    problem = "frontend build finished but its output does not match the sources"
                if problem:
                    _report(problem)
                    return babel_page()
        _report(None)
        return compiled_page(manifest)
    except Exception as e:  # never let the build path take the UI down
        _report(f"frontend build check failed: {e}")
        return babel_page()


def prebuild() -> None:
    """Brings the build up to date at startup so the first page load is fast."""
    if (get_env("FRONTEND_MODE") or "").strip().lower() != "babel":
        current_page()
