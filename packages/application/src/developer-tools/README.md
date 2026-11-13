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
| Isolated Sandbox (CH04) | [`lab/sandbox-guard.ts`](lab/sandbox-guard.ts), [`lab/sandbox-materializer.ts`](lab/sandbox-materializer.ts) | `offscreen_chamber_run_<hex>` localhost-only guard; memory materialize/isolation proof; live DROP/CREATE needs `confirmDisposableProvision` + owner permission |
| Storyteller fault seam | [`storyteller-control.ts`](storyteller-control.ts) and `createChamber.controlStoryteller` | arm-hold/fail/release/clear for next pending consequence, not universal fault scheduler |
| Production story commit | [story façade](../stories/index.ts), [story persistence](../stories/persistence.ts) | Must remain authority for story revisions/receipts; no Chamber-owned rules fork |
| Pending future lab | **CH05–CH16** in [Chamber program](../../../../docs/engineering/chamber-program.md) | clock/entropy, run orchestration, inspector, faults, evidence, workbench |

**Proof route:** [real API integration](../../../../tools/api-integration/test/README.md), select `stories-core.integration.ts`, `stories-http.integration.ts` or `storyteller.integration.ts` by behavior. A test can reset disposable `offscreen_auth_test`; never run it reflexively. **Expansion rule:** read a full current module only if a selected CH packet modifies it; later technical contracts are read by exact heading.

**Maintenance:** update this table when an owning exported symbol or semantics changes, not after every small implementation detail. Historical `chamber.vN` IDs/run evidence must survive migration.
