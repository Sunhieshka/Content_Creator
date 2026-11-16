"""multipart/form-data parsing for the upload routes.

Replaces cgi.FieldStorage (the cgi module was removed in Python 3.13). Uses the standard library's email
parser, which handles boundaries, quoted filenames and per-part headers.
"""
from email import policy
from email.parser import BytesParser
from typing import Optional


class Part:
    """One form field: a text value, or an uploaded file (filename set, raw bytes in data)."""

    def __init__(self, name: str, filename: Optional[str], data: bytes, charset: Optional[str]):
        self.name = name
        self.filename = filename
        self.data = data
        self._charset = charset or "utf-8"

    @property
    def value(self) -> str:
        return self.data.decode(self._charset, errors="replace")


class MultipartForm:
    def __init__(self, parts: list):
        self.parts = parts

    def __contains__(self, name: str) -> bool:
        return any(p.name == name for p in self.parts)

    def getlist(self, name: str) -> list:
        return [p for p in self.parts if p.name == name]

    def getfirst(self, name: str, default: str = "") -> str:
        for p in self.parts:
            if p.name == name:
                return p.value
        return default


def parse_multipart(handler) -> MultipartForm:
    """Reads the request body (Content-Length bytes) and splits it into fields."""
    content_type = handler.headers.get("Content-Type") or ""
    length = int(handler.headers.get("Content-Length") or 0)
    body = handler.rfile.read(length) if length > 0 else b""
    message = BytesParser(policy=policy.HTTP).parsebytes(
        b"Content-Type: " + content_type.encode("latin-1") + b"\r\nMIME-Version: 1.0\r\n\r\n" + body
    )
    parts = []
    if message.is_multipart():
        for part in message.iter_parts():
            name = part.get_param("name", header="content-disposition")
            if not name:
                continue
            filename = part.get_filename()
            data = part.get_payload(decode=True) or b""
            parts.append(Part(str(name), filename, data, part.get_content_charset()))
    return MultipartForm(parts)
