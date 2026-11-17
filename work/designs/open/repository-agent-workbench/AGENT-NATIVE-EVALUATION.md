# Decision | Agent-native harness evaluation

**Accepted direction, 2026-11-17.** Developer-harness investigation, not in-game Storyteller work. **Implementation gate:** [HAR08](../../../changes/archive/2026-11/other/2026-11-17--har08-agent-native-harness-evaluation/CHANGE.md) is Done as preparation. The live trial is not authorized.

## Decision

**Stop developing the deterministic HAR07 source walker as a substitute for coding-agent judgment.** Agents already iteratively reformulate grep queries, inspect language symbols, follow imports and cross-check contracts. The wiki, source maps, receipts and Change boundaries should be **trustworthy tools for an agent to use**, not a bespoke second agent implemented in JavaScript.

HAR03 found noisy/stale local semantic results. HAR06 found scripted top-30 misses. HAR07 separated file recall from verified symbol evidence and followed actual links, but C1–C3 still missed after a greedy walker exhausted its budget. **None ran or independently evaluated a real coding agent.** The next central experiment must test the harness with the actual intended user: an agent investigating the repository.

**Default:** native agentic source navigation, Git/rg and existing language services, with exact wiki headings and source maps when relevant. **Not selected:** Grepai, QMD, vector database, embeddings, deterministic best-first rerouter, reranker, automatic subagents or MCP. Preserve HAR03/HAR06/HAR07 as historical diagnostic evidence.

## Main hypothesis and fair A/B

The *same installed coding client* asks the *same previously unseen source question*, on the *same pinned clean revision*, using fresh sessions and identical tools. Only the additional investigation instruction changes:

| Arm | Agent-visible behavior | Claim it can support |
| --- | --- | --- |
| A — existing/default | Current AGENTS/CLAUDE rules, repo docs, normal tools and one neutral read-only question. No special prompt telling it which route to use. It may find and use wiki tools itself. | Actual default agent performance on this repository |
| B — guided | Everything in A **plus a compact method cue**: locate the product/technical owner when relevant; use wiki:find/read or source maps; follow actual code/test evidence; check STATUS for realization; verify a negative; stop with exact citations and uncertainty. **No gold paths or answer hints.** | Incremental value of explicitly activating the existing harness |

**The experiment does NOT isolate the total value of maintaining this repository's wiki.** Both arms see it. An entire wiki-versus-no-wiki ablation would require a different sanitized snapshot experiment and is not part of HAR08.

## Preparation before real sessions

1. Choose **one** installed coding client and exact model/version. Keep tool permissions, model effort, source SHA, workspace content, network policy and time/call caps matched. Run a **new process and context per case/arm**; no history reuse, resume or shared agent caches without disclosure. Randomize A/B order using a recorded seed.
2. Prepare **six unseen read-only candidate questions**, distinct from HAR03–HAR07 C1–C8/D1–D8 and WIKI static gold. Types: implementation enforcement; technical intent versus current realization; multi-package responsibility; absence/negative authorization; historical decision rationale; conceptual contradiction. Independently review the answer oracle at one SHA before live runs, including acceptable alternative sources, authority tier, required assertions and strongest disqualifying counterexample. With no independent reviewer, cases stay **unreviewed/diagnostic**.
3. Pilot only **three varied cases × A/B = six sessions maximum**. Include a negative/absence or proposal-as-implemented decoy. This is a feasibility test, **not** a statistical proof of general productivity.
4. Agent-visible snapshot and prompt **must not expose the gold oracle**. Keep host-only answers and trial receipts in gitignored out/ paths and outside all search indexes. Do not seed the question with a known source path/symbol. Prior run outputs must not leak into later sessions.
5. Use a **real enforced read-only sandbox** with filesystem isolation. A command saying "read-only" is not a sandbox; on Windows, project cwd alone does not prevent access to user-home files. Reuse WIKI03's canary/isolation requirement. No source writes, downloads, provider/game calls, external browsing, Git mutations, DB tests, model subagents or access to connected accounts. Without demonstrated isolation, do not launch.
6. Default scripts must be provider-free. A real model trial needs fresh, explicit authorization identifying **client, exact model, trial count, maximum attempts, time/tool cap, and usage policy**. The user's go-ahead for design work is not an unspecified model/spend approval. If no reliable currency meter exists, record usage as unknown rather than asserting a dollar ceiling. Suggested initial targets (to confirm before execution): **8 minutes and 20 tool invocations per session**, sequential only, with host-enforced stop or no launch.

### Scoring hierarchy

**Correctness before cost.** A correct answer includes the relevant selected product/technical contract, current source realization and an actually discriminating negative. A selected future design must not be described as implemented. Archived Changes do not authorize work. An absent feature requires an evidence-supported refusal. A file existing is not proof that a runtime guarantee holds.

Metrics: independent complete-answer judgment; critical authority/permission mistakes; exact source paths/headings and observed opens; incorrect/unread citations; no-match accuracy; actual elapsed time; reads and useless detours; tool calls; provider-reported input/output/cache tokens or **null**. Never fabricate tokens from bytes. Judge blind to arm where feasible. Scripted path checks are corroboration, **not semantic certification**.

Interpretation:
- If native A already matches B, **do not increase always-on instructions**. The default repository may be sufficient.
- If B improves correct, source-backed answers at tolerable cost, consider one short optional investigation skill; do not force it onto simple tasks.
- If B creates long wiki detours, simplify the cue or correct source maps.
- If both fail **conceptual/historical** questions after competent lexical investigation, consider a separate semantic **history/architecture** candidate-finding pilot, which labels provenance and never promotes archived proposals to authority.
- If the pilot is mixed, obtain more independent held-out tasks and repetitions before any portfolio productivity claim.

## Why semantic retrieval remains auxiliary

Source-code symbols, stack traces, imports and callers favor exact language-aware tools. Semantic candidate retrieval might add value for *why* a decision was made, outdated terminology, conceptual contradictions or distant cross-domain assumptions. It should propose **source-linked leads** for an agent to verify, not decide product truth. An archive search result can explain the past, not authorize current changes. No vendor installation or permanent index is selected without independent evidence of added correct answers and freshness/cost control.

## Reuse and evidence

- The WIKI03 fake harness and HAR08 preflight runner are removed from HEAD. The method remains in the [historical protocol](../../../../docs/runbooks/agent-native-harness-evaluation.md) and the [experiment register](../../../../research/agent-practice/RETRIEVAL-EXPERIMENTS-2026-11-17.md).
- [Agent rules](../../../../AGENTS.md), [context economics](../../../../.agents/references/context-economics.md), [wiki router](../../../../docs/README.md), [documentation navigation](../../../../.agents/references/documentation-navigation-standard.md).
- [HAR07 history](../../../changes/archive/2026-11/other/2026-11-17--har07-evidence-verified-source-navigation/CHANGE.md). No previous HAR score is regraded as a real-agent result.

HAR08 prepares the evaluation and its refusal/sandbox gate. **Completing HAR08 means preparation is verified, not that a model trial passed.**
