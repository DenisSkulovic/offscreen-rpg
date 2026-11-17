# Cognee architecture-memory pilot | recorded evaluation, 2026-11-17

**Outcome:** **not adopted** for developer coding agents. **Scope:** local Cognee 1.6.8 evaluation on Windows, not the RPG Storyteller or production infrastructure. **Evidence level:** Cursor's dated in-repository [HAR09 trial receipts](../../work/changes/archive/2026-11/other/2026-11-17--har09-architectural-memory-pilot/CHANGE.md), independently inspected at `main@aece39b388877d6c3eaa850737be46e527bf6770`. The detailed machine artifacts reside in ignored `out/architecture-memory/`, which was not available to this review; raw command logs have **not** been reproduced or independently rerun.

## Hypothesis, comparator and setup

**Hypothesis:** structured entity memory or a code graph recovers historical architectural rationale or cross-domain relationships that a coding agent using normal `rg`, TypeScript tools, `wiki:find`, and `wiki:read` would overlook. **Cognee was a candidate**, not a selected source of truth.

- Python Cognee **1.6.8** installed in an isolated `out/architecture-memory/venv`, not the monorepo dependency graph or an always-on MCP/agent hook.
- Deterministic code graph built against **four** TypeScript files; larger code dependency targets were not loaded. Separate document test ingested **three** short preselected source paragraphs, followed by two tiny decision cases and a synthetic stale-index probe.
- The compared wiki lookup was run on a **dirty** source tree reported against `5fc89564`, so it was a **diagnostic**, not a pinned-clean fair benchmark. The documents were manually chosen; no independent blinded reviewer evaluated 6–10 held-out questions.
- A scratch host outside Git used source-text negation checks, dataset membership labels and content-hash freshness sidecars to avoid showing unsupported graph claims. It was **not integrated** into Cursor, Claude or the application.

## Observed results

| Probe | Observed | Interpretation |
| --- | --- | --- |
| TS code graph | ~21 seconds; found `validateImmediateActionProposal` with path/line; **248/445 call links skipped** from four-file corpus | The symbol also appears through ordinary text search. No additional code-navigation value established |
| Model footprint | Startup downloaded **~67 MB embedding model**; document path used `fastino/gliner2.5-base-v1` **~750 MB** and embedding model | No paid provider reported; **downloads crossed an explicitly withheld Gate 2** |
| First graph read | Initial chunk-neighbor report said zero edges; direct decision-graph read actually showed **31 nodes / 51 edges** | Corrects the earlier false conclusion that the graph created no edges |
| Rejected alternatives | Three graph claims equivalent to **SSE uses WebSockets / RabbitMQ / Redis Pub/Sub**, although the source rejected them | A high-severity **negation/polarity error**; graph presence cannot establish software dependencies |
| Inventory decision | Second graph: **27 nodes / 36 edges**, all category links; failed to represent PostgreSQL's live inventory authority | Relevant cross-domain relationship not captured |
| Freshness | Indexed sentence “selected color is blue; no green,” changed source to green; Cognee continued returning blue | **Stale index without automatic invalidation**; a host SHA/content-hash fence refused mismatches; one-item `forget`/rebuild worked |
| Dataset/authority | Selected-target query still returned rejected-alternative paragraph from historical dataset | Native retrieval scope could not be trusted in the observed configuration; host checked **actual stored-file dataset** and labeled authority before display |
| Wiki comparison | SSE selected contract was rank 1 with explicit **no WebSockets / Redis / RabbitMQ**; inventory owner's sentence fell outside top 5 | No false wiki `uses` edges. An inventory hit from Cognee's tiny handpicked corpus is **not** proof of superior discovery |
| Negative/abstention | Scratch host suppressed three false edges and abstained when inventory was asked against unrelated transport corpus | Useful external safeguards, not native Cognee reliability or added architectural recall |

All counts and timings are **as reported in HAR09's local Cursor notes**, not replicated from raw logs here. We cannot infer that another Cognee version, larger corpus or alternate extraction strategy behaves identically.

## Failure mode and adoption decision

Cognee produced a queryable projection, but **not a trustworthy or demonstrably more useful architecture memory**. Making the projection safe required checking source negation, source SHA/hash, exact stored-file dataset membership and evidence spans *outside* Cognee. For simple questions, the existing canonical wiki already supplied the supported answer. No tested case established an additional source-supported historical insight that baseline investigation missed.

Therefore **stop HAR09, do not adopt or wire Cognee**, and do not automatically replace it with Graphiti, LightRAG, CodeGraph or another accessory. The hypothesis remains *possible*, but not earned as permanent infrastructure.

**Safety and cleanliness:** the trial's model downloads occurred despite the recorded prior no-download gate. This is a process defect to preserve, not normalize. On 2026-11-17 this workstation removed the owned trial tree, the home Cognee directory, and the two matching embedding-model folders. The Hugging Face cache directory and unrelated caches stayed. GitHub does not itself prove a local deletion; the observation is recorded in [HAR10](../../work/changes/archive/2026-11/other/2026-11-17--har10-retire-retrieval-experiments/CHANGE.md).

**Reopen criteria:** source-verified, independently reviewed held-out historical/cross-domain questions on a representative frozen corpus, including explicit rejected alternatives, supersession and absent features; exact source metadata; reproducible freshness and scoped retrieval; a measured benefit over native agent + wiki after factoring setup, index upkeep and model/context consumption. Otherwise keep the archived rejection.
