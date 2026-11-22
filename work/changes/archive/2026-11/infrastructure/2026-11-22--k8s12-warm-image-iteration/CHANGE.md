# K8S12 warm local image iteration

**Status:** Done (2026-11-22), joined to `undertaking/storyteller-workshop`.

**Goal:** Faster repeated kind image builds without a second release path.

**What landed:** API, Game Authority, worker, and web images install from the pruned lockfile and a BuildKit pnpm store before source is copied. Each image builds from `turbo prune --docker`. `build-release-images.sh` runs up to 3 images at once and can select `--all`, `OFFSCREEN_RELEASE_IMAGES`, or `OFFSCREEN_AFFECTED_BASE`. `install.sh` still applies every overlay when that variable is unset. When it is set, it loads and waits only for those images, and skips a kind load when the node digest matches.

**Proof:** `node --test` warm-path + dockerfile-guard 12/12. Measured on this machine: worker cold 67s (fetch 12s); no-change worker 3s, fetch cached; worker source edit 51s, fetch cached; parallel web+API+GA 112s; story-engine API+GA+worker 94s, fetch cached; web source edit 23s, fetch cached. Kind containerd digest matched the local worker id (`SKIP`). `docker run --entrypoint node` printed boot-ok for all four images. Application source restored after timing probes.

**Negative:** docs/tests select no image. A different digest does not skip the load. Clean no-env build still selects all four images. `pnpm fetch` and `pnpm install` keep `--frozen-lockfile`.

**Not claimed:** a full `install.sh` rollout of the new images onto the running lab. Cluster image load was proved for the worker digest only.
