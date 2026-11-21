# OPS12 | bounded Cursor parent and child packets

**Prerequisite:** MA10/WR09A/MA11 integrated, latest undertaking HEAD inspected; branch change/ops12-distributed-worker-lifecycle, linked worktree and repo:change-branch guard. Can execute alongside WR09B and DX12; no overlapping owned paths. One parent owns archive/integration under designated custodian, not individual child.

**T01 | close-once and execution startup.** First reads runtime/{execution,connections}.ts, test/close-worker-connections.test.ts, bootstrap/config.ts (read-only). Writes runtime/execution.ts and new internal lifecycle helper or connections.ts plus new worker lifecycle test. Reuse Temporal Worker.create inputs. Positive fake Worker.create/run successful stop closes once; negative create rejection closes native, run rejection + stop also closes once; no executor workflowsPath/database. STOP unexpected Temporal SDK signature contradiction.

**T02 | control and combined stack rollback.** Reads runtime/{control,storyteller-distributed-live,execution}.ts, bootstrap/control-main.ts (read-only). Writes runtime/control.ts, storyteller-distributed-live.ts and own test. Positive all roles start/stop, reverse order; negatives control/executor start fail cleanup prior roles, a stop failure still permits other stops, 2 failures aggregate. Preserve original startup error. STOP a required GA/Temporal RPC would be introduced by pure cleanup.

**T03 | independent proof.** Reads test/{storyteller-worker-split,close-worker-connections,distributed-runtime-lifecycle}.test.ts and src/runtime paths. Runs focused worker build/typecheck and Node tests via actual package script, git diff --check and changed quality. Negative strict no DB SQL in executor, no duplicate close/shutdown, no lost cleanup after startup failure. Record test counts, branch SHA, contract exceptions. Do not mutate shared lockfile/undertaking/program. Hand tested branch SHA to custodial integrator; no own concurrent merge into undertaking.

**Stop criteria:** lifecycle cleanup would change Temporal workflow identity/retry, authorization, publisher, or provider charge. Those remain out of scope.
