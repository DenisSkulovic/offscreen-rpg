# Offscreen RPG | Coding-agent entry

**Audience:** AI agents helping developers research, specify, write, test and review this repository. These are NOT operating instructions for the game's in-world Storyteller. Optimize development decisions and context consumption, not runtime inference, unless specifically asked.

This is a persistent-story RPG with **deterministic mechanical authority** and an LLM Storyteller. The repository is a pre-POC, not a proven product. Be honest about what is designed, implemented, exercised with fixtures, observed live, and accepted by a human.

**Current owner priority (November 2026):** [engineering portfolio renewal](TODO.md). Finish the Change workflow and legacy planning cleanup before taking on focused frontend/backend/UX/architecture improvements. Gameplay development and the older continuity proposal are intentionally deferred; their appearance in progress/history is not implementation permission.

## Non-negotiable boundaries

- **Intended truth:** product docs say *what/why*; technical docs say *authority, invariants and failure semantics*; code and tests show *what is currently implemented*. Never quietly alter a requirement to make code look correct. Reconcile discrepancies at the owning layer.
- **Game authority:** the model proposes narrative, options and bounded document changes. Application/game logic owns rules, dice, time, persistence, permission, publication and billing. Preserve state, idempotency and retry fences.
- **No surprising side effects:** never invoke live AI providers, spend credit, turn on auto-retries, deploy, migrate non-disposable data, reset a database, read/expose secrets, or launch broad/destructive operations without explicit task-specific authority. A local API key is not authorization. See `.agents/rules/spending.md` for provider-facing work.
- **One bounded slice:** respect the requested scope and working tree; do not start extra agents or unrelated cleanup. Report unknowns rather than inventing evidence. Don't claim a check or game run occurred unless it did.

## Choose context by task, not by ritual

- **Coding-agent harness, skills, token cost or development process:** start with `.agents/HARNESS.md` and the relevant `.agents/references/` section. This is a *developer-tooling* task; it does **not** authorize edits to game implementation, Storyteller prompts or provider billing.
- **Where are we?** `docs/progress.md` and `pnpm repo:brief` when resuming or disoriented; `docs/README.md` routes product and technical topics. Don't run the brief for a trivial known edit.
- **What does the implementation do?** `docs/engineering/code-navigation.md` and the relevant package README, then trace the relevant source/callers. Don't load the full repository map for a local edit.
- **New code-bearing work:** agree affected product intent (if changed), then the technical contract, before implementation. A bounded **Change** must have a real intended source/test/executable-config delta and falsifiable acceptance; a design review, docs-only cleanup or test run is not a Change. See [work-unit standard](.agents/references/change-work-unit-standard.md) and the legacy-path `.agents/skills/feature-workflow/SKILL.md` for significant changes.
- **Complex work needing several perspectives:** select a responsible role and optional review roles from `.agents/roles/README.md`. Roles define responsibility; skills provide method; agents/chats isolate context. Suggest another chat/subagent only when it adds independent evidence or judgment. No automatic extra agents or permissions.
- **Investigate, implement, review or reconcile:** use the appropriately scoped skill in `.agents/skills/` when it improves the task. Skills are optional procedures, not required reading on every turn.
- **Before code changes:** consult the relevant sections of `docs/engineering/code-quality.md`. **Before checks:** consult `.agents/rules/verification.md`. **Before docs/navigation changes:** consult `.agents/rules/documentation.md`.

## End-of-slice report

State: changed files/outcome; checks actually run and their results; important gaps; next concrete action; whether paid model calls occurred. Keep it brief. The [independent coding-agent target](docs/engineering/coding-agent-target-standard.md), [current workflow](docs/engineering/ai-development-system.md), and [expert knowledge index](docs/engineering/coding-agent-knowledge.md) define how development agents collaborate. Do not load them all for a small task.
