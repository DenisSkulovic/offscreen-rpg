# Forensic Observability, Provenance & Replay

**Status: architecture design waves 1–5 and OBS06 planning (2026-11-15). Verified at main@18158402: OBS00-A, OBS01, OBS02, OBS02-H, OBS03 and OBS05 Done; OBS00-B blocked; OBS04, OBS06 and OBS07 Proposed. This Markdown authorizes no code/paid execution.** No code, migrations, test execution, hosting, external model calls or paid services authorized by this document. The owner's request is a serious, permanent system for understanding actual historical behavior, not more verbose console logs.

**Project method:** product destination → evidence/authority model → source-grounded audit → technical architecture and cost/privacy challenge → separately accepted bounded code-bearing Changes → verified operational and human evidence. The existing Admin product direction was accepted on 2026-11-14; this program **extends** it rather than superseding its staff authority and redaction guarantees. Active Change selection remains owned by [docs/changes/README.md](../changes/README.md).

## Start here by question

| Need | Document | Authority |
| --- | --- | --- |
| **How does Cursor actually RUN the stack, play campaigns, test failures and report results?** | **[Cursor executable S0–S6 forensic handoff](handoff/CURSOR-FORENSIC-TRIAL-START-HERE-2026-11-15.md)** → [run ledger / resumption](evaluations/2026-11-15--connected-forensic-trial/README.md) | Evaluation **prepared, not executed**; local/disposable, conditional live only under explicit budget and authority |
| What experience and forensic guarantees should exist for player, Support and Engineering? | [Product destination and golden journeys](product-vision.md) | Product target / recommendations for owner acceptance |
| **How do we distinguish a fact from a diagnosis?** | [Evidence-claims and quality V1](technical/evidence-claims-and-quality-v1.md) | Source claims vs derived statements vs hypotheses |
| **What exactly should one incident explorer load?** | [Turn Evidence Capsule V1](technical/forensic-turn-capsule-v1.md) | Read-only composed source graph, not a second GameData blob |
| **How should Support and Developer investigate?** | [Investigation interaction blueprint](admin-investigator-interactions-v1.md) | Human-first tools, safe drilldowns and synchronized timeline |
| **Which configuration/prompt/flag version really applied?** | [Effective configuration lineage](technical/configuration-lineage-and-experiments-v1.md) | Repo/DB source versions and future conditional flags |
| **How does a player replay a real past story?** | [Player data-driven replay V1](player-replay-experience-v1.md) | Recorded story playback first, no game or provider writes |
| **What did OBS02-H harden after the original pilot?** | [Historical source review](evidence/obs02-stage-integrity-review-2026-11-15.md) → [Done evidence](evidence/obs02-h-stage-integrity-2026-11-15.md) | Same-G epoch/lease stage integrity **Done** for scoped tests |
| **How complete is OBS03's actual provenance?** | [Source-level OBS03 quality review](evidence/obs03-provenance-quality-review-2026-11-15.md) | First redacted G sidecar Done; final transport lineage still partial |
| **What concrete privacy/access/replay policy do we recommend?** | [Proposed product-policy decisions V1](product-policy-recommendations-v1.md) | Advisor recommendation; owner/legal acceptance pending |
| **Which next one code Change should be considered?** | [OBS06 source/security audit](evidence/obs06-support-situation-source-audit-2026-11-15.md) → [exact Support Situation read contract](technical/support-situation-and-why-v1.md) → [current decision handoff](handoff/obs06-support-investigator-2026-11-15.md) | **OBS06 proposed** pending scoped case/grant acceptance; OBS07 UI follows |
| **Which live-provider gate remains after OBS00-A?** | [Original worker source finding](evidence/live-worker-dispatch-preflight-2026-11-15.md) → [current OBS06 handoff](handoff/obs06-support-investigator-2026-11-15.md) | OBS00-A forwarding Done; **OBS00-B independent current authority blocked**, no paid runtime proof |
| **Which writes belong in the game ledger vs AI vs Admin history?** | [Writer closure and three histories](evidence/writer-closure-and-sequence-2026-11-15.md) | Broad static source classification; dynamic proof remains |
| **How is one finite-action commit captured atomically?** | [Finite-action transition pilot V1](technical/committed-transition-capture-v1.md) | One-writer detailed technical contract, not all-state replay |
| **What data should Support and Developer workbenches actually receive?** | [Typed investigation read models](technical/investigation-read-models-v1.md) | Role-safe application read design, not exposed endpoints |
| **How would OTel actually bootstrap in API/worker safely?** | [Node24/Temporal-safe OTel topology](technical/otel-bootstrap-and-correlation-v1.md) | Operational instrumentation design; no collector deployed |
| What actually exists, what is only a fixture, what is absent? | [Source-grounded inventory and gap audit](evidence/current-source-inventory-2026-11-15.md) | Dated code inspection, **not** runtime proof |
| What durable entities, IDs, immutable artifacts and causal edges exist? | [Evidence graph and capture model](technical/evidence-model.md) | Technical target, separate from game authority |
| **Which actual SQL writers overwrite facts, and where are the replay gaps?** | [Detailed mutation-writer matrix](evidence/mutation-writer-audit-2026-11-15.md) | Dated direct source audit; no running proof |
| **Where do private model/user bodies actually survive today?** | [Private-content source/retention inventory](evidence/private-content-retention-inventory-2026-11-15.md) | Source-inspected existing SQL/CAS/QA copies; deletion not tested |
| **Why can't canonical DocumentStore simply be our expiring forensic archive?** | [ProtectedEvidenceStore V1](technical/protected-artifact-store-v1.md) | Separate custody, encryption/erasure/size; proposed only |
| **How will source data remain interpretable across schema upgrades?** | [Archive codecs and upcasters](technical/archive-codecs-and-evolution-v1.md) | Historical semantic/runtime shape and exact bytes; proposed |
| **How do committed, estimated, published and AI-candidate time differ?** | [Temporal frontiers and coverage](technical/temporal-frontiers-and-coverage-v1.md) | Source-backed historical truth modes |
| **What exact Postgres/CAS tables, codecs, indexes and lifecycle?** | [Physical evidence storage V1](technical/physical-evidence-storage-v1.md) | Proposed DDL/data contract, **not migration-ready** |
| **How do we survive crashes, retries and uncertain provider sends?** | [SQL/CAS/Temporal capture protocol](technical/capture-transaction-protocol.md) | Proposed atomicity and failure matrix |
| **How is an old actor/world/clock state reconstructed without new effects?** | [Historical reconstruction V1](technical/reconstruction-algorithm-v1.md) | Read-only data projection, not implemented |
| **Which exact prompt compiler functions should emit source maps?** | [Storyteller prompt source map](technical/storyteller-prompt-source-map-v1.md) | Code-inspected instrumentation seams |
| **Who may open a protected context, with which audit?** | [Forensic read/security contract](technical/forensic-access-and-read-contract-v1.md) | Proposed staff grants/read APIs; not granted |
| **How do we disprove bad ideas and price the evidence overhead?** | [Adversarial design review](technical/architecture-challenge-and-decisions-v1.md) and [verification/sizing protocol](evidence/verification-and-sizing-protocol.md) | Alternatives, measurable gates; no tests executed |
| How do we know **which prompt section/instruction/flag/data** was used and why? | [Context assembly and configuration provenance](technical/context-provenance.md) | Exact prompt/data trace target |
| What belongs in OpenTelemetry, Prometheus, Grafana and logs? | [Runtime telemetry and reliability](technical/telemetry-and-operations.md) | Operational architecture |
| What does replay actually guarantee, and how long can evidence be kept? | [Replay, retention and privacy](technical/replay-retention-and-privacy.md) | Durable replay / privacy boundaries |
| How do Support and engineers explore live/historical situations without log archaeology? | [Investigation experiences](admin-investigation-experience.md) | Admin wave-2 product direction, not a privilege grant |
| What should be designed/executed first, and what remains undecided? | [Design decisions and staged convergence](design-program.md) | Program order; **not** an active Change |
| Which external standards shape the decisions? | [Independent technical references](references.md) | Research, not authority over this game's contract |

## Nonnegotiable properties

1. **A real event can be understood later even if process logs have expired.** Accepted commands, effects, time, published scenes and AI operation statuses are durable business data, not sampled log lines.
2. **No fictional reconstruction is presented as historical fact.** Every displayed claim links to recorded source(s), their version, retention/visibility state and custody.
3. **Provenance is a first-class graph.** Human-friendly explanations arise from exact artifact IDs, hashes, immutable input, effective configuration, source selection/omission and committed result, not from scanning strings in a log index.
4. **Native evidence can be replayed without a model call.** Player playback shows previously committed events and captured outputs. Deterministic re-execution and AI re-generation are different modes, explicitly labelled and separately authorized.
5. **Privacy and staff authority are baked into evidence storage and reads.** Support gets operational explanation by default, not confidential narrative or raw AI context. Developer access is separately granted, purpose-bound and audited.
6. **Sampling applies to telemetry, never to critical business evidence.** OpenTelemetry is valuable; it is not the permanent game history or an exact full-context archive.
7. **Evidence capture must not corrupt or duplicate gameplay.** Large sensitive artifacts live in immutable CAS; short SQL transactions retain authoritative state and durable evidence references. A failed external telemetry exporter does not roll back a completed game.
8. **Coverage is explicit.** Old campaigns, deleted private payloads, unsampled spans, provider-uncertain attempts and source gaps are visibly marked. An absent record is not proof an event did not occur.
9. **Financial/operational cost stays bounded.** Cardinality, bytes, retention, backpressure, content access and governance are part of the design, not an afterthought.
10. **Workstreams remain separable.** This program must not silently become an engine rewrite, a new agent framework, a generic admin SQL browser or an expensive cloud platform rollout.

## Existing owner relationships

- [Engine architecture](../engine-architecture/README.md) owns canonical mechanics/short locks/Temporal boundaries, not operator UI.
- [Storyteller architecture](../storyteller-architecture/README.md) owns task/recipe/tool/prompt semantics.
- [Admin accepted authority](../admin/product-acceptance-and-scope.md), [read and privacy](../admin/technical/read-models-and-privacy.md) and [AI operations](../admin/ai-engineering-operations-product.md) own staff role/scope and interface promises.
- [Chamber](../engineering/targets/chamber-laboratory.md) owns isolated simulation and reproducible test fixtures. Production evidence export into Chamber must be sanitized and separately authorized.
- [GM05 committed public events](../experience/patterns/committed-event-feed.md) is useful for player chronology but **not** a full historical state/AI/provenance system.

**Historical waves 3–4 disposition (updated by wave 5):** the private-data inventory, [protected artifact custody](technical/protected-artifact-store-v1.md), [archive schema evolution](technical/archive-codecs-and-evolution-v1.md), [temporal coverage](technical/temporal-frontiers-and-coverage-v1.md), [recommended product policy](product-policy-recommendations-v1.md) and [first bounded Cursor handoff](handoff/first-forensic-wave.md) are written. **OBS01/OBS02/OBS03 and OBS00-A are now Done for their bounded slices; OBS00-B remains blocked, OBS04 Proposed**. Source-wide writer verification, exact transport-byte equality, measured storage/latency, and owner privacy/retention/replay acceptance remain gates. **Wave-4 priority:** [OBS00 source-proven default worker dispatch fault](evidence/live-worker-dispatch-preflight-2026-11-15.md) is the **first pre-live release blocker**. OBS01 remains the best low-risk read visibility fix, OBS02 and OBS03 build source-correct AI evidence, and [OBS04](../changes/2026-11-15--obs04-finite-action-transition-evidence/CHANGE.md) is the first experimental E0 game transition witness. **Current post-wave-5 status:** [OBS02-H](../changes/2026-11-15--obs02-h-stage-integrity/CHANGE.md) and [OBS05](../changes/2026-11-15--obs05-evidence-claim-truth/CHANGE.md) are **Done**. [OBS06 case-scoped Support Situation](../changes/2026-11-15--obs06-case-scoped-situation-read/CHANGE.md) and [OBS07 UI](../changes/2026-11-15--obs07-support-situation-ui/CHANGE.md) are **Proposed**; [decision and security gate](handoff/obs06-support-investigator-2026-11-15.md). No paid call/deployment/retention mutation authorized.
