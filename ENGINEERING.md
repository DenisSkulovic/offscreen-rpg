# Engineering System Tour

**Practical lifecycle and agent onboarding:** [WORKFLOW.md](WORKFLOW.md). This page is a public tour of *why* the method exists, not an alternate set of operating instructions.

**A practical, inspectable approach to AI-assisted software engineering.**

Offscreen RPG is the domain. The main engineering experiment is whether assistants with different tools and economics can work on the same long-lived system **without mistaking generated code for specification, losing decisions in chats, or claiming a fixture passed when nobody ran it**.

This page is the public *tour*, not another rules authority. The [2026 retrieval/architectural-memory research register](research/agent-practice/RETRIEVAL-EXPERIMENTS-2026-11-17.md) records tools we **declined**, including Cognee, and which smaller capabilities we deliberately retained. Enforceable routing lives in [`AGENTS.md`](AGENTS.md) and [`.agents/HARNESS.md`](.agents/HARNESS.md). Product and technical truth belongs under [`docs/`](docs/README.md); executable status is [`STATUS.md`](STATUS.md).

## A five-minute exploration for a new engineer or coding assistant

You can give a fresh Claude Code, Cursor or other code-aware assistant this task:

> Explain what makes the engineering process in this repository different from an ordinary AI-generated side project. Inspect the root README, `AGENTS.md`, `.agents/HARNESS.md`, `docs/README.md`, `work/changes/README.md`, and one real product-to-technical-to-source/test path. Distinguish selected design from current implementation, and say which safeguards are executable versus merely written down. Read-only investigation only; don't implement, install optional vendors, or launch paid models. Cite exact file paths and headings.

A useful **answer** should identify the architecture, trace one meaningful source path, find at least one counterexample/limitation, and explicitly separate observed behavior from aspirations. If the agent just reads every Markdown file or declares everything “enterprise-grade,” it missed the assignment.

## 1. Design a desired state; don't reverse-engineer the product from generated code

Think of the desired software state as an explicit contract that code is expected to converge toward:

| Layer | Authority | Concrete entry |
| --- | --- | --- |
| **Product** | What the game should mean and do. Accepted user-facing behavior, time, permissions, experience | [`docs/product/README.md`](docs/product/README.md) |
| **Technical** | The implementation-independent invariants: who owns a state transition, transaction boundaries, errors, permissions, retry/failure semantics | [`docs/technical/README.md`](docs/technical/README.md) |
| **Realization** | What source, migrations, running systems and passing tests **actually** demonstrate | [`STATUS.md`](STATUS.md), [source maps](docs/README.md), [evidence](evidence/README.md) |
| **Unselected or historical material** | Options, proposals, closed Changes and past observations; useful context, **not permission** | [`work/designs/`](work/designs/README.md), [`work/changes/`](work/changes/README.md) |

A technical target may describe a system that doesn't exist yet. That's not automatically documentation drift; it's an intentional design target **provided the repository is honest about realization**. A proposed draft, however elaborate, must not silently become a binding product requirement.

**Trace an example:** The principle that beginning a shift does not award wages belongs in [time and autonomy](docs/product/gameplay/time-and-autonomy.md); [chronology and activities](docs/technical/engine/chronology-and-activities.md) define state/time semantics; [application activity settlement](packages/application/src/campaign/activities.ts) and [integration checks](tools/api-integration/test/storyteller.integration.ts) show the implementation and test cases. The historical warehouse-shift observation is not general proof of future recall.

## 2. Make a “Change” a bounded, falsifiable implementation unit

A **Change** is a planned lasting implementation **or substantive authoritative-document** diff, not synonymous with a game feature or a broad initiative. Its smallest useful dossier identifies the desired behavior, source/technical authority, baseline, intended files, exclusions, a normal case, a meaningful negative case and cheap verification. Significant work can add a short PLAN/checkpoint.

**Only [work/QUEUE.md](work/QUEUE.md) selects independently tracked executable work.** `Current work: none` is a legitimate state, not a reason to pick a random old ticket. Upon landing code, reconcile the affected permanent docs, implementation evidence and a closeout ledger. Retire completed packets to archive so the live queue stays narrow.

See the [Change work-unit standard](.agents/references/change-work-unit-standard.md), [workflow skill](.agents/skills/change-workflow/SKILL.md) and [change reconciliation guard](.agents/rules/documentation.md). Avoid inventing implementation Changes for research-only work or trivial text fixes; a substantive canonical documentation revision may legitimately be a documentation Change.

## 3. Make documentation a navigable, testable wiki

The documentation structure is deliberately **question-routed**: a reader starts in [`docs/README.md`](docs/README.md), finds one owner, reads one heading, then follows only the source/test chain relevant to the question. Product, technical, operational, proposals and dated evidence have different authority classifications.

Try:

```bash
pnpm repo:brief
pnpm wiki:find "What may the Storyteller decide?"
pnpm wiki:read docs/technical/storyteller/operation-and-controller.md --outline
pnpm wiki:health
pnpm wiki:bench:static
```

- `wiki:find` ranks relevant **headings** and labels normative, proposal and historical lanes.
- `wiki:read` retrieves bounded original text, with line spans and truncation/continuation disclosure.
- `wiki:health` checks maintained-path/anchor resolution and directed graph reachability.
- `wiki:bench:static` evaluates deterministic routing over a maintained question set. **It is not a live-model agent-quality grade.**
- `wiki:content-health` flags content risks for review; no score automatically authorizes rewrites.

Read the [wiki operating design](https://github.com/DenisSkulovic/offscreen-rpg/blob/34e2b4fd8d9d9967e13311da3a938460b1a02244/work/designs/open/wiki-operating-model/README.md) and [agent navigation standard](.agents/references/documentation-navigation-standard.md). The objective is *correct source discovery with bounded context*, not keeping an agent busy reading.

## 4. Separate responsibilities from models and tools

The [role catalog](.agents/roles/README.md) distinguishes **responsibility** (architect, implementer, verifier), **specialization** (React, persistence, security), **execution surface** (ChatGPT, Cursor, Claude Code), and **permissions**.

The present workflow often uses **ChatGPT for open-ended investigation/design and Cursor for bounded implementation**. Claude Code has a minimal [adapter](CLAUDE.md) that imports the same [AGENTS entry](AGENTS.md). None of those client choices is a rule of product architecture. An independent review or specialist agent is optional when it can change the judgment, not mandatory expensive choreography.

The [layer-zero harness](.agents/HARNESS.md) and [context economics](.agents/references/context-economics.md) emphasize smallest useful evidence, avoiding giant always-on prompts and preserving decisions across sessions. A handoff should pass named authority headings, a few source anchors, known traps, negative tests and unresolved decisions, **not a transcript dump**.

## 5. Make evidence and source freshness part of the design

A substantial investigation records its commit SHA and whether its observed tree was dirty. It distinguishes **ratified target**, **source-observed implementation**, **fixture-tested**, **live-observed** and **proposal**. These are not synonyms.

Where safe, use the [Chamber](docs/technical/lab/chamber-and-fixtures.md) for deterministic scenario and fault experiments. A green unit test proves its tested contract, not every production deployment. Unrun checks are documented as unrun.

When the local Git checkout is unavailable to the *design* assistant, a portable, revision-stamped ZIP transfers committed source and a wiki locator without involving a coding-agent quota:

```bash
pnpm repo:snapshot:chatgpt
```

The [snapshot runbook](docs/runbooks/chatgpt-design-snapshot.md) explains the default **required wiki index**, SHA manifest, excluded historical links, dirty-worktree provenance and opt-out `--no-index`. The snapshot is a frozen view: reconcile against fresh GitHub commits before publishing, and never treat uncommitted edits as included.

## 6. Benchmark fancy tools rather than assuming they help

The repository does not mandate a vector database or graph service. The November 2026 HAR03 local study tested Grepai and QMD and reported **significant misses, stale-index/freshness concerns and no live agent Stage B test**. It did **not** adopt either vendor as a default. Those comparison runners are removed from HEAD. The [trial receipt](work/changes/archive/2026-11/retrieval/2026-11-17--har03-semantic-retrieval-pilot/CHANGE.md) and the [experiment register](research/agent-practice/RETRIEVAL-EXPERIMENTS-2026-11-17.md) keep the result.

The same standard applies to the harness itself: measure retrieval correctness, false authority claims, unnecessary reads, actual elapsed time, user intervention and *reported* tokens where available. Don't promise “1000× productivity” without evidence.

## 7. Understand the boundaries

This is a **pre-POC engineering laboratory**. The documentation graph, targeted wiki tools, Change guardrails and test fixtures exist in source. Their presence does not automatically establish that agents follow them correctly, that semantic search works better end to end, or that the game is production-ready.

The point is a sustainable method: explain *why* a change exists; find the rule it implements; trace the executing source; test a counterexample; and preserve the knowledge after the chat ends.

**Next:** [Agent operating model](.agents/README.md) · [Product docs](docs/product/README.md) · [Technical docs](docs/technical/README.md) · [Current status](STATUS.md) · [Current work selector](work/QUEUE.md) · [Active Undertaking](work/undertakings/README.md).
