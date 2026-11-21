# Writer implementation | Storyteller Workshop

**Owner:** [Storyteller Workshop](UNDERTAKING.md). **Integration target:** `undertaking/storyteller-workshop` (never individual WR → `main`). **Purpose:** dependency map and planner gate, not a second work queue or permission to spend. [Global selection](../../QUEUE.md) controls default work; owner may commission a named independently ready Change. **Re-audited 2026-11-21** against source snapshot `dac6b698`, selected remote key anchors at undertaking HEAD `7fccbc6417b4959985c633a9c073571a032030ba`. These are **source-inspection observations, not runtime test passes**. Later packet-audit documentation commits advance branch HEAD without changing the inspected code.

> **Next-wave design overlay (planning branch only, not an execution commission):** [rolling implementation schedule](NEXT-WAVE-POST-MA06A.md) and source-grounded [WR05 publication algorithm](../../changes/open/2026-11-21--wr05-coherent-scene-publication/POST-MA06A-EXECUTION.md), [WR07 Launch backend](../../changes/open/2026-11-21--wr07-one-prompt-launch-backend/POST-MA06A-BACKEND-DESIGN.md), and [WR08A independently buildable UI packet](../../changes/open/2026-11-21--wr08a-play-launch-surface/CHANGE.md). The integrated MA06A code lives under `packages/story-engine`; original WR04–WR08 pre-refactor T-IDs remain unready. **Currently active Cursor chats:** WR05S (Documents/DB) and WR07C (Contracts). **Next executable pair after those dependencies land:** WR05 publication in Story Engine and WR08A frontend, separate worktrees and serialized integration. Do not launch replacement Changes from this planning branch.

| Change | Outcome | Reality and current execution disposition |
| --- | --- | --- |
| WR02 | Persistent Library/source identity | Done, archived |
| WR03 | Writer mission and Workdesk | Done, archived; `storyteller_writer_mission` and `storyteller_writer_step` now exist |
| [WR04](../../changes/open/2026-11-21--wr04-delegated-writer-research/CHANGE.md) | Separate bounded writer-child contexts | **PLANNER-BLOCKED:** WR03 step/custody still assumes `contextId=missionId`; read-only tool/child budget/attempt/join maps not frozen |
| [WR05](../../changes/open/2026-11-21--wr05-coherent-scene-publication/CHANGE.md) | Complete v2 scene commit + active semantic state | **PLANNER-BLOCKED:** world-state schema/after-image projector/SQL migration/note transaction design not fully decided |
| [WR06](../../changes/open/2026-11-21--wr06-fork-active-fictional-state/CHANGE.md) | Historic active-state fork | **PLANNER-BLOCKED:** needs actual WR05 v2, deterministic ID and FK remap, transactional scheduler map |
| [WR07](../../changes/open/2026-11-21--wr07-one-prompt-launch-backend/CHANGE.md) | Idempotent authenticated one-prompt Launch | **PLANNER-BLOCKED:** needs WR05 scene-one contract, fixed DTO/route/SQL custody and Nest+GA local/remote map |
| [WR08](../../changes/open/2026-11-21--wr08-one-prompt-client-and-integrated-acceptance/CHANGE.md) | UI launch/history/fork and scripted acceptance | **PLANNER-BLOCKED:** depends on actual WR04, WR06, WR07 response and fixture contracts; current T01 is source-only, not a PATCH |

## Dependency and concurrency plan

```mermaid
flowchart LR
  WR03[WR03 Done] --> WR04[WR04 child contexts]
  WR02[WR02 Done] --> WR05[WR05 scene v2]
  WR03 --> WR05
  WR05 --> WR06[WR06 active fork]
  WR05 --> WR07[WR07 launch backend]
  WR03 --> WR07
  WR04 --> WR08[WR08 web and E2E]
  WR06 --> WR08
  WR07 --> WR08
```

These are **logical dependencies, not verified parallel-work permissions**. Do not automatically run WR04+WR05 simultaneously: both may edit `packages/application/src/storyteller/*`, writer publication and related migrations. Do not assume WR06+WR07 can run simultaneously: fork/Launch may share story-authority composition, API/GA seam, migration files, story selectors and disposable SQL fixtures. Before any simultaneous Change commissions, **ChatGPT** must publish exact files/resources/exports and a verified disjointness matrix; one integration custodian serializes merges. Within one ready packet allow up to two truly independent Composer workers only when the packet proves no source/generated output/fixture/Git collisions. Otherwise serial is preferable.

## Planner's next bounded work, not paid Cursor work

1. **WR04:** specify context-qualified writer step/custody signatures, child budget SQL and tool enforcement; write exact T-ID maps and focused negative tests, then independent G0–G7.
2. **WR05:** freeze canonical v2 schema/size policy, after-state transition table, SQL version migration and pre-stage/lock/adopt proof; split if necessary and independently audit.
3. **WR06 and WR07:** after WR05 is integrated, map exact v2 ID remap vs Launch scene-one/custody and test fixtures. Independently inspect concurrency and update each Change.
4. **WR08:** only after backend contracts are landed, select precise UI hooks/routes and existing harness; isolate functional zero-provider acceptance from optional funded creative quality.

The `SOURCE-MAP.md` and `PROOF.md` for each Change include its initial G0–G7 audit and observed failure modes. All current WR04–WR08 T-IDs are explicitly **PLANNER-BLOCKED**, so “do WR04” must not cause a Cursor design expedition. ChatGPT prepares/re-audits the specific next packet first. After a packet passes and the owner commissions it, Cursor completes that **whole Change** through verified proof, reconciliation, squash integration, archive and clean worktree retirement without automatic successor dispatch.

**Historical provenance, not active instructions:** [original implementation program](https://github.com/DenisSkulovic/offscreen-rpg/blob/4ee459b9acdc73c7f63674b697baeb9c7e685da4/work/changes/WRITER-IMPLEMENTATION-2026-11-21.md), [documentation handoff](https://github.com/DenisSkulovic/offscreen-rpg/blob/4ee459b9acdc73c7f63674b697baeb9c7e685da4/work/changes/WRITER-DOCS-CHATGPT-HANDOFF-2026-11-21.md), and [old Composer audit](https://github.com/DenisSkulovic/offscreen-rpg/blob/4ee459b9acdc73c7f63674b697baeb9c7e685da4/work/changes/WR-COMPOSER-HANDOFF-AUDIT-2026-11-21.md). These do not supersede current code or current readiness.

**Exit:** only after the undertaking's actual implementation/evidence and canonical documents are reconciled, use its integration and retirement procedure; never mistake planning completion for proof.
