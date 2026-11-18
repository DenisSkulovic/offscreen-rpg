# DOC34 | Decide whether spatial truth and travel deserve their own contract owner

**State:** Proposed (unselected, normative domain approval blocked). **Kind:** documentation. **Ordering:** after DOC31; WIKI16 for any new file. **Audit basis:** clean committed `781c2fc`; [gaps](../../../designs/open/wiki-discovery-coverage/COVERAGE-GAPS.md), [architecture](../../../designs/open/wiki-discovery-coverage/TARGET-ARCHITECTURE.md), [editorial standard](../../../designs/open/documentation-editorial-audit/EDITORIAL-STANDARD.md). Baseline is not implementation permission.

## Cursor first-screen brief

**Reader job now insufficiently supported:** Canonical Vvardenfell content includes locations and a Seyda Neen-to-Balmora route. Product continuity requires coherent distance, location and travel but exact spatial engine semantics remain partly scattered, with worlds that may have no coordinates.

**Governing present owners to read:**
- [docs/product/gameplay/continuity.md](../../../../docs/product/gameplay/continuity.md)
- [docs/product/gameplay/worlds-and-characters.md](../../../../docs/product/gameplay/worlds-and-characters.md)
- [docs/technical/engine/calendars-and-world-time.md](../../../../docs/technical/engine/calendars-and-world-time.md)
- [docs/technical/storyteller/context-and-memory.md](../../../../docs/technical/storyteller/context-and-memory.md)

**Proposed newly created/relocated owner:** `work/designs/open/spatial-play/README.md`. This is a hypothesis to validate, not a required arbitrary addition. Content with unratified decisions belongs under `work/designs/open/`, not silently selected `docs/product/`.

## Planned editorial change

1. Inventory selected claims about location, whereabouts, travel duration, route identity, interruption, scale and maps across product/technical docs. Distinguish location as narrative context from mechanically admitted movement and from route topology.
2. Produce one grounded route example from content/worlds/vvardenfell-poc and one non-geometric world where coordinates are inapplicable. Define decision questions: distance source, visibility, map identity/revision, travel ETA, teleportation, concurrent actor position, world clock/calendar relation.
3. If no independent selected spatial invariant emerges, add a precise section and links in existing continuity/world owner. If accepted independence emerges, propose separate product+technical owner and file operations after ratification.

Before editing, compare actual source tree, the selected meaning of exact headings, all incoming links and current dirty state. If the reader question is already answered at one precise stable owner, **record reviewed no-op** and improve the route instead of adding a redundant document.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | changed: clarify scope/routing in existing selected docs/product/gameplay/continuity.md, docs/product/gameplay/worlds-and-characters.md without making unresolved mechanisms normative | Selected product owners above; exact Proposed/Blocked boundary | Human ratification required before any new game, permission or legal rule |
| Technical | unchanged because this Change authors proposed gameplay policy or nonbinding operations, not a new selected runtime guarantee | docs/technical/engine/calendars-and-world-time.md, docs/technical/storyteller/context-and-memory.md; preserve selected vs realized status | Source/fixture/contract proof never invented |
| Code | unchanged because this is a documentation-only Change: **no application source, tests, schema, migrations or executable tool modification** is allowed | Source files are read-only evidence; runbooks may cite commands only after safety review | Negative: any executable diff blocks Done |
| Related | changed: planned CREATE or conditional SPLIT/relocation `work/designs/open/spatial-play/README.md` plus exact inbound route updates if adopted; otherwise unchanged because existing owner suffices after review | `docs/README.md`, product/technical/runbook routes and all real incoming path#heading edges; historic citations retained | WIKI16 declared-CREATE/migration compatibility and semantic conservation receipt |

**Planned CREATE/RELOCATE gating:** the destination path may not exist at design time. Do not mark Ready until WIKI16's create/move plan compatibility is checked or the packet is explicitly revised to an existing-owner edit. Require an actual migration of every important inbound fragment before Done; no automatic "page count improved" acceptance.

## Acceptance and adversarial proof

**Normal:** a fresh agent answers the intended reader question from the correct owner with selected/proposed/implemented states separated, and the new page genuinely reduces detours or ambiguity. **Negative:** A prose map automatically creates executable routes, a different clock presentation changes travel progress, or a bodiless world must use Euclidean meters.

**Owner gate:** No new route-planning engine, coordinate schema or travel mechanics may be implied by Markdown.

**Verification:** exact before/after claim ledger, source-revision status where factual, full-link/anchor and reverse dependency checks, reader task trace, and independently reviewed falsifying counterexample. All actual commands/results must be recorded, not guessed. A page can be *good but not needed*: closing with a proved no-op or cancelling the proposed split is legitimate.

## Reconciliation ledger | fill at execution

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| `docs/product/gameplay/continuity.md` selected claim after owner inspection | product/technical/proposed as applicable | pending exact claim/decision and candidate created/split path | no source behavior changed; doc SHA pending | not run: Proposed | A prose map automatically creates executable routes, a different clock presentation changes travel progress, or a bodiless world must use Euclidean meters. | pending inbound/fragment map |

No automatic next packet. Stop at any new product policy, staff permission, legal retention rule, provider spend or incompatible source owner that requires an independent decision.
