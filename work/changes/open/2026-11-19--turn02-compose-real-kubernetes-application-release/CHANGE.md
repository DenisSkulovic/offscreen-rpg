# TURN02 | Compose one reproducible Kubernetes release for real application services

**State:** Proposed, dependency gated (2026-11-19)  
**Kind:** implementation  
**Execution:** Not in the active Cursor batch; owner or authorized orchestrator must select this Change separately.  
**Program:** [D5 full release and acceptance](../../../designs/open/distributed-turn-poc/D5-RELEASE-AND-ACCEPTANCE.md) · [DISTURN](../../../designs/open/distributed-turn-poc/README.md) · [GAPS](../../../designs/open/distributed-turn-poc/GAPS.md)

## Precisely bounded outcome

Compose one reproducible Kubernetes release for real application services. This Change exists to join the previously planned bounded slices, not to reimplement them under new names.

**Prerequisites:** K8S01–09 required substrate, K8S11 web/API ingress work, DIST03/04/05 real service entrypoints, BOOT02 content import job, DATA05 S3 wiring, STORY03 worker queues, TURN01 acceptance environment; recheck actual K8S implementation at selection.

## Source-based implementation / documentation work

Create/reconcile one lab release profile using existing infra/kubernetes/lab/ and existing K8S8/9/11 manifests where already available. Build/load pinned images for Next, Nest, Game Authority, outbox relay, Rabbit→Temporal bridge, Temporal control and separate Storyteller worker. Configure one migration Job, S3 package-import Job, least-privilege Secrets/service credentials, single public origin, internal DNS, readiness/startup, resource limits and deterministic fake provider default. Surface cluster-wide dependency health and a non-destructive down/cleanup preserving unrelated Compose data. Do not duplicate service skeleton manifests or add a second setup framework. Under WSL memory pressure choose a reproducible reduced local profile, not invented HA. Add a dry-run/service-DNS smoke and integration-run entrypoint for TURN03, not assert end-to-end game success in this packet.

**Owned source and canonical documents:** infra/kubernetes/lab/ overlays and scripts, existing app image/build definitions, necessary env/bootstrap configuration, docs/runbooks/kubernetes-lab.md and actual deployment/compatibility technical owner, no new product mechanics.

**Preserve existing source responsibilities:** `apps/web` Next SSR/React + client SSE, `apps/api` Nest authenticated HTTP, `packages/application` existing admitted commands, `packages/documents` immutable local/S3 formats, `packages/db` SQL authority and outbox, `packages/workflows` Temporal workflows, `packages/storyteller` bounded validated DM tasks. Do not duplicate these modules merely to make a new harness. All source files and migrations must be rechecked at latest HEAD before implementation; current repo state may have changed on Cursor branches.

## Acceptance / negative proofs

Fresh kind after safe teardown → migrations once → pinned package import → real app Pods ready, Next SSR/Nest authenticated /api path, Rabbit→Temporal connection, shared S3 exact read across distinct workloads, explicit readiness and measured memory. Unauthorized public GA endpoint absent. No plain-text secrets, Pod-local fallback, duplicate migration runner, shared namespace collision or false HA claim.

No Pod Ready, mocked adapter-only test or local Compose smoke may be represented as a complete kind E2E unless the source and command logs demonstrate it. Report exact commands, IDs, state and object hashes, source commit/image digests, integration status and not-run tests.

## Parallel scheduling and collision control

Research/image builds parallel with source-independent DATA/STORY implementation, but live cluster operations and Gateway/Helm/root manifests have one integrator. Coordinate existing K8S08/K8S11/BOOT02/DATA05 ownership, avoid double implementation.

Shared SQL migration sequences, Kubernetes Gateway, canonical docs and final acceptance fixtures require a single integration owner. Worktrees isolate independent research/builds, not override prerequisites. No automatic successor; Proposed means not authorized.

## Out of scope

Image generation, live multiplayer, Stripe/subscription billing, production customer usage reconciliation, Cognee/vector/graph adoption, arbitrary Code Mode, full ruleset implementation, paid provider access except when TURN04 is individually authorized, cloud HA and full chaos/load program. The complete fake POC **includes** historically forkable scenes and source-faithful canonical state; do not relax this to “two passages displayed”.

## planned-impact.v1

| Plane | Intended owner and effect | Closure requirement |
| --- | --- | --- |
| Product | Existing text-first D&D DM, scene history and branchable fork acceptance; no new gameplay | Source-faithful criteria, no economy or image requirement |
| Technical | Validated cross-runtime ownership, release and explicit POC evidence under existing technical owners | Exact normal/negative contract and runtime facts |
| Code | Bounded deployment/test/provider work described above, not a parallel rewrite of existing implementation Changes | Source tests, integration evidence and no silent skipped gates |
| Related | Queue pointers, operations runbook, evidence/STATUS and reconciled authoritative docs | Wiki/link guards and truthful status |

## Reconciliation ledger (complete before Done)

| Claim / document | Delta or no-op | Source SHA and diff | Positive evidence | Negative evidence | Link/status |
| --- | --- | --- | --- | --- | --- |
| Product acceptance | unchanged | Pending | Pending | Pending | Pending |
| Runtime and service owners | review/reconcile | Pending | Pending | Pending | Pending |
| Data/Storyteller/fork | review/reconcile | Pending | Pending | Pending | Pending |
| Test/runbook/status | actual executable run | Pending | Pending | Pending | Pending |

Complete ledger, run `pnpm wiki:change-guard --mode plan` and `--mode close` where supported, archive only actual results, and repair inbound links. No automatic next Change.
