# DOC36 | Map player privacy requests, story deletion and retention as one explicit unresolved policy

**State:** Proposed (unselected, normative domain approval blocked). **Kind:** documentation. **Ordering:** after DOC31, DOC23 already Done; WIKI16 for proposed new design owner. **Audit basis:** clean committed `781c2fc`; [gaps](../../../designs/open/wiki-discovery-coverage/COVERAGE-GAPS.md), [architecture](../../../designs/open/wiki-discovery-coverage/TARGET-ARCHITECTURE.md), [editorial standard](../../../designs/open/documentation-editorial-audit/EDITORIAL-STANDARD.md). Baseline is not implementation permission.

## Cursor first-screen brief

**Reader job now insufficiently supported:** Admin product mentions privacy access/correction/export/deletion, technical storage outlines story deletion and delayed backup removal, and observability lists retention candidates. No cohesive player-centered lifecycle decision distinguishes requested access, export, correction, revoke and deletion across PostgreSQL, Temporal, documents, provider packets, backups and evidence.

**Governing present owners to read:**
- [docs/product/admin/commercial-and-trust.md](../../../../docs/product/admin/commercial-and-trust.md)
- [docs/technical/platform/data-and-persistence.md](../../../../docs/technical/platform/data-and-persistence.md)
- [docs/technical/observability/retention-and-access.md](../../../../docs/technical/observability/retention-and-access.md)
- [docs/technical/platform/identities-and-access.md](../../../../docs/technical/platform/identities-and-access.md)

**Proposed newly created/relocated owner:** `work/designs/open/player-data-lifecycle/README.md`. This is a hypothesis to validate, not a required arbitrary addition. Content with unratified decisions belongs under `work/designs/open/`, not silently selected `docs/product/`.

## Planned editorial change

1. Create a proposed rights/data-flow matrix by purpose and data class, without pretending any jurisdiction or retention period is already adopted. Trace known storage categories and authoritative deletion/status semantics from source docs.
2. Define request verification, identity/tenant scope, safe export audience, pending work quarantine, irreversible effects, backup limitations, third-party provider data and forensic legal hold as open decisions requiring owner/legal review.
3. Indicate current implemented vs future read/write availability with evidence pointers. Never invent a public export API or staff raw-prompt grant. Link product Admin trust and technical persistence without duplicating full data schemas.

Before editing, compare actual source tree, the selected meaning of exact headings, all incoming links and current dirty state. If the reader question is already answered at one precise stable owner, **record reviewed no-op** and improve the route instead of adding a redundant document.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | changed: clarify scope/routing in existing selected docs/product/admin/commercial-and-trust.md without making unresolved mechanisms normative | Selected product owners above; exact Proposed/Blocked boundary | Human ratification required before any new game, permission or legal rule |
| Technical | unchanged because this Change authors proposed gameplay policy or nonbinding operations, not a new selected runtime guarantee | docs/technical/platform/data-and-persistence.md, docs/technical/observability/retention-and-access.md, docs/technical/platform/identities-and-access.md; preserve selected vs realized status | Source/fixture/contract proof never invented |
| Code | unchanged because this is a documentation-only Change: **no application source, tests, schema, migrations or executable tool modification** is allowed | Source files are read-only evidence; runbooks may cite commands only after safety review | Negative: any executable diff blocks Done |
| Related | changed: planned CREATE or conditional SPLIT/relocation `work/designs/open/player-data-lifecycle/README.md` plus exact inbound route updates if adopted; otherwise unchanged because existing owner suffices after review | `docs/README.md`, product/technical/runbook routes and all real incoming path#heading edges; historic citations retained | WIKI16 declared-CREATE/migration compatibility and semantic conservation receipt |

**Planned CREATE/RELOCATE gating:** the destination path may not exist at design time. Do not mark Ready until WIKI16's create/move plan compatibility is checked or the packet is explicitly revised to an existing-owner edit. Require an actual migration of every important inbound fragment before Done; no automatic "page count improved" acceptance.

## Acceptance and adversarial proof

**Normal:** a fresh agent answers the intended reader question from the correct owner with selected/proposed/implemented states separated, and the new page genuinely reduces detours or ambiguity. **Negative:** A README describes deletion as instantaneous from all backups/third-party systems, or a Support case becomes authority to export every user's raw prompts.

**Owner gate:** Privacy/legal/security decisions, retention periods and production capabilities stay explicitly Proposed/Blocked.

**Verification:** exact before/after claim ledger, source-revision status where factual, full-link/anchor and reverse dependency checks, reader task trace, and independently reviewed falsifying counterexample. All actual commands/results must be recorded, not guessed. A page can be *good but not needed*: closing with a proved no-op or cancelling the proposed split is legitimate.

## Reconciliation ledger | fill at execution

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| `docs/product/admin/commercial-and-trust.md` selected claim after owner inspection | product/technical/proposed as applicable | pending exact claim/decision and candidate created/split path | no source behavior changed; doc SHA pending | not run: Proposed | A README describes deletion as instantaneous from all backups/third-party systems, or a Support case becomes authority to export every user's raw prompts. | pending inbound/fragment map |

No automatic next packet. Stop at any new product policy, staff permission, legal retention rule, provider spend or incompatible source owner that requires an independent decision.
