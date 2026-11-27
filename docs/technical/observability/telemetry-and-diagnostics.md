# Runtime telemetry and operational reliability | OpenTelemetry + pragmatic Grafana stack

**Authority:** this page owns the proposed application-side telemetry contract: OpenTelemetry as the instrumentation standard, the trace and span design, a bounded metric vocabulary, the logging policy, sampling and backpressure rules, and operational objectives (technical recommendation, 2026-11-15). It is the **operational** sibling of [durable evidence](./identities-and-evidence.md), not its replacement. It authorizes no monitoring service, no paid observability account and no application instrumentation change.

**Platform boundary (selected 2026-11-26):** [native observability infrastructure](../platform/observability-native-infrastructure.md) owns the optional five-release local foundation (Prometheus, Loki, Tempo, an OpenTelemetry collector and Grafana), its install, readiness and qualification. This page does not restate that contract and does not assert whether any live stack is running today. The application instrumentation below remains proposed, and durable evidence is unchanged. Historical source observations below are dated, not current inventory; [Reality of current source](#2-reality-of-current-source) is the current realization.

## Owner map

Telemetry stays on this page. Application enrollment stays proposed; the platform stack has its own owner. Durable forensic evidence and provenance stay distinct from lossy telemetry.

| Record | Owner | Standing |
| --- | --- | --- |
| Evidence identity | [Evidence graph](./identities-and-evidence.md#owner-map) | Selected target. Not a landed store. |
| Capture and causal identity | [Committed transition capture](./capture-and-provenance.md#owner-map) | Proposal. |
| Investigation and reconstruction | [Forensic read contract](./investigation-and-reconstruction.md#owner-map) | Proposed read. |
| Retention and access | [Replay, retention and privacy](./retention-and-access.md#owner-map) | Unratified where that page already says so. |
| Telemetry | This page | Application enrollment proposed. The optional native stack is owned by [native observability](../platform/observability-native-infrastructure.md). |

**Negative:** Telemetry is not the canonical replay source. Installed platform charts do not mean any game span exists. A lossy summary does not replace original evidence identity. An analyst read does not grant forbidden prompts. Candidate retention figures stay unratified. This map does not settle a legal, privacy, or access policy, and it does not authorize a new forensic read.

## 1. Platform choice

**Recommend OpenTelemetry as the instrumentation/transport standard**, with a small local Grafana stack for developer and operations use:

~~~mermaid
flowchart LR
  API[Nest API] --> OTLP[OTel Collector / Grafana Alloy-compatible OTLP]
  WORKER[Temporal Worker / Activity] --> OTLP
  DB[Postgres / infra exporters] --> MET[Prometheus metrics]
  OTLP --> TEMPO[Tempo distributed traces]
  OTLP --> LOKI[Loki structured logs]
  OTLP --> MET
  MET --> GRAF[Grafana]
  TEMPO --> GRAF
  LOKI --> GRAF
  API --> SQL[Game/evidence SQL plus immutable artifacts]
  WORKER --> SQL
  SQL --> ADMIN[Offscreen Control: native support/dev investigation]
  GRAF --> ADMIN
~~~

**A logical topology, not a demand to deploy seven services immediately.** The optional native foundation realizes the Prometheus, Loki, Tempo, collector and Grafana releases for local use under its own contract; the application services in the diagram do not yet send OTLP to it. Choose hosted or self-managed observability backends only after measured volume, security and support requirements. Prometheus alone does not archive per-campaign context. Grafana is excellent for system-wide time series and spans; **Offscreen Control** remains the right human-readable investigation product.

**Why not start with LangChain/LangSmith?** The application owns its Storyteller task, tool and publication lifecycle already. Instrument it directly with OTel GenAI conventions and domain evidence. A Langfuse/LangSmith-class tool can add model evaluation/prompt registry capability later, but no framework swap is needed to know which actual task and provider packet executed. A third-party tool must never become the sole long-term holder of a player's game evidence.

## 2. Reality of current source

Source-inspected on this branch. Facts are scoped to the file named; none asserts a running stack.

- **Platform artifacts.** `infra/platform/observability/` carries the five vendored chart archives (Prometheus, Loki, Tempo, OpenTelemetry collector, Grafana), values files, pinned artifacts and an install and readiness implementation (`install.mjs`, `readiness.mjs`, `artifacts.mjs`; release order `obs-prometheus`, `obs-loki`, `obs-tempo`, `obs-collector`, `obs-grafana`). Qualification, live acceptance and the developer contract belong to the [native contract](../platform/observability-native-infrastructure.md). The presence of these artifacts is not a claim that the stack is installed or healthy.
- **Application instrumentation.** `apps/api/package.json` and `apps/worker/package.json` declare no OpenTelemetry or Prometheus client. No application span, OTLP export or application metric endpoint is wired.
- **Process log path.** The application runtime logger is `writeRuntimeLog` in `packages/runtime-logging/src/index.ts` (the earlier path under `packages/application` no longer exists). It writes one JSON line to stderr with `level` (`info`, `warn`, `error`), `event`, `message`, `service` (`api` or `worker`), `timestamp`, optional `correlation` (string map) and optional `errorKind`, and its documentation says game history, provider content, SQL and arbitrary `Error` messages belong in their own stores. `classifyRuntimeError` reduces an error to its name. The API and worker entrypoints, `apps/game-authority` and the worker executor and control entrypoints call it. Nest keeps its standard logger. This is a cautious baseline, **not** distributed tracing or production retention.
- **Database telemetry.** `packages/db/src/telemetry/runtime.ts` (`createDatabaseTelemetry`) keeps in-process counters and admission and pool gauges, and passes an optional observer an allowlisted event (`operation`, `outcome`, `workload`, `category`, `durationMs`, `queueDurationMs`, `count`, `isolation`, `operationName`); an observer failure cannot affect the database runtime. It is scoped database instrumentation, not an exporter and not a game span.
- **Operation trace.** `storyteller-operation-trace.v1` is built in `packages/storyteller/src/providers/operation-trace.ts`. The SA01 sample of 2026-11-14, retained as historical evidence, states that live execution and publication did **not** emit it. On this branch the builder is referenced only by Storyteller tests, fixtures and the QA catalogue. Do not claim zero observability, and do not mistake fixture or lab reports for live end-to-end spans.

## 3. Telemetry is three cheap signals plus one durable evidence spine

| Signal | Contents | Guarantees |
| --- | --- | --- |
| **Metrics (Prometheus)** | Aggregated counters/gauges/histograms by bounded service/operation/result dimensions | Low-cost continuously available trend/SLO, no per-player story detail |
| **Traces (OTel/Tempo)** | Time spent in HTTP, authorization, SQL lock, CAS, outbox, workflow start/Activity, provider dispatch, validation, publication | Operational correlation; can be sampled, expire, partially collected |
| **Structured logs (OTel/Loki)** | Selected categorized incidents and transitions with stable error class and bounded correlation IDs | Searchable process diagnostics; bounded and deletable, **not** the game ledger |
| **Durable forensic evidence (native SQL + CAS)** | Accepted actions, exact frozen request/output artifacts, causal provenance, committed changes/holds, scope and coverage | **Never sampled** for defined critical boundaries, not emitted as verbose logs |

A missing or sampled trace does not mean the operation did not happen, and Support's basic answer must not depend on Loki or Tempo being up. The native evidence spine should provide a developer deep link to a trace when one exists; missing trace is not missing game evidence. Grafana metrics exemplars can link back to traces; Offscreen Control links from a generation or case to the same correlated span/trace.

## 4. Trace context and span design

**Standard**: W3C `traceparent` for HTTP where appropriate; OTel `traceId/spanId` in service spans. Long game time is not one always-open span. Separate **short execution traces** for acceptance, settlement, worker materialization, actual provider round, publication and delivery, with stable domain IDs allowing a graph to connect them over hours/days.

| Boundary | Span / relationship | Evidence link |
| --- | --- | --- |
| `POST/PUT /api/stories...` | server span + auth + domain admission + safe DB statements | `storyId` / `operationId` and accepted command record |
| `story FOR UPDATE` | lock wait and held duration; separate DB time from lock wait | transaction boundary/source revision |
| SQL commit and outbox | transaction span + producer span with notice ID; link to later consumer | `outbox.id`, topic, domain operation ID |
| Temporal workflow | workflow start/activity/signal spans via supported SDK interceptors and safe headers | Workflow ID / Run ID / Activity attempt, stable domain op ID |
| Campaign settlement | execution span, deadline/pace projection, receipt commit | `gameActionExecution.operationId` / event / `gameRoll` |
| CAS materialization | blob/manifest fetch and parse/check spans | frozen hash/type/source, byte counts without body |
| Storyteller admission | task capture, recipe/policy selection, context construction, source read/pack | G / capture/evidence/packet IDs |
| Provider dispatch | per **actual** external request, not one per Storyteller turn | attempt ID, provider name/model/route, status, verified reported usage |
| Tool/agent round | read-only tool invocation, source count/bytes, selected vs returned | modelRoundId / toolCallId / evidence artifacts |
| Output validation | parsed candidate, error category and elapsed time | validator version / candidate artifact ID |
| Publication | last source/actor/receipt/root fence, commit or stale/refusal | `storytellerPublication`, passage/root |
| SSE/Query refresh | downstream notification/GET latency/error; never a game-state owner | `viewVersion`, event sequence and sanitized route |
| Admin read/access | policy evaluation and read latency; sensitive-access audit separate | staff/case/purpose grant ID; never private content in span |

**Async tracing:** an outbox notice may be delivered several times, Temporal can retry an Activity or restart days later, and worker traces may differ from the initial HTTP trace. Use producer/consumer **span links** (not false parent-child across arbitrary hours) plus immutable domain operation IDs. If adding sanitized OTel context to outbox notices or Temporal headers, validate compatibility and guarantee a broken/missing trace does not change command idempotence. Trace IDs are not authorization tokens.

**Temporal nuance:** use the supported TypeScript SDK interceptors for the installed version and verify replay compatibility. Keep custom non-deterministic instrumentation in worker/activity boundaries or replay-safe sinks; do not make Workflow deterministic execution depend on wall time, network exporters, log writes or random span content. Temporal Event History replays **workflow orchestration**, not the entire game state or model response; keep application state/evidence outside it.

**No cascade of nested spans for every trivial function.** Instrument **semantic operation boundaries**, significant I/O, decision gates and stage latency. Too many trivial spans make an “elite” system unusable and expensive.

## 5. Recommended metric vocabulary

Names illustrative; follow OpenTelemetry/Prometheus monotonic/histogram conventions, explicit units and consistent class names:

| Metric | Type and safe labels | Diagnostic question |
| --- | --- | --- |
| `offscreen_commands_total` | counter: commandKind, outcome | Are actions admitted/denied/replayed unusually? |
| `offscreen_command_latency_seconds` | histogram: commandKind, outcome | What is end-to-end command latency? |
| `offscreen_story_lock_wait_seconds` | histogram: operationClass | Are same-story writers stalling? |
| `offscreen_story_lock_hold_seconds` | histogram: operationClass | Is external I/O creeping under locks? |
| `offscreen_outbox_oldest_undelivered_age_seconds` | gauge: topic | Are durable notices stuck? |
| `offscreen_outbox_delivery_total` | counter: topic, result | How often is workflow start failing/retried? |
| `offscreen_temporal_activity_total` | counter: activityType, outcome | Are workers retrying, failing or backlogged? |
| `offscreen_cas_read_duration_seconds` | histogram: objectKind, outcome | Did canonical/source I/O become slow? |
| `offscreen_storyteller_tasks_total` | counter: purpose, finalDisposition | Did we actually publish or hold? |
| `offscreen_storyteller_rounds_total` | counter: purpose, providerFamily, outcome | Which tasks spend model work? |
| `offscreen_storyteller_round_duration_seconds` | histogram: purpose, providerFamily | Provider latency and timeouts |
| `offscreen_provider_usage_microusd_total` | counter from **settled reconciled** charges only | Cost trend separate from reserved/uncertain |
| `offscreen_provider_uncertain_attempts` | gauge: providerFamily | Unknown-billing exposure |
| `offscreen_context_source_outcomes_total` | counter: sourceKind, disposition, reasonClass | Why was context omitted/invalid? |
| `offscreen_publication_total` | counter: purpose, outcome | Model success vs published success |
| `offscreen_evidence_capture_total` | counter: class, result | Is the forensic spine actually writing? |
| `offscreen_evidence_delivery_backlog` | gauge: artifactClass | Are rich artifacts pending/held? |
| `offscreen_admin_sensitive_read_total` | counter: capability, allowDeny, environment | Are sensitive investigations increasing? |

**Cardinality rule:** `storyId`, `playerId`, `generationId`, `attemptId`, `traceId`, prompt/packet hash, free-form outcome and raw HTTP path **must never be Prometheus labels**. They may be carefully classified attributes of a sampled span, structured log metadata or native indexed evidence row, with policy and privacy controls. Unknown/unbounded errors collapse to safe enumerated classes.

## 6. Logging policy: less volume, more signal

Keep the small JSON stderr logger as an adapter at first, but redesign it to emit **typed audited event classes** rather than arbitrary application log strings. A log record should have:

- stable `eventName/eventVersion` and bounded severity/class;
- `service/environment/build/release`, UTC timestamp, trace/span ID if present;
- domain operation/generation/notice ID only where privacy policy allows;
- categorized error family, retryability, owner component and observed outcome;
- no full game state, SQL parameter text, raw provider payload, auth header, session cookie, player prose, secret prompt, hidden NPC plan or arbitrary stack dump.

Use log events for **unexpected exceptions, retry exhaustion, incident transitions, startup/shutdown, critical capture gaps and policy denials needing operational attention**. Routine successful turns should have durable evidence + metrics, not 400 console lines. Enabling DEBUG in production is not the historical evidence strategy.

**Two distinct log classes:** software operations (best-effort, short retention) and security/audit events (structured, governed, separate durable owner). Support/dev UI reads native evidence, not general Loki logs, except when following an explicit technical trace.

## 7. Sampling, reliability and backpressure

- **Never sample** accepted commands, settlement/interrupt events, publication outcomes, cost attempts or required forensic artifact references.
- OTel traces are **non-authoritative and may be sampled** in collector after adequate aggregate metrics. A tail sampler can prioritize errors, slow paths, provider uncertainty and rare incident tags; apply a modest representative baseline for healthy paths. Make sampling rate/config version visible to the investigator.
- Do **not** assume “100% error traces” is guaranteed: collector memory/queue/drop/crash can still lose them. Monitor data quality and expose missing sampled trace honestly.
- Collector batching, retry, queue and optional disk-backed WAL should be bounded and measured. Alert on queue saturation, failed exports, drop counts, ingestion lag and unsupported attributes.
- Evidence storage has **separate, stronger delivery policies**: tiny critical SQL evidence co-committed; large protected CAS data staged/verified before dispatch; optional long-lived indices built later. A collector outage must not roll back an already committed game receipt.
- An incident-only “trace everything for this campaign” mode may raise bounded **operational** sampling/retention with explicit operator approval and TTL, but **cannot magically capture historical data that was never saved**, cannot bypass privacy rights, and must not silently make a model call.
- Preserve normal latency: no blocking observability collector RPC inside `story FOR UPDATE` or provider completion critical path. If byte-exact request retention is an admission requirement, stage it *before* dispatch, outside the long-held story lock.

## 8. Operational objectives and proof

**Illustrative initial SLO/quality targets (not measured claims):**
- 100% of admitted operations have a stable business ID and a terminal-or-held state reachable via native queries.
- 100% of actual paid dispatches have a durable exact packet hash/ref, usage/uncertain state and G/attempt link **before send**.
- No non-provider telemetry failure changes committed mechanics, receipts, time or publication.
- Admin Support summary never depends on Loki or Tempo availability for basic answerability.
- No private narrative or secret in exported metric labels/traces/log samples.
- Source-attributed metrics match authoritative DB aggregates within an explicitly recorded reconciliation window.
- A reproducible zero-provider test can connect one operation's API→outbox→Temporal→CAS→Storyteller→publication stages without assuming one unbroken trace.

**Verify under failure:** collector unavailable, full disk queue, invalid OTel endpoint, worker restart, duplicate outbox notices, Temporal replay and re-delivery, timed CAS delays, provider timeout after send, stale publication, budget denial, admin permission revoked mid-read. Record which signal survived and whether the forensic spine retained complete business truth.

## 9. Tool choice verdict

**Choose OTel + Prometheus + Grafana**, and use Tempo/Loki when actual tracing/log search demand merits operating them. Do **not** force all local dev processes and CI to boot a heavy observability fleet on every `pnpm test:fast`. Start with an optional local observability profile, one test-connected trace and a small operational dashboard.

Do not add Kafka, ClickHouse or a microservice tracing fleet in order to inspect traces; a local optional monolithic trace stack is the candidate. Raw prompts and generation bodies never go to a generic OTel exporter or a hosted third party (GenAI message fields are sensitive); the protected evidence store is the only place those bodies belong.

**Do not choose a specialized LLM dashboard as the history owner.** Langfuse-style linked prompt versions, evaluations and model metrics can be useful later, but its retained traces are neither the game ledger nor a substitute for Offscreen Control’s permissioned source graph. If integrated, outbound events must exclude or deliberately consent/govern sensitive content, and the native evidence spine must still reconstruct the old task without that vendor.

## Folded invariants from the 2026-11 essays

**Proposed application telemetry; not wired.** Platform installation is owned by the native contract. The folded invariants sit where they govern: bounded labels in [section 5](#5-recommended-metric-vocabulary), no raw prompt in logs in [section 6](#6-logging-policy-less-volume-more-signal), missing traces versus durable evidence in [section 3](#3-telemetry-is-three-cheap-signals-plus-one-durable-evidence-spine), and the exporter and third-party limits in [section 9](#9-tool-choice-verdict).
