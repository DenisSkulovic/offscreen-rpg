# INF10 | execution

Integration undertaking/storyteller-workshop, verified HEAD 66ed7551a02ffcbee90a97db4452a4ffdfc8bc34; INF08 Done receipt at work/changes/archive/2026-11/platform-operations/2026-11-24--inf08-helm-workload-normalization/CHANGE.md (21/21 workload tests, 126/126 focused tests, live NOT-RUN). One isolated linked worktree and change/<id>-<slug> per Change; branch guard node scripts/repo-tools/change-branch-guard.mjs --change ID --target undertaking/storyteller-workshop. Parent one bounded Composer Standard child at a time. No live cluster, Docker build/load/pull, Helm install/upgrade/uninstall, credentials reads or writes, provider calls, database migration, or fault injection in proof. Actual local Helm lint/template and fake runner tests only. Existing operational entrypoints retain separate task-specific authorization. No version upgrade, namespace/PVC/Secret/selector rename, storage class change, scaling, new packages, public endpoints, new Helm release ownership, or tenant allocation redesign. Keep historical evidence and migration history. Human owner integration custodian: serialize joins and shared catalog/atlas/infra-layout edits; no simultaneous writes. Parents integrate/archive independently after own acceptance; no auto-next; no global QUEUE change. Check predecessor receipts and frozen source exports, then proceed without extra commission. Stop on actual semantic contradiction, not predecessor ordering. Report exact command/count and refusal trace, live NOT-RUN.

Consume frozen common API in [batch contract](../../../undertakings/storyteller-workshop/PLATFORM-PARALLEL.md); do not redesign shared interfaces.

## T01 CNPG chart

Read anchors: infra/platform/postgres/{cluster.yaml,namespace.yaml,operator.pin}; tools/dev-environments/src/adapters/dev-cnpg-bootstrap.mjs::renderDevCnpgCluster/renderDevCnpgNamespace.

Create postgres/chart/templates/{namespace,cluster}.yaml and profiles. Exact dev dev-pg/offscreen-dev-postgres, 2Gi standard, 384Mi/1Gi, 100m/500m, shared_buffers 128MB, max_connections 100, work_mem4MB, maintenance_work_mem32MB, initdb dev/dev; release lab-pg/lab-postgres 1Gi local-path, 256Mi/768Mi, 100m/500m, 64MB/20, same other settings, lab/lab. One instance, locale C, existing labels and pinned POSTGRES_IMAGE from common renderer. parseCnpgPin public shape preserved via parsePins. Real render semantic parity both profiles.

## T02 Dev ownership and readiness

Read anchors: tools/dev-environments/src/adapters/dev-cnpg-bootstrap.mjs; dev-cnpg-host-probe.mjs; dev-cnpg-bootstrap-cli.mjs; tools/dev-environments/test/dev-cnpg-bootstrap.test.mjs.

Move implementation to platform/postgres/dev-bootstrap.mjs and dev-host-probe.mjs, old paths re-export all existing symbols; CLI remains at old path, adjust relative pin path, retain auth and injected probe fence. Replace string constructors with common renderer sections. Use common readPlatformObject; nonempty unreadable list refuses; Cluster CRD absent on fresh install only when CRD and operator confirmed absent. Existing storage class mismatch refuses rather than attempts change. Preserve existing pure plan/ensure shapes and CLI waitForDevPostgres readiness+SQL proof even on noop (do not conflate pure plan with readiness). Existing owned compatible cluster no apply; absent operator checksum+image verify, wait CRD/controller/webhook before Cluster creation. Fake tests wrong target/read failure/storage drift/bad digest/operator readiness failure no cluster apply; reuse no mutation. No tenant/database migration changes.

## T03 Release lifecycle

Read anchors: infra/platform/postgres/install.sh; infra/platform/common/cli.mjs; postgres/chart; docs/runbooks/kubernetes-postgres.md.

Keep shell entrypoint lib.sh volume/context guards, use common target and render before mutation. Add postgres/release-install.mjs (invoked by install.sh) to observe exact resources and decide create/reuse/refuse; no standalone unguarded writer. Existing namespace lab label, existing Cluster exact image/instances/storage class/name/bootstrap identity; no forced apply or credentials rotation. Matching operator verify readiness and skip fetch/apply; missing operator use existing checksum-verified manifest install; mismatched refuses. Missing namespace/cluster create only, existing reuse and wait phase healthy+Ready and webhook. Remove old cluster.yaml/namespace.yaml after callers switched; map successors. Fake reentry no writes, unreadable/foreign/mismatch no create; run owner tests + dev-cnpg-bootstrap.test.mjs. Update postgres runbook.

## Closure
Actual local Helm lint/template where charts created, focused fake runner tests under service/tests and existing named tests; baseline JSON comparison except named deltas. No live mutation. Parent serializes exact successor map updates with custodian; INF15 consolidates. Record commands/counts, changed-file formatting and quality checks, docs health, archive and integrate. Stop on actual source contradiction; mechanical path reconciliation only.
