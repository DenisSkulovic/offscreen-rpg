# DXK09 | Isolated parallel Cursor development stacks

**State:** PLANNED; implementation readiness gated by the verification items below. **Owner-commissioned promotion:** 2026-11-22. **Integration branch:** `undertaking/storyteller-workshop`. **Source HEAD inspected:** `62c930a2050afcc4376130fed4120828b1f70624`. **Kind:** development infrastructure, no gameplay or paid model changes.

## Goal
Two different linked Cursor worktrees may run and edit independent copies of the real game services simultaneously without overwriting each other's Pods, Tilt session, images, SQL story/auth data, object-store writes, Temporal workflow operations, secrets, logs, or loopback ports. Three or four simultaneous slots should be possible when host capacity permits. The existing TURN03 cold release lab remains untouched.

**Terminology correction:** This is **not a full cluster per Cursor chat**. One dedicated `kind-offscreen-dev` cluster hosts shared, locally scoped infrastructure, while each worktree gets a distinct logical stack and data tenancy. Running N complete clusters would replicate heavy stateful dependencies without improving ordinary code isolation.

## Selected contract (planner decision)
- Release remains `kind-offscreen-lab`, `offscreen-lab`, existing `pnpm stack:*`, app-release Tilt graph and kind resources. No DXK09 command changes or resets it.
- A separately provisioned `kind-offscreen-dev` cluster hosts shared PostgreSQL, S3-compatible object storage and Temporal server, each with scoped per-stack logical tenants. Any existing installer hard-pinned to the release cluster must **not** be executed against this cluster unchanged.
- Each bounded, operator-assigned slot `s01`..`s04` has an isolated namespace `offscreen-dev-sXX`; all six dev application Deployment/Service names remain `game-*` within that namespace. No cross-namespace application service DNS references.
- **Data isolation:** dedicated PostgreSQL database and least-privilege login per slot, unique S3 bucket per slot, unique Temporal namespace per slot; per-slot queues and workflow IDs should remain scoped as defense in depth. Shared SQL schemas, shared buckets with casual prefixes or only different Pod names are explicitly rejected.
- **Credentials:** per-slot Better Auth signing secret, private GA tokens and DB/S3 credentials in that slot's namespace. GitHub OAuth credentials must be explicitly configured for each chosen loopback origin/callback; never silently reuse a single fixed-port OAuth registration or bypass production authentication. Without configured auth, report an unavailable authenticated-browser capability, not a fake READY.
- **Ports & ownership:** reserve a deterministic localhost game/API/Tilt port set for each slot from a validated allowlist; use an atomic per-slot owner/lease record (slot + canonical worktree path + process PID/start identity). A second worktree may not attach to or kill a live foreign slot. Reclaim stale leases only after verifying process absence and corresponding resource ownership.
- **Images/Tilt:** preserve DXK08 live_update behavior; tag dev images by slot plus build identity, and scope Tilt's Kubernetes resources, file sync and start/stop to that slot. A source edit in worktree A must never sync source from worktree B. The existing warm-release/cold-kind path is not a fallback for dev-cluster manifests.
- **Mutations:** start/stop/rebuild only resources labeled with exact stack identity and in the expected dev cluster/context; STOP preserves SQL/S3/Temporal data. A separately explicit, exact-identity-confirmed destroy may delete one slot's namespace and tenants, but never shared state or another slot. No automatic destructive cleanup or provider call.
- **Capacity:** before creating another six-workload stack, check available memory and resource reservations. A resource shortage is a refusal with diagnostics, not an attempted scale-up of the release lab.

## Source reality and decisions
At inspected HEAD: root `Tiltfile` includes `infra/kubernetes/lab/dev/Tiltfile` while pinning `kind-offscreen-lab`; `scripts/repo-tools/dev-tilt.mjs` pins ports 3000/10350, singleton PID `offscreen-rpg-dev-tilt.json`, and six existing namespaces; `dev/{web,api,authority,workers}.yaml` target `lab-edge/lab-authority/lab-workers`, DB secret `game-db`, bucket `lab-objects`, Temporal `default`; `dev/tilt/load-dev-image.sh` hardcodes `offscreen-lab` kind nodes. `apps/api/src/modules/auth/config.ts` requires GitHub OAuth values and origin. Existing shared state is therefore **not isolated** by mere per-worktree Tilt ports.

See [SOURCE-MAP](SOURCE-MAP.md), [decided implementation stages](EXECUTION.md), [Composer tasks](TASKS.md), and [proof](PROOF.md).

## Conflict and permission policy
One DXK09 parent owns dev-cluster provisioning, Tilt launcher, generated manifests and docs. Other ongoing Cursor Changes may continue on the **release** cluster but must not simultaneously edit DXK09's dev Tilt graph or stack launcher. No shell is authorized here to delete kind clusters, reset SQL, mutate shared Temporal or run paid provider requests. The executor works on `change/dxk09-isolated-parallel-dev-stacks` in a linked worktree from the undertaking HEAD; integrator serializes the final merge into `undertaking/storyteller-workshop`.

## Readiness gate before commissioning paid implementation
**PLANNER HOLD, not Ready yet:** the exact existing provisioning/credential route for the new dev cluster's PostgreSQL/S3/Temporal and the per-origin OAuth operator contract must be fixed and separately source-audited. In particular `infra/kubernetes/lab/{cnpg,temporal}` installers and `app-release/install.sh` are release-cluster-pinned, so reusing them without a safe parameterization design would be dangerous. Each T-ID is marked with its own readiness below. This is deliberately a truthful promoted packet, **not** permission for Cursor to investigate the stateful tenancy architecture.

## Done means
Two simultaneous worktrees, each running a genuinely authenticated provider-free story, can independently write SQL, CAS and Temporal and survive a source live_update in the other stack, with no shared object/row/workflow identity and no release lab changes. Negative tests prove port/PID lease collisions, wrong kubecontext, attempted cross-slot cleanup, absent OAuth config, and capacity refusal. Stopping slot A leaves B healthy and all A data intact. Focused tests, live cluster trace and exact HEAD/image/namespace/DB/bucket/Temporal evidence are required before archive.
