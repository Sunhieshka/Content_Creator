# Sound Writing Guide

Use this guide to optimize sound prompts. Every example demonstrates writing, not validated audio generation. Read the current package's `api-rules.md` first; an example here does not authorize a capability unconfirmed there. The instructions are English; output language continues to follow the user's input. Clearly labeled literal Chinese and mixed-language examples below retain that language intentionally.

## 1. Core: move from “what the work wants” to “what is heard”

Optimize audible relationships: who vocalizes, what they say, and how; which sound enters at which event; how foreground and background coexist; how sound develops and ends. Effective description does not require exhausting every acoustic parameter.

Clarify the two or three things the user cares about most; other details serve them. One paragraph usually suffices for a simple monologue; organize multiple characters by event. Use timestamps only when users supplied corresponding time points/intervals or explicitly requested timeline design. Cross-layer synchronization, multiple shots, or a total duration alone do not authorize new time points. Do not turn a simple request into a dense control table.

### Methods distilled from practical examples

These summarize user-provided practice guides and demonstration prompts. They are optimization strategies, not independently proven performance findings.

| Organization in examples | Method | Application |
| --- | --- | --- |
| Criminal-investigation phone call separately specifies character voice, telephone distance/distortion, sustained outdoor ambience, final braking and footsteps | Stable voice, transmission texture, environment, and action are separate information | A character can retain timbre while changing distance/telephone texture; do not substitute “a different raspy voice” for a telephone effect |
| Reconciliation drama moves one character from tentative to urgent, exhausted, and quietly pleading | Performance changes with lines and relationships | Organize supplied voice attributes once, then specify key emotional turns per line; “sad throughout” must not flatten plot |
| Science-fiction broadcast interweaves machines and dialogue; music stops when an alarm triggers | Sound changes have event causes | “Music stops when the alarm sounds” is clearer than “science fiction, tense, rich effects” |
| Livestream advances through stable character labels, short interruptions, production sounds, and interjections | Natural dialogue comes from rhythm and interaction | Retain repetitions, interruptions, and pauses instead of formalizing speech into written prose |
| New long-scene examples sustain music across multiple lines and overlap action effects with dialogue | A timeline describes concurrent sounds, not a single-sound pipeline | Give continuous music one interval and individual actions their own intervals; arrange exact overlap only with a basis |
| New extraction examples isolate particular voices, music, or specified ambience from source audio | Targets and output organization must be explicit | Distinguish extracting existing sound from generating a layered mix; three written layers do not establish three returned files |

Public supplementary material: Dreamina's official prompts combine multi-character dialogue, ambience, and music into scenes. Seed's official introduction emphasizes scene-level audio creation. A public user's cafeteria-dialogue example retains repeated forms of address and colloquial rhythm, supporting natural scene narration instead of per-line parameter tables. The user's one-off results are author reports, not guarantees of automatic mixing, precise timing, or other capabilities.

## 2. Preserve content; optimize control descriptions

First distinguish:

- **Content that must be vocalized:** dialogue, narration, lyrics, explicitly requested “Mm” or “Hmph!” etc. Preserve every character, occurrence count, speaker, and order.
- **Sound-guidance descriptions:** voice, emotion, action, background, timing. Rewrite, reorder, and specify them while preserving every explicit requirement.

Put lines in quotes and performance outside. Do not include “lower the voice” or “after sighing” in read-aloud text. Preserve nested quotations when quotation marks belong to the line itself; do not alter original punctuation for layout. Ask instead of guessing when unlabeled speakers admit two reasonable assignments.

“Polish” normally means polishing descriptions, not lines. Rewrite lines only within explicit authorization. A short idea without lines may receive sound design; “dub a video” does not authorize invented narration.

## 3. Voices: separate stable timbre from current-line performance

### Stable timbre

Use a consistent form: `Character (inherent attributes, @AudioX) says in … tone at … pace: “complete line”`, in the input-appropriate language. Parentheses contain only explicitly supplied stable character traits and known timbre references. Omit unknown attributes, absent references, or parentheses when neither exists. Use “Speaker” for an unknown role, without guessing identity. Telephone responses, distance/distortion, temporary whispers, crying, stress, and pace stay outside parentheses. Preserve reading, singing, moaning, etc. rather than forcing “says.”

For instance, if the user explicitly describes Man 2 as middle-aged, male, with a Taiwan accent, steady raspy voice, mature/reserved manner, and responding by telephone, the following literal Chinese wording is possible:

> Man 2 (middle-aged male, Taiwanese accent, calm and husky voice, mature and steady) responds over the phone, his voice distant and slightly distorted; in a calm, resigned tone at a steady pace he says: ‘original line’

These traits are not default fields to fill.

At first vocalization, organize only supplied traits: perceived age, gender, identity, register, body/brightness, breathiness/rasp, language/accent, etc. Do not fill unknown inherent attributes or infer them from lines. If gender alone is supplied, preserve it and add current tone/expression; do not automatically choose low, bright, or raspy voice. Audio references provide voice evidence without text-based guessing.

Use stable names throughout. Retain supplied names instead of suddenly switching to “Male voice 2.” Multiple characters need distinguishability, not automatically extreme voices for everyone.

### Current-line performance

Conservatively expand emotion, pace, intensity, pauses, stress, and addressee relationship from lines. This does not authorize inferring inherent personality or identity. Neutral lines need no forced drama: natural, steady delivery is enough. A calm character may choke up in one line: distinguish stable usual voice from emotion held back here and slight tremor on a key word. Do not directly turn psychological background into timbre.

| Abstract user term | Optional audible expression | Avoid |
| --- | --- | --- |
| Gentle | Soft voice, lightly settled ending, relaxed pace with natural variation | Automatic whispering or dragging each word |
| Premium, textured | Purpose-specific restraint, clean voice, natural pauses; or warm rounded tone and clear foreground | Adding “cinematic, studio, perfect quality” to every task |
| Powerful | Supported production, stronger stress on key phrases, firm endings | Automatic shouting or high volume throughout |
| Tense | Slightly quickened breath, pauses between short phrases, lowering/quickening at key moments | Simultaneously fast and slow throughout, trembling yet completely steady |
| Lively | Bright buoyancy, fluent colloquial rhythm, upward inflection at emphasis | Invented laughter/interjections or exaggerated childlikeness |
| Calm | Steady pace, restrained inflection, clear articulation | Removing requested crying or emotional turns |

These are optional mappings, not fixed substitutions. Explicit requirements take precedence.

### Nonverbal vocals

Specify performer, position, and intensity, e.g. “After this line, she sighs softly, then continues.” If only sighing is requested, do not add a vocalized interjection such as “Haah”; if “Haah……” is supplied, preserve it fully. Place laughter, gasping, and choking up where expressive, rather than automatically on every line.

Do not fragment natural language with excessive word-by-word performance markers. Control key turns and cover the rest through overall performance guidance.

## 4. Music: purpose, audible style, and development

Develop audible design according to purpose:

- **Timbre responsibilities:** choose one to three appropriate main timbres and specify melody, beat, or spatial support. Preserve existing instruments; do not invent a different style.
- **Melody and rhythm:** describe shape through short motifs, expansive sustained notes, intermittent bass, sparse percussion, or a steady groove; specify density, urgency, and motion. Preserve supplied BPM, form, or mode; do not force parameters when absent.
- **Development:** describe entry, middle progression/maintenance, texture and intensity changes at specified turns, and ending, silence, or looping. Without plot, add modest musical development only, not an invented story climax.
- **Layers:** with dialogue, leave vocal space and allow slight expansion between lines; do not automatically lower all music in every segment. Instrumental music may foreground its melody; without dialogue, do not say “make room for vocals.”

“Warm background music” can become: “Soft piano carries the melody in spacious short phrases; light sustained strings connect phrase endings, with a relaxed, continuous rhythm. Sparse piano opens, strings gently broaden in the middle, and intensity stays warm and restrained. Accompaniment thins under dialogue and opens slightly between lines; piano resonance and strings fade together at the end.” Match detail to request complexity; a notification sound does not need a complete musical form.

Preserve explicit event-driven development: “Music stops when the alarm sounds” cannot become continued underscoring. Do not add vocals/effects to instrumental-only music; “no vocals” also excludes invented humming/vocal pads. Avoid ten-instrument piles and unsupported exact BPM, loudness, or EQ values. Detail should clarify lead, accompaniment, groove, and change.

## 5. Effects and ambience: source, event, and layers

**Ambience** is a continuing spatial bed; **action effects** are events; **nonverbal vocals** are character performance. Arrange them by events rather than a list of “rich effects.”

For action effects, prefer `source/action → onset and texture → resonance/continuation → relative timing and space`. If a metal door closes, describe a rapid heavy impact, brief metallic resonance, and natural decay—not additional locking, footsteps, or a gasp. A gently placed bowl can have a short light contact sound that quickly settles; do not invent its material. Continuous rain/traffic can have density, distance, fluctuations, and an ending state.

Add physically natural listening detail without changing sources: unspecified material is not automatically wood/porcelain; no explosion means no invented explosion; unspecified counts do not become “two steps, three bangs.” Preserve explicit crispness, low fidelity, strong noise, or particular counts.

Relative timing usually suffices: after whose line, triggered by what action, concurrent with what, when resonance fades. Retain exact timing only with explicit intervals. Distinguish serial actions of one source from continuous beds; do not make everything “loud and prominent” simultaneously.

Convert only visually/abstractly described elements with real sound meaning; sunsets/clothing do not demand sound translations. For video references without textual shot descriptions, let the model determine actual sources, materials, distance, and synchronization; do not claim the optimizer observed the pictures.

## 6. Choosing a sound-script structure

### Concise monologue

Existing voice requirements (only if any) and overall delivery → original line → necessary background and ending. Add no background if absent and unnecessary for purpose. Use section 12 for visual-script sound completion.

### Multi-character scene

Overall scene/continuous bed → supplied character voices and lines → related action/response → performance turn → ending. Define continuous background once, then describe changes rather than repeating full music directions after every line.

### Timbre references

Normalize audio references to `@AudioX`, retaining numbers and roles: known `{{Audio 1}}`, `@audio 1`, `Audio1`, or audio-node-1 references become `@Audio1`. Normalize full-width digits to half-width. Do not renumber by appearance order. One known unnumbered reference becomes `@Audio1`; ask for unclear multiple references. This applies to controls only, not tags literally read aloud. Specify who references which asset and what attribute. Example: “Dr. Lin (@Audio1) says in a calm, restrained tone at a steady pace: ‘original line’”. Ask if two people and two assets lack mapping; never pair arbitrarily.

A timbre reference differs from copying its dialogue, music, or actions. Do not assume reference content must be reenacted. Do not claim references affect timbre only or guarantee complete attribute isolation. Current edition rules determine supported reference properties and controllability.

### Audio reference plus dialogue only: common-input default

When text/context establishes one timbre reference and its voice should speak the input lines, use a concise form in the input language. Template: `Speaker (@Audio1) says in a … tone at a … pace: “complete original line”`. Normalize to `@AudioX`, retaining the original number. Unknown reference timbre does not prevent current-line performance guidance.

Add one or two supported delivery qualities: sincerity for apology, urgency for calling, firmness for encouragement, gentleness for farewell. Do not elevate them into inherent personality. Use natural expression for neutral/ambiguous lines rather than unsupported sadness, crying, anger, or sarcasm. Do not automatically add laughter, breaths, plot, music, or effects.

Do not write “young woman (sweet and bright)” or “middle-aged man (deep and raspy)” unless supplied. Even forms of address such as “Mom” or “little brother” do not determine the speaker's age, gender, or voice.

With truly bare dialogue and no reference-existence, tag, or mapping information, invent no `@Audio1`; expand tone/delivery only. Clarify only when known multiple references have unclear role pairing. A known single-reference/single-passage binding needs no extra confirmation or task-mode selection.

### Video references

With a supplied video but no shot description, use natural wording such as “arrange sounds according to the actions and rhythm in the reference video,” without invented pictures. Preserve existing sound requirements. Do not proactively write narration when lines are not requested. If narration writing is authorized but visual content is unavailable, do not pretend this skill observed assets; request textual content or optimize only dubbing guidance.

### Timestamps

Check current edition rules first. Source examples use `[start s:end s]`, numerically e.g. `[2.8s:8.4s]`. Put total duration first, intervals near their events/lines, and preserve clear character responsibilities.

- **Check authorization before format.** With total duration only, e.g. “16-second suspense short,” write only “Total duration: 16 seconds” and organize events naturally. Add neither 0–3/3–7-second intervals nor a whole-piece `[0s:16s]` label. Do not add total duration when no timing requirement exists.
- **Preserve supplied granularity.** Normalize interval notation without changing boundaries. Keep a supplied time point as a point, not an extended interval. When only some events are timed, retain timing for those and use relative relationships elsewhere. Keep “pause two seconds” or “laughter lasts three seconds” as relative duration, without calculating new absolute starts/ends.
- **Explicit authorization exception.** “Design a 16-second timeline” or “assign concrete seconds to each segment” authorizes new intervals. “Optimize this 16-second prompt,” “add sound to this video,” and “enhance rhythm/synchronization” do not authorize segmentation. Authorization extends only to requested events and precision, not automatically word-by-word timing.
- Internal capacity estimates are not creative timing requirements and must not become segment labels. Only to resolve an existing explicit timing conflict may clarification propose minimal adjustments. State original/proposed values and pending confirmation outside the draft; label the candidate awaiting confirmation. Do not first invent a timeline and output it under the guise of a candidate.
- Music/ambience may span multiple lines without needless fragmentation; within current support, music, dialogue, and action effects may coexist.
- Overlap needs a reason: underscoring, talking while walking, interruption. Accidental overlap of several long lines is not natural interaction.
- Preserve supplied timing; “first, then, finally” alone never becomes invented precise seconds.
- Clarify total-duration/capacity conflict without deleting characters, covertly accelerating, shortening explicit silence, or extending total duration. Time-control support is no frame-precision guarantee.
- Check total duration, intervals, and sound development together. Labels cannot replace event description.

The following example applies **only when the user already supplied these intervals or explicitly authorized arrangement**, and only where the current edition confirms the corresponding control. A shared 12-second total alone does not justify applying it:

> Total duration 12 seconds. Light rain runs throughout; the score sits in the background.
> [0.0s:12.0s] Soft piano slowly lays the background, staying light under the dialogue and fading out over the last two seconds.
> [2.0s:5.0s] Aning (young woman, clear and bright voice) says softly, at first hesitant and then gradually resolute: “I'll come back.”
> [4.5s:6.0s] As she finishes speaking, a faint rustle of clothing, then footsteps fade into the distance.
> [0.0s:12.0s] The fine rain stays light and resolves together with the music at the end.

This is a deliberately designed demonstration, not a default timeline for untimed or total-duration-only input. Special separators in documentation are not confirmed mandatory syntax and need not be copied.

### Timing feasibility: check maximum and content capacity separately

Perform this check every time without exposing internal estimates in final prompts. Read the generation maximum from `api-rules.md`.

1. **Hard boundaries:** total duration and latest endpoint must fit the edition maximum; every interval also fits the user's total duration. Address reversed intervals, negative times, equal start/end, and total/end conflict. Ask what to shorten or whether to segment when over limit; do not split tasks or drop lines yourself.
2. **Line capacity:** check original length and specified pace by speaker and segment. As a rough warning for ordinary Chinese dialogue, about 3–5 Chinese characters per second can estimate continuous vocalization; slow pace, choking up, emphasis, and long pauses need more time. This is a writing estimate, not a model parameter, hard threshold, or duration guarantee. Do not mechanically apply Chinese-character speed to other languages, numbers, mixed-language text, or singing.
3. **Additional time:** sighs, laughter, speaker handoffs, explicit pauses, action processes, and silence take time. Add serial events from one source; do not double-count simultaneous music/ambience against dialogue. Do not force all lines to overlap to fit.
4. **Local and whole:** one line may not fit its 1-second slow-delivery interval even below the overall maximum. All individual lines may fit yet serial segments plus silence exceed total duration. Check both.
5. **Other languages and short windows:** estimate by words, syllables, usual readings, pauses, and performance. Do not inspect Chinese characters only and miss Arabic/English passages. Consider actual readings of numbers/symbols; lyrics, crying, and sustained notes do not follow ordinary dialogue rates. A long passage at medium/slow pace in a few seconds plus laughter/silence is a clear conflict.
6. **Resolution:** clarify only clear contradictions. Preserve user requirements in uncertain boundary cases rather than rejecting creativity with rough estimates. Offer concrete tradeoffs: duration within the allowed range, authorized text shortening, or multiple segments. Act within existing explicit authorization to rewrite, compress, or segment.
7. **Unspecified duration:** do not force users to fill it or default to the maximum. Ask about segmentation when long dialogue plus serial events clearly cannot finish naturally within the maximum.

For example, a requested 150-second piece needs clarification in a 2-minute edition; a 6-minute edition proceeds to capacity checks. Seven minutes needs clarification in a 6-minute edition. A long slow line in 2 seconds needs local conflict handling even far below the edition maximum. These checks never authorize deleting text, accelerating, changing intervals, or extending total duration.

### Track extraction

Use only if current rules confirm support and the user actually wants existing audio processed. Specify source, extraction target, exclusions, output organization. Example: “From @Audio1, extract the woman's vocals on their own and output one vocal track; exclude the male voice, music and ambience.” Include those sources only if known or user-specified.

Clarify “separate vocal, music, and effect tracks” if it is unclear whether this means extracting source audio or creating new sound; the creative result differs. Three written sections for video music, vocals, and effects do not establish three independent files. Track returns and limits follow current rules.

## 7. Before-and-after examples

These examples show different inputs becoming submittable prompt bodies. Lines remain verbatim; additions are controls only. Complex timing and extraction require edition support. Examples are given in English; in use, every optimized prompt keeps the language of its source (see section 11).

### A. Existing line without a sound description

Source prompt: Read this in a gentle female voice: Good night, see you tomorrow.

Optimized prompt: The speaker (female) says in a gentle, intimate tone at a relaxed pace without dragging the words: “Good night, see you tomorrow.” The sentence ends with a natural, soft close.

Rationale: makes gentleness audible through voice/performance without automatic music or line edits.

### B. Brief musical intent

Source prompt: Add relaxed background music to a travel video, no vocals.

Optimized prompt: Create relaxed instrumental background music for a travel video. Led by gentle acoustic guitar, with a light but unhurried rhythm and a naturally flowing melody, bright and relaxed overall. The music stays in the background as companionship and resolves naturally at the end. No vocals.

Rationale: supplies sound design while preserving instrumental-only scope; claims no picture analysis and invents no edit times.

### C. Two-person conversation: timbre versus performance

Source prompt: The older sister has a low voice, the younger sister a clear, bright voice. The older sister says very calmly “Don't be afraid, I'm here.” The younger sister says, crying, “Don't leave……”. No background music.

Optimized prompt: The older sister (low voice) says in a calm, soothing tone at a steady pace: “Don't be afraid, I'm here.” The younger sister (clear, bright voice), tearful and with unsteady breath, says in a choked tone: “Don't leave……”. No background music.

Rationale: retains sister identities, lines, emotion, and exclusion; crying is the younger sister's current performance.

### D. Expand source while retaining colloquial repetition

Source prompt: The boy says excitedly: Little brother, little brother, look! It's really here! Put a little laugh in the middle.

Optimized prompt: The boy says in an excited tone at a slightly fast but clearly articulated pace: “Little brother, little brother, look! It's really here!” After “look!” he gives a small, natural laugh before the next sentence; the laugh is light and short and does not cover the line.

Rationale: retains repeated address; positioning laughter reasonably fills a vague request. Full lines remain intact and nonverbal performance stays outside them.

### E. Organize events from detailed input

Source prompt: A door sound, two people, A male husky voice, B female soft voice, A says “I'm back.” then B says “The food is still warm.”, after B finishes a bowl goes on the table, quiet home, keep the piano light, at the end the music slowly disappears.

Optimized prompt: In a quiet home, soft piano lays the background, staying light under the dialogue. First a door opens. A (male, husky voice) says in a natural tone at a steady pace: “I'm back.” Then B (female, soft voice) replies in a warm tone at a natural pace: “The food is still warm.” After B finishes, a short, light contact sound as a bowl is gently placed on the table. At the end the piano gradually weakens until it disappears.

Rationale: preserves all events/order and clarifies only music prominence and action-sound placement.

### F. Nonverbal sounds must not become new lines

Source prompt: A male voice sighs first, then says “Forget it.” Don't exaggerate.

Optimized prompt: The speaker (male) first sighs softly, pauses briefly, then says in a calm, restrained tone at a natural pace: “Forget it.” Neither the sigh nor the delivery is exaggerated.

Rationale: adds no spoken “Haah” for the sigh.

### G. Reference-to-character binding

Source prompt: Xiao Zhou uses @Audio1, Xiao Lin uses @Audio2, Xiao Zhou says “Let's begin.”, Xiao Lin says “Okay.”, crisp rhythm.

Optimized prompt: Xiao Zhou (@Audio1) says in a natural, crisp tone at a brisk pace: “Let's begin.” Then Xiao Lin (@Audio2) answers in the same crisp tone: “Okay.” The lines follow each other tightly.

Rationale: preserves numbers/roles without guessing reference age, accent, or gender.

### H. Reference video without a visible-shot description

Source prompt: Add ambient sound and action sound effects to the reference video, no speaking and no music.

Optimized prompt: Arrange ambient sound and action sound effects according to the scenes, actions and rhythm of the reference video. The ambience forms a continuous spatial bed; the action effects match the actions that actually happen on screen, with intensity and distance changing with each scene, and transitions connect naturally. No speaking, no music.

Rationale: lets the model use video rather than inventing pictures. Applies only to editions supporting video references.

### I. Existing timing requirements

Source prompt: 10 seconds, footsteps from 0 to 2 seconds, from 2 to 5 seconds a female voice says “Wait for me!”, from 5 to 10 seconds only rain, no music.

Optimized prompt:

> Total duration 10 seconds, no music.
> [0.0s:2.0s] Footsteps sound, ending at 2 seconds.
> [2.0s:5.0s] The speaker (female) calls out urgently at a clear, slightly fast pace: “Wait for me!”
> [5.0s:10.0s] Only the rain continues, through to the end.

Rationale: does not extend footsteps or voice into the explicitly rain-only ending.

### I-2. Total duration only: no unauthorized timeline segmentation

Source prompt: 16-second suspense short. A woman pushes a cigarette case to the detective and slowly says “The evidence you want is in here.” The detective opens the case and asks “What payment do you want?” The door is suddenly pushed open; the detective asks warily “Who are you!” Suspense score references audio 1.

Optimized prompt: Total duration 16 seconds. The suspense score references @Audio1 and stays low in the background, with the dialogue and key actions in front. The woman slides the cigarette case to the detective with a light, short sliding sound and says slowly: “The evidence you want is in here.” Then the detective opens the case; after a faint click of the lid he asks naturally: “What payment do you want?” The door is suddenly pushed open, breaking the silence; the detective asks, wary and clipped: “Who are you!” The score keeps the tension and leaves a lingering standoff after the last line.

Rationale: 16 seconds constrains the whole without assigning seconds to individual lines. If source already supplies 0–3, 3–7, etc., preserve those intervals; this example does not authorize removing existing timing.

### J. Extract existing audio

Source prompt: Separate the woman's voice from @Audio1 on its own, without the music or the male voice, export one track.

Optimized prompt: From @Audio1, extract the woman's vocals on their own and output one separate vocal track; exclude the music and the male voice, and keep the original vocal content, speaking order and performance.

Rationale: does not turn extraction into new female voiceover; applies only to editions supporting source-audio separation.

### K. Clarify instead of forcing optimization

Source prompt: Within 2 seconds, slowly say all of “Today we set out together to find the stories that were forgotten, and let every good memory shine again.” Don't drop a single word.

Clarification output:

> Issue: the line must be kept complete, but it cannot also be spoken slowly within 2 seconds.
> Proposed resolution and confirmation: extend to about 10 seconds, keeping the full text and the slow pace. Accept? The duration is an estimate, not a measured guarantee.
> Suggested prompt (awaiting confirmation; uses the ~10-second suggestion): Total duration about 10 seconds. The speaker says in a natural, soothing tone at a slow pace: “Today we set out together to find the stories that were forgotten, and let every good memory shine again.”

Rationale: does not unilaterally change either conflicting explicit requirement.

### L. Single reference audio with dialogue-only text

Known context: one timbre reference @Audio1 is supplied and should speak the input lines. Reading/analyzing audio is unnecessary.

Source prompt: I'm sorry, I'm the one who let you down.

Optimized prompt: Speaker (@Audio1) says in a sincere, slightly apologetic tone: “I'm sorry, I'm the one who let you down.” The pace is a little slow, with a natural pause after “I'm sorry,” and a soft close at the end.

Rationale: apology content supports tone; original text remains verbatim. No reference age, gender, identity, or timbre is guessed.

### M. Dialogue only with no reference information

Source prompt: Welcome to today's session.

Optimized prompt: The speaker says in a natural, friendly tone: “Welcome to today's session.” Clear articulation, steady rhythm.

Rationale: invents neither @Audio1 nor host gender, age, or voice traits.

## 8. Prevent over-optimization

- Do not expand every input into “vocals + music + effects”; keep a clear dry voice dry.
- “High fidelity, perfect, noise-free” does not replace voice, performance, or event relationships. Preserve requested low fidelity, distortion, or noise.
- Verbatim preservation does not mean mechanical pauses after each sentence; continuous text can still be spoken naturally.
- Avoid conflicting adjective piles and invented numerical parameters for apparent precision.
- Do not copy other models' proprietary markers, negative-prompt fields, shot templates, picture-quality requirements, or calling parameters.
- Do not turn references into guaranteed asset attributes, timestamps into guaranteed synchronization precision, or track requests into guaranteed file counts.

## Sources

Primary learning material:

- [User FAQs and Seedance optimization skill reference](https://bytedance.larkoffice.com/wiki/KAoMwj0MEivae8k8JbTcy6uRnGb)
- [SeedAudio model practice and demonstrations](https://bytedance.larkoffice.com/wiki/HfE7wvXn1iruKNkrDGVcIq4gn2f)
- [Original prompt practice guide and scene examples](https://bytedance.larkoffice.com/wiki/ZRA5wL7egi1VsikbspPcNYi8nRf)
- [Practice guide with dialogue timestamps](https://bytedance.larkoffice.com/wiki/DxvOwPlHtiRelDkxa9YcJxuun8b)
- [New complex timelines, references, and track demonstrations](https://bytedance.larkoffice.com/wiki/GyRDwI6PdiKQ5Mkysz9cGruPnle)

Supplementary sources:

- [Official Dreamina SeedAudio 1.5 page and examples](https://dreamina.capcut.com/ai-model/seedaudio-1-5)
- [Official Seed SeedAudio 1.0 introduction](https://seed.bytedance.com/en/blog/from-speech-to-audio-creation-introducing-the-seed-audio-1-0-audio-creation-model)
- [Public user's cafeteria dialogue creation practice](https://www.reddit.com/r/AIAudio/comments/1v6153u/bytedances_seed_audio_10_is_the_first_model_ive/)

Methods are distilled from examples; capability limits follow the installed package's API rules summary. Installation does not require visiting these links.

## 9. Organizing complex source text and reviewing preservation

Internally lock vocalized source text first, then organize all controls by role/event. Compare original characters, counts, order, and ownership, retaining nested quotes, English apostrophes, lyric paragraphs, numbers, and symbols. Separately check character attributes, timing, background, actions, exclusions, and ending—not dialogue alone. Repeated explanation of the same passage may become one performance; explicitly requested repetition must retain its count.

If control arrows, parenthesized pronunciation guidance, or stage directions clearly should not be vocalized, move them outside dialogue and bind them to original positions. Preserve genuinely spoken symbols verbatim. Ask only for substantive ambiguity. Never delete `↑` or `~` without basis and call lines intact, or convert emphasis markers into added colloquial words.

Distinguish voicing provided text from writing scripts. Translate/rewrite only when explicitly requested, within scope, preserving meaning and specified language; otherwise do not translate. Ordinary laughter/sighs may be attached lightly and briefly to a suitable ending/turn, without asking for exact seconds or inherent voice. Clarify when distinct characters make nonverbal ownership consequential to plot.

## 10. Delivery-edition supplements: judgment, reorganization, and review

### Content source and voice profiles

“Optimize this voice profile” needs no accompanying lines; preserve and improve the profile. “Generate a voice” or “dub for me,” when speech is intended but no text, reference-content source, or writing authorization exists, requires a short question about what should be said. Returning only a voice profile is not a complete ready-to-generate result. Explicit nonverbal vocal requests need no lines. For generic video accompaniment, let the model use video instead of always demanding a text script. Preserve the stated role of style-only references; do not change them into dialogue extraction or whole-passage reenactment.

### Long scripts need organized sound relationships

Define fixed character attributes together and use stable labels per line. Define shared performance/background once. Bind lines, performance, actions, and music changes to original event order. Remove tool metadata irrelevant to sound; retain narrative, identity, or relationship meaning in natural language. Separately verify ending, hard sequence, and exclusions so compression cannot drop them.

When formal dialogue duplicates “per-line performance examples,” first identify the single formal text. Keep a complete original sentence and externally describe “in the first half …, at this word …, at the ending …,” avoiding punctuation changes; alternatively segment only at original punctuation while preserving original characters. Variant punctuation and repeated quotations in performance examples guide performance without creating a second vocalized script. Preserve genuine requested repeats. Clarify substantive uncertainty about formal text.

For example, if the formal line is “Pah! Don't think we don't know — this so-called marrying down is only to avoid criticism.”, with separate annotations “Pah!!!” and “Don't think we don't know!”, retain the formal complete line once. Put explosive spitting, rapid angry rebuke, sarcastic slowing, and breath between phrases outside quotes, rather than listing a second set of lines. Overall rapid delivery can coexist with a slightly lengthened stress; slowly reading every word and extreme speed throughout cannot simply coexist.

Differentiate speech acts: question stress on unknown information, restrained checking, slightly tight concern, clear directional proposal. These are optional and selected from line/context. Do not add emotion sentence by sentence to uninterrupted monologues with no turn, or repeat “natural, clear, compact” each time.

### Useful information in expansion

Every added detail should answer an unclear sound question rather than merely replace adjectives with synonyms. Music can gain lead/accompaniment roles, melodic lengths, rhythmic density, texture changes, and ending. Effects can gain onset, distinguishable texture, continuation/resonance, space, and trigger. Preserve all supplied instruments; when style is unspecified, choose a few purpose-fitting timbres without changing type. With video, actual sources come from pictures.

Three time-labeled segments do not automatically mean “fade in—build—fade out.” Loops retain a reconnectable groove, steady backgrounds remain continuous, suspense may stay unresolved, and requested abrupt stops remain abrupt. Add exact BPM, key, decibels, and hard counts only when supplied or explicitly authorized. A single short effect needs no complete musical form. Modestly develop music itself without inventing product actions, shots, or plot climaxes.

### Boundaries of conflict interpretation

Different dimensions may coexist naturally: bright high-frequency texture with full resonance, or calm personality with breakdown in this line. Follow explicitly distinguished stages or priorities. Never invent scope shifts to remove conflict: “very breathy and completely no breathiness” without a breath/line distinction cannot become a big pre-line inhale plus no breath in speech. “Young and sweet throughout yet mature and deep throughout” cannot lose a requirement or become an invented age/personality distinction. For genuine uncertainty, follow troubleshooting: explain impact, ask one consolidated question, provide a candidate awaiting confirmation.

### Delivery conditions versus sound control

Retain explicit sample rate, encoding, channels, file count, etc. as short delivery requirements, not lines or aesthetics. Check current rules first: clarify explicitly unsupported core delivery. When calling/export configuration control is unconfirmed, preserve the original condition with “implemented through generation or export configuration,” without claiming natural-language guarantees. Example: “Delivery requirement: 48kHz, implemented through generation or export configuration,” localized as appropriate. Add no unrequested parameters, request fields, authentication, or calling steps.

### Three capacity judgments

- Clearly feasible: preserve timing/performance and continue.
- Uncertain boundary: preserve original requirements; add no sustained delivery, laughter, or extra silence. Do not conceal uncertainty with faster delivery or claim untested duration guarantees.
- Clearly incompatible: identify the line, window, and conflicting performance, and ask whether timing, pace, or authorized wording may change. Check total duration, each line interval, and serial events separately.

Consider likely readings of numbers and words/syllables in other languages. Include natural breath, specified pauses, and serial actions. Concurrent ambience/music does not add to dialogue duration. The 3–5 Chinese characters/second range is a warning reference only: slightly exceeding it is not automatically impossible, and explicit high-speed ads should not be judged as slow dialogue. “Compact and clear” does not enlarge the window and cannot substitute for capacity handling.

### Two review passes

First check preservation only: vocalized characters, counts, speakers, asset roles, timing, quantities, exclusions, ending, delivery conditions. Then check sound organization: fitting performance, event triggers, background serving the subject, useful added information, and remaining copied control piles. Correct problems and recheck affected content. Never claim validation without passing checks.

## 11. Chinese, English, and mixed-language writing

Preserve original languages separately for lines and descriptions. New descriptions follow the original control-description segment; bare-dialogue additions follow the dialogue language. Reference normalization does not authorize translating lines.

English source prompt: Use Audio 2 for the voice. Say: “I'm here.”

Optimized prompt: Speaker (@Audio2) says in a calm, reassuring tone at a natural pace: “I'm here.” Keep the ending gentle.

Mixed-language source prompt (descriptions in Chinese, line in English; the Chinese parts are shown in translation inside [in Chinese: …]): [in Chinese: Reference audio 1, say gently] “I'm here.” [in Chinese: No score.]

Optimized prompt (descriptions stay in Chinese, the line stays in English): [in Chinese: Speaker (@Audio1) says in a gentle tone at a natural, slightly slow pace:] “I'm here.” [in Chinese: Soft close at the end. No score.]

Mixed-language source prompt (A's part in Chinese, B's part in English): [in Chinese: A says “Are you ready?”] B replies “Ready.” [in Chinese: No music.]

Optimized prompt (each part keeps its language): [in Chinese: A asks in a natural questioning tone: “Are you ready?”] B replies at a natural pace: “Ready.” [in Chinese: No music.]

Clarify garbling, suspected typos, and reversals per troubleshooting. Normal symbols, colloquial language, and dialect are not corrected merely for unfamiliarity. Candidates awaiting confirmation are not final submission prompts.

## 12. Converting visual scripts into sound scripts

### Recognition and preservation scope

When users paste Seedance or other video prompts, do not require mode selection or rewritten input. If storyboards, pictures, camera motion, lighting, composition, and visual negatives dominate, convert to sound. If sound requirements are already complete, mainly organize them rather than remaking the work to demonstrate expansion.

Internally distinguish four categories: explicit sound requirements; audible scene/action/material/space clues; purely visual instructions; visible text/edit instructions. Lock final effective dialogue, narration, lyrics, and specified vocalized text verbatim. Preserve roles/relationships, timbre, music/effect reference responsibilities, causality, sequence, exclusions, silence, and ending.

Remove resolution, aspect ratio, focal length, grading, skin smoothing, composition, watermarks, and appearance-image bindings used only for visual generation. Do not also remove backgrounds affecting listening, such as wooden floors, tunnels, telephones, or approaching speakers. Briefly retain relationships meaningful only narratively. Image/video tags solely for appearance/camera movement may be omitted from a sound-only script if their role is completely covered by explicit text. Do not silently drop references carrying unknown events, rhythm, or matching evidence. An image-bound character identity does not mean that image supplies timbre or permits inferred voice traits. Do not pretend to read or describe unprovided asset content.

### Which sounds may be added

1. **Explicit sounds:** preserve and specify, e.g. low hum, mechanical resonance, specified music, gasping, or silence.
2. **Sounds directly supported by actions:** modest onset, texture, continuation, space, and triggers, e.g. footsteps, a bowl placed on a table, tires on gravel, breaking glass. Use given materials, not invented ones. One action need not produce an effect chain; tiny actions or actions without contact may be silent.
3. **Directly supported spatial beds/reflections:** create coherent space with the minimum necessary, e.g. driving airflow or tunnel reflections. “Home/morning/city” does not automatically add television, birds, or horns.
4. **Association alone:** do not add by default. After rain is not raining. Bottle close-ups are not spraying/opening/collision. An orbiting camera does not rotate the object. High speed is not gear changes, hard braking, or a specified combustion engine. Closed eyes do not imply inhaling, sighing, or humming.

Fantasy actions can receive design sounds fitting explicit settings: a formation activating may gain rising resonance, a data vortex a rotating sensation. Do not automatically map abstract light to electricity or add explosions, alarms, attacks, or lines. Visual style may guide expression of supported sounds; do not mechanically map color to pitch or film grain to noise.

### Scoring and character performance

Explicit advertising, travel, suspense, etc. purpose permits a little fitting music with main timbre, development, and ending. Pure natural ambience, realistic dialogue, ASMR, and tiny foley do not force scoring. Strictly follow supplied genre, instruments, reference music, start/end, prominence, no-music, and silence. “After 12 seconds, use only @Audio4 for music” cannot become newly written piano throughout. Without dialogue, do not describe making room for it or add narration, slogans, lyrics, gasps, laughter, or breaths.

Retain explicit textual identity, age, gender, etc., without inferring voices from appearance references or shots. Expression and speech relationships may guide current delivery, e.g. smiling reproach or feigned composure; temporary action/performance is not inherent personality. Silent speaking, lip-reading, and internal written thoughts do not automatically become audible. Preserve an explicit later onset of voice.

### Text, replacements, and time

- Subtitles, screen text, titles, and signs are not dialogue by default. “No subtitles” is not “no dialogue.” English subtitle translation is not a second English reading.
- Explicit “replace old line A with B” vocalizes B only; obsolete A is an editing target, not something verbatim preservation repeats. Subtitle-only changes do not authorize dialogue changes. Clarify only when version conflict leaves final vocalized content undetermined.
- Organize by sound events. Use `[start s:end s]` only for corresponding source intervals or explicit timeline-design authorization. Total duration does not authorize allocating seconds by shot, line, or emotion node; local timing does not authorize a full timeline. Continuous music/ambience can span segments; a shot cut does not require restarting sound or a transition effect.
- Separate finished-piece time from source sampling location. “Finished piece 0–2 seconds references video seconds 5–7” does not make 5–7 a finished-piece interval. Do not invent unknown source events. Shot 1/2 convey order, not invented seconds. Slow motion/time lapse do not automatically change speech pace or all effect speeds.
- Preserve total duration, local windows, and event concurrency. Handle capacity conflicts through clarification and a candidate per rules; do not accelerate lines, remove actions, or extend intervals to complete sound.

### Asset and task boundaries

Preserve timbre/music/effects/scene-rhythm reference roles; do not put every @AudioX into character attributes. Do not imitate specific unread asset content or promise frame synchronization, seamless shot continuation, or multiple track files. Old video references solely for visual editing may be removed. Core audio dependencies on multiple videos, excessive references, or continuation-source content must be handled under current API rules, without silently dropping assets, merging numbers, or importing Seedance limits. Optimize directly when text sufficiently describes a soundscape without mandatory asset dependency; do not ask solely because video is not uploaded. If only assets contain core content, clarify the gap and provide a draft with missing content marked.

### Conversion examples (writing demonstrations, not audio-validated)

**Vehicle and camera movement**

Source prompt: 12–15 seconds, a car drives into a tunnel at high speed, tracking camera, ink-line style, 8K, no music.

Optimized prompt: [12s:15s] A car drives into a tunnel at high speed; tire roll and rushing air continue, and once inside the tunnel the reflected tail becomes clearly audible, keeping the sense of high-speed travel. No music.

Point: use action/space without inventing combustion engines, braking, or camera whooshes. With no total duration, do not treat 15 seconds as total duration.

**Still life after rain**

Source prompt: 6-second perfume ad, a terrace after rain, the bottle standing still, orbiting camera, soft light, low saturation, no vocals.

Optimized prompt: Total duration 6 seconds. Sparse short piano phrases and light, sustained strings form a restrained, open perfume-ad score, with space between the notes and a soft resolution at the end. No vocals.

Point: ad purpose permits scoring; after-rain setting and stillness do not force rain, spraying, or bottle-opening sounds.

**Subtitles and final lines**

Source prompt: Replace the narration “Old slogan” with “Let's go now.”, show the subtitle “Start now.” at the end, no music, 16:9.

Optimized prompt: The narrator says in a natural, clear and resolute tone: “Let's go now.” No music.

Point: do not read obsolete text or display-only subtitles; do not infer unspecified gender.

**Dialogue and specified music**

Source prompt: From 0 to 2 seconds Su Wan, using reference audio 1, says with a smile “You're back so early today”; from 12 seconds the background music references audio 4, no other background music. 35mm, warm yellow light.

Optimized prompt: [0s:2s] Su Wan (@Audio1), smiling, says in a gentle, natural tone: “You're back so early today”. No background music before 12 seconds; from 12 seconds the background music references @Audio4, with no other background music added.

Point: preserve line characters and audio roles without inventing reference instrumentation or extending intervals.

**English visual script**

Source prompt: A 5-second travel ad. Wide shot of waves washing onto the beach. Slow camera push, 4K. No voices or music.

Optimized prompt: Total duration: 5 seconds. Waves wash onto the beach with a soft swell, a clear breaking rush, and a gentle receding wash. Keep the surf continuous through the end. No voices or music.

Point: preserve English and sound exclusions; do not turn a camera push into a whoosh or add seabirds.

**Mixed language**

Source prompt (descriptions in Chinese, line in English; Chinese shown in translation): [in Chinese: A uses reference audio 2, close-up, says in a lowered voice] “Stay here.” [in Chinese: then gently puts down a porcelain cup. No music, film grain.]

Optimized prompt (descriptions stay in Chinese, the line stays in English): [in Chinese: A (@Audio2), voice lowered, says in a natural, restrained tone:] “Stay here.” [in Chinese: Then the porcelain cup is gently set down; the contact sound is light and short and its tail is quickly cut off. No music.]

Point: retain English lines and Chinese descriptions. Porcelain is supplied; the support surface's material is unknown and must not be guessed.

This section is distilled from 13 samples in the specified 30s sheet of the user-provided [Seedance storyboard question set](https://bytedance.larkoffice.com/wiki/Vo4gwQEQJiuPTGkGWcMcXG2sn7c?sheet=d22d58), with [official Seedance scene examples](https://seed.bytedance.com/en/blog/seedance-2-0-official-launch) and [SeedAudio scene examples](https://dreamina.capcut.com/ai-model/seedaudio-1-5). These short examples are adapted or newly constructed writing demonstrations, not original complete outputs, full testing of all 13 samples, or audio-performance findings.
