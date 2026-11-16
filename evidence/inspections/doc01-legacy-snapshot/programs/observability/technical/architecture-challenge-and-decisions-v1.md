# Adversarial architecture review | Keep the forensic system powerful, not enormous

**Status:** design challenge and recommended V1 dispositions, 2026-11-15. Source basis: [mutation audit](../evidence/mutation-writer-audit-2026-11-15.md), [SQL/artifact model](physical-evidence-storage-v1.md), [failure protocol](capture-transaction-protocol.md), [historical seek](reconstruction-algorithm-v1.md), [security](forensic-access-and-read-contract-v1.md), [measurement](../evidence/verification-and-sizing-protocol.md). These are engineering design recommendations, not owner-accepted retention/security/product policies or code authorization.

**Wave-4 source challenge:** [default live-worker preflight](../evidence/live-worker-dispatch-preflight-2026-11-15.md) found that the worker's current provider wrapper drops per-round dispatch overrides and does not wire an independent `dispatchAuthority`. This is a P0 **pre-live source correctness** issue. The shared OpenRouter serializer is sound in isolation but does **not** prove the default worker sends the reviewed packet. [OBS00](../../../../work/changes/open/2026-11-15--obs00-live-provider-custody/CHANGE.md) requires mock-transport/authority tests before provider launch. This directly strengthens the decision to capture at *real execution boundaries*, not derive history later from intended call graphs.

## 1. The leading architectural explanation

The project's biggest future forensic failures are likely to arise from **missing semantic evidence at the moment an operation executes**, not merely insufficient log verbosity. Existing data sources preserve many receipts, tasks and packet hashes, but they lack one consistent historic state frontier and selected/omitted prompt provenance. Capturing those facts in a native searchable ledger gives stronger causality than conventional distributed tracing alone.

**What would falsify this judgment?** A well-designed real-source incident study shows existing `story_passage`, `game_activity_event`, `generation.input` and `dispatch-review.packet` already answer all support/developer questions, and the missing problem is purely a query/UI. If so, build **only source-backed indexed read projections**, not another transition ledger. Our audit supports a gap today, but real replay/incident fixture tests are still required to prove its extent.

## 2. Competing architecture choices, ranked

| Option | Strength | Weakness against goals | Judgment |
| --- | --- | --- | --- |
| **A. Verbose structured logs + OTel + Grafana only** | Fast to instrument, familiar SRE tools | Short-lived/sampled; raw prompts leak privacy; insufficient historic actor/item/decision state and exact byte provenance | **Reject as history owner**, retain as operational layer |
| **B. Copy every object/value after every request into one SQL JSONB dump** | Superficially complete; easy initial coding | Massive duplication and storage/privacy burden; post-hoc snapshots miss intermediate source/why; can hold locks; mutable object shape drift | **Reject** |
| **C. Full game event-sourcing rewrite** | Elegant history if truly designed from start | Large invasive migration, new authority, breaks existing receipts/capture/Temporal flows, no need to redo working engine | **Reject for V1** |
| **D. Independent per-service audit databases, joined by trace ID** | Flexible team ownership | No durable cross-system causal truth, joins fail after sampling/outage, high ops complexity | **Reject** |
| **E. Native minimal transition ledger + immutable protected artifacts + source provenance, with OTel on the side** | Exact game/event ownership retained; historical reconstruction, rich privacy-governed prompt inspection, bounded cost | Needs careful capture ownership/DDL, failure/retry tests and retention policy | **Preferred**, subject to proof |
| **F. Put all traces/context into Langfuse or another GenAI vendor** | Useful agent analytics/prompt UI | External retention/privacy/fees; cannot own committed dice/effects or whole game-state playback | **Optional integration**, never primary source |

## 3. The hardest contradiction: “retain all raw data” vs privacy, cost and truth

**User desire:** preserve real production incidents so no one must enable DEBUG mode later and hope to reproduce them.

**Risk:** retaining all private model inputs, user prose, hidden world plans, provider outputs and tool observations forever creates a massive personal-data store with broad insider threat exposure. This is not automatically “enterprise-grade”, and ordinary logging systems cannot responsibly retain those bodies indefinitely.

**Resolution:** record **every meaningful committed game fact and causal identity**, plus enough bounded provenance to explain exact source/algorithm choices. Persist raw AI inputs/outputs as **protected finite-retention artifacts** with explicit purpose/extension policy, rather than blasting them to logs. Player story content may have a different long-lived product retention purpose. When a raw body expires, retain only lawful minimal metadata and mark reconstruction incomplete.

**Critical source risk:** current `generation.input` and `storyteller_dispatch_review.packet` already contain raw content in SQL. Before promising an expiry window, plan a safe migration/retention mechanism across those **existing** sources, not merely a TTL on new CAS evidence. This is a hard launch gate for truthful privacy claims.

**Rejected shortcut:** “Keep everything forever because storage is cheap.” Cost isn't only S3 GiB. It is backup/replication/WAL/index/search/cache, encrypted key custody, deletion/legal holds, incident blast radius and human access governance.

## 4. Is the native transition ledger another source of game truth?

Potentially, if implemented badly. A ledger can tempt teams to derive canonical gameplay state from the forensic record or let support edits “repair” it.

**Boundary:** current game SQL + pure mechanics retain authority for live commands. The forensic transition is committed **atomically** with a meaningful live mutation, carries old/new typed values and source refs, and is read-only. A replay projector **does not** grant effects or re-run RNG.

**Proof needed:** introducing ledger failure does not partially apply a mechanic; existing command/receipt idempotency remains unchanged. Read reconstruction at old frontier equals the saved source-state digest. A discrepancy is an incident, not permission to overwrite authoritative rows from ledger.

**Alternative if complexity too high:** only append immutable before/after snapshot at **selected meaningful boundaries** (Start, settlement, published scene), with less granular replay. This is a valid product compromise if player replay promise is published-scene playback. Do not call it arbitrary per-second historical state.

## 5. Should we store checkpoints during the hot game transaction?

**No remote CAS I/O under story lock**. Current ENG03 work demonstrated amplification under delayed DocumentStore. A full checkpoint can be built from already-frozen compact state at a bounded genesis/selected boundary, or asynchronously from a verified complete transition prefix. A worker reading *today's* `campaign` later cannot claim it is a checkpoint for last week's transition. This detail is non-negotiable.

**Competing plans:**
- Every-step full snapshot under lock: simplest reconstruction, highest SQL/wire/bloat, unacceptable without a tiny bounded proof.
- Sparse delta-only forever: cheap writes, expensive long replay, vulnerable to one missing codec/delta.
- **Typed deltas + periodic verified off-lock checkpoints:** balanced, but introduces asynchronous derived artifacts and coverage. **Preferred** with measured cadence.

## 6. How many events should be captured?

**Do not create an event per function call, per renderer update or every real-second Temporal tick.** Capture **semantic state changes** and accepted causal edges.

Concrete admission policy:
- Always: committed action acceptance/settlement/interruption, roll/effect, earned work boundary, meaningful clock/hold/resource change, source root/setting changes, published scene and report, provider attempt/usage/publication.
- On a batch of activity checks in one transaction: one outer committed group with ordered inner steps, not several falsely separate commits.
- Optional: high-resolution internal timings, candidate ranking metadata for bounded evaluated sources, fine-grained performance spans; sample or aggregate as appropriate.
- Usually omit: no-op scheduler wakes, duplicate notification with no new effect (correlate to old business identity), every unchanged JSON property, unselected *worldwide* corpus source.

**Diagnostic nuance:** to debug why a model ignored a note, capture **eligible/selected/loaded/pruned/final-included** source states only where the actual code considered that source. “Was not selected” is not provable for an unenumerated candidate.

## 7. Can we guarantee 100% exact provider request bytes?

Only if the request at the actual **last serialization boundary** is compared against durable custody. The current `dispatch-review.packet` holds a model request body, and `inspectOpenRouterRequest` shares `buildOpenRouterRequest` logic with provider; that is promising. But actual transport may serialize differently, and streaming models may add protocol/headers. The design cannot claim byte identity from the current stored task alone.

**Requirement:** packet body SHA, actual socket-facing serialized bytes SHA, model/route/output-schema and attempt identity are checked **before possible send**. On mismatch, hold/refuse rather than send an untraceable variant. Authorization/secret headers must never be archived in raw evidence.

**Further caveat:** packet custody + `state='dispatched'` means the app attempted or possibly attempted sending. It cannot prove the provider actually received, processed or charged the request. Preserve provider-reported telemetry/uncertain status.

## 8. Retention of deleted/expired source vs replay promise

**Player playback remains possible** if original published passages/assets are retained under the story lifecycle. **Exact private prompt inspection** may become metadata-only when raw evidence expires. **Historic mechanical state** remains complete only where typed transition/checkpoint source persists. These are three separate coverage dimensions.

Bad UI: “We retained this story” while secretly only holding current scene.  
Also bad UI: “Raw model prompt deleted” while the same prompt remains inside `generation.input` JSONB.

Good UI: “Published scenes available through revision 112; mechanical state reconstruction complete from transition 403 onward; raw model packet for this generation expired; source version/hash retained where allowed.”

## 9. Hidden model reasoning and explanation limits

The user reasonably wants to see the Storyteller “thinking”. The system can record:
- exact instructions and input source;
- visible tool calls, memory-read requests and observations;
- application-side deterministic intent/selector/validator decisions;
- actual provider-returned output and externally exposed reasoning summaries **only when offered and permitted**.

It **cannot** recover internal hidden model chain-of-thought that no API exposed. A model explaining itself after the fact is **not** evidence of why its hidden computations produced the result.

**Product wording:** “Recorded decision path and available evidence”, not “See every thought of the AI.” If future agents have explicit planning tool artifacts, capture them as typed outputs with source ID, not as simulated hidden reasoning.

## 10. Operational tooling choice challenge

**OpenTelemetry/Prometheus/Grafana: yes**, as operational complement. Official current Tempo documentation separates **monolithic mode** (no Kafka required) from microservices mode (Kafka-compatible durable queue), with ingestion limits that can discard oversized traces. <https://grafana.com/docs/tempo/latest/configuration/>. For this small-team portfolio/project, starting with a local optional monolithic tracing stack is saner than introducing Kafka solely to inspect traces.

**What would justify more:** observed high concurrency, multi-instance retention volume, support needs or cost pressure. Until then, don't add microservices, Kafka, ClickHouse or a specialized event store by default. Native SQL+immutable protected artifacts can serve the first real campaign-scale test.

**Security caveat:** GenAI input/output messages are marked potentially sensitive by OpenTelemetry conventions. Raw prompt content belongs behind the native protected data service, not generic OTel exporters to hosted third parties.

## 11. Failure-mode challenge to the proposed atomicity model

**Concern:** requiring E0 capture to co-commit could make an already accepted action unable to settle when its evidence row exceeds a bound or an index insert fails. Correctness is preserved by rollback, but player experience could be awful during an incident.

**Mitigation:** bound E0 captures **at admission/design time**, keep them compact, use existing source rows as references, reserve storage/field-size ceilings and measure failure rates. If later settlement fails, retain the same accepted action, no duplicate roll and a recoverable hold. Avoid making every optional prompt provenance item a critical SQL write.

**Alternative:** treat some forensic state deltas as best-effort and accept missing history. If selected, it must change the declared replay guarantee and UI coverage; we cannot promise complete historical replay and then silently drop source deltas on load.

## 12. Prioritized unknowns that could change the recommendation

1. **Actual existing historical state completeness:** source-based 20-scene reconstruction may reveal more information preserved in campaign state CAS than current source review proved. Then reduce ledger scope accordingly.
2. **Call site of `stageCampaignStateDocument`:** its helper exists, but exact normal runtime calls and retention are not established by the inspected owners. Do not assume periodic checkpointing or none without whole-repo call graph.
3. **Actual raw packet/response storage size:** maybe already large enough to demand a privacy/storage migration early, before collecting new bodies.
4. **Context provenance availability:** current `contextManifest` and canonical knowledge already retain some inclusion/omission detail. Determine whether a small emitter is enough instead of a new complex selection subsystem.
5. **Hot lock sensitivity:** additional SQL row/index could reintroduce measurable overhead under high story contention; profile before finalizing schema.
6. **Future shared stories:** current owner-centric story model may not express participant-specific private visibility, and a replay design could prematurely assume a universal owner.
7. **Privacy lawful basis/retention:** without clear product policy, even a technically excellent archive could be noncompliant or unwanted.
8. **Human value:** perhaps Support can solve most cases from simple typed status, while advanced graph UI benefits only a few developers. Build minimal metadata UI first and measure task completion.

## 13. Architecture decision disposition

| Question | Recommended disposition | Acceptance status |
| --- | --- | --- |
| Primary source of past game truth? | Existing authoritative SQL + **small atomic transition evidence** | Proposed technical target |
| Exact AI context? | Reuse frozen task/packet and add source/provenance manifests | Proposed |
| Captured data shapes? | Keep validated original data contracts, explicit codecs/version, no giant mutable `GameData` | Proposed |
| Cross-service times? | OTel span links + durable domain IDs, no one-span-for-entire-story fiction | Proposed |
| Operational tools? | Optional OTel + Prometheus/Grafana/Tempo/Loki; no Kafka requirement in local monolithic mode | Proposed |
| Player replay? | Read-only published scenes first, state time travel when ledger proves complete | Proposed product staging |
| Staff raw access? | Exceptional, case/purpose-bound, short-lived and audited | **Needs owner/security policy acceptance** |
| Raw prompt retention? | Updated [policy candidate](../product-policy-recommendations-v1.md): 90-day ordinary raw, up to 180-day incident hold; **neither enforced nor approved**, scrub existing copies before claiming any TTL | **Needs owner/security/legal approval** |
| Migration? | Additive exact-owner changes, dual-read legacy path, no destructive mass backfill | Proposed |
| First implementation packet? | Minimal actual source-linked live G/command evidence and missing-coverage proof | Not authorized; design gates still open |

**Conclusion:** choose observability as a **data-quality and historical-identity discipline**, with logs and dashboards around it. The enemy is not insufficient console output. It is historical information being permanently lost or rendered uninterpretable at the exact moment a real event occurred.
