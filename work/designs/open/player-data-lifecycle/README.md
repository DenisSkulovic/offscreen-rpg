# Player data lifecycle

**Status: Proposed. Not selected.** This page is an open design. It is not a product rule, not a technical contract, and not permission to implement. Owner review is required. Legal review is required. No jurisdiction is chosen. No retention period is chosen. No public export API is specified. No staff raw-prompt grant is made.

**Reader question:** For a player's access, export, correction, revoke, deletion, or objection, which stored class is already described, which request is still future, and which choice still needs an owner or legal review?

**Unique owner of that question:** this matrix. Storage shape stays on [Data and consistency](../../../../docs/technical/platform/data-and-persistence.md). Unratified retention candidates stay on [Replay, retention and privacy](../../../../docs/technical/observability/retention-and-access.md). Sessions stay on [Identity and access](../../../../docs/technical/platform/identities-and-access.md). The proposed staff privacy job stays on [Trust and privacy are a different mandate](../../../../docs/product/admin/commercial-and-trust.md#trust-and-privacy-are-a-different-mandate).

## Data classes

These classes are the stores named by those pages. "Implemented" means that page already labels the record as a realization. "Future" means the page lists it as planned, candidate, or not yet a player operation. This catalogue does not copy table schemas.

| Data class | Where the pages place it | Standing | Read and write the pages already describe |
| --- | --- | --- | --- |
| Sessions and linked identity | Better Auth sessions in PostgreSQL. [Authentication and sessions](../../../../docs/technical/platform/identities-and-access.md#authentication-and-sessions). The planned family also names linked identities. | Sessions are implemented. Invitations are a future product area. A full membership product is not selected. | A command or snapshot read checks membership and character control. The browser does not receive the owner id. |
| Private drafts | `story_draft`. [Implemented private draft](../../../../docs/technical/platform/data-and-persistence.md#implemented-private-draft). | Implemented. | The server derives ownership. Public draft DTOs omit it. Owner deletion waits on a deletion policy that is not implemented. |
| Generation inputs, outputs, and raw provider packets | `generation`, including immutable JSON input. [Implemented generation records](../../../../docs/technical/platform/data-and-persistence.md#implemented-generation-records). Raw packets are a separate candidate in [Retention classes](../../../../docs/technical/observability/retention-and-access.md#6-retention-classes-with-explicit-trade-offs). | Generation rows are implemented private server records. Raw-packet retention is unratified. | Inputs can contain application prompts. They are not public response DTOs. No staff raw-prompt read is granted. |
| Outbox notices | `outbox`. [Implemented execution notices](../../../../docs/technical/platform/data-and-persistence.md#implemented-execution-notices). | Implemented. | The notice has no prompt and no player content. Future deletion has to account for an outstanding notice. |
| Committed story rows | `story`, `story_passage`, items, offers, control receipts, and the profiled notes and funding rows in [Profiled storyteller storage](../../../../docs/technical/platform/data-and-persistence.md#profiled-storyteller-storage). | Those named rows are the realization. [Planned story records](../../../../docs/technical/platform/data-and-persistence.md#planned-story-records) still includes memberships, a character family, entities, media artifacts, and member reading progress as the selected family list, not as tables this proposal treats as present. | `GET /api/stories/:id/history` reads the owner's committed passages. It is a history read. It is not an export API. The browser omits owner, source, effect instructions, prepared arrivals, and hidden intentions. Ordinary append does not replace a committed passage. |
| Canonical documents | Local store and the S3-compatible adapter. [Selected document store](../../../../docs/technical/platform/data-and-persistence.md#selected-document-store). | The adapter is a source-observed realization. Moving PostgreSQL narrative bodies onto it is not complete. | No public or presigned read. No automatic deletion. A staged object with a failed commit is unreferenced garbage, not a published scene. |
| Temporal history | Workflow history, timers, and execution progress. [Who owns the durable record](../../../../docs/technical/platform/data-and-persistence.md#who-owns-the-durable-record). | Selected owner of control flow. Namespace history retention for hosted stories is not defined. | Activity arguments may remain after application rows are gone. Pass compact references. Do not pass credentials or full prompts. This record is not the player's chronology. |
| Caches, derived indexes, and telemetry | Redis is a cache, not the canonical record. Spans, logs, metrics, and derived views are candidates in the retention classes. | Unratified where that page already says so. Not a configured privacy job. | A cache cannot bypass a membership check. Derived data is not a second ledger. Telemetry is not the canonical replay source. |
| Audit, case evidence, and the commercial ledger | Staff-audit and trust-evidence classes on the proposed trust page. Funding accounts are described with profiled stories. Security and case rows are retention candidates. | The trust page is proposed. The funding rows are described as persistent. Candidate audit retention is not a legal period. | No direct ledger surgery. Staff cannot delete usage or rewrite a provider charge. The subject cannot clean their own audit log. |
| Backups | Named as a deletion limit in [Changes, retention and deletion](../../../../docs/technical/platform/data-and-persistence.md#changes-retention-and-deletion). | A limit, not a claimed backup product. The document-store realization is not a backup scheduler. | Physical removal is not instantaneous. |
| Provider-held copies | A processor copy on the trust page. Provider packets in the retention classes. | The copy may remain. Its contents are not assumed. Unknown provider data is unknown. | A provider charge without a publication does not automatically bill the player. Encrypting a secret does not justify collecting it. |

## Rights matrix

Each row is one purpose applied to one data class. A limit in the fourth column is only the sentence the named page already has. The fifth column is not decided here. Omission of a pair is the same as an open cell: it grants nothing.

| Purpose | Data class | Standing | Known limit from the named pages | Open decision |
| --- | --- | --- | --- | --- |
| Access | Sessions | Implemented check | Session validation and story authorization are separate. Every command and snapshot read checks membership. | Request verification: how a person proves a privacy access request. Needs owner or legal review. |
| Access | Another person's row | Ordinary read stays owner-scoped | An inaccessible story history is 404. Domain rows are story-scoped. A model-supplied id must not reach another story. | Identity and tenant scope when more than one person shares a story. Shared play is not selected on the identity page. |
| Access | Generation prompts | Private server record | Prompt-bearing inputs are not public response DTOs. Raw model context is a separate information class. | Who, if anyone, may read a raw prompt. This page makes no staff grant. |
| Access | Committed passages and documents | Owner history read is implemented. Document reads are authorized before the hash is resolved. | The history read returns that owner's passages and omits server metadata. Canonical documents have no public read. | Whether an access request also includes drafts, documents, backups, telemetry, or provider copies. |
| Export | Every class above | No public export API is named on these pages | [Export](../../../../docs/product/admin/commercial-and-trust.md#actions-that-stay-conditional) needs its own purpose and authority. It is not inferred from a per-account view. A data-rights package is a restricted privacy operation on a proposed page. | Export audience. Needs owner or legal review. This matrix specifies no route, no response body, and no staff raw-prompt release. |
| Export | A lab or chamber bundle | Unapproved recommendation | [Deterministic test replay](../../../../docs/technical/observability/retention-and-access.md#5-deterministic-test-replay-what-has-to-be-recorded) describes a restricted bundle for an isolated bench. That page is not approved for implementation. | That recommendation is not adopted as player portability. |
| Correction | Commercial ledger and usage | Proposed limit | An adjustment is a new record. Staff cannot delete usage or rewrite a provider charge. | Whether a player correction may change a committed charge. Needs owner or legal review. |
| Correction | Committed passages and transfers | Implemented commit rule | Ordinary append does not replace a committed passage. Changed content cannot reuse a committed transition id. | Whether correction may amend or redact published prose. Irreversible effects of committed play stay an open decision. |
| Revoke | Session | Ending a session is not deletion | An expired session returns through sign-in and does not auto-submit the old choice. Clearing a session is different from leaving the story. A revoked session loses SSE access. | What revoke means for a future invitation or a shared story. |
| Revoke | Login | Proposed distinction | A removed login is not erased data. | Whether revoke is required before deletion. Needs owner or legal review. |
| Deletion | Drafts | Policy not implemented | The owner foreign key restricts owner deletion until an account or story deletion policy exists. | That policy, including request verification. |
| Deletion | Story rows, documents, outbox, and Temporal | Intended order. Not an implemented privacy API. | Deletion first stops further actions, invalidates pending work, and removes access. Later cleanup removes media and external traces where supported. Documents are not deleted by age. Temporal may keep activity arguments. Outbox receipt retention stays separate from chronology. | Pending-work quarantine: the fence for an in-flight generation, an outstanding notice, and a timer is not specified. Needs owner or legal review. |
| Deletion | Backups | Named limit | Physical removal is not instantaneous. Disclose that when account deletion is implemented. | Backup limits and expiry. Needs owner or legal review. |
| Deletion | Another participant, and the ledger | Proposed limit | Deletion must not drop another participant's shared history or falsify a ledger. A processor that has not confirmed its copy means the deletion is partial. | How one person's request treats shared rows and irreversible commercial effects. |
| Deletion | Provider-held copies | Not settled | Unknown provider data is unknown. A removed login can leave a processor copy, and the workflow would have to say so. | Provider-held data: what the vendor keeps, and how a request reaches it. Needs owner or legal review. |
| Objection | Every class above | Named on the proposed trust page. No mechanism. | Privacy is described as handling objection separately from enforcement. | The whole objection path. Needs owner or legal review. |
| Legal hold | Raw packets, audit rows, and any class under a request | Unratified candidate | [Storage engineering and privacy safeguards](../../../../docs/technical/observability/retention-and-access.md#7-storage-engineering-and-privacy-safeguards) says an incident hold needs a named actor, purpose, approval, and expiry. The candidate day counts on that page are not an accepted policy. | Legal hold. Needs owner or legal review. No hold duration is adopted. |

## Open decisions

Each item needs owner or legal review. None is adopted by writing it here.

| Decision | What stays open | What this page refuses to pretend |
| --- | --- | --- |
| Request verification | How a person proves an access, correction, export, revoke, deletion, or objection request, and which account or story that proof covers. | A signed-in session is not that proof. |
| Identity and tenant scope | Whose rows a request may include when a story has more than one participant. | A story-scoped foreign key is not a tenant policy, and shared play is not selected here. |
| Export audience | Who may receive a purpose-bound package, and which classes it may contain. | No public export endpoint is created. A support case does not export every user's raw prompts. |
| Pending-work quarantine | How pending generations, outbox notices, and Temporal timers are stopped or fenced before cleanup. | The intended deletion order is not evidence that a quarantine control already runs. |
| Irreversible effects | How a request treats a committed passage, a committed transfer, a usage row, and a provider charge. | Ordinary play commit and the commercial ban on ledger surgery do not define a privacy remedy. |
| Backup limits | How long a backup may keep a deleted row, and what a player is told. | A backup restore is not proof that deletion already happened. |
| Provider-held data | What a model or billing provider retains after Offscreen deletes or cannot see a copy. | Unknown provider data is not treated as gone, and it is not treated as a successful refund. |
| Legal hold | Who may freeze which classes, for what purpose, and when the freeze ends. | Candidate figures, including 90 days, 180 days, 12 months, 7–14 days, and 14–30 days, stay unratified on the retention page. |

No jurisdiction is chosen. The retention page's remark that an EU-facing service would need a lawful-purpose decision is not a choice of law.

## What a stored row does not grant

A successful import into an isolated bench or sandbox does not authorize export. A row that exists in PostgreSQL, in a document store, or in a workflow history does not reveal another person's data. Owner-scoped history remains that owner's history.

A backup restore does not prove that deletion already happened. The restored bytes can still contain the row, and they say nothing about Temporal, a provider, or a backup that was not restored.

Deletion is not instantaneous from every backup and every third-party system. A support case does not become authority to export every user's raw prompts. A chamber bundle recommendation does not become a player portability API.
