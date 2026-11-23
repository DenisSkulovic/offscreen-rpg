# DXK09 | Worktree-owned development stacks

**Audience:** coding agents, developers, ChatGPT planners and DXK09 maintainers. **Status (2026-11-23):** T03 shared backing and dev-1 application runtime have live evidence; source-watched multi-slot `pnpm dev` / `dev:status` / `dev:stop` and stale-lease retirement are **T05 acceptance targets, not yet established commands**. Read [DXK09 acceptance](../../work/changes/open/2026-11-22--dxk09-isolated-parallel-development-stacks/PROOF.md) for required evidence. Do not claim a green Pod proves current-source freshness.

## Agent's ordinary route

For a commissioned Change, first follow [AGENTS.md](../../AGENTS.md), its `CHANGE.md`/`TASKS.md`, and the linked-worktree branch rules. Use the **worktree-root developer command** when T05 has passed live proof and the command reports that it targets `kind-offscreen-dev`; use the scripts' normal `status` and `stop` commands instead of manually choosing Pods, ports, credentials or namespaces. If the command is absent or reports NOT READY, treat that as a platform gate: report the exact stage; do not silently fall back to the release lab, Compose, a global Tilt process, hard-coded dev-1 or destructive recreation.

**Current checked source at `ce8fc609`:** root `pnpm dev` invokes `scripts/repo-tools/dev-tilt.mjs`, the **legacy shared lab launcher**; it is **not yet verified as worktree-aware**. There are currently **no root `dev:status` or `dev:stop` scripts**. The T05 executor owns replacing/bridging this surface and proving it before HR01–HR03 become the unattended three-Chat trial. Never document a future command as already working.

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

**Currently implemented:** atomic local assignment, disjoint port selection, owner/UID checks and *helpers* for attaching/reconciling a stale process. **Not yet demonstrated:** a complete automatic `pnpm dev` lease acquisition/renewal/release path, `dev:status` + `dev:stop`, unattended reconciliation of abandoned worktrees, a safe tenant-retirement command, or resource recycling. A lease cleared after a dead process is **not** a release of the assigned slot. There is no global reusable pool of pre-created anonymous stacks; slots are **attached to worktrees** and reused by that same owner. Never promise automatic allocation/release until T05 proves it.

**Staleness procedure for an operator/planner:** inventory the local registry (from the machine, not GitHub), OS process identity and occupied ports, Git worktree existence/branch and currently active Change, then inspect Kubernetes namespace labels/UIDs and tenant ownership. Classify ACTIVE, STOPPED-RETAINED, ORPHAN-CANDIDATE, FOREIGN/CONFLICT or UNKNOWN. A stale chat or an archived Change is a *signal to review*, never sufficient evidence to free a slot. For ORPHAN-CANDIDATE, record exact resource IDs and ask for/execute the narrowly authorized retirement process only when proved safe; on mismatch fail closed. No blanket TTL-based namespace/PVC deletions. Report unknowns; no need for a global coordinator.

## T05 required automatic workflow (not yet a proven current command)

- **Start/attach:** discover canonical worktree, atomically assign or look up its stable identity, verify cluster and resources, capacity/ports, reconcile source/build/config/process receipts, then expose only its loopback URL. Build only changed dependencies/images; do not confuse a mutable image tag with the running image ID. A stale or failed compile is NOT READY.
- **Status:** show slot, worktree, namespace, port bundle, source fingerprint (including local edits), compiled artifact generation, actual process generation, service health, Temporal worker activity, and observed vs desired image/config; classify failures.
- **Stop:** stop **only** this worktree's Tilt/app processes after PID/start-time and resource-UID checks; preserve SQL, S3, Temporal histories and credentials for a safe restart. Do not use global PID-only stop, `tilt down` against the wrong context, `kind delete`, Pod/PVC deletion, or tenant reset.
- **Retire:** separately review closed/archived Change, ownership, data retention and active dependents. Implemented retirement should be observable and idempotent, not a side effect of command failure.
- **Concurrency:** four full stacks is the target host acceptance workload, **not** an allocator ceiling. Admit based on measured capacity, not a hardcoded slot count.

**Proof before HR01–HR03:** two real worktrees concurrently serving visibly different frontend source; A-edit affects A only and B-edit affects B only without manual image rebuild; backend edit-to-loaded-process receipt; deliberate compile failure makes A NOT READY while B stays healthy; stop/restart A retains its data and leaves B responsive; unchanged reattach avoids rebuild; local registry remains outside Git. Then explicitly test three unattended Change agents using ordinary instructions, not bespoke DXK09 knowledge.

## Source navigation

- Assignment/lease: `scripts/repo-tools/dev-worktree-{allocator,registry}.mjs`.
- Slot renderer/credential projection: `infra/kubernetes/lab/dev/backing/dev-slot-{app-graph,project}.mjs`.
- Dev image build: `infra/kubernetes/lab/dev/load-dev-slot-image.sh`.
- Watch graph/compiled freshness: `infra/kubernetes/lab/dev/{dev-sync-paths,dev-watch-compilation,dev-watched-compilation-receipt,dev-loaded-runtime-status}.mjs`; historical shared `Tiltfile` is a compatibility reference, not the accepted slot launcher.
- Change gate and evidence: [DXK09](../../work/changes/open/2026-11-22--dxk09-isolated-parallel-development-stacks/CHANGE.md), [T05](../../work/changes/open/2026-11-22--dxk09-isolated-parallel-development-stacks/TASKS.md), [PROOF](../../work/changes/open/2026-11-22--dxk09-isolated-parallel-development-stacks/PROOF.md).
- HR01–HR03 gated wave: [NEXT-WAVE](../../work/undertakings/storyteller-workshop/NEXT-WAVE.md).

This page is the worktree-dev authority. [Local development](local-development.md) documents the existing shared/release-lab route and does not override this one.