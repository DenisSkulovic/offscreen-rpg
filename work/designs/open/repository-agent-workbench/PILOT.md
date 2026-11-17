# Semantic retrieval pilot | executable experiment design

**Status:** Stage A ran on 2026-11-17 and was not adopted. Stage B was not run. **Source:** [candidate assessment](CANDIDATES.md) and [evaluation contract](EVALUATION.md). **Code-bearing packet:** [HAR03](../../../changes/archive/2026-11/other/2026-11-17--har03-semantic-retrieval-pilot/CHANGE.md).

## The experiment we actually want

Test whether asking a sentence or question leads to *better evidence* for a **fresh coding agent**, not merely a prettier search result. Separate two measurements:

- **Intrinsic retrieval:** does the search utility locate the independently verified owning symbol or ratified heading in its top 1/3/5 results? How many bytes, milliseconds and resources? Is it fresh?
- **Agent integration:** given the tool, does a fresh Cursor or Claude Code session call it when appropriate, trust/verify only exact source spans, reduce needless reads, and improve correct answers or code-task preparation? Does it fall back to grep responsibly?

An optional external tool is a hypothesis. **Both a strong positive and an unambiguous negative result advance the harness.**

## Pilot lanes (distinct corpora, pinned code)

| Lane | Baseline A | Candidate B | Candidate C if useful |
| --- | --- | --- | --- |
| **Code** | installed agent-native search + `rg`/Git | Grepai semantic code search (local embeddings) | SIFS offline BM25 / local hybrid |
| **Canonical docs** | WIKI07 `wiki:find` → `wiki:read`, existing owner maps | QMD semantic/hybrid candidate retrieval → source-exact `wiki:read` | WIKI07 alone with improved query phrasing |
| **Symbol relations** | client-native source grep and configured language services | Serena symbol/read-only references | Optional static call-graph route |

The third lane is **not included automatically** in the first pilot. The first two are deliberately focused on natural-language questions.

Freeze a specific Git commit for A/B, allow a separate fixture copy with one intentionally dirty edit and a subsequent commit to evaluate invalidation. Copy benchmark gold labels outside the agent-visible index. Do not run game providers or connect a remote API.

## Initial benchmark: 16 independently adjudicated cases

Prepare **8 code** and **8 documentation** questions with plausible conversational vocabulary and varied difficulty. Do *not* copy source headings as the full question, or populate the index from benchmark gold. At least:

**Code:**
1. Behavioral question with low literal keyword overlap: where an unfinished action avoids receiving payment/reward.
2. Idempotency/replay: where repeated consequences settle once.
3. Cross-package path: find a Storyteller generation-to-publication boundary.
4. Negative route: where an unauthorized model/tool request must be denied.
5. Exact named symbol (lexical baseline should win or tie).
6. Similar-named decoy in unrelated package.
7. Feature absent in source despite a selected future target.
8. Changing a function requires finding callers/tests.

**Docs:**
1. Question describing fictional time rule in everyday language.
2. Storyteller authority and what its model is forbidden to commit.
3. Admin Support privacy and raw prompt permissions.
4. Selected long-term design vs current realization, requiring `STATUS` companion.
5. Proposal-only design decoy.
6. Archive-only Change decoy.
7. Negative permission or retry case in a long technical document.
8. New or renamed heading / stale index case.

Each case requires an independently verified `gold`: correct owner path#heading and/or file:symbol, required assertions, source SHA, disqualifying counterexample, and whether *no implementation exists*. The evaluator must explicitly mark uncertain/blocked gold; not assume an author-assembled rubric is independent truth.

## Stage A: stand-alone utilities, no paid agent

1. Record `git rev-parse HEAD`, `git status --short`, tool binaries/versions, selected embedding model and model-hash if available, include/exclude scopes and index freshness.
2. Run matched queries against A and B with `top-k=5`; capture raw outputs and wall-clock. Treat tool errors as failures, not zero-byte successes.
3. Use `wiki:read` or original checked code paths to validate retrieved citations. Score `owner@1/@3/@5`, completeness, proposal-as-selected errors, false confident answers, bytes returned, cold/warm query cost, index build/update cost, RAM and source SHA agreement.
4. Create negative fixtures: wrong branch index, dirty-worktree-only change, deleted/renamed heading, stale source, no-match query, and secret/ignored file. Vendor indexing must not expose excluded content.
5. Compare without asserting exact model token savings from byte counts. A candidate that cannot prove index/source freshness is diagnostic-only until fixed.

A basic pilot can be executed manually first. **Do not write an elaborate adapter framework merely to avoid 16 honest shell commands.** HAR02's existing comparison format is useful if already implemented; otherwise record small versioned JSON/Markdown receipts and implement only what repeated evaluations actually require.

## Stage B: agent behavior, with separate explicit approval for each model/client

Use fresh sessions with identical question wording, available source snapshot, permissions and model. Start with 4–6 strategically selected cases, same client/model in three conditions:
- A: agent-native tools + WIKI07 (baseline).
- B: A plus optional tool available, no special instruction beyond its description.
- C: B plus a short conditional instruction: **on unfamiliar behavioral questions, query the semantic tool once, verify the top exact source hit, then fall back to `rg` if it misses; do not call it for known exact paths/symbols.**

**Why a third condition?** Extra retrieval might help intrinsically but be underused by the agent, or it might duplicate grep and consume more context. Track whether it was invoked, whether results changed the chosen next files, duplicated file reads, authorizations, error states, actual reported input/cache tokens, wall time and task correctness. No compulsory “semantic search on every query” policy.

## Setup and portability

- Target workstation baseline: Windows x64 first, Mac secondary; validate vendor-specific requirements rather than claiming portability from a README. Keep tool versions pinned and installs opt-in/outside the main pnpm dependency graph.
- Never add optional vendor packages to the game `compose.yaml`. If a vendor needs an embedding process, scope it to the trial. Inspect model download size, disk and RAM before retrieving anything. Do not automatically run `curl|sh` or install a global agent MCP server.
- Baseline works with no optional software. Missing vendor tool yields `not configured` and normal fallback, never task failure or blocked repository boot.
- Only after CLI results demonstrate value should an MCP registration be tested, with a minimal **read-only tool surface**, limited output and no always-on session-memory write privileges.

## Decision after pilot

Accept only a *reproducible* improvement in a real task class with no new critical authority/security mistakes. Flag if it merely moves the context cost, introduces stale guesses, or encourages redundant searching. Report unsuccessful trials as clearly as successes. If winners differ by corpus, prefer two small optional tools to a false one-engine-everything abstraction.

**Cognee/graph follow-up** requires its own task set of relationship traversals and cross-session continuity (not the same 16 search tasks). It is neither excluded forever nor smuggled into the first round.