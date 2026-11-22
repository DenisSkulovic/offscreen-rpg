# DXK09 | Parallel isolated dev stacks for branches and Cursor chats

**State:** Ready for dedicated Change commission after or in coordination with DXK08; not selected globally; not implemented; not Done.  
**Kind:** implementation. **Date:** 2026-11-20.  
**Program:** [Kubernetes-first developer experience](../../../../designs/open/kubernetes-first-developer-experience-2026-11-20/README.md).  
**Problem observed:** current dev/release tooling hard-pins one `offscreen-lab` / `kind-offscreen-lab` cluster, API server `127.0.0.1:6443`, game `:3000`, Tilt `:10350`, fixed namespaces and one PID file. Multiple isolated Cursor worktrees therefore cannot safely run independent environments.

## Goal

A developer or Cursor parent working in an isolated Git worktree can create/use/destroy **its own logical dev stack** without colliding with other worktrees. Four parallel chats should be able to run four app environments concurrently when host resources allow, with obvious URLs and no accidental cross-stack data or Kubernetes mutation.

## Chosen topology

Default to **one shared dedicated dev kind cluster** plus **per-stack isolated application/data tenancy**, rather than four complete kind clusters. Full-cluster-per-chat is allowed only as a documented fallback when a test genuinely requires cluster-level isolation.

Why: four copies of Kubernetes + Postgres + Temporal + object storage are wasteful; most Cursor implementation work needs application/data isolation, not four control planes.

### Shared dev cluster

Create a dev cluster distinct from the release lab, e.g. `offscreen-dev` / `kind-offscreen-dev`. The fixed release lab `offscreen-lab` remains untouched for release/TURN/DXK07 proofs.

Shared infrastructure may include Postgres, Temporal and object storage, but application state must be isolated by stack identity.

### Stack identity

Every dev worktree receives a stable normalized `stackId`:
- explicit `OFFSCREEN_DEV_STACK` wins;
- otherwise derive from worktree/branch plus a short deterministic hash;
- validate DNS-safe length/charset;
- persist a small registry outside tracked repo files.

A stack owns:
- Kubernetes namespace(s) carrying its `stackId`;
- app Deployment/Service/Secret names or namespace scope;
- unique localhost game and Tilt ports;
- one Postgres database (or equivalently strong database-level isolation), never just a user-visible story prefix;
- one Temporal namespace;
- one S3 bucket/prefix with server-side enforced stack scoping;
- auth/session data in that stack's DB and Secret scope;
- stack-labelled Jobs/PVC/config used by the dev profile.

No stack may read another stack's DB, object prefix, Temporal namespace, Secret, service endpoint or browser port by default.

## Lifecycle contract

Provide simple commands under the eventual DXK04 naming surface, conceptually:

- `pnpm dev` → current worktree's stack;
- `pnpm dev:status`;
- `pnpm dev:down` → only this stack's app resources, preserving its data by default;
- `pnpm dev:reset` → explicit stack-scoped destructive confirmation;
- optional `pnpm dev:list` / garbage-collection helper for abandoned stack registrations.

Do not require the human to manually choose ports/namespaces for normal use. Allocation must be deterministic or registry-backed and collision-safe.

## Concurrency ownership

Parallel Cursor chats may each mutate only their own `stackId` resources. Shared dev-cluster infrastructure changes are serialized through an explicit cluster-infra lock/owner.

Release lab operations remain separately serialized and must never be targeted by a branch dev command.

## Acceptance

Normal:
- create two isolated Git worktrees and launch two stacks concurrently;
- each gets distinct browser/Tilt URLs and Kubernetes stack identity;
- both can authenticate and write/read their own DB/S3/Temporal-backed state;
- edit one worktree and observe only its workload change;
- stop/reset one stack without changing the other;
- show how the design scales to four concurrent stacks, and record memory/resource observations.

Negative:
- deliberate port/stack-ID collision is detected before mutation;
- one stack cannot resolve/read another stack's secret/data route using the normal application credentials;
- a dev command refuses `kind-offscreen-lab` / release namespaces;
- deleting one stack does not delete shared dev infra or another stack's data;
- stale registry/process state is recoverable without unsafe `kill -9`/cluster wipe behavior.

## Owned paths

- new `scripts/repo-tools/dev-stack-*.mjs` (or coherent equivalent);
- `infra/kubernetes/lab/dev/` stack overlay/config generation;
- dev Tilt parameterization;
- dev-only kind config if needed;
- scoped tests and local-development runbook.

Coordinate with DXK08 for dev workload definitions and DXK04 for final public command names. Do not rewrite release lab constants used by release verification into dynamic values unless those callers explicitly opt into the dev-stack abstraction.

## Planned impact | planned-impact.v1

| Plane | Intended delta | Proof / no-op |
| --- | --- | --- |
| Product | unchanged | developer isolation only |
| Technical | distinct release lab vs shared dev cluster; stack-scoped tenancy | deployment/local-dev docs |
| Code | stack identity, allocation, parameterized dev manifests/Tilt/lifecycle | two-worktree live proof + collision/isolation negatives |
| Related | enables parallel Cursor Change commissions to have independent runtime environments | release/TURN proofs stay on fixed lab |

## Reconciliation ledger | fill before Done

| Authority | Observed source SHA/files | Positive proof | Negative proof | Docs reconciled | Remaining |
| --- | --- | --- | --- | --- | --- |
| Parallel dev stacks | Pending | Pending | Pending | Pending | Pending |

**Closure:** after two-stack live proof and resource/isolation negatives, reconcile docs/ledger, archive, repair links/catalog/roadmap, merge to current `main`. DXK07 later proves the final clean-clone developer experience.
