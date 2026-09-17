# Delivery, operations and validation

The portfolio should demonstrate a coherent system operating under failure, not merely a list of technologies. A visitor should be able to run a local demo, experience a short story and inspect evidence of correct scheduling, state handling and measured AI use.

## Local development

Use Docker Compose for application PostgreSQL and a local Temporal development service, with application processes running locally for fast TypeScript feedback. Persist local Temporal state when demonstrating restart recovery; an ephemeral test service cannot prove persistence across service restarts. Also provide a full container profile for a reproducible demonstration. Add object storage locally only when media is implemented; use static sample artwork before then. Redis is not a required local dependency.

Provide a deterministic fake storyteller/provider for tests and a no-paid-key demo. It should follow the same structured proposal contract as the eventual live adapter and clearly identify itself as a scripted demonstration. The current phase keeps paid integrations disconnected while the broader application is built, tested and tuned. Enable them only when the user explicitly elects to do so; credentials and budgets alone do not authorize that step. Never run paid model tests automatically for arbitrary pull requests.

Pin supported runtime/dependency versions, the package manager and container image versions when scaffolding. Keep a single lockfile. Application code is TypeScript; SQL migrations, Compose YAML and a small documentation checker do not violate that preference.

## Scripted testing chamber

The next runnable target is a short, persistent solo scenario with authored content and real application behavior. This is a development fixture, not a new game mode or a commitment to the final mechanics. It must use the application's story storage, command admission, transition validation, Temporal execution and browser reads. The existing in-memory `/demo` can remain a presentation example; it is not the chamber's source of authoritative state.

The first connected fixture has only a few passages:

1. Begin in a chamber and choose to approach a gate or leave.
2. Approaching changes the situation and offers a reply. Tell a joke or say goodbye.
3. Reach a saved conclusion. Reopen the page and inspect the ordered history; old choices cannot replay it.

This establishes a playable narrative branch without making an invented token economy a prerequisite. Extend the connected flow with a short real wait, held response window, permitted timeout default and pause/resume. Add one identity-bearing item transfer or consumption as a separate concrete effect, committed with its narrative consequence and protected against retries. The timed cafe fixture implements a 20-second wait and background arrival. Pause/resume, response defaults and inventory effects remain unimplemented. The immediate conversation alone does not demonstrate offscreen gameplay.

The exact text and example objects are replaceable. Start with seconds-long waits for convenient observation, explicitly separate from fictional duration. For this fixture, quiet waits advance fictional time, response windows hold the fictional situation, and manual pause freezes both progression and the remaining response opportunity. Use fixed durations per passage; mid-interval speed changes, continuous travel progress and arbitrary interruption are outside this first experiment. These declared fixture rules do not settle the general pacing or autonomy controls.

Review the minimal versioned passage/option/effect contract before creating tables. Include only what these transitions actually need: stable references, authorized choice identity, explicit supported effects, timing and terminal behavior. The scripted source supplies proposed content and effects; the server validates and commits them. Do not let arbitrary script callbacks mutate database state or let the browser supply the next passage, item ownership or deadline. Presentation content is not an executable story; only a registered authored fixture currently resolves choices, and time/effect policies must be implemented explicitly.

Keep inspection modest and separate from the story presentation. Expose the committed revision, current passage/decision, relevant possessions/facts, fictional time, deadline or pause remainder, and accepted/applied command status. Keep secrets and hidden generation context out of browser DTOs. Starting a fresh fixture creates a new story rather than resetting existing history in place. Add failure injection or time-skipping controls only when a particular test requires them; normal UI waits must use the real scheduler. Automated time-skipping tests do not replace a real-service restart check.

Local access is part of the delivery task. Use configured GitHub sign-in for the normal application, or a development-only launcher that seeds a disposable test user/story and authenticated browser session through existing test utilities. Never add a public login bypass or weaken owner checks to make the chamber easier to open. The user should eventually have one documented launch path that does not require LLM credentials.

Success means the short story is playable and inspectable across refresh and worker interruption, with exactly one committed outcome for a repeated choice or competing deadline. It does not demonstrate realistic geography, arbitrary model-generated mechanics, multiplayer resolution, notification delivery or narrative quality. Those need later fixtures and product decisions. See the [remaining implementation slices](../progress.md#remaining-work-to-reach-it) for current status.

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

Use the established Node test runner for pure policy/contract tests and compiled Nest integration tests, PostgreSQL plus Temporal integration tests for execution, and Playwright for browser flows. Verify compatibility with Temporal's worker/test environment when adding it; there is no need for a second runner without a concrete limitation. Temporal's test environment supports time skipping, allowing multi-hour waits to be exercised quickly. [Temporal testing](https://docs.temporal.io/develop/typescript/best-practices/testing-suite).

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

For continuing-life validation after the chamber, advance a scripted character through 30 and 90 days of permitted ordinary intervals with a counting fake provider. Assert no provider invocations during already-defined quiet progression, no unnecessary per-tick database/history growth, exactly-once routine effects, and interruption at the first boundary that requires a different outcome. This does not claim zero inference for arbitrary new conversations or activities. Include a hold/resume, delayed processing and workflow rollover while checking that elapsed time, pending commands and effects survive. Separately measure many concurrently waiting stories: report wake-ups, writes, history growth, memory and timer lag. Simulating one long lifetime does not prove multi-user throughput, and low token spending does not mean zero infrastructure cost.

CI should run formatting/linting, type checks, contract/policy tests, relevant integration tests, builds and documentation checks. Keep live-provider evaluations opt-in and budgeted. Dependency and secret checks matter for a public repository that uses external credentials. Publish measured demo results only after running them; do not populate the README with invented benchmarks.

## Implementation order

Use the [implementation overview](../progress.md) to identify the current checkpoint and missing components. It owns status; this section defines the delivery approach.

1. **Connect the existing foundation:** draft editing, scripted opening generation, persisted processing and preview display/reopen. Add the worker/outbox and read/update interfaces needed to connect the flow. Prove failures and restart behavior without paid calls.
2. **Build a playable scripted story:** settle the affected product rules, then implement start once, current scene, choices, chronology, waiting, pause/resume and reconnect. Test individual components and their interaction. Do not mistake an opening-text generator for the game.
3. **Cover the broader experience:** shared setup and decisions, absence/default behavior, returning/recap, continuity and notification intents with local delivery substitutes. Exercise context selection, usage accounting with simulated costs and operational visibility. Define channel-specific behavior before implementing its adapter; no paid delivery is needed to test core intent handling.
4. **Tune and demonstrate the complete application:** use a scripted browser experience, multiple story fixtures, recovery tests and clear setup instructions. Revisit product and technical specs as integration exposes gaps. Spend effort on the visible story experience as well as backend reliability.
5. **Connect external services when explicitly chosen:** evaluate real bounded generation, provider failures, narrative quality, cache behavior and measured costs against the already tested application. Keep deterministic tests and the no-paid-key demo. Paid media, hosted deployment and Kubernetes are separate later choices, not prerequisites for completing application components.

No subscription checkout, native app, public matchmaking or multi-agent population simulation is required for this sequence. Technical depth comes from the coherent execution of the intended game.
