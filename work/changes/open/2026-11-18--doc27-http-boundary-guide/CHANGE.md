# DOC27 | Create the cross-route HTTP identity, receipt, error and client-read contract

**State:** Proposed (unselected). **Kind:** documentation. **Dependency/order:** after WIKI16 supports declared CREATE. **Baseline:** clean `781c2fc` lean source; [coverage audit](../../../designs/open/wiki-discovery-coverage/COVERAGE-GAPS.md), [target architecture](../../../designs/open/wiki-discovery-coverage/TARGET-ARCHITECTURE.md), [editorial standards](../../../designs/open/documentation-editorial-audit/EDITORIAL-STANDARD.md). No code or product-policy ratification is authorized merely by this packet.

## Cursor first-screen brief

**Why this is missing:** There are several owner maps and Nest controllers but no concise canonical technical owner for cross-route semantics a second client must respect: authenticated actor scope, exact frozen operation IDs, 202-vs-commit, GET truth vs SSE hints, and error/uncertainty recovery.

**Start with actual current owners:**
- [apps/api/README.md](../../../../apps/api/README.md)
- [apps/api/src/modules/stories/README.md](../../../../apps/api/src/modules/stories/README.md)
- [apps/api/src/modules/drafts/README.md](../../../../apps/api/src/modules/drafts/README.md)
- [docs/technical/client/architecture.md](../../../../docs/technical/client/architecture.md)
- [packages/contracts/README.md](../../../../packages/contracts/README.md)

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

## Acceptance and negative proof

**Normal:** a reader can find the exact owner and perform the correct bounded intellectual/task step, or clearly distinguish unselected policy from an accepted rule. **Negative:** A client treats an SSE message or HTTP 202 as a settled world consequence, or a retried paid operation silently gets a fresh ID.

**Evidence:** Source + integration-test evidence, stable owner route, one no-side-effect trace of admitted resolution and actual receipt; if source unconfirmed mark unknown. Run actual link/anchor and `wiki:change-guard` checks when selected in a full checkout; record actual command, revision and skipped checks. Independent adversarial reading must verify that the new page did not create shadow product/technical authority.

## Reconciliation ledger (fill at execution)

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| apps/api/README.md governing owner to reverify | product/technical/guide as applicable | pending specific newly authored or unchanged claim | no source behavior changed; exact docs SHA pending | not run: Proposed | A client treats an SSE message or HTTP 202 as a settled world consequence, or a retried paid operation silently gets a fresh ID. | pending new/inbound route |

**Stop:** proposed new gameplay/privacy/security or public API behavior cannot be ratified by writing a document. No auto-selection of next packet. Archive only with unique-claim preservation and complete ledger.
