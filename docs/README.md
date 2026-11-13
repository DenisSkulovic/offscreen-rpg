# Documentation map

**For a coding agent given an approved Change:** skip this broad index. Read the **one Change's first-screen brief**, follow its linked [source-adjacent owner map](../apps/web/README.md) and inspect only the named symbols. Deep product/technical docs below are **on demand**. For architecture/review (not cheap implementation), use the [independent target standard](engineering/coding-agent-target-standard.md), [expert knowledge index](engineering/coding-agent-knowledge.md) and [evaluation protocol](engineering/coding-agent-evaluation.md).

**For unscoped questions:** start with the [one-page overview](../README.md), [current priority](../TODO.md) or [progress](progress.md), **not all three**. Consult the [minutes index](minutes/README.md) only when a past decision actually matters. Then choose a question below. For a specific design owner, use [technical contracts](technical/README.md); for source navigation, proof and specialist research, use [engineering knowledge](engineering/README.md). These are **small routes**, not additional authorities. This is a routing map, not a reading list: a small change should not require the whole library.

## Choose the level of detail

| Level | Owner | What you should learn before going deeper |
| --- | --- | --- |
| Product in one page | [Root README](../README.md) | Experience, core loop, demonstrated boundary and where to go next |
| Current state | [Progress](progress.md) | What exists, what evidence supports it, largest gaps and next outcome |
| Discussion continuity | [Session minutes](minutes/README.md) | What the owner actually intended, why an approach was chosen or rejected, what is still unresolved across chats; historical context, not authority |
| Engine understanding | [Engine model](engineering/engine-model.md) | How the pieces cooperate, where the primitives stop, what can fail and which uncertainty the next feature resolves |
| **Engine architecture redesign and handoff** | [Engine destination](engine-architecture/README.md) → [selected implementation program](engine-architecture/implementation-program.md) → [first Cursor wave](engine-architecture/handoff/first-engine-wave.md) | Vision-first engine audit and redesigned rules/authority boundaries. **ENG01 design-ready**, remaining ENG changes Proposed; **no engine code authorization**. UX work remains independently owned |
| Execution route | [Current Change index](changes/README.md) → selected Change, if any; [legacy initiatives](features/README.md) only for historical context | One future code-bearing outcome, its current permission, evidence and blockers; old initiatives are supporting context |
| Product intent | [Vision](vision.md), [concepts](concepts.md), topic below | Why a capability exists and what its nouns mean; intent is not proof of implementation |
| **Proposed player UX destination** | [Experience design](experience/README.md) → [selected Living Stage blueprint](experience/spaces/living-stage-blueprint.md) → [first Cursor wave](experience/handoff/first-cursor-wave.md) | Independently redesigned gameplay UX, source-backed gaps, 12 UX Changes and 7 future mechanics Changes; design-only until owner selects a Change |
| Technical contract | [Technical owner index](technical/README.md), selected below | Authority, state transitions, invariants and intended failure/retry semantics |
| Implemented flow | [Engineering index](engineering/README.md) → [code navigation](engineering/code-navigation.md) → package guide | Input → authoritative operation → output; concrete source entry points and current limits |
| Local detail | Relevant source and tests | Algorithm, transaction ordering, local invariant and executable examples |
| Evidence | [Engineering index](engineering/README.md) → [connected proof](engineering/connected-poc-proof.md) or [QA](engineering/qa-journeys.md) | What was actually exercised, on which contract/date, and what it did not establish |

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
| How do I test rare mechanics without playing a whole campaign? | [Chamber laboratory C01–C16](engineering/targets/chamber-laboratory.md) | [Source audit](engineering/audits/chamber-gap-2026-11-12.md) | [CH01–CH16 program](engineering/chamber-program.md) and [technical protocol](technical/chamber-lab-protocol.md); design only, no active code Change |
| What is the selected React/Next implementation destination? | [Engineering portfolio roadmap](../TODO.md) | [React/Next F1–F15 target](engineering/targets/react-next.md) | [Source gap audit](engineering/audits/react-next-gap-2026-11-12.md) → [W01–W22 Change queue](changes/README.md) and [Cursor execution atlas](engineering/frontend-execution-playbook.md); no active code Change |
| What is still undecided? | [Open questions](questions.md) | Relevant contract's explicit proposed boundary | [Current Change system](changes/README.md) and [dated legacy audit](features/AUDIT-2026-11-11.md) distinguish proposals, initiatives, evaluations and code Changes |

## Read with a question, stop with an answer

Before opening source, identify the behavior, its authority and the evidence needed. Use headings or `rg -n` to locate a section in a large document; inspect a bounded range rather than concatenating several entire files. Once you can name the entry point, owning operation, output and unresolved issue, follow only that path. Context window size is not a reading target.

Preserve useful discoveries at the nearest owner: a local invariant in a comment, cross-file flow in a package guide, design in a contract, demonstrated coverage in progress/evidence, unfinished execution in a plan. Link instead of copying. The [maintenance rule](../.agents/rules/documentation.md) defines when to update those layers and how to keep a handoff useful after a break.
