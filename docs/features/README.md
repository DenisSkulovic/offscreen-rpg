# Active features

Significant changes use one folder containing FEATURE.md (agreed intent) and PLAN.md (phases and current checkpoint). Follow the [feature workflow](../../.agents/skills/feature-workflow/SKILL.md).

Maintain links to active feature folders here. Remove finished entries after useful content has been integrated into the permanent product and technical docs. This is not a backlog of brainstorming or a release history.

## Coding route

Implementation is active under the owner's instruction. Follow this route one coherent slice at a time and commit/push before the next. Do not launch another agent, enable providers or broaden into unrelated unfinished features.

Read [progress](../progress.md), the [gold session](../technical/playthroughs/harbor-session.md) and [solo integration contract](../technical/solo-gameplay-contract.md), then only the current phase's file map. These capture the product/architecture decisions a coding model must not reinvent.

Current prepared work: read [concepts](../concepts.md) and the [bounded-cost contract](../technical/context-and-cost.md#bounded-work-not-an-open-ended-agent). Start [bounded-cost B1](2026-09-19--19-08--bounded-storyteller-cost/PLAN.md), then B2 shared enforcement. [Canonical storage and creative bundles](2026-09-19--18-49--canonical-campaign-storage/PLAN.md) C1/C2 remains independently ready, followed by [memory/exploration](2026-09-18--20-09--storyteller-memory-and-recall/PLAN.md). Memory Phase 3 cannot precede B1/B2; cost B3 integrates with memory rather than creating a second runner. These are implementation features, not another proposal-review gate. Runtime is unchanged by this preparation; the harbor/return flow remains the acceptance anchor.

| Feature | Phases | Ownership |
| --- | --- | --- |
| [Bounded Storyteller effort and cost](2026-09-19--19-08--bounded-storyteller-cost/FEATURE.md) | B1 recipes/preflight → B2 durable envelope → B3 memory integration → B4 cost-quality evidence | Cumulative work/spending, small task-specific context/tools, safe stop/defer behavior |
| [Canonical campaign storage](2026-09-19--18-49--canonical-campaign-storage/FEATURE.md) | C1 store/admission → C2 source ownership → C3 creative bundles → C4 inspection/recovery | Immutable files, publication roots, exact source references, export |
| [Storyteller memory and exploration](2026-09-18--20-09--storyteller-memory-and-recall/FEATURE.md) | 1 context/provenance → 2 memory documents → 3 exploration → 4 return rehearsal; 5 local hybrid search once the corpus exists | Extraction, summaries, discovery and evidence-grounded turns |

No chapters, chapter navigation or chapter-bound generation. A scene may span many Storyteller turns; a memory segment is only a bounded source range.

| Order | Exact slice | Deliverable / boundary |
| --- | --- | --- |
| 1 | [Activity A1](2026-09-18--16-48--activity-processes-and-progress/PLAN.md#1--stable-identity-and-correct-clock-nearest-implementation-phase) — implemented | Exact-instance resume, campaign clock and pending completion are implemented; full real BC-04 integration/browser evidence remains for the connected slice |
| 2 | [Situations S1](2026-09-19--13-49--storyteller-authored-situations/PLAN.md#s1--current-situation-authority-and-scene-only-pacing) — implemented | Explicit authored choices/activity access per scene; no inventory-derived or inherited menu |
| 3 | [Activity A2](2026-09-18--16-48--activity-processes-and-progress/PLAN.md#2--quiet-routines-and-selective-scenes) — implemented | Genuine wait alongside contribution; common typed boundary, no fake work points |
| 4 | [Situations S2](2026-09-19--13-49--storyteller-authored-situations/PLAN.md#s2--dormant-reuse-and-revalidation) + [Autonomy U2a](2026-09-19--00-26--bounded-autonomy-and-reentry/PLAN.md#u2a--quiet-settlement-and-factual-continuation) — implemented | Quiet handoff, independent finite repeat and boundary revalidation |
| 5 | [Activity A2b](2026-09-18--16-48--activity-processes-and-progress/PLAN.md#2b--durable-activity-history-and-correlated-diagnostics-next-observability-slice) — implemented core | Player-safe lifecycle ledger/history and structured correlated runtime diagnostics; deterministic Chamber controls remain QA work |
| 6 | [Autonomy U2b](2026-09-19--00-26--bounded-autonomy-and-reentry/PLAN.md#u2b--historical-reports-and-controlling-scenes) — implemented core | Optional source-bound report versus controlling scene, including late publication and failure semantics; deterministic Chamber controls remain |
| 7 | [Situations S3](2026-09-19--13-49--storyteller-authored-situations/PLAN.md#s3--bounded-preparation-and-explicit-handoff) — implemented core | Typed retained-work context and exact return-to-work proposal, with normal publication revalidation; broader authored definitions remain later work |
| 8 | [Autonomy U2c](2026-09-19--00-26--bounded-autonomy-and-reentry/PLAN.md#u2c--finite-accepted-chains) — bounded linear slice implemented | Two-to-six-entry player-accepted sequence with one successor owner, pending cancellation, tick horizon and explicit scene re-entry |
| 9 | [Earned-loop integration](2026-09-19--00-26--earned-time-playable-loop/PLAN.md) + bounded [agency](2026-09-19--00-26--storyteller-agency-and-taste/PLAN.md)/[return](2026-09-19--00-26--inhabitable-play-and-return/PLAN.md) work | Real gold-session path, changed failure choices and legible return/recovery; minimal UI changes, then owner review |

Do not run all feature plans end-to-end in their directory order. The activity foundation's broad cooperation/loss/traversal phases and autonomy's fallback phases come **after** this connected proof. General premise setup, rich trace UI and live evaluation remain separate gates. Canonical documents and a bounded memory return now belong in the prepared POC scope; larger longevity experiments extend that same path. A short scripted POC does not complete or replace those ambitions.

Stop for a material product/cost change or an unresolved authority boundary. Routine implementation details within the selected phase do not need repeated approval once the owner starts coding. Checks are optional under repository policy; distinguish source review, executed offline behavior and owner taste. No passing test can authorize provider spend.

- [Chamber laboratory](2026-09-18--01-23--chamber-laboratory/FEATURE.md) — evolve the scripted chamber into the controlled development laboratory.

## Current design priority

1. [Activities, participation and world-defined progress](2026-09-18--16-48--activity-processes-and-progress/FEATURE.md) — owns work/rules/clock; A1 and A2 are the bounded foundation slices above, not the entire broad participation design.
2. [Storyteller-authored situations and reusable choices](2026-09-19--13-49--storyteller-authored-situations/FEATURE.md) — S1, bounded solo S2 and S3's core exact handoff are complete: per-situation authorship, quiet reusable choices, finite story-scoped repetition, boundary blocking and Storyteller-selected exact retained resumes now work. Broader prepared-definition generation remains later S3 work. This is an authority layer, not a second engine/queue.
3. [Multiple suspended commitments](2026-09-19--02-24--multiple-suspended-commitments/FEATURE.md) — partial implementation; remaining work follows activity A1 and later lifecycle/capacity phases, not a competing coding route. Do not delete it as complete.

## Experience-first POC recalibration

The following are active ownership areas, not a second execution order. They convert the product vision into observable play and prevent structural correctness from being mistaken for a satisfying game. The readiness route above defines what to code after the owner's switch/continuation.

Experience owners:

1. [Storyteller agency and taste](2026-09-19--00-26--storyteller-agency-and-taste/FEATURE.md) — replace the generic assess loop with state-responsive, genre-aware, human-reviewed turns and explicit anti-slop acceptance.
2. [Earned-time playable loop](2026-09-19--00-26--earned-time-playable-loop/FEATURE.md) — connect one real-time commitment, interruption, immediate D&D consequence, resumption/completion and earned result. It consumes only the minimal approved subset of the existing activity-process proposal.
3. [Bounded autonomy and re-entry](2026-09-19--00-26--bounded-autonomy-and-reentry/FEATURE.md) — owns follow-up intents, quiet settlement, historical reports, controlling scenes and accepted chains; later phases add delegated fallbacks and attributed return recaps. It consumes activity rule boundaries and authored situation permission rather than owning either.
4. [Inhabitable play and return](2026-09-19--00-26--inhabitable-play-and-return/FEATURE.md) — make the current scene, ongoing life, return recap and recovery states feel like a game rather than an inspector.
5. [Premise to playable campaign](2026-09-19--00-26--premise-to-playable-campaign/FEATURE.md) — after the play contracts are convincing, replace developer-authored mechanical seeds with reviewed setup proposals for radically different premises.

The [gold session](../technical/playthroughs/harbor-session.md) supplies the mixed-rhythm flow; the solo contract selects a first hold-on-interaction policy. Owner taste and later player-owned creation decisions remain explicit gates. The canonical-file feature uses that short/earned loop plus a return scene to demonstrate a remembering Storyteller; its document infrastructure must serve a visible gameplay result.

## POC evaluation sequence

These features turn the intended player experience into reproducible evidence before meaningful provider credit is spent.

The manual-first [QA journey system](../engineering/qa-journeys.md) is implemented. A person or coding agent performs its stages, records observations and inspects evidence; automated driving is optional.

1. [Storyteller trace explorer](2026-09-18--17-27--storyteller-trace-explorer/FEATURE.md) — correlated task, model, tool, validation, accounting, publication and state-change inspection in the Chamber.
2. [Conservative live-model evaluation](2026-09-18--17-27--conservative-live-model-evaluation/FEATURE.md) — dry-run-first OpenRouter gates with explicit caps, stop rules and evidence reports. Design does not authorize live calls.

## Supporting mechanical architecture and customization

The immediate DM loop is paused at an experience-review boundary. Its safety/authority spine remains useful, but generic three-round persistence is not sufficient acceptance. Checks remain optional, and no live spending is authorized.

1. [Playable DM adjudication loop](2026-09-18--17-21--playable-dm-adjudication-loop/FEATURE.md) — implemented authority spine awaiting meaningful-agency and runtime acceptance.
2. [Editable storyteller settings](2026-09-18--14-49--editable-storyteller-settings/FEATURE.md) — revisions, custom tags/guidance, private presets and creation locks.
3. [Activity foundation](2026-09-18--16-48--activity-processes-and-progress/FEATURE.md) — current design priority above; its existing folder now owns the broader activity/participation proposal.
4. [Storyteller memory and situated recall](2026-09-18--20-09--storyteller-memory-and-recall/FEATURE.md) — prepared implementation: source-bounded memories, context selection, admitted updates, exploration and searchable sources. Depends on [canonical storage](2026-09-19--18-49--canonical-campaign-storage/FEATURE.md), which separately owns file persistence and creative bundles.

Each folder contains a PLAN.md with bounded phases and a current handoff checkpoint. Product ownership: [game rules](../game-rules.md) and [storyteller settings](../storyteller-settings.md).
