# Honest agent capability audit | what is genuinely agentic and what is still a POC

**Evidence class:** source-level assessment as inspected 2026-11-14; not measured live quality, hosted scalability or new provider experiments. Parent [full code trace](current-flow-audit-2026-11-14.md) and [vision-derived constitution](../vision-and-quality-constitution.md). **Interpret "implemented", "potential", "unproven" literally.**

## Terms without marketing inflation

- **LLM call:** one bounded request -> output. If input already contains all necessary facts and one result is enough, this can be the correct and most economical Storyteller implementation.
- **Tool-using loop:** a model can inspect intermediate results, request another scoped read, update a bounded operation-local working set, then decide whether to continue or submit a final candidate. There must be real runtime control and stop conditions.
- **Storyteller agent:** a task-directed creative process that can select evidence and deliberation proportional to need, reconcile real state, propose internally coherent next scenes and return a candidate inside admitted creative/cost authority.
- **Living world:** persistent authoritative state, accepted time, activities, consequences, memory, player permissions and eventually bounded unattended policies. This is **not** equivalent to a continually running LLM.

The current implementation has an authentic optional narrow **memory tool loop**. **It does not have a broad general-purpose agent that freely investigates arbitrary game tables or synthesizes an entire simulation through subagents.** That is neither a defect by definition nor a sufficient long-term answer.

## Capability ledger

| Capability | State | Source facts | What the result does *not* prove |
| --- | --- | --- | --- |
| Versioned task identity and saved provider request | **Implemented** | `tasks/index.ts`, `storyteller/records.ts` freeze task v16 and `contextManifest` | The selected model will use every relevant fact |
| Strict JSON output schemas and local semantic admission | **Implemented** | `provider-schema-projection.ts`, `result-validation.ts`, `publication.ts` | Believable dialogue, fitting surprise, rich personality or long-term creative taste |
| One-shot generation/one repair | **Implemented default** | `task-admission.ts` chooses single or repairable, `execution.ts` dispatches | Agent tool use is universal |
| Multi-round investigative controller | **Implemented but optional** | `memory-exploration-controller.ts` persisted rounds, memory provider budget | Dynamic task choice is integrated for every new scene |
| Search/read tools | **Implemented narrow** | `memory-exploration.ts`, `tasks/memory-exploration.ts` support ask_memory/read_memory | Tools for arbitrary mechanics/permissions/other agents exist |
| Creative possibilities search | **Implemented shallow** | `intent:possibilities` uses lexical search with bounded leads | A structured long-term director is consistently planning developments |
| Stateful model conversation thread | **Not used, intentionally** | Each task/round rebuilds two-message request with current source/evidence | Missing permanent chat is a flaw; it is usually desirable |
| Opaque provider compaction | **Disabled, intentionally** | OpenRouter `context-compression` disabled; local context packer prunes | We need LLM summarization for 2–3 rounds |
| Runtime subagents/manager-workers | **Absent** | One task operation, optional serial investigation rounds | Parallel agents would improve quality/cost |
| Policy-driven context/depth selection | **Partial** | Effective policy and recipe types exist; default `creativeInput` off | User-tier/taste/task-need selects optimal investigation effort |
| Canonical memory/notes and exact version checks | **Implemented foundations** | CAS roots, `canonical-knowledge`, current notes, recall cues, source validation | A promise will be recalled after 20 unrelated turns |
| Durable independent story decisions | **Mechanics implemented for narrow families** | accepted actions, finite work, world obligations, receipts, holds | Arbitrary human or nonhuman action can be admitted |
| Model route and provider authorization | **Implemented boundaries** | captured policy, dispatch authority, no fallback, budget ledger | Reasoning/caching/model capability knobs are actually honored across adapters |
| Cache effectiveness | **Measured only at packet/usage observation level** | provider telemetry includes cached tokens; request audit shared prefix bytes | Automatic platform cache hit/discount reliability |
| Long-term narrative initiative and social evolution | **Selected vision, partly represented in profile/docs** | tone/surprise/policy, private descriptive changes | Sustained ordinary life and evolving relationships demonstrated |
| Hosted thousands of users | **Architecture direction, not load proof** | durable generations, SQL, worker, private CAS and quotas | Prompt/CAS/lexical index cost and provider concurrency scale linearly well |
| Full POC through human play | **Not accepted** | historical 6 generation connected run and scripted fixtures | Owner wants to keep playing 10–15 or 100 turns |

## What is a real loop here?

For a selected `memory-exploration.v1` recipe, `runMemoryExploration` is a **durable control loop**, not a fancy `for` around prompt completions. It persists its captured request/attempt/final candidate across restart, handles typed model decisions and read results, enforces max rounds, reads, retained bytes, creative directions and protected final output, and defers publication to game authority.

**However:**
- tool catalogue is exactly `ask_memory` and `read_memory`; even `ask_memory` has a fixed evidence/possibilities intent, not a general contextual agent-computer interface;
- the model doesn't perform direct SQL lookup, roll or effect commit; that's a critical safety property, not a missing tool;
- the application builds the lexical index and services queries; it may inspect many source bodies even when final evidence is tiny;
- final round receives a repacked evidence packet, not the entire provider conversation; this is appropriate for disposable tasks;
- default ordinary generation never chooses this loop automatically, because `prepareAdmittedStorytellerTask` lacks a need classifier and defaults creative posture `off`.

**Verdict:** useful proto-agent work, not drooling AI slop; but **agentic breadth, cost efficiency and actual gameplay benefit remain unmeasured**. Calling it a complete autonomous Storyteller would be misleading.

## The actual strongest architectural choices worth retaining

**Source of truth outside language model.** PostgreSQL holds admitted actor/current rules/time/items, immutable canonical documents preserve narrative evidence, and model output is a candidate verified at publication. It is foundational for meaningful stakes and thousands of separate stories.

**Specific identities and causal fencing.** Published passage ID, revision, accepted operation ID, source hashes, exact active-scene scope, receipt/projected digest and authorized offer prevent stale model text from committing incorrect facts or rerunning dice.

**Conservative accounting.** Dispatch occurs only through captured effective resource/budget constraints, with reserved attempt identity; unknown transport is uncertain, not free. Multi-round child operations share the parent budget.

**Small purpose-specific task output.** A historical report cannot create choices, a consequence cannot rewrite a roll, and a quiet mechanic need not invoke the model at all.

**Model-free deterministic memory retrieval.** A keyed current-state read is often better than an LLM asking “who holds this?” every time. Exact source lookup is stronger than an amorphous retrieval guess.

**Disposability.** Task conversations terminate; canonical history persists. No cross-game model session or token-compaction dependency is necessary for game memory.

## Priority-ranked shortcomings with diagnostic evidence

### P0: playable creative quality is underproven

The historical connected `storyteller.v16` run had six successful model generations, warehouse work, several clerk exchanges and a departure. It had no established return after many unrelated scenes and **no descriptive identity/relationship/document changes from the five consequences**, despite a clue continuity note. The user's project is an *actual game*, not an output schema demonstration.

**What would refute this concern:** a 10–15-turn owner-blind run proving coherent choices, long-term callback, quiet world, mechanics and profile adherence across ordinary and nonhuman fixtures, with no repeated unearned effects and measured spend. No such accepted run is documented yet.

### P0: task selection is too insensitive to cognitive need

The same cheap one-shot path serves routine small talk and complex historic reconciliations unless a caller explicitly opts into memory exploration; spare entitlement alone doesn't select research. The current profile is creative direction; it should not implicitly grant tokens, but **the task need classifier and player-selected effort preference are missing from ordinary admission**.

**Desired:** cheap deterministic evidence first; optional bounded escalation at admission based on actual missing evidence and captured resource policy, not “always 3 rounds for premium” and not an unbounded model that grants itself work.

### P0: context/source handoff can fail to carry vital long-memory detail

Source storage, manifest indexing, loaded documents, selected docs, final packed context and resulting plan/source use are distinct stages. Current task manifests track omitted passages, not a complete explanatory trace of *why a required meaningful fact was or was not present in the last provider message*. Passing a retrieval corpus without actual final request plus later publication is insufficient.

**Desired:** end-to-end evidence trace of a known relationship/promise across **stored → eligible → discovered → exact read → packed in provider request → cited in proposal → published → recalled later**, with deterministic source/visibility evidence. Do not add generic LLM memory if the first bug is missing retained document selection.

### P1: contextual and canonical loading is expensive for long histories

`context.ts` scans all `gameActivity` rows for a story and filters on process states. `canonical-knowledge.ts` reads up to 64 full descriptor docs; then only up to 8 enter context and packer may remove more. `buildLexicalStoryIndex` reads all eligible source passages and MD bodies per opted-in memory exploration. These are tangible I/O and linear-growth risks even before provider token costs.

**Desired:** bounded active state queries, immutable root-linked catalogue/index metadata, incremental or reusable root-versioned lexical index, lazy exact body read, and cost/profile benchmarks at 200 and 2,000+ scenes. ENG03 owns moving CAS reads out of SQL locks; SA changes must not implement ENG03 by accident.

### P1: global prompt and creative profile can quietly contradict the dream

Common rules hardcode “Never ... end the character's life”; legacy task says 2–5 intentions, while vision allows quiet nothing, one reasonable action or someday admissible severe risk depending on captured policy. Task rules and schema shape may dominate limited output, producing inflated private branch plans while public prose is thin. **A no-op change that makes a local JSON fixture pass is not sufficient**.

**Desired:** task-specific prompt modules with immutable game authority and explicitly captured risk, novelty, quietness, profile/role; no universal taste/default option count. Profile is data, not injected system authority to override rules.

### P1: model/transport capabilities are only partially configurable

`modelPolicySchema` has reasoning/output protocol/response mode/service tier and funding dimensions, but OpenRouter payload hard-disables reasoning. There is no active model capability registry explaining which exact routes support hard JSON schema, cache controls, billing categories or useful reasoning. Disabling reason is a safe default, not proof that a premium route can actually consume a permitted nonzero reasoning envelope.

**Desired:** explicit versioned route capabilities, real adapter-enforced bounds, fail closed on incompatible route, measured prompt caching, refusal/length/partial stream/uncertainty traces. No needless provider package migration.

### P1: creativity and memory maintenance aren't independently measured

The creative `possibilities` path reuses lexical search with source-linked leads, and stored private directions ensure one selected and others rejected when supplied. That's a good *artifact* but does not prove it improves stories or that later consequences respect earlier hints. Durable descriptive records aren't reliably created just because prompts allow patches.

**Desired:** a separate, measured narrative-director/source-update discipline, grounded in specific relationships/threads, with selectable initiative policy. Avoid a perpetual agent running for every NPC; an occasional source-linked private direction is enough for most stories.

### P1: no integrated per-operation insight into why an output disappointed

Useful slices exist in request audit, retrieval oracle, budget, publication and connected evidence. But a reviewer often must manually cross many files to know whether the model failed because it lacked source, selected irrelevant memory, failed final validation, got truncated, ran out of funds, or published but was aesthetically bland.

**Desired:** one redacted trace graph from accepted cause to output and source handles, plus a true actual-model request manifest and cost/latency, with optional provider raw payloads only when authorized and properly protected. Human quality judgments remain separate.

### P2: subagents and provider-side compaction are not missing prerequisites

The current limit is typically three rounds with repacking, not an indefinitely accumulating transcript. Multi-agent fan-out would pay extra prompt/evidence/merge cost and risks conflicting fictional authority; background agents could accidentally create events without player consent. The model doesn't need access to a general coding agent or shell to play an RPG.

**Decision:** do **not** build subagents or automatic compaction before a controlled within-budget comparison proves a concrete benefit. Keep an architecture seam for later sourced specialist questions. This is *a deliberate design choice*, not a blocked POC.

## Evidence strength matrix

| Evidence | What it can prove | What it cannot |
| --- | --- | --- |
| Static source/TypeScript compiler | Existences of controllers/contracts/permission checks and obvious unconnected branch | Runtime retries, whole-system money correctness, enjoyable game |
| Pure fixtures/SQL on disposable DB | Deterministic action/receipt, duplicate suppression, canonical source mapping | Language model attention or real provider performance |
| Retrieval benchmark (12 synthetic cases) | Candidate/assembly quality under exact benchmark and budgets | General multilingual/relational recall or player choice quality |
| Storyteller provider packet audit | Request schema, exact bytes/section hashes, potential shared prefix | Actual token count, cache discount, intelligence or output usefulness |
| Recorded connected 6-generation trace | Some working model/provider+publication interaction in that historical setup | 10–15-turn sustained campaign, current models, general users/worlds |
| Bounded new live A/B (later, with approved spend) | Comparative model/profile/context quality, output failures/cost under selected case | Universal superiority, lifetime continuity at scale |
| Human returned-player session | Comprehension, narrative appeal, desire to continue | Security/billing/SQL race correctness |

## Decisions to carry forward

1. Keep modular monolith and deterministic authority. “Serious agent” means *serious evidence and decision-making*, not agent count.
2. Retain one-shot as fast baseline. Add **explicit, need-aware** optional investigative path.
3. Prioritize source-quality → candidate quality → connected gameplay quality and money, not generic architecture prestige.
4. Make tier and budget choice a conjunction of account funding, route capability, task purpose/need, scene risk and player optional preferences, with invariant rule truth.
5. Compaction is not canonical memory. Start with disposable per-operation repacking.
6. Tool data uses exact bounded references and permission, never arbitrary SQL or hidden provider browsing.
7. Defer creative director/subagents until longitudinal quality evidence earns a new code Change.
8. No code Change should be marked Done because “Storyteller now has an agent loop”; completion needs a falsifiable player-visible or performance/correctness outcome.

The [target operating model](../target-operating-model.md) must be evaluated against the vision as well as existing compatibility; do not preserve POC structure merely because it already exists.
