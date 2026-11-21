# MA05 | source-observed authority/runtime edges and transaction scopes

**Source:** extracted full source files from repository snapshot `dac6b69813b52ecb1f202158791deaa3b7ea89d7`; remote `stories/index.ts`, `stories/resolution.ts`, `storyteller/admission.ts` independently reconfirmed on target branch at `0a52a9a3991732bb1003eb7bdf83899e7a798c83`. **Not** a live MA01 --json run and **not** proof that future Writer changes preserve these edges. Source import search includes relative imports in stories/campaign; classify actual behavior from inspected functions, not import names.

## Originally eleven reverse imports: two resolved in MA05A, nine remain at post-MA05B HEAD

| Authority source | Imported runtime symbol / owner | Behavior seam |
| --- | --- | --- |
| `stories/index.ts` | `retryStoryteller` → `storyteller/recovery.ts` | retry existing admitted intent, SQL idempotency + source snapshot; outer factory may supply callback |
| `stories/resolution.ts` | `prepareStorytellerResolution`, `commitStorytellerResolution`, `replayStorytellerResolutionIfMatching` → `storyteller/admission.ts` | read-only captured snapshot, replay shortcut/outbox, commit under same explicit DB transaction with story lock/revision CAS |
| `stories/start.ts` | **RESOLVED MA05A:** generation kind now imports `@offscreen/contracts/storyteller-kinds` | retains persisted literal / no runtime import for this symbol |
| `stories/start.ts` | `startStorytellerCandidate` → `storyteller/start.ts` | **inside** `database.db.transaction(tx)`, staged checkpoint selector plus story initialize; cannot defer until after commit |
| `stories/reads.ts` | **RESOLVED MA05A:** context capture kind now imports `@offscreen/contracts/storyteller-kinds` | no massive runtime capture module loaded solely for kind classification |
| `stories/continuation.ts` | `publishStorytellerNotes` → `storyteller/memory.ts` | **inside same authoritative continuation transaction** (notes update and notice enqueue); must not become post-commit |
| `campaign/reports.ts` | `captureHistoricalReport` → `storyteller/context-capture.ts` | **inside caller tx**, returns generationId inserted into campaignReport row |
| `campaign/follow-up-intents.ts` | `storytellerNoticeTopicForWake` → `storyteller/records.ts` | reads frozen notice topic inside tx; no new computed topic/version |
| `campaign/follow-up-intents.ts` | `isProvisionalContextCapture` → `storyteller/capture-materialization.ts` | inside tx; determines correct outbox topic without racing promotion |
| `campaign/narration.ts` | `capture*ConsequenceNarration` functions → `storyteller/context-capture.ts` | tx-scoped context capture for action/activity/obligation narration; initial immutable evidence/mutable hold order |
| `campaign/narration.ts` | `materializePendingActionCapture` → `storyteller/capture-materialization.ts` | database-level receipt preflight and story lock before saved materialization; replay and context hash semantics |

**Additional reverse coupling:** `stories/resolution.ts` imports `createGenerations,GenerationError` from `generations/index.ts` and scripted-continuation topic from `generations/scripted-continuations.ts`. They carry scripted admission/outbox/failure behavior and cannot be hand-waved away by a Storyteller port. `campaign` and `stories` also import `outbox/Transaction,enqueue` in many modules; pure shared SQL outbox ownership must be settled before package extraction. MA04 removes the one `stories/index.ts → developer-tools/chamber-fixtures` edge.

## Reverse runtime → authority dependencies (must remain legal through narrow authority APIs)
- `storyteller/admission.ts` imports `stories/{persistence,errors,passage-documents}` and SQL generation/campaign/outbox sources; export signatures include `StorytellerResolutionFence`, `PreparedStorytellerResolution`, `prepareStorytellerResolution(database,input)`, `commitStorytellerResolution(tx,prepared)`, `replayStorytellerResolutionIfMatching(database,input)`.
- `storyteller/publication.ts` imports `stories/{continuation,scene-checkpoint,command-policy,errors,persistence,...}` and `campaign/{persistence,delegated-offer,...}`; its write side must continue owning observed story commit boundaries and publication pins.
- `storyteller/recovery.ts:retryStoryteller` uses `lockOwnedStory`, generation row, prior retry, outbox and attempt policy in one SQL transaction.
- `storyteller/memory.ts:publishStorytellerNotes(tx,input)` updates story continuityNotes under caller's existing transaction.

## External factories and direct users
- `packages/application/src/stories/index.ts` exports `createStories`, `createStoryApplication`, `readOwnedStorySource` and public passthrough helpers. Consumers include `apps/api/src/app.ts`, `apps/game-authority/src/application.ts`, `apps/worker/src/runtime/index.ts`, `packages/application/src/developer-tools/chamber.ts` and many `tools/api-integration/test` calls; **do not** turn this source file into a raw authority package by blindly moving it.
- `createStoryResolution(database,documentStore?)` has direct calls from `packages/application/test/eng03-resolution-lock-measurement.live.test.mjs`, as well as `createStories`. Its default-construction compatibility must be explicitly designed before requiring a new port.
- Outbox owner `application/src/outbox/index.ts` exports `Transaction` (Drizzle inferred from `Database.db.transaction`) and `enqueue(tx,notice)` with deterministic conflict check, plus dispatcher-lease `createOutbox`; a port must preserve that exact SQL identity.

**Research limits:** These are source facts as of the inspected baseline, not a full AST transitive SCC or exhaustive imports after WR04–WR08. Run MA01 graph and compare source signatures after actual predecessor integration, not inside paid Cursor "first task".

**Post-MA05C check (2026-11-21):** source imports from `stories/start.ts` and `stories/reads.ts` use neutral Contracts. `application/outbox/index.ts` is a strict DB outbox re-export plus the existing lease dispatcher. The 46 former relative outbox consumers now import `@offscreen/db/outbox`, as recorded by [MA05C](../../archive/2026-11/other/2026-11-21--ma05c-direct-db-outbox-imports/CHANGE.md). The remaining direct Authority to Storyteller imports in the original table total **nine** (not 11). A fresh AST/SCC test is still required before claiming an overall cycle reduction.
