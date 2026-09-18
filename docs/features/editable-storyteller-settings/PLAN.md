# Implementation plan

Feature: [Mid-story storyteller customization and locked settings](FEATURE.md).
Execution scope: all phases authorized by the owner on 2026-09-18.
Implementation owner: Codex, explicitly assigned by the owner.

## Phases

### Phase 1: revisions, compilation and commands (next ready)

Dependencies: existing profiled runtime; can be implemented independently of dice. Owners: db, server settings operation, contracts and AI context compilation. Follow technical/story-settings.md for exact revision fields, limits, precedence and command semantics. Inspect `storyteller-start.ts`, `storyteller-admission.ts` and publication fences. Backfill profiled stories from their stored profile, not catalogue defaults; retain legacy fixture behavior. Capture a settings revision in every new task, with mechanical offer terms pinned separately. Saving settings changes view/settings revision, not narrative revision or in-flight task inputs. Exit: explicit settings updates preserve valid pending publication and lock policy.

### Phase 2: editor, private presets and creation lock

Depends on phase 1. Owners: owned API endpoints, story creation/play UI and public settings projection. Implement structured effective-preview form, tags/snippets, apply/save-own-preset and creation-time locked-fields summary. A preset switch replaces creative defaults; explicit campaign risk/clock changes remain separate. Catalogue descriptions are a convenience, not an exhaustive creative vocabulary. Exit: player switches tone during a saved story, sees its effective boundary and can return to a prior private preset.

Optional evidence: saved-revision/retry example, pending-generation switch and server-rejected locked update if directly useful. No provider call is needed to exercise this feature.

## Current checkpoint

- Status: connected authored mechanical slice implemented; full feature acceptance remains partial. The shared resolver and consequence narrator now use captured action content and the existing execution/publication/retry lifecycle.
- Follow the [current repair checkpoint](../dnd-checks-and-visible-outcomes/PLAN.md) for the delivered boundary, remaining generated opportunity/adjudication work and next action. Do not recreate the retired scenario-specific path.
- Base: `ae9d144`; implementation remains uncommitted. Migration 0017 adds captured content; it has not been applied. Earlier prototype records remain inspectable with explicit unsupported status.
- Verification: source review only. No builds/tests/lint/runtime checks or live calls. Provider spend $0; cumulative account usage unverified.
