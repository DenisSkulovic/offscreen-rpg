# DOC36 | Map player privacy requests, story deletion and retention as one explicit unresolved policy

**State:** Done (2026-11-18).

## Cursor first-screen brief

**Reader job now insufficiently supported:** Admin product mentions privacy access/correction/export/deletion, technical storage outlines story deletion and delayed backup removal, and observability lists retention candidates. No cohesive player-centered lifecycle decision distinguishes requested access, export, correction, revoke and deletion across PostgreSQL, Temporal, documents, provider packets, backups and evidence.

**Governing present owners to read:**
- [docs/product/admin/commercial-and-trust.md](../../../../../../docs/product/admin/commercial-and-trust.md)
- [docs/technical/platform/data-and-persistence.md](../../../../../../docs/technical/platform/data-and-persistence.md)
- [docs/technical/observability/retention-and-access.md](../../../../../../docs/technical/observability/retention-and-access.md)
- [docs/technical/platform/identities-and-access.md](../../../../../../docs/technical/platform/identities-and-access.md)

**Proposed newly created/relocated owner:** `work/designs/open/player-data-lifecycle/README.md`. This is a hypothesis to validate, not a required arbitrary addition. Content with unratified decisions belongs under `work/designs/open/`, not silently selected `docs/product/`.

## Planned editorial change

1. Create a proposed rights/data-flow matrix by purpose and data class, without pretending any jurisdiction or retention period is already adopted. Trace known storage categories and authoritative deletion/status semantics from source docs.
2. Define request verification, identity/tenant scope, safe export audience, pending work quarantine, irreversible effects, backup limitations, third-party provider data and forensic legal hold as open decisions requiring owner/legal review.
3. Indicate current implemented vs future read/write availability with evidence pointers. Never invent a public export API or staff raw-prompt grant. Link product Admin trust and technical persistence without duplicating full data schemas.

Before editing, compare actual source tree, the selected meaning of exact headings, all incoming links and current dirty state. If the reader question is already answered at one precise stable owner, **record reviewed no-op** and improve the route instead of adding a redundant document.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | changed: one Proposed link in docs/product/admin/commercial-and-trust.md#trust-and-privacy-are-a-different-mandate without making unresolved mechanisms normative | Selected product owners above; exact Proposed/Blocked boundary | Human ratification required before any new game, permission or legal rule |
| Technical | unchanged because this Change authors an unratified matrix and does not add a runtime guarantee. One Proposed link on each technical page adopts no retention period and no export API | docs/technical/platform/data-and-persistence.md, docs/technical/observability/retention-and-access.md, docs/technical/platform/identities-and-access.md; selected wording stays | Source proof is not invented |
| Code | unchanged because this is a documentation-only Change: **no application source, tests, schema, migrations or executable tool modification** is allowed | Source files are read-only evidence; runbooks may cite commands only after safety review | Negative: any executable diff blocks Done |
| Related | changed: CREATE work/designs/open/player-data-lifecycle/README.md | Governing pages listed above. docs/README.md, the product index, and the technical index stay unedited | Human ratification still required before any privacy rule is selected |

**Planned CREATE/RELOCATE gating:** the destination path may not exist at design time. Do not mark Ready until WIKI16's create/move plan compatibility is checked or the packet is explicitly revised to an existing-owner edit. Require an actual migration of every important inbound fragment before Done; no automatic "page count improved" acceptance.

## Acceptance and adversarial proof

**Normal:** a fresh agent answers the intended reader question from the correct owner with selected/proposed/implemented states separated, and the new page genuinely reduces detours or ambiguity. **Negative:** A README describes deletion as instantaneous from all backups/third-party systems, or a Support case becomes authority to export every user's raw prompts. A successful import or a stored row does not authorize export or disclosure of another person's data. A backup restore does not prove that deletion already happened.

**Owner gate:** Privacy/legal/security decisions, retention periods and production capabilities stay explicitly Proposed/Blocked.

**Verification:** exact before/after claim ledger, source-revision status where factual, full-link/anchor and reverse dependency checks, reader task trace, and independently reviewed falsifying counterexample. All actual commands/results must be recorded, not guessed. A page can be *good but not needed*: closing with a proved no-op or cancelling the proposed split is legitimate.

**Execution record:** The matrix was not already answered on one owner, so the page was created. SHA `b3113814` from `git rev-parse --short HEAD`. Code unchanged. No provider call. `python` import of `scripts/check_docs.py` `check_file` on the new matrix, the four linked pages, and this CHANGE.md returned clean. `guardChange` plan mode returned ok with no findings. Scoped close, with changed paths limited to the new matrix and the four linked pages, returned ok. It warned `citation-candidate` for pages that already cite those four owners, including `docs/README.md` dependents, `docs/product/admin/README.md`, `docs/product/gameplay/acceptance-scenarios.md`, and several technical neighbors. Those pages were not edited: the added sentence does not change the claim they cite, and other packets own the indexes, acceptance scenarios, and runbooks. Full-tree close was not used because the worktree can contain concurrent edits. WIKI16 create recognition is the CREATE row in the current guard; this packet does not mark WIKI16 Done.

## Document shape | shape-ops.v1

| Operation | Path | Heading migration | Unique conservation |
| --- | --- | --- | --- |
| CREATE | work/designs/open/player-data-lifecycle/README.md | new owner; no old heading moved | The matrix stays Proposed and unratified. A stored row does not authorize export of another person's data. A backup restore does not prove that deletion already happened. No jurisdiction or retention period is adopted. |

## Reconciliation ledger | fill at execution

CREATE work/designs/open/player-data-lifecycle/README.md

Inspected source SHA: `b3113814`. Code unchanged.

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| work/designs/open/player-data-lifecycle/README.md#rights-matrix | unratified design | changed: CREATE the rights matrix. Status stays Proposed and unratified. No jurisdiction, retention period, public export API, or staff raw-prompt grant is adopted. | no source behavior changed; inspected SHA b3113814 | documentation inspection; Proposed, not a selected rule | A successful import or a stored row does not authorize export or disclosure of another person's data. A backup restore does not prove that deletion already happened. | CREATE work/designs/open/player-data-lifecycle/README.md |
| docs/product/admin/commercial-and-trust.md#trust-and-privacy-are-a-different-mandate | product, already proposed on that page | changed: one Proposed link to the matrix. The privacy job, the information-class boundaries, and the refusal of a production grant stay as written. | no source behavior changed; inspected SHA b3113814 | documentation inspection | A support case does not become authority to export every user's raw prompts. A removed login is not erased data. | one link under that heading |
| docs/technical/platform/data-and-persistence.md#changes-retention-and-deletion | technical | changed: one Proposed link only. The deletion order, the backup limit, the Temporal remainder, and the ban on automatic document deletion stay as written. No retention period is adopted. | no source behavior changed; inspected SHA b3113814 | documentation inspection | A backup restore does not prove that deletion already happened. This link does not describe deletion as instantaneous. | one link at the end of that heading |
| docs/technical/observability/retention-and-access.md#owner-map | technical recommendation, unratified | changed: one Proposed link only. Candidate day counts stay unratified. | no source behavior changed; inspected SHA b3113814 | documentation inspection | A 90-day or 180-day candidate is not an adopted retention period or a legal hold. | one link under that heading |
| docs/technical/platform/identities-and-access.md#authentication-and-sessions | technical | changed: one Proposed link only. Session validation and membership checks stay the selected read rule. | no source behavior changed; inspected SHA b3113814 | documentation inspection | A stored row does not authorize disclosure of another person's data. A session is not an export API. | one link at the end of that heading |
| docs/technical/platform/http-api-and-client-contracts.md#authenticated-actor-scope | technical | unchanged because the session check, 401-before-work, and owner-scoped 404 stay as written. The new link adds no access right. | no source behavior changed; heading re-read at b3113814 | documentation inspection | A public field must not expose another owner's stored row. | page not edited; same file also holds private-dto-projection |
| docs/technical/observability/identities-and-evidence.md#7-read-and-reconstruction | technical | unchanged because membership on a reconstruction read stays required. This Change does not edit that page. | no source behavior changed; heading re-read at b3113814 | documentation inspection | A shared hash does not make another story readable. | page not edited |
| docs/technical/admin/topology-and-authorization.md#authorization-claim-map | technical | unchanged because a staff principal stays separate from the story owner. This Change does not edit that page. | no source behavior changed; heading re-read at b3113814 | documentation inspection | A staff principal must not be treated as the story owner, and raw prompt disclosure stays withheld. | page not edited |
| docs/README.md | product index | unchanged because the index already points at unratified retention and this Change does not edit it. | no source behavior changed; inspected SHA b3113814 | documentation inspection | An index sentence must not turn the matrix into a selected retention period. | page not edited |
| docs/technical/README.md | technical index | unchanged because identity and persistence stay the index rows they already are. This Change does not edit that index. | no source behavior changed; inspected SHA b3113814 | documentation inspection | The index must not adopt a retention period or an export API. | page not edited |
| docs/product/README.md | product index | unchanged because this Change does not edit the product index and does not add a player right there. | no source behavior changed; inspected SHA b3113814 | documentation inspection | The product index must not ratify a jurisdiction, a retention period, or a staff raw-prompt grant. | page not edited |
| Executable application, API, and test files | code | unchanged because no application source, test, schema, migration, or tool was modified. | no source behavior changed; inspected SHA b3113814 | documentation inspection. This Change has no executable diff. | An executable diff would block close. A lab command is not turned into a public export endpoint. | no code edit |

No automatic next packet. Stop at any new product policy, staff permission, legal retention rule, provider spend or incompatible source owner that requires an independent decision.
