# Live-model spending constraint

Ordinary automated tests, CI and unattended loops must keep live LLM calls
disabled. On 2026-09-21 the owner explicitly made bounded paid OpenRouter calls
part of normal local POC development and player-driven Story mode. Prefer the
shortest useful live experiment once local structure is credible; provider-free
rehearsal is a diagnostic tool, not a gate that may indefinitely postpone real
play. Each development operation remains finite, one call at a time by default,
with captured request/response evidence, paid fallback disabled unless selected
deliberately, and no automatic retry, model spraying or silent escalation. A
saved API key alone remains no authorization for background or unattended work.

For Storyteller exploration and canonical-memory work, follow the [bounded-work contract](../../docs/technical/context-and-cost.md#bounded-work-not-an-open-ended-agent). Application-assigned task recipes and one shared operation envelope must bound cumulative input retransmission, output/reasoning, tools, repair and attributable maintenance. No independent subagent/queue budget, automatic LLM compaction, hidden paid retrieval or model escalation. Cache savings are optional; account for applicable cache-write premiums. These are implementation requirements, not claims that the current one-shot adapter already enforces every category.

Follow [usage policy](../../docs/technical/usage-policy.md) for account profiles, strictest-limit resolution, usage windows and hold/recovery. A recurring quota reset is not funding replenishment, live-run authorization or permission to clear a manual/uncertain-billing hold. The first proposed paid evaluation is limited to one request, 8,000 input / 1,024 generated tokens and USD 0.01, further constrained by verified funding and explicit owner authorization; no tools, retry, background inference, overage or automatic resume. Dry-run the exact packet and implement its profile/window/accounting safety path first. Never widen limits merely because the current schema does not fit. Commercial profile fixtures do not enable subscriptions or provider calls.

The user supplied OpenRouter credit on 2026-09-17: **USD 10 total, intended to
last at least a month**, not per run, per agent or per test. This is an upper
ceiling, not a spending target or authorization to replenish/reset it. Traced
paid Storyteller calls are authorized for deliberate development and
player-driven gameplay when the selected model and finite operation ceiling are
visible. Prefer a cost-effective model expected to complete the contract; do
not require a weak/free-model failure before using it. Never run paid calls in
ordinary tests, CI, startup, background demos or unattended loops, and never
retry an ambiguous request automatically.

**Mandatory spend awareness after every action/test:** this is a personally funded pet project with a strict allowance. Classify the action as no-provider-call, verified-free provider call, billable with verified usage, or potentially billable with unknown usage. A `:free` label or router name is not enough: verify current zero pricing and the reported charge. Never equate missing telemetry with zero spend. After every provider attempt, including errors, cancellations and retries, reconcile the attempt's reported charge with the persistent ledger/reservation before issuing more provider work. Paid attempts additionally require reconciliation against the remaining paid allowance. Account for concurrent runs and provider reporting delays; retain conservative reservations until settled. Record the latest verified balance/usage with its timestamp when available, not a guessed balance.

Stop all further provider work immediately if a supposedly free call reports a nonzero or ambiguous charge. Stop further paid work on any unexpected charge, missing/ambiguous accounting, unexplained balance change, breached allowance or likely overrun. Tell the user prominently what is known, uncertain and stopped. Do not retry, switch models, increase limits or top up to work around it. Safe local/no-LLM work can continue. Final work reports must state model spend and distinguish no-call from verified-free inference; report cumulative paid usage when known and say when it is not provider-verified. Review command call paths before execution: a test name, free label or missing API response is not proof of zero spend.

The credential is stored locally in ignored `.env.openrouter`; never print it, commit it, place it in browser code or copy it into documentation. Its presence does not enable inference. Before the first paid evaluation, implement explicit opt-in, a conservative per-run allowance, bounded input/output and attempts, and persistent cumulative usage/reservations shared by all runs. Verify current model pricing at selection time; stop when usage is uncertain or the allowance is unavailable. No automatic top-ups or monthly resets. Track actual consumption separately from the initial deposited amount; do not assume the account balance remains $10.
