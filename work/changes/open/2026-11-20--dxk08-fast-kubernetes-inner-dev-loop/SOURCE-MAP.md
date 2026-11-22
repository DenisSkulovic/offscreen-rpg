# DXK08 | Source map

**Baseline:** `592158da5d6942851e5a08f2e43377ef1a70e0b5`

## Current orchestration

### Root `Tiltfile`

Current behavior:
- allows only `kind-offscreen-lab`;
- defines one `app-release-images` local resource;
- broad deps: `apps`, `packages`, `tools`;
- invokes `infra/kubernetes/lab/dev/tilt/build-release-images.sh`;
- custom-build tags release images for Tilt;
- every application resource depends on `app-release-images`;
- no `live_update`;
- no `docker_build` dev images.

This is release-style orchestration, not an interactive source-sync graph.

### Existing warm release path

`infra/kubernetes/lab/app-release/FAST-PATH.md` and its helpers already provide:
- affected runtime selection;
- cached/pruned Docker builds;
- parallelism;
- selective kind load/install/rollout.

DXK08 must reuse that as the fallback for unsafe edits.

Do not reimplement those mechanisms in Tilt.

## Existing watch commands

### Web
`apps/web/package.json`
- `dev = next dev --hostname 127.0.0.1`

For a Pod dev profile this must bind inside the container, normally `0.0.0.0`, while the browser-facing port-forward remains loopback-only.

### API
`apps/api/package.json`
- `dev = tsc-watch --onSuccess "node --env-file-if-exists=../../.env dist/src/main.js"`

Runtime env in Kubernetes comes from Deployment/Secrets; the dev Pod must not require a copied root secret file.

### Game Authority
`apps/game-authority/package.json`
- same tsc-watch pattern targeting `dist/src/bootstrap/main.js`.

### Worker
`apps/worker/package.json`
- relay/start commands exist;
- control and executor start commands exist;
- only one generic `dev` command exists today.

DXK08 should add explicit dev/watch commands for all three worker roles or provide equivalent dev-container supervision without combining their runtime authority.

## Runtime env ownership

Release overlays already define the correct environment and Secrets:
- `infra/kubernetes/lab/app-release/overlay/edge.yaml`
- `authority.yaml`
- `workers.yaml`

Dev overlays should derive/copy the runtime env contract deliberately rather than running host processes with accidental local env differences.

## Developer launcher

`scripts/repo-tools/dev-tilt.mjs` currently:
- assumes `kind-offscreen-lab`;
- validates game/Tilt loopback ports;
- launches `tilt up`;
- waits until all six Deployments are ready;
- reports game/control/Tilt URLs.

Preserve the front door `pnpm dev`, but update readiness/resource expectations for the explicit dev profile.

## Existing test that must change

`infra/kubernetes/lab/tilt/tiltfile.test.mjs` currently asserts:
- no `live_update`;
- no `docker_build`;
- release-image build scripts are the Tilt path.

Those assertions encode the old architecture and must be replaced with discriminating dev-vs-release tests, not simply deleted.

## Dependency-selection owner

Reuse:
- `infra/kubernetes/lab/app-release/production-workspace-closure.mjs`
- affected-image selector / current runtime dependency graph

Do not create an unrelated hard-coded package→service graph unless a tiny adapter is needed around the existing owner.
