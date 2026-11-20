# STORY03 | discriminating proof matrix (no provider spend)

**Baseline:** `584b594`. **Profile:** STATE. This is test design, not test evidence. The executor records actual commands/results in `CHANGE.md` reconciliation and dated `evidence/`, not by changing PASS words in this file. Owner authorization still required.

| Case | Arrange / exercise | Required observed result | Evidence tier / owners |
| --- | --- | --- | --- |
| Old workflow stays compatible | Existing persisted `storytellerV1` fixtures; start legacy activity | Old combined handler still registered; no altered workflow event ordering | `apps/worker/test/eng06-workflow-replay.live.test.ts` and `packages/workflows` |
| New queue is real | Start new `storytellerDistributedV1`; stop execution worker but keep control polling | Workflow waits on execution Activity; control worker cannot locally execute the provider task; after executor resumes it proceeds | Two worker processes + local Temporal, then kind in TURN03 |
| Strict task identity | Request task `generationId` with wrong executor role/credential; wrong source/root | 401/403/404 or typed conflict; no cross-story task/result disclosure | `apps/game-authority/test`; private integration |
| Duplicate claim | Two concurrent executor clients claim same ID/root | Exactly one persisted attempt identity, stable attemptId, not two charges or funding rows; existing claim does **not** grant paid resend | `packages/application/test/story02-task-claim.test.mjs` + separate-client PG integration |
| Result hash | Save same valid result+hash twice; then a different valid result/hash | Stable first saved result; duplicate idempotent; different hash rejected; generation has not silently published | New GA private API test |
| Saved→published bridge | Save fake valid result; invoke **GA publish**, then invoke again | One `generation` success/output compatible with existing publisher, one passage, one publication decision, one checkpoint, one root | `tools/api-integration/test/storyteller-publication-context.integration.ts` extended |
| Crash after save | Persist result, kill executor before publication; restart control/GA; redeliver workflow Activity | Read saved result; no additional fake-source call needed; exactly one passage and checkpoint | Local Temporal+PG and TURN03 kind |
| Crash after publication, ack lost | Publish then drop RPC acknowledgement; retry publish | Reports already published / same outcome; no second scene, root, or side-effect | GA service and Postgres |
| Root/branch stale | Capture at revision N/root R, advance current story to N+1/root R2, deliver delayed result | Result remains saved, publish marked stale/held; no adopting R2 or writing a passage to parent future | `storyteller-publication-context`, `scene-checkpoint-publication` |
| S3/object failure | Fail staged object read/write before final commit; then restore | No SQL selector points at missing object, no half published scene; retry uses pinned root | `packages/application/test/scene-checkpoint-publication.test.mjs` + local integration |
| Unauthorized mutation | Executor is given only its deployed service role and S3 read privilege; call GA start/publish/SQL | Denied; secrets/env and network policy show no broad DB credential in executor Pod | TURN02 manifests + TURN03 kind negative |
| Temporal duplicate | Outbox wake retried with deterministic workflow ID | One running workflow; original `storytellerV1` untouched; no Rabbit wake needed | `apps/worker/test/relay.test.ts` and local/kind |
| Missing broker | Stop Rabbit while command→Temporal→publish continues | Story turn commits; optional derived projection lags only | TURN03 conditional if Rabbit projection installed |
| Expensive ambiguity | A fake scripted claim is recomputable; a real provider attempt with unknown send state is simulated | Scripted re-evaluation deterministic/hash-safe; real provider path **does not** send automatically and is classified held/uncertain | pure policy tests, **zero network provider calls** |

## Mandatory DB-shape probe

The existing `generation_state_shape` constraint requires `succeeded` rows to hold a non-null `generation.attempt_id` and non-null `generation.output`. The new custody `claimGeneration` only inserts the attempt and `saveValidatedResult` saves its result under attempt attribution; neither associates a pending generation with that attempt. Therefore test **both** the initial pending row and the final succeeded row. Run two independent GA adopt calls concurrently with the same saved hash and assert the same attempt ID, one status revision transition (or source-backed exact intended count), no duplicate passage, and no invalid intermediate row. Try a conflicting `generation.attemptId` owned by legacy execution; it must **hold/refuse** instead of adopting a different saved result. A fake-output hash check **without** an actual SQL constraint check does not close STORY03.

**Second constraint:** `generation_repair_shape` also forbids a succeeded generation retaining a repairCandidate/repairDiagnostic pair. Start a valid pending generation with both repair fields present, save a fake custody result, invoke GA promote and prove it **refuses/holds without clearing diagnostics**. Do not call it a successful adoption or fabricate a repair completion.\n\n## Economical command policy

Work from repo root, use the workspace-filtered command that actually exercises the touched package. Intended candidates, **verify script existence at execution HEAD**:

- `pnpm --filter @offscreen/game-authority build && pnpm --filter @offscreen/game-authority test`
- `pnpm --filter @offscreen/worker build && pnpm --filter @offscreen/worker test` (some `.live` tests require running Temporal and must be reported separately)
- `pnpm --filter @offscreen/application build && pnpm --filter @offscreen/application test`
- `pnpm --filter @offscreen/api-integration build && pnpm --filter @offscreen/api-integration test:integration` for the selected focused story test only if harness supports filtering; avoid full suite until integration join.
- `pnpm wiki:change-guard --mode plan` before scope, `--mode close` with completed ledger; `pnpm repo:docs-health` for link/inventory reconciliation.

Do not interpret successful pure tests as two-Pod proof. Do not run a paid provider to "verify" the fake path. Stop on an unintended outbound provider request or a command requiring destructive/non-disposable state.

## Mandatory receipt fields

`source SHA | selected packet | fake/live | service image digest | commands/cwd | test names and counts | failure+recovery checkpoint | workflowId | generationId | attemptId | storyId | passageId | checkpointHash | canonRootHash | duplicate result | stale result | doc headings updated | NOT-RUN gates`

A result cannot be DONE merely because the fake source returns valid JSON. The decisive acceptance is saved response **through GA authoritative publication** and a real consumer reading the committed scene.
