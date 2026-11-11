# Observability, performance and operations: engineer for explanation and recovery

**Audience:** observability specialist, backend/platform architect, on-call investigator, performance reviewer, test strategist and independent critic. **Trigger:** new async/external integration, difficult failure diagnosis, meaningful scale/latency requirement, telemetry design, deployment risk or unreproducible incident. Not a mandate to instrument every helper or deploy monitoring products in a pre-POC.

**Route:** [questions first](#1-begin-with-operational-questions) · [signals](#2-choose-logs-metrics-traces-and-profiles-for-different-jobs) · [correlation](#3-track-one-business-operation-across-boundaries) · [performance](#4-understand-latency-capacity-and-queueing) · [instrumentation](#5-design-telemetry-with-semantic-meaning-and-limits) · [operations](#6-alerting-deployment-and-recovery-choices) · [proof](#7-diagnostic-exercises-and-role-evidence).

## Governing model

An observable system is one where a competent engineer can use emitted evidence to distinguish plausible causes **without guessing from the final error message**. Monitoring tells you something is wrong; useful observability helps explain what, where, which operation/owner and why.

The architectural question is not "Should we install OpenTelemetry?" It is **which questions will be hard to answer after a failure or slowdown, and which signals make them answerable at an acceptable cost/privacy level?**

Example: a Storyteller request appears to take 12 seconds. That could be an application queue, SQL connection wait, canonical-document read, provider preflight hold, provider latency, worker backlog, or publication conflict. A single end-to-end timer cannot distinguish them.

### 1. Begin with operational questions

For a feature or component ask:

| Question | Why it changes telemetry |
| --- | --- |
| What user/business outcome matters? | Enqueued vs accepted vs settled vs published are different metrics |
| What should never happen? | Duplicate effect, tenant leak, unbounded charge, lost deadline |
| What are the major boundaries? | API → application → DB/outbox → Temporal → provider → publication |
| What is normal volume/latency distribution? | One rare long task may be fine; a hot synchronous endpoint may not |
| What does a user see on delay/failure? | Need an actionable status resource and reliable correlation |
| What can the operator actually change? | Alert without an action/runbook becomes noise |
| Which data is private? | Traces, model prompts and player prose may carry secrets or personal content |
| What does instrumentation cost? | Storage, cardinality, network, runtime overhead and vendor spend |

**Outcome definitions must be stable:** "generation succeeded" might mean provider responded, semantic validation passed, or story publication committed. Choose separate named stages. This reduces incidents where dashboards are green while the game has not advanced.

## 2. Choose logs, metrics, traces and profiles for different jobs

| Signal | Strongest use | Typical limitation |
| --- | --- | --- |
| Structured logs | Explain one event, state transition or categorized error | Expensive at high volume; search/correlation needed |
| Metrics | Detect patterns, rates, queue depth, saturation and SLO drift | Aggregation hides individual causality |
| Traces/spans | Follow causal path and latency across modules/dependencies | Missing spans and sampling can obscure rare events |
| Profiles | CPU, heap, allocations and hot paths | Cannot by itself explain business correctness |
| Domain audit records | Durable evidence that a command/charge/receipt actually happened | Must be transactionally owned; telemetry pipeline isn't authority |
| User-visible status | What the person can safely do next | May lag operational traces; needs proper public projection |

**Metrics aren't logs with fewer fields.** High-cardinality per-operation IDs usually belong in traces/logs, not labels on a metric. A per-tenant metric may be useful only when the bounded tenant set and privacy costs justify it.

### Common metric families

- **Counter:** monotonically accumulated events such as accepted commands, failed authorizations or retry attempts; consider reset on process restart.
- **Gauge:** current queue length, active workers, open connections, reserved capacity.
- **Histogram:** latency, response size, DB wait and provider duration. Tail/percentiles need bucket and aggregation discipline.
- **RED:** Rate, Errors, Duration of a service or operation.
- **USE:** Utilization, Saturation, Errors of a constrained resource (CPU, DB pool, worker queue).

**Average can lie.** Ninety-nine fast calls and one very slow one can have an acceptable average while the one user experiences a timeout. But a p99 from a tiny sample is noisy, and averaging p99 values from separate services is usually not a valid global percentile calculation.

## 3. Track one business operation across boundaries

A good correlation model distinguishes:
- HTTP request ID: one transport attempt.
- Authenticated owner/tenant identity: sensitive scope, not a public log label by default.
- Stable business operation ID: intent may outlive any one request.
- Provider attempt ID: individual potentially billed external call.
- Workflow/outbox notice ID: delivery can repeat.
- Story/root/version identity: authoritative state against which publication is checked.
- Trace/span context: operational causal lineage, propagated where appropriate.

**Example state path:**

§§§text
HTTP submit [request R1]
  → application admits [operation O, story revision V8]
  → SQL commits [receipt/admission A]
  → outbox notice [N1]
  → workflow/worker [W1; attempt may repeat]
  → provider attempt [P1, usage known/uncertain]
  → semantic validation
  → publication [source revision V8 still valid?]
  → public snapshot [V9 or blocked]
§§§

If an outbox notice repeats, two *delivery events* may share one *business operation*. Treating them as distinct accepted actions in logs causes false conclusions. Correlation helps identify duplicates; application-side durable constraints actually prevent wrong effects.

**Trace propagation across async work:** preserve trace links or stable correlation through message metadata without turning trace context into business authority. A trace ID is not an idempotency key. Do not rely on in-memory correlation surviving process restart without persisted operation identity.

### Evidence versus diagnostic observation

Logs and traces can be dropped, delayed or sampled. **They must not be the source of financial charge, game outcome or permission truth.** Durable application records are authoritative. A missing span is a reason to investigate instrumentation, not evidence that the operation never happened.

## 4. Understand latency, capacity and queueing

Request time is often a **sum of waits**, not a single slow function:

§§§text
T_total = client/network + reverse proxy + app queue
        + DB pool wait + SQL execution + downstream queue/provider + publish
§§§

The critical path may contain parallel branches; their durations don't simply add. Inspect a representative trace and resource saturation before recommending a cache, worker pool, timeout increase or service split.

| Symptom | Competing explanations | Discriminating observation |
| --- | --- | --- |
| High latency with low CPU | DB pool queue, remote I/O, lock wait, stalled worker | Pool wait + trace spans + DB locks |
| Queue growing | Input exceeds service capacity, stuck consumer, retry storm | Arrival/completion rates, age of oldest item |
| Sporadic timeout | Tail latency, DNS/TLS, proxy cutoff, retry amplification | Per-hop timings and transport errors |
| High CPU with slow event loop | JSON serialization, synchronous algorithms, GC | Event-loop delay, CPU profile, heap |
| High DB usage | N+1 queries, missing index, hot transaction, too many connections | Query plan, pool usage and lock timing |
| Redis “helps” until incident | Stampede, stale repopulation, eviction, fallback surge | Miss rate by key family, origin demand, memory/eviction |
| Provider costs spike | Increased attempts, context size, cache write pricing, incomplete reconciliation | Operation/attempt ledger, token classes, billing state |

**Concurrency limits differ from rate limits:** a service may accept ten requests per second but stay saturated if each request lives for 60 seconds. Queueing theory matters: as utilization approaches capacity, latency tails often grow sharply. Load-shedding, admission, bulkheads and backlog policy may beat adding more retries.

Do not propose scaling infrastructure until the bottleneck is isolated or the uncertainty is expressed as a measured hypothesis.

## 5. Design telemetry with semantic meaning and limits

[OpenTelemetry semantic conventions](https://opentelemetry.io/docs/concepts/semantic-conventions/) provide names for operations across traces, metrics, logs and resources. Use standard concepts when appropriate, but confirm installed SDK/instrumentation versions rather than assuming future attribute names are universally available.

### What a useful span or event records

- Operation/stage identity and start/end timestamps or monotonic duration.
- Relevant service/dependency, bounded status and error **class**.
- Safe correlation IDs and current revision/version where operationally useful.
- Whether this step is requested, admitted, dispatched, settled, published, uncertain or rejected.
- Resource cost in correct units when it is known and reconciliation is authoritative.
- No raw secrets, full tokens, private passages, unredacted prompts or user content by default.

**Sampling trade-offs:** traces are valuable for a handful of rare failures but expensive at high volume. Head-based sampling can miss rare incidents; tail-based sampling helps capture interesting outcomes but needs buffering/infrastructure. Keep error/audit records separate where regulatory/business evidence must be durable.

**Cardinality trade-off:** a metric label for every request ID can overload storage. Use a bounded set of values for metric dimensions and place high-cardinality IDs in traces/logs with appropriate retention and privacy restrictions.

### Logging and privacy

Do not log entire inbound bodies or external model payloads simply to aid debugging. Prefer content-free diagnostic paths and secure, explicitly bounded private artifacts when deep reproduction truly requires them. Redaction at ingestion may be too late if logs were already transmitted. Define retention and access.

## 6. Alerting, deployment and recovery choices

An alert should correspond to a **meaningful user or operator action**. A million low-priority alerts degrade incident response; a single SLO/error-budget signal can be better than thresholds on every metric.

**SLO selection:** distinguish user-observable availability, authoritative command correctness, acceptable response latency, background completion time and data integrity. No universal SLO target exists for a local pre-POC. Define measures with actual workloads before installing dashboards.

**Release strategy choices:** simple full deploy for local development, rollback/restart when safe, canary/shadow for high-risk live services, feature flags for independent exposure, expand/migrate/contract for persistent schema changes. Every technique adds operational overhead. Don't build production Kubernetes rituals merely to demonstrate engineering sophistication.

**Incident handling loop:** detect → scope impact → preserve evidence → stop unsafe amplification → choose reversible mitigation → confirm recovery → record root mechanism and preventative verification. An incident report should distinguish observation, likely cause, uncertainty and evidence that would falsify the explanation.

**Runbook quality:** a procedure should say what data to inspect, safe read-only commands, dangerous actions requiring approval, and success/failure checks. A dashboard screenshot alone is not a recovery procedure.

## 7. Diagnostic exercises and role evidence

### Exercise A: “Twelve seconds vanished”

The UI times out in 5 seconds; API logs show 80 ms of handler execution; worker eventually publishes the result. Where did time go?

Possible causes: proxy buffering, a pending long task outside HTTP, client timeout lower than server operation lifetime, stale retry or separate workflow queue. A useful design would distinguish accepted/pending from completed, propagate IDs across request/worker and capture per-stage timings. It would **not** simply increase the API timeout and call the problem solved.

### Exercise B: “Metric says zero provider calls”

The provider ledger shows a billed attempt; tracing shows no call span. Possibilities: sampling, instrumentation missing, process crash after dispatch, trace context lost, bypassed adapter. The ledger is business truth; missing telemetry is not a refund.

### Exercise C: “99% hit rate, origin still down”

One hot key expires, thousands of requests miss together, origin DB floods. Diagnose concurrency and miss distribution before raising cache size. Consider singleflight, jitter, stale-while-revalidate and backpressure according to consistency policy.

### Exercise D: “Every tenant stopped”

One account experiences uncertain external billing; the dashboard shows a platform-wide stop. Determine whether the stop is account-owned, window-owned or global policy. A correct alert needs scope and attempt provenance; metrics must not imply global policy when one DB update accidentally affected every row.

### Role outputs

| Role | Useful deliverable |
| --- | --- |
| Product/architect | User-impactful reliability target and which operational complexity is justified |
| Observability specialist | Trace/correlation boundary, logs/metrics design, cardinality/privacy budget |
| Performance reviewer | Ranked bottleneck hypotheses and one discriminating measurement |
| Security reviewer | Sensitive-data fields/retention and trust-boundary implications |
| Test strategist | Fault injection/latency/incident reproduction matched to exact property |
| Release reviewer | Deployment, rollback, migration, alert and recovery plan |

**Primary references:** [OpenTelemetry conventions](https://opentelemetry.io/docs/concepts/semantic-conventions/), [OpenTelemetry documentation](https://opentelemetry.io/docs/). **Deeper study:** [Observability and production systems](https://github.com/DenisSkulovic/the-modern-software-engineer/blob/main/book/SE/SE440-production-reliability/SE440-L01-observability-understanding-production-systems.md), [Production data repair and audit](https://github.com/DenisSkulovic/the-modern-software-engineer/blob/main/book/SE/SE325-backends-in-the-wild/SE325-L04-production-data-repair-audit-and-lifecycle.md), [Distributed partial failures](https://github.com/DenisSkulovic/the-modern-software-engineer/blob/main/book/CS/CS430-distributed-systems/CS430-L01-distributed-systems-and-partial-failure.md).

**Status:** professional knowledge for design and review roles, not a new monitoring deployment plan. No application code, hosted infrastructure, new subscription or paid provider call is authorized by reading it.
