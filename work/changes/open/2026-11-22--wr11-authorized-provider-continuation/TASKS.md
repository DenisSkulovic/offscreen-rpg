# WR11 bounded Cursor tasks

Target current `undertaking/storyteller-workshop` after TURN03 closes. Create `change/wr11-authorized-provider-continuation` linked worktree and run branch guard.

## T01 | provider admission and capture pin
Read: `writer-continuation.ts`, `narrative-intent-settlement.ts`, `stories/index.ts`, v3 capture schema symbol.  
Write: those owners plus focused schema/admission tests.  
Implement the exact default-scripted/provider-authorized value and persisted policy-version pin.  
Positive: provider admission creates same `writer.scene.v1` topic with selected model/policy pin. Negative: player body cannot select it; replay under changed boot config keeps original capture. Stop on incompatible capture-version migration.

## T02 | bootstrap policy composition
Read: `apps/game-authority/src/writer-round-lab-policy.ts`, `writer-round-control-seam.ts`, `apps/worker/src/bootstrap/config.ts`, `bootstrap/main.ts`.  
Write those config/composition owners + tests.  
Add explicit provider-authorized policy configuration shared by SQL worker/GA; executor uses existing transport/key. Default remains no provider admission. Negatives: missing key at invoke, policy/model/version mismatch, scripted-lab+key conflict.

## T03 | GA multi-round control
Read: `writer-round-settled-finalization.ts`, `writer-loop.ts:interpretPersistedWriterDecision`, `writer-round-control-seam.ts`, control contract.  
Write those owners + tests.  
Plan latest parent step, not ordinal 1. Return typed needs-next-round after ordinary tool round; research.delegate held. Positive tool round creates/reuses next parent step. Negative stale root/tool replay mismatch/max rounds.

## T04 | existing workflow bounded loop
Read/write `packages/workflows/src/{contracts,index}.ts`, `apps/worker/src/activities/writer-scene-distributed-control.ts` + focused workflow tests.  
Loop only on needs-next-round. Same workflow type/id/topic. One execute activity per ordinal, no automatic send retry. Negative uncertain round stops forever without another invoke.

## T05 | connected fake-provider proof
Add `tools/api-integration/test/wr11-provider-continuation.integration.ts`. Use disposable SQL/DocumentStore/Temporal and injected fake transport; no OpenRouter. Round1 tool -> round2 final -> publication. Prove invocation count=2, one tool receipt, one passage/checkpoint, replay/restart no extra invoke, scripted WR10B regressions green. Use Turbo dependency closure, not manual package build archaeology.

On full acceptance reconcile, archive, squash-integrate, retire. Do not run a paid model call.
