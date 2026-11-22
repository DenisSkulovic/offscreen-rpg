# DXK09 | Planner source map
Baseline: `undertaking/storyteller-workshop@62c930a2050afcc4376130fed4120828b1f70624`. Inspected connected GitHub contents, no live workstation or cluster access. DXK08's hot-update acceptance is reported but not independently rerun here.

| Current owner | Symbol / state | DXK09 change boundary |
| --- | --- | --- |
| `scripts/repo-tools/dev-tilt.mjs` | `REPO_ROOT`, `GAME_PORT`, `TILT_PORT`, `PID_FILE`, `LAB_RESOURCES`, `DEPLOYMENT_NAMESPACE`, `runDevTiltCli` | Create explicit slot-aware launcher and process identity. Do not silently alter existing single-stack command until compatibility proof. |
| root `Tiltfile` | `allow_k8s_contexts('kind-offscreen-lab')`, includes dev Tilt graph | Add dedicated dev-cluster entrypoint; preserve release graph and existing command behavior. |
| `infra/kubernetes/lab/dev/Tiltfile` | `custom_build`, `dev_live_update`, `sync_dirs_by_image`, 4 image builders, six k8s resources | Parameterize stack namespace, image identity, context, port forwards; retain live-update closure/fallback. |
| `infra/kubernetes/lab/dev/{web,api,authority,workers}.yaml` | fixed namespaces, Service DNS, secrets, DB URL, bucket, Temporal namespace and queues | Generate six workloads into one slot namespace, rewrite only typed configured fields; never blind string replace secrets or arbitrary YAML. |
| `infra/kubernetes/lab/dev/dev-sync-paths.mjs` | `resolveDevSync`, `tiltDevSyncConfig` source graph | Reuse dependency ownership, no second hardcoded graph. |
| `infra/kubernetes/lab/dev/tilt/load-dev-image.sh` | `kind load` uses offscreen-lab and two hardcoded node names | Explicitly accepted dev cluster/node selection and serialized kind loads; reject target mismatches. |
| `scripts/repo-tools/stack-preflight.mjs` | `CONTEXT_NAME`, `runStackPreflight` release-lab pins | New dev-specific probe; don't broaden the release guard. |
| `scripts/repo-tools/stack-lifecycle.mjs` | `buildStackPlan` owns fixed release namespaces and reset semantics | New dev-slot lifecycle, not reuse destructive release commands. |
| `infra/kubernetes/lab/app-release/install.sh` | sources release cluster and secrets; creates three fixed application namespaces | **Read-only reference** for credential keys. Must not run in dev cluster unchanged. |
| `infra/kubernetes/lab/cnpg/install.sh`, `infra/kubernetes/lab/temporal/install.sh` | install pinned shared backends, hardcode release cluster via `lib.sh` | Existing templates are provenance, not reusable mutating actions until dev provisioning strategy is closed. |
| `apps/api/src/modules/auth/{config.ts,auth.ts}` | `readAuthConfig` requires APP_ORIGIN, GITHUB_CLIENT_ID/SECRET, BETTER_AUTH_SECRET; Better Auth base URL and trustedOrigin exact | Per-slot origin must be deliberate, with callback registration; no authentication bypass. |
| `docs/runbooks/{local-development,kubernetes-developer-ui}.md` | current single-stack start and URLs | Add separate dev slots with explicit warnings and release separation. |
| `scripts/repo-tools/dev-tilt.test.mjs` | tests single-stack preflight and fixed port refusal | Preserve original behavior; new slot tests independent. |

## Collision classes and mandatory fences
1. **Control plane:** dedicated dev context and cluster, never `kubectl` ambient context or release resource deletion.
2. **Kubernetes:** namespace and exact stack label, owner path and slot; no cluster-scope app resources.
3. **Process:** isolated Tilt PID/lock and loopback ports; never kill another runner.
4. **Image:** slot-specific tags, and source-sync scoped to its canonical worktree path.
5. **PostgreSQL:** unique database and login, including Better Auth tables, migrations, sessions, stories and outbox.
6. **Object store:** unique bucket with stack-scoped write credentials, no shared writable bucket.
7. **Temporal:** unique namespace and task queues; no worker polls another slot.
8. **Auth:** distinct app origin/signing identity, each GitHub callback configured explicitly or browser capability marked unavailable.
9. **Cleanup:** stop preserves tenants; destroy must check exact owned identity and explicit confirmation.

## Unverified planner seams (do not transfer as broad Cursor research)
- Existing CNPG grant/CREATE DATABASE job template, and ability to create a least-privilege per-slot SQL login without touching release SQL.
- Exact object store bucket/credential provisioning mechanism and enforced bucket-only permission.
- Exact Temporal namespace registration/provisioning and lifecycle of per-stack Workflow IDs.
- OAuth provider callback configuration for 2+ concurrent local origins on this user's GitHub configuration.
- Actual spare RAM for multiple worker watchers on Windows/WSL.

These must be source-verified and settled by ChatGPT before the corresponding implementation tasks become READY. No live tests were executed.
