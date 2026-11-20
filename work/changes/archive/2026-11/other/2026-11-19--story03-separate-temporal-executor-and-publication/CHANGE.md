# STORY03 | Deploy a distinct Storyteller Temporal executor and GA publication activity

**2026-11-20 source audit correction (HEAD `3992437`):** The two-stage workflow, control/executor queues, GA control-only publication endpoint and custody client now **exist in source**; the older `State: Proposed after STORY02` paragraph is a historical planning label, not proof that no code landed. However, `storyteller-distributed-control.ts` still performs direct DB adoption/publication, and multiple Storyteller notice creators still hardcode legacy topics. The in-process/manual-start tests do not establish a complete first campaign. [T07 control publication ownership, T08 selector consistency, T09 real-process trace](TASKS.md#2026-11-20-current-head-convergence-addendum--source-backed-not-yet-executed) are finite next tasks; [campaign integration program](../../../../../designs/open/first-campaign-readiness-2026-11-20/README.md). **No tests run by ChatGPT in this planning commit; Change not Done; provider remains disabled.**


**Composer microtask entry (2026-11-20):** [TASKS.md](TASKS.md) contains bounded subagent assignments and exact failure/stop tests; [all-open audit](../../../../COMPOSER-QUEUE-AUDIT-2026-11-20.md) reconciles dependencies and program order. **Default Cursor parent and child: Composer 2.5 Standard.** This packet's delegation: versioned workflow + saved-attempt CAS and GA publication, scripted only. Existing state, owner selection and spend/cluster gates remain authoritative; no automatic Grok escalation or broad child research. A prepared task is not a passing proof.

**State:** Done (2026-11-20). A separate Storyteller executor and Game Authority publication are proved on local processes. A lost publish reply, an executor killed after the save, and a late result each leave one scene. Browser, SSE, and a cold kind deploy remain TURN03.  
**Kind:** implementation  
**Selection:** Not included in active Kubernetes batch; explicit approval required.  
**Design:** [D4 Storyteller handoff](../../../../../designs/open/distributed-turn-poc/D4-STORYTELLER-HANDOFF.md) · [D1 service choreography](../../../../../designs/open/distributed-turn-poc/D1-EXECUTION-CONTRACT.md) · [DISTURN](../../../../../designs/open/distributed-turn-poc/README.md)

**Packet profile:** `STATE` (planner-inspected `584b594`). Start with this route card. [SOURCE-MAP.md](SOURCE-MAP.md) traces the existing executable call chain, [EXECUTION.md](EXECUTION.md) settles the versioned queue/authority/transaction design, and [PROOF.md](PROOF.md) lists failure checks. Cursor reads only relevant deep sections. These are **plans, not proof**; the packet stays Proposed and unselected.\n\n**Critical bridge:** `saveValidatedResult` currently writes `storyteller_attempt.attribution.custody`, not succeeded `generation.output`; `publishStorytellerResult` needs the latter. The GA-owned idempotent promote-and-publish step is mandatory.\n\n## Outcome / prerequisites

**Outcome:** Deploy a distinct Storyteller Temporal executor and GA publication activity.  
**Preconditions:** merged STORY01 and K8S06, completed STORY02 *private* facade, established DIST03 GA service boundary and BOOT03 coordination. **DIST05 is cancelled into this packet. DIST04 is an optional postcommit Rabbit consumer, not Storyteller transport or a prerequisite.** Follow the ratified direct SQL outbox→Temporal wake.

**Source observed on main 2026-11-19:** `packages/application/src/storyteller/runtime.ts::createStorytellerRuntime.complete` combines generation and publication; `execution.ts::createStorytellerExecution` reads/writes generation and attempt ledger and may call provider; `publication.ts::publishStorytellerResult` validates/canon-stages then locks/adopts game state; `packages/workflows/src/index.ts::storytellerV1` uses a single retryable `completeStoryteller` Activity; `apps/worker/src/activities/index.ts` still shares Storyteller and game collaborators. Durable funding/attempt and uncertainty schema already exists in `packages/db/src/schema/storyteller.ts`. Reinspect latest HEAD, active Cursor branches and test scripts before changing any file.

## Concrete scope / contract

Split current completeStoryteller activity by creating a separate storyteller-execute Task Queue worker with only task/read/result capabilities and a GA control-side publish activity. Introduce replay-safe named distributed workflow with stable workflow ID, generationId-only Temporal history and bounded explicit succeeded|held|failed|uncertain transition rules; no retry on uncertain provider dispatch and no provider send. Keep existing storytellerV1 and its recorded histories compatible until cutover. Do not deploy two consumers of the same Task Queue with incompatible activity sets. Make model execution scaled independently from game admission/publication, with separate credentials and readiness. Exact resource/namespace env reviewed before writing Helm/kind manifests.

**Intended source and documentation owners:** apps/worker/src/{activities/index,runtime/index,bootstrap} or new apps/storyteller-worker; packages/workflows/src/{index,contracts}.ts; packages/application/src/storyteller/runtime.ts and GA publication entrypoint, infra/kubernetes lab overlays, tests and technical runbooks.

**Exclusions:** No direct arbitrary Storyteller writes to `story`/`campaign`/`story_passage`/`story_document_commit`; no separate invented attempt/charge ledger; no extra model round or automatically billed retry; no Cognee/Code Mode dependency; no image/Stripe/production HA; no fictional Economy subsystem.

## Acceptance and negative tests

With two executor Pods or fakes, replay workflow and restart worker; one output and one GA publication. Hold/uncertain never loops into a new paid request. Wrong queue/permissions fail. Existing historical workflow tests remain valid; separated executor has no broad game-write credential.

Required receipt: source SHA and diff, exact versioned request/task/result schema, stable IDs, credential/read scopes, retry/uncertain/resume state diagram, tests/run commands/actual results and negative cases, docs impact, proof tier (pure, local compose or real multi-Pod). Unit tests alone never establish Kubernetes operation. Scripted provider test never implies paid provider correctness.

## Parallel scheduling

Isolated standalone worker image/config can be prepared parallel with DIST04 broker tests, but shared worker runtime/workflows require serialization or a single coordinated merger. Cluster deployment and GA publication integration gated on predecessors.

Only disjoint Ready Changes may run concurrently in isolated worktrees under an owner-approved batch. Shared workflow files, ledger migrations, authentication, canonical doc headings and the kind cluster have one integration owner. No automatic successor selection.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Expected result | Required evidence |
| --- | --- | --- |
| Product | unchanged: the text-first game and the Storyteller role stay as they were | No new gameplay or unapproved agent role |
| Technical | changed: the local executor and Game Authority publication boundary is now the recorded proof | docs/technical/platform/execution-and-delivery.md#storyteller-workflow-identity |
| Code | changed: the causal harness proves one scene after a lost reply and after the executor dies; the negative is a second passage | tools/api-integration/test/story03-causal-multiprocess.integration.ts |
| Related | changed: the catalog, status, and technical pages now point at the archived local proof | docs/architecture/02-one-turn.md#selected-distributed-turn-execution-and-publication-separated |

## Absorbed DIST05 cases (2026-11-19)

HK09 cancelled DIST05 as superseded. These checks were not already stated above. The local proof is in the later evidence. This packet is Done for that local proof. A cold kind run remains TURN03. The superseded RabbitMQ-to-Temporal hop is not copied: a story wake stays a direct SQL outbox to Temporal.

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

**Negative reading (mandatory):** A reader **must not** conclude that the two-process **local** live test, **worker-replay 2/2**, or **activity-settlement 4/4** closes [TURN03](../../../../open/2026-11-19--turn03-full-distributed-forkable-turn-proof/CHANGE.md) Cross-Pod turn proof, full Kubernetes multi-Pod operation, or **T06 closure**. Scripted decomposed suites, one passing local handoff, worker-replay integration, and activity-settlement integration do not establish executor-kill recovery, stale-root held behavior, publication-context integration, or full saved-result → GA adopt → single GET scene chain. DIST01 and BOOT03 canonical technical headings were not edited.

## T07 evidence | control publication is GA HTTP (`44272d9a` parent, 2026-11-20)

**Task:** [TASKS.md T07](TASKS.md). **Depth:** PATCH. **Change state:** still Proposed — **not Done**. **Live gate:** `STORYTELLER_LIVE_ENABLED=false`. No paid provider send.

The distributed control activity no longer imports the database, adoption, or `publishStorytellerResult`. It calls Game Authority `POST /internal/v1/storyteller-generations/:generationId/publish` with the control token. `published` and `already_published` complete the activity. Transport loss is retryable and does not fall back to the combined worker. Control configuration refuses broad SQL environment variables.

| Suite | Result |
| --- | --- |
| `apps/worker/dist/test/story03-control-publication.test.js` | **6/6 PASS** |
| `apps/game-authority/dist/test/storyteller-generation-publish.test.js` | **6/6 PASS** |
| `apps/worker/dist/test/story03-distributed-handoff.live.test.js` with `DATABASE_TEST_URL` pathname `/offscreen_auth_test` and Compose Temporal `127.0.0.1:7233` | **1/1 PASS** (~2s). One succeeded generation, one attempt, publication `published`. Workers DRAINED/STOPPED |

**Negative reading:** this does not freeze notice topics (T08), does not prove a signed-in Nest admission path (T09), and does not close TURN03. The live handoff still calls `workflow.start` directly.

## T08 evidence | wake topic is the frozen notice (`1a0afb80` parent, 2026-11-20)

**Task:** [TASKS.md T08](TASKS.md). **Depth:** PATCH. **Change state:** still Proposed — **not Done**. No paid provider send. No new outbox column.

Replay, recovery, opening retry, dispatch release, follow-up, and chamber release call `storytellerNoticeTopicForWake`. That helper reads Storyteller topics already stored for the operation. It does not read `STORYTELLER_DISTRIBUTED_V1`. Zero Storyteller notices throw. Two different Storyteller topics throw. Capture materialization may still admit the first Storyteller notice when the generation was created with only a campaign-consequence notice.

| Suite | Result |
| --- | --- |
| `packages/application/test/story03-notice-topic-freeze.test.mjs` | **6/6 PASS** on disposable sandbox databases |
| `packages/application/test/story03-notice-selector.test.mjs` | **2/2 PASS** |
| `apps/worker/dist/test/storyteller-notice-dispatch.test.js` | **6/6 PASS**. Dispatch code was not edited |

**Negative reading:** T08 itself does not run that signed-in path. T09 later did, on local processes only. T08 does not close TURN03.

## T09 evidence | local causal HTTP turn (`0834db2e` parent, 2026-11-20)

**Task:** [TASKS.md T09](TASKS.md). **Depth:** PATCH. **Change state:** still Proposed — **not Done**. **Live gate:** `STORYTELLER_LIVE_ENABLED=false`. No paid provider send. Document tier: local filesystem, not S3 and not kind.

`pnpm --filter @offscreen/api-integration test:story03-t09:causal` — **5/5 PASS** (~31s) with `DATABASE_TEST_URL` pathname `/offscreen_auth_test` and Compose Temporal. The test does not call `workflow.start` or `runtime.complete`.

| Case | Result |
| --- | --- |
| Authenticated HTTP opening, start, choice, GET scene 2, worker restart | **PASS**. Titles match the Turn03 pineapple fixture. Continuation topic `storyteller.distributed.v1`, one attempt, publication `published`, sequences `[1, 2]`, same passage ids after restart |
| Wrong actor | **PASS** |
| Replay same resolution | **PASS**. Sequences stay `[1, 2]` |
| Executor stopped, then started | **PASS**. Revision stays 1 until the executor process exists, then scene 2 without a second command |
| Game Authority stopped before resolution | **PASS**. Revision stays 1 |
| Activity ACK loss | **NOT-RUN in T09**. Proved later by T10 on the same suite |

**Negative reading:** this does not close [TURN03](../../../../open/2026-11-19--turn03-full-distributed-forkable-turn-proof/CHANGE.md). It is not a browser session, not SSE proof, not a cold kind deploy, and not two executor Pods.

## T10 evidence | continuation publish ACK loss (`change/story03-local-negatives`, 2026-11-20)

**Task:** harness-only loss of the first successful continuation publish response. **Depth:** PATCH. **Change state:** still Proposed — **not Done**. **Live gate:** `STORYTELLER_LIVE_ENABLED=false`. No paid provider send.

The control worker talks to Game Authority through a test loopback proxy. The proxy forwards the publish, waits for HTTP 200 `{ status: 'published' }`, then destroys that socket. Later calls are forwarded. The opening publish is not dropped.

| Suite | Result |
| --- | --- |
| `pnpm --filter @offscreen/api-integration test:story03-t09:causal` on `offscreen_auth_test` and Compose Temporal | **6/6 PASS** (~35s) |

The new case reaches scene 2 “Gary’s promise”, sequences `[1, 2]`, one continuation attempt, publication `published`, exactly one dropped continuation acknowledgement, and at least two publish posts.

**Negative reading:** this is not a browser session, not SSE, not a cold kind deploy, and not two executor Pods. The fault lives in the test proxy, not in a production fault flag.

## T11 evidence | stale saved continuation (`change/story03-local-negatives`, 2026-11-20)

**Task:** saved-generation publish when `narrativeRevision` lags `story.revision`. **Depth:** PATCH. **Change state:** still Proposed — **not Done**. No provider send. No Temporal. Disposable sandbox database, not `offscreen_auth_test`.

| Suite | Result |
| --- | --- |
| `node --test test/story03-stale-saved-publish.test.mjs` in `packages/application` | **2/2 PASS** |

A lagging saved continuation returns `{ status: 'stale' }`, keeps the advanced story revision, adds no passage, and keeps the saved generation output. A matching revision is not marked stale. Publication SQL was not changed.

**Negative reading:** this is one database process. It does not replace the multi-process campaign, and it does not close TURN03.

## T12 evidence | executor killed after the result is saved (`change/story03-local-negatives`, 2026-11-20)

**Task:** kill the executor after Game Authority has stored the continuation result and before that execute activity returns. **Depth:** PATCH. **Change state:** still Proposed — **not Done**. **Live gate:** `STORYTELLER_LIVE_ENABLED=false`. No paid provider send.

A test loopback proxy holds the executor's save response after Game Authority returns `{ status: 'saved' }`. The test sees that saved result while the story is still revision 1, kills the executor, drops the held response, and starts the executor again.

| Suite | Result |
| --- | --- |
| `pnpm --filter @offscreen/api-integration test:story03-t09:causal` on `offscreen_auth_test` and Compose Temporal | **7/7 PASS** (~46s) |

The new case reaches scene 2 “Gary’s promise”, sequences `[1, 2]`, one continuation attempt, and publication `published`.

**Negative reading:** this is local OS processes, not two executor Pods, not a browser session, and not a cold kind deploy. The hold lives in the test proxy.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| no product/technical behavior impacted | product | unchanged: no gameplay or Storyteller product rule was edited | no source behavior changed | reviewed | a lost reply, a dead executor, and a late result do not add a second scene | product pages were not edited |
| docs/technical/storyteller/generation-and-publication.md#remote-task-custody | technical | changed: control publication is Game Authority HTTP, and a lost acknowledgement, a killed executor, and a lagging revision each leave one scene | tools/api-integration/test/story03-causal-multiprocess.integration.ts @ ec7b0a39 | live-observed | the dropped publish reply and the executor killed after save do not add a passage; the stale sandbox case adds no passage | docs/architecture/02-one-turn.md#selected-distributed-turn-execution-and-publication-separated |
| docs/architecture/02-one-turn.md#selected-distributed-turn-execution-and-publication-separated | technical | changed: the observed turn is seven local processes, not a kind deploy | tools/api-integration/test/story03-causal-multiprocess.integration.ts @ ec7b0a39 | live-observed | browser, SSE, and a cold kind deploy are not claimed as this result | STATUS.md#status |
| STATUS.md#status--demonstrated-boundary | technical | changed: the demonstrated boundary now includes the seven-case local turn and the stale saved continuation | packages/application/test/story03-stale-saved-publish.test.mjs @ ec7b0a39 | live-observed | a matching revision is not marked stale | docs/technical/storyteller/generation-and-publication.md#remote-task-custody |
| docs/technical/platform/data-and-persistence.md#proposed-service-schemas-and-delivery-records | technical | unchanged: this close did not edit delivery-record schemas | no source behavior changed | reviewed | a lost publish reply does not invent a second delivery record | docs/technical/platform/execution-and-delivery.md#storyteller-workflow-identity |
| docs/technical/platform/http-api-and-client-contracts.md#service-calls-are-not-player-routes | technical | unchanged: the control publish route stayed a private service call | no source behavior changed | reviewed | a player route was not added for publication | docs/technical/platform/execution-and-delivery.md#storyteller-workflow-identity |
| docs/technical/platform/topology.md#proposed-service-ownership | technical | unchanged: this close did not move service ownership | no source behavior changed | reviewed | the executor still has no broad game-write credential | docs/technical/platform/execution-and-delivery.md#storyteller-workflow-identity |
| docs/technical/platform/execution-and-delivery.md#storyteller-workflow-identity | technical | changed: the distributed workflow is the archived local split, and the causal suite is 7/7 | tools/api-integration/test/story03-causal-multiprocess.integration.ts @ ec7b0a39 | live-observed | default Compose still does not poll the split queues, and a cold kind run is not claimed | docs/architecture/02-one-turn.md#selected-distributed-turn-execution-and-publication-separated |

Run `pnpm wiki:change-guard --mode plan` and `--mode close` where supported, repair inbound links and archive actual outcome. No unverified Done.

## Close exceptions

exception: .agents/references/change-packet-profiles.md because this edit only records that STORY03 is archived or retargets its link.
exception: docs/architecture/03-data-and-transactions.md because this edit only records that STORY03 is archived or retargets its link.
exception: docs/architecture/08-gaps-and-decisions.md because this edit only records that STORY03 is archived or retargets its link.
exception: tools/api-integration/test/helpers/story03-causal-multiprocess-harness.ts because this harness holds the save and drops the publish reply in the local proof.
exception: work/IMPLEMENTATION-ROADMAP.md because this edit only records that STORY03 is archived or retargets its link.
exception: work/changes/CURSOR-OPEN-BACKLOG-HANDOFF-2026-11-20.md because this edit only records that STORY03 is archived or retargets its link.
exception: work/changes/README.md because this edit only records that STORY03 is archived or retargets its link.
exception: work/changes/archive/2026-11/other/2026-11-19--dist01-ratify-game-authority-delivery-boundaries/CHANGE.md because this edit only records that STORY03 is archived or retargets its link.
exception: work/changes/archive/2026-11/other/2026-11-19--dist05-storyteller-execution-worker-split/CHANGE.md because this edit only records that STORY03 is archived or retargets its link.
exception: work/changes/archive/2026-11/other/2026-11-19--hk09-reconcile-open-change-inventory/CHANGE.md because this edit only records that STORY03 is archived or retargets its link.
exception: work/changes/archive/2026-11/other/2026-11-19--story02-private-task-and-result-custody/SOURCE-MAP.md because this edit only records that STORY03 is archived or retargets its link.
exception: work/changes/ledger/2026-11.md because this edit only records that STORY03 is archived or retargets its link.
exception: work/changes/open/2026-11-19--dist03-game-authority-private-boundary/CHANGE.md because this edit only records that STORY03 is archived or retargets its link.
exception: work/changes/open/2026-11-19--dist03-game-authority-private-boundary/TASKS.md because this edit only records that STORY03 is archived or retargets its link.
exception: work/designs/open/distributed-turn-poc/CURSOR-HANDOFF-2026-11-19.md because this edit only records that STORY03 is archived or retargets its link.
exception: work/designs/open/distributed-turn-poc/D1-EXECUTION-CONTRACT.md because this edit only records that STORY03 is archived or retargets its link.
exception: work/designs/open/distributed-turn-poc/D4-STORYTELLER-HANDOFF.md because this edit only records that STORY03 is archived or retargets its link.
exception: work/designs/open/distributed-turn-poc/GAPS.md because this edit only records that STORY03 is archived or retargets its link.
exception: work/designs/open/distributed-turn-poc/POC-READINESS-AUDIT-2026-11-19.md because this edit only records that STORY03 is archived or retargets its link.
