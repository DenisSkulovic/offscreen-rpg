# WR04 | Real independent Writer research

**Status: CONDITIONAL, PLANNER-BLOCKED until P3-A and P3-B are actually integrated and their context/custody interfaces inspected. NOT a commission.** One complete research capability Change, not child-table-only prep. Integration target undertaking/storyteller-workshop, never main. Old TASKS.md is historical.

## Result
The Writer may delegate zero or several narrow Library questions to independent read-only model conversations, get verified cited results and contradictions, and alone publish the next scene. Shared finite budget and uncertain-delivery rules apply to the parent and every child. No child may stage canon, submit a scene or recursively delegate.

## Inspected source baseline (2026-11-21, before P3 integration)
packages/db/src/schema/storyteller.ts:storytellerWriterStep has missionId/contextId/ordinal identity. packages/story-engine/src/storyteller/writer-loop.ts:loadModelStep,recordToolInvocationStep,insertNextModelStepPrepared hardcode contextId=missionId. writer-mission-custody.ts:lockWriterParentStep,advanceWriterMissionProviderStep also assumes parent context. writer-workdesk.ts:executeWriterWorkdeskTool can stage private source. packages/storyteller/src/tasks/writer-mission.ts:WRITER_MANDATORY_TOOL_NAMES includes workdesk and submit_scene. The existing source does NOT establish working child isolation.

## Five substantial tasks within ONE Change
**T01 Child contract and role:** New packages/storyteller/src/tasks/writer-research.ts captures immutable parent mission, request tool-call id, question, ordinal, pinned source root/revision, visibility/tool grants, model/budget caps. Deterministic child ID derived from missionId + parent call id + ordinal; frozen request identity. Response includes cited claims, gaps, contradictions, failures. Positive two independent requests; negative widened grants, recursive delegation, duplicate changed request.

**T02 Child SQL + shared budget:** One storyteller_writer_child registry table/migration in packages/db/src/schema/storyteller.ts, FK mission, unique(parent call id,ordinal), immutable root/tool/cap fingerprint, state, result hash. Allocate limited child slices under existing mission/operation/funding SQL lock. All real provider charges settle on SAME operation without double counting. Dispatched/uncertain costs cannot be falsely refunded. Prove two racing children cannot exceed aggregate allowance; retry yields one child identity.

**T03 Separate child execution:** Generalize the ACTUAL landed P3 step/custody APIs to missionId + contextId and trusted role. Parent defaults retain v1/v2 replay. Each child has independent transcript/attempt history. Server dispatcher allows only library.browse/find/read/diff and skills.open, denies all workdesk.*, submit_scene and recursive child launch regardless of model instructions. Library membership, private stage and fork-future violations fail closed. No canonical writes by child.

**T04 Durable wake + sourced join:** Reuse P3 outbox/workflow identity, child contextId globally unique. Parent freezes question list; join in request order, independently reopen and verify every citation hash/root/visibility. Optional unavailable child is a documented gap; required child failure holds the parent. Completion order cannot change result. No parent publication delegated to child.

**T05 Joined acceptance + closure:** Scripted Writer scene requests two bounded child research tasks, receives a source-correct fact and a contradiction, produces a parent-only scene proposal; prove forbidden tool, forged source, delayed completion, uncertain cost, duplicate wake, aggregate cap and zero-child simple scene. Focused package build/SQL tests, no paid calls. Archive full WR04 and squash-integrate into undertaking, update program/overview and retire worktree.

## Ownership and gates
WR04 owns new child schemas/adapters, one DB migration and context-specific Writer tools/custody AFTER P3-A/B have released shared Writer owners. May run in parallel with WR08 Web, in separate worktrees and DBs. Do not run MA-final package migration simultaneously. Shared catalog and overview changes are serialized by integration custodian.

Independent readiness G0–G7 must recheck actual post-P3-A/B source, grant/price policy, tool dispatcher, migration index, model transport and negative tests before commission. Currently UNVERIFIED/PENDING. No authorization to spend real provider funds, deploy or change protected data.
