# Account usage policy, windows and recovery

Status: prepared implementation contract, not implemented entitlements or billing. The [bounded-cost feature](../features/2026-09-19--19-08--bounded-storyteller-cost/PLAN.md) owns delivery. [Context and cost](context-and-cost.md) owns request construction and operation accounting. Commercial prices, tier names and payment processing are not chosen here.

## Distinct authorities

An **entitlement profile** says which capabilities an account may use. A **usage window** limits consumption over real time. A **funding allowance** authorizes actual provider spending. A **task recipe** limits the work needed for one purpose. A **creative Storyteller profile** controls tone/pacing, not any of these permissions. More available funds do not automatically unlock a model, and an unlocked model does not imply permission to fill its context window.

Compute effective policy on the server from versioned platform safety limits, verified account entitlements, payer/funding restrictions, user/account and story caps, task recipe and provider capability. Numeric ceilings intersect by taking the strictest applicable value; allowlists intersect; a disabled capability stays disabled. Cross-field validation then checks total input + generated/reasoning capacity, price bounds and required final-answer capacity. Remaining usage/funding is an additional admission check, not a reason to mutate the saved entitlement. Missing required configuration fails closed; zero is disabled, not unlimited. Do not implement ambiguous precedence with object spreads.

Record contributing versions and limiting reasons in an effective-policy snapshot. Storyteller text, client-supplied tier names and canonical documents cannot change it. A model sees only its bounded work allowance and relevant capabilities, not account secrets or the whole commercial policy. Validate administrative configuration and audit changes without logging private story content.

## Configuration surface

Keep typed controls with units and allowed ranges; expose a modest player settings surface while retaining advanced operator configuration. Defaults and overrides are versioned data, not `if free/paid` branches in gameplay.

| Group | Independently configurable controls |
| --- | --- |
| Models | Exact permitted model/provider routes, default selected route, route price ceiling, supported reasoning mode; fallback disabled by default |
| Context | Total input tokens per request, serialized bytes, required/optional section allocations, recent-history and retrieved-evidence bounds; cumulative transmitted input per operation/window |
| Output | Total generated tokens per request/operation/window, reasoning allowance within route semantics, prose/record/patch size limits |
| Exploration | Enabled task purposes, rounds, reads, candidate/excerpt/retained-byte limits, query-work deadlines, optional callback discovery allowance |
| Recovery | Retry/repair attempts inside the same operation, backoff/deadline, explicit versus automatic recovery; uncertainty never retried automatically |
| Background work | Eligible narrative wake-ups per window, minimum interval, optional report/recap/summary/embedding allocations, concurrency and backlog/coalescing bounds |
| Money and throughput | Operation, story, run, account and platform microusd caps; input/output/request windows; maximum in-flight dispatches and bounded queue depth |
| Exhaustion | Pause affected story versus continue only already-authorized zero-inference routines; manual resume by default; whether separately funded on-demand use is permitted |

Use identifiable task purposes and independent allocations, not one vague “eagerness” number. For example, narrative surprise frequency is a creative/mechanical policy; permission to generate three optional narrated developments in a window is a resource limit. Exhausting that resource limit cannot erase an already committed hazard, redraw dice or make paid users mechanically luckier. A quality preference can request a recipe, but effective policy may deny it explicitly.

Keep soft targets and warning thresholds distinct from hard admission ceilings. A captured conserve policy can reduce optional callback exploration, shorten optional prose within the output contract, defer recaps or stop background extraction as allowance shrinks; it cannot remove required evidence, change committed outcomes or silently switch models. Dry-run estimates show expected range when evidence exists, conservative reservation, limiting dimensions and uncertainty. Do not advertise an exact number of remaining turns when their costs vary. Estimates inform choices; only reserved capacity authorizes dispatch.

Source document retention and context size are different. A lower-context account still has its saved history; it gets a smaller working set, not deleted memories. Drop optional texture/evidence before required state. If required truth cannot fit, report context overflow; waiting for a usage reset will not fix a per-request size limit. Token estimates and byte guards remain separately labelled; do not treat characters/4 as authoritative metering. All input includes instructions, schemas, tools, evidence and repeated prefixes, not just the player's sentence.

## Free, subscription and on-demand profiles

Represent free, several paid tiers and explicitly funded on-demand use as profile/grant data using the same resolver. Illustrative 20k and 50k input caps are supported design examples, not commercial promises or initial development defaults. A model advertising a larger capacity never overrides a smaller effective application cap. Use fake routes and synthetic profile grants to exercise these differences offline.

Free use needs a sponsor funding allocation and platform-wide ceiling: a per-user quota cannot protect the sponsor against many accounts. Paid entitlements likewise do not remove operator caps. Pin the payer; story ownership/membership changes cannot move an in-flight charge. Shared-party charging and actual checkout remain separate product work.

Separate prepaid spending permission from subscription quota. Default on-demand overage is off. Enabling it requires explicit payer consent, an independently capped funded grant, eligible routes and a clear admission mode; running out of subscription quota cannot silently start charging a card or consuming another wallet. Initial POC does not support split-paying one operation or automatically switching funds. No auto-top-ups, billing integration, taxes or invented subscription prices in this feature.

Upgrades/downgrades/revocations take effect for future dispatches after a policy recheck. Capture the policy used for each attempt. A started request remains liable under its original funding identity; do not rebill it under a new tier. Unsent work can be cancelled/released or explicitly recaptured against a new policy; never alter a captured request silently. Toggling tiers does not reset usage, reservations or the current window anchor. A less restrictive tier still cannot auto-enable paid inference in development.

## Window accounting and admission

Support explicitly configured fixed anchored windows and rolling windows in the same usage policy. Every definition names its metric, scope, duration, anchor when fixed, limit and version. Use authoritative server UTC time, half-open intervals and immutable dispatch timestamps; client clocks/timezones never grant quota. A fixed window has a known boundary. A rolling window regains capacity as older debits age out; expose the earliest estimated eligible time, not a fictitious global reset. Subscription billing periods, when introduced, require explicit entitlement grants rather than guessing a calendar month from a plan name.

All applicable windows must pass: a short burst limit can coexist with a daily budget and nonrenewing development cap. Reserve conservative input/output/money capacity before dispatch under the same serialized admission boundary as operation/run/account limits. Include all outstanding allocations, including ones originating before a reset, so unresolved work never disappears at a time boundary. Operation money is reserved once; window allocations reference it and do not create a second balance. Settle actual usage once and release only known-unused capacity. A dispatched malformed or discarded answer still consumes usage. Refund known-unsent token/money allocations; retain an admitted-attempt counter where its separate purpose is preventing retry loops.

For quota attribution, use the persisted dispatch timestamp, not settlement time. Late settlement updates its original window/debit; unresolved reservations still constrain admission until resolved. Retransmitted context is fresh input usage. Define input usage as all provider input tokens including cached input; record cache savings separately in monetary usage. Normalize reasoning already included in completion rather than counting it twice. Required metering absent means unknown: retain the conservative allocation and stop further paid admission until reconciled, even if total monetary cost alone was reported.

At each later dispatch, recheck current entitlement, account stop flags and every current window; prior operation admission does not bypass newly exhausted windows or revoked access. A new window does not reset per-operation rounds, retries, token totals or lifetime/run funding. Expiring window counters is not funding replenishment. Outstanding uncertainty blocks automatic recovery across boundaries. Fix window configuration through an explicit versioned transition; do not grant a fresh full allowance merely by editing its duration or anchor.

Concurrent accounts, stories, workers and optional jobs share their applicable scope locks/counters. Failed admission creates no provider call. Coalesce duplicate wake-ups. Bound wake-up batches and dispatch concurrency after reset so queued stories do not stampede into a fresh allowance. No per-second polling, model call to ask whether quota returned, or loop that continually retries an impossible request.

## Hold and recovery semantics

Distinguish `window_exhausted`, `funding_exhausted`, `context_limit`, `route_not_allowed`, `policy_revoked` and `usage_uncertain`. Expose a safe limiting dimension, used/reserved/remaining values with units, policy version, optional eligibility time and allowed next action. An eligibility time is not a guarantee if other limits or reservations still bind. Do not show “resets soon” for funding exhaustion or unknown billing.

The initial conservative setting is **pause the affected story when a required Storyteller task cannot be admitted, then require explicit resume after recovery**. Preserve committed receipts and exact activity progress. Apply the existing clock hold/reanchor path at the blocking boundary; time spent waiting for quota is not banked for a catch-up burst, new labor or missed unattended danger. Manual pause, interaction hold and usage hold remain independent. Reading, inspection and pause controls remain available without inference.

Optional reports/maintenance can defer without pausing unrelated work. A configurable quiet-only policy may allow already-authorized zero-inference routines while allowance is exhausted, but never continue through a controlling interaction or fabricate a replacement story. This is not permission for the game to add activities the Storyteller did not authorize. Existing activity/chain bounds remain in force.

At window recovery, a durable version-fenced wake-up rechecks availability and marks the task eligible. Default recovery performs no model call until Resume. Explicit opt-in auto-resume may retry only previously admitted work after all limits, ownership, clock/scene fences and manual holds pass; it may not choose for the player or clear manual pause. Development never grants auto-live-resume. A saved successful result can be published under normal fences without paying again. Stale prepared work is cancelled/recaptured explicitly, not regenerated invisibly on a timer.

## Conservative development preset and first paid gate

Always start offline. Implement the policies, window admission/holds and fake-provider failure evidence before a live run. Synthetic free/paid profiles and synthetic clock advances exercise commercial semantics without a payment processor or provider call. No subscription system is required to establish spending safety.

When the owner later explicitly authorizes the first paid smoke test, the proposed upper envelope is:

- One selected compatible route, one captured case, one request, one in-flight dispatch.
- At most 8,000 input tokens including framing/schema and 1,024 total generated tokens including billable reasoning. Disable reasoning when supported; otherwise its bounded semantics must fit or that route is ineligible.
- At most USD 0.01 (10,000 microusd) for both the operation and that initial run, further limited by verified remaining funding and applicable windows.
- No tools, exploration, repair/retry, fallback, standalone memory, embeddings, media, on-demand overage or auto-resume.

This is a proposed maximum, not authorization or a claim the current opening schema fits. Dry-run the exact packet; the existing byte-based conservative bound may reject a request whose estimated tokens appear to fit. Simplify optional context/schema or choose a smaller valid case; never waive the bound or silently raise caps. Live execution stays disabled if no meaningful case fits. Larger short-play evaluations need a separately captured, explicitly authorized envelope; a successful first call does not unlock them.

## Evidence required before live evaluation

Maintain manual QA for intersecting profiles, lower user overrides, model allowlists, oversize required context, window exhaustion, fixed/rolling recovery, concurrent last allowance, late settlement, uncertain usage across reset, profile downgrade, explicit on-demand consent, manual pause surviving reset, no clock catch-up and a reset backlog. Record no-call evidence for rejected/held work and actual usage certainty for injected responses. Offline tests establish enforcement, not provider billing accuracy or narrative quality. See the feature plan for the nearest implementation slice.
