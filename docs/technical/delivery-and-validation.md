# Delivery, operations and validation

The portfolio should demonstrate a coherent system operating under failure, not merely a list of technologies. A visitor should be able to run a local demo, experience a short story and inspect evidence of correct scheduling, state handling and measured AI use.

## Local development

Use Docker Compose for application PostgreSQL and a local Temporal development service, with application processes running locally for fast TypeScript feedback. Persist local Temporal state when demonstrating restart recovery; an ephemeral test service cannot prove persistence across service restarts. Also provide a full container profile for a reproducible demonstration. Add object storage locally only when media is implemented; use static sample artwork before then. Redis is not a required local dependency.

Provide a deterministic fake storyteller/provider for tests and a no-paid-key demo. It should follow the same structured proposal contract as the live adapter and clearly identify itself as a scripted demonstration. Live calls require explicit configured credentials and a budget. Never run paid model tests automatically for arbitrary pull requests.

Pin supported runtime/dependency versions, the package manager and container image versions when scaffolding. Keep a single lockfile. Application code is TypeScript; SQL migrations, Compose YAML and a small documentation checker do not violate that preference.

## First hosted deployment

Use one region with containerized web, API and Temporal workers plus managed application PostgreSQL. Prefer Temporal Cloud for the first hosted release if its measured cost fits the project budget; we still run our own application workers. Confirm current pricing, retention and connectivity before provisioning. Self-hosting Temporal is an alternative only with an explicit plan for its persistence, upgrades, security and recovery. A development server or casual Compose setup is not the production service. [Temporal deployment](https://docs.temporal.io/self-hosted-guide/deployment).

Run application schema migrations once as a controlled release step. Use expand/contract changes where old and new processes overlap. Version Activity and message payloads because executions can outlive a deployment. Use compatible workflow changes or supported worker/workflow versioning, replay representative histories before rollout and drain workers gracefully. A new build must not strand running stories through nondeterministic replay. Temporal persistence upgrades are separate from application migrations. [Temporal workflow versioning](https://docs.temporal.io/develop/typescript/workflows/versioning).

Separate short control Activities from long model/media work through Temporal Task Queues and concurrency limits. Begin with a small number of worker roles, not one queue per story. Reserve capacity for command processing and pause handling while generation is in flight. Monitor the outbox relay that connects database receipts to Temporal; its retry policy is independent of expensive model work.

Back up application PostgreSQL and demonstrate a restore. Also establish Temporal history retention and recovery: restoring only application tables cannot recreate a lost execution history. Reconcile restored database revisions against workflow state before resuming affected stories. Define media retention and backup expectations. PostgreSQL connection limits, Temporal capacity, model concurrency and provider rate limits are real constraints; set bounded pools and backpressure before adding replicas. Track timer-to-effect lag rather than claiming arbitrary scale.

## Kubernetes as a deliberate extension

Kubernetes is a worthwhile hands-on portfolio exercise after the containerized vertical slice works. It is not needed to make the application modular, nor does it make the database highly available automatically. Production clusters involve availability, access, networking and operational planning beyond writing deployment YAML. [Kubernetes production considerations](https://kubernetes.io/docs/setup/production-environment/).

The learning/demo target is concrete: run the same web/API/worker images in a local cluster, expose the web/API through ingress, configure environment/secrets, add readiness/liveness checks and resource requests/limits, perform a rolling update, kill a worker and verify recovery. Workers poll Temporal over their service connection. Use managed/external PostgreSQL and Temporal for an initial hosted cluster rather than simultaneously learning to operate both stateful systems inside Kubernetes.

Keep manifests small. Add autoscaling only after measuring a meaningful signal such as Task Queue schedule-to-start latency or available worker slots; CPU alone may not describe model-waiting workers. Do not introduce service mesh, multi-region replication, operators or Helm abstractions simply to make the repository look advanced.

## Observability

Correlate request, story, command, decision, generation operation, Temporal Workflow ID/Run ID, Activity and delivery identifiers. Structured logs report state transitions and failure categories without exposing secrets or raw private story content by default. Use replay-aware workflow logging to avoid misleading duplicate logs. Trace slow paths across command receipt, Temporal task wait, context assembly, model attempts and commit.

Track at least:

- Command acknowledgement and time to committed continuation.
- Timer-to-effect lag, unprocessed command age, oldest unpublished outbox notice and Task Queue latency.
- Failed/stuck workflows, repeated Activity timeouts and workflow-history growth.
- Generation validation/repair failures and stale results discarded.
- Input/output/cache usage and cost per accepted continuation and unattended story-day.
- Delivery acceptance/failure and expired notifications, without calling acceptance “read.”
- Budget reservations pending reconciliation and stories held for a clear reason.

Start with structured logs, basic metrics and a useful AI trace destination. Add dashboards that answer operational questions. Hosted tracing must have content redaction/retention settings; local development should still function without the telemetry service.

## Tests that demonstrate the architecture

Use a test runner such as Vitest for pure policy/contract tests, PostgreSQL plus Temporal integration tests for execution, and Playwright for browser flows. Verify the runner's compatibility with NestJS decorators and Temporal's Node worker/test environment when scaffolding. Temporal's test environment supports time skipping, allowing multi-hour waits to be exercised quickly. [Temporal testing](https://docs.temporal.io/develop/typescript/best-practices/testing-suite).

Temporal test time does not advance PostgreSQL's wall clock. For workflow-only tests, mock timing/admission Activities consistently; for cross-system deadline tests, use short real durations or an explicit test clock adapter aligned on both sides. Include history replay and Continue-As-New tests. Keep real service restart tests separate from time-skipping tests so the demonstration actually proves recovery.

| Scenario | Evidence required |
| --- | --- |
| OAuth interrupted while following an invitation | Safe return to the invite; expiry/capacity rechecked; no duplicate membership. |
| Friend edits a character while a preview is generating | Old candidate cannot become the live opening; its actual usage remains recorded. |
| Start clicked twice or retried after initialization commit | One frozen candidate, one opening and one live workflow chain. |
| Double-click/retried command | One accepted intent and one committed effect. |
| Two players plus deadline | Deterministic sealing of valid submissions; one coherent outcome. |
| Pause during inference | Result cannot advance a paused story; resume preserves remaining time. |
| New generation races a received but unapplied pause | Pending control fence blocks it until the command settles. |
| Companion changes apple location | Old prepared continuation is rejected; billed attempt remains accounted for. |
| Worker dies after database commit, before Activity completion is recorded | Retry returns existing outcome rather than applying it again. |
| Command receipt commits while Temporal is unavailable | Outbox delivery eventually wakes the workflow; pre-deadline admission is preserved. |
| Worker restarts during a long timer | Workflow replays and continues without recreating the wait or calling the model again. |
| Continue-As-New with pending inputs | Commands remain ordered and deduplicated across runs. |
| Signal arrives during inbox drain or an old notice targets a finished story | No lost wake-up and no accidental restart. |
| New workflow build meets an existing history | Replay is compatible or the prior worker version remains available. |
| Model timeout with unknown billing | Reservation remains conservative; no uncontrolled retry cascade. |
| Concurrent budget requests | Aggregate reservations never exceed the application's available allowance. |
| Budget period changes while usage is uncertain | Existing reservation remains accounted for; no automatic duplicate credit. |
| Provider/allowance recovers while manually paused | Blocker recovery does not resume a player's paused story. |
| Deadline expires with no permitted fallback | Story holds, then explicit recovery provides a valid fresh decision; old buttons remain expired. |
| Out-of-order browser responses/reconnect | UI converges on the latest authorized revision. |
| Readiness, pause or image changes without new narration | View version advances and clients see the change. |
| Return on a second device while a recap generates | Current decision stays available; read cursor is monotonic and recap coverage explicit. |
| Membership revoked | HTTP, SSE and integration actions cease granting story access. |
| Shared browser switches accounts or story pauses before push send | Old account/deadline does not receive a newly generated actionable notification. |
| Story finishes or is deleted while media/generation completes | Late work cannot advance/recreate the story or replace the current scene. |
| Provider sends invalid references or negative resources | Rejected or bounded repair, never partially committed. |

These are implementation acceptance cases, not tests already written or passed. Documentation/link checks only validate the documents. Prove the fake-provider slice against the lifecycle and race cases before claiming durable gameplay; live model evaluations then test a different property, narrative quality.

AI evaluations complement these tests. Maintain a small set of story fixtures spanning tone, unusual characters, long-range callbacks, player agency and shared consequences. Human review checks whether options are meaningful and narration coherent. Repeatable fixtures make model/prompt comparisons possible without claiming deterministic prose.

CI should run formatting/linting, type checks, contract/policy tests, relevant integration tests, builds and documentation checks. Keep live-provider evaluations opt-in and budgeted. Dependency and secret checks matter for a public repository that uses external credentials. Publish measured demo results only after running them; do not populate the README with invented benchmarks.

## Implementation order

1. **Prove integration seams:** scaffold the workspace, verify OAuth/session handling including invite return, same-origin SSE and phone notification feasibility. Select shared decision/pause defaults, the pace/deadline rule and the first phone channel. These small checks can prevent expensive architectural rework.
2. **Build a fake-provider vertical slice:** edit a draft, invite, generate/review a candidate, start once, show the scene, submit intentions, publish a prepared interruption, resolve a timed choice, pause/resume and reconnect. Use PostgreSQL receipts/outbox, one story workflow and idempotent Activities. Prove worker restart, stale-candidate rejection and duplicate-message handling before adding paid calls.
3. **Add real bounded generation:** premise to preview, structured continuation, relevant context, cost reservation and traces. Keep model/tool steps in TypeScript Activities and verify ambiguous-call recovery; add no second agent orchestration engine without an actual need.
4. **Make absence convincing:** phone updates, fallbacks, recap, restart recovery and measured quiet-versus-active costs. Demonstrate a remembered fact changing a later scene.
5. **Polish and showcase:** atmosphere and optional images, clear setup instructions, a scripted demo, evaluation examples and failure-recovery evidence. Then add the Kubernetes deployment exercise without rewriting the application as microservices.

No subscription checkout, native app, public matchmaking or multi-agent population simulation is required for this sequence. Technical depth comes from the coherent execution of the intended game.
