# Delivery, operations and validation

The portfolio should demonstrate a coherent system operating under failure, not merely a list of technologies. A visitor should be able to run a local demo, experience a short story and inspect evidence of correct scheduling, state handling and measured AI use.

## Local development

Use Docker Compose for PostgreSQL and Redis, with application processes running locally for fast TypeScript feedback. Also provide a full container profile for a reproducible demonstration. Add object storage locally only when media is implemented; use static sample artwork before then. Avoid a dozen mandatory monitoring containers just to open the homepage.

Provide a deterministic fake storyteller/provider for tests and a no-paid-key demo. It should follow the same structured proposal contract as the live adapter and clearly identify itself as a scripted demonstration. Live calls require explicit configured credentials and a budget. Never run paid model tests automatically for arbitrary pull requests.

Pin supported runtime/dependency versions, the package manager and container image versions when scaffolding. Keep a single lockfile. Application code is TypeScript; SQL migrations, Compose YAML and a small documentation checker do not violate that preference.

## First hosted deployment

Use one region with containerized web, API and workers, a managed PostgreSQL database and a compatible Redis service. A small VM with Compose is also viable for a personal demo if its availability limitations are understood. Select the host after checking persistent worker execution, SSE timeouts, resource cost and backup support. Do not choose a host whose background tasks disappear when an HTTP request returns.

Run schema migrations once as a controlled release step. Use expand/contract changes where old and new processes overlap. Version durable job payloads because queued work can outlive a deployment. A deployment must drain workers gracefully or let their leases expire safely; it must not erase schedules.

Set Redis memory policy for queues so keys are not silently evicted; BullMQ recommends `noeviction` and persistence. Keep optional evictable caches separate when introduced, because queue durability and cache eviction have different needs. Redis recovery still depends on PostgreSQL reconciliation. [BullMQ production guidance](https://docs.bullmq.io/guide/going-to-production).

Back up PostgreSQL and demonstrate a restore. Define media retention and backup expectations. Postgres connection limits, model concurrency and provider rate limits are real capacity constraints; set bounded pools and backpressure before adding replicas. Track scheduling lag rather than claiming arbitrary scale.

## Kubernetes as a deliberate extension

Kubernetes is a worthwhile hands-on portfolio exercise after the containerized vertical slice works. It is not needed to make the application modular, nor does it make the database highly available automatically. Production clusters involve availability, access, networking and operational planning beyond writing deployment YAML. [Kubernetes production considerations](https://kubernetes.io/docs/setup/production-environment/).

The learning/demo target is concrete: run the same web/API/worker images in a local cluster, expose them through ingress, configure environment/secrets, add readiness/liveness checks and resource requests/limits, perform a rolling update, kill a worker and verify recovery. Use managed/external stateful services for an initial hosted cluster rather than simultaneously learning to operate PostgreSQL inside Kubernetes.

Keep manifests small. Add autoscaling only after measuring a meaningful signal such as queue lag/concurrency; CPU alone may not describe model-waiting workers. Do not introduce service mesh, multi-region replication, operators or Helm abstractions simply to make the repository look advanced.

## Observability

Correlate request, story, command, decision, generation run, job and delivery identifiers. Structured logs report state transitions and failure categories without exposing secrets or raw private story content by default. Trace slow paths across HTTP, queue wait, context assembly, model attempts and commit.

Track at least:

- Command acknowledgement and time to committed continuation.
- Due-action lag, oldest unpublished outbox item and expired leases.
- Generation validation/repair failures and stale results discarded.
- Input/output/cache usage and cost per accepted continuation and unattended story-day.
- Delivery acceptance/failure and expired notifications, without calling acceptance “read.”
- Budget reservations pending reconciliation and stories held for a clear reason.

Start with structured logs, basic metrics and a useful AI trace destination. Add dashboards that answer operational questions. Hosted tracing must have content redaction/retention settings; local development should still function without the telemetry service.

## Tests that demonstrate the architecture

Use a test runner such as Vitest for pure policy/contract tests, real PostgreSQL/Redis integration tests for transactions and jobs, and Playwright for browser flows. Verify NestJS build/decorator compatibility when scaffolding rather than selecting test configuration by habit. Use controlled clocks in domain tests; real queue smoke tests should not pretend to control provider or OS time.

| Scenario | Evidence required |
| --- | --- |
| Double-click/retried command | One accepted intent and one committed effect. |
| Two players plus deadline | Deterministic sealing of valid submissions; one coherent outcome. |
| Pause during inference | Result cannot advance a paused story; resume preserves remaining time. |
| Companion changes apple location | Old prepared continuation is rejected; billed attempt remains accounted for. |
| Worker dies after commit, before job acknowledgement | Retry returns existing outcome rather than applying it again. |
| Redis loses queued work | Reconciler recovers pending database actions. |
| Model timeout with unknown billing | Reservation remains conservative; no uncontrolled retry cascade. |
| Concurrent budget requests | Aggregate reservations never exceed the application's available allowance. |
| Out-of-order browser responses/reconnect | UI converges on the latest authorized revision. |
| Membership revoked | HTTP, SSE and integration actions cease granting story access. |
| Provider sends invalid references or negative resources | Rejected or bounded repair, never partially committed. |

AI evaluations complement these tests. Maintain a small set of story fixtures spanning tone, unusual characters, long-range callbacks, player agency and shared consequences. Human review checks whether options are meaningful and narration coherent. Repeatable fixtures make model/prompt comparisons possible without claiming deterministic prose.

CI should run formatting/linting, type checks, contract/policy tests, relevant integration tests, builds and documentation checks. Keep live-provider evaluations opt-in and budgeted. Dependency and secret checks matter for a public repository that uses external credentials. Publish measured demo results only after running them; do not populate the README with invented benchmarks.

## Implementation order

1. **Prove integration seams:** scaffold the workspace, verify OAuth/session handling with Nest/Next, same-origin SSE and phone notification feasibility. Select shared decision/pause defaults and the first phone channel. These small checks can prevent expensive architectural rework.
2. **Build a fake-provider vertical slice:** create/invite/start, show the scene, submit intentions, resolve a timed choice, pause/resume and reconnect. Persist it in PostgreSQL and execute jobs through the outbox/BullMQ path.
3. **Add real bounded generation:** premise to preview, structured continuation, relevant context, cost reservation and traces. Use the apple scenario to select plain orchestration or LangGraph based on actual workflow needs.
4. **Make absence convincing:** phone updates, fallbacks, recap, restart recovery and measured quiet-versus-active costs. Demonstrate a remembered fact changing a later scene.
5. **Polish and showcase:** atmosphere and optional images, clear setup instructions, a scripted demo, evaluation examples and failure-recovery evidence. Then add the Kubernetes deployment exercise without rewriting the application as microservices.

No subscription checkout, native app, public matchmaking or multi-agent population simulation is required for this sequence. Technical depth comes from the coherent execution of the intended game.
