# Local developer platform | selected direction and capability contract

**Persistent workstation evidence:** [workstation observability](workstation-observability.md) owns resource history and measurement semantics independently of application lifecycle. INF44–47 source-only; no installed-monitor claim.

Owner direction 2026-11-24. Reviewed integration baseline `91bc2af40a94cdf9a95ee7db31a846d60f3abd0c` (INF36). Target design, NOT a claim that all capabilities are implemented. Current operational commands are in [developer platform runbook](../../runbooks/local-development-platform.md); repeatable acceptance belongs to [capability catalog](../../../infra/verification/CAPABILITIES.md). Existing [environment identity and lifecycle contract](developer-environments.md) remains authoritative for ownership and data preservation.

**Operator presentation and inspection:** [infrastructure operator experience](infrastructure-operator-experience.md) defines shared CLI output, progress, diagnostics and migration standards; implementation is incremental.

## Goal and non-goals

A developer with limited DevOps knowledge or a cheap coding agent can run a cluster, selected backing services, an application profile, or a realistic multi-replica release experiment using a few predictable commands. Standard Kind, Helm, Tilt and Kubernetes do the actual work. Reuse existing installers, chart, image factory, and slot manager. No second controller, scheduler, configuration language, daemon, Terraform, GitOps or enterprise hardening program. Optimize actual daily feedback time and reliable behavior.

## Composition axes

| Axis | Target choices | Owner |
| --- | --- | --- |
| Cluster | dev, release; cluster-only | Kind manager, existing identities |
| Platform | none, core, explicit comma-separated services, all | platform-plan and service installers |
| Application | none, api, web, full, later ui-only | existing slot lifecycle / release installer |
| Resources | default, measured small preset, ordinary Helm values overrides | existing chart/profiles |
| Data | local retained, imported sanitized snapshot, isolated external staging test binding, production read-only diagnostic | explicit connection configuration and existing tenant authorities |
| Parallelism | independent dev-N slots; release replicas by role | existing slot registry and Kubernetes Deployments |

Cluster IDs remain offscreen-dev and offscreen-release. The release environment is local production-style acceptance, not actual production. Platform ensure is additive: omission never deletes services; app profile selection is explicit desired active roles for that one owned slot or release environment. Stop preserves tenants. Destructive cluster or tenant operations remain separate. Do not introduce arbitrary cluster names or automatic data cleanup in this milestone.

## Developer commands (target, not present yet)

The heading is a legacy anchor. It covers two kinds of command, kept apart below: source-present commands that already run, and target-only subcapabilities that no parser or installer accepts yet. Source presence means the entry point exists and parses at reviewed source; it is not live qualification, and the [developer platform runbook](../../runbooks/local-development-platform.md) is the only current quick reference.

### Source-present at the reviewed baseline

- `pnpm infra:plan|up|status --env dev|release --services none|core|all|postgres,redis` (`infra/environments/infra-cli.mjs`): cluster create/reuse, then explicitly selected platform ensures. `infra:status` is read-only. A plan path exposes exact selected operations without mutation. Default stdout for plan/up/status remains JSON; explicit `--human` selects plain presentation (INF56 source); the default switch awaits mapped consumers.
- `pnpm dev`, `dev:new`, `dev:reserve`, `dev:attach --instance dev-N`, `dev:status`, `dev:stop` (`tools/dev-environments`): all roles, one owned slot. `parseDevCliArgs` accepts only `--instance` and the named commands and refuses every other option, including `--profile`.
- `pnpm stack:up` (and `stack:status`, `stack:down`): the existing release build/install authority. `infra/environments/release/install.sh` refuses any argument and selects image families through `OFFSCREEN_RELEASE_IMAGES`; it takes no profile and no `--values`.
- `pnpm infra:verify --suite source|diagnostic`: source and diagnostic are accepted; `smoke` and `full` are in `NOT_IMPLEMENTED_SUITES` of `infra/verification/verify.mjs` and are refused at the reviewed source.
- `pnpm infra:render:workloads --values PATH` renders release manifests with a Helm values overlay. That is manifest rendering, not release installation support.

### Target-only subcapabilities (not accepted by any current command)

- `pnpm dev --profile api|web|full`, `pnpm dev:new --profile ...`, existing `--instance` selection with reserve/attach/status/stop. Default dev remains full. Change profile by explicit stop then start, not in-place hot profile transitions for the first slice. No automatic provision of unselected tenant dependencies.
- `pnpm stack:up --profile api|web|full --values PATH`: use release build/install authority with ordinary values overlays and no Tilt release graph. Preserve existing no-arg behavior until the new path is accepted. Explicitly select a release experiment; no default extra replicas.
- `pnpm infra:verify --suite smoke|full` as the unified repeatable entry. Source suite does no mutation. Live suites require explicit scoped authorization and availability; full means all selected catalog cases, and blocked cases report BLOCKED/NOT-RUN, never pass by omission. No production credentials or provider spend.
- A future `dev:release` is described under [Future idle reservation retirement](#future-idle-reservation-retirement); no `dev:release` alias exists.

If a later owner has implemented any target above, return the exact source to the planner; do not read this page's target wording as current without that check.

Use normal Helm values files for resource/replica overrides; reserve chart identity, Secret references, selectors and bindings to actual owners. Target per-role replica override with existing scalar default, no autoscaler. Small preset measured on workstation; do not promise capacity or lower existing admission thresholds before measurement.

## Initial application profiles (selected target; dependency proof required)

| Profile | Active roles | Backing requirements | Readiness boundary |
| --- | --- | --- | --- |
| api | api, authority | local SQL + S3; verify no Temporal boot dependency | API/auth/read debugging; not story advancement |
| web | web, api, authority | same as api | browser/SSR/auth/read; not story advancement |
| full | web, api, authority, control, executor, relay | SQL + S3 + Temporal; release gateway for browser route | all roles current, story progression separate |
| ui-only (later) | web | explicit compatible mock or test API binding | UI only; no borrowed slot or real playability |

As of the reviewed source (dated realization; re-verify before relying on it), the dev graph and Tilt still render all six roles; reconcileDevSlot verifies shared core and provisions SQL/migration/S3/Temporal unconditionally; release installer uses image-family selection, not dependency-closed application profiles. Exact current source anchors: tools/dev-environments/src/rendering/dev-slot-app-graph.mjs::renderDevSlotAppGraph/renderTiltDeploymentDocuments, application/dev-slot-startup.mjs::reconcileDevSlot, application/dev-lifecycle.mjs::runDevTiltLaunch, application/dev-status.mjs::collectSelectedSlotReadiness, root Tiltfile, infra/workloads/render.mjs, infra/workloads/chart/templates/_helpers.tpl, infra/environments/release/install.sh and rollout.mjs. Original DXK10 proposal is cancelled; its selective activation contract is absorbed into INF38.

One profile selection must feed desired chart replicas, Tilt image/resource registration, provisioning, status and rollback. Inactive roles zero, reported INACTIVE not READY; selected roles current and healthy. Existing slot identity, park semantics, no foreign fallbacks remain. Minimal profile must be proven through intended functional flow, not just Pod readiness.

## Future idle reservation retirement

Retain the useful original DXK10-C capability without a separate duplicate backlog packet. A future explicit `pnpm dev:release --instance dev-N` should release only an idle owned reservation and its port allocation after verified stopped processes/workloads and no active lease. Preserve SQL/S3/Temporal data and identity; never recycle environment IDs, reassign retained tenant credentials, implicitly delete data or release on Change/chat completion. Reservation, attachment, provisioning, activation and parking remain distinct. Decide registry tombstone and any explicit reattachment semantics before implementation. This capability is target-only, not commissioned; ordinary dev:stop remains the current non-destructive operation.

## External data and portability

Prefer a sanitized snapshot restored into a disposable local database for production-like experiments. An external staging database may be bound only through explicitly selected isolated test credentials/database and a compatible schema; local migration runner, tenant provisioning, background workers and writes must not automatically target arbitrary remote databases. Production direct connection is read-only diagnostic tooling, not normal application activation; application write paths/migrations/relay workers cannot use production credentials. External credentials local ignored files or existing Secret, not tracked values or logs. External S3/Temporal bindings later only if workflow isolation is explicit. No arbitrary network tunnel manager.

Current implementation is Linux/WSL-specific: /proc memory/process identity, kernel flock and shell tooling. Native macOS is a target, not supported today; before claiming it, provide native host adapters or explicitly supported Linux execution environment, confirm Docker/Kind/Tilt ARM64 compatibility and run same capability catalog. Keep host compatibility thin; no general OS abstraction framework.

## Finish line

Permanent catalog remains beside infrastructure. Use case failures drive targeted fixes; no repeated hypothetical security audit. Source Done and historical runtime evidence do not substitute for live evidence at a current revision. Record startup/cache/sync timing, actual active roles, selected config and park results. Four simultaneous full stacks remain capacity experiment, not required for three agents doing source work.
