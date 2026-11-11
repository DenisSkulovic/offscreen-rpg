---
name: harness-audit
description: Audit, troubleshoot and redesign Offscreen RPG's coding-agent harness: AGENTS.md, Claude/Cursor rules and skills, context routing, expert sources and handoffs. No gameplay code changes.
---

# Coding-agent setup audit

Trigger only for **coding-agent environment** tasks or observed skill/rule/context problems, never runtime Storyteller tuning.

1. Start with the independent standard in [coding-agent target](../../../docs/engineering/coding-agent-target-standard.md) and the [harness architecture](../../HARNESS.md). Use a relevant [primary-source entry](../../references/industry-practices.md); don't simply look at the existing config and "improve" it randomly.
2. Inspect which files **automatically** load vs which are merely discoverable: `AGENTS.md`, actual `CLAUDE.md` `@AGENTS.md` import, Cursor `alwaysApply`/description/globs, `.agents/skills` and `.claude/skills` adapters. Note client-version unknowns rather than inventing behavior.
3. Diagnose one observed problem: duplicate always-on policy, bad skill trigger, missing expert knowledge, wrong spec routing, stale docs, repeated reads or unexpectedly expensive tool setup. Compare at least the keep-current and targeted-change alternatives.
4. Edit only the **smallest harness-owned surface**. Do not modify `apps/`, `packages/`, game billing/prompt code, or product intent without separate explicit scope. Skills are not decorative; avoid adding more without a distinct trigger.
5. Validate paths and frontmatter, show exactly what becomes eager vs conditional, and give a real-client smoke test to verify discovery. Static Markdown checks cannot establish actual cost or behavior.

Deliver `finding | independent source | before/after loading | changed harness assets | unverified client behavior | one next measurement`. If the issue is a wrong product design, use `independent-design-review`; if code needs changing, provide a separate approved handoff.
