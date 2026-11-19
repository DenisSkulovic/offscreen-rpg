# ARCH05 | Storyteller harness, role recipes and context packs

**State:** Proposed (2026-11-19)  
**Kind:** documentation / agentic runtime design  
**Selection:** Not selected; candidate design to reconcile with the owner before implementing. No code, provider calls or model/tool installation authorized.  
**Program:** [Distributed architecture laboratory](../../README.md#distributed-architecture-laboratory-new-2026-11-19)

## Why this Change exists

The owner wants an LLM Dungeon Master capable of reading, investigating, interpreting, proposing and maintaining long-lived canon in an arbitrarily branching D&D-style story. The goal is **useful evidence per model token and round**: known current state is injected; available related material is advertised through bounded orientation/handles; unknown history is found through one intention-level query whose deterministic backend composes many reads, returning only relevant, source-grounded evidence. Many role-specific abilities must not turn into one bloated global prompt or ten mandatory sequential models.

**Do not invent a new memory engine.** The repo already has [canonical documents](../../../../docs/technical/storyteller/canonical-documents-and-packages.md), [context selection](../../../../docs/technical/storyteller/context-selection-and-recall.md), [task roles and tools](../../../../docs/technical/storyteller/prompts-and-tools.md#task-roles), [operation and controller](../../../../docs/technical/storyteller/operation-and-controller.md#two-loops), [cost/recipe contract](../../../../docs/technical/storyteller/request-context-and-cost.md#bounded-work-not-an-open-ended-agent) and existing source types in `packages/documents/src/schema.ts`, `packages/storyteller/src/tasks/memory-exploration.ts`, `packages/storyteller/src/tasks/document-changes.ts`. This is a refinement of these owners. ARCH03 owns historical branch consistency and source/root inheritance, not duplicate tool-specific policy.

## Proposed architecture, for owner ratification

### 1. Separate five logical information layers

1. **Pinned reusable content:** source-world library/rule package, provenance and permissions, immutable per campaign until explicit adoption.
2. **Branch-local canonical documents:** stable identity/relationship/lore/thread/scene source with immutable versions and a manifest selecting the effective revisions. Human-readable Markdown for descriptive lore, validated structured JSON for mechanical and exact state. The logical path is a friendly view, never a mutable shared filesystem of truth.
3. **Mechanical authority:** character rules/state, rolls, possession transfers if meaningful, work progress, time, commitments and receipts; SQL is presently live authority, and any migration cannot create a second editable owner.
4. **Historical scene checkpoints:** an immutable scene-reference tuple pointing to the applicable authoritative mechanical state/checkpoint, canon manifest root, source passage, package pins, visibility/provenance and narrative revision. A fork inherits the exact as-of checkpoint and branch-valid history, not the parent's later updates. The *scene* is not a Next.js page leaf and not every quiet mechanical tick.
5. **Derived recall surfaces:** compact current identity cards, source-range summaries, search chunks, rankings/graph links and task-local working context. All are version-pinned, invalidatable and rebuildable; none can acquire game authority because they are convenient.

### 2. Avoid the ever-growing character file

Use **one stable logical entity identity** linked to a concise current-version description/card, separately versioned consequential state and references to historical source passages/changes. Revisions reuse immutable content; manifest roots select exactly one valid present version for a branch/state point. A Storyteller asked “Who is the king now?” should receive his effective *current/as-of* card, not ten successive copies of the biography or ten arbitrary vector chunks. If it asks “What changed between scenes 10 and 20?” the tool deliberately composes provenance/event history or a diff from **two explicit checkpoints**. Old prose remains accessible as evidence.

Promotion is sparse: a passing bystander need not become a registered character; a rumor is a belief/attributed claim, not world truth; a private imagined plot is not canon; a microbe story requires no fantasy inventory schema.

### 3. Task-specific layered context, assembled before inference

- **P0: Stable universal authority + narrow role recipe**, versioned, cache-friendly where the provider actually supports it. Never put every role's instructions/tools into every request.
- **P1: Mandatory exact present**: branch/story/scene context, current mechanical constraints, committed receipts, active intent, relevant actor knowledge, pinned applicable rule fragments, permitted capabilities and selected Storyteller profile. The application supplies this without a paid research round.
- **P2: Focused orientation**: a compact scene/identity/thread map with stable handles, current status, relevance reason, source revision and size/availability. Prefer 5 useful leads to 500 filenames. Never confuse a search lead with accepted fact.
- **P3: On-demand evidence**: one intent-level `ask_memory(question,intent)` orchestrates exact IDs, source links, structured predicates, lexical retrieval and optional semantic/graph candidates *internally*, then verifies chosen revisions, authority, branch/knowledge visibility, provenance, coverage and byte limits. `read_memory(handle)` opens exact sources if wording or nuance matters. Future tool names can change, but **avoid duplicate overlapping tools by default**.
- **P4: Optional stronger investigation/reasoning**: only for unresolved, high-value cases, capped within the same operation's final-output reserve and payer allowance.

The context compiler must be deterministic about permissions, version selection, packing and budgets; subjective creative interpretation stays with the model. A missing mandatory source results in an explicit hold/unknown, not confident invention.

### 4. One DM identity, multiple bounded role recipes

**One conceptual Storyteller identity/profile across a campaign**, many task recipes/embodiments rather than one continuously running model or many always-on subagents. Initial roles correspond to existing contracts: opening composer, immediate consequence narrator, contextual continuation, controlling interruption, historical reporter, evidence investigator and continuity curator. Optional narrative direction/ideation is not an automatic second model call. The application selects role(s) based on accepted game transition, required evidence and budget. Most normal scenes are **one well-packed composition call**; an investigator is commonly a bounded phase of that same operation, not a funded separate person. Descriptive canon suggestions should reuse the same already-generated source response; application code validates/adopts them rather than paying the model to repeat itself in Markdown.

When a special role needs a distinct model call, it must deliver a short typed source-linked artifact consumed by the composer, and account for *both* prompts and transmissions under one captured operation budget. Role prompts do not change dice, payer permissions, world/branch authority, or source visibility.

### 5. Model-facing tool design

A high-level intention can trigger many *internal* deterministic storage/index lookups without adding model turns or stuffing all intermediate payloads into the context. Each underlying operation is metered, bounded, logged and permissioned. Return answer/evidence, current-versus-historical qualification, exact sources/handles and coverage/unknowns; offer detailed source reads only when useful. Scope all requests to captured branch, as-of checkpoint, actor knowledge and committed roots; no global latest/foreign-story leakage, including snippets or counts.

**Code mode is a future optional investigation transport, not the default.** Model-generated code executing arbitrary shell, SQL, filesystem, network or state writes is prohibited. A deliberately sandboxed, read-only, capability-limited query program over task-scoped handles could be compared against the intent tool for complex multi-hop investigations. It would have CPU, output, read, token and time limits; only its final selected evidence enters model context. Do not add this without a measured quality/token/latency win over ordinary deterministic resolver.

### 6. Vendor and deployment non-decision

Cognee, vector/graph search, pgvector and embedding models may be independently benchmarked **as disposable source-indexed recall helpers**, not canonical campaign authorities, compulsory infra or proof of quality. The HAR09 Cognee evaluation was for coding-agent repository memory, not the game's DM. No default always-on Memory microservice is selected by this packet; a retriever can initially be an internal library of Storyteller orchestration and later scale separately when actual resource/isolation measurements support it.

## Example for adversarial design validation

1. Scene 10: the king is alive; hero possesses a sword. The exact document root and game-state reference are saved.
2. Scene 20 on parent branch: the king is dead; sword transferred away. New fact versions and history are source-linked.
3. Fork scene 10: task auto-injects **alive king + sword held**, and offers only permissible pre-fork identity/relationship sources. An `ask_memory` lookup must not reveal scene-20 assassination, even when searching across shared immutable objects or a stale global index.
4. In a later branch, the hero meets the king after 50 new scenes. The harness should automatically supply current controlling state and a concise identity cue, then locate a specific earlier promise via one investigation intent, exact source if needed; unrelated passages and obsolete identity versions must not be packed.
5. A rumor that the king died may be retrieved as an attributed rumor; the scene cannot assert death as a committed fact merely because the retrieved text contains that sentence.

## Tests and falsifiable acceptance for eventual implementation

- **Grounding:** exact current state and required references always present; the model doesn't need a tool to learn HP, possessions or accepted result. Model sees an actual source when evidence is claimed, not just a retrieved title.
- **Fork safety:** sibling/parent-future/secret leaks are caught at candidate/snippet **and** exact read phases; same text with different branch provenance is not silently treated as same fact.
- **Efficiency:** compare (a) broad prompt dump, (b) low-level multiple reads, (c) one deterministic intent resolver on equal story fixtures. Measure model rounds, input/output tokens, retained evidence bytes, tool latency, internal reads, index freshness, retrieval correctness, accepted scene quality, and cost. Do not assert savings without experiment.
- **Lifecycle:** old manifest and mechanical checkpoint reproduce exactly; GC cannot retire still-reachable ancestor evidence; a stale task cannot commit on a newer root, or duplicate a provider/mechanical effect.
- **World neutrality:** human/king inventory example and microbe/no-inventory example pass the **same** role/context protocol.
- **Failure modes:** partial/no result, stale index, name collision, rumor polarity, source omission, unsupported rule effect and paid provider uncertainty are explicit and bounded.
- **Human DM quality:** source-faithful 30- and 90-scene recall judged for meaningful callback and plausible creative development, not just IDs returned or structurally valid JSON.

## Documentation impact and ownership

- Product: no new rule; review [vision](../../../../docs/product/foundations/vision.md) and [memory promise](../../../../docs/product/storyteller/memory-and-continuity.md) for any needed clarifying language.
- Technical, designated owners: `docs/technical/storyteller/prompts-and-tools.md#task-roles` and `#selected-compilation-and-tool-contract`; `operation-and-controller.md#two-loops`; `request-context-and-cost.md#small-tools-and-small-records`; `context-selection-and-recall.md#what-source-enters-this-task`; `canonical-documents-and-packages.md#one-owner-per-kind-of-truth`. Reconcile rather than duplicate.
- Code: unchanged (design-only Change). Later authorized implementation must use `packages/documents`, `packages/storyteller`, relevant application orchestration, with genuine source/test evidence.
- Related: `docs/technical/README.md`, `ROADMAP.md`, `work/changes/README.md` only for working links and accurately selected scope; do not claim runtime implementation.

## Dependencies and parallel execution

- **ARCH03** owns fork-state and canon-root consistency. **ARCH02** owns service ownership, commands/events and deployment split. **ARCH05** owns *how a Storyteller task is shaped, given context, allowed to investigate, and charged*. One coordinator reconciles overlapping headings.
- Safe parallel read-only work: current schemas/manifest review, role and prompt survey, retrieval benchmark design, and infrastructure K8S changes.
- Shared technical markdown headings and application source exports must be integrated by one owner or serialized in isolated worktrees. No running change or proposal gets blanket implementation authorization.

## Planned impact and closure

| Plane | Delta | Required proof |
| --- | --- | --- |
| Product | No new gameplay system; existing D&D/fork/memory promise remains authority | No mandatory economy/chapters, no unratified player choice |
| Technical | Clear canonical scene/record shapes, context compiler, task recipes, stable memory tool facade and budgets | Exact owners, current vs selected vs proposed, fork-scope counterexample |
| Code | No code in this Change; future implementation separately designed | Executable diff empty |
| Related | Small backlinks, bench fixtures and proposal evidence; no unverified green statuses | Wiki/change guard and link-health, actual run outcomes |

**Close only after** current-source semantic reconciliation, negative proof review, before/after claim map, source SHA and actual checked evidence. Do not mark this Done simply because this packet articulates an attractive architecture.
