---
name: context-economics
description: Analyze expensive Claude Code, Cursor or ChatGPT coding-agent sessions, redundant file loading, skill collisions, context compaction and paid role handoffs. Excludes in-game model token costs.
---

# Coding-agent context cost review

Load [context economics](../../references/context-economics.md) for a concrete software-development task whose token expense, long session, redundant reads or poor handoff needs diagnosis. **Not** in-game Storyteller budgets.

- Input: actual task, any session/usage reports, loaded instruction/skill view, file reads, handoff and rework. Missing token/cost facts remain **unknown**.
- Classify repeated cost: startup, unnecessary investigation, compounding history, cross-tool handoff or defects/rework. Avoid mistaking a useful deep investigation for waste.
- Check for duplicated eager instructions and skill description collisions, exhaustive whole-file reads, forced multi-model reviews, and an executor re-deriving specs from code.
- Recommend at most **three ranked changes** with their risks: smaller eager entry; better conditional trigger; heading/symbol pointers; fresh context at task change; a better Cursor task; fewer redundant reviewers; deterministic test.
- Preserve the exact product/technical contract and safety boundaries. Do not impose an arbitrary read budget that prevents correctness.
- Specify one comparable before/after experiment using reported usage, human time, spec adherence and rework.

Deliver `bottleneck evidence | likely cause | smallest fix | expected benefit as hypothesis | measurement to validate or disprove`. Use `harness-audit` for actual setup edits.
