# DXK09 | Worktree-owned development stacks

**Audience:** coding agents, developers, ChatGPT planners and DXK09 maintainers. **Status (2026-11-23, inspected undertaking `5d8be46c`):** T05's two-slot trial has a real partial PASS: simultaneous distinct web pages, automatic web edit in one slot (~1.16s), manually copied API edit with process reload (~2s), a tested compile-error receipt, and A stop/restart while B stayed responsive. **This is not unattended agent self-service yet.** Root `pnpm dev`, `pnpm dev:status`, and `pnpm dev:stop` now exist, but need hardening and end-to-end new-worktree proof; API source is not yet watched by Tilt, the rendered API watcher now passes `--noEmitOnError`, and stop/replace is unit-tested against PID reuse. Neither is proven on a live third worktree. Read [DXK09 acceptance](../../work/changes/open/2026-11-22--dxk09-isolated-parallel-development-stacks/PROOF.md). Green Pods do not prove current-source freshness.

## Agent's ordinary route

For a commissioned Change, first follow [AGENTS.md](../../AGENTS.md), its `CHANGE.md`/`TASKS.md`, and the linked-worktree branch rules. Use the **worktree-root developer command** when T05 has passed live proof and the command reports that it targets `kind-offscreen-dev`; use the scripts' normal `status` and `stop` commands instead of manually choosing Pods, ports, credentials or namespaces. If the command is absent or reports NOT READY, treat that as a platform gate: report the exact stage; do not silently fall back to the release lab, Compose, a global Tilt process, hard-coded dev-1 or destructive recreation.

**Current inspected source at `5d8be46c`:** root `pnpm dev` invokes `scripts/repo-tools/dev-tilt.mjs`, and `pnpm dev:status`/`pnpm dev:stop` now exist. The launcher is partially slot-aware (local session file, allocator, Tilt env), but source still retains legacy `stack-preflight` and lab readiness references; do not claim a cold third worktree can provision SQL/S3/Temporal/migrations/app images or attach entirely unattended. The `Tiltfile` slot section currently has no explicit application port-forward declaration. Do not commission three blind HR agents until an independent clean-worktree end-to-end start/status/edit/stop test passes without manual repair and new occupancy checks are safe.

## Actual targets, not interchangeable

| Purpose | Target | Persistence and rule |
| --- | --- | --- |
| Worktree application runtime | `kind-offscreen-dev` with one `offscreen-dev-N` Kubernetes namespace per worktree | Reconcile only own namespace/Pod/image/port and tenant credentials |
| Shared dev PostgreSQL | `offscreen-dev-postgres` / CNPG `dev-pg`, database `dev_N` | One migration role and separate DML-only runtime role; preserve on stop |
| Shared dev S3 | `offscreen-dev-objects` / SeaweedFS, bucket `offscreen-dev-N` | Bucket-scoped user/Secret; admin key must never reach application Pods |
| Shared dev Temporal | `offscreen-dev-temporal` server, Temporal namespace `offscreen-dev-N` | Same queue names per namespace; trusted-local routing isolation, not an auth boundary |
| Release acceptance | **`kind-offscreen-lab`** | Separate purpose; do not direct dev Tilt, image loads or worktree tests here |
| Old shared DXK08 dev resources | `lab-edge`, `lab-authority`, `lab-workers` | Legacy path retained for compatibility, **not** a worktree-owned slot |

Always pass explicit Kubernetes context; the ambient context may remain `kind-offscreen-lab`. Headlamp/Tilt are inspection tools, not ownership authorities.

## Local ownership and lease model

The source for assignment is `scripts/repo-tools/dev-worktree-{allocator,registry}.mjs`. It canonically resolves the Git worktree path, assigns stable `dev-N` IDs, allocates a disjoint loopback port bundle, and writes a **machine-local** `owners.json` protected by `owners.lock` at the caller-supplied registry root. The schema includes worktree path, cluster, namespace, ports, process PID and Linux /proc start-time identity, resource UIDs and an optional process lease. Do not write these records, live resource inventories, credentials, or per-machine reservations to tracked Git files or `work/QUEUE.md`.

**Three distinct concepts:**
1. **Assignment:** a worktree owns a stable slot and durable tenant data; a stopped process does not make that identity available to another Change.
2. **Active lease:** the exact process/PID + start-time and owned resources establish that this worktree is running; an occupied port with an unmatched process must refuse, not be killed.
3. **Retirement:** a separately authorized, ownership-verified disposal operation after Change completion; remove app/registry/tenant resources only under the chosen retention policy, never as an ordinary stop or because a chat ended.

**Currently implemented and observed:** local slot/port registry and lease helper methods, root start/status/stop entrypoints, a two-slot stop/restart experiment, and unit-tested stop/replace that signals a PID only when the recorded Linux start-time tick matches. A remembered PID with a missing or different start time is not signalled. `.gitignore` ignores `.offscreen/dev-session.json` and `.offscreen-dev-runtime/`. The rendered API command includes `tsc --noEmitOnError` for the first compile and the watcher; that graph change is not yet loaded in a running slot. **Not yet verified:** unattended new-slot provisioning, Tilt sync of API edits into a pod, pod-loaded freshness in `dev:status`, and a third-worktree acceptance. A lease cleared after a dead process is **not** a release of the assigned slot. There is no global reusable pool of pre-created anonymous stacks; slots are **attached to worktrees** and reused by that same owner. Never promise automatic allocation/release until T05 proves it.

**Staleness procedure for an operator/planner:** inventory the local registry (from the machine, not GitHub), OS process identity and occupied ports, Git worktree existence/branch and currently active Change, then inspect Kubernetes namespace labels/UIDs and tenant ownership. Classify ACTIVE, STOPPED-RETAINED, ORPHAN-CANDIDATE, FOREIGN/CONFLICT or UNKNOWN. A stale chat or an archived Change is a *signal to review*, never sufficient evidence to free a slot. For ORPHAN-CANDIDATE, record exact resource IDs and ask for/execute the narrowly authorized retirement process only when proved safe; on mismatch fail closed. No blanket TTL-based namespace/PVC deletions. Report unknowns; no need for a global coordinator.

## T05 required automatic workflow (not yet a proven current command)

- **Start/attach:** discover canonical worktree, atomically assign or look up its stable identity, verify cluster and resources, capacity/ports, reconcile source/build/config/process receipts, then expose only its loopback URL. Build only changed dependencies/images; do not confuse a mutable image tag with the running image ID. A stale or failed compile is NOT READY.
- **Status:** show slot, worktree, namespace, port bundle, source fingerprint (including local edits), compiled artifact generation, actual process generation, service health, Temporal worker activity, and observed vs desired image/config; classify failures.
- **Stop:** stop **only** this worktree's Tilt/app processes after PID/start-time and resource-UID checks; preserve SQL, S3, Temporal histories and credentials for a safe restart. Do not use global PID-only stop, `tilt down` against the wrong context, `kind delete`, Pod/PVC deletion, or tenant reset.
- **Retire:** separately review closed/archived Change, ownership, data retention and active dependents. Implemented retirement should be observable and idempotent, not a side effect of command failure.
- **Concurrency:** four full stacks is the target host acceptance workload, **not** an allocator ceiling. Admit based on measured capacity, not a hardcoded slot count.

**Gate before HR01–HR03:** the two-worktree visual and stop/restart proof passed, but live API source sync and strict no-emit-on-error freshness, safe PID+start-time process ownership, third-worktree cold self-provisioning, and truthful status remain pending. Run one new third worktree end-to-end using only documented `pnpm dev` / `dev:status` / `dev:stop`, with no manual SQL/S3/Temporal/app/port-forward steps, under resource admission. Confirm local session and registry data are ignored by Git; then start the three unattended Change agents with ordinary Change-only prompts. Four full-stack acceptance and real provider-free story remain separate.

## Source navigation

- Assignment/lease: `scripts/repo-tools/dev-worktree-{allocator,registry}.mjs`.
- Slot renderer/credential projection: `infra/kubernetes/lab/dev/backing/dev-slot-{app-graph,project}.mjs`.
- Dev image build: `infra/kubernetes/lab/dev/load-dev-slot-image.sh`.
- Watch graph/compiled freshness: `infra/kubernetes/lab/dev/{dev-sync-paths,dev-watch-compilation,dev-watched-compilation-receipt,dev-loaded-runtime-status}.mjs`; historical shared `Tiltfile` is a compatibility reference, not the accepted slot launcher.
- Change gate and evidence: [DXK09](../../work/changes/open/2026-11-22--dxk09-isolated-parallel-development-stacks/CHANGE.md), [T05](../../work/changes/open/2026-11-22--dxk09-isolated-parallel-development-stacks/TASKS.md), [PROOF](../../work/changes/open/2026-11-22--dxk09-isolated-parallel-development-stacks/PROOF.md).
- HR01–HR03 gated wave: [NEXT-WAVE](../../work/undertakings/storyteller-workshop/NEXT-WAVE.md).

This page is the worktree-dev authority. [Local development](local-development.md) documents the existing shared/release-lab route and does not override this one.


## Selected next ownership contract (2026-11-23) | NOT YET IMPLEMENTED

**Correction to the worktree-owned model above:** A developer environment is a durable, independently identified `dev-N` resource; a Git checkout or worktree is only its current source binding, and a process is its separately fenced active session. The implemented v1 registry and current commands still enforce one default slot per checkout. **Do not advertise the following as working before T05-FU acceptance.** The authoritative small executor plan is [DXK09 T05-FU](../../work/changes/open/2026-11-22--dxk09-isolated-parallel-development-stacks/TASKS.md#t05-fu--environment-identity-independent-of-source-checkout).

The selected CLI target keeps `pnpm dev`, `pnpm dev:status` and `pnpm dev:stop` for the checkout's *default* environment; adds `pnpm dev:new` to allocate a fresh environment and `--instance dev-N` on start/status/stop to select another one. Environments retain their slot ID and SQL/S3/Temporal/Kubernetes identity when source checkout changes after a verified stop. One checkout may be watched by multiple isolated live environments, but an edit to that shared checkout intentionally affects every watching environment; independent edit streams require separate checkouts. Never infer a slot from Git branch name or number of `pnpm dev` invocations.

Registry migration must preserve existing dev-1/dev-2 assignments, UIDs, ports, credentials and leases under a lock, refusing ambiguity without destruction. Active slot takeovers and unmatched PIDs/ports/UIDs refuse. Every environment gets its own session record, process, Tilt port, runtime/compiled generation and Pod-local outputs. Reuse shared backing servers with independent tenants. Five live environments are a **capacity-admitted experiment**, not a hardcoded minimum or promise that this workstation has adequate memory. Current cold-start/migration/image-load completion still precedes this follow-up. The earlier implementation/evidence sections remain valid historical descriptions of v1 until FU passes.

**Park on release (selected for T05-FU02).** When a Cursor finishes a Change and no other verified consumer holds the environment, its normal release is park, not destroy. Park means: the owned Tilt and port-forward processes are stopped, the six application Deployments are scaled to zero, and the active reservation is cleared only after those desired replicas read back as zero. The `dev-N` identity, namespace, secrets, ports, SQL/S3/Temporal tenants and image artifacts remain. Leave the environment running when the owner asked it to stay up or another authorized consumer has taken the lease. Do not park `dev-1` through `dev-4` from Headlamp idle appearance; confirm ownership and whether a current proof still needs them. A stale PID, foreign lease, mismatched namespace or second active consumer refuses without scaling. Repeated park of an already verified parked environment is a no-op. Tenant deletion is a separate explicit operation and is outside this release.
