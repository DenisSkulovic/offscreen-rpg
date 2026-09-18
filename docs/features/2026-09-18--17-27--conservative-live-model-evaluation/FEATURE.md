# Conservative live-model evaluation

Status: Proposed design. Implementation does not authorize a provider call; every live run still requires the owner to reopen evaluation deliberately.

## Intended outcome

Run small, explainable OpenRouter experiments that answer concrete POC questions while protecting the owner's limited credit. Each run starts from a named QA case, uses a captured model/pricing/execution policy, produces complete traces, and stops when cost or accounting becomes uncertain.

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

A stored API key, selected model or previously authorized run does not satisfy these preconditions for another experiment.

## Evaluation ladder

### Gate 0 — Offline rehearsal

Run the entire case with the scripted agent. Confirm task/tool/publication traces, checklist evidence and accounting display. Cost: $0.

### Gate 1 — Single structured response

One model, one captured pineapple planning task, one request unless the task deliberately requests an allowlisted validation tool. Inspect parsing, instruction following, action validity, latency, token usage and exact charge. Stop for review.

### Gate 2 — One short playable loop

Only after Gate 1 is accepted: one model, one pineapple story, at most three committed immediate rounds. No parallel runs, fallback model, automatic retry or model judge. Review every round and cumulative accounting before any second case.

### Gate 3 — Contrast case

Run either the same premise under the second storyteller or the microbe case, chosen to answer the most important uncertainty observed in Gate 2. Do not automatically run both.

### Gate 4 — One model comparison

Only when a concrete weakness justifies it, run the same captured case with one additional cheap candidate. Compare traces and anchored human rubric. Do not spray many models or prompts.

## Initial conservative envelope

The first proposed live authorization should be no larger than:

- one model;
- one QA case;
- one sample;
- at most six provider requests total, including agent rounds;
- at most 40,000 input tokens and 6,000 output tokens across the run;
- a hard run cap of USD 0.05 expressed as 50,000 microusd;
- no concurrent live runs;
- no automatic retry or fallback.

These are ceilings, not spending targets or standing authorization. At run creation, calculate a worst-case reservation from freshly verified pricing. Lower the token/request limits when the selected model makes the envelope unnecessarily large. If worst-case cost does not fit the cap and remaining allowance, the run cannot start.

## Model selection

Choose candidates at execution time from current OpenRouter data. Requirements:

- structured-output/tool support needed by the case;
- current price and provider route captured;
- explicit provider routing with fallback disabled;
- sufficiently small context/output limits for the case;
- no assumption that “free” or missing pricing means zero cost.

Begin with one inexpensive model likely to support the contract. Add a second model only to test a stated hypothesis such as option quality, tool reliability or instruction fidelity.

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

This feature does not create continuous benchmarks, CI inference, production traffic sampling, automatic prompt optimization, model tournaments or a standing monthly budget. The owner's USD 10 deposit remains an upper ceiling intended to last at least a month.
