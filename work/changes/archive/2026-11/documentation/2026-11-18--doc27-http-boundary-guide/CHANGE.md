# DOC27 | Create the cross-route HTTP identity, receipt, error and client-read contract

**State:** Done (2026-11-18).

## Cursor first-screen brief

**Why this is missing:** There are several owner maps and Nest controllers but no concise canonical technical owner for cross-route semantics a second client must respect: authenticated actor scope, exact frozen operation IDs, 202-vs-commit, GET truth vs SSE hints, and error/uncertainty recovery.

**Start with actual current owners:**
- [apps/api/README.md](../../../../../../apps/api/README.md)
- [apps/api/src/modules/stories/README.md](../../../../../../apps/api/src/modules/stories/README.md)
- [apps/api/src/modules/drafts/README.md](../../../../../../apps/api/src/modules/drafts/README.md)
- [docs/technical/client/architecture.md](../../../../../../docs/technical/client/architecture.md)
- [packages/contracts/README.md](../../../../../../packages/contracts/README.md)

Do not skim old DOC05–24 archives as if they were live authority. Inspect exact headings and source at HEAD; if the source has moved, correct this packet's paths and affected claims before Ready.

## Designed documentation outcome

1. Document invariants that genuinely cross routes, with exact owning application/client/source links: authentication/ownership, request version, operation identity and body, 202 accepted vs fully committed, conflict/retry, receipt GET, private DTO projection and SSE hint semantics.
2. Provide task-focused method/response examples only when verified from controller/contract tests, distinguishing existing and designed endpoints. Do not copy all current routes into a second stale API catalogue.
3. Add a table: which new route requires review of identity, command admission, schema/contracts, client cache, security and error mapping. Negative cases include 401 retry-as-new-command, 404 cross-user inference and 409 overwritten draft.

Each output must have a **distinct reader question, normative status, unique owner**, normal procedure/example, negative example and exact related links. A new file is only justified when the task cannot be answered economically inside an existing owner. Record *no page created* with a reason if survey disproves the proposed split.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because this is a client/API technical reference that may not modify selected player choice or identity rights | `docs/product/README.md` and mentioned selected player claims, including Proposed exclusions | No new rights; require owner ratification for changed meaning |
| Technical | changed: CREATE docs/technical/platform/http-api-and-client-contracts.md containing the stable cross-route guarantees not owned by any one controller; preserve existing technical client/identity agreements | `docs/technical/README.md` and selected technical/source owners cited above | Status and evidence must reflect source/fixture reality |
| Code | unchanged because the HTTP controllers, DTOs, source maps and tests are read-only evidence; do not add endpoints or alter HTTP behavior | Source path inspection is read-only and not a code-writing permission | Negative: any executable diff or imagined test report blocks Done |
| Related | changed: docs/technical/README.md and apps/api/README.md links to the new cross-cutting contract; existing per-controller README stays the actual route inventory | Existing inbound links, docs/runbooks, source-map and work/designs routes as relevant | Review actual created/moved/deleted targets and semantic dependence |

**Planned CREATE note:** where this packet names a new Markdown path, the file intentionally does not exist at design time. **Do not mark Ready until WIKI16's planned-CREATE guard compatibility is landed and checked**, or the owner explicitly revises the packet to an existing-page edit. A misspelled existing path is not a valid CREATE.

**Execution note:** This session's owner instruction sets Ready for close with an explicit CREATE. The new file is present at the revision recorded in the ledger. `scripts/repo-tools/wiki-core/change-guard.mjs` was read and still has no CREATE keyword. Code was not edited. Named integration tests were read and were not re-run. No provider call was made.

**CREATE:** `docs/technical/platform/http-api-and-client-contracts.md`

## Acceptance and negative proof

**Normal:** a reader can find the exact owner and perform the correct bounded intellectual/task step, or clearly distinguish unselected policy from an accepted rule. **Negative:** A client treats an SSE message or HTTP 202 as a settled world consequence, or a retried paid operation silently gets a fresh ID.

**Evidence:** Source + integration-test evidence, stable owner route, one no-side-effect trace of admitted resolution and actual receipt; if source unconfirmed mark unknown. Run actual link/anchor and `wiki:change-guard` checks when selected in a full checkout; record actual command, revision and skipped checks. Independent adversarial reading must verify that the new page did not create shadow product/technical authority.

## Document shape | shape-ops.v1

| Operation | Path | Heading migration | Unique conservation |
| --- | --- | --- | --- |
| CREATE | docs/technical/platform/http-api-and-client-contracts.md | new owner; no old heading moved | No player right and no endpoint. HTTP 202 and an SSE message are not settled world consequences. A paid retry does not mint a fresh operation id. 401 is not a new command. 404 is not another user's data. 409 is not a blind draft overwrite. |

## Reconciliation ledger (fill at execution)

**CREATE:** `docs/technical/platform/http-api-and-client-contracts.md`

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/technical/platform/http-api-and-client-contracts.md#authenticated-actor-scope | technical | changed: new cross-route owner for session actor scope, 401-before-work, and owner-scoped 404 | no source behavior changed; inspected b3113814 in apps/api/src/modules/auth/identity.ts and apps/api/src/modules/stories/controller.ts and apps/api/src/modules/drafts/controller.ts | source-inspected; named HTTP assertions read and not re-run | 404 must not be described as a way to infer another user's data, and 401 is not a reason to retry as a new command | CREATE docs/technical/platform/http-api-and-client-contracts.md; question row on docs/technical/README.md#technical-contracts |
| docs/technical/platform/http-api-and-client-contracts.md#frozen-operation-identity | technical | changed: a lost retry of a resolution, opening, or identical draft save keeps the existing id | no source behavior changed; inspected b3113814 in packages/application/src/storyteller/admission.ts and packages/application/src/storyteller/openings.ts and packages/application/src/generations/service.ts and packages/application/src/generations/openings.ts and packages/application/src/drafts/index.ts | source-inspected; resolution and draft assertions read and not re-run | Retrying a paid operation must not be described as silently minting a fresh operation id | one-line pointers on apps/api/src/modules/stories/README.md and apps/api/src/modules/drafts/README.md |
| docs/technical/platform/http-api-and-client-contracts.md#accepted-response-versus-committed-world | technical | changed: declared 202 on resolution and opening admission is unsettled; declared 200 on start, interval control, and draft save is the awaited result | no source behavior changed; inspected b3113814 in apps/api/src/modules/stories/controller.ts and apps/api/src/modules/drafts/openings-controller.ts and tools/api-integration/test/story-resolution.integration.ts | source-inspected; resolution fixture assertions read and not re-run | A client must not treat HTTP 202 as a settled world consequence | same CREATE; index row on docs/technical/README.md#technical-contracts |
| docs/technical/platform/http-api-and-client-contracts.md#get-truth-and-sse-hints | technical | changed: GET snapshot and receipt stay authoritative; SSE hints, heartbeats, and listener-recovered are not scenes | no source behavior changed; inspected b3113814 in apps/api/src/modules/stories/story-update-hub.ts and packages/contracts/src/stories.ts and tools/api-integration/test/story-updates.integration.ts | source-inspected; SSE fixture assertions read and not re-run | A client must not treat an SSE message as a settled world consequence | pointer in docs/technical/client/architecture.md#3-command-error-and-recovery-contract |
| docs/technical/platform/http-api-and-client-contracts.md#error-and-uncertainty-recovery | technical | changed: shared 401, 404, and 409 meanings for the story, draft, and opening handlers | no source behavior changed; inspected b3113814 in apps/api/src/modules/stories/controller.ts and apps/api/src/modules/drafts/controller.ts and apps/api/src/modules/drafts/openings-controller.ts and tools/api-integration/test/drafts.integration.ts | source-inspected; draft conflict assertions read and not re-run | 409 must not be described as permission to overwrite a draft blindly | pointer on apps/api/src/modules/drafts/README.md |
| docs/technical/platform/http-api-and-client-contracts.md#private-dto-projection | technical | changed: public choice, receipt, and opening preview stay projections | no source behavior changed; inspected b3113814 in packages/contracts/src/stories.ts and packages/contracts/src/openings.ts and packages/contracts/src/interactions.ts and packages/storyteller/src/tasks/playable-proposal.ts | source-inspected | A 404 body must not be treated as another user's snapshot | pointer in packages/contracts/README.md |
| docs/technical/platform/http-api-and-client-contracts.md#review-a-new-route | technical | changed: review checklist only, with no new route and no new player right | no source behavior changed; checklist taken from the handlers inspected at b3113814 | source-inspected | The checklist must not be read as permission to add an endpoint or to mint a fresh operation id | no further map |
| docs/technical/README.md#technical-contracts | technical index | changed: one question row points at the new contract; the other rows stay | no source behavior changed; inspected b3113814 | source-inspected | The index must not become a second statement of the HTTP rules | row added |
| docs/technical/client/architecture.md#3-command-error-and-recovery-contract | technical | unchanged because only a pointer was added and the selected command, error, and recovery rules stay as written | no source behavior changed; inspected b3113814; that section was read before the pointer | source-inspected | The pointer must not be read as a change to the selected client rules or as permission to retry under a fresh id | one sentence in that section |
| apps/api/README.md | API source map | changed: one link to the cross-route contract; the file stays the route inventory | no source behavior changed; inspected b3113814 | source-inspected | The API map must not grow a second copy of every route | link only |
| apps/api/src/modules/stories/README.md | source map | unchanged because the route table stays the inventory and only a one-line pointer was added | no source behavior changed; inspected b3113814 | source-inspected | The pointer must not turn the module map into a second catalogue | one line |
| apps/api/src/modules/drafts/README.md | source map | unchanged because the route table stays the inventory and only a one-line pointer was added | no source behavior changed; inspected b3113814 | source-inspected | The pointer must not describe a 409 as permission to overwrite a draft | one line |
| packages/contracts/README.md | package guide | unchanged because shapes stay in this package and only a pointer to admission and projection was added | no source behavior changed; inspected b3113814 | source-inspected | A schema must not be described as authorization or as another user's data | one sentence |
| docs/product/README.md | product | unchanged because this contract records inspected HTTP behavior and adds no player right | no source behavior changed; product pages were not edited; inspected b3113814 | source-inspected | The new page must not grant a new player right or a new endpoint | product pages not edited |
| apps/api/src/modules/stories/controller.ts | code | unchanged because no executable modification is authorized and no controller, DTO, or test was edited | no source behavior changed; inspected b3113814 | source-inspected | An executable diff or an imagined passing test blocks close | no code edit |

**Stop:** proposed new gameplay/privacy/security or public API behavior cannot be ratified by writing a document. No auto-selection of next packet. Archive only with unique-claim preservation and complete ledger.
