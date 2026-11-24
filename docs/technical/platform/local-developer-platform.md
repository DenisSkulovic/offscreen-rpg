# Local developer platform | selected direction and capability contract

Owner direction 2026-11-24. Reviewed integration baseline `91bc2af40a94cdf9a95ee7db31a846d60f3abd0c` (INF36). Target design, NOT a claim that all capabilities are implemented. Current operational commands are in [developer platform runbook](../../runbooks/local-development-platform.md); repeatable acceptance belongs to [capability catalog](../../../infra/verification/CAPABILITIES.md). Existing [environment identity and lifecycle contract](developer-environments.md) remains authoritative for ownership and data preservation.

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

Cluster IDs remain offscreen-dev and offscreen-lab. The release environment is local production-style acceptance, not actual production. Platform ensure is additive: omission never deletes services; app profile selection is explicit desired active roles for that one owned slot or release environment. Stop preserves tenants. Destructive cluster or tenant operations remain separate. Do not introduce arbitrary cluster names or automatic data cleanup in this milestone.

## Developer commands (target, not present yet)

- `pnpm infra:up --env dev --services none|core|all|postgres,redis` (release also supported); cluster create/reuse then explicitly selected platform ensures. `infra:status --env dev|release` read-only. A plan path must expose exact selected operations without mutation.
- `pnpm dev --profile api|web|full`, `pnpm dev:new --profile ...`, existing `--instance` selection, reserve/attach/status/stop. Default dev remains full. Change profile by explicit stop then start, not in-place hot profile transitions for first slice. No automatic provision of unselected tenant dependencies.
- `pnpm stack:up --profile api|web|full --values PATH` uses release build/install authority, with ordinary values overlays, no Tilt release graph. Preserve existing no-arg behavior until new path accepted. Explicitly select release experiment; no default extra replicas.
- `pnpm infra:verify --suite source|smoke|full` target unified repeatable entry. Source suite no mutation. Live suites require explicit scoped authorization and availability; full means all selected catalog cases, blocked cases report BLOCKED/NOT-RUN, never pass by omission. No production credentials or provider spend.

Use normal Helm values files for resource/replica overrides; reserve chart identity, Secret references, selectors and bindings to actual owners. Target per-role replica override with existing scalar default, no autoscaler. Small preset measured on workstation; do not promise capacity or lower existing admission thresholds before measurement.

## Initial application profiles (selected target; dependency proof required)

| Profile | Active roles | Backing requirements | Readiness boundary |
| --- | --- | --- | --- |
| api | api, authority | local SQL + S3; verify no Temporal boot dependency | API/auth/read debugging; not story advancement |
| web | web, api, authority | same as api | browser/SSR/auth/read; not story advancement |
| full | web, api, authority, control, executor, relay | SQL + S3 + Temporal; release gateway for browser route | all roles current, story progression separate |
| ui-only (later) | web | explicit compatible mock or test API binding | UI only; no borrowed slot or real playability |

Current dev graph and Tilt still render all six roles; reconcileDevSlot verifies shared core and provisions SQL/migration/S3/Temporal unconditionally; release installer uses image-family selection, not dependency-closed application profiles. Exact current source anchors: tools/dev-environments/src/rendering/dev-slot-app-graph.mjs::renderDevSlotAppGraph/renderTiltDeploymentDocuments, application/dev-slot-startup.mjs::reconcileDevSlot, application/dev-lifecycle.mjs::runDevTiltLaunch, application/dev-status.mjs::collectSelectedSlotReadiness, root Tiltfile, infra/workloads/render.mjs, infra/workloads/chart/templates/_helpers.tpl, infra/environments/release/install.sh and rollout.mjs. Prior DXK10-B design is predecessor input, not a competing implementation.

One profile selection must feed desired chart replicas, Tilt image/resource registration, provisioning, status and rollback. Inactive roles zero, reported INACTIVE not READY; selected roles current and healthy. Existing slot identity, park semantics, no foreign fallbacks remain. Minimal profile must be proven through intended functional flow, not just Pod readiness.

## External data and portability

Prefer a sanitized snapshot restored into a disposable local database for production-like experiments. An external staging database may be bound only through explicitly selected isolated test credentials/database and a compatible schema; local migration runner, tenant provisioning, background workers and writes must not automatically target arbitrary remote databases. Production direct connection is read-only diagnostic tooling, not normal application activation; application write paths/migrations/relay workers cannot use production credentials. External credentials local ignored files or existing Secret, not tracked values or logs. External S3/Temporal bindings later only if workflow isolation is explicit. No arbitrary network tunnel manager.

Current implementation is Linux/WSL-specific: /proc memory/process identity, kernel flock and shell tooling. Native macOS is a target, not supported today; before claiming it, provide native host adapters or explicitly supported Linux execution environment, confirm Docker/Kind/Tilt ARM64 compatibility and run same capability catalog. Keep host compatibility thin; no general OS abstraction framework.

## Finish line

Permanent catalog remains beside infrastructure. Use case failures drive targeted fixes; no repeated hypothetical security audit. Source Done and historical runtime evidence do not substitute for live evidence at a current revision. Record startup/cache/sync timing, actual active roles, selected config and park results. Four simultaneous full stacks remain capacity experiment, not required for three agents doing source work.
