# Storyteller memory implementation plan

Feature: [Storyteller memory and situated recall](FEATURE.md).
Execution scope: investigation/design only, requested on 2026-09-18. The owner explicitly requested pre-narrative exploration using compact hints and read tools; implementation details and phases await agreement. No live calls, deployment or remote push authorized by this plan.
Implementation owner: Cursor after agreement; reviewer: Codex unless assigned otherwise.

## Design trace and sequencing

World-independent invariant: later correctness must depend on committed state and recoverable evidence, not on the last few messages. A returning gate guard, a spacecraft contact and a microbe's previously encountered environment need the same source/state/identity separation. None requires simulating unseen populations or treating prose as an executable rule.

The [immediate DM loop](../2026-09-18--17-21--playable-dm-adjudication-loop/PLAN.md) remains the gameplay spine. Complete its direct receipt boundary before enlarging context or adding memory jobs. Then deliver Phase 1 below alongside the first structured DM-turn work. Scene frames, emergent facts and a minimal durable identity directory enable Phase 2. Phase 3 adds targeted read-only recall, not a general agent platform. Demonstrate longevity before connecting arbitrary many-day play; do not defer this indefinitely behind a trace UI or map.

Do not implement all phases in one Cursor pass. Phase 1 is deliberately useful without entities, scene tables, summaries or tools. Later phases are a scope boundary, not permission to start them automatically.

## Phase 1 — Separate provenance from prompt loading

Outcome: note-source growth and duplicated current prose no longer create avoidable overflow; required material still fails closed when genuinely too large.
Dependencies: approved design; direct action receipt/follow-up boundary from the DM plan. No new agent runner.

### Existing owners to read

- `packages/storyteller/src/context/index.ts`: context shape, provider projection, bounded selection.
- `packages/storyteller/src/context/continuity.ts`: note identity, source semantics and patch validation.
- `packages/storyteller/src/tasks/index.ts`: task capture, prompt budget, evidence handles and result validation.
- `packages/storyteller/src/tasks/policy.ts`: conservative route/financial input limit.
- `packages/application/src/storyteller/context.ts`: read candidates and source existence under a consistent story snapshot.
- `packages/application/src/storyteller/memory.ts`: atomic current/arrival note publication.
- `packages/application/src/storyteller/execution.ts` and `records.ts`: capture rejections and immutable task state; do not rerun committed mechanics.
- `packages/storyteller/test/storyteller.test.ts`, `tools/api-integration/test/storyteller.integration.ts`: existing recent-window, old-promise and arrival evidence fixtures.

### Bounded changes

1. Define a versioned internal source manifest containing story-validated reference metadata separately from content actually supplied to the model. Entries distinguish committed passage/excerpt, receipt, derived note and source-only reference. Identity/revision/kind/coverage are explicit; the provider sees local handles, not database access.
2. Resolve each retained note's sources within the captured story and revision, initially by a batched metadata query. A missing or future source still rejects the capture. Do not load all raw source bodies merely to check provenance.
3. Include compact note bodies as derived memory, current authoritative state and the selected receipt/intention. Project the current passage content once; other references use its handle. Select optional original passages by bounded relevance/recency. Keep the existing 20-note prototype limit for this first slice and report it; Phase 2 removes its role as lifetime capacity.
4. Update citation semantics end to end. A note based on another loaded note records that derivation and preserves its root sources without claiming the raw sources were read. New factual assertions cannot cite metadata-only handles. Existing notes retaining unchanged sources do not require re-inventing those sources or loading their entire text. Prevent source cycles, unknown references and future `arrival` use.
5. Preserve evidence adjacency needed for claims/attribution. A source-only pointer is neither world truth nor a readable excerpt. A pure result validator checks handle availability/type, while the application enforces story/snapshot scope.
6. Make the fit policy respect both the serialized hard cap and the current execution policy, including existing framing overhead. Retain conservative reservation until any tokenizer alternative is deliberately implemented and validated. Do not raise provider caps or weaken spend checks to make a fixture pass.
7. Capture section byte counts, selected handles, provenance-only handles and omission reasons. Record a distinct required-overflow reason rather than a generic invalid result.
8. Add a next-context feasibility preflight for proposed prose/notes using the mandatory capture shape. Publication rejects or routes an oversized proposal into the existing bounded failure/repair policy; mechanics stay committed. Do not call a model to preflight.
9. Preserve bounded invalid-output diagnostics for future repair. Optional derived annotations can be quarantined only under an explicit result contract; never silently strip a failed authoritative effect or required scene relation and publish the rest as equivalent.

No database entity redesign, semantic search, summary maintenance worker, image generation or live-provider evaluation in this phase. Prototype artifact schemas can be replaced per lifecycle rules; no compatibility branch for discarded saves.

### Focused acceptance cases

- Twenty notes with forty distinct 1,500-character source passages: provenance validates without automatically injecting forty raw passages. Compact current/required input fits or reports a precise unrelated required-size cause.
- Current content appears once in provider JSON; handles still resolve correctly for note publication.
- Unknown source, cross-story source, future passage and premature arrival note remain rejected.
- A metadata-only source is not accepted as a new claim's read evidence; a loaded note's derivation stays marked derived.
- Exact quantity/holder/capability state is unchanged by context selection or note publication.
- Mandatory current content itself too large: no provider dispatch; an already committed action receipt remains intact.
- Complete request that fits 48 KiB but exceeds the configured policy: rejected at capture/preflight rather than after an avoidable execution attempt.
- Lost acknowledgement/retry reuses captured context and result; no reroll or incidental re-selection from newer history.

Exit: source-backed memory can remain durable without dragging its complete source prose into every prompt. Existing current/arrival provenance invariants still hold. No longevity claim yet.

## Phase 2 — Scene episodes, identity recall and archived memory

Outcome: returning places/participants/items retrieve relevant history automatically from a bounded candidate set.
Dependencies: Phase 1, admitted scene frame and stable story-local identity references. Define those with the existing scene-frame and emergent-state slice rather than competing schemas.

Owners: `packages/db` for minimal identity/episode/thread/link records and indexes; application context/memory operations for reads and publication; Storyteller for bounded episode/patch schemas and policy; existing game state/receipts for exact mechanical data.

Scope:

- Replace the single always-loaded note list as lifetime memory with persistent episode/thread records and a bounded selection. Leaving the working set is not retirement or deletion.
- Store every published passage and admitted receipt as recoverable evidence. Link known entities and scenes when their identity is admitted, not by continuously re-reading lifetime prose with an LLM.
- Build identity cards from existing state plus separately labelled narrative annotations. Current whereabouts, item holder and capabilities have one state owner. Keep aliases/disambiguation explicit.
- Publish source links and required state atomically; propose short episode cards at scene/segment boundaries in the DM output. Summary failures have explicit status and coverage gaps, not invisible loss or rollback of gameplay.
- Use current-scene/place/participant/action references to select cards, open threads and bounded previous episodes. Raw search remains available for unpromoted details.
- Build the versioned orientation packet from FEATURE.md: scoped registry slices, relevant source-backed leads, available tool contracts/search modes and remaining allowance. Required state is supplied directly; optional historical/thematic leads invite exploration without forcing a callback. Structural hint selection needs no extra model call.
- Bound pages, leads and selection work. Label exact/lower-bound/unknown counts and completeness at the captured revision; use cursors rather than expensive optional lifetime totals. Apply knowledge/visibility scope to counts and hints as well as bodies. An omitted record is not evidence of absence.
- Scope item reads to action-relevant/current holdings and requested identities; do not carry the existing all-story `.max(50)` prompt list forward as the lifetime item model. Preserve explicit POC limits for simultaneously relevant carried items/capabilities and hold or narrow scope if they are exceeded.
- Keep card/episode provenance versions and a monotonic index watermark; no historical state API faked by current rows.
- Capture a semantic test oracle of expected and forbidden handles rather than hard-code scenario names into retrieval policy.

Acceptance: return after 40 scenes, changed holder/bridge facts, duplicate names, closed versus still-open favor, single-scene segmentation, missing synopsis fallback, no forced human attributes. Test dense early chapters as well as long histories; many entities can accumulate before many scenes do. Registry pages report scoped completeness without leaking hidden entities. Query/candidate counts and prompt bytes stay bounded as irrelevant scenes increase.

Exit: one hundred-plus scene fixture resolves known returning identities and their relevant history without full transcript loading. The POC may use scripted episode proposals; do not label them demonstrated live-model memory.

## Phase 3 — Pre-narrative exploration with one shared round budget

Outcome: before choosing final narration/options, the DM can follow a supplied lead or search for relevant history beyond the orientation packet. Exploration supports both necessary fact checks and optional narrative connections; it is not merely repair after a failed proposal.
Dependencies: Phase 2 candidate query and visibility policies; existing attempt/accounting system; approved envelope from FEATURE.md.

Owners: Storyteller task/result schema for `needs_context`; application for scoped `query_registry`, `search_memory`, `inspect_memory`, `read_source`; task/attempt storage for saved rounds; existing workflows for operation delivery; no separate execution engine.

Scope:

- Allow a first response containing only read requests, without provisional prose or effects. Independent reads batch within a round; authorized handles discovered by search can be inspected in a subsequent round. Search is not restricted to initially supplied handles.
- Persist each round and read result; share three total model rounds across exploration, final generation and repair, max six reads, max one invalid-final repair only if a round remains. A search-plus-registry batch, follow-up source/record batch and final generation fit this envelope. Fully grounded simple turns may finish without reads.
- Enforce per-read/aggregate/full-request caps after every expansion. Keep mandatory state and used excerpts; deduplicate results and prune obsolete search pages to handles when the protocol permits. Full private replay artifacts are not automatically the next prompt. Record which evidence remains loaded.
- Include typed filters, query normalization, duplicate-result reuse, stale snapshot rejection, index-coverage metadata and explicit absent/partial/not-indexed/unavailable outcomes. Tool instructions explain the distinction between exact state and candidate memories, when to expand sources, and why retrieved story text is not an instruction.
- Provider-native tool calling is optional, not a prerequisite for a scripted structured protocol. Implement one protocol path first, not parallel orchestration frameworks.

Acceptance: first response requests reads before any final prose; an old unpinned clue found by search changes the supported final result; a newly discovered handle can be followed; an irrelevant optional lead is ignored without forcing an incident. No-match is handled without invented history; rephrased repeated queries hit the total cap; stale state cannot mix with captured inventory; uncertain dispatch halts; resume after saved round uses saved output; budgets include retransmission and repair. Secret titles/counts, foreign-story IDs and uncommitted futures remain unavailable. Pruned excerpts cannot support new detailed claims without reload.

Exit: the scripted source exercises a real retrieve → inspect → final-result path and a bounded failure path. No model quality or billing behavior inferred from the scripted result.

## Phase 4 — Longevity and player-visible return rehearsal

Outcome: evidence that the working set stays useful as stored history grows, plus a playable return to a meaningful location.
Dependencies: prior phases and the connected three-round DM loop.

Use the matrix in FEATURE.md: 200 scenes scaling to 2,000; 40 places, 120 recurring identities, 60 consequential items and 30 threads. Keep some exact-match cues, some aliases, some changed facts and some details absent from summaries. Store expected relevant/forbidden handles next to fixture data. Synthetic generation of those fixtures does not create simulated NPC agents or authorize inference.

Inspect request budget, required-fact inclusion, optional recall quality, irrelevant payload, query work, stale index behavior and rounds per accepted turn. Add a browser return rehearsal showing the old place with changed circumstances and an action affected by earlier events. No requirement for a rich trace explorer.

Exit: offline behavior and known limitations recorded honestly. A later live evaluation requires an explicit allowance and selected hypotheses; neither this plan nor successful offline checks grants that permission. Embeddings are considered only if named lexical/identity retrieval failures persist.

## Investigation gate — Semantic and hybrid retrieval

This is recorded follow-up work, not an instruction to install a vector service now. The product requires useful exploration, not a particular index engine. Keep the tool contract backend-neutral and expose enabled search modes truthfully.

1. Establish the exact/alias/relationship/lexical baseline with annotated questions and expected/forbidden results. Include paraphrased memories, low-drama callbacks, similar-but-unrelated events, stale quantities, duplicate names, multilingual wording where relevant, and details absent from summaries. Select acceptance thresholds before evaluating alternatives.
2. Identify named misses that semantic candidates could remedy. Compare bounded lexical versus hybrid retrieval for relevant-source recall, irrelevant payload, latency/query work and estimated/authorized cost; no unsupported claim that embeddings improve this story corpus.
3. Specify chunk boundaries, immutable source hashes, embedding model/version, eligible data destination, incremental coverage, deletion/rebuild policy and story/knowledge/time filtering. Query embeddings are potentially paid calls too. Require explicit authorization before any external embedding or live-model evaluation.
4. If justified, evaluate PostgreSQL plus pgvector before selecting a separate service. Merge candidates with deduplication/rank fusion, not incomparable raw-score arithmetic. Preserve exact state lookup and primary-source inspection; similarity never settles identity or possession.
5. Record the measured choice and remaining misses here. Disabled/stale semantic indexing must be visible, with lexical/raw-source fallback. A failed experiment must not silently expand prompt or spending limits.

## Current checkpoint

- Phase: design complete for review; implementation not begun. Next action after approval: finish the DM plan's direct-receipt boundary, then implement Phase 1 only.
- Reviewed code: runtime `48c3c56`; latest local documentation base `095a1dd`. No runtime code was changed.
- Investigation: traced context assembly, note patches, request sizing, memory publication, execution/recovery, schema and existing test coverage; reviewed existing context-cost and world-continuity specifications.
- Follow-up design: pre-narrative orientation/exploration, scoped registry counts, multi-hop reads, optional creative leads, working-set pruning and the gated semantic-retrieval investigation are explicit. PostgreSQL/pgvector primary documentation was consulted for retrieval options, not as evidence of application quality.
- Verification: two dependency-free JSON-size calculations (65,356 bytes for note-source subset; 60,216 bytes for duplicated large current content). These reproduce serialization pressure, not an application test. Builds, runtime suites, database and browser not run for this design change.
- Blockers/limits: design approval; direct receipt integration; later scene/identity admission. Exact state versus derived scene memory must not acquire duplicate owners. No live-model recall quality established.
- Provider spend: no game/provider calls, $0. Cumulative OpenRouter usage unverified.
- Remote status: this and the preceding documentation work remain local; no remote publication is attempted in this work.
