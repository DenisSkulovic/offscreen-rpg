# INF54 proof

## Source (recorded)

From repository root on branch `change/inf54-postgres-owned-clusters`:

```bash
node --test infra/platform/postgres/tests/*.test.mjs
```

**Result: PASS** (59 tests, Helm available in worktree). Coverage includes owned render/plan/status/ensure, separate endpoints, kubectl `create` targets, refusal of baseline+owner and wrong context, and no implicit delete.

## Live

**NOT-RUN** — no Cursor-authorized cluster mutation. Owner experiment (when separately approved): choose fresh `RUN_ID`, `plan`/`ensure` two independent non-baseline cluster names at `instances=2` under the same owner in release or dev with sufficient capacity; verify distinct Cluster UIDs, independent PVCs, RW/RO endpoints, isolated write markers, and no cross-cluster data. Do not point shared `dev-pg` tenants or default application configuration at experiment endpoints. Cleanup only through an explicit owned verification lifecycle; document retained resources if no cleanup adapter exists yet. This is not HA, backup, failover, or production acceptance.

## Verification alignment (T03)

Canonical owners updated: [verification-programmes.md](../../../../../../docs/technical/platform/verification-programmes.md) (future CNPG adapter consumes INF54 shared builder; dev slots stay on `dev-pg`; VER02 Docker contract preserved), [kubernetes-postgres.md](../../../../../../docs/runbooks/kubernetes-postgres.md) (owned cluster CLI examples), [VER02 CHANGE](../../../../open/2026-11-25--ver02-owned-postgres-verification-resource/CHANGE.md) (alignment note only).
