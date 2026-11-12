---
name: cursor-handoff
description: Translate a settled Offscreen RPG product/technical decision and bounded code-bearing Change/PLAN into one economical, bounded Cursor coding-agent instruction with precise context anchors and verification. No implementation.
---

# Cheap executor handoff: approved specification to Cursor

**Trigger:** Product intent and technical ownership are settled, and the next ready implementation slice should be executed by a faster/cheaper coding agent. This skill prepares the **handoff only**; it does not implement, redefine or automatically dispatch it.

## Source of truth

Use the approved product contract, owning technical section, selected CHANGE.md/PLAN checkpoint (if any) and the small relevant source map. If these conflict, **stop and identify the contradiction**. Do not make Cursor choose product policy by improvising.

Have ChatGPT do the expensive design and wide source investigation before paying a cheap Cursor model. For frontend use the [source atlas](../../../docs/engineering/frontend-execution-playbook.md#6-source-atlas-for-w01w21) to provide 2–5 real paths, named symbols, known API contract and discriminating negative case. Cursor rechecks those anchors locally, widening only for a concrete contradiction. Reuse the selected Change packet. A legacy initiative's FEATURE/PLAN is context, **not** an executable spec by itself. Do not generate a second plan for every small slice.

## Deliver this bounded packet

```text
ROLE: Cursor executor. Implement exactly one approved slice. No product redesign.
GOAL: [observable changed behavior; identify user/developer outcome]
AUTHORITY: [permanent product file + heading]; [technical file + heading]; [PLAN/checkpoint if applicable]
BASELINE: [actual existing behavior / known source revision]; verify changed files before editing
START HERE: [2-5 source files or symbols; inspect nearest callers/tests only as needed]
IMPLEMENT: [essential invariants, contract fields, happy path and critical failure/retry]
KEEP: [existing behaviors/exports that must remain unchanged]
DO NOT: [specific excluded work, no extra modules or wholesale formatting, no paid providers / destructive actions]
VERIFY STAGE: [V0 local editing; V1 sub-slice; V2 Change closure; V3 integration; no global build per save]
PROVE: [one cheap precise check plus one negative case; explicit side effects if any]
RETURN: [diff/files; actual checks and failures; contract mismatches; remaining risks; exact next step]
```

**Economics:** Don't paste hundreds of lines of unchanged specs or code into Cursor. Link the exact headings and source symbols. Don't require a global repository scan, all tests, multi-agent reviews, new architecture, or extra documentation artifacts without a reason. Avoid parallel implementation agents editing the same owner. If a slice needs too much context, **split by accepted outcome**, not arbitrary file/line count.

**Authority:** Cursor may decide local implementation details, but must stop if it needs to change user experience, technical ownership, data semantics, model spend, or verification authorization. Preserve existing worktree changes. It must not silently commit/push unless the actual task explicitly delegates Git writes.

**Receipt:** Report changed files, check commands/results and remaining uncertainty. Green tests do not certify aesthetics or full gameplay. After review, reconcile permanent documentation and rewrite the temporary checkpoint instead of accumulating an activity diary.

For substantial design work **before** this handoff, invoke `independent-design-review`; for implementation itself, Cursor follows `implementation-slice`.
