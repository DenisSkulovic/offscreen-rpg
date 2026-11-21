# Accelerated MA05H / MA06 | capture cohort and package-extraction decision

**State:** architectural design recommendation for owner review; **NOT an implementation Change or Cursor commission**. Scoped planning branch: `planning/ma05h-capture-boundary`, based on `undertaking/storyteller-workshop` after MA05G was released. Independent source baseline: source files read from the uploaded repository ZIP at `2bcebcdd79ef898ace2ead59cdb56a8013f7a511`; post-MA05F live repository was checked for `storyteller/admission`, `stories/resolution`, `storyteller/context`, `storyteller/records` and `story03-notice-topic-freeze`. **Capture files have not been re-fetched at live HEAD yet and must be verified before any implementation packet.** MA05G is running; no application-code or shared catalog edits authorized here.

## Decision: omit a ceremonial standalone MA05H extraction

The next improvement should be a **cohort-level MA06 package boundary**, **not six more one-function MA05 Changes**, followed by immediate gameplay-contract work. The `storyteller/context-capture.ts` file is large (approximately 2,800 lines), but six capture entrypoints share the same immutable capture shapes, generation/publication/capture rows, SQL story lock scope, canonical evidence and outbox semantics. Moving each writer into `stories/` first, only to move it into a new package later, creates disposable code motion and redundant test/receipt cost.

The proposal is to keep an intact transactional capture cohort for a **single direct package-level extraction** after MA05G. This is *not* permission to move an import-heavy 2,800-line file verbatim into a package with an illegal reverse dependency. It means we plan and execute the source→destination graph once, when the physical package boundary is ready, without provisional per-function wrappers.

## Observed source call graph (ZIP baseline, must verify live before commission)

```text
campaign/narration.ts:
  preparePendingActionNarration(tx,current,input)
      → storyteller/context-capture.ts:capturePendingActionNarration
      → update gameActionExecution.preparationGenerationId in same tx
  requestConsequenceNarration / requestActionNarration
      → captureCommittedActionNarration
      → captureInterruptedActionNarration
      → captureActivityConsequenceNarration
      → captureWorldObligationConsequenceNarration
campaign/reports.ts:
  requestActivityReport/requestWorldObligationReport
      → requestHistoricalReport(tx,...)
      → storyteller/context-capture.ts:captureHistoricalReport
      → INSERT campaignReport in same tx

storyteller/context-capture.ts:
  capture* six entrypoints (lines ~1463,1597,1760,2015,2323,2666)
    → freeze campaign/story/passages/rolls/settings/notes source, validate schemas
    → generation + storytellerPublication + storytellerContextCapture
    → storyResolution and execution-stage receipt
    → transfer holds when relevant, enqueue campaignConsequenceTopic
storyteller/capture-materialization.ts:
  materializePendingActionCapture (line ~1504)
  → claimCaptureLease → assemble*TaskFromCapture (off-lock CAS/canonical sources)
  → promoteCapture / enqueueStorytellerIfReadyPromoted
  → provider-facing Storyteller tasks; failures remain durable
```

**Key observation:** `context-capture.ts` imports `../campaign/{holds,topics,accepted-plans,report-source,action-overlap,persistence}` and `../stories/persistence` plus `./context`, `./canonical-knowledge`, `./activity-context`, `./execution-stages`. The first group is authoritative; the latter includes pure schema/evidence helpers and local execution bookkeeping, but the actual import graph must be mapped. `capture-materialization.ts` has separately named lease/promotion helpers and task assembly. The *physical filename*, not just the API labels, currently conceals the SQL vs off-lock ownership split.

## Target graph and module ownership, selected direction for next planning audit

```text
apps/{api,game-authority,worker} (composition roots)
   ├── @offscreen/story-authority
   │     stories, campaign, SQL resolution/replay,
   │     capture snapshots and durable admission/holds/outbox
   │        └── contracts, game, db, documents abstraction, pure task schemas
   ├── @offscreen/storyteller-runtime
   │     context materialization/lease orchestration, provider execution,
   │     prompt preparation and publication proposals
   │        ├── story-authority ports/operations (no inverse import)
   │        └── @offscreen/storyteller (existing PURE task/context/provider library)
   └── application (thin composition and SHORT-LIVED legacy exports)
```

This is a **direction**, not a ratified package/API map. Current `@offscreen/storyteller` workspace is already a separate prompt/provider/task library; the SQL/runtime implementation is still mostly `@offscreen/application/src/storyteller`. Do not rename the pure package or assume its provider SDK may depend on DB. `@offscreen/application` currently exports `./stories`, `./stories/resolution`, `./stories/persistence`, `./storyteller`, `./storyteller/saved-generation-publish` and `./generations`, which must have exact consumer inventories before moving.

## Execution shape: two sizeable direct cohorts, not micro-packets

**MA06A | Story Authority package, single coherent integration Change.** After MA05G, move directly into new `@offscreen/story-authority` workspace: stories + campaign + neutral SQL capture writer cohort + contextual SQL helper(s) + generic generation persistence owner **only where source-level import map proves zero runtime dependency**. Include single cross-domain schema/access layer as needed. Keep one transitional `application` compatibility façade. One pass over TypeScript project refs, package exports, pnpm lock/Turbo build DAG, real host consumers and tests. Required proof: actor/owner denial, story resolution replay, execution holds and SQL capture atomicity, one unit of frozen source matching and outbox idempotence, no provider spending. **No per-function intermediate MA05H.** Do not make the authority package depend on the runtime package.

**MA06B | Storyteller runtime package, single coherent integration Change.** Move runtime orchestration/capture materialization/provider execution/append-only proposal preparation as one domain package, consuming the canonical authority operations/ports and pure `@offscreen/storyteller` task/provider abstractions. Carefully identify any reverse imports `storyteller/publication.ts` currently makes to `stories/{continuation,persistence,scene-checkpoint,errors}` and to campaign holds/delegated offers. Ratify whether runtime invokes authority commit APIs or is a pure proposal worker before writing. Preserve one public application façade temporarily. Required proof: generation/task lease, replay, failure classification, spend gate, source pin, publication idempotence, concurrency/uncertainty behavior. Avoid provider transport and database transaction sharing by accidental import hacks.

**MA06C | Thin composition + enforcement, only after A/B.** Update API/worker/game-authority imports to new subpaths and workspace manifests; add lint/graph restrictions on authority→runtime, pure game→SQL, contracts→application and host→internal implementation paths; retire extra compatibility exports when real consumers are gone. Measure actual source/manifest graph rather than merely count file moves. Keep workload proportionate.

**No MA06A/B/C packet may be marked Cursor-ready from this document alone.** They require source-backed ownership/export/caller maps, identified dependency cycles, explicit port contracts and bounded Composer tasks. This design reduces *total migration passes*, not the standard of safety evidence for the one real package move.

## Why the alternative loses

A preceding `MA05H-A...` set relocating six capture methods into `stories` would almost certainly add temporary imports, aliases and tests which MA06 later destroys. Conversely, a blind full-module move into Authority carries residual imports into `storyteller/context`, `canonical-knowledge` and `execution-stages`, risking an immediate package cycle. **Our shortcut is to eliminate the provisional move, not bypass the dependency-map design.**

## Exact next planner investigation (ChatGPT, not Composer)

1. Refresh all named capture and materialization files at live undertaking HEAD after G; determine every cross-directory *runtime* and type-only edge, not just exported functions. Map `context-capture.ts` exports/schema consumers and `campaign/narration.ts`/ `campaign/reports.ts` transactional callers.
2. Enumerate `application` package export consumers across apps/tools/tests and check existing `@offscreen/storyteller` manifest. Decide the new authority/runtime workspace DAG and whether `generations` pure SQL persistence can be moved in MA06A or must remain at composition.
3. Freeze package ports, exact import rewrites, dynamic runtime loading needs, TypeScript/NodeNext aliases and external file tests. Produce the MA06A/B bounded Changes and independent G0–G7 adversarial audits.
4. Once these are ready, authorize **MA06A** after MA05G closes; MA06B follows its stable exports. Avoid expanding current code solely to placate intermediate directory boundaries.

**Safety limits unchanged:** owner-scoped story and campaign reads, original SQL transaction and lock order, committed capture SHA/pointer equality, outbox fence/idempotence, publication state and effective provider budget. Scope future gameplay changes separately; no premise/world/scene contract redesign during package migration.

**Retirement:** This is a temporary alternative analysis under the existing code-architecture-health Design lifecycle. On decision, promote the selected topology to `docs/technical/platform/`, link executable MA06 packet, then retire this temporary note.