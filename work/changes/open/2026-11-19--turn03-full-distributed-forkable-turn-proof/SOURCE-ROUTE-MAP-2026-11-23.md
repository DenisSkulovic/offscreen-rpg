# TURN03 | current source-to-proof route map (2026-11-23)

**Inspected:** uploaded lean source snapshot `a755b183405b` matching integration HEAD at planning start, cross-checked against GitHub. **Status:** source finding, **no release-lab execution**. The new [next execution plan](NEXT-EXECUTION-2026-11-23.md) controls the implementation order.

## The shortest real authenticated story trace

The existing lower-tier `tools/api-integration/test/story03-causal-multiprocess.integration.ts` is a concrete, working route source. Its helper `admitTurn03OpeningAndScene1` and `submitTurn03Resolution` issue:

| Step | Actual Nest endpoint and method | Input / observable outcome | Owner |
| --- | --- | --- | --- |
| A | `PUT /api/drafts/:draftId` | Existing browser cookie + Origin; `expectedRevision:0`, authored draft; HTTP 200 | `apps/api/src/modules/drafts/controller.ts::save` |
| B | `PUT /api/drafts/:draftId/openings/:generationId` | `expectedRevision:1`, pinned `startPackage`; HTTP 202 | `apps/api/src/modules/drafts/openings-controller.ts::generate` |
| C | `GET /api/drafts/:draftId/openings/latest` | Poll until **succeeded** and same `generationId`, bounded deadline | `OpeningsController::latest` |
| D | `PUT /api/stories/:storyId/start` | `candidateId:generationId`, `expectedDraftRevision:1`, pinned campaign; HTTP 200 and scene1 revision 1 | `StoriesController::start` -> StorySeam -> GA |
| E | `GET /api/stories/:storyId` | Authoritative owner-scoped scene1; exact interaction/visible option and revision | `StoriesController::read` |
| F | `PUT /api/stories/:storyId/resolutions/:operationId` | `{expectedRevision:1,submission:{interactionId,answer:{kind:'choice.v1',optionId}}}`; HTTP **202**, not publication | `StoriesController::admitResolution` -> distributed GA |
| G | `GET /api/stories/:storyId/resolutions/:operationId/receipt` and `GET /api/stories/:storyId` | Reconcile same operation; poll for scene2 revision 2, bounded; no re-POST on ambiguity | Story receipt + owner-scoped read |
| H | `GET /api/stories/:storyId/updates` (SSE, separate monitored stream) | Observed committed-version hint, then fresh authoritative GET; lost SSE must not cause a new command | `StoriesController::storyUpdates` and `story-update-hub` |
| I | `PUT /api/stories/:storyId/forks/:forkId` | `{expectedRevision,sourcePassageId,sourceCheckpointHash}` **as of scene1**; verify child branch and no parent future | `StoriesController::fork` -> GA |
| J | `GET /api/stories/:forkId` | Child owner-scoped snapshot; independent continuation is an additional real command and proof, not merely different IDs | `StoriesController::read` |

**Do not use** the synthetic `turn03/run.mjs` routes `POST /stories`, `POST /stories/:id/candidates/start`, `POST /stories/:id/commands`, `POST /game-authority/scenes/2/commit`, `POST /stories/:id/forks` or `GET /stories/:id/future`: they are not this real public API. Do not invent an internal GA publication endpoint for the operator; observe SQL/outbox/Temporal/GA process instead.

**Auth:** Drafts/Openings require the real `IdentityService` cookie. CL01's `StoryPlayerIdentity` bearer is for Stories only; terminal bearer cannot create drafts/openings. Preserve normal Origin protection for writes. Live operator needs an explicitly provided disposable signed-in browser session, never a fabricated cookie or production identity, and must not log/store raw cookie in proof.

**Fixture:** `tools/api-integration/test/helpers/turn03-distributed-poc-fixture.ts::provisionTurn03DistributedPocFixture` authors orientation-only Harbor-watch source and imports rules/start documents into a `DocumentStore`. The T09 multiprocess test uses **LocalDocumentStore**, so its PASS does not mean S3 release parity. A live runner must provision the same pinned roots into the lab's exact S3 store with authorized disposable credentials, or accept an operator-preprovisioned pin verified by exact hash. No unpinned default rule source or hidden executable obligation.

**Truthful evidence:** `turn03/report.mjs` has eight required gates and rejects mocked/incomplete `PASS`. The current `run.mjs` receives injected `http`, produces `tier:local,mocked:true` and intentionally marks real gates NOT-RUN. `release-acceptance-preflight.mjs` already has a read-only stage planner and a separate mutating-acceptance authorization boundary; do not add a second global release framework.

## Causal evidence beyond HTTP

```mermaid
sequenceDiagram
  actor Player
  participant API as Nest /api
  participant GA as Game Authority
  participant PG as PostgreSQL + outbox
  participant T as Temporal
  participant W as Worker control/executor
  participant S3 as S3 document store
  Player->>API: PUT draft / opening / story start
  API->>GA: scoped story start
  GA->>PG: scene1 + checkpoint selector
  GA->>S3: immutable scene1 checkpoint
  Player->>API: PUT resolution (stable operationId)
  API->>GA: scoped admission
  GA->>PG: receipt + durable notice
  PG-->>T: relay dispatch
  T->>W: control and scripted executor
  W->>GA: saved result / private publish authority
  GA->>PG: scene2 + publication
  GA->>S3: exact scene2 checkpoint
  API-->>Player: SSE hint; GET authoritative revision
  Player->>API: PUT scene1 historical fork
  API->>GA: scoped fork
  GA->>PG: separate child and as-of projection
```

**Database source proofs:** `story03-causal-multiprocess.integration.ts::assertContinuationSql` reads `outbox` (`storytellerDistributedTopic`), `storytellerAttempt`, `storytellerPublication`, `storyPassage`; scene1 checks `storySceneCheckpoint`, `story.rootHash` and exact object digest. The live adapter must use verified disposable read-only authority, never an API bypass or direct game mutation. Worker now maps `pending-consequence-not-settled` to retryable in `storyteller-distributed-control.ts` but actual release acceptance still needs proof.

## Unsettled, intentionally held for planner before live operator dispatch

1. **Authenticated release actor:** the test-utils cookie in `story03-causal-multiprocess-harness.ts` is local-process instrumentation; it is **not** a way to mint a browser session against the installed release. Choose safe, authorized disposable browser/OAuth flow or operator-provided session file with ownership/mode 0600, and expiry/fail-closed behavior.
2. **S3 fixture deployment:** choose exact lab bucket and existing provisioning owner, ensure hash equality to app runtime, scoped temporary credentials, and cleanup/retention. No generic unrestricted S3 bypass.
3. **SQL/Temporal evidence:** choose actual least-privileged read-only lab adapter or existing fixture service, correlation by pinned operation ID and immutable roots, no arbitrary credential leaks or cleanup of somebody else's rows.
4. **Cross-Pod gate semantics:** map each of eight report gates and all seven negative cases to concrete observed and re-observable identity evidence, including recovery injection permissions and timeouts. Runner must not claim partial gates as overall PASS.

**Do not commission an all-eight-gate live runner to Cursor until these are decided.** A source-only exact-route trace correction can be implemented first; it stays mocked/NOT-RUN, then a separate proof joins the real adapters.