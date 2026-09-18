# Rules, activity resolution and constrained options

Planned architecture; current generated continuations still carry `effects: []`. The [product rules](../game-rules.md) are required POC direction. Keep pure mechanics in focused `packages/server/src/rules/` modules initially, public DTOs in contracts, private artifacts in server/AI and records in db. Do not create an agent framework or a package per activity.

## Resolution pipeline

1. Read an owned authoritative snapshot and the selected persisted option, including its typed action contract. Resolve supported rule/activity definitions and validate prerequisites. A hidden prose intention alone cannot authorize an effect.
2. For a new contextual challenge, use a bounded adjudication task only when deterministic definition lookup is insufficient. It proposes a rule reference, allowed skill/DC band, evidence and stakes. Code validates and persists the accepted plan before random draws. Unsupported proposals hold with an explanation; they never become executable expressions.
3. Under the story lock, execute the due supported rule with a server-side random source and persist the roll/result/effects atomically. The uniqueness key is `(activityId, segmentIndex, checkKey)` or the equivalent single-action resolution key. Store rule version, captured inputs, raw dice, modifiers with sources, DC, result, game timestamp and effect receipt. Never persist only a seed and silently depend on future algorithm versions.
4. Narration/option composition receives committed outcomes as mandatory context. It cannot revise them. Save output and publish through the existing fenced generation/publication path. If narration fails, mechanical progress remains recorded exactly once; show a plain deterministic outcome summary and a narration-pending state. Stop at a boundary requiring new player choice or unsupported interpretation.

Ordinary work requires no adjudication call. Resolve all five hourly checks in code as their boundaries become due; use zero calls for intermediate routine summaries and at most one optional narrative report at completion. A mechanically complete activity cannot repeat its wage payment because a narrative task failed. Existing narration-first immediate/arrival contracts need an explicit new durable kind/version for this pipeline; retain decoders for actual saved histories, not a universal compatibility framework.

## Activity records and transactions

Persist an activity with owner/story/character, source option, captured rule and settings revisions, start game time, duration, segment cadence, next segment index, state and boundary/control revision. Store mechanically relevant character data separately from derived continuity notes. POC includes scores, skill proficiencies, HP and integer currency; apply bounded supported currency deltas under the story transaction. Do not invent an XP formula or model-defined SQL/effects.

An hourly activity advances only completed segments. Five hours has five results. For the POC offer whole-hour durations; a pause preserves partial-hour elapsed time, and an interruption grants no partial-hour wage. Travel progress uses completed route segments and retained partial elapsed time, not a universal time-to-distance formula. Route content supplies duration and encounter policy; a spatial engine is not required.

At each due boundary, lock and re-read the activity and clock/control revision. Save the check, currency/progress change, next boundary and outbox notice together. Duplicate workers return the existing receipt. Retry never redraws a committed check. Random samples generated in a transaction that rolls back have no visible outcome; no external narration occurs before commit. Use an injected random source for authored examples and a server cryptographic uniform integer draw for real play; never browser randomness or model output.

Process overdue segments sequentially in bounded batches (initial cap 24 per transaction). Stop immediately at the first encounter/choice/blocked rule, even if twenty later hours would also be due. Never pre-award the remainder. Instant mode uses the same loop with immediate eligible boundaries and outbox continuation; it does not recurse unboundedly or issue one model call per simulated hour. POC caps a selected activity at 24 game hours; indefinite routines are later work.

Encounter checks use captured content-defined thresholds and tables, with typed modifiers from region, terrain and character/rule tags. They do not use a universal skill-success DC as a proxy for danger. A quiet result advances travel; a trigger holds at that segment and creates a bounded encounter proposal. If generation is unavailable, show that travel is held awaiting the encounter, with no invented arrival. Serious risk beyond campaign permissions is not admitted in the first place.

## Option composition

Build an opportunity snapshot from known location, time available, threats, character capabilities, reachable targets, supported activities and commitments. Include evidence for constraints and distinguish authoritative facts from DM interpretation. A bounded composer proposes plausible directions/actions; deterministic validation enforces resource availability, reachable targets, supported action types and timing. Do not claim code can prove prose-level tactical plausibility.

Use 1–6 actions per menu as an initial presentation bound, not an agency quota. Broad situations can include server-persisted category menus; navigation neither consumes game time nor rolls dice. Generate/save their finite tree together for the POC (at most 3 levels and 24 nodes); no unlimited `more options` regeneration. Leaf options carry an action definition, typed parameters, known commitment/risk and captured mechanical terms. Submit only server-issued identities; validate the whole current menu path and revision. The player cannot supply a replacement intention or effect.

No feasible choice produces an explicit automatic-resolution/held-state result, not an empty `choice` or an automatically ended life. The resolver must still obey absence/risk permissions. One-action menus are legitimate; synonymous filler is not. Retreat or peaceful action is offered when plausible, not universally mandated or arbitrarily suppressed. Preserve mechanically different means, goals and commitments in broad scenes; label expressive-only options honestly.

Option generation after a mechanical result is a bounded task using that result and current opportunities. It can share one narrative/offer call when contexts align; do not require separate planner, critic and judge agents. Structural checks catch malformed offers; authored broad/tight/no-choice examples provide design evidence without paid evaluation.

## Integration boundaries

Extend current storyteller context with mandatory relevant mechanical receipts and compact character state, keeping the bounded-context failure policy. Continuity notes must not duplicate authoritative balances. Extend story reads/history with safe roll/effect summaries and activity progress. Preserve admission ownership, expected revisions, outbox dispatch, publication fences, account stops and saved-result recovery. New activity timers must not simultaneously use the old prepared-arrival executor for the same outcome.

Public time/roll projections never authorize effects. Secret encounters stay private until disclosure is appropriate. Provider cost is independent of dice outcomes, and a paid narration retry reuses the same committed results. No live calls are authorized by this design.
