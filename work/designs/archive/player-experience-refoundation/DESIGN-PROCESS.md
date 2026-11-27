# Player experience re-foundation | design process and promotion gates

**Status:** Proposed process for this design program, aligned with the repository's existing documentation-authority rules. Not a blanket replacement for [documentation standards](../../../../.agents/references/documentation-navigation-standard.md). **Implementation permission:** none.

## Where work belongs

| State | Owner | What it means |
| --- | --- | --- |
| Observed/current-state evidence | This dossier's `AUDIT.md`, later dated `evidence/` | Source claims are SHA-scoped; screenshots and real-play trials need their own receipts |
| Unaccepted investigations, alternatives, storyboards, research and prototypes | `work/designs/open/player-experience-refoundation/` | Reviewable proposals, including competing directions and negative evaluations; never product law |
| Accepted product outcomes and interaction contracts | Reconcile into existing `docs/product/experience/` owners | The desired product experience, even if not implemented; cite a decision and explicitly resolve conflicts |
| Accepted rendering/interaction architecture | Reconcile into existing `docs/technical/client/` owners | Enforceable constraints and contracts, but not merely a list of chosen libraries |
| Approved, narrow implementation work | `work/changes/open/` after selection | Only after the appropriate design gates are satisfied; changes are implementation packets, not the design venue |
| Visual, usability and integration verification | Dated `evidence/` plus `STATUS.md` | What was actually rendered, exercised and accepted, distinctly from design intent |

This is a **lifecycle of authority**, not an assertion that designs need many files or approvals for their own sake. Keep deep research here while open. On ratification, move or reconcile only the accepted, durable rules into the relevant existing product/technical owner. Retain rationale and rejected alternatives in this dossier; don't duplicate permanent contracts.

## Design review gates, in sequence

### Gate 0: Understand the present system
- Examine the current routes, components, tokens, story persistence, presentation contracts and product documents.
- Record what exists, what is inferred, and what has not been browser-tested.
- No demand that existing vibecoded compositions survive; preserve actual narrative-truth and authorization contracts unless deliberately changed.

### Gate 1: Player experience architecture
- Define the player jobs, entry/return journeys, information hierarchy, story-state vocabulary, history navigation and time/attention model.
- Specify now vs committed past vs future/draft. Cover empty, waiting, error, mobile, accessibility and a radically abstract world.
- Owner reviews the experience model, not a bundle of generic components.

### Gate 2: Genuine art-direction competition
- Produce at least three **compositionally different** candidate directions using identical scenario copy and comparable desktop/mobile states.
- Compare readability, emotional effect, distinctiveness, usability, support for world-neutral stories and implementation burden.
- Choose, hybridize, or reject. A moodboard alone cannot pass this gate.

### Gate 3: Visual and interaction specifications
- Define type scale and measure, semantic color/surfaces, responsive grids, accessibility, illustration/asset direction and a motion language with reduced-motion equivalents.
- Produce annotated high-fidelity designs for actual player journeys: entry, creation, library, active scene, waiting, journal and return.
- Do not select Radix, Motion, Rive, GSAP or another library merely to decorate a design; investigate them against concrete behavior.

### Gate 4: Component and adaptive-presentation contract
- Extract genuinely reusable patterns from approved screens; document state anatomy, variants, keyboard/focus behavior, density and negative examples.
- Specify the boundary between stable platform design and bounded Storyteller-driven scene expression. No arbitrary model-supplied CSS or untrusted authority.
- Prove the design can display long stories and 1/20/2000 passage histories without losing original published truth.

### Gate 5: Ratification and implementation preparation
- Owner accepts specific outcomes, alternatives and non-goals. Reconcile the appropriate existing canonical docs and record explicit decision state.
- Translate **selected**, implementable portions into separate narrow Changes with acceptance criteria and source/evidence plan.
- No Change packet for unapproved visual experimentation, no inferred approval from a source commit, and no silent promotion of speculative pages.

## Working artifacts and status discipline

Each future design slice should state: **question, constraints, candidate solutions, visual artifacts, failure modes, evidence, decision state, next review question**. Prefer working examples and side-by-side comparisons to unsupported adjective piles. Store accessible, reproducible mockups and screenshots in the proposal or evidence as appropriate, with source attribution and dates.

Until Gate 5, this program is **design work**. The [central work queue](../../../QUEUE.md) may correctly say `Current work: none`; the Change catalog itself does not select work. No agent, including Cursor, should infer implementation instructions from these files.

## Immediate next product-design conversation

Create the Phase 1 **experience architecture**, mapping first encounter, ongoing live play, meaningful waiting/return, and deep historical reading. Explicitly reconcile the existing proposed player-replay study rather than silently repackaging it as an already-approved Journal feature. Render and evaluate alternative visual compositions only after the experience model is coherent.
