# Gameplay worlds and live operations

**Owns:** how staff understand which rules and Storyteller configurations affect which campaigns, and how a future change to behavior is rolled out without rewriting history.

**Does not own:** commercial refunds, provider billing implementation, or the engine's meaning of an accepted action ([selected engine](../../technical/engine/selected-architecture.md)).

**Status:** proposed product target, 2026-11-14. Owner review still required. This page is the proposal, not an accepted production kill-switch and not an implemented LiveOps console ([illustrative examples](README.md#what-this-section-establishes-and-what-it-does-not)).

A change to future behavior is released by named version to a chosen audience under an explicit adoption policy. Publishing a catalogue or approving a proposal changes no active world until adoption activates it, and emergency controls limit only future eligibility.

## The question

What behavior is currently active, for whom, why, and what is the safe path to change it?

A change may improve latency and cost while damaging continuity or a player-selected style. The operator must see the intended effect and its blast radius before activation. This is not an unrestricted console where any employee edits prompts, TypeScript, SQL or world state.

Narrative presentation, Storyteller profile content, task recipe and model routing, game rules, visibility, sponsorship pauses, experiments, and data migrations are different categories. A code deployment, a model-route change, a historical repair and an emergency spend pause are not the same operation. Admin may orchestrate or observe a release. It does not own arbitrary authoring.

## Adoption policies

Campaigns persist with earned time, committed consequences and source-linked memory. Each class of change picks an adoption policy on purpose:

| Policy | Promise |
| --- | --- |
| New campaigns only | Existing stories keep their declared behavior unless migrated |
| Compatible forward update | Committed truth stays intact; future nonmechanical behavior may improve |
| Opt-in upgrade | Affected players knowingly accept a meaningful creative or rule change |
| Controlled migration | Current state and active tasks are handled explicitly and the outcome is verified |
| Emergency restriction or stop | Future eligibility can be suspended. Past history is not erased |

Default toward protecting established commitments. A profile update cannot silently turn a quiet campaign into mandatory heroic action. A model-route update cannot grant an expired entitlement. Higher pricing cannot grant permission to reroll dice or fabricate earned time.

Two facts do not move:

1. Already committed mechanical events remain historical fact. Rollout and rollback do not reroll accepted actions, erase receipts, or retroactively transfer inventory.
2. Already published passages were seen. A defined correction workflow may address them. A model rollback does not make readers un-see them.

A migration is not a story fork. A story repair is not a configuration rollback. The exact matrix of automatic, advised and mandatory changes remains an owner decision.

## Release lifecycle and emergency controls

Prepare a named version, classify compatibility, select an audience, review blast radius and fallback, authorize that specific target, activate only the allowed audience, observe cost, reliability and continuity, then pause, roll back or expand within authority. An approved proposal is not yet active. States such as draft, approved, scheduled, activating, active, paused, rolled back and partially applied must reflect verified conditions.

| Control | May | Must not claim |
| --- | --- | --- |
| Stop new sponsored model work | Hold or reject new eligible sponsored dispatch | Reverse spend already incurred |
| Pause a named route | Prevent unsafe future work for that route, task or cohort | Cancel every in-flight task with certainty |
| Disable a defective feature | Gate new use of a bounded capability | Undo prior published consequences |
| Halt rollout | Return compatible future operations to an earlier version | Rewrite old campaign history or rebind every captured task |
| Restrict a risky cohort | Reduce abuse under a separate Trust or Commercial policy | Confiscate paid rights without a defined process |
| Controlled campaign recovery | Resolve proven corruption in a named story | A generic platform rollback |

A narrowly authorized responder should be able to stop **new** runaway funded dispatch without unrestricted financial, privacy or world-editing power. If billing telemetry is missing, exposure is **unknown**, not zero.

Shared campaigns must not receive two incompatible rule engines by random cohort assignment. Do not call a cohort successful because measured failures were excluded or because only returning users were counted.

## Worked negatives

- A prompt change is approved and never activated. Support does not report it as current.
- A mechanical variant would split two participants in one shared world. The rollout is prohibited or brought under one common policy.
- Read-only release access cannot operate a global stop through a deep link.
- An active task still uses a captured older version. The operator can see that instead of assuming the latest deployment rewrote it.
- A live model rollback does not permit a second charge or a redraw of an already accepted action.
- Stopping an experiment does not silently confiscate a previously awarded entitlement.
- An emergency stop does not repair a world, reverse spend, or authorize an export of player data. Repair is a separate controlled campaign recovery; export is its own purpose and authority ([commercial and trust](commercial-and-trust.md)).

Support can explain a player's effective version. It does not activate production. Commercial owns funding economics. LiveOps may stop a dangerous exposure and does not rewrite financial transactions.

No rollout percentage, rollback mechanism, release tool or production kill-switch implementation is decided here.
