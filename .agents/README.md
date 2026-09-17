# Agent configuration

Shared rules live in rules/; reusable procedures live in skills/. Root AGENTS.md is a small router, not the rule library. CLAUDE.md, the Cursor rule and Copilot instructions point here rather than holding separate policies.

Always read [Working agreement](rules/working-agreement.md) and [Spending](rules/spending.md). Read [Verification](rules/verification.md) when choosing checks and [Code quality](../docs/engineering/code-quality.md) for implementation/review. Use [feature-workflow](skills/feature-workflow/SKILL.md) for significant work.

Add a focused rule only when a lasting decision needs it. Add a skill for a repeatable procedure with a clear trigger. Keep detail with its owner and link it; do not duplicate policies into every tool or create dozens of empty categories.

Codex/Cursor use the shared skill location. Claude has a thin skill adapter that reads the same procedure. If tool discovery is unavailable, ask the agent to read the skill path explicitly; the workflow must remain usable as plain Markdown. Native tool discovery has not been smoke-tested in each installed application.

Directory conventions follow [Cursor's skill documentation](https://prod.cursor.com/docs/skills) and [Claude's project skill documentation](https://code.claude.com/docs/en/skills). Adapters contain routing only; edit the canonical skill when changing the procedure.
