# STORY02 | Implement typed private Storyteller task/result custody facade

**Composer microtask entry (2026-11-20):** [TASKS.md](TASKS.md) contains bounded subagent assignments and exact failure/stop tests; [all-open audit](../../COMPOSER-QUEUE-AUDIT-2026-11-20.md) reconciles dependencies and program order. **Default Cursor parent and child: Composer 2.5 Standard.** This packet's delegation: role-scoped task/custody DTO and endpoint in separate small steps; no paid send lease. Existing state, owner selection and spend/cluster gates remain authoritative; no automatic Grok escalation or broad child research. A prepared task is not a passing proof.

**State:** Proposed after STORY01 (2026-11-19). **T04 VERIFY PASS** @ `ec73a535` (2026-11-20): in-process two-HTTP-client PostgreSQL custody proof **10/10 PASS**; **not Done**; **no cross-Pod proof claimed**; `storytellerV1` still one combined activity.  
**Kind:** implementation  
**Selection:** Provider-free claim seam only. The Game Authority handler, the workflow split, and any migration stay out of this slice.  
**Design:** [D4 Storyteller handoff](../../../designs/open/distributed-turn-poc/D4-STORYTELLER-HANDOFF.md) · [D1 service choreography](../../../designs/open/distributed-turn-poc/D1-EXECUTION-CONTRACT.md) · [DISTURN](../../../designs/open/distributed-turn-poc/README.md)

**Packet profile:** `CONTRACT`/`STATE`. [SOURCE-MAP.md](SOURCE-MAP.md) is the ChatGPT planner's source map for the missing private GA task/claim/save interface, concrete actor/token checks and test anchors (inspected baseline `584b594`). Read only the relevant section during execution. **An existing claim row is not an exclusive provider-dispatch lease**; provider-free hash dedup is proved separately from spend safety. This packet remains partial/Proposed until STORY03 adoption and distributed executor proof; T04 does not close the Change.

## Outcome / prerequisites

**Outcome:** Implement typed private Storyteller task/result custody facade.  
**Preconditions:** STORY01 selected, DIST03 private GA boundary; scripted source path available without running Rabbit/Temporal.

**Source observed on main 2026-11-19:** `packages/application/src/storyteller/runtime.ts::createStorytellerRuntime.complete` combines generation and publication; `execution.ts::createStorytellerExecution` reads/writes generation and attempt ledger and may call provider; `publication.ts::publishStorytellerResult` validates/canon-stages then locks/adopts game state; `packages/workflows/src/index.ts::storytellerV1` uses a single retryable `completeStoryteller` Activity; `apps/worker/src/activities/index.ts` still shares Storyteller and game collaborators. Durable funding/attempt and uncertainty schema already exists in `packages/db/src/schema/storyteller.ts`. Reinspect latest HEAD, active Cursor branches and test scripts before changing any file.

## Concrete scope / contract

Add narrow versioned private API/service facade to obtain a committed Storyteller task by generationId with pinned revision/root/capture SHA and permitted source handles, idempotently claim execution, record bounded attempt/usage state, and submit a validated result plus stable output hash. Reuse existing generation, storytellerAttempt, funding and execution-stage records; do not add duplicate charge schema. Update createStorytellerExecution seams to accept injected custody operations rather than freely writing game tables. Keep fake/scripted provider first, no paid wire permission. A persistent idempotent CAS/claim is required across two worker processes, not the in-memory activeGenerationIds Set. Service credentials must prevent arbitrary users and one task from accessing another story.

**Intended source and documentation owners:** packages/application/src/storyteller/{execution,runtime,budget,dispatch-review,dispatch-authority}.ts as necessary, apps/game-authority private handler, packages/contracts internal storyteller contract, packages/db schema only if an actual missing fence is demonstrated, provider-free unit/integration tests; docs/technical/storyteller and execution source maps.

**Exclusions:** No direct arbitrary Storyteller writes to `story`/`campaign`/`story_passage`/`story_document_commit`; no separate invented attempt/charge ledger; no extra model round or automatically billed retry; no Cognee/Code Mode dependency; no image/Stripe/production HA; no fictional Economy subsystem.

## Acceptance and negative tests

Two independent executors race on generation ID: one owns dispatch; repeated same result/hash returns same status; different hash conflicts; frozen root/branch mismatch refused; unknown provider wire cannot accidentally dispatch. Existing scripted tests pass; no GA story/item/root mutation occurs from executor identity.

Required receipt: source SHA and diff, exact versioned request/task/result schema, stable IDs, credential/read scopes, retry/uncertain/resume state diagram, tests/run commands/actual results and negative cases, docs impact, proof tier (pure, local compose or real multi-Pod). Unit tests alone never establish Kubernetes operation. Scripted provider test never implies paid provider correctness.

## Parallel scheduling

Can run in independent worktree alongside DATA02 and BOOT02 once STORY01 settled. Shared GA auth DTO or storyteller execution files coordinate with DIST03/DIST05.

Only disjoint Ready Changes may run concurrently in isolated worktrees under an owner-approved batch. Shared workflow files, ledger migrations, authentication, canonical doc headings and the kind cluster have one integration owner. No automatic successor selection.

## Planned specification and implementation delta | planned-impact.v1

| Plane     | Expected result                                                                                                                                               | Required evidence                                             |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Product   | unchanged: the text-first game and the Storyteller role stay as written                                                                                       | No new gameplay or unapproved agent role                      |
| Technical | changed: docs/technical/storyteller/operation-and-controller.md#custody-of-one-task records the attempt-row claim, and the remote workflow is still not split | Disposition of the claim seam and the duplicate-hash negative |
| Code      | changed: packages/application/src/storyteller/execution.ts claims one generation on storyteller_attempt; negative: a different result hash conflicts          | packages/application/test/story02-task-claim.test.mjs         |
| Related   | unchanged: STATUS, ROADMAP, and the change index stay untouched because this slice does not close the whole change                                            | No index or status edit                                       |

## Provider-free slice

This branch adds the claim seam in `packages/application/src/storyteller/execution.ts` and exposes it from `packages/application/src/storyteller/runtime.ts`. The provider-free proof is `packages/application/test/story02-task-claim.test.mjs`. The technical note is `docs/technical/storyteller/operation-and-controller.md`. No provider call was made. `storytellerV1` is still one activity. The remote workflow is still not split.

## T04 VERIFY receipt (two-client custody, 2026-11-20 @ `ec73a535`)

**Task:** [TASKS.md#t04--two-client-persistence-and-auth-proof--verify-pass-ec73a535-2026-11-20](TASKS.md). **Depth:** VERIFY only. **Change state:** Proposed — **not Done**. **Evidence tier:** in-process tests plus disposable PostgreSQL integration; **not** multi-Pod.

| Suite | Result |
| --- | --- |
| `packages/application/test/story02-task-claim.test.mjs` | **4/4 PASS** |
| `apps/game-authority/test/storyteller-task-custody.test.ts` | **3/3 PASS** |
| `apps/game-authority/test/storyteller-task-custody-persistence.integration.test.ts` (`DATABASE_TEST_URL` → `offscreen_auth_test`) | **3/3 PASS** |

**Total:** **10/10 PASS**. **Positive:** two private HTTP clients, one `attemptId`; duplicate same-hash save; hash readback. **Negative:** result-hash conflict; wrong pinned root; missing/wrong story token **401**. **NOT claimed:** cross-Pod races, separate executor Pods, or workflow activity split. Generation adoption to `succeeded` remains **STORY03**. `pnpm wiki:change-guard --mode plan --change` this packet → **ok, no findings** (2026-11-20). Receipt does not promote Done.

## Reconciliation ledger (fill before closure)

| Affected claim      | Authority                                                                    | Target delta                                                                                                                                    | Source delta                                          | Evidence tier   | Negative proof                                               | Map                        |
| ------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | --------------- | ------------------------------------------------------------ | -------------------------- |
| Product gameplay    | docs/product/storyteller/behavior-and-quality.md                             | unchanged: this slice does not change player-facing rules or who publishes a passage                                                            | no source behavior changed for product rules          | source-observed | a custody save does not write a story passage                | no product map change      |
| Custody of one task | docs/technical/storyteller/operation-and-controller.md#custody-of-one-task   | changed: docs/technical/storyteller/operation-and-controller.md#custody-of-one-task records one attempt-row claim and one validated result hash | packages/application/src/storyteller/execution.ts     | fixture-tested  | a different result hash conflicts and the saved result stays | heading stays on this page |
| Remote task custody | docs/technical/storyteller/generation-and-publication.md#remote-task-custody | changed: records in-process two-HTTP-client PostgreSQL task/claim/save proof; `storytellerV1` still one activity; multi-Pod still unproven | `apps/game-authority/test/storyteller-task-custody-persistence.integration.test.ts` | fixture-tested + integration-tested (disposable PG) | conflicting hash, wrong root, token **401**; not cross-Pod | heading on generation page |
| Attempt ledger      | packages/db/src/schema/storyteller.ts                                        | unchanged: storyteller_attempt remains the only attempt ledger and no column was added                                                          | packages/db/src/schema/storyteller.ts                 | source-observed | a migration was not added for a result-hash column           | no schema map change       |
| Executor writes     | packages/application/src/storyteller/execution.ts                            | changed: the claim writes storyteller_attempt and does not write story, campaign, story_passage, or story_document_commit                       | packages/application/test/story02-task-claim.test.mjs | fixture-tested  | the conflicting hash test keeps the first saved result       | no route map change        |

Run `pnpm wiki:change-guard --mode plan` and `--mode close` where supported, repair inbound links and archive actual outcome. No unverified Done.
