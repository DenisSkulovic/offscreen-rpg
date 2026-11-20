# STORY03 | Deploy a distinct Storyteller Temporal executor and GA publication activity

**2026-11-20 source audit correction (HEAD `3992437`):** The two-stage workflow, control/executor queues, GA control-only publication endpoint and custody client now **exist in source**; the older `State: Proposed after STORY02` paragraph is a historical planning label, not proof that no code landed. However, `storyteller-distributed-control.ts` still performs direct DB adoption/publication, and multiple Storyteller notice creators still hardcode legacy topics. The in-process/manual-start tests do not establish a complete first campaign. [T07 control publication ownership, T08 selector consistency, T09 real-process trace](TASKS.md#2026-11-20-current-head-convergence-addendum--source-backed-not-yet-executed) are finite next tasks; [campaign integration program](../../../designs/open/first-campaign-readiness-2026-11-20/README.md). **No tests run by ChatGPT in this planning commit; Change not Done; provider remains disabled.**


**Composer microtask entry (2026-11-20):** [TASKS.md](TASKS.md) contains bounded subagent assignments and exact failure/stop tests; [all-open audit](../../COMPOSER-QUEUE-AUDIT-2026-11-20.md) reconciles dependencies and program order. **Default Cursor parent and child: Composer 2.5 Standard.** This packet's delegation: versioned workflow + saved-attempt CAS and GA publication, scripted only. Existing state, owner selection and spend/cluster gates remain authoritative; no automatic Grok escalation or broad child research. A prepared task is not a passing proof.

**State:** Proposed after STORY02 (2026-11-19)  
**Kind:** implementation  
**Selection:** Not included in active Kubernetes batch; explicit approval required.  
**Design:** [D4 Storyteller handoff](../../../designs/open/distributed-turn-poc/D4-STORYTELLER-HANDOFF.md) · [D1 service choreography](../../../designs/open/distributed-turn-poc/D1-EXECUTION-CONTRACT.md) · [DISTURN](../../../designs/open/distributed-turn-poc/README.md)

**Packet profile:** `STATE` (planner-inspected `584b594`). Start with this route card. [SOURCE-MAP.md](SOURCE-MAP.md) traces the existing executable call chain, [EXECUTION.md](EXECUTION.md) settles the versioned queue/authority/transaction design, and [PROOF.md](PROOF.md) lists failure checks. Cursor reads only relevant deep sections. These are **plans, not proof**; the packet stays Proposed and unselected.\n\n**Critical bridge:** `saveValidatedResult` currently writes `storyteller_attempt.attribution.custody`, not succeeded `generation.output`; `publishStorytellerResult` needs the latter. The GA-owned idempotent promote-and-publish step is mandatory.\n\n## Outcome / prerequisites

**Outcome:** Deploy a distinct Storyteller Temporal executor and GA publication activity.  
**Preconditions:** merged STORY01 and K8S06, completed STORY02 *private* facade, established DIST03 GA service boundary and BOOT03 coordination. **DIST05 is cancelled into this packet. DIST04 is an optional postcommit Rabbit consumer, not Storyteller transport or a prerequisite.** Follow the ratified direct SQL outbox→Temporal wake.

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

## T06 evidence | PARTIAL VERIFY (`ec73a535`, 2026-11-20)

**Task:** [TASKS.md#t06--saved-result-crash--real-integration-handoff--partial-verify-ec73a535](TASKS.md). **Depth:** VERIFY slice only. **Change state:** Proposed/unselected — **not Done**. **Live gate:** `STORYTELLER_LIVE_ENABLED=false`. No paid provider send claimed.

**Decomposed suites (all PASS at recorded HEAD):**

| Suite scope | Result |
| --- | --- |
| `@offscreen/application` story03-focused suites | **7/7** |
| `@offscreen/worker` distributed + unit | **10/10** |
| `@offscreen/workflows` contract | **4/4** |
| GA publish unit | **6/6** |
| GA custody persistence | **3/3** |
| `tools/api-integration` `pnpm test:story03-t06:worker-replay` (`DATABASE_TEST_URL=offscreen_auth_test`) | **2/2 PASS** (~19s) |
| `tools/api-integration` `pnpm test:story03-t06:activity-settlement` (`STORYTELLER_LIVE_ENABLED=false`, `DATABASE_TEST_URL=offscreen_auth_test`; after `pnpm build`) | **4/4 PASS** |

**Worker-replay integration (leftover T06 VERIFY):** `tools/api-integration` `pnpm test:story03-t06:worker-replay` with `STORYTELLER_LIVE_ENABLED=false` and disposable `DATABASE_TEST_URL=offscreen_auth_test` — **2/2 PASS** (~19s). Nested cases: worker restart and activity replay settle **one finite action exactly once**; orphan outbox **drained=0**. Does **not** establish GET scene once, live executor-kill after saved result, stale-root → held, or publication-context integration.

**Activity-settlement integration (T06 VERIFY slice):** after `pnpm build`, `tools/api-integration` `pnpm test:story03-t06:activity-settlement` with `STORYTELLER_LIVE_ENABLED=false` and disposable `DATABASE_TEST_URL=offscreen_auth_test` — **4/4 PASS**. Covers activity settlement integration cases at recorded HEAD. Does **not** establish publication-context integration, GET scene once, live executor-kill after saved result, or stale-root → held end-to-end.

**New live handoff:** `apps/worker/test/story03-distributed-handoff.live.test.ts` — **1/1 PASS** after GA seam restore (`pnpm --filter @offscreen/game-authority test` **15 pass / 3 skip**; worker rebuild then live test ~7s). Control + executor workers DRAINED/STOPPED; **no** unauthorized; **no** teardown hang on this run. Repeat-stability across many reruns still not a T06 close.

**Packaging unblock:** `packages/application` export subpath `./storyteller/saved-generation-publish` added so GA adoption tests import without deep paths.

**NOT-RUN or partial (truthful):** `tools/api-integration` `test:story03-t06:publication-context`, browser-creation; `apps/worker/test/eng06-worker-restart.live.test.ts`; `packages/application/test/scene-checkpoint-publication.test.mjs`; GET scene once after publication; live executor-kill after saved result; stale-root → held end-to-end. Canonical technical headings in `docs/technical/storyteller/generation-and-publication.md`, `docs/technical/platform/execution-and-delivery.md`, and architecture atlas chapters 2–4 were **not** updated in this slice.

**Negative reading (mandatory):** A reader **must not** conclude that the two-process **local** live test, **worker-replay 2/2**, or **activity-settlement 4/4** closes [TURN03](../2026-11-19--turn03-full-distributed-forkable-turn-proof/CHANGE.md) Cross-Pod turn proof, full Kubernetes multi-Pod operation, or **T06 closure**. Scripted decomposed suites, one passing local handoff, worker-replay integration, and activity-settlement integration do not establish executor-kill recovery, stale-root held behavior, publication-context integration, or full saved-result → GA adopt → single GET scene chain. DIST01 and BOOT03 canonical technical headings were not edited.

## T07 evidence | control publication is GA HTTP (`44272d9a` parent, 2026-11-20)

**Task:** [TASKS.md T07](TASKS.md). **Depth:** PATCH. **Change state:** still Proposed — **not Done**. **Live gate:** `STORYTELLER_LIVE_ENABLED=false`. No paid provider send.

The distributed control activity no longer imports the database, adoption, or `publishStorytellerResult`. It calls Game Authority `POST /internal/v1/storyteller-generations/:generationId/publish` with the control token. `published` and `already_published` complete the activity. Transport loss is retryable and does not fall back to the combined worker. Control configuration refuses broad SQL environment variables.

| Suite | Result |
| --- | --- |
| `apps/worker/dist/test/story03-control-publication.test.js` | **6/6 PASS** |
| `apps/game-authority/dist/test/storyteller-generation-publish.test.js` | **6/6 PASS** |
| `apps/worker/dist/test/story03-distributed-handoff.live.test.js` with `DATABASE_TEST_URL` pathname `/offscreen_auth_test` and Compose Temporal `127.0.0.1:7233` | **1/1 PASS** (~2s). One succeeded generation, one attempt, publication `published`. Workers DRAINED/STOPPED |

**Negative reading:** this does not freeze notice topics (T08), does not prove a signed-in Nest admission path (T09), and does not close TURN03. The live handoff still calls `workflow.start` directly.

## Reconciliation ledger (fill before closure)

| Authority | Planned delta / no-op | Source SHA/diff | Positive / negative proof | Link/status |
| --- | --- | --- | --- | --- |
| Product | unchanged | `ec73a535` | No gameplay or Storyteller product rule edit in this slice | unchanged / N/A |
| Storyteller input + attempt custody | implement (in progress) | `ec73a535`; decomposed application/worker tests; api-integration worker-replay + activity-settlement | **Positive:** application story03 **7/7**, worker **10/10**; live handoff **1/1** teardown clean; `test:story03-t06:worker-replay` **2/2** (~19s), one finite action per replay, orphan outbox **drained=0**; after `pnpm build`, `test:story03-t06:activity-settlement` **4/4**. **Negative:** executor-kill and stale-root e2e **NOT-RUN**; activity-settlement does not claim publication-context or GET scene | PARTIAL VERIFY (T06) |
| Game Authority publication + canon | control activity is HTTP-only; GA remains the SQL publisher | parent `44272d9a` plus T07 diff; GA publish unit **6/6**; live handoff **1/1** | **Positive:** one published row after saved scripted result through GA HTTP. **Negative:** executor/story tokens **401**; duplicate publish `already_published`; control `DATABASE_URL` refused; GA-down activity is retryable and has no local publisher import. Scene-checkpoint GET and publication-context integration remain **NOT-RUN** | T07 landed; Change **not Done** |
| Workflow / runtime / docs | control publication owner reconciled; default `storytellerV1` unchanged | parent `44272d9a` plus T07 diff; `generation-and-publication.md`, `execution-and-delivery.md`, architecture chapter 2 | **Positive:** technical owners now say the control activity is GA HTTP and the live handoff published once. **Negative:** T08 topic freeze and T09 player path **not** claimed; publication-context and GET scene once remain **NOT-RUN**; Change stays **Proposed** | T07 docs reconciled; not Done |

Run `pnpm wiki:change-guard --mode plan` and `--mode close` where supported, repair inbound links and archive actual outcome. No unverified Done.
