# Wiki graph and mechanical health specification

**Status:** metric definition. WIKI01 implements `pnpm wiki:health` and `pnpm wiki:graph` in `scripts/repo-tools/wiki-health.mjs`. The first measured baseline is on that Change, including pages that are still unreachable. This file does not invent a health score. No LLM, browser, external network, GitHub Actions, or provider is required.

## A. Define the graph before counting links

The project has four kinds of *maintained knowledge* and several historical stores. They cannot be combined into one undifferentiated graph.

| Node class | Default paths | How evaluated |
| --- | --- | --- |
| Canonical page | `docs/product/**`, `docs/technical/**`, `docs/decisions/**`, `docs/runbooks/**` | Main wiki connectivity and authority |
| Canonical entry/router | `docs/README.md`, `docs/*/README.md`, `AGENTS.md`, `STATUS.md` | Directed discovery, appropriate high outdegree |
| Open decisions | `work/designs/open/**`, linked from product topic | Separate *proposed* graph; reachable but never normative |
| Source owners | selected source-adjacent README and referenced code/test paths | Separate `implementation-of` / `observed-in` graph; not product authority |
| Evidence | actual `evidence/inspections`, `evidence/runs` | Terminal proof targets; nonnormative |
| History / parked / research | `work/changes/archive`, `work/designs/parked`, `work/sessions`, `research` | On-demand historical destinations; **never increase canonical reachability or authority score** |

Represent directed `Page -> Page` links and optionally `Page#Heading -> Page#Heading` for fine-grained navigation. A `Page -> source file` path is a *cross-layer citation*, not an ordinary wiki page link. Count image assets, custom schemes, footnotes and external URLs separately. Parse link *type* from the source/destination classes and retain raw anchor label / originating heading. A top-level link from `docs/README.md` into `work/changes/archive` is a historical detour; it must never count as “better product reachability.”

JSON artifact schema (illustrative; exact fields versioned):

```json
{
  "schema": "wiki.graph.v1",
  "repoSha": "actual-sha",
  "generatedAt": "actual-utc-time",
  "nodes": [
    {"id":"docs/product/gameplay/time-and-autonomy.md",
     "kind":"canonical-product","bytes":0,"headingIds":[]}
  ],
  "edges": [
    {"from":"docs/README.md","to":"docs/product/gameplay/time-and-autonomy.md",
     "fromHeading":null,"toAnchor":null,"label":"Time and autonomy",
     "kind":"canonical-navigation","line":0}
  ],
  "diagnostics": []
}
```

The script must **never invent** the SHA, code test status, time, or measured metric. `git rev-parse HEAD` establishes the source revision; dirty working trees must be either refused or explicitly marked dirty. Output is local and gitignored by default.

## B. Parse Markdown correctly

Use a real GFM/Markdown AST parser when practical (`remark-parse` + `remark-gfm` with an anchor slugger matching the GitHub rendering rules), not a single regex. Resolve:

- Inline links, reference-style links and definitions, autolinks, linked images, URL-encoded paths, root-relative paths, directory `README.md` / index routes, `#heading` fragments and headings with repeated slugs.
- Parenthesized Next.js paths and other valid spaces/Unicode names; filesystem case sensitivity differences on Windows versus Linux.
- Inline/fenced code and quotes are **not active references**. Custom `thread:`, `mailto:` and external URLs are separate and do not produce false missing-file errors. External links can be checked on a separate slow opt-in lane, not every local run.
- Broken destination path and broken destination anchor are distinct errors. A path may exist while its heading changed. A literal code path in backticks is not automatically a Markdown link.
- Duplicate links from one page to one destination are counted for **UI density**, but only once for unique indegree/outdegree graph centrality. Keep both counts so copy-pasted link clutter is visible.

Add parser fixtures for all these cases and for an intentional broken `work/designs/open/product-open-questions.md`-style relative link. Explicitly test that historical archive URLs do not enter the canonical graph.

## C. Core health metrics

Report raw numerator/denominator and examples, not only red/green scores.

| Metric | Mechanical definition | Initial interpretation |
| --- | --- | --- |
| **Broken path rate** | Missing file/directory targets ÷ all maintained internal link occurrences | **0** required for canonical and active designs |
| **Broken anchor rate** | Nonexistent target headings ÷ maintained local anchor links | **0** required for canonical and active designs |
| **Canonical reachability** | Canonical pages reached by directed links from `docs/README.md` ÷ all canonical pages | **100%** intended; expose every missing page |
| **Hop distribution** | Shortest directed BFS distance from wiki root to each canonical page | Pilot target p95 ≤ **3**, max **4** for approved topic depth; calibrate |
| **Orphan ratio** | Canonical leaf pages with zero *distinct incoming maintained canonical links* ÷ canonical leaves | **0 unjustified**, with explicit source-map/entry exceptions |
| **Dead-end pages** | Canonical non-router pages with zero useful outbound maintained links | Warning; a complete terminal spec may be okay |
| **In/out-degree** | Distinct incoming/outgoing wiki edges by page type; also total link occurrences | Outliers to review, not universal hard minimum |
| **Index fanout** | Canonical pages reachable per root and subject router, direct and within two hops | Spot missing subject sections or over-broad hubs |
| **Walled-garden / isolated component** | Undirected weak component not joined to maintained router; or strongly linked subgraph with few external inbound edges | Flag only if canonical; tree-like structures need not be strongly connected |
| **Navigation bottleneck** | Percentage of pages unreachable/longer if a bridge/router node is removed; optionally betweenness centrality | Advisory. Indexes are legitimately central |
| **Historical leakage** | First/second-hop canonical router links to archived/parked/expired sources as answer owner | Goal zero *unjustified authority* detours, not zero legitimate “history” links |
| **Link-label quality** | Percentage of vague links (“here”, “more”, “read”, raw path) among meaningful router anchors | Advisory; use precise question/topic labels |
| **Link density** | Link occurrences per 1,000 body words, split by router/product/technical/open/evidence | Compare within type; detect link farms and lonely large pages |
| **Large-page navigation** | For pages above a *calibrated* size, presence of a question→heading index and heading depth | Warning only; big coherent specs are allowed |
| **Exact/near duplicates** | Identical Git blobs and approximate 6–8-word shingle overlap between **canonical** sections | Duplicate candidates, not automatic deletion |
| **Cross-layer ownership links** | Canonical spec → appropriate technical owner / source map / evidence / open design gate | Coverage by required relationship, not “link to everything” |
| **Freshness review debt** | Changed code owner paths since last docs/source-map reconciliation at inspected SHA | Review candidates, **not** proof of staleness |

**Metric trap:** A router with 30 links is often excellent; a concise source-of-truth page with one link may be excellent. Global “degree < 3 bad” and “PageRank high good” would reward link spam and mislead maintenance. Use PageRank/betweenness only to prioritize suspicious nodes for inspection, never as a standalone content grade.

## D. Topic and code projection graphs

**Two simultaneous views** prevent the documentation graph from becoming an index-only vanity metric:

1. **Navigation graph:** “Can I reach the relevant normative heading?” For each tested query, use manually assigned gold `page#heading`. Compute shortest route from allowed entrypoint. A mechanically short path is a *necessary* but not *sufficient* answer.
2. **Traceability graph:** “What is the relationship of this norm to current implementation?” Build typed edges `product -> technical -> sourceREADME -> code/test -> dated evidence` **only where actual links/evidence exist**. Report important missing edge categories and source paths that no longer exist. Do **not** infer implementation from an edge.

Proof-tier metadata is separate: `selected`, `source-observed`, `provider-free tested`, `connected tested`, `live observed`, `human accepted`, `absent`. A design-to-source link is *not* a test result. A named symbol can be verified with TS compiler/index when valuable, but a backticked word alone cannot be mechanically treated as a valid export.

For changed code paths, use source-nearest README and a small module→contract map to flag likely stale documentation after a Change. The map must have a maintained owner; no monstrous autogenerated `src/**/*.tsx -> every MD` graph.

## D2. The Wiki Hopper: model-free simulated navigation

A particularly useful *creative* benchmark is a **seeded link-following reader**. It answers a question the raw shortest path does not: *A route exists, but would someone plausibly choose it?*

For each frozen question with a gold canonical owner heading:

1. Start at `docs/README.md`, or the user-specified entrypoint, with **no global view of the graph**.
2. At each visible page, consider only actual outbound links. Score their descriptive labels, destination titles and optionally one-line adjacent context against the question using a small fixed lexical function; **never consult the gold owner when choosing**.
3. Follow the highest-scored link for a deterministic greedy run. Repeat with a seeded stochastic top-3 choice policy (for example 100 trials/question), a 6-hop cap and an explicit backtrack option. Do not grant teleportation to a known file path.
4. Stop when the page or heading matches the withheld gold, or when max hops/no useful links/loop is reached. Record whether a historical, parked or proposed page was mistaken for the accepted answer.
5. Report `Hopper hit@3`, `hit@6`, mean/median hops when successful, loop frequency, backtracks, and wrong-authority detour rate. Compare the Hopper's path with the oracle BFS shortest path.

This is **zero-LLM experimental navigation**, not a substitute for agent understanding. It will reveal weak link labels such as “technical details” or dead-ended intermediate pages even when every page is technically reachable. Because the scoring policy can be gamed with keyword-filled labels, use at least two policies (greedy and stochastic) and check real-agent outcomes before optimizing the wiki to the simulator.

## E. Baselines, calibration and failure policy

**Hard fail locally:** canonical/active-design broken paths/anchors, canonical unreachable pages without approved exception, explicitly banned authoritative route into `archive/parked/evidence`, duplicate active canonical pages that were intended to be aliases, malformed link parse regression. Every failure returns offending source path, line, target, root route and suggested owner.

**Warning:** excessive router fanout, anomalous depth, zero relevant inbound links for a new subject, weak cross-domain traceability, large page without section routing, high shingle similarity, stale candidate code symbols. Not hard thresholds until measured pilot and human review.

**Do not aggregate into a single score until proven useful.** Report four separate axes and historical trend: (1) link integrity, (2) graph discoverability, (3) retrieval task success, and (4) current-source fidelity. Even if a later dashboard offers a weighted index, a broken product authority/permission boundary must remain a standalone blocking condition.

Suggested commands (not yet implemented):
```text
pnpm wiki:health                   # local integrity + graph report, zero model calls
pnpm wiki:graph                    # JSON + Graphviz DOT; optional local static HTML
pnpm wiki:health --baseline <sha>  # compare reproducible git snapshots
```

Output examples: `out/wiki-health/graph.json`, `metrics.json`, `issues.json`, `wiki.dot`. Treat `out/wiki-health/` as **gitignored** transient output; select a small compact report for evidence only when useful. Keep visualizations and run artifacts from becoming a fourth historical documentation layer.

## F. Regression fixtures

Must fail: broken path, broken fragment, unreachable canonical product page, misresolved Windows path, root link to parked “replacement specification” masquerading as authority, duplicate full canonical alias, stale source symbol reference on a touched module.

Must pass: intentional short terminal page with no outbound links, highly linked helpful subject router, archive packet retaining broken historical relative paths, linked image, Unicode/parentheses/fragment slug, GFM table references, safe `thread:` URI, and big coherent 60 KB technical page with a useful heading index.

**Success is not “the graph looks pretty.”** It is that a new agent has no plausible way to get lost on a dead path or mistake a retired program for product authority when following normal current routes.
