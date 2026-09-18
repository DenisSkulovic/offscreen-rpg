# Earned-time playable loop

Status: Draft for owner review. Preparation does not authorize implementation or live inference.
Approval: Pending.

## Intended outcome

Demonstrate the defining Offscreen RPG experience: a character commits to something that takes real time, leaves the browser, may be interrupted by a D&D-style situation, and receives only the progress or reward actually earned. The immediate DM loop and the process runtime become one coherent story lifecycle rather than separate prototypes.

This feature selects one small contribution process as the gold vertical slice. It depends on the minimal approved portion of activity processes and world-defined progress; it does not implement every process family.

## Representative flow

A newly arrived character accepts a guard shift with modest compensation on valid completion. The screen shows what they are doing, the conditional expected completion and that the reward is not yet owned. The player closes the browser.

At a meaningful boundary, either the shift progresses quietly or an approaching stranger interrupts it. The interruption commits progress up to that boundary and creates an immediate scene. The player can challenge, converse, seek help or abandon the post. The server performs any admitted D&D check once. The resulting facts determine whether the shift can resume, changes terms or fails.

If resumed, the saved process continues from committed progress. Completion later grants the agreed reward exactly once and produces a concise return recap. A later encounter with the supervisor recognizes the result. Development timing can be accelerated through the Chamber without changing production clock semantics; at least one real wall-clock/restart run remains required.

A microbe contrast uses the same process lifecycle for an environmental transformation without work, wages or human capacity assumptions.

## Scope and boundaries

Included:

- one contribution-style process with rule-owned progress and conditional completion;
- one exclusive capacity claim narrow enough for the selected character fixture;
- quiet batched advancement without per-tick narration or inference;
- one supported interruption that hands off to the immediate DM-turn lifecycle;
- resume, abandon and invalidate outcomes;
- completion-only reward/effect commitment;
- browser absence, worker restart, pause and return recap;
- accelerated Chamber timing plus a genuine elapsed-time acceptance run;
- one nonhuman contrast using the same lifecycle.

Deferred:

- general traversal, combat processes, arbitrary professions and universal economies;
- autonomous player decisions and multiplayer capacity; bounded absence authority is owned by the linked follow-up feature;
- a universal spatial model, calendars or body-slot system;
- live-model generation and notification-channel integration.

The shift, compensation and humanoid capacity are fixture content. Shared runtime contracts remain setting-independent.

## Acceptance

- Starting the process records a commitment but does not grant its completion reward.
- Quiet time advances through deterministic boundaries without model calls or one passage per tick.
- An interruption commits prior valid progress, prevents blind completion and produces a normal immediate-action offer.
- A committed immediate outcome can permit, alter or prevent process resumption.
- Resume continues from durable progress; abandon and invalidation do not silently restart or finish it.
- Completion grants its supported result once across duplicate delivery and worker restart.
- Closing and reopening the browser shows the authoritative current process or interruption, never a stale promised arrival.
- An accelerated run and a real elapsed-time run exercise the same production contract.
- The microbe contrast uses no mandatory wage, profession, anatomy or distance fields.
- The player can explain why the resulting resource or progress was earned rather than narrated into existence.

## Decisions still needed

- What fictional fixture best represents the first shift while avoiding unwanted employment-simulator assumptions in the product presentation?
- Is the first capacity model one exclusive “primary commitment,” or a named capability claim already shaped for future distributed entities?
- Which interruption outcomes allow resumption, and who chooses abandonment after an unresolved interruption?
- What real duration is meaningful enough for acceptance without making development impractical?

## Owning specifications

[Vision](../../vision.md), [benchmark playthroughs](../../playthroughs.md), [gameplay](../../gameplay.md), [time and autonomy](../../time-and-autonomy.md), [game rules](../../game-rules.md), [activity processes and world-defined progress](../2026-09-18--16-48--activity-processes-and-progress/FEATURE.md), and [bounded autonomy and re-entry](../2026-09-19--00-26--bounded-autonomy-and-reentry/FEATURE.md).
