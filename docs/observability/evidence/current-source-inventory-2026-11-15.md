# Source-grounded forensic inventory and gap audit | 2026-11-15

**Evidence class:** direct GitHub connector file inspection of `DenisSkulovic/offscreen-rpg` **main** on 2026-11-15, including the current C1-R additions and Admin AD01–AD08. No checkout, full repository grep, SQL query, running application, runtime tests or provider call. This is a **targeted source audit**, not proof no similarly named feature exists in an uninspected file. Source is mutable; every implementation packet must recheck the exact symbols. Program [destination](../product-vision.md) → [typed evidence design](../technical/evidence-model.md) → this audit → [candidate implementation sequence](../design-program.md).

## 1. Verdict in one paragraph

The POC has **more persistently structured source data than an ordinary log-only application**: accepted commands, game execution/roll/activity/world events, passages and immutable root revisions, generation inputs/outputs, attempts/usage accounting, dispatch-review packet hashes/bodies, provisional ENG03 context-capture rows, memory exploration state, GM05 public event projections and staff-safe Admin reads. That is a valuable foundation. However, these parts are **not yet a complete causal, historical, role-accessible forensic system**. Much historical mutable game state cannot presently be recovered at arbitrary moments, raw AI packet retention/permissions are not purpose-governed as a unified evidence store, SA01’s attractive trace is lab/fixture-only rather than emitted by live operations, and the project’s inspected application dependencies and compose file do not show a distributed OpenTelemetry/Prometheus/Grafana installation. Admin exposes safe redacted status but no interactive historic prompt/state/source graph or semantic replay. A failed operation might be reconstructible manually by an experienced engineer, but the user’s desired point-and-explore experience is **not yet present**.

## 2. Actual moving parts and what is already retained

| System/stage | Actual source owner | Existing recorded data / useful IDs | Current major forensic limitation |
| --- | --- | --- | --- |
| **HTTP and staff/player identity** | `apps/api/src/app.ts`, `apps/api/src/modules/stories/controller.ts`, `modules/admin/controller.ts` | Owner-scoped player routes; Admin staff sessions/grants/capabilities and safe DTOs | No verified common end-to-end OTel span, ingress-to-worker domain evidence correlation or unified evidence-access tooling |
| **Runtime process errors** | `packages/application/src/runtime-logging/index.ts`, `apps/api/src/main.ts`, `apps/worker/src/bootstrap/main.ts` | JSON stderr `level/event/message/service/timestamp/correlation/errorKind` | Operational log output only; no collector/retention/tracing, no replay authority |
| **Story current truth** | `packages/db/src/schema/stories.ts::story` | owner, source/premise, profile/execution/usage, active-scene, root/revision, fork origin, current revision/viewVersion | Mutable current row; past setting/scene/root state is only partially recoverable from other ledgers |
| **Published passages** | `storyPassage` and `storyDocumentCommit` | source generation, transition ID, sequence, immutable content hash or inline content, interaction/appearance, root commits | Published history is valuable for narrative playback; it is **not** a complete per-transition mechanical state snapshot |
| **Player story resolution** | `storyResolution`, `storyControl`, `campaignCommand`, `gameOffer` | base passage/revision, generation, submission, immutable operation ID, selected private plans | No unified explicit why/what-changed graph with each step's source snapshot |
| **Campaign active mechanics** | `packages/db/src/schema/campaign.ts::campaign` | current character/facts/clock/pace/holds/offer/activity/world conditions | Some values overwritten; arbitrarily old actor/hold/availability state not reconstructible from current row alone |
| **Finite action** | `gameActionExecution`, `gameActionExecutionEvent`, `gameActionReceipt` | accepted offer/plan, start/target time, state/revision, event ordinals, settled outcome/effects/roll | Good exact receipt history; missing uniform before/after state field deltas and causal source graph |
| **Activity and contribution** | `gameActivity`, `gameActivityEvent`, `gameRoll` | plan/progress, distinct event/segment/roll identities and check/effect details | Activity events are not a universal full state history; partial state and controls require a consistent historic frontier |
| **World obligations and reports** | `worldObligation` / `worldObligationEvent`, `campaignReport` | due/fired time, source/hook, report lifecycle, factual summary | Different event ordinals and late historical reports; no single all-state transition ordering |
| **GM05 player-visible events** | `storyPublicEvent`, `packages/application/src/stories/public-events.ts` | per-story committed `eventSequence`, safe kind/summary/source ID, ``coverage='since-enabled'` | Deliberately **public subset**, not a complete game/AI/support replay ledger; no earlier backfill |
| **Temporal control** | `packages/workflows`, `apps/worker/src/outbox`, `outbox` table | topic, operationId, notice ID, leases/delivery; workflow/activity retry semantics | Workflow histories not universally indexed into Admin by domain cause; no proof of OTel context propagation or long-term linked evidence |
| **Storyteller capture** | `application/storyteller/context-capture.ts`, `capture-materialization.ts`, `storyteller_context_capture` | frozen SQL authority, exact source references/hash, provisional same G, lease/retry/rearm status | Purpose-specific ENG03 capture covers selected consequence paths, not every opening/continuation/report; no general historic provenance/explanation UI |
| **Storyteller task compiler** | `packages/storyteller/src/tasks/index.ts::prepareStorytellerTask`, `storytellerTaskSchema` | versioned full frozen task containing `context`, `request`, `contextManifest`, profile/usage/recipe | Retains **important raw context already**; lacks per-instruction/source decision graph, component editor history and general saved reason for each omission |
| **Storyteller source selection** | `application/storyteller/context.ts`, `canonical-knowledge.ts`, `storyteller/context/index.ts` | current/evidence passages, root, canonical selection/omissions and bounded packing | Omission traces exist in parts; not one durable source candidate→eligible→selected→loaded→pruned→final-included ledger for every real task |
| **Storyteller profile/config** | `storyteller/profiles/definitions/*.json`, `campaignSettings`, `storytellerPreset` | profile ID/revision in JSON, settings revision/JSON, selected stored task copy | Some definitions and task prompt text are **code-backed**, not versioned DB edits; need immutable build/file/hash provenance and actual config ancestry |
| **Provider dispatch/review** | `application/storyteller/dispatch-review.ts`, `storytellerDispatchReview`/`Decision` | **actual persisted packet body + SHA/inspection per reviewed attempt**, selected review state; superseded packet logic | Key strength. But stored SQL packet isn't a governed long-term private artifact graph with granular access/retention and per-block origin; must avoid duplicating blindly |
| **Provider accounting** | `storytellerOperation`, `storytellerAttempt`, `storytellerFunding`, `storytellerUsageAllocation` | requested/reported model, profile/prompt/recipe version, reservation/settlement/uncertainty, token/cache figures, money, duration | Good financial truth. Still needs connected operator-friendly “this round and why this policy” explanation; null unknowns must remain null |
| **Memory/tool rounds** | `storytellerMemoryExploration` and `application/storyteller/memory-exploration-controller.ts` | bounded snapshot, rounds, pending request/output SHA, read usage, model round state | Specialized persistence not uniformly explorable across all purposes; not a global OTel trace or whole-story replay |
| **Generation/publication** | `generation`, `storytellerPublication`, `application/storyteller/publication.ts` | pending/running/succeeded/failed/uncertain, input/output/repair, separate publication state/fence | Can distinguish succeeded-but-not-published; doesn't produce historical, contextual, interactive field-level diff/provenance |
| **SA01 trace lab** | `storyteller/providers/operation-trace.ts` + fixtures, `storyteller:packet-audit` | redacted `storyteller-operation-trace.v1` with source handles, request hashes/bytes, span kinds and explicit unknowns | **SA01 evidence explicitly says no live execution or publication emission**. Fixture trace ≠ production incident record |
| **Admin identity and audit** | `packages/db/src/schema/admin.ts`, `application/admin/registry.ts`, `audit-reads.ts` | staff session, capability package, scope, audit events and case links | Good authority skeleton; no first-class capture/archive disclosures and purpose-bound private packet access surface |
| **Admin diagnostics AD05** | `application/admin/diagnostics-reads.ts`, `apps/api/src/modules/admin/controller.ts` | safe campaign health and redacted generation state/publication/lastUpdatedAt, limited failure code, 20-record page | **Intentionally excludes raw input/prose**; no full event/state/context forensic view. List currently joins `storytellerAttempt` and can omit generations without attempts |
| **Chamber laboratory** | `docs/engineering/targets/chamber-laboratory.md` and implemented CH packets | test scenarios and controlled, isolated source-state experiments | Does not retroactively retain production evidence, and is not a prod customer replay/fork UI |
| **Frontend live state** | `apps/web/src/features/play/README.md`, TanStack Query/SSE and story snapshots | viewer/story `viewVersion` queries, immutable command receipts, live update hint | Accurate current data projection, not a persisted long-running browser action/event replay ledger |

**Status note:** The above describes the **actual inspected source**, not just an older admin design dossier. Current `storyteller_context_capture` schema includes `rearmEpoch` and `storytellerContextCaptureRearm` from the recently landed C1-R follow-up. Do not treat previous day's “still open” documentation as more current than the code.

## 3. A representative real causal path

~~~text
Player accepts option
  API request + authenticated owner
    -> campaign/actions.ts validates current offer, actor, revision, plan
    -> SQL locks story and records accepted execution (operationId)
    -> outbox(topic, operationId, noticeId) committed
  Outbox relay / Temporal workflow
    -> campaign execution advances admitted fictional time
    -> action/roll/activity/interrupt receipt and events committed
    -> follow-up narration intent/hold and one G captured
  Storyteller
    -> context sources selected from SQL, passages, immutable CAS/rules
    -> task-admission effective usage/recipe
    -> task compiler v17 + contextManifest + frozen provider request
    -> dispatch review persists packet/hash (where provider path)
    -> model attempt/round reserve, send, settle/uncertain
    -> output validation
    -> publication checks source root/actor/receipt/scene and writes passage
    -> viewVersion/SSE invalidation + UI current snapshot
~~~

**Causal branch points:** admission can fail before command; finite action can wait; interrupt produces **no success receipt**; a task can be provisional awaiting CAS; zero provider calls if scripted/held; a dispatched provider request can be uncertain; output can be invalid; a generation can succeed but fail publication; a historical report can publish after the current scene advanced. A good forensic timeline must render these distinct and not infer one “turn succeeded” flag.

## 4. Source-level diagnostic failures to prioritize

| Priority | Source-grounded gap | Concrete visible symptom |
| --- | --- | --- |
| **P0-1** | No universal per-story **committed mechanical transition sequence + typed field deltas/checkpoints** | Can't reconstruct exact item/clock/hold/fact state at arbitrary old point; public GM05 feed is insufficient |
| **P0-2** | No unified **historical evidence IDs/artifact graph across command→worker→G→packet→published** | Engineer must manually join multiple tables/artifacts; spans alone will not fix old incidents |
| **P0-3** | No live **SA01 trace emission** for actual Storyteller execution | Attractive lab trace files don't exist for real customer task by default |
| **P0-4** | No explicit structured **source selection / final context component derivation graph** | “Why was this memory omitted or which prompt changed?” not reliably answerable even when request text retained |
| **P0-5** | No separated, reviewed **private packet lifecycle and purpose-bound staff access** | Existing full packet copy in SQL is useful, but unsafe to expose as generic Admin row or keep indefinitely without policy |
| **P1-1** | No inspected OTel/Prometheus/Grafana/Tempo/Loki deployed configuration | Cannot natively click from delayed outbox/DB/model stage to distributed duration and health |
| **P1-2** | Admin AD05 list/detail offers only redacted operation status; attempt-backed list | Support sees too little causality; captured/unattempted tasks may not appear in list |
| **P1-3** | No player **semantic scene replay** and no independently verified historical state time-travel API | Old prose can be browsed, but timeline/state exploration is absent |
| **P1-4** | Prompt/profile origin isn't uniformly managed with immutable component source mapping | Git/code prompt revisions vs player settings/DB changes need joined effective history |
| **P1-5** | No documented retention/erasure/cost governance for full raw provider artifacts vs compact game evidence | Future “log too much” / privacy / cost crisis |
| **P2** | No unified incident case→source→Chamber sanitized replay bundle→compare workflow | Debugger still copies partial screenshots and manually constructs fixtures |

**Do not reverse the order:** shipping Grafana first would improve timelines and resource dashboards but would **not** close P0-1 through P0-5. Durable capture, provenance and role-limited retrieval are the true critical path for this product goal.

## 5. Stage-boundary capture map: which values are lost today?

| Stage | Existing persistent anchor | Additional evidence needed for selected target |
| --- | --- | --- |
| Before command admission | offered plan/current story | exact relevant pre-state checkpoint/digest, settings/rule policy, denied-vs-accepted reason |
| After mechanical commit | receipt/event/current campaign state | typed **before/after** changed facts/holders/holds/clock values, complete causal sequence |
| During context selection | task.context, contextManifest, canonical omissions | bounded candidate decisions, selector version/reason, exact source provenance and final-included proof |
| At provider packet preparation | task.request / dispatchReview.packet+SHA | component provenance map, effective code/DB/player config and transform order, protected retention policy |
| At each model/tool call | attempt ledger / exploration snapshot | exact per-round output/request/validated tool evidence, trace span links, status and body access control |
| At publication | source Generation+Publication+Passage | per-fence result record, old/new state identity, source-field derivation, displayed coverage |
| At Admin investigation | case, staff audit | purpose grant, requested fields, disclosed body IDs, replay/snapshot read, expiry and denials |
| At later replay | history/passages/GM05 events | consistent game transition frontier, checkpoint/index, stable replay reader and typed incomplete markers |

**Important distinction:** some historic data **is** already in `generation.input`, `dispatch_review.packet` and source manifests. We should **reuse or migrate by reference**, not replicate full raw requests into every new evidence envelope. Capture additions must be tied to actual loss of information, poor access/retention boundaries or inability to explain why.

## 6. What this audit does not claim

- No current tests or live traces were run; “observed” means source/manifest inspection.
- We did not exhaustively scan every unindexed GitHub path or production configuration; OTel deployment could exist elsewhere. The **inspected** manifests/compose show no configured stack.
- We did not measure bytes per turn, lock increase from audit writes, CAS reliability or actual storage cost.
- We did not prove historical reconstruction of already-existing campaigns: most lack the proposed new transition ledger.
- No player/customer was exposed, no raw provider output accessed from a real account, and no security/retention setting changed.

## 7. Immediate targeted follow-on audit tasks

1. Enumerate **all gameplay mutation writers** in `application/campaign`, `stories`, `storyteller/publication`, settings, world obligation and admin recovery, then mark whether they write inside a story lock and how to co-commit a compact transition.
2. Trace all calls to `prepareStorytellerTask`, `prepareDispatchReview`, actual transport send and memory model rounds; map which exact packet bytes already exist vs which decisions are lost.
3. Profile **one zero-provider 10-turn fixture** with real DB/CAS/Temporal and intentional failure/retry to measure proposed artifact bytes/latency before choosing physical storage.
4. Confirm staff grant/audit capabilities and **actual scope** of private narrative/raw model read (do not grant implicitly); define initial Support and Developer read DTOs.
5. Test a historical story with a settings revision, interrupted item transfer and late report: identify first unprovable state boundary, then design the minimum needed event/delta/checkpoint.
6. Reconcile existing work [SA01](../../changes/2026-11-14--sa01-operation-trace/CHANGE.md), [GM05](../../changes/2026-11-13--gm-return-event-projection/CHANGE.md), [ENG03](../../engine-architecture/decisions/eng03-capture-migration-sequence.md), [CH](../../engineering/chamber-program.md), [AD05](../../changes/2026-11-14--admin-game-ai-diagnostics/CHANGE.md) before cutting any new code-bearing Changes.

**Design implication:** the current source has real high-value infrastructure. Preserve it and add a coherent causality/retention/inspection layer; no need to impose an event-sourcing framework, new microservices or a second game/agent engine.
