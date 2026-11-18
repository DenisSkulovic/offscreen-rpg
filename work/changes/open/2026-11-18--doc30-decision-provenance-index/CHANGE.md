# DOC30 | Recover selected architectural trade-off rationale without inventing historical ADR approvals

**State:** Proposed (unselected). **Kind:** documentation. **Dependency/order:** independent documentation packet after DOC25. **Baseline:** clean `781c2fc` lean source; [coverage audit](../../../designs/open/wiki-discovery-coverage/COVERAGE-GAPS.md), [target architecture](../../../designs/open/wiki-discovery-coverage/TARGET-ARCHITECTURE.md), [editorial standards](../../../designs/open/documentation-editorial-audit/EDITORIAL-STANDARD.md). No code or product-policy ratification is authorized merely by this packet.

## Cursor first-screen brief

**Why this is missing:** Only D-0001 and D-0002 are formal ADRs. Selected decisions about immutable documents, provider custody, clock/authority and staff boundaries are explained inside technical pages, but readers cannot easily ask why one alternative was rejected without a broad hunt.

**Start with actual current owners:**
- [docs/decisions/README.md](../../../../docs/decisions/README.md)
- [docs/decisions/D-0001--modular-engine.md](../../../../docs/decisions/D-0001--modular-engine.md)
- [docs/decisions/D-0002--react-next-client.md](../../../../docs/decisions/D-0002--react-next-client.md)
- [docs/technical/engine/selected-architecture.md](../../../../docs/technical/engine/selected-architecture.md)

Do not skim old DOC05–24 archives as if they were live authority. Inspect exact headings and source at HEAD; if the source has moved, correct this packet's paths and affected claims before Ready.

## Designed documentation outcome

1. Inspect at least six high-impact selected technical choices; identify exact existing 'why/trade-off' headings, dated evidence and whether a genuine owner decision exists.
2. Expand decisions README with a **locator table**, not pseudo-ADRs; link to governing selected heading and only create a new ADR if a recent explicit approved decision, alternatives and date are actually established.
3. Add negative question checks for 'why not LLM owns mechanics' and 'why not auto-retry unknown charged attempt', each routed to one authoritative rationale without version confusion.

Each output must have a **distinct reader question, normative status, unique owner**, normal procedure/example, negative example and exact related links. A new file is only justified when the task cannot be answered economically inside an existing owner. Record *no page created* with a reason if survey disproves the proposed split.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because governance of chosen product rules is not changed by linking decision rationale | `docs/product/README.md` and mentioned selected player claims, including Proposed exclusions | No new rights; require owner ratification for changed meaning |
| Technical | unchanged because this is navigation to existing technical selected choices and evidence, not an alternative architecture rewrite | `docs/technical/README.md` and selected technical/source owners cited above | Status and evidence must reflect source/fixture reality |
| Code | unchanged because no executable code or decision automation is needed | Source path inspection is read-only and not a code-writing permission | Negative: any executable diff or imagined test report blocks Done |
| Related | changed: docs/decisions/README.md and targeted governing technical headings with exact rationale/alternative route; new ADR only for a documented newly accepted decision with real owner proof | Existing inbound links, docs/runbooks, source-map and work/designs routes as relevant | Review actual created/moved/deleted targets and semantic dependence |

**Planned CREATE note:** where this packet names a new Markdown path, the file intentionally does not exist at design time. **Do not mark Ready until WIKI16's planned-CREATE guard compatibility is landed and checked**, or the owner explicitly revises the packet to an existing-page edit. A misspelled existing path is not a valid CREATE.

## Acceptance and negative proof

**Normal:** a reader can find the exact owner and perform the correct bounded intellectual/task step, or clearly distinguish unselected policy from an accepted rule. **Negative:** Historical implementation is backfilled as an owner-ratified ADR merely because it is currently in code.

**Evidence:** Source decision/evidence trace for each locator and no duplicated normative paragraphs. Run actual link/anchor and `wiki:change-guard` checks when selected in a full checkout; record actual command, revision and skipped checks. Independent adversarial reading must verify that the new page did not create shadow product/technical authority.

## Reconciliation ledger (fill at execution)

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/decisions/README.md governing owner to reverify | product/technical/guide as applicable | pending specific newly authored or unchanged claim | no source behavior changed; exact docs SHA pending | not run: Proposed | Historical implementation is backfilled as an owner-ratified ADR merely because it is currently in code. | pending new/inbound route |

**Stop:** proposed new gameplay/privacy/security or public API behavior cannot be ratified by writing a document. No auto-selection of next packet. Archive only with unique-claim preservation and complete ledger.
