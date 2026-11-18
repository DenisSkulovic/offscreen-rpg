# REAL04 | Align the first-solo product promise, creation routes and public-demo content provenance

**State:** Proposed, **needs product-owner meaning review before Ready**. **Kind:** documentation. **Owner:** product owner; publication rights require separate legal decision. **Parent:** [REAL product target](../../../designs/open/playability-reality/PRODUCT-CORE.md). **Baseline:** `43d5ddfc` source, audit-only main through `3d67347`.

## Outcome

A new reader and a prospective user can distinguish **one constrained authored solo playability proof** from (a) a source-observed freeform creation UI, (b) open-ended universality and invention guarantees not yet validated, (c) privately developed third-party-setting example data, and (d) an approved rights-clean public demo (not yet approved). The goal is honest scope and provenance, not deletion of functioning code or a new public license.

**Problem today:** docs/product/foundations/vision.md already says solo-first and a small relevant world. docs/product/experience/entry-and-onboarding.md simultaneously describes prepared/reusable/from-scratch routes, narrative initiative and canon-invention controls, while its current-POC section accurately lists a Vvardenfell-prepared route and "Create your own story". Some controls and the generality of the routes are not live-play-proven. The provenance inventory under work/designs/open/content-provenance-and-rights/README.md already says the SRD attribution is **not** Vvardenfell publication permission.

## Exact editorial scope

1. In docs/product/foundations/vision.md#first-playable-target, keep selected solo-first, independent later party aspiration and the current engine/time invariants. If REAL01 supplies the specific primary oracle, link it. Do not silently make "harbor" the only eventual commercial world.
2. In docs/product/experience/entry-and-onboarding.md#creation-information-architecture and #current-poc-honesty, add a small **capability/maturity matrix**, not a second onboarding spec: prepared local Vvardenfell route = source-observed/private sample; freeform story route = source-observed UI with no human-validated arbitrary-world reliability; advanced initiative/invention settings = selected design vs actual UI presence per source reinspection; original rights-cleared public demo = target pending content and rights review.
3. In docs/product/README.md or STATUS.md, add precise route/status reference only if needed for newcomers. Never claim a current user feature is unavailable if source shows it; classify quality guarantee separately from route existence.
4. In work/designs/open/content-provenance-and-rights/README.md, **link** the public-demo decision without pretending this Change selects a copyright license. Keep this page the unique rights-owner; no duplicate checklist.
5. Preserve the "Create your own story" route as long as source contains it. **Do not** change defaults, gate it away, delete users' drafts, impose new spend or ban user-supplied settings.

## Open owner decisions (hold before changing normative promises)

- **Public demo content:** use an original harbor/beacon package (recommended) or another rights-reviewed world. Creating and hosting it is a later **separate** content/implementation Change. The existing Vvardenfell/Seyda Neen source samples are not automatically licensed by an SRD attribution.
- **Creation wording:** is freeform a first-playable supported route, an experimental feature, or an existing editor with no playability guarantee? Recommend source-observed/experimental in release claims until evaluated, while leaving current UI working. Ratification required for changed selected guarantee.
- **Controls:** list only actually exposed initiative/invention settings as implemented. Product *design* of rich controls remains a distinct maturity tier.
- **Publication/terms:** public hosting, commercial reuse and user-upload licensing need explicit policy/legal review; this packet cannot decide them.

## Negative acceptance

A product reader must not infer that an existing freeform button proves arbitrary playable worlds or that LICENSE/NOTICE for rules authorizes a Vvardenfell demo. Conversely, no edit may imply the existing freeform path was removed or that private use of source fixtures is prohibited. A sample world pin is provenance, not permission to redistribute.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | changed (conditional on owner ratification): docs/product/experience/entry-and-onboarding.md#current-poc-honesty and #creation-information-architecture; docs/product/foundations/vision.md#first-playable-target only if a link/status correction is needed | docs/product/README.md; acceptance-scenarios.md | Ratified distinction: UI existence vs reliability pledge |
| Technical | unchanged because no creation schema, route, rights model, package pin or execution code changes | docs/technical/storyteller/canonical-documents-and-packages.md; docs/technical/client/architecture.md | Inspect actual implementation before wording |
| Code | unchanged because this is documentary scope/provenance clarification; all existing UI, source packages and uploaded drafts must remain untouched | apps/web creation paths; content/starts/seyda-neen-prisoner; content/worlds/vvardenfell-poc | Negative: no silent feature removal |
| Related | changed: work/designs/open/content-provenance-and-rights/README.md **only for one concise link if necessary**, STATUS.md tier if new evidence is available | NOTICE.md; docs/runbooks/content-package-authoring.md | Existing provenance authority preserved |

No file split/create/retire. No provider, hosting, publication or legal approval.

## Verification and handoff

Before selection, owner resolves exact wording of the two normative questions above. Cursor then traces actual UI controls and imports at latest HEAD; edits only approved canonical headings; checks links, adjacent claims and original negative rights caveat; completes affected claim ledger and archives. Do not invent a separate research/product canon. REAL01/02 may proceed independently; REAL04 cannot become Done by relabeling uncertain rights as "safe".
