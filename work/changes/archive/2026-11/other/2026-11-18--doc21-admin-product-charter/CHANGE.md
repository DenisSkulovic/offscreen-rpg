# DOC21 | Refound Admin product jobs while preserving proposed grant and policy boundaries

**State:** Done (2026-11-18). **Kind:** documentation. **Editorial wave:** S5a. **Sequence:** after DOC07 and DOC20. Inspected at `9bb6ea44`. No source implementation is authorized.

## Cursor first-screen brief

**Specific defect:** The Admin suite describes a mature future operation across Support, Engineering, Gameplay, AI, Business and Marketing; several illustrative permission packages remain unratified and cannot be treated as production grants.

**Canonical review set:**
- [docs/product/admin/ai-engineering-and-investigation.md](../../../../../../docs/product/admin/ai-engineering-and-investigation.md)
- [docs/product/admin/authority-and-governance.md](../../../../../../docs/product/admin/authority-and-governance.md)
- [docs/product/admin/charter-and-personas.md](../../../../../../docs/product/admin/charter-and-personas.md)
- [docs/product/admin/command-center-and-insights.md](../../../../../../docs/product/admin/command-center-and-insights.md)
- [docs/product/admin/commercial-and-trust.md](../../../../../../docs/product/admin/commercial-and-trust.md)
- [docs/product/admin/gameplay-and-liveops.md](../../../../../../docs/product/admin/gameplay-and-liveops.md)
- [docs/product/admin/operator-workflows.md](../../../../../../docs/product/admin/operator-workflows.md)
- [docs/product/admin/player-360-and-support.md](../../../../../../docs/product/admin/player-360-and-support.md)
- [docs/technical/admin/topology-and-authorization.md](../../../../../../docs/technical/admin/topology-and-authorization.md)

Read the [editorial standards](../../../../../designs/open/documentation-editorial-audit/EDITORIAL-STANDARD.md), [full page register](../../../../../designs/open/documentation-editorial-audit/PAGE-REGISTER.md) and exact selected/proposed owner headings. The product pages are consulted or edited according to the Product plane, never overwritten to match accidental code behavior.

## Intended text and structural delta

1. Write the user/operator job and bounded decision outcome for each product page; distinguish persona, overlapping role, capability package, reason/purpose, case, approval and actual grant.
2. Ensure Player 360, impersonation, Staff AI read, cancellation/refund, account export and LiveOps descriptions keep per-heading proposed/selected/implemented labels, not only an introductory disclaimer.
3. Use adverse operator journeys: cross-story identity confusion, redacted prompts, insufficient case purpose, delegated approval, revoke/expiry, dry-run receipts. Avoid inventing dashboard KPI thresholds or magic read access.

Preserve all selected invariants, unique decisions, admitted security/privacy scope, negative cases and exact historical evidence. Improve paragraph-level clarity and meaningful claim links, not link density or arbitrary brevity. An archival or source-move decision must include inbound link repair and separate proof; do not delete a useful owner on a hunch.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | changed: `docs/product/admin/ai-engineering-and-investigation.md`, `docs/product/admin/authority-and-governance.md`, `docs/product/admin/charter-and-personas.md`, `docs/product/admin/command-center-and-insights.md`, `docs/product/admin/commercial-and-trust.md`, `docs/product/admin/gameplay-and-liveops.md`, `docs/product/admin/operator-workflows.md`, `docs/product/admin/player-360-and-support.md`; clarify product jobs/status without adding granted permissions | `docs/product/admin/ai-engineering-and-investigation.md`, `docs/product/admin/authority-and-governance.md`, `docs/product/admin/charter-and-personas.md`, `docs/product/admin/command-center-and-insights.md`, `docs/product/admin/commercial-and-trust.md`, `docs/product/admin/gameplay-and-liveops.md`, `docs/product/admin/operator-workflows.md`, `docs/product/admin/player-360-and-support.md` and governing headings | Explicit ratification for any normative meaning change |
| Technical | unchanged because the technical authorization implementation guarantees in `docs/technical/admin/topology-and-authorization.md` are consulted, not rewritten | `docs/technical/admin/topology-and-authorization.md` and source/evidence owner maps | Real source proof or explicit unknown; no fictional test receipts |
| Code | unchanged because this documentation-only Change permits **zero** executable source, tool, test, migration or configuration edits | Source/CI may be examined read-only for factual claims | Negative: any executable diff makes the packet incomplete until separately authorized |
| Related | unchanged because no path relocation is preapproved; repair actual inbound `docs/README.md`, technical/product route and typed dependent edges if the editorial review justifies movement | Cross-page claimant list, reverse dependency graph, affected source maps | Broken-reference and adverse-reading check, reviewed unchanged reasons |

## Acceptance and adverse case

**Normal:** a fresh agent can answer who governs the selected claim, whether its realization is proven, which dependent documents matter, and what is conditional. **Negative:** A narrative example of a Support persona silently grants raw provider prompt access or cross-tenant impersonation, or an illustrative retention value becomes product policy.

**Stop:** Changes to staff privilege, money movement, privacy, data export/deletion or product support promises are blocked pending explicit owner/security/legal review. Do not auto-select another Change or claim all docs are clean based on these proposals.

**Verification to record:** actual full-checkout link and wiki graph checks, plan/close change-guard, exact SHAs/changed headings, before/after claim and proposal classifications, dependent dispositions, adversarial reading and unresolved decisions. Any source claim needs inspected source evidence. A passing graph proves only structure.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/product/admin/charter-and-personas.md#product-job-owners | product | changed: one map points support, live ops, commercial trust, AI investigation, command center, and operator workflow at their pages and keeps persona, role, capability package, case purpose, and actual grant distinct | inspected base 9bb6ea44; no executable source delta | documentation-only | a Support persona example does not grant raw provider prompt access or cross-tenant impersonation | new heading on the charter page |
| docs/product/admin/charter-and-personas.md#charter-and-personas | product | unchanged: the accepted long-term direction stays conditional for powerful actions | inspected base 9bb6ea44; no executable source delta | documentation-only | persona names stay jobs and do not become security roles | the heading stayed in place |
| docs/product/admin/charter-and-personas.md#personas-and-workspaces | product | unchanged: persona rows still withhold private narrative, raw prompts, and major refunds from the job name alone | inspected base 9bb6ea44; no executable source delta | documentation-only | a Support persona example does not grant raw provider prompt access or cross-tenant impersonation | the heading stayed in place |
| docs/product/admin/player-360-and-support.md#player-360-and-support | product | changed: illustrative Support, impersonation, raw-prompt, refund, export, and LiveOps examples stay Proposed or Blocked | inspected base 9bb6ea44; no executable source delta | documentation-only | a Support persona example does not grant raw provider prompt access or cross-tenant impersonation | the heading stayed in place |
| docs/product/admin/player-360-and-support.md#timeline-and-intervention | product | changed: the support negative now refuses raw provider prompt access and cross-tenant impersonation | inspected base 9bb6ea44; no executable source delta | documentation-only | a Support persona example does not grant raw provider prompt access or cross-tenant impersonation | the heading stayed in place |
| docs/product/admin/commercial-and-trust.md#commercial-operations-and-trust | product | changed: illustrative Support, impersonation, raw-prompt, refund, export, and LiveOps examples stay Proposed or Blocked | inspected base 9bb6ea44; no executable source delta | documentation-only | this page does not grant a refund, an export, or money movement | the heading stayed in place |
| docs/product/admin/commercial-and-trust.md#trust-and-privacy-are-a-different-mandate | product | changed: an illustrative retention number does not become product policy | inspected base 9bb6ea44; no executable source delta | documentation-only | an illustrative retention number does not become product policy | no retention duration was set |
| docs/product/admin/gameplay-and-liveops.md#gameplay-worlds-and-live-operations | product | changed: illustrative Support, impersonation, raw-prompt, refund, export, and LiveOps examples stay Proposed or Blocked | inspected base 9bb6ea44; no executable source delta | documentation-only | a LiveOps example stays a proposal and does not become a production stop | the heading stayed in place |
| docs/product/admin/ai-engineering-and-investigation.md#ai-engineering-and-investigation | product | changed: illustrative Support, impersonation, raw-prompt, refund, export, and LiveOps examples stay Proposed or Blocked | inspected base 9bb6ea44; no executable source delta | documentation-only | a Support persona example does not grant raw provider prompt access or cross-tenant impersonation | redacted diagnostic reads stay separate from raw-prompt access |
| docs/product/admin/command-center-and-insights.md#growth-and-insights | product | changed: an illustrative retention number does not become product policy | inspected base 9bb6ea44; no executable source delta | documentation-only | an illustrative retention number does not become product policy | no KPI threshold or dashboard access was added |
| docs/product/admin/command-center-and-insights.md#a-home-for-my-work-not-a-panopticon | product | unchanged: the shift-start surface still shows only sections an existing grant allows | inspected base 9bb6ea44; no executable source delta | documentation-only | no KPI threshold or dashboard access was added | the heading stayed in place |
| docs/product/admin/authority-and-governance.md#illustrative-packages-not-a-ratified-catalog | product | unchanged: package names stay candidates and are not production grants | inspected base 9bb6ea44; no executable source delta | documentation-only | a Support persona example does not grant raw provider prompt access or cross-tenant impersonation | the job map is on the charter page |
| docs/product/admin/operator-workflows.md#journeys | product | unchanged: journeys stay product sequences and the example writes stay gated | inspected base 9bb6ea44; no executable source delta | documentation-only | a deep link does not disclose a protected record | the heading stayed in place |
| docs/technical/admin/topology-and-authorization.md#1-the-architecture-choice | technical | unchanged: the dedicated control-plane choice and staff authorization checks stay as written | inspected base 9bb6ea44; no executable source delta | documentation-only | a product example does not widen staff authorization | no heading on that page was edited |

exception: work/changes/README.md because the queue line is the selection route for this documentation change
exception: work/changes/ledger/2026-11.md because the closed-work index records this documentation change
exception: work/changes/archive/2026-11/README.md because the month index lists the archived change
exception: work/designs/open/documentation-editorial-audit/EDITORIAL-WAVES.md because the wave table will point at the archived change

No executable diff. Close checks use base 9bb6ea44. No provider call.
