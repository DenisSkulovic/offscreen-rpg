# Offscreen RPG | Experience Re-foundation

**Stage:** Phase 0 audited; Phase 1 architecture drafted; Phase 2 three visual directions prototyped for owner review. No art direction selected  
**Status:** OPEN DESIGN / DRAFT FOR PRODUCT-OWNER REVIEW. Not ratified design; no implementation authorized.  
**Evidence base:** read-only lean ZIP of `main` at `9e821c6e15bb90444ec711a1b82b1e18cff9539a`, generated 2026-11-17 15:33 UTC.  
**Date:** 2026-11-17

## The problem

Offscreen RPG has credible technical and product rules for truthful persistent storytelling, but not an equivalently deep, unified, deliberately crafted player-facing visual and interaction experience. Past UX/PX/PF waves established helpful seams and safety rails, not a complete design system or visual acceptance. This program begins with product and design authority, not CSS refactoring or purchasing a large component library.

## The creative thesis (proposed)

**A living stage when playing, a living edition when remembering.** The same fictional life must feel present now, richly readable afterward, and credible through waiting, failure, interruption and return. Atmosphere is allowed to transform across radically different worlds without turning the platform into a random-themed template machine.

## Current design work

**[Phase 2: Visual-direction competition](phase-2/README.md)** is the current art-direction review packet, with an [interactive visual laboratory](phase-2/design-lab.html), twelve annotated references, three comparative concepts, motion/scene-presentation design, and browser QA evidence. No art direction is selected.

**[Phase 1: Player experience architecture](phase-1/README.md)** remains an open design foundation. It maps the player mental model, spaces, first visit / living / return / remembrance journeys, Now state grammar, Journal reading architecture, fixed narrative test specimens, and explicit candidate decisions. This dossier remains unaccepted and cannot authorize an implementation Change.

## Phase 0 foundations (read order)

1. [AUDIT.md](AUDIT.md): what the frozen ZIP actually supports; strengths, gaps, caveats and source map.
2. [EXPERIENCE-CHARTER.md](EXPERIENCE-CHARTER.md): product thesis, experience principles, audience needs and deliberate non-goals.
3. [DESIGN-RESEARCH.md](DESIGN-RESEARCH.md): reference study, distinct art-direction candidates and technology research questions.
4. [JOURNAL-OPPORTUNITY.md](JOURNAL-OPPORTUNITY.md): the narrative-history opportunity and its data/authority boundaries. This is a study, not a frozen screen specification.
5. [PROGRAM-PLAN.md](PROGRAM-PLAN.md): staged work, evidence gates, future deliverables, and ownership.
6. [DESIGN-PROCESS.md](DESIGN-PROCESS.md): how this design program advances without becoming an implementation queue.

## What has **not** been done

- No running-browser screenshot or Figma fidelity review **of the deployed application**. Phase 2 rendered self-contained design prototypes only; these do not establish product UI quality.
- No player interviews, usability tests, moderated reading tests or validated taste judgments.
- No selected final visual theme, component API, production layout, motion system, library installation or implementation changes. Phase 2 provided experimental compositions only.
- These files are preserved under `work/designs/open/` as **unaccepted proposals**. Their presence in GitHub is not product-owner ratification, a selected target, or implementation authorization.
- No redefinition of time, mechanics, authorizations, published truth, model permissions or spending.

## Existing authority to preserve

- `docs/product/foundations/vision.md`
- `docs/product/foundations/concepts.md`
- `docs/product/experience/{principles,navigation-and-stories,play-and-decisions,return-and-journal,presentation}.md`
- `docs/technical/client/{architecture,presentation-runtime,state-and-server-boundary}.md`
- `work/designs/open/player-replay/player-replay-experience-v1.md` (proposed, separate from Journal)

Product docs remain authoritative over technical contracts; technical contracts over code. Any new selected experience design must reconcile existing authority explicitly. Code is the current artifact, not a design veto.

## Exit condition for the next review

Review the [Phase 2 concept comparison](phase-2/02-CONCEPT-REVIEW.md) alongside the actual [inspectable compositions](phase-2/design-lab.html); reject, select or evolve directions based on reading, present-scene atmosphere, world neutrality and evidence limits. The best-looking single screenshot is not sufficient. Phase 1 architecture remains reviewable. Only later, after a coherent approved visual grammar and full-screen specifications, should design-system owners and eventual bounded Changes be prepared.
