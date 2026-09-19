# Offline playable POC acceptance

The immediate milestone is a solo story with reviewed opening, meaningful offered intentions, authoritative D&D-style resolution and fresh opportunities over three rounds. The same application path must support the pineapple and a contrasting microbe scenario. This is an implementation and manual investigation sequence, not permission to spend or a requirement to finish every planned subsystem.

## What exists and what is missing

Account/draft/start/history, captured one-shot Storyteller tasks, continuity notes, scripted generation, mechanical receipts, clock controls and manual QA evidence storage exist. Mechanical opening review and the offline consequence DM turn now propose and admit fresh private plans through the same deterministic boundary. Consecutive browser rounds, retrieval tools and live-model quality remain unverified. Narrative continuation can produce prose/choices without adjudicating them; that rehearsal path is not proof of the mechanical game.

The next dependency order is:

1. Tighten and inspect existing task contexts, schemas and offline evidence. Resolve local launch blockers before browser rehearsals.
2. Implement offer-local private immediate plans and deterministic admission/resolution, including permitted fact changes. Isolate committed consequences from subsequent context/preparation failure. These are prerequisites for generated gameplay, not optional polish.
3. Implement one bounded DM-turn task that returns consequence narration and fresh private plans together. Exercise scripted outputs through the actual task, validation and publication path rather than a substitute engine that bypasses admission. Defer a tool-using runner until measured context or repair failures justify it.
4. Connect reviewed opening, three selection/resolution/planning rounds and held/recovery states to the browser. Use saved rolls and effects in narration.
5. Perform the manual matrix below, retain failures and fix the failures that block this loop. Only then propose a separately authorized tiny real-model experiment.

The implemented authority contract lives in [game rules](../game-rules.md) and the [Storyteller runtime](../technical/storyteller-runtime.md). [Agency and taste](../features/2026-09-19--00-26--storyteller-agency-and-taste/PLAN.md) owns the remaining human quality review. [Trace explorer](../features/2026-09-18--17-27--storyteller-trace-explorer/PLAN.md) supplies evidence for that runner; it must not create another executor. Rich comparison UI can follow a working inspectable loop. Activity progress, general combat, full tag customization and population simulation must not delay immediate play. Their known limitations remain explicit.

## Responsibility and context contract

The Storyteller is a profile, not an execution topology. A deterministic application decision selects the task. Do not add an LLM router or multiple agents simply to increase agent count.

| Responsibility | Execution | Required information | Excluded authority |
| --- | --- | --- | --- |
| Admission and resolution | Pure rules coordinated in a transaction | Captured plan, current state, selected intention, fences, server dice | Model-authored rolls, client-authored effects |
| Immediate opportunity planning (missing) | Bounded structured DM turn | Current scene, relevant committed facts/character, constraints, recent outcome, profile/settings guidance, relevant rule catalogue | Mutating tools, speculative future facts, unrelated history |
| Consequence DM turn | Focused generation plus deterministic plan admission | Saved receipts, current scene and state, relevant continuity and supported action contract | Rerolls, retroactive success or direct state mutation |
| Opening | Focused generation plus mechanical planning before review | Premise, starting state, selected profile/settings | A previous story's evidence or actions |
| Continuity | Validated note patches published with their passage | Existing notes and bounded cited evidence | Treating summaries or dialogue as rules or state |
| Scheduling, progress and recovery | Deterministic application/workflow logic | Committed clock/process/operation records | A model call per tick or a retry that repeats effects |

The first POC supplies known mandatory state and bounded evidence directly. Validate the final DM turn independently and permit at most one captured repair after structured rejection. A later planning-tool extension may inspect only the current story's committed evidence and selected rules and validate proposals without applying them; it must preserve the same authority snapshot and bounds.

Every captured task now carries a versioned, immutable one-shot resource recipe: one model round, no reads, no tools and no automatic escalation. Its envelope separately names serialized-request bytes, input/output/reasoning tokens, deadline and maximum cost. The current offline context budget is 48 KiB including conservative framing overhead, messages and schema. Scoped stories retain their complete admitted active range; unscoped stories retain the current passage, note sources and up to six optional recent passages. This is a byte ceiling, not evidence of useful or sufficient memory. Inspect what is omitted and why. Current prose appears once under `current`; its handle remains usable for provenance without repeating its body in `evidence`. Relevant older facts without notes or active scope cannot currently be recovered by a tool. Notes can also be semantically wrong despite valid citations.

The first deterministic proposal diagnostics are implemented for existing declared character state and captured evidence. They reject ungrounded situational modifiers, abilities unavailable to the current form and skills outside its declared catalogue. Creation of new scoped facts and capability-changing transformations remain open contracts; a structurally valid package is not yet a publishable generated plan.

## Manual matrix

Use the existing [QA workspace](qa-journeys.md) for available cases. For cases still marked planned, record observations in a local evidence file until their driver exists; do not mark them passed or build an automation fleet to accommodate the checklist. Each observation records revision, scenario/profile, action, expected result, actual result and artifact identifiers. No real credentials or private prose in committed evidence.

| Area | Actions to perform | Evidence and expected invariant |
| --- | --- | --- |
| Entry | Sign in; save/reload draft; list profiles; change profile before reviewing opening | Owner-scoped draft; stale candidate cannot Start; no provider dispatch |
| Start | Review; Start twice with same identity; reload owned story; try another owner's ID | One story, exact reviewed opening/settings, unauthorized reads rejected |
| Context | Inspect opening, continuation and consequence requests | Only appropriate result schema/task guidance; immutable resource recipe is one-shot/tool-free/non-escalating; no credentials/database source IDs in messages; committed receipts match saved state |
| Context pressure | Supply long recent history; retain an old promise's source; exceed mandatory budget; inject inconsistent current/future evidence | Whole optional passages omitted; required evidence retained; complete serialized request plus framing fits its captured byte ceiling; overflow/contradictions fail before dispatch |
| Continuity | Create/update/retire a reminder; cite missing or future evidence; revisit old clue | Publication and notes atomic; unsupported citations rejected; operator checks meaning separately |
| Agency | Broad calm scene; constrained scene; zero viable actions; single viable action | Distinct executable intentions when available; honest held/one-choice state when constrained; no arbitrary two-choice minimum in mechanical planning |
| Mechanics | Resolve success/failure with controlled dice; attempt invalid effect, invented rule or stale plan | Server-derived modifiers/effects; invalid proposals rejected; one receipt; no hidden DC/private branch in public projection |
| Repetition | Double-select; reload during resolution; deliver work twice | One committed attempt, same roll/effects, no duplicate publication |
| DM-turn repair (missing) | Invalid proposal; valid repair; invalid repair; stale publication | Saved rejection diagnostics, one bounded repair, terminal failure/held state with no unauthorized mutation |
| Recovery | Fail after saved model result, after roll commit, before publication; interrupt a repair attempt | Saved progress reused; no reroll; no repeated paid dispatch; failed presentation cannot undo the action |
| Time | Pause/resume/reload; change pace; return after elapsed time | Authoritative tick state; no inference while merely waiting; prepared arrival not current before completion |
| Settings | Switch profile mid-story; inspect next task and an earlier artifact; try locked edits | New settings affect newly admitted work; prior captures/receipts unchanged; lock enforced |
| World independence | Repeat immediate loop for pineapple and microbe; inspect state/proposals | Shared mechanics; no required coins, job, human calendar, walking or scenario-name branch |
| Provider protocol | Inject fake HTTP results, invalid JSON, refusal, timeout, missing usage, duplicate delivery | One attempt audit row identifies account/run/owner/story-or-draft/task/profile/route and lifecycle timing; estimate, reservation, provider charge and calculable charge stay distinct; token/cache/reasoning absence remains unknown; settled/uncertain distinction; no automatic retry; no network |
| Evidence | Explain one success and one rejection from saved artifacts; export completed QA run | Link request → model/tool result → admission → receipt → publication; missing links remain explicit gaps |

Run small independent cases before a three-round playthrough so an early UI failure does not hide all lower-layer results. Simulated dice/model outputs are declared inputs, not fabricated observations. Cover both valid and adversarial outputs; success-only transcripts test orchestration poorly.

## What offline evidence cannot establish

Scripted playthroughs can establish wiring, state ownership, dice application, fences, context assembly, retries and trace reconstruction. They cannot establish model reasoning, prompt-injection resistance, satisfying agency, appropriate difficulty, continuity interpretation or real provider billing. Simulated transport verifies our accounting decisions, not the provider's actual charges.

The eventual live gate is a small explicit hypothesis and capped allowance after these structural cases are inspectable. It is not a claim that the architecture is perfect. No live evaluation is authorized by this document.
