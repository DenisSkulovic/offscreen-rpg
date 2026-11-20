# DOC22 | Separate actual staff technical authorization from proposed Admin operation design

**State:** Done (2026-11-18). **Kind:** documentation. **Editorial wave:** S5b. **Sequence:** after DOC20 and DOC21. Reinspect HEAD, exact page headings, dependencies, source proof and dirty files; old editorial baseline is `f3e3bfe`. No source implementation is authorized.

## Cursor first-screen brief

**Specific defect:** Read-model catalogs, permission packages and audit/command syntax risk implying that proposed product powers are live, especially for raw AI traces and cross-tenant support.

**Canonical review set:**
- [docs/product/admin/authority-and-governance.md](../../../../../../docs/product/admin/authority-and-governance.md)
- [docs/product/admin/player-360-and-support.md](../../../../../../docs/product/admin/player-360-and-support.md)
- [docs/technical/admin/commands-and-audit.md](../../../../../../docs/technical/admin/commands-and-audit.md)
- [docs/technical/admin/console-and-read-models.md](../../../../../../docs/technical/admin/console-and-read-models.md)
- [docs/technical/admin/investigation-and-privacy.md](../../../../../../docs/technical/admin/investigation-and-privacy.md)
- [docs/technical/admin/topology-and-authorization.md](../../../../../../docs/technical/admin/topology-and-authorization.md)

Read the [editorial standards](../../../../../designs/open/documentation-editorial-audit/EDITORIAL-STANDARD.md), [full page register](../../../../../designs/open/documentation-editorial-audit/PAGE-REGISTER.md) and exact selected/proposed owner headings. The product pages are consulted or edited according to the Product plane, never overwritten to match accidental code behavior.

## Intended text and structural delta

1. Build a claim-level matrix of selected authorization target, currently implemented routes, proposed staff modules and withheld production grants.
2. Clarify authentication, workspace/tenant scope, case purpose, approvals, impersonation, receipts and redaction with explicit cross-tenant negative cases.
3. Keep technical command/write/audit semantics distinct from product operator workflows; link to one claim owner, do not promote a product proposal from its directory.

Preserve all selected invariants, unique decisions, admitted security/privacy scope, negative cases and exact historical evidence. Improve paragraph-level clarity and meaningful claim links, not link density or arbitrary brevity. An archival or source-move decision must include inbound link repair and separate proof; do not delete a useful owner on a hunch.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because this technical/lab editorial outcome cannot alter selected player/operator permissions in `docs/product/admin/authority-and-governance.md`, `docs/product/admin/player-360-and-support.md` | `docs/product/admin/authority-and-governance.md`, `docs/product/admin/player-360-and-support.md` and governing headings | Explicit ratification for any normative meaning change |
| Technical | changed: `docs/technical/admin/commands-and-audit.md`, `docs/technical/admin/console-and-read-models.md`, `docs/technical/admin/investigation-and-privacy.md`, `docs/technical/admin/topology-and-authorization.md`; strengthen factual, selected/proposed and negative-case readability without creating runtime behavior | `docs/technical/admin/commands-and-audit.md`, `docs/technical/admin/console-and-read-models.md`, `docs/technical/admin/investigation-and-privacy.md`, `docs/technical/admin/topology-and-authorization.md` and source/evidence owner maps | Real source proof or explicit unknown; no fictional test receipts |
| Code | unchanged because this documentation-only Change permits **zero** executable source, tool, test, migration or configuration edits | Source/CI may be examined read-only for factual claims | Negative: any executable diff makes the packet incomplete until separately authorized |
| Related | unchanged because no path relocation is preapproved; repair actual inbound `docs/README.md`, technical/product route and typed dependent edges if the editorial review justifies movement | Cross-page claimant list, reverse dependency graph, affected source maps | Broken-reference and adverse-reading check, reviewed unchanged reasons |

## Acceptance and adverse case

**Normal:** a fresh agent can answer who governs the selected claim, whether its realization is proven, which dependent documents matter, and what is conditional. **Negative:** A technical page describing Player 360 causes a reader to infer general support impersonation or raw prompt disclosure is currently authorized.

**Stop:** Any enlargement of staff grants requires product/security approval and executable change; this packet remains Markdown-only. Do not auto-select another Change or claim all docs are clean based on these proposals.

**Verification to record:** actual full-checkout link and wiki graph checks, plan/close change-guard, exact SHAs/changed headings, before/after claim and proposal classifications, dependent dispositions, adversarial reading and unresolved decisions. Any source claim needs inspected source evidence. A passing graph proves only structure.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/technical/admin/topology-and-authorization.md#authorization-claim-map | technical | changed: four-column map records the selected control-plane target, no route this page calls implemented, the proposed staff modules, and withheld production grants | docs/technical/admin/topology-and-authorization.md at 9bb6ea44 | documentation-only | a Player 360 description does not authorize general support impersonation; an investigation read does not authorize raw prompt disclosure; cross-tenant access stays unselected | the new heading does not replace an existing anchor |
| docs/technical/admin/topology-and-authorization.md#1-the-architecture-choice | technical | unchanged: the dedicated control plane, `/control`, and `/api/admin/*` stay the selected target | docs/technical/admin/topology-and-authorization.md at 9bb6ea44 | documentation-only | this heading still does not call those routes implemented | the heading stayed in place |
| docs/technical/admin/topology-and-authorization.md#6-initial-delivery-boundary | technical | unchanged: live writes, raw narrative export, financial actions, world repair, and general LiveOps editing stay outside the first delivery boundary | docs/technical/admin/topology-and-authorization.md at 9bb6ea44 | documentation-only | the boundary still withholds those production grants | the heading stayed in place |
| docs/technical/admin/topology-and-authorization.md#8-architecture-rejection-cases | technical | unchanged: raw prompts in a basic Player 360 response stay a rejection case | docs/technical/admin/topology-and-authorization.md at 9bb6ea44 | documentation-only | a rendered read-only page still does not start a provider call | the heading stayed in place |
| docs/technical/admin/commands-and-audit.md#1-operational-intent-is-not-a-raw-crud-mutation | technical | changed: command and write semantics stay here and do not issue a production write grant | docs/technical/admin/commands-and-audit.md at 9bb6ea44 | documentation-only | ownerId impersonation stays refused | links to #authorization-claim-map |
| docs/technical/admin/commands-and-audit.md#5-administrative-audit-is-a-product-ledger-not-a-consolelog | technical | unchanged: audit fields and the ban on opening a story from an audit record stay here | docs/technical/admin/commands-and-audit.md at 9bb6ea44 | documentation-only | an audit reviewer still cannot open private story content from the audit record alone | the heading stayed in place |
| docs/technical/admin/commands-and-audit.md#7-first-wave-enabled-operations | technical | unchanged: later write categories stay separate contracts and no production role is added | docs/technical/admin/commands-and-audit.md at 9bb6ea44 | documentation-only | the six later domains stay unlaunched as a batch | the heading stayed in place |
| docs/technical/admin/console-and-read-models.md#4-shared-interaction-building-blocks | technical | changed: staff-console read models stay here, and a Player 360 description does not authorize general support impersonation | docs/technical/admin/console-and-read-models.md at 9bb6ea44 | documentation-only | a Player 360 description does not authorize general support impersonation | links to #authorization-claim-map |
| docs/technical/admin/console-and-read-models.md#1-one-staff-shell-with-isolated-authentication-and-data | technical | unchanged: `/control` stays the selected staff shell shape on this heading | docs/technical/admin/console-and-read-models.md at 9bb6ea44 | documentation-only | an authenticated player opening `/control` still receives no admin payload | the heading stayed in place |
| docs/technical/admin/investigation-and-privacy.md#6-sensitive-evidence-hierarchy | technical | changed: investigation reads and redaction stay here, and an investigation read does not authorize raw prompt disclosure | docs/technical/admin/investigation-and-privacy.md at 9bb6ea44 | documentation-only | an investigation read does not authorize raw prompt disclosure; cross-tenant access stays unselected | links to #authorization-claim-map |
| docs/technical/admin/investigation-and-privacy.md#2-required-projection-families | technical | unchanged: the projection catalog and its default exclusions stay on this heading | docs/technical/admin/investigation-and-privacy.md at 9bb6ea44 | documentation-only | a summary still excludes raw model inputs and outputs | the heading stayed in place |
| docs/product/admin/authority-and-governance.md#admin-authority-and-governance | product | unchanged: proposed operating policy stays the product owner and this catalog is not a production grant | docs/product/admin/authority-and-governance.md at 9bb6ea44 | documentation-only | technical prose did not accept the package catalog as production grants | the heading stayed in place |
| docs/product/admin/authority-and-governance.md#a-grant-is-one-coherent-permission | product | unchanged: one coherent permission stays the product rule | docs/product/admin/authority-and-governance.md at 9bb6ea44 | documentation-only | a second role still does not erase a global prohibition | the heading stayed in place |
| docs/product/admin/authority-and-governance.md#illustrative-packages-not-a-ratified-catalog | product | unchanged: the package names stay candidates | docs/product/admin/authority-and-governance.md at 9bb6ea44 | documentation-only | the names stay off the grant map as live permissions | the heading stayed in place |
| docs/product/admin/authority-and-governance.md#three-delegated-player-access-modes | product | unchanged: view, assist, and sandbox stay proposed delegated modes | docs/product/admin/authority-and-governance.md at 9bb6ea44 | documentation-only | a Player 360 description does not authorize general support impersonation | the heading stayed in place |
| docs/product/admin/authority-and-governance.md#adversarial-results-required-of-any-later-implementation | product | unchanged: the adversarial results stay required of a later implementation | docs/product/admin/authority-and-governance.md at 9bb6ea44 | documentation-only | test privilege still does not perform a production action | the heading stayed in place |
| docs/product/admin/player-360-and-support.md#player-360-and-support | product | unchanged: the proposed Player 360 target stays here, with production Support grants absent | docs/product/admin/player-360-and-support.md at 9bb6ea44 | documentation-only | a Player 360 description does not authorize general support impersonation | the heading stayed in place |
| docs/product/admin/player-360-and-support.md#subjects-that-must-stay-distinct | product | unchanged: account, payer, participant, and character stay distinct subjects | docs/product/admin/player-360-and-support.md at 9bb6ea44 | documentation-only | opening one account still does not authorize another person's private materials | the heading stayed in place |
| docs/product/admin/player-360-and-support.md#what-the-operator-must-be-able-to-answer | product | unchanged: the four access questions stay the product target | docs/product/admin/player-360-and-support.md at 9bb6ea44 | documentation-only | unknown stays distinct from zero | the heading stayed in place |
| docs/product/admin/player-360-and-support.md#shared-campaigns | product | unchanged: permission over one account stays off the other account | docs/product/admin/player-360-and-support.md at 9bb6ea44 | documentation-only | cross-tenant access stays unselected | the heading stayed in place |
| docs/product/admin/player-360-and-support.md#timeline-and-intervention | product | unchanged: typed timeline events and the absent live-worker grant stay the product statement | docs/product/admin/player-360-and-support.md at 9bb6ea44 | documentation-only | a player-view mode stays off the admin mutation path | the heading stayed in place |

exception: work/changes/README.md because the queue line is the selection route for this documentation change
exception: work/changes/ledger/2026-11.md because the closed-work index records this documentation change
exception: work/changes/archive/2026-11/README.md because the month index lists the archived change
exception: work/designs/open/documentation-editorial-audit/EDITORIAL-WAVES.md because the wave table will point at the archived change

No executable diff. Close checks use base 9bb6ea44. No provider call.
