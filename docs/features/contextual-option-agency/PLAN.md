# Implementation plan

Feature: [Situation-dependent options and meaningful agency](FEATURE.md).
Execution scope: documentation/handoff only so far; implementation awaits an instruction to proceed.
Implementation owner: Cursor by default; reviewer: Codex.

## Phases

### Phase 1: opportunity and offer contract (next ready)

Dependency: mechanical action contract from D&D feature phase 1. Owners: AI task/proposal schemas, server option policy, contracts. Inspect `storyteller-tasks.ts`, `playable-proposal.ts` and contracts/interactions.ts: generic choices already allow one option, while the profiled validator imposes 2–5. Version the new envelope and preserve saved artifacts. Define opportunity evidence, category navigation versus executable leaf, and a separate no-choice outcome. Keep constraints as structured facts with evidence; do not implement a fake numeric agency score. Exit: broad, tight, one-action and no-action authored examples fit the same bounded contract.

### Phase 2: server menu state and player experience

Depends on phase 1. Owners: server provenance/admission, db if needed, API and web. Persist complete bounded menus; navigation is read-only selection of already saved nodes and supports Back. Admission validates current root, path, action terms and authoritative prerequisites. Labels explain known duration/commitment without secret DC leaks. Compose narrative and options in one bounded call when feasible. Exit: the ordinary play UI supports both broad exploration and constrained responses without extra inference per submenu click.

Optional evidence: manually inspect the four authored cases and stale-selection behavior if useful; semantic diversity remains a play-quality judgment, not a green-schema claim.

## Current checkpoint

- Current phase: design ready; implementation has not started. Next action: when assigned implementation, read phase 1 dependencies and current working changes, then implement that slice.
- Base: existing uncommitted storyteller runtime implementation; no isolated clean revision is claimed. Preserve staged and unstaged work. Existing admission captures one profile; generated continuations have no mechanical effects.
- Checks: none run for this documentation work. Checks are optional under [verification policy](../../../.agents/rules/verification.md), never a phase completion gate. Acceptance describes behavior to deliver, not a mandatory test suite.
- Blockers: dependencies listed per phase; broader edition/combat decisions do not block the bounded subset.
- Provider spend: $0; cumulative account usage unverified. Live inference remains disabled.
