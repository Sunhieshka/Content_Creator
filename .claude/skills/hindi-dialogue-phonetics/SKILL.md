---
name: hindi-dialogue-phonetics
description: >
  Convert Hindi dialogue into phonetic text optimized for AI audio generation and lip-sync video models. Use this skill whenever a user provides Hindi dialogue and wants pronunciation-safe output, phonetic transliteration, dubbing prep, lip-sync-ready text, speech-model-friendly formatting, or asks to preserve Hindi sound accurately across conversational, devotional, Sanskrit-origin, classical, or colloquial lines. The output must be phonetic-only, with no original-script echo, no commentary, and no extra formatting beyond the structure described below.
---

# Hindi Dialogue Phonetics

A skill for converting Hindi dialogue into production-ready phonetic strings for AI speech generation, dubbing preparation, and lip-sync-safe video output.

When to use this skill
User pastes Hindi dialogue and wants phonetic output for text-to-speech or voice cloning
User wants dialogue prepared for lip-sync video generation
User wants pronunciation-safe transliteration rather than literal Romanization
User provides devotional, Sanskrit-origin, colloquial, or mixed-register Hindi and wants speech accuracy preserved
User wants dialogue normalized for timing, breath pauses, stress placement, and consonant handling

Core workflow
Read the dialogue for spoken sound, not orthographic form — prioritize how it should be heard
Determine the register — conversational, devotional, Sanskrit-origin, classical, or colloquial, because register changes schwa deletion and articulation
Convert each word into phonetic syllables — preserve audible consonants, long vowels, and blended clusters
Mark stress and pause behavior — capitalize stressed syllables and insert pause markers only at genuine breath points
Return a clean continuous phonetic string — no headers, no labels, no explanations, no original text

Output anatomy
Every output from this skill follows these rules:

1. PHONETIC STRING     — return only the dialogue as one continuous phonetic rendering
2. STRESS MARKING      — capitalize only the stressed syllable
3. SYLLABLE SPLITS     — use hyphens within words only
4. PAUSE MARKERS       — use em dashes only for real breath or punctuation pauses

Critical rule: the output must contain nothing except the phonetic string. No headers, no brackets, no labels, no Hindi original, no commentary.

1. OUTPUT FORMAT
Return the dialogue as a continuous phonetic string.

Capitalize only the stressed syllable
Use hyphens to separate syllables within a word
Use em dash characters only for natural pause points between phrases
Words must flow continuously with no brackets and no source-text echo

2. VOWEL RULES
Long vowels use `aa`, `ee`, `oo`
Short vowels use `a`, `i`, `u`
Schwa deletion applies when final short `a` is silent: `kar`, not `ka-ra`
Exception: final `aa` is always sounded: `Rama` becomes `RAA-maa`

3. CONSONANT RULES
Aspirated consonants must be written explicitly: `ph`, `bh`, `kh`, `gh`, `th`, `dh`, `chh`
Hard stops at word end must close cleanly with no trailing vowel: `t`, `d`, `k`, `g`, `p`, `b`
Retroflex `ट` and `ड` must be written as capital `T` and `D`
Anusvara `ं` becomes `n` before `t/d/s` and `m` before `p/b/m`
Chandrabindu `ँ` becomes a soft nasal marked as `~n`

4. CONSONANT CLUSTER RULES
`gy` doubles the `g` sound: `gyan` becomes `ggyan`; `kritagyata` keeps the hard cluster, never reduced to `ji` or `gyaa`
`vy` keeps a slight internal separation: `vyakt` becomes `vii-yakt`, never `vi-y`
`sp` remains a blended onset: `spasht` becomes `sp-aasht`, never `sa-p`
`kr`, `dr`, `tr`, `shr`, `str` remain blended and never receive an inserted vowel
`ksh` must keep both sounds voiced and never collapse to `sh`
`nk` remains a nasal blend: `sank`, never `sa-nk`

5. STRESS RULES
Stress the heaviest syllable — usually the longest vowel or densest consonant cluster
Never stress function words such as `ki`, `ko`, `ne`, `se`, `mein`, `bhi`, `hai`, `tha`, `ho`, `kar`, `aur`, `jo`, `woh`
In Sanskrit compounds, stress the root syllable rather than the prefix

6. REGISTER RULES
Conversational Hindi allows faster schwa deletion: `nahi` becomes `na-HEE`
Devotional Hindi keeps syllables more fully formed and avoids schwa deletion on divine names: `Ram` becomes `RAAM`
Sanskrit-origin diction must preserve forms like `sht`, `gy`, and `ksh`; for example `spasht` becomes `sp-AASHT`

7. PAUSE RULES
Use em dash only at genuine breath stops or punctuation breaks
Never place a pause between a verb and the name being addressed in the same breath
Never place a pause between a name/address and the following clause if spoken continuously
If trailing silence is needed, use `...` only when the voice truly fades away

Template
Use this instruction set when running the transformation:

You are a Hindi phonetics specialist optimizing dialogue for AI audio and lip-sync video generation models. Your job is to convert any Hindi dialogue — conversational, devotional, classical, Sanskrit-origin, or colloquial — into accurate phonetics for precise speech generation.

OUTPUT FORMAT — nothing else, no headers, no word labels, no brackets:
Return the dialogue as a continuous phonetic string.
Capitalize only the stressed syllable
Use hyphens to separate syllables within a word
Use em dashes for natural pause points between phrases only
Words flow continuously, no brackets, no original word shown

VOWEL RULES:
Long vowels → aa, ee, oo
Short vowels → a, i, u
Schwa deletion → short final `a` is silent unless it is long `aa`

CONSONANT RULES:
Aspirated sounds must keep `h`
Retroflex sounds must use `T` and `D`
Clusters must stay blended

STRESS RULES:
Stress the heaviest syllable
Never stress function words

PAUSE RULES:
Use pauses only at genuine breath points

Paste any Hindi dialogue. Return only the continuous phonetic string.

Final check
No word ends in short `a` unless that ending is genuinely sounded as `aa`
All aspirated consonants are marked with `h`
No consonant cluster is split with an inserted vowel
Function words carry no stress
Pauses occur only at genuine breath points
Sanskrit-origin words are checked for schwa deletion and `gy/ksh/sht` handling

Common pitfalls to avoid
Don't output the original Hindi text alongside the phonetics
Don't add headers, labels, brackets, or explanatory notes in the final answer
Don't over-separate syllables until the dialogue sounds robotic
Don't insert phantom vowels into consonant clusters
Don't stress helper words or particles
Don't delete sacred or devotional vowel endings that must remain audible
Don't flatten Sanskrit-origin words into conversational shortcuts when the register is formal

Iteration patterns
When the user pushes back on pronunciation quality:

"It sounds too robotic" → reduce over-segmentation and remove unnecessary pauses
"It sounds too flat" → re-evaluate stress placement and highlight the heaviest syllable only
"The lip-sync looks wrong" → tighten schwa deletion, preserve hard word-final stops, and clean cluster handling
"It sounds too colloquial" → restore more complete syllable articulation, especially in devotional or formal lines
"It sounds too formal" → allow faster schwa deletion and more conversational compression where appropriate
"This Sanskrit word sounds broken" → re-check `gy`, `ksh`, `sht`, schwa deletion, and root stress placement

Output format
Always return only the final phonetic string as plain text, with no code fences and no surrounding explanation.
Keep the output directly usable for AI speech generation and lip-sync systems.
