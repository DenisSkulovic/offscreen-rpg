# INF architecture health | deferred infrastructure ownership redesign

**Status:** Proposed / owner-selected for planning only. **Owner:** ChatGPT architecture planner. **Inspected baseline:** `undertaking/storyteller-workshop@314f1ef1f29ebc57adf1110bf153f864b18892cf` from uploaded lean repository snapshot. **Review trigger:** DXK09 unattended developer-lifecycle acceptance, then the HR01–HR03 execution window and source-ownership reconciliation. **Execution permission:** NONE. [Backlog index](README.md) · [DXK09](../../open/2026-11-22--dxk09-isolated-parallel-development-stacks/CHANGE.md) · [Repository geography](../../../../REPOSITORY-STRUCTURE.md).

## Problem and evidence

The current `infra/kubernetes/lab/` combines Kind cluster definitions, release installation and acceptance, development Tilt and local runtime lifecycle, database/object/Temporal shared services and per-slot tenancy, image building, observability, chaos/fault/probe programs, skeleton fixtures and old example workloads. The concern is **unclear responsibility and lifecycle boundaries**, not file count alone.

Grounded seams in the inspected snapshot:

- `package.json` runs `pnpm dev[:new|:status|:stop]` through `scripts/repo-tools/dev-tilt.mjs`; `dev-slot-startup.mjs` calls provisioning code in `infra/kubernetes/lab/dev/backing/`. `dev-slot-project.mjs`, `dev-slot-app-graph.mjs` and `dev-sql-tenant-contract.mjs` import registry/allocator code back from `scripts/repo-tools/`. This creates opposite-direction dependency edges across two informal owners.
- Release application builds/manifests inhabit `infra/kubernetes/lab/app-release/`; dynamic dev role graph is `dev/backing/dev-slot-app-graph.mjs`; older `dev/{web,api,authority,workers}.yaml` also exist. They are **not yet proven duplicates** and must be classified by active entrypoint before moving/removing.
- Dev image context, loader, Tilt and sync code inhabit `dev/` while release Dockerfiles/build scripts live in `app-release/`. Distinguish a Docker build, canonical fingerprint, alias tag, Kind load, selected Pod digest and loaded runtime receipt before consolidation.
- `chaos/`, `fault/`, `probes/`, `skeletons/`, `content-bootstrap/`, and `app-release/turn03/` include tests or operational activities alongside installable definitions. Their operational consumers and live safety are not yet exhaustively mapped.
- The existing release and dev clusters have **independent live state**; moving paths is not permission to recreate namespaces, rotate secrets or mutate tenant resources.

This document is a target and a bounded promotion plan, **not a claim of a completed source-wide dependency or liveness audit**. Revalidate live code and shell/import callers at promotion. Do not use this snapshot to overrule newer DXK09 implementation.

## Target ownership, not a forced folder shuffle

```text
infra/
  README.md                      # entrypoints, environments, owners, safety
  clusters/
    kind/dev/                   # dev cluster definition + cluster bootstrap
    kind/release-lab/           # release-acceptance cluster definition
  platform/
    postgres/
    object-storage/
    temporal/
    gateway/
    observability/
    redis/                      # explicitly classified optional lab service
    rabbitmq/                   # explicitly classified optional lab service
  workloads/
    game-web/
    game-api/
    game-authority/
    game-workers/
    migrations/
  environments/
    dev/                        # environment config/render bindings, not leases
    release-lab/                # release selectors and safe overlays
  images/                       # image recipes, pins, cache/build contracts
  dev/                          # Tilt + watched compilation/live-sync adapter
  verification/
    smoke/
    release-acceptance/
    chaos/
    faults/
    fixtures/
tools/
  dev-environments/
    src/
      cli/                      # thin public command adapters
      application/              # start/stop/status orchestration
      domain/                   # environment IDs, sessions, leases, policy
      adapters/                 # Kubernetes, Docker, SQL, S3, Temporal
      rendering/                # tenant and workload projections
      image-cache/              # fingerprint and node load planning
    test/
```

**These are candidate final homes.** Implement the minimum justified directory set, not empty placeholders. Keep `pnpm dev`, `dev:new`, `dev:status`, `dev:stop`, release entrypoints and public paths stable through wrappers/adapters. Do not force a new package if the actual dependency boundary can be made one-way with a smaller extraction. `tools/dev-environments/` is an architectural proposal subject to export/dependency audits, not a command to adopt a particular package system.

## Dependency direction and engineering rules

1. User CLI → one dev-environment application/service → pure domain contract + injected infrastructure adapters → Kubernetes/Docker/Temporal/SQL/S3 side effects. Infrastructure renderers may import **pure identity contracts**, not a high-level CLI or lifecycle controller. No reverse CLI↔provisioner import cycle.
2. Cluster/environment selectors own where resources go; platform modules own shared service provisioning; workload definitions own application Pods; dev tooling owns live update/freshness; verification owns experiments and evidence. Separate install commands from fault injection.
3. Use Kustomize **selectively for static release/cluster overlays** when rendered-equivalence evidence justifies it. Keep dynamic per-slot stateful reconciliation in code. Retain Kind/Tilt; no default Terraform, Helm, Argo CD, Flux or hosted production assumptions.
4. One canonical image-build contract; dev/release profiles may legitimately differ. No assumption that all currently similar YAML can be mechanically deduplicated.
5. No infrastructure deployment changes solely to improve folder aesthetics. Make source ownership and operators' navigation clearer, avoid speculative libraries or global abstractions.

## Frozen behavior and migration proof

- Preserve live `kind-offscreen-dev` vs `kind-offscreen-lab` isolation and explicit context guards, and actual cluster/bootstrap scripts.
- Preserve v2 dev registry, environment IDs, default checkout mapping, PID/start-tick fencing, port bundles, session/receipt roots, selected-runtime freshness and park/refusal semantics. Registries, secrets and per-machine leases stay outside Git.
- Preserve Kubernetes namespace/resource identities, owner labels, PVCs, SQL roles and grants, S3 bucket/key isolation, Temporal namespace IDs/retention, security contexts, auth/cookie settings and network boundaries.
- Preserve release build pins, migration order, image digest selection, watches, Kind node-load logic and no-emit-on-error behavior.
- Baseline before moves: exported/imported symbol and path/caller map (JS, TS, shell, Tilt, package scripts, docs, tests); rendered YAML normalized comparisons; manifest graph and exact resource names/UID expectations; image fingerprint/digest comparisons; root CLI outputs; focused tests including negative ownership/refusal cases.
- After each step: compare source behavior and generated manifests, run focused positive/negative tests; do not automatically run destructive live tests. Separate authorized dev-only integration acceptance from any release proof.
- No `git mv` wave until dependencies, generated imports and existing in-flight Changes have been fenced. Avoid altering the active DXK09 worktree or the two unrelated primary checkout edits.

## Planned Change DAG and scheduling

| Order | Packet | Outcome | Earliest promotion |
| --- | --- | --- | --- |
| 1 | [INF01](2026-11-23--inf01-infra-ownership-map/CHANGE.md) | Canonical ownership/entrypoint map, classified legacy files and move matrix | After DXK09 stable; may plan earlier read-only |
| 2 | [INF02](2026-11-23--inf02-dev-environment-manager-boundary/CHANGE.md) | One-way dev CLI/application/adapters boundary, persisted behavior unchanged | INF01 source-map + DXK09 lifecycle acceptance |
| 3 | [INF03](2026-11-23--inf03-application-workload-layout/CHANGE.md) | Manifest ownership, release/dev profile equivalence, optional Kustomize | INF01 and path freeze; serialize any INF02 shared renderers |
| 4 | [INF04](2026-11-23--inf04-image-and-tilt-ownership/CHANGE.md) | Canonical image builder, dev sync and receipt locations | INF02/INF03 interface decisions settled; no overlapping live DXK09 work |
| 5 | [INF05](2026-11-23--inf05-platform-and-verification-separation/CHANGE.md) | Split installed platform services from operational experiments and classify/retire fixtures | INF01 inventory + reconciled paths from INF02–04 |

INF03 and INF04 can be further divided into source-disjoint tasks **only after** actual caller graph and image ownership prove no collision. No parallel migration of shared Tilt/renderer/build files. Integrate one packet at a time with clear custodian. HR01–HR03 retain priority; do not silently add these to `work/QUEUE.md` or current undertaking dispatch. Each packet is **PROPOSED, not Cursor-ready**; at promotion recheck actual HEAD, write exact source/file/function edit map, proofs and bounded T-IDs, and perform independent readiness review.

## Retirement

When accepted architecture is reflected in canonical `infra/README.md` / relevant technical docs and all selected Changes are either closed or explicitly deferred, replace this temporary planning file with a concise backlog/ledger pointer and rely on Git history for rationale.