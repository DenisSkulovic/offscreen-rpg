# Infrastructure ownership and navigation

Selected source layout, 2026-11-24. Implementation is staged by INF01–INF05; paths in the target tree become real only as their changes integrate. The existing release environment is a local production-style acceptance environment, not a deployed production service. Use **release** and **development** for source ownership and human-facing terms. Do not introduce a catch-all lab directory or new lab-prefixed source names. Historical proof names and existing runtime identity strings remain compatibility contracts, not naming precedent.

## Selected layout

- clusters/kind/{dev,release}: cluster topology/bootstrap and context fences.
- platform/{postgres,temporal,object-storage,gateway,observability,redis,rabbitmq}: reusable installed backing infrastructure, vendor assets and service configuration.
- workloads/{dev,release}: existing static YAML, grouped by environment for now; dynamic slot renderer remains in tools/dev-environments. No forced YAML deduplication.
- environments/{dev,release}: assembly/install entrypoints, content bootstrap, release Tilt graph and environment binding.
- images/{development,release}: Docker recipes, pins, build/load scripts and artifact verification.
- dev/: Tilt dev graph, source sync and compilation receipts.
- verification/: smoke, fixtures, release-acceptance, chaos, faults and source tests.
- ../tools/dev-environments/: CLI, application orchestration, domain identity/leases, adapters, rendering, image-cache and tests. Existing file/function semantics preserved. Node ESM scripts remain scripts, not a new pnpm workspace package in this pass.

## Entry points

Root pnpm dev, dev:new, dev:reserve, dev:attach, dev:status, dev:stop remain unchanged in behavior; root Tiltfile selects the existing dev graph. Root pnpm stack:up/status/down/reset/acceptance remain unchanged in behavior. The release stack currently uses context kind-offscreen-lab, dev kind-offscreen-dev. The strings lab-*, offscreen-lab, lab-pg, namespace labels, DNS names, PVCs, image tags, secrets, database/bucket names and registry/receipt identities MUST remain unchanged for existing resources in this source relocation. No cluster recreation or rename. Future explicit identity migration can remove old runtime terminology only with data preservation and recovery evidence. No new Helm/Kustomize/GitOps, HA/sharding or controller redesign in this batch. Existing Traefik chart values remain.

## Read the code

Dev: root package.json → dev-tilt.mjs::runDevTiltLaunch → dev-slot-startup.mjs::reconcileOwnedDevSlot → backing adapters and dev-slot-app-graph.mjs::renderDevSlotAppGraph → Tilt → compile/process receipts. Release: package.json → scripts/repo-tools/stack.mjs → stack-lifecycle.mjs::buildStackPlan → cluster/bootstrap/service installers → release image builder and install.sh → migration and workload definitions. Verification is separate from provisioning, although some current installers call smoke fixtures; preserve those calls. DXK09 cold worktree proof e3fa10b7 accepted start/status/stop, not full capacity or completed story.

Exact baseline move inventory and gates: work/undertakings/storyteller-workshop/INF-PARALLEL.md and INF-MOVE-MAP.json. Baseline b01a68b4e91fbbb68f4e67c91427db7435e44738. 257 tracked files assigned (INF02 76, INF03 19, INF04 44, INF05 118). This is a path map, not evidence of runtime equivalence.
