# HAR02 | Read-only comparative retrieval evidence harness

**State: Proposed; not selected.** Code-bearing developer-evaluation tooling. **Dependencies:** WIKI07 independent check for a trustworthy docs baseline; WIKI08 source-truth work is complementary and must not block a code-search pilot; HAR01 receipt is optional if Git SHA and dirty state are otherwise recorded. No real model trial, third-party installer, MCP or graph DB authorized.
**Design:** [evaluation gates](../../../designs/open/repository-agent-workbench/EVALUATION.md), [candidate disposition](../../../designs/open/repository-agent-workbench/CANDIDATES.md); existing [WIKI03](../../archive/2026-11/other/2026-11-16--wiki03-isolated-agent-evaluation/CHANGE.md), WIKI05 benchmark and WIKI07 index must be **reused**, not reimplemented.

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

**Next permitted step:** when selected, build or reuse only the minimal deterministic comparison needed for the 16-case [semantic pilot](../../../designs/open/repository-agent-workbench/PILOT.md). Vendor experiments are separate HAR03, not bundled into a giant harness. Do not require pre-existing production defects as a prerequisite for learning, and do not select HAR02 automatically.

## Reconciliation ledger

**Incomplete by design (Proposed).** Before Done, fill the active Change template's affected-claim ledger. Likely `no product/technical behavior impacted`, proven by bounded tool-only diff and tests; no manufactured implementation evidence.
