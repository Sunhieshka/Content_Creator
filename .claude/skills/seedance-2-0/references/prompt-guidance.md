# Prompt Guidance

Use this file when writing, compressing, or debugging the prompt itself.

## Target shape

Default target: one dense paragraph, roughly 30-100 Chinese words.

Recommended order:

`subject + action + scene + camera + style + constraints`

Put the first three elements early. Seedance pays the most attention to the front of the prompt.

## Genre router

| Genre | Lead with | Typical focus |
|---|---|---|
| Product | subject | surface, hero motion, clean lighting |
| Lifestyle | action | candid motion, handheld feel, warmth |
| Drama | scene | emotion, identity, restrained camera |
| Music video | style or motion | rhythm, camera energy, beat changes |
| Landscape | scene | scale, weather, slow reveal |
| Commercial | style | premium mood, controlled movement |
| Anime / stylized | style | render language, motion grammar |
| UGC | action | phone-camera realism, simple beats |

## Compression engine

Prefer:

- verbs over adjectives
- observable behavior over abstract praise
- one strong style anchor over five weak ones
- one action per shot

Cut in this order when the prompt gets bloated:

1. filler adjectives
2. repeated environment details
3. secondary style tokens
4. sound notes
5. extra camera modifiers

Never cut:

- subject
- action
- identity references

## Anti-slop checklist

Delete or replace words like:

- cinematic
- stunning
- beautiful
- masterpiece
- 8K ultra-real
- epic
- magical
- amazing

Replace them with measurable language:

- `slow push-in over 5 seconds`
- `single hard key from camera-left`
- `muted palette, subtle grain`
- `hands stay out of frame`

## Prompt compiler

Use this scaffold internally while drafting:

```text
Mode:
References:
Subject:
Action:
Scene:
Camera:
Light / Style:
Sound:
Constraints:
```

Then compile it back into plain text before submission.

## Prompt patterns

### T2V

`Young woman in a red windbreaker crosses a wet alley at night. Neon reflections ripple on the pavement. Slow tracking follow, medium shot. Cool blue ambience, restrained suspense.`

### I2V

`She turns toward camera, eyes narrowing slightly. Slow push-in from medium shot to medium close-up. Rain continues in the background.`

### R2V

`Transfer the dance timing and camera rhythm from @Video1 to the singer in @Image1. Keep the stage neon-lit and the cuts aligned to the beat.`

## Segmenting beats

Use short time segments only when necessary:

```text
0-2 s: stillness, wind lifts coat.
2-5 s: turns slowly toward camera.
5-7 s: direct eye contact, locked close-up.
```

If the clip becomes jittery, remove timestamps and return to one dominant beat.
