# INF23 route

- T01 Kernel-backed registry lock — tools/dev-environments/src/domain/dev-worktree-registry.mjs::withRegistryLock; tools/dev-environments/test/dev-worktree-registry-v2.test.mjs; tools/dev-environments/test/dev-worktree-allocator.test.mjs. Exact edits and negative proof in EXECUTION.md section T01.
- T02 Atomic session publication — tools/dev-environments/src/domain/dev-environment-session.mjs::writeEnvironmentSession/readEnvironmentSession; tools/dev-environments/src/cli/dev-tilt.mjs::writeDevSession; tools/dev-environments/test/dev-environment-session.test.mjs. Exact edits and negative proof in EXECUTION.md section T02.

Sequential tasks; dependency INF22 Done.
