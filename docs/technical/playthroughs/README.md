# Gameplay execution atlas

Status: design reference, grounded in source at `f77ed42`. These are worked examples, not recorded sessions or proof of implemented behavior. No model was called to write or evaluate them.

The [product playthroughs](../../playthroughs.md) describe the feeling. This atlas follows particular choices all the way through time, rules, state, model requests and recovery. Its purpose is to make “is this the game we mean?” answerable before more subsystems are built.

The center of the game is a **life with persistent consequences**, not a stream of generated paragraphs and not a job scheduler with decorative prose. The player alternates between consequential decisions and delegated, time-distributed intentions. The simulation earns changes; the Storyteller makes situations legible and interesting within that authority. Neither mode must force a transition to the other on every step.

## Read in this order

1. [Execution language](execution-language.md): what a scene, offer, activity, roll and pause actually mean in these traces.
2. [SpongeBob](spongebob.md): a minute-by-minute active session, including a failed check, different options and proposed quiet work. Closest look at what the player actually reads.
3. [Beacon](beacon.md): exact dice, contributions, interruption, B then A, and the chronology defect that must be fixed.
4. [Storyteller requests and cost](storyteller.md): concrete input/output, discovery tools, limits, validation and illustrative token ledgers.
5. [POC selection and acceptance](poc.md): the small connected experience to implement, what would invalidate it, and where the larger examples fit.

Then use the contrasts when designing a change:

| Product benchmark | Technical companion | What it puts under pressure |
| --- | --- | --- |
| Wizard, goblin, apple and companion | [Wizard](wizard.md) | Instant transformation versus prolonged waiting; containment, changing capabilities, another actor changing your situation |
| Vvardenfell continuing life | [Vvardenfell](vvardenfell.md) | Labor, real waiting, interrupted travel, inventory/relationships and recall over days |
| Seyda Neen while the Storyteller is dormant | [Prepared local opportunities](local-opportunities.md) | Fresh player-selected/repeated activities without inference; story-dependent eligibility and wake conditions |
| Seyda Neen → Red Mountain itinerary | [Activity chain](red-mountain.md) | Selected narration, quiet completion, dependent starts, cancellation and late reports |
| Batman asleep, then patrolling | [Batman](batman.md) | Bounded unattended permission, zero-inference routine, event candidacy and unresolved scenes |
| Space cargo journey | [Cargo](cargo.md) | Vehicle/crew/beneficiary are different; costs and movement cannot be undone by cancelling |
| Microbe and abstract consciousness | [Nonhuman worlds](nonhuman.md) | No required wallet, limbs, human clock, geometry or universal skill applicability |

## How to read a claim

- **Current:** directly grounded in the linked implementation. A worked roll is still illustrative, not an observed random result.
- **Target:** specified/proposed behavior not established by the current runtime. Implementation status is owned by [progress](../../progress.md).
- **Fixture:** exact numbers, prose, names, policies and dice chosen to make this example reproducible. Not global defaults or additional requirements.
- **Open:** a product choice that must be resolved before its dependent behavior is implemented. See [questions](../../questions.md).

Step IDs such as `BC-04` are stable acceptance references, not API names or database IDs. New documents should reference a step instead of copying its story. If implementation disagrees, either repair it or explicitly revise the intended experience; do not quietly relabel the mismatch as a successful proof.

Every target chain uses a finite list of accepted intentions, not generated executable code. Every “roll of 12” means a server-recorded fixture draw, not a number the model may choose. Every cost ledger counts only its named branch. Prose samples are authored design examples, not evidence of AI taste.

## Ownership and limits

This atlas owns **worked examples and their observable acceptance**. [Rules and activities](../rules-and-activities.md), [time](../ticks-and-tags.md), [context/cost](../context-and-cost.md) and active feature plans own reusable contracts. When a trace reveals a missing contract, link it to that owner; do not grow a second specification here.

The [activity foundation](../../features/2026-09-18--16-48--activity-processes-and-progress/PLAN.md) and [bounded autonomy](../../features/2026-09-19--00-26--bounded-autonomy-and-reentry/PLAN.md) remain unfinished. Their design checkpoints use this atlas; writing the examples does not complete those features or authorize their entire implementation. Multiplayer, general combat, transformation, traversal and long-life memory remain design probes, not prerequisites for demonstrating the next solo slice.

The atlas deliberately does not settle combat rounds, world geography, notification channels, model selection or commercial pricing. It does make failures visible: free narrated travel, unexplained lost progress, repeated identical choices, silently stalled overnight plans, and invented memories all violate the intended experience even when the JSON is valid.
