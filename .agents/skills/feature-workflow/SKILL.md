---
name: feature-workflow
description: Design, phase, implement or review a significant Offscreen RPG feature or cross-component rework with persistent handoff documents. Use for substantial behavior or architecture changes; routine fixes and simple documentation edits need no feature folder.
---

# Feature workflow

Read the repository entrypoint and relevant rules. Use docs/features/<descriptive-kebab-case-name>/FEATURE.md and PLAN.md for one significant change. Search for an existing active feature before creating another. Read only the current feature and the product/technical material it touches.

## Shape the feature

Trace an actual user flow and inspect the current implementation. Distinguish the user's brainstorming from requirements. Explain worthwhile alternatives and consequential unknowns; do not translate each example into a new subsystem.

Draft FEATURE.md using [the feature template](assets/FEATURE.md). Make scope and acceptance observable enough for the owner to recognize the intended product. Include a representative playthrough and relevant unavailable/late/retry behavior. Technical-only reworks instead describe the maintainer/developer outcome and invariants; do not invent player features.

Keep the document a focused proposal. Ask the user to agree the vision before bulk implementation, unless they already explicitly approved this same scope. Record the actual approval and its scope in the current status, never infer approval from silence. Preparing this proposal and plan is not permission for paid calls or deployment.

## Establish the technical contract and phases

Once the vision is agreed, update the owning product documents, then the relevant technical documents. Their current text becomes the maintained specification; link it from FEATURE.md rather than copying it. Preserve the honest distinction between intended and implemented behavior.

Use [the plan template](assets/PLAN.md). Each phase needs a concrete outcome, owning components, dependencies, bounded edits, acceptance/checks and an exit condition. Size phases so a fresh coding chat can implement and verify one without understanding the entire repository. Separate independently reviewable responsibilities, while keeping transactions or inseparable contract changes coherent.

Put executable detail only in the nearest ready phase. Later phases need enough scope to prevent drift, not speculative function-by-function designs. Resolve material data ownership, async/retry and authorization questions before a dependent phase starts.

For this project, default to preparing the implementation handoff for Cursor. Codex reviews/designs unless the user asks it to implement. Do not dispatch another tool or agent yourself.

## Execute an authorized phase

Read its checkpoint, inspect Git status and confirm assumptions against code. Identify existing behavior to preserve and intentional changes. Implement one coherent phase. Checks are optional during the POC lifecycle under the verification rule; if requested or directly useful, batch only the selected checks after the code. Do not chase green results or let minor issues prolong the work.

Review the diff and trace the main path plus relevant failure/retry behavior. A green check is not proof of good design. If blocked, fix within the agreed scope or narrow the next action; do not mark the phase complete or keep expanding the task.

After each phase, update PLAN.md's current checkpoint and docs/progress.md where project status changed. Record actual commands/results and any limits, not raw terminal output. Move on to the next authorized phase when its dependencies pass. Do not add an approval ritual after every phase; pause only for a material scope/design decision or an explicit review boundary.

## Review and finish

A reviewer compares the actual diff with approved acceptance, documentation and behavioral evidence. Report concrete defects with locations, consequences and a focused repair/check. Distinguish regressions, unfinished planned work and pre-existing debt. Do not certify untested behavior or create a separate review.md.

A feature is complete when its agreed implementation scope is delivered, significant known blockers are resolved and permanent docs reflect the result. During the POC lifecycle, passing checks is not a completion gate; distinguish implemented behavior from verified behavior and record minor follow-ups without delaying handoff. Fold useful explanations into the owning docs. Remove finished FEATURE.md/PLAN.md and their folder when they serve no continuing purpose; Git retains history. Keep docs/features/README.md a current index, not a completed-work ledger.

For interruption or handoff, leave only the latest checkpoint: phase, base/reviewed revision, working changes, verification, unresolved questions and exact next action. Resume from that state rather than regenerating the plan.
