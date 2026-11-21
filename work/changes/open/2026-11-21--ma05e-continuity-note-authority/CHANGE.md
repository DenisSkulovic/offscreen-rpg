# MA05E | give Story Authority ownership of continuity notes SQL

**Status:** READY WITH EXPLICIT LIMITS only after MA05D has integrated and affected symbols are refreshed. **Target:** undertaking/storyteller-workshop, linked worktree branch change/ma05e-continuity-note-authority. Planner inspected current source on 22e8af7e38ade6cf6797e6446702d2203074a439; no implementation or SQL test run.

**Actual coupling:** packages/application/src/stories/continuation.ts:commitStoryContinuation imports publishStorytellerNotes from storyteller/memory.ts. That 2.5KB Storyteller file exports only one function: under the caller's SQL transaction, read the succeeded generation, validate task/result/evidence with pure @offscreen/storyteller tasks/context, reject reports or stale/missing departure evidence, then update story.continuityNotes. It performs no provider calls. storyteller/start.ts still legitimately imports the old module.

**Decided edit:** Move the whole implementation, unchanged, to packages/application/src/stories/continuity-notes.ts, importing storytellerKind directly from @offscreen/contracts/storyteller-kinds and Transaction directly from @offscreen/db/outbox. In stories/continuation.ts change only the runtime import to the new local authority helper. Replace storyteller/memory.ts with a direct named export from ../stories/continuity-notes, so all old callers receive exactly the same function reference. Leave its SQL, validation, errors, ordering and transaction context identical. No new ports, callbacks, DB migrations, provider work or manifest changes.

**Mandatory proof:** new old/new strict function identity test, existing disposable scene-checkpoint-publication.test.mjs (includes post-publish notes and negative evidence paths), Application/API/GA/worker builds, module graph and changed-file formatting/lint. Missing SQL test permission means NOT RUN, not Done. MA05E is one coherent boundary cut, not full MA05.

[Source Map](SOURCE-MAP.md) | [TASKS](TASKS.md) | [Proof](PROOF.md).
