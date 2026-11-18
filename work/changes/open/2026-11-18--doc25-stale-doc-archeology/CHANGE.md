# DOC25 | Remove actual stale editorial scaffolding and phantom source routes

**State:** Proposed (unselected). **Kind:** documentation. **Dependency/order:** first documentation accuracy pass, independent of WIKI16. **Baseline:** clean `781c2fc` lean source; [coverage audit](../../../designs/open/wiki-discovery-coverage/COVERAGE-GAPS.md), [target architecture](../../../designs/open/wiki-discovery-coverage/TARGET-ARCHITECTURE.md), [editorial standards](../../../designs/open/documentation-editorial-audit/EDITORIAL-STANDARD.md). No code or product-policy ratification is authorized merely by this packet.

## Cursor first-screen brief

**Why this is missing:** Post-DOC24 text still has 'Owner (DOC01 P2)' and 'Reconciles former foundations/gameplay.md' headers in product claims; settings-and-accessibility.md ends with 'Source detail for later fold: experience system/accessibility-and-voice.md', a nonlinked former owner not present in docs tree.

**Start with actual current owners:**
- [docs/product/experience/settings-and-accessibility.md](../../../../docs/product/experience/settings-and-accessibility.md)
- [docs/product/gameplay/worlds-and-characters.md](../../../../docs/product/gameplay/worlds-and-characters.md)
- [docs/product/gameplay/actions-and-commitments.md](../../../../docs/product/gameplay/actions-and-commitments.md)
- [docs/product/gameplay/rules.md](../../../../docs/product/gameplay/rules.md)

Do not skim old DOC05–24 archives as if they were live authority. Inspect exact headings and source at HEAD; if the source has moved, correct this packet's paths and affected claims before Ready.

## Designed documentation outcome

1. Enumerate residual migration-stage wording across canonical product and technical pages using exact occurrences, not broad 'legacy' deletion. Classify intentional compatibility words separately from stale ownership metadata.
2. Replace DOC01/P2 labels with permanent Owns/Does not own/Companions where useful; in accessibility page either link a verified existing current technical owner or explicitly state what is unresolved, deleting the phantom legacy route.
3. Repair any real inbound routes and check whether WIKI08/DOC24 audits already documented the same omission; record the new residue and why automated link health missed it (backtick path, not Markdown link).

Each output must have a **distinct reader question, normative status, unique owner**, normal procedure/example, negative example and exact related links. A new file is only justified when the task cannot be answered economically inside an existing owner. Record *no page created* with a reason if survey disproves the proposed split.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | changed: docs/product/experience/settings-and-accessibility.md, docs/product/gameplay/worlds-and-characters.md, docs/product/gameplay/actions-and-commitments.md and docs/product/gameplay/rules.md; replace migration-era owner phrases with durable purpose/companion links without changing rules | `docs/product/README.md` and mentioned selected player claims, including Proposed exclusions | No new rights; require owner ratification for changed meaning |
| Technical | unchanged because no runtime API, timing or mechanics contract is altered by replacing obsolete editorial metadata | `docs/technical/README.md` and selected technical/source owners cited above | Status and evidence must reflect source/fixture reality |
| Code | unchanged because this Change edits canonical Markdown only; source read may establish real current technical companion | Source path inspection is read-only and not a code-writing permission | Negative: any executable diff or imagined test report blocks Done |
| Related | changed: actual source-to-current-doc links and nearby hub routes if affected; no blanket old-history deletion | Existing inbound links, docs/runbooks, source-map and work/designs routes as relevant | Review actual created/moved/deleted targets and semantic dependence |

**Planned CREATE note:** where this packet names a new Markdown path, the file intentionally does not exist at design time. **Do not mark Ready until WIKI16's planned-CREATE guard compatibility is landed and checked**, or the owner explicitly revises the packet to an existing-page edit. A misspelled existing path is not a valid CREATE.

## Acceptance and negative proof

**Normal:** a reader can find the exact owner and perform the correct bounded intellectual/task step, or clearly distinguish unselected policy from an accepted rule. **Negative:** Replacing the header silently deletes the world-neutral ability constraint or makes accessibility a purely visual preference instead of a player requirement.

**Evidence:** Static exact-term/phantom-path inventory, product claim diff and focused Markdown link check; report remaining intentionally historical occurrences. Run actual link/anchor and `wiki:change-guard` checks when selected in a full checkout; record actual command, revision and skipped checks. Independent adversarial reading must verify that the new page did not create shadow product/technical authority.

## Reconciliation ledger (fill at execution)

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/product/experience/settings-and-accessibility.md governing owner to reverify | product/technical/guide as applicable | pending specific newly authored or unchanged claim | no source behavior changed; exact docs SHA pending | not run: Proposed | Replacing the header silently deletes the world-neutral ability constraint or makes accessibility a purely visual preference instead of a player requirement. | pending new/inbound route |

**Stop:** proposed new gameplay/privacy/security or public API behavior cannot be ratified by writing a document. No auto-selection of next packet. Archive only with unique-claim preservation and complete ledger.
