---
name: feature-workflow
description: Carry a significant Offscreen RPG feature or refactor from agreed intent through technical design, bounded implementation, convergence and handoff; not for small fixes.
---

# Significant feature workflow

Use one existing or new `docs/features/YYYY-MM-DD--HH-mm--descriptive-name/` workspace with `FEATURE.md` and `PLAN.md`. Existing templates: [`FEATURE`](assets/FEATURE.md), [`PLAN`](assets/PLAN.md). Keep the initial timestamp. Do not make a new dossier for a two-line bug fix, or accumulate duplicate feature folders.

## 1. Specify the outcome

Start from the **player/developer behavior**, not a component idea. Trace the relevant current flow and contrast it with one representative desired flow. Write acceptance that is observable: expected state and narration, unhappy path, interruption/retry, cost where relevant. Record alternatives and consequential uncertainty, without turning examples into universal requirements. Ask for a product decision only if not already authorized.

`FEATURE.md` is a **temporary decision/handoff artifact**, not a second product specification. After agreement, update permanent product docs at their owners. Keep status explicit: proposal, approved scope, implementation, evidence.

## 2. Establish technical ownership

Update the owning technical contract with state and data authority, API/operation boundaries, failure/retry/idempotency, cost/security limits and affected interfaces. Trace real code before finalizing a technically exact plan. Reject proposals that solve one seam by duplicating authority in another. Prefer small modifications to an established owner over speculative framework growth.

## 3. Plan independently reviewable slices

`PLAN.md` describes dependency-ordered outcomes. Each ready slice names owning files/areas, preserved behavior, concrete edit, acceptance and **smallest useful verification**. Keep future slices coarse; add implementation detail when they become next. Avoid giant handoffs listing every possible file. Identify the one next executable slice and its prerequisites. For a coding-agent handoff, follow [`implementation-slice`](../implementation-slice/SKILL.md).

## 4. Implement, verify and reconcile

Implement one approved slice, inspect actual diff, run risk-proportionate provider-free checks, and compare against acceptance. No automatic new feature, independent subagent, broad cleanup or paid inference. A discrepancy between product and code is a defect to diagnose, not permission to reduce the specification. Human gameplay evidence is needed for claims about fun, pacing and atmosphere.

## 5. Checkpoint, converge, retire

After each material slice, rewrite `PLAN.md`'s `## Current checkpoint`: phase, inspected revision, what changed, observed checks and limits, blocker, exactly next action, spend. Update `docs/progress.md` only when capability/evidence genuinely changed. The reviewer can use [`diff-review`](../diff-review/SKILL.md) to compare code to feature acceptance and technical invariants.

Completion requires planned scope, durable documentation and a truthful evidence receipt. Do not keep finished feature folders as an archive: fold enduring decisions into permanent docs, preserve outstanding questions in the right owner, update links and retire the folder. Preserve explicit owner-retained dossiers. Git holds history.
