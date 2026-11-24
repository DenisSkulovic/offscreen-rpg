# INF23 dispatch

PLANNER-BLOCKED; do not dispatch.

- T01: Blocked: local migration state evidence. Read tools/dev-environments/src/domain/dev-worktree-registry.mjs::readRegistryV2/convertRegistryV1ToV2/cutoverAuthorizedLiveRegistry; tools/dev-environments/src/domain/dev-environment-session.mjs::adoptLegacyEnvironmentSession/resolveDevEnvironmentSelection; tools/dev-environments/src/domain/dev-worktree-allocator.mjs; tools/dev-environments/src/cli/dev-tilt.mjs. Exact implementation and proof in [EXECUTION](EXECUTION.md#t01-blocked-local-migration-state-evidence).
