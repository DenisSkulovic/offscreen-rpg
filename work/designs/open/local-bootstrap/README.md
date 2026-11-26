# Fresh-clone local bootstrap

Status: open, lightweight evolutionary design. Baseline: main a81e275821496e478ba55ae3dce5e72cf63d5dfd (2026-11-26). Owner explicitly requested no independent committee for this narrow operator-experience increment. This is not a platform architecture replacement or implementation commission. Next decision/review: 2026-11-26, owner walkthrough of command surface and exact source mapping before implementation.

## Outcome

A human or coding agent starting with a fresh clone can prepare the supported workstation, create two independent Kind clusters, install selected backing services, and launch an owned dev environment using a short documented sequence. No universal setup orchestrator. Each step has its own scope, bounded completion predicate and recovery instructions. Source-only developers need no clusters. Release application deployment is optional and separate.

## Existing owners (source inspected)

- Root package.json: Node >=24.19.0 <25, pnpm 11.19.0; existing infra:plan/up/status/verify and dev/stack lifecycle aliases.
- infra/clusters/kind/{dev,release}/kind.yaml: one control plane and one worker each, kindest/node:v1.37.0, loopback API; release port 6443, development dynamically selected.
- infra/clusters/kind/manager/dev-cli.mjs: plan/status/ensure, live ensure authorization and injected-probe refusal. Release up.sh: create-only, storage readiness and foreign-context/volume guards.
- infra/environments/infra-cli.mjs: existing cluster ensure + selected platform ensure; keep existing contracts and output modes.
- docs/runbooks/local-development-platform.md, local-development.md and docs/technical/platform/infrastructure-operator-experience.md: existing operator contracts, not all live-proven.
- Do not replace service installers, image ownership, slot registry or tenant boundaries. Existing Kubernetes-first design remains authoritative for those areas.

## Target interface (proposed unless marked existing)

| Step | Command | Completion |
| --- | --- | --- |
| 1 | bash infra/host/check.sh | Detect host, architecture, tools, Docker reachability, supported path and missing prerequisites |
| 2 | bash infra/host/setup.sh | Prepare supported CLI tools; report manual prerequisites and stop if blocked |
| 3 | pnpm install --frozen-lockfile (existing) | Workspace dependencies installed |
| 4 | pnpm infra:cluster:create --env dev | Owned dev foundation ready |
| 5 | pnpm infra:cluster:create --env release | Owned release foundation ready |
| 6 | pnpm infra:up --env dev --services core --human (existing) | Selected dev services ready |
| 7 | pnpm infra:up --env release --services core --human (existing) | Selected release services ready |
| 8 | pnpm infra:verify --suite diagnostic (existing) | Diagnostic receipt; not automatically full protocol acceptance |
| 9 | Documented local configuration recipe | Required local inputs available without revealing secrets |
| 10 | pnpm dev (existing) | Owned slot launched; readiness observed separately |

Steps 4–5 may be skipped when using existing infra:up cluster ensure convenience. Optional Redis, RabbitMQ, observability and release image build/stack:up have separate recipes. Do not claim a service supported or live-proven merely because a command exists. Keep existing per-service gates.

## Host boundary

Proposed infra/host/{README.md,check.sh,setup.sh,windows-wsl/,linux/README.md,macos/README.md,tests/}. Bash entrypoints must work before Node/pnpm exist. Detect WSL before native Linux; initial supported profile Ubuntu 24.04 on WSL2 x86-64 with Docker Desktop integration. Native Linux and macOS (including ARM64) explicitly NOT_IMPLEMENTED for setup; detection/check may report facts but setup refuses before writes. Native Windows shell directs operator to WSL. Do not install Docker Desktop or modify Windows/WSL configuration automatically; document prerequisites. No silent sudo, remote pipe-to-shell, global version replacement, or automatic destructive repair. Reuse compatible installed tools; wrong versions report actionable instructions. Resolve pin ownership before adding any lock manifest; do not duplicate authoritative versions. Separate host OS checks from portable Kubernetes logic. WSL Linux filesystem recommended; verify actual Docker engine context and capacity, not just executable presence.

## Command guarantees

Read-only check/status/help; explicit mutation scope; stable exit semantics; no foreign context mutation or implicit deletion. Compatible existing foundations should be reused only after identity/readiness validation; partial or unknown state is reported, not automatically repaired. Preserve lower-level release create-only and dev authorization semantics; public wrapper may select safe reuse or invoke existing guarded create. Cluster foundation includes node readiness, DNS/networking and storage readiness appropriate to profile; establish actual predicates before implementation, do not invent parity. Human concise phase output, machine JSON where existing contract supports it, no raw secrets. Bounded deadlines and clear next command; no automatic retry loops. Preserve current CLI callers.

## Lightweight self-check

Alternatives: single mega-installer (rejected: mixes privilege and failure domains); three independent OS-specific platform trees (rejected: duplicates Kubernetes ownership); documentation only (insufficient if host checks and standalone foundation entrypoints are missing). Selected direction is thin host adapters plus existing lifecycle primitives and a canonical runbook. Counterexamples: missing pnpm cannot block host checks; unsupported OS cannot mutate; existing foreign cluster cannot be adopted; failed platform ensure cannot imply rollback; optional service failure cannot be hidden by core success. Scope deliberately excludes new service architecture, hosted deployment, automatic host privilege escalation and generalized recovery.

## Acceptance

Focused source fixtures: OS detection and unsupported no-write behavior; missing/wrong tools; Docker unavailable/foreign context; help and malformed flags; cluster absent/compatible/foreign/partial/unreadable cases using fake runners; preserve current CLI contracts. Human/ChatGPT heavy proof: record exact tested SHA; verify zero Kind clusters, Docker images/volumes and stale registry state; run documented WSL path in order, record phase outcomes and timings; verify both cluster foundations and selected services using existing service-specific protocol checks; repeat safe ensure and observe no destructive changes; launch/observe/park one owned dev slot without paid model calls. Stop on first unexpected failure, retain evidence, fix source then repeat affected proof. Release application and optional services only under their existing separate authorization and acceptance scopes. Native Linux/macOS live proof NOT RUN / NOT IMPLEMENTED. Fresh-clone test must use a separate checkout without inherited .env or build receipts; host-tool installation proof on a genuinely unprepared host is separate from current Docker-empty workstation proof.

## Remaining before implementation

Inspect exact existing host tool/pin owners, dev bootstrap foundation predicates and infra:up call sites; choose precise wrapper behavior and setup installation policy. Check current main drift and reconcile canonical runbook/technical contract before commissioning a bounded Change. No implementation or live provisioning performed by this design commit.
