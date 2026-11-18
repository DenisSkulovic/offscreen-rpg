# DOC40 | Establish a content provenance and attribution review route before publishing authored worlds

**State:** Proposed (unselected). **Kind:** documentation. **Sequence:** after DOC26 authoring guide; requires legal/owner review for policy choices. **Baseline:** clean snapshot `781c2fc` and [coverage-gap catalogue](../../../designs/open/wiki-discovery-coverage/COVERAGE-GAPS.md). **Do not promote a proposed trust or legal rule to selected canon.**

## Cursor first-screen brief

**Evidence and gap:** NOTICE.md currently documents SRD 5.2.1 CC BY 4.0 attribution, and the repo contains setting-specific Vvardenfell sample lore and start content. There is no single author-facing workflow distinguishing project-authored content, third-party setting material, user-supplied packages, publication rights, prompt/source provenance and public distribution policy.

**Current authoritative material to read:**
- [NOTICE.md](../../../../NOTICE.md)
- [docs/product/gameplay/rules.md](../../../../docs/product/gameplay/rules.md)
- [content/worlds/vvardenfell-poc/WORLD.md](../../../../content/worlds/vvardenfell-poc/WORLD.md)
- [content/rules/srd-5.2.1-subset/RULES.md](../../../../content/rules/srd-5.2.1-subset/RULES.md)

**Potential new owner:** `work/designs/open/content-provenance-and-rights/README.md`. Its absence is intentional at design time; WIKI16 must first handle planned CREATE and safe inbound-map reconciliation.

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
| Related | changed: proposed CREATE `work/designs/open/content-provenance-and-rights/README.md` and context-specific documentation router links if the owner review supports it; otherwise unchanged with reason | `docs/technical/README.md`, `docs/runbooks/README.md`, `NOTICE.md`, affected historical/public route as applicable | WIKI16 create compatibility, unique owner and incoming links |

## Acceptance and negative case

**Normal:** a reader can distinguish documented facts, proposed future policy, current technical protection and exact unknowns with a bounded task route. **Negative:** A package imports successfully and is therefore claimed legal to redistribute commercially, or the SRD attribution is treated as covering unrelated fictional settings.

**Approval gate:** No legal permission, license choice, takedown policy or hosting promise without explicit owner/legal review.

**Proof:** before/after claim, selected/proposed/implemented matrix, source paths and SHA, independent adverse reading, actual link/heading and Change-close guard results. Do not claim a security assessment or legal review that did not occur.

## Reconciliation ledger (complete only when executed)

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| NOTICE.md exact heading after owner review | proposal/technical evidence | pending owner and approved scope | no source behavior changed; doc SHA pending | not run: Proposed | A package imports successfully and is therefore claimed legal to redistribute commercially, or the SRD attribution is treated as covering unrelated fictional settings. | pending route audit |

No automatic next packet. Stop and request an owner decision for changes to money, privacy, user rights, distribution permissions or production staff grants.
