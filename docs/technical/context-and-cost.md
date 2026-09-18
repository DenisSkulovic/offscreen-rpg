# Context, caching, prompts and spending

The cost objective is a coherent story within an explicit allowance. We cannot promise a few cents per unattended week without measuring frequency, context size, output length, repair rates and model prices. Ordinary waiting itself needs no model invocation.

## Current development allowance

The user allocated $10 of OpenRouter credit on 2026-09-17 to last at least one month. This is a shared total across development and live evaluation, not a per-session allowance. Prefer no-LLM tests; deliberate live checks should use dirt-cheap models with bounded context, output and attempts. The deposit is not a verified current balance. Do not automatically replenish it or reset the allowance after a calendar boundary.

The key is local and ignored, and no provider adapter is enabled. The implemented offline-tested boundary requires explicit live-run opt-in, a declared run budget, conservative reservations and durable cumulative usage shared across concurrent runs. Funding/run records must be provisioned from a verified allowance before any live evaluation. Unknown billing holds the reservation rather than authorizing a retry. Ordinary tests, CI, startup and unattended demos must remain free of paid calls. The ledger and provider adapter are implemented and tested with simulated responses; real account reconciliation, route compatibility and live billed costs remain unverified. This allowance is separate from any future sponsored visitor trial.

After every action or test, verify whether any provider invocation was possible. Report confirmed no-call actions as $0 model spend; reconcile live attempts, including failures, against a persistent charge/reservation ledger before further paid work. Unknown or delayed usage is not zero. Preserve the reservation, halt paid execution and prominently report unexpected spending, accounting gaps, unexplained balance changes or budget overruns. Track concurrent work against the same allowance. End-of-turn reports include turn spend and verified cumulative usage, or explicitly state that cumulative account usage is unverified. Local commands, documentation edits and scripted tests must not trigger a paid call merely to measure spending.

## Build context for a specific decision

Assemble context in a deterministic order and record a compact manifest of source IDs, revisions and prompt versions:

1. Stable application instructions and output/tool contracts.
2. Storytelling preferences, premise and character definitions relevant to this run.
3. Current authoritative situation, possessions/conditions that constrain actions and participant permissions.
4. Recent committed passages and accepted player intentions.
5. Selected older facts, unresolved threads and memories relevant to this development.
6. The specific requested operation and its constraints.

Allocate a token budget to these sections and reserve output capacity. Required current facts and the selected intention take priority over decorative lore. If required context cannot fit, reduce scope or use an eligible larger-context route within budget; never silently drop the fact that the wizard lost their wand.

The player and model may see different information. Server-only prepared futures can inform the storyteller without entering browser snapshots, notifications or public traces. Context retrieval must always be story-scoped and respect intended visibility.

The context manifest references one immutable base snapshot and a frozen decision/settings version. Retrieval tools either read facts from that version or detect that it is stale and stop; they must not quietly mix the old situation with a new inventory. Read snapshots in a short transaction, persist the artifact, then release database resources before inference. Input/result artifacts remain available for unfinished and retryable workflows; their cleanup policy is not simply the telemetry retention period.

Start retrieval with explicit entity references, chronology windows, unresolved threads and PostgreSQL text search. Introduce embeddings/pgvector only after examples show that semantic retrieval finds important memories those methods miss. A vector result is a candidate memory, not proof of a fact. No separate vector service is needed initially.

## Summaries without losing the story

Summaries are derived artifacts with source sequence coverage and a version. Create them when enough material accumulates, not after every sentence. They support retrieval and recaps; they do not replace authoritative possessions, current conditions, ownership or promises the product needs to enforce.

Chapter groupings and significance judgments are derived in the same way. Keep their source references and coverage explicit; a chapter spans a contiguous stretch of chronology, while a focused recap may select across stretches. Later developments can change interpretation without changing the original entries. A single permanent importance score is insufficient for both narrative presentation and context retrieval: a low-drama promise can become the most relevant fact for today's decision.

When chaptering is implemented, reassess a bounded amount of accumulated material at useful boundaries or on return, and reuse valid results. Do not call a model after each ordinary entry or repeatedly send the whole lifetime to rebuild every chapter. An unfinished chapter may be provisional; revision and source coverage distinguish it from a summary that includes newer material. Test that an early minor encounter can regain prominence, that routine achievements survive a recap, and that boundaries follow narrative changes rather than equal page sizes. No scoring service, chapter schema or automatic summarization is required for the chamber.

Keep canonical facts linked to the passage or accepted change that established them. An unverified rumor remains a claim. When facts change, context assembly prefers the current record while preserving history explaining the change. Include a test in which a minor earlier object becomes relevant much later.

Long histories need bounded retention of raw generation traces, not deletion of the player's readable chronology. Track stored media and trace volume as costs alongside tokens. Repeated recap requests should reuse an artifact valid for the same viewer and chronology revision.

## Long-running quiet play

A low rate of dramatic incidents does not by itself reduce inference cost. Resolve an eligible ordinary interval without polling a model every tick to ask whether something happened. A reusable routine needs an explicit supported outcome policy, preconditions and a bounded interval; applying it is different from reusing the exact result of an earlier operation. Resource changes still occur once per completed operation, and an interruption cannot award the full planned interval as though it completed. Do not assume partial rewards are linear without a defined rule.

Batch ordinary reporting and summarize repeated activity where useful. Keep consequential changes inspectable without producing one prose passage per mechanical update. Reassess when circumstances change, a player makes a new request, a relevant boundary is reached or an incident is due. Repeated checks must not redraw chance until an event appears. The first supported routine and incident policy remain to be designed; this is not authorization to implement a simulation for every profession.

Fresh daily conversations can still require fresh inference even when no danger occurs. Measure routine resolution, conversation generation, memory extraction, summarization, retrieval/embeddings and recaps separately, including discarded work. Cached context does not make new dialogue free. A 30-day story is a useful evaluation scenario, not a promised price point.

## Recall over many days

Implementation status: this section describes intended behavior. The current loader retrieves seven recent passages and retained-note source passages; it has no scene/entity index, archived episode search or model recall tools. The [memory proposal](../features/2026-09-18--20-09--storyteller-memory-and-recall/FEATURE.md) and [phased handoff](../features/2026-09-18--20-09--storyteller-memory-and-recall/PLAN.md) make that extension concrete, pending agreement. They distinguish loaded summaries from available source evidence and introduce a shared bound for recall and repair.

Use current state, character-scoped learned claims and source-backed episode summaries for different purposes. Link mentions of a recurring person to a stable entity reference where identity is established. Retrieve that person's earlier episodes and unresolved commitments when they return, then expand into source passages if the summary is insufficient. Identity ambiguity must not be resolved by confidently merging strangers with similar descriptions. Semantic similarity can suggest related material; it cannot establish identity or truth.

Recency alone is insufficient: an old promise may outrank yesterday's small talk. Select by current cues, explicit references, unresolved relevance and importance within a bounded context budget. Summaries can omit a detail that later matters, so retain searchable committed passages and source coverage; do not recursively summarize summaries as the only surviving record. Avoid storing every sentence as an independent fact or maintaining associations through continuous model calls. Simulated forgetting, probabilistic recall and a dedicated memory/graph service are not prerequisites for useful recall.

After the first chamber works, add a scripted longevity fixture with many quiet intervals and conversations. Introduce an acquaintance early, include an unverified rumor and a lasting commitment, then revisit them on day 30 after irrelevant exchanges. Check identity, attribution, current possessions, supporting source references and bounded context size. Also check that an unrelated scene does not receive the whole history. Accelerated tests can exercise data growth and retrieval; actual wall-clock/provider cost and live narrative quality need separate measurement. This complements the short timing chamber rather than blocking its first run.

## Three different caches

| Cache | What it saves | Correctness rule |
| --- | --- | --- |
| Application data/context | Database reads, assembly and tokenization work | Key by story, visibility, source revisions and schema/prompt versions; expire or invalidate when dependencies change. |
| Exact generated artifact | A repeated provider call for the same logical operation | Reuse only an accepted result or a validated prepared result with matching preconditions. Do not treat semantically similar stories as interchangeable. |
| Provider prompt/KV cache | Part of provider inference work and sometimes input cost | Provider/model-specific prefix rules, pricing and expiry; measure reported usage rather than assume a hit. |

Stable instructions and reusable context belong early in the request; changing intent belongs late. Avoid putting timestamps or run IDs in the stable prefix merely for logging. Do not pad short prompts to meet a cache threshold unless a measured comparison justifies the extra tokens.

OpenRouter documents prompt caching and provider sticky routing, with behavior varying by model/provider. Explicit provider order and failover can affect reuse. With hours between story updates, short-lived caches may expire before the next request. Calculate the unattended baseline without assumed cache discounts, then measure actual savings. [OpenRouter prompt caching](https://openrouter.ai/docs/guides/best-practices/prompt-caching).

Hosted inference does not give our application control of GPU memory placement or KV eviction. Redis cannot preserve a provider's GPU cache. Self-hosted inference would introduce a separate capacity, batching and model-serving project; defer it until there is evidence and a reason to operate GPUs.

Prepared story material is another form of reusable work, but speculative branches cost money. Prepare a short likely continuation after commitment; do not generate every possible action tree. Record the fraction and cost of prepared content discarded after player intervention.

## Budget accounting

Track per-story spending and an explicit funding account/period. Before sending a request, atomically reserve a conservative upper bound that includes uncached input, configured maximum output, relevant billable reasoning/tool usage and an allowance for fees. Use a versioned price snapshot and route constraints. Reconcile with provider-reported cost/usage afterward; estimated and actual values remain distinguishable.

Budget availability is `limit - settled usage - outstanding reservations`. Concurrent workers must reserve under the same account lock or equivalent conditional update. Do not let each story independently observe the same free dollar and spend it. Lock funding scopes in a consistent order if both account and story caps apply.

Reserve each attempt, or an operation envelope covering all permitted attempts, before it begins. Retries, repair, summarization, images and discarded results count. Free users still consume a developer-funded allowance; “free tier” is an entitlement, not free infrastructure.

For development, use an explicit developer-funded account with per-story and global caps; this does not decide future commercial billing. Every operation pins its funding account and allowance period. Changing a story's owner, tier or preferences cannot silently move an already dispatched charge. Settle an attempt exactly once against its reservation, retain uncertain reservations across period boundaries and prevent a period reset from creating duplicate credit. Do not expire reservations merely because an Activity timed out.

When allowance is unavailable, expose a generation blocker and permitted recovery action as specified in [story lifecycle](story-lifecycle.md). Reading, pausing and seeing why a story stopped remain available. A budget increase is not an instruction to rerun a previously committed resolution or clear a manual pause.

An HTTP timeout can leave the provider request running and billable. Do not release its reservation immediately and send another call blindly. Mark usage uncertain, retain a conservative reservation, reconcile through provider identifiers where available and allow manual/operator resolution. Cancellation is best effort; it cannot promise zero charge.

Temporal replay can reuse a recorded Activity result, but an unacknowledged Activity can retry. Its first step must inspect the persisted attempt and reservation. Bound total provider attempts across Temporal retries, SDK retries and model repair; no individual layer may create a fresh allowance. Returning artifact references rather than full prompts/results also limits workflow-history storage and exposure.

Absolute provider spend caps cannot be guaranteed solely from token estimates if prices, upstream retries or reporting are uncertain. Combine conservative application admission control with gateway/account limits where available, bounded attempts, alerts and a global kill switch. Explain the uncertainty rather than advertising mathematically exact billing control we do not have.

## A concrete cost envelope

The following prices are invented arithmetic inputs, not quotes for any model. Assume $0.50 per million input tokens and $2.00 per million output tokens. An 8,000-input/1,000-output call costs:

```text
(8,000 / 1,000,000 × $0.50) + (1,000 / 1,000,000 × $2.00)
= $0.006 per call
```

At two calls per day, a seven-day unattended period would cost $0.084 in this simplified example. At one call every five minutes, it becomes 2,016 calls and $12.096. Neither includes setup, retries, tools, summaries, images, gateway fees or hosting. Model choice matters, but generation frequency can overwhelm a cheap token price.

This also exposes the product tradeoff: frequent novel unattended developments and extremely low spending may conflict. Settings should constrain narrative frequency and spending independently. Faster fictional time need not automatically mean proportionally more narrated moments. If a story runs out of valid prepared material and budget, hold it with a clear reason rather than claim a logic-only engine can invent an equivalent continuation.

Bound consecutive immediate autonomous transitions as well as provider calls. Even prepared zero-cost outcomes must not form an unbounded loop that consumes Temporal tasks or generates notification spam. Measure workflow actions/history, database/worker hosting, storage and delivery alongside model usage. The token envelope above is not the full cost of keeping a hosted story available for a week.

## Prompts and experiments

Begin with prompts and small reusable fragments in the `ai` package, reviewed with code and tested against fixtures. Compose only fragments with a clear responsibility: behavior, output schema, storyteller preferences, contextual material. Record the resulting prompt version/hash and source versions for each attempt. Do not create a general prompt CMS or dozens of database snippets just because composition is possible.

Langfuse is the proposed tool for AI traces and experiment inspection. Its prompt management supports versions and labels, and its TypeScript observability integrates with OpenTelemetry. Remote prompt management can be added when editing without deployment becomes useful; pin a resolved version per run and retain a last-known-good local fallback. Telemetry or prompt-service downtime must not corrupt or indefinitely block an otherwise valid story. [Prompt versioning](https://langfuse.com/docs/prompt-management/features/prompt-version-control), [TypeScript observability](https://langfuse.com/docs/observability/sdk/overview).

Use offline comparisons first: the same story snapshots and intentions against candidate prompts/models. Measure reference validity, continuity, choice diversity, accepted-outcome latency, cost and human preference. Schema validity alone is a weak quality metric. Automated model judges are advisory and themselves cost tokens.

For live A/B testing, assign a stable variant at story creation or another explicit boundary, not a new personality every request. Record model/provider and prompt versions so a routing change does not masquerade as a prompt improvement. Do not run a second paid shadow generation on every player action by default.

## Approved local POC boundaries

Capture at most six previous passages, current state, selected intention and up to twenty source-backed notes, with a 48 KiB complete request limit. Mandatory evidence overflow holds before inference. New tasks produce note patches with the scene; there is no separate summarizer or tool loop. First provider execution allows one dispatch per attempt, no SDK/model fallback or repair. Explicit retries require settled usage, a new retry receipt and remaining shared run allowance. Ambiguous usage stops paid admission globally. The source adapter is opt-in and is tested only with fake transports until a separately approved live run.
