# Implementation plan

Feature: [Chamber laboratory](FEATURE.md)

Execution scope: implement one Chamber capability phase at a time. Phase 1 is ready. Later phases are roadmap boundaries, not authorization for the current Cursor turn.

Implementation owner: Cursor.

Reviewer: ChatGPT/Codex after each completed phase is committed and pushed.

## Current evaluation-oriented continuation

Do not implement the older roadmap phases merely because they are listed below. The [QA journey system](../../engineering/qa-journeys.md) is implemented; next comes [trace exploration](../2026-09-18--17-27--storyteller-trace-explorer/PLAN.md), and only then [conservative live-model evaluation](../2026-09-18--17-27--conservative-live-model-evaluation/PLAN.md). Implement concrete controls when those features require them; avoid a broad laboratory framework detached from the playable POC.

## Phase 1 — Scenario catalog and read-only inspector

Status: Implemented; awaiting review

### Outcome

Turn the current fixture selector into an understandable developer scenario catalog and add a read-only inspector for the authoritative state already supported today.

This phase adds **observability**, not gameplay.

After completion, a developer should be able to:

- understand what each Chamber scenario is meant to prove;
- start/reopen it as today;
- view the normal player presentation;
- inspect story/passages/timing/items/history/provenance that already exist;
- distinguish visible player state from developer-only diagnostic state.

Do not add fake storyteller injection, time warp or fault injection yet.

### Existing behavior to preserve

Preserve:

- dedicated local Chamber database;
- loopback-only launcher;
- local authenticated test session;
- ordinary production API/story persistence for gameplay behavior;
- versioned `chamber.vN` fixture source identities;
- current response/wait/deadline/item scenarios;
- `pnpm chamber`;
- `pnpm chamber --smoke`;
- restart/reopen behavior;
- zero provider/model dependency.

Do not reset or reinterpret existing saved Chamber stories.

### 1. Add scenario metadata

Refactor `packages/application/src/developer-tools/chamber-fixtures.ts` so every fixture has developer-facing metadata in addition to its versioned behavior.

Suggested shape:

```ts
type ChamberScenarioMetadata = {
  name: string;
  description: string;
  exercises: readonly string[];
};
```

Each fixture should expose metadata alongside:

- opening;
- responder if any.

Example intent:

`chamber.v2`
- name: Immediate conversation
- description: Exercises persisted branching choices and retry-safe responses.
- exercises:
  - choice persistence
  - revision fencing
  - history

`chamber.v3`
- name: Timed courtyard visit
- description: Exercises a durable wait that continues while the browser is closed.
- exercises:
  - Temporal wait
  - polling/reopen
  - pause/resume
  - viewVersion ordering

`chamber.v4`
- name: Decision deadline
- description: Exercises a response window racing an automatic default.
- exercises:
  - deadline
  - fallback
  - player/default contention

`chamber.v5`
- name: Letter delivery
- description: Exercises an authoritative item transfer committed with its narrative consequence.
- exercises:
  - item state
  - atomic effects
  - retry/reload

Keep stable scenario/source IDs.

Do not derive source identity from display names.

Expose a typed catalog helper for Chamber UI/tooling. Do not expose fixture resolver functions unnecessarily.

### 2. Improve the scenario selector

Update the Chamber start screen.

Instead of presenting opaque values as the primary UI, show:

- scenario name;
- short description;
- exercised capabilities.

The underlying select value remains the stable scenario ID.

Prefer a compact developer-oriented presentation rather than elaborate styling.

The developer should immediately understand why they would choose a scenario.

### 3. Add a read-only Chamber inspector contract

Create a developer-only inspector representation composed from existing authoritative storage/state.

Do not expose raw database rows directly to React.

Define a deliberate inspector DTO/schema containing supported fields.

Initial inspector should include where applicable:

#### Story

- story ID;
- source;
- revision;
- viewVersion;
- createdAt.

#### Current passage

- passage ID;
- sequence;
- transition ID if present;
- content;
- interaction;
- response source;
- source generation ID if the preceding candidate-start feature has introduced it by implementation time.

#### Timing

- wait plan;
- dueAt;
- remainingMs;
- controlRevision;
- decision plan;
- responseDueAt.

Do not calculate misleading derived state where existing snapshot helpers already provide the authoritative interpretation.

#### Items

For each current story item:

- key;
- label;
- holder key.

#### Recent history

Expose a small bounded recent passage list suitable for inspection.

Include:

- sequence;
- passage ID;
- transition ID;
- content title where available;
- response source;
- whether an interaction/wait/decision/effect exists.

Do not load unbounded history.

#### Generation provenance

If a passage has a supported source-generation reference by the time this phase is implemented:

show safe diagnostic fields such as:

- generation ID;
- kind;
- state;
- source draft/revision where parsable;
- failure code;
- persisted proposal/output where appropriate;
- hidden option intentions.

This is developer-only information.

Never include:

- auth/session secrets;
- OAuth tokens;
- OpenRouter key;
- arbitrary environment variables;
- provider credentials.

If generation provenance has not yet landed on `main`, design the inspector so that section is simply absent/nullable rather than blocking Phase 1.

### 4. Keep inspector access developer-only

Do not casually add a permanent public `/api/debug/...` route.

Prefer the narrowest architecture consistent with the existing local Chamber launcher.

Acceptable approaches include:

- a Chamber-specific dev-only controller/module mounted only by the launcher; or
- another clearly isolated local-only composition.

Ordinary production `createApp(...)` must not mount unrestricted Chamber inspection endpoints by default.

If reusing `createApp(...)` makes this difficult, make the smallest dependency/configuration change that gives the local launcher an explicit developer-tooling option.

The boundary must be clear in code.

### 5. Add inspector UI

Add a developer inspector panel to `/chamber`.

The main scene remains visually distinct from inspection data.

Suggested layout:

- player view first;
- collapsible or side/below "Inspector" section.

Initial sections:

- Story
- Current passage
- Timing / decision
- Items
- Recent history
- Generation provenance when available

Formatting should favor readability:

- labels for identifiers/revisions;
- pretty-printed structured JSON only for fields where no better small presentation exists;
- do not dump one giant raw object.

The inspector automatically refreshes when the normal Chamber story state changes.

A manual refresh button is useful if implementation stays simple.

### 6. Do not add mutations

Phase 1 inspector is strictly read-only.

No:

- "set revision";
- arbitrary DB writes;
- complete timer;
- inject response;
- delete item;
- change holder;
- edit generation output.

Existing ordinary player controls such as pause/resume and choices remain available through their normal paths.

### 7. Preserve the smoke path

`pnpm chamber --smoke` should continue to work.

It does not need to exhaustively test the inspector.

Add a small assertion that:

- scenario metadata renders; and/or
- inspector becomes visible after the smoke story starts;
- authoritative item holder remains visible after letter delivery/reload.

Keep smoke focused and fast.

### Targeted tests/checks

Add focused tests for:

1. scenario catalog metadata completeness:
   - every registered scenario has name/description/exercises;
   - every accepted `ChamberScenario` maps to exactly one fixture.

2. inspector authorization/isolation:
   - ordinary unauthenticated access rejected;
   - production app configuration does not unintentionally expose the developer tooling endpoint.

3. inspector correctness for representative scenarios:
   - story revision/viewVersion/source;
   - timed scenario exposes timing state;
   - letter scenario exposes item holder;
   - recent history remains bounded.

4. browser Chamber coverage:
   - readable scenario metadata;
   - inspector renders after start;
   - state updates after a normal Chamber action.

Then run:

- relevant server/API tests;
- Chamber browser test;
- `pnpm chamber --smoke`;
- `pnpm typecheck`;
- `pnpm lint`;
- `pnpm format:check`.

Run broader story tests if shared story read helpers are changed.

### Documentation

Update:

`docs/development.md`
- describe the Chamber as an evolving local scenario laboratory;
- document the inspector;
- state clearly that it is developer-only and read-only in Phase 1.

`docs/technical/delivery-and-validation.md`
- describe scenario catalog + inspection as the Chamber's observability layer;
- retain the rule that it must exercise production behavior rather than become a second engine.

`docs/progress.md`
- note that Chamber scenarios now have descriptive metadata and authoritative read-only inspection;
- do not claim fake storyteller/time/fault controls yet.

`docs/features/README.md`
- list this feature while active.

### Exit condition

Phase 1 is complete when:

- all existing Chamber scenarios have descriptive metadata;
- scenario selection explains their purpose;
- an authenticated local Chamber developer can inspect supported authoritative state;
- inspection updates after ordinary production-path gameplay changes;
- inspector behavior is read-only;
- developer tooling remains isolated from ordinary production exposure;
- existing Chamber behavior and smoke checks still pass.

Commit and push.

Stop after Phase 1.

Do **not** continue into fake storyteller injection, time acceleration or fault controls in the same Cursor turn.

---

## Phase 2 — Controlled fake storyteller

Status: Planned; blocked until generated continuation admission/resolution exists on `main`.

### Outcome

Allow Chamber scenarios to supply deterministic valid/invalid/delayed storyteller proposals through the production generation/resolution boundary.

Support a small catalog of fake outcomes:

- success;
- delayed success;
- invalid output;
- failure;
- uncertain;
- held/manual completion.

Requirements:

- use normal generation admission;
- use normal schema validation;
- persist normal generation state;
- obey stale/result fencing;
- no provider calls;
- inspector displays generation/proposal state.

Do not implement a Chamber-only continuation engine.

Detail this phase only when production generated-continuation contracts exist.

---

## Phase 3 — Developer time controls

Status: Planned; blocked until general generated activity/wait contracts are established.

### Outcome

Make long activities practical to test.

Target capabilities:

- scenario-defined accelerated durations;
- advance/expire current supported boundary;
- ordinary pause/resume;
- explicit distinction between accelerated developer execution and genuine wall-clock acceptance.

Requirements:

- no arbitrary browser-side timestamp mutation;
- preserve authoritative time semantics;
- production defaults unaffected;
- inspector clearly shows effective fixture timing.

Do not implement until the real activity/wait contract makes the correct boundary obvious.

---

## Phase 4 — Fault injection and recovery controls

Status: Planned.

### Outcome

Deliberately reproduce important operational failures through real application boundaries.

Candidate initial controls:

- stop/restart worker;
- duplicate/replay command;
- delayed fake generation;
- failed fake generation;
- uncertain fake generation;
- race response vs deadline;
- race pause vs completion.

Keep this bounded to reproducible real failures.

Do not introduce arbitrary impossible database corruption.

---

## Phase 5 — Reusable scenario harness

Status: Planned.

### Outcome

Reduce duplication between interactive Chamber scenarios and automated tests.

Extract reusable typed scenario definitions where repeated manual/test setup proves the need.

A scenario may define:

- metadata;
- supported initial state;
- fake storyteller schedule/results;
- timing configuration;
- expected milestones.

Drivers may include:

- Chamber UI;
- integration test;
- Playwright test;
- smoke/acceptance runner.

Do not design the final abstraction before Phases 2-4 reveal what needs reuse.

---

## Phase 6 — Long-life benchmark scenarios

Status: Planned.

### Outcome

Create durable acceptance scenarios for the foundational earned-life gameplay vision.

First benchmark should demonstrate:

- ordinary activity;
- meaningful elapsed time;
- delayed reward;
- interruption;
- accumulation;
- meaningful possession/state;
- long journey;
- return after absence;
- callback to earlier state/history;
- meaningful risk/loss.

Use generic supported mechanics.

Do not add fantasy-specific production systems merely to reproduce the illustrative Vvardenfell example.

A second radically different setting should eventually prove the same engine assumptions still hold.

---

## Current checkpoint

- Current phase and exact next action: Phase 1 is implemented and landed on `main`. Do not start Phase 2 without returning to its planned scenario-fixture scope.
- Base/reviewed Git revision: Phase 1 predates the current DM-loop work and is part of repository history.
- Relevant uncommitted changes: none owned by this feature checkpoint.
- Actual checks/results: `@offscreen/contracts` tests including catalog completeness; API bootstrap proves default `createApp` does not mount `/api/chamber-tools`; story core/http/start inspector tests in the full stories run; `stories-browser.integration.js` 4/4; `node dist/dev/chamber.js --smoke` passed; targeted Prettier/ESLint and `python scripts/check_docs.py`. Typecheck via package `tsc` for contracts/server/api/web. Did not rerun the entire combined `stories.integration.js` suite after the last browser locator fix (browser suite re-ran cleanly). `pnpm` was invoked as `corepack pnpm`.
- Unresolved blockers for Phase 1: none. Generation provenance is shown when `sourceGenerationId` is present (playable start); authored chamber fixtures remain null there.
- Provider spend and accounting certainty: $0 this turn; no provider calls; cumulative OpenRouter usage not verified.
- Future phases: still blocked/planned as written; not authorized.
