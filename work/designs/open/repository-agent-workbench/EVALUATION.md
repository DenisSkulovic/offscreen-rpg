# Retrieval evaluation | falsify the need for more tooling

**Status:** historical semantic-tool evaluation protocol; active next decision is [agent-native harness evaluation](AGENT-NATIVE-EVALUATION.md). This document alone does not authorize paid agents, global vendor installs or always-on services. Owners: developer harness and the existing [WIKI07](https://github.com/DenisSkulovic/offscreen-rpg/blob/34e2b4fd8d9d9967e13311da3a938460b1a02244/work/changes/archive/2026-11/documentation/2026-11-16--wiki07-retrieval-by-heading/CHANGE.md)/[WIKI08](https://github.com/DenisSkulovic/offscreen-rpg/blob/34e2b4fd8d9d9967e13311da3a938460b1a02244/work/changes/archive/2026-11/documentation/2026-11-16--wiki08-content-quality-gates/CHANGE.md) sequence. Compare on the same frozen Git tree and an independently reviewed answer oracle.

**Strategic update (2026-11-17):** HAR03–HAR07 are diagnostics, not demonstrated live-agent wins. [HAR08](https://github.com/DenisSkulovic/offscreen-rpg/blob/34e2b4fd8d9d9967e13311da3a938460b1a02244/work/changes/archive/2026-11/retrieval/2026-11-17--har08-agent-native-harness-evaluation/CHANGE.md) prepared one real-client A/B and did not launch it. The historical retrieval-tool gates below remain useful **only for a later specialist semantic trial**, not as a mandate to keep tuning DFS or to install Grepai/QMD.

## Gate 0: establish the real search baseline, then experiment

- Reconfirm on the installed client that Cursor's search route is **Instant Grep**, not presumed embedding search. Claude Code includes bundled ripgrep. Record actual version/settings/tool use and don't equate strong agent reasoning over grep with a local semantic index.
- Independently check WIKI07 heading correctness as the **documentation** control arm. WIKI08 content-quality repair continues independently; inaccurate text is a content failure rather than a search victory.
- Proceed to a deliberately small, zero-paid-model semantic CLI pilot on a pinned tree even without a previously observed failure. This is learning, not automatic adoption. See [PILOT](PILOT.md).
- No Docker graph or automatic model downloading as a side effect of a normal repository clone.

## Gate 1: build a discriminating task set

Begin with 16 independently reviewed tasks, 8 code and 8 docs, as defined in [PILOT](PILOT.md). Expand to 12–20 or more held-out tasks if early evidence suggests a real effect; select across: (a) exact named symbol, (b) natural-language question to ratified product heading, (c) contract + source realization, (d) cross-package caller/reference tracing, (e) hidden dependency with weak lexical overlap, (f) missing/nonexistent feature requiring correct refusal, (g) proposal versus selected boundary, (h) historical Change decoy, (i) same question after a new commit/index becomes stale, (j) dirty-worktree-only change, (k) negative retry/permission path and (l) costly file-read temptation.

Each gold record names expected owner path#heading or source symbols **at a pinned SHA**, necessary assertions, strongest counterexample, authority/evidence class, source/test receipt and independent reviewer verdict. Keep the answer oracle outside the agent-visible indexed corpus. WIKI05's training/gold tasks cannot leak into the live retrieval index. Do not score an unratified design as implemented.

## Gate 2: cheap zero-provider A/B

Compare on the *same* revision, tasks and safe tool permissions:

- **A (control):** existing agent-native search + Git/`rg` + WIKI07's bounded exact headings.
- **B (candidate):** for code, Grepai natural-language search; for Markdown, QMD candidate discovery followed by `wiki:read` for source-exact verification. Consider SIFS as a separate lower-overhead challenger, not an extra default agent tool. Keep the same corpus/ref and cap results.
- Before an LLM trial, test the adapter itself with fixture/recorded calls: correct source line, exact SHA, dirty/stale detection, failed no-match, reference crosses package, authority labeling, index refresh after a new commit, and clean behavior with server offline.

Report separately: Recall@5 and first-right-owner; complete-answer correctness; source/status tier correctness; false permission/proposal claims; missed negative cases; wall time; instrumented read bytes; tool calls; startup time; indexing time and RAM; added MCP/tool-definition context cost; freshness delays. Tokens only if actually reported by the client. **Do not convert bytes into invented tokens or use speed of wrong answers as a win.**

## Gate 3: agent integration, not merely index ranking (separate authorization)

With explicit user approval for the named model, max calls, spend cap and a proven read-only sandbox, run fresh-session same-model trials with order/case randomization and independent grading across **A: existing native tools**, **B: additional search available**, and **C: additional search plus a small conditional invocation instruction**. Use one clearly identified client and tool configuration per arm. Repeated trials are warranted for noisy results; a 12-case exploratory pilot is not statistically conclusive. Missing provider usage measurements remain `unknown`.

**Adoption rule:** no new critical authority/security/permission error, no substantial regression in correctly answering source+target questions, and a reproducible benefit in a task family the baseline actually fails. Illustrative evidence worth considering: resolves at least three previously failed held-out tasks without new severe errors **or** materially reduces correct-answer search time/reads after accounting for startup/indexing. These are decision heuristics, not statistical guarantees or benchmark targets to game.

**Rejection rule:** parity with baseline, unreliable revision/dirty checks, costly recurring maintenance, offline fragility, sensitive-data transfer, noisy context/tool definitions, or gains that disappear under independent fresh-task evaluation -> do not adopt. A false negative from one source task should be investigated, not silently discarded.

## If something wins

Create a *new* narrow implementation Change after owner selection. Make the winning tool explicitly opt-in, disabled by default, scoped to one local clone, read-only, disposable, version-pinned, and uninstallable with no effect on core `pnpm` workflows. No compose stack unless it is actually necessary and measured against a lighter launcher. The agent may prefer native tools for simple symbol/file questions.

**HAR06 correction:** [Accepted retrieval-funnel decision](HAR06-DECISION.md) and [Done HAR06](https://github.com/DenisSkulovic/offscreen-rpg/blob/34e2b4fd8d9d9967e13311da3a938460b1a02244/work/changes/archive/2026-11/retrieval/2026-11-17--har06-retrieval-funnel/CHANGE.md) supersede HAR03's weak one-shot/top-five comparison as a test of search quality. HAR06 requires clean source/index receipts, multi-role gold, candidate recall@20/@30 and final evidence correctness. Neither a vector reranker nor an agent/subagent trial is authorized.

**Change governance:** HAR01, HAR02, and HAR03 are Done. The comparer does not authorize a vendor install. [HAR03](https://github.com/DenisSkulovic/offscreen-rpg/blob/34e2b4fd8d9d9967e13311da3a938460b1a02244/work/changes/archive/2026-11/retrieval/2026-11-17--har03-semantic-retrieval-pilot/CHANGE.md) recorded the local trial and did not adopt Grepai or QMD. The benchmark runner must not spawn paid models or download large models by default.
