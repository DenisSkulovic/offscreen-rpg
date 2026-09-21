# Long-story memory, navigation and synthesis

Research and implementation guide for making a Storyteller useful across a large, changing body of narrative text. This is an evolving engineering reference, not a frozen architecture or permission to enable hosted models. Product authority remains in [Storytelling](../storytelling.md); canonical ownership and implemented boundaries remain in [Canonical files](../technical/canonical-files.md); active work remains in the [memory feature](../features/2026-09-18--20-09--storyteller-memory-and-recall/PLAN.md).

Research refreshed: **2026-09-21**. Recheck current primary sources, model behavior, licenses, hardware fit and pricing before selecting a semantic model or hosted service.

## The actual problem

A long story is not merely a long string. It is a changing, partially known world containing:

- current authoritative state;
- immutable events and published passages;
- claims that may be false, private or later corrected;
- recurring identities, aliases, relationships, locations, items and threads;
- low-drama details whose value appears much later;
- broad questions requiring synthesis across many events;
- local questions requiring one exact sentence or receipt.

No single prompt, summary, vector index or graph represents all of these correctly. The system needs a small family of complementary views, all traceable back to canonical sources and current state.

The useful analogy to a capable coding/research agent is not “remember every token.” It is:

1. regain orientation from a compact map;
2. identify the type of information need;
3. search cheap structured and lexical evidence;
4. widen to semantic or relational candidates only when needed;
5. inspect exact sources rather than trusting snippets;
6. reconcile chronology, authority and contradictions;
7. synthesize a bounded working set for the present decision;
8. retain stable references so later work can resume without rereading everything.

## Separate the retrieval jobs

Treating every question as “semantic similarity over chunks” loses both precision and authority. Classify the information need before choosing a route.

| Need | Example | Preferred first route |
| --- | --- | --- |
| Current exact state | Who holds the brass key now? | Typed registry/state projection |
| Known identity | Which Mira is at the inn? | Stable ID, alias table, disambiguating anchors |
| Local return | What matters when returning to Greywake? | Place/person/thread links plus recent relevant episodes |
| Exact remembered wording | What promise did I make? | Lexical/source search, then exact passage read |
| Paraphrased callback | Where did we encounter this symbol before? | Hybrid lexical+dense candidates, then source read |
| Multi-hop relation | How is the keeper connected to the ruined road? | Explicit links/graph neighborhood plus relevant episodes |
| Temporal change | Was the bridge repaired after Mira's warning? | Event/current-version timeline ordered by effective time |
| Global synthesis | What pressures shaped the last season? | Hierarchical or community summaries with source expansion |
| Absence/uncertainty | Did we ever agree on a deadline? | Scoped search with coverage evidence and abstention |

A route may combine signals, but its first move should fit the job. Exact mechanics never wait for semantic retrieval. A global synthesis path should not answer a current inventory query.

## A layered corpus

### 1. Immutable primary evidence

Keep every admitted passage, decision, receipt and source version. These records answer “what was published or committed then?” They are not all prompt material.

### 2. Current projections

Maintain the newest admitted document version and typed mechanical state. These answer “what is established now?” A correction advances a stable identity to a new version; it does not erase old evidence or present both versions as equally current.

### 3. Explicit registries and links

Use stable story-local identities and admitted associations for aliases, participants, places, possessions and open threads. These are high-precision retrieval keys. A name match alone cannot merge two people, and an inferred graph edge cannot transfer authority.

### 4. Source-grounded episodes and cards

Create compact records for bounded events, relationships or unresolved threads when they have future continuity value. Preserve source ranges, authority, knowledge scope, effective time and distinctive details. Do not build one recursively rewritten autobiography.

### 5. Retrieval units

Index semantic units such as a heading subtree, episode, event, claim or coherent passage range. Arbitrary fixed-size chunks are a fallback, not the domain model. Each unit should carry enough parent context to be understandable and searchable:

- story and branch identity;
- canonical document ID, revision and source hash;
- kind, authority and visibility;
- entity/thread/location links;
- effective and recorded time where applicable;
- parent title/section and a compact contextual key;
- byte/token size and index version.

[Anthropic's Contextual Retrieval](https://www.anthropic.com/engineering/contextual-retrieval) reports improved retrieval when small chunks receive document-specific context before lexical and embedding indexing. [Late Chunking](https://arxiv.org/abs/2409.04701) instead contextualizes token representations using the longer document before pooling chunk embeddings. Both reinforce the same design lesson: a fragment should not lose who, where and when it is about. Generated context remains derived index metadata, not canonical truth.

### 6. Hierarchical and global summaries

Some questions concern themes or developments across the corpus rather than one fact. [RAPTOR](https://arxiv.org/abs/2401.18059) retrieves across a tree of recursively clustered summaries. [GraphRAG](https://www.microsoft.com/en-us/research/publication/from-local-to-global-a-graph-rag-approach-to-query-focused-summarization/) builds entity communities and community reports for global query-focused summarization. These patterns can help catch-up and broad narrative analysis, but their summaries are derived, expensive to maintain, and vulnerable to extraction error.

Do not make hierarchical summaries the normal route for exact state. Build them only after broad-query benchmarks justify their indexing and maintenance cost.

## Indexing and update discipline

### Chunk by meaning and revision

- Keep complete small records intact.
- Split large Markdown at stable headings and preserve the heading path.
- Split long passages on paragraph/event boundaries, not raw character counts alone.
- Never combine visibility or authority classes inside an inseparable index unit.
- Index each immutable source/version; separately mark which version is current.
- Keep a rebuildable mapping from an index unit to its canonical source hash.

### Add contextual keys cheaply

Prefer deterministic metadata first: document title, section headings, stable linked names/aliases, kind, place, participants and effective time. An optional model-generated 50–100-token contextual description may improve retrieval, but it is derived maintenance with explicit model/version/cost provenance. It cannot become the only place an association exists.

### Invalidate dependencies

When a document changes:

1. publish the immutable new version and advance the manifest;
2. mark old current-version index entries inactive;
3. add/rebuild units for the new version;
4. invalidate derived cards or summaries whose source set changed;
5. expose `indexedThrough` and stale/partial coverage until rebuild finishes.

Never silently serve an old index entry as current because rebuild lag is convenient.

## Candidate generation: use several cheap signals

### Exact and structured lookup

Start with stable IDs, aliases, typed links, open-thread status, location and time filters. This is the strongest route for known returns and state-dependent play.

### Lexical retrieval

BM25 or another inverted lexical index is excellent for names, quotations, rare terms, rule identifiers and exact objects. The implemented linear AND-term search is only a correctness baseline; it should eventually be compared with an indexed field-aware lexical route.

### Dense retrieval

Embeddings help when the current wording differs from the source. They are candidate generators, not fact judges. Store embedding model/version and source hash, filter by story/branch/visibility/currentness before results can become usable, and keep local/offline options distinct from hosted cost.

### Late interaction and reranking

[ColBERT](https://arxiv.org/abs/2004.12832) preserves token-level query/document interactions while allowing document representations to be precomputed. Cross-encoder or late-interaction reranking can improve a small candidate pool without paying that cost across the entire corpus. Reranking must share the operation's budget and should be optional by tier.

### Explicit relational traversal

One-hop traversal over admitted identity, place, thread and source links can recover multi-hop context cheaply. [HippoRAG](https://arxiv.org/abs/2405.14831) demonstrates a graph/PageRank-style route for integrating related evidence and reports strong multi-hop results, but its LLM-extracted knowledge graph is not automatically appropriate for authoritative game state. Offscreen should begin with admitted links and only evaluate derived graph edges as lower-authority discovery aids.

### Hybrid fusion

Lexical, dense, exact-link and recency scores are not directly comparable. Merge ranked lists using a method such as reciprocal rank fusion, deduplicate by canonical unit identity, then rerank the small pool. Multi-query expansion can improve recall but may add drift, latency and noise; it must beat a single-query baseline under the same final context cap.

## Query construction

The player message is not necessarily the retrieval query. Build an explicit information-need packet from trusted structured cues and, when enabled, a bounded Storyteller exploration request.

Useful facets include:

- exact mentioned/resolved identity IDs and admitted aliases;
- current/returning place and participants;
- selected intention and interaction kind;
- active/open thread IDs;
- relevant item, activity, obligation or rule identities;
- time range or “current versus then” intent;
- visibility and authority scope;
- desired retrieval mode: exact, local, temporal, associative or global.

Query expansion can generate synonyms, aliases, facets or hypothetical relevant prose. [HyDE](https://arxiv.org/abs/2212.10496) shows that hypothetical-document embeddings can improve zero-shot dense retrieval, but the generated document may contain false details. Expansion text must therefore remain a search key only and never enter story evidence as fact.

For expensive or ambiguous needs, allow one bounded exploration round that asks for searches/reads before narration. Persist the request and results, reuse duplicate queries, and reserve enough budget for the final answer. Do not add a separate routing-model call merely to decide whether to call the Storyteller.

## Ranking must understand story semantics

Start with filters, then score. A useful candidate rank may combine:

1. exact required state or explicit identity/thread relation;
2. current-version and branch match;
3. authority and knowledge-scope eligibility;
4. exact phrase/rare-term match;
5. semantic similarity;
6. open/unresolved status;
7. returning-place/person relevance;
8. temporal applicability and recency;
9. source quality and completeness;
10. diversity across entities, time ranges and record types.

Do not use recency as truth. Do not let drama or semantic similarity outrank a current exact holder, a newer correction or an explicit contradiction. Reserve some capacity for old low-drama continuity so yesterday's generic scene does not starve an early promise.

## Read exact evidence after discovery

Search results should be compact leads:

- stable handle and canonical identity/revision;
- kind, authority, visibility and effective time;
- why it matched and which mode produced it;
- a short bounded snippet;
- source and index coverage status;
- whether the body/source was actually read.

The Storyteller may follow a lead by reading the complete small record or a bounded coherent source section. A snippet supports discovery, not detailed claims outside the shown text. Deduplicate exact source text across cards, search results and recent history before composing the final packet.

## Condensation without a telephone game

### Prefer query-focused synthesis

Condense for a concrete job: “prepare the return to Greywake,” not “rewrite the entire story shorter.” A useful synthesis names what is current, what happened then, what remains open, what is disputed, and which sources support each point.

### Preserve multiple abstraction levels

- exact state and receipts;
- current entity/thread cards;
- bounded episode summaries;
- original passages;
- optional broader period/community summaries.

A higher-level summary points downward. It does not replace lower-level evidence.

### Map, reduce and verify broad questions

For a broad catch-up request, select relevant period/entity groups, synthesize bounded partial findings with citations, then reduce them into a final overview. The reducer receives structured claims and source handles, not unrestricted prose whose provenance vanished. Global synthesis is a separate cost class from ordinary turn recall.

### Handle contradiction explicitly

Keep distinctions among:

- true at an earlier time;
- currently established;
- claimed by a character;
- inferred or uncertain;
- private possibility;
- superseded/retconned.

The final working set should state which version governs now while retaining historical claims when they matter socially or narratively.

## Cost and tiering

All tiers retain the same canon and source history. They differ in optional work, not truth.

| Cost posture | Candidate generation | Optional work | Typical final evidence |
| --- | --- | --- | --- |
| Minimal/free | Exact links + indexed lexical | No model reranker; one deterministic query | Current cards + few exact records |
| Balanced | Exact + lexical + local embeddings | Small local reranker or one exploration round | Diverse reranked records + exact sources |
| Rich | Hybrid + relation expansion + broader history | Larger rerank, query expansion, hierarchical synthesis | More source-backed texture and cross-period context |
| Exceptional | Same authority, much larger bounded recipe | Global/map-reduce analysis where requested | Broad cited synthesis, never a different canon |

Every recipe caps candidate counts, reads, bytes/tokens, rounds, latency and attributable cost. Cache/index work has a version and budget. A million-token model is permission to include more useful evidence, not to dump a million tokens automatically.

The implemented lexical recipe boundary has three named postures. Minimal favors a small candidate/read/context packet and reduced lexical work; balanced is the normal benchmark posture; rich admits more terms, sources, candidates and retained evidence while remaining finite. Resolution intersects the posture with stricter operation read/byte ceilings. These are starting points for measurement, not product tiers or promises that rich always scores better: additional candidates can reduce precision or crowd assembly, and a latency-sensitive task may deliberately select minimal even when the account permits more.

## Evaluation: test the memory system, not its confidence

[LongMemEval](https://arxiv.org/abs/2410.10813) separates extraction, multi-session reasoning, temporal reasoning, knowledge updates and abstention, and reports a substantial degradation across long histories. [LongMemEval-V2](https://arxiv.org/abs/2605.12493) evaluates context gathering over histories up to 115 million tokens and finds file-navigation agents competitive but expensive. [RAGChecker](https://arxiv.org/abs/2408.08067) separates retrieval claim recall/context precision from generator context use, noise sensitivity, hallucination and faithfulness. These are useful shapes for our own oracle; their scores do not transfer directly to a game.

Maintain story-specific questions with expected, acceptable and forbidden evidence:

- exact current fact;
- alias and duplicate-name disambiguation;
- paraphrased callback;
- multi-hop person/place/thread relation;
- time-qualified fact and later correction;
- attributed rumor versus canon;
- hidden/private decoy;
- low-drama old detail among recent dramatic noise;
- broad catch-up/theme question;
- genuinely absent fact requiring abstention;
- microbe/abstract-world contrast without human defaults;
- branch/fork isolation.

Measure at least:

| Stage | Measures |
| --- | --- |
| Index | coverage, freshness, stale units, rebuild cost, source fidelity |
| Retrieval | expected-handle recall, forbidden-handle rate, precision, rank, diversity, query work |
| Assembly | unique useful bytes/tokens, duplicated evidence, omitted required facts, provenance completeness |
| Storyteller | context utilization, contradiction handling, abstention, unsupported claims, continuity quality |
| End to end | player-visible correctness, latency, model/tool rounds, money, failure/recovery behavior |

Evaluate fixed context budgets. More retrieved candidates can raise recall while increasing noise and pushing the best evidence out of the final packet. A retrieval improvement that disappears after reranking/truncation is not an end-to-end win.

## Recommended Offscreen progression

### Implemented evaluation foundation

The provider-free `offscreen.memory-evaluation-corpus.v1` artifact deterministically generates conventional Greywake, an independently identified Greywake destruction fork, and abstract gradient-life histories at a requested scale, initially 200 scenes each. It assigns stable campaign, branch, source and evidence identities; records parent/fork scope; publishes sources and current evidence through the ordinary immutable document-store manifest; and carries labelled expected, acceptable and forbidden evidence under fixed candidate/read/byte/round budgets. Across the contrasts the oracle covers exact current state, alias disambiguation, exact wording, paraphrased callback, multi-hop relation, temporal update, attributed claim, private decoy, low-drama detail, broad synthesis, absence, abstract-world contrast and branch isolation. This establishes corpus/schema plumbing rather than retrieval quality; the evaluator below measures each route against it.

The provider-free evaluator now records retrieval, assembled evidence and downstream evidence use as separate stages. Missing expected evidence and forbidden evidence are explicit; unexpected but non-forbidden material lowers context precision without being silently reclassified as a correctness failure. Coverage, candidates examined, duration, assembled/duplicate bytes, abstention and not-run generation remain visible. The first Greywake linear-AND baseline passed only 1 of 12 retrieval/assembly cases with mean expected recall and context precision of `0.0833`; generation was deliberately not run. This is a diagnostic baseline, not a threshold or an indictment of the corpus: the current search consumes natural information-need queries as literal all-term queries and cannot perform paraphrase, relation or broad synthesis.

### R1 — Oracle and structured cues

Create a durable benchmark corpus and query set before tuning retrieval. Add stable identity/alias/place/thread cues to canonical metadata and task context. Prove current-version, privacy, branch and time filters.

### R2 — Indexed lexical baseline

Replace full linear scanning with a rebuildable field-aware lexical index over contextualized current units and immutable sources. Preserve the current search contract and coverage trace. Compare against the linear oracle for correctness.

The backend-neutral L1 contract is implemented. `offscreen.story-retrieval-result.v1` returns versioned canonical units rather than backend rows: document identity/revision/hash, path/kind/authority/visibility, branch/current/time fields, heading path, explicit source links, contextual key and body size. Candidate scores name their provider, and complete/partial/not-indexed coverage carries the exact root/revision watermark and bounded omission reasons.

L2 adds a provider-free in-process field-aware lexical index over one captured canonical root. It scans eligible bodies once during construction, then ranks OR matches with deterministic title/path/context/body weights and compact snippets. An initial result overstated precision because raw passages were excluded and unlabelled candidates were discarded by the evaluator. The corrected route indexes raw source passages and counts every returned candidate as context. At both 200 and 2,000 scenes it passes `9/12` retrieval cases with mean expected recall `0.8889`, mean context precision `0.2972` and `6/12` assembly passes. This establishes value, not general accuracy: the oracle is small and synthetic, relationship-heavy and ambiguous-name cases still fail, and generation use remains untested.

L3 adds an inverted postings map, deterministic versioned snapshots and a disposable local store with replace/load/delete behavior. Restart restores identical results and source links; rebuilding a revised canonical root replaces the old projection while the old index cannot answer for the new root. `pnpm memory:index-benchmark` rebuilds and measures the true passage corpus without provider calls. One workstation run indexed 208 versus 2,008 permitted units: construction took about `432 ms` versus `3,447 ms`, while all twelve queries took about `79 ms` versus `411 ms`. These are diagnostic observations, not performance promises. Queries visit matching postings rather than every body, although broad/common terms can still produce large posting lists.

### R3 — Bounded exploration

Connect search/list/read operations to a persisted `needs_context` round sharing the generation's round, read, byte and spend envelope. Demonstrate retrieve → exact read → final result and no-match/partial-coverage behavior with scripted generation.

### R4 — Episodes and source navigation

Add bounded episode/thread cards and source-section reads. Generate additional summaries in an already-needed turn where practical; track missing/stale coverage and never block valid gameplay for decorative maintenance.

### R5 — Local hybrid experiment

Evaluate a local embedding model and optional reranker against the same oracle. Record model/version, hardware latency, multilingual behavior and incremental rebuild cost. Fuse ranks; never let similarity settle state.

### R6 — Relation and global experiments

Evaluate explicit-link traversal for multi-hop returns. Add derived graph/community or hierarchical summaries only for benchmark cases where simpler routes fail and the cost/quality trade-off wins. Keep global synthesis optional and separately budgeted.

## What not to copy blindly

- A vector database as the source of truth.
- One embedding per whole story or one chunk per fixed token count.
- One ever-growing summary of the campaign.
- LLM-extracted entity graphs treated as canonical mechanics.
- Every open thread inserted into every turn.
- Automatic query expansion or reranking on the cheapest tier.
- A hidden retrieval call whose tokens and cost escape the operation budget.
- Top-k chosen once and used for every query type.
- “No match” interpreted as “never happened” without coverage evidence.
- Benchmarks that test only trivia recall and ignore updates, abstention, privacy, branches and downstream use.

The target is not omniscience. It is an inspectable memory system that finds the right evidence often enough, knows which evidence is current, spends proportionally, and makes its uncertainty diagnosable.
