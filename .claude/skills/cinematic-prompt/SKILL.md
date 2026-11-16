---
name: cinematic-prompt
description: >
  Append a cinematography parameter block — Camera, Lens, Focal Length, and Camera Aperture — to a user's prompt WITHOUT changing, rewriting, or expanding the prompt itself. Use this skill whenever the user gives a film/TV/video idea, logline, scene, or shot and wants it to look "cinematic," "film-like," "shot on camera X," or wants camera/lens specs added. Trigger even when the user doesn't say "cinematic" — any time the task is to make a visual prompt more film-like. The original prompt text must be preserved verbatim; this skill only ADDS parameters. Do NOT use for prose fiction, scripts, or dialogue.
---

# Cinematic Prompt Skill

Core Rule (read first)
Do not change the user's prompt. Only add cinematic parameters to it.

Keep the original prompt text verbatim — same words, same order, same intent.
Do not rewrite it into a scene paragraph, do not add characters, plot, setting details, light, mood, or any new content.
The only thing this skill produces is the original prompt plus an appended block of cinematic parameters.
If you ever find yourself describing the scene, inventing a beat, or paraphrasing the prompt — stop. That is out of scope.

What gets added
Exactly four parameters, chosen to fit the tone of the prompt:

Camera — body/sensor
Lens — optical look
Focal Length — framing
Camera Aperture — depth of field
Workflow
Take the user's prompt exactly as written.
Read its tone (comedy, drama, thriller, etc.) and setting only enough to pick fitting parameters — do not absorb it into new prose.
Choose one value for each of the four parameters from the reference below.
Output: the original prompt, unchanged, followed by the parameter block.
If the prompt is too vague to choose parameters, pick sensible neutral defaults rather than inventing story content (or ask one short question).

Parameter Reference (pick to match tone)
Camera
| Camera | Character |
|---|---|
| ARRI Alexa 35 | Modern flagship; rich color — safe premium default |
| ARRI Alexa Mini LF | Large-format, clean, contemporary scripted look |
| Sony VENICE 2 | High dynamic range, great low light, cleaner/cooler |
| RED V-Raptor 8K | Crisp, punchy, high-res — action/commercial |
| Panavision Millennium DXL2 | Big-format prestige feature |
| 35mm film (Kodak Vision3) | Real grain, organic warmth, nostalgia |
Lens
| Lens | Look |
|---|---|
| Cooke S7/i ("Cooke Look") | Warm, flattering — great for comedy-drama |
| Zeiss Supreme Prime | Clean, neutral, modern |
| ARRI Master Prime | Sharp, high-contrast |
| Panavision Primo | Classic feature look |
| Anamorphic (Cooke/Panavision) | Oval bokeh, flares, widescreen scope, grandeur |
| Vintage glass (Lomo, Helios) | Dreamy, characterful, nostalgic |
Focal Length
| Length | Effect |
|---|---|
| 14–24mm | Wide; expansive environment, character dwarfed by setting |
| 28–35mm | Natural-wide; keeps subject and world together (good for two-handers) |
| 40–50mm | "Normal," human vision |
| 75–100mm | Compress, isolate a face — intimacy, reaction beats |
| 135mm+ | Heavy isolation, voyeur feel |
Camera Aperture
| Aperture | Effect |
|---|---|
| T1.3–T2 | Very shallow; one subject pops — intimacy, romance |
| T2.8 | Moderate-shallow; separated but readable — versatile default |
| T4–T5.6 | Balanced; multiple characters sharp — ensembles |
| T8–T11 | Deep focus; whole frame sharp — realism, scale |
Cine lenses use T-stops; still lenses use f-stops. Either is fine.

Output Format
Return the original prompt unchanged, then the appended parameters as one line text. Use this structure:'''<user's original prompt, verbatim> <Camera, Lens, Focal Length, Camera Aperture>'''
