# MA05E | precise SQL ownership and dependency map

Source verified on undertaking/storyteller-workshop 22e8af7e38ade6cf6797e6446702d2203074a439. The single original exported function publishStorytellerNotes is 78 lines in application/src/storyteller/memory.ts. It reads generation and storyPassage, checks storytellerKind and succeeded status, validates Storyteller task and result, rejects report tasks, verifies current notes or arrival departure evidence, applies continuity patch and updates story.continuityNotes inside caller-supplied Transaction.

- OLD: application/src/storyteller/memory.ts; NEW: application/src/stories/continuity-notes.ts (entire function with same SQL and errors; replace import of storytellerKind from ./records with @offscreen/contracts/storyteller-kinds; import type Transaction from @offscreen/db/outbox).
- OLD CONSUMER: application/src/stories/continuation.ts first import ../storyteller/memory; NEW import ./continuity-notes only. Preserve invocation at commitStoryContinuation after advanceStoryView and staged checkpoint selector but before enqueueContinuationNotices; no transaction split or snapshot changes.
- COMPAT: application/src/storyteller/memory.ts is one line: export { publishStorytellerNotes } from '../stories/continuity-notes'; . This preserves storyteller/start.ts and any existing direct runtime imports.
- TEST: application/test/ma05e-continuity-compat.test.mjs (new exact reference identity) and application/test/scene-checkpoint-publication.test.mjs (existing disposable SQL suite and continuity after-publish evidence). No new harness.

Four exact legacy errors must survive: Missing storyteller result; Historical reports do not publish continuity notes; Stale continuity base; Missing continuity departure. Authority depends only on DB, Contracts and pure Storyteller task/context contracts, not runtime implementation. Preserve all existing owner/root/revision and one-SQL-transaction fences.
