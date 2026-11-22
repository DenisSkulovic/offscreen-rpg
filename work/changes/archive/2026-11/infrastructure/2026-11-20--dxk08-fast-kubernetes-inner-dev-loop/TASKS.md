# DXK08 | Bounded Cursor tasks

## T01 | Dev/release orchestration split

Read:
- `Tiltfile`
- `scripts/repo-tools/dev-tilt.mjs`
- `infra/kubernetes/lab/app-release/FAST-PATH.md`
- `infra/kubernetes/lab/dev/tilt/build-release-images.sh`

Write:
- root/dev Tilt orchestration
- dev-only helpers under `infra/kubernetes/lab/dev/`
- focused static tests

Result:
`pnpm dev` no longer points ordinary source edits at `app-release-images`.

Stop if implementing dev mode would require changing release app semantics.

## T02 | Dev image + Web live update

Read:
- `apps/web/package.json`
- current release Web Dockerfile
- edge env/service contract

Implement dev container + Tilt sync for Web.

Positive:
- `.tsx` edit visible without image build.

Negative:
- lockfile/dev Dockerfile change rebuilds dev image.

## T03 | API and Game Authority live update

Read:
- app package scripts
- release edge/authority env
- current dev image

Implement independent watch/sync resources.

Positive:
- API-only source edit does not update GA/Worker/Web.
- GA-only source edit does not update API/Worker/Web.

Negative:
- compile failure not reported ready.

## T04 | Worker role watches

Read:
- `apps/worker/package.json`
- worker bootstrap entrypoints
- workers release overlay

Add explicit role dev commands or equivalent and wire three dev workloads.

Positive:
- worker source edit updates only worker runtime roles.

Negative:
- role commands preserve control/executor no-broad-DB contract.

## T05 | Shared dependency impact and fallback

Read:
- production workspace closure
- affected image selector
- warm release documentation

Implement the smallest adapter needed so shared package edits update actual consumers and unsafe edits use warm rebuild fallback.

Do not maintain a second independent package graph.

## T06 | Live acceptance and closure

Run:
- focused static/unit tests
- live kind dev loop
- representative timing measurements
- narrow immutable release regression

Reconcile docs.
Archive DXK08.
Integrate to `undertaking/storyteller-workshop`.
Retire temporary branch/worktree.

No paid provider calls.
No K8S10 fault mutation.
