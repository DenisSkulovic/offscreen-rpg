# Offline playable POC acceptance

The immediate milestone is a solo story with reviewed opening, meaningful offered intentions, authoritative D&D-style resolution and fresh opportunities over three rounds. The same application path must support the pineapple and a contrasting microbe scenario. This is an implementation and manual investigation sequence, not permission to spend or a requirement to finish every planned subsystem.

## What exists and what is missing

Account/draft/start/history, captured one-shot Storyteller tasks, continuity notes, scripted generation, mechanical receipts, clock controls and manual QA evidence storage exist. The current mechanical narrator selects authored actions. It does not generate private action plans, use tools or demonstrate an open-ended DM. Narrative continuation can produce prose/choices without adjudicating them; that rehearsal path is not proof of the mechanical game.

The next dependency order is:

1. Tighten and inspect existing task contexts, schemas and offline evidence. Resolve local launch blockers before browser rehearsals.
2. Implement offer-local private immediate plans and deterministic admission/resolution, including permitted fact changes. Isolate committed consequences from subsequent context/preparation failure. These are prerequisites for generated gameplay, not optional polish.
3. Implement the bounded planning agent and its durable round/tool evidence together. Exercise it with scripted model messages through the actual runner, not a substitute engine that directly returns the expected final scene.
4. Connect reviewed opening, three selection/resolution/planning rounds and held/recovery states to the browser. Use saved rolls and effects in narration.
5. Perform the manual matrix below, retain failures and fix the failures that block this loop. Only then propose a separately authorized tiny real-model experiment.

The owning implementation plan is [Playable DM loop](../features/2026-09-18--17-21--playable-dm-adjudication-loop/PLAN.md). [Trace explorer](../features/2026-09-18--17-27--storyteller-trace-explorer/PLAN.md) supplies evidence for that runner; it must not create another executor. Rich comparison UI can follow a working inspectable loop. Activity progress, general combat, full tag customization and population simulation must not delay immediate play. Their known limitations remain explicit.

## Responsibility and context contract

The Storyteller is a profile, not an execution topology. A deterministic application decision selects the task. Do not add an LLM router or multiple agents simply to increase agent count.

| Responsibility | Execution | Required information | Excluded authority |
| --- | --- | --- | --- |
| Admission and resolution | Pure rules coordinated in a transaction | Captured plan, current state, selected intention, fences, server dice | Model-authored rolls, client-authored effects |
| Immediate opportunity planning (missing) | Bounded tool-using task | Current scene, relevant committed facts/character, constraints, recent outcome, profile/settings guidance, relevant rule catalogue | Mutating tools, speculative future facts, unrelated history |
| Consequence presentation | Focused generation; current task also selects authored candidates | Saved receipts, current scene, relevant continuity, admitted opportunities | Rerolls, new effects, retroactive success |
| Opening | Focused generation plus mechanical planning before review | Premise, starting state, selected profile/settings | A previous story's evidence or actions |
| Continuity | Validated note patches published with their passage | Existing notes and bounded cited evidence | Treating summaries or dialogue as rules or state |
| Scheduling, progress and recovery | Deterministic application/workflow logic | Committed clock/process/operation records | A model call per tick or a retry that repeats effects |

Planning tools inspect only the current story's committed evidence and selected rules and validate a proposal without applying it. Known mandatory state is supplied directly. Extra historical evidence is retrieved only as needed, with bounds and recorded results. Validate all tool arguments and results; tool descriptions alone do not enforce scope. Save each round before continuing, cap rounds/calls/bytes, and stop on missing evidence, invalid final output or uncertain dispatch. A scripted transcript must use these same boundaries.

The current context budget is 48 KiB including messages and schema, retaining the current passage and all note sources plus up to six optional recent passages. This is a byte ceiling, not evidence of useful or sufficient memory. Inspect what is omitted and why. Current prose appears both as focus and cited evidence; optimize that duplication only with measured benefit. Relevant older facts without notes cannot currently be recovered by a tool. Notes can also be semantically wrong despite valid citations. These are explicit evaluation questions, not reasons to dump the entire history into every request.

## Manual matrix

Use the existing [QA workspace](qa-journeys.md) for available cases. For cases still marked planned, record observations in a local evidence file until their driver exists; do not mark them passed or build an automation fleet to accommodate the checklist. Each observation records revision, scenario/profile, action, expected result, actual result and artifact identifiers. No real credentials or private prose in committed evidence.

| Area | Actions to perform | Evidence and expected invariant |
| --- | --- | --- |
| Entry | Sign in; save/reload draft; list profiles; change profile before reviewing opening | Owner-scoped draft; stale candidate cannot Start; no provider dispatch |
| Start | Review; Start twice with same identity; reload owned story; try another owner's ID | One story, exact reviewed opening/settings, unauthorized reads rejected |
| Context | Inspect opening, continuation and consequence requests | Only appropriate result schema/task guidance; no credentials/database source IDs in messages; committed receipts match saved state |
| Context pressure | Supply long recent history; retain an old promise's source; exceed mandatory budget; inject inconsistent current/future evidence | Whole optional passages omitted; required evidence retained; overflow/contradictions fail before dispatch |
| Continuity | Create/update/retire a reminder; cite missing or future evidence; revisit old clue | Publication and notes atomic; unsupported citations rejected; operator checks meaning separately |
| Agency | Broad calm scene; constrained scene; zero viable actions; single viable action | Distinct executable intentions when available; honest held/one-choice state when constrained; no arbitrary two-choice minimum in mechanical planning |
| Mechanics | Resolve success/failure with controlled dice; attempt invalid effect, invented rule or stale plan | Server-derived modifiers/effects; invalid proposals rejected; one receipt; no hidden DC/private branch in public projection |
| Repetition | Double-select; reload during resolution; deliver work twice | One committed attempt, same roll/effects, no duplicate publication |
| Agent tools (missing) | Valid lookup; wrong-story/future lookup; unknown tool; malformed args; invalid proposal then repair; exhaust rounds | Scoped bounded tool evidence, validation diagnostics, terminal failure/held state with no unauthorized mutation |
| Recovery | Fail after saved model result, after roll commit, before publication; interrupt a tool round | Saved progress reused; no reroll; no repeated paid dispatch; failed presentation cannot undo the action |
| Time | Pause/resume/reload; change pace; return after elapsed time | Authoritative tick state; no inference while merely waiting; prepared arrival not current before completion |
| Settings | Switch profile mid-story; inspect next task and an earlier artifact; try locked edits | New settings affect newly admitted work; prior captures/receipts unchanged; lock enforced |
| World independence | Repeat immediate loop for pineapple and microbe; inspect state/proposals | Shared mechanics; no required coins, job, human calendar, walking or scenario-name branch |
| Provider protocol | Inject fake HTTP results, invalid JSON, refusal, timeout, missing usage, duplicate delivery | Same adapter/accounting contract; settled/uncertain distinction; no automatic retry; no network |
| Evidence | Explain one success and one rejection from saved artifacts; export completed QA run | Link request → model/tool result → admission → receipt → publication; missing links remain explicit gaps |

Run small independent cases before a three-round playthrough so an early UI failure does not hide all lower-layer results. Simulated dice/model outputs are declared inputs, not fabricated observations. Cover both valid and adversarial outputs; success-only transcripts test orchestration poorly.

## What offline evidence cannot establish

Scripted playthroughs can establish wiring, state ownership, dice application, fences, context assembly, retries and trace reconstruction. They cannot establish model reasoning, prompt-injection resistance, satisfying agency, appropriate difficulty, continuity interpretation or real provider billing. Simulated transport verifies our accounting decisions, not the provider's actual charges.

The eventual live gate is a small explicit hypothesis and capped allowance after these structural cases are inspectable. It is not a claim that the architecture is perfect. No live evaluation is authorized by this document.
