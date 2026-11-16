---
name: additional-camera-angle-helpers
description: >
  Use this skill whenever a user wants stronger camera-angle language for storyboard prompts, video prompts, shot lists, Seedance prompts, cinematography notes, or visual prompt refinement. Use it when the user asks for more dynamic framing, better shot variety, angle suggestions, or wants to know what camera angle best communicates power, vulnerability, scale, intimacy, unease, or immersion. This skill should expand camera-angle choices without rewriting the scene itself.
---

# Additional Camera Angle Helpers

A skill for selecting and applying stronger camera-angle language to storyboard prompts, video generation prompts, shot descriptions, and cinematic prompt blocks.

When to use this skill
User asks for additional camera angles, framing options, or shot variation
User wants a storyboard or video prompt to feel more cinematic, dynamic, or visually intentional
User wants to understand what angle best communicates power, vulnerability, intimacy, suspense, scale, or disorientation
User already has a scene prompt and wants camera-angle refinement without changing the story content
User wants quick angle suggestions for dialogue, product, action, thriller, or emotional scenes

Core workflow
Read the shot or scene intention first — Decide what the image needs to communicate emotionally or spatially before choosing an angle
Choose one primary camera angle — Pick the angle that best carries the shot's meaning
Add one support element if needed — Usually one framing term or one movement term; avoid stacking many instructions
Keep the language concrete — Use short visual phrases that a generative model or storyboard artist can parse quickly
Escalate only when motivated — Use Dutch, worm's-eye, or extreme overheads only when the scene truly benefits from stylization

Angle anatomy
The most useful camera-angle instruction usually has 3 parts:

1. PRIMARY ANGLE      — eye-level, low angle, high angle, bird's-eye, worm's-eye, Dutch, over-the-shoulder, POV
2. FRAMING            — close-up, medium shot, medium wide, wide shot, top-down wide
3. OPTIONAL MOTION    — slow push-in, pull-back, pan, tilt, orbit, crane, handheld

Best practice format:
`<primary angle>, <framing>, <optional motion or emphasis>`

Examples:
`low angle, medium close-up, slow push-in`
`high angle, wide shot, subject isolated in frame`
`over-the-shoulder, eye-level, shallow depth of field`

Angle reference
1. Static Angles

Eye-level — neutral and natural; best default when the camera should not judge the subject
Use for: dialogue, realism, product demos, observational scenes
Helper: `eye-level camera, natural perspective`

Low angle — camera looks upward; makes the subject feel powerful, dominant, heroic, or intimidating
Use for: hero entrances, authority figures, action beats, premium product framing
Helper: `low angle shot, subject feels powerful and imposing`

High angle — camera looks downward; makes the subject feel vulnerable, smaller, observed, or exposed
Use for: defeat, loneliness, awkwardness, surveillance
Helper: `high angle shot, subject appears small and exposed`

Bird's-eye / top shot — camera looks almost straight down; useful for layout, choreography, scale, and geography
Use for: city grids, fight staging, flat-lay product setups, tactical overheads
Helper: `bird's-eye view, top-down composition, strong spatial clarity`

Worm's-eye — extreme low view from beneath the subject; feels mythic, exaggerated, overwhelming, or surreal
Use for: towering architecture, creature reveals, editorial hero shots, monumentality
Helper: `worm's-eye view, towering scale, exaggerated vertical perspective`

Dutch angle — tilted horizon; creates unease, imbalance, panic, chaos, or psychological tension
Use for: thrillers, dream logic, breakdown moments, disorientation
Helper: `subtle Dutch angle, off-balance composition, uneasy mood`

2. Character-Centered Angles

Over-the-shoulder — frames one subject from behind while looking toward another subject or object
Use for: conversations, interrogations, reveals, screen/device framing
Helper: `over-the-shoulder framing, foreground shoulder soft, subject in focus`

POV shot — shows what the character sees; strongest when the scene needs immersion or subjectivity
Use for: discovery, danger, romance, first-person tension
Helper: `POV shot from the character's perspective`

Reverse angle — cuts to the opposite side of an interaction, useful for coverage continuity
Use for: shot-reverse-shot dialogue, reaction coverage, second-subject reveals
Helper: `reverse angle on the second subject, matching screen direction`

Profile / side angle — subject seen from the side; feels graphic, introspective, elegant, or confrontational
Use for: silhouette work, quiet moments, stylized portraits, character sheet variants
Helper: `side profile angle, clean silhouette, graphic composition`

3. Strong Pairings

Low angle + close-up — authority, menace, confidence, declarations
Helper: `low angle close-up, dominant facial presence`

High angle + wide shot — isolation inside a larger environment
Helper: `high angle wide shot, subject isolated within the environment`

Bird's-eye + wide — layout, spatial logic, environmental storytelling
Helper: `top-down wide shot, strong geometry and spatial storytelling`

Eye-level + medium shot — safest default for dialogue and grounded realism
Helper: `eye-level medium shot, balanced natural framing`

4. Motion Pairings

Low angle + slow push-in — power, awe, dread
Helper: `low angle, slow push-in, rising tension`

High angle + pull-back — withdrawal, distance, emotional loss
Helper: `high angle, slow pull-back, emotional distance increasing`

Bird's-eye + crane move — grandeur, scale, reveal
Helper: `bird's-eye setup with gentle crane movement, large-scale reveal`

Dutch angle + handheld — unstable, intense, chaotic
Helper: `subtle Dutch angle, controlled handheld energy`

Recommended defaults
If the prompt is too vague to justify a stylized choice, use one of these:

`eye-level medium shot`
`low angle medium close-up`
`high angle wide shot`
`over-the-shoulder dialogue framing`
`bird's-eye top-down composition`

Prompt snippets
Hero entrance:
`low angle, medium wide shot, slow push-in, subject feels powerful`

Emotional defeat:
`high angle, wide shot, subject appears small within the environment`

Tense conversation:
`over-the-shoulder framing, eye-level, shallow depth of field`

Surreal unease:
`subtle Dutch angle, off-balance composition, psychological tension`

Product showcase:
`low angle hero framing, slow orbit, clean premium lighting`

Tactical overhead:
`bird's-eye view, top-down layout, clear spatial relationships`

Core rule
Do not overload a single shot with too many camera instructions.

Pick one dominant angle first.
Then add one framing term.
Then add one movement term only if the shot benefits from motion.

Good:
`low angle, slow push-in, medium close-up`

Too crowded:
`low angle, bird's-eye, handheld, whip pan, macro, 14mm, dolly zoom`

Common pitfalls to avoid
Don't stack multiple contradictory angles in the same shot. A shot cannot be both bird's-eye and low angle
Don't use Dutch angles casually. They carry strong psychological meaning and become cheesy if overused
Don't confuse angle with movement. `Pan` and `tilt` are moves, not viewing angles
Don't use extreme stylization when an eye-level or simple low/high angle would communicate the beat more clearly
Don't forget framing. `Low angle` alone is weaker than `low angle medium close-up`
Don't write emotional abstraction without visual instruction. `Powerful` is weaker than `low angle, subject towering in frame`

Iteration patterns
When the user pushes back on visual staging:

"Make it more powerful" → move toward low angle, tighter framing, slower push-in
"Make it feel more vulnerable" → use high angle, wider frame, more negative space
"Make it feel bigger" → move toward bird's-eye, crane, wider compositions, stronger geometry
"Make it more tense" → use over-the-shoulder compression, selective shallow focus, or a subtle Dutch angle
"Make it more intimate" → use eye-level or low-angle close framing with shallow depth of field
"Make it more surreal" → use Dutch angle, worm's-eye, unusual scale relationships, or controlled handheld energy

Output format
Always return camera-angle help as short, directly usable prompt language rather than long prose explanation unless the user explicitly asks for theory.
Prefer one-line prompt helpers, grouped lists, or quick pick recommendations.
When rewriting an existing prompt, preserve the scene content and only strengthen the camera-angle instruction layer.
