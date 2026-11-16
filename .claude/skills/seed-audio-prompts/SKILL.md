---
name: seed-audio-prompts
description: Write, structure, and fix prompts for BytePlus Seed Audio 1.5 — voice-overs, multi-speaker dialogue, reference-voice (@Audio1) cloning, sound effects, ambience, background music, songs, timeline/timestamp scripts, video dubbing, and separate-track (stem) requests. Use WHENEVER a user wants a Seed Audio prompt written, optimized, or debugged, picks a prompt format (simple description vs audio script vs timeline), designs a character voice, or asks why Seed Audio output has wrong timing, muddy speech, buried dialogue, read-aloud labels, or unwanted music/noise. Also use for the Seed Audio tool and "Seed Audio" projects in this app (Dialogue Fix, Video Dubbing, Voice Reference, Stem Separation).
---

# Seed Audio 1.5 Prompt Guide

Seed Audio 1.5 generates speech, sound effects, ambience, and instrumental music from one prompt, optionally guided by reference audio (voices) or a reference video (dubbing). Unlike conventional TTS, the *scene* — space, distance, sound events, music — is part of the prompt and shapes the result.

## Workflow

1. Identify what the user needs (voice-over, dialogue, SFX, ambience, BGM, song, dubbing, stems) and pick a **complexity level** (§1).
2. Build the prompt from the **element techniques** (§2): voices, dialogue + vocal actions, ambience/SFX, music.
3. Add **constraints** for anything that must *not* appear (music, noise, reverb, second speaker, silence at ends).
4. Run the **checklist** (§4) before returning the prompt.

Return the finished prompt in a code block, ready to paste. When the user supplies dialogue, never change its words.

## 1. Choose the complexity level

| Level | Complexity | Use when | Typical use cases |
|---|---|---|---|
| Simple description | Low | Only the desired audio and its key traits matter | Short voice-overs, a single SFX, simple ambience |
| Audio script | Medium–high | The order of events and how sounds interact matter | Monologues, audiobooks, ads, drama scenes, music builds |
| Timeline (timestamp) script | Medium | Exact start, duration, and overlap of each sound matter | Fine-grained control, syncing to picture, dubbing |

### 1.1 Simple description

**Structure:** audio subject + auditory characteristics + required constraints. The subject can be speech, ambience, an SFX, or a mix.

- *Single-speaker voice-over:* start with a recording-constraint block, e.g. "Generate only this speaker as dry, close-miked speech. Do not include music, sound effects, ambient noise, room reverb, a second speaker, or silence at the beginning or end. Allow only natural breaths between sentences. Do not leave long pauses." Then the voice description and "Deliver the following continuously: “…”".
- *Multi-speaker:* describe each voice first (age, accent, timbre, attitude), then the lines as `Name（emotion, delivery）：“line”`.
- *Reference voice:* tag the speaker with `@Audio1` inside the description, e.g. "The speaker (a young adult male, deep steady voice, Castilian Spanish accent, presenter, @Audio1) addresses the camera at a steady, moderate pace: “…”". Include the acoustic setting ("indoor office, close-miked, no noticeable reverb").
- *Single SFX:* source + action + texture + distance + "No speech or music." e.g. "A heavy metal pipe falls onto a metal surface, a dull, low-pitched, weighty impact… close and clear against a quiet background. No speech or music."
- *Mixed ambience:* setting + layered sources + depth + "no intelligible dialogue".

### 1.2 Audio script

**Structure:** opening audio and setting → sequential speech, SFX, and music → transitions/changes between sounds → ending. State whether each music/SFX element is **continuous or brief**, and what happens *when* each line or action occurs.

Template:
> 〈Use case or style〉. In 〈setting〉, first hear 〈opening sound〉, followed by 〈a new sound or line〉. When 〈a line, action, or sound〉 occurs, 〈another sound〉 enters simultaneously and 〈builds / fades / approaches / recedes〉. End with 〈how speech, music, and ambience resolve〉.

Patterns that work:
- **Distance changes:** "footsteps splash through puddles in the distance, gradually drawing closer… once the door closes, the outdoor rain becomes muffled".
- **Music builds:** "Instrumental music only. Begins with solo piano… strings gradually enter beneath… light percussion joins in the middle… percussion drops out first, strings soften, piano resolves on a stable chord. No speech. Duration: 15 seconds."
- **Action scenes:** interleave quoted lines with cause→effect sounds: "As soon as she finishes, a deep roar sounds in the distance… The instant his shout ends, a violent impact erupts and the music shifts into intense orchestral scoring."
- **Ads with reference voice:** describe the BGM (instruments, kept understated beneath the voice, fades after the final line), then `Woman（@Audio1, accent, register, tone, delivery）：“…”`, then how the ending resolves.
- **Bracketed layers for long drama:** alternate `【BGM】…`, `【SFX】…` and `Name（@AudioN, emotion, delivery）：line` blocks. Re-state continuous layers when they change ("the cello pulses continue, growing more insistent beneath the argument"; "keep the footsteps continuously audible beneath the following exchange, gradually growing clearer").
- **Songs:** this is the one place vocals + music combine. Give Genre (style, BPM, meter), Vocal, Instrument, Mood, Structure (e.g. Intro (4 bars) → Verse 1 → Hook → … → Outro fade), then Lyrics with section tags `[Intro] [Verse 1] [Hook] [Bridge] [Outro]`.
- **Video dubbing:** describe the setting and the full sequence of what happens on screen with sounds and quoted lines in order (who speaks, how, through what — e.g. "through the smartphone speaker", "old-fashioned public-address system with slight speaker distortion"). Say what *not* to add ("Do not use added non-diegetic disaster music, modern alarms…"). Precise music cues may be time-anchored ("BGM begins at exactly 20 seconds… stop abruptly at exactly 25 seconds with no fade").

### 1.3 Timeline (timestamp) script

Seed Audio 1.5 follows timing for SFX, BGM, and their coordination with dialogue.

**Format 1 — inline ranges:** `[start:end]` before each element, e.g. `[0.0s:49.5s] Energetic electronic music plays throughout. [0.0s:1.2s] A crisp splash… [1.9s:4.9s] "line" … [13.4s:15.4s] The music shifts to…`

**Format 2 — full timeline:**
```
[General Requirements]
〈Purpose, overall style, target duration〉. Speak only the dialogue. Do not read character names, timecodes, or instructions aloud.
[Speakers]
Character A: 〈perceived age, vocal gender, timbre, speech traits〉.
Character B: 〈…〉.
[Timeline]
00:00–〈end〉 [Background] 〈setting, continuous ambience, acoustics, distance, volume〉.
00:00–〈time〉 [Music] 〈style, mood, instruments, tempo, entry/exit〉.
〈start–end〉 [Sound Effect] 〈source, texture, distance, change over time〉.
〈start–end〉 Character A (〈emotion, pace, pauses, emphasis〉): "〈dialogue〉"
〈start–end〉 [Pause] 〈who stops, which background continues〉.
〈start–end〉 Character B (〈delivery〉): "〈dialogue〉"
〈start–end〉 [Music] 〈enter / build / soften / stop〉.
〈start–end〉 [Ending] 〈what remains and how each layer concludes〉.
```
Add segments as needed; omit unused characters or categories. Use explicit silent rows for timed pauses, e.g. `00:12-00:14 Mara (silent pause, holding back unease):`. Inline vocal actions go in angle brackets: `<soft throat clearing>`, `<soft breath>`, `<soft paper rustling>`.

## 2. Describing each element

### 2.1 Character voice

**Structure:** perceived age + vocal gender + register + texture + distinctive traits + emotional state + pace.

Template: "A 〈age, gender〉 voice in a 〈register〉, with a 〈texture〉 tone and 〈traits〉. Convey 〈emotion or progression〉, speaking at 〈pace and pause pattern〉. Dialogue: “〈content〉”"

| Dimension | Vocabulary |
|---|---|
| Age / gender | child's, young adult, middle-aged, elderly; male, female, androgynous |
| Register | deep/low-pitched, mid-to-low, mid-range, mid-to-high, high/piercing |
| Texture | deep and full-bodied, resonant, rich, light, smooth, slightly husky, raspy, gritty |
| Traits | breathy, slightly nasal, light vocal fry, subtle vocal tremor, crisp articulation, relaxed articulation |
| Emotion | calm, gentle, curious, hesitant, delighted, sad, tense, angry, resolute, restrained, offhand |
| Pace / rhythm | slow, unhurried, normal, slightly brisk, hurried, natural pauses, gradually speed up/slow down, slow down for key lines, slow down at sentence endings |

Archetypes: *audiobook narrator* — 30s–40s, grounded baritone, warm textured, calm and immersive, slow measured pace. *Villain* — low hoarse, slightly gritty, cold and mocking, restrained hostility. *Morning ad* — mid-20s, fresh clean warm tone, reassuring, moderate steady pace. *Reserved female lead* — cold crisp tone, low breathy, restrained emotion. *Meditation guide* — slow grounded pace, soft warm, sincere and peaceful.

Rules: avoid vague words ("pleasant", "sophisticated"); always give age range, vocal weight, emotion, and pace; tag every dramatic line with delivery (tense / weary / mocking / breathless / steady). Accent belongs in the voice description ("natural British accent", "Castilian Spanish accent").

### 2.2 Dialogue and nonverbal vocalizations

**Structure:** exact dialogue + vocal actions and their timing + what is read aloud. Keep performance directions clearly separate from spoken words.

- Dialogue: `Says, “…”`, `Asks, “…”`, `Narration: “…”`.
- Breathing: a soft inhale, a slow exhale, a deep breath, rapid panting.
- Laughter: a soft chuckle, an involuntary laugh, hearty laughter.
- Sadness: a soft sigh, sobbing, muffled crying.
- Other: soft throat clearing, a gasp of surprise, a grunt of effort, a muffled groan of pain.
- Timing: before speaking, during speech, during a pause, after the line.
- Read-aloud control: "Speak only the quoted dialogue" / "Read both narration and dialogue" / "Do not read speaker labels or directions aloud".

Simple voice-over → voice + delivery + lines only. Detailed performance → add emphasis, emotional shifts, vocal actions. Multi-speaker → define every voice first, then per-line delivery.

### 2.3 Ambience and sound effects

**Structure:** setting and acoustics + source and action + texture + distance and volume + timing and change. Not every element is needed every time.

- **Ambience** (continuous, sets place/mood/distance): quiet room tone, soft wind, steady rainfall, indistinct crowd murmur, distant street traffic, sparse distant bird calls, distant rumbling thunder, distant ocean waves.
- **SFX** (tied to an action/event; give texture, timing, change): soft footsteps crunching through snow, subtle clothing rustle, water droplets hitting the floor, two light metallic clinks, a sudden crackle as a log is added to the fire, gentle paper rustling, a lock turning.
- Acoustics: small enclosed room, open outdoor space, vast hall, subtle reverb, long reverberation. Texture: crisp, dull, sharp, soft, heavy and resonant, faint and scattered, gritty. Distance: close and clear, distant and indistinct, faint, prominent, muffled through a wall, approaching from a distance. Timing: throughout, occasional, two consecutive, during speech, immediately after the line, gradually intensifying, slowly fading out.
- Keep each scene to **3–5 sound effects**: at least one ambient bed plus two action/event sounds. Combat/drama can add echo, tense air, a spiritual hum.

### 2.4 Background music

**Structure:** purpose and style + mood + instruments/arrangement + tempo/rhythm + entry and development + volume balance and ending.

- Style: dialogue underscore, opening theme, cinematic orchestral, acoustic folk, light jazz, ambient electronic. Mood: warm and soothing, light and upbeat, melancholic, mysterious and unsettling, grand and triumphant. Arrangement: piano lead, string bed, brass accents, light percussion, sustained synth pads, instrumental only. Tempo: slow / moderate / fast, steady pulse, free rhythm, ~72 BPM, 4/4. Entry: at the opening, after the dialogue, builds in layers, gradually swells, rises to a climax. Ending: below the voice, soft underscore, soften during dialogue, stop abruptly, resolve naturally, slowly fade out.
- Pairings: suspense audiobook → low strings + faint wooden flute, slow; morning ad → warm acoustic guitar, bright, soft lo-fi; fantasy combat → deep cinematic strings + sparse drum hits, rising tension; tavern → lively fiddle + light percussion; meditation → minimal airy pad, no heavy rhythm.
- **Hard rules:** BGM is **instrumental only** (vocals only in explicit song prompts). In every drama and ad prompt, keep the music **low and secondary to the voice** so speech stays clear. No strong drumbeats under narration-only content. 15-second ads: a single instrument, not a complex arrangement.

### 2.5 Multiple speakers and separate tracks

To get separated outputs, list every element that needs its own track (each speaker's dialogue, SFX, BGM, and/or the full mix) and **name each track**, e.g. `mixed`, `dialogue_mara`, `dialogue_john`, `sfx`, `bgm` — use names that match the project's speakers.

## 3. Reference audio and video in this app

- Reference clips are numbered in selection order and are addressed as `@Audio1`, `@Audio2`, … inside the speaker's description: `Emma（@Audio1，angry，sharply calling out）：Ryan！Stop！`. One speaker = one `@AudioN`; keep the mapping consistent for every line.
- Voice-reference clips: 2–30 s each, ≤ 6 clips, ≤ 180 s total, WAV/MP3.
- **Video dubbing needs the complete spoken text in the prompt** — the API rejects a dub with no lines (`SpeechContentNotSpecifiedByPrompt`). Write the scene as an audio script or timeline aligned to what happens on screen.
- Dubbing also **checks the prompt's lines against the speech it hears in the video**. When the source speech is garbled or mispronounced (common for non-Latin-script languages in Seedance output), lines written in native script (e.g. Tamil script) fail that check with the same `SpeechContentNotSpecifiedByPrompt` error, even though they're complete. Fix: write the lines **romanised** (e.g. `"Adhu naan dhaan kannu. Irubadhu vayasula."`) and state the language ("Spoken in Tamil"). Verified on a Tamil Seedance clip: native script → 400, romanised → 200. Native script works fine for plain TTS and on videos whose speech matches.
- Dubbing and translation return **audio only**; the app's *Replace original audio* muxes it onto the video.

## 4. Checklist before returning a prompt

- [ ] Right complexity level; timeline used only when timing truly matters.
- [ ] Every speaker: age, gender, register, texture, emotion, pace (plus accent / `@AudioN` when relevant).
- [ ] Every dramatic line has a delivery tag; directions are separated from spoken words.
- [ ] Read-aloud rule stated when labels, timecodes, or directions appear ("Speak only the dialogue…").
- [ ] Ambience + 3–5 SFX max, each with distance/timing; continuous vs brief is explicit.
- [ ] BGM instrumental, below the voice, with entry and ending described.
- [ ] Exclusions stated (no music / no SFX / no reverb / no second speaker / no silence at ends) where they matter.
- [ ] User's dialogue words unchanged.
