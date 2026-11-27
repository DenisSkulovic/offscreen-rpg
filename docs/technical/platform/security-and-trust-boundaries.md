# Platform trust boundaries

**Owns:** one map of who may cross the browser, the authenticated API, Better Auth, application admission, the staff control plane, the private document store, the Temporal worker, and an external model provider.

**Does not own:** session rules ([Authentication and sessions](identities-and-access.md#authentication-and-sessions)), player HTTP status meanings ([HTTP and client contracts](http-api-and-client-contracts.md)), staff grants ([Authorization claim map](../admin/topology-and-authorization.md#authorization-claim-map)), packet bytes ([Exact packet boundary](../storyteller/provider-boundary.md#exact-packet-boundary)), the store contract ([Selected document store](data-and-persistence.md#selected-document-store)), spend ([Distinct authorities](spending-and-entitlements.md#distinct-authorities)), or the first response to an unknown provider attempt ([Uncertain work recovery](../../runbooks/uncertain-work-recovery.md)).

**Standing:** source-inspected at `b3113814` and, for the evidence links, re-pointed on 2026-11-27 to the files that now own those symbols (the `application` paths named in older reads moved to `packages/story-engine`) for the files under [Evidence read](#evidence-read). Those files were read and were not re-run. This page is not a passed security audit and not a legal review. It adds no staff read, no raw-prompt right, and no production role.

**Reader question:** Which actor may touch which asset at this boundary, and which heading still owns the rule?

**Read one heading:** [map](#boundary-map) · [404](#cross-owner-404) · [staff grant](#staff-grant-and-case) · [packet redaction](#provider-packet-redaction) · [document handles](#story-specific-document-handles) · [SSE hint](#sse-hint) · [withheld](#what-this-page-does-not-grant) · [unknowns](#unknowns)

[Who owns the boundary](identities-and-access.md#who-owns-the-boundary) routes sessions, entitlement, funding, and notifications. [Trust boundaries and request flow](../admin/topology-and-authorization.md#2-trust-boundaries-and-request-flow) is the selected admin request flow. Neither heading is this eight-boundary map.

## Boundary map

Standing means what this pass could separate. **Installed** means the named source exists and was read. **Future** means a selected or proposed target that this page does not call installed. **Unknown** means this pass did not verify it.

| Boundary | Standing | Actor | Asset | Admitted read or write | Isolation | Leak route | Failure | Owning heading |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Browser and public client | Installed as the caller of player HTTP. A staff `/control` shell exists as a narrow slice (enter, home, players) per the admin topology page; the full target shell is future. A full browser-cache audit is unknown. | The person at the browser, with or without a session. | That viewer's pages and a story-update stream already subscribed. | Display a projection the API already returned. The browser does not write story tables. | Next.js is not a second backend for story tables. Authenticated story responses stay out of a public or cross-user cache. | A public cache or a shared staff/player cache would expose a private projection. | A lost response or a dropped stream leaves the scene on a later GET. | [Boundaries that stay next door](identities-and-access.md#boundaries-that-stay-next-door) |
| Authenticated API | Installed for the player story, draft, and opening handlers named on the HTTP page. Admin route handlers exist in source and the topology page records the scoped `/api/admin/*` slice as realized, not as a production grant. | The session user id from `IdentityService.requireUser`. | That owner's story and draft projections. | Owner-scoped reads and the commands those handlers pass into application operations. | The story read requires `story.ownerId` to equal that session id. | An unowned id and a missing id share HTTP 404. The body is not the other owner's row. See [Cross-owner 404](#cross-owner-404). | A missing session is HTTP 401 and the operation is not called. A session-store failure is HTTP 503 before the operation. | [Authenticated actor scope](http-api-and-client-contracts.md#authenticated-actor-scope) |
| Better Auth identity | Installed. `apps/api/src/app.ts` mounts the official handler at `/api/auth/*`. Invitations remain a future product area. Cookie flags were not re-read. | The session subject. | The session and the user id, name, and email returned by `GET /api/me`. | Prove who is signed in. | Session validation and story authorization stay separate. OAuth is not membership and not a staff role. | A session is not a story row and not a raw prompt. | No session throws before the application operation. The handler does not return the driver error. | [Authentication and sessions](identities-and-access.md#authentication-and-sessions) |
| Application admission | Installed for resolution admission and document admit on the paths in [Evidence read](#evidence-read). Other command families stay unknown on the HTTP page. | The application operation, after the session user id is supplied. | The command receipt, the generation row, and that story's document root. | Admit the owner's command or document change. HTTP 202 on resolution admission returns the current snapshot while `resolution.state` can still be `pending`. | The operation id stays frozen. Document admit joins `story.ownerId`. | A 202 snapshot is not a committed world. Admitting a document is not permission to reveal it. | A conflicting body leaves the stored row. An unowned story is `not_found`. | [Accepted response versus committed world](http-api-and-client-contracts.md#accepted-response-versus-committed-world) |
| Staff control plane | Handlers exist under `apps/api/src/modules/admin/controllers/`. `requireStaffActor` and `requireCapability` live in `apps/api/src/modules/admin/admin-actor-service.ts`. The full selected `/control` workspace set and a production staff role are withheld. This page installs neither, and the status mirror on the [Authorization claim map](../admin/topology-and-authorization.md#authorization-claim-map) (no production `support-investigator` grant, no full Turn Capsule disclosure, OBS06/07 synthetic or disposable-grant only) governs. | A staff principal that has passed `requireStaffActor`, then a capability check. | Admin projections, a case summary, and the body-free situation read. | The capability the evaluator allows for that resource. Customer denial is privacy 404. | Empty `campaignIds` do not mean every campaign. A caller-supplied case id is not enough unless provenance lists it. | A provider packet is not a staff grant. The situation coverage sets `promptBody` to `not-included`. | A missing capability on a customer resource is HTTP 404. Unknown capability strings are HTTP 403. | [Authorization claim map](../admin/topology-and-authorization.md#authorization-claim-map) |
| Private document store | The local store and the S3 adapter are installed. Hosted bucket policy, public access, and backup are unknown. Moving PostgreSQL narrative bodies onto the store is not complete. | Application code holding a `DocumentStore`, after an owner check on the story row. | Content-addressed JSON. Local keys are `objects/sha256/<ab>/<hash>.json`. | The owner may read that story's root and admit descriptive changes onto it. | The store `put` and `get` read here do not take an owner id. The story query does. | A hash is not a story permission. A handle such as `d1` is a slot in one catalogue, not a store key. | A missing owner or a missing manifest entry is `not_found`. A manifest whose `campaignId` differs from the story id is refused before catalogue handles are built. | [Selected document store](data-and-persistence.md#selected-document-store) |
| Temporal worker | The worker package is installed. Activities call application operations by id. Hosted history retention is not defined. Activity payload contents are unknown. | The worker process. | Workflow history, timers, and outbox notices. | Deliver a notice again. The application transaction owns the commit. | The worker calls application use cases. It does not import API controller logic. | Whether every activity argument omits credentials and full prompts was not inventoried. The persistence contract requires compact references. | A duplicated delivery does not create a second committed result. An unknown provider attempt stays on its existing attempt id. | [Commands and durable delivery](execution-and-delivery.md#commands-and-durable-delivery) |
| External model provider | Packet review and hold are installed for the offline POC. Live paid release stays blocked on the provider page. No provider was called for this page. | Transport, after release, reservation, and the current dispatch gates. | One frozen request body and the provider response. | Dispatch that one reviewed packet when those gates pass. Inspection and hold make no provider call. | API keys stay out of the packet artifact. The operation trace omits prompt bodies and source bodies. | A packet, a hash, or a redacted trace is not a staff raw-prompt right. | An unknown transport result leaves the attempt uncertain and blocks another paid call. The first response is [Ambiguous provider send](../../runbooks/uncertain-work-recovery.md#ambiguous-provider-send). | [Safety boundaries](../storyteller/provider-boundary.md#safety-boundaries) |

## Cross-owner 404

**Reader question:** Does HTTP 404 mean another person owns this id?

**Normative status:** source-inspected. The HTTP page already states the shared status. This heading only records the boundary consequence. Tests named there were not re-run.

`createStoryReads` loads a story only when `story.id` and `story.ownerId` both match. No row throws `StoryError('not_found')`. The story controller maps `not_found` to HTTP 404. Document reads in `createCampaignDocuments` use the same owner filter before they resolve a hash. A missing manifest entry is also `not_found`.

**Normal:** the signed-in owner receives that owner's projection.

**Negative:** a 404 is not another user's row. The body is not that row. This pass did not compare missing-id and unowned-id bodies byte for byte.

## Staff grant and case

**Reader question:** Does a staff handler or a diagram grant a raw prompt?

**Normative status:** source-inspected for the gates named here. It is not a production assignment and not a new role. Investigation redaction stays on [Sensitive evidence hierarchy](../admin/investigation-and-privacy.md#6-sensitive-evidence-hierarchy).

`requireCapability` is deny-by-default. For a customer resource, `not_authorized` becomes HTTP 404. The situation route calls `case.summary.read` and `forensics.campaign.situation.read` before `readSituation`. That read throws `not_authorized` unless the case is assigned to the same staff principal and the case link names that campaign. The returned coverage sets `promptBody` to `not-included`. A search of `situation-reads.ts` finds passage content, generation input, and prompt-provenance manifest only in the file header's exclusion list.

The package id `support-investigator` exists in the registry. This page did not read a production assignment row. The topology page still withholds raw prompt disclosure, a generic admin query of generation input or output, and cross-tenant access.

**Normal:** an assigned investigator with the exact case and campaign grant receives the body-free situation projection.

**Negative:** a provider packet is not a staff grant. Reading the admin diagram does not give Support a raw prompt.

## Provider packet redaction

**Reader question:** Does a redacted packet become something staff may read?

**Normative status:** source-inspected for the trace and the lab capsule named here. It does not widen [Safety boundaries](../storyteller/provider-boundary.md#safety-boundaries).

`createStorytellerOperationTrace` sets `promptBodies` and `sourceBodies` to `omitted`. `assertNoPrivateLeak` rejects a secret-shaped token and a Bearer header in that JSON. It is not a general secret scan. `assertOperationTraceStoryIsolation` rejects a foreign story id in that same JSON. `redactLabEvidenceValue` is the Chamber lab capsule. It rewrites secret-shaped keys and prompt, packet, and narrative keys. It is not the staff situation projection.

**Normal:** a developer trace records sizes, hashes, and handles. The prompt body stays omitted.

**Negative:** a provider packet is not a staff grant. Omitting a body in a trace does not authorize a staff read of the stored prompt.

## Story-specific document handles

**Reader question:** May a model receive another story's documents because a hash or a handle matches?

**Normative status:** source-inspected for `loadCanonicalKnowledge` and the owner check in document admit and read. Other prompt builders were not proved to use this function.

`loadCanonicalKnowledge` reads the manifest for the supplied root hash. It throws `Canonical context root does not match its campaign` when `manifest.campaignId` differs from the story id. Catalogue handles are `d1`, `d2`, and so on, in that manifest's order. They are not store keys. Admit and read both require `story.ownerId` before `storage.putDocument` or `storage.readDocument`. The local and S3 adapters address objects by hash. The S3 put read here sends `PutObject` with `IfNoneMatch: '*'` and no presign.

**Normal:** one story's task receives handles for documents in that story's manifest.

**Negative:** importing a document is not permission to reveal it. A stored object is not a public read, not another story's model context, and not a staff reveal. The unratified [rights matrix](../../../work/designs/open/player-data-lifecycle/README.md#rights-matrix) is not a retention policy and not a reveal rule.

## SSE hint

**Reader question:** May the client treat a story-update event as the next scene?

**Normative status:** source-inspected. Client cache behavior stays on the HTTP page's co-change, [GET truth and SSE hints](http-api-and-client-contracts.md#get-truth-and-sse-hints).

`storyUpdateHintSchema` is `eventId`, `storyId`, `viewVersion`, and `kind: 'committed-view'`. Subscribe requires a session and a successful owner read. `publish` delivers that hint only to streams whose `storyId` matches. It does not repeat the owner read. The heartbeat path calls `stillAuthorized`, which requires the session again and reads the story as that owner. Heartbeat data is `{ ok, listenerHealthy }`. `listener-recovered` data is `{ ok: true }`.

**Normal:** on `story-update`, GET the snapshot.

**Negative:** an SSE hint is not a committed world. A hint delivered to an already subscribed stream is not a new grant. Whether a revoked owner can observe one hint before the next heartbeat was not timed.

## What this page does not grant

These sentences are the boundary. They do not add a right.

- A 404 is not another user's row.
- An SSE hint is not a committed world. An HTTP 202 is not one either. The status meaning stays on [Accepted response versus committed world](http-api-and-client-contracts.md#accepted-response-versus-committed-world).
- A provider packet is not a staff grant.
- Importing a document is not permission to reveal it.
- A Support persona does not gain a raw prompt by reading the admin diagram or this map.
- A model does not receive another story's document handles from a shared hash. The handle is local to the manifest that matched the story id.
- No production staff role is created here.

Who may export, correct, or delete stored classes stays unratified. [Player data lifecycle](../../../work/designs/open/player-data-lifecycle/README.md) is an open design. This page does not set a retention period.

## Contract dependencies

| This claim | Relation | Governing claim | Why a change triggers review |
| --- | --- | --- | --- |
| [Boundary map](#boundary-map) | constrained-by | [Authentication and sessions](identities-and-access.md#authentication-and-sessions) | A session change has to keep membership separate from the session. This map cannot widen who may read. |
| [Boundary map](#boundary-map) | constrained-by | [Authenticated actor scope](http-api-and-client-contracts.md#authenticated-actor-scope) | Owner-scoped 404 and 401-before-work stay on that page. |
| [Boundary map](#boundary-map) | constrained-by | [Accepted response versus committed world](http-api-and-client-contracts.md#accepted-response-versus-committed-world) | HTTP 202 stays an accepted snapshot. This map cannot call it a committed world. |
| [Boundary map](#boundary-map) | constrained-by | [GET truth and SSE hints](http-api-and-client-contracts.md#get-truth-and-sse-hints) | The hint payload stays an invalidation. This map cannot call it a scene. |
| [Boundary map](#boundary-map) | constrained-by | [Authorization claim map](../admin/topology-and-authorization.md#authorization-claim-map) | Staff withholding stays on that map. This page cannot add a read, a raw prompt, or a production role. |
| [Boundary map](#boundary-map) | constrained-by | [Safety boundaries](../storyteller/provider-boundary.md#safety-boundaries) | A packet stays a private diagnostic. Redaction in a trace cannot become a staff grant. |
| [Boundary map](#boundary-map) | constrained-by | [Attempt custody and an unknown call](../storyteller/provider-boundary.md#attempt-custody-and-an-unknown-call) | An unknown provider result stays on that attempt. This map cannot add a second paid call. |
| [Boundary map](#boundary-map) | constrained-by | [Selected document store](data-and-persistence.md#selected-document-store) | Content-addressed bytes stay the store contract. Admit does not become a public or cross-story reveal. |

## Unknowns

These were not established in the files read for this page.

- Cookie flags, CSRF, trusted origins, and OAuth client storage were not re-read. No secret value is recorded here.
- Whether every player controller rejects an admin override header was not re-audited. The topology page states that refusal as a selected target.
- Hosted S3 bucket policy and any presign path outside `s3-store.ts` are unknown.
- Prompt assembly other than `loadCanonicalKnowledge` was not traced. A second builder could still be wrong.
- Temporal activity arguments were not inventoried. The selected ban on credentials and full prompts in workflow history is the contract. Payload compliance is unknown.
- No production staff assignment was read. A registry package is not a filled role.
- Shared play is still an open design. This pass did not show two owners of one story.
- No integration test was re-run at `b3113814`. This page is not a passed security audit.

## Evidence read

Read at `b3113814`, and not re-executed. Admin policy and the situation read later moved into `@offscreen/admin`; those two links follow the current files:

- [identity.ts](../../../apps/api/src/modules/auth/identity.ts)
- [app.ts](../../../apps/api/src/app.ts) handler mount
- [stories controller](../../../apps/api/src/modules/stories/controller.ts) update subscribe
- [story reads](../../../packages/story-engine/src/stories/reads.ts) owner filter
- [campaign documents](../../../packages/story-engine/src/stories/documents.ts) owner check, admit, and hash read
- [local store](../../../packages/documents/src/local-store.ts) and [S3 store](../../../packages/documents/src/s3-store.ts)
- [canonical knowledge](../../../packages/story-engine/src/storyteller/canonical-knowledge.ts) `loadCanonicalKnowledge`
- [story-update hub](../../../apps/api/src/modules/stories/story-update-hub.ts)
- [hint schema](../../../packages/story-interface/src/stories.ts) `storyUpdateHintSchema`
- [admin actor service](../../../apps/api/src/modules/admin/admin-actor-service.ts) `requireCapability`
- [admin route map](../../../apps/api/src/modules/admin/README.md) campaign situation route
- [admin policy](../../../packages/admin/src/policy.ts) case and campaign scope
- [situation read](../../../packages/admin/src/situation-reads.ts)
- [situation schema](../../../packages/admin-interface/src/admin.ts) `supportSituationV1Schema`
- [operation trace](../../../packages/storyteller/src/providers/operation-trace.ts)
- [lab evidence redaction](../../../packages/lab-support/src/lab/lab-evidence.ts)
- [worker activities](../../../apps/worker/src/activities/index.ts) and [worker map](../../../apps/worker/README.md)
