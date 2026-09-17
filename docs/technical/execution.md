# Story execution with Temporal

Temporal owns the durable control flow: waiting, waking, coordinating inputs and retrying bounded Activities. PostgreSQL owns accepted application commands, committed story content, permissions and spending. There is no global simulation tick and no independent database scheduler driving the same story.

## One workflow per story

Use a stable Workflow ID derived from the story ID. Its execution chain coordinates that story's current interval, open decision, pause state and generation operation. It holds compact control state and references, not the entire narrative or model context. [Story lifecycle](story-lifecycle.md) defines the separate draft-generation operations and frozen start command; a generic wake-up message cannot initialize a live story.

Workflow code uses deterministic TypeScript and Temporal primitives. Database reads/writes, model requests and notification sends execute as Activities. A recorded Activity result is reused on replay; an Activity whose completion was not recorded may run again. Consequently, database effects and external requests still need idempotency and explicit retry policies. [Temporal Activities](https://docs.temporal.io/develop/typescript/activities).

Temporal timers persist across downtime without occupying a waiting worker. They express the journey delay and decision window; they do not guarantee execution or phone delivery at an exact wall-clock instant. Keep enough worker capacity to process wake-ups promptly. [Durable timers](https://docs.temporal.io/develop/typescript/workflows/timers).

## Responsibility at the database boundary

The workflow decides what operation to attempt next. An Activity commits it under PostgreSQL constraints and returns the resulting revision, control epoch and timing projection. The workflow then creates or adjusts its durable timer. A crash after database commit but before Activity acknowledgement retries the same operation and returns its existing result, allowing the workflow to resume safely.

Deadline timestamps in PostgreSQL support the UI and command admission. They are the persisted contract of a published decision, not a queue that another scheduler scans to resolve stories. Arm timers from the returned absolute due time, using the remaining duration rather than starting the full interval again after recovery. Deadline-triggered sealing checks that database time has reached the cutoff; if a timer wakes early due to clock differences, it returns the remaining wait. Early sealing because all required players are ready follows the separate group policy. If the workflow's cached revision disagrees with PostgreSQL, reconcile through an Activity before advancing; never overwrite a newer committed state with stale workflow memory.

## Commands and durable delivery

1. The API validates session, membership, character control and request shape. Look up an authorized prior receipt before applying new-command version/deadline checks, so retrying an accepted command after expiry still returns its receipt. Under a short story/decision lock, check eligibility and persist a new command receipt with a per-story sequence plus an outbox notice. Scope idempotency keys by actor, story and operation; reject reuse with different content.
2. Return `202` with a receipt ID and pending status. This means the request was durably received, not that its fictional consequence or pause has completed. Clients observe the receipt/current snapshot for the result.
3. A small outbox relay handles typed messages: a start notice starts the designated operation, while a command notice signals an existing live workflow. Retry uncertain delivery with the same application message ID. Mark delivery only after Temporal acknowledges it or the command is proven already processed. The relay moves messages across the PostgreSQL/Temporal boundary; it never executes game timers or story logic.
4. A signal handler records the highest notified command sequence and wakes the workflow's serialized command processor. An Activity reads pending commands in sequence and applies or rejects them against current permissions/state. Record each processed receipt and its result transactionally. Drain again if a newer sequence was signalled while the Activity ran. Duplicate/out-of-order notices neither reorder commands nor lose a wake-up between an empty read and waiting.

Signals are asynchronous notices; Temporal Updates can provide a processed response, while Queries read workflow state. The first API uses persisted command receipts plus Signals so reception survives a Temporal outage. Do not equate a signal acknowledgement with successful command execution. Updates can be introduced for a specific interaction if they simplify its response contract. [Workflow messages](https://docs.temporal.io/develop/typescript/workflows/message-passing).

The relay claims bounded outbox batches with short leases and releases database locks before network I/O. Polling an unpublished-message index is sufficient; no queue product is needed for that bridge. A duplicate start locates the existing execution/result; prohibit reuse of a finished live story ID. Do not use a generic signal-with-start path for ordinary commands. If a workflow is unexpectedly closed, keep unprocessed receipts visible for controlled recovery; if the domain operation is already terminal, settle obsolete notices without restarting it. Temporal distinguishes stable Workflow IDs from individual Run IDs; target the execution chain and retain application deduplication across runs. [Workflow IDs](https://docs.temporal.io/workflow-execution/workflowid-runid).

## From decision to consequence

When enough participants are ready or the timer fires, a sealing Activity drains eligible admitted commands and freezes the accepted intentions/defaults in one transaction. Store a stable resolution ID. The workflow then invokes bounded context/generation Activities outside the transaction, followed by a commit Activity.

If any required missing intent has no permitted fallback, do not invent one or seal a supposedly complete input. Record a blocker and preserve the decision for explicit intervention. Recovery reissues a fresh decision version/window as described in [story lifecycle](story-lifecycle.md), rather than accepting expired buttons. Once sealed, retry the same frozen resolution; a separately authorized change must cancel/fence it before replacing its input.

Commit validates the expected narrative revision, resolution identity, lifecycle, permissions and control epoch. It applies the outcome, chronology and delivery intents atomically, returning references and the next interval/decision timing. A unique causation key prevents a retry from applying the same result twice. PostgreSQL row locks protect short conflicting commits, not the duration of inference. [PostgreSQL locking](https://www.postgresql.org/docs/current/explicit-locking.html).

Admission of a disruptive command fences old work immediately. Until all admitted disruptive commands through the current control epoch have been applied or rejected, no new generation may capture that epoch and commit around those pending controls. Keep an applied-control epoch or equivalent pending-command check. Otherwise a fresh attempt could load the new epoch before the pause itself has been processed and incorrectly advance the story.

Async workflow handlers can interleave across awaits. They should enqueue/wake rather than independently launch competing story transitions. Keep one normal resolution path per story, with an explicit control path to process pause/invalidation during a long Activity. Cancellation is best effort; the database commit fence remains decisive if the provider or Activity finishes late.

## Deadline admission and competing players

Recommended admission rule: the API accepts a decision submission into the durable inbox only if the database wall clock, sampled after acquiring the decision lock, is before its published deadline and the decision is not sealed. This makes acceptance independent of relay latency. At sealing, process all eligible receipts admitted before the cutoff; a timer firing does not bypass already admitted inputs.

All receipt admission and sealing use the same story/decision lock order. Once sealed, new submissions are rejected. The configured group policy determines early sealing, editable intentions and permitted defaults; Temporal does not choose those game rules.

The sealing Activity must drain commands through a transactionally captured sequence boundary, including earlier control commands, rather than trust which Signal arrived first. If a pre-deadline input reached PostgreSQL during a worker outage, recovery still includes it. A click whose request arrives after the cutoff is expired even if the phone's countdown was delayed.

Keep the set of eligible characters and the fallback policy version on the published decision. An actor's duplicate or edited submission uses that decision and their own submission version. Roster/access changes trigger explicit invalidation or a hold; do not silently shrink the eligible set to force early resolution. Decide whether the group can see draft intentions and how readiness works before implementing that policy.

## Publishing a prepared continuation

Store a prepared passage/effect packet separately from current truth, bound to its interval, post-commit base revision, policy versions and activation conditions. At the timer boundary, an Activity validates those preconditions, applies that packet and publishes its decision/next interval exactly once. If it offers a decision, compute its response deadline at publication; do not embed an already ageing deadline during preparation.

A valid packet needs no further model call. An invalid packet is discarded and replaced through the bounded generation path or held if no allowance exists. Do not move its narrative effects into the present merely because generation finished early. The detailed proposal boundary is in [storyteller runtime](storyteller-runtime.md).

Quiet intervals store a fictional duration and code-selected real duration under a pacing-policy version. Any displayed interpolation is an estimate, not proof of arrival. On interruption, commit elapsed fictional time once under the selected policy, bounded by the interval's total; pause excludes paused real time. Calendar labels can remain prose. The concrete pace mapping and elapsed-time rule need selection before timer behavior ships; infrastructure latency must not accidentally choose them.

## Pause, resume and changed intentions

Admitting an authorized disruptive command such as pause or changing the active plan increments a control epoch in the same transaction as its receipt. An in-flight generation based on the old epoch cannot commit after that admission. Ordinary individual submissions do not unnecessarily invalidate one another. Rejected or duplicate commands do not repeatedly increment the epoch.

The workflow processes the command, persists its resulting control state through an Activity, cancels or replaces the affected timer, and acknowledges completion in the receipt. Pause stores remaining durations using its durable admission timestamp, clamped at zero; resume establishes fresh due times from those durations. The UI distinguishes pause requested from paused. The exact group authority and eligibility rules remain product choices.

This provides a linearization point: if a story outcome committed before pause admission, that outcome happened; if pause was admitted first, the old commit is fenced out. If a queued control command becomes inapplicable, mark its receipt rejected and reconcile the control epoch before continuing.

A changed route or the companion moving the apple invalidates the current prepared continuation. Begin with conservative revision-based invalidation; introduce finer dependencies only if discarded generation cost warrants it. Pace changes should initially affect future intervals unless the player explicitly reschedules the current one; do not silently shorten another player's active response window.

## Retry boundaries and uncertain side effects

Configure Activity start-to-close and total retry/time limits by operation. Use heartbeats/cancellation for long-running work where appropriate. Separate model-call retry policy from safe database/read retries. Never allow an SDK retry loop, an agent repair loop and a Temporal Activity policy to multiply attempts beyond one operation budget.

Each billable attempt has a stable operation/attempt record. Before contacting a provider, reserve its cost and record dispatch. After an ambiguous timeout or crash, a retry inspects that record; it does not automatically issue a new paid request. Reconcile usage or hold for an explicit bounded recovery policy. A later attempt gets a distinct fencing token so an older Activity cannot replace its result.

Notification Activities likewise check delivery records and expiry. A send may succeed before its acknowledgement is lost; tolerate a duplicate message while ensuring its button cannot duplicate a game action. Temporal guarantees durable orchestration, not exactly-once billing or human notification delivery.

## Long-lived execution and deployment

Use Continue-As-New at safe boundaries to keep history bounded, carrying compact control state, pending references and the processed command cursor into the new run. Finish message handlers and account for pending messages before rollover. Application receipt deduplication remains valid across runs. Keep large prompts, images and prose outside workflow history, referenced by artifact ID. [Continue-As-New](https://docs.temporal.io/develop/typescript/workflows/continue-as-new).

Every new run drains unprocessed database receipts before waiting, including messages admitted during rollover. A wake-up Signal is a hint to read that durable inbox, not the sole copy of the player's command.

Compatible workflow code matters because old executions replay after deployment. Use supported workflow/worker versioning, history replay tests and a rollout plan for active stories. Do not assume changing a TypeScript function is safe for every running workflow. [Workflow versioning](https://docs.temporal.io/develop/typescript/workflows/versioning).

## Outages and recovery

When Temporal or workers are unavailable, the API may still receive eligible commands, but exposes pending processing. PostgreSQL unavailability prevents safe admission and commits. On recovery, the workflow resumes and reconciles admitted commands before advancing.

Overdue timers do not authorize a burst of unbounded inference. Honor already published deadlines and their permitted defaults. For a new decision published late after downtime, the proposed policy starts its response window at actual publication rather than retroactively expiring it. Bound catch-up transitions and hold with a reason if permissions, budget or valid content run out.

Recover workflow state through Temporal history, not by guessing execution from a database snapshot. If Temporal persistence is actually lost, restored PostgreSQL alone is insufficient: quarantine affected stories and reconcile controlled restart from a known committed boundary. Test worker restart separately from disaster recovery of both systems.
