# Context and cost economics for coding agents

**Scope:** tools developing software, **not** Storyteller inference or OpenRouter bills.

The target is **accepted, maintainable work per unit of total cost**: coding subscription allowance, API usage if billed, human attention, elapsed time, repeated context, defects and later rework. Smaller prompts can be worse if they omit a crucial invariant.

## Three context taxes

1. **Startup:** always-on `AGENTS.md`, `CLAUDE.md`, Cursor rules and skill descriptions. Every repeated instruction costs attention, potentially every session.
2. **Per task:** requested specs, code, skill bodies, logs, external docs, investigation/review output. Pay for only what resolves the current uncertainty.
3. **Compounding conversation:** obsolete tool outputs, repeated debates and copied full-file content retransmitted with later messages. Session history frequently dominates the initial context.

## Read in layers, not volume

| The question                      | First lookup                                           | Broaden if                                                |
| --------------------------------- | ------------------------------------------------------ | --------------------------------------------------------- |
| What should happen?               | Relevant product heading                               | Acceptance is undecided or contradictory                  |
| Who owns correctness?             | Relevant technical heading                             | State/retry/failure authority unclear                     |
| What currently executes?          | `rg` path/symbol; one owner + immediate callers        | A named cross-package path affects the result             |
| What expert knowledge is missing? | One specialized skill or linked primary-source section | First source fails to distinguish valid alternatives      |
| Did it work?                      | Targeted deterministic test and real diff              | Scope or negative case demands integration/human exercise |

For Claude Code, use `/clear` between unrelated tasks, `/compact` within a long continuing one, `/context all` to inspect eager instructions and `/usage` for reported usage. Subscription usage bars are not API-billed price per token. See [official cost guidance](https://code.claude.com/docs/en/costs).

Do not make the implementation agent redo settled design. Provide the [implementation handoff](../skills/implementation-handoff/SKILL.md) with exact heading anchors, 2–5 likely code owners, one rejection or retry case and the cheapest relevant proof. The planner reasons from authoritative specs and a compact source investigation.

**Tool costs:** Auto-loading every MCP server description, spinning up parallel workers, or pasting one client's raw notes into another can waste more than a few extra paragraphs of needed contract. Use a tool or a new context only when its information gain justifies it.

## Delegate for context hygiene, not only difficulty

A worker is also a **context boundary**. The coordinator keeps judgment, integration state and unresolved decisions, and offloads straightforward missions that are cheap in reasoning but noisy in execution. If a bounded chore needs many reads, Git commands, repeated searches or mechanical edits and the coordinator only needs the result, use the client's mechanical utility route and request a compact factual receipt. Cursor's route is Auto. Claude Code's route is Haiku. See each client's model policy.

Do not over-delegate microscopic work: one or two small actions are usually cheaper for the coordinator. The useful threshold is a **small mission** with enough intermediate chatter to create compounding context tax. Utility work must have a known finish line and stop on ambiguity. Implementation, architecture, security-sensitive reasoning and open-ended diagnosis stay with the stronger route that client policy names.

## What to measure

Record actual loaded files/skills (not merely linked ones), selected model/tool calls, tokens _if the client reports them_, time, expensive wrong turns, owner intervention and defects caught. Do not convert changed Markdown byte counts into supposed token savings. Benchmark the same accepted scope in a fresh context before claiming improvement.

## Total-cost optimization

The planner does the expensive architecture, alternatives and broad source investigation. The implementation client receives a selected Change, 2–5 source anchors, one failure case and a verified narrow command. It does not rediscover resolved design or load every manual. Unresolved architectural contradictions return to the planner with concise evidence. Cursor model spend follows [.cursor/MODEL-POLICY.md](../../.cursor/MODEL-POLICY.md). Claude Code model spend follows [.claude/MODEL-POLICY.md](../../.claude/MODEL-POLICY.md).

The workstation is now more powerful than the earlier laptop, but wall-clock remains scarce. Prefer pinned pnpm, workspace filters, warm Turbo/Next/Vitest/TypeScript caches and staged check cadence. No automatic entire repo build, install or E2E on each small edit; no default of never checking either. See [frontend execution playbook](../../research/legacy-engineering/frontend-execution-playbook.md#5-command-and-cache-cookbook). Measure actual elapsed time, cache hits and client usage rather than claiming imaginary savings.

**Stop rule:** once you know scope, owner, actual implementation, negative case and next action, stop searching. Escalate only for a concrete unresolved uncertainty. The [evaluation protocol](../../.agents/references/context-economics.md) captures the evidence.
