# Storyteller Agent program | SA01–SA12, end-state first, measured convergence

**Status (reconciled 2026-11-15):** **SA01–SA12 Done** for code scope (SA07 conditional; SA12 dry-run — paid live needs explicit $). **Gameplay-quality proof still open.** Parent [Storyteller renewal](./README.md). Further work only via [changes queue](../../../work/changes/README.md). Historical: [first-wave handoff](../../../../../../evidence/inspections/doc01-retained-observations/programs/storyteller/handoff/cursor-first-wave-2026-11-14.md).

## Destination, not a current-code excuse

A new game should compile a task-specific, source-grounded Storyteller request and eligible recipe after a verified event. A complex old-memory/relation/ambiguity may trigger a few scoped read operations; ordinary dialogue usually doesn't. The model should produce grounded, profile-faithful consequences and useful novel choices, while the rules engine decides all actual time/roll/effect. A 2,000-scene game should not require reading 2,000 passages on every turn, and thousands of quiet users should not create hidden inference demand. Full context, tools, cost, publication and failure must be inspectable without reading an unbounded private transcript.

This is a **substantial product and agent-system redesign** if evidence demands it. We will retain proven durable SQL/outbox/CAS/budget semantics as anchors, but may replace prompt/selector/retrieval structures that cannot serve the selected destination. We will **not** preserve one-shot as sole output merely because its current implementation is green.

## Changes sorted by proof, not file structure

| Priority / phase | Code-bearing packet | Independently measurable implemented result | Dependency/readiness |
| --- | --- | --- | --- |
| **A1 diagnostic** | [SA01 Storyteller trace receipt](../../../work/changes/archive/2026-11/storyteller/2026-11-14--sa01-operation-trace/CHANGE.md) **Done** | One redacted task→source→packet→round→publication→money timeline, no fake metrics or private text log | First; extend existing packet-lab and provider ledger |
| **A2 player-quality foundation** | [SA02 prompt/profile/option contract](../../../work/changes/archive/2026-11/storyteller/2026-11-14--sa02-prompt-constitution/CHANGE.md) **Done** | Task-specific common rules honor captured risk and quietness, remove universal option-count/death instructions, keep old tasks readable | SA01 strongly preferred; no GM risk mechanics |
| **A3 correctness/economy** | [SA03 context pre-selection + active reads](../../../work/changes/archive/2026-11/storyteller/2026-11-14--sa03-context-efficiency/CHANGE.md) **Done** | Current task context only queries active relevant work and loads optional docs after metadata selection; final required sources preserved | Coordinated with ENG03 capture owners |
| **A4 scalable memory** | [SA04 root-index reuse](../../../work/changes/archive/2026-11/storyteller/2026-11-14--sa04-root-index-reuse/CHANGE.md) **Done** | Root-keyed lexical index reused/rebuilt safely with measured 200/2k scenes and fork isolation | Existing indexed oracle; no new vector store |
| **B1 evidence truth** | [SA05 final request evidence manifest](../../../work/changes/archive/2026-11/storyteller/2026-11-14--sa05-evidence-lineage/CHANGE.md) **Done** | One source's stored→selected→read→final-used→published trace, no merely “loaded somewhere” claim | SA01 + context components |
| **B2 adaptable work** | [SA06 task-need / effective recipe](../../../work/changes/archive/2026-11/storyteller/2026-11-14--sa06-adaptive-recipe/CHANGE.md) **Done** | Cheap deterministic selector chooses normal vs allowed evidence-seeking task; one-shot stays default for simple turns | SA05 |
| **B3 investigation upgrade** | [SA07 source-aware read operations](../../../work/changes/open/2026-11-14--sa07-evidence-tools/CHANGE.md) **Done (conditional)** | Small typed entity/claim/rule lookup seam for demonstrated missing evidence | Conditional slice landed; not unbounded tools |
| **C1 model economics** | [SA08 route/caching/reasoning manifest](../../../work/changes/archive/2026-11/storyteller/2026-11-14--sa08-model-route-capabilities/CHANGE.md) **Done** | Explicit route behavior and cache/reasoning telemetry | Provider-free first; live adapter proof separate |
| **C2 world memory** | [SA09 descriptive-memory stewardship](../../../work/changes/archive/2026-11/storyteller/2026-11-14--sa09-continuity-materialization/CHANGE.md) **Done** | Significant new person/favor/relationship creates source-linked record | No new entity mechanics |
| **C3 durable operational truth** | [SA10 loop failure and time fidelity](../../../work/changes/archive/2026-11/storyteller/2026-11-14--sa10-loop-failure-lifecycle/CHANGE.md) **Done** | Round-limit/failed/uncertain/stale/slow preserves one legal state | Known deferred: `budget.settle` continue defect (QA-SF01) |
| **D1 evaluator** | [SA11 longitudinal provider-free corpus](../../../work/changes/archive/2026-11/storyteller/2026-11-14--sa11-playability-harness/CHANGE.md) **Done** | Replayable provider-free corpus harness | Human creative quality still unproved |
| **D2 human proof** | [SA12 bounded connected comparison tooling](../../../work/changes/archive/2026-11/storyteller/2026-11-14--sa12-controlled-live-evaluation/CHANGE.md) **Done (dry-run)** | Comparative runner tooling | **Paid live runs** need explicit spend auth |

**Dependencies are not a mandate to code all twelve in order.** SA01 and SA02 are the best first pair. SA03 and SA04 improve real I/O if measured; SA05 prevents silent memory claims; SA06 is the first *true adaptive agent policy* slice. SA07 is optional only after evidence. SA08 can proceed after the trace baseline. SA09 and SA11 directly target a playable living memory. SA10 closes actual negative edges. SA12 is meaningful only once the cheap/evidence baseline is stable.

### The three execution waves

**Wave I: Know and correct.** SA01 trace, SA02 common task/profile prompt, SA03/SA04 context and indexing, SA05 final evidence lineage. Success is a truthful reproducible system whose defects are diagnosable and whose normal one-shot/optional loop work efficiently.

**Wave II: Choose effort and maintain life.** SA06 need-aware recipe, SA07 conditional read tool, SA08 route/cache capabilities, SA09 significant descriptive memory, SA10 recovery. Success is a bounded Storyteller who knows when to investigate and can use old evidence economically without inventing world mechanics.

**Wave III: Prove people want to play.** SA11 deterministic diverse long sequences, then SA12 narrow owner-approved live comparison and actual connected campaign. Success is not “all code tests pass”; it is continuity, profile-faithfulness and player desire to continue under measured spending.

### Rework threshold

If SA01/SA11 show a fundamental mismatch between the task's JSON action-plan shape and desirable player interaction, file a **new product/game-rule decision** instead of hiding it in a prompt rewrite. The Storyteller may be excellent at narrating but constrained by present mechanical affordances; GM01/02/03/04 own real player action/routine/option changes. Similarly, if output is beautifully atmospheric but action authority is wrong, refuse publication rather than “accept for UX.”

If existing memo/context code cannot select appropriate sources without repeated full-body loading, replacing that subsystem is valid within a distinct source-migration Change, not banned because the POC shipped it.

## Source owner / integration conflict map

| Owner | Existing work that must not be unintentionally reopened | SA domain |
| --- | --- | --- |
| `application/storyteller/context.ts`, `canonical-knowledge.ts` | **ENG03-M Done; full ENG03 capture conditional**. Source I/O may run under story lock; avoid parallel conflicting transaction edits | SA03/05 metadata/selection and trace with explicit coordination |
| `application/storyteller/execution.ts`, `memory-exploration-controller.ts` | Existing 2–3 round, strict shared budget, durable attempt/replay | SA01/06/10 instrumentation and selectable read recipe; preserve old generation |
| `application/storyteller/lexical-story-index.ts` | Current manifest-root rebuilding and current-root checks | SA04 read index cache/rebuild |
| `storyteller/tasks/index.ts` and `result-validation.ts` | Prompt v17 (+ v10–v16 replay) and plan validation | SA02 Done; SA09 descriptive source patches |
| `storyteller/providers/openrouter.ts` and `application/storyteller/budget.ts` | Captured model route, per-attempt/funding/window ledger, uncertain semantics | SA08 capability, cold/cache cost audit, avoid reimplementing money |
| `application/stories/start.ts`, `campaign/actions.ts`, `campaign/action-executions.ts` | ENG01/09, GM05, PW01 source and mechanic correctness | Mostly inspect only. Do not alter mechanics through SA packets |
| `docs/engineering/connected-poc-proof.md`, `long-story-memory-and-retrieval.md` | Historical evidence, current benchmark baseline | SA11/12 evidence outputs without rewriting historical metrics |

SA packets must identify actual source owners and small tests on current HEAD before execution. If another Cursor thread is modifying one module (e.g. ENG03), synchronize rather than overwrite their work.

## Evidence and implementation permissions

**Every Change must prove a positive + discriminating negative and return an actual report.** A source-only Markdown design is not a completed code-bearing Change. One owner selects a single packet by `work/changes/README.md`, marks it Ready after explicit authorization and reinspection, implements and records proof; no implied authorizations for next packet or paid runs.

Verification lanes:
- **V0** static source + pure schema/retrieval and prompt packet inspection, no provider/DB spend.
- **V1** provider-free local determinism and fixed scripted/model mocks; no external LLM.
- **V2** authorized disposable PostgreSQL + local CAS/worker with careful identity/operation replay; never reset a meaningful existing local database to get test evidence.
- **V3** user-authorized real provider route and **hard cash cap** with failure-stop. Raw outputs privately retained with strict access controls; no live model test just because SA12 Change exists.
- **V4** human browser/play quality, 10–15-turn and later-life continuity; not measurable by green CI alone.

**No automatic generic subagent framework, one LLM per NPC, provider-native compaction, silent model fallback, vector DB installation, new actor model or commercial tier.** These require separate measured decisions and correct game authority, not the SA queue.

## User-facing consequences of each wave

- After Wave I, your owner debugging shows what was frozen, loaded, discarded, sent, accepted and costed, rather than mysterious prompts.
- After Wave II, a trivial exchange can remain cheap but a genuine older-memory dilemma can use justified read-only investigation. Creative settings remain expressive and resources truly intersect account/tier/route/task.
- After Wave III, you can open a real story, play and **judge a character's evolving life**, including whether it is worth continuing, without assuming that developer machinery equals game quality.

**Post-SA note:** packets are Done; next Storyteller value is measured playability / QA-SF01 remainders / owner-authorized live evaluation — not re-running SA01–SA12.
