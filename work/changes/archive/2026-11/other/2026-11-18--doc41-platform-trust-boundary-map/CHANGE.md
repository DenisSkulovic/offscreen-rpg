# DOC41 | Create an app-specific technical threat-boundary map for identity, content and provider access

**State:** Done (2026-11-18).

## Cursor first-screen brief

**Evidence and gap:** The system has authenticated player HTTP, staff case grants, private document roots, potentially paid provider packets, source-bound Storyteller context and worker recovery. Relevant denials exist but are scattered. The generic .agents/knowledge/security-and-trust.md is professional guidance, not an Offscreen-specific trust-boundary contract.

**Current authoritative material to read:**
- [docs/technical/platform/identities-and-access.md](../../../../../../docs/technical/platform/identities-and-access.md)
- [docs/technical/admin/topology-and-authorization.md](../../../../../../docs/technical/admin/topology-and-authorization.md)
- [docs/technical/storyteller/provider-boundary.md](../../../../../../docs/technical/storyteller/provider-boundary.md)
- [docs/technical/platform/data-and-persistence.md](../../../../../../docs/technical/platform/data-and-persistence.md)
- [apps/api/README.md](../../../../../../apps/api/README.md)

**Potential new owner:** `docs/technical/platform/security-and-trust-boundaries.md`. Its absence is intentional at design time; WIKI16 must first handle planned CREATE and safe inbound-map reconciliation.

## Editorial work to perform after selection

1. Build an exact trust-boundary diagram/table: browser and public client, authenticated API, Better Auth identity, application admission, staff control plane, private document store, Temporal/worker and external model provider; mark actual installed vs future components.
2. For each boundary name actor, asset, admitted read/write, credential/tenant isolation, leak route, failure mode and owning technical section; avoid reprinting auth implementation code or secret values.
3. Source-inspect selected risk paths (cross-owner 404, staff grant/case, provider packet redaction, story-specific document handles, SSE hint) and add normal/negative proof examples. Label unreviewed security questions as proposals. Do not call the map a completed audit.
4. Route from technical hub and source README and ensure no duplicate policy with Admin product privacy, provider spending or staff forensic access. No deployment/security control change.

Before deciding on the new owner, verify that the question cannot be answered adequately with a section in the existing closest owner. Preserve accepted game/security constraints and the exact chosen source/proof tier. Do not confuse being able to import/propose a document with authorization to publish or reveal it.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because no new player/trust/financial rights are selected by this documentation survey | `docs/product/README.md` and present product rules/policy | New normative product policy would require owner ratification |
| Technical | changed: CREATE `docs/technical/platform/security-and-trust-boundaries.md` as a source-grounded map of **existing** trust boundaries; unknown/proposed risks remain labeled | docs/technical/platform/identities-and-access.md, docs/technical/admin/topology-and-authorization.md, docs/technical/storyteller/provider-boundary.md, docs/technical/platform/data-and-persistence.md | Keep selected vs implemented vs proposed distinctions |
| Code | unchanged because this is a documentation-only Change and no auth, policy, package parser, provider or worker executable modification is authorized | Source read-only for exact rights/provenance/trust-boundary evidence | Negative: executable diff, imagined audit pass or invented approval blocks completion |
| Related | changed: proposed CREATE `docs/technical/platform/security-and-trust-boundaries.md` and context-specific documentation router links if the owner review supports it; otherwise unchanged with reason | `docs/technical/README.md`, `docs/runbooks/README.md`, `NOTICE.md`, affected historical/public route as applicable | WIKI16 create compatibility, unique owner and incoming links |

**Execution note:** No existing heading answers the eight-boundary question. [Who owns the boundary](../../../../../../docs/technical/platform/identities-and-access.md#who-owns-the-boundary) routes neighboring authorities. [Trust boundaries and request flow](../../../../../../docs/technical/admin/topology-and-authorization.md#2-trust-boundaries-and-request-flow) is the selected admin flow and still withholds production grants. No-split was not used. Code was not edited. Named source files were read at `b3113814` and were not re-run. No provider call was made. Runbooks and `NOTICE.md` were not edited. The uncertain-work page is linked and was not rewritten. The player-data-lifecycle matrix stays an unratified proposal.

**CREATE:** `docs/technical/platform/security-and-trust-boundaries.md`

## Document shape | shape-ops.v1

| Operation | Path | Heading migration | Unique conservation |
| --- | --- | --- | --- |
| CREATE | docs/technical/platform/security-and-trust-boundaries.md | new owner; no old heading moved | A 404 is not another user's row. An SSE hint is not a committed world. A provider packet is not a staff grant. Importing a document is not permission to reveal it. No staff read, raw-prompt right, or production role is granted. |

## Acceptance and negative case

**Normal:** a reader can distinguish documented facts, proposed future policy, current technical protection and exact unknowns with a bounded task route. **Negative:** A Support staff persona gains broad raw prompt access by reading a proposed Admin diagram, or a model receives private document handles from another story.

**Approval gate:** A new security policy or grant boundary needs explicit owner review; no implicit new production capability from a threat diagram.

**Proof:** before/after claim, selected/proposed/implemented matrix, source paths and SHA, independent adverse reading, actual link/heading and Change-close guard results. Do not claim a security assessment or legal review that did not occur.

## Reconciliation ledger (fill at execution)

**CREATE:** `docs/technical/platform/security-and-trust-boundaries.md`

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/technical/platform/security-and-trust-boundaries.md#boundary-map | technical | changed: new cross-boundary map of the eight boundaries, with installed, future, and unknown standing, and no new staff read, raw-prompt right, or production role | no source behavior changed; inspected b3113814 in apps/api/src/modules/auth/identity.ts and apps/api/src/app.ts and packages/application/src/stories/reads.ts and packages/application/src/stories/documents.ts and packages/application/src/storyteller/canonical-knowledge.ts and apps/api/src/modules/stories/story-update-hub.ts and apps/api/src/modules/admin/controller.ts and packages/application/src/admin/situation-reads.ts and packages/storyteller/src/providers/operation-trace.ts | source-inspected; named files read and not re-run | A 404 is not another user's row. An SSE hint is not a committed world. A provider packet is not a staff grant. Importing a document is not permission to reveal it. | CREATE docs/technical/platform/security-and-trust-boundaries.md; question row on docs/technical/README.md#technical-contracts |
| docs/technical/platform/security-and-trust-boundaries.md#cross-owner-404 | technical | changed: an owner miss and a missing id share not_found, and the document read checks the owner before it resolves a hash | no source behavior changed; inspected b3113814 in packages/application/src/stories/reads.ts and packages/application/src/stories/documents.ts and apps/api/src/modules/stories/controller.ts | source-inspected; HTTP tests named on the HTTP page were not re-run | A 404 is not another user's row | same CREATE |
| docs/technical/platform/security-and-trust-boundaries.md#staff-grant-and-case | technical | changed: deny-by-default customer denial is privacy 404, and the situation projection sets promptBody to not-included | no source behavior changed; inspected b3113814 in apps/api/src/modules/admin/controller.ts and packages/application/src/admin/policy.ts and packages/application/src/admin/situation-reads.ts and packages/contracts/src/admin.ts | source-inspected | A provider packet is not a staff grant, and no production role is granted | one sentence on docs/technical/admin/topology-and-authorization.md#2-trust-boundaries-and-request-flow |
| docs/technical/platform/security-and-trust-boundaries.md#provider-packet-redaction | technical | changed: the operation trace omits prompt bodies and source bodies, and that omission is not a staff grant | no source behavior changed; inspected b3113814 in packages/storyteller/src/providers/operation-trace.ts and packages/application/src/developer-tools/lab/lab-evidence.ts | source-inspected | A provider packet is not a staff grant | one sentence on docs/technical/storyteller/provider-boundary.md |
| docs/technical/platform/security-and-trust-boundaries.md#story-specific-document-handles | technical | changed: catalogue handles are local to the manifest whose campaignId matches the story id | no source behavior changed; inspected b3113814 in packages/application/src/storyteller/canonical-knowledge.ts and packages/documents/src/local-store.ts and packages/documents/src/s3-store.ts | source-inspected | Importing a document is not permission to reveal it | one sentence on docs/technical/platform/data-and-persistence.md#selected-document-store |
| docs/technical/platform/security-and-trust-boundaries.md#sse-hint | technical | changed: the hint is eventId, storyId, viewVersion, and committed-view, delivered to streams already subscribed to that storyId | no source behavior changed; inspected b3113814 in apps/api/src/modules/stories/story-update-hub.ts and packages/contracts/src/stories.ts | source-inspected | An SSE hint is not a committed world | link only; docs/technical/platform/http-api-and-client-contracts.md was not edited |
| docs/technical/platform/security-and-trust-boundaries.md#what-this-page-does-not-grant | technical | changed: states the four boundary negatives and withholds a retention period | no source behavior changed; inspected b3113814 | source-inspected | The unratified player-data-lifecycle matrix is not a retention policy and not permission to reveal a document | no further map |
| docs/technical/README.md#technical-contracts | technical index | changed: one question row points at the new map; the other rows stay | no source behavior changed; inspected b3113814 | source-inspected | The index must not become a second statement of the boundary rules | row added |
| docs/technical/platform/identities-and-access.md#boundaries-that-stay-next-door | technical | unchanged because only a pointer was added and the Next.js, cache, 202, and WebSocket sentences stay as written | no source behavior changed; inspected b3113814; that section was read before the pointer | source-inspected | The pointer must not be read as a new session right or a staff grant | one sentence in that section |
| docs/technical/platform/identities-and-access.md#authentication-and-sessions | technical | unchanged because the session, membership, and invitation sentences were not rewritten | no source behavior changed; inspected b3113814 | source-inspected | A session must not be described as membership or as a raw prompt | no edit in that section |
| docs/technical/platform/identities-and-access.md#who-owns-the-boundary | technical | unchanged because the neighboring-owner table was not rewritten and does not answer the eight-boundary question | no source behavior changed; inspected b3113814 | source-inspected | That table must not be read as this trust-boundary map | no edit in that section |
| docs/technical/admin/topology-and-authorization.md#2-trust-boundaries-and-request-flow | technical | unchanged because only a pointer was added and the request-flow diagram stays as written | no source behavior changed; inspected b3113814 | source-inspected | The pointer must not grant a staff read, a raw prompt, or a production role | one sentence before the diagram |
| docs/technical/admin/topology-and-authorization.md#authorization-claim-map | technical | unchanged because the withholding table and both constrained-by rows were not edited | no source behavior changed; inspected b3113814 | source-inspected | A description of the map must not authorize raw prompt disclosure or a production role | no edit in that section |
| docs/technical/storyteller/provider-boundary.md#safety-boundaries | technical | unchanged because the safety bullets were not edited | no source behavior changed; inspected b3113814 | source-inspected | A packet must not be described as a staff grant | route-line pointer only; both constrained-by tables stay |
| docs/technical/storyteller/provider-boundary.md#attempt-custody-and-an-unknown-call | technical | unchanged because the custody table and its constrained-by row stay as written | no source behavior changed; inspected b3113814 | source-inspected | An unknown charged dispatch must not be described as permission to start a second paid call | no edit in that section |
| docs/technical/platform/data-and-persistence.md#selected-document-store | technical | unchanged because only a pointer was added and the store contract stays as written | no source behavior changed; inspected b3113814 | source-inspected | Admitting an object must not be described as permission to reveal it | one sentence in the realization record |
| docs/technical/platform/http-api-and-client-contracts.md#authenticated-actor-scope | technical | unchanged because this Change did not edit that page, and actor scope stays there | no source behavior changed; inspected b3113814 | source-inspected | A 404 must not be described as another user's row | page not edited |
| docs/technical/platform/http-api-and-client-contracts.md#accepted-response-versus-committed-world | technical | unchanged because this Change did not edit that page, and 202 stays an accepted snapshot | no source behavior changed; inspected b3113814 | source-inspected | An HTTP 202 must not be described as a committed world | page not edited |
| docs/technical/platform/http-api-and-client-contracts.md#get-truth-and-sse-hints | technical | unchanged because this Change did not edit that page, and the hint stays an invalidation | no source behavior changed; inspected b3113814 | source-inspected | An SSE hint must not be described as a committed world | page not edited |
| docs/technical/observability/identities-and-evidence.md#7-read-and-reconstruction | technical | unchanged because this Change did not edit that page and did not change Authentication and sessions | no source behavior changed; inspected b3113814 | source-inspected | A reconstruction read must not return another viewer's story | page not edited |
| apps/api/README.md | API source map | changed: one link to the boundary map; the file stays the route inventory | no source behavior changed; inspected b3113814 | source-inspected | The API map must not grow a second copy of the boundary rules | one sentence |
| docs/product/README.md | product | unchanged because no player, trust, or financial right is selected and product pages were not edited | no source behavior changed; product pages were not edited; inspected b3113814 | source-inspected | The new page must not grant a staff read, a raw-prompt right, or a production role | product pages not edited |
| work/designs/open/player-data-lifecycle/README.md#rights-matrix | proposal | unchanged because the matrix stays an unratified proposal and was not edited | no source behavior changed; the proposal was not treated as a retention policy; inspected b3113814 | source-inspected | The matrix must not be read as a retention period or as permission to reveal a document | page not edited |
| docs/runbooks/uncertain-work-recovery.md#ambiguous-provider-send | runbook | unchanged because the runbook was not rewritten and remains the first-response guide | no source behavior changed; inspected b3113814 | source-inspected | The link must not add a retry or a provider call | page not edited |
| apps/api/src/modules/auth/identity.ts | code | unchanged because no executable modification is authorized and no auth, controller, worker, or deployment file was edited | no source behavior changed; inspected b3113814 | source-inspected | An executable diff or an imagined audit pass blocks close | no code edit |

**Stop:** proposed trust, privacy, money, or production staff grants cannot be ratified by this map. No automatic next packet. Archive only after owner close. The shared worktree contains other open documentation Changes, so a whole-tree close diff is not this packet's file set.
