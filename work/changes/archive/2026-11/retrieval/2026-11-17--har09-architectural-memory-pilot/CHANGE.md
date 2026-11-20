# HAR09 | Cognee-first architecture-memory accessories experiment

**State: Cancelled / concluded negative (2026-11-17 owner decision).** Original experiments and their reported observations are preserved below. **No Cognee adoption, no further experiments on this tiny corpus.** The local environment's deletion is **not verified** in GitHub; [HAR10](../2026-11-17--har10-retire-retrieval-experiments/CHANGE.md) owns executable-tool retirement and local cleanup. **Research authority:** [architecture-memory accessories design](../../../../../designs/open/repository-agent-workbench/ARCHITECTURAL-MEMORY-ACCESSORIES.md), [results](../../../../../../research/agent-practice/COGNEE-EVALUATION-2026-11-17.md).

## Closure rationale

Owner accepted the negative/no-adoption decision after examining the graph polarity errors, non-incremental tiny-corpus retrieval, stale index, historical-lane leakage and unapproved model-download gate crossing. This packet is **closed as a research investigation**, not marked a successful architectural-memory implementation or independently scored performance victory. Raw reports remain local in ignored `out/` and are not reproduced here. First-class historical results: [research register](../../../../../../research/agent-practice/RETRIEVAL-EXPERIMENTS-2026-11-17.md) and [Cognee evaluation](../../../../../../research/agent-practice/COGNEE-EVALUATION-2026-11-17.md). Other entries below preserve the original chronology, including statements written when the packet was still open.

## Cursor first screen

**Purpose:** discover whether **Cognee's architectural memory** can return source-verified historical decisions and cross-domain relationships that native agent search + Offscreen RPG wiki struggle to discover. Secondary, separately scored: Cognee deterministic TS code-graph versus native TypeScript/symbol/caller navigation. **Not** another general code-vector search experiment or a default system install.

**Start with:** fresh \`git rev-parse HEAD\`, \`git status --short\`, root AGENTS, current selection, design above, completed HAR03/HAR06/HAR07 results, HAR08 actual-agent baseline/preflight if completed, \`docs/README.md\`, \`.agents/HARNESS.md\`, \`docs/runbooks/agent-native-harness-evaluation.md\` and existing source-map/wiki tools. **Design baseline:** \`main@302f50f6ff5b0f84e88cecc60278a60f5a80517f\`; reconcile newer commits before any experiment. Keep HAR05 Verifying independent.

**Owner approved exploration, not unbounded installations or billable model use.** No global MCP setup, CLI hooks or automatic memory injection; no provider calls or automatic model downloads; no unrelated/private data. No product/game source changes. Don't implement Cognee into the RPG Storyteller.

## Trial receipt, 2026-11-17

Cognee 1.6.8 is installed only in `out/architecture-memory/venv`. It is not a project dependency and it is not wired into Cursor or Claude. No paid API was called.

The code map ran on four TypeScript files in 21 seconds. It recorded `validateImmediateActionProposal` with a file and line. It also skipped 248 of 445 call links because those targets were outside the four files. Starting that run still downloaded a 67 MB embedding model, even though the guide calls the code map model-free. Ordinary text search finds the same function name without that download.

The document trial used three short paragraphs and the local GLiNER model `fastino/gliner2.5-base-v1`, about 750 MB, plus the embedding model. Search returned the paragraph that had been inserted. The graph step reported no nodes and zero edges. That is not evidence that Cognee discovers decisions the wiki cannot already quote.

Recommendation: keep it disposable. Do not adopt it. The install and models stay under `out/architecture-memory/` and can be deleted without touching the game.

## Follow-up receipt, 2026-11-17, same weights

The "zero edges" line above is the chunk-search neighborhood log. A direct graph read of the first real decision (SSE selected, WebSockets / Redis / RabbitMQ rejected) found 31 nodes and 51 edges, including three false leads: `sse uses websockets`, `sse uses rabbitmq`, and `sse uses redis pub/sub`. A second decision, in a separate graph, produced 27 nodes and 36 edges and every one was a category link. PostgreSQL being the live inventory authority never became an edge. Both runs stayed offline on the weights already under `out/architecture-memory/models`. No new download. No paid call.

A scratch host in that same ignored folder now prints the retrieved source sentences first. It withholds a decision edge when the source clause rejects that edge's object. On the transport question it withholds the three false `uses` edges and leaves one document-link lead. On the inventory question it prints the two source sentences and reports that the graph added no usable decision. The host is not installed into Cursor, Claude, or the game. Cognee stays unadopted. This packet stays open.

Stale-index check, same day, fresh `probe3` graph, offline, synthetic sentence only. Indexed text: "The selected color is blue. No green." After the file was overwritten to "The selected color is green. Blue is superseded," chunk search still returned the blue sentence. Cognee did not notice the file change. `forget(dataset="stale-marker")` then returned no chunks. Re-adding the new file and running cognify returned only the green sentence. A hash compare can see the mismatch. The scratch host now refuses before search when the indexed hash and the source file disagree. The fresh probe3 graph carries that hash in a sidecar, and the host refuses from the sidecar alone. The two decision graphs now have sidecars for the owner files they were built from. A matching hash still answers and still withholds the three false transport edges. A wrong hash refuses before search. Without that hash, Cognee still repeats the stale sentence. Delete and rebuild work on this one-item dataset. Silent freshness does not. That blocks wiring.

Same two questions, wiki baseline at `5fc89564` (worktree dirty). `pnpm wiki:find` for the transport question ranks `docs/technical/client/architecture.md#4-end-to-end-update-transport-selected-not-future-conjecture` first. `pnpm wiki:read` of that heading returns the selected SSE contract, including "No WebSockets, Redis Pub/Sub or RabbitMQ." The wiki does not emit the false `uses` edges. `pnpm wiki:find` for the inventory question ranks `docs/runbooks/local-development.md#local-live-story-mode-without-oauth` first. The sentence that PostgreSQL is the live inventory authority, and that `state/story-items.json` must not be treated as current inventory, lives in `docs/technical/storyteller/context-and-memory.md` under "Agent working cycle" and is not in the top five. The host returned that sentence only because those two paragraphs were the entire private corpus. That is not a discovery the wiki missed. It is a search over an answer that was inserted by hand.

Lane check, same day. The transport graph has separate `selected-target` and `historical` datasets. Asking Cognee for only `selected-target` still returned the rejected-alternatives paragraph, and asking for a dataset name that does not exist raises instead of returning nothing. The scratch host therefore does not trust that filter. It reads the dataset each stored file belongs to. The rejected-alternatives paragraph is in the `historical` dataset, so it is printed as a past decision. The SSE sentence and the tool rule are in `selected-target`. The selected SSE sentence stays under current. The tool-prohibition sentence is retrieved but labeled unrelated, because it shares no content word with the transport question. The inventory sentences stay under current. The three false `uses` edges stay withheld. Asking the transport graph for the inventory rule returns no current sentence, so the host prints `ABSTAIN` and withholds both the retrieved sentences and the graph leads. The same transport question still answers from the current SSE sentence.

Stop, same night. More checks on these same paragraphs do not change the decision. Cognee stays unadopted. The scratch host stays unwired. This packet stays open, and it does not authorize another pass over this corpus.

## Scope: one bounded trial, two distinctly labeled lanes

### Gate 0. Compatibility and cost/permissions audit (no install)

1. Inspect **current** official Cognee version/docs and the exact environment: Windows Python requirements, package/dependency footprint, data/index storage, whether code graph is actually LLM-free for our TypeScript, local models that may download during document ingestion, network endpoints, hooks and any use of inherited LLM keys. Write one \`out/architecture-memory/<sha>/feasibility.json\` and concise summary. If claims differ from current version, use observed implementation, not vendor marketing.
2. Keep a **comparison shortlist**, not simultaneous installs: baseline wiki/rg/TypeScript; Cognee primary; CodeGraph as code-specific backup; Graphiti (temporal) and LightRAG (docs RAG) as deferred. State what would cause us to switch and why. Record official docs URLs, version hashes, OS compatibility and removal plan.
3. Design an allowlisted **small source corpus** (5–10 selected contract sections, relevant STATUS/source anchors, 5–10 dated historical sections), with exact path#heading/line, SHA/content hash, selected/realization/historic lane and redacted secrets excluded. Don't handpick material using the hidden gold paths. Do not put oracle texts into graph/vector indexes or the agent-visible corpus.
4. Prepare **6–10 unfamiliar question prompts** and independently checked answer rubrics covering historical rationale, cross-domain guarantee, superseded decisions and selected-vs-current/absent decoys. A question authored by the sole evaluator remains \`unreviewed\`; all results then diagnostic-only.

### Gate 1. Scratch proof, no provider

- Once HAR09 is selected, Gate 0 passes, and install operations are bounded/reversible, install only a **pinned local disposable Cognee environment** in an isolated workspace, not repo/workstation global packages. No \`pnpm\` dependency additions, daemon, automatic Git hooks, Cursor/Claude agent plugin, system settings or auto-indexing. Put databases/indexes/temporary corpus under gitignored \`out/architecture-memory/\`, safely outside any agent-visible gold or secrets.
- Exercise **the smallest deterministic no-LLM code graph** on a *limited* TS set if that functionality is supported by the inspected release. Compare exact symbol, caller, dependency/impact answers with native TS/rg baseline. Record build SHA, latency, memory/disk, source spans and incorrect/stale edges. **Do not** present it as document-memory success.
- Demonstrate dataset delete/rebuild and stale-index detection; if unavailable, record a blocker and **do not wire the tool into coding agents**.
- No configured provider keys or inferred subscription spend. If even the code-graph path launches a model or accesses credentials, **stop**.

### Gate 2. Local document-memory evaluation (explicit download gate)

Cognee may need local GLiNER extraction and embedding models, downloaded on first use, to build/query document memory. **Do not trigger them just because \`pip install\` completed.** Before downloading or calling any model, give the owner a concrete proposal naming version/model, each artifact's estimated bytes, expected disk/RAM/CPU and network, run count and cleanup. The owner must approve the actual amounts. No paid/cloud service, shared repo secret, Cursor/Claude model token use, or uncontrolled fallback.

If approved, ingest the bounded 3-lane corpus into isolated datasets; preserve exact source metadata (or host-side sidecar), then run **recorded explicit queries**, not automatic prompt/file-read injection. Compare baseline lexical/wiki candidates against Cognee candidate evidence under the same top-k/read scope. Test wrong history lane, invented relation, missing provenance, no-match and deliberately stale revision. A Cognee answer with no exact source proof is unverified, **even if fluent**. Missing approval => \`blocked-model-gate\`, not false poor recall.

**Do not try Graphiti, LightRAG, CodeGraph or a second tool automatically.** Write a ranked follow-up only if Cognee is unusable or a specific niche remains unresolved. This Change cannot grow into "try all accessories".

## Definition of Done and negative proof

- Gate 0 feasibility receipt, curated manifest/corpus rules, versioned query/oracle with independent-review state and exact exclusion policy.
- Provider-free isolated code-graph outcome **or explicit unsupported reason**; no claims of code-graph superiority from an unexecuted path.
- If actual local document pipeline was separately approved and run: complete per-question retrieval/citation report and source-adjudicated negatives. If not approved: document-memory trial remains unexecuted, with the missing permission clearly reported.
- Demonstrated no secret/gold/out ingestion; no global hooks/MCP/plugin installation; no silent third-party calls; exact index SHA or \`uncomparable\`; explicit delete/rebuild/cleanup receipt.
- A **decision**: reject, keep as optional research, or propose a later separately selected on-demand integration. No default tool adoption, no production architecture changes.
- Use existing \`pnpm wiki:find/read\`, source-map navigation and \`repo:brief\` as controls. Avoid a new benchmark framework, web dashboard, multiple CLI aliases or model orchestration. Keep new code minimal and scratch-only unless tests justify a reusable script.

**Verification:** actual commands in the user's checkout, not assumed: \`pnpm repo:brief --json\`, \`pnpm wiki:find --self-test\`, \`pnpm wiki:health\` if documentation changed, \`python scripts/check_docs.py\`, plus explicitly logged scoped vendor/cleanup commands after Gate 0. Every executed/skipped command and missing tool must be disclosed. No real-agent trial under HAR09; HAR08's live agent protocol remains a separate exact-budget decision.

## Reconciliation and closure ledger

| Affected authority | Planned delta | Actual code/evidence | Negative proof | Status / map |
| --- | --- | --- | --- | --- |
| Developer knowledge accessory | optional derived local query candidate, not current truth | pending selected execution | stale graph, wrong authority, secrets/gold, model gate | workbench decision |
| Existing agent harness and wiki | unchanged by default; optional tool not in always-on entry | no changes authorized | works without Cognee; no agent hook | \`.agents/README.md\` if a tested optional command exists |
| RPG product/technical/game code | **unchanged** | none authorized | no Storyteller/provider execution | N/A |

**Closeout rules:** only after the performed gates have honest receipts; archive under \`work/changes/archive/2026-11/other/\` and reconcile \`work/changes/README.md\`, workbench design index and STATUS with measured facts. Do not label Gate 2 Done without executing it, and do not claim that a static vendor-doc review proves Cognee useful.
