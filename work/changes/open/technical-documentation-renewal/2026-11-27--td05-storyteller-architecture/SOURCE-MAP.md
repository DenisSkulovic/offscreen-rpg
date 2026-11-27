# TD05 | source and claim map

Inspected main `a28693dcefe80a3242a870ed03a6c144b47f1ac7` via frozen original snapshot and documentation-only committed deltas. Source existence and historical proof, not new runtime certification. See exact sections below; all executable source unchanged.

## T01 | Canonical Library and memory owners

Owned current headings / route:

- `docs/technical/storyteller/canonical-documents-and-packages.md`: Canonical documents and packages; Library, shelf, and workdesk vocabulary | target (LIB01); Product commitment; One owner per kind of truth; Scene-rooted canon and fork-safe publication | selected target (2026-11-19); Reusable world libraries and campaign overlays; Reusable rule libraries; A concrete workspace; Campaign bootstrap; Document envelope; The visitor at the beacon; Consequences and loose ends; The Storyteller as a versioned bundle; Descriptive changes and the revision fence; Extract, summarize and revise deliberately; Publication across files and the execution ledger; Recovery, inspection and portability; Research informing storage.

- `docs/technical/storyteller/context-and-memory.md`: Canonical campaign files and the Storyteller workspace; Who owns which promise; Product commitment; One owner per kind of truth; Reusable world libraries and campaign overlays; Reusable rule libraries; A concrete workspace; The Storyteller as a versioned bundle; Agent working cycle; Mechanical continuity dependencies — S3 design; Extract, summarize and revise deliberately; Search belongs in the POC; Publication across files and the execution ledger; Recovery, inspection and portability; Concrete acceptance flows; Research informing the contract.

Controlling/current evidence anchors: `packages/documents/src/library-trie.ts#createLibraryTrieEdit`; `packages/story-engine/src/storyteller/context.ts#loadStorytellerContext`; `docs/technical/platform/data-and-persistence.md#story-snapshot-and-chronology`. Selected transformation and negative are fixed in TASKS T01.

## T02 | Context selection and recall

Owned current headings / route:

- `docs/technical/storyteller/context-selection-and-recall.md`: Context selection and recall; What source enters this task; Task pack | selected target (2026-11-19); Fork-scoped retrieval and task input | selected target (2026-11-19); Semantic locality and context cost; Active-scene recall cues; Required controlling state; Agent working cycle; Storyteller-facing memory tools; Lexical baseline and structured recall; Retrieval result contract; Conceptual future retrieval; Search belongs in the POC; Mechanical continuity dependencies — S3 design; Concrete acceptance flows; Research informing retrieval.

Controlling/current evidence anchors: `packages/story-engine/src/storyteller/context.ts#captureStorytellerResolutionContextSql`; `packages/story-engine/src/storyteller/memory-exploration-controller.ts`; `packages/story-engine/src/storyteller/branch-pinned-memory.ts`. Selected transformation and negative are fixed in TASKS T02.

## T03 | Operation, controller and source map

Owned current headings / route:

- `docs/technical/storyteller/operation-and-controller.md`: Storyteller operation and controller; Step status; Two loops; Current prototype runtime; Profile and task contracts; Context and continuity; Execution and publication; Provider and budget boundary; Tools, rules and the remaining DM task; Supported behavior and evidence limits; Mechanical POC boundary.

- `packages/storyteller/README.md`: Storyteller contracts and adapters; Follow one request; Implemented tasks and limits; Schema and transport; Context and memory; Content and creative ownership; Working safely and economically.

Controlling/current evidence anchors: `packages/story-engine/src/storyteller/writer-loop.ts#runWriterMissionModelRound`; `packages/story-engine/src/storyteller/writer-research.ts#runWriterResearchModelRound`; `packages/story-engine/src/storyteller/context.ts#loadStorytellerContext`; `packages/story-engine/src/storyteller/recovery.ts`. Selected transformation and negative are fixed in TASKS T03.

## T04 | Generation and publication

Owned current headings / route:

- `docs/technical/storyteller/generation-and-publication.md`: Generation and publication; Selected durable Writer replay stage (WR09B; prerequisite WR09A); What publication is allowed to do; What publication must refuse; Scene publication fence; Remote task custody; Generation identity; Contract dependencies; Landed provider-authorized continuation (WR11).

Controlling/current evidence anchors: `packages/story-engine/src/storyteller/publication.ts#publishStorytellerResult`; `packages/story-engine/src/stories/continuation.ts#commitStagedStoryPublication`; `packages/story-engine/src/storyteller/writer-round-replay.ts#runDurableWriterMissionModelRound`. Selected transformation and negative are fixed in TASKS T04.

## T05 | Prompts, tools, provider and spending

Owned current headings / route:

- `docs/technical/storyteller/prompts-and-tools.md`: Storyteller prompts and tools; Orthogonal authorities; Task roles; Stopping; What the prompt must not grant; Selected compilation and tool contract.

- `docs/technical/storyteller/provider-boundary.md`: Provider dispatch review and dry-run analysis; Attempt custody and an unknown call; Product contract; Exact packet boundary; Durable breakpoint lifecycle; Analysis and comparison; Prompt responsibility; Evidence retained after a real run; Safety boundaries.

- `docs/technical/storyteller/request-context-and-cost.md`: Context, caching, prompts and spending; What this page owns; Current development allowance; Build context for a specific decision; Bounded work, not an open-ended agent; Summaries without losing the story; Long-running quiet play; Recall over many days; Three different caches; Budget accounting; A concrete cost envelope; Prompts and experiments; Approved local POC boundaries; Selected private Writer round execution split (WR10, planned 2026-11-22).

Controlling/current evidence anchors: `packages/storyteller/src/tasks/index.ts#prepareStorytellerTask`; `packages/storyteller/src/tasks/result-validation.ts#validateStorytellerResult`; `packages/story-engine/src/storyteller/writer-round-replay.ts#runDurableWriterMissionModelRound`; `docs/technical/platform/spending-and-entitlements.md`. Selected transformation and negative are fixed in TASKS T05.

## T06 | Versioned settings and product transfer

Owned current headings / route:

- `docs/technical/storyteller/versioned-settings.md`: Versioned story settings and clock policy; Captured revision and a later edit; Data and commands; Canon invention policy; Clock and speed; Current adapters.

Controlling/current evidence anchors: `apps/api/src/modules/stories/controllers/story-commands.ts`; `apps/api/src/modules/stories/controllers/story-reads.ts`; `docs/product/storyteller/profiles-and-settings.md#current-implementation-boundary`. Selected transformation and negative are fixed in TASKS T06.


## Verified observations and limits

Actual Story Engine context.ts exports captureStorytellerResolutionContextSql/loadStorytellerContext; publication.ts exports publishStorytellerResult, stages documents against captured narrative revision before admission; recovery.ts reexports retryStoryteller. Writer loop and durable replay entrypoints exist, as does writer research round; earlier WR03 absence claims cannot describe current entire code. prepareStorytellerTask and validateStorytellerResult exist in pure Storyteller package. API settings GET/PUT controllers exist but editor limits remain historical product record. packages/application and packages/ai/agent-core absent at source baseline; no maintained E1 consumer migration or qualification. Preserve uncertainty and exact proof scope.

Keep affected typed dependencies and headings stable. Shared architecture/STATUS routes assigned to integration; any further consequential source contradiction is planner-owned, not an executor design decision.
