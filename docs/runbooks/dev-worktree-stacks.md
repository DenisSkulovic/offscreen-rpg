# Development environments | safe startup, status and parking

**Owns:** executable dev-slot commands, operational safety and failure diagnosis. **For a two-minute diagram**, read [developer environments explained](../architecture/10-developer-environments.md); **for technical guarantees**, read [developer environment contract](../technical/platform/developer-environments.md). Evidence lives in [DXK09 PROOF](../../work/changes/open/2026-11-22--dxk09-isolated-parallel-development-stacks/PROOF.md), not in this runbook.

**Current checkpoint: 2026-11-23.** `pnpm dev`, `dev:new`, `dev:status` and `dev:stop` are present in source. Tilt is the sole active Deployment image writer. One owned slot passed current-generation acceptance: six READY roles, Web and API live sync, a TypeScript error then recovery, one relay workflow task, and a park that kept tenant UIDs. One brand-new worktree has now passed ordinary `pnpm dev` / `dev:status` / `dev:stop` on `dev-9` at `e3fa10b7`: six READY roles, Web and API HTTP 200, and a park that left foreign slots unchanged. Four simultaneous stacks, browser OAuth, release-lab acceptance, and a completed story remain unproven. `game-control` can still log `RangeError: Invalid atomic access index` while Kubernetes reports it ready.

**INF30 source-only lifecycle (2026-11-24):** Slot operation locks, unified park/cleanup, and bounded operator output (`slot`, `phase`, `next` once per refusal or status) are integrated in source with focused unit tests only. Historical live DXK09 acceptance claims in this runbook and in [PROOF](../../work/changes/open/2026-11-22--dxk09-isolated-parallel-development-stacks/PROOF.md) are unchanged; this note is not new live acceptance.

**Read only what you need:** [commands](#what-works-on-the-integrated-branch) · [safe admission](#resource-etiquette-and-failed-admission-effective-immediately) · [what belongs to which cluster](#actual-targets-not-interchangeable) · [ownership/leases](#local-ownership-and-lease-model) · [DXK10 remainder](#selected-next-ownership-contract-2026-11-23--not-yet-implemented).

## What works on the integrated branch

| Need | Existing command | Safe interpretation |
| --- | --- | --- |
| Inspect selected checkout's environment | `pnpm dev:status` | Read-only; status is not proof of fresh loaded code without live verification |
| Start full dev application | `pnpm dev` | Available but **not accepted as unattended reliable** on current DXK09; use only for authorized bounded platform proof |
| Select another existing environment | `pnpm dev:status --instance dev-N` | v2 selector exists in inspected source; actual ID and ownership must be verified |
| Allocate and start another full environment | `pnpm dev:new` | Still couples allocation and startup |
| Reserve an idle identity | `pnpm dev:reserve` | Registry and loopback ports only. Prints `RESERVED / UNATTACHED / UNPROVISIONED`. No checkout, Pods, tenants, or listeners |
| Attach this checkout to a fresh reservation | `pnpm dev:attach --instance dev-N` | Only a never-provisioned unattached record. Prints `ATTACHED / UNPROVISIONED`. Refuses a foreign checkout or any recorded lease, session, or resource UID |
| Park checkout's selected owned runtime | `pnpm dev:stop` | Stops/parks only selected owned workloads, retaining tenant data; check selector/ownership |
| Park a specifically owned environment | `pnpm dev:stop --instance dev-N` | Explicit ID; verify exact owner and namespace; never substitute foreign ID |
| No Kubernetes required | Package-specific unit/type checks | Preferred for source-only Changes; zero slot cost |

Commands must be run from the **intended worktree root**, using that branch's actual `package.json`. They can refuse on missing memory, wrong context, occupied ports, stale process identity or image mismatch. Do not bypass a refusal, assume a returned process exit means complete readiness, or use `kind-offscreen-lab` as a fallback.

**Not yet current commands:** `dev:up --profile web|api|full` and `dev:release` remain selected [DXK10-B/C targets](../../work/changes/archive/2026-11/platform-operations/2026-11-23--dxk10-demand-driven-dev-lifecycle/CHANGE.md). `dev:reserve` and `dev:attach` exist and stay registry-only; they do not start Pods. Do not treat an attached reservation as a running stack.

## Resource etiquette and failed admission (effective immediately)

Worktrees, Changes, environment identities and running application workloads are not interchangeable. Ordinary source/test work does **not** require a running stack. The current `pnpm dev` still launches the full stack. `pnpm dev:reserve` and `pnpm dev:attach` are registry-only. **Do not claim selective-profile activation exists.** Use the smallest currently proven test tier, and stop/park your own full stack promptly after its live proof. Before launch, read status, memory admission and other active owned sessions; never reduce safety gates, poll indefinitely or stop foreign/lab workloads to gain space. On a partially healthy/failed start, **park the whole attempted owned application runtime immediately** through `pnpm dev:stop` for the bound checkout or `pnpm dev:stop --instance dev-N` after verifying that exact ID belongs to you. Verify that no owned workload replicas, forwarders or Tilt sessions remain running. Preserve reservation, tenant secrets, SQL/S3/Temporal data and all foreign sessions. Report exact failure and resource measurements; retry only when admission/capacity improves or the diagnosed non-capacity defect is fixed. Do not pretend a successful memory preflight reserves RAM; actual memory may fall during startup. This is a fail-closed backoff policy, not an automatic cross-agent queue service.

**Still proposed:** [DXK10-B/C](../../work/changes/archive/2026-11/platform-operations/2026-11-23--dxk10-demand-driven-dev-lifecycle/CHANGE.md) would add dependency-closed profiles and guarded release. An attempted profile activation that cannot reach the requested healthy set must roll back its own activated roles while preserving owned persistent tenants. Do not invent those commands.

## Agent's ordinary route

For a commissioned Change, first follow [AGENTS.md](../../AGENTS.md), its `CHANGE.md`/`TASKS.md`, and the linked-worktree branch rules. Use the **worktree-root developer command** when T05 has passed live proof and the command reports that it targets `kind-offscreen-dev`; use the scripts' normal `status` and `stop` commands instead of manually choosing Pods, ports, credentials or namespaces. If the command is absent or reports NOT READY, treat that as a platform gate: report the exact stage; do not silently fall back to the release lab, Compose, a global Tilt process, hard-coded dev-1 or destructive recreation.

**Integrated implementation note:** the root CLI calls `tools/dev-environments/src/cli/dev-tilt.mjs`, backed by v2 environment records and slot-aware resources. Before per-slot SQL, S3, or Temporal mutations, `reconcileOwnedDevSlot` calls `verifySharedCoreReadiness` (read-only CNPG Ready, object-store bound/HTTP probe, Temporal schema and server readiness); a prerequisite failure stops with no tenant writes. Slot startup does not invoke `infra/environments/dev/platform.mjs` platform ensure — shared backing is verified, not reprovisioned, per activation. Explicit dev platform install remains `node infra/environments/dev/platform.mjs plan|ensure kind-offscreen-dev`. Image preparation returns a content-derived ref and does not patch Deployments. One owned slot and one brand-new worktree have passed current-generation readiness. That does not by itself authorize HR01–HR03 or four-stack capacity.

## Actual targets, not interchangeable

| Purpose | Target | Persistence and rule |
| --- | --- | --- |
| Worktree application runtime | `kind-offscreen-dev` with one `offscreen-dev-N` Kubernetes namespace per worktree | Reconcile only own namespace/Pod/image/port and tenant credentials |
| Shared dev PostgreSQL | `offscreen-dev-postgres` / CNPG `dev-pg`, database `dev_N` | One migration role and separate DML-only runtime role; preserve on stop |
| Shared dev S3 | `offscreen-dev-objects` / SeaweedFS, bucket `offscreen-dev-N` | Bucket-scoped user/Secret; admin key must never reach application Pods |
| Shared dev Temporal | `offscreen-dev-temporal` server, Temporal namespace `offscreen-dev-N` | Same queue names per namespace; trusted-local routing isolation, not an auth boundary |
| Release acceptance | **`kind-offscreen-lab`** | Separate purpose; do not direct dev Tilt, image loads or worktree tests here |
| Release lab app namespaces | `lab-edge`, `lab-authority`, `lab-workers` on **`kind-offscreen-lab`** | Release acceptance only; never use as a worktree dev slot or substitute for `pnpm dev` |

Always pass explicit Kubernetes context; the ambient context may remain `kind-offscreen-lab`. Headlamp/Tilt are inspection tools, not ownership authorities.

## Local ownership and lease model

The source for allocation/registration is `scripts/repo-tools/dev-worktree-{allocator,registry}.mjs`, with checkout binding and session handling in `dev-environment-session.mjs`. It canonically resolves the checkout path, assigns stable `dev-N` IDs, allocates a disjoint loopback port bundle, and writes a **machine-local** `owners.json` protected by a kernel `flock` on `owners.lock.flock` at the caller-supplied registry root. A leftover `owners.lock` from the previous age-based lock refuses the new CLI and is not deleted; every local dev CLI checkout must be updated before the new lock is used, and mixed old and new CLIs are unsupported. The schema includes worktree path, cluster, namespace, ports, process PID and Linux /proc start-time identity, resource UIDs and an optional process lease. Do not write these records, live resource inventories, credentials, or per-machine reservations to tracked Git files or `work/QUEUE.md`.

**Three distinct concepts:**
1. **Environment assignment:** a `dev-N` environment owns durable tenant identity; a checkout can be its current source binding, but a stopped process does not make its tenant available to another owner.
2. **Active lease:** the exact process/PID + start-time and owned resources establish that this worktree is running; an occupied port with an unmatched process must refuse, not be killed.
3. **Retirement:** a separately authorized, ownership-verified disposal operation after Change completion; remove app/registry/tenant resources only under the chosen retention policy, never as an ordinary stop or because a chat ended.

**Known implementation/evidence distinction:** local registry, v2 identity selectors, process fencing, source freshness machinery and owned park commands exist in the integrated source. The owned `dev-8` receipt at `d0e35b63` matched the selected union image, including a containerd sibling tag of the same digest. PID/start-tick behavior has focused tests; process IDs with missing/mismatched ticks must never be signalled. `.offscreen/dev-session.json` and `.offscreen-dev-runtime/` remain Git-ignored. Do not confuse a cleared process lease with releasing durable tenant identity.

**Staleness procedure for an operator/planner:** inventory the local registry (from the machine, not GitHub), OS process identity and occupied ports, Git worktree existence/branch and currently active Change, then inspect Kubernetes namespace labels/UIDs and tenant ownership. Classify ACTIVE, STOPPED-RETAINED, ORPHAN-CANDIDATE, FOREIGN/CONFLICT or UNKNOWN. A stale chat or an archived Change is a *signal to review*, never sufficient evidence to free a slot. For ORPHAN-CANDIDATE, record exact resource IDs and ask for/execute the narrowly authorized retirement process only when proved safe; on mismatch fail closed. No blanket TTL-based namespace/PVC deletions. Report unknowns; no need for a global coordinator.

## T05 acceptance contract (not yet fully proven)

- **Start/attach:** discover canonical worktree, atomically assign or look up its stable identity, verify cluster and resources, capacity/ports, reconcile source/build/config/process receipts, then expose only its loopback URL. Build only changed dependencies/images; do not confuse a mutable image tag with the running image ID. A stale or failed compile is NOT READY.
- **Status:** show slot, worktree, namespace, port bundle, source fingerprint (including local edits), compiled artifact generation, actual process generation, service health, Temporal worker activity, and observed vs desired image/config; classify failures.
- **Stop:** stop **only** this worktree's Tilt/app processes after PID/start-time and resource-UID checks; preserve SQL, S3, Temporal histories and credentials for a safe restart. Do not use global PID-only stop, `tilt down` against the wrong context, `kind delete`, Pod/PVC deletion, or tenant reset.
- **Retire:** separately review closed/archived Change, ownership, data retention and active dependents. Implemented retirement should be observable and idempotent, not a side effect of command failure.
- **Concurrency:** four full stacks is the target host acceptance workload, **not** an allocator ceiling. Admit based on measured capacity, not a hardcoded slot count.

**Gate before HR01–HR03:** owned-slot freshness is proven: `pnpm dev:status` reported six current-generation READY lines, a Web edit and an API edit reached the running processes, a TypeScript error became `api NOT READY compile_error` and recovered, and the relay executed one provider-free workflow task. The new-worktree dispatch prerequisite passed on `dev-9` at `e3fa10b7`. HR01–HR03 were not started from that receipt. Four full-stack acceptance, browser OAuth, release-lab acceptance, and a completed provider-free story remain separate and unproven.

## Source navigation

- Assignment/lease: `scripts/repo-tools/dev-worktree-{allocator,registry}.mjs`.
- Slot renderer/credential projection: `tools/dev-environments/src/rendering/dev-slot-{app-graph,project}.mjs`.
- Dev image build: `infra/images/development/load-dev-slot-image.sh`.
- Watch graph/compiled freshness: `infra/images/development/sync-plan.mjs` and `tools/dev-environments/runtime/{compile-watch,generation,status}.mjs` (slot readiness via `src/application/dev-status.mjs::collectSelectedSlotReadiness`). The accepted dev graph is the root `Tiltfile`.
- Change gate and evidence: [DXK09](../../work/changes/open/2026-11-22--dxk09-isolated-parallel-development-stacks/CHANGE.md), [T05](../../work/changes/open/2026-11-22--dxk09-isolated-parallel-development-stacks/TASKS.md), [PROOF](../../work/changes/open/2026-11-22--dxk09-isolated-parallel-development-stacks/PROOF.md).
- HR01–HR03 gated wave: [NEXT-WAVE](../../work/undertakings/storyteller-workshop/NEXT-WAVE.md).

This page owns **worktree development operations**. [Local development](local-development.md) explains toolchain, source-only checks and historical/release lab procedures, but does not override this dev-slot route. The selected architecture belongs to [the technical contract](../technical/platform/developer-environments.md).


## Selected next ownership contract (2026-11-23) | NOT YET IMPLEMENTED

**Historical T05-FU heading retained for inbound links.** Environment IDs, `--instance` selectors, `pnpm dev:reserve`, and `pnpm dev:attach` exist. The unimplemented remainder is profile activation and guarded release. The details below document constraints from T05-FU and may contain historical readiness wording. The [current-command table](#what-works-on-the-integrated-branch) is authoritative for what is usable today.

**Correction to the worktree-owned model above:** A developer environment is a durable, independently identified `dev-N` resource; a Git checkout or worktree is only its current source binding, and a process is its separately fenced active session. The integrated v2 implementation has environment IDs, checkout defaults, explicit `--instance` selectors, and registry-only reserve/attach. **Profile activation and cross-checkout transfer of a provisioned slot are not implemented.** The authoritative small executor plan is [DXK09 T05-FU](../../work/changes/open/2026-11-22--dxk09-isolated-parallel-development-stacks/TASKS.md#t05-fu--environment-identity-independent-of-source-checkout).

The current CLI has `pnpm dev`, `pnpm dev:status`, `pnpm dev:stop`, `pnpm dev:new`, `pnpm dev:reserve`, `pnpm dev:attach`, and `--instance dev-N`. `dev:new` still **allocates and starts**. `dev:reserve` does not bind a checkout. Ordinary `up`/`status`/`stop --instance` refuses an unattached record and a foreign checkout. Environments retain their slot ID and SQL/S3/Temporal/Kubernetes identity when source checkout changes after a verified stop. One checkout may be watched by multiple isolated live environments, but an edit to that shared checkout intentionally affects every watching environment; independent edit streams require separate checkouts. Never infer a slot from Git branch name or number of `pnpm dev` invocations.

Registry migration must preserve existing dev-1/dev-2 assignments, UIDs, ports, credentials and leases under a lock, refusing ambiguity without destruction. Active slot takeovers and unmatched PIDs/ports/UIDs refuse. Every environment gets its own session record, process, Tilt port, runtime/compiled generation and Pod-local outputs. Reuse shared backing servers with independent tenants. Five live environments are a **capacity-admitted experiment**, not a hardcoded minimum or promise that this workstation has adequate memory. Current cold-start/migration/image-load completion still precedes this follow-up. The earlier implementation/evidence sections remain valid historical descriptions of v1 until FU passes.

**Startup binding (T05-FU03).** An explicit `dev-N` selection uses that registry record for SQL, migration, S3, Temporal, projection, images and Tilt. It does not allocate a second id. Each environment has its own Tilt process, session file, namespace and ports. Two environments may watch one checkout. Application compilation stays in that environment's Pods. A host database build or a dev-slot release-image fallback refuses when another environment session for the same checkout has a live PID and matching start ticks. Until v2 sessions exist, the checkout's own `.offscreen/dev-session.json` is the same kind of consumer: a verified live legacy PID refuses the write, a dead legacy PID does not, and an unreadable legacy file refuses before the write. One consumer, or a dead session, keeps the existing host command. Release builds that do not set `OFFSCREEN_DEV_SLOT` are unchanged.

**Park on release (selected for T05-FU02).** When a Cursor finishes a Change and no other verified consumer holds the environment, its normal release is park, not destroy. Park means: the owned Tilt and port-forward processes are stopped, the six application Deployments are scaled to zero, and the active reservation is cleared only after those desired replicas read back as zero. The `dev-N` identity, namespace, secrets, ports, SQL/S3/Temporal tenants and image artifacts remain. Leave the environment running when the owner asked it to stay up or another authorized consumer has taken the lease. Do not park `dev-1` through `dev-4` from Headlamp idle appearance; confirm ownership and whether a current proof still needs them. A stale PID, foreign lease, mismatched namespace or second active consumer refuses without scaling. Repeated park of an already verified parked environment is a no-op. Tenant deletion is a separate explicit operation and is outside this release.
