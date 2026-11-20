# DOC40 | Establish a content provenance and attribution review route before publishing authored worlds

**State:** Done (2026-11-18).

## Cursor first-screen brief

**Evidence and gap:** NOTICE.md currently documents SRD 5.2.1 CC BY 4.0 attribution, and the repo contains setting-specific Vvardenfell sample lore and start content. There is no single author-facing workflow distinguishing project-authored content, third-party setting material, user-supplied packages, publication rights, prompt/source provenance and public distribution policy.

**Current authoritative material to read:**
- [NOTICE.md](../../../../../../NOTICE.md)
- [docs/product/gameplay/rules.md](../../../../../../docs/product/gameplay/rules.md)
- [content/worlds/vvardenfell-poc/WORLD.md](../../../../../../content/worlds/vvardenfell-poc/WORLD.md)
- [content/rules/srd-5.2.1-subset/RULES.md](../../../../../../content/rules/srd-5.2.1-subset/RULES.md)

**Proposed owner:** CREATE `work/designs/open/content-provenance-and-rights/README.md`. The page stays Proposed and is not selected. WIKI16's declared-creation check is the CREATE token in the planned-impact row and in Document shape. No selected-doc inbound link was added.

## Editorial work to perform after selection

1. Create a factual inventory of existing known content sources and license/attribution references, with exact paths; do not infer licensing permission from source presence or make unsupported legal conclusions.
2. Document explicit decision questions for public/paid distribution, user uploads, generated media, third-party setting references, attribution propagation and moderation. Show how authoring package provenance would be preserved technically without granting publication rights.
3. Propose a focused canonical content provenance/rights policy owner only after human/legal review. Until then write the decision work under work/designs and link NOTICE as current fact, not as comprehensive legal authorization.
4. Ensure `/rules` attribution and existing historical NOTICE material remain unchanged unless a verified source/legal requirement demands correction.

Before deciding on the new owner, verify that the question cannot be answered adequately with a section in the existing closest owner. Preserve accepted game/security constraints and the exact chosen source/proof tier. Do not confuse being able to import/propose a document with authorization to publish or reveal it.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because no new player/trust/financial rights are selected by this documentation survey | `docs/product/README.md` and present product rules/policy | New normative product policy would require owner ratification |
| Technical | unchanged because existing content/package and mechanical guarantees are only evidence for the rights decision inventory | docs/technical/README.md | Keep selected vs implemented vs proposed distinctions |
| Code | unchanged because this is a documentation-only Change and no auth, policy, package parser, provider or worker executable modification is authorized | Source read-only for exact rights/provenance/trust-boundary evidence | Negative: executable diff, imagined audit pass or invented approval blocks completion |
| Related | changed: CREATE work/designs/open/content-provenance-and-rights/README.md. Selected routers stay out of this diff. The authoring guide already says sample files are not a license, and legal review has not selected a policy. | `docs/technical/README.md`, `docs/runbooks/README.md`, `NOTICE.md`, `docs/runbooks/content-package-authoring.md` | WIKI16 declared CREATE. No selected-doc inbound link was added. |

## Acceptance and negative case

**Normal:** a reader can distinguish documented facts, proposed future policy, current technical protection and exact unknowns with a bounded task route. **Negative:** A package imports successfully and is therefore claimed legal to redistribute commercially, or the SRD attribution is treated as covering unrelated fictional settings.

**Approval gate:** No legal permission, license choice, takedown policy or hosting promise without explicit owner/legal review.

**Proof:** before/after claim, selected/proposed/implemented matrix, source paths and SHA, independent adverse reading, actual link/heading and Change-close guard results. Do not claim a security assessment or legal review that did not occur.

## Execution record

The inventory was not already answered on one owner. NOTICE.md holds the SRD attribution paragraph. Gameplay rules hold mechanical promises and the imported-rule provenance sentence. The authoring guide already says sample files are not a license. Canonical documents record import and pins. The gameplay content-policy row is about fiction limits. None of those pages decides public or paid distribution, user uploads, generated media, third-party setting references, attribution propagation, and moderation together. The proposed page was created. SHA `b3113814` from `git rev-parse --short HEAD`. Code unchanged. NOTICE.md unchanged. `docs/product/gameplay/rules.md` was read and not edited. `docs/product/README.md`, `docs/product/gameplay/acceptance-scenarios.md`, and `docs/runbooks/content-package-authoring.md` were read and not edited. The authoring guide already contains the sentence that sample files are not a license, so no Proposed link was added. No provider call was made. No license, takedown policy, or hosting promise was adopted. `guardChange` plan mode returned ok with no findings. Scoped close, with changed paths limited to the new inventory and this CHANGE.md, returned ok. Full-tree close was not used because the worktree contains other sessions' edits. Ready for close is not Done.

**CREATE declaration:** CREATE `work/designs/open/content-provenance-and-rights/README.md`. The path did not exist at design time. This Change created that file. The owner authorized this CREATE and Ready for close. No heading moved, so there is no migration receipt.

## Document shape | shape-ops.v1

| Operation | Path | Heading migration | Unique conservation |
| --- | --- | --- | --- |
| CREATE | work/designs/open/content-provenance-and-rights/README.md | new owner; no old heading moved | The inventory stays Proposed and unratified. A successful import is not permission to redistribute commercially. The SRD attribution does not cover unrelated fictional settings. No license, takedown policy, or hosting promise is adopted. |

## Reconciliation ledger | fill at execution

CREATE work/designs/open/content-provenance-and-rights/README.md

Inspected source SHA: `b3113814`. Code unchanged.

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| work/designs/open/content-provenance-and-rights/README.md#known-sources | unratified design | changed: CREATE the source inventory. Status stays Proposed and unratified. No license, takedown policy, or hosting promise is adopted. | no source behavior changed; inspected SHA b3113814 | documentation inspection; Proposed, not a selected rule | A successful import is not permission to redistribute commercially. The SRD attribution does not cover unrelated fictional settings. | CREATE work/designs/open/content-provenance-and-rights/README.md |
| work/designs/open/content-provenance-and-rights/README.md#what-a-record-stores | unratified design | changed: CREATE the provenance table. Stored license strings and root hashes are records. They grant no publication right. | no source behavior changed; inspected SHA b3113814 | documentation inspection; Proposed, not a selected rule | Recording license.name, license.source, and license.attribution is not legal approval and is not a commercial redistribution right. | same created page |
| work/designs/open/content-provenance-and-rights/README.md#open-decisions | unratified design | changed: CREATE the six open decisions. Public or paid distribution, user uploads, generated media, third-party setting references, attribution propagation, and moderation stay undecided. | no source behavior changed; inspected SHA b3113814 | documentation inspection; Proposed, not a selected rule | Writing a decision question does not select a distribution offer, an upload term, a media license, or a takedown policy. | same created page |
| NOTICE.md#rules-attribution | historical attribution fact | unchanged because the SRD 5.2.1 and CC BY 4.0 attribution paragraph was read and no factual error in that paragraph was found. The page was not edited. | no source behavior changed; NOTICE.md inspected SHA b3113814 | documentation inspection | The SRD attribution paragraph does not cover the Vvardenfell sample or any unrelated fictional setting. | page not edited |
| docs/product/gameplay/rules.md#foundation | product | unchanged because the SRD attribution pointer to NOTICE.md and `/rules` stays as written. This Change does not edit the page. | no source behavior changed; heading re-read at SHA b3113814 | documentation inspection | The foundation attribution does not become a license for a fictional setting. | page not edited |
| docs/product/gameplay/rules.md#executable-library-shape | product | unchanged because the imported-rule sentence stays as written: source and license provenance are retained. This Change does not edit the page. | no source behavior changed; heading re-read at SHA b3113814 | documentation inspection | Retaining provenance for imported rule material is not permission to redistribute a world sample commercially. | page not edited |
| content/rules/srd-5.2.1-subset/RULES.md#srd-521-offscreen-subset | checked-in sample evidence | unchanged because the CC BY 4.0 sentence and the project-specific-policy sentence stay as written. Sample content was not edited. | no source behavior changed; inspected SHA b3113814 | documentation inspection | That sentence does not cover the Vvardenfell sample. Presence of the rule package is not a new license grant. | page not edited |
| content/worlds/vvardenfell-poc/WORLD.md#vvardenfell-arrival-reference | checked-in sample evidence | unchanged because the four Vvardenfell files contain no attribution sentence and were not edited. No license is inferred from their presence. | no source behavior changed; inspected SHA b3113814 | documentation inspection | The SRD attribution does not cover this fictional setting. A successful import of these files is not commercial redistribution permission. | page not edited |
| docs/runbooks/content-package-authoring.md#content-package-authoring | task guide | unchanged because the guide already says sample files are not a license and that recording license fields is not legal approval. No Proposed link was added. | no source behavior changed; guide re-read at SHA b3113814 | documentation inspection | The guide must not be read as granting rights in the SRD text or in the Vvardenfell sample. | page not edited |
| docs/technical/storyteller/canonical-documents-and-packages.md#campaign-bootstrap | technical | unchanged because import still stores an immutable manifest and does not create a campaign. This Change does not edit the page. | no source behavior changed; heading re-read at SHA b3113814 | documentation inspection | A stored manifest is not permission to redistribute commercially. | page not edited |
| docs/technical/storyteller/canonical-documents-and-packages.md#reusable-world-libraries-and-campaign-overlays | technical | unchanged because imported settings stay subject to the user's rights and product policy, and a generated addition keeps passage, invention domain, and permission as provenance. This Change does not edit the page. | no source behavior changed; heading re-read at SHA b3113814 | documentation inspection | A model recognizing a name does not supply permission. Provenance of a generated addition is not a media license. | page not edited |
| docs/product/storyteller/behavior-and-quality.md#what-it-must-not-do | product | unchanged because model memory of a recognizable franchise setting stays excluded from supplied canon. This Change does not edit the page. | no source behavior changed; heading re-read at SHA b3113814 | documentation inspection | That prohibition is not a license for a third-party setting and not a takedown policy. | page not edited |
| work/designs/open/gameplay-domain-coverage/README.md#content-policy | unratified design | unchanged because that row stays about fiction limits, ratings, and bans. This Change does not edit the catalogue. | no source behavior changed; heading re-read at SHA b3113814 | documentation inspection | The catalogue must not be read as a content code, and this inventory must not be read as a selected rating. | page not edited |
| docs/product/README.md | product index | unchanged because this Change does not edit the product index and does not add a player right there. | no source behavior changed; inspected SHA b3113814 | documentation inspection | The product index must not ratify a license, a takedown policy, or a hosting promise. | page not edited |
| docs/product/gameplay/acceptance-scenarios.md | product | unchanged because the near-term playthrough stays illustrative. This Change does not edit the page. | no source behavior changed; inspected SHA b3113814 | documentation inspection | An illustrative scene is not a distribution right for the Vvardenfell sample. | page not edited |
| docs/technical/README.md | technical index | unchanged because this Change does not edit the technical index and does not add a publication guarantee. | no source behavior changed; inspected SHA b3113814 | documentation inspection | The index must not turn package storage into a hosting promise. | page not edited |
| docs/runbooks/README.md | runbook index | unchanged because the authoring guide is already indexed and this Change does not edit the index. | no source behavior changed; inspected SHA b3113814 | documentation inspection | The index must not describe sample files as a license grant. | page not edited |
| work/designs/README.md | design index | unchanged because this Change does not edit the design index. The new page stays unselected. | no source behavior changed; inspected SHA b3113814 | documentation inspection | An index line must not select this inventory as policy. | page not edited |
| apps/web/app/rules/page.tsx | public attribution surface | unchanged because the page repeats the NOTICE SRD and CC BY 4.0 attribution paragraph and was not edited. | no source behavior changed; page re-read at SHA b3113814 | documentation inspection | The `/rules` attribution does not cover unrelated fictional settings. | page not edited |
| Executable application, API, schema, and test files | code | unchanged because no application source, schema, test, package manifest, or sample content was modified. | no source behavior changed; inspected SHA b3113814 | documentation inspection. This Change has no executable diff. | An executable diff would block close. A successful import is not commercial redistribution permission. | no code edit |

No automatic next packet. Stop and request an owner decision for changes to money, privacy, user rights, distribution permissions or production staff grants.
