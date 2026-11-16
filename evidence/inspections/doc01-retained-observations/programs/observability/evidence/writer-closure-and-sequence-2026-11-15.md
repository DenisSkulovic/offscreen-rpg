# Wave-4 writer closure | Which writes need a story frontier, which need only causal links?

**Status:** source-level design audit, `main@7e15db38`, 2026-11-15. **No checkout-wide ripgrep, runtime SQL tracing or tests were run.** This pass inspected the application campaign/story/Storyteller/generations/draft/admin writer files and worker provider composition through the GitHub connector, beyond the [first writer audit](./mutation-writer-audit-2026-11-15.md). It is **source-grounded but not a proven exhaustive execution graph**. [Operational capture rules](../../../../../../docs/technical/observability/capture-and-provenance.md).

## 1. Key refinement: three independent histories, linked rather than flattened

**Stop trying to put everything into one giant event-number space.**

| History | Source authority | Ordering contract | What belongs in it |
| --- | --- | --- | --- |
| **Game committed frontier** | Story/campaign SQL transaction and original operation/receipt | Per-story counter allocated **inside the same story-lock transaction**; optional ordered within-commit subevents | Earned mechanics, character/items, accepted plans, factual time, holds, world obligations, settings, canon root and published passage |
| **AI/worker lifecycle** | `generation` / `storyteller_context_capture` / `storyteller_attempt` / `storyteller_publication` / outbox/Temporal source rows | Per G, attempt, operation and source state revision; **causal graph**, not fictional time sequence | Captures, materialization attempts, provider sends/rounds, funding, validation, retries, stale or published candidates |
| **Private visitor and administrative history** | `story_viewer_visit(_open/_ack)`, `admin_audit_event`, cases, grants, request access intents | Independent subject/session/case audit timestamps and idempotency | Visit/ACK, staff case actions, privilege changes, protected packet disclosure |

A single event may point from AI lifecycle to a game frontier **only if that publication/settlement really committed**. `generation.succeeded` is not proof of a new scene. A Temporal activity may retry while the original game/AI identity stays unchanged. An Admin GET can create an audit/visit record without changing the game.

## 2. Detailed writer closure and capture disposition

### 2.1 Committed story/game writers (E0 candidate)

| Source file / writer | Observed source effect | What a replay-complete E0 adapter must provide |
| --- | --- | --- |
| `stories/initialization.ts`, `start.ts` | story first passage/items, optional root/initial gameplay | Genesis snapshot, original Start/G/draft source, no event on duplicate no-op |
| `stories/forks.ts` | current limited revision-1 fork; copies story/items/settings/campaign | New child-story genesis + fork origin pointer, **not** arbitrary past checkpoint, no source paid cost inherited |
| `stories/continuation.ts` / `persistence.ts::applyStoryItemEffects` | item create/transfer, new passage, optional canonical commit and scene anchor | Atomic old/new holder/fact/root and source passage, exact response/plan source and subevents |
| `stories/documents.ts` | canonical root manifest change | Pinned old/new root hash/revision and edit operation ID; immutable stage outside lock |
| `stories/timing.ts` | accepted decision default and interval pause/resume/advance | Actual committed choice/time/control state; due estimates only in the live projection |
| `campaign/settings.ts` | start settings+campaign, profile update, pace revision | Effective config source revision, old/new pointer and clock/hold anchors |
| `campaign/actions.ts` / `custom-intent.ts::createCustomIntentAcceptance` | finite/process/resume admission, activity/action creation and active campaign state | Accepted original plan, resulting active commitment, no outcome claim at admission |
| `campaign/action-executions.ts` | settle/interrupted action, receipt, roll, time, world/hold followups | Exact received/recorded effects, no success receipt on interruption, one transactional result |
| `campaign/activities.ts` / `accepted-plans.ts` | multiple progress/check boundaries per transaction, accepted child plan | **Ordered within-commit** mechanics before/after each material change, one committed outer frontier |
| `campaign/controls.ts` / `action-execution-controls.ts` / `accepted-plan-controls.ts` | pause/resume/cancel/pace and possibly due settlement | Order child settlement before control change; no restoration of future cancelled plans |
| `campaign/world-obligations.ts` / `world-obligation-controls.ts` | condition changes, obligation fired/updated, source event, holds and follow-up | Actual world source revision/condition old/new, boundary and controlling intent |
| `campaign/holds.ts` | storyteller-intent→G, world→G, G→decision or consume hold | **Old/new exact hold owner** with causal ID and capture of clock anchor and reason |
| `storyteller/publication.ts` | on successful consequence commits passage/offer/hold/new actor scene; report may update separate hook | **Game frontier only for actual published/committed changes**; failed validation/blocked publication stays AI history |
| `storyteller/memory.ts::publishStorytellerNotes` | updates **mutable `story.continuityNotes`** inside caller's story transaction | **Previously underemphasized writer:** old/new notes and source evidence for patches, separating current vs arrival, never early future notes |
| `campaign/persistence.ts::refreshOffer` | updates current campaign offer/situation | Relevant old/new offer authority and source transition; no fake new player action |
| `storyteller/records.ts::setPublication` | updates only publication status | **Not E0 game frontier** unless combined with a real gameplay publish in same transaction |

**Important nuance:** do not allocate a new story sequence every time `campaign` is touched. Some updates are internal metadata/lease/clock-anchor changes without new player-visible facts. The contract must list *eligible meaningful transitions* and explicitly mark metadata-only operations; if a clock-anchor change alters future mechanics, it is a **real** state transition even when it has no prose.

### 2.2 AI lifecycle, worker and funding writers (E1/AI stage graph)

| Source | Observed SQL/source | Chosen evidence strategy |
| --- | --- | --- |
| `storyteller/context-capture.ts` | frozen pending/C1/C2 capture, provisional G, `storyResolution`, outbox | Reuse one G; link captured source/authority. No separate game outcome until mechanical settlement |
| `capture-materialization.ts` | materialization lease/failed/ready, G promotion and outbox | One G with source provenance and attempt-state transitions; CAS only off story lock |
| `capture-rearm.ts` | operator rearm record/epoch, original-topic wake | Preserve original frozen input, unique authorized recovery; admin/security audit separate |
| `storyteller/execution.ts` | `generation.state` pending→running→succeeded/failed/uncertain; some transitions through direct autocommit UPDATE, not an outer game transaction | Capture source-attributed stage on **the same SQL transaction or atomic statement as the state** if declared E1-critical; never give an arbitrary later log the same evidentiary guarantee |
| `storyteller/budget.ts` / `window-accounting.ts` | account/run/attempt reserved/dispatched/uncertain/settled/charged; separate DB transactions | Use existing financial ledger as truth; append only missing causal evidence, not a second charging ledger or game frontier |
| `dispatch-review.ts` | persisted prepared packet+SHA, review held/released/rejected | Exact packet custody and decision status; separate from actually possible provider send |
| `memory-exploration-controller.ts` | many snapshot/pending round state updates and final output | Small per-round attempt/visible tool/source references; not 800 log lines and not an invented reasoning stream |
| `storyteller/recovery.ts` / `openings.ts` / `runtime.ts` | retry/release/block status changes | Existing generation/retry/source revisions; observable stage transitions where otherwise overwritten |
| `generations/service.ts` / scripted openings/continuations | general generation claim/settle, scripted and draft generation path | Distinct generation-kind stage graph; don't reuse Storyteller task semantics for every generic generation |
| `outbox/index.ts`, `apps/worker/src/outbox/*`, `apps/worker/src/activities/index.ts` | durable notice lease/ACK, Temporal workflow start/Activity and duplicate handling | Stable `noticeId/topic/operationId/workflowId/runId/activityId` edges + optional OTel spans; not player-story event |

**Source warning:** `storyteller/execution.ts::saveOutcome` uses direct SQL UPDATE with a revision fence. A forensic stage inserted in a **later transaction** could be lost or duplicated across crash. Design a tight transactional helper where atomic evidence is actually required. Do not move a provider call inside that transaction.

### 2.3 Intents, perspectives and controls outside the game ledger

| Source | Why not the E0 game sequence? | Required separate evidence |
| --- | --- | --- |
| `campaign/custom-intent.ts::interpretCustomIntent` | Candidate/clarification/rate count is not an admitted action or earned game time | Private interpret operation provenance and abuse/retention policy; once accepted, link to real game command |
| `stories/visit-checkpoint.ts` | GET creates visit challenge row; ACK advances viewer marker, not world | Per-viewer bounded read/ACK identity; historical Replay GET must **not** advance it |
| `application/admin/session.ts, access.ts, case-writes.ts` | Staff session/assignment/case changes are control-plane, not game world | Proven staff action/case/grant/disclosure audit, case scope and expiry; never SQL full body dump |
| `application/drafts/index.ts` | Player draft edits before story Start; no world state yet | Draft revision/owner/edit source, later opening/Start lineage |
| `application/developer-tools/*` / QA rows | Test fixture/Chamber may create separate replay data and model evaluations | Synthetic run identity, environment, price cap and provenance; no conflation with real player history |

## 3. Source-level gaps requiring actual writer adapter review

**Highest-priority systematic omissions in older audit:**

1. `storyteller/memory.ts::publishStorytellerNotes` mutates `story.continuityNotes`. A replay that saves only passage/root/actor can miss an influential memory change, causing later Storyteller input to differ.
2. `campaign/holds.ts` changes `clockAnchorAt` as it transfers control. This affects future timing, not just UI metadata. Record old/new clock anchor/eligibility when consequential.
3. `stories/timing.ts` can execute an automatically defaulted decision after a persisted deadline. Its **real accepted transition** must appear with response provenance (`default`), not “the player clicked”.
4. `campaign/activities.ts` can process up to 24 effort boundaries and multiple scheduled checks **in a single SQL commit**. If the forensic output includes within-commit steps, use actual original rule order and distinguish conceptual intermediate calculation from persisted after-state.
5. `stories/visit-checkpoint.ts` writes a visit-token record from a GET. The player Replay endpoint must use separate read logic and not create a “last opened current story” acknowledgment.
6. `storyteller/execution.ts` writes some generation state **outside story lock**. Never order them by fictional game seq; use stage receipt/attempt state revision and explicit causal G.
7. `storyteller/config.ts::readStorytellerWorkerOptions` has [pre-live authority/dispatch wrapper issues](./live-worker-dispatch-preflight-2026-11-15.md). **OBS00 is a source correctness gate before any real paid model**, not just extra instrumentation.

## 4. A minimal replay-capture qualification gate per writer

For every candidate E0 writer, answer all:

| Question | Required answer |
| --- | --- |
| Is this writer reachable in actual running player/campaign flow? | Call graph from API/Worker/Temporal and specific source symbol, not simply export name |
| Does it modify replay-relevant story/game state? | Exact changed field(s), any effect of clock anchor/held permissions on future eligibility |
| Is there already a durable source receipt containing old and new values? | Reuse source; append only missing source/provenance/delta |
| Which transaction and lock enforce original state authority? | Story row lock or other named serialized DB fence |
| Does idempotency already prevent duplicate? | Existing operationId/receipt/event key and source version |
| What is the minimum typed delta to replay it? | Original validated before/after data, schema/codec/version; no generic executable JSON patch |
| What about multiple changes in the same transaction? | One outer committed frontier and ordered within-commit subevents |
| Can the data be sensitive or not player-visible? | Classification, separate private source, lawful retention and viewer projection |
| Does a no-op still change relevant clock time/authority? | If yes, capture relevant time change. If no, avoid a fake game transition |
| What happens on evidence/SQL/CAS failure? | Same transaction rollback for critical compact E0, safe held prior acceptance and no new effect |

**Do not accept a Change claiming "all writers covered" until a real checkout-wide search and disposable test verifies these answers for every directly/indirectly reached mutation.** GitHub-connector static review is useful, but does not prove complete dynamic coverage, unusual raw SQL or a source path introduced after `7e15db38`.

## 5. Implications for proposed OBS implementation

- **OBS00** (live provider authority/payload forwarding) has **pre-live correctness priority**. Its tests use dummy transport, no paid call.
- **OBS01** (safe campaign operation discovery) should include G that never started a provider attempt; it remains a small independent UI/API value.
- **OBS02** stage receipts belong **alongside existing generation/attempt lifecycle**; never blindly increment game `storyTransitionSeq` on each provider round.
- **OBS03** prompt assembly provenance belongs to the exact task/packet/attempt with source root/config Git identity, not generic logs.
- First **E0 pilot** can instrument one finite-action settlement, publication and continuity-note patch; it must *not* claim all replay writers are captured. A follow-on ledger campaign requires actual physical DB/codec/test proof.

**Bottom line:** no single giant `GameData` and no generic logger. Three chronologies, strict source ownership, and only the data changes/causal reasons that the engine actually observed.
