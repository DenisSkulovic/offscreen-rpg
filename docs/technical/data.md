# Data and consistency

Application PostgreSQL owns committed story state, chronology, command receipts, decisions and spend reservations. Temporal owns workflow history, timers and execution progress. Published deadlines are projected into PostgreSQL for display and admission checks; no database scheduler separately advances them. This is a proposed logical model; create migrations in working slices, not every table before the first screen.

## Durable records

### Implemented private draft

`story_draft` contains a UUID, an authenticated owner reference, three bounded text fields (`title`, `premise`, `storytelling_direction`), a positive revision and creation/update timestamps. Limits are 160, 6,000 and 2,000 UTF-16 code units respectively at the application boundary. PostgreSQL additionally bounds character lengths. Empty strings are permitted because saving an idea is different from approving it for generation. Text is preserved rather than silently trimmed or rewritten.

The premise currently contains both character intent and starting circumstances. Direction is separate so the same premise can be told differently. There is no settings blob, invented character taxonomy, gameplay inventory or runtime status on this record. Generated candidates and shared character inputs will need their own reviewed contracts when those components are built.

An owner/creation-time/ID index supports stable paginated reads. Timestamps use millisecond precision to preserve cursor comparisons through JavaScript dates. Owner deletion is restricted by the foreign key until account/story deletion policy is implemented. Public DTOs omit ownership; the server derives it from authentication. `@offscreen/contracts/drafts` owns runtime validation and transport types; `@offscreen/server/drafts` owns database operations independently of Nest and React. See [draft lifecycle](story-lifecycle.md) for concurrency and retry behavior.

### Implemented generation records

`generation` stores an owner, a versioned task kind, immutable JSON input, processing state, one attempt ID, validated output or a short failure code, and timestamps. `@offscreen/server/generations` supplies the common insert/read/claim/settle operations using task-specific input/output schemas. These are private server operations, not public response DTOs: inputs can contain application prompts. Each task kind must retain the schema needed to read its stored version.

Opening-specific behavior lives in `@offscreen/server/openings`. Its input contains the source draft ID/revision, exact content, prompt version, and exact messages/output schema. `draft_opening` points to the latest requested operation for each draft. Old operations remain readable by their owner; only the latest operation matching the current draft revision is current. This flag is a read-time observation, never authorization to start gameplay. Future Start must recheck under the appropriate transaction lock.

The generic record contains no draft, character, scene or timing fields. The opening module owns draft authorization, revision checking and the one-unresolved-request-per-draft rule. The test suite also uses the common lifecycle with a different input/result schema. There is no universal job dispatcher, subscription mechanism or database scheduler in this component.

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
| Entities and relationships | Significant people, places and objects, with explicit references and flexible descriptions. |
| Generation runs and attempts | Why inference ran, input revision, policy/prompt versions, attempts, result reference, usage and completion state. |
| Budget accounts, reservations and usage entries | Funding scope, period limits, concurrent reservations and measured charges. |
| Outbox and delivery records | Durable work to publish, notification deduplication and delivery attempts. |
| Media and context artifacts | Image references, summaries, source coverage and version information. |
| Member reading progress | Last displayed chronology sequence per member/story, independent of notification delivery or game progression. |

Some families can share a table initially. The purpose is to assign responsibility, not manufacture a large ER diagram. A story passage is not automatically both an `event` and a `node`. A workflow timer is a control-flow obligation, while a chronology entry is something that actually happened. Keep Temporal's persistence separate from application migrations and ORM access.

## Story snapshot and chronology

Keep a current snapshot suitable for rendering and generation, plus a durable sequence of committed entries. Update both in one transaction. This is not full event sourcing: rebuilding all state by replaying years of model prose is neither specified nor reliable.

Use a monotonic narrative revision for facts on which generation depends. Decision/submission versions protect editable intentions, while a control epoch fences in-flight results after an admitted pause or changed plan. Temporal cancels/replaces its timers; the commit epoch protects against late external completion. Notification delivery or telemetry updates do not change the narrative revision. Avoid one global version that makes an unrelated analytics write invalidate a costly model result.

A public `viewVersion` changes when snapshot-visible state changes even without new fiction: a decision submission becomes ready, a command settles, a pause completes or an image attaches. Use it for browser ordering; using narrative revision alone would hide these updates. Keep member reading progress separate so opening a page does not invalidate generation or broadcast a story change to everyone. Story/access versions, narrative revision and workflow Run ID are not interchangeable.

Record admitted and applied control epochs (or enforce an equivalent pending-control condition), so generation cannot start from the new epoch while an earlier disruptive command is still pending. Command receipts have terminal applied/rejected results with stable error codes; they are not the same as provider attempt status. Domain-operation uniqueness must survive Temporal history retention.

Entries have a unique `(story_id, sequence)` and a unique causation key for their originating resolution/action. A repeated execution can locate its committed result. Preserve actual player or autonomous intent and committed outcome, not hidden reasoning. Product chronology is user content, separate from operational logs.

## Flexible without becoming untyped

Relational columns own identity, story scope, ownership, timestamps, status, quantities and versions. Versioned JSONB owns variable descriptive fields and constrained model payloads. Validate the payload schema on write and support explicit schema migration on read where needed.

Do not store the entire evolving world in one JSON blob or implement a universal entity-attribute-value framework. A small entity representation can support a wizard, creature or spaceship without generating a bespoke schema for each world. Promote fields to columns only when querying or enforcing them warrants it.

The model may introduce a temporary identifier for a new person or item. The application assigns the permanent identifier, validates references and maps temporary identifiers within the same accepted proposal. Model-supplied IDs must never gain access to another story.

## Quantities and ownership

Use typed changes for consequential state: transfer a particular item, adjust a counted resource, apply or remove a condition, establish a fact, move an entity's narrative location. Do not let the model submit arbitrary SQL or unrestricted JSON patches.

For counted resources, specify units and precision. Use integer minor units or PostgreSQL numeric values, not floating-point money. Financial usage amounts require explicit conversion at JSON boundaries because JavaScript numbers cannot safely represent arbitrary database integers. Inventory currency remains distinct from the service's real-money inference budget.

Enforce nonnegative balances where the fiction does not explicitly permit debt. Validate the giver owns what is transferred. If one character rescues another from an apple, their changes commit together; no intermediate public state should place the wizard both inside and outside it.

## Story isolation and indexes

Scope every domain record by story. Use composite foreign keys or equivalent constraints for story-local references so that a character in one story cannot be attached to a decision in another. Membership checks belong in application operations as well as HTTP handlers, since jobs and integration callbacks use those operations too.

Initial indexes should serve known queries: membership by user/story; chronology by story/sequence; unprocessed commands by story/sequence; open decisions by story; unpublished outbox notices; unresolved generation attempts and spend reservations. Add partial indexes for pending subsets where appropriate. Do not create a due-action polling index for an application scheduler we do not have, or broad JSONB indexes for fields we never query.

Cache keys include story, visibility and relevant revision, whether cached locally or eventually in Redis. Neither cached responses nor summaries can bypass membership checks. Private character knowledge is not yet a first-version presentation feature; do not add accidental secrecy semantics through a cache key.

## Changes, retention and deletion

Settings and model-policy versions used for a generation are immutable snapshots or references to immutable versions. Changes take effect at a defined boundary; an in-flight generation does not silently switch configuration halfway through.

Capture context in a short consistent database read and persist its immutable input artifact before inference. Multi-step retrieval cannot mix a character from one revision with possessions from another: either read retained versioned facts or require the base revision to match and abort as stale if it changed. A final commit check prevents stale effects but cannot recover tokens already spent on inconsistent input. Artifact retention must cover unfinished/retryable workflow references, including paused stories; do not garbage-collect an artifact merely because its trace TTL elapsed.

Keep generated prose needed by the player, compact provenance needed to explain outcomes, and actual cost records. Full raw prompt/response traces have a separate bounded retention policy and restricted access. They may contain private player content.

Deleting a story first prevents further actions, invalidates pending work and removes access; subsequent cleanup removes media, derived artifacts and external traces where supported. Backup retention means physical removal is not instantaneous. Disclose that behavior when implementing account deletion. Do not expose a public story merely because its repository is public.

Temporal history may retain Activity arguments and results after application data is deleted. Pass compact references and minimal control metadata; never credentials or full prompts. Define namespace history retention and payload protection before hosting real stories. Operational history and the player's chronology are different records with different retention needs.
