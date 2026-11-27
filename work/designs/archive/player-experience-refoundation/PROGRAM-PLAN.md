# Experience re-foundation | Staged design program and acceptance gates

**Status:** Proposed process. No code-bearing Change is authorized by this plan.  
**Method:** End-state-first product design → visual experiments → ratified product contracts → technical design → scoped implementation Changes. Code follows documentation.

## Why this is a program, not a giant frontend refactor

The goal is not to make the existing `StoryFrame` prettier. It is to decide what Offscreen RPG should be as a *narrative game experience*. Premature component abstraction would freeze today's awkward structure into tomorrow's design system. The design system itself must follow a validated visual and interaction grammar, not precede it as an arbitrary list of Buttons, Cards and Modals.

## Workstream structure

| Phase | Central question | Minimum artifacts | Gate to next phase |
| --- | --- | --- | --- |
| **0. Audit** (now) | What exists, and what is genuinely missing? | Source inventory, UX/technical boundary matrix, evidence limits, research plan | Owner recognizes the actual problem; no fictitious implementation claims |
| **1. Experience architecture** | What is the player's conceptual journey and why return? | Product experience charter, player jobs, journey maps, mental models, space map, content/interaction grammar, failure states | Owner approves priorities and primary story spaces |
| **2. Visual/art direction** | What does the experience *feel* like? | Annotated reference board, three materially distinct full-screen prototypes, color/type/motion tests, world-neutral variants | Comparative critique and owner selection based on real examples |
| **3. Interaction design** | How do the major spaces behave? | Wireflows, desktop/mobile layouts, Now decision/wait/return patterns, Library/Create/Journal flows, content hierarchy | Task walkthroughs succeed without pretty mockups |
| **4. Design system** | What shared visual and behavioral vocabulary should govern? | Token roles, typography, surfaces, spacing, layout, iconography, focus, states, component anatomy/variants, composition templates, exceptions | System can reproduce multiple approved scenes consistently |
| **5. High-fidelity prototypes** | Does it look and feel extraordinary in practice? | Realistic page boards, animation storyboards, interactive prototypes, variants, 375/768/1440px screens | Human critique, cross-world comparison and accessibility stress review |
| **6. Dynamic presentation design** | How may the Storyteller adapt atmosphere without seizing UI authority? | Capability matrix, content-to-presentation contracts, versioned composition registry, asset/motion budgets, lifecycle/race rules, production integration design | Validated safe fallback + stale-choice/asset/visibility negatives; technical owner approval |
| **7. Validation / ratification** | Can the experience withstand real, difficult scenarios? | Design QA corpus, usability tasks, findings/decisions log, selected visual specimens, documented tradeoffs | Product owner ratifies product authority; evidence gaps named |
| **8. Technical architecture** | How to realize the chosen experience safely? | `docs/technical/client` changes, data projection/source maps, component ownership, SSR/query boundaries, a11y and perf budgets | Technical contract reconciled with product and current engine |
| **9. Implementation waves** | How to converge code toward that end state? | Bounded Changes, verification plans and reconciliation ledgers | Only now does Cursor implement chosen slices, with screenshots and real scenario proof |

These phases may overlap in research but **not in authority**. We can sketch an interaction while art direction is open; we cannot call an unratified sketch the permanent product bible. Production changes must remain gated until their semantics and visual outcomes are chosen.

## Phase 1: first comprehensive design conversations

### 1A. Player promise and journey

Write three concrete user narratives: curiosity → first trial → create → first consequential choice; ordinary recurring play → accepted wait → return and see source-backed development; six-month campaign → browse original passages → a remembered person/object → return to Now. For each: trigger, expectation, action, system state, outcome, error branch, emotional beat, and context needed. Include a world with no body/map.

### 1B. Story reading grammar

Precisely distinguish current passage, scene/situation, accepted choice, process, completed development, published history, derived overview and proposed Replay. Create annotated sample content for 1/20/2000-passage histories. Decide whether a 'moment card' is a passage, a derived window, or either with explicit labeling.

### 1C. Global information architecture

Propose full map and responsive transitions across Welcome, Demo, Stories, Create, Now, Journal, context World/You, Settings and staff boundaries. Define which spaces are primary, contextual, modal or deliberately absent. Design return-to-Now, back-to-origin, deep links and focus restoration.

**Phase 1 deliverable:** a product experience architecture dossier, not a wireframe implementation ticket.

## Phase 2: practical visual exploration

Make three alternatives using *the same* story scenario and copy to prevent attractive content from biasing comparison. Render a meaningful live decision, quiet waiting, long-passage reader, and history overview at desktop and mobile sizes. Include at least one highly abstract scenario without imagery. Discuss readability, hierarchy, emotion, novelty, accessibility, compatibility with a world-neutral premise, and how much unique code would be needed.

Reject the first concept if a second genuinely solves the player's job better. Avoid producing three recolors of one card layout. The living-stage/living-edition hybrid is a *leading hypothesis*, not a preapproved answer.

## Phase 4: design-system deliverable structure

**Foundations:** branded identity, semantic color roles, world/scene token cascade, type/measure/line-height scales, spacing, surfaces, borders, depth, iconography, responsive breakpoints, contrast, motion/accessibility budgets.

**Primitives:** focusable action, link, text, input, select, dialog, disclosure, tab/listbox, feedback, tooltip when needed. Build only what selected experiences actually require; leverage proven accessible primitives.

**Narrative patterns:** narrative passage, scene atmosphere, intent selection, committed consequence, active interval, return recap, passage preview, moment index, passage reader, thread link, source provenance, storyteller appearance treatment. These are not all generic 'cards'.

**Compositions:** public entrance, story shelf, creation journey, active stage, waiting stage, journal overview, deep reading, optional world/self, recovery state. Every composition defines hierarchy, responsive behavior and meaningful motion, not merely a grid.

**Governance:** usage/do-not-use examples, Storybook visual specimens, content stress fixtures, visual regression, accessible states, owner, versioning, deprecation and exception path. Dynamic presentation is a bounded extension of platform identity, not a second ad hoc style system.

## Review roles (can be simulated as independent critique passes)

**Product owner:** promise, jobs, stakes, scope and authority.  
**Experience/interaction designer:** journeys, navigation, decisions and recovery.  
**Editorial designer:** narrative rhythm, reading and archive hierarchy.  
**Art director:** identity, composition, imagery, typography and material.  
**Motion designer:** causality, timing and graceful non-animated alternatives.  
**Design system steward:** tokens, usage and exceptions.  
**Accessibility reviewer:** keyboard, WCAG constraints, focus, reduced motion and text comfort.  
**Technical architect:** integration, trust boundaries, performance and maintainability.  
**Independent challenger:** finds credible alternate approaches and evidence against the leading direction.

The 'team' should produce conflicting proposals and reconcile them; parallel agents agreeing with each other is not evidence. An LLM-generated design remains unvalidated until rendered and criticized by humans.

## Anti-slop acceptance protocol

1. **Two real alternatives** per important design decision; show an actual different hierarchy, not superficial recoloring.
2. **Source-backed content:** use realistic saved passage text, options, durations, error and absence states. Never demo only lorem ipsum or ideal short copy.
3. **Pixel-level evidence:** screen captures, not just CSS/TSX. Review at 375/768/1440px and appropriate screen heights.
4. **Content torture:** very long title, one sentence passage, ten paragraphs, 20 choices, no choices, text-only world, Cyrillic, missing art, keyboard-only, high zoom.
5. **Motion truth:** visual effect must correspond to verified event; reduced-motion version and manual interruption tested.
6. **Reader tests:** find current action, find passage #120, explain what was earned versus pending, return to Now without loss of place.
7. **System review:** can one design-language change improve multiple spaces without causing unrelated breakage? Are variants meaningful, not boolean soup?
8. **No unjustified features:** every panel has a user job; each new API field has a verified source and failure behavior.

## Repository integration once owner approves the program

Initially these materials belong in `work/designs/open/player-experience-refoundation/` as *proposals*. After explicit selection and reconciliation, promote decisions to canonical subjects under `docs/product/experience/` (product promises, mental models, interactions, Journal and dynamic presentation). Only after that update the technical contracts under `docs/technical/client/` and any related API contracts; then create bounded work under `work/changes/open/` for Cursor. Do not duplicate the same authority in a pile of unmaintainable Markdown files. The archived proposal should link to the selected owner document and not compete with it.

## Immediate next working session

**Pick and stress-test the product experience architecture first:** Now, Journal, what constitutes a passage/moment, switching between present and history, and the story list/return journey. Build an annotated information map with the exact content and interaction hierarchy; challenge it with the current source data. This is the highest-leverage prerequisite for visual designs and component decisions.

**No Cursor handoff yet.**
