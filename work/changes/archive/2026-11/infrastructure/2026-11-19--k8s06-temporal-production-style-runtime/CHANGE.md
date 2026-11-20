# K8S06 | Temporal server deployment with independent workflow persistence and worker-loss drill

**State:** Done (2026-11-19)  
**Kind:** implementation  
**Approval and owner:** User endorsed Kubernetes + an eventual separately scalable, event-driven service architecture as an educational target. Cursor owns implementation **only when this specific Change is selected**; no blanket deployment authorization.  
**Parent:** [Distributed architecture lab queue](../../../../README.md)

## Cursor first-screen brief

> **Current-source map:** [Topological authority](../../../../../../docs/technical/platform/topology.md), [deployment contract](../../../../../../docs/technical/platform/deployment-and-compatibility.md), [documentation Change standard](../../../../../../.agents/references/change-work-unit-standard.md), reinspected at `66f82cac` before editing.
>
> **Primary governing contract:** The current implementation is a modular monolith with Temporal worker(s); the proposed distributed target is a deliberate educational evolution, not a description of working code. ARCH01 must first reconcile the canonical target.
>
> **Known trap:** Restarting server must not silently erase durable history; dev-mode Temporal must not be labeled production; workflow retries must not duplicate the external test side effect.
>
> **Scope/permission:** Infrastructure-only, on a local disposable lab after scope selection. No product code, payment calls or provider spend.

## Target alignment

- **Outcome:** A non-dev Temporal runtime for lab workflows, with persistence, observability of histories and a repeatable worker restart scenario, without altering game workflows.
- **Current-source baseline:** Reinspected at `66f82cac` on branch `change/k8s06-temporal`. K8S02 is merged. Compose still runs Temporal's development server for the game.
- **End-state relationship:** This is one independently reviewable slice of an explicitly staged distributed architecture laboratory; not a full service extraction.
- **Alternative considered:** Keep current Compose/modular monolith. It remains the safe fallback and existing development/test route; educational lab progression justifies an additional environment, not its immediate deletion.
- **Readiness:** Done. The disposable kind proof passed on this branch. No successor is selected.

## Outcome and motivation

A non-dev Temporal runtime for lab workflows, with persistence, observability of histories and a repeatable worker restart scenario, without altering game workflows.

## Authority and baseline

- **Product:** [Vision](../../../../../../docs/product/foundations/vision.md) and existing product invariants unchanged. No new player mechanics or feature promises.
- **Technical:** [Current topology](../../../../../../docs/technical/platform/topology.md), [delivery](../../../../../../docs/technical/platform/deployment-and-compatibility.md), [data](../../../../../../docs/technical/platform/data-and-persistence.md), [execution](../../../../../../docs/technical/platform/execution-and-delivery.md). Follow the reconciled target from ARCH01 and do not override established game authority contracts.
- **Evidence:** Current repo Compose has PostgreSQL, Redis, Temporal start-dev and Adobe S3Mock; no RabbitMQ or separately deployed game microservices. Machine preflight is provided by the owner in chat and must be rechecked locally.
- **Open decisions:** Capacity, production/high-availability guarantees, versions, secrets and destructive testing policy require local validation. No live provider billing.

## Exact scope and exclusions

- **Implementation/design:** Pin Temporal server 1.32.2, admin tools 1.32.2, and PostgreSQL 17.11 in `infra/kubernetes/lab/temporal/images.pin`, `infra/kubernetes/lab/temporal/namespace.yaml`, `infra/kubernetes/lab/temporal/postgres.yaml`, `infra/kubernetes/lab/temporal/server.yaml`, `infra/kubernetes/lab/temporal/admin.yaml`, `infra/kubernetes/lab/temporal/schema-job.yaml`, `infra/kubernetes/lab/temporal/namespace-job.yaml`, `infra/kubernetes/lab/temporal/worker.yaml`, `infra/kubernetes/lab/temporal/start-job.yaml`, `infra/kubernetes/lab/temporal/install.sh`, and `infra/kubernetes/lab/temporal/smoke.sh`. The toy worker sources are `infra/kubernetes/lab/temporal/worker/Dockerfile`, `infra/kubernetes/lab/temporal/worker/package.json`, `infra/kubernetes/lab/temporal/worker/package-lock.json`, `infra/kubernetes/lab/temporal/worker/activities.mjs`, `infra/kubernetes/lab/temporal/worker/workflows.mjs`, `infra/kubernetes/lab/temporal/worker/worker.mjs`, and `infra/kubernetes/lab/temporal/worker/start.mjs`. History parsing for the smoke is `infra/kubernetes/lab/temporal/read-history.mjs`. Persistence is a `local-path` claim. The password is generated at runtime and is not stored in Git. The workflow is `labOnce` on task queue `lab-once`.
- **Documentation (first class):** CREATE `docs/runbooks/kubernetes-temporal.md`. This packet does not edit `docs/technical/platform/topology.md`, `docs/technical/platform/deployment-and-compatibility.md`, `docs/technical/platform/data-and-persistence.md`, `docs/technical/platform/execution-and-delivery.md`, storyteller docs, `STATUS.md`, `ROADMAP.md`, `docs/runbooks/README.md`, `work/changes/README.md`, or `work/changes/ledger/`. Another owner is editing the execution page and the storyteller pages.
- **Exclude:** Game mechanics, Storyteller behavior, client rework, production deployment, Kubernetes cloud charges, shared-live data migrations, destructive operations on non-disposable assets.
- **Dependencies:** K8S01 K8S02; capacity check and current Temporal SDK inventory.

## Acceptance and discriminating negative proof

- **Normal:** Run timer/sample workflow, kill worker and server separately, verify resume/history/replay; resource and persistent-store checks.
- **Negative:** Restarting server must not silently erase durable history; dev-mode Temporal must not be labeled production; workflow retries must not duplicate the external test side effect.
- **Validation:** Capture commands/outputs, actual versions and resources; reproducible smoke and teardown tests; before/after authoritative claim inventory; doc link/anchor health and `pnpm wiki:change-guard --mode plan` / `--mode close` when applicable. Never invent green results.
- **Human gate:** Any deleting real volumes, changing machine-wide networking, provider spending, deploying outside local lab or amending product rules must return for approval.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because infrastructure lab adds no new player-facing behavior in `docs/product/foundations/vision.md` | `docs/product/README.md` | Negative: do not treat a service name as a promised feature |
| Technical | unchanged because this packet must not edit `docs/technical/platform/topology.md`, `docs/technical/platform/deployment-and-compatibility.md`, `docs/technical/platform/data-and-persistence.md`, or `docs/technical/platform/execution-and-delivery.md` | `docs/technical/README.md` | The disposable proof stays in `docs/runbooks/kubernetes-temporal.md` |
| Code | changed: `infra/kubernetes/lab/temporal/install.sh`, `infra/kubernetes/lab/temporal/smoke.sh`, and the manifests and worker sources named in the scope. Negative: no game workflow, no development-server command, and no credential file in Git | `compose.yaml` | Local kind smoke plus a worker stop and a server pod replacement |
| Related | changed: CREATE `docs/runbooks/kubernetes-temporal.md#what-this-procedure-is` | `docs/runbooks/kubernetes-lab.md` | Deleting the kind cluster is not a workflow-history backup |

## Handoff and next action

- Proof and ledger are complete on baseline `66f82cac`. Archive this packet under `work/changes/archive/2026-11/other/`.
- No successor is selected. `work/changes/README.md` and `work/changes/ledger/` were not edited.

## Checks actually run

- `infra/kubernetes/lab/up.sh`, `infra/kubernetes/lab/temporal/install.sh`, `infra/kubernetes/lab/temporal/smoke.sh`, and `infra/kubernetes/lab/down.sh` ran in one shell that held `/tmp/offscreen-k8s-cluster.lock` and created `offscreen-lab` only after that name was absent.
- The server process was `temporal-server --config-file /tmp/temporal-config.yaml --allow-no-auth start`. `temporal operator cluster health` returned `SERVING`. `temporal-server --version` printed `temporal version 1.32.2`. The admin CLI printed `temporal version 1.10.0 (Server 1.32.2, UI 2.56.1)`. Postgres printed `postgres (PostgreSQL) 17.11 (Debian 17.11-1.pgdg12+2)`.
- Claim `temporal-postgres` was Bound on `local-path`. Services `temporal-server` and `temporal-postgres` were ClusterIP. The API published `127.0.0.1:6443` only.
- Workflow `labOnce` / `lab-once`, run `01a1f508-38d1-7089-b20e-5ae1ca74a044`, reached one `ActivityTaskCompleted` and one `TimerStarted` while still `RUNNING`. `lab_effect` had 1 row. The worker was scaled to 0. The server pod uid changed from `23b8fa1e-77b5-43ce-a604-1baf606537c9` to `f992a343-45f8-4181-9378-687e3902b31a`. The PVC uid stayed `c72d384b-11c3-42a3-b8f0-4276962f1653`. The same run id was still `RUNNING`, the timer event was still present, and `lab_effect` was still 1.
- The worker was scaled back to 1. The same run completed once. History showed one `TimerFired` and one `WorkflowExecutionCompleted`. The text result was `finished-once`. `temporal workflow list` returned one execution. `lab_effect` stayed 1.
- `down.sh` removed `offscreen-lab`. `kind get clusters` then listed no clusters. `docker volume inspect` still found `offscreen-rpg_postgres-data` and `offscreen-rpg_temporal-data`. MemTotal stayed 12249872 kB. MemAvailable was 8443232 KiB before create, 7302676 KiB during the smoke, and 8052748 KiB after delete.
- Docker 29.9.3, kind v0.33.0, kubectl client v1.37.2, node image `kindest/node:v1.37.0`. No model call. No game package was edited. `compose.yaml` was not edited.
- `pnpm wiki:change-guard --mode plan --change work/changes/open/2026-11-19--k8s06-temporal-production-style-runtime` returned ok with no findings. `pnpm wiki:change-guard --mode close --base 66f82cac` returned ok with no findings. No forbidden canonical file was taken.
- `docs/technical/platform/topology.md`, `docs/technical/platform/deployment-and-compatibility.md`, `docs/technical/platform/data-and-persistence.md`, `docs/technical/platform/execution-and-delivery.md`, storyteller docs, `STATUS.md`, `ROADMAP.md`, `work/changes/README.md`, and `work/changes/ledger/` were not edited. The change guard was not given a reason to take those files.

## Reconciliation ledger (fill before Done)

| Affected selected claim/heading | Authority | Target delta and reason | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update |
| --- | --- | --- | --- | --- | --- | --- |
| docs/runbooks/kubernetes-temporal.md#what-this-procedure-is | Related | changed: the runbook records Temporal server 1.32.2 with PostgreSQL on local-path, and states that this lab is not the Compose development server and not a production cluster | infra/kubernetes/lab/temporal/install.sh and infra/kubernetes/lab/temporal/server.yaml; inspected compose.yaml at 66f82cac | fixture-tested | The live command was temporal-server start with a config file. It was not the Compose development server, and the Service stayed ClusterIP | Procedure lives in this runbook |
| docs/runbooks/kubernetes-temporal.md#recovery-limit | Related | changed: the runbook records that a replaced server pod keeps the same workflow run on the claim, and that deleting the kind cluster is not a history backup | infra/kubernetes/lab/temporal/smoke.sh; inspected compose.yaml at 66f82cac | fixture-tested | Run 01a1f508-38d1-7089-b20e-5ae1ca74a044 stayed one execution, lab_effect stayed 1, and the PVC uid did not change when the server pod uid did | Same runbook section |
| docs/technical/platform/topology.md#distributed-learning-target | Technical | unchanged: this packet was not allowed to edit the laboratory table. The passing proof stays in the Temporal runbook | no source behavior changed in the game; inspected compose.yaml at 66f82cac | reviewed | The kind server is not described here as the deployed game or as a production Temporal cluster | No edit by this packet |
| docs/technical/platform/deployment-and-compatibility.md#kubernetes-as-a-deliberate-extension | Technical | unchanged: hosted-release advice stays on this page. This packet does not add a deployment subsection | no source behavior changed in the game; inspected compose.yaml at 66f82cac | reviewed | A disposable kind server does not satisfy the hosted release | No edit |
| docs/technical/platform/deployment-and-compatibility.md#first-hosted-deployment | Technical | unchanged: the hosted release still requires a managed Temporal service and a demonstrated restore | no source behavior changed; inspected compose.yaml at 66f82cac | reviewed | Deleting this kind cluster is not that restore | No edit |
| docs/technical/platform/execution-and-delivery.md#commands-and-durable-delivery | Technical | unchanged: the game outbox and game workflows were not replaced. Another owner holds this page | no source behavior changed; inspected compose.yaml at 66f82cac | reviewed | labOnce is not a game workflow and Compose still runs the development server for the game | No edit |
| docs/technical/platform/data-and-persistence.md#who-owns-the-durable-record | Technical | unchanged: PostgreSQL still owns committed story state. The lab claim is not the game database | no source behavior changed; inspected compose.yaml at 66f82cac | reviewed | The lab_effect row is not a story record, and cluster deletion is not a game-database backup | No edit |
| docs/product/foundations/vision.md#what-this-page-selects | Product | unchanged: the lab adds no player-facing promise and this page was not edited | no source behavior changed; inspected compose.yaml at 66f82cac | reviewed | A kind Temporal server is not a new mechanic | No product edit |
| docs/runbooks/kubernetes-lab.md#what-this-procedure-is | Related | unchanged: the kind create and delete procedure stays the cluster owner. This packet does not edit that runbook | no source behavior changed; inspected compose.yaml at 66f82cac | reviewed | The kind DNS smoke is not the workflow restart check | No edit |
| STATUS.md | Related | unchanged: another batch owner holds this file. This packet does not record a game deployment there | no game source behavior changed; inspected compose.yaml at 66f82cac | reviewed | Compose remains the game Temporal route, and this packet does not mark the game as deployed on Kubernetes | No edit |
| work/changes/README.md | Related | unchanged: this packet does not edit the queue index. The open-table link still names the pre-archive leaf until that owner updates it | no source behavior changed; inspected compose.yaml at 66f82cac | reviewed | Archiving this packet does not select another Change | Index link left in place |
