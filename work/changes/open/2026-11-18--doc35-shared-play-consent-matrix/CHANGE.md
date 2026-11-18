# DOC35 | Make small-party participation and consent gaps explicitly discoverable

**State:** Proposed (unselected, normative domain approval blocked). **Kind:** documentation. **Ordering:** after DOC31, DOC06 already Done; existing work/designs/open/shared-play remains the proposed owner. **Audit basis:** clean committed `781c2fc`; [gaps](../../../designs/open/wiki-discovery-coverage/COVERAGE-GAPS.md), [architecture](../../../designs/open/wiki-discovery-coverage/TARGET-ARCHITECTURE.md), [editorial standard](../../../designs/open/documentation-editorial-audit/EDITORIAL-STANDARD.md). Baseline is not implementation permission.

## Cursor first-screen brief

**Reader job now insufficiently supported:** The first-playable ambition includes invited small-party play, but actual join/leave, pause, response concurrency, permission delegation and financial actor are still Proposed/Blocked in multiple pages. No single compact decision matrix covers the difficult simultaneous cases.

**Governing present owners to read:**
- [docs/product/foundations/vision.md](../../../../docs/product/foundations/vision.md)
- [docs/product/gameplay/acceptance-scenarios.md](../../../../docs/product/gameplay/acceptance-scenarios.md)
- [docs/product/gameplay/time-and-autonomy.md](../../../../docs/product/gameplay/time-and-autonomy.md)
- [docs/technical/engine/lifecycle-and-compatibility.md](../../../../docs/technical/engine/lifecycle-and-compatibility.md)

**Proposed newly created/relocated owner:** `work/designs/open/shared-play/CONSENT-AND-RESOLUTION-MATRIX.md`. This is a hypothesis to validate, not a required arbitrary addition. Content with unratified decisions belongs under `work/designs/open/`, not silently selected `docs/product/`.

## Planned editorial change

1. Collect every selected promise and unresolved decision across the accepted vision, gameplay time and existing shared-play design. Split invitation/identity, participant control, action vote/arbitration, deadline/absence, character agency, funding and member leave/rejoin into independent owner choices.
2. For each scenario name actors/accepted action, deadline, competing response, actual authority that may commit, and what must happen on stale/late/withdrawn consent; mark answers Unratified if no owner decision.
3. Crosslink existing design and canonical first-playable status without adding 'everyone has one vote' or automatic timeout. Do not launch implementation or GM07 fallback work.

Before editing, compare actual source tree, the selected meaning of exact headings, all incoming links and current dirty state. If the reader question is already answered at one precise stable owner, **record reviewed no-op** and improve the route instead of adding a redundant document.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | changed: clarify scope/routing in existing selected docs/product/foundations/vision.md, docs/product/gameplay/acceptance-scenarios.md, docs/product/gameplay/time-and-autonomy.md without making unresolved mechanisms normative | Selected product owners above; exact Proposed/Blocked boundary | Human ratification required before any new game, permission or legal rule |
| Technical | unchanged because this Change authors proposed gameplay policy or nonbinding operations, not a new selected runtime guarantee | docs/technical/engine/lifecycle-and-compatibility.md; preserve selected vs realized status | Source/fixture/contract proof never invented |
| Code | unchanged because this is a documentation-only Change: **no application source, tests, schema, migrations or executable tool modification** is allowed | Source files are read-only evidence; runbooks may cite commands only after safety review | Negative: any executable diff blocks Done |
| Related | changed: planned CREATE or conditional SPLIT/relocation `work/designs/open/shared-play/CONSENT-AND-RESOLUTION-MATRIX.md` plus exact inbound route updates if adopted; otherwise unchanged because existing owner suffices after review | `docs/README.md`, product/technical/runbook routes and all real incoming path#heading edges; historic citations retained | WIKI16 declared-CREATE/migration compatibility and semantic conservation receipt |

**Planned CREATE/RELOCATE gating:** the destination path may not exist at design time. Do not mark Ready until WIKI16's create/move plan compatibility is checked or the packet is explicitly revised to an existing-owner edit. Require an actual migration of every important inbound fragment before Done; no automatic "page count improved" acceptance.

## Acceptance and adversarial proof

**Normal:** a fresh agent answers the intended reader question from the correct owner with selected/proposed/implemented states separated, and the new page genuinely reduces detours or ambiguity. **Negative:** Player A may choose B's action, one device can commit both incompatible outcomes, or absence alone grants general delegated combat choice.

**Owner gate:** All new multiplayer control/consent/financial rules require explicit product owner ratification before normative docs.

**Verification:** exact before/after claim ledger, source-revision status where factual, full-link/anchor and reverse dependency checks, reader task trace, and independently reviewed falsifying counterexample. All actual commands/results must be recorded, not guessed. A page can be *good but not needed*: closing with a proved no-op or cancelling the proposed split is legitimate.

## Reconciliation ledger | fill at execution

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| `docs/product/foundations/vision.md` selected claim after owner inspection | product/technical/proposed as applicable | pending exact claim/decision and candidate created/split path | no source behavior changed; doc SHA pending | not run: Proposed | Player A may choose B's action, one device can commit both incompatible outcomes, or absence alone grants general delegated combat choice. | pending inbound/fragment map |

No automatic next packet. Stop at any new product policy, staff permission, legal retention rule, provider spend or incompatible source owner that requires an independent decision.
