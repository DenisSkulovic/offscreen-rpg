# Developer-agent semantic retrieval | reviewed ecosystem and selection

**Research updated 2026-11-17.** Scope: code and maintained Markdown retrieval for **coding agents**, not the game's Storyteller. This assessment corrects an earlier assumption that contemporary Cursor always provides an embedding-based code index. Vendor numbers are hypotheses; no candidate has been run locally against Offscreen RPG.

## Important correction to the baseline

Cursor representatives stated in July, August, and September 2026 that newer versions use **Instant Grep plus file reads** rather than their earlier dedicated semantic embedding index. This makes independently provisioned natural-language search potentially complementary rather than necessarily duplicative. Search capabilities may differ between versions/configurations: verify the actual installed client at trial time.

- Cursor staff statement (2026-08-05): https://forum.cursor.com/t/codebase-indexing-not-working-in-v-3-12-onwards/167527/7
- Cursor staff clarification (2026-09-07): https://forum.cursor.com/t/how-to-reindexing-my-codebase/170407/6
- Claude Code supplies bundled **ripgrep**; this is strong lexical/file search but is not itself an embedding index: https://support.claude.com/en/articles/14554922-claude-code-user-faq

**Correct baseline:** real, observed Cursor/Claude native behavior + scoped `rg` + Git + WIKI07's exact Markdown section router. Do not claim either agent lacks all semantic reasoning: iterative model-guided grep is still semantically *reasoned* search even when the retrieval primitive is lexical. Do not confuse a model guessing better keywords with a maintained vector index.

## What retrieval needs are genuinely different?

| Question | Best candidate primitive | Why |
| --- | --- | --- |
| Exact identifier/file/stack trace | `rg`, native file finder, LSP | Embeddings can lose exact strings |
| “Where do we decide whether an unfinished activity earns a reward?” | Natural-language code search | Question may share few terms with the implementation |
| “Which product rule authorizes this behavior?” | WIKI07 exact owner heading; optional QMD candidate discovery | Authority cannot be delegated to embeddings |
| “Show references/callers for this symbol” | LSP/Serena, static call/reference graph | Similarity is not a sound reference graph |
| “Which docs, code and tests support this guarantee?” | Multi-stage retrieval with original links and explicit status | Requires joining separate authority and source-evidence classes |
| “What changes after this commit?” | Git diff + index freshness check | A stale vector hit is not current implementation |

## Candidates, in experimental priority

| Candidate | Main capability | Practical dependencies / risk | Decision |
| --- | --- | --- | --- |
| **Grepai** | Plain-English semantic code search, call tracing, CLI + MCP | Ollama/LM Studio or API embeddings; local index/watch; Windows installers exist; measure cold setup/refresh and cache | **First code search contender** |
| **QMD** (tobi/qmd) | Local BM25 + vector + rerank over Markdown; CLI + MCP | Local model downloads, native node-llama-cpp dependencies, possible Windows friction; preserve wiki authority metadata externally | **First docs search contender** |
| **SIFS** | Rust CLI/MCP, offline BM25 and optional local hybrid vectors, bounded context packs | Cargo/binary install and model cache; verify Windows path, retrieval quality and freshness | **Lightweight code-search challenger** |
| **Serena** | Language-server symbol definitions, references, outlines and structural edits | More MCP/tool calls and language-server startup; not a replacement for natural-language embedding search | **Separate structural trial** if needed |
| **Cognee** | Persistent code graph + memory + MCP, possible cross-session or multi-hop relations | More complex indexing, graph persistence, version reconciliation and possibly local model configuration; read/write memory can drift from canon | **Keep in research queue**; test only after a multi-hop gap is established |
| **No additional tool** | Git/rg/native client + WIKI07 | May require multiple attempts, missing weak-vocabulary hits | **Control arm**, always available |

Links, versions and documentation:
- Grepai: https://github.com/yoanbernabeu/grepai ; install: https://yoanbernabeu.github.io/grepai/installation/ ; search: https://yoanbernabeu.github.io/grepai/search-guide/
- QMD: https://github.com/tobi/qmd ; Windows issue/reference: https://github.com/tobi/qmd/issues/221
- SIFS: https://github.com/tristanmanchester/sifs
- Serena: https://github.com/oraios/serena ; Anthropic plugin catalog: https://claude.com/plugins/serena
- Cognee: https://github.com/topoteretes/cognee ; code memory design: https://www.cognee.ai/ai-coding-agent-persistent-codebase-memory

Grepai's published `97% fewer search-phase input tokens` benchmark uses five tasks and is author-produced, not independent proof for this repo: https://www.reddit.com/r/ClaudeAI/comments/1qiv0d3/open_source_i_reduced_claude_code_input_tokens_by/

**Counterevidence must not be buried:** An independent November 2026 community trial measured standalone retrieval improvements but little in-agent lift for Semble/Graphify, sometimes **16–35% more agent tokens**. Its 50-agent-task setup and small models are limited evidence, not a universal negative result: https://www.reddit.com/r/ClaudeCode/comments/1xqru5q/do_semble_and_graphify_help_coding_agents_in_my/

This difference is the experimental thesis: **retriever usefulness is not equivalent to agent actually using it intelligently**. Measure standalone ranking and end-to-end agent outcomes separately.

## Why two initial products instead of one magic brain?

Our ratified Markdown wiki and source code have different retrieval and authority needs. QMD is optimized for Markdown; Grepai targets code and call tracing. Both already have a CLI and MCP path. We should *compare*, not require both permanently. A later portable `agent:seek` interface may federate results if they independently earn their place; no wrapper/service is authorized solely by this document.

**No default Docker Compose or graph database.** Grepai's default embeddings involve a local Ollama service but do not require spinning up the entire game platform. QMD's local model runtime also needs to be explicitly tested, not assumed easy on Windows.

## Trial risks and acceptance checks

1. Run against an explicit **pinned Git checkout**. Record branch, SHA, dirty files, index version, included paths, and model/embedder revision. Exclude `.env*`, credentials, `node_modules`, `.git`, build outputs, `out/`, archived change histories by default for normative queries, and benchmark gold labels.
2. Search returns **citations to exact original source** (path, lines, heading/symbol) with a bounded top-k. Never let an embedding-generated summary become a product decision or code proof.
3. The local model is a developer dependency: do not automatically download models, contact hosted APIs, run unapproved provider inference or install global MCP configuration. For first pilot, prefer explicit manually invoked CLI over always-on MCP.
4. Confirm that failed query / missing feature yields honest no-result behavior, and that stale indexes/dirty edits cannot masquerade as HEAD truth. A fresh proof read against current source wins over any index.
5. No vendor's marketing numbers substitute for the project's A/B measurements. Measure maintenance overhead, index refresh, latency, RAM and agent **adoption rate** as well as correctness.

**Recommendation:** run an actual, opt-in code pilot with Grepai and a docs pilot with QMD, against the current native/WIKI07 baseline. Keep SIFS as a lighter alternative if first candidates are too heavy or flaky. Defer graph memory until a repeatable cross-source/multi-hop failure demands it.