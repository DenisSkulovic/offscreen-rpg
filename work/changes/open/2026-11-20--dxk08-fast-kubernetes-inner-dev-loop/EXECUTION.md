# DXK08 | Execution design

## T01 | Split dev orchestration from release orchestration

Create an explicit dev Tilt graph while retaining the release graph as a separately invokable acceptance path.

Preferred structure:
- root `Tiltfile` = developer profile invoked by `pnpm dev`;
- dev-only Dockerfiles/manifests/helpers under `infra/kubernetes/lab/dev/`;
- existing `infra/kubernetes/lab/app-release/**` remains release/acceptance.

The dev profile may initially use the existing `kind-offscreen-lab` infrastructure because stack isolation is DXK09, but it must label/name dev app workloads clearly enough that release acceptance is not mistaken for dev evidence.

Do not rename/rebuild cluster tenancy in this Change.

## T02 | Build dev images once, then sync source

Create minimal dev image(s) containing:
- Node/pnpm versions matching repo pins;
- workspace dependencies installed from frozen lockfile;
- required build/watch tools.

Prefer one coherent Node workspace dev base where practical, rather than four nearly identical Dockerfiles.

Tilt `live_update` should:
1. sync changed source/package files needed by the target runtime;
2. let watch process compile/restart;
3. avoid image rebuild on ordinary source edit.

Dependency metadata changes must fall back to image rebuild.

## T03 | Web dev workload

Run Web with Next dev + Fast Refresh.

Requirements:
- bind inside Pod on `0.0.0.0:3000`;
- preserve browser URL `http://127.0.0.1:3000`;
- preserve real in-cluster API origin;
- a `.tsx` edit must become visible without `next build`, Docker rebuild, kind load, or Deployment rollout.

## T04 | API + GA dev workloads

Use independent dev resources.

A source edit:
- syncs only the relevant source/dependency closure;
- watch compiler rebuilds;
- Node process restarts after successful compile.

Compilation failure:
- must not be reported as successfully updated;
- existing last process may remain alive if watcher semantics do so, but Tilt/health must show the source update is not accepted.

Do not copy host `.env` into images.

## T05 | Worker roles

Keep three real deployments:
- control
- executor
- relay

Add role-specific watch commands or equivalent:
- relay watches and launches `bootstrap/main.js`
- control watches and launches `bootstrap/control-main.js`
- executor watches and launches `bootstrap/executor-main.js`

One worker/shared source edit may legitimately restart all worker roles because they share the same package/runtime closure. It must not restart API/Web/GA unless dependency selection says they are affected.

## T06 | Safe fallback classifier

Implement deterministic classification:
- **sync-safe source edit** → live sync/watch
- **runtime/dependency unsafe edit** → affected-image warm rebuild/install
- **broad/release acceptance** → clean release path

Reuse existing affected-image selector and workspace closure.

Tests must cover at least:
- app source
- shared Story Engine source
- docs/test-only change
- lockfile
- workspace manifest
- migration/schema path
- Docker/dev image definition

## T07 | Live timings + release regression

Measure:
- Web component edit → visible browser update
- API source edit → API ready with new code
- GA source edit → GA ready
- Worker source edit → worker role(s) ready
- shared Story Engine edit → only graph consumers update

Record which steps occurred:
- source sync?
- compiler/watch restart?
- Docker build?
- kind load?
- Deployment rollout?

Target for ordinary source edits: seconds-scale and **zero Docker image rebuild**.

Then run a narrow immutable release regression proving app-release path still builds/boots independently of dev source mounts/watchers.
