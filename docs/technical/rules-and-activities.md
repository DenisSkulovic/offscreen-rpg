# Rules, admitted actions and storyteller consequences

The implemented mechanical slice now uses a shared action resolver and the existing storyteller execution/publication lifecycle. It remains an authored, offline slice. General model adjudication, generated action definitions, combat, private encounter disclosure and a complete opportunity planner are not implemented. Those limits do not change the product requirements in [Game rules](../game-rules.md).

## Content and authority

`contracts/action-content.ts` defines captured content: named actions, labels, descriptions, prerequisite facts, duration in game milliseconds, independent scheduled checks, supported outcomes and completion effects. Content is data, with no executable expressions or tool names. The current finite content package admits up to six actions and eight check schedules per action; these are implementation bounds, not a theory of player agency.

`contracts/campaign.ts` defines the selected D&D ability-check subset, character state, commands and receipts. The six abilities and HP belong to this selected rules subset. Named skill proficiencies come from content. Quantities are optional. Declared string/boolean facts support conditions such as containment, exposure and capability without turning them into resource counters. Effects can change an existing quantity or set an existing fact; they cannot invent a balance or introduce an undeclared fact. This is a small typed effect vocabulary, not arbitrary world simulation.

Opening admission explicitly selects authored content. The task captures its full character, content, opening facts and initial offer before generation. Preview and Start use that capture; Start cannot swap in a different game or infer a scenario from premise keywords. The mechanical examples have authored premises; a free-form draft is not converted into mechanical content. Normal narrative rehearsal remains available separately.

## Admitted action and time

The player submits an offer identity and path, never replacement mechanics. Under the story lock, admission checks command deduplication, current revision, absence of unresolved narration, the saved offer, action prerequisites and active commitments. It captures the action definition, settings revision and start game time in a version-2 activity plan.

All actions use that plan. Duration zero resolves immediately. Positive durations use the selected game/real rate, including short activities; there is no special instant movement or payment path. `resolvedThroughMs` records completed mechanical boundaries separately from earned partial elapsed time. `completed` counts committed boundaries, not hours. The plan supports up to one year of fictional duration; individual schedules determine meaningful boundaries.

Each schedule has its own cadence and check identity. Ability checks succeed at or above DC; event occurrence uses a separate d20 at-or-below threshold contract, with captured modifiers. Event occurrence is not character failure. A boundary can run both an action check and a separate environmental check. Due schedules run in authored order; the first interrupt stops further schedules and future progress. Completion effects apply only at completion. An interruption retains already committed progress and offers actions permitted by the resulting facts. Choosing a follow-up supersedes the interrupted commitment; automatic route resumption is not implemented.

The worker settles at most 24 boundaries in a transaction, then schedules remaining work. Each roll stores raw dice, modifiers, captured inputs, result, effects and game time under `(operationId, segment, checkKey)`. Story locking and the activity cursor fence duplicate workers. Pause/speed changes settle due work using the old rate before applying the new rate. No model call occurs in a timing transaction or per routine tick.

## Consequence narration

At a completion or interruption, the transaction saves mechanical consequences, a plain outcome passage, the new offer and a `consequence` storyteller task. Its bounded context includes current character/facts, committed receipts, available actions, continuity evidence and the current creative settings. Intermediate routine boundaries publish plain receipts without a narrative task.

The new task uses the existing generation, outbox, scripted/provider execution, budget accounting, output validation, publication and explicit retry facilities. It has a version-3 scene contract: prose plus `available` or `held` opportunities. It cannot return an interval, invent action IDs, change offered commitments or reroll. Zero opportunities means held, never an ended life. The current task copies validated opportunities; it does not yet generate new mechanical plans.

Publication is fenced by story revision and generation identity. It appends a passage with generation provenance and publishes continuity notes. Until publication succeeds, action admission holds. A narration failure leaves the already committed outcome visible; explicit retry reuses the same task and receipts. It cannot re-enter mechanical resolution. Profile changes apply to subsequently admitted narrative tasks, not to already captured requests.

The offline consequence source repeats the deterministic outcome summary. It deliberately does not pretend to understand arbitrary tags or improvise style. The provider adapter can consume the same task contract, but live calls remain disabled and unverified. No fixed cat message or special profile/tag branch remains in the mechanical executor.

## Opportunity boundary

`rules/opportunities.ts` filters captured actions against authoritative prerequisite facts. A threat, capability, possession or containment constraint can be declared as a fact by content. The admission path rechecks it. This is explicit constraint filtering, not a semantic proof of tactical plausibility. A richer DM opportunity/adjudication task still needs to produce validated content from bounded scene evidence before arbitrary generated play can use this resolver.

The pineapple example begins with immediate persuasion or cover. A successful persuasion changes a fact and unlocks a timed quiet interval. The microbe example uses no quantities and no location; a ten-second response changes exposure on a successful check, while separate five-second environmental event checks can interrupt it and expose a follow-up wait. Both enter through the same preview, action, worker, receipts, narrator and recovery boundaries. A pilot diversion can use an interruption outcome that sets a declared route-condition fact; an apple-bound wizard can require `contained=false` for outside actions. Those last two are contract traces, not playable scenarios delivered in this pass.

## Persistence and known limits

Migration 0017 adds nullable captured content without rewriting existing records or migrations 0015/0016. Earlier scenario-coupled mechanical stories remain inspectable with an explicit unavailable message; their commands and workers do not reinterpret old plans under new rules. No migration was applied during the repair. Narrative-only saved stories retain their previous path.

Snapshot reads use their supplied repeatable-read transaction. Settings history is now read-only. Narration retries use existing generation/publication recovery. Broad typed rule domains, secret rolls, a generative opportunity composer and dynamic continuation of interrupted activities remain open feature work. No runtime checks were run for this repair.

