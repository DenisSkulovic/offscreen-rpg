# Lab image warm path

Clean acceptance and warm iteration use the same Dockerfiles. The clean path rebuilds every selected image from the lockfile. It does not read a previous stage directory.

## Clean acceptance

From the repository root, with no extra environment variables:

```sh
bash infra/images/release/build-release-images.sh
bash infra/environments/release/install.sh
```

That builds web, API, Game Authority, and worker (at most 3 at once), loads each image into `kind-offscreen-release`, applies every overlay, and waits for every rollout. `install.sh` with no `OFFSCREEN_RELEASE_IMAGES` is the full path. `pnpm install --frozen-lockfile` stays inside the image build. `pnpm fetch` runs before source is copied, with a BuildKit cache mount on `/pnpm/store`.

`build.sh`, `build-web.sh`, and `build-worker.sh` remain the single-purpose clean builders.

## Warm iteration

```sh
export OFFSCREEN_AFFECTED_BASE=HEAD
bash infra/images/release/build-release-images.sh
export OFFSCREEN_RELEASE_IMAGES="$(node infra/images/release/select-affected-images.mjs --base HEAD)"
bash infra/environments/release/install.sh
```

Or name images directly:

```sh
OFFSCREEN_RELEASE_IMAGES=worker bash infra/images/release/build-release-images.sh
OFFSCREEN_RELEASE_IMAGES=worker bash infra/environments/release/install.sh
```

`select-affected-images.mjs` uses `production-workspace-closure.mjs`. A docs-only or test-only diff prints `none` and the build helper exits 0 without building. A worker source edit selects `worker`. A `packages/story-engine` source edit selects `api`, `game-authority`, and `worker`.

`install.sh` prints `SKIP unchanged <image>` when the kind node already has that image id, and waits only for the selected Deployments. A worker-only install does not wait for web, API, or Game Authority, and it does not rerun `game-migrate`. Schema changes still go through the clean path or `OFFSCREEN_RELEASE_IMAGES` including `api`.

`OFFSCREEN_IMAGE_BUILD_CONCURRENCY` defaults to 3. Any failed image exits non-zero after its log is printed.

Context for each image is `turbo prune <workspace> --docker`, not a copy of the whole monorepo. The runtime tree is still cut by the production workspace closure after compile.