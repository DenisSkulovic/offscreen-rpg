# Phase 0 | Player experience charter

**Status:** Proposed design thesis to evaluate. Does not replace ratified product authority.  
**Audience:** product owner, UX lead, visual designer, editorial designer, accessibility reviewer, frontend architect.

## 1. Product sentence

**Offscreen RPG is a world-flexible, persistent story-life experience in which the player influences a character's intentions, waits for mechanically earned consequences, returns to a changing situation and can revisit the accumulated life as an authored but truthful record.**

This is not an AI chat with a wallpaper, a D&D character-sheet dashboard, a fantasy-book skin, or a productivity application with a journal tab. It must succeed as both a *game in the present* and *a story worth returning to*.

## 2. Three emotional and practical promises

### Presence

Within seconds of entering a story, the player understands **where/what I am, what is happening, what matters, and whether I can act**. Atmosphere should belong to the current situation and Storyteller's declared tone. Good scene composition allows stillness; constant animation does not equal presence.

### Consequence

A choice is an attempted action; some outcomes take time; uncertainty and failure remain real. The design must make accepted intention, ongoing progress, interruption, blocked generation and committed resolution comprehensible **without** displaying technical internals as the main attraction. Story text never declares a success that the authoritative game state has not earned.

### Ownership of a life

Over days or months, the player accrues a legible personal history. They can find their first meeting with a recurring character, remember what prompted a decision, revisit prose, and return to the present without losing place. The feeling is **I have lived this story**, not **I scrolled an infinite audit feed**.

## 3. Working player jobs (hypotheses, not research findings)

| Situation | Player job | Successful experience | Failure mode |
| --- | --- | --- | --- |
| Curious visitor | Understand and taste the unique promise | A short believable example; clear demo/live distinction | Feature brochure and engineering jargon |
| New creator | Form an interesting starting premise and expectations | One coherent, low-friction opening they want to inhabit | Endless setup form or choice paralysis |
| Active player | Perceive scene and choose an intention | Text + relevant context + legible action tradeoffs | Dashboard-dense mode or bare chat bubbles |
| Returning player | Learn what changed, then act | Focused, source-grounded recap scoped to absence | Full event wall or false 'it all finished' summary |
| Long-time reader | Revisit and navigate prior moments | Locate, skim, expand and read at appropriate granularity | Hundreds of equally weighted expandable cards |
| Contemplative player | Stay in a quiet scene | Space and tone without manufactured busyness | Attention-grabbing animations and pressure to click |
| Player in an abstract world | Interact without humanoid assumptions | Same quality of experience without inventory/map/body requirements | Forced fantasy/human dashboard fields |
| Player in a blocked/uncertain state | Understand what's safe and what's already committed | Status clarity + genuine recovery | Decorative success or duplicate spend |

## 4. Experience principles to explore and ratify

**1. Fiction first, system truth immediately available.** The current world and narrative are foreground. Game status and risk are discoverable exactly when they affect an action. Technical diagnostic internals remain secondary, yet actionable errors must never disappear under atmospheric layers.

**2. Two reading tempos, one canonical truth.** 'Now' is focused, present-tense interaction. 'Journal' is navigable hindsight. Both read from the same verified source narrative; they may use different composition and density. Return to Now is a stable, predictable action.

**3. Narrative meaning determines layout, not arbitrary genre skinning.** The platform has stable controls; a world can use valid visual registers and assets. A thought in an abstract field, a crowded street and a solitary night should feel distinct even with the same number of paragraphs. Do not rely on a mandatory map, portrait, body sheet or scenic illustration.

**4. Dramaturgy without deception.** A meaningful state transition may be animated; a speculative future cannot. Motion can communicate new publication, interruption, page traversal and safe progress. Waiting and model generation have different truth status. Slow content must never hold the user hostage to an entrance sequence.

**5. Quiet is a designed state.** Blank space, ambient motion-off defaults, restrained type, no available options and ordinary life can be expressive. Every scene need not have a glowing button, dramatic effect or new artwork.

**6. The story archive is not a database console.** History needs an editorial hierarchy: readable passage, short card/excerpt, orientation overview and linked thread. All derivations carry their own source provenance. Archive does not become replay, fork or historical simulation by accident.

**7. The platform is an instrument; the fiction is the performance.** Persistent navigation, system safety colors, reading controls and accessibility cannot be overwritten by the Storyteller. Within that frame, expressive scene direction is allowed and desirable.

**8. Nothing 'cool' without a job.** Every glow, visual motif, camera motion or microinteraction should explain its purpose: focus, causality, atmosphere, delight, or continuity. If removing it does not diminish the experience, it may be visual noise.

**9. Responsive behavior is conceptual, not just reflow.** Mobile should read and act comfortably. It may reveal fewer simultaneous panels, but must not bury the current choice or make Journal unreachable. On desktop, spare space can contribute to visual composition without creating useless dashboards.

**10. Make room for changed worlds and future mechanics.** The design cannot assume a fixed D&D party sheet even if gameplay mechanics use D&D rules. Specific universes may legitimately require unique surfaces, but those should be explicit content capabilities, not fake default panels.

## 5. The product's two experiential modes (proposed)

**The Living Stage / Now**

Primary attention: the current committed passage and its immediate authored affordances. Composition: anchored narrative, backdrop/illustration plane, context strip only where helpful, an action threshold with meaningful hierarchy. During accepted waiting, truthful state can become more prominent while preserving the narrative. During pending generation, preserve the last verified passage rather than inventing the next.

**The Living Edition / Journal**

Primary attention: an accumulated narrative record. Reading modes may include full text, excerpts, a compact visual index and source-backed threads. Navigation favors temporal continuity, re-finding moments, and context of *what I actually chose*. Time and publication order may need different representations. The user can enter from Now, browse extensively, then return to the current saved position.

These modes are *not two unrelated apps*. Typographic identity, navigation transitions, identity of a passage, and a shared narrative source keep them related. A visual motif can link a newly published passage to its archival representation, but its historical content must not silently morph.

## 6. Initial system of spaces, not yet a screen map

| Space | Primary promise | Important open question |
| --- | --- | --- |
| Welcome | A compelling, honest first taste | How quickly does a visitor witness one actual intention/consequence? |
| Preview | A safe scripted trial | How closely should the experience resemble the live visual language? |
| Your Stories | Lives awaiting you, not files in a folder | What source-backed attention states may be shown? |
| Create | Start an interesting life | How should premise, character, storyteller and pace be introduced? |
| Now | What is happening, what can I do? | Which compositions genuinely serve different scene types? |
| Journal | What happened and why does it matter? | What are passages, excerpts, moments, threads and summaries? |
| World | Known people/places/threads, when meaningful | What identities and visibility actually exist? |
| You | Relevant self/character capabilities | How to avoid assuming a human inventory-based character? |
| Story Settings | Deliberate, out-of-fiction adjustments | What can safely change mid-story? |

Do not create peer-level tabs for every concept. Existing `navigation-and-stories.md` correctly names Now and Journal as primary within a story, with World and You contextually present.

## 7. Deliberate negatives

No ubiquitous dashboard grid. No generic 'magical AI' gradients; no default purple/teal glows everywhere. No faux-medieval parchment applied globally. No forced chapters, arcs, acts or 3-choice menus. No browser-generated progress that contradicts accepted execution. No storyteller-controlled selectors/HTML/CSS/actions. No UI-only fictional branching. No requirement that every scene has a painting, music or animation. No pretending historical event coverage exists for old stories merely because a new view could display it.

## 8. What makes the charter testable

At the design gate, present an authored short story and a long complicated one. Test a mundane delayed task, high-stakes sudden consequence, absent player returning after many events, abstract non-corporeal setting, image failure, stale option, failed generation, and 2,000 published passages. Screen designs should preserve the same truth and reachability across desktop, mobile, reduced motion and keyboard. Watch real users find the present choice, recover reading location and explain whether the journey is committed or only pending.

**Open for owner discussion:** Does the dual-mode thesis capture the product better than a pure reading-focused or pure cinematic-stage concept? Do we want Journal to be a central pillar, not a details panel? The recommendation is yes to both, but they are not yet ratified decisions.
