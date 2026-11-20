# STORY02 | private custody transport source investigation and executor route

**Outcome (2026-11-20, `22512a4c`):** the scripted-only guard landed and this packet is archived. The notes below are the pre-fix investigation.

**Profile:** `CONTRACT`/STATE · **Historical baseline:** `584b594` (2026-11-19) described absent remote facade; the 2026-11-20 review confirmed versioned private GA routes and the worker HTTP client, then found the scripted-only gap that T05 closed. See [decision](DECISION-2026-11-20.md). STORY03 publication and queue changes stay in [its execution design](../../../../open/2026-11-19--story03-separate-temporal-executor-and-publication/EXECUTION.md).

## Exact reusable primitives

- `packages/application/src/storyteller/execution.ts` already defines `FetchedStorytellerGeneration`, `StorytellerClaimOutcome`, `StorytellerSaveOutcome`, `StorytellerReadOutcome`, `PinnedStorytellerRoot`, `StorytellerClaimStore` and `createStorytellerTaskCustody`. Methods `fetchCommittedGeneration`, `claimGeneration`, `saveValidatedResult`, `readValidatedResult` form the reuse point. Data owner is `storyteller_attempt.attribution.custody`, not a new table.
- `packages/application/src/storyteller/runtime.ts` exposes custody in the Storyteller runtime; `complete` still runs+publishes in-process and **does not use remote facade**.
- `packages/application/test/story02-task-claim.test.mjs` checks claims and hash conflict through an injected store. It is not a remote endpoint, two live clients, multi-Pod lock or provider-no-resend proof.
- `apps/game-authority/src/server.ts:routeFor` recognizes `/internal/v1/health/live`, `GET /internal/v1/stories/:id` and `PUT /internal/v1/stories/:id/resolutions/:operationId` only. The router explicitly rejects non-`stories` paths, so STORY02 must add distinct generation routes.
- `apps/game-authority/src/server.ts:handle` authenticates `Authorization: Bearer`, enforces version/actor headers for story routes, and `readBody` limits current JSON requests to 64KiB. The new Storyteller-result endpoint may require a **separately measured and bounded** limit; do not blindly assume the old 64KiB supports the maximum approved output, and do not remove limits.
- `apps/game-authority/src/application.ts` constructs a local `createStoryApplication` seam for current story read/admit resolution. Add a **narrow separate custody collaborator** injected from bootstrap, not a broad public story-service object returned to workers.
- `apps/game-authority/src/bootstrap/main.ts` currently constructs a DB and DocumentStore and passes one story seam+one shared token. It does not create distinct executor/control credentials. Create source-verified role-scoped config with independent tokens, keeping existing Nest→GA story token only for story routes. Refuse all absent/weak credentials when the distributed execution feature is enabled.
- `apps/api/src/modules/stories/game-authority-client.ts` is **Nest's** trusted internal story client. The Storyteller execution worker needs a separate, least-privilege client and a different credential; don't turn the Nest client into a universal privileged HTTP library.

## Bounded implementation under STORY02, not STORY03

1. Add versioned strict `@offscreen/contracts` private generation DTOs: committed task read, claim attempt, validated result save (and optional read saved result) with stable `generationId`, `pinnedRoot` and hash. Use actual `storytellerTaskSchema` and existing custody types, do not duplicate full model result shape under a different semantic name. Server independently derives owner/branch/root from trusted DB task.
2. Expose under `/internal/v1/storyteller-generations/:generationId` via GA server with an **executor** credential and exact allowlist for task/read/claim/save only. Refuse general `stories` read/write with executor credential. Reserve **control** credential role for STORY03 publish route, not this Change's broad authority. Do not put a private task endpoint behind Next/Nest public Gateway.
3. New GA composition obtains `createStorytellerTaskCustody` once with the same DB. If the custody store currently only accepts a concrete `Database`, use an adapter; avoid changing full `createStorytellerRuntime.complete`/provider path here.
4. Add an execution-only small HTTP client in the appropriate worker package with bounded transport timeout, bounded response bytes and strict parsed schema. No `DATABASE_URL` required to **fetch/claim/save task** through this client. Storage of results remains GA transaction-owned.
5. Tests: correct token+task returns exact pinned capture and no other story; mismatched actor/root refuses; user/browser token cannot fetch task; different client processes claim same generation and get same attemptId; duplicate same hash saved idempotently; different hash conflicts, readback retains first; unknown task and malformed content reject. Assert no direct story/scene root mutation from custody client.
6. Update `docs/technical/storyteller/operation-and-controller.md#custody-of-one-task` and `generation-and-publication.md#remote-task-custody` with **implemented** claims only; do not say execution/publish separation completed until STORY03's actual workflow and GA publish are proven.

## Concurrency semantics: biggest hidden risk

Current `claimGeneration` returns an existing `attemptId` with `created:false` if a row is already present. That is **idempotent claim deduplication, not a renewable exclusive execution lease**. Two separate callers cannot safely infer exactly one provider send from this. The required *provider-free* test uses a deterministic fake result and CAS first-write hash; real provider send must remain disabled/held until TURN04 defines persisted dispatch reservation and uncertainty semantics. There is no reason to add a paid retry into STORY02.

**Must not implement in STORY02:** Temporal workflow split, GA promotion of saved result to `generation.state`, story checkpoint publication, Rabbit transport, paid adapter, schema overhaul or fork mechanics. Those belong to STORY03/TURN04/DATA04. If a DTO/body size conflicts with existing source schema, stop, report exact rejected maximum/validator and obtain a narrow planner correction rather than disable validation.

## Executor's first read list

`packages/application/src/storyteller/execution.ts` typed outcomes and custody methods; `apps/game-authority/src/server.ts:routeFor/handle`; `apps/game-authority/src/bootstrap/main.ts`; `apps/game-authority/src/application.ts`; `packages/application/test/story02-task-claim.test.mjs`. This list is five anchors rather than a repository-wide exploration request.

**STOP/receipt:** report target HEAD, applied DTO/routes/credentials, two real independent client claims, positive and negative tests actually run and the precise result body cap. A raw claim object or mock green test is not the remote STORY02 acceptance.

## 2026-11-20 current-head source audit | terminal closeout target

The old source map's T01/T02/T03 "missing" claims are superseded: `packages/contracts/src/storyteller-task-custody.ts` defines versioned endpoints; `apps/game-authority/src/server.ts` enforces separate executor/story/control tokens and owns task/claim/save/read; `apps/worker/src/custody/storyteller-task-custody-client.ts` has bounded transport, and `apps/worker/src/activities/storyteller-distributed-execution.ts` refuses provider-mode tasks. `apps/game-authority/test/storyteller-task-custody-persistence.integration.test.ts` ran an actual two-HTTP-client disposable SQL claim fixture (T04 historical 10/10 across suites). STORY03 T09 had a separate local causal multi-process proof (5/5), not two executor Pods.

**Recorded defect, closed by `22512a4c`:** before that commit, `readCommittedTask` parsed but did not reject `execution.mode='provider'`; `claimGeneration` returned the earliest attempt regardless of `requestedProvider`; `saveValidatedResult` could persist a result on an already-existing provider attempt. No paid provider HTTP or exploit was observed. T05 and T06 closed that gap. Do not reopen this packet for it.
