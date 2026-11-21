# CQ04 | Composer queue
**Start only if no active WR06 or other fork/session edits own these files.** Dedicated linked worktree `change/cq04-document-store-capability-guards` from latest Undertaking HEAD; run `pnpm repo:change-branch --change CQ04 --target undertaking/storyteller-workshop`. T01 → T02 → T03.

## T01 | Complete scene checkpoint port guard | PLANNER-READY
Read/write `packages/application/src/stories/scene-checkpoint.ts:SceneCheckpointStore/WriterStore/checkpointWriterStore`; focused new pure guard test in `packages/application/test/`. Add callable checks for all five required methods before narrowed return. **Positive:** LocalDocumentStore accepted; **negative:** missing readStructuredDocument/readLibraryRoot/non-callable property refused. **Stop:** actual documented port has changed; return exact interface.

## T02 | Make fork adapter use checked port | PLANNER-READY AFTER T01
Read `packages/application/src/stories/forks.ts:ForkStore/forkDocumentStore/createStoryForks`, `packages/application/test/historical-fork.test.mjs`. Reuse checked checkpointWriterStore and add required putManifest check, preserve public signature and error branch. **Positive:** supported fork unchanged; **negative:** incomplete capability with checkpoint produces unavailable before IO, not TypeError. **Stop:** WR06 simultaneously owns same code.

## T03 | Prove regression and reconcile | PLANNER-READY AFTER T02
Build/typecheck application; run pure guard tests and disposable historical/v2 fork fixtures when safe; record errors and unrun prerequisites. Inspect hash/fence/ownership diff, update story source README only if ownership moves. ChatGPT reviews focused trust diff before custodian integrates. **Stop:** status semantics, fork root or transaction timing changed; no ceremonial Done.
