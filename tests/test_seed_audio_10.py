import pytest

from content_creator.services import seed_audio_10 as sa10


@pytest.fixture
def keyed(monkeypatch):
    monkeypatch.setattr(sa10, "_api_key", lambda: "test-key")


def test_no_key_is_permission_error(monkeypatch):
    monkeypatch.setattr(sa10, "_api_key", lambda: "")
    with pytest.raises(PermissionError):
        sa10.generate("hello")


def test_key_is_seed_audio_key(monkeypatch):
    values = {"SEED_AUDIO_API_KEY": "shared"}
    monkeypatch.setattr(sa10, "get_env", lambda name, *a, **k: values.get(name, ""))
    assert sa10._api_key() == "shared"


def test_empty_and_long_prompts(keyed):
    with pytest.raises(ValueError, match="Write a prompt"):
        sa10.generate("   ")
    with pytest.raises(ValueError, match="at most"):
        sa10.generate("x" * (sa10.MAX_PROMPT_CHARS + 1))


def test_bad_reference(keyed):
    with pytest.raises(ValueError):
        sa10.generate("hello", [{}])
