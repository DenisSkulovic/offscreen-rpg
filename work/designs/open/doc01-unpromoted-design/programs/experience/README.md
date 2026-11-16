# Offscreen RPG | player-experience destination

**Status (reconciled 2026-11-15):** experience **target** remains authoritative for design intent; **UX01–UX12, PX01–PX07, PF01–PF05 Done** in `apps/web` (portfolio / fixture proof). **Human UX comprehension is not claimed validated.** New UI work only via [work/changes/README.md](../../../work/changes/README.md).

This folder is a **replacement product-experience specification**, not a transcription of every current screen. Landed UX/PX/PF packets are evidence of implementation; they do not freeze design forever or prove fun.

**Mechanics (GM):** [GM01/02/04/05/06 Done](./mechanics-evolution-program.md); **GM03/GM07 remain Proposed** (conditional). GM06 visit checkpoint: [decision](./decisions/gm06-viewer-open-baseline-v1.md) + [evidence](../../../../../../evidence/inspections/doc01-retained-observations/programs/experience/evidence/gm06-visit-checkpoint-2026-11-15.md). Live Play still may omit full presentation projection ([PW01](../../../work/changes/archive/2026-11/other/2026-11-13--live-scene-presentation-wire/CHANGE.md) status in changes queue).

**Replay product (observability):** [Story Replay V1](../observability/player-replay-experience-v1.md) remains **proposed** — not a finished player feature.

## Start with a question, not the whole folder

| Question | Read |
| --- | --- |
| How does the **whole platform** work before, between and after stories, including visitors, account/usage and the owner? | **[Platform ecosystem](./platform-ecosystem.md)** → [visitor/player/operator journeys and states](./platform-journeys-and-states.md) (proposed umbrella design, not code authorization) |
| What should the public landing, the first interactive preview and the authenticated **Your stories** home actually be? | **[Public portal](./spaces/public-portal-blueprint.md)** → [preview-to-play journey](./flows/preview-to-play.md) → [player home](./spaces/player-home-blueprint.md) → [PF01–PF05 program](./platform-entry-implementation-program.md) |
| What is the experience and what must never be compromised? | [Experience thesis](./foundations/experience-thesis.md), [living-world contract](./foundations/living-world-contract.md), [original vision reconciliation](./foundations/vision-reconciliation.md), [mechanics reassessment](./foundations/mechanics-reassessment.md), [Storyteller quality](./foundations/storyteller-experience-quality.md) |
| Which interaction model won, what lost, and which mechanics are challenged? | [Decisions](./foundations/design-decisions.md), [layout experiments](./foundations/composition-experiments.md), [temporal philosophy](./foundations/temporal-philosophy.md), [independent critique](../../../../../../evidence/inspections/doc01-retained-observations/programs/experience/evidence/independent-challenge.md) |
| Which spaces exist, and how does a player move between them? | [Spaces and navigation](./spaces/information-architecture.md), [Stories](./spaces/stories-library.md), [Journal/World/You](./spaces/journal-world-you.md) |
| What exactly does choosing or authoring an intention mean? | [Interaction grammar](./patterns/interaction-grammar.md), [choice-surface rules](./patterns/choice-surface-decision-rules.md), [attention/state contract](./patterns/state-and-attention.md), [future custom-intent study](./patterns/free-intent-future.md), [future decision delegation](./patterns/decision-delegation.md) |
| What should someone see in scene, wait, interruption and re-entry? | **[Selected Living Stage blueprint](./spaces/living-stage-blueprint.md)** and [Now state reference](./spaces/now.md) |
| How do fictional time and real waiting remain honest? | [Time truth](./patterns/time-and-truth.md), [absence policies](./patterns/autonomy-and-absence.md), [offscreen handoff](./flows/offscreen-handoff.md), [ten-hour journey](./flows/ten-hour-journey.md) |
| How should the first visit and story creation work? | [Creation experience](./flows/creation-and-first-run.md), [portfolio first contact](./flows/portfolio-first-contact.md), [settings](./flows/settings-and-controls.md), [original demo script](./prototypes/public-demo-script.md) |
| How should long lives and return visits work? | [Return, journal and continuity](./flows/return-and-memory.md), [notifications](./flows/notifications-and-reentry.md), [future shared stories](./flows/shared-story-collaboration.md), [critical journeys](./flows/key-journeys.md) |
| What is the UI system made from? | [Component strategy](./system/component-strategy.md), [motion](./system/motion.md), [accessibility](./system/accessibility-and-voice.md), [player-language copy](./system/interaction-copy.md) |
| How can a future engine restyle scenes, illustrations and individual options without rewriting React? | **[Presentation runtime](./system/presentation-runtime.md)** → [V1 language](./system/presentation-language.md) → [media/motion](./system/presentation-media-and-motion.md) → [PX01–PX04 frontend-only program](./presentation-implementation-program.md) |
| Why these decisions, which references are worth learning from? | [Game case studies](../../../../../../evidence/inspections/doc01-retained-observations/programs/experience/evidence/comparative-game-research.md), [reference index](../../../../../../evidence/inspections/doc01-retained-observations/programs/experience/evidence/reference-review.md), [current UI source critique](../../../../../../evidence/inspections/doc01-retained-observations/programs/experience/evidence/current-ui-source-audit.md), [public projection capability map](../../../../../../evidence/inspections/doc01-retained-observations/programs/experience/evidence/public-projection-capability-map.md) |
| How do we prove the design actually works for humans? | [Experience acceptance plan](../../../../../../evidence/inspections/doc01-retained-observations/programs/experience/evidence/validation-plan.md), [Chamber ↔ UX evidence map](../../../../../../evidence/inspections/doc01-retained-observations/programs/experience/evidence/chamber-ux-validation-bridge.md), [key journeys](./flows/key-journeys.md) |
| What would Cursor implement, and in what order? | [UX implementation program](./implementation-program.md) or [future gameplay mechanics program](./mechanics-evolution-program.md), then **one** proposed `docs/changes` packet |

The design map above points to the documents already authored in this branch; proposed code packets are indexed by the [implementation program](./implementation-program.md). None is implementation permission. A target is authoritative for *design intent* only after owner review; it never supersedes actual game rule or security authority by implication.

## Non-negotiable project boundaries

Read [product vision](../../product/foundations/vision.md) and [domain vocabulary](../../product/foundations/concepts.md) for original promise and semantics. Current rule/time and provider commitments remain documented in [time and autonomy](../../product/journeys/time-and-autonomy.md), [game rules](../../product/foundations/game-rules.md), [client authority](../../technical/client-and-identity.md) and [story lifecycle](../../technical/story-lifecycle.md). This design raises disagreements explicitly, particularly **bounded free-form player intentions**, rather than silently overriding contracts. Existing [React/Next engineering target](../../../../../../evidence/inspections/doc01-retained-observations/engineering/targets/react-next.md) remains the technology baseline.

- The character may be a person, microbe, distributed mind or something stranger. No mandatory body sheet, inventory, currency, map or tavern.
- No chapter model or compulsory plot structure. Scenes can continue through many choices; quiet periods are meaningful.
- A player chooses intentions, not guaranteed outcomes. The rules engine, not the UI or model prose, decides committed consequences.
- Fictional time advances only through accepted commitments, not merely because the browser is open or closed.
- A timed process may be interrupted; a result is not earned at its start. Never animate a false success.
- Provider spending, generation outcomes and technical recovery need honest states and explicit consent where required.
- This is also a portfolio. The public demonstration must communicate the unique promise quickly **without lying about simulated vs durable behavior**.

## Workflow / source-of-truth rule

1. Design here; criticize it against realistic stories and unfamiliar players.
2. Resolve product-contract changes with an explicit decision and, where necessary, a new rule design. Visual work cannot secretly change game authority.
3. Author a narrowly bounded **code-bearing** Change in `work/changes/`, status **Proposed**. No change is active by default.
4. Owner authorizes one implementation slice; Cursor implements it on current source, with fixtures and measured browser evidence.
5. Return screenshots, recordings or test evidence for a design review. A passing test or approved Markdown is **not** proof of compelling UX.

**Working convention:** each design file distinguishes **Target** (intended end state), **Future/conditional** (needs mechanics or data not implemented), **Explicitly omitted**, and **Failure/negative cases**. Preserve user-observable promises rather than pixel shapes or today's route names.

