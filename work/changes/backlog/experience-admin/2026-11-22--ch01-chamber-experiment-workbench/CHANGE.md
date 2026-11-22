# CH01 | Chamber Scenario × Recipe × Experiment workbench

**State: PROPOSED / PLANNER-BLOCKED.** Owner's envisioned neglected developer laboratory, captured in [2026-11-22 minutes](../../../../sessions/2026-11-22.md#7-chamber-as-controlled-scenarioconfigurationeval-laboratory). No code edit or paid run commissioned.

## Owner vision

Chamber is a *testing ground*, not merely developer endpoints. Construct a hypothetical scene-20 campaign with a plausible past, canonical world/Library, inventory and relationships, then choose a configuration/model/task and **run an isolated experiment**. Inspect the assembled prompt, actual Tool/Workdesk behavior, final Storyteller result, resulting game state and detailed cost/quality report. The user wants to rapidly compare different configurations without manually playing through 20 scenes.

A scene-20 scenario must **not** mean fabricating inconsistent committed-history rows or bypassing root, source/fork ownership, checkpoints and clock invariants. Reuse existing generation/setup/import/fork test-fixture authorities, with clear labels for scripted/synthetic versus historical real snapshots.

## Three durable nouns

- **Scenario:** immutable identifier/version, reproducible setup seed, source canon roots/history/scene checkpoint, player identity, permitted fictional state, expected continuations and fixture provenance (synthetic/disposable or copied-with-permission).
- **Recipe:** reference to a frozen effective policy, allowed model/price/transport/tool budget/context/prompt/profile parameters, *not* permission to spend.
- **Experiment:** one immutable execution or offline re-score with its source SHA, scenario+recipe hashes, actual budget preflight, mission/attempt IDs, exact trace and outcome refs, human annotations, cost/uncertainty and artifact privacy. Allow rerender/re-score of saved responses at $0.

## Reuse and topology

`@offscreen/lab-support` already exposes Chamber, LiveWorkbench/QA journeys and memory/creative/retrieval evals. MA12 is extracting outer `@offscreen/api-lab`; CH01 must stay on **outer Lab** side rather than reintroduce Lab dependencies to production API. AI02 transcript and AI03 Admin inspector can share a read-only **projection/format**, but Chamber's scenario mutators are not Admin customer-data access. Terminal CL01 can become an optional experiment driver but doesn't create a second Game Authority.

The fixture may exercise actual same application/GA/outbox/Temporal code on disposable SQL/kind; lightweight fake-transport runs are the default. No paid OpenRouter call unless EV01 zero-cost preflight passes **and the user explicitly authorizes that exact call**. The experiment running service, Chamber UI and eventual Admin recipe editor must be separate authorization domains.

## Provisional user workflow

1. Choose or synthesize a *disposable* scenario; show the scene checkpoint and canon/Library source pins.
2. Choose existing published recipe or craft a **draft hypothetical recipe** with typed bounded overrides; preview what effective resolver allows and which limits bind.
3. Compile request **without dispatch**; show size, section inclusion/omission, output/tool contracts and worst-case financial reservation.
4. Run deterministic/saved-response test for $0; optional explicitly authorized one-call provider test only after all checks.
5. Inspect structured transcript, scene/result changes, roots/operation receipt, rubric and actual cost; save a named human annotation and compare a later run on identical pinned inputs.
6. Reset/retire disposable fixture without changing real player state, account funds or production configuration.

## Planner blockers and acceptance

- Inspect actual Chamber constructor/service, source fixture seeding, MA12 move and current disposable test DB separation before proposing exact routes or tables. Do not create new CH01 npm package without demonstrated need.
- Decide scenario provenance/clone mechanism and how the original player/campaign cannot be mutated; owner authorization for copying real customer scenarios.
- Ensure one deterministic seeded scene-20 fixture and correct root/fork replay; same scenario+recipe produces matching compiled request SHA when compiler version retained; no claim model output is deterministic.
- Integration with EV01 experiment ledger and CFG01 policy resolver must be source-confirmed. Old Chamber routes preserved.
- No live release, new account billing, unbounded scenario seeding, unrestricted privileged staff mode or provider spend. **PROPOSED only.**
