"""Motion Blockout: shot description -> grey-box scene JSON (Seed LLM).

Ported from CineForge's Motion Blockout. The browser renders the scene with
three.js and encodes the MP4 itself; the server only writes the layout. The
system prompt lives beside this file in motion_blockout_prompt.txt.
"""

import os

PROMPT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "motion_blockout_prompt.txt")


def generate_scene(description: str) -> str:
    """Returns the model's raw reply; the panel parses and validates it."""
    from byteplussdkarkruntime import Ark

    from content_creator.services.characters import _extract_output_text
    from content_creator.services.model_settings import prompt_model

    with open(PROMPT_PATH, "r", encoding="utf-8") as f:
        system_prompt = f.read()
    resp = Ark().responses.create(
        model=prompt_model(),
        input=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": [{"type": "input_text", "text": description}]},
        ],
        temperature=0.2,
        thinking={"type": "disabled"},
    )
    return (_extract_output_text(resp) or "").strip()
