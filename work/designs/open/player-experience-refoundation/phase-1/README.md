# Player experience re-foundation | Phase 1 architecture dossier

**Status:** OPEN DESIGN / owner review pending. **No implementation authority.**
**Date:** 2026-11-17. **Basis:** audited lean ZIP `9e821c6e15bb` and existing canonical experience policy, with main-branch policy rechecked at design start.
**Purpose:** define *what a lived, persistent narrative experience is supposed to feel like structurally*, before selecting art direction, design system, pages/components, libraries or implementation Changes.

## Start here

| Document | What it answers |
| --- | --- |
| [01 — Experience model](01-EXPERIENCE-MODEL.md) | What is the player actually doing; what is the mental model and rhythm? |
| [02 — Space architecture](02-SPACE-ARCHITECTURE.md) | How do Welcome, Demo, Stories, Create, Now, Journal, context and Account relate? What happens on navigation, mobile, deep link and back? |
| [03 — Journey blueprints](03-JOURNEY-BLUEPRINTS.md) | What happens from first contact to owned life; from accepted work to return; from 2,000-passage history to rediscovery? |
| [04 — Now-state grammar](04-NOW-STATE-GRAMMAR.md) | How are current narration, decision, accepted work, pause, pending publication, uncertain spend, silence and return differentiated? |
| [05 — Journal reading model](05-JOURNAL-READING-MODEL.md) | How do overview, moments, original reader, provenance, chronology and later Replay differ? |
| [06 — Fixed narrative specimens](06-FIXED-DESIGN-SPECIMENS.md) | Exactly what text/states must future visual concepts all render, including nonhuman and quiet worlds? |
| [07 — Decisions and quality gates](07-DECISIONS-AND-QUALITY-GATES.md) | Which architectural candidates are recommended, which require approval, and how do we refuse generic/unsafe design? |

## Preliminary architectural recommendation

**A continuing life is the product unit. Now and Journal are complementary primary destinations**, rather than one game-status dashboard or a single endless passage list. The player lives, makes intentions, leaves under already accepted commitments, returns to source-backed developments, and later browses a first-class personal chronicle. World and You appear contextually, not as mandatory empty tabs. The UI remains usable in abstract and mundane settings, with or without illustration.

The recommended approach preserves the accepted `docs/product/experience/navigation-and-stories.md` constraints and the no-chapters/scenes-not-passages ontology. It does **not** approve a particular typography, palette, component library, motion effect, page grid or route structure.

## What is known vs proposed

**Accepted source policy:** no arbitrary offscreen autonomy; intentions not results; earned time/consequences; honest demo/live difference; no mandatory body/inventory/map/chapters; Next/Nest authority, source-backed history and bounded presentation.

**Observed source implementation:** present Play/StoryFrame hierarchy, history inside Details, twenty-passage page read, optional current appearance consumer, separate public event/checkpoint source families. Source investigation did not run the app or inspect final rendered screens.

**Proposed experience:** dedicated Journal overview and original reader; editorial 1:N passage moment previews; return prelude; state-specific Now compositions; personal reading position; visual comparison of distinct composition systems. These are **not claims of built or approved features**.

## What this phase does NOT do

- No Figma board, generated high-fidelity image, prototype or rendered screenshots yet.
- No app route, component code, CSS, animation package or API alteration.
- No new game mechanics, authority, historical replay, spending consent, player bookmarks or source index.
- No ratification of selected product contracts; only explicit product-owner review can promote them.
- No `work/changes/` packets, Cursor implementation order or frontend refactor tickets.

## Proposed next phase

**Phase 2: art-direction competition.** Create three compositionally different, modern design concepts using **identical story content** from [fixed specimens](06-FIXED-DESIGN-SPECIMENS.md). Each must show (1) live choice, (2) accepted quiet activity, (3) Journal overview+reader, (4) abstract nonhuman scene, and (5) narrow/mobile/reduced-motion states. Compare information hierarchy, expressive atmosphere, uniqueness, reading comfort, motion purpose, world flexibility and failure-mode honesty.

Do not jump to a component library until candidate page compositions demonstrate a coherent visual language. A motion/FX library can implement a chosen behavior later, not invent the product design now.

## Gate for owner review

In the next design discussion, challenge:
1. Is **Now + Journal** the right primary experience model, or is there a stronger alternative?
2. Does the proposed editorial “moment” properly preserve the difference between passage, scene, event and derived overview?
3. Is a return recap a prelude to Now, not an obstruction?
4. Does the Stories shelf present lives rather than status widgets?
5. What is genuinely missing from the phase's player journey map before committing to visual directions?

**Until accepted, the dossier is a set of ranked proposals with evidence limits, not a silent rewrite of product law.**
