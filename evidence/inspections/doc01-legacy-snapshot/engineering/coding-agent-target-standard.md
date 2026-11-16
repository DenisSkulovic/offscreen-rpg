# Coding-agent engineering: target standard

**Status:** Normative design target for AI-assisted **software development**, researched 2026-11-11. This is independent of the present Offscreen RPG implementation. It does **not** govern the game's in-world Storyteller model, its prompts, or player inference budget. The [current operating procedures](ai-development-system.md) and [knowledge index](coding-agent-knowledge.md) implement this target selectively.

## What we optimize

The objective is **accepted, maintainable outcomes per unit of total engineering cost**, not the smallest prompt and not the largest volume of AI-generated code. Total cost includes subscription/API spending, wall-clock waits, human attention, repeated analysis, rework, defects, and the maintenance burden of documents and abstractions. Do not report "tokens saved" without comparable, actually measured inputs and outcomes.

An excellent coding-agent environment lets a fresh competent agent:
1. find the intended behavior and the actual owner with a few relevant reads;
2. distinguish the permanent specification from current code and historical observations;
3. propose a design with informed alternatives instead of reflexively implementing its first idea;
4. implement one approved, reviewable slice without rewriting requirements;
5. independently verify the important success and failure paths;
6. leave **less confusion** than it found.

A model's intelligence is not a substitute for specialized knowledge, design criticism, current API documentation, or executable evidence. A larger context window is not a reading mandate.

## Authority order and change order

**Layer 1, product intent:** the owner-approved experience, behavioral requirements, terms, and user-visible acceptance in product documentation. This says **what/why**, including intentional quietness, player freedom, and scope exclusions.

**Layer 2, technical contract:** who owns state, interfaces, consistency, permissions, error/retry semantics, architecture and operational limits. This says **how correctness is constrained**, not just a diagram.

**Layer 3, generated code:** the revisable implementation artifact. Tests and human exercise reveal its **observed behavior**, which may contradict the specification. Code does not retroactively rewrite approved intent.

For new behavior, first settle product, then technical contract, then authorize code. For a defect, read the relevant specs first to distinguish *broken implementation* from *wrong specification*; reproduce source behavior and repair the owning layer. For a pure internal refactor, confirm that product behavior must remain unchanged, record any real boundary change at its technical owner, then edit code. When evidence reveals a discrepancy, **reconcile it in that same slice** or explicitly block the slice with a named owner and next action. Do not falsely claim that documentation or green tests prove human playability.

These are three *authority layers*, not a rule to blindly edit every document for every typo.

## The ideal three-tool cycle

| Gate | Primary tool and default task | Output that earns the next gate | What must NOT happen |
| --- | --- | --- | --- |
| 0. Intent and external reference | ChatGPT UI, with the owner | Concrete player outcome, constraints, expert reference points, 2-3 meaningful design alternatives | Treat existing code as the ideal or mistake speculation for decided product intent |
| 1. Grounding in source | Claude Code, or existing inexpensive repository read access | Compact evidence packet: real files/symbols, current behavior, ownership, missing evidence, risks | Wholesale repo dump, ten nested research agents, implementation before agreement |
| 2. Independent design challenge | ChatGPT UI and optionally a *different* reviewer for high-risk seams | Decision, rejected alternatives, falsifying cases, accepted product and technical spec edits | Rubber-stamp the code-connected model's first design, or invent another design layer |
| 3. Bounded execution | Cursor fast model | One scoped diff with an actual verification receipt; exact blocker if the approved contract cannot be met | Freely redesign scope, spawn more models, silently run providers, polish unrelated code |
| 4. Convergence | Independent reviewer only where material risk warrants it; then the implementing tool | Concrete findings, corrections, evidence, durable documentation reconciliation | Spend three premium reviews on trivial work or "fix" acceptance to pass a test |

A small task should skip gates that add no information. Three tools are **available roles**, not compulsory tollbooths. Prefer free repository access and already authored specs before purchasing context-heavy investigations.

**Claude's default role before purchase:** bounded read-only feasibility/investigation and source-anchored technical draft, with an explicit stop. It should not autonomously make high-level product decisions or write all code. **Cursor's default role:** execute a narrowly accepted task with local engineering judgment, not product ownership. **ChatGPT's default role:** external synthesis, critical design, challenge, and personally authored canonical standards/specifications. This allocation is a deliberate local choice, not a universal law for every team.

## Just-in-time knowledge and instructions

- **Always-on:** only essential safety, project identity, source-of-truth and navigation in `AGENTS.md` / thin tool adapters. Each always-on sentence imposes repeated context cost.
- **On demand:** task-appropriate skill descriptions and their bodies, exact product/technical headings, relevant package README, 1-3 source entry points and tests, then expand only on evidence.
- **Expert knowledge:** versioned short references linking current primary sources and project-specific pitfalls. Invoke the specialty before a consequential design, not at every keyboard event. See [knowledge index](coding-agent-knowledge.md).
- **Deterministic guardrails:** use real code/tests/hooks for repeatable failures. Prose rules cannot guarantee compliance.
- **Handoff:** send decisions, evidence paths and next action, **not entire chat history or full Markdown libraries**. Restart a context when role changes or prior analysis dominates; do not lose accepted constraints.

Never impose arbitrary page/line/token caps that force omitting material facts. Stop reading when the question, authority, route and critical failure mode are understood. Prefer lower *expected* total cost over an impressive small initial prompt.

## Approval and review economics

A feature specification must answer: desired outcome, currently demonstrated boundary, non-goals, negative/failure cases, required ownership and evidence. The technical design must also address conflicting writes, retries/timeouts, data migration if any, and where source evidence ends. An implementer must be able to reject a contradiction rather than manufacture a workaround.

Use an independent reviewer when a proposal crosses persistence/transaction ownership, asynchronous work, security, money, or a major user experience boundary. Give reviewers **different evidence or a focused critical lens**, not the same 100 files and an instruction to praise the design. Require concrete source anchors and a discriminating counterexample. One reviewed, corrected design usually beats several simultaneously produced unintegrated documents.

A high-value expert skill should have (a) a precise trigger, (b) nonobvious domain-specific knowledge or procedure, (c) explicit inputs/outputs, (d) realistic failure examples and verification, and (e) a reason it is better than a link to official docs. Maintain a small number of sharp skills; expand to 10-20 **only when their distinct benefits are demonstrated**. Consolidate or remove stale, overlapping skills.

## Proof of improvement

Use the [coding-agent evaluation protocol](coding-agent-evaluation.md) on a representative documentation defect, React/Next.js interface change and cross-service correctness design. For each, record time to locate the owner, files/context loaded, actual model/tool calls and reported tokens when available, human interventions, correctness on first pass, review findings, and rework. A baseline must be comparable; current setup is **not yet certified optimized**.

A successful rollout has evidence of easier navigation, better design decisions and lower total work without silencing errors. If costs cannot be measured, state that rather than claim a percentage.

## Independent sources and local adaptation

- [OpenAI Harness Engineering](https://openai.com/index/harness-engineering/): repository knowledge as an indexed record, small AGENTS entry, review loops, enforceable invariants and periodic knowledge gardening.
- [Anthropic, steering Claude Code](https://claude.com/resources/articles/steering-claude-code-skills-hooks-rules-subagents-and-more): choose CLAUDE.md, path rules, on-demand skills, subagents and deterministic hooks by context cost.
- [Anthropic, effective context engineering](https://www.anthropic.com/research/effective-context-engineering-for-ai-agents): progressive disclosure, useful source identifiers and just-in-time retrieval.
- [Cursor, Agent Skills](https://prod.cursor.com/docs/skills): portable, on-demand project skills; avoid duplicate policy copies.
- [GitHub Spec Kit](https://github.github.com/spec-kit/): specify, plan, implement and converge, adapted to an existing product rather than imposing its full scaffold.

These are **reference methods**, not evidence that a particular new skill, tool, or pipeline improves this repository. Recheck source documentation when capabilities change. Do not copy entire frameworks unexamined.
