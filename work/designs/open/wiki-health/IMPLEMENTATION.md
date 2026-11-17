# Wiki Health | phased implementation proposal

**Design finalized, work packets prepared, not selected.** DOC04 is Done; its observed post-merge baseline is `413917e03059ac613883b76c6d5e462d1b0c5414`. Recheck actual HEAD on execution. The bound implementation sequence is [WIKI01](../../../changes/archive/2026-11/other/2026-11-16--wiki01-markdown-graph-health/CHANGE.md) (Done) → [WIKI02](../../../changes/archive/2026-11/other/2026-11-16--wiki02-static-retrieval-and-hopper/CHANGE.md) (Done) → [WIKI03](../../../changes/archive/2026-11/other/2026-11-16--wiki03-isolated-agent-evaluation/CHANGE.md) (Done, fake harness only), each separately selected and reconciled. **No real model experiment is authorized by any of these packets; WIKI03 may only fake-test and prepare dry runs.** This design creates measurement tools, **not a new documentation taxonomy or dashboard product**.

## Decision: build an Observatory, not a website

Use local Node 24+/pnpm scripts under `scripts/repo-tools/`; the repo already has `check_docs.py`, `knowledge-health.mjs`, `docs-health.mjs`, `repo:brief`, and TypeScript/React. Extend/compose existing logic rather than replace every checker. **No Docusaurus/MkDocs website is necessary** to get wiki benefits; clickable Graphviz DOT or offline HTML can come later. A wiki is a graph of maintained authority, not a particular renderer.

Converge on three entry commands, with stable JSON schemas:

```bash
pnpm wiki:health               # zero-provider graph + correctness diagnostics
pnpm wiki:bench:static         # zero-provider gold graph routes + lexical rank metrics
```

`pnpm wiki:bench:agent` is not a package script. HAR10 removed that fake runner. Do not add it back as an inert command. Optional developer utilities that remain: `pnpm wiki:graph` (DOT/JSON) and `pnpm wiki:health --json`.

### Minimal implementation surfaces

| Area | Proposed path | Contract |
| --- | --- | --- |
| Markdown extraction | `scripts/repo-tools/wiki-core/markdown.mjs` | GFM parser, local paths/anchors, source line, link labels, type, no false fenced-code links |
| Typed graph + BFS | `wiki-core/graph.mjs` | Canonical vs draft vs history, shortest paths, per-type degree, orphan/weak components |
| Scoring + reports | `wiki-core/report.mjs` + `wiki-health.mjs` | Local JSON + human-readable top anomalies; zero provider |
| Lexical retrieval | `wiki-core/search.mjs` + `wiki-bench-static.mjs` | Deterministic BM25-like local rank with fixed tokenizer/index config |
| Golden tasks | Local benchmark runner-controlled dataset, separate from **agent-visible** workspace | Versioned question/gold source/required assertions, hidden from agents |
| Agent adapter | `wiki-core/adapters/codex.mjs` initially, others only when proven | Fresh process/session, JSONL events, read-only checkout, no repo code execution/provider sends |
| Trace + scorer | removed from HEAD | The fake agent trace and scorer are historical. They are not current scripts |
| Test fixtures | `scripts/repo-tools/wiki-tests/` | Good/bad Markdown, graph, gold ranking and fake CLI event streams |
| Output | `out/wiki-health/<sha>/<run-id>/` (gitignored) | `metrics.json`, `issues.json`, `graph.json`, optional `graph.dot`; raw agent traces private |

For `markdown.mjs`, prefer `remark-parse` + `remark-gfm` and a slugger matching GitHub's heading IDs. Add a small dependency only when worth it. Treat the repo as at most a few hundred pages, so **no distributed search, vector database or external graph store**. The static search may be a simple in-process Node BM25 index; SQLite FTS5 is an alternative if an existing Python tool helps, not an infrastructure requirement.

## WK1: Mechanical graph, one sensible Change

Implement parsing and graph/report on pinned snapshot; seed tests from *observed* historical failures:
- Incorrect `../../docs` from `work/designs/open`.
- Old product/technical paths under `work/designs/parked`.
- Dangling anchor, duplicate heading slug, missing directory index, root link into historical “replacement specification”.
- Negative parser cases: GFM table links, reference-style links, inline code, safe custom URI, Next.js path parentheses, Unicode and fragments.

**Acceptance:** zero broken maintained-path links and anchors *on final DOC04 tree*, or explicit named failures reported with paths/lines. 100% canonical page reachability via root/subject routers. Graph reports complete denominator/numerator and p95 route length; no arbitrary link spam to satisfy density. Proven via automated fixtures and two reviewer-chosen concrete pages. Current `work/changes/archive` is excluded from present-day link enforcement and preserved unchanged.

## WK2: Zero-LLM query benchmark, separate Change

Design/verify the 30 gold questions with subject owner; at least two independent humans/agents can propose candidates but **owner/reviewer must confirm final accepted rule and status**. Keep 12 public/sample query wordings and the withheld full answer oracle outside agent-visible repo context. Freeze dataset version and repo SHA. Implement local lexical search and score:
- `Recall@5`, `MRR`, `nDCG@5` when graded sources justify it;
- route hops to gold owner;
- wrong-authority and historical-hit rates;
- category breakdown P/T/S/D/A.

**Pilot thresholds, for calibration not immutable dogma:** gold canonical page reachable for all tasks; average gold route ≤3 link decisions; lexical `Recall@5 ≥0.85` and `MRR ≥0.70` (validate after baseline and adjust only with explicit rationale). If these thresholds produce false failures on deliberately unique documents, understand the gap rather than force keyword stuffing.

### Differential and mutation tests

The best way to prove the benchmark isn't theater is to **make it fail on controlled mistakes**:
1. Delete an inbound wiki link to a mandatory leaf → orphan/reachability regression.
2. Change a canonical heading slug → broken-anchor failure.
3. Move an accepted spec to a parked directory without updating owner routes → wrong-authority route failure.
4. Add 20 irrelevant cross-links to a hub → graph score must not automatically improve.
5. Replace a real answer paragraph with vague promotional text → lexical score may vary but gold answer quality must not be declared complete.
6. Change an implementation symbol name and leave a source map stale → status/traceability review warning; avoid pretending static linking proves runtime behavior.
7. Delete a complete archived Change packet → archival SHA guard fails even if `docs/` is perfect.

## WK3: Fresh-agent trial harness, explicit paid/usage gate

Implement **one adapter**, preferably whichever CLI the owner already has installed and can run in read-only noninteractive mode. Codex is a concrete candidate due to JSONL events; Claude and Cursor adapters are optional later.

The harness controls creation of isolated per-trial contexts:
- New process and thread, same pinned repo revision, disabled session resume and no accessible gold answers.
- Read-only filesystem permissions/sandbox, known allowed tools, no outgoing provider calls from repo code.
- Host monotonic timestamps around process and normalized tool events, actual paths/files opened where observable.
- Each trial writes private run trace plus final answer; grader compares with withheld required assertions/status and audited source code.
- Runs are bounded by owner-approved question count, concurrency, model usage/cost ceiling and timeout. **No implied model spend; do not run if cap or CLI entitlement is unknown.**
- Abort when sandbox protection cannot be demonstrated; prohibit `--force` or unrestricted command/deployment modes.

**Pilot suggestion:** 12 questions × 2 arms (wiki vs minimized wiki) × 1 repetition = **24** model runs, then a second repetition only where variance justifies. Owner may choose fewer or zero. A full 30×2×2 experiment = **120 runs**, potentially costly, and should never be launched automatically. The runner must print estimated maximum attempted runs and configured spend ceiling before confirmation, then fail closed.

**Pass is quality-first:** no critical authority/permission misinformation, correct source-status for pilot high-risk cases, all trial outputs traceable to real tool events. Compare median/p95 time, tool/file reads, and provider usage **only on correct answers**; do not make a quick wrong answer look efficient. Missing provider token metrics are reported as missing, never 0. A few trial examples cannot justify precise “40% faster” claims.

## WK4: Maintenance integration, only if WK1–3 demonstrate value

- `repo:docs-health` may call WK1 in zero-provider mode; `repo:brief` could show a **single compact line** with “wiki integrity: errors X, unreachable Y, baseline Z” *only* after the report is reliable and fast.
- Each future docs-bearing Change should record an optional path-level before/after wiki health delta and verify it did not regress.
- A source-changing Change affecting exported APIs, player authorization, game invariants, publication and cost should link its changed code owner to the corresponding canonical technical heading and update STATUS proof tier when warranted. All touched symbols verified at exact SHA.
- Keep user-defined targets and red flags in a small configuration file, not scattered regex checks or mandatory long YAML frontmatter in each article.
- Run a benchmark after DOC04, after any next large product/technical reorganization, and when a previous fresh reader demonstrably got lost. No frequent paid nightly runs.

## Sample dashboard shape, **not current measured values**

```text
Wiki Health @ <actual SHA>
Integrity   broken files: ?   anchors: ?   active drafts: ?   history leaks: ?
Topology    pages: ?          reachable: ?  p95 hops: ?       orphans: ?
Retrieval   W0 gold routes: ? W1 Recall@5: ?  MRR: ?          wrong-authority@5: ?
Agent pilot runs: ?           task success: ? critical false claims: ?
Efficiency  first-owner ms: ? files read: ?  tool calls: ?   reported tokens/US$: ?
Fidelity    docs-vs-code discrepancies: ?  unverified assertions: ?  blocked gates: ?
Top problems: [file:line -> target], [gold question -> wrong route], [claim -> source mismatch]
```

Unknown values remain **?**, not invented numbers. At first, a good `issues.json` that tells us exactly which three links, which orphan, which wrong source claim to fix is more valuable than a giant animated dashboard.

## Operating model

**Do not turn Wiki Health into another permanent documentation program.** This folder is a design proposal. When authorized, implement it across a few small Change packets and then close this proposal. Permanent process knowledge belongs in one `.agents` maintenance reference and developer command usage, not five overlapping manuals. Evaluations are versioned input data and generated outputs, not product law.

**Rationale:** It is easy to make a metric go up; it's harder to make a reader stop believing an obsolete spec. The complete architecture measures both.
