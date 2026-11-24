# INF23 execution

## T01 Kernel-backed registry lock

tools/dev-environments/src/domain/dev-worktree-registry.mjs::withRegistryLock; tools/dev-environments/test/dev-worktree-registry-v2.test.mjs; tools/dev-environments/test/dev-worktree-allocator.test.mjs

Replace age-based unlink lock with persistent file owners.lock.flock, open a+; acquire Linux flock exclusive via spawnSync('flock',['-w',seconds,'3'],{stdio:['ignore','ignore','pipe',fd],timeout:lockTimeoutMs+1000}); child and parent share inherited open file description, lock retained by parent fd until finally close. Require flock available; no unlink lock file, no busy loop, no stale age policy. Preserve callback synchronous return/error, never catch EEXIST from callback as lock contention. Legacy owners.lock must be absent before switching (old lock present refuse with diagnostic, do not delete); old checkout running old CLI concurrently unsupported, document all dev CLI worktrees must update before using new scheme. Add real subprocess lock contention test (separate Node process holds fd, second lock refuses then succeeds after termination); use disposable registry only. Existing injected lock timing tests update to bounded kernel lock behavior. No live migration.

## T02 Atomic session publication

tools/dev-environments/src/domain/dev-environment-session.mjs::writeEnvironmentSession/readEnvironmentSession; tools/dev-environments/src/cli/dev-tilt.mjs::writeDevSession; tools/dev-environments/test/dev-environment-session.test.mjs

Shared atomic JSON writer in domain/dev-session-json.mjs: mkdir parent, same-dir unique temp via mkdtemp or open wx randomUUID, mode0600, write then rename, cleanup own temp on error; validate slot key through existing environmentSessionPath, preserve existing session fields/format. Legacy writer uses same helper until retirement. Test replacing existing file, injected write/rename failure preserves prior valid file, concurrent readers see complete JSON. Do not change registry v1 migration or session adoption; retire later only after workstation evidence.
