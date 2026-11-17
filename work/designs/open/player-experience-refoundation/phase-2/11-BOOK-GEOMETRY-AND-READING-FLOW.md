# Living Journal | Book geometry and reading-flow design study

**Status:** OPEN DESIGN, owner review pending. **Date:** 2026-11-17. **Implementation permission:** none.

**Follows:** [10 — Stable reader's book and the story world](10-READER-BOOK-AND-STORY-WORLD.md), [09 — Book-engine dependency boundary](09-BOOK-ENGINE-DEPENDENCY-BOUNDARY.md), [Phase 1 narrative specimens](../phase-1/06-FIXED-DESIGN-SPECIMENS.md), and accepted [navigation](../../../../../docs/product/experience/navigation-and-stories.md) / [history](../../../../../docs/product/experience/return-and-journal.md). The accepted V1 presentation runtime remains authoritative.

## Thesis

**A book is a stable interface object, not a compulsory two-column template.** Its form must feel tactile and recognizable. Its **content composition** may vary with passage length, authorized art, current verified choices, viewport, and reader text-size preferences. The **world changes behind the book**, with controlled reflected lighting; no genre-specific book skins.

Do not equate a passage, scene, Storyteller turn, or chapter with a physical leaf. The book is a reading projection over immutable source. Derived leaf boundaries change with zoom, artwork and screen width; no source identity or durable bookmark may be stored as "page 38".

## Three arrangements under consideration

| Arrangement | Best task | Risk / exception | Recommendation |
| --- | --- | --- | --- |
| Facing **prose/prose** spread | Substantial narration, historical passage rereading | With very short prose, a spread can feel mostly empty | Leading desktop *long-reading* arrangement |
| Facing **illustration/prose** spread | Real, source-authorized illustration or in-fiction document opposite story text | Never reserve an empty artwork pane; repeated art through many pages can feel absurd | Optional entry composition, not default |
| **Focused leaf** | Mobile, enlarged text, brief scene, decision threshold, accessible fallbacks | Requires strong enough book identity that it doesn't look like a normal document card | Leading mobile/action arrangement |

These are *content roles*, **not CaveLayout / SpaceLayout / DialogueLayout presets**. The reading engine chooses derived composition after seeing actual source/media and viewport. A user's accessibility choice can override it. The Storyteller can suggest source-relevant illustration and sparse semantic marks, never order the DOM or determine page boundaries.

Desktop may show facing leaves. Mobile should show one readable leaf rather than two shrunken columns. A real book can offer the same physical identity in both cases. Do not force one side of a facing spread to always contain actions or art.

## The most important observed failure: decisions split blindly

In the first Chromium rendering of the synthetic Greywater A-184 passage at 375px, **one currently authorized-choice fixture appeared on the first leaf while the other two were on the next**. It had no horizontal overflow and looked neat, yet it misrepresented the choice set to the reader. That is a product failure, not a cosmetic flaw.

The research renderer was revised to treat a **question plus all current choices as a logical decision group**. If the narration fills the present leaf, the question and choices start together on the next, and the navigation announces **"To your choices"** instead of generic "Next". Physical reading navigation never submits game commands.

**Unresolved blocker:** at 375px and 150% text, the extended six-choice specimen exceeds a fixed leaf. The experimental overflow-y scroll keeps all six choice nodes, but only part of the set is initially visible. This is **mechanically present yet experientially unsafe**. Do not ship the nested-scroll fallback as a chosen design. Compare at least:
1. a naturally expanding (possibly scrollable document-height) **decision leaf**, preserving book materials and source context; versus
2. a purpose-built **choice spread / decision sheet** with clear total count and no silent hidden alternatives.
Evaluate reading context, focus, keyboard, touch, semantic group announcement and full-set discoverability under 200% browser zoom. The result may require disabling physical page-turning for that particular state.

A book must never outrank informed selection. The physical metaphor is subordinate to player agency.

## Interaction and low-chrome composition

- The *only permanent visual focus* should be the book and its surrounding atmosphere. No permanent left-hand tabs, administrative pane, technical status inspector or always-visible design controls.
- Now and Journal remain the selected **primary in-story spaces**, reachable by a discreet in-book index/bookmark affordance or a comparably well-tested interaction.
- The current source passage appears in natural reading order. A trusted illustration or embedded real document can be on an adjacent leaf. Absent art collapses the slot; do not manufacture scenery.
- Turn navigation must be visibly accessible, keyboard-operable and never intercept text selection or actionable choices. Page turning reads history; it does not advance game time, reroll mechanics or dispatch an operation.
- For long, short or deliberately quiet prose, allow space rather than add decorative status cards.
- A new verified publication may change the visible page and atmosphere; a query refresh, pending model call or estimated timer must not animate a nonexistent publication.
- Responsive, no-animation and continuous reading fallback render the **same canonical words and current verified offer**. They are not secondary game modes.

## The disposable browser experiment

A separate, locally rendered and distributable **Book Geometry Study** was produced in this conversation, not in the production app. It is a self-contained HTML/CSS/JS book with one stable leather/paper visual object, three page arrangements, four atmosphere inputs (cave, space, abstract signal, quiet), a hidden design inspector, an in-book index, Now/Journal/original-reader mock, a synthetic extended 10-paragraph/6-choice case and 100/125/150% font scaling. No API, framework dependency or Storyteller run.

The test image of a lighthouse is a **designer-authored schematic fixture**, not generated campaign art or a claim of player/source facts. All story prose in the short scenario comes from the Phase 1 fixed specimen; extended prose is explicitly synthetic comparison material.

### QA evidence from the local Chromium lab

- **144 matrix cells:** 320/375/768/1440px widths × 4 narrative fixtures × 3 text scales × 3 requested layouts. **0 failures** in the *limited* checks for horizontal overflow, all original words recoverable across derived leaves, exact choice ID membership, and obvious outer-leaf clipping.
- A deliberately long synthetic paragraph split across **four leaves** while preserving its words.
- The 375px/150%-text case retained six choices in one DOM decision group but **needed internal scrolling** and therefore **fails the intended usability gate** despite basic QA passing.
- A requested illustration spread without an authorized asset falls back to ordinary reading (no fabricated image slot).
- Forced-colors mobile and one Now → Journal index → original passage navigation path received limited smoke checks.
- A tested decision-leaf source anchor survived responsive layout changes; full selection/Unicode/bidi cursor restoration was **not** established.

**Not tested or proven:** 200% browser zoom, screen readers, assistive focus paths, RTL/Hebrew/Cyrillic line breaking, human readability, 2,000-passage real search, historical art retention, live publication during an animation, production SSR/React, latency/performance at scale, image generator integration, animation-library compatibility, and actual game authority. These must not be described as passed.

Source/test package is a **conversation artifact**, not a committed production file. This open-design spec records the researched findings so future agents can recover the decisions even without the browser prototype. A later source-backed lab may be checked into GitHub when its contract is stable.

## What remains product-design work before Changes

| Gate | Required result | Status |
| --- | --- | --- |
| **B1 Geometry / book identity** | Same recognizable book, readable spread/focus/folio, no permanent sidebar, optional world imagery | Strong experimental direction; **not owner-approved** |
| **B2 Decision and navigation choreography** | Large choice sets, source reflow, index, latest Now, history reader, back, keyboard/touch and text zoom | **Open; one high-priority overflow blocker** |
| **B3 Art direction / rich source expression** | Stable finished book styling, ambient scene vocabulary, source-safe rich text/illustration behavior and motion | **Open**; earlier concept studies informative |
| **B4 Canonical product and technical reconciliation** | Review accepted designs, public projection/persistence contract, Storyteller authoring budget and validated renderer boundary | **Open** |
| **B5 Bounded Cursor Changes** | Individually approved implementation packets with tests/negative evidence, not a mega-reskin | **Not authorized** |

We're approaching a genuine product specification, but **we are not ready to hand Cursor an uncontrolled frontend rebuild**. The unresolved accessibility and choice-view problem is fundamental, not polish.

## Immediate next design slice

1. **Resolve six choices at high text scale** without hiding alternatives. Prototype two real interaction alternatives against identical text and offer semantics.
2. Specify the minimal book navigation choreography and states (open, Now, read ahead, historical reader, index, return), with explicit focus/scroll rules.
3. Stress long-form source reflow, illustration/embedded document placement and non-English scripts.
4. Critique the actual book visual quality and atmosphere on multiple scenes before selecting final typography/physical material tokens.
5. Then ratify specific outcomes, reconcile accepted product/technical owners, and prepare **narrow implementation Changes**.

**The book is ours. Page-curl physics can be replaced. Game truth never belongs to the book renderer.**
