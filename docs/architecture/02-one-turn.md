# 2. One turn: from player click to a committed second scene

**Storyteller evolution turn:** the target sequence is captured scene/root → adaptive writer mission (Library/skills/Workdesk/optional assistants) → structured proposal → Game Authority validation → coherent post-publication scene boundary. Old one-shot or preview/Start paths are current/legacy realization, not the target sequence.

**Reader question:** where is the long-running operation, when is the player's choice accepted, and who declares a scene real? [Execution contract](../technical/platform/execution-and-delivery.md), [generation/publication](../technical/storyteller/generation-and-publication.md), [response contracts](../technical/platform/http-api-and-client-contracts.md). **Baseline:** 584b594; CURRENT and TARGET are intentionally separate.

## Current source: one combined Storyteller Activity

```mermaid
sequenceDiagram
    autonumber
    participant Player
    participant API as Nest public API
    participant PG as Application PostgreSQL
    participant Relay as Outbox relay
    participant T as Temporal
    participant W as Combined worker
    participant S3 as DocumentStore
    Player->>API: Submit supported interaction
    API->>PG: Admit operation and persist notice
    API-->>Player: Accepted or pending receipt
    Relay->>PG: Poll durable notice
    Relay->>T: Start storytellerV1 with generation ID
    T->>W: completeStoryteller Activity
    W->>PG: Read task and generation
    W->>W: Scripted or authorized provider execution
    W->>S3: Stage immutable narrative objects
    W->>PG: publishStorytellerResult under locks
    W-->>T: Activity settles
    API-->>Player: Committed revision SSE hint
    Player->>API: GET story at committed revision
    API-->>Player: New passage
```

**Caution:** this shows the current logical path reconstructed from source, **not** an observed complete live run. The worker currently calls createStorytellerRuntime.complete, which performs generation **and** publication. The story may remain pending or be refused; not every admitted operation yields a scene. Workflow idempotence does not imply exactly-once provider billing.

## Selected distributed turn: execution and publication separated

```mermaid
sequenceDiagram
    autonumber
    actor Player
    participant API as Nest API
    participant GA as Game Authority
    participant PG as PostgreSQL
    participant T as Temporal control
    participant EX as Isolated Storyteller executor
    participant S3 as S3 documents
    Player->>API: Submit one supported command
    API->>GA: Authenticated admission with operation ID
    GA->>PG: Atomically commit command and outbox notice
    GA-->>API: Pending receipt
    API-->>Player: Accepted, not published
    PG-->>T: Outbox relay starts versioned workflow
    T->>EX: Execute frozen task on separate queue
    EX->>GA: Read exact task and root
    GA-->>EX: Versioned task snapshot
    EX->>GA: Claim attempt with stable identity
    EX->>S3: Read only pinned source documents
    EX->>EX: Produce scripted result (POC)
    EX->>GA: Save validated result and hash
    T->>GA: Publish saved result
    GA->>PG: Adopt attempt and output under DB fence
    GA->>S3: Stage immutable new scene objects
    GA->>PG: Commit passage, root and checkpoint
    GA-->>T: Published or held or stale
    GA-->>API: Commit revision notification
    API-->>Player: SSE revision hint
    Player->>API: GET committed scene
    API-->>Player: Scene 2 and root version
```

**The player path in this diagram is still a target.** The “PG to Temporal” arrow abbreviates a relay polling SQL and starting Temporal directly; PostgreSQL does not speak Temporal. No Rabbit hop is required. The executor must not mutate game truth.

**Control publication is now source, not only a target.** `publishSavedStoryteller` calls Game Authority over HTTP with the control token and does not open SQL. A disposable `offscreen_auth_test` handoff published one saved scripted generation through that activity (`story03-distributed-handoff.live.test.ts`, **1/1**, `STORYTELLER_LIVE_ENABLED=false`). That test starts the workflow by hand.

**One local HTTP turn is now observed.** `tools/api-integration/test/story03-causal-multiprocess.integration.ts` (**7/7**, about 46s) signs in, requests the Turn03 opening, starts the story, and submits the visible choice over HTTP. Separate OS processes run the relay, the control worker, and the executor. Game Authority is its own HTTP server. The continuation notice is `storyteller.distributed.v1`. Scene 2 is read back with GET after the workers restart. One case drops the continuation publish acknowledgement after Game Authority commits and still leaves one published scene. Another holds the save response, kills the executor while the story is still revision 1, and the restarted executor publishes that same saved result once. Documents are a local filesystem store. A separate sandbox test marks a lagging saved continuation `stale` and adds no passage. This run does not prove the browser, SSE, or a cold kind cluster. Default Compose remains the combined worker above. The selected TASK/CLAIM/SAVE/PUBLISH protocol is detailed in [STORY03](https://github.com/DenisSkulovic/offscreen-rpg/blob/34e2b4fd8d9d9967e13311da3a938460b1a02244/work/changes/archive/2026-11/storyteller/2026-11-19--story03-separate-temporal-executor-and-publication/EXECUTION.md).

## Admission is not completion

```mermaid
stateDiagram-v2
    [*] --> Requested
    Requested --> Rejected: invalid command or actor
    Requested --> Admitted: durable SQL operation and notice
    Admitted --> Waiting: Temporal or worker unavailable
    Waiting --> Executing: retry from same durable identity
    Admitted --> Executing: worker available
    Executing --> ResultSaved: validated result recorded
    Executing --> Held: uncertain or invalid execution
    ResultSaved --> Published: authority accepts current root
    ResultSaved --> Stale: revision or root changed
    ResultSaved --> Blocked: storage or policy failure
    Blocked --> ResultSaved: safe publication retry
    Published --> [*]
    Rejected --> [*]
    Stale --> [*]
    Held --> [*]
```

This is a **conceptual operation state machine**, not the physical schema of one table. The database has distinct records: generation, attempt, publication, story and outbox. A retry or hold only occurs when its actual persisted state and safety policy permit it. In particular, an ambiguous billable provider send must **not** silently loop from Held to Executing.

## Where slow time is allowed

```mermaid
flowchart TD
    Click[Player clicks] --> Auth{Actor and command valid?}
    Auth -->|no| Denied[Reject without side effect]
    Auth -->|yes| TX[Short SQL admission transaction]
    TX --> Receipt[Return accepted receipt]
    TX --> Notice[Durable outbox row]
    Notice --> Workflow[Temporal can wait or retry safely]
    Workflow --> Model[Long model or scripted execution outside SQL lock]
    Model --> Saved[Persist validated output under stable identity]
    Saved --> Check{Current story and root still match?}
    Check -->|no| Hold[Stale or blocked, no publication]
    Check -->|yes| Commit[Short SQL scene commit after object staging]
    Commit --> Read[Notify client, then authoritative GET]
```

The **whole point** of Temporal is that the HTTP request does not hold open while a model thinks. The **whole point** of SQL fences is that a late model does not overwrite a newer scene. The **whole point** of S3 immutability is that scene 1 remains readable after scene 2 and a fork. See [data transactions](03-data-and-transactions.md) and [failure recovery](04-failure-and-recovery.md).

## What remains genuinely unproven

- The Game Authority currently forwards only remote GET and resolution PUT; candidate start and fork still have local Nest paths.
- Task custody is present in the application package but not exposed as role-separated private transport.
- The current generation output and attempt custody result have a missing **atomic adoption bridge**, required by the SQL generation-state constraint.
- The separate executor queue and real cluster image were not deployed/tested in this planning pass.
- A fake/scripted scene proves the plumbing, not narrative quality or live-provider spend safety.

Acceptance for the **first credible POC** is a logged single actor: committed scene 1 → submitted command → versioned Temporal workflow → fake Storyteller result → Game Authority committed scene 2 → SSE/GET → historical fork. See [TURN03](../../work/changes/open/2026-11-19--turn03-full-distributed-forkable-turn-proof/PROOF.md).
