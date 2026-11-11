# Engineering knowledge for coding-agent roles

**Owner:** layer-zero coding-agent harness. **Audience:** architects, implementers, reviewers, test strategists and coordinators developing Offscreen RPG. **Not:** the in-game Storyteller. This is an **engineering memory library**, not a replacement for the game's product and technical contracts.

**Purpose:** a capable coding model can explain an engineering trade-off *when challenged* but still deliver its first convenient answer without considering that trade-off. This library is an external **professional memory and design-space activator**: mental models, legitimate approaches, when/why to choose them, interacting constraints, implementation techniques, evolution costs, failure mechanisms and proof. It should activate deeper engineering judgment *before* the initial recommendation, not merely help debug a bad implementation later.

## Choose one or two knowledge packs, not the whole shelf

| When the role is deciding or reviewing… | Load this pack | What it brings that a generic checklist misses |
| --- | --- | --- |
| Cross-component architecture, modularity, service boundaries, patterns, technology selection | [Architecture decision space](architecture-decision-space.md) | Layers vs slices vs ports/adapters vs DDD vs modules/microservices; why each exists, selection criteria, reversibility and change cost |
| Visual/interaction design, interface personality, typography, hierarchy and UI critique | [Interface design craft](interface-design-craft.md) | Visual direction, competing layouts, user attention, responsive composition, design-system trade-offs and actual rendered review |
| React and Next.js state, data fetching, transitions, stale replies, cache identities, forms | [Frontend state and asynchronous UI](frontend-state-and-async.md) | State ownership, local/URL/server/query-cache options, effect lifetimes, competing update strategies, races and proof |
| PostgreSQL/Drizzle operations, jobs, Temporal, outbox, transactions, external effects, retry, multi-tenant boundaries | [Durable operations and concurrent state](durable-operations.md) | Data storage/query choices, transactions/locks, caches, sync vs async, workflows, external integrations, operations and evidence |
| API contracts, HTTP, network/proxy semantics, pagination, streaming and compatibility | [API and network contracts](api-and-network-contracts.md) | REST/RPC/GraphQL choices, status/retry meaning, versioning, caching, transport and client/server evolution |
| Authentication, tenant permissions, privacy, public tools or expensive/unsafe operations | [Security and trust boundaries](security-and-trust.md) | Threat boundaries, authn/authz choices, browser protections, secrets, least privilege, abuse/resource governance |
| Designing meaningful tests, E2E journeys, quality gates or AI evaluation | [Testing and quality evidence](testing-and-quality-evidence.md) | Test boundary selection, doubles, deterministic ordering, property-based/fault tests, flaky E2E, quality claims |
| Instrumentation, latency, incidents, trace design, SLOs or recovery | [Observability and production diagnosis](observability-and-production-diagnostics.md) | Logs/metrics/traces/profiles, correlation, resource costs, sampling and alert/rollback choices |
| A role needs to decide *what evidence proves a design* | [Knowledge pack standard and role proof obligations](pack-standard.md) | How expert knowledge enters design, reviews and test planning, and how to avoid false confidence |
| Designing or judging a knowledge-assisted workflow | [Counterexample laboratory](scenario-lab.md) | Deliberately deceptive mini-specs plus hidden failure mechanisms that a plausible first-pass design can miss |

The packs are **portable expertise**, not system requirements. Product behavior belongs in `docs/`; technical architecture decisions belong in `docs/technical/`; code/tests expose implementation. If a pack recommends a different pattern from an accepted contract, compare alternatives and flag the conflict. It never silently rewrites the spec.

## Role activation: knowledge before the first confident plan

For a **consequential task**, the coordinator assigns a role, then the role should:

1. Name the decision, product/technical authority, **the plausible solution families and constraints that might change the answer**. Failure risk is one dimension, not the organizing principle.
2. Select one relevant manual from the table. For cross-boundary changes a second manual may be needed; don't load unrelated manuals.
3. Use its **design-space map, trade-off/selection model, interactions and failure examples** to build or challenge the proposal. Do not just copy a checklist into the final answer.
4. Produce a brief **knowledge receipt**: `consulted [pack/section] → options actually compared → decisive constraints and interactions → preferred choice and why → what could reverse it → minimum useful evidence`. Include risks where relevant, not as the only output.
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

A new pack must have a unique audience/trigger, a coherent mental model, **a real design-option landscape and decision criteria**, relevant cross-technology interactions, concrete counterexamples, a proof method, and trusted deep references. If those are already covered, improve the existing pack rather than inventing a seventh "senior engineer" skill.

Prioritized candidates after measured use: deeper dedicated cache/query performance methods, data modeling and online migrations, formal distributed/network transport diagnostics, deployment/rollback engineering, browser accessibility, and specialized AI-system evaluation. Security, API, testing and observability have initial manuals but do **not** claim exhaustive professional coverage. These are **coverage candidates**, not declarations that those packs already exist.

**Status:** This first edition is source-grounded and link-checked, not proven by actual Claude/Cursor role trials. The [evaluation protocol](../../docs/engineering/coding-agent-evaluation.md) owns quality and cost measurements.
