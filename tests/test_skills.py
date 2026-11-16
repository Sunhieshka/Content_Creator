from pathlib import Path

from content_creator.services import skills

ROOT = Path(__file__).resolve().parents[1]


def _ids():
    return {s["id"] for s in skills.list_skills()}


def test_film_live_aliases_resolve_to_installed_skills():
    ids = _ids()
    for alias, name in skills.FILM_LIVE_ALIASES.items():
        assert alias in ids, alias
        assert (ROOT / ".claude" / "skills" / name / "SKILL.md").is_file(), name
        assert skills.skill_bundle_text(alias), alias


def test_single_skills_folder():
    assert not (ROOT / "docs_film_making").exists()


def test_video_prompt_includes_always_on_optimizer():
    from content_creator.services import video

    assert len(video.SD25_PE_SKILL) > 1000
    assert video.SD25_PE_SKILL in video._video_prompt_system_instruction(0, [])


def test_always_on_skill_present_and_in_prompt_block():
    assert skills.ALWAYS_ON in _ids()
    assert skills.project_skill_block([])


def test_unknown_skill_is_safe():
    assert not skills.skill_bundle_text("definitely-not-a-skill")
