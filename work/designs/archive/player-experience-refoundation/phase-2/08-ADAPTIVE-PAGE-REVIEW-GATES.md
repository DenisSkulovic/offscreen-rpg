# Living Journal | Review gates, specimen sheet and next design slice

**Status:** OPEN DESIGN candidate evaluation plan, not a ratified design-system or implementation packet. Read [Living Journal thesis](05-LIVING-JOURNAL-THESIS.md), [rich narrative score](06-RICH-NARRATIVE-SCORE.md), [history and forks](07-EDITION-HISTORY-AND-FORKS.md), then compare these gates against [Phase 1 fixtures](../phase-1/06-FIXED-DESIGN-SPECIMENS.md).

## 1. What the previous concept competition taught us

The preceding three prototypes explored:
- Codex: editorial legibility and tactile character but genre contamination.
- Stage: persuasive present-tense atmosphere but too dependent on illustrative hero panels.
- Field Edition: modern reusable identity but aggressive typography unsuitable for intimate quietness.

**Owner synthesis:** maintain the editorial **page/leaf** as a universal narrative affordance, while making substrate, typography, lighting, embedded images, decorated prose and choices dynamically composable by a validated Storyteller-directed presentation layer. Unify those strengths rather than maintaining presets named by setting.

**Verdict:** this is the current **leading integrative hypothesis**, not a ratified art direction. The previous A/B/C comparison remains historical reference evidence; no need to delete it or call it universally wrong.

## 2. A much harder visual test than a lighthouse hero

A strong rendering of Mara's opening is necessary but trivial compared with a truly universal story medium. The following **same renderer / different data** test suite is mandatory.

| ID | Narrative fixture | What the same leaf must prove | Failure to reject |
| --- | --- | --- | --- |
| L1 | Greywater, ordinary first choice | High-quality title, original prose, exact visible options, atmospheric surface | Three generic glowing SaaS cards under a hero |
| L2 | Greywater, 10 long paragraphs + six choices | Long text reading and choice discovery with responsive wrapping | Giant cutoffs, hidden choices, forced split into fake chapters |
| L3 | Greywater, committed work / no new event | A calm living page with no fabricated plot | Fake spinners, accelerated page aging, unearned progress |
| L4 | Moria-like **in-fiction diary fragment**, source-backed | Nested authored-document treatment, worn material, restrained marks, source evidence | Platform claims diary text was written by hero; invented blood/violence |
| L5 | Spaceship log with identical narrative paragraph structure | Controlled glass/technical material as data, no alternate JSX | Code switches to sci-fi preset |
| L6 | Sentient gas-giant signal | Reading plane without physical paper, no portrait/map/handwriting assumption | Alien world suddenly sprouts a medieval notebook |
| L7 | Ilse's quiet bus ride | No forced drama, still beautiful to read without artwork | Incessant luminous effects, giant urgent headings |
| L8 | Full original historical passage (20 and 2,000 passage histories) | Source identity, per-leaf style retention, index/reader navigation | Full prose cards in an unbounded infinite list |
| L9 | Ended campaign + continuing lookalike | Clear distinction between authoritative ending and dramatic but ongoing scene | “THE END” inferred from final-sounding prose |
| L10 | Reader approaches verified story fork | Original source, branch lineage, independent continuity | Old choice becomes a live button in parent |
| L11 | Unrecoverable historic fork point | No false affordance; graceful navigation | “What if?” executes with newer mutable state |
| L12 | Zero-score/prose-only, broken media, forced colors, reduced motion | Safe accessible visual default | Inability to read/play without art |
| L13 | Long Russian/Hebrew passage and multilingual inscription | Unicode grapheme handling, RTL/bi-di, source quotes, font fallback | Broken anchors, invisible characters, CSS-letter spacing garbage |
| L14 | Strange text containing HTML-looking input or malformed score | Plain safe text, local mark rejection, no code execution | HTML injection, text deletion or rerender crash |

Vary viewport sizes including 320/375/768/1440, 200% zoom and no imagery. Real accessibility testing requires keyboard, screen reader and focus investigation, not just absence of horizontal overflow.

## 3. Required four boards for a real next visual competition

**Board A — Now, literary tension:** 1440px and 375px, the Greywater exact existing narrative prose. Render a page above a broad, controlled field; show the precise three options with one noncommittal emphasized visual treatment. Demonstrate where illustration could live without forcing an asset. A light/dark surface variant must retain legibility.

**Board B — Archival spread:** overview with irregular rhythm of 1:N source-linked moments + full passage reader, source markers, original-vs-derived distinction, past choice inert; include a *realistic* 2,000-passage discovery task and a no-chapters policy. Show back-to-Now and retained reading place.

**Board C — Same structure, 3 wildly different directions:** cave-worn, spacecraft-clean, nonhuman luminous. Keep the **DOM tree and passage copy identical** across three data documents for the controlled comparison; do not assemble three hand-painted screenshots with different core layouts and call it “adaptive.”

**Board D — The ending and the branch:** a final source passage next to a branching-history navigation sample; include its unavailable-fork equivalent. Ended status comes from game truth and branch nodes from lineage, not decor.

Each board should show: semantic hierarchy, local control labels, source anchor identity, token recipe, lighting/material constraints, motion intention, contrast fallback and mobile behavior. If the project can't explain a visible component's data/source owner, it's not ready for implementation.

## 4. Page material continuity test

Render **five adjacent published passages** in one evolving situation. The story visual signature remains recognizable; atmosphere subtly changes as the verified situation warrants. Per-page expression is sparse, not a full repaint on every generation.

Proposed scoring questions:
- Is the same life recognizable across all five?
- Can readers distinguish a meaningful atmosphere shift from random aesthetic changes?
- Is the passage's *tone* respected without changing its original words?
- Do historic pages retain their own visual lineage on reopening weeks later?
- Is the page still legible as pure text when decoration is removed?

Run a sequence with no special marks for five passages, followed by one with a grounded embedded document, and finally one with an explicitly ended story. If all five special-effect pages feel equally loud, the system has failed.

## 5. Expressive text under realism constraints

Testing matrix for three rendering policies:

| Policy | Strength | Risk | Working recommendation |
| --- | --- | --- | --- |
| A. Plain paragraphs only | Robust, cheap, source-faithful | Underexpressive for diary/document content | Baseline and fallback, never the ceiling |
| B. Markdown with bold/italic | Familiar, almost no new payload fields | No atmosphere/marginalia, untrusted HTML/plugin escape edge cases | Optional tiny compatibility, not the core |
| C. Exact-source semantic score sidecar | Versatile, bounded, safe and art-directable | Anchor exactness, extra schema/persistence and authoring work | **Lead for prototype**; require strict no-mark fallback |
| D. Generated HTML/CSS/page-tree | Maximal theoretical freedom | Invalid DOM, accessibility, injection, drifting layout, high token burden | **Reject** |

Model/provider comparison (after visual direction acceptance): generate source prose on same three tasks with score disabled vs 1–3 optional marks vs separate admitted low-cost art-direction pass. Compare scene coherence, schema validity, token count, latency and false narrative claims. **Do not choose a second paid model by instinct.**

## 6. A bounded presentation versioning strategy, not a stealth rewrite

The currently **selected V1** presentation resolves `storyStyle`, `scene`, `choices` in the frontend, and future backend authorship/projection remains incomplete. The rich-text and leaf-material thesis is a **candidate later language**, not a patch into that selected V1 by fiat.

When the product owner explicitly accepts the art direction, perform a separate technical design to:
- reconcile which V1 primitives remain, which new capabilities merit version 2, and whether narrative score shares or is separate from scene presentation;
- decide how a sidecar binds to content identity, survives storage and publishes into current/historical viewer-scoped read models;
- preserve server-side passage authority, versioned source and fallback migration for existing V1 passages;
- test asset and textual rights/provenance, historical re-render integrity and false claims;
- select production behavior primitives and renderer choices only after the visual contracts pass.

No new `work/changes/` folder, React refactor or automated Storyteller prompt adaptation is authorized by this proposal.

## 7. Design owner decision register (new)

| ID | Choice | Lead recommendation | Status |
| --- | --- | --- | --- |
| LJ-01 | Universal reading medium | A bounded narrative **leaf**, material may be nonliteral | Proposed |
| LJ-02 | World-dependent visuals | Bounded composable **primitives**, no genre themes | Proposed, strongly consistent with selected V1 |
| LJ-03 | Dynamic artistic continuity | Story signature → scene changes → sparse passage marks | Proposed |
| LJ-04 | Rich text protocol | Canonical source + optional exact-source semantic score | Proposed |
| LJ-05 | HTML input | Model never emits executable HTML/CSS | Recommended rejection, aligns with V1 security |
| LJ-06 | Page aging | Only authored/source-grounded, retain per-passage provenance | Proposed |
| LJ-07 | Historic visual fidelity | Retain valid presentation intent, graceful old-renderer fallback | Proposed |
| LJ-08 | Embedded real diary inside story | Explicit document treatment vs enclosing Journal metaphor | Proposed |
| LJ-09 | Closed books | Game lifecycle says ended, not model dramatic prose | Proposed |
| LJ-10 | Arbitrary historical forks | Desired product affordance, **not implemented**; requires exact snapshots | Future design dependency |
| LJ-11 | Model work/cost | Minimal optional cues; optional director only after measured benefit | Proposed |
| LJ-12 | New visual concept | Build and critique adaptive-leaf prototype before selecting direction | Required visual evidence |

## 8. What we should do next, in design order

1. Produce high-fidelity **adaptive leaf** visual variants with one shared semantic markup and differing bounded direction data; demonstrate cave, spacecraft and abstract story, with identical prose and controls.
2. Design a **rich narrative specimen**: mundane prose, found document, whispered line, emphatic ending, annotation, art slot and no-score fallback. Ensure source original survives all.
3. Design **Journal spreads and the moment spine**, including an ended/branched story and 2,000-passage retrieval.
4. Run human-facing critique and measured behavior/responsiveness/accessibility tests. Reject the weak compositions.
5. Only after the owner reviews and selects product outcomes, reconcile accepted product specifications, design technical contracts and eventually prepare bounded Cursor Changes.

**Stop condition:** until these are reviewed, a GitHub commit to `work/designs/open/` is research continuity, not a production directive.
