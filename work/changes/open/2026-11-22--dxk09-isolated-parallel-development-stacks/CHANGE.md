# DXK09 | Elastic, isolated developer environments for concurrent worktrees

**State:** PLANNER HOLD, not Cursor-ready. Architecture direction selected; source-level provisioning, OAuth, resource measurement and readiness review remain required. **Owner:** developer infrastructure. **Integration:** `undertaking/storyteller-workshop`. **Original inspected baseline:** `62c930a2`; **2026-11-22 reconciliation baseline:** `752ed422`. **Kind:** development infrastructure, not gameplay, release acceptance, or provider billing.

## Outcome and actual demand

A developer may have *any number of Git worktrees* and independently start live development runtimes for as many as the machine can safely support. **Four concurrent full application runtimes are the current minimum acceptance workload, not a configured ceiling.** Adding a fifth, tenth or later worktree must not require extending slot enums, manifests, port tables, command switches or hardcoded resource names. No guarantee of arbitrary concurrent capacity: resource availability, platform name/port ranges and provider configuration remain finite and observable.

The system must minimize routine infrastructure attention. `pnpm dev` in an eligible worktree should attach to its own running environment or allocate a new one, state readiness, and present that worktree's addresses; a safe stop must affect only that environment and retain its durable data. Local/unit tests must not require Kubernetes.

## Topology decision

- Keep existing `kind-offscreen-lab` and release acceptance scripts isolated and unchanged. Release/cold-image checks and disruptive fault campaigns do **not** run against dev workloads.
- Prefer **one independently provisioned `kind-offscreen-dev`** with shared PostgreSQL, Temporal server, S3-compatible storage and networking, plus a variable number of *tenant-isolated application stacks*. Do not run one heavy infrastructure cluster per worktree.
- Each allocated slot gets its own Kubernetes namespace, six available application roles (web, API, Game Authority, control, executor, relay), PostgreSQL **database and least-privilege login**, **distinct object bucket and scoped credentials**, Temporal namespace and task queues, signing/token secrets, source sync identity, build/image identity, logs, and loopback endpoint set. A slot can start selected roles when its test contract allows it; missing roles must never route to another slot. Full-stack mode must remain available to every admitted slot.
- A slot is a persistent opaque identity **allocated at runtime**, not a fixed `s01..s04` enum, branch-name hash or globally shared PID. Prefer short monotonically allocated or randomly generated collision-checked IDs; names derive from a validated DNS-safe, bounded encoding. The worktree's canonical path is its owner association, not its slot identifier. Renaming a branch doesn't transfer ownership or erase data.
- Per-slot ports are leased from validated loopback ranges, by availability and exclusive ownership, not preassigned from a table. An exhausted range or conflicting listener yields explicit capacity refusal; no port stealing. Persist the assigned endpoints across safe restarts where feasible.
- Resource capacity is checked using **measured host/cluster memory, CPU and disk** plus declared reservations and headroom. Admission is per requested service profile. Four simultaneous full-stack slots **must be tested**; if the workstation cannot run four, report the measured deficit and optimize/share immutable build assets, change profile, or add capacity. Never quietly lower the requirement to two or bake four into the allocator. Fifth and tenth identities must work whenever resources permit; no arbitrary slot-count limit.
- Shared servers are an accident-prevention tenancy boundary, not hostile-tenant security; deny cross-slot SQL/S3 access using actual scoped principals and prevent workers from polling other Temporal namespaces. Do not describe namespace-only separation as sufficient.

## Developer ergonomics and runtime correctness

- Preserve the existing DXK08 single-stack path until the new route passes compatibility proof. One source-of-truth workspace dependency graph should drive affected builds and live sync; no copied per-slot Tiltfiles or blindly substituted YAML.
- **Repair clean-build and pnpm Docker-context failures first.** The `apps/api/node_modules/@better-auth/drizzle-adapter` failure and previous in-pod TypeScript OOM are concrete constraints, not evidence that the new design works. No manual compiled JS edits in Pods as an accepted development path.
- A source update is not ready until the affected compile succeeds, the running process loads the intended output and its health probe passes. Expose a small per-process/runtime receipt containing worktree identity, source HEAD/dirty fingerprint, artifact fingerprint and start/reload generation. A compilation error must not be masked by an old healthy process.
- Normal workflow: `pnpm dev` starts/attaches to the current worktree's slot; `pnpm dev:status` reports services, URLs, source/runtime identity and resource use; `pnpm dev:stop` stops only owned processes/Pods and **preserves SQL/S3/Temporal data**. These are desired interfaces, not claims of implemented commands. Explicit reset/destroy is a separate owner-approved operation with scope confirmation. Avoid a general-purpose orchestration daemon.
- Four worktrees must be able to build/test concurrently without interfering, and tests should select the cheapest truthful tier: local pure tests, disposable SQL integration, selected services, or full Kubernetes. Release-level validation stays in the release lab.

## Critical boundaries

- One scoped source worktree per Tilt/controller; its edit cannot sync another's Pods or overwrite another's image tag. Use native Tilt, Turbo, pnpm and Kind primitives rather than inventing a second dependency graph.
- Every mutating operation validates **cluster context, target namespace, worktree-slot binding and resource labels**. An existing foreign resource or owner mismatch is a refusal, not an invitation to kill a process. Prevent cross-slot image and port collisions.
- No automatic destruction on a failed build, lease recovery, or startup. Failed partial provisioning must be idempotently recoverable and must not silently adopt another tenant's data or secrets.
- Per-slot Better Auth app origin, session data and signing secret are mandatory. A concrete multi-origin GitHub OAuth callback solution must be designed and verified before claiming authenticated-browser readiness; do not add a generic auth bypass or reuse the release lab's credentials.
- Provisioning must be independently source-grounded for CNPG database creation/grants, object store bucket+scoped-key generation, Temporal namespace registration, K8s deployment rendering, and host capacity. The existing release-pinned installers are **not safe generic provisioners**.

## Proof and readiness

See [EXECUTION.md](EXECUTION.md), [SOURCE-MAP.md](SOURCE-MAP.md), [TASKS.md](TASKS.md), [PROOF.md](PROOF.md).

**Four simultaneous full-stack worktrees are the acceptance baseline.** Add a fifth and tenth *identity/tenant* in pure and disposable provisioning tests to prove no encoded four-slot ceiling. Provision/live-run a fifth or tenth only if host capacity measurements permit, never as a reason to overcommit the host. Prove no cross-slot SQL, bucket, Temporal, Tilt or image interference; a change to A must not rebuild/restart B. Prove clean build, real process-loaded runtime update, restart persistence, non-destructive stop, wrong-context refusal and measured edit-to-ready latency against the stabilized DXK08 baseline.

**PLANNER HOLD:** No Cursor implementation until the source-level provisioning and OAuth algorithms are decided, host capacity is sampled, and independent packet readiness review passes. This planning rewrite changes no infrastructure or active processes.
