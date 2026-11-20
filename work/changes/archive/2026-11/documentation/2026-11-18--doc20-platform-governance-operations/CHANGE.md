# DOC20 | Reconcile platform identity, spending, notification and deployment authority

**State:** Done (2026-11-18).
**Kind:** documentation. **Editorial wave:** S4. **Sequence:** after DOC16 and DOC19. Inspected at `9bb6ea44`. No source implementation is authorized.

## Cursor first-screen brief

**Specific defect:** Selected entitlement/identity fences, notification UX and deployment topology live alongside selected or proposed future hosted capabilities; example providers and observability components are not necessarily deployed.

**Canonical review set:**
- [docs/product/storyteller/profiles-and-settings.md](../../../../../../docs/product/storyteller/profiles-and-settings.md)
- [docs/technical/platform/identities-and-access.md](../../../../../../docs/technical/platform/identities-and-access.md)
- [docs/technical/platform/spending-and-entitlements.md](../../../../../../docs/technical/platform/spending-and-entitlements.md)
- [docs/technical/platform/notifications.md](../../../../../../docs/technical/platform/notifications.md)
- [docs/technical/platform/topology.md](../../../../../../docs/technical/platform/topology.md)
- [docs/technical/platform/deployment-and-compatibility.md](../../../../../../docs/technical/platform/deployment-and-compatibility.md)

Read the [editorial standards](../../../../../designs/open/documentation-editorial-audit/EDITORIAL-STANDARD.md), [full page register](../../../../../designs/open/documentation-editorial-audit/PAGE-REGISTER.md) and exact selected/proposed owner headings. The product pages are consulted or edited according to the Product plane, never overwritten to match accidental code behavior.

## Intended text and structural delta

1. Make exact entitlement-vs-funding-vs-recipe authority explicit, including defaults, fail-closed unknowns, bounded creative settings, reservation/charge uncertainty and no-spend cases.
2. Separate current membership/identity and release-ready command scopes from proposed powerful staff grants; describe notification routes without granting a new action from stale push content.
3. Relocate dated runtime/deployment inventory to STATUS/runbooks while keeping selected topology and compatibility contract; note when OpenTelemetry or other observability services are only planned.

Preserve all selected invariants, unique decisions, admitted security/privacy scope, negative cases and exact historical evidence. Improve paragraph-level clarity and meaningful claim links, not link density or arbitrary brevity. An archival or source-move decision must include inbound link repair and separate proof; do not delete a useful owner on a hunch.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because this technical/lab editorial outcome cannot alter selected player/operator permissions in `docs/product/storyteller/profiles-and-settings.md` | `docs/product/storyteller/profiles-and-settings.md` and governing headings | Explicit ratification for any normative meaning change |
| Technical | changed: `docs/technical/platform/identities-and-access.md`, `docs/technical/platform/spending-and-entitlements.md`, `docs/technical/platform/notifications.md`, `docs/technical/platform/topology.md`, `docs/technical/platform/deployment-and-compatibility.md`; strengthen factual, selected/proposed and negative-case readability without creating runtime behavior | `docs/technical/platform/identities-and-access.md`, `docs/technical/platform/spending-and-entitlements.md`, `docs/technical/platform/notifications.md`, `docs/technical/platform/topology.md`, `docs/technical/platform/deployment-and-compatibility.md` and source/evidence owner maps | Real source proof or explicit unknown; no fictional test receipts |
| Code | unchanged because this documentation-only Change permits **zero** executable source, tool, test, migration or configuration edits | Source/CI may be examined read-only for factual claims | Negative: any executable diff makes the packet incomplete until separately authorized |
| Related | unchanged because no path relocation is preapproved; repair actual inbound `docs/README.md`, technical/product route and typed dependent edges if the editorial review justifies movement | Cross-page claimant list, reverse dependency graph, affected source maps | Broken-reference and adverse-reading check, reviewed unchanged reasons |

## Acceptance and adverse case

**Normal:** a fresh agent can answer who governs the selected claim, whether its realization is proven, which dependent documents matter, and what is conditional. **Negative:** A setting grants model budget, a push notification becomes a command authority, or a diagram of future infrastructure is described as deployed and tested.

**Stop:** Billing/privacy/deployment permission and actual production claims require owner or technical evidence review; no new policy via editorial wording. Do not auto-select another Change or claim all docs are clean based on these proposals.

**Verification to record:** actual full-checkout link and wiki graph checks, plan/close change-guard, exact SHAs/changed headings, before/after claim and proposal classifications, dependent dispositions, adversarial reading and unresolved decisions. Any source claim needs inspected source evidence. A passing graph proves only structure.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/technical/platform/identities-and-access.md#who-owns-the-boundary | technical | changed: sessions and membership stay on this page and the other rows keep their own owners | docs/technical/platform/identities-and-access.md at 9bb6ea44 | documentation-only | a creative setting does not grant model budget or account entitlement | the new heading does not replace an existing anchor |
| docs/technical/platform/identities-and-access.md#authentication-and-sessions | technical | unchanged: session, invitation, and membership checks stay the command gate | docs/technical/platform/identities-and-access.md at 9bb6ea44 | documentation-only | a push notification does not become command authority | the heading stayed in place |
| docs/technical/platform/identities-and-access.md#boundaries-that-stay-next-door | technical | unchanged: a transport hint still leaves membership as the command gate | docs/technical/platform/identities-and-access.md at 9bb6ea44 | documentation-only | a push notification does not become command authority | the heading stayed in place |
| docs/technical/platform/spending-and-entitlements.md#who-owns-the-boundary | technical | changed: entitlement, funding allowance, task recipe, and the usage window stay separate rows | docs/technical/platform/spending-and-entitlements.md at 9bb6ea44 | documentation-only | a creative setting does not grant model budget or account entitlement | the new heading does not replace an existing anchor |
| docs/technical/platform/spending-and-entitlements.md#distinct-authorities | technical | changed: the creative-setting denial sits beside the existing distinct authorities | docs/technical/platform/spending-and-entitlements.md at 9bb6ea44 | documentation-only | a creative setting does not grant model budget or account entitlement | the heading stayed in place |
| docs/technical/platform/spending-and-entitlements.md#free-subscription-and-on-demand-profiles | technical | unchanged: illustrative caps stay examples and commercial prices stay unchosen | docs/technical/platform/spending-and-entitlements.md at 9bb6ea44 | documentation-only | no new price or grant was added | the heading stayed in place |
| docs/technical/platform/spending-and-entitlements.md#hold-and-recovery-semantics | technical | unchanged: hold and recovery wording stays as already written | docs/technical/platform/spending-and-entitlements.md at 9bb6ea44 | documentation-only | no new recovery rule was added | the heading stayed in place |
| docs/technical/platform/spending-and-entitlements.md#conservative-development-preset-and-first-paid-gate | technical | unchanged: the proposed first-paid envelope stays a proposal | docs/technical/platform/spending-and-entitlements.md at 9bb6ea44 | documentation-only | no new price or grant was added | the heading stayed in place |
| docs/technical/platform/notifications.md#who-owns-the-boundary | technical | changed: delivery stays on this page | docs/technical/platform/notifications.md at 9bb6ea44 | documentation-only | a push notification does not become command authority | the new heading does not replace an existing anchor |
| docs/technical/platform/notifications.md#delivery-flow | technical | changed: opening a push still loads current authorized state | docs/technical/platform/notifications.md at 9bb6ea44 | documentation-only | a push notification does not become command authority | the heading stayed in place |
| docs/technical/platform/notifications.md#contact-privacy-and-actions | technical | unchanged: quiet hours, previews, and credential handling stay as already written | docs/technical/platform/notifications.md at 9bb6ea44 | documentation-only | no privacy policy was added | the heading stayed in place |
| docs/technical/platform/topology.md#who-owns-the-boundary | technical | changed: selected topology stays on this page | docs/technical/platform/topology.md at 9bb6ea44 | documentation-only | a diagram of future infrastructure is not a claim that the service is deployed and tested | the new heading does not replace an existing anchor |
| docs/technical/platform/topology.md#recommendation | technical | changed: OpenTelemetry and Langfuse stay proposed | docs/technical/platform/topology.md at 9bb6ea44 | documentation-only | observer services stay planned | the heading stayed in place |
| docs/technical/platform/topology.md#runtime-shape | technical | changed: the diagram stays the selected shape and carries the deployment-proof denial | docs/technical/platform/topology.md at 9bb6ea44 | documentation-only | a diagram of future infrastructure is not a claim that the service is deployed and tested | the heading stayed in place |
| docs/technical/platform/deployment-and-compatibility.md#who-owns-the-boundary | technical | changed: compatibility stays on this page | docs/technical/platform/deployment-and-compatibility.md at 9bb6ea44 | documentation-only | a diagram of future infrastructure is not a claim that the service is deployed and tested | the new heading does not replace an existing anchor |
| docs/technical/platform/deployment-and-compatibility.md#scripted-testing-chamber | technical | changed: the chamber fixture inventory is labeled a realization record and points at capability coverage | docs/technical/platform/deployment-and-compatibility.md at 9bb6ea44 | documentation-only | the inventory stays a realization record | the heading stayed in place |
| docs/technical/platform/deployment-and-compatibility.md#playable-portfolio-release | technical | unchanged: visitor funding amounts stay product choices | docs/technical/platform/deployment-and-compatibility.md at 9bb6ea44 | documentation-only | no billing policy was added | the heading stayed in place |
| docs/technical/platform/deployment-and-compatibility.md#first-hosted-deployment | technical | changed: the hosted target stays selected and carries the deployment-proof denial | docs/technical/platform/deployment-and-compatibility.md at 9bb6ea44 | documentation-only | a diagram of future infrastructure is not a claim that the service is deployed and tested | the heading stayed in place |
| docs/technical/platform/deployment-and-compatibility.md#kubernetes-as-a-deliberate-extension | technical | changed: the later cluster exercise carries the deployment-proof denial | docs/technical/platform/deployment-and-compatibility.md at 9bb6ea44 | documentation-only | a diagram of future infrastructure is not a claim that the service is deployed and tested | the heading stayed in place |
| docs/technical/platform/deployment-and-compatibility.md#observability | technical | changed: observer services stay planned and the section points at capability coverage | docs/technical/platform/deployment-and-compatibility.md at 9bb6ea44 | documentation-only | OpenTelemetry stays planned | the heading stayed in place |
| docs/technical/platform/deployment-and-compatibility.md#tests-that-demonstrate-the-architecture | technical | unchanged: the scenarios stay acceptance cases | docs/technical/platform/deployment-and-compatibility.md at 9bb6ea44 | documentation-only | the table does not claim the service is deployed and tested | the heading stayed in place |
| docs/product/storyteller/profiles-and-settings.md#settings-with-distinct-meanings | product | unchanged: creative settings stay on this heading | docs/product/storyteller/profiles-and-settings.md at 9bb6ea44 | documentation-only | a creative setting does not grant model budget or account entitlement | the heading stayed in place |

exception: work/changes/README.md because the queue line is the selection route for this documentation change
exception: work/changes/ledger/2026-11.md because the closed-work index records this documentation change
exception: work/changes/archive/2026-11/README.md because the month index lists the archived change
exception: work/designs/open/documentation-editorial-audit/EDITORIAL-WAVES.md because the wave table will point at the archived change

No executable diff. Close checks use base 9bb6ea44. No provider call.
