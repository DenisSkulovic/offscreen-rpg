# DOC35 | Make small-party participation and consent gaps explicitly discoverable

**State:** Done (2026-11-18).

## Cursor first-screen brief

**Reader job now insufficiently supported:** The first-playable ambition includes invited small-party play, but actual join/leave, pause, response concurrency, permission delegation and financial actor are still Proposed/Blocked in multiple pages. No single compact decision matrix covers the difficult simultaneous cases.

**Governing present owners to read:**
- [docs/product/foundations/vision.md](../../../../../../docs/product/foundations/vision.md)
- [docs/product/gameplay/acceptance-scenarios.md](../../../../../../docs/product/gameplay/acceptance-scenarios.md)
- [docs/product/gameplay/time-and-autonomy.md](../../../../../../docs/product/gameplay/time-and-autonomy.md)
- [docs/technical/engine/lifecycle-and-compatibility.md](../../../../../../docs/technical/engine/lifecycle-and-compatibility.md)

**Proposed newly created/relocated owner:** `work/designs/open/shared-play/CONSENT-AND-RESOLUTION-MATRIX.md`. This is a hypothesis to validate, not a required arbitrary addition. Content with unratified decisions belongs under `work/designs/open/`, not silently selected `docs/product/`.

## Planned editorial change

1. Collect every selected promise and unresolved decision across the accepted vision, gameplay time and existing shared-play design. Split invitation/identity, participant control, action vote/arbitration, deadline/absence, character agency, funding and member leave/rejoin into independent owner choices.
2. For each scenario name actors/accepted action, deadline, competing response, actual authority that may commit, and what must happen on stale/late/withdrawn consent; mark answers Unratified if no owner decision.
3. Crosslink existing design and canonical first-playable status without adding 'everyone has one vote' or automatic timeout. Do not launch implementation or GM07 fallback work.

Before editing, compare actual source tree, the selected meaning of exact headings, all incoming links and current dirty state. If the reader question is already answered at one precise stable owner, **record reviewed no-op** and improve the route instead of adding a redundant document.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | changed: one Proposed link in docs/product/foundations/vision.md#first-playable-target, docs/product/gameplay/acceptance-scenarios.md#5-respond-or-miss-the-window, and docs/product/gameplay/time-and-autonomy.md#first-playable-scope, while solo consent rules stay as written | Selected product owners above; exact Proposed/Blocked boundary | Human ratification required before any new game, permission or legal rule |
| Technical | changed: one Proposed link in docs/technical/engine/lifecycle-and-compatibility.md#membership-and-settings-changes, adopting no runtime guarantee and no group rule | Selected wording on that page stays | Source proof is not invented |
| Code | unchanged because this is a documentation-only Change: **no application source, tests, schema, migrations or executable tool modification** is allowed | Source files are read-only evidence; runbooks may cite commands only after safety review | Negative: any executable diff blocks Done |
| Related | changed: CREATE work/designs/open/shared-play/CONSENT-AND-RESOLUTION-MATRIX.md and one Proposed sentence in work/designs/open/shared-play/README.md | docs/product/README.md, work/designs/README.md, and work/changes/README.md stay unedited | WIKI16 declared CREATE; the new page is not ratified |

**Planned CREATE/RELOCATE gating:** the destination path may not exist at design time. Do not mark Ready until WIKI16's create/move plan compatibility is checked or the packet is explicitly revised to an existing-owner edit. Require an actual migration of every important inbound fragment before Done; no automatic "page count improved" acceptance.

**CREATE declaration:** CREATE `work/designs/open/shared-play/CONSENT-AND-RESOLUTION-MATRIX.md`. The file did not exist at design time. This Change created that file. A misspelled existing file is not a valid CREATE. The owner authorized this CREATE and Ready for close. WIKI16's declared-creation check is the CREATE row in `scripts/repo-tools/wiki-core/change-guard.mjs`. Ready for close is not Done. No heading moved, so there is no migration receipt.

## Acceptance and adversarial proof

**Normal:** a fresh agent answers the intended reader question from the correct owner with selected/proposed/implemented states separated, and the new page genuinely reduces detours or ambiguity. **Negative:** Player A may choose B's action, one device can commit both incompatible outcomes, or absence alone grants general delegated combat choice.

**Owner gate:** All new multiplayer control/consent/financial rules require explicit product owner ratification before normative docs.

**Verification:** exact before/after claim ledger, source-revision status where factual, full-link/anchor and reverse dependency checks, reader task trace, and independently reviewed falsifying counterexample. All actual commands/results must be recorded, not guessed. A page can be *good but not needed*: closing with a proved no-op or cancelling the proposed split is legitimate.

**Execution record:** The matrix was not already answered on one owner, so the page was created. SHA `b3113814` from `git rev-parse --short HEAD`. Code unchanged. No provider call. `python` import of `scripts/check_docs.py` `check_file` on the new matrix, the shared-play README, the four linked pages, and this CHANGE.md returned clean after the lifecycle link depth was corrected. `pnpm wiki:change-guard --mode plan` returned ok with no findings. Scoped close returned ok. It warned `citation-candidate` for pages that already cite the edited owners, including `docs/README.md`, the technical index, experience and storyteller neighbors, and several engine and platform neighbors. Those pages were not edited. The added sentence does not change the claim they cite, and other packets own the indexes. Two contract dependents were ledgered unchanged: permission to advance, and frozen operation identity. Full-tree close was not used, since the worktree can contain concurrent edits. WIKI16 create recognition is the CREATE row in the current guard. This packet does not mark WIKI16 Done.

## Document shape | shape-ops.v1

| Operation | Path | Heading migration | Unique conservation |
| --- | --- | --- | --- |
| CREATE | work/designs/open/shared-play/CONSENT-AND-RESOLUTION-MATRIX.md | new owner; no old heading moved | The matrix stays Proposed and unratified. A fictional group scene must not become selected policy. An unanswered decision stays open. One vote per person and an automatic timeout are not selected. |

## Reconciliation ledger | fill at execution

CREATE work/designs/open/shared-play/CONSENT-AND-RESOLUTION-MATRIX.md

Inspected source SHA: `b3113814`. Code unchanged.

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| work/designs/open/shared-play/CONSENT-AND-RESOLUTION-MATRIX.md#matrix | unratified design | changed: CREATE the consent matrix. Status stays Proposed and unratified. No shared-play rule, one-vote rule, or automatic timeout is adopted. | no source behavior changed; inspected SHA b3113814 | documentation inspection; Proposed, not a selected rule | A fictional group scene must not become selected policy. Player A does not gain Player B's action. One device does not commit both incompatible outcomes. Absence does not grant general delegated combat choice. An unanswered decision stays open. | CREATE work/designs/open/shared-play/CONSENT-AND-RESOLUTION-MATRIX.md |
| work/designs/open/shared-play/README.md | proposed design index | changed: one Proposed sentence linking the matrix. The index status stays proposed. The file is not replaced. | no source behavior changed; inspected SHA b3113814 | documentation inspection | The index sentence must not paraphrase an Unratified cell as an accepted rule. | one sentence in the existing note |
| docs/product/foundations/vision.md#first-playable-target | product | changed: one Proposed link to the matrix. The small-group ambition and its Proposed/Blocked live acceptance stay as written. | no source behavior changed; inspected SHA b3113814 | documentation inspection | The invitation ambition must not be read as a ratified join protocol. | one link in that heading |
| docs/product/foundations/vision.md#what-this-page-selects | product | unchanged because player consent, the open unanswered decision, and the refusal of a general delegated choice stay as written. This heading was not edited. | no source behavior changed; inspected SHA b3113814 | documentation inspection | Leaving the page does not authorize a new choice. | heading not edited |
| docs/product/gameplay/acceptance-scenarios.md#5-respond-or-miss-the-window | product | changed: one Proposed link to the matrix. The rescue stays inside the small-party ambition. The collection rule stays proposed. | no source behavior changed; inspected SHA b3113814 | documentation inspection | Two continuations must not produce both a rescue and the wizard being swallowed. The scene does not choose an arbitrator. | one link in that section |
| docs/product/gameplay/acceptance-scenarios.md#long-life-benchmark-playthroughs | product | unchanged because the route to the long-life atlas stays, a goblin deadline stays illustration, and the small-party ambition stays an ambition. | no source behavior changed; inspected SHA b3113814 | documentation inspection | A fictional group scene must not become selected policy. | heading not edited |
| docs/product/gameplay/time-and-autonomy.md#first-playable-scope | product | changed: one Proposed link to the matrix. An unanswered decision stays open. A timed fallback stays inside the Proposed/Blocked boundary. | no source behavior changed; inspected SHA b3113814 | documentation inspection | An automatic timeout is not selected. Absence does not grant a new choice. | one link in that heading |
| docs/product/gameplay/time-and-autonomy.md#pace | product | unchanged because no accepted execution still means no fictional time, and an imminent deadline still must not move quietly while another participant is deciding. This heading was not edited. | no source behavior changed; inspected SHA b3113814 | documentation inspection | The pace rule must not be rewritten into a group vote. | heading not edited |
| docs/technical/engine/lifecycle-and-compatibility.md#membership-and-settings-changes | technical | changed: one Proposed link only. Revocation, leave without killing the character, and the in-flight payer stay as written. No group rule is adopted. | no source behavior changed; inspected SHA b3113814 | documentation inspection | A late command from a revoked participant is not a new grant. A host title does not choose another person's action. | one link at the end of that heading |
| docs/product/README.md | product index | unchanged because the index already points at the near-term playthrough and the long-life atlas. This Change does not edit that sentence. | no source behavior changed; inspected SHA b3113814 | documentation inspection | The index must not turn the small-party ambition into selected shared play. | page not edited |
| work/designs/README.md | design index | unchanged because this Change does not edit the design index. | no source behavior changed; inspected SHA b3113814 | documentation inspection | The design index must not ratify the matrix. | page not edited |
| work/changes/README.md | change index | unchanged because this Change does not edit the change index, does not archive this packet, and does not mark it Done. | no source behavior changed; inspected SHA b3113814 | documentation inspection | Ready for close must not be read as a selected Change. | page not edited |
| work/changes/open/2026-11-13--gm-delegated-decision/CHANGE.md | proposed packet | unchanged because this Change does not launch GM07 and does not select a delegated-decision rule. | no source behavior changed; inspected SHA b3113814 | documentation inspection | A goblin deadline remains illustration. GM07 is not selected policy. | page not edited |
| docs/technical/engine/chronology-and-activities.md#permission-to-advance | technical | unchanged because the execution gate still keeps the product rule that only an accepted action owns duration. The pace heading was not edited. | no source behavior changed; inspected SHA b3113814 | documentation inspection | An unaccepted clock does not move. A background tab does not create permission. | page not edited |
| docs/technical/platform/http-api-and-client-contracts.md#frozen-operation-identity | technical | unchanged because five owners and the frozen operation identity stay as written. The membership heading gained one Proposed link, and this contract was not edited. | no source behavior changed; inspected SHA b3113814 | documentation inspection | A retry still reuses the captured operation identity. A new intention is still a new identity. | page not edited |
| Executable application, API, and test files | code | unchanged because no application source, test, schema, migration, or tool was modified. | no source behavior changed; inspected SHA b3113814 | documentation inspection. This Change has no executable diff. | An executable diff would block close. A fictional scene is not turned into a commit rule in code. | no code edit |

No automatic next packet. Stop at any new product policy, staff permission, legal retention rule, provider spend or incompatible source owner that requires an independent decision.
