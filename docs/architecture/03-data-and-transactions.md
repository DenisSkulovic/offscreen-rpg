# 3. Data truth, transaction boundaries and durable messages

**Reader question:** which bytes form the story's truth and how do we prevent partial scenes? **Baseline:** 584b594. Canonical [data/persistence](../technical/platform/data-and-persistence.md), [canonical documents](../technical/storyteller/canonical-documents-and-packages.md), [execution](../technical/platform/execution-and-delivery.md).

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

**CURRENT SOURCE pattern:** packages/application/src/stories/scene-checkpoint.ts:stageSceneCheckpointObject writes/verifies, and insertStagedSceneCheckpointSelector checks story revision/root and passage identity in SQL; storyteller publication similarly stages then adopts under a later SQL lock. The system does **not** promise an ACID transaction across S3 and SQL. A missing or corrupt referenced object must fail the historical read, not silently substitute the latest state.

## A critical unimplemented bridge: custody is not generation success

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

**GAP/TARGET:** new createStorytellerTaskCustody in packages/application/src/storyteller/execution.ts can insert a storyteller_attempt and save validated attribution.custody.result, **but does not populate generation.attemptId/output/state**. The separate Game Authority needs a transactionally fenced, idempotent saved-attempt → succeeded-generation adoption using the exact saved attempt ID and output before calling publishStorytellerResult. Duplicate adoption or a conflicting legacy attempt must not overwrite a result. See [STORY03 design](../../work/changes/open/2026-11-19--story03-separate-temporal-executor-and-publication/EXECUTION.md).

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
