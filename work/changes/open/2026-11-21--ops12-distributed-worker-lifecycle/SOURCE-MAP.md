# OPS12 | actual lifecycle call and failure map (6dd12761)

**Start path:** apps/worker/src/runtime/storyteller-distributed-live.ts:startStorytellerDistributedLiveStack(database,config,report): await startRuntime(relay) → await startControlRuntime(control config) → await startExecutionRuntime(executor config) → return {relay,control,executor,stop}. No catch around intermediate stages. stop() currently await relay.stop(); await executor.stop(); await control.stop(); first throw skips later.

**Control:** apps/worker/src/runtime/control.ts:startControlRuntime: create publication client (no SQL), NativeConnection.connect, try Worker.create for storytellerControlTaskQueue with workflowsPath, worker.run(), stop() memoizes promise, calls worker.shutdown when RUNNING, awaits work.finally(closeWorkerConnections({native})). Catch on Worker.create closes native. On async work reject, caller's finally must stop; ensure one close path and primary error preservation.

**Execution:** apps/worker/src/runtime/execution.ts:startExecutionRuntime: NativeConnection.connect, createStorytellerTaskCustodyClient, Worker.create with storytellerExecuteTaskQueue and **no workflowsPath/SQL**, worker.run(), returned stop memoizes but no try/catch around Worker.create. Must close native if Worker.create fails. Worker.run rejection and independent stop cleanup also tested.

**Existing closure primitive:** apps/worker/src/runtime/connections.ts:closeWorkerConnections independently attempts native and optional client connection, throws one error or AggregateError. Keep behavior for legacy all-in-one runtime; adding a shared once-only close helper must not change existing external API.

**Entrypoints:** apps/worker/src/bootstrap/{control-main,executor-main}.ts install SIGINT/SIGTERM, then await runtime.done; finally await runtime?.stop(); failures logged with classifyRuntimeError. **Read only**, don't install a second signal handler or leak error body into logging.

**Test anchors:** apps/worker/test/{close-worker-connections,storyteller-worker-split}.test.ts; tools/api-integration/test/story03-causal-multiprocess.integration.ts and helpers/story03-causal-multiprocess-harness.ts READ ONLY for later cross-process evidence (no DB/process mutation in this Change). The existing test uses actual GA/executor kill and must not be weakened.

**Failure table:** control startup throws → previously started relay.stop exactly once; executor startup throws → stop control+relay both (reverse order); normal stop one role rejects → all three stop attempted and errors aggregate; worker create throws after NativeConnection.connect → close exactly once; Worker.run rejects → done rejects and native close exactly once; stop twice/parallel → at most one worker.shutdown and one native.close.
