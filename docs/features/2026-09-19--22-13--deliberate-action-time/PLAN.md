# Implementation plan

Feature: [Deliberate action time](FEATURE.md).
Execution scope: the owner's time/choice clarification selects the product direction. This pass prepares implementation; no code changes. Implementation owner: Cursor by default; Codex reviews, or implements when asked. Do not dispatch another agent. No provider execution.

## T1 — Explicit permission for clock advancement

Status: implemented. The explicit activity-identity gate, idle-start reanchor and durable intent → generation → decision hold ownership are implemented. Accepted-plan horizon coverage proves no successor starts beyond its boundary. Focused preparation-failure evidence proves the committed receipt, exact clock and intent-owned hold survive a failed pre-generation transaction; the player view explains that pending state. Depends on current campaign clock/holds; does not depend on storage/memory work.
Outcome: an idle campaign cannot drift, and a durable preparation intent closes the command-to-worker gap. Existing activities still advance under accepted terms.

Owners: game `time.ts`; application `campaign/clock.ts`, `activities.ts`, `holds.ts`, `actions.ts`, `narration.ts`, `controls.ts`, `settings.ts`, `accepted-plans.ts`, `reads.ts`; Storyteller publication; campaign schema/contracts and minimal play status. Inspect these callers before changing signatures; absence of a hold must no longer imply permission to run.

Bounded changes:

1. Introduce a typed explicit clock-eligibility input describing the accepted execution and its boundary. Initially the existing active activity supplies it; idle and blocked states cannot create eligibility. Reads, scheduling, settlement and controls use the same pure projection policy. Keep exact fractional arithmetic and distinct projected/settled frontiers.
2. Clamp terminal/horizon/controlling boundaries. Preserve authorized quiet-chain catch-up and bounded-batch backlog, but discard unaccepted time beyond the first actual stop. Record/reanchor transitions so a later command cannot bank idle elapsed time. Instant pace advances only accepted work.
3. Required action/consequence intent acquires a hold in the transaction that creates it. Its stable owner exists before generation. Transfer intent → generation → exact published decision under the story lock without clearing unrelated holds. Failed task preparation retains an inspectable blocker. This corrects the existing asynchronous admission gap without treating a missing generation as success.
4. Keep a paused/encounter/suspended activity distinct from an execution permitted to advance. Current mechanical actions are still zero-time until T2; report that intermediate limit honestly. Quiet menus require no active execution and cannot restart idle time.
5. Maintain public status, durable lifecycle history and safe operational correlation; update existing QA cases and the docs' implemented boundary. Fold any schema change into the single baseline.

Relevant evidence: idle before first selection, quiet completion with no successor, accepted successor/horizon, restart after a long idle anchor, preparation failure before task creation, manual hold surviving a transfer, stale wake and instant-mode boundaries. If checks are run, use narrow deterministic clock/application probes; check policy is optional. No full suite or live inference needed.

Exit: all existing progression entry points require explicit accepted execution; durable holds have no worker gap. Commit/push before T2.

## T2 — Finite action duration through the existing clock

Status: active. Public offer timing is mandatory: current automatic/check actions still disclose `instant`, process/resume actions disclose `process`, and the player view labels the instant branch as a temporary POC limit. Private automatic/check plans now also require a bounded positive `durationTicks`; missing duration fails validation, and offline fixtures carry explicit authored values. The public projection deliberately remains `instant` until execution actually honors those values. Next persist and schedule the finite-action boundary, then expose the duration. Outcome: dialogue and other bounded actions consume admitted time and settle once, with honest sequential narration initially.

Owners: game action/timing schemas and resolution policy; Storyteller task/output validation and fixtures; application action admission, execution settlement, receipts, follow-up and snapshot projection; DB baseline; worker wake bindings; public offers and play controls. Extend the existing advancing slot to discriminate finite action/activity; do not introduce parallel clocks or make fake contribution points for dialogue.

Separate time semantics from automatic/check/process/resume resolution. Missing timing fails admission; explicit supported zero-time semantics must not preserve zero-time conversations by default. Content/rules own fictional granularity and duration; pace owns real wait. Publish understandable timing in offers. Admission records a durable command/execution, then completion applies effects/receipt at the boundary and requests the required turn. Consume selected time once; retain executed history if narration fails. Paused repair earns no work while conversation advances the world. Reuse exact time controls and meaningful wakes. Keep a finite action non-cancellable in the first scope, with pause support.

Acceptance: tavern exchanges accumulate the sum of declared durations; slow generation adds none; short instant execution still adds fictional time; invalid selection consumes none; speed/pause/replay preserve exact progress; interrupted A resumes at the advanced world position. Update fixtures and QA availability honestly. A short action uses one provider operation at most under the existing policy.

Exit: connected offline timed choices, receipts, waits and held next decisions. Sequential model latency remains explicitly visible; commit/push before T3.

## T3 — Safe overlapping preparation and readable recovery

Status: follows T2; required for the finite-action overlap acceptance, not a general speculative agent runner. [Calendar/world-time K1/K2](../2026-09-19--22-29--calendars-and-world-deadlines/PLAN.md) supplies date interpretation and world obligations; integrate K2 before claiming overlap safe in time-limited plots. T1/T2 do not depend on elaborate calendar features.
Outcome: eligible closed finite actions can prepare a single next turn during their real wait; early/late results respect the same time contract.

Owners: pure overlap eligibility, durable pending resolution/task schemas, execution settlement, Storyteller admission/context/publication/recovery, snapshot/cache freshness, Chamber failure controls and QA catalogue. [The contract](../../technical/committed-time.md#safe-overlap-for-a-bounded-atomic-action) fixes the ownership: frozen private result and projected state; current mechanics only at completion; publication only against the matching settled receipt. Current consequence packets promise committed evidence and cannot simply be reused for pending evidence.

Gate overlap on complete stable mechanical knowledge. Deny it when intervening world/occurrence rules, cancellation or competing authority can change the result. Reserve once-drawn outcomes/resources under the accepted execution, keep pending data out of canonical history and available possessions, and revalidate/promote once at completion. Whichever side finishes second invokes the same publication operation. Context, retries and cost stay within one operation envelope. Unsupported overlap falls back to sequential execution without disabling due rules or pre-generating alternative choices.

Acceptance: two-second and thirty-second fake-provider completion for the same five-second action; invalid/stale/duplicate output; restart before either side completes; pause while generation finishes; failure after mechanical settlement; no extra tick/draw/debit on retry. Exercise a due-interruption case that is ineligible for overlap. Show completed execution with pending narration separately. Record the relevant history and sanitized correlated diagnostics. Update all related QA versions and permanent documentation, then remove this feature only after all phases are delivered.

## Design trace and alternatives

- Tavern: three exchanges have explicit durations; the player can spend minutes reading without consuming fiction. This closes the current repeated-zero-tick path.
- Harbor repair and SpongeBob: suspend earned work, spend time on a short scene action, then explicitly resume the retained instance at the new world tick. The job keeps its points; it does not receive dialogue time as labor. Existing benchmark numeric traces require updates when timing lands.
- Vvardenfell travel and Batman patrol: long accepted execution can run offline, stop at an encounter or horizon, and finish quietly. No accepted plan means no drifting world or free event exposure.
- Microbe/abstract consciousness: sensing/connection actions use the same finite-duration and contribution contracts with content-defined units, without imposing human seconds or dialogue machinery.
- Rejected approaches: charging provider latency makes gameplay depend on backend speed; jumping time at click awards unearned progress; delaying only the UI leaves mechanics and history premature; one universal cost per choice ignores fiction; a second narrative timer double-counts world time; universal speculative generation cannot know future checks.
- Recommended unit choice: keep existing stable simulation ticks plus pace, with optional one-second UI updates. A universal real-second tick would require a separate fixed world-time coordinate and conversion of every cadence; it adds ambiguity without improving the requested experience. Numerical tuning remains content, not a new authorization gate.

## Current checkpoint

- Phase: T1 complete; T2 active. Offers and the player surface expose the implemented `instant` versus `process` behavior. Positive finite duration is now mandatory in private automatic/check plans and fixtures, but remains intentionally hidden behind the honest `instant` label until the next slice moves dice/effects/receipt settlement behind a durable clock boundary; no click-time clock jump. Calendar/world-time K1/K2 remains after T2 and before overlap acceptance for timed stories.
- Reviewed base: `657e476`, clean working tree before this implementation slice. No schema change or database reset is required for the eligibility gate.
- Evidence: source trace of every `projectCampaignClock` caller, due-time projection and action/activity consequence admission; contracts, application and integration packages compile. Focused integration covers operation-owned intent before generation transfer across three consequences, failed required generation recovery, horizon stop and pre-generation preparation failure without repeated mechanics or clock drift. This is deterministic lifecycle evidence, not manual rhythm/timing evidence; T2 will make the deliberate-time QA journey available.
- Remaining limits: general combat scheduling, shared-world clocks and timed default actions remain separate work. T3 is a real change to pending versus committed evidence and cannot be reduced to hiding an already-committed result in the UI.
- Spend: $0 application-provider calls; cumulative account usage unverified.
