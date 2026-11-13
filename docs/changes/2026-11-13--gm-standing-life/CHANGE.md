# GM03 | One bounded standing routine, not global autoplay

**State:** Proposed, **not Ready**. **Approval:** none. **Kind:** deterministic game/autonomy contract + persisted execution + tests. **Parent:** [mechanics program](../../experience/mechanics-evolution-program.md). **Prerequisite:** owner selects [bounded-standing-life target](../../experience/foundations/temporal-philosophy.md#model-c-bounded-standing-life-recommended-long-term-direction), after comparing strict vs short-plan vs standing-routine player expectations.

## Cursor first-screen brief

> **Current-source map:** [campaign operations](../../../packages/application/README.md#campaign-transition-boundary), inspect §packages/application/src/campaign/accepted-plans.ts§, §activities.ts§, §actions.ts§, §accepted-plan-controls.ts§ and public §packages/contracts/src/campaign.ts§.
> **Target:** [offscreen standing-life model](../../experience/foundations/temporal-philosophy.md#model-c-bounded-standing-life-recommended-long-term-direction), [absence flow](../../experience/flows/offscreen-handoff.md), [deliberate execution](../../../docs/technical/committed-time.md#permission-to-advance).
> **Known trap:** a standing routine is **not** a global world tick, unbounded repetition, AI improvisation or permission to choose at new decision points. Revalidation, resource limits, duplicate delivery and provider budget are hard correctness constraints.
> **Scope:** proposed only; one **already-supported repeatable activity family** in a finite horizon, not universal autonomous life.

## Selected outcome to prove, if later authorized

A solo player can accept a **standing bounded routine** (“repeat this previously authored repair/rest/study method up to N admitted iterations or horizon H, stop when a meaningful new decision is required”) under current scene authorization. The server stores one exact intent/policy and advances only eligible activity time. Each repetition:
1. Retains the activity definition/identity semantics and prevents duplicating one-time rewards.
2. Revalidates actor, location, resource, rule version, capacity and current offer/standing permission.
3. Settles deterministic checks once at valid clock boundaries.
4. Stops on admitted horizon/repetition cap, incompatible interruption, mandatory decision, insufficient resource or blocked authority.
5. Exposes safe factual progress and reason for stopping without forcing provider narration each tick.

**No auto-combat, arbitrarily generated social choice or invented travel action.** A standing routine does not authorize the Storyteller to decide a radically different intention because the player went offline.

## Why existing short plans are not the whole answer

Current accepted plans contain a finite sequence of specific successor tasks with horizon and revalidation. A standing routine could reduce repetitive scheduling *for a known repeated role*. But if this first experiment performs poorly or isn't safely bounded, **keep short plans** and do not add a second autonomy engine.

Alternative: UI can pre-build a short explicit repeated itinerary using existing plan contract. Test whether that satisfies player expectations before modifying engine semantics.

## Authority and source

[Time and autonomy](../../../docs/time-and-autonomy.md#bounded-plans-for-absence), [accepted plans and world clock](../../../docs/technical/solo-gameplay-contract.md#chain-and-idle-edges), [rules/activities](../../../docs/technical/rules-and-activities.md#prepared-local-opportunities). Current system has deterministic actions and accepted plans; general standing-life policy remains unproved. Snapshot reference main 3be49cc, 2026-11-13; inspect full source/rules at Ready.

## Code scope

A narrow accepted standing-intent contract, one application state transition path, persistence/identity/clock boundary, safe public projection, tests. Use existing event/receipt/scheduler and pause authority. A user-facing routine preview is a later UX Change, not a backend design excuse to add generic settings widgets.

**Exclude:** perpetual scheduler, arbitrary life planner, new combat, automatic relationship progression, one agent per NPC, default response at future decision, unbounded spending, silent background provider calls, large-world multiplayer and new map/currency/health engine.

## Acceptance and negative proof

**Normal:** player permits one repeatable quiet activity with maximum **three** eligible iterations and a hard fictional horizon. It completes exactly the permitted iterations, records each valid contribution once, reaches the horizon/limit and stops. A meaningful event interrupts after the first iteration; the second never starts until legitimately reauthorized.

**Negative:** no accepted standing intent means no time accrues. Storyteller intensity alone never starts a routine. Unsupported activity, changed location, insufficient resource or unavailable actor blocks before next start. A one-time completed reward cannot be harvested repeatedly. Duplicate worker delivery cannot execute an iteration twice. A held decision prevents an incompatible new iteration; manual pause remains authoritative; budget exhaustion cannot trigger an unauthorized paid request; no default selection of a social/combat option.

**Evidence:** deterministic multi-iteration and pause/event tests, ledger/receipt uniqueness, source-backed public projection; integration only under explicitly approved test data. No model calls. User comprehension test compares strict, queued and standing routine designs before rollout.

## Ready gate

Owner chooses exact first activity, horizon semantics, authorization/fallback boundaries and negative proofs after observing an offline prototype. If the change grows to arbitrary safe actions or shared-world plans, split it. **This is a small experiment in a living routine, not the full dream compressed into one Change.**
