# STORY03 | Deploy a distinct Storyteller Temporal executor and GA publication activity

**State:** Proposed after STORY02 (2026-11-19)  
**Kind:** implementation  
**Selection:** Not included in active Kubernetes batch; explicit approval required.  
**Design:** [D4 Storyteller handoff](../../../designs/open/distributed-turn-poc/D4-STORYTELLER-HANDOFF.md) · [D1 service choreography](../../../designs/open/distributed-turn-poc/D1-EXECUTION-CONTRACT.md) · [DISTURN](../../../designs/open/distributed-turn-poc/README.md)

## Outcome / prerequisites

**Outcome:** Deploy a distinct Storyteller Temporal executor and GA publication activity.  
**Preconditions:** STORY01 + STORY02 + DIST03 + DIST04 transport, working Temporal K8S06; coordinate DIST05 implementation (merge scopes if duplicate).

**Source observed on main 2026-11-19:** `packages/application/src/storyteller/runtime.ts::createStorytellerRuntime.complete` combines generation and publication; `execution.ts::createStorytellerExecution` reads/writes generation and attempt ledger and may call provider; `publication.ts::publishStorytellerResult` validates/canon-stages then locks/adopts game state; `packages/workflows/src/index.ts::storytellerV1` uses a single retryable `completeStoryteller` Activity; `apps/worker/src/activities/index.ts` still shares Storyteller and game collaborators. Durable funding/attempt and uncertainty schema already exists in `packages/db/src/schema/storyteller.ts`. Reinspect latest HEAD, active Cursor branches and test scripts before changing any file.

## Concrete scope / contract

Split current completeStoryteller activity by creating a separate storyteller-execute Task Queue worker with only task/read/result capabilities and a GA control-side publish activity. Introduce replay-safe named distributed workflow with stable workflow ID, generationId-only Temporal history and bounded explicit succeeded|held|failed|uncertain transition rules; no retry on uncertain provider dispatch. Keep existing storytellerV1 and its recorded histories compatible until cutover. Do not deploy two consumers of the same Task Queue with incompatible activity sets. Make model execution scaled independently from game admission/publication, with separate credentials and readiness. Exact resource/namespace env reviewed before writing Helm/kind manifests.

**Intended source and documentation owners:** apps/worker/src/{activities/index,runtime/index,bootstrap} or new apps/storyteller-worker; packages/workflows/src/{index,contracts}.ts; packages/application/src/storyteller/runtime.ts and GA publication entrypoint, infra/kubernetes lab overlays, tests and technical runbooks.

**Exclusions:** No direct arbitrary Storyteller writes to `story`/`campaign`/`story_passage`/`story_document_commit`; no separate invented attempt/charge ledger; no extra model round or automatically billed retry; no Cognee/Code Mode dependency; no image/Stripe/production HA; no fictional Economy subsystem.

## Acceptance and negative tests

With two executor Pods or fakes, replay workflow and restart worker; one output and one GA publication. Hold/uncertain never loops into a new paid request. Wrong queue/permissions fail. Existing historical workflow tests remain valid; separated executor has no broad game-write credential.

Required receipt: source SHA and diff, exact versioned request/task/result schema, stable IDs, credential/read scopes, retry/uncertain/resume state diagram, tests/run commands/actual results and negative cases, docs impact, proof tier (pure, local compose or real multi-Pod). Unit tests alone never establish Kubernetes operation. Scripted provider test never implies paid provider correctness.

## Parallel scheduling

Isolated standalone worker image/config can be prepared parallel with DIST04 broker tests, but shared worker runtime/workflows require serialization or a single coordinated merger. Cluster deployment and GA publication integration gated on predecessors.

Only disjoint Ready Changes may run concurrently in isolated worktrees under an owner-approved batch. Shared workflow files, ledger migrations, authentication, canonical doc headings and the kind cluster have one integration owner. No automatic successor selection.

## planned-impact.v1

| Plane | Expected result | Required evidence |
| --- | --- | --- |
| Product | unchanged; text-first D&D-like game, Storyteller DM plus mechanically authoritative engine | No new gameplay or unapproved agent role |
| Technical | Update exactly affected Storyteller/Temporal/game authority owners with proven process boundary | Disposition matrix, false-success/duplicate-send negatives |
| Code | Bounded API, activity and test implementation in named owners | Source tests; actual runtime evidence where requested |
| Related | Index, runbook, causal logging and STATUS only as evidenced | Link guards, Change reconciliation |

## Absorbed DIST05 cases (2026-11-19)

HK09 cancelled DIST05 as superseded. These checks were not already stated above. They are not implemented, and this packet stays Proposed. The superseded RabbitMQ-to-Temporal hop is not copied: a story wake stays a direct SQL outbox to Temporal.

- A fake-provider harness keeps the saved attempt and the saved proposal, isolates the Storyteller task queue, survives worker interruption, and refuses a stale canon root.
- The Storyteller process has no SQL permission to mutate mechanical state or the published root.
- A stale proposal does not publish.
- A crash after the provider response does not rerun the paid call.
- One exact proposal is published once despite workflow replay.
- No model call runs while the SQL lock is held.
- If generation or usage rows must be written, that write stays a narrow attempt-recording boundary and must not become broad game-write authority.
- This split must not be read as a historical fork from an older scene.

## Reconciliation ledger (fill before closure)

| Authority | Planned delta / no-op | Source SHA/diff | Positive / negative proof | Link/status |
| --- | --- | --- | --- | --- |
| Product | unchanged | Pending | Pending | Pending |
| Storyteller input + attempt custody | implement | Pending | Pending | Pending |
| Game Authority publication + canon | review or bounded update | Pending | Pending | Pending |
| Workflow / runtime / docs | versioned implementation | Pending | Pending | Pending |

Run `pnpm wiki:change-guard --mode plan` and `--mode close` where supported, repair inbound links and archive actual outcome. No unverified Done.
