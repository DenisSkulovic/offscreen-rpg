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
| 4 | node infra/environments/infra-cli.mjs up --env dev --services none --human | Owned dev foundation ready |
| 5 | node infra/environments/infra-cli.mjs up --env release --services none --human | Owned release foundation ready |
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

## R2: source and workstation findings (2026-11-26)

Owner-operated WSL specimen: Ubuntu 24.04.5 x86-64, WSL2, Docker Desktop 29.9.3, 12 CPUs, 19 GiB RAM / 15 GiB available; Node 24.19.0 and pnpm 11.19.0 via mise, Kind 0.33.0, kubectl 1.37.2, Helm 3.22.1, Tilt 0.35.2, Python 3.12.3 and PyYAML 6.0.1. These are observed reference versions, not universal compatibility claims. WSL filesystem capacity is not Windows physical free space.

Use existing .node-version and package.json packageManager as host Node/pnpm version owners; infra/images/common/toolchain.pin owns container image digest and must agree on versions, not be repurposed as a host installer manifest. Kind/kubectl/Docker reference versions are documented in docs/runbooks/kubernetes-lab.md; other observed tools are reference values pending exact compatibility checks. Initial host setup is conservative: Ubuntu package prerequisites via explicitly approved package manager operation, missing pinned CLI binaries via documented official installation instructions, no automatic privileged mutation or replacement of installed version managers. check.sh is Bash-first; setup.sh dispatches and reports actionable missing prerequisites, and may prepare user-local tools only where download verification and exact source are established. Unsupported paths refuse before mutation. No requirement to adopt mise.

Reuse infra:up --services none, not new cluster aliases. Source infra/environments/infra-cli.mjs lines 690–768 confirms empty selection returns cluster-ready, but newly created path skips the common verify branch. Move the existing assertPlatformTarget, verifyClusterNodesReady, and release local-path verification after successful creation OR existing inventory, preserving error receipts and no implicit repair; focused tests must prove newly created bad foundation cannot return ready. Existing verifier checks node readiness, not full DNS/storage behavior; extend only when cold acceptance exposes need, and document separate foundation probes. Existing release storage guard remains. No claim that dev has equivalent storage provisioning.

Observed pnpm infra:plan triggered interactive modules reinstall (31.3s, 901 reused packages). Do not attribute cause without evidence. Prefer direct node entrypoints for infra plan/status/up in onboarding after explicit dependency install, retaining pnpm aliases for established workflows. The existing plan with none is a service-selection preview (no live observed, phases none), not a cluster creation plan. Document this explicitly; use status for observation. No new package-manager settings in this design.

Cold proof order: host check, explicit dependency install if needed, direct node status for both contexts, dev none, release none, explicit status, dev core, release core, service-specific proofs and repeat ensures. Optional services remain separate. No live creation yet.

## Remaining before implementation

Host tool/pin owners, cluster entrypoints and common verification gap inspected. Remaining: exact host check version predicates and official installation recipe verification, focused test anchors, and owner acceptance of the deliberately conservative setup policy. Check current main drift and reconcile canonical runbook/technical contract before commissioning a bounded Change. No implementation or live provisioning performed by this design commit.


## R3: Agent-operated bootstrap and hosted portability (2026-11-26)

Status: proposed design amendment, owner requested the review; not implementation commission. Integration main a81e275821496e478ba55ae3dce5e72cf63d5dfd; inspected in-flight implementation 093161ae04c13f0a5416e4f5dbf1fd75ac031511. R3 supersedes R1/R2 operator-interface proposals where inconsistent; retain historical evidence. Next review: after current cold acceptance, owner review of abstraction admission and source gaps. The prior narrow bootstrap committee waiver does not imply hosted architecture acceptance.

### R3.1 Selected objective and non-goals

Optimize for a fresh coding agent executing a deterministic documented procedure, not human typing effort or minimum command count. Local clusters are deployment targets, not the product architecture. Eventual hosted deployment is a mandatory design constraint; no AWS/GCP/Azure provisioning, provider SDK, Terraform module, generalized hosted admission, or production-readiness claim in this increment. No assumption that managed services are interchangeable. No changes to the active acceptance branch during its proof.

### R3.2 Abstraction admission

Encapsulate approximately 3–5 cohesive, stable operations with one reason to change. An abstraction is justified by elimination of repeated decisions or invariants, not fewer characters. Require explicit variable inputs; existing domain owner retains mutations, custody and readiness; bounded failure remains attributable; no new independent state machine. Reject wrappers that infer target, choose credentials, grant authorization, select destructive recovery, perform migration, silently install optional features, or translate unknown state into success. Do not impose a numeric command-count requirement.

| Node | Encapsulate | Expose / leave separate |
| --- | --- | --- |
| Workstation observation | OS detection, CLI presence, version policy, engine/resource checks | Supported OS, purpose, resource limits; no cloud runner dependence on Docker Desktop/Tilt |
| Workstation preparation | OS-specific stable package recipe, verified tool acquisition where selected, postcheck | Privilege escalation, Docker Desktop, existing toolchain replacement; no universal cross-OS installer |
| Workspace dependencies | Lockfile install, dependency resolution, toolchain consistency | Explicit install; no surprise dependency installation through lifecycle wrappers |
| Cluster creation | Provider-specific create, baseline identity, startup wait, postcondition | Provider/account/location, sizing, creation authority, deletion; hosted target can be supplied without creation |
| Target admission | Explicit target, identity/ownership, readiness, required API/storage capabilities | Provider-specific trust roots and credentials; no implicit current context, no weakened local guards |
| Service ensure (per service) | Artifact pin, render, guarded install/reuse, structural readiness | Service/provider selection, capacity, security policy, migration/recovery |
| Service batch | Fixed catalog order, preflight, dispatch, stop and skipped-phase receipt | Dependency/authority boundaries, selected set; no dynamic DAG or additional persistence |
| Service binding | Endpoint, credential reference, protocol settings, validation | Tenant authority, TLS policy, service implementation capability differences |
| Workload deployment | Image reference, bindings, rendering, rollout observation | Local Tilt sync and build/load, cloud registry/promotion, release and paid-call authorization |
| Proof | Select target and cases, bounded probe, assert, structured evidence | Source vs runtime, destructive/disruptive authorization, retained uncertain fixtures |

### R3.3 Local operational specimen (existing commands, not new aliases)

Canonical owner docs/runbooks/fresh-clone-bootstrap.md, discoverable from root README and agent entrypoints. One normative procedure per purpose, no need to read implementation for a successful normal path. Starting with an already prepared supported host, use:
1. bash infra/host/check.sh; if blocked, follow the exact reported OS recipe, then repeat. setup.sh --install-system-packages is separately privileged. No automatic sudo or tool replacement.
2. pnpm install --frozen-lockfile.
3. node infra/environments/infra-cli.mjs up --env dev --services none --json.
4. After explicit owner maintenance authorization and quiescence, OFFSCREEN_POSTGRES_MAINTENANCE=authorized node infra/environments/infra-cli.mjs up --env dev --services postgres --json. Never export the grant for subsequent operations or self-authorize.
5. node infra/environments/infra-cli.mjs up --env dev --services core --json.
6. Optional explicitly selected services only; e.g. --services redis,rabbitmq for dev, subject to existing service gates. No all alias in canonical recipe.
7. node infra/environments/infra-cli.mjs status --env dev --services core --json; require exact selection, present target and every selected state installed, not merely exit zero. Verify explicitly selected extras likewise. This assertion is a candidate for a small reusable read-only selected-status check in existing CLI, not a new orchestrator.
8. Follow the owned dev-slot configuration and admission contract; pnpm dev, pnpm dev:status, pnpm dev:stop as appropriate. Do not copy secrets, launch foreign slots or authorize paid calls.
Release is a separately selected local purpose, not required for ordinary development. Equivalent explicit release sequence, core includes gateway; release RabbitMQ and legacy observability excluded from this acceptance. Do not invent aliases for cluster:up/platform:up; existing infra:up already combines cluster ensure and service selection. Keep separate foundation operation for proof or explicit foundation-only task. A later combined ordinary core call is permissible only when the same explicit authority and prerequisite checks are preserved. No need to make routine installation rerun full acceptance or diagnostic suites.

Failure contract: read-only plan is service-selection preview, not live plan; status can return ok while services are absent/unreadable; inspect exact states. On nonzero ensure or unknown mutation, stop, preserve evidence, report target/phase/reason/known mutation/skipped steps. Do not retry or reset automatically. Re-observation is permitted read-only. Owner decides recovery. Structured allowlisted reason codes preferred over arbitrary stdout/stderr; avoid credential bytes, environment dumps, raw kubeconfig and sensitive child output. Unknown is not absent. No rollback promise.

### R3.4 Deployment dimensions and target boundaries

Separate deployment purpose (development/test/staging/production), infrastructure target (local Kind or supplied hosted Kubernetes), and service implementation (self-managed, managed or external). Existing dev/release are local profiles, not cloud stages. Conceptual target specimen (not schema or API commitment):
- purpose: development; target: local-kind, profile dev; explicit context kind-offscreen-dev; local engine identity; local storage class standard.
- purpose: staging; target: supplied-hosted-kubernetes; explicit cluster/account/project/subscription and region identity, credential source and trust binding; storage/network capabilities declared by hosted target; independently selected service implementations and workload images.
The second specimen MUST currently refuse as unsupported. Never accept arbitrary kube context by relaxing existing loopback or Docker identity guards. Hosted adapter needs its own threat model, API authorization, credential handling (including exec plugins where independently justified), immutable target identity, tenancy, mutation and lock/custody policy; a context string is not sufficient evidence. Local flock is not distributed coordination. Local host capacity checks are not hosted cluster scheduling admission.

Prefer portable workload manifests and consumption contracts, with provider-specific overlays only for actual differences. Separate build from distribution: local Kind image import/Tilt live sync are not cloud runtime requirements. Cloud image registry, immutable artifact promotion, pull authorization and workload identity belong to future deployment design. Storage class, volume access, reclaim, backups, encryption and failure domains are explicit target/service policies; local-path and Docker mount identity proofs must never become hosted storage requirements. DNS names and namespaces are binding/target configuration, not hardcoded application semantics. Gateway TLS/DNS/load balancer and network policy vary by deployment. Do not infer production durability, HA, scaling, tenancy, secret rotation, backup/restore, migration, disaster recovery, SLOs or costs from successful Kind installation.

Service replacement examples are hypotheses only: CNPG vs managed PostgreSQL; SeaweedFS vs AWS S3; Redis vs managed Redis-compatible service; self-hosted vs hosted Temporal; RabbitMQ operator vs managed broker; Traefik vs alternative Gateway implementation; OTLP collector/backends vs hosted observability. Each requires a specific protocol, auth, TLS, error/retry, durability, transaction and operational compatibility audit appropriate to its workload; no universal least-common-denominator service interface. No GCP/Azure object-storage equivalence claim. Bindings expose required capabilities and references, never provisioning internals or raw secret values. Provider-specific admin tasks (database creation, ACLs, bucket grants, queue policy, Temporal namespace) are not generic application connection setup.

### R3.5 Source gap map (inspected change baseline)

| Finding | Source anchor | Disposition |
| --- | --- | --- |
| Existing useful batch abstraction | infra/environments/platform-plan.mjs: parsePlatformServiceSelection, corePhases, runEnsurePreflight, runPlatformPlan | Retain fixed ordering and dispatch, stop on failure; do not create second orchestrator |
| Coupled cluster and platform lifecycle | infra/environments/infra-cli.mjs: runInfraUp | Keep local facade; future supplied target path must not call Kind inventory/create. Separate internal admission from provider create when a real caller requires it |
| Local profile coupling | infra/platform/common/profile.mjs: readPlatformProfile imports readKindProfile, hardcodes namespaces/storage/owner | Explicit seam; document now; separate target and purpose before adding hosted provider, not speculative generic provider registry now |
| Local trust/custody | infra/platform/common/commands.mjs: assertPlatformTarget, ensureReleaseOwnershipBaseline; local installer locks | Preserve all checks. Hosted trust and distributed coordination separately designed; no generic bypass |
| Host tooling | infra/host/check.sh, setup.sh | Bash-first appropriate locally; missing tools block; privileged package opt-in; no Node-before-host dependency; do not require workstation tools from cloud deployment |
| Status success ambiguous | infra/environments/infra-cli.mjs: runInfraStatus | Existing ok:true denotes observation completion, not readiness; retain compatibility; consider explicit strict read-only assertion instead of changing exit semantics silently |
| Receipt heterogeneity | infra/environments/platform-plan.mjs: runPlatformPlan | RabbitMQ typed result already retains mutation/state; other phases generic detail; audit safe normalized envelope before implementation, do not falsely assert no mutation; secret redaction review required |
| Existing portable binding specimen | infra/platform/object-storage/binding.mjs: validateObjectStorageBinding | Endpoint/region/bucket/path-style/secret reference or default-chain already separated; verify client integration and hosted semantics later, not proof of cloud support |
| Workload startup | package.json dev aliases; docs/runbooks/dev-worktree-stacks.md | Preserve ownership, Tilt, resource admission. No cloud dependency on dev registry; inspect release render/deployment separately |
| Verification | infra/verification/verify.mjs SOURCE_SUITE_DEFINITIONS and diagnostic import | Reuse existing proof owner; explicit selected-service non-disruptive proof entrypoint may be justified after exact catalog audit; no legacy observability dependency in bootstrap |

Full per-service cloud audit remains unperformed. Existing local-only constraints are intentional, not defects just because hosted support is future work. Source paths for object-storage README were not found; actual binding module inspected instead.

### R3.6 Verification and selection gates

Integration-critical for ergonomics increment: cold local acceptance on exact SHA; focused no-write/foreign/partial/unreadable negative tests; deterministic runbook from fresh worktree without inherited .env; supported host check; explicit maintenance grant; exact selected readiness assertion; owned app startup/park, no paid calls; no legacy observability. Record exact proof tier and outcomes. Current owner proof at 093161ae: 36/36 CLI tests, both fresh cluster foundations and both PostgreSQL installations succeeded; automatic ACL verification and remaining cold platform installation pending. Prior warm readiness 10/10 is historical, not this cold result.

Agent usability experiment: fresh Claude Code context, only repository and instruction to install local dev using canonical docs; authorized disposable target and scoped mutations, no source edits or improvised recovery. Record commands, decisions requiring external knowledge, human interventions, unknown-state handling, target/selection, results and cleanup. Targets: zero undocumented decisions, zero wrong-context/unauthorized operations, zero invented recovery commands, zero source inspection required on successful normal path. Do not count expected privilege/maintenance approvals as failures; count unexpected interventions. Separate negative scenario: simulated missing dependency and partial/unknown state must stop safely. No live experiment commissioned by this amendment.

Hosted readiness future gate: choose one actual provider and target before writing adapter; audit source dependencies by capability, then prove supplied-cluster admission, render portability, service bindings and scoped deployment on a separately authorized isolated target; provider costs, permissions and cleanup explicit. No hosted proof performed, no production certification. No universal multi-cloud installer. Prefer actual provider-native provisioning tools over reimplementing them; provider choice remains open.

### R3.7 Proposed sequencing after cold acceptance

A. Reconcile current runbook and actual commands/authority; make one discoverable agent procedure, separate routine installation from acceptance. B. Identify recurring multi-command checks with stable semantics (selected readiness assertion, non-disruptive proof receipt); only implement those with clear owner and tests. C. Run fresh-agent experiment, measure actual ambiguity before adding any further wrapper. D. When hosted work is selected, design target admission and binding migration from actual provider requirements before implementation; no local safety weakening. No new wrappers merely for shorter commands, no general-purpose orchestration framework, no parallel cloud implementation now.

Open decisions: whether selected-status assertion belongs in existing status mode or verification CLI (audit callers first); whether reusable non-disruptive proof selection already exists; exact cloud target and provider-specific architecture deferred; owner review after current cold proof. This is a design amendment, not a defense verdict, accepted permanent contract or implementation packet.
