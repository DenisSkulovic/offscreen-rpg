# Storyteller-authored situations and reusable choices

Status: Approved and partially implemented. Per-situation authority (S1) is complete; reusable quiet choices and exact retained resumes (S2) are in progress. Finite occurrence scope and broader continuous invalidation remain unfinished.
Approval: The owner explicitly selected Storyteller-authored choices, optional activity access and rapid/quiet pacing on 2026-09-19, then authorized offline implementation. No live inference is authorized.

## Intended outcome

The Storyteller decides what the player can meaningfully choose **in this situation**. The game does not add an eating option because an apple exists or reopen sleep because one enemy left. A rapid scene can authorize no activities. A quiet situation can offer prepared activities that the player selects/repeats without fresh generation until that authorization changes.

Reusable definitions and current permission are separate. Definitions describe supported mechanics; a situation selects which are offered, with explicit scope/version and handoff. The engine validates, filters and executes this authored selection but never becomes a second author. Scene publication and authorization change atomically.

This deserves a separate feature because it owns interactive authority across both immediate actions and activities. It is not another process rule, queue, memory index or scene scheduler. Extract this responsibility from the overloaded activity phase rather than implement two catalogues or two permission layers.

## Representative flow

The [gold harbor session](../../technical/playthroughs/harbor-session.md) starts with repair/tools/wait explicitly offered. Work is interrupted. H1–H3 each publish authored intentions with no routine access. The apple in the character's inventory creates no button. H4 explicitly reoffers exact retained work and other selected opportunities. Quiet completion reprojects that current selection; it does not request a model to invent the next menu.

An old H0 click fails under H1 before new effects. A duplicate publication cannot restore H0. If H4 generation fails, the engine holds with a reason rather than inventing generic activities. A late historical report does not replace H4. A microbe's current environmental scene applies identical boundaries without human necessities or geography.

## Scope and boundaries

Includes explicit situation authorization, reference/version validation, bounded reusable definition storage, fresh offer projection within continuing authorization, exact retained-instance references, task input/output extensions, publication fencing and a compact player projection. Supports an explicit no-activity selection, not a hidden global blacklist. Carries forward only specifically named references; omission is not inheritance.

Process progress, clock settlement and switching atomicity remain activity-foundation responsibilities. Follow-up intents, report-only publication and accepted queues remain autonomy responsibilities. This feature supplies their authorization inputs and gates; it does not create successors or control model spending itself.

Initial content uses declared existing targets and supported contribution/wait rules as they become available. Generated packages later use the same validators and supported vocabulary. Arbitrary NPC/world generation, capability transformations, combat, maps, free-text gameplay and a generic agent framework are excluded. Not offering an action need not mean it is physically impossible; do not invent world facts merely to justify a focused menu.

## Acceptance

- Each interactive scene explicitly supplies its immediate intentions and activity access; no carry-forward by omission.
- Three rapid scene-only turns expose no routine choices and cannot be bypassed by old starts, exact-instance resumes or queued entries.
- Possessing an apple, tool or route access never creates an option without current authored permission.
- A quiet selection supports independent A/B/repeat choices with zero generation-task admissions after preparation, subject to valid captured terms.
- Revoking/replacing situation authority prevents stale use before effects; supported condition changes only filter references still authorized.
- Existing work, receipt history, player ownership and manual pause survive new scene publication appropriately; a new menu cannot rewrite them.
- Late report publication does not change current authorization. Failed/stale scene preparation preserves an explained hold and committed mechanics.
- Oversized, unsupported or out-of-scope proposals fail before publication; source/scripted and future provider output share admission.
- The player sees current intentions/blockers without private DCs, hidden triggers or internal IDs. Inspector evidence can explain the authority without becoming the primary UI.

## Decisions still needed

No owner choice blocks the nearest bounded offline phase. Proposed technical caps and solo defaults are explicit in the integration contract and can be revised from experience. Owner taste, live generation quality and later arbitrary-world declarations remain separate evaluation/design gates; they are not prerequisites for an authored authority proof.

## Owning specifications

[Gameplay](../../gameplay.md), [rules and activity authorization](../../technical/rules-and-activities.md#prepared-local-opportunities-proposed), [solo integration contract](../../technical/solo-gameplay-contract.md), [LO-01–05](../../technical/playthroughs/local-opportunities.md), and [gold session](../../technical/playthroughs/harbor-session.md).
