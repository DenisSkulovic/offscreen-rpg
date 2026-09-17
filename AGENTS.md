# Working on this project

Read README.md and the relevant file in docs/. We are shaping a raw proof of concept.

## Required code quality gate

Before implementation or code review, read [the code quality standard](docs/engineering/code-quality.md). It is a required repository convention, not optional background. Existing code does not override it. Passing tests is not evidence that code is readable or maintainable.

Use explicit, domain-named boundaries; no nested ternaries, unexplained non-null assertions or ambiguous positional ID lists. Keep application orchestration, persistence details, pure policy and fixture content distinguishable. Review the final diff as a maintainer before declaring completion. Use `pnpm lint:quality` for the additional mechanical audit; known baseline failures must be reported honestly, not hidden with suppressions.

The current quality task is standards and checks only. Do not refactor the implementation, delegate cleanup or purchase cheaper model calls without a separately scoped task. Preserve unrelated edits. See the standard for detailed rules and the staged enforcement boundary.


For implementation work, read docs/technical/architecture.md and the technical document for the affected behavior. The design is proposed until implemented and verified; preserve explicit product questions rather than treating technical examples as settled requirements.

Read docs/progress.md before selecting the next implementation slice. Build and test the broader application with scripted generation and local/test substitutes; do not connect paid models, media or hosted integrations until the user explicitly chooses to enable them. Do not let an isolated subsystem's polish displace the next missing user flow.

Progress in balanced passes: establish the main component boundaries and representative flows, connect and refine them, then deepen validation and polish together. Keep correctness at persistence/auth boundaries, but avoid exhausting one subsystem's edge cases while other major parts have no implementation. Clearly label prototypes; their example policies do not settle product decisions.

- Keep docs current, concrete and useful. Use enough depth to explain the product; brevity is not the goal. Rewrite or delete obsolete text directly.
- Derive each slice from its product flow and technical contract. Update those descriptions alongside behavior changes, and replace affected statuses in docs/progress.md. Distinguish tested components from connected user flows; progress is a snapshot, never a log.
- Do not create decision ledgers, amendment histories, supersession notes, document IDs, review reports, archives or speculative feature catalogues.
- Brainstorming examples illustrate intent; they are not automatic requirements. Discuss consequential choices without demanding approval of entire documents.
- Keep unresolved choices in docs/questions.md. Remove them when resolved and update the relevant description.
- Prefer generic story progression over dedicated simulations for everyday activities or entire populations.
- Preserve the senior fullstack portfolio purpose: engaging UI, coherent state, reliable time/decisions and measurable AI costs.
- Add documents or infrastructure only when current work needs them. Do not initiate paid calls or deployment merely to flesh out an idea.
- Git is authoritative. Keep private context, credentials and player data out of the repository.

## Current development priority

Live LLM calls are disabled for the current phase. The user explicitly wants broader application development and reassessment before any model spend; the saved key is not permission to experiment now. Keep the chamber as an honest test harness. Prioritize connecting premise/review/start, asynchronous intention resolution, continuity, player experience and simulated accounting over more authored scenarios or a rushed showcase. Explain the actual POC behavior and limits before revisiting live evaluation with the user. Never present a scripted branch or an opening-only model response as a playable AI storyteller.

## Live-model spending constraint

The user supplied OpenRouter credit on 2026-09-17: **USD 10 total, intended to last at least a month**, not per run, per agent or per test. This is an upper ceiling, not a spending target or authorization to replenish/reset it. Prefer zero-LLM scripted tests. When live evaluation is deliberately enabled, prefer dirt-cheap models and tightly bounded calls. Never run paid calls in ordinary tests, CI, startup, background demos or unattended agent loops. Do not silently fall back to an expensive model or retry an ambiguous billed request.

**Mandatory spend awareness after every action/test:** this is a personally funded pet project with a strict allowance. Classify the action as no-provider-call ($0 model spend), billable with verified usage, or potentially billable with unknown usage. Never equate missing telemetry with zero spend. After every provider attempt, including errors, cancellations and retries, reconcile the attempt's reported charge with the persistent cumulative ledger/reservation and remaining allowance before issuing another paid action. Account for concurrent runs and provider reporting delays; retain conservative reservations until settled. Record the latest verified balance/usage with its timestamp when available, not a guessed balance.

Stop further paid work immediately on an unexpected charge, missing/ambiguous accounting, an unexplained balance change, a breached run/month allowance or a likely budget overrun. Tell the user prominently what is known, what is uncertain and what has been stopped. Do not retry, switch models, increase limits or top up to work around it. Safe local/no-LLM work can continue. Final work reports must state model spend for the turn and cumulative verified usage when known; explicitly say when cumulative account usage has not been verified. Review the call paths of test commands before execution: a test name or missing API response is not proof that it is free.

The credential is stored locally in ignored `.env.openrouter`; never print it, commit it, place it in browser code or copy it into documentation. Its presence does not enable inference. Before the first paid evaluation, implement explicit opt-in, a conservative per-run allowance, bounded input/output and attempts, and persistent cumulative usage/reservations shared by all runs. Verify current model pricing at selection time; stop when usage is uncertain or the allowance is unavailable. No automatic top-ups or monthly resets. Track actual consumption separately from the initial deposited amount; do not assume the account balance remains $10.

Run `python scripts/check_docs.py` after editing docs. Report actual changes briefly.
