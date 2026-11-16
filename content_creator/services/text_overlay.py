"""Text overlay pre-rendering for "Text Overlay" projects.

Seedance misspells on-screen text. For this project type the text is rendered
by Seedream 5.0 Pro first — as overlay graphics, or as flat screen captures for
laptops/phones/monitors — and those images are handed to Seedance as reference
images with an exact mapping block, so the video copies the letters instead of
inventing them.

Flow:
  1. plan_text_overlays   — Seed LLM reads the video prompt AND the user's own
                            reference images (brand logo, product, UI) and lists
                            every on-screen text moment plus one shared style
                            guide. A moment a reference image already shows
                            (e.g. a logo-only card) is marked covered and never
                            regenerated; a moment that needs a reference's logo
                            plus extra text is rendered with that image as input.
  2. generate_overlay_images — Seedream renders the rest. The first image of
                            each kind (overlay / screen) is the style anchor;
                            every later image is generated image-to-image from
                            it with instructions to match font, size, colour and
                            design. Each render is read back by the LLM and
                            retried when the spelling does not match.
  3. build_overlay_prompt_block — the text appended to the Seedance prompt,
                            naming each overlay's [Image N].
"""

from content_creator.utils.llm_images import fit_for_llm

import base64
import json
import os
import re
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

from byteplussdkarkruntime import Ark

from content_creator.config.settings import OUTPUT_DIR
from content_creator.services.characters import _extract_output_text
from content_creator.services.model_settings import prompt_model

# Overlay images are always rendered with Seedream 5.0 Pro, pinned here so a
# model change elsewhere in the app never changes this flow.
SEEDREAM_MODEL_ID = "dola-seedream-5-0-pro-260628"
SEEDREAM_MODEL_LABEL = "Seedream 5.0 Pro"

OVERLAY_KINDS = ("overlay", "screen")
# Seedance takes at most 9 reference images, so at most 8 rendered overlays.
MAX_OVERLAYS = 8
# Covered moments cost no reference slot of their own; this only bounds the plan.
MAX_PLAN_ENTRIES = 16
# One render plus this many retries when the read-back text does not match.
MAX_SPELLING_RETRIES = 2
OVERLAY_FILE_PREFIX = "text-overlay-"

# Seedream 5.x needs at least 3,686,400 total pixels; these hit that floor.
_SIZE_BY_RATIO = {
    "21:9": "2940x1260",
    "16:9": "2560x1440",
    "4:3": "2240x1680",
    "1:1": "2048x2048",
    "3:4": "1680x2240",
    "9:16": "1440x2560",
}
_SIZE_BY_DEVICE = {
    "phone": "1440x2560",
    "watch": "2048x2048",
    "tablet": "2240x1680",
    "laptop": "2560x1600",
    "monitor": "2560x1440",
    "tv": "2560x1440",
}


PLANNER_INSTRUCTION = """You prepare exact on-screen text for an AI video. Video models misspell text, so every piece of legible text will be pre-rendered as an image.

Read the user's video prompt and find every piece of text that must be READABLE in the video:
- "overlay": text overlays, titles, captions, subtitles written in the prompt, lower thirds, supers, kinetic typography, logo / end cards, CTA text, price tags, hashtags shown on screen.
- "screen": text shown on a digital screen inside the scene — laptop, desktop monitor, phone, tablet, smartwatch, TV, digital billboard, app/website UI, chat/email/notification, terminal/code.

Rules:
1. Copy text EXACTLY as written in the prompt: same spelling, letter case, punctuation, numbers, emoji, line breaks. Never correct, translate, shorten or paraphrase. Use "\\n" for line breaks.
2. One entry per text moment. Text that is on screen at the same time in the same place (e.g. title + subtitle) belongs in ONE entry, separated by "\\n".
3. If the prompt describes text without stating its words — screen text ("she reads an email on her laptop") or overlay text ("tiny grey disclaimer text", "a caption appears") — invent short, plausible, correctly spelled wording, put it in that moment's "text" (as its own line when it shares the frame with other text) and mark "invented": true. Keep invented small print to one line of at most 8 words. Unworded text left to the image model comes out as gibberish, so never skip it.
4. Do not create entries for text that is not meant to be legible (blurred background signs, generic noise).
5. List every moment in chronological order. At most {max_overlays} entries may need rendering (entries with "covered_by_reference" do not count); if there are more, keep the most important ones.
6. style_guide: ONE typography spec shared by every overlay entry so they all look identical — font classification and a concrete font look (e.g. "bold geometric sans-serif like Montserrat ExtraBold"), weight, text colour(s) as hex, outline/stroke, shadow/glow, background shape or box, relative text size (as % of frame height), alignment. Never specify an uppercase/lowercase transform — each text keeps its own letter case exactly as written. Take everything the prompt says about text style (and the brand colours of any brand reference image); fill the gaps to suit the video's tone. Describe styling only — never mention extra text elements (disclaimers, subtitles, small print) that are not in an entry's "text".
7. screen_style_guide: ONE UI spec shared by every screen entry — light/dark theme, UI font, accent colour, density.
   Every word that should be readable on a screen goes in "text" (use "\\n" between UI lines, max 4 short lines). screen_content describes only textless visuals — never labels, button captions or menu words.
8. backdrop: a flat solid colour (hex) that contrasts with the overlay text colour, used only as a neutral backdrop behind overlay graphics.
9. REFERENCE IMAGES. The user may attach reference images, numbered 1..N (brand logos, wordmarks, products, UI screenshots). Look at each one carefully.
   a. If a text moment is ALREADY fully shown by a reference image — e.g. a logo card that is only the brand logo/wordmark, or a screenshot that already contains the exact screen text — set "covered_by_reference" to that image number. It is used as-is and NOT regenerated, even when the prompt animates, moves or resizes it (the video model does that). Keep "text" as a short description of what it shows.
   b. If a text moment needs something from a reference image (logo, wordmark, product, UI) TOGETHER with extra text or a new layout — e.g. the brand logo plus a tagline line — set "use_references" to those image numbers and write "reference_usage" saying exactly how to use each (e.g. "the brand logo from reference 1, copied exactly, centered above the tagline"). Seedream receives those images.
   c. Placeholders in square brackets such as [BRAND], [LOGO] or [PRODUCT] stand for the real asset: resolve them with a matching reference (a or b) and never put the bracketed token in "text". When the brand name comes from the logo image, do not retype it in "text" either — "text" then holds only the extra words to typeset, and may be "" when the entry only places the logo.
   d. With no matching reference, drop the bracketed token from "text".

Return JSON only, no markdown:
{
  "style_guide": "...",
  "screen_style_guide": "...",
  "backdrop": "#101010",
  "overlays": [
    {
      "shot": "Shot 1 (0-3s)",
      "kind": "overlay" | "screen",
      "text": "EXACT TEXT",
      "placement": "where it sits in the frame, e.g. lower third, left aligned",
      "device": "laptop | phone | tablet | monitor | tv | watch (screen only, else empty)",
      "screen_content": "the NON-TEXT visuals around the text, e.g. dark-mode email app layout with avatar circle, grey placeholder bars and an envelope icon (screen only, else empty)",
      "invented": false,
      "covered_by_reference": 0,
      "use_references": [],
      "reference_usage": ""
    }
  ]
}
If there is no legible text at all, return {"style_guide": "", "screen_style_guide": "", "backdrop": "", "overlays": []}."""


def _parse_json_object(raw: str) -> dict:
    text = (raw or "").strip()
    fenced = re.search(r"```(?:json)?\s*(.*?)```", text, re.S)
    if fenced:
        text = fenced.group(1).strip()
    start, end = text.find("{"), text.rfind("}")
    if start < 0 or end <= start:
        raise ValueError("The overlay planner did not return JSON.")
    return json.loads(text[start : end + 1])


def resolve_image_input(value: str) -> str:
    """Turn a stored overlay or reference image into something Ark accepts.

    /files/ paths written by _save_png are read back from OUTPUT_DIR as data
    URLs; data: and http(s) URLs pass through unchanged.
    """
    v = (value or "").strip()
    if v.startswith("/files/"):
        name = os.path.basename(v[len("/files/") :])
        path = os.path.join(OUTPUT_DIR, name)
        if not name or not os.path.isfile(path):
            raise FileNotFoundError(f"Overlay image not found: {v}")
        with open(path, "rb") as f:
            return "data:image/png;base64," + base64.b64encode(f.read()).decode("ascii")
    return v


def normalize_references(raw: Optional[list]) -> list[dict]:
    """User reference images, numbered by position (reference 1 = index 0).

    Only inline data: and http(s) images can be shown to the LLM and Seedream;
    anything else keeps its slot (so numbering stays stable) but is unusable.
    """
    refs: list[dict] = []
    for i, item in enumerate(raw or []):
        item = item if isinstance(item, dict) else {"image": item}
        image = resolve_image_input(str(item.get("image") or ""))
        usable = image.startswith("data:") or image.startswith("http")
        refs.append({"image": image if usable else "", "name": str(item.get("name") or f"reference {i + 1}").strip()})
    return refs


def _reference_numbers(value, references: list[dict]) -> list[int]:
    raw = value if isinstance(value, list) else [value]
    out: list[int] = []
    for v in raw:
        try:
            n = int(v)
        except (TypeError, ValueError):
            continue
        if 1 <= n <= len(references) and references[n - 1]["image"] and n not in out:
            out.append(n)
    return out


_QUOTED = re.compile(r'"([^"\n]+)"|“([^”\n]+)”')
_TRAILING = ".!?,;:…"


def _restore_quoted_lines(text: str, prompt: str) -> str:
    """Put back the prompt's own wording where the planner drifted.

    The planner occasionally drops a final period or changes case on a line it
    copied. When a line matches a quoted string in the prompt apart from
    trailing punctuation and letter case, the prompt's version wins.
    """
    if not prompt:
        return text
    quoted = [a or b for a, b in _QUOTED.findall(prompt)]
    key = lambda s: s.strip().rstrip(_TRAILING).strip().lower()
    by_key = {}
    for q in quoted:
        by_key.setdefault(key(q), q.strip())
    return "\n".join(by_key.get(key(line), line) if line.strip() else line for line in text.split("\n"))


def _clean_overlay(raw: dict, references: list[dict], prompt: str = "") -> Optional[dict]:
    if not isinstance(raw, dict):
        return None
    text = _restore_quoted_lines(str(raw.get("text") or "").replace("\\n", "\n").strip(), prompt)
    covered = _reference_numbers(raw.get("covered_by_reference"), references)
    use_refs = [] if covered else _reference_numbers(raw.get("use_references"), references)
    if use_refs and not text and len(use_refs) == 1:
        # Nothing to typeset beside the reference: the reference itself is the
        # frame, so it is reused instead of regenerated.
        covered, use_refs = use_refs, []
        text = str(raw.get("reference_usage") or "").strip() or "Reference image"
    if not text and not covered and not use_refs:
        return None
    kind = str(raw.get("kind") or "overlay").strip().lower()
    kind = kind if kind in OVERLAY_KINDS else "overlay"
    device = str(raw.get("device") or "").strip().lower()
    return {
        "id": str(raw.get("id") or "") or uuid.uuid4().hex[:10],
        "shot": str(raw.get("shot") or "").strip(),
        "kind": kind,
        "text": text,
        "placement": str(raw.get("placement") or "").strip(),
        "device": device if kind == "screen" else "",
        "screen_content": str(raw.get("screen_content") or "").strip() if kind == "screen" else "",
        "invented": bool(raw.get("invented")),
        "covered_by_reference": covered[0] if covered else 0,
        "use_references": use_refs,
        "reference_usage": str(raw.get("reference_usage") or "").strip() if use_refs else "",
        "reference_names": [references[n - 1]["name"] for n in (covered or use_refs)],
    }


def plan_text_overlays(*, prompt: str, references: Optional[list[dict]] = None, max_overlays: int = MAX_OVERLAYS) -> dict:
    references = references or []
    max_overlays = max(1, min(MAX_OVERLAYS, int(max_overlays)))
    content: list[dict] = [{"type": "input_text", "text": f"Video prompt:\n{prompt.strip()}"}]
    usable = [(i + 1, r) for i, r in enumerate(references) if r["image"]]
    if usable:
        content.append({"type": "input_text", "text": f"The user attached {len(references)} reference image(s):"})
        for n, ref in usable:
            content.append({"type": "input_text", "text": f"Reference image {n} — {ref['name']}:"})
            content.append({"type": "input_image", "detail": "high", "image_url": fit_for_llm(ref["image"])})
    else:
        content.append({"type": "input_text", "text": "No reference images are attached."})

    ark = Ark()
    resp = ark.responses.create(
        model=prompt_model(),
        input=[
            {"role": "system", "content": PLANNER_INSTRUCTION.replace("{max_overlays}", str(max_overlays))},
            {"role": "user", "content": content},
        ],
        temperature=0.1,
        # Thinking adds ~100s per call with no gain for this extraction.
        thinking={"type": "disabled"},
    )
    data = _parse_json_object(_extract_output_text(resp))
    overlays: list[dict] = []
    rendered = 0
    for raw in data.get("overlays") or []:
        o = _clean_overlay(raw, references, prompt)
        if not o:
            continue
        if not o["covered_by_reference"]:
            if rendered >= max_overlays:
                continue
            rendered += 1
        overlays.append(o)
        if len(overlays) >= MAX_PLAN_ENTRIES:
            break
    return {
        "style_guide": str(data.get("style_guide") or "").strip(),
        "screen_style_guide": str(data.get("screen_style_guide") or "").strip(),
        "backdrop": str(data.get("backdrop") or "").strip(),
        "overlays": overlays,
    }


def _quoted_lines(text: str) -> str:
    lines = [line for line in text.split("\n") if line.strip()]
    if len(lines) == 1:
        return f'"{lines[0]}"'
    return " / ".join(f'line {i + 1}: "{line}"' for i, line in enumerate(lines))


def _text_rules(text: str, has_references: bool) -> str:
    exact = (
        "Spell it exactly letter-for-letter with the same letter case and punctuation. "
        "Never hyphenate or split a word across lines. "
        "Every line, including any small print, is large enough to read clearly (at least 2.5% of the frame height). "
        "Every letter must be sharp, complete and clearly legible."
    )
    if has_references:
        if not text.strip():
            return "Add no text of your own — the only lettering is what is copied from the reference image(s). No watermarks."
        return (
            f"Apart from what is copied from the reference image(s), the ONLY other text is {_quoted_lines(text)}. {exact} "
            "No other words, small print, disclaimers, placeholder text or watermarks."
        )
    return (
        f"The ONLY text in the image is {_quoted_lines(text)}. {exact} "
        "No other words, letters, numbers, logos, watermarks or placeholder text anywhere."
    )


def _overlay_size(overlay: dict, ratio: str) -> str:
    if overlay.get("kind") == "screen":
        return _SIZE_BY_DEVICE.get(overlay.get("device") or "", _SIZE_BY_DEVICE["laptop"])
    return _SIZE_BY_RATIO.get(ratio or "", _SIZE_BY_RATIO["16:9"])


_BRAND_WORDS = re.compile(r"\b(logo|wordmark|brand|icon|emblem|monogram)s?\b", re.I)
_SMALL_PRINT_WORDS = re.compile(
    r"\b(disclaimers?|small print|fine print|footnotes?|legal|terms|copyright|captions?|subtitles?|secondary text|sub-?heads?|small text)\b",
    re.I,
)


def _without_clauses(value: str, pattern: "re.Pattern", fallback: str = "") -> str:
    """Drop every comma/semicolon clause (also inside parentheses) matching pattern.

    Seedream draws whatever a prompt mentions: "4% for small disclaimer text"
    with no disclaimer wording becomes gibberish small print, and "below the
    brand wordmark" without a logo reference becomes an invented logo.
    """
    def fix_parens(m):
        inner = [c.strip() for c in m.group(1).split(",") if c.strip() and not pattern.search(c)]
        return f"({', '.join(inner)})" if inner else ""

    value = re.sub(r"\(([^()]*)\)", fix_parens, value or "")
    clauses = [c.strip() for c in re.split(r"[,;]", value) if c.strip()]
    kept = [c for c in clauses if not pattern.search(c)]
    return re.sub(r"\s+", " ", ", ".join(kept)).strip() or fallback


def _without_brand_mentions(value: str, fallback: str) -> str:
    return _without_clauses(value, _BRAND_WORDS, fallback)


def build_image_prompt(overlay: dict, plan: dict, ratio: str, has_anchor: bool, reference_count: int) -> str:
    """The Seedream prompt for one overlay.

    Input image order is [style anchor?, *references], and the prompt names
    them by that position.
    """
    is_screen = overlay.get("kind") == "screen"
    single_line = len([line for line in (overlay.get("text") or "").split("\n") if line.strip()]) <= 1
    if single_line:
        # With one line of text there is no secondary text to style or place.
        plan = {
            **plan,
            "style_guide": _without_clauses(plan.get("style_guide") or "", _SMALL_PRINT_WORDS),
            "screen_style_guide": _without_clauses(plan.get("screen_style_guide") or "", _SMALL_PRINT_WORDS),
        }
    parts: list[str] = []
    next_image = 1
    if has_anchor:
        if is_screen:
            parts.append(
                "Image 1 is the UI style reference. Create a NEW flat, front-facing screen design that matches Image 1 exactly in "
                "UI theme, UI font family, font weight, text size, text colour, accent colour, spacing and overall interface design. "
            )
        else:
            parts.append(
                "Image 1 is the typography style reference. Create a NEW text overlay graphic that matches Image 1 exactly in "
                "font family, font weight, font size relative to the frame, letter spacing, text colour, outline/stroke, "
                "shadow/glow, background box or shape, backdrop colour and overall design. "
            )
        parts.append("Take only the style from Image 1 — do not copy its words, logos or graphics. ")
        next_image = 2
    if reference_count:
        last = next_image + reference_count - 1
        labels = f"Image {next_image}" if reference_count == 1 else f"Images {next_image}–{last}"
        names = ", ".join(overlay.get("reference_names") or [])
        # The planner numbers references as the user sees them (reference 1..N);
        # Seedream sees them after the anchor, so rename to its image positions.
        positions = {n: next_image + i for i, n in enumerate(overlay.get("use_references") or [])}
        usage = re.sub(
            r"\breference(?: image)?\s*#?(\d+)",
            lambda m: f"Image {positions[int(m.group(1))]}" if int(m.group(1)) in positions else m.group(0),
            overlay.get("reference_usage") or "",
            flags=re.I,
        ).strip()
        if usage and not usage.endswith((".", "!", "?")):
            usage += "."
        parts.append(
            f"{labels} {'is the' if reference_count == 1 else 'are the'} user's brand reference{'s' if reference_count > 1 else ''}"
            f"{f' ({names})' if names else ''}. "
            f"{usage or 'Use the logo from the reference exactly as it appears.'} "
            f"Copy every logo, wordmark and brand element taken from {labels} exactly as it appears — same shape, colours, "
            "proportions and spelling. Do not redraw, restyle, recolour or retype it. "
        )
    elif not has_anchor:
        parts.append(
            f"A flat 2D user-interface design filling the entire canvas edge to edge, as shown on a {overlay.get('device') or 'laptop'} screen — pure screen pixels only. "
            if is_screen
            else f"A clean typography graphic for a {ratio or '16:9'} video text overlay. "
        )

    parts.append(_text_rules(overlay.get("text") or "", bool(reference_count)) + " ")
    if not reference_count:
        parts.append("Do not draw any logo, wordmark, brand name, icon or emblem — only the quoted text. ")
    placement = overlay.get("placement") or ""
    if single_line:
        placement = _without_clauses(placement, _SMALL_PRINT_WORDS, "centered")
    if not reference_count:
        placement = _without_brand_mentions(placement, "centered")

    if is_screen:
        # Described as a flat UI design, not a device: naming the device makes
        # Seedream draw the hardware, and any filler UI words come out garbled.
        parts.append(
            f"Interface: {(overlay.get('screen_content') or 'a clean app layout').rstrip('. ')}. "
            f"UI style: {(plan.get('screen_style_guide') or 'modern, clean, high-contrast interface').rstrip('. ')}. "
            "The text is the focal element, large and easy to read. "
            "All other interface elements are textless: solid placeholder bars, shapes, icons and image blocks with no letters. "
            "No laptop, no phone, no device frame or bezel, no desk, no hands, no reflections, no perspective."
        )
    else:
        if not has_anchor:
            parts.append(
                f"Typography style: {(plan.get('style_guide') or 'bold modern sans-serif, white text with a subtle dark shadow').rstrip('. ')}. "
            )
        parts.append(
            f"Placement in the {ratio or '16:9'} frame: {placement or 'centered'}. "
            + (
                "Keep the same flat solid backdrop as Image 1 with nothing else in the image."
                if has_anchor
                else f"Everything sits on a flat solid {plan.get('backdrop') or 'neutral dark grey'} backdrop with nothing else in the image — "
                "no scene, no people, no objects, no texture, no gradient."
            )
        )
    return "".join(parts).strip()


_TYPOGRAPHIC = str.maketrans({"‘": "'", "’": "'", "“": '"', "”": '"', "–": "-", "—": "-", "…": "..."})


def _comparable_text(value: str) -> str:
    """Text as compared by the read-back check.

    Letter case and punctuation count — a dropped "&" or a split "Mar-keting"
    is a real error. Only whitespace, typographic quote/dash variants and emoji
    (which transcription drops) are ignored.
    """
    import unicodedata

    value = (value or "").translate(_TYPOGRAPHIC)
    return "".join(ch for ch in value if not ch.isspace() and unicodedata.category(ch) not in ("So", "Sk", "Mn", "Cf"))


def _read_back_matches(image_data_url: str, expected: str, lenient: bool, ignore_logos: bool) -> bool:
    """Ask the vision LLM to transcribe the render and compare it to the text.

    Strict: the render contains exactly the expected text. Lenient (screens,
    where clocks and UI chrome are legitimate extras): it only has to contain
    it. ignore_logos leaves copied logo/wordmark lettering out of the
    transcription, so a render built from a brand reference is still checked
    strictly — stray small print is caught.
    """
    logo_rule = (
        " Leave out any lettering that is part of a logo, brand wordmark or brand icon." if ignore_logos else ""
    )
    ark = Ark()
    resp = ark.responses.create(
        model=prompt_model(),
        input=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": (
                            "Transcribe every piece of legible text in this image exactly as rendered, letter by letter, "
                            "including any misspellings, stray small print and hyphens at line breaks." + logo_rule
                            + " Return JSON only: {\"text\": \"...\"}. Separate lines with a space."
                        ),
                    },
                    {"type": "input_image", "detail": "high", "image_url": fit_for_llm(image_data_url)},
                ],
            }
        ],
        temperature=0,
        thinking={"type": "disabled"},
    )
    try:
        read = str(_parse_json_object(_extract_output_text(resp)).get("text") or "")
    except Exception:
        # A read-back that cannot be parsed is not evidence of a misspelling.
        return True
    squash = _comparable_text
    if lenient:
        return squash(expected) in squash(read)
    return squash(read) == squash(expected)


def _seedream(prompt: str, size: str, images: list[str]) -> str:
    ark = Ark()
    kwargs = {
        "model": SEEDREAM_MODEL_ID,
        "prompt": prompt,
        "size": size,
        "response_format": "b64_json",
        "watermark": False,
        "output_format": "png",
        # The prompt optimizer rewrites prompts and can alter the quoted text,
        # which is the one thing this flow must keep verbatim.
        "optimize_prompt": False,
    }
    if images:
        kwargs["image"] = images
    resp = ark.images.generate(**kwargs)
    for img in getattr(resp, "data", None) or []:
        b64 = getattr(img, "b64_json", None)
        if b64:
            return f"data:image/png;base64,{b64}"
    raise RuntimeError("Seedream returned no image.")


def _save_png(data_url: str) -> str:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    name = f"{OVERLAY_FILE_PREFIX}{int(time.time() * 1000)}-{uuid.uuid4().hex[:6]}.png"
    with open(os.path.join(OUTPUT_DIR, name), "wb") as f:
        f.write(base64.b64decode(data_url.split(",", 1)[1]))
    return "/files/" + name


def _render_one(overlay: dict, plan: dict, ratio: str, anchor: Optional[str], references: list[dict]) -> dict:
    ref_images = [references[n - 1]["image"] for n in overlay.get("use_references") or []]
    size = _overlay_size(overlay, ratio)
    prompt = build_image_prompt(overlay, plan, ratio, bool(anchor), len(ref_images))
    images = ([anchor] if anchor else []) + ref_images
    text = overlay.get("text") or ""
    image = ""
    spelling_ok = False
    for _ in range(1 + MAX_SPELLING_RETRIES):
        image = _seedream(prompt, size, images)
        if not text.strip():
            spelling_ok = True
            break
        try:
            spelling_ok = _read_back_matches(
                image, text, lenient=overlay.get("kind") == "screen", ignore_logos=bool(ref_images)
            )
        except Exception:
            spelling_ok = True
        if spelling_ok:
            break
    return {
        **overlay,
        "image": _save_png(image),
        "image_prompt": prompt,
        "image_model": SEEDREAM_MODEL_ID,
        # 0 = text-to-image; otherwise anchor and/or reference images were inputs.
        "image_inputs": len(images),
        "spelling_verified": spelling_ok,
        "error": "",
    }


def generate_overlay_images(
    *,
    plan: dict,
    ratio: str,
    anchors: Optional[dict] = None,
    references: Optional[list[dict]] = None,
) -> list[dict]:
    """Render every overlay in the plan that a reference does not already cover.

    anchors optionally maps kind -> an existing image to match (e.g. the first
    overlay of an earlier shot, or the siblings when one overlay is
    regenerated). When a kind has no anchor, its first overlay — preferring one
    that does not carry a brand reference — is rendered and becomes the anchor
    for the rest. Covered overlays are returned untouched, without an image.
    """
    references = references or []
    overlays = [o for o in (_clean_overlay(x, references) for x in (plan.get("overlays") or [])) if o]
    anchors = {k: resolve_image_input(v) for k, v in (anchors or {}).items() if k in OVERLAY_KINDS and str(v or "").strip()}
    results: list[Optional[dict]] = [None] * len(overlays)

    for i, o in enumerate(overlays):
        if o["covered_by_reference"]:
            results[i] = {**o, "image": "", "image_prompt": "", "image_model": "", "spelling_verified": False, "error": ""}

    def safe_render(idx: int, anchor: Optional[str]) -> dict:
        overlay = overlays[idx]
        try:
            return _render_one(overlay, plan, ratio, anchor, references)
        except Exception as e:
            return {**overlay, "image": "", "image_prompt": "", "image_model": SEEDREAM_MODEL_ID, "spelling_verified": False, "error": str(e)}

    # Style anchors first, sequentially: every other render depends on them.
    for kind in OVERLAY_KINDS:
        if kind in anchors:
            continue
        candidates = [i for i, o in enumerate(overlays) if results[i] is None and o["kind"] == kind]
        if not candidates:
            continue
        first = next((i for i in candidates if not overlays[i]["use_references"]), candidates[0])
        results[first] = safe_render(first, None)
        if results[first]["image"]:
            anchors[kind] = resolve_image_input(results[first]["image"])

    pending = [i for i, r in enumerate(results) if r is None]
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = {i: pool.submit(safe_render, i, anchors.get(overlays[i]["kind"])) for i in pending}
        for i, fut in futures.items():
            results[i] = fut.result()
    return [r for r in results if r]


def build_overlay_prompt_block(overlays: list[dict], first_image_number: int, covered: Optional[list[dict]] = None) -> str:
    lines = [
        "EXACT ON-SCREEN TEXT (highest priority): every piece of legible text in this video is supplied as a reference image. "
        "Reproduce each one exactly as shown in its image — identical spelling, letters, letter case, punctuation, logos, font, "
        "weight, size, colour and design. Never invent, retype, translate or add any other text.",
    ]
    for i, o in enumerate(overlays):
        n = first_image_number + i
        where = f"{o.get('shot')}: " if o.get("shot") else ""
        text = " / ".join(line for line in str(o.get("text") or "").split("\n") if line.strip())
        shows = f", showing \"{text}\"" if text else ""
        if o.get("kind") == "screen":
            device = o.get("device") or "screen"
            lines.append(
                f"- {where}[Image {n}] is the exact content of the {device} screen{shows}. "
                f"Display [Image {n}] on the {device} screen, following the screen's perspective, keeping all text crisp and readable."
            )
        else:
            placement = f" at {o['placement']}" if o.get("placement") else ""
            lines.append(
                f"- {where}[Image {n}] is the exact text overlay / graphic{shows}{placement}. "
                f"Composite only its typography and logo over the shot — ignore its flat backdrop colour."
            )
    for o in covered or []:
        where = f"{o.get('shot')}: " if o.get("shot") else ""
        what = str(o.get("text") or "the logo card").replace("\n", " / ")
        lines.append(
            f"- {where}{what} — this is already one of the supplied reference images; show it exactly as that image, "
            "without retyping or redrawing any of its text or logo."
        )
    return "\n".join(lines)
