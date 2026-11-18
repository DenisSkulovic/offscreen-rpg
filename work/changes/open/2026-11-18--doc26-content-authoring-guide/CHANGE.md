# DOC26 | Create a practical world/rule/start package authoring and validation guide

**State:** Proposed (unselected). **Kind:** documentation. **Dependency/order:** after WIKI16 supports declared CREATE. **Baseline:** clean `781c2fc` lean source; [coverage audit](../../../designs/open/wiki-discovery-coverage/COVERAGE-GAPS.md), [target architecture](../../../designs/open/wiki-discovery-coverage/TARGET-ARCHITECTURE.md), [editorial standards](../../../designs/open/documentation-editorial-audit/EDITORIAL-STANDARD.md). No code or product-policy ratification is authorized merely by this packet.

## Cursor first-screen brief

**Why this is missing:** Actual 'content/worlds/vvardenfell-poc', 'content/rules/srd-5.2.1-subset' and 'content/starts/seyda-neen-prisoner' packages exist. Their JSON manifests and authority/admission rules are described inside the 8.5k-word Storyteller context document; a new content author lacks a focused recipe.

**Start with actual current owners:**
- [docs/technical/storyteller/context-and-memory.md](../../../../docs/technical/storyteller/context-and-memory.md)
- [packages/documents/README.md](../../../../packages/documents/README.md)
- [content/starts/seyda-neen-prisoner/start-package.json](../../../../content/starts/seyda-neen-prisoner/start-package.json)
- [content/rules/srd-5.2.1-subset/rule-package.json](../../../../content/rules/srd-5.2.1-subset/rule-package.json)

Do not skim old DOC05–24 archives as if they were live authority. Inspect exact headings and source at HEAD; if the source has moved, correct this packet's paths and affected claims before Ready.

## Designed documentation outcome

1. Read exact manifest JSON and import/admission symbols at HEAD; write a step-by-step author task from world lore, rule topic, start identity through manifest validation, immutable publication and source-pinned campaign instantiation.
2. Show current real sample paths and only commands proven safe and supported; explain what remains target-only, no arbitrary user-authored code and no legal/licensing approval implied by example assets.
3. Include negative cases: undeclared content/symlink escaping root, mismatched rule adapter, hidden possibility accidentally materialized, package revision mutating an existing campaign. Link source schema, not copy every schema field.
4. Add one question-first route to runbook hub and relevant technical ownership; choose existing runbook tree instead of creating a new generic 'guides' directory prematurely.

Each output must have a **distinct reader question, normative status, unique owner**, normal procedure/example, negative example and exact related links. A new file is only justified when the task cannot be answered economically inside an existing owner. Record *no page created* with a reason if survey disproves the proposed split.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because authoring instructions cannot broaden world invention or mechanical permissions set by product rules | `docs/product/README.md` and mentioned selected player claims, including Proposed exclusions | No new rights; require owner ratification for changed meaning |
| Technical | unchanged because immutable package roots, exact adapter identity, visibility and start activation remain owned by docs/technical/storyteller/context-and-memory.md; new task guide links, not duplicates, those contracts | `docs/technical/README.md` and selected technical/source owners cited above | Status and evidence must reflect source/fixture reality |
| Code | unchanged because no import parser, package schema or content fixture is modified; source/tests are read-only evidence | Source path inspection is read-only and not a code-writing permission | Negative: any executable diff or imagined test report blocks Done |
| Related | changed: CREATE docs/runbooks/content-package-authoring.md and update docs/runbooks/README.md plus precise docs/technical/storyteller contextual links after inbound audit | Existing inbound links, docs/runbooks, source-map and work/designs routes as relevant | Review actual created/moved/deleted targets and semantic dependence |

**Planned CREATE note:** where this packet names a new Markdown path, the file intentionally does not exist at design time. **Do not mark Ready until WIKI16's planned-CREATE guard compatibility is landed and checked**, or the owner explicitly revises the packet to an existing-page edit. A misspelled existing path is not a valid CREATE.

## Acceptance and negative proof

**Normal:** a reader can find the exact owner and perform the correct bounded intellectual/task step, or clearly distinguish unselected policy from an accepted rule. **Negative:** A creator editing shared WORLD.md in place causes an already started campaign to change, or adding descriptive Markdown schedules a world obligation automatically.

**Evidence:** Source-inspected manifests and safe local validation command evidence; no imports against production data, link/authority review. Run actual link/anchor and `wiki:change-guard` checks when selected in a full checkout; record actual command, revision and skipped checks. Independent adversarial reading must verify that the new page did not create shadow product/technical authority.

## Reconciliation ledger (fill at execution)

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/technical/storyteller/context-and-memory.md governing owner to reverify | product/technical/guide as applicable | pending specific newly authored or unchanged claim | no source behavior changed; exact docs SHA pending | not run: Proposed | A creator editing shared WORLD.md in place causes an already started campaign to change, or adding descriptive Markdown schedules a world obligation automatically. | pending new/inbound route |

**Stop:** proposed new gameplay/privacy/security or public API behavior cannot be ratified by writing a document. No auto-selection of next packet. Archive only with unique-claim preservation and complete ledger.
