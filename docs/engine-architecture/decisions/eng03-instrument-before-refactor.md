# Decision ENG03 | Instrument the story lock, then refactor only proven external I/O

**Status:** architectural strategy selected, **full ENG03 remains NOT Ready**. We can define a small prerequisite measurement with the current code and a disposable DB, but **cannot safely replace task admission with a new async pipeline** without first determining the exact captured context and in-flight task semantics.

**Concrete measurement and conditional DTO (2026-11-13):** [selected ENG03-M measurement](eng03-measurement-and-capture-contract.md) gives an exact 0/250/2000ms test matrix, source/lock spans, proportional go/no-go threshold and a conditional captured-source V1 semantic envelope. [ENG03-M code-bearing packet](../../changes/2026-11-13--eng03-lock-measurement/CHANGE.md) is independently executable after explicit owner/disposable-DB authorization. This does not mark the full transaction rewrite Ready.

## Source-grounded problem and exact first scope

The current `packages/application/src/campaign/actions.ts` holds `lockOwnedStory() FOR UPDATE` while `preparePendingActionNarration` may load `loadStorytellerContext`, including canonical document reads from `DocumentStore` and potentially long active-scene passage sets. Network-bound S3 I/O will make that critical section longer. Other `storyteller/admission.ts` paths may have the same coupling. The current local adapter makes performance uncertain, not automatically unacceptable.

**Do not solve this by moving an unversioned `loadStorytellerContext` call after the commit**: a different source root, actor state or story revision can appear before the context is loaded.

## First independent diagnostic, not a whole game refactor

1. On an explicitly disposable story, inject **controlled 0ms / 250ms / 2s canonical document-store delay** during accepted action context preparation; record SQL transaction duration, `FOR UPDATE` hold and concurrent writer wait separately.
2. Compare a **legitimate conflicting** second action with an unrelated authorized read/probe. An incompatible second decision remains intentionally denied; it is not an SQL performance bug.
3. Test a long active-scene source (e.g. 40 passages), a missing immutable object and a failed provider preparation. Capture exact failure semantics, not just timing.
4. Map every caller/transaction of `loadStorytellerContext` and classify **required controlling generation**, **early optional pre-narration**, **after-settlement consequence**, **historical report** and **opening**. Only change one source owner first.
5. Identify whether a short source-index transaction can capture all required source/actor/rule version IDs before external I/O and whether the existing outbox/task row can store an idempotent **context preparation intent**.

**Decision threshold:** We should perform ENG03 if injected I/O materially increases time holding the story write lock or if remote CAS would turn correct commands into long lock waits. Don't choose an arbitrary global p95 number without baseline machine/profile. Even then isolate one preparation path.

## Selected future causal protocol (not yet physical schema)

- **Capture under short lock:** `operationId`, owner/story/actor scope, source passage `id/revision`, immutable `rootHash/rootRevision`, settings/rule/usage versions, exact admitted result or immutable receipt ID, relevant authorization/clock frontier and required source IDs. Commit a source-bound preparation intent/outbox.
- **Materialize off lock:** read exact immutable hashes and source event references, bounded evidence/omissions, freeze request input/hash and cost permission. No PostgreSQL long snapshot or unbounded remote read while holding story row.
- **Publish under short lock:** recheck task-specific identity/source/receipt; current controlling scene cannot publish after a relevant root/revision change, but a historical report may still publish at its original event identity. A duplicate preparation notice does not create a new paid attempt/receipt.

## Migration and fallback rules

- Existing **already admitted** `storytellerTaskSchema`/`generation` rows remain decoded and dispatched under their old captured format. Never convert a running/uncertain paid attempt by assuming it was unsent.
- If the new preparation intent needs a new schema/version, introduce an additive union and an old reader; no destructive backfill.
- A finite action that settles before its early prepared draft is complete must still generate a lawful **post-settlement consequence** without duplicate provider spend. This race is central, not a minor test.
- On missing CAS source, preserve committed mechanics and hold preparation rather than returning a fake scene or replaying a roll.
- If existing source has a cheaper, correct path (e.g. defer to post-settlement narration via current outbox), compare latency/cost with the full capture system before adding new orchestration.

## Why not declare full ENG03 Ready today?

The **exact one-path context capture DTO**, task lifecycle transitions between pending/running/uncertain and prepared/outdated, and compatibility for speculative narration are still implementation-contract decisions. We have enough to scope the **profiling/trace** but not enough to authorize replacing the SQL/Storyteller pipeline wholesale.

**Recommended dependency:** first make ENG05 shared CAS adapter testable under local S3 (without enabling live cutover), then run injection/lock measurements to prove ENG03 benefit. If no expensive lock is found in realistic traces, postpone ENG03 or fix only the unbounded active-scene query.

## Test / side-effect boundary

No provider calls, no production DB, no destructive migration. Any code instrumentation should omit private prose and provider request contents. Local disposable Postgres/Temporal test setup requires owner approval. A performance number without environment/configuration cannot justify a broad engine refactor.
