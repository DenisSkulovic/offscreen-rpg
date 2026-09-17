# Data and consistency

PostgreSQL is the authority for story state, committed chronology, decisions, schedules and spend reservations. AI context, queues and caches are derived from or reconciled against that authority. This is a proposed logical model; create migrations in working slices, not every table before the first screen.

## Durable records

| Record family | What it owns |
| --- | --- |
| Users, sessions, linked identities | Authentication library-managed identity and session data. |
| Stories | Owner, lifecycle, current narrative revision, settings version, scheduling generation, current situation and fictional time. |
| Memberships and invitations | Who can read, act or administer a story; invite expiry and redemption. |
| Characters | Story-scoped identity, controlling membership, descriptive traits, capabilities and relevant conditions. |
| Chronology entries | Ordered committed passages, actors, choice provenance, fictional time and causation. |
| Decisions, options and submissions | An open choice, eligible characters, version, timing, submitted intentions and a frozen resolution input. |
| Continuations and scheduled actions | Prepared conditional material, due time, expected revision, state and invalidation generation. |
| Entities and relationships | Significant people, places and objects, with explicit references and flexible descriptions. |
| Generation runs and attempts | Why inference ran, input revision, policy/prompt versions, attempts, result reference, usage and completion state. |
| Budget accounts, reservations and usage entries | Funding scope, period limits, concurrent reservations and measured charges. |
| Outbox and delivery records | Durable work to publish, notification deduplication and delivery attempts. |
| Media and context artifacts | Image references, summaries, source coverage and version information. |

Some families can share a table initially. The purpose is to assign responsibility, not manufacture a large ER diagram. A story passage is not automatically both an `event` and a `node`. A scheduled action is an operational obligation, while a chronology entry is something that actually happened.

## Story snapshot and chronology

Keep a current snapshot suitable for rendering and generation, plus a durable sequence of committed entries. Update both in one transaction. This is not full event sourcing: rebuilding all state by replaying years of model prose is neither specified nor reliable.

Use a monotonic narrative revision for facts on which generation depends. A separate decision version tracks submissions, and a scheduling generation invalidates old timers. Notification delivery or telemetry updates do not change the narrative revision. Avoid one global version that makes an unrelated analytics write invalidate a costly model result.

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

Initial indexes should serve known queries: membership by user/story; chronology by story/sequence; pending scheduled actions by due time; open decisions by story; unpublished outbox work; unresolved runs and leases. Add partial indexes for pending subsets where appropriate. Do not create broad JSONB indexes for fields we never query.

Redis cache keys include story, visibility and relevant revision. Neither cached responses nor summaries can bypass membership checks. Private character knowledge is not yet a first-version presentation feature; do not add accidental secrecy semantics through a cache key.

## Changes, retention and deletion

Settings and model-policy versions used for a generation are immutable snapshots or references to immutable versions. Changes take effect at a defined boundary; an in-flight generation does not silently switch configuration halfway through.

Keep generated prose needed by the player, compact provenance needed to explain outcomes, and actual cost records. Full raw prompt/response traces have a separate bounded retention policy and restricted access. They may contain private player content.

Deleting a story first prevents further actions, invalidates pending work and removes access; subsequent cleanup removes media, derived artifacts and external traces where supported. Backup retention means physical removal is not instantaneous. Disclose that behavior when implementing account deletion. Do not expose a public story merely because its repository is public.
