# Implementation plan

Feature: [Mid-story storyteller customization and locked settings](FEATURE.md).
Execution scope: all phases authorized by the owner on 2026-09-18.
Implementation owner: Codex, explicitly assigned by the owner.

## Phases

### Phase 1: revisions, compilation and commands (next ready)

Dependencies: existing profiled runtime; can be implemented independently of dice. Owners: db, server settings operation, contracts and AI context compilation. Follow technical/story-settings.md for exact revision fields, limits, precedence and command semantics. Inspect `storyteller-start.ts`, `storyteller-admission.ts` and publication fences. Capture a settings revision in every new task, with mechanical offer terms pinned separately. Saving settings changes view/settings revision, not narrative revision or in-flight task inputs. Exit: explicit settings updates preserve valid pending publication and lock policy.

### Phase 2: editor, private presets and creation lock

Depends on phase 1. Owners: owned API endpoints, story creation/play UI and public settings projection. Implement structured effective-preview form, tags/snippets, apply/save-own-preset and creation-time locked-fields summary. A preset switch replaces creative defaults; explicit campaign risk/clock changes remain separate. Catalogue descriptions are a convenience, not an exhaustive creative vocabulary. Exit: player switches tone during a saved story, sees its effective boundary and can return to a prior private preset.

Optional evidence: saved-revision/retry example, pending-generation switch and server-rejected locked update if directly useful. No provider call is needed to exercise this feature.

## Current checkpoint

Follow the [shared implementation checkpoint](../dnd-checks-and-visible-outcomes/PLAN.md). Base is `a77fe13`; the tick/retry correction is uncommitted. The database has one current baseline migration and it has not been applied. Six source-only clock tests passed; no application/build checks or live calls ran. This feature remains partial. Provider spend $0; cumulative usage unverified.
