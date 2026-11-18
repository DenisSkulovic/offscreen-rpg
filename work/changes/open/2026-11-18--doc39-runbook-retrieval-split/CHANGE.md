# DOC39 | Turn the oversized local-development page into task-specific safe operating routes

**State:** Proposed (unselected). **Kind:** documentation. **Ordering:** after WIKI16 and DOC28/DOC29 design, full-checkout commands verified. **Audit basis:** clean committed `781c2fc`; [gaps](../../../designs/open/wiki-discovery-coverage/COVERAGE-GAPS.md), [architecture](../../../designs/open/wiki-discovery-coverage/TARGET-ARCHITECTURE.md), [editorial standard](../../../designs/open/documentation-editorial-audit/EDITORIAL-STANDARD.md). Baseline is not implementation permission.

## Cursor first-screen brief

**Reader job now insufficiently supported:** docs/runbooks/local-development.md is about 5,178 words covering startup, front-end workflow, DB suite, auth, live Story and profiled Storyteller rehearsals. There are only three runbooks in the topic hub, so a newcomer risks reading unsafe live-provider instructions during an ordinary no-spend check.

**Governing present owners to read:**
- [docs/runbooks/local-development.md](../../../../docs/runbooks/local-development.md)
- [docs/runbooks/README.md](../../../../docs/runbooks/README.md)
- [apps/api/README.md](../../../../apps/api/README.md)
- [packages/application/src/developer-tools/README.md](../../../../packages/application/src/developer-tools/README.md)

**Proposed newly created/relocated owner:** `docs/runbooks/local-storyteller-rehearsal.md and docs/runbooks/local-integration-tests.md (conditional)`. This is a hypothesis to validate, not a required arbitrary addition. Content with unratified decisions belongs under `work/designs/open/`, not silently selected `docs/product/`.

## Planned editorial change

1. Group by human job and side-effect level: safe initial dev boot, provider-free fixture/integration checks, local authenticated Story demo, explicitly authorized paid rehearsal. Keep current local-development.md as a slim task router if split is justified.
2. Move exact tested commands and warnings as units; source-check against package.json/scripts, auth and local test DB safety before claiming runnable. Preserve 'no provider by default' and non-disposable DB restrictions.
3. Add entrypoint decision tree showing 'what will this command touch?', a normal provider-free path and a negative path for live model/remote DB without permission.
4. Update docs/runbooks/README.md, source-adjacent READMEs and all relevant inbound links. Cancel proposed split if readability worsens.

Before editing, compare actual source tree, the selected meaning of exact headings, all incoming links and current dirty state. If the reader question is already answered at one precise stable owner, **record reviewed no-op** and improve the route instead of adding a redundant document.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because this technical/runbook editorial Change preserves current player promises and authorization boundaries | Selected product owners above; exact Proposed/Blocked boundary | Human ratification required before any new game, permission or legal rule |
| Technical | unchanged because the move/split preserves selected technical contracts; references are reviewed, not rewritten | docs/technical/README.md; preserve selected vs realized status | Source/fixture/contract proof never invented |
| Code | unchanged because this is a documentation-only Change: **no application source, tests, schema, migrations or executable tool modification** is allowed | Source files are read-only evidence; runbooks may cite commands only after safety review | Negative: any executable diff blocks Done |
| Related | changed: planned CREATE or conditional SPLIT/relocation `docs/runbooks/local-storyteller-rehearsal.md and docs/runbooks/local-integration-tests.md (conditional)` plus exact inbound route updates if adopted; otherwise unchanged because existing owner suffices after review | `docs/README.md`, product/technical/runbook routes and all real incoming path#heading edges; historic citations retained | WIKI16 declared-CREATE/migration compatibility and semantic conservation receipt |

**Planned CREATE/RELOCATE gating:** the destination path may not exist at design time. Do not mark Ready until WIKI16's create/move plan compatibility is checked or the packet is explicitly revised to an existing-owner edit. Require an actual migration of every important inbound fragment before Done; no automatic "page count improved" acceptance.

## Acceptance and adversarial proof

**Normal:** a fresh agent answers the intended reader question from the correct owner with selected/proposed/implemented states separated, and the new page genuinely reduces detours or ambiguity. **Negative:** A developer following a basic frontend/test route accidentally starts a paid model call or mutates a nondisposable database.

**Owner gate:** No scripts/tests/source changes; an unverified command is marked inspection-needed, not 'safe'.

**Verification:** exact before/after claim ledger, source-revision status where factual, full-link/anchor and reverse dependency checks, reader task trace, and independently reviewed falsifying counterexample. All actual commands/results must be recorded, not guessed. A page can be *good but not needed*: closing with a proved no-op or cancelling the proposed split is legitimate.

## Reconciliation ledger | fill at execution

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| `docs/runbooks/local-development.md` selected claim after owner inspection | product/technical/proposed as applicable | pending exact claim/decision and candidate created/split path | no source behavior changed; doc SHA pending | not run: Proposed | A developer following a basic frontend/test route accidentally starts a paid model call or mutates a nondisposable database. | pending inbound/fragment map |

No automatic next packet. Stop at any new product policy, staff permission, legal retention rule, provider spend or incompatible source owner that requires an independent decision.
