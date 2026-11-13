# Long-story read and availability audit | months of life are not one giant GET

**Status:** source-grounded performance/availability design study, not a measured performance defect. **Source:** `main@a313d0aad9ba6bee5a06d83d534abba5037a4c29`, inspected 2026-11-13. Target: a character may generate hundreds or thousands of passages, many finished tasks and meaningful old relationships without every new decision reopening the whole past.

## The player-facing failure modes

- Opening the current scene slows down simply because the character has lived for months.
- An action cannot be admitted because the active-scene context includes too many historical passages, even though only a handful are relevant.
- A player returns to a blocked story due to a large old file or unavailable object-store read while another valid story would load fine.
- An irrelevant old report keeps arriving in current Now because read projection can't distinguish current vs archived.
- The network says “nothing happened” merely because the latest event page is truncated.
- An optional search/index consumer is missing, making long-story memory regress quietly while status says healthy.

## Current queries and their distinct risks

| Source | Observed mechanism | Architectural pressure | Correct evidence |
| --- | --- | --- | --- |
| [`campaign/reads.ts:85–91`](../../../packages/application/src/campaign/reads.ts) | `SELECT` all game activities for a story, then find current and filter current commitments in memory | Work/DB payload grows with total historic activities even when only one is active | Count/query latency vs 10, 1,000, 10,000 historic activities |
| [`storyteller/context.ts:125–138`](../../../packages/application/src/storyteller/context.ts) | If `activeSceneScope` exists, query **all** passage rows after `fromSequence`; otherwise last seven | Long unresolved scene can exceed context schema/cost, and query runs under admission lock for some tasks | 5/40/80-turn scene with bounded response/explicit reason |
| [`storyteller/context.ts:157–173`](../../../packages/application/src/storyteller/context.ts) | Resolve each selected canonical passage with optional object-store read in `Promise.all` | Remote CAS latency/connection saturation; old references can become missing | Inject slow/missing object, inspect lock/connection wait |
| [`storyteller/context.ts:222–263`](../../../packages/application/src/storyteller/context.ts) | Reads *all* activity rows for the story to select active-like states; loads canonical knowledge through store | Source and number of completed activities can expand prep latency | Worker profile under 1,000 finished tasks |
| [`stories/reads.ts:360–580`](../../../packages/application/src/stories/reads.ts) | One repeatable-read transaction performs multi-join snapshot plus `readCampaign` and possibly `resolvePassageContent` external object-store read | An external wait inside read transaction can occupy a DB pool connection; large projection is too heavy for every refresh | Client/DB pool usage and read p95 with latency injection |
| [`stories/reads.ts`](../../../packages/application/src/stories/reads.ts) | Cache identity includes aggregate of storyteller attempt cost connected by story passages/resolutions | Cache lookup's identity computation may not remain cheap as histories grow | `EXPLAIN (ANALYZE, BUFFERS)` for 10/1k/10k passages + repeated GET |
| [`campaign/reads.ts:100–156`](../../../packages/application/src/campaign/reads.ts) | Several 20/100-row bounded history slices | Already bounded, but cannot substantiate complete “since last viewed” summaries after long absence | Source-backed event cursor and pagination |
| [`apps/api/.../story-update-hub.ts`](../../../apps/api/src/modules/stories/story-update-hub.ts) | PostgreSQL LISTEN sends small invalidation hints, in-process fanout by iteration | Many SSE streams may produce linear fanout and reconnect stampedes | 1k/10k stream load, per-event CPU/memory/GET |
| [`stories/continuation.ts:80–88`](../../../packages/application/src/stories/continuation.ts) + [`worker/outbox/dispatch.ts`](../../../apps/worker/src/outbox/dispatch.ts) | SQL root commit enqueues `knowledge.index.v1`; worker dispatcher list doesn't contain this topic | Index work **is not driven by that worker route** in inspected version; outbox claims only supported topics so notices may remain pending | Query pending by topic, inspect alternate consumer or intentional placeholder |

**Classification:** structural workload problems and one confirmed route mismatch. **No database profile or production load test run**, so no claims of actual degraded service.

## Current Now vs Journal vs Storyteller context are different queries

**Now:** last published scene, current controlling offer, active (not all historical) work, meaningful recent status/hold, known user-specific facts. Bound size by *current relevance*, not story age.

**Journal:** paged immutable chronology, event/receipt references and optional sourced recaps. A historical search might scan older data, but it must not slow the currently open scene. A reader's “since last visit” requires a real viewer-scoped baseline and committed public event chronology, not a guess from last 100 activity events.

**Storyteller:** task-specific source capture with current mechanically authoritative state, a few mandatory current-scene passages, pinned significant old evidence, and bounded search for relevant historical memory. It needs **smart retrieval**, not “last N transcript paragraphs” as the only strategy.

**Authoring note:** “no chapters” is a core vision rule. Retrieval partitions may use private *episodes/scene-scope IDs* for source organization, without inventing compulsory chapters in the fiction.

## Bounded active-scene context: don't just drop old paragraphs

Current active-scene requirements can be stronger than “last seven”; losing the start of a conversation may break agency. A reliable design:
1. Define current scene-scope identity/revision and the critical source passage anchors.
2. Capture the latest few turns plus selected source-linked earlier lines necessary for this decision.
3. When scene becomes too long, **condense with explicit source references** and keep last exact quoted exchange. Derived summary is not canon.
4. If evidence cannot fit the captured context budget, fail with a specific typed reason and a safe recovery/continuation path. Do not silently omit a necessary promise.
5. Do not expand the number of old database rows loaded proportional to all past turns simply to later truncate.

**Choosing the exact limit:** use 12, 40 and 100-turn text fixtures to measure continuity error, prompt bytes, required-reference inclusion and narrative response cost. No universal hard cap selected from taste alone.

## Reduce historical read amplification without losing correctness

A likely first technical improvement if performance evidence confirms:
- Select the single active `gameActivity` by primary key plus only **nonterminal** commitments for story ID, with an index that supports status and story scope.
- Page archived activities/events separately.
- Keep current public projection ID/view version small; avoid querying every historic use/charge just to decide whether a cache entry is current.
- Read current passage and active state transactionally, but **move remote immutable source loading out of long-lived SQL read transactions** if versioned root/passage hash capture can preserve correct content and auth.
- Bound each read's rows, bytes, and DB connection hold; distinguish “no data” from “could not check latest.”
- Cache derived snippets only as accelerators, never an authority fallback for action admission.

**Guard:** a new query that filters activities by current status must still let the player find legitimate **interrupted, suspended and blocked** work. A partial index or state enum predicate that ignores suspended activity may quietly destroy the dream's earned-progress continuity.

## Outbox indexing mismatch: consequence and scope

The current [`stories/continuation.ts:57–88`](../../../packages/application/src/stories/continuation.ts) writes one `knowledge.index.v1` notice when a staged canonical publication root is committed. [`worker/outbox/dispatch.ts`](../../../apps/worker/src/outbox/dispatch.ts) lists no corresponding dispatch handler. [`application/outbox/index.ts:35–50`](../../../packages/application/src/outbox/index.ts) selects only topics supplied to the claim, so under the inspected single worker setup this topic is **not claimed**.

Likely interpretation: a planned asynchronous index lifecycle has an unfinished consumer, while immediate lexical retrieval can still build from canonical source on demand. This **does not prove the whole memory system is broken**. It does mean the current outbox event cannot be credited as an operationally completed background index.

Before code:
- Inspect *all* possible consumers/deployment jobs and pending topic data.
- Decide if indexing should really be a queued derived work item or remain lazy/on-demand initially.
- If yes, add one idempotent exact-root index operation with version, coalescing/last-root preference and no new canon authority.
- If no, stop producing unconsumed notices or explicitly classify/expire them, with operator evidence.
- Never ACK unknown topics as successfully indexed and never drop a source root just because the index rebuild failed.

This is a suitable future **small maintenance Change** after status and desired indexing policy are confirmed.

## How high load changes the engineering priorities

An independent story is a relatively natural unit of distribution. Read amplification is not solved by scaling Temporal workers; it can saturate the same PostgreSQL pool and S3/CAS service.

- **Ten thousand dormant stories** should create almost no read/write traffic other than deliberate users/scheduled committed work.
- **A thousand simultaneous returns** need bounded GET, cache and reconnect paths.
- **One hot shared story** requires a separate actor/state conflict model rather than simply caching its entire world more aggressively.
- **Provider cost** is not necessarily proportional to story age; it is proportional to actually selected source context, calls/rounds and bytes. An old story can remain affordable if source discovery and packing work well.

## Target evidence, not arbitrary speed promises

Record for 10, 1,000 and 10,000 past activities/passages:
- current-state SQL rows fetched, total bytes, p50/p95/p99 and pool hold time;
- separate time on SQL locks vs object reads vs parse/validation;
- cost/bytes of actual final provider request and omitted mandatory evidence;
- cache identity/preflight query cost on a hit and miss;
- pending outbox topic counts and oldest age;
- correct Current/Journal/Storyteller behavior through restart/outage.

First select a deterministic fixture with many **legitimate** historical events; never claim scalability by inserting semantically invalid rows and measuring that query alone.

## Redesign conclusion

**Long life must increase history, not the cost of each ordinary current action.** A source that truly matters today should be retrievable, but a thousand old events should not become a thousand current DB rows, a massive prompt or an unavailable character. This is both a backend scalability principle and a core ingredient of the game's emotional promise.
