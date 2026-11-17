# HAR06 | Fair source-grounded retrieval-funnel evaluation

**State: Ready, selected (2026-11-17).** **Owner authorization:** implement the developer-harness *evaluation tooling and fixtures* described here, not an additional search product. **Executor:** Cursor. **Decision:** [HAR06-DECISION](../../../designs/open/repository-agent-workbench/HAR06-DECISION.md).

## First screen for Cursor

**Goal:** Make one repeatable, source-grounded A/B/(optional C)/D experiment that distinguishes candidate discovery from ranking and answer verification. A = scripted progressive lexical; B = wiki-guided lexical; C = already-installed optional local semantic/hybrid on an attested clean index; D = deterministic offline fusion. **This is not an AI agent or live usage experiment.**

**Investigate before editing:** fresh full `git rev-parse HEAD`, `git status --short`, source-owner README, `scripts/repo-tools/semantic-pilot.mjs` and `semantic-pilot-cases.mjs`, `scripts/repo-tools/wiki-core/retrieval-compare.mjs`, `wiki-core/route.mjs`, `wiki-find.mjs` and `wiki-read.mjs`, [HAR03 historical packet](../../archive/2026-11/other/2026-11-17--har03-semantic-retrieval-pilot/CHANGE.md). Design baseline: `main@116ef01c77a157490e7dd61fa68a014a66a0c78f`. Recheck HEAD because other work may have landed.

**Known trap:** Current `rgHits` submits a whole question as one regex, `judgeHits` truncates top 5, gold expects one owner path, the optional index may be stale, and QMD never completed vector search. **Do not report these as a fair test of hybrid retrieval or real coding agents.**

**Out of scope:** app/game files, product/technical game contracts, new vector DB, embeddings downloads, installing vendor binaries, Docker, global MCP, default subagents, LLM rerankers, paid providers, live Cursor/Claude model A/B and HAR05 exporter work. HAR05 is Verifying independently.

## Bounded executable outcome

1. **Case oracle/record schema:** add a compact versioned `repo.retrieval-funnel.v1` schema or minimally extend HAR02. Preserve HAR03 C1–C8/D1–D8 IDs but add permitted evidence *roles* and multiple valid source paths/symbols where verified. Add explicit `reviewed|unreviewed|disputed` labels; no independent reviewer => no headline verified score. Store oracle outside indexed/source-candidate corpus (enforced excludes; no leak).
2. **Realistic no-model controls:** capture bounded 2–4 keyword/phrase queries prepared without gold knowledge, targeted `rg`/Git/source-map reads (A). For B, add existing wiki owner/heading routing and referenced source-map paths before targeted code search; preserve proposal/archival/STATUS labels. Label A/B **scripted proxies**, never "actual Claude/Cursor" trials. Reuse existing tools, not a new wiki parser or retrieval framework.
3. **Optional, independently permitted C:** if a local Grepai installation is *already* functional and its exact clean source/index revision and corpus exclusion policy can be proven, record 20–30 candidates from semantic and supported hybrid configuration. Record model, index SHA, version, scope, staleness. QMD vector and SIFS stay `not-configured` unless already functional; no installation/download to satisfy this Change. Failed/stale tools are **unknown/uncomparable**, never silently scored as zero.
4. **Offline D:** replay recorded candidate lists without vendors or network; dedupe by file+symbol/heading/line region, preserve origin and exact path/line. Optionally compare a simple deterministic RRF rank. Return candidate recall@5/20/30, final verified evidence completeness@5, false existence/proposal claims, no-match abstention, time/bytes/calls and provenance.
5. **Small final report:** one gitignored JSON evidence receipt and a short human summary identifying candidate-generation misses vs rank misses vs evidence/authority/freshness failures; next recommended decision. No dashboard, orchestrator or LLM.

Preferred interface: extend `pnpm repo:semantic-pilot` with a clearly named `--funnel` or reuse `repo:retrieval-compare` and its existing report shape. Keep existing `--self-test` and archived HAR03 `--run` behavior intelligible. If a second CLI introduces duplication, reject it.

## Acceptance and negative cases

- **C1:** evaluate distinct domain-holder refusal and application-persistence enforcement roles only after validating each exact source. A plausible alternative is `needs adjudication`, not an automatic pass. **C5 versus C8:** exact definition is not caller/reference correctness.
- **Rank 17 fixture:** eligible owner at rank 17 gives candidate recall@20 = true but recall@5 = false. If correct owner is missing from all 30, classify as *candidate-generation miss*, not a reranker opportunity.
- **C7 absent:** Grepai returning five unrelated neighbors must not turn into "Grafana exporter exists." A claim requires evidence; abstention/verified absence is separately scored from returned noise.
- **D5/D4:** telemetry proposal cannot be selected implemented truth; status/realization must be separately checked where required. Old archived Changes never authorize current work.
- **Stale/dirty:** mismatch between case SHA and result/index SHA, a dirty-only source edit, or unverified index refresh => incomparable/unknown. Fixture must catch cross-SHA fusion and stale candidate excerpts.
- **Security:** candidates and optional local indices must not ingest secrets, archived material or case gold by accident. No vendor executable/network/provider required for the offline self-tests. Missing binary => `not-configured`, not failed.
- **Accounting:** record file/read/output bytes, elapsed time, tool invocations and optional maintenance costs. Model tokens and real agent performance are `unknown` because no model is launched.

## Execution sequence and done gate

**First:** source audit, small typed report contract, oracle review-status classification and a clean revision. Run fixture/self-tests for fusion, negatives, SHA fences and missing-tool behavior. **Second:** compare A/B on a few hand-checked cases and record their original excerpts. **Third:** only if already locally available and verifiably fresh, run optional C with explicit command and bounded scope. **Fourth:** interpret outcomes; do not adopt a vendor or launch another agent.

**Verification commands (reinspect availability first):** `pnpm repo:semantic-pilot --self-test`, `pnpm repo:retrieval-compare --self-test`, `pnpm wiki:find --self-test` and new HAR06 offline replay/self-tests. Target a clean SHA or separate clean worktree. Document commands not executed; do not assume they passed.

**Closure:** complete Reconciliation ledger, update any changed `.agents/README.md` command documentation, `STATUS.md` only for verified facts, `work/designs/open/repository-agent-workbench/README.md` and `work/changes/README.md`; archive under `work/changes/archive/2026-11/other/`. If all reviewed cases remain unavailable, report diagnostic-only results and leave evidence quality unproven; do not invent a numeric improvement.

## Reconciliation ledger (complete before Done)

| Authority/claim | Design status | Source delta + SHA | Proof | Negative proof | Map/status |
| --- | --- | --- | --- | --- | --- |
| No product/technical game behavior impacted | unchanged: harness-only test | **Pending** | **Not run** | stale index, absent feature, proposal/secret decoys | N/A |
| HAR06 retrieval evidence contract | accepted via HAR06 decision | **Pending** | **Not run** | rank-17, missing vendor, mismatched SHA | .agents/README.md / workbench as applicable |

**After this Change:** no new search tool is approved. An actual agent/subagent or small-LLM reranker test is a *different* owner-approved Change with measured model/client/cost conditions.
