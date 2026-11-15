# Forensic observability | Owner review and first Cursor wave handoff

**Status:** design waves 1–4 proposed, 2026-11-15. **Code queue:** `Current change: none` in [Change router](../../changes/README.md). **No implementation authorization, migrations, external model calls, paid monitoring service or deployment.**

This is the **short entrypoint for a fresh Cursor coding session** only after the owner selects one packet. Do not preload 18 forensic documents or redo architecture under code pressure. Read the selected Change first, then its narrow source contract and nearest package README.

## 1. Design convergence in 60 seconds

**Product:** an authorized human can understand an actual old campaign event, exact game before/after facts, Storyteller context/input/output/source versions, and publication/cost status **without digging through production log piles**. Support uses an S1 safe guided timeline; Developer uses an audited deep context workbench; Player gets read-only story playback. Sampling and log retention must not erase business-critical evidence. The current Admin product direction remains the authority of staff permissions.

**Implementation approach:** **native durable source IDs and compact typed game transitions** in existing PostgreSQL, reusable existing Storyteller tasks/packet hashes, protected immutable raw artifacts with finite retention and privacy controls, operational OpenTelemetry/Prometheus/Grafana outside the evidence spine, and authorized read-only historical projections.

**Hard constraint:** no remote CAS I/O under story `FOR UPDATE`; no new paid dispatch without verified exact packet custody; no separate game authority; no raw prompt in ordinary logs/metrics; no silent retroactive reconstruction of missing legacy history.

**Data reality:** current source already persists `generation.input`/`output`, `storyteller_dispatch_review.packet`+SHA, attempts/funding, ENG03 context captures, published passages, GM05 event projection and admin AD05 safe reads. SA01 traces are fixture/lab only, not emitted live. `DocumentStore` has no delete/retention API and a 1 MiB object limit; it is not already a protected expiring AI archive.

## 2. What requires owner decision vs what is an engineering fact

| Item | Design direction | Approval status |
| --- | --- | --- |
| Durable E0 business event/receipt identity vs sampled E3 telemetry | **Recommended core architecture** | Proposed, not a code command |
| Historical state sequencing/checkpoints vs current mutable campaign JSON | **Recommended** for full state replay; old stories limited by capture coverage | Physical schema/test cost not accepted |
| Protected artifact store separate from canonical game CAS | **Necessary** for credible finite raw retention | Proposed, source-supported |
| Raw payload retention | **90-day default / 180-day incident hold** now recommended *candidate*, earlier 30/90 superseded as advice | Needs product/privacy/legal/cost acceptance |
| Support vs Developer evidence disclosure | S1 Support; exceptional case-scoped S3 developer access, **15-minute review lease candidate** | Needs explicit staff grant/approval acceptance |
| Player replay | Published-scene read-only V1; verified historical state V2 | Needs owner product acceptance, UI proof |
| Operational tools | OTel + Prometheus/Grafana/Tempo/Loki optional local profile | No deployment or SDK version accepted |

**Not all technical decisions should block safe progress.** The first operation coverage Change can be implemented using already-redacted existing metadata after owner authorizes it. Raw blob storage/retention **must wait** for the access and erasure policy to be accepted.

## 3. Five proposed bounded Changes

| Packet | Source-limited result | Dependency / risk |
| --- | --- | --- |
| [OBS00 pre-live provider correctness](../../changes/2026-11-15--obs00-live-provider-custody/CHANGE.md) | Source finds missing live `dispatchAuthority` and a wrapper discarding per-round `dispatch`. Must prove safe current-policy resolution and exact reviewed=transport body with mock fetch; no paid request | **P0 pre-live release gate**; part A-only forwarding can be scoped separately if policy source still absent |
| [OBS01 operation coverage](../../changes/2026-11-15--obs01-operation-coverage/CHANGE.md) | Fix Admin S1 operation list to include captured/held G before any `storyteller_attempt`. Deterministic source joins and no raw leaks | Lowest-risk, independent code candidate after owner selects and latest source recheck |
| [OBS02 real Storyteller stage evidence](../../changes/2026-11-15--obs02-runtime-storyteller-evidence/CHANGE.md) | **Actual runtime** redacted cause/task/validation/publication receipts for one consequence G; not a fabricated SA01 fixture timeline | OBS01 preferred; small additive SQL schema/latency review, no provider spend |
| [OBS03 one exact prompt source map](../../changes/2026-11-15--obs03-prompt-provenance/CHANGE.md) | Capture actual v17 consequence prompt/source/setting/component IDs + inclusion/omission decisions without changing request bytes | OBS02 identity preferred; privacy/metadata schema review; zero provider calls |
| [OBS04 finite-action source witness](../../changes/2026-11-15--obs04-finite-action-transition-evidence/CHANGE.md) | One real action settlement/interrupt produces one atomic typed before/after transition and stable source refs | Strict E0 schema, full local writer call chain and SQL contention measurement needed before Ready |

**Priority is two-dimensional:** **OBS00 first for any real live-provider launch** (its default worker path appears source-blocked and packet overrides are lost); **OBS01 first if the next goal is provider-free Support visibility**. Then OBS02 → OBS03 for real AI causality/context, and OBS04 as a **separately authorized** one-writer E0 state transition experiment after SQL/codec measurement. None is a blanket authorization. **Do not automatically implement** protected raw blob migration, production OTel, full mechanical replay or the Developer Workbench next.

## 4. Other required, later code slices (not yet detailed Changes)

- **ProtectedEvidenceStore V1:** independent encrypted/expiring artifact port, stage/verify/link, subject scoping, deletion/backup handling. Existing `DocumentStore` cannot be used unchanged. Prioritize only after product privacy/access policy and exact raw copy inventory are accepted.
- **Paid-provider byte equality:** verify `dispatch-review.packet` SHA against **last HTTP serialization bytes** before possible external send; preserve uncertainty and no second paid attempt. May require its own small provider-disabled packet before actual raw retention work.
- **E0 committed game transition ledger:** additive per-story ordered transition/coded delta under source story lock, with one atomic group, including activity subevents. Requires whole-repo writer map and measured SQL lock overhead first.
- **Verified checkpoint and as-of read:** off-lock state reconstruction from complete prefix and source hashes; no current state substitution.
- **S1 Support Investigator UI:** safe current status/timeline/case escalation, no private raw. Depends on native read proof.
- **S3 Developer Prompt Workbench:** prompt component/source/round/provenance visualization and compare, only after proper grant and read auditing.
- **Player Replay V1:** recorded scene playback first; no game commands or model calls. Full state-time-travel later.
- **OTel/Grafana optional operational telemetry:** cross-service spans and bounded labels as independently useful operational work, never a substitute for native evidence.

## 5. Source symbols that actually matter for the initial wave

**OBS01:** `packages/application/src/admin/diagnostics-reads.ts::{listCampaignOperations,listPlayerCampaigns,readOperation}`, `packages/db/src/schema/{stories,campaign,storyteller,generations}.ts`, `apps/api/src/modules/admin/controller.ts::{campaignOperations,operationDetail,assertLegacyCampaignVisible}`, `packages/application/src/admin/registry.ts`, `@offscreen/contracts/admin`, `application/test/admin-diagnostics.test.mjs`.

**OBS02:** `application/storyteller/{records,execution,publication,capture-materialization,context-capture,dispatch-review,budget}.ts`, `packages/storyteller/src/providers/operation-trace.ts`, `packages/db/src/schema/storyteller.ts`, `apps/worker/src/activities/index.ts`. Inspect actual source transaction boundaries before any stage INSERT.

**OBS03:** `packages/storyteller/src/tasks/index.ts::{requestFor,prepareStorytellerTask}`, `packages/storyteller/src/context/index.ts::{contextRequestSections,boundStorytellerContext}`, `application/storyteller/{canonical-knowledge,task-admission}.ts`, `providers/openrouter.ts::{buildOpenRouterRequest,inspectOpenRouterRequest}`. Exact equality before/after instrumentation is the primary acceptance bar.

**OBS04:** `application/campaign/action-executions.ts::settleActionExecution`, `action-execution-transition.ts`, `campaign/holds.ts`, `stories/persistence.ts::lockStoryById`. [One-writer atomic source contract](../technical/committed-transition-capture-v1.md).

**Broader writer/retention audit:** [SQL source writers](../evidence/mutation-writer-audit-2026-11-15.md), [raw private columns](../evidence/private-content-retention-inventory-2026-11-15.md), [local/S3 store limitations](../technical/protected-artifact-store-v1.md), [archive codec evolution](../technical/archive-codecs-and-evolution-v1.md), [time/coverage](../technical/temporal-frontiers-and-coverage-v1.md).

## 6. Don’t turn these into mega Changes

- **No full event-sourcing rewrite**. Existing game SQL/receipts remain live truth.
- **No new microservice/queue/agent framework**. Reuse modular monolith, current Temporal/outbox and native app services.
- **No indiscriminate logging**. Metadata stage records are bounded and source-connected; raw bodies are protected artifacts, not Grafana labels.
- **No universal Admin row browser**. S1 safe source-linked read first, S3 separately granted/audited.
- **No “replay old G by sending another model request”**. Playback ≠ Chamber deterministic verification ≠ paid AI re-evaluation.
- **No backfill of nonexistent facts**. Declare instrumentation start frontier, old legacy missing state/selector decisions remain unknown.
- **No erasure fiction**. `generation.input` is NOT NULL and old SQL/CAS/backup copies may survive a new artifact TTL; do not claim compliance until all copies are governed.

## 7. First packet Ready and Done gates

**Before Ready:** owner explicitly authorizes the **exact one** selected Change; Cursor verifies current branch/main and checks whether another code Change is active, checks source/permissions/schema and confirms the provider-disabled disposable test scope. Any required DB migration has an explicit minimal rollback and measurable lock/retention design.

**Before Done:** source SHA/diff, targeted provider-free commands and results, one normal and several negative fixtures, data privacy/redaction tests, no hidden model spend, no duplicate effects/attempts, and measured runtime/storage overhead where changed. Do not mark Done merely because a file exists or an offline SA01 fixture looks good. If source differs, report the exact mismatch rather than quietly broadening the packet.

## 8. Remaining design debt, intentionally outside this wave

- Exact physical DDL/codec migration for *every* category, including deletion semantics for old live generation readers.
- Whole-checkout source writer/call-graph verification and measured SQL/CAS instrumented footprint.
- Final human/user retention and private narrative access policy.
- Complete multi-participant visibility and payer/beneficiary separation.
- Full historical mechanical delta/checkpoint coverage and player replay UX proof.
- Production OTel/Prometheus/Grafana sizing and actual deployment.
- Legal/backup erasure proof for real EU users.

**Owner handoff:** the program now has **five small code-bearing packets**, all **Proposed** and none selected. The Admin first-wave is implemented. Choose **OBS00** before enabling paid/provider work, or **OBS01** for the first safe Support visibility improvement; each requires explicit separate implementation authorization.
