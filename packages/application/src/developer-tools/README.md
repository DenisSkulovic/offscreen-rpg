# Application developer tooling | source map

**Current (source-inspected 2026-11-12, code baseline `470a5df`):** `createChamber` uses **real** story application operations for five fixed `chamber.v1–v5` starts/responses; `createChamberInspector` loads a rich owned snapshot/SQL diagnosis; `createQaJourneys` stores **manual** QA stage evidence. They do **not** form a generic state materializer or scenario runner. **Future (not implemented):** [Chamber laboratory target](../../../../docs/engineering/targets/chamber-laboratory.md) and [typed protocol](../../../../docs/technical/chamber-lab-protocol.md).
**Start here:** one owner below, not this entire directory. **No player/game authority is moved into Chamber** simply because a test needs to set up a state.

| Need / scenario Change | Actual first source | Important existing property |
| --- | --- | --- |
| Fixed scripts and normal operations | [`chamber.ts`](chamber.ts): `createChamber` | `start/respond/control/fork` call real `createStoryApplication`; response fixture is a versioned scripted proposal |
| Script details | [`chamber-fixtures.ts`](chamber-fixtures.ts): `chamberFixtures` | v1 read-only, v2 conversation, v3 20s wait, v4 15s deadline, v5 letter transfer; no arbitrary overlays |
| Point-in-time inspector | [`chamber-inspector.ts`](chamber-inspector.ts): `createChamberInspector.inspect` | reads snapshot + separate SQL queries for passage/resolution/activity/provider; not one full consistent transaction |
| Manual evidence journal | [`qa-journeys.ts`](qa-journeys.ts): `createQaJourneys.open/recordStage` | stores versioned immutable case, revision-fenced append-only operator observations; does **not** execute case |
| QA catalogue | [`qa-catalog.ts`](qa-catalog.ts), [activity lifecycle cases](qa-catalog/activity-lifecycle.ts) | 15 authored cases, some planned; driver names are metadata, not executable drivers |
| Lab scenario catalogue (CH01) | [`chamber-lab-catalog.ts`](chamber-lab-catalog.ts) + [`@offscreen/contracts/chamber-lab`](../../../../packages/contracts/src/chamber-lab.ts) | Versioned `id@version` scenarios with lane/cost/fixture; does **not** execute. Legacy `chamber.vN` + QA IDs retained with `automatedPassAllowed: false` |
| Bench pure runner (CH02) | [`tools/chamber/src/lab/bench.ts`](../../../../tools/chamber/src/lab/bench.ts) via `pnpm chamber:bench -- <id> --seed=N` | Calls real `@offscreen/game` calendar/check/eligibility policies; no DB/Nest/browser |
| Semantic fixture specimens (CH03) | [`lab/fixture-specimens.ts`](lab/fixture-specimens.ts) | Versioned overlays (80% shift, owned item, due decision); content hash; **no DB writes** (CH04) |
| Isolated Sandbox (CH04) | [`lab/sandbox-guard.ts`](lab/sandbox-guard.ts), [`lab/sandbox-materializer.ts`](lab/sandbox-materializer.ts), [`lab/sandbox-postgres.ts`](lab/sandbox-postgres.ts) | Guard + memory store; **live** DROP/CREATE postgres specimen store with `confirmDisposableProvision: true` |
| Lab clock/entropy (CH05) | [`lab/lab-clock.ts`](lab/lab-clock.ts) | Labeled domains; seeded draw log; fictional advance without wall wait; refuses Temporal/DB/browser fast-forward; uses real `earnedGameSeconds` |
| LabRun orchestrator (CH06) | [`lab/lab-run.ts`](lab/lab-run.ts) | Typed lifecycle + whitelisted steps over Bench/Sandbox adapters; pause/breakpoint/reset/replay; no eval/SQL |
| Lab observations/deltas (CH07) | [`lab/lab-observation.ts`](lab/lab-observation.ts) | Typed facets, semantic before/after, cross-version warning, default redaction; existing SQL inspector unchanged |
| Lab fault cut points (CH08) | [`lab/lab-faults.ts`](lab/lab-faults.ts) + LabRun `armFault`/`releaseFault` | Run-scoped FaultPlan; after-commit-before-ack, duplicate-delivery, held-storyteller; cleanup on cancel/reset; **not** Nest-registered |
| Lab evidence capsule (CH09) | [`lab/lab-evidence.ts`](lab/lab-evidence.ts) + `LabRun.finalizeEvidence` | Immutable machine capsule; default redactor; digest artifacts; QA journal remains a separate authority |
| QA ↔ LabRun bridge (CH10) | [`lab/qa-lab-bridge.ts`](lab/qa-lab-bridge.ts) | Curated stage bindings; machine pass needs capsule; search splits stage-instructions vs runnable-scenario; QA journal untouched |
| Lab workbench sessions (CH11) | [`lab/lab-workbench-service.ts`](lab/lab-workbench-service.ts) | Owner-scoped process-local LabRun sessions for developerTools Nest + web console |
| Connected rig (CH13) | [`lab/connected-rig.ts`](lab/connected-rig.ts) | Serial lock; fake-offline + **live-stack** (Temporal reachability, migrated disposable DB, duplicate seam) |
| Held packet lab (CH14) | [`lab/packet-lab.ts`](lab/packet-lab.ts) | Held DispatchReview snapshots → CH09 evidence; dispatch tripwire; authorized-live separately gated |
| Mechanics coverage (CH15) | [`lab/mechanics-coverage.ts`](lab/mechanics-coverage.ts) | Per-lane available/blocked/planned registry; never auto-pass |
| Replay/compare (CH16) | [`lab/replay-compare.ts`](lab/replay-compare.ts) | Replay manifests, named invariant compare, honest C01–C16 evidence map |
| Storyteller fault seam | [`storyteller-control.ts`](storyteller-control.ts) and `createChamber.controlStoryteller` | arm-hold/fail/release/clear for next pending consequence, not universal fault scheduler |
| Production story commit | [story façade](../stories/index.ts), [story persistence](../stories/persistence.ts) | Must remain authority for story revisions/receipts; no Chamber-owned rules fork |
| Lab program status | [Chamber program](../../../../docs/engineering/chamber-program.md) | CH01–CH16 Done; live Sandbox + Connected stack proven locally; paid live-provider release still explicit |

**Proof route:** [real API integration](../../../../tools/api-integration/test/README.md), select `stories-core.integration.ts`, `stories-http.integration.ts` or `storyteller.integration.ts` by behavior. A test can reset disposable `offscreen_auth_test`; never run it reflexively. **Expansion rule:** read a full current module only if a selected CH packet modifies it; later technical contracts are read by exact heading.

**Maintenance:** update this table when an owning exported symbol or semantics changes, not after every small implementation detail. Historical `chamber.vN` IDs/run evidence must survive migration.
