# Storyteller memory implementation plan

Feature: [Storyteller memory and situated recall](FEATURE.md).
Execution scope: prepared implementation of document-based extraction, bounded context, recall/exploration and POC search evaluation, as requested on 2026-09-19. Use local/offline execution; paid provisioning and live model calls remain disabled.
Implementation owner: the coding agent assigned the implementation turn, with one active owner per slice. Commit/push each coherent phase; no repeated approval gate for the prepared scope.

## Design trace and sequencing

World-independent invariant: later correctness must depend on committed state and recoverable evidence, not on the last few messages. A returning gate guard, a spacecraft contact and a microbe's previously encountered environment need the same source/state/identity separation. None requires simulating unseen populations or treating prose as an executable rule.

The implemented immediate adjudication and direct-receipt boundary in [game rules](../../game-rules.md) remains the gameplay spine. The [canonical storage feature](../2026-09-19--18-49--canonical-campaign-storage/PLAN.md) owns the prerequisite storage slices C1–C4. Documents own narrative content; a small transactional layer coordinates publication and exact execution. Integrate a short harbor/return scenario with the workspace in this POC. Rich trace UI, maps and a giant lifetime corpus are not prerequisites.

Keep phases independently reviewable. Storage C1/C2 supplies the document store and publication references. Phase 1 fixes prompt/provenance loading against those references, Phase 2 supplies linked narrative knowledge, and Phase 3 connects exploration to a playable turn. Semantic evaluation can proceed alongside Phase 3 once the committed corpus and filters exist. A file export alone is not the product exit.

## Vocabulary and dependency contract

Use [concepts](../../concepts.md) and [canonical files](../../technical/canonical-files.md). A Storyteller turn is the logical preparation of a playable situation, potentially using several model rounds. Source documents preserve passages; memory segments summarize bounded source ranges. No chapters, episode progression or mandatory scene closure.

This feature consumes storage C1/C2 and defines no second content store. C3 creative bundles can proceed independently after document capture. Phase 1 is ready after C2; Phases 2/3 connect memory to actual turns; Phase 4 expands the return fixture; Phase 5 delivers the semantic-search evaluation and selected local route. Ready dependencies, not another proposal approval, determine when to proceed.

[Bounded-cost B1/B2](../2026-09-19--19-08--bounded-storyteller-cost/PLAN.md) supplies captured recipes and shared enforcement before Phase 3 or independent paid maintenance/embedding work. Phase 1 uses B1 limits when available and must never weaken existing one-shot caps. B3 integrates those limits with this feature; it is not another exploration runner. Local deterministic indexing needs no model dispatch but remains bounded in query work and output size.

## Phase 1 — Separate provenance from prompt loading

Coordination: the implemented [active-scene continuity contract](../../technical/context-and-cost.md#active-scene-continuity-and-disposable-task-conversations) owns the multi-purpose audit and bounded active context. Current-prose deduplication is implemented there: the provider receives its body once while the handle remains valid. Phase 1 retains ownership of broader provenance/body separation, metadata-only sources and note-source loading after C2; do not reimplement current projection.

Outcome: note-source growth and duplicated current prose no longer create avoidable overflow; required material still fails closed when genuinely too large.
Dependencies: storage C2 document references and the implemented direct action receipt/follow-up boundary. No new agent runner.

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
Dependencies: Phase 1 and admitted stable identity references in canonical documents. Begin with the existing situation/identity evidence and bounded fixtures; do not require a new scene lifecycle or scene table. Add richer scene-frame references only with their owning feature.

Owners: the canonical document store for canonical identity/episode/thread bodies and links; application context/memory operations for admission and scoped retrieval; rebuildable indexes for discovery; Storyteller for bounded episode/patch schemas and policy; existing game state/receipts for exact mechanical data. Do not create competing editable content tables.

Scope:

- Replace the single always-loaded note list as lifetime memory with persistent episode/thread documents and a bounded selection. Leaving the working set is not retirement or deletion.
- Store every published passage and admitted receipt as recoverable evidence. Link known entities and scenes when their identity is admitted, not by continuously re-reading lifetime prose with an LLM.
- Build identity cards from existing state plus separately labelled narrative annotations. Current whereabouts, item holder and capabilities have one state owner. Keep aliases/disambiguation explicit.
- Publish the staged source/document manifest with required state atomically; propose short episode cards at bounded source-range or meaningful context boundaries in the DM output. Summary failures have explicit status and coverage gaps, not invisible loss or rollback of gameplay.
- Use current-scene/place/participant/action references to select cards, open threads and bounded previous episodes. Raw search remains available for unpromoted details.
- Build the versioned orientation packet from FEATURE.md: scoped registry slices, relevant source-backed leads, available tool contracts/search modes and remaining allowance. Required state is supplied directly; optional historical/thematic leads invite exploration without forcing a callback. Structural hint selection needs no extra model call.
- Bound pages, leads and selection work. Label exact/lower-bound/unknown counts and completeness at the captured revision; use cursors rather than expensive optional lifetime totals. Apply knowledge/visibility scope to counts and hints as well as bodies. An omitted record is not evidence of absence.
- Scope item reads to action-relevant/current holdings and requested identities; do not carry the existing all-story `.max(50)` prompt list forward as the lifetime item model. Preserve explicit POC limits for simultaneously relevant carried items/capabilities and hold or narrow scope if they are exceeded.
- Keep card/episode provenance versions and a monotonic index watermark; no historical state API faked by current rows.
- Capture a semantic test oracle of expected and forbidden handles rather than hard-code scenario names into retrieval policy.

Acceptance: return after 40 scenes, changed holder/bridge facts, duplicate names, closed versus still-open favor, single-scene segmentation, missing synopsis fallback, no forced human attributes. Test dense conversations as well as long histories; many entities can accumulate during a few turns in one scene. Registry pages report scoped completeness without leaking hidden entities. Query/candidate counts and prompt bytes stay bounded as irrelevant scenes increase.

Exit: a short return fixture resolves known identities and relevant document history without full transcript loading, enabling Phase 3's playable exploration. Phase 4 expands that same route to hundreds of scenes. The POC may use scripted episode proposals; do not label them demonstrated live-model memory.

## Phase 3 — Pre-narrative exploration with one shared round budget

Outcome: before choosing final narration/options, the DM can follow a supplied lead or search for relevant history beyond the orientation packet. Exploration supports both necessary fact checks and optional narrative connections; it is not merely repair after a failed proposal.
Dependencies: Phase 2 candidate query and visibility policies; bounded-cost B1/B2 operation envelope and durable accounting; envelope from FEATURE.md.

Owners: Storyteller task/result schema for `needs_context` and admitted document-change proposals; application for scoped state queries, document navigation and source/search views defined in [canonical files](../../technical/canonical-files.md); task/attempt storage for saved rounds; existing workflows for operation delivery; no separate execution engine.

Scope:

- Allow a first response containing only read requests, without provisional prose or effects. Independent reads batch within a round; authorized handles discovered by search can be inspected in a subsequent round. Search is not restricted to initially supplied handles.
- Persist each round and read result; share at most three total model rounds across exploration, final generation and repair, max six reads, max one invalid-final repair only if capacity remains. A search-plus-registry batch, follow-up source/record batch and final generation fit only if cumulative input/output/money also fit. Preserve final-answer capacity before optional discovery. The application selects the evidence-seeking recipe; ordinary grounded turns default to one round without model tools.
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

Exit: offline behavior and known limitations recorded honestly. A later live evaluation requires an explicit allowance and selected hypotheses; neither this plan nor successful offline checks grants that permission. Semantic retrieval is evaluated in Phase 5 against the same named questions and source corpus, not used to excuse incorrect exact state.

## Phase 5 — Local semantic and hybrid retrieval

Outcome: a selected local semantic/hybrid search route over canonical sources, evaluated alongside exact and lexical retrieval. Dependencies: Phase 2 corpus/filters; can proceed alongside Phase 3. Owners: the document index adapter, application search operations, recall QA fixtures and the existing usage/diagnostic boundary. Storage/source ownership stays independent of the index. Local model/license/resource review is implementation work in this phase; hosted embeddings require separate spending/data authorization.

1. Establish the exact/alias/relationship/lexical baseline with annotated questions and expected/forbidden results. Include paraphrased memories, low-drama callbacks, similar-but-unrelated events, stale quantities, duplicate names, multilingual wording where relevant, and details absent from summaries. Select acceptance thresholds before evaluating alternatives.
2. Compare exact/lexical and hybrid retrieval for paraphrased callbacks, relevant-source recall, irrelevant payload, latency/query work and estimated/authorized cost. A lexical-only win or a hybrid win is evidence about that case; neither is assumed. Record where semantic candidates help and where they confuse identity or chronology.
3. Specify chunk boundaries, immutable source hashes, embedding model/version, eligible data destination, incremental coverage, deletion/rebuild policy and story/knowledge/time filtering. Query embeddings are potentially paid calls too. Require explicit authorization before any external embedding or live-model evaluation.
4. Compare a disposable PostgreSQL/pgvector index and a dedicated service only to the extent necessary to choose a maintainable local POC route. Both must rebuild from canonical documents. Merge candidates with deduplication/rank fusion, not incomparable raw-score arithmetic. Preserve exact state lookup and primary-source inspection; similarity never settles identity or possession.
5. Implement the selected local route and its incremental indexing, version filtering and rebuild operation. Record the measured choice and remaining misses here. Disabled/stale semantic indexing must be visible, with lexical/raw-source fallback. A failed experiment must not silently expand prompt or spending limits.

Acceptance/QA: a paraphrased old detail can be found and traced to its exact source; a misleading similar document, secret title and superseded version are excluded appropriately. Index rebuild preserves source identity; stale coverage is visible. A synthetic vector fixture proves plumbing only. If no suitable local model fits the machine, retain an explicit capability blocker rather than enable a paid fallback or mark this phase complete.

Exit: selected local search route, measured comparison and limitations documented in the permanent contract; QA contains the same queries and evidence requirements. No promise of perfect recall or live narrative quality.

## Current checkpoint

- Status: Phase 1's canonical task capture is partially implemented. Every post-start task captures a root-fenced campaign catalogue plus pinned world/rule catalogues, compact orientations, exact selected sections and an omission/byte trace. Narrative choices can privately hand up to four validated world-section handles to the selected successor; known mechanics bind tagged rule sections deterministically. Phase 2's durable linked episode/identity memory is not implemented.
- Decisions: narrative documents and exact execution state have distinct owners; Storyteller turns, scenes, passages and memory segments are distinct; no chapters. Exact authored handles are preferred over prose keyword inference. Anticipatory choice hints add no model round, grant no authority, remain invisible to the player and are optional for sparse worlds.
- Completed slice: the proven choice handoff now covers existing campaign identity, relationship and narrative-thread documents. Admission resolves task-local `d#` aliases to stable story-scoped document IDs, the successor prioritizes their complete bodies under four-read/12-KiB bounds, whole-request pruning updates the omission trace, and Chamber exposes the trace. The connected conventional-start journey selects an otherwise unloaded ninth document and proves stable-identity loading beside exact world lore. This is deterministic recall plumbing, not semantic discovery or proof that every useful prose detail is promoted.
- Completed promotion slice: a narrative choice can reference up to four descriptive document changes from the same result by bounded index. Validation requires each index to exist; application admission resolves it to the exact deterministic create identity or revision target already published with source-passage provenance. The connected conventional journey creates one private narrative thread, selects its linked choice and proves the exact stored body and source revision are loaded beside older campaign/world evidence. No second rendering, entity graph or retrieval call was added.
- Completed promotion-integrity slice: the same generic publication path creates source-backed location lore and identity records when they acquire durable continuity value. Stable logical identity now includes document kind: a revision can update an eligible descriptive Markdown record but cannot recast lore as identity or overwrite structured character, inventory, settings, reference or source records. Promotion remains explicit Storyteller intent, not automatic noun extraction or mechanical entity creation.
- Completed supersession slice: the maintained conventional journey carries the promoted thread across an unrelated passage and lore document, then revises it from a different immutable source passage. A later linked branch resolves the same stable document identity against the current manifest, loads revision two and excludes the obsolete body. Historical version/source evidence remains intact; this is still explicit anticipatory carry, not general discovery.
- Completed lexical-baseline slice: bounded deterministic search scans eligible Markdown from the exact current campaign manifest under document/per-document/aggregate-byte limits. It requires all normalized terms, ranks title/path/body phrase and term matches deterministically, and returns stable identity/revision, a compact matching snippet, match fields and explicit coverage/limit evidence. The maintained return finds the corrected thread revision, excludes an exact developer-private decoy, does not resurrect the superseded canonical body for its old wording, and feeds the winning stable ID through the existing exact loader. The query remains explicit test/tool input; ordinary player prose does not silently trigger retrieval, and no extra model round or semantic backend was introduced.
- Research application: [Long-story memory, navigation and synthesis](../../engineering/long-story-memory-and-retrieval.md) now defines the multi-route corpus, retrieval, condensation, tiering and evaluation strategy. The selected order is structured cues/oracle → indexed lexical → bounded exploration → episode/source navigation → measured local hybrid → relation/global experiments. This supersedes any assumption that vector search, a giant prompt or a graph alone solves long-story memory.
- Completed oracle slice: a validated developer artifact defines conventional and abstract cases with information need, query mode, structured identity/place/thread paths, expected/acceptable/forbidden evidence, currentness/visibility/branch/time scope, abstention policy and fixed candidate/read/byte/round budgets. The connected start-package journey consumes both cases: Greywake resolves the corrected route, while the abstract organism returns no invented human-economy evidence.
- Implemented next slice: admitted current identity/place/thread cues resolve against the captured manifest into bounded current-version candidates. Duplicate reasons merge, unavailable or over-limit cues remain explicit, and the exact loader records the cue trace with its ordinary read/byte omissions. The maintained oracle maps fixture paths to runtime stable IDs only at the test boundary; production consumes IDs and never parses arbitrary player prose.
- Implemented active-scene cue slice: an admitted descriptive change can explicitly classify its stable record as the identity, place or thread needed by a restarted active situation. Publication resolves create/revise identities, stores the bounded cues on the durable private scene anchor, and ordinary continuation construction feeds them through the current-manifest resolver and existing context caps. Continuing a scene preserves its cues; restarting replaces them. Kind/role mismatches and cues without a restart reject. No path heuristic, noun extraction or additional model round exists.
- Implemented existing-record cue slice: a restart can attach compatible existing campaign records by bounded captured `d#` handle and explicit identity/place/thread role. Validation rejects unknown or role-incompatible handles and more than eight combined changed/existing cues; publication resolves aliases to stable IDs and stores no task-local handle. The maintained return now loads the unchanged quay and revised thread without rewriting the quay or repeating a choice dependency.
- Implemented typed-item slice: narrative continuations admit ordered `item.create.v1` and `item.transfer.v1` operations at the common locked commit seam. The application validates the entire projected registry before writing, enforces unique stable keys and the 50-item bound, supports create-then-transfer in one passage, and relies on transition identity for safe retry. Descriptive documents cannot mutate possession. PostgreSQL remains the explicitly documented live authority during this intermediate step.
- Exact next action after this slice: refactor continuation preparation so every item-changing path stages the successor `state/story-items.json` outside database locks and atomically commits that immutable object, passage, typed effects and manifest-root advance under the existing revision fence. The design must cover direct, scripted, timed-decision, interval-arrival and Storyteller-publication callers without object-store I/O inside their transactions.
- QA maintenance: reusable-start-package v11 proves the corrected thread and unchanged quay return through a restarted active-scene stable cue, then applies the shared conventional/abstract oracle and lexical discovery checks. The permanent story-item authority checklist now covers create-and-transfer, exact retry, duplicate/stale rejection, rollback and the temporary bootstrap-file limitation.
- Verification: the typed-item slice passed 12 affected builds and its focused disposable-database case, including ordered create-then-transfer, exact retry, conflicting duplicate creation and full rollback. Earlier evidence also includes the four-case start-package integration with both oracle contrasts, changed/existing active-scene stable-ID recall, create, unrelated play, revision, lexical discovery and exact current-version loading, plus focused publication integrity checks. The integration harness permits a bounded 30-second production-web readiness window after its former 10-second limit caused a false startup failure on the supported slow laptop. No provider call was made.
- Remaining choices: episode/card shapes and promotion boundary, numerical tuning, indexed lexical adapter, and Phase 5 local semantic model/backend. Graph/community and hierarchical summaries require benchmark evidence rather than default adoption. Recent passages plus continuity notes remain the only general lifetime narrative memory.
- Spend: $0 application-provider spend; cumulative account usage unverified.
