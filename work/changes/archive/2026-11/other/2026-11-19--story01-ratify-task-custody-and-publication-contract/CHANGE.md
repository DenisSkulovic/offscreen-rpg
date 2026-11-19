# STORY01 | Ratify remote Storyteller task, attempt and publication ownership

**State:** Done
**Kind:** documentation
**Approval and owner:** Owner authorized this documentation Change on 2026-11-19. Executor: STORY01 worktree only. No other Change was started.
**Parent initiative:** [D4 Storyteller handoff](../../../../../designs/open/distributed-turn-poc/D4-STORYTELLER-HANDOFF.md) · [Execution reconciliation](../../../../../designs/open/distributed-turn-poc/EXECUTION-RECONCILIATION-2026-11-19.md)

## Cursor first-screen brief

> **Current-source map:** `packages/application/src/storyteller/runtime.ts`, `execution.ts`, `publication.ts`, `packages/workflows/src/index.ts`, `apps/worker/src/activities/index.ts`, `packages/db/src/schema/storyteller.ts`, inspected at `0ca9b822`.
> **Primary governing heading:** [Remote task custody](../../../../../../docs/technical/storyteller/generation-and-publication.md#remote-task-custody).
> **Known trap / contrary case:** `completeStoryteller` still generates and publishes in one activity. A second reading of that activity is not two operations. A scene-10 task does not publish on the scene-20 canon root.
> **Scope/permission:** Markdown only. No executable edit, no paid provider, no cluster lock.

## Outcome and motivation

A reader can now say who holds a remote Storyteller task, who may retry it, and who publishes. The engine admits the generation and publishes. The Storyteller proposes and does not commit the checkpoint or the canon root. The existing `storyteller_attempt` row is the attempt record. There is no second billing ledger and no extra model round. The future replay-safe workflow is the new named type `storytellerDistributedV1` with id `storyteller/${generationId}`. Recorded `storytellerV1` histories stay on the single `completeStoryteller` activity. That split is not implemented. The start remains the PostgreSQL outbox to a direct Temporal RPC. RabbitMQ carries post-commit business events. The story SSE stream stays off RabbitMQ.

## Authority and baseline

- **Product:** [What it must not do](../../../../../../docs/product/storyteller/behavior-and-quality.md#what-it-must-not-do). The player promise is unchanged.
- **Technical:** [Remote task custody](../../../../../../docs/technical/storyteller/generation-and-publication.md#remote-task-custody), [Custody of one task](../../../../../../docs/technical/storyteller/operation-and-controller.md#custody-of-one-task), [Selected compilation and tool contract](../../../../../../docs/technical/storyteller/prompts-and-tools.md#selected-compilation-and-tool-contract), [Budget accounting](../../../../../../docs/technical/storyteller/request-context-and-cost.md#budget-accounting), [Storyteller workflow identity](../../../../../../docs/technical/platform/execution-and-delivery.md#storyteller-workflow-identity), [Proposed service ownership](../../../../../../docs/technical/platform/topology.md#proposed-service-ownership).
- **Evidence / source:** baseline `0ca9b822cf6c11303d4e73f253ce1ed59258d028`. No source behavior changed.
- **Proposals / unknowns:** STORY02, STORY03, and STORY04 remain unselected. This packet does not implement the worker split.

## Exact scope and exclusions

- **Canonical document edits:** the headings named above. [Publication fence](../../../../../../docs/technical/platform/data-and-persistence.md#publication-fence) and [Profiled storyteller storage](../../../../../../docs/technical/platform/data-and-persistence.md#profiled-storyteller-storage) stay with their owner.
- **Executable source/tests/config:** unchanged because this is a documentation-only Change.
- **Related/inbound owners:** queue index and ledger index stay with the batch owner. Archive was not performed; see the handoff.
- **Preserve:** engine commits the checkpoint and the canon root; no Game Economy service; one packed task is injected current state, a short orientation, and one intention-level memory query; today's code does not assemble that pack or a remote worker.
- **Exclude:** executable code, tests, migrations, compose, Kubernetes, paid providers, a second billing ledger, an extra model round, and any other Change.

## Acceptance and discriminating negative proof

- **Normal:** the engine holds the generation and publishes. The Storyteller holds a proposal. `unsent` may dispatch the same request again. `reserved`, `dispatched`, and `uncertain` do not send again. `settled` reuses the saved result. A duplicate publication returns the stored row.
- **Negative:** the existing Temporal activity cannot be treated as two independent operations. A second delivery of the same operation does not create a second publication. A task for scene 10 does not publish against the scene-20 canon root.
- **Verification:** source inspection at `0ca9b822`, then `pnpm wiki:change-guard` plan and close, then `python3 scripts/check_docs.py`.
- **Human decision gate:** none for this contract. The split itself waits for a later implementation Change.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because the player promise stays a text-first D&D-like game and the Storyteller still must not commit mechanics. docs/product/storyteller/behavior-and-quality.md#what-it-must-not-do | none beyond that heading | owner authorization of this documentation Change |
| Technical | changed: docs/technical/storyteller/generation-and-publication.md#remote-task-custody, docs/technical/storyteller/operation-and-controller.md#custody-of-one-task, docs/technical/storyteller/prompts-and-tools.md#selected-compilation-and-tool-contract, docs/technical/storyteller/request-context-and-cost.md#budget-accounting, docs/technical/platform/execution-and-delivery.md#storyteller-workflow-identity, docs/technical/platform/topology.md#proposed-service-ownership, and the engine publishes. The future workflow type is storytellerDistributedV1. The split is unimplemented. | docs/technical/platform/data-and-persistence.md#publication-fence, docs/technical/platform/http-api-and-client-contracts.md#service-calls-are-not-player-routes | source inspection at 0ca9b822 |
| Code | unchanged because no executable modification is authorized. Negative: packages/application/src/storyteller/runtime.ts still generates and publishes inside one activity, so that activity cannot be treated as two operations. | packages/workflows/src/index.ts, apps/worker/src/activities/index.ts, packages/db/src/schema/storyteller.ts | inspected, no source diff |
| Related | unchanged because docs/technical/platform/data-and-persistence.md#publication-fence and docs/technical/platform/http-api-and-client-contracts.md#service-calls-are-not-player-routes keep their current sentences, and the queue index stays with the batch owner. | those two headings | left for their owners |

## Handoff and next action

- The contract is recorded. The orchestrator archived this packet and retargeted the queue and gap-register links.
- No automatic selection of STORY02 or STORY03.

## Reconciliation ledger (required before Done)

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/technical/storyteller/generation-and-publication.md#remote-task-custody | technical | changed: the engine holds the generation and publishes; the attempt row is the only charge record; the combined activity is still one operation | no source behavior changed; packages/application/src/storyteller/runtime.ts and packages/application/src/storyteller/publication.ts at 0ca9b822 | source-observed | A second delivery does not publish again, and a scene-10 capture does not publish on the scene-20 root | same-page link from the publication refusal heading |
| docs/technical/storyteller/operation-and-controller.md#custody-of-one-task | technical | changed: modules stay modules; storytellerV1 still calls one activity that may generate and then publish | no source behavior changed; packages/workflows/src/index.ts at 0ca9b822 | source-observed | Reading the activity twice does not make generation and publication independent | link to the custody heading above |
| docs/technical/storyteller/prompts-and-tools.md#selected-compilation-and-tool-contract | technical | changed: the pack is what a future remote worker would receive, and today's code still does not assemble that worker | no source behavior changed; packages/application/src/storyteller/runtime.ts at 0ca9b822 | source-observed | The pack does not grant a second model round or a publication write | link to remote task custody |
| docs/technical/storyteller/request-context-and-cost.md#budget-accounting | technical | changed: storyteller_attempt is named as the attempt record, with no second billing ledger | no source behavior changed; packages/db/src/schema/storyteller.ts at 0ca9b822 | source-observed | A retry after a possible paid send does not open another charge | link to remote task custody |
| docs/technical/platform/execution-and-delivery.md#storyteller-workflow-identity | technical | changed: the future identity is the new workflow storytellerDistributedV1 with id storyteller/generationId; current storytellerV1 stays one activity; the outbox starts it by a direct Temporal RPC | no source behavior changed; apps/worker/src/activities/index.ts and packages/workflows/src/index.ts at 0ca9b822 | source-observed | RabbitMQ does not start the workflow, and a duplicate delivery does not create a second publication | new heading linked from the command table and the retry heading |
| docs/technical/platform/execution-and-delivery.md#commands-business-events-and-workflows | technical | changed: one sentence names the Storyteller start as that outbox RPC and leaves the story SSE stream off RabbitMQ | no source behavior changed; apps/worker/src/outbox/dispatch.ts at 0ca9b822 | source-observed | A broker message is not the Storyteller starter | link to the workflow identity heading |
| docs/technical/platform/topology.md#proposed-service-ownership | technical | changed: one sentence in the existing owner paragraph says the engine publishes, the remote worker is unassembled, and the outbox starts the workflow | no source behavior changed | source-observed | The Storyteller row still does not commit the checkpoint or the canon root | link to the workflow identity heading |
| docs/product/storyteller/behavior-and-quality.md#what-it-must-not-do | product | unchanged: the product rule that the Storyteller must not commit mechanics is already the player promise, and this Change adds no gameplay rule | no source behavior changed | reviewed | A proposal still cannot transfer an item, roll a die, or move the clock | no product edit |
| docs/technical/platform/data-and-persistence.md#publication-fence | technical | unchanged: the checkpoint fence and the scene-10 versus scene-20 negative already live on that heading, and this Change leaves the file for its owner | no source behavior changed | reviewed | A scene-10 fork still must not inherit the scene-20 root; this packet does not rewrite that inventory | left unchanged for the data owner |
| docs/technical/platform/data-and-persistence.md#profiled-storyteller-storage | technical | unchanged: funding, run, and attempt rows are already named there, and this Change adds no second ledger | no source behavior changed; packages/db/src/schema/storyteller.ts at 0ca9b822 | source-observed | An uncertain reservation still survives on the existing attempt row | left unchanged for the data owner |
| docs/technical/platform/data-and-persistence.md#proposed-service-schemas-and-delivery-records | technical | unchanged: the co-change with delivery classes still says a replay returns the stored result, and this Change does not edit that heading | no source behavior changed | reviewed | Redelivery still does not mint a second command | left unchanged for the data owner |
| docs/technical/platform/http-api-and-client-contracts.md#service-calls-are-not-player-routes | technical | unchanged: direct HTTP, a broker event, and a Temporal workflow stay different transports, and this Change does not edit that heading | no source behavior changed | reviewed | A broker message still cannot become a player route or the story SSE stream | no edit |
| packages/application/src/storyteller/runtime.ts | evidence | unchanged: createStorytellerRuntime.complete still executes and then publishes in one call | no source behavior changed; inspected at 0ca9b822 | source-observed | The activity cannot be treated as two independent operations | no code edit |

## Checks

- `node scripts/repo-tools/wiki-change-guard.mjs --mode plan --change work/changes/open/2026-11-19--story01-ratify-task-custody-and-publication-contract` passed with no findings.
- `node scripts/repo-tools/wiki-change-guard.mjs --mode close --change work/changes/open/2026-11-19--story01-ratify-task-custody-and-publication-contract --base 0ca9b822cf6c11303d4e73f253ce1ed59258d028` passed. Citation warnings only. No error.
- `python3 scripts/check_docs.py` reported 13 pre-existing problems. None are in the files this Change edited. `ROADMAP.md` still points at `#the-d-d-foundation`. The design notes under `work/designs/open/distributed-turn-poc/` still use a short relative link that was already present at `0ca9b822`.
- No paid provider call. No cluster command.
