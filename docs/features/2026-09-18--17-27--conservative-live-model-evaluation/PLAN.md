# Conservative live-model evaluation plan

Feature: [Conservative live-model evaluation](FEATURE.md)
Status: Proposed. No live provider call is authorized.

Dependencies: QA journey/run contracts, trace completeness, existing persistent budget controls extended by [bounded-cost B1/B2](../2026-09-19--19-08--bounded-storyteller-cost/PLAN.md), and a playable task path worth evaluating. Reuse its captured recipes/operation ledger and provider semantics rather than implement competing controls in the launcher.

## Phase 1 — Evaluation-run contract and preflight

Define captured case/model/route/pricing/limit policy, worst-case reservation, balance/accounting snapshot and preflight failures. Reuse the [provider dispatch review](../2026-09-19--22-58--provider-dispatch-review/PLAN.md) to build, hold and inspect the exact packet without dispatch.

Exit: an ineligible run explains exactly why it cannot start.

## Phase 2 — Chamber launcher and live isolation

Add a developer-only launcher separate from normal story controls. Offline is always default. Creating a live run requires explicit current parameters and provisions only that run's allowance. Ordinary tests and application startup cannot trigger it.

Exit: restarting the Chamber cannot silently preserve “live enabled” as a global mode.

## Phase 3 — Gate execution and stop policy

Drive one QA case through Gate 1/2 limits. Check persistent calls/tokens/reservations before each dispatch. Surface uncertainty immediately and prevent further provider work until reconciled.

Exit: a bounded run either finishes with verified accounting or stops safely with explicit uncertainty.

## Phase 4 — Review report

Combine QA results, trace links, rubric observations, latency, usage, cost and cumulative-account snapshot into one evidence report. Comparison is allowed only between deliberately selected runs of the same case/version.

Exit: the owner can decide whether to stop, make one targeted change or authorize the next gate without rereading terminal logs.

## First-run proposal

After dependencies are implemented, propose exactly one current compatible cheap model and one Gate 1 case within the [conservative preset](../../technical/usage-policy.md#conservative-development-preset-and-first-paid-gate). Prefer pineapple if its complete packet fits; otherwise choose a smaller meaningful case, never increase limits automatically. Verify pricing, window eligibility and remaining allowance at that time. Present the concrete worst-case reservation for owner authorization. Do not preselect a model because availability and pricing change. A first-run success does not authorize Gate 2 or recurring usage.

## Current checkpoint

The repository already has explicit provider opt-in and persistent reservation/attempt accounting, but no evaluation-run manifest, trace-completeness preflight, staged gate runner or Chamber live launcher. No provider request was made during design.
