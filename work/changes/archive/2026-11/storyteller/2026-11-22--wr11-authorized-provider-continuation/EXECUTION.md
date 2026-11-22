# WR11 selected execution

## T01 admission + policy pin

Add a typed provider admission value and provider policy/version pin to v3 continuation capture with backward-compatible scripted parsing. Default admission stays scripted. Provider admission is constructed only from validated server configuration and passed through the existing SQL-worker call chain. Existing mission replay never reselects admission.

## T02 explicit provider-authorized bootstrap

GA: extend Writer bootstrap with `provider-authorized`, install one validated `WriterRoundModelPolicy`, and validate capture model + policy version + budgets before plan/prepare.

SQL worker: parse the same non-secret provider policy at boot and derive `WriterContinuationAdmission`.

Execution worker: provider-authorized mode uses the existing WR10 real transport; key absent => fail before invoke. Scripted-lab mode remains mutually exclusive with provider key. Free integration tests inject fake transport directly; do not add a fake production endpoint.

## T03 multi-round GA control result

Extend control contracts:
- execution plan includes `maxModelRounds`;
- finalize result adds `needs-next-round` with next ordinal/revision (or enough typed state for the next plan to return it).

Remove fixed ordinal=1 planning. Query latest parent step. Finalization interprets current saved response. Final -> publish. Tool round -> execute/replay tools through existing interpreter, ensure next parent step exists, return needs-next-round. Research-delegated -> held `research_delegate_unsupported`.

## T04 workflow loop

Keep stable workflow type/id. Loop:
1. plan;
2. enforce ordinal <= maxModelRounds;
3. create deterministic Temporal attempt id;
4. executePreparedWriterRound exactly once;
5. terminal held/uncertain/failed => stop;
6. finalize;
7. published/replayed => return;
8. needs-next-round => loop and re-plan durable state.

Do not retain prompt/body/tool contents in workflow history.

## T05 free connected proof + close

Injected fake provider:
round 1 = one granted Library browse/read call; round 2 = final v3 scene with two authored intents.
Prove exactly two fake invocations, one tool receipt, one passage/checkpoint, zero paid/network calls, restart/replay no extra send. Run existing WR10B scripted proof/regressions.

On acceptance archive/integrate/retire. Optional paid smoke remains separate permission/evidence.
