# Forensic observability and replay | Design convergence and execution sequence

**Status: design waves 1–5 complete; post-trial safety wave executed 2026-11-15. Not a blank check for new code.** The architecture recommendation remains in [the index](README.md). Active Change selection stays with [work/changes/README.md](../../../work/changes/README.md). **Current implementation truth:** OBS00-A/L/C, OBS01, OBS02, OBS02-H, OBS03, OBS05, OBS06/07 (synthetic) **Done**; OBS00-B **blocked**; OBS04 **Proposed**; QA-SF01 **Blocked** (partial). See [observability README](README.md) and [post-trial FINAL-HANDOFF](evaluations/2026-11-15--post-trial-safety/FINAL-HANDOFF.md).

## Post-S0–S6 connected evaluation and post-trial safety (executed)

**Independent review after Cursor's S0–S6 run:** [source + evidence quality analysis](evidence/independent-connected-trial-review-2026-11-15.md). Original [S0–S6 report](evaluations/2026-11-15--connected-forensic-trial/FINAL-HANDOFF.md) at `main@b88356fe` (0 live provider calls). OBS06/OBS07 are **Done in synthetic/disposable scope**; trusted production Support grant issuance remains missing.

**Post-trial safety wave (executed, 0 paid):** [FINAL-HANDOFF](evaluations/2026-11-15--post-trial-safety/FINAL-HANDOFF.md). [OBS00-L](../../../work/changes/archive/2026-11/observability/2026-11-15--obs00-l-local-story-trial-guards/CHANGE.md) and [OBS00-C](../../../work/changes/archive/2026-11/observability/2026-11-15--obs00-c-provider-wire-equality/CHANGE.md) are **Done**. [QA-SF01](../../../work/changes/open/2026-11-15--qa-storyteller-integration-fixtures/CHANGE.md) is **Blocked** after partial fixture repair (27/33; remainders deferred). Local Story-mode stop/restart and DB trial caps land; exact reviewed-packet wire equality lands. **A live Story trial still needs a fresh owner spend cap** — not authorized by this design program.

**Still open (not authorized by docs alone):** production OBS00-B entitlement resolver; Support grant stewardship; OBS04 E0; QA-SF01 remainders / known settle-continue defect.

## OBS06: first human-usable incident read before a giant backend ledger

**OBS06/07 disposition (reconciled):** [OBS06 case-scoped Support Situation](../../../work/changes/archive/2026-11/observability/2026-11-15--obs06-case-scoped-situation-read/CHANGE.md) and [OBS07 UI](../../../work/changes/archive/2026-11/observability/2026-11-15--obs07-support-situation-ui/CHANGE.md) are **Done in synthetic/disposable scope** ([evidence](evidence/obs06-case-scoped-situation-read-2026-11-15.md)). Production grant issuance and trusted Support stewardship remain **absent** — see [independent trial review](evidence/independent-connected-trial-review-2026-11-15.md#5-support-is-real-in-test-but-blocked-by-governance). Contract: [support-situation-and-why-v1](technical/support-situation-and-why-v1.md).

OBS04 remains the proposed first **E0 mechanical history** pilot. **OBS00-B** stays a **hard pre-live production provider-dispatch blocker**. Historical [OBS06 decision handoff](handoff/obs06-support-investigator-2026-11-15.md) is archived guidance, not a re-authorization to re-implement OBS06.

## Wave-5 evidence quality, Turn Capsule and current implementation status

**Important update:** OBS00-A's provider forwarding, OBS01 safe operation discovery, OBS02 redacted stage SQL receipts and OBS03 consequence prompt sidecar have now landed on `main`. The earlier wave-4 "all Proposed" order below is **historical planning**, not current coding authorization. OBS00-B's independent current entitlement resolver is still blocked; no automatic paid provider authorization follows from OBS00-A.

| Wave-5 design | Main value |
| --- | --- |
| [Evidence claims and quality](technical/evidence-claims-and-quality-v1.md) | No “model ignored source” claim merely from absent citation; source facts vs validated derivation vs hypothesis |
| [Turn Evidence Capsule](technical/forensic-turn-capsule-v1.md) | Lazy read-only episode across original action, state, context, packet/round, publication, source lineage and coverage |
| [Support/Developer interactions](admin-investigator-interactions-v1.md) | Case → situation → timeline → why/source → gated raw body, not unbounded logs |
| [Configuration/flag provenance](technical/configuration-lineage-and-experiments-v1.md) | Effective Git/profile/player settings versions and future assignments only if actually evaluated |
| [Player Story Replay](player-replay-experience-v1.md) | Historical published scene data replay first; complete state only after E0 deltas/checkpoints |
| [OBS02 stage review](evidence/obs02-stage-integrity-review-2026-11-15.md) | Recovery epoch collisions, false stale-lease terminal receipts and non-atomic stage writes |
| [OBS03 provenance review](evidence/obs03-provenance-quality-review-2026-11-15.md) | First G metadata source chain Done; task-branch inclusion is not verified final transport visibility |

**Now Done (2026-11-15):** [OBS02-H](../../../work/changes/archive/2026-11/observability/2026-11-15--obs02-h-stage-integrity/CHANGE.md), [OBS05](../../../work/changes/archive/2026-11/observability/2026-11-15--obs05-evidence-claim-truth/CHANGE.md), [OBS06](../../../work/changes/archive/2026-11/observability/2026-11-15--obs06-case-scoped-situation-read/CHANGE.md), [OBS07](../../../work/changes/archive/2026-11/observability/2026-11-15--obs07-support-situation-ui/CHANGE.md) (synthetic), [OBS00-L](../../../work/changes/archive/2026-11/observability/2026-11-15--obs00-l-local-story-trial-guards/CHANGE.md), [OBS00-C](../../../work/changes/archive/2026-11/observability/2026-11-15--obs00-c-provider-wire-equality/CHANGE.md). **Still Proposed:** [OBS04 E0 pilot](../../../work/changes/open/2026-11-15--obs04-finite-action-transition-evidence/CHANGE.md). **Blocked:** OBS00-B; QA-SF01 remainders. Product/security/raw retention and full replay remain separate gates. Selection authority: [changes queue](../../../work/changes/README.md).

## Wave-4 source-closure and pre-live correctness checkpoint

The source-level review uncovered **a stronger priority than adding telemetry**: [the default live worker provider wrapper and current-authority wiring](evidence/live-worker-dispatch-preflight-2026-11-15.md). The worker passes no independent `dispatchAuthority` resolver and drops the `StorytellerProviderDispatch` override in its `provider(task)` wrapper. This is a high-confidence static-source pre-live blocker, **not evidence of a real paid mismatch**. It must be resolved or shown fixed before any real provider launch.

| New wave-4 contract | Primary outcome / dependency |
| --- | --- |
| [Source writer closure and three separate histories](evidence/writer-closure-and-sequence-2026-11-15.md) | Game committed state, AI/worker lifecycle and Admin/visitor history have distinct ordering; link by actual domain IDs |
| [Default worker preflight](evidence/live-worker-dispatch-preflight-2026-11-15.md) | Safe current usage authority and exact per-round envelope forwarding, tested with mock transport |
| [One-writer finite-action E0 contract](technical/committed-transition-capture-v1.md) | One settled/interrupted action → one co-committed typed transition, never a second game authority |
| [Typed Support/Developer investigation read models](technical/investigation-read-models-v1.md) | S1 current/status/timeline and S3 generation/context manifests, distinct permission/data boundaries |
| [Node24/Temporal-safe operational OTel plan](technical/otel-bootstrap-and-correlation-v1.md) | Preloaded SDK, bounded spans/labels, optional Grafana profile, no raw prompt exporter or Workflow replay nondeterminism |

**Small packet queue:** [OBS00](../../../work/changes/open/2026-11-15--obs00-live-provider-custody/CHANGE.md) = **pre-live** correctness; [OBS01](../../../work/changes/archive/2026-11/observability/2026-11-15--obs01-operation-coverage/CHANGE.md) = first low-risk **Support visibility**; [OBS02](../../../work/changes/archive/2026-11/observability/2026-11-15--obs02-runtime-storyteller-evidence/CHANGE.md) then [OBS03](../../../work/changes/archive/2026-11/observability/2026-11-15--obs03-prompt-provenance/CHANGE.md) = real AI evidence; [OBS04](../../../work/changes/open/2026-11-15--obs04-finite-action-transition-evidence/CHANGE.md) = separately gated first E0 mechanical history witness. **Historical planning at wave 4; see wave-5 status above. No active Change.** OBS00 and OBS01 have different priority dimensions; do not turn them into an unsafe bulk code task.

## Wave-3 physical/retention/read contracts and first code menu

| New source-backed design | Main decision / dependency |
| --- | --- |
| [Actual private raw-data copies](evidence/private-content-retention-inventory-2026-11-15.md) | SQL `generation.input/output`, dispatch packets, memory rounds, draft/story/QA/CAS are independent retention owners; don't claim TTL on new store alone |
| [ProtectedEvidenceStore contract](technical/protected-artifact-store-v1.md) | Existing canonical DocumentStore has no deletion API, protected access or configurable raw retention; separate artifact port may share infrastructure |
| [Archive codec/version evolution](technical/archive-codecs-and-evolution-v1.md) | Original validated runtime data shape with pinned codec/source hash; actual transport bytes separate, existing canonical hash algorithms preserved |
| [Temporal/replay coverage](technical/temporal-frontiers-and-coverage-v1.md) | `viewVersion` / narrative revision / GM05 public events are not full state frontier; projected activity `dueAt` is not committed earned state |
| [Concrete policy recommendations](product-policy-recommendations-v1.md) | 90/180-day raw AI retention is a **new candidate**, previously 30/90; player story lifetime independent, Support S1 vs case-bound developer S3 |
| [First Cursor handoff](handoff/first-forensic-wave.md) | [OBS01 operation coverage](../../../work/changes/archive/2026-11/observability/2026-11-15--obs01-operation-coverage/CHANGE.md), [OBS02 live stages](../../../work/changes/archive/2026-11/observability/2026-11-15--obs02-runtime-storyteller-evidence/CHANGE.md), [OBS03 prompt provenance](../../../work/changes/archive/2026-11/observability/2026-11-15--obs03-prompt-provenance/CHANGE.md) **all Proposed / NOT Ready** |

**Source-grounded quick win:** `admin/diagnostics-reads.ts::listCampaignOperations` starts from `storytellerAttempt`, which can omit a real G captured/held before any attempt. OBS01 is a **metadata-only coverage correction**, not a giant evidence-storage migration.

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
- Review [updated policy recommendation](product-policy-recommendations-v1.md): 90 days ordinary / 180 days documented incident hold **as candidates** (the prior 30/90 candidate is superseded as advice), and separate longer-lived published history, source metadata, metrics and audit. Treat legal requirements, storage quotas, deletion/export and shared-story rights as gates, not implementation afterthoughts.
- Choose explicit `no-model-call` first wave, financial/environment caps, and allowed disposable verification environment.

### B. Source/technical feasibility acceptance

- Enumerate **every committed game writer**, including settings, action/receipt, activity, item, world, story publication, report, fork and admin-recovery cases. Annotate whether source is current-mutable, append-only, immutable CAS, and whether a story lock is held.
- Identify source truth already saved in `generation.input` / dispatch-review packet / model rounds; prove if a historical turn's **actual bytes** survive normal task lifecycle and source edits.
- Specify exact archive codec/upcaster/version, minimum authoritative delta and checkpoint, immutable CAS staging, source index/query shape, access/erasure and recovery budget.
- Validate workload assumptions with an **offline size/performance sample**, not a fictional 10,000-player target without data. Measure p50/p95 bytes, stage latency, SQL amplification and reconstruction time.
- Reconcile source code with existing [Engine ENG03](../engine/decisions/eng03-capture-migration-sequence.md), [Storyteller SA01–SA12](../storyteller/implementation-program.md), [GM05](../experience/patterns/committed-event-feed.md), [AD05](../admin/evidence/ad05-game-ai-diagnostics-2026-11-14.md) and [Chamber](../../engineering/chamber-program.md). Do not create overlapping owners or redundant “trace coordinators.”

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

**First forensic visibility milestone:** one real existing Storyteller operation appears in a native, read-only **causal inspection record** with an exact status/source chain, while both an operation without provider send and an interrupted operation are correctly represented. Build F01/F02 and a minimal F08 metadata read slice before the elaborate developer UI. The first proof can reuse existing `generation`, `storyteller_dispatch_review`, `storyteller_attempt` and SA01 trace shape. It does **not** need universal GameData V1, 12 new databases or Grafana on day one.

**Second milestone:** an actual provider-disabled turn can be inspected with source component provenance and an exact request hash; a changed settings version is shown as a historical difference, not overwritten by current state. Then enforce protected artifact retention and its privacy policy.

**Third milestone:** stable authoritative state transitions and checkpoint/seek permit meaningful replay. Only then promise historical state diff at arbitrary points.

**Fourth milestone:** role-specific Support and Developer consoles and player playback reuse the proven evidence service. Operational Grafana dashboards follow separately.

## 8. Explicit unresolved policies (owner decision package)

The design is coherent enough to challenge, but the following **cannot be solved by code craftsmanship alone**:
1. Which raw Storyteller packet retention policy is appropriate? **90/180 days is now the proposed candidate** pending storage/legal/cost proof; production does not enforce any such policy today.
2. Are Support specialists ever allowed to read protected narrative bodies, and what constitutes sufficient player authorization/case linkage? Default recommendation: no unless specific approval.
3. Is player replay **published narrative only** at first, or is complete historical character/world state a launch promise? Recommendation: ship faithful published playback first; never call it complete game state replay until F05/F06.
4. What is the accepted per-user/turn storage cost envelope? Do a real measurement before deciding quotas or tiering; do not choose based on abstract “infinite retention.”
5. How much degraded service is acceptable if protected archival storage is unavailable immediately before a provider dispatch? Recommendation: hold paid dispatch rather than perform an untraceable charge, while preserving already committed mechanic.
6. How will exceptional raw-evidence access and deletion interact with GDPR rights, shared stories, case retention and approved incident holds? Needs product/security/legal review for real users.

**Next practical gate:** [OBS06 source/authorization handoff](handoff/obs06-support-investigator-2026-11-15.md). Do **not** redo OBS01/02/02-H/03/05 or OBS00-A. OBS00-B still blocks paid provider launch; OBS04 remains a separate E0 history design. OBS06/OBS07 are Proposed, not selected. Accept one exact code packet only after latest-source, privacy and provider-free preflight. F04+ long-term evidence replay/retention work requires stronger codec, disposal, load and security proofs. No packet is Ready or selected, and no provider/test/deploy spending is authorized by these documents.
