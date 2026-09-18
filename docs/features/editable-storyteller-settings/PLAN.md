# Implementation plan

Feature: [Mid-story storyteller customization and locked settings](FEATURE.md).
Execution scope: documentation/handoff only so far; implementation awaits an instruction to proceed.
Implementation owner: Cursor by default; reviewer: Codex.

## Phases

### Phase 1: revisions, compilation and commands (next ready)

Dependencies: existing profiled runtime; can be implemented independently of dice. Owners: db, server settings operation, contracts and AI context compilation. Follow technical/story-settings.md for exact revision fields, limits, precedence and command semantics. Inspect `storyteller-start.ts`, `storyteller-admission.ts` and publication fences. Backfill profiled stories from their stored profile, not catalogue defaults; retain legacy fixture behavior. Capture a settings revision in every new task, with mechanical offer terms pinned separately. Saving settings changes view/settings revision, not narrative revision or in-flight task inputs. Exit: explicit settings updates preserve valid pending publication and lock policy.

### Phase 2: editor, private presets and creation lock

Depends on phase 1. Owners: owned API endpoints, story creation/play UI and public settings projection. Implement structured effective-preview form, tags/snippets, apply/save-own-preset and creation-time locked-fields summary. A preset switch replaces creative defaults; explicit campaign risk/clock changes remain separate. Catalogue descriptions are a convenience, not an exhaustive creative vocabulary. Exit: player switches tone during a saved story, sees its effective boundary and can return to a prior private preset.

Optional evidence: saved-revision/retry example, pending-generation switch and server-rejected locked update if directly useful. No provider call is needed to exercise this feature.

## Current checkpoint

- Current phase: design ready; implementation has not started. Next action: when assigned implementation, read phase 1 dependencies and current working changes, then implement that slice.
- Base: existing uncommitted storyteller runtime implementation; no isolated clean revision is claimed. Preserve staged and unstaged work. Existing admission captures one profile; generated continuations have no mechanical effects.
- Checks: none run for this documentation work. Checks are optional under [verification policy](../../../.agents/rules/verification.md), never a phase completion gate. Acceptance describes behavior to deliver, not a mandatory test suite.
- Blockers: dependencies listed per phase; broader edition/combat decisions do not block the bounded subset.
- Provider spend: $0; cumulative account usage unverified. Live inference remains disabled.
