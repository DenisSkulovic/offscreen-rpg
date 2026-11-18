# DOC41 | Create an app-specific technical threat-boundary map for identity, content and provider access

**State:** Proposed (unselected). **Kind:** documentation. **Sequence:** after WIKI16 and DOC27/DOC28 architecture source review. **Baseline:** clean snapshot `781c2fc` and [coverage-gap catalogue](../../../designs/open/wiki-discovery-coverage/COVERAGE-GAPS.md). **Do not promote a proposed trust or legal rule to selected canon.**

## Cursor first-screen brief

**Evidence and gap:** The system has authenticated player HTTP, staff case grants, private document roots, potentially paid provider packets, source-bound Storyteller context and worker recovery. Relevant denials exist but are scattered. The generic .agents/knowledge/security-and-trust.md is professional guidance, not an Offscreen-specific trust-boundary contract.

**Current authoritative material to read:**
- [docs/technical/platform/identities-and-access.md](../../../../docs/technical/platform/identities-and-access.md)
- [docs/technical/admin/topology-and-authorization.md](../../../../docs/technical/admin/topology-and-authorization.md)
- [docs/technical/storyteller/provider-boundary.md](../../../../docs/technical/storyteller/provider-boundary.md)
- [docs/technical/platform/data-and-persistence.md](../../../../docs/technical/platform/data-and-persistence.md)
- [apps/api/README.md](../../../../apps/api/README.md)

**Potential new owner:** `docs/technical/platform/security-and-trust-boundaries.md`. Its absence is intentional at design time; WIKI16 must first handle planned CREATE and safe inbound-map reconciliation.

## Editorial work to perform after selection

1. Build an exact trust-boundary diagram/table: browser and public client, authenticated API, Better Auth identity, application admission, staff control plane, private document store, Temporal/worker and external model provider; mark actual installed vs future components.
2. For each boundary name actor, asset, admitted read/write, credential/tenant isolation, leak route, failure mode and owning technical section; avoid reprinting auth implementation code or secret values.
3. Source-inspect selected risk paths (cross-owner 404, staff grant/case, provider packet redaction, story-specific document handles, SSE hint) and add normal/negative proof examples. Label unreviewed security questions as proposals, not passed audit.
4. Route from technical hub and source README and ensure no duplicate policy with Admin product privacy, provider spending or staff forensic access. No deployment/security control change.

Before deciding on the new owner, verify that the question cannot be answered adequately with a section in the existing closest owner. Preserve accepted game/security constraints and the exact chosen source/proof tier. Do not confuse being able to import/propose a document with authorization to publish or reveal it.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because no new player/trust/financial rights are selected by this documentation survey | `docs/product/README.md` and present product rules/policy | New normative product policy would require owner ratification |
| Technical | changed: CREATE `docs/technical/platform/security-and-trust-boundaries.md` as a source-grounded map of **existing** trust boundaries; unknown/proposed risks remain labeled | docs/technical/platform/identities-and-access.md, docs/technical/admin/topology-and-authorization.md, docs/technical/storyteller/provider-boundary.md, docs/technical/platform/data-and-persistence.md | Keep selected vs implemented vs proposed distinctions |
| Code | unchanged because this is a documentation-only Change and no auth, policy, package parser, provider or worker executable modification is authorized | Source read-only for exact rights/provenance/trust-boundary evidence | Negative: executable diff, imagined audit pass or invented approval blocks completion |
| Related | changed: proposed CREATE `docs/technical/platform/security-and-trust-boundaries.md` and context-specific documentation router links if the owner review supports it; otherwise unchanged with reason | `docs/technical/README.md`, `docs/runbooks/README.md`, `NOTICE.md`, affected historical/public route as applicable | WIKI16 create compatibility, unique owner and incoming links |

## Acceptance and negative case

**Normal:** a reader can distinguish documented facts, proposed future policy, current technical protection and exact unknowns with a bounded task route. **Negative:** A Support staff persona gains broad raw prompt access by reading a proposed Admin diagram, or a model receives private document handles from another story.

**Approval gate:** A new security policy or grant boundary needs explicit owner review; no implicit new production capability from a threat diagram.

**Proof:** before/after claim, selected/proposed/implemented matrix, source paths and SHA, independent adverse reading, actual link/heading and Change-close guard results. Do not claim a security assessment or legal review that did not occur.

## Reconciliation ledger (complete only when executed)

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/technical/platform/identities-and-access.md exact heading after owner review | proposal/technical evidence | pending owner and approved scope | no source behavior changed; doc SHA pending | not run: Proposed | A Support staff persona gains broad raw prompt access by reading a proposed Admin diagram, or a model receives private document handles from another story. | pending route audit |

No automatic next packet. Stop and request an owner decision for changes to money, privacy, user rights, distribution permissions or production staff grants.
