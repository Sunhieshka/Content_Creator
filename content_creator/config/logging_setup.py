"""Central logging configuration.

LOG_LEVEL (env) picks the level: DEBUG, INFO (default), WARNING, ERROR.
Logs go to stderr so stdout keeps only the server URL line.

Request logs record method, path (query string dropped, since it can carry URLs or
prompts) and status. Headers are never logged, so Authorization / X-Api-Key and other
credentials cannot leak; `redact_headers` is provided for any code that needs to log them.
"""
import logging
import os
import sys

SENSITIVE_HEADERS = {"authorization", "x-api-key", "proxy-authorization", "cookie", "set-cookie", "x-tos-security-token"}

_configured = False


def setup_logging() -> None:
    global _configured
    if _configured:
        return
    level_name = (os.environ.get("LOG_LEVEL") or "INFO").strip().upper()
    level = getattr(logging, level_name, logging.INFO)
    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s"))
    root = logging.getLogger("content_creator")
    root.setLevel(level)
    root.addHandler(handler)
    root.propagate = False
    _configured = True


def redact_headers(headers) -> dict:
    """Copy of a header mapping with credential values replaced by "[REDACTED]"."""
    return {k: ("[REDACTED]" if str(k).lower() in SENSITIVE_HEADERS else v) for k, v in dict(headers or {}).items()}
