# DXK08 | bounded implementation tasks

## T01 | Split developer orchestration from release orchestration

Inspect current `Tiltfile`, `dev-tilt.mjs`, release build scripts and package dev commands. Introduce an explicit dev resource graph while retaining a separately invokable release-verification graph. Remove the current "all apps -> rebuild all release images" behavior from normal `pnpm dev`.

Proof: static/config tests show dev and release modes are distinct; release path still references immutable app-release builders.

## T02 | Fast web development

Implement the selected Next development path. Preferred: dev Pod/image + source sync + `next dev` + Fast Refresh. Keep the stable loopback browser origin and real API/auth boundary.

Proof: modify a visible component/string, observe it in browser without a production web image rebuild, record elapsed time. Negative: lockfile/Dockerfile/build-config change forces a rebuild path.

## T03 | Targeted API / GA / worker updates

Give API, Game Authority and worker resources independent Tilt dependency/update behavior. Use sync/restart/watch only where runtime consistency is preserved.

Proof: one source edit per service updates only that workload. Negative: generated contracts/schema/workspace-dependency changes refuse or promote to safe rebuild.

## T04 | Developer ergonomics and release regression

Run `pnpm dev` against the owned dev stack, verify real auth/SQL/S3/Temporal/GA integration remains available, record representative timings, and separately run the narrow release verification needed to prove dev tooling did not contaminate immutable release behavior.

Then reconcile docs/ledger, close/archive, merge to current main, and stop.
