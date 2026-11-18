# DOC31 | Identify the product domains not covered by the current persistent-life specifications

**State:** Proposed (unselected). **Kind:** documentation. **Dependency/order:** after DOC25, before conditional DOC32–DOC36. **Baseline:** clean `781c2fc` lean source; [coverage audit](../../../designs/open/wiki-discovery-coverage/COVERAGE-GAPS.md), [target architecture](../../../designs/open/wiki-discovery-coverage/TARGET-ARCHITECTURE.md), [editorial standards](../../../designs/open/documentation-editorial-audit/EDITORIAL-STANDARD.md). No code or product-policy ratification is authorized merely by this packet.

## Cursor first-screen brief

**Why this is missing:** The vision commits to a lasting life across work, travel, possessions, injury/risk and relationships, but selected gameplay docs are concentrated on rules, consent, continuity, time and world-neutrality. Several important reader questions are scattered or explicitly out of scope, and a missing universal mechanic may be correct rather than an omission.

**Start with actual current owners:**
- [docs/product/foundations/vision.md](../../../../docs/product/foundations/vision.md)
- [docs/product/gameplay/worlds-and-characters.md](../../../../docs/product/gameplay/worlds-and-characters.md)
- [docs/product/gameplay/rules.md](../../../../docs/product/gameplay/rules.md)
- [docs/product/gameplay/continuity.md](../../../../docs/product/gameplay/continuity.md)
- [docs/product/gameplay/time-and-autonomy.md](../../../../docs/product/gameplay/time-and-autonomy.md)

Do not skim old DOC05–24 archives as if they were live authority. Inspect exact headings and source at HEAD; if the source has moved, correct this packet's paths and affected claims before Ready.

## Designed documentation outcome

1. Construct a product-domain ownership map: what is selected, what's world/ruleset-specific, what's illustrated only, what's unratified, what is intentionally absent. Base each on exact source excerpt and one nonhuman/world-neutral counterexample.
2. Identify candidate new canonical product owners only if they own independent player-facing promises not already in continuity/rules/vision; draft decision questions under work/designs, not docs/product.
3. Propose a rational taxonomy for future domains without mandating global employment, money, disease, map coordinates, relationship meters, experience leveling or universal combat.

Each output must have a **distinct reader question, normative status, unique owner**, normal procedure/example, negative example and exact related links. A new file is only justified when the task cannot be answered economically inside an existing owner. Record *no page created* with a reason if survey disproves the proposed split.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | changed: docs/product/gameplay/worlds-and-characters.md or docs/product/README.md only to link already accepted baseline; no new universal mechanics are ratified | `docs/product/README.md` and mentioned selected player claims, including Proposed exclusions | No new rights; require owner ratification for changed meaning |
| Technical | unchanged because engine capability architecture and runnable rule-package semantics stay selected and untouched | `docs/technical/README.md` and selected technical/source owners cited above | Status and evidence must reflect source/fixture reality |
| Code | unchanged because this is a source-grounded product documentation inventory, not game implementation | Source path inspection is read-only and not a code-writing permission | Negative: any executable diff or imagined test report blocks Done |
| Related | changed: CREATE work/designs/open/gameplay-domain-coverage/README.md as an **unratified decision catalogue** for underowned economy, progression/fate, spatiality, social relations, collaboration and content policy; link from product topic map as Proposed only | Existing inbound links, docs/runbooks, source-map and work/designs routes as relevant | Review actual created/moved/deleted targets and semantic dependence |

**Planned CREATE note:** where this packet names a new Markdown path, the file intentionally does not exist at design time. **Do not mark Ready until WIKI16's planned-CREATE guard compatibility is landed and checked**, or the owner explicitly revises the packet to an existing-page edit. A misspelled existing path is not a valid CREATE.

## Acceptance and negative proof

**Normal:** a reader can find the exact owner and perform the correct bounded intellectual/task step, or clearly distinguish unselected policy from an accepted rule. **Negative:** An evocative wage example turns into a universal currency table, or lack of a Strength stat for a microbe is treated as an engineering bug.

**Evidence:** Every proposed domain labeled with existing owner/unknown/possible new owner; no unratified rule published. Run actual link/anchor and `wiki:change-guard` checks when selected in a full checkout; record actual command, revision and skipped checks. Independent adversarial reading must verify that the new page did not create shadow product/technical authority.

## Reconciliation ledger (fill at execution)

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/product/foundations/vision.md governing owner to reverify | product/technical/guide as applicable | pending specific newly authored or unchanged claim | no source behavior changed; exact docs SHA pending | not run: Proposed | An evocative wage example turns into a universal currency table, or lack of a Strength stat for a microbe is treated as an engineering bug. | pending new/inbound route |

**Stop:** proposed new gameplay/privacy/security or public API behavior cannot be ratified by writing a document. No auto-selection of next packet. Archive only with unique-claim preservation and complete ledger.
