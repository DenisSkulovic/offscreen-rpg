# WR10B bounded Cursor tasks

**Setup:** branch from current `undertaking/storyteller-workshop` HEAD into linked worktree `change/wr10b-provider-free-temporal-writer`. Run `node scripts/repo-tools/change-branch-guard.mjs --change WR10B --target undertaking/storyteller-workshop`.

## T01 | v2 Writer workflow and wake dispatch

Read:
- `packages/workflows/src/{contracts,index}.ts`
- `apps/worker/src/outbox/dispatch.ts`
- workflow/outbox focused tests.

Write those owners + tests.

Implement the exact `writerSceneDistributedV2` orchestration from EXECUTION. Do not change historical `writerSceneV1` body.

Positive: `writer.scene.v1` selects v2 and execution activity is on `storyteller-execute-v1`.  
Negative: old workflow export still exists; duplicate start does not create a second workflow.  
STOP if current HEAD has changed the wake topic or workflow ownership.

## T02 | mount WR10 activity and deterministic no-network transport

Read:
- `apps/worker/src/runtime/execution.ts`
- `apps/worker/src/bootstrap/config.ts`
- `apps/worker/src/activities/writer-round-provider-execution.ts`
- `packages/storyteller/src/{providers/writer-round-transport.ts,tasks/writer-round-request.ts}`
- existing worker tests.

Write runtime/config + one narrow deterministic transport module + focused tests.

Positive: scripted lab config boots execution worker and one prepared v3 wire returns valid final decision with exact SHA and zero usage.  
Negative: broad DB env still refuses startup; missing/invalid lab mode never selects fake transport; test spy proves zero fetch calls.  
STOP if fake output requires DB/DocumentStore access.

## T03 | GA plan/finalize and mode-aware scripted policy

Read:
- `apps/game-authority/src/{writer-round-private-seam,application,server,bootstrap/main}.ts`
- `packages/story-engine/src/storyteller/{writer-round-replay,writer-loop,writer-continuation-publication,writer-mission-custody}.ts`
- GA writer-round tests.

Write those exact owners plus one focused Story Engine finalization helper/test.

Implement control-only plan/finalize and explicit lab policy. Provider/default path must continue refusing `scripted-offline`; scripted lab accepts only that model.

Positive: settled deterministic response rehydrates, validates and publishes one next scene.  
Negative: wrong role, no lab flag, model mismatch, missing result pointer, duplicate finalize all fail/replay safely.  
STOP if publication would require moving SQL/storage authority into executor.

## T04 | connected proof + close

Add/update one uniquely named WR10B integration test under `tools/api-integration/test/`.

Prove full zero-cost chain through real Temporal executor queue with disposable resources. Also prove:
- exactly one fake invocation;
- zero external provider fetches;
- zero duplicate scene on replay;
- executor environment has no broad DB credential;
- wrong bearer roles denied;
- existing WR10 focused suite remains green.

Run focused builds/typechecks and changed-file quality checks. No paid call.

On full acceptance: reconcile docs/STATUS/undertaking overview proportionately, archive WR10B, squash-integrate into `undertaking/storyteller-workshop`, retire worktree/branch, return final joined SHA. Do not start WR11. TURN03 is then eligible for T04 rerun.
