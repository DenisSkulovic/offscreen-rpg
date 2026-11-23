# DXK10-A | inspected source and ownership map

**Baseline:** `undertaking/storyteller-workshop@fb5bf588`. These exact symbols were read via connected GitHub; check live branch and any local unpublished changes before executing.

| File / exact owner | Present behavior | DXK10-A edit |
| --- | --- | --- |
| `scripts/repo-tools/dev-worktree-registry.mjs::validateRegistryV2`, `assertOwnerIdentity`, `lookupDefaultEnvironment` | `environmentsById` + `defaultEnvironmentByCheckout`; every owner `worktreePath` must be absolute | Add nullable unbound validation; enforce only attached records may be default, forbid resource/lease on unbound |
| `scripts/repo-tools/dev-worktree-registry.mjs::withRegistryLock`, `writeRegistry` | Exclusive machine-local lock; atomic file rename; returns after synchronous mutation | Reuse lock; do not introduce a Git-tracked lease table or second registry |
| `scripts/repo-tools/dev-worktree-allocator.mjs::allocateIndependentEnvironment` | Under lock, increments `nextSequence`, allocates disjoint ports, assigns canonical `worktreePath` and optionally checkout default | Extract/reuse *same* validated slot/port allocation for unbound reserve; preserve existing allocate semantics |
| `scripts/repo-tools/dev-environment-session.mjs::parseDevCliArgs`, `resolveDevEnvironmentSelection` | Only `up/status/stop/new`; `new` maps to `up`, `--instance` from a different idle checkout can select/rebind implicitly | Add reserve/attach command handling without hitting launch; deny implicit foreign rebind for ordinary commands |
| `scripts/repo-tools/dev-environment-session.mjs::readEnvironmentSession`, `parkSelectedEnvironment` | Per-slot ignored session; park verifies own process and all six desired replicas zero | Read-only safety guard for attach; do not modify existing park mechanics |
| `scripts/repo-tools/dev-tilt.mjs` CLI dispatch around `invokedAsScript` | v2 selection then launch/status/park; bare up can allocate default | Separate `reserve`/`attach` dispatch before any `runDevTiltLaunch`, preflight or reconciliation |
| Root `package.json` scripts | `dev`, `dev:new`, `dev:status`, `dev:stop` | Add `dev:reserve` and `dev:attach` only, preserving originals |

## Exact invariants

- The registry owner record currently has `slotId, worktreePath, cluster, namespace, ports, processIdentity, resourceUids, lease`; no separate neutral attachment type.
- `assertOwnerIdentity` currently rejects nonabsolute `worktreePath`; `validateRegistryV2` cross-checks defaults to a matching checkout and reserves all recorded ports. An unbound record must never be allowed into the default map.
- `resolveDevEnvironmentSelection` uses `reservationIsLive`, which treats a dead PID as no longer live. **This is not enough authority to transfer attached source/tenant identity.** Do not reuse its permissive rebind test for new attach.
- `runDevTiltLaunch` begins with preflight then `reconcileOwnedDevSlot`; `reconcileDevSlot` provisions SQL, migrations, S3, Temporal, image and workloads. DXK10-A must return before this side-effect path.
- `renderDevSlotAppGraph::deployment` defaults `replicas:1` for six application roles. **Out of scope**; DXK10-B.
- Existing session may be recorded as parked even if old process data remain. Treat contradictory session, occupied ports or observable cluster ownership as refusal, not automatic cleanup.

## Focused existing tests to consult

`scripts/repo-tools/dev-v2-cli-startup.test.mjs`, `scripts/repo-tools/dev-tilt.test.mjs`, `scripts/repo-tools/dev-worktree-registry.test.mjs` / allocator tests where present (verify names), `infra/kubernetes/lab/dev/backing/dev-slot-app-graph` tests. Do a one-time exact filename search on current branch rather than a broad architectural reconnaissance.

## Safety boundary for later stages

No claim that this Change transfers an existing `dev-9` runtime between Cursors. DXK10-B chooses profiles and reconciles roles; DXK10-C handles explicit reattachment/release only with retained-tenant identity protection and fenced active-session validation. Existing recorded slot IDs remain allocated in the registry; never reset `nextSequence` from this Change.