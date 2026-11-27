# Player data lifecycle

**State:** Deferred, owner decision 2026-11-27. **Owner:** product owner with privacy/legal reviewer and identity, persistence, execution, observability and financial authority owners. No selected implementation Change.

**Reason:** policy and actual data-flow boundaries need deliberate review; current synthetic development does not require a complete public privacy API. Deferral is not an exemption from applicable duties or existing security safeguards. DOC36 completed documentation and question ownership, not a privacy implementation.

**Mandatory reactivation gate:** before external player onboarding or material personal-data processing, whichever comes first, refresh actual data flows, applicable legal obligations and processor arrangements with the owner and qualified legal review. Establish the applicable policy and minimum operational controls, prove the required authorization and lifecycle safeguards before permitting that processing. If such processing already occurs, reactivate now. Explicit owner selection may reactivate earlier. Do not treat backlog status as permission to collect real player data.

## Current authority and safeguards

[Data and consistency](../../../../docs/technical/platform/data-and-persistence.md), [identity and access](../../../../docs/technical/platform/identities-and-access.md), [retention and access](../../../../docs/technical/observability/retention-and-access.md), and the proposed [commercial and trust policy](../../../../docs/product/admin/commercial-and-trust.md) retain their own authority/status. Session validity does not grant cross-story access or prove a privacy request; authorize document access before resolving references. Private prompts, raw provider packets and forensic bundles are not public history or export authorization. Omitted rights-matrix pairs grant nothing. Minimize data in notices, workflow arguments and telemetry; a cache must not bypass authorization.

Deletion design must fence new actions, access and late publication/settlement before cleanup; pending generations, outbox notices, timers, retries, stale caches and restores must not recreate removed data. Preserve other participants' rights and financial/audit integrity: no ledger surgery or automatic refund inference; any authorized correction needs its own traceable mechanism. Session/login revocation is not erasure. Backup and processor copies may persist; report partial/unconfirmed outcomes, not fictitious complete deletion. These are retained safety requirements for design, not evidence of a working deletion API.

## Eight unresolved decisions

| Question | Scope to resolve |
| --- | --- |
| Request verification | Verify access, correction, export, revocation, deletion and objection requests and affected account/story scope. |
| Identity and tenant scope | Own versus another participant's data, shared history, invitations, revocation and purpose-specific authority. |
| Export audience | Authorized recipient, purpose and included classes; distinguish player history from privacy export and restricted replay bundles. |
| Pending-work quarantine | Fence in-flight generation, outbox delivery and Temporal timers; define retries, cleanup, restoration and access revocation. |
| Irreversible effects | Correction/redaction of committed passages and transfers, usage and provider charges without falsifying history or ledger. |
| Backup limits | Residual copies, expiry, restoration suppression and honest disclosure. |
| Provider-held data | Actual model/billing processor copies, request routing, confirmation and unresolved partial deletion. |
| Legal hold | Authorized actor, purpose, affected classes, approval, expiry and review; no selected duration. |

Inventory sessions/identity, drafts, generation inputs/outputs/raw packets, notices, committed story records, canonical documents, workflow history, caches/indexes/telemetry, audit/case/financial records, backups and provider copies against the actual architecture. Reassess access, export, correction, revoke, deletion, objection and hold for each; no implied grant from storage existence. Test cross-tenant reads, stale credentials, late publication after fence, replay/restore resurrection, duplicate correction, shared-story preservation and unknown processor outcome.

## Original evidence and scope

[Exact original data-class and rights matrices](https://github.com/DenisSkulovic/offscreen-rpg/blob/ce96b1c405a3f5f21d0f37bf37824edcddd265ef/work/designs/open/player-data-lifecycle/README.md) (full SHA `ce96b1c405a3f5f21d0f37bf37824edcddd265ef`, path `work/designs/open/player-data-lifecycle/README.md`) retain all original rows, source-document status and candidate retention values. They are historical documentation observations, not a verified current inventory or legal conclusion. [DOC36 receipt](../../../changes/archive/2026-11/documentation/2026-11-18--doc36-player-data-lifecycle/CHANGE.md) records completed scope reconciliation. No jurisdiction, retention interval, public export endpoint, staff raw-prompt grant or deletion mechanism is selected. Revisit current source, storage, processors and legal policy before ratification.
