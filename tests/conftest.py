import sys
import threading
from http.server import ThreadingHTTPServer
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


@pytest.fixture
def server(tmp_path, monkeypatch):
    """A real Content Creator HTTP server on a free port, with outputs redirected to tmp_path."""
    from content_creator.api import server as srv

    out, proj = tmp_path / "outputs", tmp_path / "projects"
    out.mkdir()
    proj.mkdir()
    monkeypatch.setattr(srv, "OUTPUT_DIR", str(out))
    monkeypatch.setattr(srv, "PROJECT_LOCAL_ROOT", str(proj))
    httpd = ThreadingHTTPServer(("127.0.0.1", 0), srv.make_handler(index_html="<html><body>test page</body></html>"))
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    try:
        yield {"base": f"http://127.0.0.1:{httpd.server_address[1]}", "outputs": out, "projects": proj}
    finally:
        httpd.shutdown()
        httpd.server_close()
