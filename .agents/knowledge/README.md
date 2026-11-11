# Engineering knowledge for coding-agent roles

**Owner:** layer-zero coding-agent harness. **Audience:** architects, implementers, reviewers, test strategists and coordinators developing Offscreen RPG. **Not:** the in-game Storyteller. This is an **engineering memory library**, not a replacement for the game's product and technical contracts.

**Purpose:** an intelligent coding model can reason deeply about a mechanism it recognizes, yet fail to **retrieve that mechanism at the decision where it matters**. This library brings the relevant theory, concrete failure cases, alternatives, and verification methods into the active role's working context *before* its design hardens. A short list of slogans is not an engineering manual.

## Choose one or two knowledge packs, not the whole shelf

| When the role is deciding or reviewing… | Load this pack | What it brings that a generic checklist misses |
| --- | --- | --- |
| React and Next.js state, data fetching, transitions, stale replies, cache identities, forms | [Frontend state and asynchronous UI](frontend-state-and-async.md) | Authority and identity model, effect lifetimes, independent race/display consistency defects, competing architectures, adversarial tests |
| PostgreSQL/Drizzle operations, jobs, Temporal, outbox, transactions, external effects, retry, multi-tenant boundaries | [Durable operations and concurrent state](durable-operations.md) | Commit/dispatch ambiguity, isolation anomalies, idempotency scope, lock/fence protocols, crash/interleaving matrix |
| A role needs to decide *what evidence proves a design* | [Knowledge pack standard and role proof obligations](pack-standard.md) | How expert knowledge enters design, reviews and test planning, and how to avoid false confidence |
| Designing or judging a knowledge-assisted workflow | [Counterexample laboratory](scenario-lab.md) | Deliberately deceptive mini-specs plus hidden failure mechanisms that a plausible first-pass design can miss |

The packs are **portable expertise**, not system requirements. Product behavior belongs in `docs/`; technical architecture decisions belong in `docs/technical/`; code/tests expose implementation. If a pack recommends a different pattern from an accepted contract, compare alternatives and flag the conflict. It never silently rewrites the spec.

## Role activation: knowledge before the first confident plan

For a **consequential task**, the coordinator assigns a role, then the role should:

1. Name the decision, the product/technical authority, and **which failure domains actually matter**.
2. Select one relevant manual from the table. For cross-boundary changes a second manual may be needed; don't load unrelated manuals.
3. Use its **decision model and failure timeline** to build or challenge the proposal. Do not just copy a checklist into the final answer.
4. Produce a brief **knowledge receipt**: `consulted [pack/section] → applicable risks [specific] → counterexample [specific] → proposed guarantee/mitigation → cheapest discriminating evidence`.
5. Before handing the work to Cursor, carry the **identified invariants and negative acceptance** in the small executor packet. Cursor should not need to read the same large manual if those decisions are already settled; the independent reviewer may read the relevant pack to challenge them.

For a trivial local edit, a knowledge pack may be unnecessary. For a race, database migration, cross-tenant cache, retry or provider-side effect, omitting relevant domain knowledge is a design risk.

## How this differs from rules, skills, roles and specs

| Artifact | Main job | Activation |
| --- | --- | --- |
| `AGENTS.md` | Minimal universal boundaries | Always |
| [Role catalog](../roles/catalog.md) | Who owns a decision and deliverable | When orchestration matters |
| `.agents/skills/*/SKILL.md` | What procedure to follow | Task-triggered |
| **This library** | Mechanistic expertise, known traps, counterexamples and alternatives | Only the relevant role/domain |
| `docs/` and `docs/technical/` | Binding *intent and architecture* for this product | Relevant owner before consequential change |
| Tests, runtime evidence | What was actually verified | Narrow proof after or during work |

A skill may point to a large manual; that manual stays outside startup context until the question needs it. **Source references are at most one hop from the skill**, avoiding chains of five intermediary files. See [Anthropic's skill authoring practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices), [their context-engineering analysis](https://www.anthropic.com/research/effective-context-engineering-for-ai-agents), and [the independent standard](pack-standard.md).

## The studying-repo reference

The owner's separate [Modern Software Engineer](https://github.com/DenisSkulovic/the-modern-software-engineer) repository contains a much deeper curriculum and examination library. Especially useful is its [Engineering Decision Map](https://github.com/DenisSkulovic/the-modern-software-engineer/blob/main/book/engineering-decision-map.md), which emphasizes the **joints between disciplines**, such as transactions + concurrency + business invariants, queues + idempotency + retries, caches + consistency, UI state + authorization, and operations + observability.

**Do not copy dozens of 70-KB lectures into Offscreen RPG.** The domain manuals below condense the *decision-critical mechanisms* into original working references, then link to exact chapters for deep reading when needed. This reduces duplicate authority and keeps a fresh agent from ingesting a curriculum to make one design decision.

## Growth rule

A new pack must have a unique audience/trigger, a coherent mental model, several concrete failure cases with competing remedies, a proof method, and trusted deep references. If those are already covered, improve the existing pack rather than inventing a seventh "senior engineer" skill.

Prioritized candidates after measured use: visual/interaction craft, application security and tenant isolation, data modeling and online migrations, testing strategy and E2E reliability, observability and incident diagnosis, API compatibility, performance and capacity, deployment/rollback, and specialized in-game AI-system engineering. These are **coverage candidates**, not declarations that those packs already exist.

**Status:** This first edition is source-grounded and link-checked, not proven by actual Claude/Cursor role trials. The [evaluation protocol](../../docs/engineering/coding-agent-evaluation.md) owns quality and cost measurements.
