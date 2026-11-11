# Coding-agent expertise and primary-source index

**Purpose:** a navigation library for **software coding agents**, not the runtime Storyteller. Reviewed 2026-11-11. Load only the section relevant to a design decision. These sources are starting references, not immutable truths or permission to change agreed product behavior.

## Deep professional knowledge (on demand)

[Engineering knowledge packs](../../.agents/knowledge/README.md) hold **mechanistic know-how and decision spaces**, not just procedures or a list of common bugs. They let an architect, implementer, designer or reviewer retrieve the relevant body of expertise before generating a plausible but under-considered recommendation. Start with [architecture design choices](../../.agents/knowledge/architecture-decision-space.md), [visual interface design](../../.agents/knowledge/interface-design-craft.md), [frontend state](../../.agents/knowledge/frontend-state-and-async.md), or [stateful systems](../../.agents/knowledge/durable-operations.md), depending on the task. [API/network design](../../.agents/knowledge/api-and-network-contracts.md), [security/trust](../../.agents/knowledge/security-and-trust.md), [testing/evidence](../../.agents/knowledge/testing-and-quality-evidence.md) and [observability](../../.agents/knowledge/observability-and-production-diagnostics.md) now have dedicated references. [Scenario laboratory](../../.agents/knowledge/scenario-lab.md) supplies exercises, not requirements.

## Decide which type of knowledge is missing

- **Product knowledge:** what Offscreen RPG should feel like. Owner: `docs/vision.md`, `docs/player-experience.md`, relevant product topic.
- **Project technical knowledge:** state authority, execution semantics, data shape and integration. Owner: `docs/technical/`, package guides and actual tests.
- **External expert knowledge:** framework semantics, failure patterns, UI heuristics, concurrency practices. This index links the relevant first-party references.
- **Procedure:** how an agent investigates, challenges a design, implements or reviews. Owner: `.agents/skills/`. A procedure should not replace substantive domain expertise.

No skill needs to reproduce React docs, a database manual or a design system. Link a selected source/section, record a concise project-specific lesson after encountering a failure, and refresh outdated sources deliberately.

## Engineering sources by trigger

| When designing or reviewing | Preferred primary references | Applied question |
| --- | --- | --- |
| Agent setup / context costs | [OpenAI harness engineering](https://openai.com/index/harness-engineering/), [Anthropic steering Claude](https://claude.com/resources/articles/steering-claude-code-skills-hooks-rules-subagents-and-more), [Cursor skills](https://prod.cursor.com/docs/skills) | What is mandatory context, what loads on demand, and what can be enforced mechanically? |
| Feature specs / design alternatives | [GitHub Spec Kit](https://github.github.com/spec-kit/), [agent skills format](https://agentskills.io/specification) | Is acceptance defined before code, and are handoffs portable without framework ceremony? |
| React state and effects | [React state snapshots](https://react.dev/learn/state-as-a-snapshot), [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect) | Is state derived, stale, over-synchronized or vulnerable to a response race? |
| Next.js App Router | [Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) | Which data/secret belongs on the server? What actually crosses the client boundary? |
| Interface implementation and usability | [Vercel Web Interface Guidelines](https://vercel.com/design/guidelines), [WCAG 2.2 quick reference](https://www.w3.org/WAI/WCAG22/quickref/) | Keyboard, focus, forms, long content, responsive states, affordances and accessible labeling |
| Transactional state and persistence | [PostgreSQL transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html) | Concurrent edits, lost updates, ordering, expected revision and conflict outcomes |
| External API and ownership security | [OWASP API Security Top 10](https://owasp.org/API-Security/), [OWASP Developer Guide](https://devguide.owasp.org/en/07-training-education/07-api-top-ten/) | Can one owner read/edit another's record? Is retry or resource consumption bounded? |
| Durable background execution | [Temporal documentation](https://docs.temporal.io/) | What is replay-safe, idempotent, bounded and recoverable after a worker restart? |

Use the official documentation appropriate to the **installed** version rather than assuming the latest online example matches this repository. For risky changes, note the source URL, inspected date and the exact resolved constraint in the *technical owner*; do not add thousands of copied paragraphs to this index.

## Current project-specific skill routes

| Decision needed | Load |
| --- | --- |
| Challenge a large idea after source investigation, before writing code | `independent-design-review` |
| Convert approved FEATURE/PLAN/spec decisions into a cheap executor packet | `cursor-handoff` |
| Implement a bounded, authorized slice | `implementation-slice` |
| Design minimal discriminating unit/integration/E2E tests from approved acceptance | `test-strategy` + [testing manual](../../.agents/knowledge/testing-and-quality-evidence.md) |
| Design or review HTTP/API contract semantics, evolution and network behavior | `api-contract-design` + [API manual](../../.agents/knowledge/api-and-network-contracts.md) |
| Review authentication, authorization, privacy and trust boundaries | `security-architecture-review` + [security manual](../../.agents/knowledge/security-and-trust.md) |
| Design evidence, traces, logs, metrics or an operational diagnostic strategy | `observability-design-review` + [operations manual](../../.agents/knowledge/observability-and-production-diagnostics.md) |
| Analyze architecture ownership / module boundaries | `architecture-boundary-review` |
| Design player hierarchy and return experience | `player-experience-design` |
| Select art direction, typography, responsive composition and critique a visual design | `ui-art-direction` |
| Engineer React/Next.js interactive behavior, rendering and accessibility | `frontend-engineering` |
| Evaluate data transactions, idempotency and asynchronous failure paths | `transactional-correctness-review` |
| Diagnose a bug against actual code | `codebase-investigation` |
| Review a finished diff for actionable defects | `diff-review` |
| Reconcile bloated/stale docs | `documentation-reconciliation` |

**Gap discipline:** missing skill candidates are not an invitation to add generic checklists. Add a new domain skill when actual coding-agent work repeatedly fails for a distinct knowledge reason. Prefer the appropriate primary documentation or the existing skill otherwise.

## Keep this index healthy

Review a link or version when a consequential task uses it, or if an error points to changed upstream behavior. Do not automatically refresh all external knowledge every coding session. Stale, misleading reference content is worse than a missing link. Never copy third-party paid/proprietary text into the repo.
