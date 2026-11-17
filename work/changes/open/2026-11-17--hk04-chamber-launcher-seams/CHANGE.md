# HK04 | Separate Chamber launcher modes from privileged environment bootstrapping

**State: Proposed; safety characterization required before Ready.** **Program:** [housekeeping audit](../../../designs/open/repository-housekeeping/AUDIT-2026-11-17.md). **Outcome:** a launch mode has a traceable, independently testable owner without changing database, provider or process authority.

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

## Reconciliation ledger

| Owner | Invariant | Evidence | Docs disposition |
| --- | --- | --- | --- |
| Chamber launcher/modules | mode planning isolated, side effects preserved | pending | pending |
| Story funding/provider boundary | explicit current authority/default deny | pending | pending |
| Existing Chamber tests | normal and negative outcomes preserved | pending | pending |
| Local runbooks/status | no false live proof claim | pending | pending |

**Cursor permission:** first do a read-only mode matrix and minimal characterizing tests with mock boundaries. An actual launcher refactor requires satisfying the safety gate; report Blocked rather than performing unapproved live modes.
