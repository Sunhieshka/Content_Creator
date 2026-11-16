from content_creator.config.logging_setup import redact_headers


def test_redacts_credentials_case_insensitively():
    out = redact_headers({"Authorization": "Bearer secret", "x-api-key": "k", "Content-Type": "application/json"})
    assert out == {"Authorization": "[REDACTED]", "x-api-key": "[REDACTED]", "Content-Type": "application/json"}
