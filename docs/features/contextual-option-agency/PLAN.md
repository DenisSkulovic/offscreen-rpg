# Implementation plan

Feature: [Situation-dependent options and meaningful agency](FEATURE.md).
Execution scope: all phases authorized by the owner on 2026-09-18.
Implementation owner: Codex, explicitly assigned by the owner.

## Phases

### Phase 1: opportunity and offer contract (next ready)

Dependency: mechanical action contract from D&D feature phase 1. Owners: AI task/proposal schemas, server option policy, contracts. Inspect `storyteller-tasks.ts`, `playable-proposal.ts` and contracts/interactions.ts: generic choices already allow one option, while the profiled validator imposes 2–5. Version the new envelope and preserve saved artifacts. Define opportunity evidence, category navigation versus executable leaf, and a separate no-choice outcome. Keep constraints as structured facts with evidence; do not implement a fake numeric agency score. Exit: broad, tight, one-action and no-action authored examples fit the same bounded contract.

### Phase 2: server menu state and player experience

Depends on phase 1. Owners: server provenance/admission, db if needed, API and web. Persist complete bounded menus; navigation is read-only selection of already saved nodes and supports Back. Admission validates current root, path, action terms and authoritative prerequisites. Labels explain known duration/commitment without secret DC leaks. Compose narrative and options in one bounded call when feasible. Exit: the ordinary play UI supports both broad exploration and constrained responses without extra inference per submenu click.

Optional evidence: manually inspect the four authored cases and stale-selection behavior if useful; semantic diversity remains a play-quality judgment, not a green-schema claim.

## Current checkpoint

- Status: connected authored mechanical slice implemented; full feature acceptance remains partial. The shared resolver and consequence narrator now use captured action content and the existing execution/publication/retry lifecycle.
- Follow the [current repair checkpoint](../dnd-checks-and-visible-outcomes/PLAN.md) for the delivered boundary, remaining generated opportunity/adjudication work and next action. Do not recreate the retired scenario-specific path.
- Base: `ae9d144`; implementation remains uncommitted. Migration 0017 adds captured content; it has not been applied. Earlier prototype records remain inspectable with explicit unsupported status.
- Verification: source review only. No builds/tests/lint/runtime checks or live calls. Provider spend $0; cumulative account usage unverified.
