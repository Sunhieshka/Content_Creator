"""Seed Audio prompt optimisation: when a project has Seed Audio skills selected, Seed LLM
rewrites the user's prompt with those skill documents (SKILL.md + references/) before
the prompt is sent to Seed Audio 1.5."""

import re
from typing import Tuple

from content_creator.services.skills import list_skills, skill_bundle_text

SEED_AUDIO_LIBRARY = "Seed Audio"

SYSTEM_TEMPLATE = """You optimise prompts for Seed Audio 1.5 (speech, dialogue, music, ambience, sound effects, dubbing, track extraction).
Follow the skill documents below as the source of truth for how to write the prompt.

{skills}

=== Rules for this app (override the skills where they conflict) ===
- You run inside an automated pipeline: your output is sent straight to Seed Audio. No one can answer questions.
  Never ask for clarification, never output problem notes, explanations, alternatives, "待确认"/"to confirm" drafts or "【待补】"/placeholder gaps.
  Resolve ambiguity conservatively and output exactly ONE submit-ready prompt.
- Keep every line to be spoken, sung or voiced exactly as written (same words, order, repetitions, punctuation, language). Do not translate.
- Reference audio clips are attached in order and must be written as @Audio1, @Audio2, … (never @音频1). There are {n_audio} reference clip(s){video_note}. Do not reference clips that do not exist.
- Keep the control description in the same language as the user's prompt.
{mode_rules}- Return only the prompt text: no headings, no code fences, no preamble."""

# Dubbing re-voices speech Seed Audio hears in the video, and rejects a prompt whose lines it cannot
# match to that speech (SpeechContentNotSpecifiedByPrompt). Seedance shot prompts pasted as the
# source bury the lines inside camera directions, so these modes need a clean, complete line list.
DUB_RULES = """- THIS IS VIDEO DUBBING: Seed Audio matches your lines against the speech in the reference video. Output a dub script:
  one short header (setting/acoustics, what to keep or not add), then EVERY spoken line from the input in the order it is
  spoken, one per line, as  Name（@AudioN, delivery）：“exact line”  -- including voice-over (mark it V.O.) and minor
  characters. Drop shot numbers, timecodes, camera moves, framing and visual descriptions entirely; keep only what is heard.
  When a skill above calls for background music, ambience or sound effects, add them as separate [BGM] / [Ambience] /
  [SFX] lines between the dialogue lines, exactly as that skill describes.
- Bind each character to the reference clip the input assigns them (e.g. "Aiden ... @Audio1"). A speaker with no
  assigned clip gets a short voice description in the brackets instead of an @AudioN; never reuse another character's clip.
- Do not merge, split, shorten or reorder lines; if the input repeats a scene, keep each line only as often as it is spoken.
"""

# UTF-8 text decoded as Mac Roman (copy-paste damage), e.g. "‚Äì" for "–".
_MOJIBAKE = {"‚Äì": "–", "‚Äî": "—", "‚Äô": "’", "‚Äò": "‘", "‚Äú": "“", "‚Äù": "”", "‚Ä¶": "…", "‚Ä¢": "•", "¬†": " "}


def fix_mojibake(text: str) -> str:
    for bad, good in _MOJIBAKE.items():
        text = text.replace(bad, good)
    # A lone "‚" left where a dash was: "[0s‚3s]" -> "[0s–3s]", "shot ‚Aiden" -> "shot — Aiden".
    text = re.sub(r"(?<=\d)s?‚(?=\d)", lambda m: m.group(0).replace("‚", "–"), text)
    text = re.sub(r"\s*‚\s*", " — ", text)
    return text


def seed_audio_skill_ids(skill_ids: list) -> list:
    """The selected ids that belong to the Seed Audio library, in selection order."""
    allowed = {s["id"] for s in list_skills() if s.get("library") == SEED_AUDIO_LIBRARY}
    out = []
    for sid in skill_ids or []:
        sid = str(sid or "").strip()
        if sid in allowed and sid not in out:
            out.append(sid)
    return out


def optimize_prompt(prompt: str, skill_ids: list, mode: str = "", n_audio: int = 0, has_video: bool = False) -> Tuple[str, list]:
    """Returns (optimised_prompt, applied_skill_ids). Raises RuntimeError on failure."""
    from byteplussdkarkruntime import Ark

    from content_creator.services.characters import _extract_output_text
    from content_creator.services.model_settings import prompt_model

    applied, docs = [], []
    for sid in skill_ids:
        text = skill_bundle_text(sid)
        if text:
            applied.append(sid)
            docs.append(f"=== SKILL: {sid} ===\n{text.strip()}")
    if not docs:
        return prompt, []

    system = SYSTEM_TEMPLATE.format(
        skills="\n\n".join(docs),
        mode_rules=DUB_RULES if mode in ("dub", "fix") else "",
        n_audio=n_audio,
        video_note=" and a reference video (the video carries the picture and timing; do not describe what is in it)" if has_video else "",
    )
    user = f"Generation mode: {mode or 'speech'}\n\nOptimise this Seed Audio prompt:\n\n{fix_mojibake(prompt)}"
    resp = Ark().responses.create(
        model=prompt_model(),
        input=[{"role": "system", "content": system},
               {"role": "user", "content": [{"type": "input_text", "text": user}]}],
        temperature=0.2,
    )
    out = _extract_output_text(resp).strip()
    if out.startswith("```"):
        lines = out.splitlines()
        out = "\n".join(lines[1:-1] if lines and lines[-1].strip() == "```" else lines[1:]).strip()
    out = re.sub(r"@音频\s*(\d+)", r"@Audio\1", out)
    if not out:
        raise RuntimeError("Seed LLM returned an empty prompt.")
    if "【待补" in out or "待确认" in out:
        raise RuntimeError(f"Seed LLM could not optimise the prompt without more information:\n{out[:1500]}")
    return out, applied
