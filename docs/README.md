# Documentation map

Start with the [one-page overview](../README.md) and [current progress](progress.md). Then choose a question below. This is a routing map, not a reading list: a small change should not require the whole library.

## Choose the level of detail

| Level | Owner | What you should learn before going deeper |
| --- | --- | --- |
| Product in one page | [Root README](../README.md) | Experience, core loop, demonstrated boundary and where to go next |
| Current state | [Progress](progress.md) | What exists, what evidence supports it, largest gaps and next outcome |
| Execution route | [Feature index](features/README.md) → selected PLAN | Current work, exact next slice, acceptance and blockers |
| Product intent | [Vision](vision.md), [concepts](concepts.md), topic below | Why a capability exists and what its nouns mean; intent is not proof of implementation |
| Technical contract | `technical/`, selected below | Authority, state transitions, invariants and intended failure/retry semantics |
| Implemented flow | [Code navigation](engineering/code-navigation.md) → package guide | Input → authoritative operation → output; concrete source entry points and current limits |
| Local detail | Relevant source and tests | Algorithm, transaction ordering, local invariant and executable examples |
| Evidence | [Connected proof](engineering/connected-poc-proof.md), [QA](engineering/qa-journeys.md) | What was actually exercised, on which contract/date, and what it did not establish |

Technical specifications can include unbuilt design. Package guides describe wiring; progress describes coverage. When they disagree, inspect the narrow source/evidence boundary and fix the owning claim rather than averaging their stories. An old run or green fixture is not proof of today's complete product.

## Choose the dimension

| Question | Product / vocabulary | Technical owner | Implementation or evidence route |
| --- | --- | --- | --- |
| How do I create, play and return? | [Player experience](player-experience.md), [creation](story-creation.md) | [Story lifecycle](technical/story-lifecycle.md) | [Application: opening and Start](../packages/application/README.md#opening-and-start), [code map](engineering/code-navigation.md) for web routes |
| Who decides outcomes? | [Game rules](game-rules.md), [gameplay](gameplay.md) | [Rules and activities](technical/rules-and-activities.md) | [Application: selection and consequence](../packages/application/README.md#mechanical-selection-and-consequence) |
| What happens while I'm away? | [Time and autonomy](time-and-autonomy.md) | [Committed time](technical/committed-time.md), [calendars](technical/calendars-and-world-time.md) | [Application: transition boundary](../packages/application/README.md#campaign-transition-boundary), [gold session](technical/playthroughs/harbor-session.md) |
| What shapes the story? | [Storytelling](storytelling.md), [settings](storyteller-settings.md) | [Storyteller runtime](technical/storyteller-runtime.md) | [Storyteller guide](../packages/storyteller/README.md), [tuning procedure](skills/storyteller-tuning/SKILL.md) before changes |
| How does it remember? | [Continuity](continuity-and-consequences.md) | [Canonical files](technical/canonical-files.md), [memory/retrieval](engineering/long-story-memory-and-retrieval.md) | [Documents guide](../packages/documents/README.md), [application context](../packages/application/README.md#active-scene-context) |
| What reaches the model and what does it cost? | [Concepts](concepts.md) distinguishes turns from rounds | [Context/cost](technical/context-and-cost.md), [usage policy](technical/usage-policy.md) | [Storyteller request path](../packages/storyteller/README.md#follow-one-request), [spending rule](../.agents/rules/spending.md) |
| What survives failure or duplicate work? | [Continuity](continuity-and-consequences.md) | [Execution](technical/execution.md), [provider dispatch](technical/provider-dispatch-review.md) | [Application recovery](../packages/application/README.md#execution-failure-and-retry), worker route in [code map](engineering/code-navigation.md) |
| What owns storage, access and presentation? | [Player experience](player-experience.md) | [Data](technical/data.md), [persistence/cache](technical/persistence-and-caching.md), [architecture](technical/architecture.md) | API, web, database and cache entries in [code map](engineering/code-navigation.md) |
| Did it actually work? | [Benchmark stories](playthroughs.md) | [Execution atlas](technical/playthroughs/README.md) | [Live POC proof](engineering/connected-poc-proof.md), [QA journeys](engineering/qa-journeys.md) |
| How do I run or maintain it? | [Current progress](progress.md) | [Development](development.md), [code quality](engineering/code-quality.md) | [Agent rules/commands](../.agents/README.md), [verification policy](../.agents/rules/verification.md) |
| What is still undecided? | [Open questions](questions.md) | Relevant contract's explicit proposed boundary | [Feature index](features/README.md) distinguishes selected work from other obligations |

## Read with a question, stop with an answer

Before opening source, identify the behavior, its authority and the evidence needed. Use headings or `rg -n` to locate a section in a large document; inspect a bounded range rather than concatenating several entire files. Once you can name the entry point, owning operation, output and unresolved issue, follow only that path. Context window size is not a reading target.

Preserve useful discoveries at the nearest owner: a local invariant in a comment, cross-file flow in a package guide, design in a contract, demonstrated coverage in progress/evidence, unfinished execution in a plan. Link instead of copying. The [maintenance rule](../.agents/rules/documentation.md) defines when to update those layers and how to keep a handoff useful after a break.
