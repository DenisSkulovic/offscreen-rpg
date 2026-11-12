# Chamber laboratory | implementation protocol and authority

**Status:** Selected **internal developer-tooling technical design**, 2026-11-12; code remains unchanged. **Why this exists:** the [Chamber target](../engineering/targets/chamber-laboratory.md) defines developer outcomes C01–C16; the [source audit](../engineering/audits/chamber-gap-2026-11-12.md) identifies current gaps. This document chooses shared wire/data/driver boundaries **so cheap Cursor implementers do not design separate incompatible systems**. Browser UI layout, exact class names and general player mechanics are not owned here.

## Cheap reading route

| Task family | Required section (only this, not entire file) |
| --- | --- |
| CH01–CH02 catalogue/runner | [Types and command semantics](#1-contract-and-command-semantics), [driver split](#2-architecture-and-drivers) |
| CH03–CH04 fixture/isolation | [Specimen materialization](#3-semantic-fixtures-and-isolation) |
| CH05–CH06 clocks/faults | [Time/entropy](#4-time-and-randomness), [fault schedule](#5-fault-cut-points) |
| CH07–CH09 inspection/evidence | [Snapshots/events/assertions](#6-observations-assertions-and-reports) |
| CH10 UI | [Client API](#7-client-api-and-workbench) |
| CH11–CH12 connected/packet | [Lanes and provider safety](#2-architecture-and-drivers), [safety](#8-safety-and-lifecycle) |
| CH13–CH15 cases/compare/launcher | [Catalogue lifecycle](#9-catalogue-evolution-and-handoff) |

## 1. Contract and command semantics

**Version the data first.** Add browser-safe contracts to §packages/contracts/src/chamber-lab.ts§ (future suggested owner, not current source). Use strict Zod v4 schemas with inference, no giant bespoke parser. Keep legacy §@offscreen/contracts/chamber§ for §chamber.v1–v5§ and §@offscreen/contracts/qa§ for human QA; a migration bridge may map these into the new catalogue but **must not** erase their identities/history.

**Core identity vocabulary:**

| Noun | Immutable identity | Meaning |
| --- | --- | --- |
| §ScenarioDefinition§ | §scenarioId@version§ | One developer intent/recipe and coverage claim; never mutate meaning of an existing version |
| §FixtureRecipe§ | §fixtureId@version + hash§ | Minimal valid setup with semantic params, preconditions and referenced documents/schema |
| §LabRun§ | UUID + owner/mode + code revision | One isolated execution, single state machine and evidence provenance |
| §Step§ | runId + ordinal + command kind | One logical requested action; stable identity for exact replay |
| §Observation§ | runId + step ordinal + authoritative version | A read of relevant public/private typed state or trace/counters at a named boundary |
| §AssertionResult§ | case + step + invariantId | Evaluated claim, actual/expected typed values and proof boundary |
| §RunArtifact§ | content digest + redaction policy | Bounded exported evidence; stored outside raw app/LLM payload by default |

**Minimal discriminated run lifecycle:** §prepared -> running <-> paused -> completed | failed | blocked | cancelled§. Completion cannot be asserted before all required invariant results are decided; §blocked§ means infrastructure/prerequisite unavailable, not necessarily a game defect. Immutable finalized report, new UUID for rerun. A run's evidence tier is §bench-policy§, §sandbox-db§, §connected§, §held-packet§ or §authorized-live§.

**Scenario shape:** §{id,version,family,name,searchTags,proofIntent,lanes,availabilityPerLane,costClass,fixture:{id,version,params,overlays},control:{seed,clockMode,providerMode,faultSchedule},steps:[...],assertions:[...],limits:{steps,wallMs,artifactBytes},resetPolicy}§. Schema rejects unknown fields, unexpected family-specific params, unavailable lane and paid operation under offline mode.

**Step commands (the whitelist):** §load§, §inspect§, §advanceClock§, §admitChoice§, §admitActivity§, §controlActivity§, §deliverNotice§, §armFault§, §releaseFault§, §assert§, §saveCheckpoint§, §export§. A CLI wrapper may expose concise aliases, but the **same typed registry** runs all. No §eval§, path supplied by a browser as arbitrary file import, SQL, shell argument passthrough or unconstrained "custom code" step. Each handler returns a typed §StepResult§ with stable result/changed status, domain error code, run correlation and observations to collect.

**Example scenario** (illustrative schema, not implemented executable JSON):

§§§yaml
scenario: shift-interrupt-same-tick@1
lane: sandbox-db
fixture: accepted-shift-80pct@1
params: { paidWorkSeconds: 2880, remainingSeconds: 720, wages: 6 }
seed: 141
steps:
  - inspect: [activity, clock, items]
  - armFault: duplicate-same-operation-delivery
  - controlActivity: pause
  - advanceClock: to-next-due-boundary
  - deliverNotice: same-operation-twice
  - assert: [no-time-donation, reward-applied-once, committed-view-monotonic]
§§§

This is *semantic setup* and must be rejected if a real accepted-shift fixture cannot satisfy those domain invariants. A developer may edit §wages§ only within the fixture's typed permissible parameter range, not invent a persisted credit table value without valid source.

## 2. Architecture and drivers

**Dependency direction:** scenario data + command registry -> run orchestration -> lane-specific adapter -> **real production policy/application operation** -> typed observations/contract assertions. Delivery/UI/framework code must not be imported into §@offscreen/game§. One scenario can run in multiple lanes and produce separate evidence.

**Selected source/module ownership (future):**
- §packages/contracts/src/chamber-lab.ts§: versioned scenario/run/command/observation public contracts; no Node/DB import.
- §packages/application/src/developer-tools/lab/§: typed fixture recipe validators, app-boundary command adapter, run orchestration/steps, observation/diff/assertion policy, faults under explicitly local composition. Use separate small modules by responsibility; keep §createChamber§ legacy API stable until migration.
- §tools/chamber/src/lab/§: CLI, Bench direct pure evaluator, isolated Sandbox provisioning, Connected/held mode adapters and launch commands. Existing §tools/chamber/src/main.ts§ mode flags remain compatible until a controlled launcher Change.
- §apps/api/src/modules/stories/*§: conditional dev routes mapping **only authenticated local Chamber** commands/reads; no normal API developer endpoints.
- §apps/web/src/features/developer-tools/chamber/§: React 19/Next 16/TanStack client, query keys by fixture/run/story/viewer, semantic editor, timeline, diff, command palette and QA. **No business rule or untyped mutation union in React.**
- §packages/db§: isolated DB fixture/test schemas and, if justified, narrow §lab_run§ metadata and immutable evidence index. Do **not** overload existing human §qa_run§ records with megabytes of machine trace; link a QA observation to a lab run ID when relevant.

**Bench:** import actual pure mechanic policy and a clock/RNG input. If the rule currently couples to DB or wall time, extract only a legitimate pure decision seam; don't write a substitute simplified resolver. Run one scenario without Docker/Next/Temporal.

**Sandbox:** real application use cases and Drizzle/Postgres constraints; use scripted fake provider/delivery adapters for non-relevant services. Persisted exactly-once claims require actual DB, not in-memory stubs. The runner must show the isolated DB identity before writes and enforce guardrails.

**Connected:** actual Nest/API, worker/Temporal/outbox, sometimes Next for visible auth/recovery. Never call a full connected suite to prove a pure calendar projection. Keep worker and API bound to a unique run namespace/DB/queue; do not parallelize runs that share ports or reset the same DB.

**Packet:** preserve existing held provider review hash/attempt/charging gates; integrate a run reference and observation schema. A provider-free test is a zero-attempt hold, not a fake successful dispatched request.

## 3. Semantic fixtures and isolation

**Fixture materializer interface** (conceptual): §materialize({fixtureId,version,params,seed,isolatedStore}) -> {checkpointRef, currentSnapshot, domainStateSummary, fixtureHash}§. Validation operates **before** writing and rechecks authoritative public/owned reads after materialization.

- **No arbitrary SQL mutation from browser/CLI.** A small set of fixture builders may use direct test DB inserts for states unreachable without 15 actions, but must declare exactly which domain invariants/constraints they satisfy; do not call this a gameplay command. For a possible state, prefer existing application operations; for impossible states, test the rejection at pure policy boundary rather than persist corruption.
- **Isolation selected:** Bench uses in-memory objects; Sandbox uses a **run-specific disposable local DB** with a strict name+localhost guard. When actual setup cost warrants, create a *sealed, quiescent DB template* keyed by migration and fixture-package hash, then clone it per run; never clone a live worker/provider history. Initial implementation can re-materialize recipes without templates. Isolated DB names have a distinct prefix from normal §offscreen§, §offscreen_chamber§ and §offscreen_auth_test§ and are explicitly bounded/cleaned on success/failure.
- **Connected** uses a dedicated test environment with unique task queue/DB and sequential execution until contention/namespace isolation is proved; never run against ordinary local Story database.
- **No restoring Temporal history**: checkpoints represent *application state at a safe boundary*, with pending outbox work represented as a fresh test intent and worker started under a new run identity. Real provider output and charges are not rewindable. Branch/rerun means rematerialize then replay under matching code/fixtures.
- Guard against stale fixtures after code/schema upgrades: run preflight checks version compatibility, required canonical root hashes, valid reference ownership and case availability. An invalid checkpoint is reported as blocked with migration requirement, not silently coerced.

## 4. Time and randomness

**Separate domains:** in-game fictional §gameSecond§, PostgreSQL authoritative current time, Temporal/worker deadline/lease, browser time and pure fake clock. Each driver declares controlled domains; the UI must not offer a “fast-forward DB” button in a lane where it cannot safely do so.

- Bench: inject deterministic clock and seeded/random choice at existing legitimate policy seams. Record each draw and logical tick.
- Sandbox: introduce an explicit test-only time provider for chosen app/DB boundary, **with equivalence tests** ensuring production DB-clock monotonic/ordering behavior is unchanged. Avoid global §Date.now§ monkeypatch or disabling DB locks. If a real DB clock is necessary for exact semantics, this scenario graduates to Connected.
- Connected: controlled worker-delivery holds/release at known seams, not an invented “rewind entire Temporal execution” feature. Use real database clock for transaction races that depend on it; avoid unnecessary 20-second wall waits for unrelated tests.
- Same seed/draw log only guarantees deterministic structural claims in a deterministic lane and same fixture/code revision. Network, external AI and unordered async timing remain separate observed inputs.

## 5. Fault cut points

Test-only §FaultPlan§ is a bounded set of **named semantic boundary hooks**, each scoped to a run and disarmed in finally. Define hook semantics exactly: §before-admission§, §after-commit-before-ack§, §outbox-before-delivery§, §duplicate-delivery§, §after-provider-dispatch-before-result§, §before-publication§, §projection-cache-unavailable§, §before-due-wake§. Hook registration **cannot** be enabled in normal app API construction.

- A dropped ACK cannot roll back a committed DB action; retry uses same business key and immutable payload.
- Duplicate/late work should be asserted against **persisted receipt and current authoritative state**; a fake callback count is only local unit evidence.
- Worker/crash testing uses controlled local process/fake adapter with bounded lifecycle and cleanup; no automatic entire-stack restart on every scenario.
- Existing §arm-hold§/§arm-failure§/§release§ are narrow, valuable scripted Storyteller controls; re-expose through the new typed fault registry rather than duplicating their internals.

## 6. Observations, assertions and reports

**Observation domains:** §public-story§ (what player can see), §private-mechanics§ (plans/eligibility/activity/items/time), §persistence§ (committed versions/receipts), §worker§ (outbox/attempt/lease), §documents§ (root/provenance), §provider§ (held/attempt/accounting), §transport§ (HTTP/admission/fault). Collect **only fields relevant to scenario**.

- **Consistency:** for a “one step” snapshot, read related SQL facts in a common repeatable-read boundary or carry a checked version/retry rule. Current inspector reads outside one transaction and may mix stages. Expose per-facet versions when a perfectly atomic cross-provider view is impossible; never present an invented global transaction.
- **Semantic delta:** compare typed before/after for the same scenario/run/resource, with explicit unchanged/prevented effects and reasons. Normalize random UUIDs, raw timestamps and wall durations only for *comparison*, not when inspecting actual evidence.
- **Trace event:** §{stepId,operationId,storyId,ownerScope,kind,phase,clockDomain,revision,viewVersion,outcome,errorCode,correlationId}§ plus minimal safe metadata. A trace is causal only when actual producer and consumer boundaries were observed; inferred relationships must be marked inferred.
- **Assertion:** typed predicate class §equals§, §monotonic§, §exists/absent§, §countOnce§, §unchanged§, §stateTransition§, §rejects§, §noProviderDispatch§, §costWithinCap§. Use stable structural IDs/values and source-backed domain check, not freeform JS or model grading.
- **Run report:** §{runId,scenario@version,fixtureHash,gitCommit,dirty,driver,seed,clockPolicy,providerMode,steps,assertionResults,observedVersions,semanticDiff,sideEffectCounts,artifacts,redactionLevel,limits,startedAt,finishedAt,status}§. Machine JSON and short Markdown summary. Large raw prompt/story/provider content must require explicit private drill-down and not be in default report.
- **Run history:** finalized report immutable, new ID for rerun/branch. Existing QA human stage record remains append-only and can reference one §LabRun§; a “manual passed” never automatically becomes “asserted by sandbox” or “live provider proven.”
- **Evidence redaction:** default export excludes credentials, raw model prompts, private canon/narrative and unredacted operator notes. Current QA export returns freeform observations/references; reconcile with explicit redactor/opt-in private export and tests before calling it sanitized.

## 7. Client API and workbench

**API only if local developer controllers are mounted:** e.g. §GET /api/chamber-tools/lab/scenarios§, §PUT /runs/:runId§ (open), §GET /runs/:runId§, §PUT /runs/:runId/steps/:stepId§, §GET /runs/:runId/inspect§, §GET /runs/:runId/evidence§, §POST /runs/:runId/replay§ if idempotency semantics are explicit. **No** generic §/execute?js=...§ endpoint. Exact verb can follow repo's PUT/idempotency conventions; do not expand HTTP surface for an in-process Bench use case.

**Web:** TanStack Query owns server state, viewer/run/resource scoped; explicit §useMutation§ with frozen run/step identity, no automatic retry of an uncertain step. UI owns only local search/selection/inspector expansion and semantic params. End-state components by responsibility: scenario finder, fixture composer, step control, inspector, causal timeline, assertions/diff, evidence history. Use accessible native forms; workbench UX is in scope but game/player art direction is not.

**CLI:** §pnpm chamber:bench -- <scenario-id> --seed=...§, §pnpm chamber:scenario -- <scenario-id> --lane=sandbox --params=...§, §pnpm chamber:inspect -- <run-id>§ are candidate stable aliases. They call the *same typed registry* and return concise default output with optional JSON/evidence. Flags are validated; a missing scenario should list nearby matching tags, not dump all source files.

**Performance:** never restart complete stack for Bench. Cache warmed builds/fixture templates where safe, use provider-free checks, measure cold/warm times before adding remote infrastructure. Write no giant universal CLI orchestrator. Keep existing §pnpm chamber:review/packet/...§ aliases functional until explicitly migrated.

## 8. Safety and lifecycle

**Existing critical boundary preserved:** §apps/api/src/app.ts§ includes developer controllers only under §options.developerTools===true§, ordinary API §main.ts§ omits them, local Chamber launcher intentionally opts in with loopback fixture identity. This is **already an effective local-vs-ordinary registration boundary**; no automatic §DEVELOPER_USER_IDS§ hosted RBAC Change. New lab commands need the same conditional registration and resource owner rules.

**Run budget:** per-mode maximum steps, max fixture objects, elapsed wall-time, max captures/bytes, DB and worker namespace, cleanup/TTL. Provider mode offline/held/live is an explicit invariant at **runtime composition**, not a UI toggle only. Presence of credentials does not authorize spend. A held packet must show zero provider dispatch and explicit hash/attempt. Live mode needs fresh signed or operator-confirmed route/model/price/operation cap, with one bounded release and reconciliation. **No generic fault/control endpoint in normal app**.

On shutdown/abort: disarm faults, stop owned workers/browser, release DB connections, cleanup disposable run DB, retain sanitized report with blocked/failed classification; never delete another run's data. Failure to clean up is an operational error in the receipt, not ignored.

## 9. Catalogue evolution and handoff

The current §chamber.v1–v5§ scenes, 15 source-authored QA journeys and packet tools are migration inputs. Preserve their IDs and historical run meaning; do not rewrite old QA records into synthetic “auto-passed” evidence. Catalogue groups by mechanic, invariant and test lane, with §available/blocked/planned§ per lane and exact missing prerequisites, not a promise that unimplemented mechanics work.

A cheap Cursor executor reads **one CH packet**, **one nearest source README**, this protocol's relevant heading and then 2–5 code symbols/tests. A Change modifying a route, fixture contract or run evidence must update its owner map. No full historical 50-KB docs or arbitrary source search unless a real contradiction appears.

**Acceptance:** target C01–C16 governs the program. Each Change must include normal and negative scenarios; actual DB/worker/privacy assertions are tested at the boundary that claims them. No successful mocked test can certify durable exactly-once or provider finality.
