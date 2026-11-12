# Chamber | source-grounded gap audit, 2026-11-12

**Status:** Design-to-source comparison, read-only. **Independent destination was written first:** [Chamber laboratory target C01–C16](../targets/chamber-laboratory.md), committed as §dc7d769d§ *before inspecting the detailed Chamber implementation*. **Code baseline:** application source remains from §470a5df069470bf758eb1a560c515846ce781637§; current §main§ at inspection contained later Markdown-only work. **Method:** connected GitHub source/contracts/test/guide inspection; **no commands, database, browser, provider, build or running service exercised**. Source observations are not reproduced runtime bugs.

## Quick route

- [Strengths to preserve](#1-foundations-worth-keeping)
- [What actually runs](#2-actual-current-chamber-flows)
- [C01–C16 matrix](#3-target-to-source-matrix)
- [Ranked evidence-based gaps](#4-ranked-gaps)
- [Superseded work and migration implications](#5-overlap-with-existing-frontend-changes)
- [Proof and unknowns](#6-adversarial-review-and-evidence-limits)

## 1. Foundations worth keeping

**This is not disposable AI rubbish.** Codex produced substantial, correctly scoped tools, especially:

1. **Actual application path for five versioned scripted scenes.** [§chamberFixtures§](../../../packages/application/src/developer-tools/chamber-fixtures.ts) defines §chamber.v1–v5§; [§createChamber§](../../../packages/application/src/developer-tools/chamber.ts) composes §createStoryApplication§ and calls real initialize, append, control/fork/read. Time wait, deadline fallback and item transfer are represented as committed operations rather than client-only illusion. §chamber.v1§ deliberately remains read-only for history. **Source-confirmed.**
2. **Broad developer inspector.** [§createChamberInspector.inspect§](../../../packages/application/src/developer-tools/chamber-inspector.ts) loads owned public snapshot, current/historical passage, resolution generation, canonical root, wait/deadline, activity plan/report hooks, provider held packet and cost attempts. [Inspector UI](../../../apps/web/src/features/developer-tools/chamber/inspector.tsx) displays these. More than a cosmetic debug pane, though difficult to use as a causal experiment.
3. **Versioned QA catalogue and durable human evidence.** [§qaJourneyCatalog§](../../../packages/application/src/developer-tools/qa-catalog.ts) aggregates **15 source-authored cases** across player entry, activity lifecycle, storyteller operations, start packages and calendars. [QA contracts](../../../packages/contracts/src/qa.ts) enforce version, cost class, availability, driver, stage, evidence requirements, human rubric and statuses. [§createQaJourneys§](../../../packages/application/src/developer-tools/qa-journeys.ts) stores owned runs, immutable case snapshot, append-only ordered stage results under revision fencing, finalization and export. **Retain these semantics.**
4. **Real auth/isolation boundary.** [§createApp§](../../../apps/api/src/app.ts) registers §ChamberStoriesController§, §ChamberToolsController§ and §QaJourneysController§ **only if** §developerTools===true§. Ordinary [§main.ts§](../../../apps/api/src/main.ts) does not enable it, while [local launcher](../../../tools/chamber/src/main.ts) opts in with a loopback fixture identity; resource calls remain owner-scoped. Preserve, don't replace with a made-up hosted RBAC requirement.
5. **Safe Storyteller experiments.** [Packet review](../../../tools/chamber/src/packet-review.ts), [memory packet review](../../../tools/chamber/src/memory-packet-review.ts), [live-evaluation preflight](../../../tools/chamber/src/live-evaluation-run.ts) and selected [Chamber Storyteller control](../../../packages/application/src/developer-tools/chamber.ts) support held packets, zero-provider offline runs, explicit controlled release, cost ceilings, hold/fail/release for a pending consequence. A new lab must *integrate* these, not accidentally relax their safety.
6. **Real integration coverage exists.** [stories core](../../../tools/api-integration/test/stories-core.integration.ts), [stories HTTP](../../../tools/api-integration/test/stories-http.integration.ts), [browser](../../../tools/api-integration/test/stories-browser.integration.ts), [storyteller integration](../../../tools/api-integration/test/storyteller.integration.ts), [Chamber metadata test](../../../packages/contracts/test/chamber.test.ts) and [launcher cleanup tests](../../../tools/chamber/test/stop.test.ts) include explicit fixture/reopen/owner/timeout cases. **Committed test source inspected, not run.**

## 2. Actual current Chamber flows

### Scripted scene

§§§text
tools/chamber/src/main.ts (local DB, API/web/worker/browser bootstrap)
  -> apps/web/app/chamber/page.tsx
  -> Chamber(view.tsx) / useChamberPlay
  -> PUT /api/stories/:id/chamber with one of chamber.v1-v5
  -> ChamberStoriesController -> createChamber.start
  -> createStoryApplication.initialize -> owned stored passage
  -> UI reads StorySnapshot / inspector; response/controls are real app calls
§§§

All five §ChamberScenario§ IDs are a **closed enum** under [§startChamberSchema§](../../../packages/contracts/src/stories.ts) and [chamber catalog](../../../packages/contracts/src/chamber.ts). [§chamber-fixtures.ts§](../../../packages/application/src/developer-tools/chamber-fixtures.ts) uses hardcoded narration/options/branch functions; §v3§ wait is 20 real seconds, §v4§ response default 15 real seconds, §v5§ transfers one letter. **No general typed arbitrary partial-progress state materializer or reproducible seed/overlay protocol is present in these inspected owners.**

### QA checklist

§§§text
QaWorkspace -> GET /chamber-tools/qa/cases, GET /runs
  -> chooses case/variant -> PUT /runs/:UUID
  -> createQaJourneys.open stores immutable offline run + case definition
  -> UI shows next stage and operator-entered passed/failed/blocked/skipped
  -> PUT /runs/:id/stages/:stageId stores reference strings and observation
  -> finalize -> export QaRun + rubric JSON
§§§

[§QaWorkspace.start§](../../../apps/web/src/features/developer-tools/chamber/qa-workspace.tsx) **only opens a QA record**; it does not instantiate selected scenario, run a driver, control game time or evaluate mechanical assertions. [§QaWorkspace.record§](../../../apps/web/src/features/developer-tools/chamber/qa-workspace.tsx) sends an operator-selected status. [§createQaJourneys.recordStage§](../../../packages/application/src/developer-tools/qa-journeys.ts) enforces stage ordering/revision and **presence of evidence-reference kinds**, not whether the referenced observation proves the assertion. This is suitable as a human log, but **a manually selected passed status must never masquerade as an automated checked invariant**. Existing case §driver§ metadata is not itself an execution engine.

### Inspector and launcher

[§createChamberInspector.inspect§](../../../packages/application/src/developer-tools/chamber-inspector.ts) first reads a public story snapshot and then issues multiple independent SQL reads for history, active resolution, reports and accounting. No shared repeatable-read transaction around the **entire** inspector output is visible. Concurrent worker commits can therefore produce a *potential* cross-revision diagnostic mix; source shows the possibility, not an observed wrong response. [Inspector JSX](../../../apps/web/src/features/developer-tools/chamber/inspector.tsx) renders dozens of §Field§ entries and raw §<pre>JSON.stringify§ blocks, without a run-centric before/after causal diff.

The [local launcher](../../../tools/chamber/src/main.ts) is **~1,518 lines** and supports many flags (smoke, review, packet, memory comparison, live packet/run, story mode, reset). It has serious safeguards: fixed local DB naming/host, mode arguments, zero/paid policies, boot/shutdown cleanup, locally provisioned identity, bounded release. The length is **not** itself a defect. Its startup and option branching couple many distinct concerns and make a new cheap Bench/Sandbox entry impossible **through the existing Chamber CLI surface** without additional design. The launcher still creates/migrates a local Chamber DB and starts API/worker/browser for interactive mode; §--reset-database§ is explicit, not default.

## 3. Target-to-source matrix

| Target | Observed status at this revision |
| --- | --- |
| **C01 scenario discovery** | **Partial:** five scripted scene IDs and 15 versioned QA cases, some available/planned, but not a unified searchable mechanic/cost/lane explorer |
| **C02 minimal late-stage valid state** | **Missing integrated capability:** fixed initial openings; no typed semantic overlays/checkpoint materializer |
| **C03 seeded deterministic replay** | **Missing as one lab protocol:** fixtures deterministic, but QA run lacks seed/step/fault replay |
| **C04 real production policies** | **Partial strength:** scripted Chamber calls application use cases; authored fixture outcomes still hardcoded |
| **C05 controlled time domains** | **Missing general control:** §v3§ real wait 20s; existing hold/fail controls are narrow Storyteller seams |
| **C06 inspect before/after and why** | **Partial:** strong point-in-time owner inspector, no coordinated before/after/trace/run assertions |
| **C07 fault injection at cut points** | **Partial:** §arm-hold§/§arm-failure§ pending consequence only, plus separate integration test injection; no reusable fault schedule |
| **C08 durable duplicate exactly-once proof** | **Strong existing integration tests**, but no developer-interactive scenario run/replay/assertion surface |
| **C09 isolated reset/fork/compare** | **Partial:** ordinary story fork exists; no isolated immutable lab checkpoint/reset; local DB stories persist between launches |
| **C10 reproducible evidence** | **Partial strength:** QA run snapshots case/git/dirty/environment and exports; lacks actual executable scenario trace, seed, clock/fault config |
| **C11 unified typed CLI/UI/automation** | **Missing:** separate CLI flags, scene controller, manual QA forms and API-script drivers, without one semantic command registry |
| **C12 fast no-stack Bench** | **Existing unit tests elsewhere**, but no Chamber-facing pure lane that can run a specific adjustable mechanic without full launcher |
| **C13 local-only developer gate** | **Already present:** conditional Nest controller registration and loopback launcher; preserve/test |
| **C14 provider-free default** | **Strong existing constraints:** QA run offline, held packet zero-call checks, paid preflight; retain and test no unsafe regression |
| **C15 mechanics coverage** | **Partial:** 15 case definitions + broad integration tests; important activity/failure QA cases explicitly planned; no per-lane automated assertion registry |
| **C16 reproducible failure handoff** | **Missing cross-tool feature:** copyable scenario ID+seed+steps and precise assertion/owned-symbol route |

## 4. Ranked gaps

### P0: the missing laboratory itself

**H01. No typed specimen/semantic teleportation core (C02 C03 C09).** [§chamber-fixtures.ts§](../../../packages/application/src/developer-tools/chamber-fixtures.ts) supports only five authored starts/branch functions. Even a simple partial-shift, boundary-weather, conflicting activity, specific received item or post-failure state requires custom source/test code, manual journey or an existing bespoke API script. **Change outcome:** versioned valid fixture primitives/overlays + isolated checkpoint/run, not arbitrary SQL editor. **Negative:** setup invalidates ownership/plan preconditions.

**H02. Catalogue is a guide, not an experiment executor (C01 C11 C15).** [§qa-catalog/*§](../../../packages/application/src/developer-tools/qa-catalog.ts) defines stages/driver labels; [§qa-journeys.open§](../../../packages/application/src/developer-tools/qa-journeys.ts) saves the case but does not execute it; [§QaWorkspace.record§](../../../apps/web/src/features/developer-tools/chamber/qa-workspace.tsx) accepts a human-selected pass. Keep manual QA but add a typed scenario driver/assertion path. **Negative:** “passed” without checked assertion/evidence cannot be reported as automated success.

**H03. One long journey often remains the only way to hit a rare condition (C04 C12).** There is no first-class Chamber Bench/isolated Sandbox lane; the interactive [launcher](../../../tools/chamber/src/main.ts) boots the connected stack, while isolated tests are elsewhere and mostly programmer-authored. **Change outcome:** pure rules runner and disposable application sandbox; never launch Chrome/Temporal for a pure precondition.

**H04. No one logical-run controller for setup→step→fault→assert→replay (C03 C07 C09 C11 C16).** Browser §useChamberPlay§ controls a current scene, §QaWorkspace§ separately controls a checklist and the CLI selects a mode via flags. No shared typed command/step plan or persisted execution sequence. **Negative:** repeating run fails to reproduce without copying whole DB.

### P1: controlled causal evidence and correct real-state experiments

**H05. Narrow failure injection only (C05 C07).** [§createChamber.controlStoryteller§](../../../packages/application/src/developer-tools/chamber.ts) offers arm-hold/arm-failure/release for one pending consequence; integration tests have bespoke restart/retry cases. No general test-only cut point for “committed but ACK lost,” due boundary, duplicate outbox, cache outage and alternate delivery order. Preserve narrow working controls as adapters rather than replacing them with global monkeypatching.

**H06. No independent clock/seed protocol with truthful time-domain coverage (C03 C05).** §chamber.v3§ uses §realDurationMs:20000§; §chamber.v4§ uses 15s deadline, both real-time fixture plans. Scripted fake Storyteller is deterministic but not equivalent to controlling PostgreSQL/Temporal. Need Bench clock/seed and sandbox delivery seams; avoid falsely claiming global time warp.

**H07. Inspector shows rich facts but not coherent causal deltas (C06 C10).** [§createChamberInspector.inspect§](../../../packages/application/src/developer-tools/chamber-inspector.ts) reads a story snapshot and then other tables in independent requests; a mixed diagnostic revision is plausible. UI prints large raw JSON blocks rather than a compact failure-first before/after/receipts view. Need stable snapshot/version coherence and trace/event correlations; retain deep inspector drill-down.

**H08. No automatic evidence/reproduction capsule (C10 C16).** Existing [QA export](../../../packages/application/src/developer-tools/qa-journeys.ts) correctly preserves authored case and stage journal, git SHA and rating, but lacks deterministic seed, setup hash, command/fault log, automated assertion result, state diff and replay command. The UI calls it “Sanitized evidence bundle” while user-entered observations/notes/references are exported without an evident content redactor. This is a **privacy/copying risk to constrain**, not demonstrated secret disclosure.

**H09. Existing QA success vocabulary can overstate proof (C08 C10 C15).** A manual selected §passed§ plus an evidence-reference string verifies only that an operator filed a result. Architecturally separate §manual-observed§, §structurally-asserted§, §real DB verified§ and §model-human-judged§ outcomes; retain honest historical statuses. **Negative:** false proof tier elevation from operator text.

### P2: broad evolution, usability, maintainability, economics

**H10. UI is a mixture of scene, inspector and QA form rather than a lab workbench (C01 C06 C11).** [§view.tsx§](../../../apps/web/src/features/developer-tools/chamber/view.tsx) nests scene/start + inspector and [§QaWorkspace§](../../../apps/web/src/features/developer-tools/chamber/qa-workspace.tsx) as sibling islands; no scenario composer/step/diff/compare. React state duplicates query/refresh lifecycles from Play (documented in existing frontend [W12](../../changes/2026-11-12--web-chamber-qa-isolation/CHANGE.md)). New workbench can be substantially rebuilt without altering player UI/UX.

**H11. Launcher aggregates unrelated lifetimes (C12 C16).** [§tools/chamber/src/main.ts§](../../../tools/chamber/src/main.ts) parses many CLI flags, manages auth/DB, packet/live-eval, worker/browser lifecycle in one 1.5k-line source. Separate command/lane lifecycle by genuine side-effect boundaries and keep legacy aliases; line count alone is not the reason.

**H12. Coverage and fixture ownership are fragmented (C01 C15).** Five §chamber.vN§ sources, QA cases, multiple storyteller mechanical fixture modules and real tests have different registries; no single family/lane coverage matrix or reusable semantic setup vocabulary. Preserve verified fixtures, make the catalogue an index of *actual executable scenarios*, not a projection of hoped-for mechanics.

**H13. One local retained DB creates cross-experiment contamination risk (C03 C09 C13).** Launcher uses guarded §offscreen_chamber§ DB that persists stories; valuable for manual work but unsuitable as the only isolation model for parallel/automated reproducible experiments. Design disposable run namespaces and cleanup; don't quietly reset human developer's local run when automating.

**H14. Missing cost-aware quick-loop for isolated mechanics (C12 C16).** Existing real tests/CLI modes are useful but connect to multiple services for many flows; no centralized §chamber bench <scenario> --seed§ semantics, warm fixture/replay cache or clearly stated “this assertion requires DB” choice. Optimize *developer wall time and cheap-model source investigation*, not a blanket ban on verification.

## 5. Overlap with existing frontend Changes

**Existing [W12](../../changes/2026-11-12--web-chamber-qa-isolation/CHANGE.md)** is a proposed TanStack Query Chamber/QA frontend refactor. Implementing it unchanged **before** the owner-approved Chamber redefinition risks rewriting the old UI only to replace that UI later. **Decision:** supersede the *unexecuted* W12 packet with the Chamber workbench/QA Changes in the new lab sequence. Preserve its requirements for viewer-scoped query caching, separate inspector ownership, safe refresh and conditional Nest developer-mode registration, but **do not send W12 to Cursor** as an independent queue item. Keep W12 for historical linkage, explicitly marked superseded.

**Shared dependencies:** new Chamber UI should inherit the selected React 19/Next 16/TanStack/RHF/typed-fetch engineering architecture from [frontend target](../targets/react-next.md) **after foundational W01/W02/W15**, not build an independent server-state store. Chamber pure/DB/CLI lanes **do not wait** for the React frontend modernization. W16/W17 are player story SSE efforts; Chamber can consume their safe invalidation helpers when they exist without making SSE mandatory for Bench.

## 6. Adversarial review and evidence limits

- **Strongest alternative:** preserve current manual QA/inspector/fixture system and merely add more scripted cases. This is cheaper initially and appropriate for human-only playthrough rehearsal. It fails the user's actual objective because each rare state still requires special setup or ordinary journey; clock, fault and causal replay remain unavailable as a reusable developer capability.
- **Risk of overbuilding:** a universal scenario DSL, DB snapshot service or speculative plugin graph can be a bigger AI-generated tangle than today's Chamber. Chosen design must start with **one real production-policy Bench slice + one valid persisted Sandbox specimen**, prove a cheap reset/diff, then add fault/workbench/case breadth. No generalized adapter without two credible consumers.
- **Source uncertainty:** exact existing QA case count was source-inspected from five catalogue modules (2 player, 5 activity, 5 Storyteller, 1 start-package, 2 calendar/live; **15** authored cases), not verified by executing §listQaJourneyCases§. No current test run or active provider calls took place. The inspector's potential mixed snapshot is inferred from independent SQL reads, not a reproduced bug. Current additional test coverage may exist in large integration tests; sample paths inspected, not all assertions executed.
- **Stop conditions:** don't change game rules, production auth or provider dispatch policy to make the Chamber easier to build; add only justified test-only seams. No arbitrary fixture writes to user data. Preserve historical QA evidence and earlier §chamber.v1–v5§ as stable source IDs during migration rather than treating saved state as disposable.
- **Evidence exit:** each Chamber C01–C16 criterion maps to a source observation, one bounded code Change and at least one discriminating proof. A pretty lab screen or code-folder count is not completion. Verify real performance and Cursor token usage before claiming efficiencies.
