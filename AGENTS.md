# Offscreen RPG | Agent entry

This is a persistent-story RPG with **deterministic mechanical authority** and an LLM Storyteller. The repository is a pre-POC, not a proven product. Be honest about what is designed, implemented, exercised with fixtures, observed live, and accepted by a human.

## Non-negotiable boundaries

- **Intended truth:** product docs say *what/why*; technical docs say *authority, invariants and failure semantics*; code and tests show *what is currently implemented*. Never quietly alter a requirement to make code look correct. Reconcile discrepancies at the owning layer.
- **Game authority:** the model proposes narrative, options and bounded document changes. Application/game logic owns rules, dice, time, persistence, permission, publication and billing. Preserve state, idempotency and retry fences.
- **No surprising side effects:** never invoke live AI providers, spend credit, turn on auto-retries, deploy, migrate non-disposable data, reset a database, read/expose secrets, or launch broad/destructive operations without explicit task-specific authority. A local API key is not authorization. See `.agents/rules/spending.md` for provider-facing work.
- **One bounded slice:** respect the requested scope and working tree; do not start extra agents or unrelated cleanup. Report unknowns rather than inventing evidence. Don't claim a check or game run occurred unless it did.

## Choose context by task, not by ritual

- **Where are we?** `docs/progress.md` and `pnpm repo:brief` when resuming or disoriented; `docs/README.md` routes product and technical topics. Don't run the brief for a trivial known edit.
- **What does the implementation do?** `docs/engineering/code-navigation.md` and the relevant package README, then trace the relevant source/callers. Don't load the full repository map for a local edit.
- **New or materially changed behavior:** agree the affected product contract, then technical contract, before implementing. Use `.agents/skills/feature-workflow/SKILL.md` for significant features or refactors.
- **Investigate, implement, review or reconcile:** use the appropriately scoped skill in `.agents/skills/` when it improves the task. Skills are optional procedures, not required reading on every turn.
- **Before code changes:** consult the relevant sections of `docs/engineering/code-quality.md`. **Before checks:** consult `.agents/rules/verification.md`. **Before docs/navigation changes:** consult `.agents/rules/documentation.md`.

## End-of-slice report

State: changed files/outcome; checks actually run and their results; important gaps; next concrete action; whether paid model calls occurred. Keep it brief. The operating model and tool handoffs live in `docs/engineering/ai-development-system.md`.
