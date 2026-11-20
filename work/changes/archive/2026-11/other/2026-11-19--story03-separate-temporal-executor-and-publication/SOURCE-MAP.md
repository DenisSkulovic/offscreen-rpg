# STORY03 | source map for the worker split

**Profile:** `STATE`. **Planner inspection:** lean Git snapshot `584b5947516a8b99778ad0d5690fe957211c0acb`, 2026-11-19. **Not a runtime proof.** The execution agent must recheck only affected symbols on current HEAD. This document is planner investigation, **not** a mandatory preloaded Cursor role prompt. Read [EXECUTION](EXECUTION.md) for selected design and [PROOF](PROOF.md) for negatives.

## Existing call chain, explicitly verified in source

1. `packages/application/src/storyteller/records.ts:storytellerTopic` identifies the durable work. `apps/worker/src/outbox/dispatch.ts:noticeDispatch` maps that topic to `storytellerWorkflowType` and `storytellerWorkflowId` from `packages/workflows/src/contracts.ts`; `deliverOutboxNotice` directly invokes Temporal. RabbitMQ is not in this chain.
2. `packages/workflows/src/index.ts:storytellerV1` calls one `completeStoryteller(id)` Activity, `startToCloseTimeout: '3 minutes'`, retry maximumAttempts 5.
3. `apps/worker/src/runtime/index.ts:startRuntime` creates **one** `Worker` with the entire activity map and `config.taskQueue`, while running the SQL outbox relay in the same process.
4. `apps/worker/src/activities/index.ts:createWorkerActivities.completeStoryteller` calls `collaborators.storyteller.complete(id)`.
5. `packages/application/src/storyteller/runtime.ts:createStorytellerRuntime.complete` selects `generation`, then calls `execution.execute(record, task)` and subsequently `publishStorytellerResult(database, id, ..., options.documentStore)`. The local `activeGenerationIds` Set only prevents duplicate concurrent calls **in that one process**.
6. `packages/application/src/storyteller/publication.ts:publishStorytellerResult` reads **succeeded generation output**, validates it, stages docs and continuation checkpoint and enters the canonical SQL publication path under story authority. It is not an executor-only function.

## Existing partial custody path is NOT wired to the activity

`packages/application/src/storyteller/execution.ts` already exports `createStorytellerTaskCustody`, `createStorytellerExecution` and `hashStorytellerCustodyResult`. Its relevant functions and their actual meaning:

| Function | Verified behavior at baseline | Not yet guaranteed |
| --- | --- | --- |
| `fetchCommittedGeneration` | Reads committed `generation.kind === storytellerKind` and parses `storytellerTaskSchema`; pinnedRoot is `task.context.canonicalKnowledge?.rootHash ?? null` | Not an authorization token; no actor/branch transport endpoint exists |
| `claimGeneration` | SQL locks generation and existing attempts; creates one `storyteller_attempt` if none; returns `created:false` on repeat | **Not an execution lease.** A second caller may receive an existing claim; it must not infer permission for a second paid send |
| `saveValidatedResult` | Validates output with `validateStorytellerResult`, checks hash and root; writes saved `custody` JSON into attempt attribution, hash-conflicts on different result | **Does not set `generation.state = succeeded` or `generation.output`.** No publication-ready promotion/fence yet |
| `readValidatedResult` | Returns `unclaimed`, `claimed` or saved hash/result from attempt row | `claimed` with no saved result may be unsent, in-flight, or uncertain; it is not proof that provider should be called again |

**Critical missing bridge:** `saveValidatedResult` preserves an attempt-scoped result, while `publishStorytellerResult` consumes the **generation's** succeeded output. STORY03 must add a controlled, idempotent **GA-side promote/publish** operation and test the crash between result custody and scene publication. Do **not** call the existing publish function directly from the independent Storyteller executor or pretend saving an attempt is publication.

**Provider-free first:** In `execution.ts`, `scriptedStorytellerResult` and the scripted execution branch are side-effect-free. Recomputing a frozen deterministic fixture after an unowned/uncertain scripted claim is acceptable only if it hashes identically and is verified; a real provider send is NOT equivalent. The production `readStorytellerWorkerOptions` in `packages/application/src/storyteller/config.ts` denies live execution without explicit policy; current source comments additionally note missing `dispatchAuthority`. Keep the new distributed workflow's paid dispatch disabled until TURN04 is individually approved and a live state/lease policy is ratified.

## Newly inspected SQL constraint: publication adoption must be atomic

In `packages/db/src/schema/generations.ts:generation`, `generation_state_shape` is database-enforced: `pending` requires NULL attemptId/output; `running|uncertain` require non-NULL attemptId with NULL output; `succeeded` requires non-NULL attemptId **and** non-NULL output; `failed` requires non-NULL attemptId/output=NULL/failureCode. `packages/application/src/storyteller/execution.ts:claimGeneration` writes one `storyteller_attempt` but its `StorytellerClaimTx.lockGeneration` returns only `id,ownerId,kind,input`, **not generation.state or attemptId**, and neither `claimGeneration` nor `saveValidatedResult` updates `generation.attemptId`. The old local generation code's `saveOutcome` uses `where generation.attemptId=attemptId AND state in (running, uncertain)`, which cannot be reused blindly against a newly claimed pending generation. The new GA-only adoption must compare **saved custody attempt ID and hash** with locked `generation` state, set `attemptId`, `output`, `state`, `statusRevision` together in a valid single transaction, and fence conflicts with legacy running/uncertain work. This is a hard database invariant, not an incidental test fixture.

`packages/application/src/storyteller/publication.ts:publishStorytellerResult` stages immutable documents **before** its SQL transaction when `generation.state==='succeeded'`, then locks the story and checks revision/root/capture before setting `storyteller_publication`. The new bridge must not hold long story SQL locks during provider or S3 requests. A crash after adoption but before publication is an expected retry state; a crash after publication ack loss must be idempotent. Existing `storyteller_publication` states are `pending|published|stale|blocked`.

**Second SQL shape constraint discovered in deeper source audit:** the same `packages/db/src/schema/generations.ts` also declares `generation_repair_shape`: a succeeded generation must have `repairCandidate=NULL` **and** `repairDiagnostic=NULL`, while a nonsucceeded generation may carry both if output is NULL. The GA saved-result adoption must inspect those columns under its generation lock. If either is populated, **hold/refuse for source-backed explicit repair reconciliation**, not silently discard or overwrite diagnostics to force success. The original pending→succeeded CAS additionally requires `repairCandidate IS NULL AND repairDiagnostic IS NULL`. Add an actual PG negative test of a pending generation with both repair fields populated.\n\n## Actual process/auth boundary

- `apps/game-authority/src/server.ts:routeFor` recognizes only internal health, story GET and resolution PUT at baseline. `startGameAuthorityServer` authenticates a shared bearer token for its current story seam. No Storyteller custody/publish route is implemented.
- `apps/game-authority/src/application.ts:createGameAuthoritySeam` wraps `createStoryApplication` for read/admitResolution only. Existing `gameAuthorityWriters` is a documented symbol list, not SQL-enforced isolation.
- `apps/api/src/modules/stories/game-authority-client.ts` forwards user identity for read/resolution; it is **not** the new worker-to-GA access policy.
- The new executor should have no broad SQL story mutations and no S3 write grant. All task claims/result storage happen behind a minimal GA service endpoint (on the existing attempt ledger). A separate control identity may request publication; granting the executor the Nest/GA general writer token would void the intended boundary.
- Temporal holds generation IDs and activity results, not giant narrative documents. Load frozen task on a private request at execution time. The Storyteller may GET version-pinned source objects, never discover current head root by itself.

## Test and package anchors already in repository

- `packages/application/test/story02-task-claim.test.mjs`: claim and different-result-hash behavior; this is **not** two actual Pods or a remote HTTP test.
- `apps/game-authority/test/story-seam.test.ts`: private token/snapshot/resolution seam.
- `apps/worker/test/{relay,eng06-workflow-replay.live,eng06-worker-restart.live}.test.ts`: outbox and Temporal-related negative routes.
- `tools/api-integration/test/{storyteller-activity-settlement,storyteller-worker-replay,storyteller-publication-context,storyteller-provider-recovery}.integration.ts`: regression candidates for separate stages and old `storytellerV1`.
- `packages/application/test/{scene-checkpoint-publication,scene-checkpoint}.test.mjs`: staged checkpoint/publication checks, do not clone their logic.

## Concrete source edits expected (only when this Change is selected)

1. `packages/contracts/src/`: private versioned Task, Claim, Save and Publish DTOs with strict identity/root/hash and size checks. Reuse existing Storyteller task schemas, do not invent duplicate result semantics.
2. `apps/game-authority/src/{server,application,bootstrap/main}.ts`: authenticated task/custody+publication endpoints and role-scoped service identity.
3. `packages/application/src/storyteller/{execution,runtime,publication}.ts`: an explicit **saved result → generation success → authoritative publish** bridge; idempotent, root-bound, retains old monolith path for legacy workflows.
4. `packages/workflows/src/{contracts,index}.ts`, `apps/worker/src/{activities,runtime,bootstrap}.ts`: a new `storytellerDistributedV1` with control and execution tasks on distinct task queues; keep original `storytellerV1` registered for in-flight histories.
5. `apps/worker/test/`, `apps/game-authority/test/`, `tools/api-integration/test/`: source-backed duplicates, result-save crash and stale-root tests. Don't create a second all-purpose E2E harness; TURN03 is the final join.
6. Affected canonical technical headings under `docs/technical/storyteller/` and `docs/technical/platform/execution-and-delivery.md`; `STATUS.md` states observed tier. Do not change product mechanic promises.

**No automatic new SQL migration:** reuse `storyteller_attempt` and `generation` if a transactional fence is possible. If a hard lease/constraint is mathematically required, demonstrate the exact failed interleaving and amend the design **before** requesting the single migration owner. Never add a second usage/billing ledger for convenience.

## Hidden cross-packet collision

STORY02 owns the private facade. STORY03 owns the workflow and publication split **after** that facade exists. BOOT03 shares GA `server.ts`/app composition. DATA04 shares checkpoints/forks; TURN02 shares worker images/queue configuration. Thus **one GA private transport integrator** and **one workflow/SQL writer** must integrate staged changes. Separate worktrees do not make the same source file parallel-write-safe.

## Unresolved live-provider question (honestly fenced)

Current claim uniqueness does not encode "safe to resend to OpenRouter after process died". For fake the safe option is deterministic recompute and stable hash, with duplicate attempt writes refused; for live, the safe default is a durable **uncertain/held** state and human reconciliation with existing dispatch-review authority. Do not claim exactly-once external charging. This is a TURN04 permission/design gate, not a reason to block the zero-spend distributed turn.
