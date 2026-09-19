# Bounded Storyteller effort and cost

Status: Prepared for implementation; no runtime changes yet.
Direction: on 2026-09-19 the owner required serious protection against context, tool, reasoning and orchestration bloat. This handoff constrains the prepared canonical-memory work. Live inference, paid services and runtime subagents remain disabled.

## Intended outcome

The Storyteller produces a useful next situation without treating every choice as a research assignment. The application, not the model, controls the task's resources. A small funded allowance cannot be multiplied by retries, parallel jobs, retrieval rounds, memory maintenance or future delegation. Storage can grow without making every prompt grow with it.

This is both safety and product quality: a cheap invalid or bland response is not success. Budget exhaustion preserves actual gameplay and explains what cannot continue; it never invents remembered facts, repeats rolls or secretly selects a more expensive route.

## Representative flow

A character sleeps and then performs an admitted patrol. Ordinary checks consume no inference. An incident holds activity and creates one bounded Storyteller task. A fully grounded exchange uses one focused request. Returning to an old acquaintance can select a retrieval-capable recipe: bounded search/inspection, then final narration under one shared envelope. Neither requires chapters or a permanent model conversation.

If optional discovery threatens the reserved final-answer capacity, skip that discovery. If essential evidence or funding is missing, retain the incident/receipt and show a generation hold. Reloading cannot grant another attempt. Optional report/summary jobs wait when their capped allocation is exhausted; saved sources remain available. A report cannot receive current-choice authority merely because it has spare tokens.

## Scope and boundaries

- Versioned task-specific context/tool recipes and application-selected effort limits.
- Persistent operation-wide accounting over the existing funding/run/attempt ledger; cumulative input retransmission, generated/reasoning tokens, reads, deadlines and money.
- Explicit provider capability/pricing normalization, worst-case cold/cache-write admission and final-answer capacity reservation.
- No hidden paid work in search, maintenance, summarization, classifiers, rerankers or retries; bounded background frequency and allocation.
- Compact canonical read/write projections, deterministic packing and per-section/operation observability.
- Offline cost/quality evidence and QA integration. No live calls, automatic model selection or GPU hosting.

Canonical storage remains owned by its feature; memory selection/search/round persistence remains owned by the memory feature. This feature supplies their common limits, not a second store, agent engine or financial ledger. Runtime subagents are a possible later measured extension, not a required phase here.

## Acceptance

1. Quiet gameplay and ordinary tests make zero provider calls, including background side effects.
2. Each task captures its recipe, capabilities and full effort envelope before dispatch. Reports cannot invoke planning/exploration tools.
3. Exploration, repair and attributable side work share durable ceilings. Restart, duplicate delivery, concurrent stories and cancelled requests cannot replenish them.
4. Optional reads cannot spend the reserved final-answer capacity. Missing mandatory context produces a named hold without new model work or altered mechanics.
5. Cold or expired cache, cache-write premiums, hidden reasoning, oversized tool results and unknown usage have explicit conservative behavior. No automatic fallback or top-up.
6. Source-linked compact records remain usable without raw-history injection. A source or document cannot change tools, route, limits or authority through text instructions.
7. Chamber evidence explains cost per accepted turn, spending by purpose, cap/overflow reason and unknown usage; it does not expose private prose or chain-of-thought in operational logs.
8. The same envelopes serve fast dialogue, quiet Batman-style patrol and a small/abstract microbe setting. Fixture results are not claimed as evidence that a cheap live model tells good stories.

## Owning specifications

[Context and cost](../../technical/context-and-cost.md#bounded-work-not-an-open-ended-agent) owns recipes, resource policy and tradeoffs. [Player experience](../../player-experience.md#acting-and-waiting) owns the visible stop/defer promise. [Memory](../2026-09-18--20-09--storyteller-memory-and-recall/PLAN.md) consumes the limits. [Live evaluation](../2026-09-18--17-27--conservative-live-model-evaluation/FEATURE.md) owns the later authorization boundary. [PLAN.md](PLAN.md) is the implementation handoff.
