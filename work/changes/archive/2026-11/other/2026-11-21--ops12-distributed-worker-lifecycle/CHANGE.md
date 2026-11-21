# OPS12 | Failure-safe distributed Worker startup, shutdown and recovery ownership

**State: IMPLEMENTED on change/ops12-distributed-worker-lifecycle; awaiting the named DX12 custodian join into undertaking/storyteller-workshop.** **Source-inspected baseline:** MA08 integration 6dd1276131a813f694ec3bccf4f9062ad3708208; target undertaking/storyteller-workshop. Do NOT commission while prior worktrees are active. No external provider, Kubernetes deployment, DB mutation or real Temporal server required for scoped tests.

## Source-proven problems
- apps/worker/src/runtime/storyteller-distributed-live.ts starts relay → control → executor without a try/catch rollback. If control/executor startup fails, already-running components are left running. Its stop() awaits relay, then executor, then control serially: first rejected stop strands the others.
- apps/worker/src/runtime/execution.ts obtains a NativeConnection then calls Worker.create without a catch: creation failure strands that connection. A failed work promise does not own a single guaranteed cleanup path.
- runtime/control.ts closes NativeConnection if Worker.create fails, but its asynchronous run/stop cleanup is distributed among callers. A repeated shutdown or run rejection can create cleanup races. The main.ts control/executor entrypoints already call stop() in finally and must retain that behavior.
- Workflows and SQL are independently durable, but this source **does not** prove all resources are retired after startup/stop failures. The existing STORY03 multiprocess harness proves some kill/replay scenarios, not all lifecycle defects above.

## Selected end state
One shared **internal** idempotent stop/close rule for control and execution runtimes; strict partial-start rollback of the live combined stack; independent (all-settled) termination in reverse startup order with error aggregation and no secret/raw provider payload in logs. Preserve control-only workflow+publication queue, executor-only activities/no SQL, the 10-second Temporal shutdown grace, and existing task queues/workflow IDs. A rejected Worker.run or Worker.create always eventually closes the native connection once. Stop called twice returns one outcome, not a double close.

**Implementation ownership:** apps/worker/src/runtime/{control,execution,storyteller-distributed-live,connections}.ts, one optional new runtime lifecycle helper in that same directory; apps/worker/test/{distributed-runtime-lifecycle,storyteller-worker-split}.test.ts and close-worker-connections.test.ts if needed. **No** apps/worker/src/runtime/index.ts, activities, launch, bootstrap/config, apps/worker/package.json, packages, tools, DB, docs, lockfile, main or provider code. These exclusions keep it disjoint from WR09B and DX12.

**Contract:** startExecutionRuntime and startControlRuntime retain their external signatures and returned {done,stop}. Internal dependency seams, if needed, are optional typed adapters on a private factory, not a new npm package. startStorytellerDistributedLiveStack gains a test-only fourth optional argument of start functions defaulting to real ones; no production caller changes. On start failure, stop every previously started role in reverse order, rethrow the original startup error (AggregateError if cleanup also failed). On normal stop, attempt all three role stops even if one throws, then surface collected failures. This is resource safety, not workflow/provider retry logic.

**Acceptance:** deterministic injected-fake tests for failure at each startup stage, Worker.create fail, Worker.run reject, shutdown reject, duplicate stop, aggregate cleanup errors, stop order and no executor SQL credential inheritance. Existing split-worker tests and runtime entrypoints still compile. No claims about restart correctness of all end-to-end gameplay until a separate multi-process fault trial.

See SOURCE-MAP.md · EXECUTION.md · TASKS.md · PROOF.md.
