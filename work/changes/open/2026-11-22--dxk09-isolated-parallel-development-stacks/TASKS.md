# DXK09 | Cheap bounded Composer task route
Baseline: `undertaking/storyteller-workshop@62c930a2050afcc4376130fed4120828b1f70624`. Parent must recheck source, worktrees, and permissions. **Overall PLANNER-HOLD**, not executable until the named source contract blockers in CHANGE/SOURCE-MAP are closed. T01 is implementation-shaped but must not be dispatched while the Change itself is unready.

Parent: create linked worktree `change/dxk09-isolated-parallel-dev-stacks` from actual undertaking HEAD. Single integration owner; no parallel shared manifest writes. MODEL=Composer Standard. No paid provider, no release-lab modification, no destructive data work.

## T01 | Slot identity and lease pure module | source mapped
May write: `scripts/repo-tools/dev-stack-identity.mjs`, `scripts/repo-tools/dev-stack-identity.test.mjs`.
Read: `scripts/repo-tools/dev-tilt.mjs` (PID_FILE / port check), `scripts/repo-tools/dev-tilt.test.mjs`, `EXECUTION.md#identity-and-tenancy`.
Implement: explicit s01..s04 slot validator; canonical worktree identity; deterministic namespace/db/bucket/Temporal/port set; atomic lock/lease, reject foreign live holder; dead lease reclaim only after owner/resource reconciliation. No kubectl mutation in this module.
Positive: `node --test scripts/repo-tools/dev-stack-identity.test.mjs` validates stable mapping + same-owner restart.
Negative: foreign active owner and occupied port refuse without replacing lease.
Stop: platform process identity cannot be validated safely; report exact symbol/reproducer.
Receipt: module exports, tests, lease file scope, no shell effects.

## T02 | Dev-only cluster guard | planner gate on bootstrap template
May write: `scripts/repo-tools/dev-stack-preflight.mjs`, `scripts/repo-tools/dev-stack-preflight.test.mjs`; any new dev-only kind manifest explicitly owned by DXK09.
Read: `scripts/repo-tools/stack-preflight.mjs` (`runStackPreflight`), `infra/kubernetes/lab/lib.sh`, `infra/kubernetes/lab/kind.yaml`, `EXECUTION.md#cluster`.
Implement: exact pinned dev context, distinct API port and cluster name, no ambient kubectl context mutation; resource ownership and RAM/port guards.
Positive: injected dev-cluster probes permit dev-only plan with sufficient resources.
Negative: release/foreign context yields zero commands and no release mutation.
Stop: operator cannot confirm isolated cluster ownership or port.

## T03 | Stateful per-slot tenant provisioner | PLANNER BLOCKER
May write: dev-only provisioner, per-slot manifest/Secret builder and tests under `infra/kubernetes/lab/dev/stacks/`, no edits to release installers.
Read: `infra/kubernetes/lab/cnpg/install.sh`, `infra/kubernetes/lab/temporal/install.sh`, `infra/kubernetes/lab/app-release/install.sh`, `SOURCE-MAP.md`.
Algorithm fixed at architecture level: distinct SQL database/login, S3 bucket/permission, Temporal namespace, slots and secrets. **Do not dispatch** until planner records exact dev-cluster installer and tenant API commands, typed configs and rollback/retry identity.
Positive: two slots can independently migrate/write against own tenants.
Negative: A credential denied on B SQL and S3; Temporal cannot poll cross namespace.
Stop: missing safe provider-specific privilege/provision API.

## T04 | One namespace, six real dev workloads | after T03, planner source gate
May write: new generated/statically parameterized templates in `infra/kubernetes/lab/dev/stacks/` and focused tests. Do not mutate release overlay.
Read: `infra/kubernetes/lab/dev/{web,api,authority,workers}.yaml`, `apps/api/src/modules/auth/config.ts`, `EXECUTION.md#provision-and-boot`.
Implement: same `game-*` Service/Deployment names all in namespace `offscreen-dev-sXX`, env from slot config and namespace-local Secrets; no release DNS/DB/bucket/Temporal defaults; exact labels and APP_ORIGIN.
Positive: A/B render to nonoverlapping namespaces, internal service DNS points within each.
Negative: missing auth/OAuth callback material blocks authenticated READY; wrong tenant secret rejected.
Stop: legacy hardcoded namespace/resource remains in rendered app YAML.

## T05 | Slot-aware Tilt launcher and image load | after T01-T04
May write: new dev-slot Tilt entry/import, `scripts/repo-tools/dev-stack.mjs`, dev image loader and tests; preserve root release target and single-stack command.
Read: `Tiltfile`, `infra/kubernetes/lab/dev/Tiltfile`, `infra/kubernetes/lab/dev/dev-sync-paths.mjs`, `infra/kubernetes/lab/dev/tilt/load-dev-image.sh`, `scripts/repo-tools/dev-tilt.mjs`.
Implement: one worktree path per Tilt process, slot tags, slot port forwards, separate PID and Tilt state, dev-cluster-only serialized image loads; keep DXK08 affected sync/fallback.
Positive: A API edit auto-syncs to A API, no rebuild or B restart.
Negative: unsafe package manifest in A rebuilds A and never B.
Stop: Tilt still watches shared worktree roots or emits release-cluster target.

## T06 | Two-stack proof, docs, closure | after T05
May write: `docs/runbooks/local-development.md`, `docs/runbooks/kubernetes-developer-ui.md`, test and evidence receipt, CHANGE archive reconciliation.
Read: `PROOF.md`, `scripts/repo-tools/dev-stack.mjs`, `work/changes/README.md`, `work/undertakings/storyteller-workshop/OVERVIEW.md`.
Run only explicitly authorized dev-cluster provisioning and owner-approved disposable proof. Demonstrate two live stacks, SQL/S3/Temporal segregation, identity and negative failures, isolated Tilt update, stop A preserving B, release lab unchanged. Focused checks before full proof; don't rerun paid models or destructive chaos.
Negative: cross-slot stop/lease rejection.
Stop: any cross-tenant write or release-lab mutation. Return exact evidence to ChatGPT.
Receipt: source SHA, test outcomes and NOT RUN, owned tenant IDs, archive/integration commit.
