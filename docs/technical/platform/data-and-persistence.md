# Data and consistency

**Find the section:** [who owns the durable record](#who-owns-the-durable-record) · [durable record families](#durable-records) · [proposed service schemas](#proposed-service-schemas-and-delivery-records) · [selected document store](#selected-document-store) · [public story snapshots](#story-snapshot-and-chronology) · [type boundaries](#flexible-without-becoming-untyped) · [quantities and ownership](#quantities-and-ownership) · [story isolation and indexes](#story-isolation-and-indexes) · [retention/deletion](#changes-retention-and-deletion). Read the relevant section rather than loading this entire document.

## Who owns the durable record

| Promise | Owner |
| --- | --- |
| Canonical SQL identity, versioned or append-only source, and the transaction | This page. [Story snapshot and chronology](#story-snapshot-and-chronology) holds the revision and the commit. [Selected document store](#selected-document-store) holds content-addressed prose. [Quantities and ownership](#quantities-and-ownership) holds one mutable authority per scarce fact. |
| Caches | [Redis boundary](./persistence-and-caching.md#redis-boundary) |
| Queue, outbox, and Temporal delivery | [Commands and durable delivery](./execution-and-delivery.md#commands-and-durable-delivery) |
| Engine result admission | [Admitted action and time](../engine/mechanics-and-capabilities.md#admitted-action-and-time) |
| Storyteller publication | [What publication is allowed to do](../storyteller/generation-and-publication.md#what-publication-is-allowed-to-do) |
| Effective spending | [Distinct authorities](./spending-and-entitlements.md#distinct-authorities) |
| Player record kinds | [Six kinds of record](../../product/gameplay/continuity.md#six-kinds-of-record) |

Engine result admission and Storyteller publication stay on the linked headings. A platform cache does not carry either promise.

Realization records stay under [Durable records](#durable-records) and in the source-observed note of [Selected document store](#selected-document-store). [Planned story records](#planned-story-records) stays the selected family list.

Current implementation stores campaign narrative bodies and continuity notes in PostgreSQL. The [canonical-file contract](../storyteller/context-and-memory.md) remains the target: versioned documents own narrative knowledge and Storyteller guidance; transactional records retain mechanical execution, permissions, publication references and accounting. Local document storage and an S3-compatible adapter exist; see [selected document store](#selected-document-store). Moving already-saved PostgreSQL narrative bodies onto that store is not claimed complete. Do not extend the table families below into new narrative content tables without reconciling that ownership boundary. A rebuildable search index is not the canonical content store.

Application PostgreSQL owns committed story state, chronology, command receipts, decisions and spend reservations. When `GAME_AUTHORITY_MODE=distributed`, the owned snapshot read and the scripted resolution receipt are served by `apps/game-authority` through `createStoryApplication`. Nest does not write that receipt. Unset mode keeps the write in the API process. The receipt stays the existing `story_resolution` row. Start, campaign commands, and publication do not move. Temporal owns workflow history, timers and execution progress. Published deadlines are projected into PostgreSQL for display and admission checks; no database scheduler separately advances them. That ownership split is the selected model. Create further migrations in working slices, not every future table before the first screen. The world may imply far more people, objects and places than these records store. Do not add NPC, location, relationship, fact, population, schedule or generic world-entity tables because a scene mentioned a crowd. Durable story-scoped identity is created when later correctness depends on that exact person, object or place. See [sparse world](../../product/gameplay/continuity.md#sparse-world-progressive-materialization). Scene-local references for targetable details are a later presentation/interaction concern, not a reason to persist a full world census. A later split of schemas and the inbox rules are [Proposed service schemas and delivery records](#proposed-service-schemas-and-delivery-records). That section does not add those tables to the current database.

## Durable records

These subsections are realization records of the tables and migrations already named here. [Planned story records](#planned-story-records) remains the selected family list. Demonstrated tiers, where a row exists, are [capability coverage](../../../STATUS.md#capability-coverage).

### Implemented private draft

`story_draft` contains a UUID, an authenticated owner reference, three bounded text fields (`title`, `premise`, `storytelling_direction`), a positive revision and creation/update timestamps. Limits are 160, 6,000 and 2,000 UTF-16 code units respectively at the application boundary. PostgreSQL additionally bounds character lengths. Empty strings are permitted because saving an idea is different from approving it for generation. Text is preserved rather than silently trimmed or rewritten.

The premise currently contains both character intent and starting circumstances. Direction is separate so the same premise can be told differently. There is no settings blob, invented character taxonomy, gameplay inventory or runtime status on this record. Generated candidates and shared character inputs will need their own reviewed contracts when those components are built.

An owner/creation-time/ID index supports stable paginated reads. Timestamps use millisecond precision to preserve cursor comparisons through JavaScript dates. Owner deletion is restricted by the foreign key until account/story deletion policy is implemented. Public DTOs omit ownership; the server derives it from authentication. `@offscreen/contracts/drafts` owns runtime validation and transport types; `@offscreen/application/drafts` owns database operations independently of Nest and React. See [draft lifecycle](../engine/lifecycle-and-compatibility.md) for concurrency and retry behavior.

### Implemented generation records

`generation` stores an owner, a versioned task kind, immutable JSON input, processing state, one attempt ID, validated output or a short failure code, and timestamps. `@offscreen/application/generations` supplies the common insert/read/claim/settle operations using task-specific input/output schemas. These are private server operations, not public response DTOs: inputs can contain application prompts. Each task kind must retain the schema needed to read its stored version.

Opening-specific behavior lives behind `@offscreen/application/generations`. Its input contains the source draft ID/revision, exact content, prompt version, and exact messages/output schema. `draft_opening` points to the latest requested operation for each draft. Old operations remain readable by their owner; only the latest operation matching the current draft revision is current. This flag is a read-time observation, never authorization to start gameplay. Future Start must recheck under the appropriate transaction lock.

The generic record contains no draft, character, scene or timing fields. The opening module owns draft authorization, revision checking and the one-unresolved-request-per-draft rule. The test suite also uses the common lifecycle with a different input/result schema. There is no universal job dispatcher, subscription mechanism or database scheduler in this component.

### Implemented execution notices

`outbox` stores a unique notice ID, versioned topic, operation UUID, next delivery eligibility, lease token and delivery timestamp. It contains no prompt or player content. Opening admission inserts its notice in the same transaction as the generation record and latest-opening link. The notice ID currently equals the opening operation ID; typed topics select dispatch behavior, not arbitrary workflow names supplied by clients. A partial index serves undelivered notices. Migration `0003_execution_outbox` also admits previously pending scripted requests for delivery.

The reusable relay store leases and acknowledges delivery; it does not own the referenced operation's outcome. No foreign key binds this cross-operation notice table exclusively to generations. The admitting module is responsible for creating a valid reference transactionally; future deletion must account for outstanding notices. Keep receipt retention separate from Temporal history retention and from game chronology. Queue, outbox relay, and Temporal delivery stay on [commands and durable delivery](./execution-and-delivery.md#commands-and-durable-delivery).

### Implemented story initialization

`story` stores ownership, an immutable source key, a narrative revision, a snapshot view version and creation time. `story_passage` stores a story-scoped ordered sequence, versioned presentation content and an optional published interaction. A unique `(story_id, sequence)` prevents duplicate chronology positions; the current revision selects the current passage. Both rows are created in one transaction. There is no general inventory system, cumulative fictional clock or lifecycle-wide progression status yet. Timed decisions use the separate fields described below. Pause/resume changes the view version without adding a narrative passage.

`@offscreen/application/stories` is the public application facade. Initialization, continuation commit, interval/decision timing and snapshot/history reads live in story-local modules; HTTP and authored fixtures still call the facade. Its server-selected input includes the content and interaction specification; it assigns passage/interaction identities once. Repeating the same story ID checks owner, source and original opening content, then returns the saved snapshot. Conflicting content cannot replace an existing story. Reads join the current passage in one query. JSON is runtime-validated on write and read; ownership is derived from the session, not a browser DTO.

The browser receives a story ID, narrative revision, current passage content and offered interaction. It receives no source code, effect instructions or owner information. Migration `0004_story_initialization` introduces these tables. Player choice resolution, consequential effects and listing retained stories remain subsequent operations.

### Implemented passage generation provenance

Migration `0011_passage_source_generation` adds nullable `source_generation_id`. A generated opening or continuation passage names the generation whose validated output published it. Chamber fixtures keep this null.

Migration `0013_passage_source_generation_part` adds nullable `source_generation_part`. Allowed values are `current` and `arrival`. Null means the older single-publication form, including v1 opening passages. One timed continuation generation can publish two passages: the in-progress current part immediately, and the prepared arrival later. A non-null part requires a generation id. Continuation retry identity includes this provenance, so changing it cannot reuse a committed transition. Hidden option intentions remain only on generation output; public story and wait DTOs omit them. Interval completion copies the waiting passage's generation id and sets part `arrival` without parsing model output.

### Implemented continuation commit component

The internal `stories.append({ ownerId, storyId, transitionId, proposed })` operation accepts an expected narrative revision, validated passage content and an optional new interaction specification. Under a story row lock it verifies ownership, checks for an already committed transition, rejects stale revisions, and inserts the next passage together with advancing the story revision. It assigns new passage/interaction IDs once. Migration `0005_passage_transitions` adds a nullable transition UUID and story-scoped uniqueness; opening passages keep that field null.

An identical retry finds its original transition before checking the current revision, so a lost acknowledgement remains recoverable after later progression. Reusing the ID with a different expected revision, content or interaction conflicts. Successful calls return the current snapshot, which may already include a subsequent transition; this is not a command receipt promising that the returned scene belongs to that specific operation. Repeating initialization after progression still validates the original opening and returns current state.

Migration `0006_passage_responses` adds a nullable, versioned response payload to the resulting passage. When the current passage has an offer, append requires an answer referencing that exact interaction and one of its offered options; a continuation with no active offer rejects an attached answer. Validation happens under the same story lock as the commit. The response is part of retry identity: changing it cannot reuse a committed transition ID. The accepted answer is saved atomically with the consequence, while the original offer stays in its original passage. Existing passages retain null provenance rather than inventing an answer for them.

This component has no public arbitrary-content write endpoint. The chamber response endpoint calls it only with a server-selected authored consequence. It validates an answer against the saved offer but does not interpret its meaning, enforce story-wide pause, or invoke a storyteller. New responses record `player` or `default` provenance; existing unlabelled rows remain null. Participant identity and group submission attribution still need a reviewed membership contract. Replacing an unanswered offer is not permitted through this ordinary append path; future interruption needs explicit cancellation/invalidation semantics. Before connecting asynchronous gameplay or broader world effects, the same transaction must enforce the applicable command/control fences and commit supported effects. Do not call it directly with model or browser output and mistake shape validation for a legal consequence. The current bounded proposal contains no external callbacks or arbitrary state patches.

`GET /api/stories/:id/history` reads up to 20 committed passages newest first, with `nextBefore` as an exclusive sequence cursor for the next page (`?before=...`). The query authorizes ownership and reads passages in one statement, using the existing story/sequence index. It excludes any sequence above the current committed revision. A new append does not shift older pages; requesting the latest page again discovers newer entries. An exhausted range returns an empty page, while an inaccessible story returns 404 even for an exhausted range. Cursor input must be a positive PostgreSQL integer. Historical DTOs contain passage ID, sequence and presentation content, omitting past interaction controls and server metadata. This endpoint supports reading history, not resubmitting a past choice or assembling a model's context.

### Implemented fixed wait

Migration `0007_passage_intervals` adds nullable `wait_plan` and `due_at` to a passage, constrained to be present together. A version-1 plan has bounded real duration (1 second to 24 hours), a positive fictional duration in milliseconds, and one validated prepared arrival with content and an optional offer. These limits constrain the first supported operation, not character lifetime. The plan is server-selected; it is not accepted from the response endpoint. A passage cannot simultaneously open an interaction and start this wait.

A continuation transaction saves the plan, computes its due time using PostgreSQL time, and inserts an outbox notice with the new passage ID. Duplicate admission preserves the original deadline and verifies the same plan. Ordinary append cannot replace an active wait. Worker completion reloads the interval after acquiring the story lock, checks pause state and due time, then commits the prepared arrival atomically. A stale completion is a no-op. Pause stores the remaining duration; resume assigns a new due time. The previous due timestamp is retained while paused but cannot authorize completion. General narrative-wait pace changes and generation control epochs remain unimplemented.

The public snapshot includes nullable `waiting` with the fictional duration, control availability/revision and either a running due timestamp or paused remaining milliseconds. Paused snapshots expose no due timestamp. It never includes the prepared arrival. History remains committed prose; a future event is not added before it happens. An interval is not an entire world clock: the initial fixture maps a fixed fictional duration to a fixed real wait, without a cumulative calendar or adjustable pace.

A generated continuation result may translate into this same wait plan. The storyteller supplies only fictional duration. Application policy chooses the real wait; the scripted generated fixture uses two real seconds and is not campaign pace. Arrival publication keeps the same generation id with part `arrival`.

A `story_control` receipt has a unique story/operation ID and the validated original request. Owner authorization precedes receipt lookup; identical retries return current state, and conflicting reuse fails. Receipts, interval changes, view-version advancement and wake notices commit together. `view_version` is initialized from narrative revision for existing stories, then increases for each passage or control change. Clients use it to reject older snapshots even when prose has not changed.

### Implemented decision deadline

Migration `0009_decision_deadlines` adds `decision_plan`, `response_due_at` and `response_source` to passages. The plan and deadline must both be null or present; a timed decision requires an interaction and cannot coexist with a journey wait. The version-1 plan stores a response duration (1 second to 24 hours), an offered default option ID and a prepared consequence. Application validation rejects an unoffered default before publication. A null plan means no automatic response deadline; it does not define the entire story's clock policy.

Snapshots expose only the due timestamp and default option ID, not the prepared consequence. The common commit validates new answers against the deadline under the story lock. A worker applies the stored default only when due and still current, through that same commit path. New resulting passages label response source as `player` or `default`; this is provenance, not authorization supplied by a client. History remains committed content and does not reveal future defaults' prose. See [execution](./execution-and-delivery.md#implemented-solo-response-deadline) for admission and retry semantics.

### Implemented item transfer

Migration `0010_item_transfers` introduces `story_item`, keyed uniquely by story and item key, with a label and current holder key. The current solo fixture publishes all of its known items; this is not a secret inventory or multiplayer visibility model. Holder keys identify authored actors within a story, not authenticated users or a complete entity registry. The fixture source is responsible for meaningful holders. Do not infer permission to control an actor from its holder key.

Initialization seeds at most 50 uniquely keyed items and records that original seed on the first passage. An initialization retry checks the original seed instead of resetting current possession. Snapshots read the scene and ordered item list in one database statement, avoiding mixed revisions. The fixed bound is an initial content limit, not a promised long-lived inventory capacity; item creation and paginated inventories are not implemented.

A continuation may include up to 20 explicit `item.transfer.v1` effects with item key, expected holder and new holder. Under the story lock, each update checks the story-scoped identity and current holder. A missing item or mismatched holder rejects the entire transaction, including preceding effects and prose. The passage stores its effect list; identical retries skip application, while changed effects under the same transition ID conflict. Browser requests still contain only the selected answer, never effect instructions.

This supports immediate authored transfers. Prepared arrivals and timeout consequences do not yet accept effects; extending them requires the same validation at activation, not applying future effects during preparation. Quantities, currency, consumption, equipment, trading, arbitrary attribute patches and shared-item contention remain outside this component. A stable identity and explicit transfer do not establish a general economy.

### Planned story records

| Record family | What it owns |
| --- | --- |
| Users, sessions, linked identities | Authentication library-managed identity and session data. |
| Stories | Owner, lifecycle, current narrative revision, settings version, control epoch, stable workflow ID, current situation and fictional time. |
| Drafts and preview candidates | Editable source revision, roster/readiness references, generation operation, candidate provenance and frozen start selection. |
| Memberships and invitations | Who can read, act or administer a story; invite expiry and redemption. |
| Characters | Story-scoped identity, controlling membership, descriptive traits, capabilities and relevant conditions. |
| Chronology entries | Ordered committed passages, actors, choice provenance, fictional time and causation. |
| Commands, decisions, options and submissions | Durable command receipts/sequences, an open choice, eligible characters, version, published deadline, submitted intentions and a frozen resolution input. |
| Continuations and timing projections | Prepared conditional material, expected revision, next displayed due time and pause remainder. Temporal executes the timers. |
| Entities and relationships | Significant people, places and objects, with explicit references and flexible descriptions. This family is for identities that have earned persistence, not implied background population. One table, typed tables, or another representation remains undecided until a gameplay slice needs it. |
| Generation runs and attempts | Why inference ran, input revision, policy/prompt versions, attempts, result reference, usage and completion state. |
| Budget accounts, reservations and usage entries | Funding scope, period limits, concurrent reservations and measured charges. |
| Outbox and delivery records | Durable work to publish, notification deduplication and delivery attempts. |
| Media and context artifacts | Image references, summaries, source coverage and version information. |
| Member reading progress | Last displayed chronology sequence per member/story, independent of notification delivery or game progression. |

Some families can share a table initially. The purpose is to assign responsibility, not manufacture a large ER diagram. A story passage is not automatically both an `event` and a `node`. A workflow timer is a control-flow obligation, while a chronology entry is something that actually happened. Keep Temporal's persistence separate from application migrations and ORM access.

## Interaction contract component

Engine result admission stays on [admitted action and time](../engine/mechanics-and-capabilities.md#admitted-action-and-time). Storyteller publication stays on [what publication is allowed to do](../storyteller/generation-and-publication.md#what-publication-is-allowed-to-do).

Mechanical campaign offers have a separate private authority record. `campaign.offer` is the current public projection. `game_offer` owns the corresponding private immediate-action plans, story identity and narrative-revision fence. Public leaves contain no plan key beyond their offer-local option identity and expose no DC, outcome branch or effects. Replacing an offer inserts a new immutable private record before updating the current projection; selection loads it by story, offer and revision. Old records remain evidence but cannot authorize a current roll.

`@offscreen/contracts/interactions` separates an interaction specification from a submitted answer. A published interaction has its own UUID and a versioned specification; a submission references that UUID and carries a versioned answer. Neither includes a next-scene reference, state changes, actor authority or scheduling commands. The application must load the authoritative current offer rather than accept an offer supplied by the browser.

The first supported format is `choice.v1`: a prompt, a variable-length list of options with stable IDs, labels and optional descriptions, and an answer containing one option ID. Option identity does not depend on list order or display text. Duplicate option IDs and empty option lists are invalid. Current payload limits permit 1–100 options, 100-character reference IDs, 500-character labels and 2,000-character prompts/descriptions. These are bounded input limits, not a recommendation to show 100 buttons or a fixed gameplay option count.

The validator checks answer shape, interaction identity and membership in the offered options. It does not check ownership, deadlines, pause state, command deduplication or apply consequences; those belong to transactional command admission and resolution. Once published, an offer's response meaning must remain stable. Replacing it requires a new interaction identity so an old button cannot select an unrelated new outcome. A stored chronology entry and a published interaction have different identities and purposes.

Additional supported formats can add their own specification/answer variants and matching validation and rendering. Text interpretation or multiple selection may also need new resolution policy; versioning does not make those semantics automatic. Images used to illustrate an existing choice need not change its selection semantics. Unknown formats and extra fields are rejected, not stored as an unrestricted JSON escape hatch. No form-builder registry or universal rule interpreter is introduced. The first chamber stores and displays a single-selection offer; the chamber connects player submission to an authored narrative consequence; one immediate item transfer is supported. Generated live options resolve asynchronously through `/resolutions/...`, including a timed continuation that uses the ordinary wait plan. Live provider calls remain unimplemented.

## Story snapshot and chronology

**Knowledge root consistency with forks (2026-11-19):** A fork from any committed scene uses that scene's mechanical checkpoint and its canon root together. The checkpoint is the engine's reconstructable mechanical record. The canon root is the campaign document manifest committed at that same boundary. Historical inspection and fork initialization read that pair. They do not pair an old passage with today's item table, today's lore, or a search index. What is true, whose belief it is, when it became valid, and which branch may see it are defined on [Scene-rooted canon](../storyteller/canonical-documents-and-packages.md#scene-rooted-canon-and-fork-safe-publication--selected-target-2026-11-19). This is a logical atomicity requirement, not a demand that all records live in one file. Search indexes, Cognee, and vector stores are rebuildable aids, not authority. This page does not install them. Retention and garbage collection must preserve every ancestor root and immutable object still needed by a supported scene or fork. A full snapshot, a snapshot plus deltas, or a versioned immutable manifest is acceptable only when it reconstructs the same pair and cannot see later parent or sibling facts. The logical `offscreen.scene-checkpoint.v1` field contract in this section is selected. Its bytes are a content-addressed object with `stateSchemaVersion` 1. [`story_scene_checkpoint`](../../../packages/db/src/schema/stories.ts) points at that hash and records the canon root and revision for the same story and scene sequence. A row whose object is missing or whose hash does not match is not a checkpoint. An identical insert is idempotent. A different hash for that sequence conflicts and does not overwrite the stored hash. A rolled-back transaction leaves no row. An S3 failure stays unavailable and does not write the local store. [`insertSceneCheckpointReference`](../../../packages/application/src/stories/scene-checkpoint.ts) inserts the selector only. It does not update `story`. Supported openings and continuations stage the object before the short transaction, recheck the canon root and post-effect mechanics inside it, and insert the selector with the passage, document commit, and outbox. A failed object write does not fall back to the local store. Historical GET and the checkpoint fork reconstruct from that object. `forkCurrent` does not. Current SQL and document ownership otherwise remains as stated on this page.

**Selected future completeness requirement (2026-11-19):** In addition to the current live snapshot and ordered passage history, **each committed scene must expose or identify a durable, immutable, reconstructable state checkpoint** paired with the canon root named above. The checkpoint is suitable for faithful historical inspection and a new independent story fork at that scene. The checkpoint's authoritative state includes relevant character/rules capabilities, consequential world facts, possession/item ownership or resource quantities when present, fictional time, commitments/activity state, control/version context and provenance. The history must not silently substitute the latest mutable tables for historical state. Retain a source-faithful passage and any publication-bound presentation metadata as separate but linked historical content. A book leaf is not this checkpoint. Do not infer that one database row per scene containing every table is required. The quiescent checkpoint is one content-addressed object plus the SQL selector. Active work stays rejected until a later change can represent it without marking it complete.

**Current reconstruction:** `GET /api/stories/:id/scenes/:sequence` and a fork whose scene has a `story_scene_checkpoint` row read that object. They do not substitute the live `campaign` or `story_item` tables. The `story_passage` history API remains prose-only. The journal must stay read-only for commands: a historic interaction is not `canRespond`. `forkCurrent` still copies live rows only for revision 1 when no checkpoint exists, and it still refuses a later revision. A missing checkpoint is `not_found` or `fork_unsupported_revision`, never a live-table rebuild. Search indexes are not authority. The sword/king isolation proof is the application test; this page does not archive a journal E2E.

### Scene checkpoint v1

This is the selected logical contract. `sceneCheckpointSchema` parses the quiescent subset, and the document store addresses the canonical bytes by SHA-256. `story_scene_checkpoint` stores the hash, the canon root, and the schema version. It does not store a second copy of the payload. It is not a historical fork. `initializeStoryInTransaction` and `commitStoryContinuation` insert the selector for supported openings and continuations. A second publication of the same transition does not insert a second row. A scripted continuation with no suggestion field still commits.

`format` is `offscreen.scene-checkpoint.v1`. `stateSchemaVersion` is `1`. A change of meaning is version 2. An unknown key is rejected. The checkpoint is immutable after the publication fence. The engine is the only writer. The Storyteller returns proposals and does not commit the checkpoint or the canon root. There is no Game Economy service and no second writer.

**Long-term promise.** Every committed scene remains reviewable, and a player can fork an independent story from any committed scene. The fork sees that scene's mechanical checkpoint and that scene's canon root together.

**POC subset.** The first supported historical read and non-current fork is a quiescent checkpoint only: the copied fields below, with `holds` empty, `offer` null, `acceptedActivityPlan` null, `activeActivityId` null, `activeActionOperationId` null, no decision deadline, no wait, no pending resolution, and no world-obligation row. Any other active work is rejected. Rejection does not substitute the latest SQL rows. The long-term promise still includes those scenes once a later change can represent pending work without marking it complete or cloning it. This page does not build that later change.

A start is checkpoint-eligible only when it stages that quiescent campaign checkpoint: a non-mechanical Storyteller opening, no world-obligation row, and no active offer or hold. A mechanical opening, including `microbe.v3`, and a start package that contributes an executable obligation are outside v1. They may commit the story and must not receive a fabricated selector. When a start is eligible, the same SQL transaction re-reads the staged checkpoint object and compares it with the committed initialization. A missing or corrupt object, or a checkpoint that does not match that state, rolls the story, passage, and selector back together. An identical retry keeps the same selector. A different pace on that retry conflicts and leaves the selector unchanged.

**Identity.** Story, passage, interaction, activity, obligation, offer, execution, and operation ids are story-scoped UUIDs. The checkpoint records the parent ids. A fork mints new ids and must not alias the parent's later rows. Item keys, holder keys, fact ids, skill ids, quantity ids, activity-occurrence scope keys, and condition ids are stable business keys: the fork keeps the key and changes `storyId`. Content hashes and package-root hashes are shared byte ids. A provenance UUID that is not a foreign key, such as `storyFacts[].declaredBy`, stays unchanged and must not authorize a live read of the parent row.

**Negative fixture.** Parent scene 10 has the king alive, `sword-a` held by the character, and `gameSecond` at that fence. Parent scene 20 has recorded the king dead, moved the sword, and advanced the clock. A fork from scene 10 still has the king alive, the scene-10 holder, the scene-10 clock, and the scene-10 canon root. It does not inherit today's sword holder, a later clock, or a future canon root. A sibling that kills the king is not this fork's present.

### Publication fence

A checkpoint exists at a published `story_passage` and at no quieter boundary.

Scene sequence is `story_passage.sequence`. **Scene 1 includes the opening.** `initializeStoryInTransaction` writes passage 1, the initial `story_item` rows, and the bootstrap canon root when documents were staged. That transaction is the scene-1 fence. There is no scene 0. A draft that has not started has no checkpoint. A started story with no `campaign` row has an explicit mechanics-absent checkpoint: no character, no clock, and no invented items.

A clock tick, a book-leaf turn, a viewer acknowledgement, a provider attempt, an outbox notice, and a search-index update are not scenes and do not rewrite an older checkpoint.

The later-scene fence is `commitStoryContinuation` after `lockOwnedStory`. One SQL transaction applies that passage's item effects, inserts the passage, promotes a staged canon root when `commitStagedStoryPublication` runs, and captures the post-admission state. A failed item precondition rolls the effects, the passage, the root, and the checkpoint back together. The same transition id returns the committed result and does not write a second payload. Objects may be staged before the SQL commit. Object storage is not the transaction coordinator. A mechanical commit between publications stays on the live tables until the next publication. It does not change the previous checkpoint. The next publication includes those already-committed effects because it locks the story and reads the post-admission state. It does not mix in a writer that has not committed.

`gameSecond` and `clock` (`gameTimeProgressSchema`) are the fictional instant at the fence. A historical read returns those stored values. It does not call `projectCampaignClock` against the parent's `clockAnchorAt`. A fork writes a new `clockAnchorAt` at fork-commit time and does not add the parent's elapsed wall time.

### Mutable field inventory

Handling is one of four classes. **Copied** means the payload contains the validated value at the fence and the fork inserts its own row from that value. **Reference** means the payload stores an id or hash of an immutable earlier record and the fork reuses the bytes. **Rejected** means active or unsettled work is not cloned and is not marked complete; the POC refuses the historical read and the fork. **Excluded** means the column is not scene truth.

Inspected modules, not modified here: `packages/db/src/schema/stories.ts`, `packages/db/src/schema/campaign.ts`, `packages/db/src/schema/storyteller.ts`, `packages/application/src/stories/initialization.ts`, `continuation.ts`, `forks.ts`, `reads.ts`, and `packages/documents/src/schema.ts`.

| Field | Class | Validator, version, stable id | Fork |
| --- | --- | --- | --- |
| `story.id` | Reference | UUID | New story id. Lineage records the parent id. |
| `story.owner_id` | Excluded | Account id | The caller owns the fork. Memberships are not copied. |
| `story.source` | Copied | Text | Copy the creation source string. |
| `story.premise` | Copied | JSON value captured at start | Copy. |
| `story.storyteller` | Copied | Captured profile JSON | Copy the captured value. Do not copy `storyteller_preset`. |
| `story.execution` | Copied | Captured execution JSON | Copy. |
| `story.usage_policy` | Copied | Policy JSON, not a balance | Copy the policy. Funding balances stay excluded. |
| `story.continuity_notes` | Rejected unless null or `[]` | Private notes | POC refuses any other value. A note is not an item. Notes published after the fence are excluded. |
| `story.active_scene_scope` | Copied only for `active-scene-anchor.v1` whose passage ids sit inside the ancestor prefix | Versioned anchor | Remap `requiredPassageIds` to fork passage ids. Any other shape is rejected. |
| `story.document_root_hash` | Reference | 64-hex SHA-256, or null with revision 0 | Ancestor hash stays provenance. The fork's current root is the branch manifest in [Inherited manifest campaign id](../storyteller/canonical-documents-and-packages.md#inherited-manifest-campaign-id). |
| `story.document_root_revision` | Reference | Integer paired with the hash | Parent revision stays provenance. A new fork manifest starts at revision 1 when it aliases entries, or 0 when the parent root was null. |
| `story.forked_from_*` | Excluded from the copied payload | Parent lineage of the parent | The fork writes its own `forkedFromStoryId`, `forkedFromPassageId`, and `forkedFromSequence`. |
| `story.revision` | Copied as `sceneSequence` | Positive integer, the passage sequence | The fork's own revision starts at 1. The parent sequence is lineage. |
| `story.view_version` | Excluded | Browser ordering | Fork starts at 1. |
| `story.created_at` | Excluded | Wall clock of the row | Fork sets its own. Not fictional time. |
| `story_document_commit` | Reference | Root hash, root revision, and the publication operation id at the fence | Do not copy the parent operation log into the fork's command namespace. |
| `story_passage.id` | Reference on the payload | UUID | New passage UUID. |
| `story_passage.story_id` | Copied with remap | Parent story UUID | Fork story id. |
| `story_passage.sequence` | Copied as `sourceSequence` | Parent sequence | Fork row is sequence 1. Ancestor prose stays reachable through the inherited manifest entries. |
| `story_passage.transition_id` | Reference | Parent causation UUID, null on the opening | Fork row is null so a parent retry is not a fork command. |
| `story_passage.response`, `response_source` | Copied | Already admitted answer | Copy. This is not a pending submission. |
| `story_passage.initial_items` | Copied | `storyItemsSchema` when present | Opening declaration only. Later scenes do not read it as the current holder. Scene 1 agrees with `story_item`. |
| `story_passage.effects` | Copied | `item.create.v1` or `item.transfer.v1` list already applied | Copy the list. Do not apply it again. |
| `story_passage.decision_plan`, `response_due_at` | Rejected when non-null | Open or timed decision | POC refuses. Do not clone the window as answered or as already expired. |
| `story_passage.wait_plan`, `due_at`, `remaining_ms` | Rejected when a wait is present | Running timer | POC refuses. Do not clone the timer as a completed arrival. |
| `story_passage.control_revision` | Copied on the passage snapshot | Nonnegative epoch at the fence | Do not copy `story_control` receipts. Fork controls use the fork's own epoch. |
| `story_passage.content` | Copied | Legacy inline JSON when the hash is null | Copy the prose bytes. Not item authority. |
| `story_passage.content_document_hash` | Reference | `offscreen.source-passage.v1` SHA-256 | Reuse the hash. |
| `story_passage.interaction` | Copied when no decision deadline is present | Published `choice.v1` specification | Fork assigns a new interaction UUID. A parent submission cannot answer it. |
| `story_passage.appearance` | Excluded from mechanical authority | Presentation envelope | It may remain on the passage copy. It cannot move an item, a clock, or a canon fact. |
| `story_passage.source_generation_id`, `source_generation_part` | Reference on the parent payload only | Generation UUID | Fork stores null so one paid attempt is not spend on two stories. Do not copy the generation row. |
| `story_passage.created_at` | Excluded | Wall clock | Fork sets its own. |
| `story_control` | Excluded | Idempotency receipt | Not copied. |
| `story_resolution` | Rejected when any row exists | Pending generation | POC refuses. Do not mark it succeeded on the fork. |
| `story_item.story_id` | Copied with remap | Parent story UUID | Fork story id. The unique key is `(storyId, key)`. |
| `story_item.key`, `label` | Copied | `storyItemReferenceSchema`; label text | Same key, new story. Not a parent-row alias. |
| `story_item.holder_key` | Copied | Holder at the fence | Scene 10's holder stays. Scene 20's holder is a different checkpoint. |
| `story_item` with zero rows | Copied | Empty list | Legal mechanics. Do not invent items. |
| `story_viewer_visit`, `story_viewer_visit_open`, `story_viewer_visit_ack` | Excluded | Per-viewer reading progress | Not copied. |
| `story_public_inspect_target` | Excluded | Current inspect handles | Not historical mechanics. |
| `custom_intent_candidate` | Excluded | Noncanonical candidate | Never cloned into an accepted action. |
| `campaign.story_id` | Copied with remap | Parent story UUID | Fork story id. |
| `campaign.settings_revision` | Copied | Integer | Fork includes `campaign_settings` revisions `1..settingsRevision` and no later revision. |
| `campaign.locked` | Copied | Integer 0 or 1 | Copy. |
| `campaign.character` | Copied | `characterSchema`, or null | Null means no character. It does not mean HP 0. HP, abilities, skills, facts, and quantities are this snapshot. Quantities are not a second `story_item` ledger. |
| `campaign.story_facts` | Copied | `storyFactsSchema` | Fact id stays. `declaredBy` stays as provenance. |
| `campaign.activity_occurrences` | Copied | `activityOccurrencesSchema` | `scopeKey` stays. A count is not a running activity. |
| `campaign.accepted_activity_plan` | Rejected when non-null | `acceptedActivityPlanSchema` version 1 | Null is copied. A non-null plan is active work. POC refuses. |
| `campaign.content` | Copied | JSON already stored by the campaign writer, or null | Descriptive content. Not item authority. |
| `campaign.location` | Copied | Text or null | Copy the fence value. |
| `campaign.game_second` | Copied | Nonnegative integer instant | Do not project it forward. |
| `campaign.clock` | Copied | `gameTimeProgressSchema`, including remainder | The fence instant. Do not earn further seconds from the parent anchor. |
| `campaign.clock_anchor_at` | Rejected as a live parent anchor | Wall-clock timestamp | The payload stores the fictional instant above. The fork writes a new anchor at fork-commit time. |
| `campaign.clock_pace` | Copied | `paceSchema` | Copy. Pace is not elapsed time. |
| `campaign.holds` | Copied only when `[]` | `campaignHoldsSchema` | A hold points at an operation, generation, offer, or obligation. Non-empty holds are rejected. Do not drop them and let the clock run. |
| `campaign.offer` | Rejected when non-null | Public mechanical offer | Null is copied. An open offer is not a completed action. |
| `campaign.situation_authorization` | Copied when `offerId` is null and `preparedPlans` is empty | `situationAuthorizationSchema` version 2 | Any prepared plan or offer id is rejected with the offer. |
| `campaign.active_activity_id` | Rejected when non-null | Activity UUID | Null is copied. |
| `campaign.active_action_operation_id` | Rejected when non-null | Operation UUID | Null is copied. |
| `campaign.world_conditions` | Copied | `worldConditionsSchema` | Condition identity stays. A condition admitted later is absent here. |
| No `campaign` row | Copied | `mechanicsAbsent: true` | Do not invent a character, a clock, or items. |
| `world_obligation` | Rejected for the POC when any row exists | Mutable `pending`, `fired`, or `cancelled` row | The live row is not an as-of slice. POC refuses. Long-term, the payload stores id, revision, state, and `dueGameSecond` at the fence; pending work is not inserted as fired and does not keep the parent's timer; a settled row is a reference and is not re-fired; the fork remaps id. |
| `world_obligation_event` | Reference, long-term, for events at or before the fence `gameSecond` | Append-only event id | POC does not clone them. Later events are excluded. Do not replay them as new effects. |
| `campaign_settings` | Copied through the captured revision | `(storyId, revision)` immutable pair; settings and profile JSON | Remap `storyId`. Keep revision numbers. Exclude a later revision. |
| `campaign_command` | Excluded | Idempotency receipt | Fork has a new causation namespace. |
| `game_offer` | Rejected for the POC when any row exists | Private plans keyed by offer id and `narrativeRevision` | Live rows are not an as-of slice. Long-term, an offer at or before the scene sequence is evidence and cannot authorize a current roll. The fork does not copy an open plan. |
| `game_activity` | Rejected for the POC when any row exists | `plan`, `state`, `boundaries_settled`, `revision`, `progress` | Long-term, only a settled activity may be copied, with a new id. Running or paused progress is not marked settled. |
| `game_activity_event` | Reference, long-term, at or before the fence `gameSecond` | Append-only cause key | POC does not clone them. Do not re-apply them. |
| `campaign_report` | Excluded, and rejected while `state` is pending | Derived report | `factual_summary` is not inventory. POC refuses a pending report. A published report is not copied as state. |
| `game_roll` | Reference | Settled `(operationId, segment, checkKey)` at or before the fence `gameSecond` | Do not copy the row, do not reroll, and do not re-apply `effects`. A later roll is excluded. |
| `campaign_consequence` | Reference | Receipt whose `baseRevision` is at or before the scene | Do not copy the operation id into the fork and do not re-apply the receipt. |
| `game_action_receipt` | Reference | Settled offer consumption | `outcome_text` is not inventory. Do not re-apply effects. |
| `game_action_execution` | Rejected when `state` is `running`, `paused`, or `interrupted` | Execution UUID | Settled executions are references and are not re-settled. POC does not clone them as running work. |
| `game_action_execution_event` | Reference, long-term, at or before the fence `gameSecond` | Append-only revision | POC does not clone them. |
| `story_public_event` | Excluded | Projection. The schema comment says it is not game authority | Do not rebuild a checkpoint from it. A later king-death event is not an earlier scene. |
| `storyteller_preset` | Excluded | Owner library | The captured profile on the story and on `campaign_settings` is the pin. |
| Every table in `packages/db/src/schema/storyteller.ts` | Excluded | Publication, context capture, memory exploration, dispatch review, funding, run, operation, attempt, usage, retry, prompt provenance, execution stage | Provider and billing operations. A fork copies none of them and performs no inference. Do not snapshot payloads, keys, or balances. |
| `offscreen.document.v1`, `offscreen.structured-document.v1`, `offscreen.source-passage.v1`, `offscreen.manifest.v1`, world, rule, and start manifests | Reference | Existing document validators. This contract does not change those formats | A markdown body or a structured document is not `story_item` authority. |

Pins on the payload are references, not new columns: the world-package roots, rule-package root, and start-package root already named by the ancestor manifest at the fence, plus the captured Storyteller profile. A library revision adopted after the fence is invisible. `outbox`, `generation`, and account tables are outside this inventory and stay excluded as delivery, provider, and account records.

Id remap for a fork is [Fork identity remap](../engine/lifecycle-and-compatibility.md#fork-identity-remap). The manifest `campaignId` rule is [Inherited manifest campaign id](../storyteller/canonical-documents-and-packages.md#inherited-manifest-campaign-id).

### Scene payloads

These are the checkpoint objects. The database stores a reference row for a staged object. It does not copy these fields into `story` or `story_item`. Supported publication writes that selector. Historical GET and the checkpoint fork reconstruct from this object; they do not copy later live rows.

**Scene 1, opening included.** An authored campaign publishes the opening with character HP 20, one `story_item` `sword-a` held by the character, `storyFacts` still without a king-death fact, `gameSecond` 0, empty holds, null offer, null wait, and null decision deadline. The king is alive as a document in the bootstrap canon root when that root was staged. `sceneSequence` is 1. `transitionId` is null. `initial_items` and `story_item` agree. A story with no campaign row uses the same format with `mechanicsAbsent: true` and `items: []`.

**Scene 2.** The publication fence transfers `sword-a` and commits a canon revision whose new document says the king is dead. The scene-2 payload has the new holder, the new root hash and revision, and the `gameSecond` committed in that transaction. The scene-1 payload is unchanged.

**No inventory.** An abstract or microbe campaign with no `story_item` rows uses the same format. `items` is `[]`. Absence is empty, not unknown, and not a reason to read a markdown possession into the checkpoint.

**Fork after scene 2 exists.** Forking scene 1 reads the scene-1 payload. The new story id, new passage id, and sequence 1 on the fork show HP 20, `sword-a` still held, the king alive, and `gameSecond` 0. The parent scene 2 stays swordless and records the king dead. The fork's later scene does not appear on the parent.

Keep a current snapshot suitable for rendering and generation, plus a durable sequence of committed entries. Update both in one transaction. This is not full event sourcing: rebuilding all state by replaying years of model prose is neither specified nor reliable.

Use a monotonic narrative revision for facts on which generation depends. Decision/submission versions protect editable intentions, while a control epoch fences in-flight results after an admitted pause or changed plan. Temporal cancels/replaces its timers; the commit epoch protects against late external completion. Notification delivery or telemetry updates do not change the narrative revision. Avoid one global version that makes an unrelated analytics write invalidate a costly model result.

A public `viewVersion` changes when snapshot-visible state changes even without new fiction: a decision submission becomes ready, a command settles, a pause completes or an image attaches. Use it for browser ordering; using narrative revision alone would hide these updates. Keep member reading progress separate so opening a page does not invalidate generation or broadcast a story change to everyone. Story/access versions, narrative revision and workflow Run ID are not interchangeable.

Record admitted and applied control epochs (or enforce an equivalent pending-control condition), so generation cannot start from the new epoch while an earlier disruptive command is still pending. Command receipts have terminal applied/rejected results with stable error codes; they are not the same as provider attempt status. Domain-operation uniqueness must survive Temporal history retention.

Entries have a unique `(story_id, sequence)` and a unique causation key for their originating resolution/action. A repeated execution can locate its committed result. A duplicated Temporal or delivery event does not create a second committed result. See [commands and durable delivery](./execution-and-delivery.md#commands-and-durable-delivery). A stale cache snapshot does not override the canonical SQL version. See [Redis boundary](./persistence-and-caching.md#redis-boundary). Preserve actual player or autonomous intent and committed outcome, not hidden reasoning. Product chronology is user content, separate from operational logs.

## Flexible without becoming untyped

Relational columns own identity, story scope, ownership, timestamps, status, quantities and versions. Versioned JSONB owns variable descriptive fields and constrained model payloads. Validate the payload schema on write and support explicit schema migration on read where needed.

Do not store the entire evolving world in one JSON blob or implement a universal entity-attribute-value framework. A small entity representation can support a wizard, creature or spaceship without generating a bespoke schema for each world. Promote fields to columns only when querying or enforcing them warrants it.

The model may introduce a temporary identifier for a new person or item. The application assigns the permanent identifier, validates references and maps temporary identifiers within the same accepted proposal. Model-supplied IDs must never gain access to another story.

## Selected document store

**Selected ENG05 contract, 2026-11-13.** Canonical prose and manifests are immutable content-addressed documents. PostgreSQL keeps mutable gameplay and the publication root. The store is not a second item or clock ledger.

Preserve the local store's semantics for every adapter: canonical JSON, SHA-256 identity, 1 MiB maximum, schema validation, hash checks on read, and typed `missing`, `corrupt`, `too-large` and `unavailable` errors. `put` is create-if-absent. A preexisting object is idempotent only when the bytes agree. Never overwrite a mismatched object. Do not fall back to model prose.

The selected second adapter is a private S3-compatible object store behind the existing `DocumentStore` interface, using an established client. `OFFSCREEN_DOCUMENT_STORE=local|s3`. Unset keeps today's behavior. Invalid S3 configuration fails startup. It must not silently publish to an unrelated local directory. No access keys in source, logs or the web client. No public or presigned reads for canonical documents. Viewer authorization happens before a hash is resolved.

Stage objects before the SQL root is promoted. S3 does not join the SQL transaction. A staged object with a failed commit is unreferenced garbage, not a published scene. A committed root with an unreadable object is typed unavailable or corrupt. Receipts stay. Do not invent substitute fiction.

No automatic deletion in this contract. Referenced objects stay until an explicit deletion policy. Do not delete by age. Do not migrate existing local objects implicitly. Remote mode for an existing story requires copy-by-hash, verify, and a separate cutover. Bounded retries are for transient transport only.

**Realization record, source-observed 2026-11-16:** `packages/documents/src/s3-store.ts` and `document-store-config.ts` implement the mode switch and S3 client. That is not a hosted-scale proof, not a backup scheduler, and not permission to put remote reads under a story lock. Production cutover still needs the ENG03 lock evidence. Disposable multi-process acceptance is the proof bar, not an in-process fake. The selected contract above stays. The tier row is [capability coverage](../../../STATUS.md#capability-coverage). Who may carry an object from this store across the API, a model request, or a staff read is [Platform trust boundaries](./security-and-trust-boundaries.md#boundary-map). The store contract in this section stays as written.

## Spatial model boundary

Spatial data is not implemented yet. Keep location identity and accepted travel connections independent of a map renderer. Do not require every narrative location to have grid coordinates, derive traversability from neighbouring cells, or derive all travel times from Euclidean distance. For a metric grid, coordinates need a map reference and declared scale. For diagrammatic or abstract settings, display coordinates carry no implied physical distance.

The candidate grid uses equal-sized cubic cells within a map. Optional regional/local maps would be separate maps with explicit relationships, not arbitrary recursive subdivision. Sparse storage is a candidate for largely empty worlds; a space setting must not require allocating all intervening empty cells. No map table, coordinate schema, pathfinding library or 3D rendering dependency is selected by these constraints.

Before movement is implemented, define how a journey identifies its source, destination, permitted route and progress at an interruption. That record must distinguish being at a place from travelling between places and support consistent cross-character interaction. Define the applicable progress rule instead of assuming elapsed-time fraction equals distance fraction. Changes to route conditions or an exceptional transition must invalidate incompatible planned arrivals. These are behavioral requirements, not a settled journey schema.

Map generation may combine procedural structure with model-authored meaning. Accepted geography must be validated for the selected world's connection and movement rules, then supplied as context for later generation. A visually plausible map is not evidence of reachability or coherent travel time. Shared spatial references must obey the same story isolation constraints as other domain data.

The common setup boundary concerns places, containment, connections and relevant conditions; a grid is one possible projection. Model-generated symbol layers could be an input for small maps, provided dimensions, symbol meanings, references and required reachability are validated. Code can fill repeated geometry while the model supplies meaningful content. Do not allocate or describe every empty cube, or assume a terrain-generation dependency can create coherent lore and movement rules for arbitrary settings.

Map visibility and retained spatial facts have different lifetimes. A storyteller proposal to leave or replace a map must not delete referenced locations, relocate other participants or reset an interrupted journey. Preserve established connections and consequential changes if a region may be revisited; unused visual detail need not remain in generation context. Route descriptions can inform encounter generation without tile-by-tile processing. The first movement contract should demonstrate that smaller representation before requiring a grid or introducing map lifecycle tables.

A generated condition is enforceable only when it maps to a supported application operation or predicate. Unknown conditions must not become executable code, silently pass validation, or masquerade as implemented mechanics. Narrative judgments can remain model responsibilities with recorded outcomes. Select the first supported mechanisms from playthroughs before introducing a condition schema or interpreter; no universal rule language is part of this design.

## Quantities and ownership

**One mutable authority per scarce fact.** Documents may describe SQL mechanics. They cannot move an item, a clock or a score by rewriting prose. A derived summary or search index is never a second mechanical ledger. Old settled receipts stay valid when a new effect family is added; a new effect must be applied explicitly and must not be silently ignored inside an older character-only effect function.

Use typed changes for consequential state: transfer a particular item, adjust a counted resource, apply or remove a condition, establish a fact, move an entity's narrative location. Do not let the model submit arbitrary SQL or unrestricted JSON patches.

For counted resources, specify units and precision. Use integer minor units or PostgreSQL numeric values, not floating-point money. Financial usage amounts require explicit conversion at JSON boundaries because JavaScript numbers cannot safely represent arbitrary database integers. Inventory currency remains distinct from the service's real-money inference budget. A counted fictional resource, when a world uses one, stays an engine fact. It is not a Game Economy service. Real SaaS billing, if isolation later justifies a separate process, stays a platform concern and never handles fictional merchants. Neither is a current separate schema. A shared cluster would still not let one role write another service's relations.

Enforce nonnegative balances where the fiction does not explicitly permit debt. Validate the giver owns what is transferred. If one character rescues another from an apple, their changes commit together; no intermediate public state should place the wizard both inside and outside it.

## Story isolation and indexes

Scope every domain record by story. Use composite foreign keys or equivalent constraints for story-local references so that a character in one story cannot be attached to a decision in another. Membership checks belong in application operations as well as HTTP handlers, since jobs and integration callbacks use those operations too.

Initial indexes should serve known queries: membership by user/story; chronology by story/sequence; unprocessed commands by story/sequence; open decisions by story; unpublished outbox notices; unresolved generation attempts and spend reservations. Add partial indexes for pending subsets where appropriate. Do not create a due-action polling index for an application scheduler we do not have, or broad JSONB indexes for fields we never query.

Cache keys include story, visibility and relevant revision, whether cached locally or eventually in Redis. Neither cached responses nor summaries can bypass membership checks. The cache mechanism stays on [Redis boundary](./persistence-and-caching.md#redis-boundary). Private character knowledge is not yet a first-version presentation feature; do not add accidental secrecy semantics through a cache key.

## Changes, retention and deletion

Settings and model-policy versions used for a generation are immutable snapshots or references to immutable versions. Changes take effect at a defined boundary; an in-flight generation does not silently switch configuration halfway through.

Capture context in a short consistent database read and persist its immutable input artifact before inference. Multi-step retrieval cannot mix a character from one revision with possessions from another: either read retained versioned facts or require the base revision to match and abort as stale if it changed. A final commit check prevents stale effects but cannot recover tokens already spent on inconsistent input. Artifact retention must cover unfinished/retryable workflow references, including paused stories; do not garbage-collect an artifact merely because its trace TTL elapsed.

Keep generated prose needed by the player, compact provenance needed to explain outcomes, and actual cost records. Full raw prompt/response traces have a separate bounded retention policy and restricted access. They may contain private player content.

Deleting a story first prevents further actions, invalidates pending work and removes access; subsequent cleanup removes media, derived artifacts and external traces where supported. Backup retention means physical removal is not instantaneous. Disclose that behavior when implementing account deletion. Do not expose a public story merely because its repository is public.

Temporal history may retain Activity arguments and results after application data is deleted. Pass compact references and minimal control metadata; never credentials or full prompts. Define namespace history retention and payload protection before hosting real stories. Operational history and the player's chronology are different records with different retention needs.

Who may use these stores for access, export, correction, revoke, or deletion is unratified in [Player data lifecycle](../../../work/designs/open/player-data-lifecycle/README.md#rights-matrix). This section does not set a retention period.

## Profiled storyteller storage

Drafts carry a nullable profile reference while incomplete. Started storyteller stories carry captured profile/execution JSON and private derived continuity notes. Each note has story-local identity and source passage evidence. Opening/current/arrival publication updates notes atomically with its passage; prepared arrival notes are not current facts. Profiled generation execution records publication status separately from generation state. Persistent funding accounts, runs and attempts use integer USD microunits; immutable attempt reservations survive uncertain dispatch. Accounting takes a global paid-admission advisory lock, then funding account before run/attempt, and never lock a story in that accounting transaction. Story publication never holds accounting locks. Effective spending stays on [distinct authorities](./spending-and-entitlements.md#distinct-authorities).

## Proposed service schemas and delivery records

Proposed target, recorded 2026-11-19, except where a sentence says current runtime. Process owners are [Proposed service ownership](./topology.md#proposed-service-ownership). Delivery classes are [Commands, business events, and workflows](./execution-and-delivery.md#commands-business-events-and-workflows). This section adds no table and no migration.

Current runtime: one application database. `compose.yaml` has one PostgreSQL service. Packages share that schema through `@offscreen/db`. `packages/db/src/schema/outbox.ts` defines `outbox` with a primary-key notice id, a topic, an operation id, availability, a lease, and a delivery timestamp. The schema directory has no inbox table. The words "durable inbox" on [Commands and durable delivery](./execution-and-delivery.md#commands-and-durable-delivery) mean stored command receipts that a workflow rereads. They do not name a second table. In-schema rows such as `story_public_event` are projections or chronology. The schema comment on `story_public_event` says it is not game authority. Those rows are not a cross-service broker and not a consumer dedup relation.

Proposed target: one schema per service, even when a laboratory cluster such as CloudNativePG places them on one logical PostgreSQL cluster. Placement is not ownership. Each service's database role can write only its own relations. Foreign keys do not cross service schemas. A join across those schemas is not the consistency mechanism. Temporal history stays in Temporal's store, not in these schemas.

Negative: a shared logical PostgreSQL cluster does not grant shared schema writes. The Storyteller role has no update on story or story-item relations. Web/API does not gain those writes by serving HTTP. A notification does not gain them by receiving a fact. There is no economy schema to share.

| Obligation | Rule | Label |
| --- | --- | --- |
| Outbox | The producer writes the notice in the same transaction as its state change. The notice id is stable across retries. Acknowledge it only after the downstream accepts it or the effect is already stored. | Current runtime for the Temporal relay. Proposed target for a later business event as well. |
| Inbox | Before a consumer applies a command or a business event, it inserts a unique row for that id. A conflict returns the stored result and does not run the mutation again. | Proposed target. Not a current table. |
| Event id | A UUID assigned by the producer. A redelivery uses the same id. It is not a Temporal Run ID and not a new id per attempt. | Proposed target. The current outbox primary key is the notice id. |
| Command id | A UUID assigned by the caller. It is the idempotency key. A consumer that reacts to a fact reuses the command id it already created for that fact. It does not mint a new one on replay. | Current runtime uses operation and transition ids inside the monolith. Proposed target for cross-service commands. |
| Aggregate key | Service, aggregate type, and aggregate id. Examples of the shape, not tables to create: engine and story, engine and story item, notifications and delivery. Not a market balance. | Proposed target. |
| Version | A monotonic integer per aggregate. The event carries the version that commit produced. A consumer applies that version once. | Proposed target. Current story narrative revision and transition id remain the monolith's fences. |

Schema evolution, proposed target: the type name ends in a version. An optional new field is compatible. A change of meaning is a new version. During a rolling deploy, v1 and v2 may both be in the outbox. A consumer leaves an unknown version unapplied. It does not rewrite the stored notice into an older type. Projecting an old payload for a person to read does not apply the effect again.

Cross-service consistency, proposed target: there is no distributed transaction. Today `commitStoryContinuation` locks the story, returns immediately when the same transition id already matches, and otherwise applies item effects and the passage in one transaction. A failed item precondition rolls both back. The engine keeps that effect. It does not hand a story-item transfer to a market service. A lagging notification does not mean the story commit failed, and it does not apply the effect again. Optional media and SaaS billing, if they ever exist, do not share the story schema and do not settle fictional merchants.

The engine is the single consistency boundary for a committed scene checkpoint. The completeness requirement stays on [Story snapshot and chronology](#story-snapshot-and-chronology). A future fork from any committed scene must reconstruct that scene's mechanical state from the engine's committed record. It must not assemble history by asking whichever service answers first. Web/API, the Storyteller, notifications, optional media, and SaaS billing do not own that historical state. A fork must not inherit later writes from the parent timeline. This is selected future behavior. The current journal and the current-only fork do not implement it. It is not proven and it is not built. A later Storyteller process consumes version-pinned task context and bounded, branch-scoped memory. It does not receive an unrestricted mount of all campaign files or a global graph as its private truth. It returns descriptive proposals with provenance. It does not commit the scene checkpoint or the scene's canon root. A Redis cache, an object listing, or a search index is a rebuildable aid. It must not leak later parent or sibling facts into a fork. [ARCH03](../../../work/changes/archive/2026-11/other/2026-11-19--arch03-branch-scoped-storyteller-knowledge/CHANGE.md) owns the retrieval and publication design. This page does not design that mechanism and does not install Cognee or any index. This limit is selected future behavior, not a built service.

Negative: a replay cannot duplicate an admitted roll, a story-item transfer, or another committed effect. An imaginary market is not a service. Redelivering the same command returns the stored result. A notification or a read model may store its own copy of the fact. That copy is not a new command and is not a second application of the effect. The current story path returns before `applyStoryItemEffects` when the transition id already matches, so the same effect list is not applied twice. That behavior is current runtime in `packages/application/src/stories/continuation.ts`. It is not a new proof run, and it is not a market ledger.

## Contract dependencies

| This claim | Relation | Governing claim | Why a change triggers review |
| --- | --- | --- | --- |
| [Proposed service schemas and delivery records](#proposed-service-schemas-and-delivery-records) | constrained-by | [Who owns the durable record](./data-and-persistence.md#who-owns-the-durable-record) | The current database remains one application schema. A proposed split does not move Temporal history into application tables. |
| [Proposed service schemas and delivery records](#proposed-service-schemas-and-delivery-records) | constrained-by | [Quantities and ownership](./data-and-persistence.md#quantities-and-ownership) | A shared cluster cannot create a second writer for the same scarce fact. |
| [Proposed service schemas and delivery records](#proposed-service-schemas-and-delivery-records) | co-change | [Commands, business events, and workflows](./execution-and-delivery.md#commands-business-events-and-workflows) | The inbox dedup and the delivery classes change together. A replay rule that lived on only one page could drift. |
| [Story snapshot and chronology](#story-snapshot-and-chronology) | co-change | [Forked continuities](../engine/lifecycle-and-compatibility.md#forked-continuities) | Fork id remap and the refusal to clone active work are the same checkpoint. A fork rule that copied today's sword holder would contradict this inventory. |
| [Story snapshot and chronology](#story-snapshot-and-chronology) | constrained-by | [Scene-rooted canon and fork-safe publication](../storyteller/canonical-documents-and-packages.md#scene-rooted-canon-and-fork-safe-publication--selected-target-2026-11-19) | The checkpoint is one half of the committed pair. The manifest campaign id rule on that page stops a fork from treating the ancestor root as its own campaign. |
