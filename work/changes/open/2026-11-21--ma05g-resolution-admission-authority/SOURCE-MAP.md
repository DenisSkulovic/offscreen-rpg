# MA05G | source, consumers, state, ownership (planner inspected)

**Baseline:** local ZIP of commit `2bcebcdd79ef898ace2ead59cdb56a8013f7a511`, remote undertaking confirmed identical in source at `e64901c2` (only MA05F planning docs changed). The MA05F implementation is *concurrent and uninspected*, so no claim about its unmerged worktree. Do not patch this packet on its branch.

## Call graph and existing seams

```text
API / Game Authority / worker → stories/index.ts:createStories
  → stories/resolution.ts:createStoryResolution(db, documentStore?)
      admit(args) → parseStoryIdentifier + submission/revision validation
      → owner-scoped story SELECT, branch by story.storyteller
      ├─ scripted:
      │   replayScriptedResolutionIfMatching(db,...)
      │   prepareScriptedResolution(db,...) [snapshot → off-lock documents]
      │   commitScriptedResolution(db,prepared) [own transaction]
      └─ Storyteller:
          storyteller/admission.ts:replayStorytellerResolutionIfMatching(db,...)
          storyteller/admission.ts:prepareStorytellerResolution(db,...)
              read-only SQL transaction, context.ts:captureStorytellerResolutionContextSql
              off-lock readPassageDocument + canonical knowledge + context assembly
              storyteller/task-admission.ts:prepareAdmittedStorytellerTask
          database.db.transaction(tx =>
              storyteller/admission.ts:commitStorytellerResolution(tx,prepared))
              lockOwnedStory, assertStorytellerResolutionFence
              insertStorytellerTask(tx,...), storyResolution insert, incrementStoryViewVersion
```

**Separate direct consumer** (not reachable by inspecting only `stories/index.ts`): `packages/application/test/eng03-resolution-lock-measurement.live.test.mjs` directly calls `createStoryResolution(database, delayedDocumentStore)` (at ~275, ~470, ~507) to show document reads do not hold the owner story SQL lock. Preserve the same factory API so this proof stays meaningful. `@offscreen/application/stories/resolution` is a declared subpath export in the package manifest.

## SQL identity and state table

| Operation | Reads/fence | Writes | DB transaction |
| --- | --- | --- | --- |
| Replay | storyResolution by `(storyId, operationId)`; exact base revision/submission | outbox wake same `operationId`, frozen topic from `campaign/storyteller-wake.ts` | Own brief transaction for enqueue |
| Read-only prepare | story + current passage + prior storyResolution, generation, campaign/campaignSettings, gameActivity, storyItem, canonical document source | no authoritative story/campaign state; off-lock read from `DocumentStore` | Brief read-only (in effect) transaction for SQL snapshot; CAS *after* tx |
| Commit | owner story `FOR UPDATE`, storyResolution operation/base, current passage, source generation, campaign/settings/commitments/items, root/premise/notes/scope/viewVersion/interaction | generation, storytellerPublication, outbox, storyResolution, story viewVersion/PG notify | **One caller-supplied tx**; complete rollback on conflict |

Key schema owners: `@offscreen/db/story-schema` (`story`, `storyPassage`, `storyItem`, `storyResolution`); `@offscreen/db/generation-schema` (`generation`); `@offscreen/db/storyteller-schema` (`storytellerPublication`); `@offscreen/db/campaign-schema` (`campaign`, `campaignSettings`, `gameActivity`); `@offscreen/db/outbox` (`Transaction`, `enqueue`). No data migration or new state.

## Old → new, precise dependency map

| Current owner/symbol | New canonical owner | Aliases / direct consumers |
| --- | --- | --- |
| `storyteller/admission.ts:replayStorytellerResolutionIfMatching` | `stories/storyteller-resolution-authority.ts` | re-export from old admission; Story Resolution core imports canonical |
| `storyteller/admission.ts:commitStorytellerResolution` and `assertStorytellerResolutionFence` | same authority file | old named commit export identical; assertion private |
| `storyteller/admission.ts:prepareStorytellerResolution` | **stays** runtime admission | façade composes into Story Resolution core, not imported by core |
| `storyteller/admission.ts:StorytellerResolutionFence`, `PreparedStorytellerResolution` | `stories/storyteller-resolution-contract.ts` | old type exports preserved via direct type re-export |
| `storyteller/context.ts:ResolutionPassageSource,StorytellerResolutionContextSqlCapture` | same contract module (types only) | context reexports types and uses imports from new contract |
| `storyteller/context.ts:activeSceneAnchorSchema` | `stories/active-scene-anchor.ts` | context direct reexport; existing context/capture consumers unchanged |
| `storyteller/records.ts:insertStorytellerTask` and `selectStorytellerNoticeTopicAtAdmission` | `stories/storyteller-task-record.ts` | records direct reexport; runtime `storyteller/records.ts` still owns `setPublication`, generation factory etc |
| `storyteller/activity-context.ts` filter/constants/guard | `campaign/storyteller-activity-filter.ts` | old module direct reexport; `storyteller/{context,context-capture}` continue using old alias, new Authority imports canonical |
| `stories/resolution.ts` body / factory | `stories/resolution-core.ts:createStoryResolutionCore` | original `stories/resolution.ts:createStoryResolution` remains a tiny façade; `stories/index.ts` unchanged |

**Important:** `storyteller/context.ts` is 687 lines, canonical knowledge 735, search 323 and task admission 232. They remain unchanged functionally, rather than blindly migrating an unrelated ~2k-line context/canonical corpus as part of a resolution SQL correction. `stories/resolution-core.ts` still uses `generations/index` and `generations/scripted-continuations` on the scripted path. That residual dependence is specifically **not** a Storyteller-runtime reverse dependency and belongs to the next generic generation persistence cohort.

## Type/API contract: already decided

In `stories/storyteller-resolution-contract.ts`, type `PreparedStorytellerResolution` must keep `fence` shape exact and `task: StorytellerTask` from the pure `@offscreen/storyteller/tasks` package; its old definition was `ReturnType<typeof prepareAdmittedStorytellerTask>` and this return type is exactly `StorytellerTask`. `PrepareStorytellerResolution` is `(database: Database, input: { ownerId:string;storyId:string;operationId:string;expectedRevision:number;submission:unknown;documentStore?:DocumentStore }) => Promise<PreparedStorytellerResolution>`. Core constructor receives a readonly named object `{prepareStorytellerResolution: PrepareStorytellerResolution}` and calls it with the same inputs, not through a global registry. The façade binds the existing exported preparer. Do not add a second `DocumentStore` optional/default supplier at the core.

Typed structural `StorytellerResolutionContextSqlCapture`/ `ResolutionPassageSource` definitions move **without changing members**, so `context.ts` can remain the snapshot producer and authority can compare the captured SQL values. No runtime cycles through a type-only import.

## Error / replay / ordering

- `StoryError('not_found')` for owner mismatch on initial query and `lockOwnedStory`; unauthorized owner cannot learn story state.
- Existing same-operation same-payload idempotent replay and same-operation changed-payload conflict. Frozen wake topic is reconstructed from previously committed outbox, never selected from the **current** flag on retry.
- `prepareStorytellerResolution` may fail on missing DocumentStore, invalid pinned document, mismatched published content/offer, stale interaction or resource-policy hold, without a story mutation.
- Commit checks the same captured source generation `input/output/kind/state/owner`, root revision/hash, passage ID/content hash, campaign settings revision/world state/activities, story revision/viewVersion and source transition before writing anything authoritative.
- The sole generation/new-outbox insertion occurs via `insertStorytellerTask` under commit tx. Its selection time and freeze remain as-is.

## Source and proof anchors inspected

- `packages/application/src/storyteller/admission.ts` (replay ~108; prepare ~266; commit ~517)
- `packages/application/src/storyteller/context.ts` (snapshot types ~225; SQL capture ~249; off-lock assembly ~312)
- `packages/application/src/storyteller/records.ts` (insert ~44)
- `packages/application/src/storyteller/activity-context.ts` (SQL filter)
- `packages/application/src/stories/resolution.ts` (factory ~419, Storyteller branch ~454–479)
- `packages/application/src/stories/index.ts` (`createStories` ~69–85)
- `packages/application/test/eng03-resolution-lock-measurement.live.test.mjs` (direct factory ~275/470/507)
- `tools/api-integration/test/story-resolution.integration.ts`; `tools/api-integration/package.json` (`test:stories:resolution`), `packages/application/package.json` (build)
- `packages/application/test/story03-notice-topic-freeze.test.mjs` has a source guard that mentions `storyteller/admission.ts`; when writer path moves guard must follow it without weakening the frozen-topic assertion.

**Not inspected as executed proof:** no test runner invoked; disposable DB and local env authorization unavailable in this planning environment. Full operation-level negative outcomes must be obtained by Cursor against its authorized disposable test DB, not inferred from green TypeScript.