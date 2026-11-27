# 3. Data truth, transaction boundaries and durable messages

**Storyteller evolution data boundary:** scene publication atomically selects an immutable Library root and semantic fictional-state frontier. Workdesk drafts and search indexes are provisional/derived; provider attempts, worker leases and billing remain operational records outside forked fiction.

**Reader question:** which bytes form the story's truth and how do we prevent partial scenes? **Baseline:** 584b594, with the checkpoint and adoption routes re-pointed to the present source tree below. Canonical [data/persistence](../technical/platform/data-and-persistence.md), [canonical documents](../technical/storyteller/canonical-documents-and-packages.md), [execution](../technical/platform/execution-and-delivery.md).

## The three different persistence jobs

```mermaid
flowchart LR
    subgraph PG[Application PostgreSQL: authoritative selectors and effects]
      Story[Story revision and campaign]
      Passage[Passage and scene selector]
      Operation[Idempotent commands, generation and attempt]
      Outbox[Durable execution notice]
    end
    subgraph Objects[S3-compatible immutable objects]
      Content[Narrative document content]
      Canon[Campaign manifest by root hash]
      Checkpoint[Scene checkpoint object by hash]
    end
    subgraph Temporal[Temporal owned persistence]
      History[Workflow history, timers and Activity outcomes]
    end
    Passage -->|exact checkpoint hash| Checkpoint
    Story -->|exact canon root hash| Canon
    Operation --> Outbox
    Outbox --> History
    Canon --> Content
```

Application SQL answers **which** scene, revision, result and root are committed. S3 stores immutable **what** content/scene snapshots those hashes identify. Temporal owns durable **how the work runs**, not game state. A SQL commit is not atomic with S3 or Temporal; the protocol is deliberately staged and idempotent rather than an imaginary global transaction.

## Schema relationships, simplified and source-backed

```mermaid
erDiagram
    STORY ||--o{ STORY_PASSAGE : contains
    STORY ||--o{ STORY_SCENE_CHECKPOINT : selects
    STORY ||--o{ STORY_RESOLUTION : receives
    GENERATION ||--o{ STORYTELLER_ATTEMPT : has
    GENERATION ||--o| STORYTELLER_PUBLICATION : concludes
    GENERATION ||--o{ STORY_RESOLUTION : serves
    STORY_SCENE_CHECKPOINT {
      uuid story_id
      uuid passage_id
      string checkpoint_hash
      string canon_root_hash
      int canon_root_revision
    }
    GENERATION {
      uuid id
      string state
      uuid attempt_id
      json output
      int status_revision
    }
    STORYTELLER_ATTEMPT {
      uuid attempt_id
      uuid generation_id
      json attribution_custody
    }
    STORYTELLER_PUBLICATION {
      uuid generation_id
      string state
    }
    STORY {
      uuid id
      int revision
      string document_root_hash
    }
    STORY_PASSAGE {
      uuid id
      uuid story_id
      int sequence
    }
    STORY_RESOLUTION {
      uuid operation_id
      uuid generation_id
    }
```

**Conceptual ER, not migration DDL.** These are representative identities and relationships; not every edge is necessarily a physical foreign-key constraint. See packages/db/src/schema/{stories,generations,storyteller,outbox}.ts for actual columns/constraints. Never generate a migration from this diagram.

## Current checkpoint commit is stage-then-select, not S3 within a SQL transaction

```mermaid
sequenceDiagram
    autonumber
    participant GA as Authorized game writer
    participant S3 as Immutable document store
    participant PG as PostgreSQL
    GA->>S3: Write next root and scene checkpoint
    S3-->>GA: Object content hashes
    GA->>S3: Read back and verify exact hashes and identity
    alt staging invalid or unavailable
      GA-->>GA: Refuse, no SQL selector
    else staged objects verified
      GA->>PG: Begin short transaction, lock current story
      PG-->>GA: Expected revision and root
      alt version or root mismatch
        GA->>PG: Roll back
        Note over S3,PG: Unreferenced staged objects are harmless
      else exact match
        GA->>PG: Commit passage, root and checkpoint selector
        PG-->>GA: Committed revision
      end
    end
```

**CURRENT SOURCE pattern (route corrected from the deleted `packages/application`):** packages/story-engine/src/stories/scene-checkpoint.ts:stageSceneCheckpointObject writes/verifies, and insertStagedSceneCheckpointSelector checks story revision/root and passage identity in SQL; storyteller publication similarly stages then adopts under a later SQL lock. The system does **not** promise an ACID transaction across S3 and SQL. A missing or corrupt referenced object must fail the historical read, not silently substitute the latest state.

## A critical unimplemented bridge: custody is not generation success

Heading retained for inbound links; the section's current reading is at the end (custody versus adoption).

```mermaid
stateDiagram-v2
    [*] --> Pending
    Pending --> Running: legacy path binds attempt ID
    Running --> Succeeded: output saved with same attempt ID
    Running --> Failed: explicit failure code
    Running --> Uncertain: dispatch outcome unclear
    Uncertain --> Succeeded: reconciliation with saved output
    state Pending {
      [*] --> NoAttemptOnGeneration
    }
    state Succeeded {
      [*] --> AttemptAndOutputBothPresent
    }
```

**Physical database constraint, CURRENT:** generation_state_shape in packages/db/src/schema/generations.ts requires:
- pending: no attempt ID, output or failure code;
- running/uncertain: attempt ID, no output or failure code;
- succeeded: **attempt ID AND output**;
- failed: attempt ID and failure code, no output.

**Additional CURRENT SQL invariant:** the same schema has `generation_repair_shape`: a successful generation must **not** keep a repairCandidate or repairDiagnostic. A future saved-result adoption must reject a pending generation with unresolved repair metadata, not clear evidence silently to satisfy the check. This is a separate negative proof from ordinary attempt/result idempotence.

**Custody is not adoption (the authority line this section guards).** `createStorytellerTaskCustody` plus private Game Authority routes persist one scripted attempt and its validated `attribution.custody.result` when two HTTP clients race the same generation on disposable PostgreSQL. The seam refuses a provider-mode task and a non-scripted attempt with `unsupported-execution` (**27/27** current-head provider-free tests at that closure; the earlier **10/10** at `ec73a535` did not include the refusal). A custody save alone leaves the generation row without `attemptId`, `output` or `succeeded`: saving a result is not the model or worker declaring committed truth. See [STORY02](https://github.com/DenisSkulovic/offscreen-rpg/blob/34e2b4fd8d9d9967e13311da3a938460b1a02244/work/changes/archive/2026-11/storyteller/2026-11-19--story02-private-task-and-result-custody/CHANGE.md) and [remote task custody](../technical/storyteller/generation-and-publication.md#remote-task-custody). **Not proved:** cross-Pod executors.

**Baseline gap and present source.** At 584b594 the saved-attempt to succeeded-generation adoption was a GAP/TARGET for [STORY03](https://github.com/DenisSkulovic/offscreen-rpg/blob/34e2b4fd8d9d9967e13311da3a938460b1a02244/work/changes/archive/2026-11/storyteller/2026-11-19--story03-separate-temporal-executor-and-publication/EXECUTION.md). Source now has `adoptSavedStorytellerGeneration` in `packages/story-engine/src/storyteller/generation-adoption.ts`, returning `adopted`, `idempotent`, `held` (for example `repair-pending`) or `refused`, and Game Authority adopts the saved attempt inside its publication route. The requirements remain the selected guarantees: adoption stays transactionally fenced and idempotent before `publishStorytellerResult`; duplicate adoption or a conflicting legacy attempt must not overwrite a result; and a generation with unresolved repair metadata is held, not silently cleared. Source existence and the local scripted runs do not prove adoption under a Pod race.

## The durability chain has independent guarantees

```mermaid
flowchart TD
    Command[One admitted command identity] --> Tx[SQL transaction]
    Tx --> Notice[Outbox record committed with command]
    Notice --> Relay{Temporal available?}
    Relay -->|no| Retain[Keep notice pending for retry]
    Retain --> Relay
    Relay -->|yes| Start[Start stable workflow ID]
    Start --> Dup{Already started?}
    Dup -->|yes| Reuse[Same durable workflow, no new operation]
    Dup -->|no| Work[Run allowed Activities]
    Reuse --> Work
    Work --> Fence{Scene expected revision and root?}
    Fence -->|no| Refuse[Hold stale proposal]
    Fence -->|yes| Publish[One committed publication]
```

**Important distinction:** Temporal start retry is at-least-once, workflow identity deduplicates execution coordination, and PostgreSQL application constraints deduplicate **effects**. None of those alone prevents double billing by an external provider. A broker event can be delivered multiple times and is not source-of-truth authority. The selected story wake is SQL outbox **direct to Temporal**, not SQL outbox → Rabbit → Temporal.
