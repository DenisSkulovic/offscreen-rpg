# Implementation plan

Feature: [D&D checks and visible persistent outcomes](FEATURE.md).
Execution scope: documentation/handoff only so far; implementation awaits an instruction to proceed.
Implementation owner: Cursor by default; reviewer: Codex.

## Phases

### Phase 1: pure rules and durable receipts (next ready)

Outcome: one supported ability check and currency consequence can be committed once. Owners: contracts, db, server rules/persistence. Read `story-command-policy.ts`, `story-continuation.ts`, `storyteller-admission.ts` and db story schema before editing; current generated effects are empty and cannot be treated as existing mechanical support.

Add versioned character/check/action/effect schemas with the exact selected subset in game-rules.md. Use focused pure modules under server/rules with injected random draws. Persist character state, immutable resolution plan and check/effect receipts; define unique action/check identities and foreign keys. Under the existing story lock validate ownership, expected revision and prerequisites, capture the plan before draws, then save result and effects atomically. Currency is bounded integer data. Resolve duplicate operations before drawing. New character initialization is explicit and idempotent; do not silently assign scores to old stories. Exit: a coherent application operation returns a persisted safe check summary without any model dependency.

### Phase 2: connect action, narration and UI

Depends on phase 1. Owners: server admission/publication/context, AI task schemas, API, worker/workflows and play/history UI. Add a new mechanical resolution durable kind and typed option action provenance. Commit mechanics before creating the narrative task, passing mandatory receipts. Provide deterministic summary on narrative failure; retry saved mechanics only. Preserve existing budget gates. Render expandable dice/result details and currency. Exit: connected offline pineapple task demonstrates earned effects and recovery through the normal play page.

Optional evidence, only when requested/useful: one injected success/failure example and one duplicate/narration-failure replay; no broad suite or paid quality judge.

## Current checkpoint

- Current phase: design ready; implementation has not started. Next action: when assigned implementation, read phase 1 dependencies and current working changes, then implement that slice.
- Base: existing uncommitted storyteller runtime implementation; no isolated clean revision is claimed. Preserve staged and unstaged work. Existing admission captures one profile; generated continuations have no mechanical effects.
- Checks: none run for this documentation work. Checks are optional under [verification policy](../../../.agents/rules/verification.md), never a phase completion gate. Acceptance describes behavior to deliver, not a mandatory test suite.
- Blockers: dependencies listed per phase; broader edition/combat decisions do not block the bounded subset.
- Provider spend: $0; cumulative account usage unverified. Live inference remains disabled.
