"""multipart/form-data parsing (replacement for cgi.FieldStorage) and the routes that use it."""
import io
import json
import urllib.error
import urllib.request

from content_creator.utils.multipart import parse_multipart

BOUNDARY = "----ccTestBoundary7MA4YWxk"


def _body(fields):
    """fields: list of (name, value) or (name, filename, bytes, content_type)."""
    out = b""
    for f in fields:
        out += f"--{BOUNDARY}\r\n".encode()
        if len(f) == 2:
            out += f'Content-Disposition: form-data; name="{f[0]}"\r\n\r\n'.encode() + f[1].encode("utf-8") + b"\r\n"
        else:
            name, filename, data, ctype = f
            out += (f'Content-Disposition: form-data; name="{name}"; filename="{filename}"\r\n'
                    f"Content-Type: {ctype}\r\n\r\n").encode("utf-8") + data + b"\r\n"
    return out + f"--{BOUNDARY}--\r\n".encode()


class _FakeHandler:
    def __init__(self, body):
        self.headers = {"Content-Type": f"multipart/form-data; boundary={BOUNDARY}", "Content-Length": str(len(body))}
        self.rfile = io.BytesIO(body)


def test_parse_text_files_and_repeated_fields():
    png = bytes(range(256)) * 4  # binary, includes \r\n and NUL bytes
    form = parse_multipart(_FakeHandler(_body([
        ("script_text", "INT. BAKERY – NIGHT\r\nTomás kneads dough."),
        ("sheet_options", "instruction_1"),
        ("sheet_options", "instruction_2"),
        ("images", "ref one.png", png, "image/png"),
        ("images", "ref-2.png", b"\x89PNG", "image/png"),
    ])))
    assert form.getfirst("script_text") == "INT. BAKERY – NIGHT\r\nTomás kneads dough."
    assert form.getfirst("missing", "x") == "x"
    assert "images" in form and "nope" not in form
    assert [p.value for p in form.getlist("sheet_options")] == ["instruction_1", "instruction_2"]
    files = form.getlist("images")
    assert [f.filename for f in files] == ["ref one.png", "ref-2.png"]
    assert files[0].data == png and files[1].data == b"\x89PNG"


def test_parse_empty_body():
    h = _FakeHandler(b"")
    h.headers["Content-Length"] = "0"
    assert parse_multipart(h).parts == []


def _post(server, path, body):
    req = urllib.request.Request(server["base"] + path, data=body, method="POST",
                                 headers={"Content-Type": f"multipart/form-data; boundary={BOUNDARY}"})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())


def test_script_to_prompt_requires_text_or_pdf(server):
    status, data = _post(server, "/api/script-to-prompt", _body([("script_text", "   ")]))
    assert status == 400 and data["error"] == "Paste a script or upload a PDF."


def test_generate_requires_images(server):
    status, data = _post(server, "/api/generate", _body([("sheet_options", "instruction_1"), ("generated_images", "not-a-data-url")]))
    assert status == 400 and data["error"] == "No images uploaded."
