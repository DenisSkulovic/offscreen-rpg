# Rules, admitted actions and storyteller consequences

The implemented mechanical slice uses offer-local private immediate-action plans and the existing storyteller execution/publication lifecycle. It remains an authored, offline slice. General model adjudication, generated action plans, combat, private encounter disclosure and the bounded planning agent are not implemented. Those limits do not change the product requirements in [Game rules](../game-rules.md).

## Content and authority

`@offscreen/game/immediate-actions` defines `immediate-action.v1`: a task-local key, public label and intention, optional risk copy, evidence handles, prerequisite facts and either an automatic outcome or one SRD ability check with success/failure outcomes. It has no duration field, executable expression or tool name. The current fixture package admits up to six plans; that is an implementation bound, not a theory of player agency.

`contracts/campaign.ts` defines the selected D&D ability-check subset, character state, commands and receipts. The six abilities and HP belong to this selected rules subset. Named skill proficiencies come from content. Quantities are optional. Declared string/boolean facts support conditions such as containment, exposure and capability without turning them into resource counters. Effects can change an existing quantity or set an existing fact; they cannot invent a balance or introduce an undeclared fact. This is a small typed effect vocabulary, not arbitrary world simulation.

Opening admission explicitly selects authored seed content. The task captures its character, private plan content, opening facts and initial public offer before generation, while the provider request receives only the character, opening and public offer. Preview and Start cannot infer a scenario from premise keywords. Exact reuse of the reviewed opening's private plans at Start belongs to the planner-connection phase; current Start reconstructs them from the selected fixture seed.

## Admitted action and time

The player submits an offer identity and path, never replacement mechanics. A public leaf contains only `{ kind: "attempt" }`; its ID is an opaque reference within that offer. `game_offer` stores the private plans under the same offer identity, story and narrative revision. Under the story lock, admission checks command deduplication, current revision, absence of unresolved narration, exact current offer, private-plan fence, prerequisites and active commitments. A fabricated or stale public selection cannot recover a plan or roll.

The immediate plan is translated into the current resolver's captured version-3 receipt plan and resolves at selection time. Automatic actions apply their admitted outcome; checked actions roll once and select the admitted success or failure branch. DCs, branches and effects never enter the public offer. The separate duration-driven activity prototype remains under redesign and is not an input language for new immediate plans.

Each schedule has its own cadence and check identity. Ability checks succeed at or above DC; event occurrence uses a separate d20 at-or-below threshold contract, with captured modifiers. Event occurrence is not character failure. A boundary can run both an action check and a separate environmental check. Due schedules run in authored order; the first interrupt stops further schedules and future progress. Completion effects apply only at completion. An interruption retains already committed progress and offers actions permitted by the resulting facts. Choosing a follow-up supersedes the interrupted commitment; automatic route resumption is not implemented.

The worker settles at most 24 boundaries in a transaction, then schedules remaining work. Each roll stores raw dice, modifiers, captured inputs, result, effects and tick position under `(operationId, segment, checkKey)`. Story locking and the activity cursor fence duplicate workers. Pause/speed changes settle due work using the old rate before applying the new rate. Earned whole ticks and an exact rational remainder survive reanchoring. If more than one batch is due, the first batch commits and the control returns conflict/refresh while catch-up continues; it does not claim to have applied. No model call occurs in a timing transaction or per routine tick.

## Consequence narration

At a completion or interruption, the transaction saves mechanical consequences, a plain outcome passage, the new offer and a `consequence` storyteller task. Its bounded context includes current character/facts, committed receipts, available actions, continuity evidence and the current creative settings. Intermediate routine boundaries publish plain receipts without a narrative task.

The new task uses the existing generation, outbox, scripted/provider execution, budget accounting, output validation, publication and explicit retry facilities. It has a version-3 scene contract: prose plus `available` or `held` opportunities. It cannot return an interval, invent action IDs, change offered commitments or reroll. Zero opportunities means held, never an ended life. The current task copies validated opportunities; it does not yet generate new mechanical plans.

Publication is fenced by story revision and generation identity. It appends a passage with generation provenance and publishes continuity notes. Until publication succeeds, action admission holds. Execution/publication failure leaves the committed outcome visible; context preparation still happens inside mechanical settlement and can roll it back, an unresolved blocker. Once a task is admitted, explicit retry reuses the same task and receipts. It cannot re-enter mechanical resolution. Profile changes apply to subsequently admitted narrative tasks, not to already captured requests.

The offline consequence source repeats the deterministic outcome summary. It deliberately does not pretend to understand arbitrary tags or improvise style. The provider adapter can consume the same task contract, but live calls remain disabled and unverified. No fixed cat message or special profile/tag branch remains in the mechanical executor.

## Opportunity boundary

`@offscreen/game/opportunities` filters captured private plans against authoritative prerequisite facts and returns separate public offer and private-plan collections. Persistence saves the private collection before making the public offer current. Consequence narration may select and relabel a subset, but publication copies the corresponding saved plans into a new immutable offer identity. This is explicit constraint filtering, not a semantic proof of tactical plausibility. The bounded DM planner still needs to produce and validate packages from scene evidence.

The pineapple example begins with immediate persuasion or cover. The microbe example uses no quantities, location, currency or human calendar and offers an immediate sensed response or protective contraction. Both enter through the same preview, private-plan lookup, resolver, receipts, narrator and recovery boundaries. Their mechanics remain authored fixtures until the planning agent is connected.

## Persistence and known limits

The single baseline migration creates the current database directly, including immutable `game_offer` private plans, captured activities, rolls, effects and settings. There are no prototype conversions or compatibility DTOs. Local databases must be reset when the pre-POC schema changes. No migration was applied during this pass.

Snapshot reads use their supplied repeatable-read transaction. Settings history is read-only. Start retry compares the original profile snapshot, not the subsequently edited story profile. Narration retries use existing generation/publication recovery. The new clock arithmetic has a focused source-only test; no application build or integrated playthrough was run. Broad typed rule domains, private rolls, generated opportunities and dynamic continuation of interrupted activities remain open work.
