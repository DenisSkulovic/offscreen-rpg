# DATA06 | Deliver branch- and checkpoint-pinned Storyteller context with bounded exact tools

**Composer microtask entry (2026-11-20):** [TASKS.md](TASKS.md) is the selected microtask route *once the Change is authorized*; [all-open audit](../../../../COMPOSER-QUEUE-AUDIT-2026-11-20.md) records actual source tier and dependency. **Default parent/child model: Composer 2.5 Standard.** Delegation: prove branch exact-root isolation then remote evidence route after STORY03. Don't interpret a task marked PLANNER-READY as permission to execute a Proposed Change, promote status or skip negative tests; novel architecture goes back to ChatGPT before a Grok exception.

**State:** Done · 2026-11-20. Local executor HTTP evidence read. Cold-kind continuation stays TURN03.  
**Kind:** implementation  
**Execution:** Not part of currently active Kubernetes batch. Select individually or through explicitly approved safe batch.  
**Related:** [DISTURN program](../../../../../designs/open/distributed-turn-poc/README.md) · [D2 data design](../../../../../designs/open/distributed-turn-poc/D2-SCENE-DATA-CONTRACT.md) · [Gap register](../../../../../designs/open/distributed-turn-poc/GAPS.md)

**Packet profile:** `STATE`. [SOURCE-MAP.md](SOURCE-MAP.md) traces the already-implemented historical checkpoint fork, root validation and source-capture primitives at `584b594`. The gap is **branch-pinned remote context and independent continuation**, not another fork schema. No cross-Pod proof is claimed.\n\n## Independently verifiable outcome

A remote Storyteller task receives exact mechanical state, current effective canon and relevant evidence from its own branch without fetching latest global revisions or requiring Cognee.

## Preconditions / source baseline

**Dependencies:** ARCH03 and ARCH05 detailed contracts, DATA03 checkpoint, DATA04 branch ancestry or a verified compatible test scope; STORY03 separated execution worker (DIST05 was cancelled/absorbed; not a separate dependency).

Inspected GitHub main 2026-11-19. `story` has the latest root, `storyPassage` preserves passage source, `storyDocumentCommit` tracks root revisions. `campaign` and other mechanics are mutable. `forks.ts:createStoryForks.fork` already supports requested historical checkpoint selectors for a quiescent supported scene; the older live no-checkpoint fallback remains restricted to revision 1. Do not reimplement the historical path or imply arbitrary active-scene fork is supported. `packages/documents` already has typed immutable content and both local/S3 adapters. Recheck HEAD, migrations, source symbol owners and running Cursor branches before implementation. This packet is not proof of actual complete snapshot storage.

## Exact bounded delta

In packages/application/src/storyteller/{context-capture,execution} and packages/storyteller/src/tasks/{memory-exploration,document-changes}, add deterministic context-pack composer for captured (storyId,passageId,checkpointHash,canonRootHash,actor visibility) and a bounded memory facade on existing ask_memory/read_memory, no arbitrary model-visible filesystem. Resolve current identity/relationship/thread versions through pinned documentManifest entries, rank orientation and exact source handles, validate all returned evidence against branch root and actor knowledge, cap tokens/bytes/rounds and preserve unknown/partial markers. Wire to separate Storyteller worker through least-privilege read capability. Compare with existing one-shot behavior and do not add graph/vector/Cognee prerequisite.

**Files / canonical documentation owners:** packages/storyteller/src/tasks/{memory-exploration,document-changes}*, packages/application/src/storyteller/{context-capture,execution}*, packages/documents/src/schema.ts only if compatible versioned fields required; ARCH03/ARCH05 technical owners, tests.

**Scope exclusions:** No new fictional economy, universally mandatory inventory, image generation, Stripe/subscriptions, global Cognee service, production HA, unbounded source rewrite, provider spend, database reset or unsupported rule mechanics. Do not mark a placeholder field dump complete until DATA01's mutable-table inventory proves completeness.

## Normal and negative acceptance

**Required proof:** King alive at scene1/dead at parent scene2/fork from scene1: context and ask_memory return only branch-valid identity + source; source passage read via stable handle; missing/stale index falls back to exact manifest or explicit partial, never wrong; microbe no inventory; measured token and tool-call baseline.

**Discriminating negative:** Never leak future parent/sibling fact or private possibility; no silently changing SQL items from canonical prose; no extra paid research rounds unless budget/role recipe permits.

Provide exact source refs and commit SHAs, schema/API examples, commands, test counts, actual provider-free or cluster evidence, and any not-run test. Run source-relevant checks and `pnpm wiki:change-guard --mode plan` / `--mode close` as supported; update actual STATUS only when runtime evidence exists.

**T01 VERIFY receipt (2026-11-20) at `ec73a535`:** `packages/application/test/historical-fork.test.mjs` **2/2**; `packages/application/test/lexical-story-index-cache.test.mjs` **1/1**; **3/3 PASS** provider-free. Positive: child branch keeps scene-1 ancestor state (sword, living king) while parent scene-2 diverges on the parent story. Negative: wrong owner, bad checkpoint, and later live tables refuse; lexical cache isolates fork/stale roots. **NOT-RUN:** dedicated assertion that `loadCanonicalKnowledge` rejects parent `rootHash` with child `storyId` (guard exists in source, not in these tests); T02 branch-scoped resolver (gated STORY02/03); T03/TURN03 cluster continuation. `pnpm wiki:change-guard --mode plan --change` this packet → **ok, no findings**. This receipt does not promote the packet to Done.

## Parallel execution contract

Read-only role/context planning can overlap DATA01–05. Executable tests await fork/scene pins; writing storyteller execution files must be coordinated with DIST05.

The Cursor orchestrator may use isolated branches/worktrees for disjoint Ready packets, not execute unselected Proposed packets. No concurrent DB migration numbering, canon-owner heading edits, publication SQL edits or shared kind resources. Integrate, verify, reconcile and archive each Change independently.

## Four-plane planned impact

| Plane | Owner and intended effect | Evidence |
| --- | --- | --- |
| Product | **Unchanged**: text-first, D&D-like DM and fully reviewable/forkable scene promise, optional applicable possessions | No invented inventory/economy rules |
| Technical | Reconcile [data persistence](../../../../../../docs/technical/platform/data-and-persistence.md), [fork lifecycle](../../../../../../docs/technical/engine/lifecycle-and-compatibility.md), [canonical files](../../../../../../docs/technical/storyteller/canonical-documents-and-packages.md), [context selection](../../../../../../docs/technical/storyteller/context-selection-and-recall.md) only where affected | Exact heading claims: current vs selected target vs demonstrated |
| Code | Scoped implementation in file owners above, with migrations only after compatibility review | Diff and regression tests |
| Related | Runbook/source maps/Change queue/dated evidence; no premature Done | Link guards, actual source checks |

## Reconciliation ledger (fill before Done)

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/product vision text-first forkable scene | product | unchanged: no new inventory, economy, or possession rule was added | packages/application/src/storyteller/branch-pinned-memory.ts at e9065aef | source-observed | private-possibility returns unknown-handle and no prose | N/A |
| docs/technical/storyteller/context-selection-and-recall.md#fork-scoped-retrieval-and-task-input--selected-target-2026-11-19 | technical | changed: the executor evidence route is now a local proved read, and ask_memory plus cold-kind continuation stay unproved | apps/game-authority/src/branch-evidence.ts and apps/worker/src/custody/storyteller-task-custody-client.ts on change/data06-branch-memory after e9065aef | fixture-tested | parent root, story mismatch, private handle, nine handles, story bearer, and body ownerId refuse | heading now names the evidence route |
| docs/technical/platform/data-and-persistence.md#proposed-service-schemas-and-delivery-records | technical | changed: one sentence now says the executor can request pinned evidence from Game Authority; any-scene fork stays future | docs/technical/platform/data-and-persistence.md on change/data06-branch-memory after e9065aef | source-observed | stale campaign id returns root-mismatch | the heading still says a fork must not inherit later parent writes |
| docs/technical/engine/lifecycle-and-compatibility.md#forked-continuities | technical | unchanged: this Change does not alter fork creation or checkpoint reconstruction | packages/application/src/stories/forks.ts untouched on change/data06-branch-memory | source-observed | no fork route was added | N/A |
| docs/technical/storyteller/canonical-documents-and-packages.md | technical | unchanged: manifest campaignId remains the fork story id and this Change does not rewrite package import | packages/application/src/storyteller/canonical-knowledge.ts loadCanonicalKnowledge at e9065aef | fixture-tested | canonical-knowledge-root-pin refuses a parent campaign id and a wrong revision | N/A |
| apps/game-authority/src/branch-evidence.ts | code | changed: executor evidence read derives the owner from fetchCommittedGeneration | apps/game-authority/src/branch-evidence.ts on change/data06-branch-memory after e9065aef | fixture-tested | apps/worker/test/storyteller-generation-evidence.test.ts 9 pass | STATUS.md names the route |
| apps/worker/src/custody/storyteller-task-custody-client.ts | code | changed: readEvidence posts the frozen branch identifiers and does not send ownerId | apps/worker/src/custody/storyteller-task-custody-client.ts on change/data06-branch-memory after e9065aef | fixture-tested | a body ownerId is HTTP 400 and nine handles never call fetch | N/A |

**Closure:** Done for the local executor evidence capability. TURN03 still owns cold-kind child continuation. No provider call.

exception: pnpm-lock.yaml because the worker test depends on the Game Authority package and the lockfile must record that workspace edge.
exception: apps/worker/package.json because the evidence HTTP test imports the Game Authority server from that workspace package.
exception: apps/worker/test/storyteller-generation-evidence.test.ts because this file is the executor-client HTTP proof named in the ledger status.
exception: apps/worker/test/storyteller-distributed-execution.test.ts because the custody test double must include the new readEvidence method.
exception: apps/game-authority/src/server.ts because it dispatches the evidence route into branch-evidence.ts.
exception: apps/game-authority/src/bootstrap/main.ts because the running server must receive the same document store the evidence handler reads.
exception: packages/contracts/src/storyteller-task-custody.ts because the evidence request and response schemas live in the existing custody contract.
exception: packages/contracts/test/storyteller-task-custody.test.ts because the strict ownerId rejection and the POST route are contract tests.
exception: packages/application/src/storyteller/index.ts because the resolver must be exported to Game Authority.
exception: packages/application/test/branch-pinned-memory.test.mjs because these are the resolver negatives named above.
exception: packages/application/test/canonical-knowledge-root-pin.test.mjs because the parent-root refusal is the canonical-knowledge negative named above.
exception: STATUS.md because demonstrated scope has to record the local HTTP proof and the cold-kind limit.
exception: work/IMPLEMENTATION-ROADMAP.md because the short-term order has to stop listing DATA06 as unfinished.
exception: work/changes/README.md because the catalog row has to follow this packet out of open/.
exception: docs/technical/storyteller/context-selection-and-recall.md because the fork-scoped retrieval heading is the technical owner updated above.
exception: docs/technical/platform/data-and-persistence.md because the chronology heading now names the evidence read.
exception: docs/architecture/05-scenes-and-forks.md because the diagram link has to follow this packet out of open/.
exception: work/changes/ledger/2026-11.md because the archive index has to list this Done packet.
exception: work/changes/COMPOSER-QUEUE-AUDIT-2026-11-20.md because the audit row has to stop offering DATA06 as open work.
exception: work/changes/open/2026-11-19--dist03-game-authority-private-boundary/CHANGE.md because the successor link has to follow this packet out of open/.
exception: work/changes/open/2026-11-19--dist03-game-authority-private-boundary/TASKS.md because the successor link has to follow this packet out of open/.
exception: work/designs/open/distributed-turn-poc/CURSOR-HANDOFF-2026-11-19.md because the program link has to follow this packet out of open/.
exception: work/designs/open/distributed-turn-poc/D4-STORYTELLER-HANDOFF.md because the program link has to follow this packet out of open/.
exception: work/designs/open/distributed-turn-poc/GAPS.md because the program link has to follow this packet out of open/.
exception: work/designs/open/distributed-turn-poc/POC-READINESS-AUDIT-2026-11-19.md because the audit link has to follow this packet out of open/.
