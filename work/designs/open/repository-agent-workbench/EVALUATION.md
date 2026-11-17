# Retrieval evaluation | falsify the need for more tooling

**Status:** study protocol, **not authority to run paid models, install vendors or start services**. Owners: developer harness and the existing [WIKI07](../../../changes/open/2026-11-16--wiki07-retrieval-by-heading/CHANGE.md)/[WIKI08](../../../changes/open/2026-11-16--wiki08-content-quality-gates/CHANGE.md) sequence. Compare on the same frozen Git tree and an independently reviewed answer oracle.

## Gate 0: complete current work and identify real failures

- Finish WIKI07's independently reviewed ten-question heading test. Record its misses, wrong-authority routes, truncation/continuation defects and source line errors.
- Use WIKI08's reviewed content claims to identify cases where the text itself is stale. **Do not count a false document as a retrieval failure** and then 'fix' it with a smarter search engine.
- Measure a few real Cursor tasks with current `rg`, native code search and WIKI07. If no recurring failures remain, **stop**; a Docker service is not a project milestone.

## Gate 1: build a discriminating task set

Hold out 12–20 tasks, selected across: (a) exact named symbol, (b) natural-language question to ratified product heading, (c) contract + source realization, (d) cross-package caller/reference tracing, (e) hidden dependency with weak lexical overlap, (f) missing/nonexistent feature requiring correct refusal, (g) proposal versus selected boundary, (h) historical Change decoy, (i) same question after a new commit/index becomes stale, (j) dirty-worktree-only change, (k) negative retry/permission path and (l) costly file-read temptation.

Each gold record names expected owner path#heading or source symbols **at a pinned SHA**, necessary assertions, strongest counterexample, authority/evidence class, source/test receipt and independent reviewer verdict. Keep the answer oracle outside the agent-visible indexed corpus. WIKI05's training/gold tasks cannot leak into the live retrieval index. Do not score an unratified design as implemented.

## Gate 2: cheap zero-provider A/B

Compare on the *same* revision, tasks and safe tool permissions:

- **A (control):** existing agent-native search + Git/`rg` + WIKI07's bounded exact headings.
- **B (candidate):** A + *one* optional read-only retrieval adapter (e.g. Serena for symbol navigation, or hybrid retrieval for low-overlap conceptual search). Do not test three new indexers at once or let one arm get a better source corpus.
- Before an LLM trial, test the adapter itself with fixture/recorded calls: correct source line, exact SHA, dirty/stale detection, failed no-match, reference crosses package, authority labeling, index refresh after a new commit, and clean behavior with server offline.

Report separately: Recall@5 and first-right-owner; complete-answer correctness; source/status tier correctness; false permission/proposal claims; missed negative cases; wall time; instrumented read bytes; tool calls; startup time; indexing time and RAM; added MCP/tool-definition context cost; freshness delays. Tokens only if actually reported by the client. **Do not convert bytes into invented tokens or use speed of wrong answers as a win.**

## Gate 3: real agent experiment (separate authorization)

With explicit user approval for the named model, max calls, spend cap and a proven read-only sandbox, run fresh-session same-model paired trials with order/case randomization and independent grading. Use one clearly identified client and tool configuration per arm. Repeated trials are warranted for noisy results; a 12-case exploratory pilot is not statistically conclusive. Missing provider usage measurements remain `unknown`.

**Adoption rule:** no new critical authority/security/permission error, no substantial regression in correctly answering source+target questions, and a reproducible benefit in a task family the baseline actually fails. Illustrative evidence worth considering: resolves at least three previously failed held-out tasks without new severe errors **or** materially reduces correct-answer search time/reads after accounting for startup/indexing. These are decision heuristics, not statistical guarantees or benchmark targets to game.

**Rejection rule:** parity with baseline, unreliable revision/dirty checks, costly recurring maintenance, offline fragility, sensitive-data transfer, noisy context/tool definitions, or gains that disappear under independent fresh-task evaluation -> do not adopt. A false negative from one source task should be investigated, not silently discarded.

## If something wins

Create a *new* narrow implementation Change after owner selection. Make the winning tool explicitly opt-in, disabled by default, scoped to one local clone, read-only, disposable, version-pinned, and uninstallable with no effect on core `pnpm` workflows. No compose stack unless it is actually necessary and measured against a lighter launcher. The agent may prefer native tools for simple symbol/file questions.

**Change governance:** HAR01 and HAR02 below are preparation proposals, not permission for vendor installation. The benchmark runner must not spawn paid models or download large models by default.
