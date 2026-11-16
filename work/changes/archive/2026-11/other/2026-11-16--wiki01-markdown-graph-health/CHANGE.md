# WIKI01 | Markdown wiki graph and health report

**State: Done (2026-11-16).** Code-bearing documentation-tooling Change. DOC04 is Done. No model/provider calls. Owner authorized sequential Wiki Health implementation starting here.
**Design:** [Wiki Health](../../../../../designs/open/wiki-health/README.md) and [Graph specification](../../../../../designs/open/wiki-health/GRAPH-HEALTH.md).
**Observed post-DOC04 baseline:** `413917e03059ac613883b76c6d5e462d1b0c5414`. At implementation, inspect new HEAD and current local work; never assume it is still this SHA.

## Outcome

Construct the directed graph of maintained wiki pages. Calculate actual broken links, orphan pages, canonical reachability, minimum root-link hops, bottlenecks, unnecessary history detours, suspicious link outliers and duplicated page candidates. Correct node/edge classification is part of the result; having many links is not automatically good.

**Implement commands**:
```text
pnpm wiki:health
pnpm wiki:health --json
pnpm wiki:graph
pnpm wiki:health --self-test
```

Local Node 24+, deterministic, zero provider and network calls; output human report or versioned JSON and DOT. No web UI.

## A. Markdown parsing and graph rules

Create a shared parser/resolver and typed graph under `scripts/repo-tools/wiki-core/`. Prefer pinned GFM AST parser (remark-parse and remark-gfm with matching slugger) over extending regex. Support inline/reference-style links, GFM tables, local heading fragments, duplicate heading slugs, URL encoding, Unicode, Next.js parentheses, directory README/index, and real relative resolution. Ignore inline/fenced code and quoted examples, classify images separately, skip external/custom schemes such as `thread:` correctly, and detect case mismatches even on Windows.

Every graph edge identifies source page/line/heading, label, destination page/anchor, destination class and occurrence count. Distinct directed page edges count once for indegree/outdegree; repeated link occurrences count for density. Nodes: canonical product/technical, decisions/runbooks, routers, open designs, **active/blocked Changes**, source-map READMEs, evidence and historic/terminal. Open Changes are current execution proposals, never an alternative product or technical authority. Archived Changes **never** increase canonical wiki reachability and are exempt from present-day link lint. No inference that source is implemented merely because docs link to it.

Version the outputs as `wiki.graph.v1` and `wiki.health.v1`. Include actual Git SHA, dirty-worktree status, scan denominators and exclusions. Sort output deterministically; do not treat timestamps as semantic differences.

## B. Diagnostic metrics and classification

**Hard errors (after verified correct parsing):**
- Broken maintained internal file/directory path or heading fragment in `docs/**`, `work/designs/open/**`, `work/changes/open/**`, or the enumerated root/source index scope.
- Canonical page unreachable via directed links from `docs/README.md` without an explicitly reviewed exception.
- Root/subject router routing a reader to an archived/parked/deleted page **as normative owner**; a legitimate historic or evidence citation is not an error.
- Broken test fixtures, invalid graph schema or a code regression in parse/resolve.

**Warnings, not automatic hard thresholds:** median/p95/max shortest root hops (pilot p95 target ≤3, calibrate); orphan pages and dead ends; weakly connected components and bridge/bottleneck pages; indegree/outdegree by document role; repeated link density per 1,000 words by page type; missing subject routes, large pages without helpful heading navigation, duplicate canonical sections; source/technical/evidence crosslinks with suspect authority classes. Do not call high PageRank good documentation, and do not enforce a minimum number of links per document.

Zero broken maintained local links/anchors and 100% justified canonical reachability are desired. If the real baseline fails, **report issues** and provide owner-reviewed exceptions or separately authorized fixes. Never bulk-spam links to chase a target.

## C. Artifacts, ownership and safety

Save `metrics.json`, `issues.json`, `graph.json` and `graph.dot` under gitignored `out/wiki-health/<actual-SHA>/`. CLI stdout gives counts and top actionable paths with line/target/why. No secret values, full bodies or private prompts in output. A dirty worktree is measured as dirty, never mislabeled a clean SHA.

Keep `python scripts/check_docs.py` as an independent link-check cross-check. Extend package scripts, lockfile, local tests and a single agent-maintenance reference only as necessary. Do **not** modify product/gameplay/frontend/backend logic, provider config, live infra, old completed Changes or DOC04 archive.

Do not auto-run on every `repo:brief` invocation until actual performance is measured. Prefer `node:test` and in-memory/temp tree fixtures; no GitHub Actions cost.

## Required proof

See [verification](VERIFICATION.md). Negative tests must fail an incorrect active-design relative path, missing heading, root-unreachable leaf, duplicate slug case mismatch and a root pointer declaring retired spec normative. Positive tests must pass a valid long technical page, high-link router, terminal archive with historically broken links, custom `thread:` URI, Unicode, parentheses and GFM links. Report real before/after metrics with numeric denominators, not fabricated scores.

## Measured baseline

Dirty worktree on `0694760d159e331f1628c89931b7921f841df6c2`, Windows, `pnpm wiki:health` exit **1** in 698 ms. This is the post-DOC04 graph, not a cleaned-up score. Schemas `wiki.health.v1` and `wiki.graph.v1`. Maintained pages 155. Canonical `docs/**` pages 74. Reachable from `docs/README.md`: **69/74**. Maintained link occurrences 1312. Anchored occurrences 188. Distinct edges 1200. Broken paths 0, broken anchors 0, case mismatches 0, authority-route violations 0. Hop sample 68 (root excluded): min 1, median 2, p95 3, max 3. Orphan warnings 4. Dead-end warnings 3. Undirected components 2. Reviewed exceptions 0.

Hard errors, all `unreachable-canonical`:

- `docs/runbooks/README.md` — `AGENTS.md` links the index; `docs/README.md` links `runbooks/local-development.md` and skips the index.
- `docs/technical/admin/console-and-read-models.md`
- `docs/technical/lab/experiment-protocol.md` — also the sole second undirected component. Source maps and an open design cite it; the technical router does not.
- `docs/technical/observability/capture-and-provenance.md`
- `docs/technical/observability/telemetry-and-diagnostics.md`

No product or technical page was edited to add links. `python scripts/check_docs.py` checked 223 Markdown files and reported 0 problems. A second in-memory build produced identical node and edge arrays. Output: gitignored `out/wiki-health/<sha>-dirty/`. Provider spend: no call.

## Reconciliation ledger

| Area | Required check | State |
| --- | --- | --- |
| Parser and path rules | GFM / fragments / context-specific fixtures | updated `scripts/repo-tools/wiki-core/markdown.mjs`, `slug.mjs`, `paths.mjs` |
| Typed graph | Reachability / shortest paths / roles / counts | updated `scripts/repo-tools/wiki-core/model.mjs` |
| Commands and reports | JSON/DOT reproducibility and exit codes | updated `package.json` `wiki:health`, `wiki:graph`; `scripts/repo-tools/wiki-health.mjs` |
| Old checks | Independent `check_docs.py` remains functional | unchanged. 223 files, 0 problems |
| Safety | No provider calls/runtime edits; full terminal archive retained | unchanged game/runtime source. Archive not rewritten. `out/` gitignored |
| Agent maintenance | One command reference | updated `.agents/README.md`, `.agents/rules/documentation.md`, `.agents/rules/verification.md`, `.agents/references/documentation-navigation-standard.md` |
| Product and technical pages | Do not spam links to chase reachability | unchanged. Five unreachable pages remain visible failures |
| Wiki Health design | Tool status versus hypothetical scores | updated `work/designs/open/wiki-health/README.md` and `GRAPH-HEALTH.md` status only |
