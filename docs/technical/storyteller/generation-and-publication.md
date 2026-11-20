# Generation and publication

**Target seam:** generation ends with a **proposal**; publication is Game Authority's coherent commit of passage, visible choices with stored intent, admitted document changes, exact Library root, semantic world-state frontier and effective source/profile/rule pins. The writer never mutates canon or mechanics directly.

**Owns:** when a Storyteller operation may become a published passage, a historical report, or a held state, and what must stay unpublished.  
**Selected target:** the publication step of the [bounded controller](operation-and-controller.md#two-loops).  
**Landed prototype:** opening, continuation, mechanical consequence and historical-report tasks on the existing generation row, described in [current prototype runtime](operation-and-controller.md#current-prototype-runtime).  
**Not a claim** that the adaptive multi-round controller or a narrative director is running.

## What publication is allowed to do

Publication may admit one coherent scene outcome against the captured prior frontier: immutable passage/choices; accepted descriptive/document changes; exact resulting Library root; typed mechanical/world effects where supported; fictional clock/progress and active commitments; effective source/profile/rule pins; and causal lineage.

Publication may create branch-local operational follow-up identities after the scene is committed. Those identities are not themselves part of the fictional snapshot.

### Existing publication guarantees retained

A short authoritative publication fence may write a current passage, a fresh valid offer, source-linked descriptive notes, or a historical report attached to its original event. It checks that the scene, canonical root and current offer are still the ones the task captured. If they are stale, the operation holds or redoes only under the captured policy. It never overwrites newer canon.

Historical report attaches to the original history. It cannot supersede Now. An opening candidate never starts fictional time. Speculative or early prepared consequences stay private until exact settlement. A validator must not treat a predicted success as true.

## What publication must refuse

Publication refuses a proposal when its captured root/frontier is stale, a required source is missing or outside scope, a proposed mechanical effect lacks authority, a visible choice lacks stable intent semantics, document changes cannot produce a valid rooted Library, or the resulting scene would be advertised as forkable without enough admitted semantic state to continue it faithfully.

It also refuses attempts to copy parent/sibling future knowledge, provider attempts, leases, billing identity or external side-effect ownership into a fork. A writer's private possibility remains private possibility unless explicitly admitted as the appropriate record type.

### Existing refusal and hold guarantees retained

- A model-written item transfer, dice result, or clock advance that admission did not commit.
- A second publication of the same accepted action identity.
- A failed or uncertain provider attempt that would advance fictional time or release a decision hold.
- A repair that rewrites a settled receipt.
- Direct story writes from an evidence-investigation subphase. That subphase may return a private evidence packet only.

If generation is unavailable or the captured budget is exhausted, publication uses only still-valid prepared content or a supported fallback. Otherwise it preserves the last published situation and explains the interruption. It does not invent progress.

A failed or stale case keeps that committed situation. The scene, root, or offer no longer matches the capture, so the operation holds. Narrator text does not transfer an item, roll a die, or move the clock. A second publication of the same accepted action identity is refused. See [Step status](operation-and-controller.md#step-status). Who holds the task, who may retry it, and who publishes is [Remote task custody](#remote-task-custody).

## Scene publication fence

One scene publication selects the **post-publication** Library root and semantic world-state frontier under the same authority/version fence. The immutable passage, choices and their stored intentions refer to that boundary.

A later mechanical event is a later causal frontier. It cannot retroactively rewrite the state associated with an already published scene. Likewise, a late document-indexing or summary job may improve retrieval projections but cannot change what source root scene 37 historically referenced.

If SQL/state commit fails, staged Workdesk/Library proposals remain unpublished. If the commit succeeds but the HTTP response is lost, retry returns/locates the committed scene identity rather than generating or settling again.

### Existing fence guarantees retained

**Pre-refoundation selected/current fence detail retained.** The records being bound are the [committed pair](canonical-documents-and-packages.md#the-committed-pair): one game-state checkpoint and the canon root committed with it. The engine's publication transaction is the consistency boundary for that pair. A Storyteller process returns bounded descriptive proposals and evidence dependencies. It does not commit the checkpoint or the canon root.

One fence admits the source passage, the accepted descriptive changes, the mechanical effects the engine has already admitted, and the new canon root paired with the resulting checkpoint. It admits all of those, or none of them. A model proposal is not a direct write. Markdown and JSON projections of an accepted passage are application output, not a second model rendering.

- A lost acknowledgement is recovered from the saved operation and root. The effects are not applied again.
- A stale root, including a late provider task whose captured pair is no longer current, holds or rebuilds against an explicit fresh base. It cannot publish over a newer root.
- Concurrent publishers conflict on the expected root. One commit wins. A retry of the loser uses the new base. It does not merge by last write.
- A proposal that contradicts a committed mechanical receipt loses. The receipt stands. Prose, a rumor, or a summary cannot transfer an item, choose a die face, move the clock, or mark a living character dead.
- A second publication of the same accepted action identity is refused. Speculative consequences stay private until exact settlement.

Search indexes, Cognee, and vector stores are not part of this fence. This Change does not install them. A lagging index does not mean the commit failed, and it is not a reason to publish again.

## Remote task custody

**STORY02 scripted custody (Done, 2026-11-20):** [Closeout decision](../../../work/changes/archive/2026-11/other/2026-11-19--story02-private-task-and-result-custody/DECISION-2026-11-20.md). `createStorytellerTaskCustody` refuses provider-mode tasks and non-scripted attempts on fetch, claim, save, and read with `unsupported-execution`, inside the generation/attempt transaction. It does not adopt a provider attempt or change a provider charge through those endpoints. Scripted first claim, duplicate claim, same-hash replay, and hash conflict stay. Local `createStorytellerExecution.complete` is unchanged. Current-head proof is provider-free: contracts **7/7**, application **6/6**, Game Authority unit **3/3**, disposable PostgreSQL integration **4/4** from `apps/game-authority`, worker client and executor **7/7** (**27/27**). The negative is a provider-mode refusal and a worker that does not send. This is in-process plus disposable PostgreSQL, not a cross-Pod race. Cross-Pod acceptance remains **STORY03/TURN03**. Paid provider custody remains **TURN04**.


**Default chamber.** `storytellerV1` still awaits one `completeStoryteller` activity, and that activity still generates and publishes. Compose does not poll the distributed queues.

The engine admits one generation and holds the frozen capture: branch, narrative revision, and canon root. That generation is the operation. The distributed executor receives the frozen task through Game Authority and returns a validated result. It has no write to `story`, `campaign`, `story_passage`, or the canon-root commit. The fuller pack — injected orientation and one intention-level memory query — is still the [selected compilation and tool contract](prompts-and-tools.md#selected-compilation-and-tool-contract), not this slice. The engine commits the checkpoint and the canon root. The Storyteller proposes. There is no Game Economy service.

The engine publishes, under the story lock, through `publishStorytellerResult`. The Storyteller does not publish. `storyteller_publication` is `pending`, `published`, `stale`, or `blocked`. A row that is already `published` or `stale` returns without a second passage. A `blocked` publication of a succeeded generation may be retried from the saved result. That retry does not call the model.

`storyteller_attempt` is the attempt record. Its states are `reserved`, `dispatched`, `settled`, `uncertain`, and `unsent`. `storyteller_operation` and `storyteller_usage_allocation` sit under that same envelope. This contract adds no second billing ledger and no extra model round.

| Attempt state | What the row means | Who may send |
| --- | --- | --- |
| `reserved` | The reservation is open. Dispatch is not recorded. | A second delivery does not send. The same attempt may still go out once. |
| `dispatched` | Dispatch is recorded. The outcome may still be open. | Nobody sends again. |
| `uncertain` | A send may already have reached the provider. The charge is unknown. | Operator reconciliation only. The reservation stays. |
| `unsent` | The provider was confirmed not to have been sent. The charge is zero. | The same request may be dispatched again under the same operation envelope. |
| `settled` | The charge is recorded. | Reuse the saved result. No second spend. |

Temporal may redeliver the activity. The engine may enqueue an explicit recovery when the saved attempt allows it. A redelivery after a possible paid send reads this row and does not open another charge. A scripted task may recompute its pure result. It does not create a provider charge. When no provider is configured, the ordinary executor and the memory-exploration branch record `provider_disabled` and return before the provider call.

Default chamber code. `packages/workflows/src/index.ts` `storytellerV1` calls `completeStoryteller` once. The activity retry policy allows five attempts. `apps/worker/src/activities/index.ts` binds Storyteller and game collaborators in one worker, and `completeStoryteller` calls `createStorytellerRuntime.complete`. That method may run `createStorytellerExecution` and then calls `publishStorytellerResult` before it returns. Those are two modules inside one activity. They are not two activities. A retry of the activity is a redelivery of the whole operation. The generation row and the attempt row are what stop a second scene and a second spend. The in-memory generation set serializes only one process. After a restart, the durable rows decide.

**STORY02 evidence (`ec73a535`, 2026-11-20, not closure).** Provider-free proof with two independent private HTTP clients against Game Authority task/claim/save/read routes on a disposable PostgreSQL database: duplicate claim yields one persisted `storyteller_attempt` id; duplicate same-hash save is idempotent; read-saved returns the same hash. Negatives exercised: conflicting result hash, wrong pinned root, missing or wrong story token (**401** / no task leak). This tier is **in-process integration with two HTTP clients**, not separate executor Pods or a Kubernetes race. It does **not** prove cross-Pod claim idempotence, does **not** adopt the generation row to `succeeded`, and does **not** split `storytellerV1`. Multi-Pod executor custody remains unproven until a distributed proof runs.

**Distributed control publication (T07, parent `44272d9a`, local slice of the archived proof).** `storytellerDistributedV1` is a separate workflow type, not a patched `storytellerV1`. Its publication activity, `publishSavedStoryteller` on queue `control`, calls Game Authority `POST /internal/v1/storyteller-generations/:generationId/publish` with the control token. That activity does not open SQL and does not call `publishStorytellerResult`. Game Authority adopts the saved attempt and commits the passage. `published` and `already_published` finish the activity; `stale`, `blocked`, and `refused` do not retry. A down Game Authority is retryable `PublicationUnavailable` and does not fall back to the combined worker. Control boot refuses `DATABASE_URL` and the other broad SQL environment keys. Executor and story tokens receive **401**. Disposable proof: worker control-publication unit **6/6**, Game Authority publish unit **6/6**, and `apps/worker/test/story03-distributed-handoff.live.test.ts` **1/1** on `offscreen_auth_test` with local Temporal (`STORYTELLER_LIVE_ENABLED=false`). That live case starts the workflow by hand and is not a player HTTP campaign. The outbox start remains a direct Temporal RPC. RabbitMQ does not start the workflow, and the story SSE stream stays off RabbitMQ.

**Notice topic freeze (T08, parent `1a0afb80`, local slice of the archived proof).** Later wakes reuse the Storyteller topic already stored for that operation. They do not call `selectStorytellerNoticeTopicAtAdmission`. Disposable proof: `packages/application/test/story03-notice-topic-freeze.test.mjs` **6/6** plus the existing selector unit **2/2**. A distributed admission stayed distributed after the flag was removed. A legacy admission stayed `storyteller.profiled.v1` after the flag was set. A missing Storyteller notice throws. Two Storyteller topics on one operation throw and leave the rows unchanged. Worker dispatch **6/6** still routes the persisted topic; legacy recovery keeps `storyteller/${noticeId}` and distributed recovery keeps `storyteller/${generationId}`. This does not by itself prove a signed-in multi-process campaign.

**Local causal turn (T09, parent `0834db2e`, local slice of the archived proof).** `pnpm --filter @offscreen/api-integration test:story03-t09:causal` on disposable `offscreen_auth_test` with Compose Temporal: **5/5 PASS** in about 31s. `STORYTELLER_LIVE_ENABLED=false`. An authenticated player uses HTTP for the draft, the opening request, story start, and the choice. Nest and Game Authority are separate HTTP servers. The relay, control worker, and executor are separate OS processes. The opening and the continuation notices are `storyteller.distributed.v1`. Scene 1 is “Morning in the pineapple”; scene 2 is “Gary’s promise”; passage sequences are `[1, 2]`; the continuation has one attempt and publication `published`. Restarting the workers leaves the same passage ids. Negatives: the other actor cannot read or advance the story; replaying the same resolution does not add a passage; with the executor stopped the revision stays 1, and starting that process finishes scene 2 without a second command; with Game Authority stopped the revision stays 1. The document store is the local filesystem. This is not a browser session and not a cold kind deploy.

**Publish acknowledgement loss and stale saved result (T10–T12, branch `change/story03-local-negatives`, local closure).** The same causal command is now **7/7 PASS** in about 46s. A harness-only loopback proxy in front of the control worker drops the first successful continuation `published` response after Game Authority has committed. The activity retries, the publication row stays `published`, passage sequences stay `[1, 2]`, and the continuation has one attempt. The opening publish is not dropped. A second harness proxy holds the continuation save response after Game Authority has stored it. The test kills the executor while the story is still revision 1, then starts that process again. The retry reuses the saved result: one attempt, publication `published`, sequences `[1, 2]`. Separately, `packages/application/test/story03-stale-saved-publish.test.mjs` is **2/2 PASS** on a disposable sandbox database: a saved continuation whose `narrativeRevision` is behind `story.revision` returns `{ status: 'stale' }`, keeps that revision, and adds no passage; a matching revision is not marked stale. Browser, SSE, and a cold kind deploy remain unproven.

**Negative.** The existing Temporal activity cannot be treated as two independent operations. A second delivery of the same operation does not create a second publication. A task captured at scene 10, narrative revision 10 and that scene's canon root, does not publish against the scene-20 canon root. Publication marks the row `stale` and writes no passage when `story.revision` is no longer the captured `narrativeRevision`. Where a context-capture row exists, publication also requires the current `documentRootHash` to match the captured root, and a mismatch is `stale`. The scene-20 root is not adopted as scene 10's publish base.

## Generation identity

The durable generation row is the operation receipt for one admitted task, not a permanent agent thread. Provider request bytes are disposed with the operation. The game keeps the canonical life and the operation receipt: cost, outcomes, evidence-use and redacted evaluation. A new event creates a new task from canonical source. Previous provider round messages are not blindly appended.

**Negative:** schema-valid JSON is not publication. A queued generation is not a completed repair. `202 accepted` is not `published`. See [provider boundary](provider-boundary.md) for reserve, wire equality and uncertain charge.

## Contract dependencies

| This claim | Relation | Governing claim | Why a change triggers review |
| --- | --- | --- | --- |
| [Remote task custody](#remote-task-custody) | constrained-by | [Storyteller workflow identity](../platform/execution-and-delivery.md#storyteller-workflow-identity) | The single activity and the future workflow type have to stay the same claim. A patched `storytellerV1` would rewrite histories this section leaves on the combined activity. |
| [Remote task custody](#remote-task-custody) | constrained-by | [Proposed service ownership](../platform/topology.md#proposed-service-ownership) | The engine publishes. The Storyteller proposes and does not commit the checkpoint or the canon root. |
