# Agent configuration

Shared rules live in rules/; reusable procedures live in skills/. Root AGENTS.md is a small router, not the rule library. CLAUDE.md, the Cursor rule and Copilot instructions point here rather than holding separate policies.

Always read [Working agreement](rules/working-agreement.md) and [Spending](rules/spending.md). Read [Verification](rules/verification.md) when choosing checks and [Code quality](../docs/engineering/code-quality.md) for implementation/review. Use [feature-workflow](skills/feature-workflow/SKILL.md) for significant work.

For substantial Storyteller context, retrieval, memory, tooling, orchestration, tracing or evaluation work, use the [agentic systems field manual](../docs/engineering/agentic-systems-field-manual.md) as an evolving research reference. It is not a fixed architecture or exhaustive authority.

Add a focused rule only when a lasting decision needs it. Add a skill for a repeatable procedure with a clear trigger. Keep detail with its owner and link it; do not duplicate policies into every tool or create dozens of empty categories.

Codex/Cursor use the shared skill location. Claude has a thin skill adapter that reads the same procedure. If tool discovery is unavailable, ask the agent to read the skill path explicitly; the workflow must remain usable as plain Markdown. Native tool discovery has not been smoke-tested in each installed application.

## Repeated repository operations

Use the checked-in commands instead of reconstructing their Windows/database safety steps:

- `pnpm repo:brief` prints compact Git, product-route and prepared-feature checkpoints for fresh-context orientation. It supplements, and does not replace, the entrypoint's required rule reads.
- `pnpm infra -- <compose arguments>` finds Docker Desktop's CLI on this workstation even when it is missing from `PATH`. `infra:up` and `infra:down` use the same wrapper.
- `pnpm db:baseline` replaces the one generated pre-POC migration and restores the prior files if generation fails. Review the resulting schema diff before commit.
- `pnpm db:reset:test` recreates only `offscreen_auth_test` and applies the baseline.
- `pnpm test:focus -- <suite> "optional test name"` builds the integration workspace, resets that disposable database and runs one named offline suite/file. It is an explicit optional check, not a start-of-turn ritual.

These commands do not commit, push, repair Docker Desktop or authorize model calls. The focused integration command explicitly removes provider credentials and live opt-in from its build/test environment. Add another helper only after the same safe procedure has been repeated enough to justify maintaining it.

Directory conventions follow [Cursor's skill documentation](https://prod.cursor.com/docs/skills) and [Claude's project skill documentation](https://code.claude.com/docs/en/skills). Adapters contain routing only; edit the canonical skill when changing the procedure.
