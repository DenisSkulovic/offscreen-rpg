# Living Book | Selected player experience for the first POC

**Status:** the **historical selected POC experience**, chosen 2026-11-17 after owner review of the book-geometry, decision-flow and source-composition prototypes. It selects a recognizable book with Now and Journal, original published passages, natural flow without premature pagination, a deliberately modest Journal, and a human acceptance walkthrough. It is not the final player experience and makes no future layout choice: final visual design, typography, motion, button styling and illustrated art direction are **not accepted** ([Deferred](#deferred-deliberately-not-authorized-by-poc-acceptance)). Authority is limited to the first POC, not the eventual full Living Journal. This page does not implement the UI; what source contains is recorded in [STATUS](../../../STATUS.md) and [BOOK01 shell](../../technical/client/living-book-poc.md#book01-book-shell-and-current-now-composition).

**Owns:** the player-visible book-reading metaphor and basic in-story Now/Journal behaviors during the initial React implementation. **Other owners:** [navigation](navigation-and-stories.md) owns all story spaces; [play/decisions](play-and-decisions.md) owns action honesty; [return/journal](return-and-journal.md) owns long history; [presentation](presentation.md) owns imagery/atmosphere; [technical POC](../../technical/client/living-book-poc.md) owns client integration. Earlier alternatives and research remain [historical research dossier](https://github.com/DenisSkulovic/offscreen-rpg/blob/7694d4124e6227e7b6b5092ada4067a63df4b4fb/work/designs/open/player-experience-refoundation/README.md).

## POC promise

The player opens **a recognizably book-like record of their continuing life**. The fictional world is expressed primarily in the atmosphere **behind and across** that stable book, not by changing it into a spacecraft console, cave map, or cell membrane. This is a reader's medium, not necessarily an in-fiction object held by the character.

Its main experience is deliberately quiet. The **book is the primary composition**, not a dashboard. The earlier visual-lab top toolbar, permanent left-hand tabs, inspector column, control palettes and decorative status counters are **not player-facing design precedents**. A minimal in-book contents/bookmark or comparable accessible navigation affordance can expose Now, Journal, Stories and legitimate story settings. The final appearance/animation of those affordances is deferred.

**POC accepts recognizable structure, not polished skin:** readable book surface; usable desktop facing spread where safe; one leaf and natural page flow on mobile/large text; a single continuous reading alternative; a source-faithful historical reading path. A physical two-page spread does **not** require two equal-length prose columns, a permanent right illustration, or options always on the opposite leaf.

## Reader jobs and non-negotiable outcomes

1. **Open Now:** current published title and *all* source paragraphs are readable in order. Current allowed choice/hold/status is discoverable without hunting through external chrome. Important system status never becomes a fictional clue.
2. **Decide safely:** each currently valid option appears exactly once; its question and *entire option set* remain a coherent interaction group. If a long passage or large type makes a fixed leaf unsafe, allow the page to grow/scroll naturally or switch to a continuous reader. No hidden options behind a decorative curl, no nested choice scroll trap and no forced fixed-height page.
3. **Wait or recover:** accepted work, pause/resume, pending narration, uncertain/failed charge, offline/stale state and safe recovery stay truthful and operable. Their UI can be quieter, **not absent**.
4. **Open Journal:** a simple in-book route or focused contents control exposes the existing saved original passages. History is read-only and never puts historical options back into the live command interface.
5. **Return to Now:** an explicit affordance returns to the currently authorized situation. The prior reading location should survive normal in-book navigation when practical without anchoring to a renderer page number.
6. **Read anywhere:** mobile 320–375px, keyboard, reduced motion and enlarged text never clip or omit meaningful prose/choices. Native selection, browser scrolling and accessible semantics outrank simulated book physics.
7. **Stay in the same book:** cave, ship, microbe and mundane bus stories share the same reading architecture. Scene presentation may supply approved palette, lighting and image, but the book silhouette, source truth, system-control semantics and reading behavior remain platform-owned.

Command identity and an uncertain submit stay in [Choice honesty](play-and-decisions.md#choice-honesty) and [the adverse cases](play-and-decisions.md#denied-waiting-error-lost-connection-and-a-stale-offer). A generated synopsis stays in [Reading a long life](return-and-journal.md#reading-a-long-life).

### Composition without premature pagination

For the first POC, **natural document flow is the safe baseline**. A desktop spread is allowed when it does not split one choice set, clip content or violate reading/focus order. A focused leaf is valid even on desktop when its content demands it. On narrow/mobile screens a single readable leaf is the default. The source passage, game scene, physical leaf and Storyteller turn are different units; no mandatory chapters.

There is **no POC requirement for realistic 3D curl, automatic word-level page breaking, fixed-height page allocation or a flipbook dependency**. A modest non-curl transition, or an instant page/read switch, is acceptable. The book metaphor must never require special hardware, forced orientation, image generation or an in-world paper explanation.

## POC Journal: intentionally modest

The first POC reuses the **existing authenticated paginated history** and original title/paragraphs. A minimal contents/list → full source passage reading path is enough. Preserve original publication sequence and passage identity; no required new index/search API, summarized "moments", historic art fidelity or arbitrary past-choice forking.

The contract is honesty about reach. The current API returns 20 records newest-first and cannot seek a remote passage directly, so the reader **does not pretend to have random access or a complete 2,000-passage index**: it offers "Load older" until a seek exists, and an unimplemented deep link never masquerades as a working historical reference. A preview derived from original paragraphs stays clearly a preview; this POC includes no AI synopsis.

## What the player does *not* see

No always-visible design-lab settings bar, permanent navigation sidebar, permanent developer inspector or raw revision/usage/status-code panel as primary story furniture. Legitimate system control, usage and settings must remain accessible through quiet but legible disclosure, not be deleted. No fabricated model status, progress, fictional time, reward or autonomous NPC choice.

A new current passage can receive restrained arrival treatment **only when truly published**. Opening/closing the book, scrolling, turning, reading the Journal, or returning to Now must not consume in-game time, initiate generation, submit an action or create new choices.

## Deferred, deliberately not authorized by POC acceptance

- Final visual art direction, materials, book cover, paper grain, color system, layout polish, menu/buttons and motion choreography.
- Generated illustration/image pipeline, per-passage retained scene art, external assets and paid generation.
- Rich semantic narrative score, Markdown/HTML input changes, paragraph schema changes or Storyteller prompt updates.
- Realistic physics curl and a third-party page-flipping package; elaborate compositor and persistent physical page indexes.
- Journal search, source-backed long-history gists/threads, synchronized bookmarks, player Replay and arbitrary historical forking.
- Rebuilding public landing, onboarding, library, account, staff or Chamber surfaces.

These remain unratified in the historical [design program](https://github.com/DenisSkulovic/offscreen-rpg/blob/7694d4124e6227e7b6b5092ada4067a63df4b4fb/work/designs/open/player-experience-refoundation/README.md). POC acceptance does not ratify all 15 Phase 2 studies as permanent law.

## Human POC acceptance walkthrough

The POC is accepted only when a person performs this walkthrough, and acceptance would establish the POC behavior above, never the final UX. **No human run is recorded; the walkthrough is NOT RUN and nothing here counts as passed.** The person:

1. opens a short Greywater-like story and reads the entire published passage;
2. sees all current options and submits only one authorized intention;
3. refreshes without duplicate outcomes;
4. observes a legitimate wait or a blocked/uncertain narration;
5. navigates to a saved prior passage and back;
6. reads a long paragraph with enlarged text;
7. uses the same book on a phone without losing words or controls.

Atmosphere or illustration may be absent, but the experience must still be legibly a book rather than a dashboard. If the "book" hides a choice, blocks a screen reader, confuses published prose with pending work, or requires a model to style HTML, **the POC fails** regardless of attractive screenshots.

Implementation authorization is separate. This page selects POC product behavior; only a separately selected bounded [Change](../../../work/changes/README.md) permits Cursor to modify code.
