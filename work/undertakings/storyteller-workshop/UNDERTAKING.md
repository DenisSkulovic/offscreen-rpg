# Storyteller Workshop

**State:** Active  
**Branch:** `undertaking/storyteller-workshop`  
**Started:** 2026-11-21  
**Integration base:** `main` at `34e2b4fd8d9d9967e13311da3a938460b1a02244`

## Purpose

Re-found the Storyteller from a prompt-shaped component into a disciplined **writing system**: it has durable sources and a persistent Library, a bounded writer's workdesk, explicit research assistance, coherent scene publication, fork-aware active fictional state and a clean creation path from one prompt into an actual playable campaign.

**Storyteller Workshop** is intentionally broader than “Storyteller docs” and more specific than “Storyteller evolution.” The undertaking names the shared transformation that the WR/WRD Changes collectively serve.

## What belongs here

The current Writer program is the core constituent set:

| Work | Role in the undertaking | Current disposition at undertaking start |
| --- | --- | --- |
| WR01 | Accept Storyteller and fork product contract | Done / archived |
| WRD02 | Persistent Library technical contract | Done / archived |
| WRD03 | Engine fork technical contract | Done / archived |
| WRD04 | Wiki navigation and validation reconciliation | Done / archived |
| WR02 | Persistent Library and source identity implementation | **Done / archived** |
| WR03 | Agentic writer's workdesk | Proposed |
| WR04 | Delegated bounded writer research | Proposed |
| WR05 | Coherent scene publication | Proposed |
| WR06 | Fork active fictional state | Proposed |
| WR07 | One-prompt launch backend | Proposed |
| WR08 | One-prompt client and integrated acceptance | Proposed |

The existing [Writer implementation program](../changes/WRITER-IMPLEMENTATION-2026-11-21.md) remains the detailed sequencing owner. This undertaking does not replace it.

## Integration provenance

This branch descends from the four-commit squashed integration previously named `storyteller-evolution-consolidated`.

That integration intentionally absorbed two noisy source histories without replaying them into the new branch:

- Storyteller documentation snapshot: `d500f8ceb0eee7c8f82c8ff5f2cc02273da86639` from the former `storyteller-evolution-electric-boogaloo` branch.
- Repository/design retirement snapshot: `f6d860301f098eb6b0dd326ebef99f8cbb1de4b5` from the former `maintenance/retire-work-graveyard-2026-11-21` branch.

The squashed integration commits preserve exact provenance back to those source SHAs. The old branch names are therefore not required for ongoing work once branch cleanup is complete.

## Explicit exclusions

This undertaking is **not** a generic bucket for every open Offscreen RPG packet. In particular, unrelated distributed-runtime/Kubernetes work, broad player-experience refoundation, economy/spatial/lifecourse proposals and repository-agent experiments do not join merely because they touch adjacent files.

If a prerequisite outside this scope is discovered, reference it as a dependency. Do not silently annex its entire program.

## Exit conditions

Move this Undertaking to **Landing** when:

1. the selected WR02–WR08 implementation scope intended for this wave has reached explicit terminal or intentionally deferred dispositions;
2. permanent product/technical docs describe the accepted result without relying on the Undertaking dossier as authority;
3. `work/QUEUE.md`, `STATUS.md`, `ROADMAP.md` and relevant ledgers no longer contain contradictory state;
4. repository health/tests required by the affected Changes are green or failures are explicitly documented;
5. no temporary source branch contains unique unreconciled work.

Close it when the coherent branch is merged to `main` or explicitly abandoned. Then delete `undertaking/storyteller-workshop` and remove this active dossier after preserving a compact disposition in Git history. Do not leave a permanent “completed undertaking” graveyard in HEAD.

## Branch policy for this undertaking

Target **long-lived** topology after Change integration: **two branches only**:

- `main`
- `undertaking/storyteller-workshop`

**Every commissioned WR Change MUST use one short-lived Change branch** created from the then-current `undertaking/storyteller-workshop` HEAD before implementation. Branch names: `change/wr02-library`, `change/wr03-workdesk`, `change/wr04-research`, `change/wr05-publication`, `change/wr06-fork`, `change/wr07-launch`, `change/wr08-client`. Parent and its children work within that branch without per-T-ID branches. A distinct worktree is optional when no other checkout is active. When accepted, squash-integrate into `undertaking/storyteller-workshop`, verify, and delete the temporary branch/worktree. `main` is reserved for the later Undertaking landing. These transient Change branches do not contradict the two-long-lived-branches policy.
