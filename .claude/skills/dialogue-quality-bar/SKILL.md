---
name: dialogue-quality-bar
description: >
  Diagnose and fix mechanical, unperformable, or "screenplay-thesis" dialogue in scripts, scenes, video prompts, and any spoken-line writing. Use this skill whenever a user pushes back on dialogue ("this sounds bad", "not human", "wtf is this", "it's broken", "doesn't click"), asks for dialogue alternatives, requests rewrites of an exchange, or whenever Claude is about to write a multi-line dialogue exchange between characters in a tense scene (confrontation, interrogation, revelation, accusation). Also trigger when iterating on Seedance/Veo/Sora video prompts that contain dialogue, when writing screenplay scenes, or when a user shares lines they think "sound off." Pay attention to symptoms: repeated questions reworded, mirrored revenge maxims, characters answering immediately with no silence, closers that read as written-not-spoken. Apply the 3-beat template and diagnostic tests before locking any exchange.
---

# Dialogue Quality Bar

A skill for writing and rewriting dialogue that sounds spoken, not written. Focused on the specific failure modes that look fine on the page but collapse the moment someone reads them aloud.

When to use this skill
User says any version of: "this dialogue sounds bad," "not human," "broken," "doesn't click," "wtf is this"
User asks for 3–5 alternative versions of a line or exchange
User shares a dialogue exchange and asks for a rewrite
Claude is about to write a tense multi-line exchange (confrontation, interrogation, revelation, accusation, betrayal reveal, threat)
Iterating on video-gen prompts (Seedance, Veo, Sora) that embed dialogue
Writing screenplay scenes, audio drama, game cutscenes, or any spoken-line content
Core principle
Dialogue that looks fine on the page often fails the moment it's spoken. The most common failure is mechanical repetition that reads as escalation in print but sounds like an NPC quest loop when performed. The fix is almost never "polish the line" — it's restructure the beat.

The 5 diagnostic tests
Every dialogue exchange must pass all five before locking:

1. No verbatim repetition
If a character asks a question, they cannot ask a reworded version of the same question two beats later. Real escalation changes the angle — different verb, different stakes, different register.

Failing example:

ERIK: "What did you take?" (silence) ERIK: "Mila. What did you take from them?"

This reads fine on the page (the "from them" adds stakes) but sounds like a glitch when spoken — same verb, same construction, same question.

Fixed:

ERIK: "What did you take?" (silence) ERIK: "Mila." (just her name, pleading)

Or change the verb entirely on the second pass: take → do, say → mean, know → remember.

2. Silence must do work
A 3+ second silence between lines should mean something — refusal, dread, realization — and the camera (or audience focus) should be on the right face during it. The person reacting carries the silence. The person who just spoke does not.

If you're writing for screen, the silence beat should explicitly direct: "Hold on B's unreacting face for 3 seconds, only wind." For audio-only or text, write the silence as a deliberate paragraph break with a beat-marker like [3s].

3. No screenplay-thesis closers
The most seductive trap. Lines like:

"Everything they were going to take from us."
"Some things you can't take back."
"We were never going to make it out clean."
These are symmetrical, mirrored, conceptually neat. They read as the writer's thesis statement about the scene, not as something a person would actually say in the moment. They also tell the audience what to feel instead of letting them feel it.

Replace with off-balance answers:

"All of it."
"No."
"You don't want to know."
"They were already going to."
"Too late for that."
Short. Asymmetric. The audience fills in the meaning.

4. Non-answers are often stronger than answers
When a character refuses to confirm or deny, the audience imagines the worst possibility — which is almost always more powerful than whatever you'd have written. This is the hard-boiled noir tradition for a reason.

A character saying "You don't want to know" is more chilling than the same character explaining what they did. A character answering "No" to "Tell me you left something" is more devastating than a paragraph of confession.

5. The read-aloud test
Read the line out loud. Two failures show up immediately:

Writer-voice: "Did you commit this act against them?" — nobody talks like this
Symmetry: "I take from those who would take from me" — too clean, mirrored, declamatory
If you hear yourself slipping into performance mode (chest out, theatrical pause), the line is wrong. Real speech is shorter, messier, more off-balance than what scans well in print.

The 3-beat confrontation template
For tense confrontation scenes, this structure almost always works:

BEAT 1 — Direct ask
   Character A: [short, clipped question or accusation]

BEAT 2 — Refusal + escalation
   [silence, hold on Character B's unreacting face, 3 seconds]
   Character A: [the other character's name only, OR one syllable — pleading, cracking]

BEAT 3 — Off-balance answer
   Character B: [short, asymmetric reply that doesn't fully confirm — or refuses to answer]
Worked example:

ERIK: "How much did you take."
[3s silence on Mila's face — she doesn't react]
ERIK: "Mila."
MILA: "You don't want to know."
Three beats. Four short lines (one of which is silence). Erik's first line establishes stakes, the silence is her refusal, his second line is him cracking, her answer protects him by withholding.

Common bad patterns → fixes
Bad pattern	Why it fails	Fix
Same question reworded twice	Sounds like NPC dialogue loop	Replace second instance with just the other character's name
"What did you take?" → "What did you take from them?"	Same verb, same construction	Change verb: "take" → "do" → just the name
Mirrored revenge maxim closer	Reads as writer's thesis	Two-word non-answer ("All of it." / "No.")
Screenplay direction inside silence ("He swallows. A heartbeat passes.")	Not performable at fast pacing	Replace with camera beat: "Hold close-up 3s, only wind"
Character A asks → Character B answers immediately	Drains tension, no refusal beat	Insert 3s silence, then A presses with one syllable
Long explanatory answer to direct question	Telegraphs everything	Cut to one syllable or a non-answer
Question dressed up as statement-with-rising-tone	Sounds stilted when performed	Just make it a question, or make it flat
Generating alternatives
When a user pushes back on dialogue, always offer 3–5 fresh complete exchanges — not 3–5 variations of the same line. Each alternative should change the strategic angle of the scene:

The Direct Confrontation — A demands a specific object/answer
The Quiet Realization — A pieces it together aloud, not asking
The Betrayal Angle — A grieves who B used to be
The Threat/Consequence — A skips to what happens next
The Cold Open — A is already past denial, moving to what now
Each angle produces different lines. Show the user the angles, let them pick, then write the full exchange.

Iteration patterns
When a user pushes back, diagnose what they're reacting to:

User reaction	Likely cause	Fix
"Sounds bad" / "not human"	Writer-voice or symmetry	Read it aloud, shorten, asymmetric closer
"You keep repeating yourself"	Preserving flawed structure across rewrites	Throw out the whole exchange, rebuild from scratch — don't patch
"Wtf is this dialogue"	Multiple problems compounded	Offer 3–5 fresh angles, not variations
"It's broken"	Logical disconnect (line doesn't answer the prior beat)	Check that each line connects to the previous — closer should answer the question that was implicitly asked
"Doesn't click"	Rhythm/timing — usually too fast or too symmetrical	Add a silence beat, asymmetric the closer
Critical rule for iteration
If a user has already pushed back twice on a dialogue structure, throw out the structure entirely. Don't try to patch. Preserving any element of a rejected structure — even a single line — is the most common way to produce a third rejected draft. Start clean. Build from scratch using a different angle.

Output format when offering alternatives
When generating 3–5 alternatives, present each as a complete 3-beat exchange with a one-line gloss of why it works strategically:

## Option N — [The Angle Name]
> CHARACTER A: "line"
> *(beat description)*
> CHARACTER A: "line"
> CHARACTER B: "line"

*Why it works: [one sentence on the strategic shift and what it lets the audience feel]*
End by recommending one or two as the strongest with a one-sentence rationale, then ask which the user wants to use. Don't pick for them silently — give them the choice with reasoning.

What this skill is NOT for
Writing exposition dialogue (where characters share info for the audience) — that's a different problem
Comedic banter — different rhythm, different rules
Long monologues — these need their own structural analysis
Naturalistic ensemble scenes with overlapping speakers — different craft
Children's media — needs age-appropriate diagnostic