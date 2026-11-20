# HAR02 | Read-only comparative retrieval evidence harness

**State: Done.** Selected and closed on 2026-11-17 after HAR01. Code-bearing developer-evaluation tooling. No real model trial, third-party installer, MCP, or graph DB. The comparer does not search and does not install a tool.
**Design:** [evaluation gates](../../../../../designs/open/repository-agent-workbench/EVALUATION.md), [candidate disposition](../../../../../designs/open/repository-agent-workbench/CANDIDATES.md); existing [WIKI03](../2026-11-16--wiki03-isolated-agent-evaluation/CHANGE.md), WIKI05 benchmark and WIKI07 index must be **reused**, not reimplemented.

## First-screen Cursor brief

**Goal:** Build the smallest deterministic adapter for *comparing retrieval results*, not an alternative wiki, a hidden AI 'memory', or an agent that edits code.
**Current source map:** `scripts/repo-tools/wiki-core/`, `wiki-bench-static.mjs`, `wiki-bench-agent.mjs`, `wiki-find.mjs`, `wiki-read.mjs`; independently check exact paths/tests and branch before designating new files.
**Known trap:** self-written gold questions can leak into retrieval; an index built on the wrong SHA or whose sections include proposals as normative can appear to 'win' while yielding dangerously false answers.
**Scope:** one versioned compare format, zero-provider fixtures, limited runner/CLI if truly absent, JSON evidence. No product/gameplay changes.

## Outcome and implementation boundary

- Accept two recorded retrieval outputs for **the same pinned revision and query** in `repo.retrieval-compare.v1` format. Record arm config, tool versions, corpus scope, query/case ID, authority class, source path#heading or symbol, line span, source SHA, index SHA/age, rank, bytes emitted, and failure/no-match.
- Reuse WIKI07's indexed section boundaries and WIKI05's existing scoring concepts. Report complete-answer, owner recall, first-good hit, wrong-authority exposure, stale-index detection and byte/call costs separately; no global magic score.
- Add zero-network fixtures for one valid source-exact match, wrong owner, stale SHA, dirty-worktree-only text, 'not found' feature, proposal/historical decoy, Unicode heading, and cross-package source reference. Fail closed or mark not comparable when base refs differ.
- Optional CLI `pnpm repo:retrieval-compare` is a *candidate name*, not mandatory. Cursor should avoid a new runner if existing WIKI03/WIKI05 can already import recorded arms without duplication.

## Exclusions and permissions

No vendor installation, Cognee/Serena configuration, embedding model downloads, server/compose startup, live-agent launch, paid provider calls, test DB mutations, automatic indexing on clone, source changes or Git hook. This first Change only prepares a test harness to *falsify* benefit. Any real-agent A/B requires separate owner authorization and a checked sandbox.

## Acceptance and negative proof

- Same-ref recorded arms produce reproducible per-case and aggregate comparative reports, and every scored hit resolves to existing source text and an exact revision.
- Wrong-ref and unselected-proposal examples must **not** pass as normative correct answers; misleading low-byte wrong answers score as failures, not efficiency improvements.
- Deterministic self-tests and relevant existing WIKI tests run with no network/model; report what was not run and never claim a model benchmark was completed.

## Handoff / readiness

**Next permitted step:** when selected, build or reuse only the minimal deterministic comparison needed for the 16-case [semantic pilot](../../../../../designs/open/repository-agent-workbench/PILOT.md). Vendor experiments are separate HAR03, not bundled into a giant harness. Do not require pre-existing production defects as a prerequisite for learning, and do not select HAR02 automatically.

Close updates STATUS.md, work/changes/README.md, work/changes/ledger/2026-11.md, work/designs/open/repository-agent-workbench/README.md, and work/designs/open/repository-agent-workbench/EVALUATION.md. The tool files are scripts/repo-tools/retrieval-compare.mjs, scripts/repo-tools/wiki-core/retrieval-compare.mjs, scripts/repo-tools/wiki-core/retrieval-compare-self-test.mjs, and the `repo:retrieval-compare` script in package.json. The usage line is .agents/README.md.

## Reconciliation ledger (required before Done)

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| no product/technical behavior impacted | none | unchanged: recorded arms are compared, and no gameplay, Storyteller, or provider rule was edited | scripts/repo-tools/wiki-core/retrieval-compare.mjs | fixture-tested | a proposal hit with fewer bytes does not pass, and two different SHAs are not comparable | N/A |
| .agents/README.md | evidence | changed: the command list names the comparer and says it does not search or install a tool | scripts/repo-tools/retrieval-compare.mjs | fixture-tested | the self-test refuses a historic decoy and a dirty-worktree excerpt | .agents/README.md |
| STATUS.md#orientation | evidence | changed: orientation names this comparer as Done and does not claim a model benchmark | STATUS.md | source-observed | wiki bench self-test passing is not a live agent trial | STATUS.md |
