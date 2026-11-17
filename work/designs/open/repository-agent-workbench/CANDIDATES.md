# External retrieval tools | evidence and disposition

**Research date:** 2026-11-17. This is a technology watchlist for developer agents. Tool capabilities may evolve; reverify pinned versions and security before local experiments. Vendor benchmarks and marketing assertions are *not* measured Offscreen RPG outcomes.

## Existing baseline: do not duplicate blindly

- Cursor documents its native codebase indexing/semantic search and native codebase navigation: https://prod.cursor.com/blog/secure-codebase-indexing ; https://cursor.com/docs/agent/overview .
- Our existing WIKI07 delivers source-exact, authority-aware Markdown heading routing; code symbol search remains a separate need. No external service has been demonstrated to outperform that combination.
- Sourcegraph's code-intelligence approach is relevant conceptually, but Sourcegraph announced the sunsetting of Cody on **2026-11-09**: https://sourcegraph.com/blog/sunsetting-cody-future-of-code-intelligence . Do not select Cody as a new dependency.

## Candidate comparison

| Candidate | Distinct potential benefit | Costs/risks | Recommendation |
| --- | --- | --- | --- |
| **No extra service (native Cursor/`rg`/Git/WIKI07)** | Already available; no new index, daemon, permissions or MCP startup cost | Can miss hidden cross-package semantic relationships | **Default and control arm** |
| **Serena (language-server/symbol tool)** | Symbol definitions, references and structural navigation; useful for TS/Python/.NET dependency trails | May duplicate editor capabilities; server startup, process/RAM/tool discovery; remote GitHub-only agent cannot use its local workspace | **First optional trial if missing symbol-navigation evidence emerges**, not default install |
| **Lightweight hybrid code search** (e.g. Semble) | Potentially better weak-keyword queries with lexical + embeddings and bounded snippets | Additional model download/index and freshness; source-data risk; vendor-reported benchmarks may not generalize | **Alternative one-at-a-time trial**, only if lexical retrieval misses diagnosed cases |
| **Cognee** | Persistent structured/code graph plus MCP, possibly useful for multi-hop concept discovery/cross-session facts | More ingestion and state lifecycle, possible local models/downloads, index staleness, graph hallucination/authority ambiguity, larger attack surface; potentially unnecessary for 74-document wiki | **Research candidate only; do not provision compose/graph DB** |
| **Full search platform/remote hosted service** | Multi-repository code intelligence at scale | Authentication, external data transfer, cost and setup disproportionate to one pre-POC monorepo | **Reject for current scope** |

Primary project resources: Serena https://github.com/oraios/serena ; Cognee https://github.com/topoteretes/cognee ; Cognee MCP https://github.com/topoteretes/cognee/tree/main/cognee-mcp ; Semble https://github.com/MinishLab/semble . Cognee's current README describes a **no-LLM-key local mode** with local graph extraction and embeddings; this does not mean zero downloads, zero compute, automatic freshness, or proven value.

## Why the literature does not select our tool

- Agent Retrieval Bench (2026) emphasizes *next-action retrieval* and no-gold cases rather than superficial semantic similarity: https://arxiv.org/abs/2607.24882 .
- A repository QA study comparing indexed semantic search with delegated deep agentic search reports stronger/cheaper answers for semantic retrieval in its tested setup; it is not a Cursor+Offscreen benchmark: https://arxiv.org/abs/2608.01507 .
- CodeCompass reports strong graph-navigation gains on hidden dependency tasks in its tested FastAPI repository. Useful hypothesis, not independent proof that a persistent LLM-extracted graph is needed here: https://arxiv.org/abs/2602.20048 .
- A scaling study found that graph-building overhead and graph retrieval accuracy can be unfavorable relative to BM25 under certain tested conditions: https://arxiv.org/abs/2607.26497 .
- MCP client best-practice guidance cautions against upfront loading of large catalogs of tool definitions: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/docs/2026-07-28/develop/clients/client-best-practices.mdx .

These findings are not contradictory: different tasks reward symbol graphs, exact lexical terms, embedding similarity, or direct source reads. The benchmark **must match the agent's actual task distribution**. Product correctness, runtime proof and authorization remain outside any retrieval score.

## Stop-signs before trying any tool

1. Is the failure simply a bad/stale canonical document? Fix under WIKI08, not via embeddings.
2. Did WIKI07/`rg`/native Cursor already locate the exact source? A new search service must demonstrate a *different* capability, not a more elaborate demo.
3. Does the index expose ref SHA, line span, authority class, freshness, and local-only data handling? If not, its answers are leads, not citations.
4. Can a fresh developer clone without Docker/optional packages still complete standard Change workflows? **Must remain yes.**
5. Is a new tool definition's startup and output cost larger than the source it saves reading? Measure, don't guess.

**Provisional ordering:** baseline first; consider Serena only for a demonstrated symbol/reference gap; consider compact hybrid search for weak keyword retrieval; reserve Cognee for a demonstrated, repeated *multi-hop knowledge* failure that neither simpler approach fixes. These are candidate choices, not installation approvals.
