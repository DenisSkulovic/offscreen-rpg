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

For Cursor, do not require it to redo costly product design. Provide the `cursor-handoff` packet with exact heading anchors, 2–5 likely code owners, one rejection/retry case and cheapest relevant proof. For ChatGPT, reason from authoritative specs and a compact source investigation, not a fabricated full-code understanding.

**Tool costs:** Auto-loading every MCP server description, spinning up parallel subagents, or transferring raw Claude notes to Cursor can waste more than a few extra paragraphs of needed contract. Use a tool or new context only when its information gain justifies it.

## Delegate for context hygiene, not only difficulty

A subagent is also a **context boundary**. The parent should keep judgment, integration state and unresolved decisions in its own conversation, while offloading straightforward missions that are cheap in reasoning but noisy in execution. If a bounded chore needs many reads, Git commands, repeated searches or mechanical edits and the parent only needs the result, prefer an **Auto utility subagent** and request a compact factual receipt.

Do not over-delegate microscopic work: one or two small actions are usually cheaper in the parent. The useful threshold is a **small mission** with enough intermediate chatter to create compounding context tax. Auto utility work must have a known finish line and stop on ambiguity; implementation, architecture, security-sensitive reasoning and open-ended diagnosis stay with the appropriate stronger route.

## What to measure

Record actual loaded files/skills (not merely linked ones), selected model/tool calls, tokens _if the client reports them_, time, expensive wrong turns, owner intervention and defects caught. Do not convert changed Markdown byte counts into supposed token savings. Benchmark the same accepted scope in a fresh context before claiming improvement.

## Total-cost optimization: Cursor tokens, local time, human attention

The owner runs cheaper/faster Cursor models under a limited subscription and delegates expensive architecture, alternatives and broad source investigations to ChatGPT. **Don't make Cursor rediscover resolved design or load all manuals.** A selected Change plus 2–5 source anchors, one failure case and a verified narrow command is the default handoff; unresolved architectural contradictions return to ChatGPT with concise evidence.

The workstation is now more powerful than the earlier laptop, but wall-clock remains scarce. Prefer pinned pnpm, workspace filters, warm Turbo/Next/Vitest/TypeScript caches and staged check cadence. No automatic entire repo build, install or E2E on each small edit; no default 'never check' either. See [frontend execution playbook](../../research/legacy-engineering/frontend-execution-playbook.md#5-command-and-cache-cookbook). Measure _actual_ elapsed time, cache hits and Cursor usage rather than claiming imaginary savings.

**Stop rule:** once you know scope, owner, actual implementation, negative case and next action, stop searching. Escalate only for a concrete unresolved uncertainty. The [evaluation protocol](../../.agents/references/context-economics.md) captures the evidence.
