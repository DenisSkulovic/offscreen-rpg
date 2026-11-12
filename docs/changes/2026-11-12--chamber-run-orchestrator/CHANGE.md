# Change CH06 | Typed logical-step runner, breakpoints and replay

> **Cursor first look:** [Chamber protocol `1–2](../../technical/chamber-lab-protocol.md#1-contract-and-command-semantics), [current application tools](../../../packages/application/src/developer-tools/README.md). **Target:** [C01/C03/C06/C09/C11/C16](../../engineering/targets/chamber-laboratory.md#11-verifiable-acceptance-c01c16); [audit H02/H04](../../engineering/audits/chamber-gap-2026-11-12.md#4-ranked-gaps). **Trap:** step means one **application-semantic boundary**, not arbitrary JavaScript instruction stepping.

**State:** Specified/Proposed, no code permission. **Depends on:** CH01, CH02, CH04, CH05. **Source baseline:** `470a5df`.

## Bounded executable result

A single typed `LabRun` state machine and whitelisted `LabStep` command registry executing scenario steps across Bench and Sandbox (and exposing a stable port for later Connected/Packet). Supported lifecycle: `prepared→running↔paused→completed/failed/blocked/cancelled`. Steps have sequence/identity, exact scenario/fixture version, expected run revision, precondition and observed result. Provide run-all, single logical step, hold-at-named-breakpoint, reset/replay from **fresh isolated specimen**, and typed failure classification.

## Binding design

- Commands are semantic and validated (`inspect`, `advanceClock`, `admitChoice`, `controlActivity`, `assert`, `reset`) and dispatch **real owning operation**, not generic `eval/SQL/any`.
- A retry of a submitted step uses the same stable run/step/operation identity and frozen payload. Unknown completion is reconciled by authoritative read; never silently run it again.
- Run orchestrator must not embed UI, DB connection pooling, provider transport or a second rule evaluator. Lane adapters declare support; unsupported command returns `blocked` with reason and zero side effects.
- Persist sufficient step order/seed/config for replay (CH09 owns final durable evidence). CH07 adds deep observations; this Change can expose typed step responses and IDs.

## Proof

**Normal:** load fixture, inspect, step a valid action, pause, resume, and reset/replay with identical structural result.  
**Negative:** out-of-order step, stale run revision, duplicate step with changed body, unavailable lane or cancellation mid-step cannot double-admit intent or corrupt another run.  
**Check:** pure FSM/driver contract tests and one authorized isolated Sandbox step; no full Chrome/Temporal.

**Handoff:** selected protocol headings, two lane adapters and one test; no large universal plugin framework or redesign of player game rules.
