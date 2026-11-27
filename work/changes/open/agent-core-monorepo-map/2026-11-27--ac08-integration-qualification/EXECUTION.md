# AC08 | selected execution contract

## Workflow adapter

Test-only `mission(raw:unknown, testControl?:'hold-after-tool'|'hold-before-loop'|'unknown-model')` exported from `test/mission.workflow.ts`; control supplied by harness only (no public consumer). For normal/hold-after-tool, trusted model ID `e1-synthetic`. Unknown-model uses trusted deliberately bad ID for native diagnostic; never accepts arbitrary route. `hold-after-tool` only wraps dispatch after readDocument completion with `condition(()=>released)`, fixed signal `defineSignal('e1-release')` and setHandler before execution. `hold-before-loop` waits condition never released, no effects; timeout tests native Workflow execution deadline. `proxyActivities<{runSyntheticTool(request: SyntheticToolRequest):Promise<string>}>` from workflow, same fixed 10s/1 attempt/2s heartbeat/WAIT_CANCELLATION_COMPLETED. No test-control in core. Use relative imports `../dist/workflow.js` or package subpath export `@offscreen/agent-core/workflow`; fixture test definitions import root types only; `workflowsPath` points TS adapter, compiled by native webpack after dist build. No root plugin import in Workflow.

## Host lifecycle

`qualification.mjs` exports `validateQualificationEnv`, `createHarness` and direct `main` only when `import.meta.url === pathToFileURL(process.argv[1]).href`; import has no side effects. `createHarness` holds native/client connections (loopback), unique queue `agent-core-e1-${randomUUID()}`, fresh per-Worker observations, actual `workflowsPath`, createFixturePlugin and createFixtureActivities, and methods `startWorker()`, `stopWorker()`, `startMission(definitionId,input,requestedTools,maxSteps=3,testControl?,missionId=randomUUID())`, `history(handle)`, `waitFor(predicate,timeoutMs)`, `close()`. `startMission` uses actual `missionWorkflowId`, WorkflowIdReusePolicy REJECT_DUPLICATE, WorkflowIdConflictPolicy FAIL; unique IDs and 30s workflowExecutionTimeout, no Workflow retry. Return {handle,missionId,workflowId}. Use native client start with `mission` string, args [raw,control] (omit optional control when none). No user-provided fixture functions/route. Invalid raw inputs via helper `startRaw(raw, workflowId,control?)` for diagnostics only, same queue/deadline/duplicate policy. `history` fetches actual events; count scheduled names `invokeModel`, `runSyntheticTool`, and completions by scheduledEventId, map physical observations by actual Activity identity, record IDs/attempt, not raw prompt. `waitFor` poll <=100ms within finite deadline. Run worker.run promise tracked; readiness via successful Worker.create + run, failure rejects; cleanup only owned worker/connection, outer shell bounds if native hangs. `runScenarios` and `runRecovery` called sequentially by main; final JSON receipt includes source SHA if supplied by owner, namespace, queue, cases, counts, history event count, negative results, status; no raw payloads. On failure stop and emit bounded diagnostic, nonzero exit.

## Scenario matrix

| Case | Expected result / physical effect |
| --- | --- |
| researcher and arithmetic E1_SINGLE (no tools) | completed exact output, 1 model / 0 tool each |
| both E1_TOOL with own tool | completed exact output, 2 model / 1 own tool each; result fed back |
| invalid definition/version, actual ID mismatch, extra field modelId, duplicate/foreign tool, maxSteps 0/4, input 4097 | denied before effects, 0/0; test at least each distinct guard |
| trusted `unknown-model` control | failed, model dispatch attempted once by plugin but provider lookup rejects; zero synthetic doGenerate success, zero tools |
| model E1_UNKNOWN_TOOL / E1_BAD_ARGS | denied; 1 model (stop after invalid step); no unauthorized tool Activity; later text cannot turn success |
| researcher E1_UNGRANTED_TOOL, requestedTools=[] | denied; one actual model invocation, zero scheduled or physical runSyntheticTool Activities, tool absent from advertised capability list; a valid readDocument request is still unauthorized |
| E1_THREE_TOOLS | limit-reached; 1 model, max 2 admitted/actual valid tools; no 3rd Activity |
| E1_TOOL maxSteps=1 | limit-reached; 1 model, 1 valid tool; no second model |
| E1_MODEL_FAIL | failed; 1 attempted model, 0 tool, no retry |
| arithmetic E1_TOOL_FAIL | failed; 1 model/1 attempted tool, no success/automatic retry |
| E1_PARTIAL | failed despite nonempty text; 1 model/0 tool |
| duplicate same mission ID active/completed | start rejected, history no extra Activity; active duplicate can use hold-before-loop and cancel own handle |
| E1_CANCEL_HOLD | wait observed held model start then cancel; native cancelled, no tool or later successful dispatch; fixture abort observed, Worker drains |
| E1_TIMEOUT_HOLD | Activity >10s start-to-close timeout, failed (`execution-failed`); no later model/tool success; owned delay bounded and drained |
| hold-before-loop | 30s Workflow execution timeout, native timed-out, zero effects |
| replay | completed P1 history replay success; zero new model/tool dispatch |
| fresh Worker | recorded completed tool, deterministic pause, new Worker same queue, release, exact final answer, no duplicate completed Activity |

Use diagnostic expected statuses precisely: Activity timeout is ordinary failed mission (`execution-failed`); native Workflow deadline is TIMED_OUT, not application outcome. Cancellation failure cause chain check with SDK actual error types; cannot silently swallow timeout/cancel. If SDK native behavior cannot support the agreed terminal contract, return planner with exact history and source. Tests do not require billing/real providers. Scope preserves bounded synthetic model & Activity only.

## Replay and restart

For replay use completed P1 fetched history, same pinned bundle and `plugins:[createFixturePlugin(freshObservations)]`; assert replay returns without failure and empty observation arrays. Restart use E1_RESTART researcher read, hold-after-tool; poll until ActivityTaskCompleted corresponding to scheduled runSyntheticTool, WorkflowTaskCompleted following that completion, no subsequent invokeModel scheduled. Only then shutdown Worker1 and await stopped; capture observations. Worker2 fresh plugin/activity observations, same queue and namespace, signal `e1-release`, await result within Workflow deadline. Check history scheduled/completed IDs and exact 2/1; Worker1 model+tool, Worker2 final model only. Never rely on in-memory counter for response. Graceful restart at durable boundary is proof of that boundary, not arbitrary process crash or exactly-once external effects. Finally close owned Worker; no namespace deletion.
