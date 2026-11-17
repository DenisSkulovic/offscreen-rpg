# Offscreen RPG | Experience Re-foundation

**Stage:** Limited V1-compatible **Living Book POC target selected**; Phase 0–2 broad UX/art-direction research remains open. No final art direction selected  
**Status:** POC behavior ratified only in [product](../../../../docs/product/experience/living-book-poc.md) and [technical](../../../../docs/technical/client/living-book-poc.md). All unpromoted high-fidelity visual, rich-text, animation and long-history proposals here remain **OPEN DESIGN**. No implementation Change is selected by this dossier.  
**Evidence base:** read-only lean ZIP of `main` at `9e821c6e15bb90444ec711a1b82b1e18cff9539a`, generated 2026-11-17 15:33 UTC.  
**Date:** 2026-11-17

## The problem

Offscreen RPG has credible technical and product rules for truthful persistent storytelling, but not an equivalently deep, unified, deliberately crafted player-facing visual and interaction experience. Past UX/PX/PF waves established helpful seams and safety rails, not a complete design system or visual acceptance. This program begins with product and design authority, not CSS refactoring or purchasing a large component library.

## The creative thesis (proposed)

**A living stage when playing, a living edition when remembering.** The same fictional life must feel present now, richly readable afterward, and credible through waiting, failure, interruption and return. Atmosphere is allowed to transform across radically different worlds without turning the platform into a random-themed template machine.

## Current design work

**POC implementation preparation:** [BOOK01 book shell](../../../changes/open/2026-11-17--book01-reader-shell-poc/CHANGE.md) and [BOOK02 original Journal reader](../../../changes/open/2026-11-17--book02-original-journal-reader/CHANGE.md) are **Proposed and unselected** in the Change queue. They use existing V1 source and defer final styles, book physics and new Storyteller formats. The selected current Change remains independently owned by `work/changes/README.md`.

**[Phase 2: Visual-direction competition](phase-2/README.md)** contains the earlier [interactive three-direction visual laboratory](phase-2/design-lab.html), research and QA, plus the newer **[Living Journal adaptive page hypothesis](phase-2/05-LIVING-JOURNAL-THESIS.md)** and its [proposed rich-text score](phase-2/06-RICH-NARRATIVE-SCORE.md). The [latest book-interaction study](phase-2/12-BOOK-INTERACTION-AND-DECISION-FLOW.md) investigates long decisions, native scrolling and index/reader choreography; see the [interactive lab](phase-2/book-interaction-lab/README.md). The **[source-to-leaf composition study](phase-2/13-NARRATIVE-DOCUMENT-COMPOSITOR.md)** now documents lossless prose, a semantic document tape, ephemeral physical pages and a continuous-reading fallback, with [browser evidence](phase-2/composition-lab/RENDER-EVIDENCE.md). The [adaptive leaf lab](phase-2/adaptive-leaf-lab/README.md) now renders the later hypothesis with one DOM renderer and bounded material fixture inputs. [Book-engine risk research](phase-2/09-BOOK-ENGINE-DEPENDENCY-BOUNDARY.md) separately recommends owning the book semantics and keeping any page-curl library replaceable. **Latest [reader-book clarification](phase-2/10-READER-BOOK-AND-STORY-WORLD.md): the book itself remains visually recognizable across every world; the Storyteller directs the environment and reflected light instead of transforming it into setting-specific apparatus.** The [book-geometry and content-flow study](phase-2/11-BOOK-GEOMETRY-AND-READING-FLOW.md) now compares facing spreads, illustration folios and focused leaves; an enlarged-text six-choice interaction remains a deliberate blocker. It is still **not** a selected art direction, working Storyteller pipeline or approved public schema.

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

Review the [book-engine dependency boundary](phase-2/09-BOOK-ENGINE-DEPENDENCY-BOUNDARY.md) before adopting any book-turn package. Review the previous [Phase 2 concept comparison](phase-2/02-CONCEPT-REVIEW.md) and the [Living Journal thesis](phase-2/05-LIVING-JOURNAL-THESIS.md), then actually prototype the fourth adaptive-page direction against [its proof gates](phase-2/08-ADAPTIVE-PAGE-REVIEW-GATES.md). Reject, select or evolve designs based on reading, present-scene atmosphere, world neutrality and evidence limits. The best-looking single screenshot is not sufficient. Phase 1 architecture remains reviewable. The narrow POC contracts and proposed BOOK01/BOOK02 are now prepared separately. A full final-design-system campaign still requires visual acceptance and is **not** required to start the accepted minimal V1 book POC.
