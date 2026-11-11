# Coding-agent harness: primary-source research ledger

**Reviewed:** 2026-11-11. This research concerns **developer coding agents**, not the game's narrative agent. These are cited *techniques*, not proof that our configuration is optimized. Recheck a source only when a task depends on its current client behavior.

| Verified source | Expert practice | Our local harness decision and caution |
| --- | --- | --- |
| [OpenAI Harness Engineering](https://openai.com/index/harness-engineering/) | Small `AGENTS.md` table of contents, indexed repository truth, enforceable rules and recurring documentation gardening | Root instruction is navigation; permanent specs own design; prune stale agent docs instead of copying the whole repo into context |
| [Claude Code best practices](https://code.claude.com/docs/en/best-practices) | Short project memory, scoped rules, on-demand skills and checks that are actually enforceable | Keep Claude's import bridge small; put specialist procedure in skills, not always-on text; don't call review agents for trivial work |
| [Claude Code memory](https://code.claude.com/docs/en/memory) | `@path` imports, `AGENTS.md` support with version/config nuances, `.claude/rules/` path scoping, `/context all`, `/doctor prompt-audit` | Explicit `@AGENTS.md` bridge avoids relying on a specific client version; no symlinks on Windows; verify discovery in a real session |
| [Claude Code costs](https://code.claude.com/docs/en/costs) | Context accumulates across turns; `/clear` on new task, `/compact` on continuing long task; cost/usage and MCP/subagent overhead | Avoid long mixed-purpose Claude sessions; record usage *when surfaced*, not invented marginal charges for subscriptions |
| [Claude Code skills](https://code.claude.com/docs/en/skills) | `.claude/skills/` are discoverable, advertised by description; body loads on use | Thin Claude adapters link to portable `.agents/skills/`; do not duplicate complete skill manuals |
| [Cursor rules](https://cursor.com/docs/rules) | `AGENTS.md` is recognized; `.cursor/rules` includes always-on, description-matched, path and manual rules | Do not load a redundant always-on `project.mdc`; make setup-specific guidance description-matched |
| [Cursor skills](https://cursor.com/docs/skills) | Project `.agents/skills/` skills are available on demand; compatible `.claude/skills/` can also be discovered | Canonical portable directory is `.agents/skills/`. **Potential duplicate skill discovery** through Claude adapters remains to test in installed Cursor before claiming a saving |
| [Agent Skills specification](https://agentskills.io/specification) | Frontmatter name/description; supplementary references loaded only when needed | Keep short, precise skill triggers and stable path links. Do not create vague "expert" skills that contribute no knowledge |
| [GitHub Spec Kit](https://github.github.com/spec-kit/) | Specification, plan, task and convergence are distinct useful steps; bug fixing and idea assessment may start independently | Borrow the intent-first process; do **not** install or duplicate the whole Spec Kit bureaucracy on top of our existing product and technical owners |

## Claims we can and cannot make

**Documented externally:** the listed client file-discovery semantics, memory loading, rules/skills distinction, supported context/cost commands and spec-driven procedure.

**Our independent design:** ChatGPT decides and challenges, Claude grounds difficult questions in source when necessary, Cursor executes a settled slice. This allocation is plausible and matches the owner's costs/preferences; it is not an empirically established universal best practice.

**Unverified:** whether Cursor de-duplicates same-named portable and Claude-adapter skills; which skills its current version autoloads; whether our handbook saves actual tokens; whether any chosen skill improves code quality. These require task-scoped smoke tests, not more theory.

**Reject:** mandatory reading of every handbook, automatic parallel reviewers, whole-repo context dumps, full Spec Kit installation, careless copied third-party skills and automatic harness expansion after every error. Specific documented problems should trigger targeted changes. Third-party text remains linked and paraphrased, not copied wholesale.
