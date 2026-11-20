# Architecture-memory accessories | Cognee-first, reversible research

**Historical design hypothesis (2026-11-17), superseded by the measured negative adoption decision.** The investigation was [closed without Cognee adoption](https://github.com/DenisSkulovic/offscreen-rpg/blob/34e2b4fd8d9d9967e13311da3a938460b1a02244/work/changes/archive/2026-11/retrieval/2026-11-17--har09-architectural-memory-pilot/CHANGE.md). The [first-class research result](../../../../research/agent-practice/COGNEE-EVALUATION-2026-11-17.md) and [experiment register](../../../../research/agent-practice/RETRIEVAL-EXPERIMENTS-2026-11-17.md) own the actual conclusion. The design below records *what we intended to test*, not a pending authorization, current tool recommendation or complete benchmark result.

## Why this is a different experiment

HAR03–HAR07 tried to find current TypeScript owner files through variants of one-shot search, heuristic navigation and document hops. HAR08 prepares a real coding-agent baseline. **A persistent architectural memory graph addresses a different failure mode:** finding a decision made months ago, its rationale, its superseding decision, or a surprising connection between mechanics, publication, retries and operational guarantees.

**Hypothesis:** an agent may retrieve useful *conceptual and historical leads* that ordinary native grep, source maps and the wiki do not uncover within a comparable effort budget. **Not hypothesis:** installing Cognee automatically makes any coding agent smarter, or replaces product → technical → code governance.

This is a **derived disposable projection**. Original committed Markdown, source, STATUS, tests and Change selection remain authoritative. A Cognee graph may offer leads, not grant permissions or certify implementation.

## Technology decision and alternatives

| Candidate | Actual niche | Advantage worth testing | Why not install everything |
| --- | --- | --- | --- |
| **Cognee** — primary | Document/entity/relationship memory; deterministic code graph; explicit retrieval APIs | One candidate may address architecture archaeology and provide a separate code-graph probe. Its local embedded options reduce operational burden. | Document graph may need local GLiNER + embedding model downloads or configured LLM/provider; auto-agent hooks can inject context and capture sessions. Both must stay disabled in experiment. |
| **CodeGraph** — future code-only challenger | Local pre-indexed AST/symbol/import/caller graph | Could beat iterative grep for change-impact and multi-hop symbol queries | Different use case; auto agent wiring/watchers risk confounding test. Compare to TS/LSP in a **separate** optional code-graph trial if Cognee code graph proves useful. |
| **Graphiti** — parked temporal alternative | Time-evolving entity/fact graph with provenance | Stronger temporal validity model could match superseded design decisions | It's a framework and requires graph backend, LLM/embeddings, retrieval/ops design; not lightweight first test. |
| **LightRAG** — parked docs challenger | Knowledge-graph-assisted document RAG | Rich document retrieval and graph-aware connections | Broad ingestion and model/configuration stack; duplication of the same objective in this wave. |
| **Existing wiki + native search** — baseline | Canonical owner hierarchy, status, heading retrieval, package maps, Git/rg | Already present; cheap, deterministic and authority-aware | Needs reasoning agent for unexpected historical connections, which is the incremental opportunity being tested. |

Official sources checked 2026-11-17:
- Cognee [package/quickstart](https://pypi.org/project/cognee/), [code graph guide](https://docs.cognee.ai/guides/code-graph), [MCP configuration](https://github.com/topoteretes/cognee/blob/main/cognee-mcp/README.md), [Claude Code plugin](https://github.com/topoteretes/cognee-integrations/blob/main/integrations/claude-code/README.md).
- [CodeGraph](https://github.com/colbymchenry/codegraph); [Graphiti](https://github.com/getzep/graphiti); [LightRAG](https://github.com/HKUDS/LightRAG).

**Version-dependent reality:** these are vendor capabilities described in current documentation, **not local verification on Windows or Offscreen RPG**. Cursor must record exact package/plugin revisions, support for TypeScript and licensing, hardware/resource footprint, storage location, network behavior and any model activity before trying them. Do not present vendor-promoted benchmarks as our evidence.

## Two separate lanes, never conflated

### Lane M (primary): architectural memory and cross-domain discovery

**Small fixed corpus**, not "dump everything":

1. **Selected target**: 5–10 relevant current product and technical owner sections, linked decisions and 1–3 package source maps.
2. **Realization**: matching STATUS excerpt and a tiny set of source/test anchors only to check truth, not as assumed architecture facts.
3. **History**: 5–10 historical Change/design/forensic or research sections selected by a reproducible, documented rule, not by knowing the future gold answers. Historical content explicitly says **superseded, rejected, proposed or merely observed** as appropriate.

Prefer short source-exact Markdown extracts with a sidecar manifest per item: \`repo SHA, relative path, heading/anchor, line range, authority lane, validity/supersession status, source hash, ingestion method, extraction-model/version\`. Don't assume Cognee retains every field: if it cannot round-trip provenance, maintain **local sidecar lookup** and require returned text to be matched back to a source-exact span before scoring.

**Query families** (not exact prefilled gold prompts): "Why did we reject X?"; "Which invariant connects A and B?"; "What was previously believed, and what replaced it?"; "Which current design contradicts a historical assumption?"; "Is the described feature selected, implemented or merely proposed?"; "Find an intentionally absent relation and abstain." Candidates require independent human-reviewed rubrics and a frozen SHA, with **unreviewed** clearly identified if independent review is unavailable.

**Retrieval arms (no real coding-agent model needed initially):**
- **A:** existing \`wiki:find/wiki:read\` and \`rg/Git\` as applicable; source-exact heading and archival-label handling.
- **B:** Cognee explicitly queried (graph/vector/hybrid strategy actually available); return *candidate evidence* and relations, not free-form generated answers. Same corpus scopes and candidate/read limits where possible.
- **C:** human/source audit of top candidates: verified original anchor, required roles, temporal/source authority, hallucinated/superseded relation, extra otherwise missed evidence, freshness.

No vector/graph score is promoted as a current-product claim without source verification. If B only retrieves the same obvious pages with more irrelevant context, **reject**.

### Lane C (secondary): deterministic code graph, separate evidence

Try Cognee's **deterministic code-graph** mode (documented as distinct from text graph extraction) on a **small allowlisted set** of TS/TSX packages at the **same exact SHA**, with model/provider configuration explicitly unavailable. Compare named symbol, caller/reference path, imports and impact against built-in TypeScript language tooling and normal \`rg\`.

**Do not** fold code-graph scores into document-memory recall or claim that the product/technical contracts are satisfied by graph edges. If native TS/LSP already handles the cases faster or more correctly, **do not adopt Cognee for code**.

## Local feasibility, security and implementation gates

**Stage 0: zero-install source/documentation audit.** Verify APIs, maintained versions, Windows/pinned Python support, any auto-indexing, hook, memory capture, sessions, cloud/network defaults, backend storage and potential credential inheritance. Run the *existing* local harness controls, record source SHA and whether checkout is dirty. Identify a single portable isolated experiment command set; do not register an MCP globally.

**Stage 1: disposable local pilot if safe.** With HAR09 selected and Stage-0 receipt completed, an **isolated version-pinned Python environment** and local scratch storage under ignored \`out/architecture-memory/\` may be provisioned for controlled tests. Do not modify the monorepo dependency graph, user-level agent config or production DB. Do not install a Claude/Cursor auto-plugin, enable hooks, call \`cognee-cli -ui\`, start a resident service or connect cloud. If isolated package installation cannot be bounded or bypasses user-level configuration, stop and report.

**Stage 2: model-dependent document memory only with precise opt-in.** Cognee's documented no-LLM text route still downloads a **local extraction model and embedding model on first use**. "No API key" does not mean no network or no compute. Before *any* download or model processing, report exact model artifacts and sizes, storage and CPU/RAM requirements, data handling, forecast duration/resources and whether any default environment credentials could cause external provider calls. **Do not download or invoke models until owner explicitly approves these concrete parameters.** Hosted APIs and subscription model sessions remain forbidden absent their own approval. If M cannot proceed, record **blocked**, not a failed retrieval score; Stage 1 code-only graph may still have usable results.

**Datasets:** at least separate \`selected-target\`, \`realization\` and \`historical\` scopes with source metadata. If graph search crosses them, results must be labeled and checked by the host. An **archived** record may explain a past choice, never authorize new work.

**Isolation and provenance:** prefer a clean read-only committed export; corpus selection excludes secrets, \`.env*\`, \`out/\`, local sessions, benchmark gold, provider data, unrelated user home and private project documents. The version-pinned experiment must never index this Change, its evaluation oracle or old HAR search gold. Record index build SHA, dataset item hashes, timestamp, query, resource metrics, and reset/delete behavior. Test stale index after a synthetic source mutation and verify the search refuses to claim current truth.

## Benchmarks and decision gates

Start with **6–10 independently checked questions** across history, cross-domain and absence/authority. Author cannot call his own answers independent; unreviewed cases are exploratory. Do not rewrite queries after seeing Cognee's output and then claim held-out performance.

Compare:
- **primary:** additional independently source-verified conceptual evidence not found by baseline, complete answer potential, false relationships, wrong authority/temporal claims, abstention on absent/unknown;
- **secondary:** top-5/top-15 candidate recall, exact source spans, bytes/calls, build/update time, memory/disk footprint, model downloads, index freshness and cleanup;
- **agent effect (not part of this Change):** later A/B through HAR08's controlled real-agent protocol, only if Cognee adds reliable candidates and under a separate approved model/usage budget.

**Adopt only if** B retrieves otherwise-missed source-correct historical/cross-domain evidence on more than isolated cherry-picked examples, with no critical authority errors and acceptable refresh/maintenance cost. **Reject** if native/wiki already catches it, source provenance is ambiguous, stale indexes look current, or index upkeep exceeds benefit. No automatic adoption from fixture green or vendor score.

## Result that would change the decision

A reproducible local revision-pinned trial where Cognee finds several **independently verified historical/cross-domain connections** that the existing wiki/native workflow systematically misses, with no invented current authority, would justify an *optional* contextual-lookup skill or on-demand MCP proposal. Otherwise keep Cognee disposable and publish a negative learning result. Do not touch RPG runtime, product/technical canon or HAR08 while this research remains queued.

**Permanent knowledge storage:** only these versioned design/Change documents and short, redacted factual outcomes; Cognee's internal graph/cache/database stays disposable in ignored local storage. Deleting it must not lose any canonical decision.
