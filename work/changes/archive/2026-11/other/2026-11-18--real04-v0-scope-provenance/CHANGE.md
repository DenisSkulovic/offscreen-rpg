# REAL04 | Align the first-solo product promise, creation routes and public-demo content provenance

**State:** Done (2026-11-18). **Kind:** documentation. **Owner:** product owner; publication rights require a separate legal decision. **Parent:** [REAL product target](../../../../../designs/open/playability-reality/PRODUCT-CORE.md). **Baseline:** `main@404d3c35ef16effc540a1842bac8595b41fa0928`. The selected wording is the packet's recommendation: the freeform route stays, without a reliability pledge, and a public harbor demo stays a later rights review.

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
| Product | changed: docs/product/experience/entry-and-onboarding.md#current-poc-honesty distinguishes a present route from a reliability pledge; docs/product/foundations/vision.md#first-playable-target keeps the harbor oracle from becoming the only later world | docs/product/README.md; docs/product/gameplay/acceptance-scenarios.md | The freeform route stays, without a playability pledge |
| Technical | unchanged because no creation schema, route, rights model, package pin or execution code changes | docs/technical/storyteller/canonical-documents-and-packages.md; docs/technical/client/architecture.md | Inspect actual implementation before wording |
| Code | unchanged because this is documentary scope/provenance clarification; all existing UI, source packages and uploaded drafts must remain untouched | apps/web creation paths; content/starts/seyda-neen-prisoner; content/worlds/vvardenfell-poc | Negative: no silent feature removal |
| Related | changed: work/designs/open/content-provenance-and-rights/README.md **only for one concise link if necessary**, STATUS.md tier if new evidence is available | NOTICE.md; docs/runbooks/content-package-authoring.md | Existing provenance authority preserved |

No file split/create/retire. No provider, hosting, publication or legal approval.

## Verification and handoff

Before selection, owner resolves exact wording of the two normative questions above. Cursor then traces actual UI controls and imports at latest HEAD; edits only approved canonical headings; checks links, adjacent claims and original negative rights caveat; completes affected claim ledger and archives. Do not invent a separate research/product canon. REAL01/02 may proceed independently; REAL04 cannot become Done by relabeling uncertain rights as safe.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/product/experience/entry-and-onboarding.md#current-poc-honesty | product | changed: the two creation routes stay, and the freeform route is not a reliability pledge | apps/web/src/features/stories/draft-editor.tsx at 404d3c35 | source-observed | the editor still offers Create your own story | the product index points at this heading |
| docs/product/experience/entry-and-onboarding.md#creation-information-architecture | product | unchanged because the staged design, including initiative and invention presets, stays the selected target | apps/web/src/features/stories/storyteller-select.tsx at 404d3c35 | source-observed | those presets are not described as current separate controls | the heading stayed in place |
| docs/product/foundations/vision.md#first-playable-target | product | changed: the harbor oracle is not a rights clearance and not the only later world | docs/product/foundations/vision.md at 404d3c35 | authored-target | the sentence does not withdraw the solo milestone or the small-party aspiration | the heading stayed in place |
| docs/product/README.md#product | product | changed: the entry question says both routes are present and freeform is not a playability pledge | apps/web/src/features/stories/draft-editor.tsx at 404d3c35 | source-observed | the index does not say the freeform route was removed | the question links the honesty heading |
| work/designs/open/content-provenance-and-rights/README.md#open-decisions | related | changed: a public harbor demo is named as an open candidate and is not a license | NOTICE.md at 404d3c35 | source-observed | the SRD attribution still does not cover the Vvardenfell sample | the rights page remains the unique owner |
| docs/technical/storyteller/canonical-documents-and-packages.md | technical | unchanged because no package pin or rights model changed | content/starts/seyda-neen-prisoner/start-package.json at 404d3c35 | source-observed | the start pin is still present and still has no license key | no heading moved |
| apps/web/src/features/stories/draft-editor.tsx | code | unchanged because the create route and its controls were inspected and not edited | apps/web/src/features/stories/draft-editor.tsx at 404d3c35 | source-observed | Create from scratch remains a button | no source file moved |
| STATUS.md | related | changed: the status note lists the present controls and the unlicensed sample | no executable file edited; baseline 404d3c35 | source-observed | the note does not call the Vvardenfell sample a public demo | the queue records the packet |

exception: work/changes/README.md because the queue line is the selection route for this packet
exception: work/changes/ledger/2026-11.md because the closed-work index records this packet
exception: work/changes/archive/2026-11/README.md because the month index lists the archived packet
exception: work/designs/open/playability-reality/README.md because the program sequence now points at the archived REAL04 packet

## Receipt

`python scripts/check_docs.py` reported 0 problems. The editor was read at `draft-editor.tsx`, `storyteller-select.tsx`, and `opening-preview.tsx`. No executable file was edited. No model call. No license was selected.
