import json
import urllib.error
import urllib.request


def _get(url):
    try:
        with urllib.request.urlopen(url, timeout=10) as r:
            return r.status, dict(r.headers), r.read()
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read()


def _post(url, body):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status, json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        raw = e.read() or b"{}"
        try:
            return e.code, json.loads(raw)
        except ValueError:
            return e.code, {"raw": raw.decode("utf-8", "replace")}


def test_index_page(server):
    status, headers, body = _get(server["base"] + "/")
    assert status == 200
    assert b"test page" in body


def test_static_file_and_traversal(server):
    status, _, body = _get(server["base"] + "/static/babel.min.js")
    assert status == 200 and len(body) > 1000
    status, _, _ = _get(server["base"] + "/static/..%2F..%2F.env")
    assert status == 404


def test_unknown_api_route(server):
    status, _ = _post(server["base"] + "/api/does-not-exist", {})
    assert status == 404


def test_skills_list_route(server):
    status, data = _post(server["base"] + "/api/skills/list", {})
    assert status == 200
    assert "sd25_pe_skill" in json.dumps(data)


def test_download_local_file_gets_project_model_name(server):
    (server["outputs"] / "abc123.png").write_bytes(b"\x89PNG fake")
    status, headers, body = _get(server["base"] + "/download?url=/files/abc123.png&name=My%20Film-Seedream%205.0.png")
    assert status == 200
    assert body == b"\x89PNG fake"
    disp = headers.get("Content-Disposition", "")
    assert 'filename="My Film-Seedream 5.0.png"' in disp
    assert "filename*=UTF-8''My%20Film-Seedream%205.0.png" in disp


def test_download_project_file(server):
    (server["projects"] / "proj").mkdir()
    (server["projects"] / "proj" / "clip.mp4").write_bytes(b"video")
    status, headers, body = _get(server["base"] + "/download?url=/project-files/proj/clip.mp4&name=P-Seedance%202.5.mp4")
    assert status == 200 and body == b"video"
    assert headers.get("Content-Type") == "video/mp4"


def test_download_rejects_traversal_and_bad_sources(server):
    assert _get(server["base"] + "/download?url=/files/../../.env&name=x")[0] == 404
    assert _get(server["base"] + "/download?url=/files/missing.png&name=x.png")[0] == 404
    assert _get(server["base"] + "/download?url=file:///etc/passwd&name=x")[0] == 400


def test_seed_audio_10_validation_route(server, monkeypatch):
    from content_creator.services import seed_audio_10 as sa10

    monkeypatch.setattr(sa10, "_api_key", lambda: "test-key")
    status, data = _post(server["base"] + "/api/seed-audio-10/generate", {"text_prompt": ""})
    assert status == 400 and data["error"] == "Write a prompt."



def test_index_html_callable(tmp_path):
    import threading
    import urllib.request
    from http.server import ThreadingHTTPServer

    from content_creator.api import server as srv

    pages = iter(["<p>one</p>", "<p>two</p>"])
    httpd = ThreadingHTTPServer(("127.0.0.1", 0), srv.make_handler(index_html=lambda: next(pages)))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    try:
        base = f"http://127.0.0.1:{httpd.server_address[1]}/"
        assert urllib.request.urlopen(base).read() == b"<p>one</p>"
        assert urllib.request.urlopen(base).read() == b"<p>two</p>"
    finally:
        httpd.shutdown()
        httpd.server_close()


def test_build_files_served_and_contained(server):
    from content_creator import frontend

    frontend.BUILD_DIR.mkdir(parents=True, exist_ok=True)
    probe = frontend.BUILD_DIR / "zz-test-probe.js"
    probe.write_text("var x=1;")
    try:
        status, headers, body = _get(server["base"] + "/static/build/zz-test-probe.js?v=abc")
        assert status == 200 and body == b"var x=1;"
    finally:
        probe.unlink()
    assert _get(server["base"] + "/static/build/..%2F..%2F.env")[0] == 404
