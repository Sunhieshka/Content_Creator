from byteplussdkarkruntime import Ark
from content_creator.utils.llm_images import fit_all_for_llm
from byteplussdkarkruntime.types.images.images import OptimizePromptOptions, SequentialImageGenerationOptions

from content_creator.services.model_settings import NO_IMAGE_GROUP_MODELS, image_model, prompt_model
from content_creator.services.characters import (
    _data_url_debug_summary,
    _report_debug_event,
    _extract_output_text,
)
STORYBOARD_SYSTEM_PROMPT = """You are an expert cinematic storyboard prompt writer for Seedream.
Your primary source may be a raw script/screenplay excerpt OR a set of 7 core creative inputs — use whichever is provided.
Write exactly one final image-generation prompt for a cinematic storyboard sheet.

You must follow this instruction pattern:
Create a cinematic storyboard sheet in a 3x3 grid format (9 panels arranged in 3 rows x 3 columns) depicting
ONE CONTINUOUS [SCENE TYPE] between [NUMBER] characters.
Style: Cinematic, [GENRE/REFERENCE TONE], [STYLE DESCRIPTORS - e.g., live-action, photorealistic, lifelike, 35mm film grain].
Aspect ratio = 16:9 page layout. No text anywhere, no captions, no panel numbers, no annotation strips, and only thin clean separators between panels.

When a script is provided:
- Extract scene type, characters, setting, action beats, dialogue cues, atmosphere, and camera intent directly from the script.
- Map the scene's narrative arc across the 9 panels: establish → build → resolve.
- Infer lighting, style, and quality from genre cues and tone if not explicitly supplied.

Character lock rules:
- All characters must remain identical across all 9 panels: same face, build, clothing, props.
- If reference images are attached, treat them as strict identity anchors and match them precisely.
- Character sheets cover identity, so avoid redundant over-description. Keep only the minimum anchor traits needed for consistency.

Storyboard rules:
- This is one continuous scene, one location, one unbroken flow of time.
- The 9 panels must read left-to-right, top-to-bottom as sequential beats from the same scene.
- Vary framing and movement naturally across the 9 panels.
- Include location storytelling, props when relevant, close-ups, wider situational shots, and motion continuity.
- Do not include markdown, code fences, bullet points, or explanations.
- Return only the final Seedream prompt as plain text.
"""
SEEDREAM_OPTIMIZE_OPTIONS = OptimizePromptOptions(mode="standard")


def generate_storyboard_prompts(
    *,
    script: str = "",
    subject: str = "",
    action: str = "",
    environment: str = "",
    lighting: str = "",
    camera: str = "",
    style: str = "",
    quality: str = "",
    reference_image_data_urls: list[str],
) -> str:
    ark = Ark()

    parts: list[str] = []

    if script.strip():
        parts.append(f"SCRIPT / SCENE EXCERPT:\n\"\"\"\n{script.strip()}\n\"\"\"")
        parts.append("Use the script above as the primary source for characters, setting, action beats, tone, and atmosphere.")

    core_lines: list[str] = []
    if subject.strip():
        core_lines.append(f"- Subject / character anchor: {subject.strip()}")
    elif not script.strip() and not reference_image_data_urls:
        core_lines.append("- Subject / character anchor: Infer from context")
    if action.strip():
        core_lines.append(f"- Action: {action.strip()}")
    if environment.strip():
        core_lines.append(f"- Environment: {environment.strip()}")
    if lighting.strip():
        core_lines.append(f"- Lighting: {lighting.strip()}")
    if camera.strip():
        core_lines.append(f"- Camera reference: {camera.strip()}")
    if style.strip():
        core_lines.append(f"- Style: {style.strip()}")
    if quality.strip():
        core_lines.append(f"- Quality: {quality.strip()}")

    if core_lines:
        intro = "Supplemental creative inputs (override script where they conflict):" if script.strip() else "Build one final Seedream prompt using these inputs:"
        parts.append(intro + "\n" + "\n".join(core_lines))

    if reference_image_data_urls:
        parts.append("Reference images are attached. Match them precisely for identity, styling, and continuity.")
    else:
        parts.append("No reference images are attached.")

    parts.append("""Important:
- The result must be one single prompt for one final 3x3 storyboard sheet image.
- The 9 panels must represent one continuous scene and one continuous flow of time.
- Infer any missing scene type, sequence name, beat progression, character count, and panel-by-panel evolution from the available inputs.
- Keep character identity concise because detailed identity may already be locked by character sheets/reference images.
- Keep the final text production-ready for Seedream.

Return only the final prompt text.""")

    user_text = "\n\n".join(parts)

    content: list[dict] = [{"type": "input_text", "text": user_text}]
    _report_debug_event(
        "C",
        "[DEBUG] Storyboard prompt reference image formats",
        {"images": [_data_url_debug_summary(x) for x in reference_image_data_urls]},
    )
    # Seed LLM rejects images over 10 MiB; oversized ones are downscaled for this call only.
    for data_url in fit_all_for_llm(reference_image_data_urls):
        content.append({"type": "input_image", "detail": "high", "image_url": data_url})

    resp = ark.responses.create(
        model=prompt_model(),
        input=[
            {"role": "system", "content": STORYBOARD_SYSTEM_PROMPT},
            {"role": "user", "content": content},
        ],
        temperature=0.3,
    )

    raw = _extract_output_text(resp)
    # Strip markdown code fences if present
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        cleaned = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

    return cleaned


def generate_storyboard_image(
    *,
    prompt: str,
    reference_image_data_urls: list[str],
) -> str:
    full_prompt = prompt
    if reference_image_data_urls:
        full_prompt += " Match attached reference images precisely for all character identities, wardrobe, props, and continuity across every panel."

    model = image_model()
    # Only the first image is used; models without image groups get a single image.
    group_kwargs = {} if model in NO_IMAGE_GROUP_MODELS else {
        "sequential_image_generation": "auto",
        "sequential_image_generation_options": SequentialImageGenerationOptions(max_images=4),
    }
    ark = Ark()
    resp = ark.images.generate(
        model=model,
        prompt=full_prompt,
        image=reference_image_data_urls if reference_image_data_urls else None,
        response_format="b64_json",
        **group_kwargs,
        stream=False,
        watermark=False,
        output_format="png",
        optimize_prompt=True,
        optimize_prompt_options=SEEDREAM_OPTIMIZE_OPTIONS,
    )

    images: list[str] = []
    data = getattr(resp, "data", None) or []
    for img in data:
        b64 = getattr(img, "b64_json", None)
        if b64:
            images.append(f"data:image/png;base64,{b64}")
    return images[0] if images else ""
