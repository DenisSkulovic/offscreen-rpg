# HK04 | Separate Chamber launcher modes from privileged environment bootstrapping

**2026-11-18 executable decision:** [Backlog audit and acceptance](../../../../../designs/open/backlog-convergence-2026-11-18/README.md); [bounded contract choices](../../../../../designs/open/backlog-convergence-2026-11-18/CONTRACT-DECISIONS.md); [ordered Cursor handoff](../../../../../designs/open/backlog-convergence-2026-11-18/CURSOR-HANDOFF.md). The older Proposed/Blocked/No-code declarations retained below document the historical decision; they do not prohibit the **safe scoped implementation** now selected. External paid dispatch, nondisposable DB resets, production grants and irreversible accounting changes remain disallowed. A provider-free experiment that proves no new feature is needed must close with a source-backed positive alternative, not be parked again.

**State:** Done (2026-11-18). The pure launch plan denies a bad database and a missing Story authorization before provider construction. The process boot stays in main.ts. No model call and no database reset.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Disposition | Owner | Negative |
| --- | --- | --- | --- |
| Product | unchanged because docs/product/foundations/vision.md#what-this-page-selects already keeps a Chamber fixture apart from the player rule | docs/product/foundations/vision.md | A launch plan does not add a player choice |
| Technical | changed: docs/technical/lab/chamber-and-fixtures.md#9-authority-safety-and-cost records that the launch plan denies a non-loopback database before a provider key or a port | docs/technical/lab/chamber-and-fixtures.md | Ordinary Chamber still does not enable provider dispatch |
| Code | changed: tools/chamber/src/main.ts uses the pure launch plan for the database, the Story cap, and reset, and still boots processes itself. Negative: a remote database is rejected and the plan test does not import a provider transport | tools/chamber/src/main.ts | The process boot stays in main.ts |
| Related | changed: tools/chamber/src/README.md names the pure plan and leaves the boot in main.ts | work/changes/README.md | Queue selection is not permission to start the next packet |

## Cursor first-screen brief

`tools/chamber/src/main.ts` is **1,530 lines** and mixes flags, policy/authorization, local DB lifecycle, server/browser child-process orchestration, evaluation/packet generation and cleanup. It already imports `src/modes/cli-flags.ts`, `src/story-funding.ts`, `src/story-provider.ts`, `src/stop.ts` and other dedicated launch modules. Check why those boundaries stop at their current level rather than introducing a second framework.

Inspect `tools/chamber/README.md`, `src/README.md`, `package.json`, `src/main.ts`, `src/modes/cli-flags.ts`, `src/story-funding.ts`, `src/story-provider.ts`, `src/stop.ts`, and tests for launch flags, forensic runs and OBS00. **Do not treat test names ending in `.live.test` as permission to run them.**

## Feasibility/safety gate

Produce a mode matrix covering `--story-mode`, `--no-browser`, packet/evaluation/memory modes, `--forensic-campaigns`, `--reset-database` and default Chamber. For each mode: parsed inputs, allowed local DB name/origin, provider-dispatch requirements, authorization token/cap, bootstrap side effects, processes/ports, cleanup, supported test. Mark risky modes not locally proven.

The existing default must remain **provider-disabled unless explicit current authorization is held**. Preserve separate local `offscreen_chamber` and `offscreen_story_local` database validation, strict loopback URLs, auth identity, port probes, spend limits, explicit reset flag and shutdown behavior. Local disposable reset is not an ordinary proof step.

## Bounded code delta (after gate)

1. Extract one clear **pure** policy/config decision out of `main.ts`, ideally launcher mode plan / validated environment input, using an explicit typed contract; leave side-effect execution in the established bootstrap path.
2. Add provider-free unit tests for permitted mode composition and explicit denials. Wire tests into existing Chamber test command; no new dependency or CLI wrapper for cosmetics.
3. If characterization passes, move one side-effect coordinator (not all modes at once) to a named module and keep `main.ts` as a thin executable boundary. Stop after meaningful reduction. Document remaining responsibilities and defer further extraction as a distinct slice only if independently justified.
4. Preserve CLI names, command exit codes, output artifacts, auth headers, DB name restrictions and teardown, including partial startup failure.

## Acceptance / decisive negative cases

- **Normal:** equivalent validated plan for representative default and provider-disabled evaluation mode, with unchanged entrypoint and test routing.
- **Denials:** missing/incorrect evaluation authorization, unsupported mode combination, non-loopback DB/host, live-cap mismatch, or no credential fail closed **before** creating transport/processes. A reset action is reachable only behind explicit existing flag and named disposable DB.
- **No hidden spend:** ordinary Chamber and safe tests never instantiate live OpenRouter transport or dispatch provider work. No destructive or paid live test run is permitted by HK04.
- **Resilience:** port already occupied and partial boot both close resources with documented exit semantics. No tests that rely on personal workstation state.

## Explicitly excluded

No redesign of the game/Storyteller, no new Chamber feature, no new agentic evaluation, no reactivation of retired HAR/Cognee experiments, no change to real billing policy, no renaming all CLI flags, no deployment changes, no UI refactor, no manual reset of the owner's live/local databases.

## Verification and completion receipt

Baseline `ec579c2b6cf6257acb2183d6bd87f8837b5a8807`. Chamber plan, flag, and stop tests: 13, 0 failures. Live Chamber tests were not executed. No model call. No database reset.

| Mode | Database | Provider plan | Reset |
| --- | --- | --- | --- |
| default, smoke, forensic, review, and packet modes | `offscreen_chamber` | disabled | only with `--reset-database` |
| `--story-mode` | `offscreen_story_local` | story-after-authority | only with `--reset-database` |
| `--evaluation-run` and `--memory-evaluation-run` | `offscreen_chamber` | evaluation-after-authorization | only with `--reset-database` |

A remote host, a query string, the wrong database name, a non-default Story model, and a cap above 10000 without the matching authorization are denied by the plan. The process boot, key read, and provider construction stay in `main.ts`.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/product/foundations/vision.md#what-this-page-selects | product | unchanged because a Chamber fixture remains a developer test and not a player rule | docs/product/foundations/vision.md at ec579c2b6cf6257acb2183d6bd87f8837b5a8807 | source-observed | the launch plan does not add a player choice | the heading stayed in place |
| docs/technical/lab/chamber-and-fixtures.md#9-authority-safety-and-cost | technical | changed: the heading now says the launch plan denies a bad database and a missing Story authorization before a key or a port | tools/chamber/src/modes/plan-launch.ts dirty against ec579c2b6cf6257acb2183d6bd87f8837b5a8807 | fixture-tested | a remote database is denied and ordinary Chamber stays provider-disabled | the heading stayed in place |
| tools/chamber/src/main.ts | code | changed: the launcher throws the pure plan before story authority, and reset still uses the named local database | tools/chamber/src/main.ts dirty against ec579c2b6cf6257acb2183d6bd87f8837b5a8807 | source-observed | the port, database, and provider boot remain in this file | tools/chamber/src/README.md |
| tools/chamber/src/modes/plan-launch.ts | code | changed: the plan returns the mode, database, reset flag, and provider denial without a transport | tools/chamber/test/plan-launch.test.ts dirty against ec579c2b6cf6257acb2183d6bd87f8837b5a8807 | fixture-tested | the plan source does not import a provider, a port, or a process | the module is new |

exception: work/changes/README.md because the queue line is the selection route for this packet
exception: work/changes/ledger/2026-11.md because the closed-work index records this packet
exception: work/changes/archive/2026-11/README.md because the month index lists the archived packet
exception: work/designs/README.md because the design index counts this launcher plan as finished
exception: work/designs/open/backlog-convergence-2026-11-18/README.md because the backlog map records that this plan is finished
exception: work/designs/open/backlog-convergence-2026-11-18/CURSOR-HANDOFF.md because the handoff must not ask for this plan again
exception: work/designs/open/repository-housekeeping/README.md because the housekeeping map records this launcher plan

The next packet stays unselected. This packet does not start it.
