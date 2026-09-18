# D&D and storyteller implementation checkpoint

## Current checkpoint

- Authorization: the owner requested continued fixes and movement toward the real agentic POC on 2026-09-18. Codex owns this slice. Live inference remains disabled; checks remain optional.
- Base: `a77fe13` on `codex/mechanical-runtime-checkpoint`. This pass is uncommitted; nothing was merged or pushed.
- Implemented: simulation ticks across content, admission, settlement, controls, receipts, narrator context and UI; exact rational fractional progress; bounded old-rate catch-up before controls. Start retry compares the creation profile rather than the mutable current profile.
- Persistence: migration history is squashed into one current `0000_initial_schema.sql`. Prototype migrations, protocol flags, millisecond/hour columns, converters, decoders, historical DTOs and inspection UI were deleted. Local pre-POC databases must be reset rather than migrated. Content version 2 and plan version 3 are the only mechanical formats.
- Evidence: source review of admission, control/retry, batching and the clean migration. `node --test packages/server/test/tick-clock.test.mjs`: 6 passed, about 0.35 seconds inside Node. Only pure clock code and type-only contracts are imported. A Node module-detection warning remains. No builds, typechecks, lint, application launch or integrated playthrough.
- Provider spend: $0. Cumulative account usage unverified.

## Design trace

The invariant is ordered ticks and authoritative checks/effects, independent of prose or world scale. The pineapple uses immediate persuasion/cover and a twelve-tick quiet interval. The microbe uses eight ticks with separate environmental checks every four ticks, no quantity and no location. Neither grants a default fictional duration to a tick. A distributed consciousness uses the same integer positions without a human calendar or one model call per tick. Optional calendar presentation is not implemented.

Earned progress and resolved boundaries are distinct. Fractions survive controls before the first boundary. A batch cap cannot discard earned time; an interruption can discard progress after its own boundary because that future never occurred. Instant still resolves ordered checks. Numeric bounds protect exact arithmetic, not a one-year fictional limit.

## Remaining blockers and exact next action

This remains a connected **authored** slice, not the generative DM POC. Do not describe task context or profile data as a working tool-using agent.

1. **Next: isolate consequence preparation.** `settleActivity` still assembles context inside the mechanical transaction. A preparation failure can roll back valid rolls/effects. Persist a durable consequence intent/hold with the outcome, prepare its immutable request afterward, and expose preparation failure/retry without reopening resolution. Capture state/settings/evidence boundaries so delayed preparation cannot use a different scene. Reuse existing execution/accounting/publication after preparation.
2. **Tag contract/editor.** Follow [ticks-and-tags](../../technical/ticks-and-tags.md): definition identity/revision, scope, parameter shape, authority and application snapshots, deterministic preset/override/removal semantics and task-specific compilation. Replace `emphasis`/`surprises` and id/description-only tags. Tags cannot select code or promote themselves into mechanical authority.
3. **Real generated choice loop.** Implement the bounded tool-using opportunity/adjudication task in [the agency plan](../contextual-option-agency/PLAN.md). Validate proposed tick plans before offering commitments, roll after selection and supply saved outcomes to subsequent planning/narration. Authored content must become a substitute source for that same contract.
4. **Connected POC exercise.** Then exercise preview, selection, d20/effect, narration, fresh choices and timed interruption locally. Live evaluation requires deliberate reopening of spending. Checks remain optional.

Other observed limits: same-tick roll history sorts by random UUID, so latest-100 ordering is not reliable for many immediate actions; add a stable committed order when revisiting the ledger. Broad D&D combat/damage, new world-fact admission, secret encounters, agency beyond six captured actions and resuming interrupted commitments remain unfinished.
