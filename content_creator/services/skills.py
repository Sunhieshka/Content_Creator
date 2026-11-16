"""Skill library: every skill document the app knows, and the prompt block built from a project's selection.

Sources (the ids match SKILL_CATALOG in frontend/app.jsx):
  .claude/skills/<id>/SKILL.md (+ nested skills)   live Claude Code skills (Seed Audio, …)

Every skill has exactly one file, in .claude/skills/<name>/SKILL.md. Film-Making library
skills keep their original library ids (FILM_LIVE_ALIASES, stored in projects), so the
library and Claude Code read the same copy.

Video prompt optimisation always uses the Seedance 2.5 optimizer (sd25_pe_skill).
A project's selected skills are added on top of it. When the selection is too big
to send in full, each skill is replaced by a condensed "prompt-writing digest" that
Seed LLM writes once per skill version and caches in outputs/skill_digests/.
"""

import hashlib
import json
import os
import re
import threading
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

from content_creator.config.settings import OUTPUT_DIR, PROJECT_ROOT

LIVE_DIR = os.path.join(PROJECT_ROOT, ".claude", "skills")
DIGEST_DIR = os.path.join(OUTPUT_DIR, "skill_digests")

# Film-Making library ids -> their skill folder in .claude/skills/<name>/.
# The ids are stored in projects and used by SKILL_CATALOG in frontend/app.jsx, so they never change.
FILM_LIVE_ALIASES = {
    "acting_system_skill": "acting-system",
    "lira_image_prompts_skill": "lira-image-prompts",
    "sd25_pe_skill": "sd25-pe",
    "tig_acting_task_skill": "tig-acting-task",
    "tig_blocking_map_skill": "tig-blocking-map",
    "tig_scene_engine_skill": "tig-scene-engine",
    "Film_script_to_prompts_skill": "film-script-to-seedance",
    "additional_camera_angle_helpers": "additional-camera-angle-helpers",
    "camera": "camera-shot-setups",
    "cinedance_skill": "cinedance",
    "cinematicfilmskill": "cinematic-film-motion",
    "cinematography_skills": "cinematic-prompt",
    "compose": "seedance-compose",
    "dialogue_quality_bar_skill": "dialogue-quality-bar",
    "direct": "seedance-direct",
    "hindi_dialogue_prompt": "hindi-dialogue-phonetics",
    "output_audio_sensitivity": "seedance-audio-guidelines",
    "seedance_footage_vfx": "seedance-footage-vfx",
}

ALWAYS_ON = "sd25_pe_skill"               # Seedance 2.5 optimizer: applied to every video prompt
FULL_TEXT_BUDGET = 60_000                 # chars of selected skills sent verbatim before switching to digests
DIGEST_MAX_CHARS = 5_000

_lock = threading.Lock()


def _frontmatter(text: str) -> dict:
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n", text, re.S)
    out = {}
    if m:
        for line in m.group(1).splitlines():
            k, _, v = line.partition(":")
            if k.strip() in ("name", "description") and v.strip():
                out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def _first_paragraph(text: str) -> str:
    body = re.sub(r"^---\s*\n.*?\n---\s*\n", "", text, flags=re.S)
    for para in re.split(r"\n\s*\n", body):
        p = re.sub(r"[#>*`_]+", "", para).strip()
        if len(p) > 40:
            return re.sub(r"\s+", " ", p)[:400]
    return ""


def _entry(skill_id: str, path: str, library: str, live: bool) -> dict:
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        text = f.read()
    fm = _frontmatter(text)
    return {
        "id": skill_id,
        "name": fm.get("name") or skill_id,
        "description": fm.get("description") or _first_paragraph(text),
        "library": library,
        "path": os.path.relpath(path, PROJECT_ROOT),
        "chars": len(text),
        "live": live,
    }


def _live_alias_path(skill_id: str) -> Optional[str]:
    name = FILM_LIVE_ALIASES.get(skill_id)
    path = os.path.join(LIVE_DIR, name, "SKILL.md") if name else None
    return path if path and os.path.isfile(path) else None


def list_skills() -> list:
    """Every skill: the Film-Making library (by its library ids) first, then the live skills folder."""
    items = []
    for skill_id in sorted(FILM_LIVE_ALIASES, key=lambda i: i + ".md"):
        path = _live_alias_path(skill_id)
        if path:
            items.append(_entry(skill_id, path, "Film-Making", False))
    if os.path.isdir(LIVE_DIR):
        for root, _dirs, files in os.walk(LIVE_DIR):
            if "SKILL.md" not in files:
                continue
            path = os.path.join(root, "SKILL.md")
            skill_id = os.path.basename(root)
            parent = os.path.relpath(root, LIVE_DIR).split(os.sep)[0]
            library = {
                "seed-audio-prompts": "Seed Audio", "seedaudio-prompt-optimizer": "Seed Audio", "video-dub-audio-gen": "Seed Audio",
            }.get(parent, "Claude Code skills")
            items.append(_entry(skill_id, path, library, True))
    return items


def _path_for(skill_id: str) -> Optional[str]:
    alias = _live_alias_path(skill_id)
    if alias:
        return alias
    if os.path.isdir(LIVE_DIR):
        for root, _dirs, files in os.walk(LIVE_DIR):
            if "SKILL.md" in files and os.path.basename(root) == skill_id:
                return os.path.join(root, "SKILL.md")
    return None


def read_skill(skill_id: str) -> Optional[dict]:
    path = _path_for(skill_id)
    if not path:
        return None
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        text = f.read()
    entry = next((s for s in list_skills() if s["id"] == skill_id), None) or {"id": skill_id}
    return dict(entry, text=text)


def skill_bundle_text(skill_id: str) -> Optional[str]:
    """SKILL.md plus every references/*.md beside it, for skills whose instructions
    depend on their reference files (e.g. the SeedAudio prompt optimizer)."""
    path = _path_for(skill_id)
    if not path:
        return None
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        parts = [f.read()]
    ref_dir = os.path.join(os.path.dirname(path), "references")
    if os.path.isdir(ref_dir):
        for name in sorted(os.listdir(ref_dir)):
            if name.endswith(".md"):
                with open(os.path.join(ref_dir, name), "r", encoding="utf-8", errors="replace") as f:
                    parts.append(f"--- references/{name} ---\n{f.read()}")
    return "\n\n".join(parts)


# ---------------------------------------------------------------- digests

DIGEST_SYSTEM = """You condense a skill document into a prompt-writing digest for an LLM that writes video generation prompts for Seedance 2.5.
Keep only what changes how a shot prompt is written: the rules, required structure/blocks, vocabulary, constraints, and do/don't lists — concrete and imperative. Drop history, examples beyond one short one, file paths, tool/agent workflow steps, and anything about other products.
Return plain text under {max} characters, starting with the skill name on the first line."""


def _digest(skill_id: str, text: str) -> str:
    os.makedirs(DIGEST_DIR, exist_ok=True)
    key = hashlib.sha1(text.encode("utf-8")).hexdigest()[:16]
    path = os.path.join(DIGEST_DIR, f"{re.sub(r'[^A-Za-z0-9_-]+', '_', skill_id)}-{key}.txt")
    if os.path.isfile(path):
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    from byteplussdkarkruntime import Ark
    from content_creator.services.characters import _extract_output_text
    from content_creator.services.model_settings import prompt_model

    resp = Ark().responses.create(
        model=prompt_model(),
        input=[{"role": "system", "content": DIGEST_SYSTEM.replace("{max}", str(DIGEST_MAX_CHARS))},
               {"role": "user", "content": [{"type": "input_text", "text": text[:120_000]}]}],
        temperature=0.1,
        thinking={"type": "disabled"},
    )
    digest = _extract_output_text(resp).strip()[: DIGEST_MAX_CHARS + 500]
    if digest:
        with _lock, open(path, "w", encoding="utf-8") as f:
            f.write(digest)
    return digest


def project_skill_block(skill_ids: list) -> dict:
    """The selected skills (excluding the always-on optimizer) as one system-prompt block.

    Returns {"block": str, "applied": [{"id", "name", "mode": "full"|"digest"}], "missing": [ids]}.
    """
    ids, seen = [], set()
    for sid in skill_ids or []:
        sid = str(sid or "").strip()
        if sid and sid != ALWAYS_ON and sid not in seen and sid != "sd25-pe":
            seen.add(sid)
            ids.append(sid)
    docs, missing = [], []
    for sid in ids:
        skill = read_skill(sid)
        if skill:
            docs.append(skill)
        else:
            missing.append(sid)
    if not docs:
        return {"block": "", "applied": [], "missing": missing}

    use_digest = sum(len(d["text"]) for d in docs) > FULL_TEXT_BUDGET
    if use_digest:
        with ThreadPoolExecutor(max_workers=6) as pool:
            bodies = list(pool.map(lambda d: _digest(d["id"], d["text"]) or d["text"][:DIGEST_MAX_CHARS], docs))
    else:
        bodies = [d["text"] for d in docs]
    parts, applied = [], []
    for d, body in zip(docs, bodies):
        parts.append(f"=== PROJECT SKILL: {d['name']} ({d.get('library', '')}) ===\n{body.strip()}")
        applied.append({"id": d["id"], "name": d["name"], "mode": "digest" if use_digest else "full"})
    return {"block": "\n\n".join(parts), "applied": applied, "missing": missing}


def usage_note() -> str:
    return json.dumps({"always_on": ALWAYS_ON, "full_text_budget": FULL_TEXT_BUDGET})
