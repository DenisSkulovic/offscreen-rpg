# Documentation map

**Layers (absolute):** [**Product bible**](product/README.md) → [technical contracts](technical/README.md) → [decisions](decisions/README.md) / [runbooks](runbooks/README.md) → [execution Changes](../work/changes/README.md). Code is an artifact of product and technical documentation.

**DOC01:** subject owners under `product/{gameplay,experience,storyteller,admin}` and `technical/{platform,engine,storyteller,client,admin,observability,lab}`. Temporary work/evidence/research at repo root. Soft-retired program/engineering/history snapshot: [doc01-legacy-snapshot](../evidence/inspections/doc01-legacy-snapshot/MANIFEST.md).

**For a coding agent given an approved Change:** skip this broad index. Read the **one Change's first-screen brief**, follow its linked source-adjacent owner map and inspect only the named symbols. Deep product/technical docs below are **on demand**.

**For unscoped questions:** start with the [one-page overview](../README.md), [current priority](../TODO.md) or [progress](progress.md), **not all three**. Consult [minutes](../work/sessions/README.md) only when a past decision matters. This is a routing map, not a reading list.

## Choose the level of detail

| Level | Owner | What you should learn before going deeper |
| --- | --- | --- |
| Product bible | [**Product index**](product/README.md) → [vision](product/foundations/vision.md), [concepts](product/foundations/concepts.md) | Why the game exists and what the nouns mean; intent is not proof of implementation |
| Current state | [Progress](progress.md) | What exists, evidence, gaps, next outcome |
| Discussion continuity | [Session notes](../work/sessions/README.md) · [legacy minutes](../work/sessions/README.md) | Owner intent across chats; history, not authority |
| Technical contract | [Technical owner index](technical/README.md) | Authority, transitions, failure/retry |
| Engine understanding | [Engine model](../evidence/inspections/doc01-legacy-snapshot/engineering/engine-model.md) | How pieces cooperate today |
| Execution route | [Change queue](../work/changes/README.md) (`open/` + `archive/`) | One code-bearing outcome or empty queue |
| Design programs | [Programs index](../evidence/inspections/doc01-legacy-snapshot/programs/README.md) | UX / Admin / Engine / Storyteller / Observability |
| Player UX program | [Experience design](../docs/product/experience/principles.md) | Replacement UX destination; human validation separate |
| Engine design program | [Engine architecture](../docs/technical/engine/authority-and-transitions.md) | Product-derived engine target and ENG packets |
| Storyteller design program | [Storyteller renewal](../docs/product/storyteller/behavior-and-quality.md) | Adaptive agent destination; SA packets |
| Forensic program | [Observability](../docs/technical/observability/identities-and-evidence.md) | Provenance, Support investigation, replay design |
| Admin program | [Admin](../evidence/inspections/admin-program-essays-2026-11/README.md) | Staff control plane; AD Done; production grants absent |
| Implemented flow | [Engineering](../research/engineering-manuals.md) → [code navigation](../evidence/inspections/doc01-legacy-snapshot/engineering/code-navigation.md) | Source entry points and limits |
| History / legacy initiatives | [History](../evidence/inspections/doc01-legacy-snapshot/history/README.md) → [initiatives](../evidence/inspections/doc01-legacy-snapshot/history/initiatives/README.md) · [minutes](../work/sessions/README.md) | Sept 2026 dossiers + session logs; **not** a Change queue |
| Operations | [Runbooks](runbooks/README.md) · [Development](../docs/runbooks/local-development.md) (stub) | Local runbook |
| Evidence | [evidence/](../evidence/README.md) · [Connected proof](../research/legacy-engineering/connected-poc-proof.md) | What was exercised, on which date |

Technical specifications can include unbuilt design. When product, technical, and source disagree, inspect the narrow boundary and fix the owning claim. An old run is not proof of today's complete product.

## Choose the dimension

| Question | Product / vocabulary | Technical owner | Implementation or evidence route |
| --- | --- | --- | --- |
| How do I create, play and return? | [Player experience](product/journeys/player-experience.md), [creation](product/journeys/story-creation.md) | [Story lifecycle](technical/story-lifecycle.md) | [Application: opening and Start](../packages/application/README.md#opening-and-start), [code map](../evidence/inspections/doc01-legacy-snapshot/engineering/code-navigation.md) |
| Who decides outcomes? | [Game rules](product/foundations/game-rules.md), [gameplay](product/foundations/gameplay.md) | [Rules and activities](technical/rules-and-activities.md) | [Application: selection and consequence](../packages/application/README.md#mechanical-selection-and-consequence) |
| What happens while I'm away? | [Time and autonomy](product/journeys/time-and-autonomy.md) | [Committed time](technical/committed-time.md), [calendars](technical/calendars-and-world-time.md) | [Application: transition boundary](../packages/application/README.md#campaign-transition-boundary) |
| What shapes the story? | [Storytelling](product/storytelling/storytelling.md), [settings](product/storytelling/storyteller-settings.md) | [Storyteller runtime](technical/storyteller-runtime.md) | [Storyteller guide](../packages/storyteller/README.md), [tuning](../.agents/rules/storyteller.md) + [manual](../evidence/inspections/doc01-legacy-snapshot/engineering/storyteller-tuning.md) |
| How does it remember? | [Continuity](product/storytelling/continuity-and-consequences.md) | [Canonical files](technical/canonical-files.md), [memory research](../evidence/inspections/doc01-legacy-snapshot/engineering/long-story-memory-and-retrieval.md) | [Documents guide](../packages/documents/README.md) |
| What reaches the model and what does it cost? | [Concepts](product/foundations/concepts.md) | [Context/cost](technical/context-and-cost.md), [usage policy](technical/usage-policy.md) | [Spending rule](../.agents/rules/spending.md) |
| What survives failure or duplicate work? | [Continuity](product/storytelling/continuity-and-consequences.md) | [Execution](technical/execution.md), [provider dispatch](technical/provider-dispatch-review.md) | [Application recovery](../packages/application/README.md#execution-failure-and-retry) |
| What owns storage, access and presentation? | [Player experience](product/journeys/player-experience.md) | [Data](technical/data.md), [architecture](technical/architecture.md) | [Code map](../evidence/inspections/doc01-legacy-snapshot/engineering/code-navigation.md) |
| Did it actually work? | [Benchmark stories](product/journeys/playthroughs.md) | [Execution atlas](technical/playthroughs/README.md) | [Live POC proof](../research/legacy-engineering/connected-poc-proof.md), [QA](../evidence/inspections/doc01-legacy-snapshot/engineering/qa-journeys.md) |
| How do I run or maintain it? | [Progress](progress.md) | [Development](../docs/runbooks/local-development.md), [code quality](../evidence/inspections/doc01-legacy-snapshot/engineering/code-quality.md) | [Agent rules](../.agents/README.md), [verification](../.agents/rules/verification.md) |
| Chamber / rare mechanics lab? | [Chamber target](../evidence/inspections/doc01-legacy-snapshot/engineering/targets/chamber-laboratory.md) | [Protocol](technical/chamber-lab-protocol.md) | [Chamber program](../evidence/inspections/doc01-legacy-snapshot/engineering/chamber-program.md) |
| React/Next destination? | [Portfolio roadmap](../TODO.md) | [React/Next F1–F15](../evidence/inspections/doc01-legacy-snapshot/engineering/targets/react-next.md) | [Change queue](../work/changes/README.md) |
| Staff Admin at scale? | [Admin](../evidence/inspections/admin-program-essays-2026-11/README.md) | [Admin technical](../evidence/inspections/doc01-legacy-snapshot/programs/admin/technical/README.md) | [Changes](../work/changes/README.md); Support grants still governance-gated |
| What is still undecided? | [Open questions](questions.md) | Relevant contract's proposed boundary | [Changes](../work/changes/README.md); legacy disposition in [initiatives audit](../work/designs/open/legacy-initiatives-index/AUDIT-2026-11-11.md) |

## Read with a question, stop with an answer

Before opening source, identify the behavior, its authority and the evidence needed. Once you can name the entry point, owning operation, output and unresolved issue, follow only that path. Preserve discoveries at the nearest owner. The [maintenance rule](../.agents/rules/documentation.md) defines when to update those layers.
