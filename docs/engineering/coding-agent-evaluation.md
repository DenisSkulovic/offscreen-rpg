# Coding-agent workflow evaluation

**Status:** Evaluation protocol; no measured efficiency improvement established as of 2026-11-11. This assesses **ChatGPT, Claude Code and Cursor used to develop this repository**, not the game's inference runtime or narrative token bill.

## Measure outcomes, not agent enthusiasm

Observe a task through: initial comprehension, design/source investigation, canonical spec decisions, implementation, verification, independent review and rework. A "fast" change with two silent regressions is expensive. A very thorough review that consumes more human attention than the defect it prevents may also be wasteful.

Use a small ledger with:

| Dimension | Record |
| --- | --- |
| Task | Fixed objective, scope, approved spec heading, source revision, expected negative case |
| Tool use | Which agent/model, role, number of sessions, context resets, read/tool calls, and exact prompt/output tokens **only if actually exposed** |
| Cost | Known subscription marginal charge or reported metering; otherwise *not measurable* (do not invent per-token prices for subscriptions) |
| Human attention | Number of clarifications, copied artifacts, rejected designs, manual interventions and what they achieved |
| Correctness | First-pass compile/targeted test, meaningful review findings, defects later caught, runtime/human acceptance separately |
| Knowledge | Whether the agent found the right owner quickly; irrelevant docs loaded; repeated sources or mistaken stale instructions |
| Completion | Is the outcome correct, maintainable, documented and easy to resume from a fresh context? |

**Evaluation tasks** (do not run them automatically or change application behavior just to benchmark):

1. **Docs reconciliation:** a purposely stale but bounded product/technical/code statement. Test finding owner, preserving truth, repairing one route and avoiding context flooding.
2. **Frontend change:** a concrete React/Next.js screen state such as pending/failed/retry, evaluated for spec fidelity, state ownership, keyboard and focus behavior, stale data handling and visual acceptance.
3. **Cross-service design:** a finite action or provider accounting failure path, evaluated first as a *read-only architecture task* for concurrency, transaction authority, restart and double effects. No real provider calls.

For a comparable baseline, hold goal/acceptance and repository revision as close as feasible; distinguish improvements from task familiarity, model-version changes or warmed caches. It is okay to compare *qualitatively* before paid tools are connected, but don't claim a cost saving from imagination.

## First harness activation tests

- Confirm Cursor loads root `AGENTS.md` and doesn't automatically inject the harness-only `.cursor/rules/project.mdc` on an unrelated coding task.
- Inspect Cursor's available `.agents/skills/` and compatible `.claude/skills/` for duplicate skill names/advertisements.
- When Claude Code is connected, check `/context all`, `/skills` and `/usage`; run `/doctor prompt-audit` where supported. Verify that the root import appears, conditional skills are callable and the cost model matches the installed plan.
- Ask one read-only source question and record whether the agent found the correct product/technical owner without pre-reading unrelated docs. **Don't change game code just to validate harness discovery.**

See [harness architecture](../../.agents/HARNESS.md) and [context reference](../../.agents/references/context-economics.md). Real-client discovery remains **unverified** until these checks are actually performed.

## Cheap smoke test before buying another subscription

1. Start a fresh coding-agent context at repository root; confirm it sees only minimal rules, can find product and technical owners, and does not ingest all `docs/`.
2. Ask the agent a **read-only** question: identify the selected feature's next concrete slice, its product/technical authority, and actual source entry points. Require a compact, source-anchored answer with uncertainty clearly marked.
3. Invoke `/independent-design-review` (or point directly to its skill) on a draft. Check whether it raises a real competing design and failure case instead of praising or inventing requirements.
4. For Cursor, provide the `cursor-handoff` packet to a narrow **approved** change. Require smallest safe verification, no unapproved provider spend, and a factual diff report.
5. Record human time, unnecessary reads, budget/tool usage if exposed, errors caught and what the next agent needed. Revisit the system only in response to concrete recurring friction.

A skills menu rendering successfully is **discoverability**, not proof of coding quality. "All tests pass" is verification evidence for a declared scope, not proof of playability, design quality or lower development cost.

## Documentation retrieval smoke cases

Use these **read-only** questions in a fresh coding-agent context; assess whether the agent finds the correct owner/heading without a whole-codebase investigation. Record files read, wrong detours, actual reported tokens (if available), answer accuracy and human intervention.

| Fresh-agent question | Expected documentation route |
| --- | --- |
| When is fictional time allowed to advance after an action is accepted? | [Time and autonomy](../time-and-autonomy.md) → [committed time](../technical/committed-time.md#permission-to-advance); inspect code only to verify current implementation |
| What makes an NPC/relationship detail canonical and recallable? | [Continuity](../continuity-and-consequences.md) → [canonical ownership](../technical/canonical-files.md#one-owner-per-kind-of-truth); retrieval research only when the question concerns discovery |
| What happens if a provider times out after dispatch? | [Temporal/execution recovery](../technical/execution.md#retry-boundaries-and-uncertain-side-effects) → [usage holds](../technical/usage-policy.md#hold-and-recovery-semantics) |
| Who owns a form's server state, and what should the player see? | [Player experience](../player-experience.md) → [client/identity](../technical/client-and-identity.md) → [code map](code-navigation.md) |
| Was a saved clue note actually recalled after leaving a scene? | [Connected evidence](connected-poc-proof.md#memory-reinspection--2026-10-23) → exact proposed/published/selected/packed evidence, **not** a guessed success from a note patch |

The current repository has **no measured token reduction or retrieval success rate** for these cases. A passing file-link check is only a structural sanity check.

## Native role discovery and permissions

After installation, check that Claude sees exactly the two relevant `.claude/agents/` specialists and that Cursor resolves the same names from `.cursor/agents/` without creating confusing duplicates. Invoke one on a **read-only question** with exact authority references; verify its output is a critical design/test receipt rather than edits or an extra agent team. Inspect actual client-reported subagent model/usage; the wrappers intentionally use `inherit`, not a claimed cheap price. This test remains **not performed** in the real clients.

## Role-orchestration smoke test

For a representative UI feature, request a `role-orchestration` plan **without coding**. The response should identify product/technical authorities, a minimal role sequence, 1–2 valuable independent judgments, explicit write/test permissions, handoff receipts, a negative acceptance case and how to return contradictions upstream. Compare with a plain one-agent plan. Record *actual* role drift, irrelevant reads, human corrections, extra agent calls and quality findings when the workflow is used.

Do not confuse creation of role Markdown or native subagent files with proof they improve productivity. A multi-agent plan that costs more and offers no new evidence should lose to one well-briefed agent.

## Current status

- Existing small entrypoint, conditional skills, feature workflow and checkpoint-size audit: **implemented as repository documents**.
- Multi-tool workflow efficiency: **not benchmarked**; no Claude Code/Cursor side-by-side experiment in this record.
- Subject-specific engineering knowledge: **first curated version only**; requires trial on real coding tasks.
- Next measurement: one source-grounded Claude investigation and one narrow Cursor implementation, with the owner recording actual cost and manual friction before extending the skills library.
