import re

import pytest

from content_creator import frontend


def test_babel_page_inlines_sources():
    html = frontend.babel_page()
    assert "<!--@include:" not in html
    assert frontend._read("app.jsx") in html
    assert html.count('<script type="text/babel">') == 1
    assert '<script src="/static/babel.min.js"></script>' in html


def test_compiled_page_swaps_every_babel_tag():
    shell = frontend._read("index.html")
    names = list(frontend._sources(shell))
    manifest = {n: {"hash": "x", "out": n + ".js", "version": "v1"} for n in names}
    html = frontend.compiled_page(manifest)
    assert "text/babel" not in html
    assert "babel.min.js" not in html
    srcs = re.findall(r'<script defer src="/static/build/([^"?]+)\.js\?v=v1"></script>', html)
    assert srcs == names  # page order kept, app last
    assert frontend._read("styles.css").splitlines()[0].strip() in html


def test_falls_back_to_babel_page_when_build_cannot_run(monkeypatch, tmp_path):
    monkeypatch.setattr(frontend, "MANIFEST", tmp_path / "missing.json")
    monkeypatch.setattr(frontend, "build", lambda: "Node.js was not found on PATH")
    assert frontend.current_page() == frontend.babel_page()


def test_frontend_mode_babel(monkeypatch):
    monkeypatch.setattr(frontend, "get_env", lambda name, *a: "babel" if name == "FRONTEND_MODE" else "")
    assert frontend.current_page() == frontend.babel_page()


@pytest.mark.skipif(not frontend.shutil.which("node"), reason="needs Node")
def test_real_build_is_current_and_served():
    assert frontend.build() == ""
    html = frontend.current_page()
    assert "text/babel" not in html
    for out in re.findall(r'src="/static/build/([^"?]+)\?', html):
        assert (frontend.BUILD_DIR / out).is_file()
