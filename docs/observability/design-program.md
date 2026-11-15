# Forensic observability and replay | Design convergence and execution sequence

**Status: design waves 1–2, 2026-11-15. Not a Cursor implementation instruction.** The current owner requested a backend-first forensic architecture with permanent data provenance, operational telemetry, Admin investigation and player replay. The architecture recommendation is recorded in [the index](README.md). **No Change is selected**; [the Change standard](../../.agents/references/change-work-unit-standard.md) requires code-bearing, independently verifiable packets after product/technical acceptance and latest-source validation. All proposed names below are **candidate outcomes**, not created or authorized `docs/changes` packets.

## Wave-2 source and technical contract status

The following **proposed** design-level artifacts now exist; they sharpen the architecture without claiming runtime verification or approved migrations.

| Area | New detailed contract | Remaining executable/owner gate |
| --- | --- | --- |
| **Full writer map** | [Exact gameplay/story/AI SQL mutation owners](evidence/mutation-writer-audit-2026-11-15.md) | Cursor checkout-wide write/call graph, actual historical-state coverage and normal callers of `stageCampaignStateDocument` |
| **Physical model** | [Postgres transition sequence, typed delta, protected CAS, codecs/indexes](technical/physical-evidence-storage-v1.md) | Source/DDL review, schema size bounds, no migration until measured |
| **Crash correctness** | [E0/E1/E2/E3 criticality and SQL/CAS/Temporal/provider race matrix](technical/capture-transaction-protocol.md) | Disposable failure injection and lock-duration evidence |
| **Historical replay** | [Read-only checkpoint/delta seek with independent temporal axes](technical/reconstruction-algorithm-v1.md) | Exact state field codec and source-digest verification, player perspective |
| **Prompt forensics** | [Compiler and source-selection insertion points](technical/storyteller-prompt-source-map-v1.md) | Same task/packet bytes before and after instrumentation, real provider last-serializer equality |
| **Admin security** | [Tiered Support/Developer data disclosure and audit](technical/forensic-access-and-read-contract-v1.md) | Owner acceptance of role/purpose/grant/retention, actual server enforcement |
| **Disproof and measurement** | [Adversarial review](technical/architecture-challenge-and-decisions-v1.md), [sizing/verification harness](evidence/verification-and-sizing-protocol.md) | Provider-free integration and measured storage/latency; no test yet |

**New critical finding:** today’s `generation.input`, `generation.output`, `storyteller_dispatch_review.packet` and memory-round records already store raw/private content in SQL. A new 30-day protected CAS TTL does **not** delete these copies. A truthful raw-prompt retention promise requires a separately designed legacy-compatible storage migration and cross-store deletion proof. Meanwhile the existing packet row is a valuable source to **reuse**, not duplicate indiscriminately.

**Second nuance:** one transaction may settle multiple activity checks. A future replay must keep their **within-commit logical order** but not pretend intermediate calculations were separately committed, externally visible story states.

## 1. Destination and nonnegotiable success criteria

**Engineering objective:** for a given real story event, an authorized engineer can later reconstruct the recorded causal chain from accepted input through authoritative effects, Storyteller context/packet/visible rounds, validation and publication, with immutable versions, explicit omissions and lawful access. For Support, the same evidence yields an accurate plain-language diagnosis. For players, the source data yields interactive **read-only historical story playback**. Conventional distributed telemetry supplies latencies/health without being the only record of a real incident.

| Bar | Falsifiable completion condition | Must not be mistaken for |
| --- | --- | --- |
| Causal continuity | One accepted command can be joined through commit, outbox/Temporal, Storyteller generation/attempt, publication or a named terminal hold | One uninterrupted trace/span across fictional hours |
| Byte-exact AI provenance | Protected final provider packet bytes match the persisted dispatch checksum; source component and effective config identity explain assembly | The latest prompt recreated later |
| Game temporal history | At chosen committed frontier, checkpoint + typed deltas reproduce authoritative actor, item, activity, clock, holds and root (when coverage complete) | GM05 public event list or a screen recording |
| Safe completeness | Missing legacy, expired, dropped and forbidden evidence always has a typed coverage reason | Empty timeline as proof nothing happened |
| Performance/cost | Capture size/latency/backlog retained under measured agreed budgets; no new long-running CAS call while story row locked | Infinite verbose production logging |
| Privilege | Support can diagnose without raw prompt; restricted engineer read requires independent case/purpose/grant and audit | Adding a hidden Admin tab |
| Playback | 20-scene provider-disabled story can be navigated without new command, RNG, model or cost | Temporal Workflow Replay or regeneration |
| Operational SLO | Metrics, error/slow traces and status dashboards correlate to domain IDs but remain optional to basic incident explanation | Treating OTel as the game ledger |

The first proof must be **provider-disabled and disposable**, with known fault injection. One true provider/real-user campaign remains a later owner-approved acceptance gate, not part of the design session.

## 2. Preserve existing value: do not duplicate blindly

**Existing source foundations confirmed in the 2026-11-15 audit**: `generation.input` already stores a validated frozen Storyteller task/context/request; `storyteller_dispatch_review.packet` and SHA capture provider packet before dispatch; `storyteller_attempt` / `storyteller_operation` own usage and uncertainty; `storyteller_context_capture` owns some purpose-specific SQL freezes; `story_passage`, game ledgers, GM05 and Admin AD05 exist. SA01 has a redacted fixture/lab trace format, but not actual live emission.

**First implementation obligation is to inventory ownership**, not to create an entire second copy of these tables with new names. Determine which source artifacts can be safely referenced, which need immutable version/source provenance added, which are mutable or deletable, and which have unacceptable access/retention. Use one source owner per category. This program is not a demand to convert the modular monolith to event sourcing, Kafka, Kafka Connect or “logs for everything.”

## 3. Required **design-only** acceptance gates, before code packets

### A. Product/security selection (cross-functional)

- Choose the enduring **player playback** promise (published scenes and source-backed effects vs full historical hidden state) and retention/deletion expectations.
- Choose privileged **raw AI-context/body** access policy. Default: Support gets metadata; individual developer disclosure is separately purpose-bound, short-lived and audited; Trust can have a distinct lawful scope. No broad “staff can see all player prose.”
- Choose raw AI artifact retention candidates (30 days ordinary / 90 days documented incident hold), and separate longer-lived published history, source metadata, metrics and audit. Treat legal requirements, storage quotas, deletion/export and shared-story rights as gates, not implementation afterthoughts.
- Choose explicit `no-model-call` first wave, financial/environment caps, and allowed disposable verification environment.

### B. Source/technical feasibility acceptance

- Enumerate **every committed game writer**, including settings, action/receipt, activity, item, world, story publication, report, fork and admin-recovery cases. Annotate whether source is current-mutable, append-only, immutable CAS, and whether a story lock is held.
- Identify source truth already saved in `generation.input` / dispatch-review packet / model rounds; prove if a historical turn's **actual bytes** survive normal task lifecycle and source edits.
- Specify exact archive codec/upcaster/version, minimum authoritative delta and checkpoint, immutable CAS staging, source index/query shape, access/erasure and recovery budget.
- Validate workload assumptions with an **offline size/performance sample**, not a fictional 10,000-player target without data. Measure p50/p95 bytes, stage latency, SQL amplification and reconstruction time.
- Reconcile source code with existing [Engine ENG03](../engine-architecture/decisions/eng03-capture-migration-sequence.md), [Storyteller SA01–SA12](../storyteller-architecture/implementation-program.md), [GM05](../experience/patterns/committed-event-feed.md), [AD05](../admin/evidence/ad05-game-ai-diagnostics-2026-11-14.md) and [Chamber](../engineering/chamber-program.md). Do not create overlapping owners or redundant “trace coordinators.”

### C. Independent design challenge

Before creating a runtime Change, review the architecture against:
1. **Storage outage** while an admitted mechanical outcome is settling, a paid dispatch is about to happen, or telemetry exporter is unavailable.
2. **Concurrent writes:** story holder transfer, interrupt, provider output and pending publication race. Capture must never create a second result.
3. **Security:** a Support ticket deep link or shared story cross-viewer ID cannot declassify raw context or hidden world.
4. **Scale:** 1,000 active stories with varied sizes; one game no longer needs 100 database reads just to render an old event.
5. **Retention:** one story deleted, one sensitive body expired, one incident hold; historical replay and evidence quality remain truthful.
6. **Upgrade:** v17 prompt becomes v18, world schema changes, an old game rule implementation is removed; old artifact remains decodable or explicitly unsupported.
7. **Provider uncertainty:** dispatch occurred but API timed out; charge unknown, no automatic second send and no fabricated “0 tokens.”
8. **Player comprehension:** nobody should confuse historic replay controls with live action admission.

## 4. Staged execution outcomes after acceptance (candidate packet menu, not written Changes)

The order is deliberately **backend evidence before UI decoration**. Distinct code-bearing slices should be independently reversible/reviewable, with normal and negative cases. Labels are for discussion only.

| Order | Candidate outcome | Essential implemented result | Required proof / dependency |
| --- | --- | --- | --- |
| **F01** | Causal ID and coverage map | Unify safe domain IDs and explicit missing/not-run stage semantics across existing API/worker/Storyteller/current Admin reads. **No duplicate ledger** | Provider-free G/action/hold cross-source and a missing-trace negative |
| **F02** | First live Storyteller trace | Wire SA01-style stage semantics into **actual execution** and publication, using existing G/attempt/packet/usage, with true runtime events and status | One observed real scripted/task execution trace, one withheld/provider-disabled operation, no private leakage |
| **F03** | Versioned source/selection provenance | Record original task/context sections, effective profile/settings/source selection including omitted/final-included, code/build provenance | Byte-identical request and version drift tests, old-source/failed-CAS negatives |
| **F04** | Protected artifact retention | Define owner-scoped immutable artifact references, sensitivity, encryption, lifetime/erasure, fail-closed packet before paid dispatch, and content access boundaries | Storage/lease/GC/revocation/corrupt body and no-new-charge tests |
| **F05** | Authoritative transition ledger | Under existing story writer, co-commit an ordered **typed** mechanical delta where current state overwrites vital history; no global rewrite | Duplicate writer/rollback/clock/item/hold test; measured lock regression |
| **F06** | Historical checkpoints/read-only seek | Snapshot verified state at chosen frontiers; reconstruct deterministic state from checkpoint+deltas and report gaps | Old vs reconstructed digests; 20 scenes and long story scan cost |
| **F07** | Optional OTel operations stack | OTel API/worker/Temporal/DB/CAS/provider spans; Prometheus histograms and bounded Grafana/Tempo/Loki local profile | Crash/drop/privacy/cardinality test, no gameplay dependency on collector |
| **F08** | Safe forensic read service | Permission-scoped, paginated `CampaignForensicSummary` and `EventTimeline` + `OperationCausalGraph`/evidence coverage | Unauthorized/other user/expired evidence/legacy source negative; audit read |
| **F09** | Support visual investigator | Story status and meaningful timeline, safe cause classification, case-linked escalation, no raw context | L1 support can diagnose 3 fixed real fixtures unaided, no privilege laundering |
| **F10** | Developer Context Workbench | Prompt composition/source provenance/rounds/state diff, exact packet and version comparisons; exceptional protected read | Old v17 vs new v18, loaded-omitted, stale publication, access and version proof |
| **F11** | Player story playback | Read-only historical scene/event playback of **recorded** choices/outcomes with source and perspective | 20-scene read-only, no new command/time/roll/provider; cross-user isolation |
| **F12** | Chamber sanitized diagnostic export | Source-validated bundle with recorded clock/RNG/inputs/provider fixtures, safe isolated comparison and explicit reproducibility | No prod writes, no secrets, incomplete-source result is marked as such |

**Do not force numerical execution order.** F07 can be implemented earlier independently for performance diagnosis, but it must not be mistaken for progress on durable provenance. F09 can follow a small F01/F02/F08 safe read before F03/F06 are finished if its user-facing evidence coverage is honest. Player playback from existing `storyPassage` can be a narrow first product experiment before full state history, provided it is correctly called **published-scene playback** rather than exact whole-world time travel.

**Source conflict control:** F02/F03/F04 all touch Storyteller source owners; F05/F06 touch campaign/SQL mutation boundaries; F08/F09/F10 touch Admin controls. Execute **one active Change by default**; do not let Cursor and another agent rewrite the same underlying owner simultaneously. Existing ENG03-C2 or other feature work can continue separately only with explicit lock/source-conflict review.

## 5. Field-level capture decision, not line-by-line logging

Use a **retention/capture classification sheet** for each data owner before implementing any adapter:

| Category | Persist every meaningful transition? | Full raw body? | Export to OTel? | Default Staff projection |
| --- | --- | --- | --- | --- |
| Admitted command/operation and result | **Yes, co-commit** | Exact typed permitted inputs/receipt | Metadata/timing only | Safe outcome and source |
| Clock, hold, item, activity, world meaningful change | **Yes** | Typed before/after **changed fields**, not entire state per second | Metrics/spans, no full state | Source-backed safe diff |
| Provider packet and visible rounds | **Yes for paid attempts, before send** | Restricted artifact with finite retention | Hash, bytes, attempt status; no narrative | Metadata only |
| Prompt component/source/config decisions | **Yes when compiled** | Typed manifest and versioned source hashes; sensitive body protected | Aggregate counts/size/reason class | Engineering metadata under grant |
| Current profile/settings/canonical roots | Captured effective revision / immutable snapshot | Reuse existing source; archive only missing historical version | Version/class, no values | Redacted identity |
| Scheduler idle/health tick | **No**, if no meaningful world transition | None | Aggregated counters/histograms | No spam |
| API/SQL/CAS/Temporal internal step | Selected error/latency; no permanent business record unless causally important | Never arbitrary SQL/body dumps | Bounded spans/logs | Guided health summary |
| Raw auth/OAuth/provider credentials | **Never** | **Never** | **Never** | Never |

A **versioned capture boundary and a source-specific typed contract** is preferable to a universal `debugLog({ ...untrustedObject })` call. Capturing only hashes can explain equality, but **cannot enable byte-exact replay once the body expires**. State precisely which retention promise is achievable.

## 6. Test/proof matrix before real campaigns

A pre-live acceptance pack must include at least:

- **Golden normal:** accepted action → receipt → context → one scripted G → validated publication → replay, all cross-linked with stable IDs and exactly one story commit.
- **Early narrated pending:** generation G exists before mechanical settlement; no early earned effect or misleading success in Admin/replay.
- **Interruption:** required item holder changes; one interrupted event, no success receipt; hold and explanation trace truthful.
- **Long wait/restart:** Temporal retries/outbox duplicate/worker crash; evidence links converge on same operation and G without claiming continuous single span.
- **Source change:** story/root/settings change after context capture; later stale publication, with original frozen context/version and denied publication.
- **History change:** old prompt/profile/flag/rule revision, new source on main; historic inspection still displays original source reference and actual packet hash.
- **Model failure/uncertainty:** no zero-cost assertion without usage; dispatch may be uncertain; no paid replay from a read-only page.
- **Security:** cross-campaign and multi-actor scope, expired grants, raw body restricted, redaction/malicious prompt text.
- **Retention:** raw packet expires, story remains, first-class “body unavailable” while player published playback remains lawful.
- **Capacity:** bounded request count, p95 context archive overhead, no external I/O under story lock, long story seek with indexed checkpoints.

**Proof classes:** authored MD != build/test pass != disposable DB/Temporal integration != browser human playability != production SLO. Record exact commands and source SHA for each implemented Change. Red global CI is not a substitute for focused evidence.

## 7. Recommended first execution after design acceptance

**First useful milestone:** one real existing Storyteller operation appears in a native, read-only **causal inspection record** with an exact status/source chain, while both an operation without provider send and an interrupted operation are correctly represented. Build F01/F02 and a minimal F08 metadata read slice before the elaborate developer UI. The first proof can reuse existing `generation`, `storyteller_dispatch_review`, `storyteller_attempt` and SA01 trace shape. It does **not** need universal GameData V1, 12 new databases or Grafana on day one.

**Second milestone:** an actual provider-disabled turn can be inspected with source component provenance and an exact request hash; a changed settings version is shown as a historical difference, not overwritten by current state. Then enforce protected artifact retention and its privacy policy.

**Third milestone:** stable authoritative state transitions and checkpoint/seek permit meaningful replay. Only then promise historical state diff at arbitrary points.

**Fourth milestone:** role-specific Support and Developer consoles and player playback reuse the proven evidence service. Operational Grafana dashboards follow separately.

## 8. Explicit unresolved policies (owner decision package)

The design is coherent enough to challenge, but the following **cannot be solved by code craftsmanship alone**:
1. Do ordinary player stories retain raw Storyteller packets for 30 days, 90 days or a player-adjustable term? The current **30/90-day model is a recommendation**, not accepted policy.
2. Are Support specialists ever allowed to read protected narrative bodies, and what constitutes sufficient player authorization/case linkage? Default recommendation: no unless specific approval.
3. Is player replay **published narrative only** at first, or is complete historical character/world state a launch promise? Recommendation: ship faithful published playback first; never call it complete game state replay until F05/F06.
4. What is the accepted per-user/turn storage cost envelope? Do a real measurement before deciding quotas or tiering; do not choose based on abstract “infinite retention.”
5. How much degraded service is acceptable if protected archival storage is unavailable immediately before a provider dispatch? Recommendation: hold paid dispatch rather than perform an untraceable charge, while preserving already committed mechanic.
6. How will exceptional raw-evidence access and deletion interact with GDPR rights, shared stories, case retention and approved incident holds? Needs product/security/legal review for real users.

**Next wave to design:** exhaustive mutation-writer audit + actual schema/codec and access-controller design + failure/race/retention technical review. Only *after* that create the **first few** code-bearing Fxx Changes. No doc-only packet is Ready, and no provider/test/deploy spending is authorized.
