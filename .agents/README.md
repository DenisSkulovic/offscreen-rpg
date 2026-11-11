# Agent knowledge and operating model

Root [`AGENTS.md`](../AGENTS.md) is the short default instruction. [Layer-zero harness architecture](HARNESS.md), [industry evidence](references/industry-practices.md) and [context economics](references/context-economics.md) own the software coding-agent setup, not the in-game agent. The [independent coding-agent target](../docs/engineering/coding-agent-target-standard.md), [curated expert sources](../docs/engineering/coding-agent-knowledge.md) and [evaluation protocol](../docs/engineering/coding-agent-evaluation.md) apply to **development tools**, never in-game Storyteller inference. This directory contains **conditional** rules and **on-demand** skills. The current tool-neutral workflow is [AI development system](../docs/engineering/ai-development-system.md). The product/technical docs remain the specification; agent instructions do not replace them.

## Put knowledge in the correct place

| Kind | Purpose | Loading policy |
| --- | --- | --- |
| `AGENTS.md` | Safety and essential task routing | Small; every agent session |
| `.agents/rules/` | Durable project-specific constraints | Only if the task triggers them |
| `.agents/skills/<name>/SKILL.md` | Repeatable *procedure*, templates and references | Discover description; load body on demand |
| [`.agents/knowledge/`](knowledge/README.md) | Deep professional engineering manuals: concepts, alternatives, trade-offs, interactions and adversarial examples | One relevant domain/section when a consequential decision merits it, never universal startup |
| `docs/` and package READMEs | Product intent, technical contracts, maps and evidence | Read the relevant owner/section |
| `docs/features/<feature>/` | Temporary spec/plan/checkpoint for approved significant work | Current feature only |
| Tests, fixtures, scripts | Executable evidence and safe procedures | Run selectively; inspect side effects |

## Roles and delegation

- [Role orchestration](roles/README.md): responsibility, authority, context isolation, stage gates and economical multi-tool collaboration.
- [Role catalog](roles/catalog.md): specialized design, frontend/backend/data, review, test, observability and integrator roles; not a list of always-on subagents.
- [Role assignments](roles/assignments.md): short, lossless context handoffs and evidence receipts.
- [UI multi-role playbook](roles/playbooks/ui-feature.md): example of ChatGPT + Claude + Cursor role sequencing and selective parallelism.

**Optional native subagents:** `.claude/agents/design-challenger.md`, `.claude/agents/test-strategist.md` (Claude) and corresponding `.cursor/agents/` configurations. Both are explicitly scoped read-only; inspect client-specific loading before using them. The [role catalog](roles/catalog.md) contains many more *conceptual roles* than native agents.

## Conditional rules

- [`working-agreement`](rules/working-agreement.md): scope, handoffs, current lifecycle, responsibilities and Git etiquette; use for material work or ambiguous ownership.
- [`documentation`](rules/documentation.md): documentation structure, source-of-truth and link maintenance; use when docs/navigation change.
- [`domain-design`](rules/domain-design.md): world-independent domain contracts and meaningful fixtures; use for mechanics/domain design.
- [`storyteller`](rules/storyteller.md): task/prompt/context tuning and behavioral comparison; use for Storyteller changes.
- [`verification`](rules/verification.md): safe, proportionate checks; use before choosing checks.
- [`spending`](rules/spending.md): paid model and accounting permissions; required for provider/credit/credential work, never just because code contains an LLM package.
- [`code quality`](../docs/engineering/code-quality.md): relevant sections for implementation and review.

## Skills

- [`test-strategy`](skills/test-strategy/SKILL.md): design falsifiable unit/integration/E2E evidence before an executor writes tests.
- [`role-orchestration`](skills/role-orchestration/SKILL.md): choose narrowly accountable design/investigation/test/implementation roles and handoffs without spawning agents.
- [`harness-audit`](skills/harness-audit/SKILL.md): audit Claude/Cursor/ChatGPT development setup and load behavior, without game code changes.
- [`context-economics`](skills/context-economics/SKILL.md): diagnose development-agent context cost and redundant multi-tool handoffs.
- [`feature-workflow`](skills/feature-workflow/SKILL.md): significant feature from approved intent to finished, documented implementation.
- [`codebase-investigation`](skills/codebase-investigation/SKILL.md): evidence-bounded architecture/source investigation without edits.
- [`architecture-boundary-review`](skills/architecture-boundary-review/SKILL.md): inspect risky package/state/async ownership and propose the smallest defensible design change.
- [`player-experience-design`](skills/player-experience-design/SKILL.md): translate player-intent and runtime states into an inhabitable, testable UI without inventing mechanics.
- [`independent-design-review`](skills/independent-design-review/SKILL.md): challenge the first design with external knowledge and counterexamples before authorizing code.
- [`cursor-handoff`](skills/cursor-handoff/SKILL.md): create one low-context, approved implementation packet for the cheaper coding agent.
- [`frontend-engineering`](skills/frontend-engineering/SKILL.md): React/Next.js correctness, accessibility, state, async races and performance.
- [`transactional-correctness-review`](skills/transactional-correctness-review/SKILL.md): PostgreSQL/Temporal/outbox concurrency, retries and exactly-once effects.
- [`implementation-slice`](skills/implementation-slice/SKILL.md): execute one bounded, already specified coding task (ideal for Cursor).
- [`diff-review`](skills/diff-review/SKILL.md): independent review against intended behavior and failure paths.
- [`documentation-reconciliation`](skills/documentation-reconciliation/SKILL.md): repair contradictions, navigation and unnecessary verbosity.
- [`storyteller-tuning`](../docs/skills/storyteller-tuning/SKILL.md): exact-packet evaluation and targeted Storyteller quality changes.

Cursor discovers project skills from `.agents/skills/` directly. Claude loads the adapters under `.claude/skills/`, which point to the same canonical skills. Discoverability should be smoke-tested in each installed client; direct path invocation remains valid if discovery misses a skill.

## Safe commands (inspect when relevant)

- `pnpm repo:brief [--checkpoint]`: current Git state, progress and current feature; read-only, no provider call.
- `pnpm repo:docs-health [--json]`: read-only feature-checkpoint word/byte report. Use during maintenance, not as a startup ritual.
- `pnpm infra -- <args>`: local Docker compose wrapper; infrastructure changes are not automatic.
- `pnpm test:focus -- <suite> [test-name]`: targeted offline integration, **resets the disposable test DB**; use only with that side effect understood.
- `pnpm db:baseline`: rewrites the disposable POC baseline migration; review the result.
- `pnpm db:reset:test`: destroys and recreates only the designated test database.
- `pnpm story:local` / `pnpm chamber`: interactive Story mode and fixture harness; check explicit provider opt-in and run mode before use.

Do not require every new agent to run all commands or read the whole index. The next task determines the route.
