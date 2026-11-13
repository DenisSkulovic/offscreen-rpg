# Time and execution | bounded living, not millions of idle heartbeats

**Status:** independent future design. The maintained first solo [time contract](../time-and-autonomy.md) remains current until explicit game-mechanics changes. Target must serve both one long-lived character and many simultaneous stories.

## Three different time concepts

- **Fictional chronology:** exact ordered game-time positions at which rules/effects become authoritative.
- **Real scheduling:** wall-clock deadlines for eligible activity boundaries or permitted responses; pace maps a captured rule interval to this clock.
- **Processing time:** worker scheduling, model latency, SQL queueing, notifications and provider callbacks. **Processing delay never earns fictional progress.**

A fourth dimension is sometimes required for **player response deadlines**: the published UI's real reply window is not time spent in-world. A model taking 90 seconds to write the question must not eat a response window that hasn't been published.

## Selected first-principles execution strategy

**Boundary-driven by default.** Store one admitted commitment with a next meaningful game-time boundary; translate it into a conditional real due timestamp; schedule/wake at that boundary; on wake, project exactly the elapsed permitted fictional time, check every relevant due boundary in order, atomically settle events/effects and schedule the next one **only if a captured policy permits it**.

There is no need for a database write, workflow task, model request or notification for every virtual second. Temporal's timers are suitable for durable sparse waits; PostgreSQL state and receipts decide *what actually occurred*. If pace/hold changes, version and re-evaluate the target, not the already-earned history.

A long contribution activity may have one worker wake per productive check, not one per real second; if checks are very frequent at large scale, coalescing/batching must preserve correct intermediate event order and stop conditions.

## Product-derived invariants

1. Time advances **only** under one or more explicitly admitted execution permissions as defined by the chosen world/time-domain policy.
2. An activity starts without awarding completion; progress may fail at a boundary while fictional time still passes.
3. The next event, encounter or obligation may interrupt before a later completion. Boundaries must settle in deterministic order.
4. A manually paused activity earns no hidden catch-up progress.
5. An accepted finite plan can continue eligible later steps without click spam, but every step revalidates current conditions.
6. No world clock ticks just because a browser is open, a renderer rerenders or an SSE event arrives.
7. A Storyteller generation blocked by funding cannot become an unrecorded action/default to make the narrative feel alive.
8. New character autonomy/standing routines require **captured exact consent** and stop conditions.
9. A server restart does not grant extra elapsed time or lose earlier committed progress.
10. A due real timestamp is a **forecast for processing**, not a guaranteed arrival or mechanically settled result.

## The critical separation: event proposal vs event occurrence

A scheduled world obligation is not a narrator's promise that an event has happened. At its due eligible boundary the server checks authority/conditions, commits the event once, and may request a separate Storyteller passage. If the passage fails, the event remains recorded and may be held for explanation. A report about old work cannot reopen the current active decision.

## Extended-life and response policy ladder

| Level | Meaning | Can advance unattended? | Key policy |
| --- | --- | --- | --- |
| **One accepted task** | Travel/work/wait until its admitted bound | Yes | Only task's rule, stop at hold |
| **Finite accepted itinerary** | Execute A then B if eligible until horizon | Yes | Revalidate each leg |
| **Standing routine** (future) | Repeat previously authorized role/action family within limits | Yes | Explicit cap, horizon, event-stop, no new creative agenda |
| **Delegated safe decision** (future) | Resolve a published question using preapproved eligible fallback | Conditional | Separate actor consent and real response deadline |
| **Personality-guided discretion** (later) | Rank a bounded set of admitted options by stable preference | Conditional | Cannot invent actions, actors, stakes or spending |
| **Unbounded autopilot** | "Do anything" without permission | **Rejected** | Conflicts with earned agency and fairness |

A single “autonomy on/off” boolean collapses differences in rule authority and acceptable loss. The first target is bounded, revocable where supported and visible in the Journal.

## Temporal is a coordinator, not the story's memory

Workflow inputs can be compact IDs. Long workflows must obey deterministic replay and **versioned deployment compatibility**. A work instance that runs checks for months should avoid an unbounded history; use bounded workflow segments and Continue-As-New when appropriate, or let a completed workflow schedule a new occurrence under business identity.

**Source-grounded platform consideration:** Temporal recommends keeping workflow histories to a few thousand events when possible and using Continue-As-New for long-running flows; large payloads should be stored externally and referenced by ID. [Temporal worker guidance](https://docs.temporal.io/best-practices/worker), [Continue-As-New](https://docs.temporal.io/workflow-execution/continue-as-new).

A continuation across workflow runs must carry stable business identity **and guard against duplicate accrual**, even when Temporal generates a fresh run ID. The SQL business operation, not the workflow run, decides whether a check/reward was settled once.

## Why a “single clock” is not enough for every future world

**Solo:** one campaign frontier, one active clock owner, explicit holds. Simple and coherent.  
**Small common party:** use a shared authoritative world frontier and lockstep/consent for consequential group moves; each actor controls their own intentions. Declare what can progress if one actor is offline.  
**Many scenes in one shared world:** multiple actors may progress independently only if conflicts and causal ordering are explicitly defined. A character cannot enter a shared room at day 4 while another at day 2 retroactively changes the room at day 3 without an approved synchronization policy.

### Three potential multi-actor time models

1. **Lockstep:** shared world clock waits at required group decisions; easiest correct first group game, but one slow participant can stall others.
2. **Conservative bounded lookahead:** independently admitted actors may advance until a known synchronization/conflict horizon; requires dependency graph, late-event policy and honest blocking.
3. **Independent local clocks with eventual reconciliation:** high flexibility, but causal paradoxes and retroactive lost resources make it a poor default for shared consequential fiction.

**Recommendation:** first shared-party release uses explicit lockstep for the shared situation and independent input ownership. Do not retrofit a multi-actor clock by allowing simultaneous solo transitions under a single mutable `campaign.gameSecond`. Research lookahead only after a real shared-world playthrough demands it.

## Scalability math, illustrative only

Suppose **10,000 stories** exist. If every story writes a state row each real second, that's 10,000 DB writes/sec before anyone clicks and before replication/logging. If only **1,000 admitted activities** have a meaningful boundary once every 10 minutes, average scheduled boundary processing is about **1.7 per second** (burst distribution can be far worse). This is the *shape* of workload that motivates sparse event scheduling; numbers are hypothetical, not measurements of this code.

Likewise, if 10,000 clients poll every 2 seconds, that is **5,000 reads/sec** before caches and reconnections. SSE invalidation hints with bounded fallback reads are attractive; they need authenticated connection caps, backpressure/coalescing and real failure tests. PostgreSQL LISTEN/NOTIFY is best used for small invalidation hints rather than as the only durable event log. [PostgreSQL NOTIFY limits](https://www.postgresql.org/docs/current/sql-notify.html).

## Failure races to prove

- Pause exactly at a due check: either check earns progress before pause under the defined ordering, or pause fences it. **Never both depending on worker timing**.
- Player responds at the exact default-expiry moment: one admission, one actor control source.
- Pace change while waiting: no retroactive progress multiplication, new ETA may move.
- Event due at a work-success boundary: event order and stop policy deterministic, no duplicate completion.
- Worker crashes after clock settlement before scheduling next wake: outbox ensures next eligible boundary is delivered.
- Duplicate workflow task/notice: same operation/check identity, exactly one result.
- Long inactivity: no game-second accrual absent admitted policy.
- Storyteller blocked: held current truth and exact possible actions; no fictional time cost for model latency.
- Multi-actor conflicting actions: no optimistic UI can grant a shared effect before server transaction settles.

## Open issues for subsequent passes

- Whether global story time can be represented by fractional rates for all exotic calendars (without mixing wall vs fictional time).
- How standing-life iteration identity composes with existing accepted finite plans and eligibility.
- Real-time clock drift/worker downtime and the precise "maximum tolerated late settlement" product promise.
- How shared-party pause and response windows preserve player consent.
- Which adverse workloads should be supported with lazy catch-up versus scheduled workflows.
- Which time controls are player-facing versus internal rule package capabilities.

These are **domain architecture questions**, not mere Temporal tuning tasks.
