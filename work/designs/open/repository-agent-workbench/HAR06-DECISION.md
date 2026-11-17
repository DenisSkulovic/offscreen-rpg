# HAR06 design decision | source-grounded retrieval funnel

**Decision:** Accepted, 2026-11-17. **Selected implementation:** [HAR06](../../../changes/open/2026-11-17--har06-retrieval-funnel/CHANGE.md). **Scope:** developer/coding-agent repository navigation and evidence, **not** the in-game Storyteller, gameplay, or an AI agent deployment.

## Diagnosis: what HAR03 actually established

[HAR03](../../../changes/archive/2026-11/other/2026-11-17--har03-semantic-retrieval-pilot/CHANGE.md) was useful as a diagnostic. It did **not** falsify hybrid retrieval or show how a coding agent would use such tools.

1. `semantic-pilot.mjs` passed an entire natural-language sentence as one `rg` regex. A real coding agent would investigate short terms, symbols, source maps and several queries. The reported baseline is therefore *one-shot literal grep*, not a realistic agent-navigation control.
2. `judgeHits()` truncated to **top five**, losing the ability to distinguish candidate-generation failure from relevant evidence ranked sixth, twentieth or thirtieth.
3. Author-checked gold often permits only one owner file. For C1, `packages/game/src/immediate-actions.ts#itemTransferBlocked` is a real owner, but the application persistence layer is a plausible *second enforcement role to independently verify*, not an automatic wrong answer. C8's caller/reference question cannot be scored as C5's exact-definition question.
4. C7's absent exporter is not proven present because a vector search returns five unrelated nearest neighbors. Separate retrieved noise, verified absence, and the **final answer's unsupported existence assertion**.
5. The QMD trial used keyword search, not a working vector/hybrid index. Grepai index/probe versions involved a dirty source tree, no proved clean index revision, and no confirmed hybrid configuration. No agent or subagent was run. Trial gold was not independently adjudicated.

**Conclusion:** Correct the experiment first. Do not add a new search engine, model, MCP, database, agent team or speculative reranker just to improve a flawed benchmark score. Preserve HAR03 as honest historical evidence.

## Target: a bounded retrieval funnel

```text
Unfamiliar source question
  -> identify query type and permitted corpus
  -> explicit bounded query variants + wiki/source-owner navigation
  -> source candidates (lexical; wiki-guided; optional existing semantic/hybrid)
  -> normalize/deduplicate/fuse candidates
  -> verify original source + authority + index freshness
  -> compact top-five evidence or justified uncertainty / abstention
```

This is an **evaluation architecture** first, not an always-on runtime or new source-of-truth.

| Arm | What to compare | What it cannot prove |
| --- | --- | --- |
| **A. Progressive lexical control** | Git/`rg`, 2–4 predeclared short keyword/phrase variants, source README and targeted original reads. No reference to gold path during query planning. | A scripted lexical proxy is **not** real Claude Code/Cursor behavior. Keep HAR03's literal-sentence result separately as a historical control. |
| **B. Documentation-guided control** | A plus existing `wiki:find` → bounded `wiki:read` → referenced source-map files, preserving normative/proposal/history and STATUS distinction. | A wiki hit is not proof that the cited implementation is already live. |
| **C. Optional local semantic/hybrid source** | Only an already-installed candidate (e.g. Grepai) when its index scope, model/config and exact clean commit can be attested. Test vendor-supported hybrid only if verified in that installed version. No installs/downloads. | If index freshness is unknown, label exploratory, not comparable. QMD vector remains untested until it actually runs. |
| **D. Offline fusion/verification** | Merge recorded A/B/C results, dedupe by path+heading/symbol+span, optionally compare deterministic Reciprocal Rank Fusion, verify exact source and output a bounded top five. | Better candidate recall does **not** equal better agent answers. |

## Grading contract

Retain HAR03's IDs C1–C8 and D1–D8 as regression questions, but **revise the oracle before any claims**. For each item record a pinned full SHA, query, scope, required assertions, one or more acceptable **evidence roles**, exact file/symbol/heading/spans, relevant negative case, selected/proposal/historic/status label, and independent review status.

A case can have several legitimate implementation sources with different roles. A file with a similar name does not count if it cannot support the required assertion. Review status must be `reviewed`, `unreviewed` or `disputed`. An unreviewed case is diagnostic only and cannot inflate verified quality totals. No gold-owner information or answer labels may be passed into an arm or silently indexed: keep the oracle in an ignored evaluation directory or verify strict exclusion from all indexed corpora.

**Critical difference:** rank candidates against the oracle *before* selecting the final five, then score the final verified answer *after* selection.

Metrics:
- candidate recall@5, @20, @30, first correct rank; missing candidate versus ranked-but-buried;
- final complete, source-supported evidence@5; no-match abstention; unsupported positive claims; wrong-authority/proposal/archival promotion;
- revision and index SHA equality, dirty-state compatibility, source excerpt/span proof; rejects stale and invalid candidates;
- tool calls, wall time, returned/read bytes, index maintenance and failure modes. Do not fabricate tokens, agent quality or network costs when no model is run.

A fixed 20/30 candidate cap is an evaluation budget, not an excuse to eagerly dump 30 full files into an LLM.

## Experimental sequence and stop/go decisions

1. **Review old case definitions** against actual source and mark any unresolved/multi-owner gold as unreviewed; C1, C5, C7, C8 and D5 are mandatory discriminating cases.
2. **Clean revision**: use a clean worktree or a detached snapshot at one SHA, predeclare lexical queries, capture optional vendor index metadata. A dirty or unattestable third-party index is **not comparable**, not a silent pass/fail.
3. **Record all arms to top 30** and replay deterministic candidate normalization/fusion and exact-source verification offline. Negative fixtures must cover wrong ref, wrong symbol, stale/dirty index, absent feature, proposal-as-implemented and secret/gold leaks.
4. **Compare** whether B materially improves A, then whether optional C contributes *additional independently verified source evidence* beyond B.
5. **Stop if B is sufficient.** If relevant evidence never makes top 30, optimize candidate generation/query planning and corpus scope. If evidence is present at 20/30 but lost by final five, deterministic fusion is first. A small LLM/cross-encoder reranker only becomes a *separate proposed trial* if deterministic fusion still fails.
6. **No live-agent inference here.** Agent subagents might isolate exploration but consume real allowance; require a later explicit model/client/spend/sandbox authorization and compare total (parent + subagent) use, not only parent-context savings.

**Evidence that changes the conclusion:** independent, same-revision held-out cases where optional hybrid search repeatedly adds verified, otherwise-missed evidence without false permissions/claims, at acceptable indexing/latency cost. Otherwise prefer wiki-guided lexical search and keep vectors optional or reject them. Neither outcome justifies automatic vendor adoption.

## Nonnegotiable

No new packages, Docker, cloud embedding calls, downloading local models, MCP servers, paid models, subagents, code-generation agents or automatic vendor startup. No game/source feature modifications. Native and no-vendor controls work when all optional tools are absent. A later agent/reranker trial requires **separate owner approval**.

**Related:** [selected HAR06 Change](../../../changes/open/2026-11-17--har06-retrieval-funnel/CHANGE.md), [HAR02 comparer](../../../changes/archive/2026-11/other/2026-11-17--har02-retrieval-comparison/CHANGE.md), [HAR03 receipt](../../../changes/archive/2026-11/other/2026-11-17--har03-semantic-retrieval-pilot/CHANGE.md), and [evaluation gates](EVALUATION.md).
