> **Terminal owner disposition:** TURN03 cancelled by owner 2026-11-27 because the monorepo and agent runtime will be fundamentally redesigned. Legacy scripted-path proof and architecture-specific recovery matrix are retired, not transferred as pending requirements. Historical evidence retained; no PASS inferred, existing implementation untouched. Future acceptance must be designed against the new architecture; preserve authorization, private data isolation, authoritative state integrity, idempotency, financial safety and truthful evidence. No dispatch or live authorization.
> All previous status, prerequisites, commissions and instructions below are historical only.

# TURN03 | 2026-11-22 source-rebased cold-kind executable acceptance

> **Current execution clarification, 2026-11-23:** [Source-exact HTTP/custody map](SOURCE-ROUTE-MAP-2026-11-23.md) and [next execution stages R1–R4](NEXT-EXECUTION-2026-11-23.md) supersede the older synthetic runner implementation route below. R1 is a narrowly bounded **source-only, mock-tier** route correction. Full authenticated live operator (R2) is still planner-blocked pending test actor, S3 and read-only custody evidence decisions. One release-kind run (R3) is a distinct authorized action. Do not close TURN03 on R1 or conflate it with K8S10 fault execution.

> **2026-11-23 current-HEAD audit at `ade6cfbf`:** The blocked failure described below is a **historical 2026-11-22 release observation**. The integrated Worker now classifies `pending-consequence-not-settled` as **retryable** in `storyteller-distributed-control.ts`; narrative settlement calls `scheduleWriterContinuation`. Neither proves a live scene2 publication. Critically, `infra/verification/release-acceptance/turn03/run.mjs` is still an injected/mock-trace mapper and marks cold-kind gates NOT-RUN, with no complete live operator entrypoint. **Do not spend a full release rebuild/test expecting this runner to PASS yet.** Finish the real cross-Pod/authenticated runner first, then perform read-only `kind-offscreen-lab` preflight and one guarded scripted acceptance. [Cross-packet audit](../../../../../undertakings/storyteller-workshop/RELEASE-PROOF-AUDIT-2026-11-23.md).

**State: OPEN. Overall is not PASS.** Source `752ed422` is on `origin/undertaking/storyteller-workshop`. This lab is the DXK08 Tilt dev workspace, not a cold release image.

**2026-11-22 acceptance window refused at exclusivity.** `tilt up --port 10351` (pid 521222, started 17:20) has cwd `/home/dskul/projects/offscreen-rpg-dxk08` and is listening on `127.0.0.1:3000`. No release install, migration, or fault was run. Integration HEAD is still `752ed422`.

**Earlier window note.** Second-cluster changes to `lib.sh` are paused. The existing `offscreen-lab` cluster can host cold-release install and N5/N7/N8/N10 only while no other session uses that cluster. `tilt down` is not the stop procedure, because the dev Tiltfile owns the app deployments. Postgres volumes and object storage stay. The release installer replaces app deployments and can rerun `game-migrate` on the same database. N5/N7/N8 stop Temporal or worker pods for every story. N10 may touch only a copied checkpoint object for a new disposable story. No mutation from this plan has been run.

**Earlier acceptance-environment note.** `infra/clusters/kind/release/lib.sh` hardcodes `CLUSTER_NAME=offscreen-lab` and `CONTEXT_NAME=kind-offscreen-lab`. Postgres, Temporal, object storage, and `app-release/install.sh` source that file and use fixed namespaces. The app installer copies the shared `lab-pg-app` URI and `object-store-s3` keys. A flag on the app installer alone cannot own a separate database, bucket, Temporal namespace, and workers. Changing `lib.sh` would retarget every shared lab script. Nothing was provisioned and the Tilt lab was not modified.

**Earlier remaining-campaign note.** N5, N7, N8, N10 and the cold-release gate stay outstanding. A second database name, bucket prefix, and Temporal namespace are not enough isolation. The fault batch needs its own database login, S3 bucket, Temporal namespace, workers, task queues, outbox dispatcher, and credentials. `install.sh` only applies release images to context `kind-offscreen-lab` and replaces the web, API, Game Authority, and worker deployments already used by this Tilt lab. No existing script creates that separate bucket and worker set without the larger DXK09 platform. The shared lab was not stopped, and no shared checkpoint was deleted. Cold-release images were not built or deployed, so Tilt tags are not being offered as release digests.

Provenance: `game-authority` image `offscreen-lab-dev-workspace:tilt-build-1795362061`, `game-api` `offscreen-lab-dev-workspace:tilt-build-1795361908`, `game-web` `offscreen-lab-game-web:turn02`, `game-control` `offscreen-lab-dev-workspace:tilt-build-1795366201`, `game-executor` and `game-relay` `offscreen-lab-dev-workspace:tilt-build-1795361994`. The control process `node dist/src/bootstrap/control-main.js` is pid 290, started after `passage-documents.js` in that container contained `publicationCanonOwnerAllowed`. That is process-loaded dev output, not an immutable release digest.

Fresh scripted launch `2b06346c-5ed8-4fd9-af13-7876a12d99b0` returned HTTP 200 `ready` for story `2cce6295-dd38-4217-8bc3-6a64da8e7f06`. It has one passage and one checkpoint at scene 1 (`099cb00992eb`) and scene 2 (`e29ea579e981`). Action `eb107d79-8d22-42f7-83bf-c3745aa08624` was stored once. Its first HTTP response was 503. Outbox `campaign.action.v1` and `writer.scene.v1` mission `3645fbf7-96e9-42d7-a174-920a6ec8b02c` were delivered. The SSE stream was closed (`readyState` 2) with no hint. A later signed-in GET returned HTTP 200, revision 2, and scene 2 returned HTTP 200.

| Gate                                     | Status                   | What the evidence actually is                                                                                                                                                   |
| ---------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| cluster-real-app                         | BLOCKED                  | Release install replaces the shared `kind-offscreen-lab` deployments. No second cluster or immutable digest was produced.                                                       |
| candidate-start                          | observed for this launch | Signed-in scripted launch reached a ready story and scene 1.                                                                                                                    |
| auth-ssr                                 | observed                 | The same session loaded `/play/e757f6d0-…` and the new story GET.                                                                                                               |
| command-temporal-executor                | observed                 | Fresh action wake was delivered and scene 2 was published.                                                                                                                      |
| ga-scene-publication                     | observed                 | One checkpoint per scene on the new story and on the fork through scene 3.                                                                                                      |
| sse-get                                  | observed for N13         | Disconnected stream, then GET showed revision 2. No hint was received.                                                                                                          |
| historical-fork-independent-continuation | observed                 | Child `e757f6d0-…` scene 3 checkpoint `8f31de02713d`; parent still revision 2 with two passages. Scene 2 of that child was a direct publisher call. Scene 3 was a new workflow. |
| recovery-negative-matrix                 | BLOCKED                  | N1, N3, and N13 were observed on the shared lab. N5, N7, N8, and N10 were not run: no disposable bucket, login, workers, and queues exist apart from that lab.                  |

Confirmed defects, not fixed here:

- `scheduleWriterContinuation` inserts a `writer-scene` generation as `pending` and a funding operation as `open`. `publishAcceptedWriterScene` does not move either to a terminal state after a successful scene. Owner: `packages/story-engine/src/storyteller/writer-continuation.ts` and `writer-continuation-publication.ts`.
- `StoriesController.run` turns a non-`StoryError` from the read after `campaignAction` into HTTP 503 `Story unavailable`. The command row is already committed. Owner: `apps/api/src/modules/stories/controller.ts`.

**Scene 2 and scene 3 record, retained:**

Scene 2 of child `e757f6d0-…` was committed by one direct `publishAcceptedWriterScene` call after Temporal refused to rerun `writer-scene/af143bcb-…`. That proves publication and idempotent replay of that function (`replayed: true`, same passage). It does not prove workflow recovery.

Scene 3 is the later distributed turn. Signed-in action `110a31e0-34e0-4a88-83c0-ae9a77fb6954` (`scripted-2-a`) was stored once. Outbox `campaign.action.v1` and `writer.scene.v1` mission `a809f056-872c-422a-979a-0c4e0dd6d0a2` were delivered. The child has one passage and one checkpoint at sequences 1, 2, and 3 (`8f31de02713d…` at scene 3). The parent still has two passages. Repeating the same action returned HTTP 200 and did not add a command or a passage. The first response was again HTTP 503 `Story unavailable` even though the command committed.

`writer-scene` generations `759d7719-…` and `8ef6e199-…` are still `pending`, and their `storyteller_operation` rows are still `open`, including after successful publication. The writer-scene scheduler inserts those states and no later writer-scene path sets them to a terminal state. That is missing settlement, not a reason to edit the rows by hand.

Gates against this lab run: fork and independent continuation observed; one fresh command reached publication through the outbox; N1 and N3 observed earlier; N13 did not cover a lost hint after a real advance; N5, N7, N8, and N10 were not run. Image digests, a brand-new story launch, and automatic recovery of the failed workflow remain unproved.

**Scene 2 record, retained:**

Child `e757f6d0-c94d-4cf9-8a8b-96e4f3364d86` is revision 2 with passages 1 and 2. Scene 2 checkpoint `34c3118ad1ca…`, passage content `92b68f754fb2…`. Parent `643837e6-fe57-4e5b-a994-75c2a1fc829d` is still revision 2, scene 2 checkpoint `6c84cc65a0fe…`, content `af752e56f484…`. A second call of `publishAcceptedWriterScene` for mission `af143bcb-1ec0-479e-876f-d68c810cd736` returned `replayed: true` and the same passage id.

The publication failure was `StoryError('conflict', 'document_root')` in `stageStoryPublicationDocuments`: the inherited manifest `campaignId` is the parent story, and the check required it to equal the fork id. `752ed422` allows that source id only when the fork row names it. Another campaign id is still a conflict. Temporal will not start `writer-scene/af143bcb-…` again (`REJECT_DUPLICATE`, non-retryable hold), so the publication function itself performed the one commit.

**Earlier observation, retained:**

**State: OPEN. Independent continuation is not complete. Overall is not PASS.**

Observed 2026-11-22 on the DXK08 Tilt lab, owner `Tz8M253C6b1YfnUnEFIMxbzVSLw6jqIq`:

- Historical fork `e757f6d0-c94d-4cf9-8a8b-96e4f3364d86` from parent `643837e6-fe57-4e5b-a994-75c2a1fc829d` scene 1 returned HTTP 200. Child has passage 1 only. Parent remains revision 2 with passages 1 and 2.
- Signed-in `PUT /api/stories/e757f6d0-…/actions/10559db7-45d0-4003-8959-0737b844599d` admitted `observe` once. The first response was HTTP 503 `Story unavailable`. The identical retry returned HTTP 200. `campaign_command` still has one row. Child revision stayed 1.
- Generation `8ef6e199-f227-4ab3-8273-cdee9ac04f25` is `writer-scene` / `pending`. Writer mission `af143bcb-1ec0-479e-876f-d68c810cd736` was committed and is `proposal-ready`. Outbox `writer.scene.v1` for that mission was delivered. Temporal workflow `writer-scene/af143bcb-1ec0-479e-876f-d68c810cd736` failed with `publication_failed`. The publication exception was discarded by `finalizeSettledWriterRound`. Scene 2 was not committed.
- N1: no cookie and a forged session cookie both GET the child as 401.
- N3: the duplicate observe did not add a second command.
- N13: the child event stream opened and was closed with no hint. The following GET stayed revision 1. A lost-hint-after-publication case is not demonstrated.
- N5, N7, N8, and N10 were not run.
- Game Authority is running a partial Story Engine emit. In-pod `tsc` was OOM-killed. That workaround is an environment limitation, not a full-build result.

**Earlier blocked state, retained:**

**State: BLOCKED. TURN03 stays open. No gate is PASS.** Rerun against `71d15dc0f9d72f70a6cc4a830c2511c85cfe0877` with rebuilt API, Game Authority, and worker images. The running Game Authority bundle contains `situationAuthorization`. Scene 2 still does not publish.

- Gate: `ga-scene-publication`.
- Fresh mechanics-enabled story `f2636177-3cb1-40d7-ba36-d1894ac600af` from opening content `seyda-neen-arrival.v1`. Action “Ask about the road to Balmora” settled at game second 60. Generation `aee1235d-96bc-4220-8d69-5553974acdd5` is `pending-consequence` / `succeeded`. Publication stayed `pending`. Workflow `storyteller/aee1235d-96bc-4220-8d69-5553974acdd5` failed non-retryable with `state_not_representable`. Story revision stayed 1, one passage. No provider call.
- Source: `packages/story-engine/src/storyteller/publication-candidate.ts` `stageConsequencePublicationCheckpoint` turns a `SceneAfterStateError` or a failed v2 checkpoint parse into `StoryError('conflict', 'state_not_representable')`. TURN03 cannot edit Story Engine.

The public `/demo` page is a browser-only excerpt and is not this proof. Overall remains `BLOCKED`. Original TURN03 Change and prior lower-tier evidence remain historically valid. **Do not create another TURN change folder.** No paid provider, no protected DB mutation or destructive cluster reset.

## What actually exists now

- `tools/api-integration/test/helpers/turn03-distributed-poc-proof.ts` exports schema `offscreen.distributed-poc-proof.v1`, eight mandatory IDs (cluster-real-app, candidate-start, auth-ssr, command-temporal-executor, ga-scene-publication, sse-get, historical-fork-independent-continuation, recovery-negative-matrix), `computeTurn03DistributedPocProofOverall`, admissibility that rejects mocked/incomplete PASS, and kind-cross-pod requirement for six gates. Reuse it, **do not invent a second proof schema**.
- `tools/api-integration/test/helpers/turn03-distributed-poc-fixture.ts` has the orientation-only zero-obligation golden start; `turn03-distributed-poc-fixture.integration.ts` local fixture 4/4, and `story03-causal-multiprocess.integration.ts` local real process T09 5/5 previously reported. Those are lower-tier proofs, not cold kind.
- `infra/kubernetes/lab/app-release/{build.sh,install.sh,overlay/{authority,edge,workers,migrate}.yaml}` owns the actual Next/Nest/GA/Worker release. `install.sh` checks exact kind context `kind-offscreen-lab`, image tags and prerequisites; reads OAuth app values from **uncommitted root .env**, constructs secrets without printing them. Do not bypass those gates. `infra/kubernetes/lab/{up,smoke}.sh` owns overall cluster; K8S11 Gateway SSE still needs a real result.
- Direct SQL outbox→Temporal is the actual game wake; optional RabbitMQ postcommit projection is NOT a prerequisite. Real player auth is necessary for browser/SSR, not a header bypass.

## Executable outcome

One **dedicated runner and proof collector**, under `infra/kubernetes/lab/app-release/turn03/`, which:

1. Performs **read-only** source-image/context prereq validation and emits a complete `offscreen.distributed-poc-proof.v1` report with NOT-RUN/BLOCKED truthful state even if cluster, OAuth or tools are missing.
2. On explicit `--run-disposable-kind` AND passing context/namespace/image/credential guards, uses existing app-release image build/install scripts (never recreates/kills cluster), establishes authenticated browser/Next SSR & Nest API + GA operations, scripted Storyteller scene 1 → visible command → direct outbox/Temporal executor → GA scene2 commit → SSE hint plus authoritative GET → historical scene1 fork with separate future. Record exact owner/story/candidate/generation/workflow/attempt/passage/checkpoint/root identifiers and image digests. Each gate can be PASS only with matching actual cross-Pod evidence, not invocation of an in-process class.
3. Exercises wrong actor/cookie, duplicate/lost notice, stale root, unavailable S3, executor kill/restart after persisted result, delayed/lost SSE corrected by GET, source-scoped fork and child continuation; record the negative matrix with PASS/FAIL/NOT-RUN. No provider send or external funded request. If auth is unavailable, mark auth-dependent gates BLOCKED; do NOT counterfeit a signed-in session.
4. Emits source-commit/image digests/command logs/correlation report to a unique run directory under `evidence/` via the existing report writer; secrets redacted; no destructive cleanup of unrelated clusters/volumes. Any mandatory NOT-RUN/BLOCKED means TURN03 remains open.

**Exclusive writes:** `infra/kubernetes/lab/app-release/turn03/**` new runner/check/tests only; an explicit package-level command under `infra/kubernetes/lab/app-release/` if necessary; uniquely named `tools/api-integration/test/turn03-cold-kind-evidence.test.ts` (pure report validation, not fixture or existing helper edits); `work/changes/open/.../TURN03-CURRENT-EXECUTION.md` and packet docs; final evidence, runbook and ledger **owned by integration custodian**, not concurrent parents. **Do not** edit `apps/api/**` (MA12), `apps/game-authority/**`, `apps/worker/**`, `packages/story-engine/**` (WR10), existing TURN03 fixture helper/tests, Kubernetes common overlays, workspace manifests or lockfile. Any genuine runtime integration defect returns exact source/trace to ChatGPT rather than an unowned cross-lane edit.

## Tasks, one bounded executor at a time

**T01, immutable read-only preflight/report:** inspect `infra/kubernetes/lab/app-release/{install.sh,build.sh,overlay/edge.yaml}`, existing `tools/api-integration/test/helpers/turn03-distributed-poc-proof.ts`. Write `infra/kubernetes/lab/app-release/turn03/{preflight,report}.mjs` and tests. Verify exact expected context, image tags, auth prerequisites and no-run behavior, never print secret material. Positive missing auth->BLOCKED report, negative fake tier never PASS.
**T02, single scripted cold trace:** inspect `tools/api-integration/test/helpers/turn03-distributed-poc-fixture.ts`, `story03-causal-multiprocess.integration.ts`, `infra/environments/release/install.sh`, `tools/api-integration/test/turn03-distributed-poc-proof.test.ts`. Implement `turn03/run.mjs` with exact sequence above using existing API/GA endpoints and scripts; do not import the in-process fixture to claim remote evidence. Record stable source SHA/image digests and dynamic IDs, no hardcoded real story IDs. Positive local mock HTTP sequence verifies the runner's field mapping only, negative missing scene1 checkpoint/fork proof=>overall NOT-RUN/FAIL.
**T03, adversarial gates:** extend runner and pure fake HTTP/CLI tests in `turn03/*.test.mjs` and new uniquely named `turn03-cold-kind-evidence.test.ts`. Require full 8-gate report, cross-pod proof and explicit negatives. If real cluster exists and the user has explicitly allowed disposable kind run, execute `--run-disposable-kind`, otherwise record BLOCKED/NOT-RUN (do **not** falsely archive TURN03).
**T04, bounded join:** after WR10 and MA12 branches are joined by custodian, run real cluster against the integrated combined HEAD, reconcile image SHA and run results; archive TURN03 only if all mandatory cold-kind gates genuinely PASS. If not, preserve open status with one exact next blocker and evidence path; do not ask for arbitrary another 3 packets to make result green.

## Parallel and stop contract

TURN03 harness source work can proceed **in parallel** with WR10 and MA12 because write sets are disjoint. Full cold-kind run happens **after both integration branches join**, to avoid stale-image false positives. One cluster operator and one Docker image owner, no conflicting installs. No paid provider. Abort and report if actual prerequisite cannot be met without editing a different Change's owned file, if auth cannot be obtained, if a required checkpoint is absent, or if the system returns two applied effects for one logical command. Do not mark code harness Done as full POC DONE unless the cluster and browser path passes.

**In-context aim:** today’s independently valuable outcome is a repeatable, truthful cold-kind product-release proof that can reveal failures. It is not another mock scorecard. Existing Change remains the same unique TURN03; old historical instructions are superseded for current execution by this source rebase.

## Mechanics-free v2 historical fork (decided contract, not this correction)

Product contract: a player may fork a published v2 scene whose fictional state has `mechanicsAbsent: true`. `mapV2ForkState` in `packages/story-engine/src/stories/fork-state.ts` still throws `ForkStateError('mechanics_absent')` for that snapshot, which the HTTP fork maps to `409 fork_mechanics_absent`. This checkpoint-validation correction does not change that guard.

A later bounded execution plan has to reconstruct, from source, every dependency of a mechanics-free fork before implementation:

- `mapV2ForkState` and the identities it remaps (`storyId`, passage, canon root, ancestor).
- The scene-1 checkpoint object written by the scripted opening (`fictionalState.mechanicsAbsent: true`, no campaign row).
- `packages/story-engine/src/stories/forks.ts` admission, expected revision, and the selector insert.
- The web historical-fork client (`apps/web/src/features/play/use-fork-historical-scene.ts`, `historical-fork-story-id.ts`) and `PUT /api/stories/:sourceStoryId/forks/:forkStoryId`.
- What a child story is allowed to contain when the parent scene has no character, location, clock, holds, offers, or activity plan.
- Positive proof: fork of a mechanics-absent scene 1 creates an independent child. Negative proof: a drifted or unmapped checkpoint still fails closed.
