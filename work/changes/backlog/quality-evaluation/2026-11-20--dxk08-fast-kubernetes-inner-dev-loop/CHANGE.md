# DXK08 | Fast Kubernetes inner development loop

**State:** Ready for dedicated Change commission; not selected globally; not implemented; not Done.  
**Kind:** implementation. **Date:** 2026-11-20.  
**Program:** [Kubernetes-first developer experience](../../../../designs/open/kubernetes-first-developer-experience-2026-11-20/README.md).  
**Current source reality:** the root `Tiltfile` intentionally uses full release-image rebuilds, one broad `app-release-images` dependency over `apps/`, `packages/` and `tools/`, and tests explicitly forbid `live_update`. `Dockerfile.web` runs a production Next build. This is appropriate release verification and must remain available, but it is too slow/stale for ordinary interactive development.

## Goal

Make normal development feel like development: an ordinary source edit should reach the relevant running development workload in seconds, while the immutable TURN02/release path remains separate and unchanged for release verification.

The canonical developer front door remains `pnpm dev`. It must run a **development profile**, not secretly reuse the production image pipeline for every edit.

## Chosen architecture

1. **Separate dev and release paths.** Do not mutate the TURN02 release Dockerfiles/manifests into watch containers. Release verification continues to use immutable built images and no source mounts.
2. **Web:** prefer a dedicated Kubernetes development Pod/image running `next dev` with source sync and Fast Refresh, still using the real Kubernetes Nest/API boundary and the same browser origin contract. If current Next/runtime constraints prove a WSL-host Next process materially simpler, the executor may choose it only after recording the exact service/auth routing evidence and preserving one-command `pnpm dev`.
3. **API / Game Authority / workers:** use resource-specific Tilt dependencies and guarded sync/restart or watch behavior where safe. A source change must update only the affected service, not rebuild every app image.
4. **Unsafe changes fall back to rebuild.** Dockerfiles, lockfiles, workspace manifests, generated artifacts/contracts, DB schema/migrations, runtime-tree preparation and comparable dependency-graph changes must trigger a full safe rebuild/restart rather than stale live sync.
5. **Real boundaries stay real.** Dev mode continues to use actual Better Auth/session identity, Postgres, S3/document store, Temporal and private Game Authority/service seams. No fake successful API or POC auth bypass is introduced.
6. **Developer state may be mutable; release evidence may not.** Development watchers/source sync are allowed only in the explicit dev profile.

## Owned paths

Primary ownership:
- `Tiltfile` and/or a dedicated dev Tilt entry imported by it;
- `infra/kubernetes/lab/dev/` dev-only images/manifests/scripts;
- `scripts/repo-tools/dev-*.mjs`;
- narrow package dev scripts/config needed for watch mode;
- `docs/runbooks/local-development.md` and `docs/runbooks/kubernetes-developer-ui.md` where the developer workflow changes.

Coordinate, do not rewrite ownership:
- release Dockerfiles/scripts under `infra/kubernetes/lab/app-release/`;
- root command cleanup owned by DXK04;
- Compose retirement owned by DXK06;
- branch-isolated stack naming/ports/data tenancy owned by DXK09.

## Acceptance

Normal proof:
- change a visible web `.tsx` string/component and observe the browser update without rebuilding the production web image;
- change an API source file and observe only the API development workload reload/restart;
- change GA or worker source and observe only the relevant development workload update;
- record representative edit-to-visible/restarted durations;
- `pnpm dev` remains the obvious entrypoint and reports the actual dev URLs only after readiness.

Discriminating negatives:
- changing `pnpm-lock.yaml`, Dockerfile/workspace dependency metadata, generated contract inputs, or migration/schema ownership must not be treated as a cheap source-only live update;
- release verification must still build/run immutable release images with no dev watcher/source mount;
- a failed rebuild/reload must not leave Tilt reporting the stale workload as successfully updated.

## Exclusions

No new gameplay features, hosted deployment, production Helm/Argo work, paid provider calls, new auth scheme, Compose resurrection, or general container-platform abstraction.

## Planned impact | planned-impact.v1

| Plane | Intended delta | Proof / no-op |
| --- | --- | --- |
| Product | unchanged | developer tooling only |
| Technical | development profile becomes explicitly separate from release verification | local-development and deployment docs |
| Code | targeted Tilt/dev images/watch/sync/restart implementation | focused dev-loop and fallback tests + live kind observation |
| Related | DXK09 consumes this dev profile per isolated stack | no branch-stack allocator in this Change |

## Reconciliation ledger | fill before Done

| Authority | Observed source SHA/files | Positive proof | Negative proof | Docs reconciled | Remaining |
| --- | --- | --- | --- | --- | --- |
| Dev inner loop | Pending | Pending | Pending | Pending | Pending |

**Closure:** once the bounded developer loop is proved, reconcile canonical docs, run Change close guards, mark Done, archive, repair links/catalog/roadmap, and merge the dedicated branch to current `main`. Broader clean-clone proof stays DXK07.
