# DXK08 | Fast Kubernetes inner development loop

**State:** READY FOR EXECUTION NOW.  
**Kind:** implementation. **Promoted:** 2026-11-22.  
**Reference branch:** `undertaking/storyteller-workshop`  
**Source baseline:** `592158da5d6942851e5a08f2e43377ef1a70e0b5`  
**Program:** [Kubernetes-first developer experience](../../../designs/open/kubernetes-first-developer-experience-2026-11-20/README.md)

## Goal

Make ordinary local development behave like development rather than release deployment.

For normal `.ts` / `.tsx` edits, the relevant running workload must update in seconds without rebuilding a production-style Docker image. Keep the release/cold-kind path intact for TURN03/K8S acceptance and unsafe dependency/schema/container changes.

## Current source reality

The current root `Tiltfile` still:

- targets `kind-offscreen-lab`;
- has one broad `app-release-images` resource depending on `apps/`, `packages/`, and `tools/`;
- routes all application changes through immutable release-image builders;
- explicitly has no `live_update` or dev image graph.

The recently integrated warm release path improves this substantially:
- pruned Docker contexts;
- cached pnpm store/fetch;
- affected-image selection;
- parallel image builds;
- unchanged kind-load skipping;
- selective rollouts.

That work stays. DXK08 starts **after** it and solves the next problem: avoid image rebuilds entirely for ordinary source edits.

Existing package scripts already expose watch-capable processes:
- Web: `next dev`
- API: `tsc-watch ... node dist/src/main.js`
- Game Authority: `tsc-watch ... node dist/src/bootstrap/main.js`
- Worker currently has one relay-oriented `dev` script; control/executor need explicit dev commands or equivalent process supervision.

## Chosen architecture

### 1. Explicit dev profile, separate from release lab

Normal `pnpm dev` becomes an explicit development-mode Tilt graph.

Do **not** mutate the immutable app-release Dockerfiles/manifests into watcher containers.

Release verification remains available through the existing app-release build/install scripts and remains the path for TURN03 final clean acceptance.

### 2. Dev workloads use source sync + watch/restart

Create dev-only workload definitions/images under `infra/kubernetes/lab/dev/`.

The dev container has the workspace dependency closure installed once. Source changes are synchronized into the running container by Tilt.

- **Web:** run `next dev` and use Fast Refresh.
- **API:** run its existing watch compiler/restart path.
- **Game Authority:** run its existing watch compiler/restart path.
- **Worker:** provide explicit watch/restart commands for relay, control, and executor so the three deployments remain real and independent.

Ordinary source changes sync/restart only the affected workload(s).

### 3. Shared package edits map through dependency ownership

A shared package edit such as `packages/story-engine/**` must update only its runtime consumers, not every Pod.

Use the existing production workspace closure / affected-image knowledge as the source for dependency ownership rather than a second hand-maintained dependency map.

Expected example:
`packages/story-engine/**` → API + Game Authority + Worker; Web excluded unless the actual graph says otherwise.

### 4. Unsafe changes fall back to the warm release path

Do not live-sync changes that can invalidate the installed dependency graph or runtime image contract.

At minimum, these trigger rebuild/redeploy rather than source-only sync:
- `pnpm-lock.yaml`
- root/workspace package manifests
- Dockerfiles/dev-image definitions
- migrations/schema ownership
- generated contract inputs or other declared generated artifacts
- runtime-tree/build configuration

Use the newly integrated affected-image warm path for this fallback; do not invent another release builder.

### 5. Real boundaries remain real

Dev mode keeps actual:
- Better Auth/session behavior
- PostgreSQL
- S3/document store
- Temporal
- private Game Authority service boundary
- control/executor/relay separation

No auth bypass, in-memory fake API, direct host-side replacement of GA/Temporal, or provider spending is introduced.

### 6. TURN03 stays a release acceptance path

DXK08 improves the coding loop. It must not weaken TURN03.

TURN03 may use dev mode to diagnose a source bug, but its final cold-kind acceptance still uses the immutable release path.

## Owned paths

Primary:
- `Tiltfile` or a dedicated imported dev Tilt file
- `infra/kubernetes/lab/dev/**`
- `scripts/repo-tools/dev-tilt.mjs` and focused tests
- narrow app package dev scripts needed for watcher commands
- `docs/runbooks/local-development.md`
- `docs/runbooks/kubernetes-developer-ui.md`

Coordinate, do not redesign:
- `infra/kubernetes/lab/app-release/**` warm/clean release builders
- cluster/bootstrap infrastructure
- DXK09 worktree-stack identity/data isolation

## Exclusions

No:
- gameplay changes
- provider calls
- database schema change
- production Helm/Argo
- new auth scheme
- branch-isolated stacks (DXK09)
- replacing kind/Tilt with a different platform
- weakening release/cold-kind acceptance

## Closure

Prove the dev loop live, reconcile docs, archive this Change, integrate into `undertaking/storyteller-workshop`, and retire the temporary Change branch/worktree.
