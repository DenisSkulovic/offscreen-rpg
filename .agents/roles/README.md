# Role orchestration for coding agents

**Layer-zero authority:** This file defines how software-development roles collaborate to improve Offscreen RPG. The **role** is an assignment and accountability boundary; the **agent** is one way to execute it. This is not the game's runtime Storyteller or an instruction to spawn agents automatically.

Start with [the independent operating principle](../references/role-orchestration.md), then use [the role catalog](catalog.md) and [the assignment/handoff contract](assignments.md). For a concrete end-to-end example use [the UI feature playbook](playbooks/ui-feature.md). The [portable orchestration skill](../skills/role-orchestration/SKILL.md) applies this to an actual proposed feature.

## Four axes, not one giant job title

| Axis | Question | Examples |
| --- | --- | --- |
| **Responsibility / role** | What question must be answered and who decides? | UX designer, UI critic, data architect, test strategist, implementer, independent verifier |
| **Specialization / knowledge** | What expertise is relevant? | React, typography, PostgreSQL, privacy, Temporal, accessibility, observability |
| **Execution surface** | Where should this role run? | ChatGPT chat, Claude Code main session, Claude/Cursor subagent, independent Cursor chat |
| **Authority / permissions** | May it only read, edit documentation, edit code or execute tests? | Read-only investigation, approved spec edit, scoped implementation, disposable-DB check |

A role can use several skills, but loading a skill doesn't grant authority. The same ChatGPT/Claude/Cursor model may fill several roles **sequentially**; each switch needs an explicit output and a new role contract when responsibilities change. Independence is more valuable than repeated model calls that all read the same context.

## Composing an assignment

For significant work, the person or coordinating chat first identifies **the smallest set of roles that eliminate material uncertainty**. Name each role's question, owner of its decision, input authority, permission, deliverable, and who consumes it. Distinguish *role recommendation* from *role launch*: a suggested parallel ChatGPT chat or paid Claude subagent is not automatically launched.

**Default:** one responsible agent handles a straightforward task. Add another role when its separate judgment would change the outcome or its isolated context prevents overwhelming the main chat.

| Need | Smallest useful vehicle | Extra context cost / danger |
| --- | --- | --- |
| A quick specialized checklist with no independence need | On-demand skill in current chat | Skill body loaded once; no new session |
| Noisy repo research and only a compact finding matters | Built-in Explore or a bounded read-only subagent | Subagent reads files again; consumes allowance |
| Truly independent critical design or acceptance judgment | Fresh chat or read-only specialist agent | New context plus potential rediscovery |
| Long-running independent workstreams | Distinct sessions/worktrees, only with explicit authorization | Coordination overhead, duplicated infrastructure, merge conflicts |
| Complex cross-talk between specialists | Agent team, only when coordination itself pays off | High token spend; experimental/fragile in some clients |

**No automatic agent teams.** Claude agent teams are experimental and more expensive than subagents; Cursor also bills subagent requests. A new native subagent costs real allowance, even when its final reply is short. The parent/coordinator must explain the **information gain** before suggesting expansion.

## Optional native subagents: start with only two

The canonical role catalog is larger than the installed **native** subagent roster. The first two deliberately opt-in, read-only specialists are:

- **`design-challenger`**: independently challenges a proposed design against product/technical contracts before implementation. Canonical procedure: `independent-design-review`.
- **`test-strategist`**: proposes a falsifiable, risk-weighted unit/integration/E2E plan before anyone writes or executes tests. Canonical procedure: `test-strategy`.

Claude uses `.claude/agents/` definitions with `tools: Read, Glob, Grep` and `permissionMode: plan`; Cursor uses `.cursor/agents/` definitions with `readonly: true`. Both inherit the selected parent model rather than silently pinning an expensive one. They do **not** automatically authorize model calls or additional agents. Cursor may also discover compatible Claude definitions; its documented project precedence resolves same-name collisions, but actual discovery should be tested in the installed version.

**Why not create twenty?** Built-in Explore already handles ordinary source searches; most catalog roles need only a role assignment plus an existing skill or a fresh ChatGPT conversation. Each custom subagent advertises instructions and consumes tokens when invoked, so native roles must earn their place through repeated usefulness. Do not confuse availability with a requirement to delegate.

## Three service levels

- **Direct:** one role performs one bounded known task; reference the relevant skill; no planning ceremony or reviewer swarm. Typical bug/typo/source lookup.
- **Review pair:** author/implementer plus one *different* reviewer focused on a material risk, e.g. React race, keyboard flow, transaction boundary. Suitable default for consequential work.
- **Cross-functional:** orchestrator decomposes a complex outcome into accountable roles, optionally parallelizes **independent read-only** investigation, then converges on approved product + technical contracts before implementation. Use when UI, backend, QA and security must genuinely coordinate.

These are selection heuristics, not fixed pipelines. A review that finds nothing, with evidence, is valid. A reviewer repeating the implementer's summary without reading the primary contract or diff is not independent.

## Ownership of decisions

- **Human owner:** product priorities, approval of changed user behavior, extra subscriptions, paid inference, risky operations and final acceptance.
- **Product/UX designer:** proposes intended experience and measurable acceptance; must not rewrite technical authority to make an idea fit.
- **Technical architect:** proposes ownership, interfaces and failure semantics; must inspect actual feasibility and surface trade-offs. Cannot approve a product change for the owner.
- **Critical reviewer:** can block an unsafe/incoherent proposal with a concrete counterexample; cannot silently implement or modify the product contract.
- **Test strategist:** defines failure cases and observable criteria *before* implementation; shouldn't alter product requirements merely to make tests easy.
- **Executor:** builds exactly the approved slice, preserves unrelated work, runs safe verification; returns contradictions rather than inventing policy.
- **Verifier:** assesses actual artifacts/tests/visual evidence and classifies what is proven; cannot self-certify the authoring role's unexecuted claims.
- **Integrator/coordinator:** reconciles outputs, exposes unresolved disagreements to the owner, delegates only when justified; does not treat consensus among models as acceptance.

## Handoffs and failure loops

Use the [assignment/receipt shape](assignments.md). Pass **approved decisions and source/heading identities**, not full transcripts, long file dumps or every rejected idea. Each role finishes with a short receipt including evidence, unresolved issues and exact next consumer.

**Gate failure:** if a downstream role finds a contradiction in its input contract, return it to the **owning upstream role** and pause dependent implementation. It must not independently choose a new product direction, quietly weaken acceptance or request ten more agents.

**Convergence:** owner/architect decides among documented alternatives; update the authoritative product/technical heading; then release a fresh bounded packet. No indefinite peer-review tennis. After an initial review and one corrective pass, persistent disagreement goes to the human with evidence and options, not another automatic debate.

**Parallel writes:** never allow two agents to edit the same owned files simultaneously in one checkout. Read-only comparisons may run in parallel. Independent writes need disjoint ownership, a separate Git worktree/branch, and explicit merge responsibility.

## Why this belongs in layer zero

The role architecture decides *who* reads which documents, *when*, and to *what end*. Product and technical documentation remain the truth sources; code remains an implementation artifact. Do not turn a feature PLAN into a second general agent org chart. For complex features, record only the **selected role sequence** and unresolved handoff gate in that PLAN, referencing this catalogue.
