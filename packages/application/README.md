# Application operations

This package owns use cases, transactions and coordination. The API and Activity worker compose its public exports from [package.json](package.json). Pure rules belong in `@offscreen/game`; task preparation and output validation belong in `@offscreen/storyteller`. Start with one flow below rather than reading every module.

## Opening and Start

1. [Scripted openings facade](src/generations/scripted-openings.ts) dispatches profiled drafts to [Storyteller openings](src/storyteller/openings.ts); the separate unprofiled rehearsal has its own generation kind.
2. Profiled admission checks ownership, draft revision and request identity, captures content/context, then calls [records](src/storyteller/records.ts). That saves the generation, publication record and outbox notice in the caller's transaction.
3. [Runtime](src/storyteller/runtime.ts) executes the saved task, then attempts publication. Opening success produces a reviewable candidate; it does not itself start a story.
4. [Start](src/stories/start.ts) dispatches the profiled candidate to [Storyteller Start](src/storyteller/start.ts), which initializes the story and calls [campaign initialization](src/campaign/settings.ts).

Mechanical opening preparation captures a character/story-fact seed, and the Storyteller result owns the proposed private plans. Review projects only their public labels; Start persists those exact reviewed plans instead of reopening the catalogue or recomposing authored actions. Content loading and summaries live in [the mechanical catalogue](src/campaign/fixtures/mechanical-content.ts); the HTTP contract does not enumerate worlds.

## Mechanical selection and consequence

1. [Campaign actions](src/campaign/actions.ts) locks the owned story, handles command replay, checks revision/current offer, loads the offer-local private plan and rechecks prerequisites.
2. The private plan decides the atomic branch. An immediate automatic/check plan saves the `game_action_receipt`, effects, consumed offer, command receipt and outbox follow-up. A contribution-process plan instead saves a zero-progress `game_activity`, captures pace/settings, consumes the offer and schedules the first boundary; it grants no completion effect and creates no immediate receipt. Both branches recheck prerequisites under the story lock.
3. [Consequence admission](src/campaign/narration.ts) later locks that receipt and story, gathers committed context, and saves the Storyteller task in a separate transaction. The receipt covers automatic actions as well as checks; `game_roll` remains the cadence history for genuine elapsed activities.
4. [Publication](src/storyteller/publication.ts) checks the source fence, independently revalidates the Storyteller's fresh private plans against captured state and evidence, then atomically publishes the saved narrative, public offer and private plans.

A consumed offer blocks another mechanical selection before narration exists. Retrying preparation is safe because the receipt records its resulting generation before completion; preparation can fail repeatedly without rerolling or undoing the visible outcome.

An encounter-state activity is suspended, not implicitly abandoned. Immediate responses settle through their normal receipt while the activity retains its identity and progress. A later private `resume` plan must name that activity's captured action and pass its current prerequisites; admission reanchors and reschedules the existing row. Starting a different process is the explicit superseding action currently supported. A standalone abandon intention remains future work.

[Campaign persistence](src/campaign/persistence.ts) owns offer/plan storage; [campaign reads](src/campaign/reads.ts) projects player-visible state. The pure admission diagnostics live in `packages/game/src/immediate-actions.ts`, not in these persistence helpers.

## Execution, failure and retry

[Execution](src/storyteller/execution.ts) owns scripted/provider dispatch and saved results. [Budget](src/storyteller/budget.ts) owns financial reservations and settlement. [Runtime](src/storyteller/runtime.ts) coordinates execution followed by publication; [recovery](src/storyteller/recovery.ts) handles explicit retry. A saved successful generation and an unpublished story are different states. Publication retry must not repeat dice or a successful provider request. Ambiguous provider dispatch must retain uncertainty rather than being blindly retried.

The worker's [dispatch table](../../apps/worker/src/outbox/dispatch.ts) and [Activity bindings](../../apps/worker/src/activities/index.ts) connect outbox topics to these operations. Temporal payloads identify saved work; they are not alternate sources of story state.

## Other entrances and misleading names

- [Stories facade](src/stories/index.ts) exposes lifecycle, reads, campaign operations and timing. [Reads](src/stories/reads.ts) and [persistence](src/stories/persistence.ts) are good starting points for snapshot/revision questions.
- Ordinary story HTTP routes currently receive [createChamber](src/developer-tools/chamber.ts) from [API composition](../../apps/api/src/app.ts). That wrapper delegates to `createStories` and adds response eligibility and fixture handling. Its directory name does not mean every method is guarded by the developer-tools switch. Separating normal composition from the fixture wrapper is a future structural review, not completed work.
- Narrative option resolution enters [stories/resolution](src/stories/resolution.ts), while mechanical selection enters `campaign/actions.ts`. Trace the endpoint before assuming they share one adjudication path.
- Narrative prepared waits in [stories/timing](src/stories/timing.ts) and contribution processes in `campaign/activities.ts` are distinct current paths. A narrative wait reaches a prepared arrival; a contribution process completes only from rule-owned earned progress. Do not collapse either into a generic duration.
- QA cases in [qa-catalog](src/developer-tools/qa-catalog.ts) are instructions/evidence requirements; [qa-journeys](src/developer-tools/qa-journeys.ts) stores manual run records. They are not a fleet of automatic QA agents.

## Contracts and continuation point

Business intent lives in [game rules](../../docs/game-rules.md); implemented authority in [rules and activities](../../docs/technical/rules-and-activities.md) and [Storyteller runtime](../../docs/technical/storyteller-runtime.md). [Progress](../../docs/progress.md) owns remaining gaps and the active feature link. Keep those decisions there; this guide owns how to find their implementation.
