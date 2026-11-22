# DXK09 | Selected execution algorithm: elastic worktree tenancy

**Status:** architecture intent only; source-specific provisioning/auth commands remain planner-held.

## Identity and allocation (no fixed slot ceiling)

1. Resolve the caller's canonical worktree realpath; confirm repo identity, current branch/HEAD and allowed user. Look up an existing worktree-to-slot binding in a small durable local registry (ignored or outside the repository). A same-worktree restart reuses the same slot and tenants.
2. For an unbound worktree, atomically reserve a new short, collision-checked, DNS-safe slot ID from an extensible namespace (e.g. `w1`, `w2`, …). **No enumerated `s01..s04`, four-entry port table or maximum-slot constant.** Enforce Kubernetes naming lengths and validate against existing cluster namespaces, database names, object buckets, Temporal namespaces and owned labels before applying.
3. Allocate a free port bundle for loopback web, API/authority if exposed, Tilt and any required callback from configured legal ranges. Reserve it atomically with the slot; check actual OS binds. Reusing an existing slot attempts to reclaim its same bundle safely; if unavailable, refuse or perform explicit rebind with updated auth/callback configuration.
4. Registry records stable slot ID, canonical worktree, cluster/namespace, assigned ports, owned process identity and resource fingerprints. Use an atomic file lock or OS-level exclusive creation, and K8s resource labels/UID checks before reconciling stale process records. This is a lightweight local registry, **not a new always-running coordinator**. A dead PID alone does not authorize deleting owned resources.
5. Admission evaluates requested workload profile, existing active slots, actual available memory/CPU/disk and reservations, leaving defined headroom. Return explicit `capacity-exhausted` with measurements; never silently send the worktree to the release cluster or another slot. Do not cap the number of identities when no workloads are running.

## Shared development cluster and backing tenants

- `kind-offscreen-dev` uses a distinct context, loopback API port and isolated container/storage resources; never mutate `kind-offscreen-lab`. Bootstrap the common infrastructure once via **dev-only audited provisioning**, not blindly by parameterizing release-pinned shell scripts.
- For slot `<id>`, derive bounded names (exact naming grammar must be source-checked) for namespace, DB/login, bucket, Temporal namespace, workload labels and image tags. Create a database with per-slot owner/least privilege and migrations scoped only to that database; do not give slot API credentials global CREATE DATABASE.
- Create a *unique bucket* and scoped S3 principal whose access to other buckets is rejected; don't rely on mere key prefixes. Create a separate Temporal namespace and scoped workers/task queues. Where server-side Temporal authorization isn't available, rely on isolated namespace configuration and test against miswired workers; do not claim that task queue naming is a cryptographic security boundary.
- Generate per-slot secrets without copying credentials from release or other slots. Provision idempotently, track resource ownership labels/fingerprints, and fail closed on partial mismatch. Stop leaves tenant data intact; destructive reset/destroy must have separately confirmed identity and scope.
- Keep app services in one dedicated namespace per slot with stable internal names and explicit same-namespace DNS; allow opt-in role profiles with no implicit cross-slot dependency fallback. No automatic cross-slot routing.

## Build and runtime

- Before multiplying environments, establish a clean DXK08 build and fix Docker context, pnpm symlinks and TypeScript watcher/compiled artifact consistency. Treat current `invalid file request ... node_modules` as a reproduction requirement.
- Reuse the existing workspace dependency closure from `select-affected-images.mjs` / `dev-sync-paths.mjs`. Render structured, typed manifest fields from one source template/config; **do not maintain N duplicate YAML or Tilt graphs**.
- Tilt is instantiated per slot with a unique watched canonical worktree root, own port/UI/state, resource namespace and slot-specific image tags/build ID. Kind image imports target the actual dev nodes and are serialized where necessary, not hardcoded release node names.
- For every affected edit, validate the compile, process reload/start and health check. Expose source HEAD + dirty fingerprint, build/artifact ID, runtime start generation. Tests collect these before and after. A source-sync event alone is never proof that running code changed.
- Detect dependency manifest, lockfile and other unsafe source changes and perform a bounded rebuild of only affected services in that slot; do not use a manual pod file-patch fallback. If compile fails, mark runtime stale/blocked rather than advertise source READY.

## Authentication and interfaces

- Public operator workflows should be worktree-relative (`pnpm dev`, `pnpm dev:status`, `pnpm dev:stop`), not manual `kubectl` sequences. The launcher owns registry/ports/identity and reports service profile, host utilization, source fingerprint, running fingerprint and URLs.
- A stable per-slot application origin must be compatible with Better Auth and configured GitHub OAuth redirects. Planner must select and test the actual callback model across varying numbers of slots; do not promise dynamic OAuth readiness from dynamic ports without provider compatibility evidence.
- Provider-free integration fixtures must not bypass application authorization. Any test-only identity route must have a separately decided explicitly scoped contract, not an ad hoc development backdoor.

## Work stages and integration

A. **Single-stack foundation:** clean build, pnpm/Tilt dependency closure, runtime receipt and automatic reload proof. Finish existing DXK08 recovery and distinguish release-only faults.

B. **Allocator/registry:** dynamic identity and port bundle, worktree binding, collision/stale-owner handling, capacity admission, pure negative tests for IDs 5/10/100 and port exhaustion. No cluster writes.

C. **Dev infrastructure:** isolated dev cluster bootstrap and audited tenant APIs. Verify SQL/S3/Temporal privileges with two independent tenants before application rollout; source and privilege model must be ratified before Cursor implementation.

D. **Per-slot application rendering:** one parameterized service graph, unique image identity, namespace/DNS/secrets/roles and authenticated origin; test both full and partial profiles without shared fallback.

E. **Concurrent proof:** run four simultaneous full stacks from distinct worktrees and show source/code, DB, S3, workflows, credentials and ports cannot interfere; run a fifth or tenth only when available capacity supports it. Compare measured edit-to-runtime and restart timings against baseline.

**Integration:** one dedicated Change worktree branched from current `undertaking/storyteller-workshop`, one owner of cluster provisioning/manifests/launcher, bounded task execution. Preserve release lab and all uncommitted work; no paid providers. This design has not been executed or capacity-tested.
