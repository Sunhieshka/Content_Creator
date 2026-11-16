import time

from content_creator.services import audiobook as ab

CAST = {"title": "T", "language": "English", "narrator": "warm narrator",
        "characters": [{"name": n, "voice": n + " voice"} for n in ("A", "B", "C", "D")]}
SEG = {"id": "s1", "chapter": "Chapter 1", "lines": [
    {"kind": "narration", "speaker": "Narrator", "text": "It rained.", "delivery": "calm"},
    {"kind": "cue", "cue": "sfx", "text": "a door creaks", "raw": "SFX: a door creaks"},
] + [{"kind": "quote", "speaker": n, "text": f"“Hi from {n}.”", "delivery": "warm"} for n in ("A", "B", "C", "D")]}
VOICES = {n: f"/files/{n}.wav" for n in ("Narrator", "A", "B", "C", "D")}


def test_engine_defaults_to_seed_audio_10():
    assert ab.engine_of({}) == "1.0"
    assert ab.engine_of(None) == "1.0"
    assert ab.engine_of({"audioEngine": "1.5"}) == "1.5"


def test_build_prompt_10_limits_refs_and_keeps_text():
    p = ab.build_prompt(SEG, {"cast": CAST, "options": {"audioEngine": "1.0"}}, VOICES)
    assert len(p["refs"]) == ab.MAX_SPEAKERS_10 == 3
    assert "the actor is @Audio3" in p["prompt"] and "@Audio4" not in p["prompt"]
    for n in ("A", "B", "C", "D"):
        assert f'"Hi from {n}."' in p["prompt"]
    assert "[a door creaks]" in p["prompt"]
    assert len(p["prompt"]) < 3000


def test_build_prompt_15_keeps_six_refs_format():
    p = ab.build_prompt(SEG, {"cast": CAST, "options": {"audioEngine": "1.5"}}, VOICES)
    assert len(p["refs"]) == 5
    assert p["prompt"].startswith("[General Requirements]")


def test_segments_fit_seed_audio_10():
    text = "Chapter 1\n\n" + "\n\n".join("This is sentence number %d in a long paragraph of the book." % i for i in range(400))
    segs = ab.split_segments(text, "max", use_llm=False, engine="1.0")
    assert len(segs) > 1
    assert max(s["est_s"] for s in segs) <= ab.SEGMENT_CAP_10_S + 5


def test_render_10_splits_overlong_prompt_without_calling_api(monkeypatch):
    def boom(*a, **k):
        raise AssertionError("must not call Seed Audio")
    monkeypatch.setattr(ab.seed_audio_10, "generate", boom)
    job = ab.start_render([{"id": "x", "prompt": "w" * 3001, "refs": []}], {"engine": "1.0"})
    for _ in range(100):
        if ab.get_job(job)["status"] != "running":
            break
        time.sleep(0.05)
    assert ab.get_job(job)["items"]["x"]["status"] == "truncated"
