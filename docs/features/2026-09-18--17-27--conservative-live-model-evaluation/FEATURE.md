# Conservative live-model evaluation

Status: Active developer tooling. Verified-zero-price runs use the owner's standing bounded authorization; every paid run still requires separate explicit authorization.

## Intended outcome

Run small, explainable OpenRouter experiments that answer concrete POC questions while protecting the owner's limited credit. Free models are the default live lubricant for mechanics and flow work; paid models are reserved for a concrete quality or capability blocker. Each run starts from a named QA case, uses a captured model/pricing/execution policy, produces complete traces, and stops when cost or accounting becomes uncertain.

The goal is evidence about gameplay quality and architecture compatibility, not a leaderboard or broad model search.

## Preconditions for any live run

All must pass immediately before dispatch:

- owner explicitly authorizes that run or bounded batch;
- current OpenRouter route/model availability and pricing are verified from authoritative sources;
- actual remaining provider allowance/balance is checked when available;
- a persistent funding account and run allowance are provisioned;
- QA case, model policy, maximum rounds/calls/tokens and microusd cap are captured;
- trace storage and redaction preflight succeeds;
- no unresolved uncertain attempt or unexplained balance change exists;
- scripted dry run of the same case completes structurally.
- the exact outbound packet has been held, inspected and released by hash through the [dispatch review contract](../../technical/provider-dispatch-review.md);
- [Bounded-cost B1/B2](../2026-09-19--19-08--bounded-storyteller-cost/PLAN.md) captures and enforces the operation envelope, reasoning semantics, retransmitted input and worst applicable cold/cache-write charge; any maintenance also has an admitted allocation.

A stored API key, selected model or previously authorized paid run does not satisfy these preconditions for another paid experiment. The owner's 2026-09-20 standing authorization covers deliberate, finite, traced local runs only when current route metadata proves zero input/output pricing and paid fallback is impossible.

## Captured evaluation recipe

Cost posture is data, not a hard-coded mode name. Each run captures independently bounded allowances for primary generations, retrieval reads, repair attempts, model judges, comparison variants, background work, concurrency, input/output/reasoning tokens and money. Zero disables that capability; omission never means unlimited. Provider, model, sampling and reasoning settings are captured alongside those allowances so the same QA snapshot can be replayed under a deliberately cheap or richer recipe without changing game truth.

Every auxiliary LLM call has a declared purpose and consumes the same aggregate run allowance. For example, two judge calls and ten judge calls are distinct recipes with a fivefold difference in judge-call count; neither is silently implied by “evaluation enabled.” Human or deterministic checks remain valid zero-call alternatives. Gameplay, tests and evaluations may choose different recipes, but all use the same fail-closed accounting contract.

## Evaluation ladder

### Gate 0 — Offline rehearsal

Run the entire case with the scripted agent. Confirm task/tool/publication traces, checklist evidence and accounting display. Cost: $0.

### Gate 1 — Single structured response

One model, one captured case that fits the conservative envelope, one request and no tools. Prefer the pineapple case if its exact packet fits; otherwise use a smaller meaningful case without weakening required truth or raising the cap. Inspect parsing, instruction following, action validity, latency, token usage and exact charge. Stop for review.

### Gate 2 — One short playable loop

Only after Gate 1 is accepted: one model, one pineapple story, at most three committed immediate rounds. No parallel runs, fallback model, automatic retry or model judge. Review every round and cumulative accounting before any second case.

### Gate 3 — Contrast case

Run either the same premise under the second storyteller or the microbe case, chosen to answer the most important uncertainty observed in Gate 2. Do not automatically run both.

### Gate 4 — One model comparison

Only when a concrete weakness justifies it, run the same captured case with one additional cheap candidate. Compare traces and anchored human rubric. Do not spray many models or prompts.

## Initial conservative envelope

The [conservative development preset](../../technical/usage-policy.md#conservative-development-preset-and-first-paid-gate) is authoritative: one request, at most 8,000 input tokens and 1,024 total generated tokens, at most USD 0.01, no tools/retry/fallback/background work or automatic recovery. All platform, account, story, window and funding constraints also apply. Implement B1 and both B2 accounting/window-hold slices and exercise the selected path offline before dispatch.

These are ceilings, not spending targets or standing authorization. At run creation, calculate a worst-case reservation from freshly verified pricing. If required context or cost cannot fit, the run cannot start. A later Gate 2/3 run needs its own explicit aggregate authorization; the first successful request does not expand this allowance. No payment processor or finished commercial tier catalogue is required for a safe developer-funded test.

## Model selection

Choose candidates at execution time from current OpenRouter data. Requirements:

- structured-output/tool support needed by the case;
- current price and provider route captured;
- explicit provider routing with fallback disabled;
- sufficiently small context/output limits for the case;
- no assumption that “free” or missing pricing means zero cost.

Begin with one current zero-price model likely to support the contract. Free routing is useful for flow exploration but remains captured evidence: record the actual returned model/provider and do not treat runs across changing free routes as controlled model comparisons. Move to a paid model only when free-model behavior is the diagnosed blocker, then obtain separate bounded authorization. Add another model only to test a stated hypothesis such as option quality, tool reliability or instruction fidelity.

## Stop policy

Stop the run and all later live work on:

- missing, delayed or contradictory usage/cost data;
- uncertain dispatch or response;
- unexpected fallback/provider/model;
- charge exceeding reservation or unexplained balance movement;
- invalid output that would require an unplanned retry;
- request, token or microusd cap reached;
- trace/evidence failure;
- any cumulative allowance uncertainty.

Safe offline investigation may continue. Never retry, switch models or increase a cap merely to rescue a disappointing run.

## Review evidence

Each run reports:

- QA stage outcomes;
- complete operation/tool/publication trace;
- structural validity and failure diagnostics;
- anchored human rubric with passage/option evidence;
- latency per round and end to end;
- input/output tokens, reservations and verified charges;
- cumulative known account usage/balance with timestamp when available;
- explicit uncertainties and recommendation: stop, repeat exactly, make one targeted change, or proceed to the next gate.

Do not use a paid model to judge another model in the first evaluation. Human review is cheaper and better grounded in the intended experience.

## Chamber controls

The Chamber may expose a developer-only live evaluation launcher, but it must be visually and technically separate from ordinary scenario Start. It shows the exact case, model, route, limits, worst-case reservation and remaining verified allowance before creating the run. Offline remains the default after restart.

Launching a run provisions only its captured allowance. The general app and tests remain unable to call the provider without explicit execution policy and funding.

## Acceptance

- An offline dry run proves the whole evaluation path at $0.
- A live run cannot start without fresh pricing, limits, funding and trace preflight.
- Caps are enforced persistently across restarts and all agent rounds.
- No automatic retry, fallback, concurrency or hidden follow-up call exists.
- Every charged or uncertain request is visible and reconciled before another dispatch.
- One run yields enough evidence to decide a specific product/model question.
- The UI and report never present missing accounting as zero spend.

## Boundaries

This feature does not create continuous benchmarks, CI inference, production traffic sampling, automatic prompt optimization, model tournaments or an unbounded provider loop. Free quota is still finite operational capacity, not permission to generate filler. The owner's USD 10 deposit remains an upper ceiling intended to last at least a month and is untouched unless a separately authorized paid run is necessary.
