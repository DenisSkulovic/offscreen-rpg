# Operational telemetry bootstrap | Exact API/worker/Temporal correlation boundaries

**Status: proposed implementation-grade OTel design, wave 4, 2026-11-15. No code, dependencies, Docker configuration or telemetry service deployed.** Parent [operational strategy](telemetry-and-operations.md), [durable evidence spine](evidence-model.md), [AI/worker chronology](../evidence/writer-closure-and-sequence-2026-11-15.md), [protected read policy](forensic-access-and-read-contract-v1.md). Source inspected from GitHub `main@7e15db38`. Reference official [OTel Node.js instrumentation](https://opentelemetry.io/docs/languages/js/instrumentation/), [Temporal TypeScript SDK](https://github.com/temporalio/sdk-typescript), [Prometheus naming/cardinality](https://prometheus.io/docs/practices/naming/) and [OTel GenAI span conventions](https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-spans.md).

## 1. Current application and concrete tool choices

- Root `package.json` targets **Node >=24.19.0 <25**. API and worker are compiled TypeScript and run Node entrypoints (`apps/api/src/main.ts`, `apps/worker/src/bootstrap/main.ts`).
- Worker declares `@temporalio/{client,worker}@1.24.0`. Temporal also runs locally via `compose.yaml`, but no inspected installed OTel SDK/Prometheus/Tempo/Loki/Grafana service exists in the current dependencies/Compose.
- `packages/application/src/runtime-logging/index.ts` is a small structured JSON stderr logger with bounded service/event/correlation/errorKind fields. Preserve its source interface until a deliberate adapter migration.
- The game/Storyteller uses Postgres, Redis, canonical CAS and Temporal outbox. Those are enough for **native business evidence**; OTel remains a separate operational stream.

**Recommendation:** instrument Node API/worker with OpenTelemetry JavaScript SDK, OTLP to a local collector, Prometheus metrics, Tempo traces, and optional Loki for bounded structured operational logs. Grafana is the **SRE/system dashboard**, not the privileged native prompt/story investigator. Prefer optional local Compose profile (or documented separate compose overlay) so normal `pnpm test:focus` and developer coding do **not** need a heavyweight observability fleet.

**No Kafka just for tracing.** For this project size, an optional monolithic Tempo setup is a simpler starting point than Kafka-backed distributed ingestion. Add complexity only after measured throughput and actual developer benefit.

## 2. OTel bootstrap contract

The Node SDK must initialize **before** importing Nest/HTTP/pg/Temporal instrumentation targets. An initializer executed after importing the entire API or worker graph can silently create no-op instrumentation. Choose a clear preload or explicit startup entrypoint (e.g. a tested Node `--import` preload) aligned with compiled ES/CJS build and root Node24 policy.

**Separate per-process resources:**

| Process | Required resource dimensions |
| --- | --- |
| `offscreen-api` | `service.name, service.version/buildGitSha, deployment.environment, service.instance.id` |
| `offscreen-worker` | same, with worker namespace/queue as **low-card** attribute if stable |
| `offscreen-replay-tool` / laboratory | separate environment/service to prevent synthetic traces being mistaken for production |
| `Temporal server/Postgres/Redis exporters` | their own infrastructure entities, not forged into application span names |

**Instrumentation config itself is evidence:** persist a safe instrumentation build/version and sampling policy ID in service health, so developers can distinguish “trace was sampled out” from “instrumentation was disabled” or collector outage. Do not put user identity or secret environment vars in resource attributes.

**Never rely on tracing to work for game correctness.** If collector connection fails, the API/worker still operates and durable native evidence retains accepted state. The only fail-closed archival requirement is the separately governed protected packet custody before **new paid model send**, not OTel exporter success.

## 3. OTel semantic span boundaries (no microscopic function spam)

### API request path

~~~text
HTTP server span [POST /api/stories/:id/... sanitized route template]
   -> authenticate + authorize (result class only)
   -> game command admission (operation class and outcome)
   -> Postgres lock wait and hold (measured, explicit)
   -> transaction commit / accepted business operation ID
   -> optional outbox producer span (link identity)
HTTP response (safe status)
~~~

- Automatic HTTP/pg instrumentation can create a baseline; add **manual semantic spans** only for domain stages, hot lock timings and actual failure classifications.
- Record `http.route` as a **template** not user-provided path with story ID. Never record request body, user text, prompt, SQL bindings, session cookie, auth header, unbounded exception.message or raw error.stack by default.
- Domain storyId/operationId may be available in **native indexed evidence**, not Prometheus labels. If considered as span attributes, privacy/retention/export policy must explicitly allow; avoid their repeated export to untrusted third parties.
- Add safe event category, execution mode, source purpose and outcome. Unknown errors collapse to enumerated class.

### Durable worker/outbox path

~~~text
OUTBOX SQL commit (business evidence + noticeId)
  -> producer timing span / correlation fields
  ... time gap ...
relayOne claims notice, independent worker trace
  -> deliverOutboxNotice selects exact topic/workflow ID
  -> Temporal Workflow start/signal (actual workflow/run identity)
  ... real time gap, retries / Continue-As-New ...
  -> Activity receives operationId
  -> short source transaction / CAS / model / publication spans
  -> native causal graph relates them by stable business IDs
~~~

**No mythical “one span across an eight-hour storyline.”** Use span links and durable evidence edges across process/Workflow/activity boundaries, because trace context may be absent/expired or Temporal may replay. Outbox notice ID and topic plus workflow/run/Activity identity are stable for diagnosis; business idempotency still lives in SQL source, not trace context.

**Outbox payload caution:** current `outbox` row stores noticeId/topic/operationId and delivery lease; do not blindly append W3C headers to every persisted event without schema/compatibility review. A sanitized trace carrier in the notice may be optional, and if lost/invalid cannot affect business delivery. A weaker alternative is to create a new consumer trace and link **native operationId** in protected evidence only. Choose after proof, not an assumption.

### Temporal replay safety

Temporal **Workflow replay** re-executes deterministic workflow control flow from history; it is not player Story Replay. OTel instrumentation inside workflow sandbox can introduce nondeterminism if the SDK/interceptor is incompatible. The Temporal TypeScript SDK maintains specific OTel interceptor packages; verify **SDK 1.24.0 ↔ OTel JS SDK 2 ↔ interceptor version compatibility** against the actual installed versions. Test worker restart/history replay with and without instrumentation before enabling workflow-level tracing.

**Start conservatively:** first instrument **outbox relay and Activity handlers outside deterministic Workflow code** (real I/O, well bounded). Add Workflow interceptors only with explicit deterministic replay tests and a source-authorized reason. Do not put Date.now, random UUID or exporter I/O into deterministic Workflow bodies.

### Model/provider path

Distinct spans/metrics for:
- `ai.context.capture/materialize` SQL/CAS stages with prepared G and source hashes held in native evidence;
- `ai.prompt.compile` input size, source count, selected/omitted reason class;
- `ai.dispatch.review` and budget `reserve/dispatch` with safe provider/model/price-policy version;
- actual `ai.provider.call` attempt, duration, HTTP/status class and **reported** token/charge (unknown remains unknown);
- `ai.tool.read`/memory round with read count/bytes and result status, never raw evidence body;
- `ai.validation` output correctness, version and diagnostic class;
- `ai.publication` reason/commit/stale, linked to published passage;
- `forensic.evidence.write`/`forensic.evidence.missing` capture overhead.

**Source caution:** current default live-worker wiring is [pre-live blocked/inconsistent](../evidence/live-worker-dispatch-preflight-2026-11-15.md). Do not “test observability” by turning on real provider traffic until OBS00 safety is resolved under independent authorization. A successful mock trace does not prove model billing or production request equality.

## 4. Metric naming, labels and cardinality budget

**Never** use `storyId`, `ownerId`, `generationId`, `operationId`, `attemptId`, free-form prompt hash, raw HTTP path, exception message, email or user content as Prometheus labels. Each unique label-value combination creates a separate time series; cardinality can explode well before thousands of users.

Proposed bounded families:
- `offscreen_story_command_total{kind,outcome}`
- `offscreen_story_lock_wait_seconds{writer_class}` histogram
- `offscreen_story_lock_held_seconds{writer_class}` histogram
- `offscreen_activity_settlement_seconds{process_kind,result}`
- `offscreen_outbox_pending{topic}` gauge
- `offscreen_outbox_attempt_total{topic,outcome}`
- `offscreen_temporal_activity_total{activity_type,outcome}`
- `offscreen_storyteller_stage_total{purpose,stage,outcome}`
- `offscreen_model_attempt_total{provider_family,model_class,result}`
- `offscreen_model_request_seconds{provider_family,model_class,result}` histogram
- `offscreen_model_usage_microusd_total{provider_family,model_class}` only from reconciled settled amounts
- `offscreen_model_uncertain_attempts{provider_family}` gauge
- `offscreen_publication_total{purpose,disposition}`
- `offscreen_evidence_capture_total{kind,result}`
- `offscreen_evidence_capture_backlog{kind}`
- `offscreen_admin_private_disclosure_total{capability,result}`

**Labels must be closed enums** with a central owner/registry; model IDs can proliferate, so use a bounded model family/class and keep exact model name in native attempt evidence. Document expected cardinality before enabling a metric. A label such as `reasonClass` needs a fixed allowlist; random error names are not a metric taxonomy.

## 5. Logs, retention, and collection

- **Operational JSON stderr** remains low-volume: unexpected exceptions, exhausted retries, explicit stage failures, data capture outage, dependency startup/shutdown and access denials, **not** every successful source field.
- Use fields: `timestamp,service,build,environment,eventKind,errorClass,operationClass,traceId/spanId optional, safe IDs where permitted`. Sanitization/redaction happens at emitter boundary and collector, not by trusting that programmers won't log private JSON.
- OTel GenAI semantic conventions explicitly warn that instructions/input/output bodies are sensitive/large and should not be captured by default. Keep raw protected requests in native governed artifacts, not in general Tempo/Loki exporters.
- Local OTLP Collector/Alloy with bounded batching/retry/backpressure. If enabled, add finite disk/WAL queue, sampling policy and drop/queue-health metrics. Collector outage must not cause a game transaction to wait.
- Traces can be tail-sampled for errors/latency/uncertain provider attempts with representative healthy baseline, but sampling/queue overflow still means **some** spans may be lost. Native evidence chronology remains intact.
- The current log emitter has bounded correlations; preserve this discipline when adopting OTel. Do not turn DEBUG on across all services to compensate for missing prompt provenance.

## 6. Minimal local developer experience

Proposed opt-in workflow after implementation:
1. `pnpm infra:up` boots today's normal Postgres/Temporal/Redis/document dependencies.
2. Explicit profile `pnpm observability:up` or equivalent brings Collector+Tempo+Prometheus+Grafana, optionally Loki. This is **future script design**, not an existing command.
3. API and worker start with early OTel bootstrap **only when observability opt-in**; disabled mode has no additional startup dependency or blocking.
4. Grafana has a small set of maintained dashboards: command latency/lock wait, outbox/Temporal backlog, provider uncertainty/spend, CAS latency and evidence ingestion health.
5. A user operation/campaign incident can be opened in native Admin, which shows committed source/evidence and a **trace deep link when available**. Grafana never becomes the only place that knows what happened.

**Avoid microservices and Kafka for the sake of having a fancy diagram.** The goal is an ergonomic instrumented modular monolith, not a separate observability engineering department.

## 7. Correctness and failure gates before code

- No OTel SDK packages are currently configured; select versions compatible with Node24, Nest/pg, Temporal TS1.24 and build/runtime module system. Test actual bootstrap order with a synthetic HTTP span and worker Activity span.
- Workflow replay test catches any non-deterministic interceptor behavior; if it fails, disable workflow-level instrumentation and keep Activity/outbox spans until fixed.
- Inject collector outage/full queue; game business commit and paid capture custody still succeed or safely hold according to **native E0/E1** policy, without adding story lock latency.
- Inject 0/250/2000ms CAS delay and same-story contender; OTel spans measure real lock wait/hold, not inferred from overall operation latency.
- Scrub test sentinel private user prompt, secret auth header and password; none appears in OTLP span/log attributes or Prometheus labels.
- Verify duplicate outbox/Temporal wake creates new *operational attempts* where real, but **no** duplicate business result/G/cost/evidence transition.
- If native evidence shows G with no provider dispatch, no OTel span may imply a paid call was sent. Trace absence must not be used as proof of non-execution.
- Ensure an instrumented normal request produces bounded span count and stable metrics labels, not thousands of spans per simple story turn.
- Measure collector resource use/disk size at 10/100/1000 synthetic turns before deciding production retention/ingestion quotas.

**Execution gate:** this is design only. OTel implementation is independent of first OBS00–OBS04 semantic-source fixes and can be proposed as a separate Change when the owner authorizes tooling and a resource budget. No current PR code changes or service configuration.
