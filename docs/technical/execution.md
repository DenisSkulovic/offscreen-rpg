# Story execution and scheduling

There is no global simulation tick. The system records when something should next be reconsidered or published and wakes work at that boundary. UI countdowns are local displays of server timestamps; they do not advance the story or call a model.

## Commit first, dispatch reliably

When an operation changes a story, one PostgreSQL transaction writes the new state, chronology, pending schedule changes and outbox work. A dispatcher publishes outbox work to BullMQ and marks it dispatched after acknowledgement. A crash between publishing and marking can publish twice; consumers must tolerate this.

Dispatchers claim small batches with leases in short transactions, release database locks before network publication and mark completion conditionally on the claim token. Multiple dispatchers can share the work without holding a database transaction open while Redis is unavailable. Outbox backlog remains queryable even when dispatch stops.

Store delayed actions durably in PostgreSQL. BullMQ delayed jobs are wake-up hints, not the only copy of a deadline. A reconciler scans indexed overdue or insufficiently dispatched actions, reacquires expired leases and republishes missing work. Dispatch a bounded upcoming horizon rather than loading an indefinite future into Redis.

BullMQ explicitly does not guarantee execution at the exact requested delayed time. Queue load and worker availability matter. Its retry guidance also requires idempotent jobs. Our deadline validation therefore happens against database state, not whichever message happens to arrive first. [Delayed jobs](https://docs.bullmq.io/guide/jobs/delayed), [idempotent jobs](https://docs.bullmq.io/patterns/idempotent-jobs).

## A choice from click to consequence

1. The client submits a decision ID/version, character, option or permitted intent, and an idempotency key.
2. The API starts a short transaction, locks the story/decision in a consistent order, checks membership, character control, lifecycle and deadline, then records the submission. Scope idempotency keys by actor and operation/story. An authorized duplicate with the same request hash returns its prior result; reusing a key for different content is rejected.
3. When the chosen shared-decision policy says inputs are complete, freeze the submissions and permitted defaults. Move the decision to resolving, create a generation run if needed and write outbox work. Return an acknowledgement without waiting for the model.
4. A worker claims the run with a lease and attempt token. It loads a consistent snapshot, reserves budget and performs bounded generation outside any database transaction.
5. The worker validates the proposal, then starts another short transaction. Recheck the narrative revision, decision/run identity, scheduling generation, lifecycle, current permissions and attempt token. Apply the outcome, append chronology, close the decision, create the next work and publish outbox entries atomically.
6. If those preconditions no longer hold, retain attempt usage but do not publish stale fiction. Reuse only after explicit revalidation; otherwise discard or request a bounded replacement.

PostgreSQL row locks coordinate conflicting writes; they are released at transaction end. We use that mechanism for short application commits, not for holding a story locked during network inference. [PostgreSQL locking](https://www.postgresql.org/docs/current/explicit-locking.html).

## Deadlines and races

Recommended admission rule: a submission is accepted only if the database wall clock is before the active deadline when checked under the decision lock. Sample the clock after obtaining the lock, not a client timestamp or a transaction-start timestamp captured before waiting. At the deadline, resolution seals the accepted set and fills permitted missing inputs. Client-visible latency near that boundary must produce an explicit expired response.

If an API submission wins the lock before expiry, the deadline worker sees it. If resolution has already sealed the decision, the submission cannot change it. The winner commits once; the loser returns current state. Do not promise that a click made before a countdown reaches zero will arrive in time over an unreliable network.

Story transitions are serialized per story, while unrelated stories run concurrently. Worker concurrency and Redis locks alone are insufficient: HTTP requests, retries and deadline workers can all race. Database constraints, version checks and unique causation keys are the final protection.

An expired worker lease can cause another attempt to begin while the original network request is still running. A monotonically changing claim token prevents the old worker from committing after takeover. It cannot guarantee the upstream provider did not bill both requests; see [cost handling](context-and-cost.md).

## Pause, resume and changed plans

Pause is a story command, not `queue.pause()`. Under the story lock, mark it paused, increment its scheduling generation and store remaining durations for active waits and response windows. A worker already running may finish inference, but cannot advance a paused story. Its result can be retained privately for later validation.

Resume establishes fresh due times from saved remaining durations, increments the generation and writes new dispatch work. Old queued jobs are harmless after their generation check. Attempting to remove them is an optimization, not the safety mechanism.

A change of direction similarly invalidates incompatible continuations. In the apple example, the companion picking up the fruit makes the old location-dependent development invalid. The simplest initial policy is to invalidate the story's prepared continuation whenever its narrative revision changes; finer dependency tracking can follow only if discarded-cost measurements justify it.

Pace changes need a product rule before implementation. Proposed starting behavior: apply new pace to future intervals and require explicit rescheduling of the current interval; never silently shorten an active response window for other players.

## Outages and late work

Overdue work is not permission to simulate every missed minute or issue a burst of model calls. Reconcile a bounded number of transitions, then hold if the unattended budget or permissions do not allow more.

Recommended outage policy for discussion: honor player choices already published with their original deadlines and fallback rules; when a new decision is published late because of service downtime, begin its response window at actual publication, not at its intended historical publication time. A phone may still receive the notification late; delivery is not the same as publication.

After a long outage, expose recovery status and provide a recap. If no valid prepared outcome or permitted fallback exists, hold the story with a reason. Queue recovery cannot invent a safe narrative outcome.

## Work classes and failure handling

Separate short scheduling/delivery jobs from model calls through queues and concurrency settings. A slow image generation should not starve a decision deadline. Start with one worker deployment capable of those queues; split worker pools when load measurements warrant it.

Retry transient transport failures with bounded backoff and jitter. Distinguish malformed model output, authentication failure, quota exhaustion, stale state and provider downtime; retrying all of them identically burns money. Exhausted jobs retain a visible failure record and a deliberate retry path. A retry reuses the logical operation ID.

Application state changes can be effectively once through idempotency and transactions. External model billing and notification delivery are not guaranteed exactly once. Record uncertain external outcomes and reconcile rather than claiming a queue library removes this uncertainty.
