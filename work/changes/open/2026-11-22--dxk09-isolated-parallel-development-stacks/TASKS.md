# DXK09 | Bounded implementation route, subject to planner readiness

**Status: PLANNER HOLD.** Baseline `undertaking/storyteller-workshop@752ed422`; recheck HEAD, source and concurrent changes at commissioning. The runtime objective is *elastic slot allocation*, not four statically provisioned environments. Current acceptance workload: four full-stack worktrees simultaneously. Tests must explicitly reject any encoded slot-count ceiling.

**Execution:** one DXK09 parent in a dedicated change worktree, sequential bounded child tasks, small focused receipts. No release-lab mutations, paid providers, destructive cluster resets, or speculative architecture changes. Relevant source owner paths below are anchors, not authority to invent missing provisioning mechanisms.

## T01 | Clean build/runtime foundation (planner source check required)
**Read:** `infra/kubernetes/lab/dev/Dockerfile`, `infra/kubernetes/lab/dev/Tiltfile`, `dev-sync-paths.mjs`, `scripts/repo-tools/dev-tilt.mjs`, workspace build scripts.
**Write:** bounded build/sync/test owners selected after current DXK08 fixes are reconciled; avoid simultaneous edits by a separate DXK08 owner.
**Contract:** clean pnpm Docker build succeeds from fresh checkout, specific node_modules/symlink regression reproduced and fixed, changed TypeScript yields successful compiled output and new process-loaded runtime receipt, failures mark stale. A build must not silently pass using old JS.
**Proof:** positive fresh build + one changed library dependency reloaded; negative compile failure doesn't advertise new code READY.
**Stop:** architectural contradiction in build closure or concurrent ownership.

## T02 | Dynamic slot registry and ports (pure implementation after readiness)
**Read:** `scripts/repo-tools/dev-tilt.mjs`, `dev-tilt.test.mjs`, `EXECUTION.md`.
**Write:** new dev-only slot identity/registry and focused tests under `scripts/repo-tools/`.
**Contract:** canonical worktree path binds to stable opaque ID; atomic allocation and loopback port bundle; no four-slot enums/tables, range exhaustion correctly reported; stale owner cannot be reclaimed from PID alone; idempotent restart reuses tenant identity.
**Proof:** allocate 1..10 and 100 synthetic identities without changing source config, stop/restart and collisions; foreign port/owner refusal; no Kubernetes calls.
**Stop:** unable to verify process/resource ownership without dangerous guessing.

## T03 | Dev-only bootstrap and backing tenants (PLANNER BLOCKER)
**Read:** `infra/kubernetes/lab/{lib.sh,cnpg/install.sh,temporal/install.sh}`, S3 bootstrap and client/config owners, `SOURCE-MAP.md`.
**Write:** dev-only bootstrap/tenant provisioner and focused tests; **never modify release-pinned scripts to weaken target checks**.
**Contract:** existing release lab unaffected; idempotent per-ID DB+least privilege login, unique bucket+scoped key, Temporal namespace+queues; any admission failure leaves another tenant unchanged.
**Proof:** two tenants independently migrate/read/write; credential A denied on database and bucket B; wrong context refused pre-mutation; temporary failures recover without deleting state.
**Stop:** concrete DB/S3/Temporal provisioning commands or scoped privileges not yet ratified by planner.

## T04 | Structured app graph, roles, OAuth (PLANNER BLOCKER)
**Read:** `infra/kubernetes/lab/dev/{Tiltfile,web.yaml,api.yaml,authority.yaml,workers.yaml}`, `apps/api/src/modules/auth/config.ts`.
**Write:** one source graph plus slot-specific generated config outside tracked tree; no replicated per-slot YAML/Tiltfiles.
**Contract:** same-namespace service routes, scoped secrets and per-tenant env, dynamic slot image names, distinct app origin; partial service profiles fail rather than route elsewhere; no bypass of auth.
**Proof:** identical source graph renders two different slot identities; fifth/tenth rendering needs zero code changes; real OAuth sign-in where configured; missing callback cannot show auth READY; stale cross-slot reference rejected.
**Stop:** unresolved OAuth strategy, cross-namespace app endpoints or production security implication.

## T05 | Worktree-relative dev launcher and live updates
**Read:** `scripts/repo-tools/dev-tilt.mjs`, `infra/kubernetes/lab/dev/{Tiltfile,dev-sync-paths.mjs,tilt/load-dev-image.sh}`.
**Write:** slot-aware dev launcher, Tilt adapter, tests, docs.
**Contract:** simple `pnpm dev` / `pnpm dev:status` / `pnpm dev:stop` behavior; each slot watches its own canonical worktree, imports only into dev nodes, never changes release cluster; affected edits rebuild/reload only affected slot.
**Proof:** editing A API changes only A runtime; B build, Pods, image identity and state unchanged; stop A preserves tenants and B; failure/rollback does not kill healthy worktree.
**Stop:** any cross-slot resource mutation, source-only reload claims or unrelated workspace rebuild.

## T06 | Concurrent capacity, proof and documentation
**Read:** `PROOF.md`, launcher, render and provisioner sources, `docs/runbooks/local-development.md`.
**Write:** focused proof/evidence, user runbook and reconciliation; do not archive without all gates.
**Contract:** four genuinely simultaneous full-stack worktrees, independent authenticated provider-free stories, per-slot SQL/S3/Temporal and source/runtime fingerprints, measured RAM/CPU/disk, isolated rebuild/restart, negative credentials/mutation tests. Fifth/tenth identity accepted in allocator/provisioner; live fifth/tenth admitted when resources permit.
**Proof:** compare against stabilized DXK08 edit-to-running-code and clean rebuild baselines; cross-tenant denial, restart and safe stop, no release mutation; capacity exhaustion refuses cleanly without provisioning half a slot.
**Stop:** four full stacks cannot fit; report actual measurements and optimize or propose extra capacity without silently reducing the requirement.

**No task may be commissioned merely because this document provides its outline.** Complete the source-specific readiness gate first. One integrator merges back to `undertaking/storyteller-workshop` and archives only after all mandatory checks genuinely pass.
