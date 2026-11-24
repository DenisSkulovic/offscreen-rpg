# INF13 | execution

Integration undertaking/storyteller-workshop, verified HEAD 66ed7551a02ffcbee90a97db4452a4ffdfc8bc34; INF08 Done receipt at work/changes/archive/2026-11/platform-operations/2026-11-24--inf08-helm-workload-normalization/CHANGE.md (21/21 workload tests, 126/126 focused tests, live NOT-RUN). One isolated linked worktree and change/<id>-<slug> per Change; branch guard node scripts/repo-tools/change-branch-guard.mjs --change ID --target undertaking/storyteller-workshop. Parent one bounded Composer Standard child at a time. No live cluster, Docker build/load/pull, Helm install/upgrade/uninstall, credentials reads or writes, provider calls, database migration, or fault injection in proof. Actual local Helm lint/template and fake runner tests only. Existing operational entrypoints retain separate task-specific authorization. No version upgrade, namespace/PVC/Secret/selector rename, storage class change, scaling, new packages, public endpoints, new Helm release ownership, or tenant allocation redesign. Keep historical evidence and migration history. Human owner integration custodian: serialize joins and shared catalog/atlas/infra-layout edits; no simultaneous writes. Parents integrate/archive independently after own acceptance; no auto-next; no global QUEUE change. Check predecessor receipts and frozen source exports, then proceed without extra commission. Stop on actual semantic contradiction, not predecessor ordering. Report exact command/count and refusal trace, live NOT-RUN.

Consume frozen common API in [batch contract](../../../undertakings/storyteller-workshop/PLATFORM-PARALLEL.md); do not redesign shared interfaces.

## T01 Gateway fixture split

Read anchors: infra/platform/gateway/{install.sh,routes.yaml,values.yaml}; infra/verification/smoke/gateway/{backends.yaml,smoke.sh}.

Split routes.yaml into gateway.yaml (exact Gateway lab-edge) and verification/smoke/gateway/routes.yaml (exact synthetic HTTPRoute lab-edge-routes). Keep pinned Traefik chart42.4.1 release lab-gateway/gateway-system and Gateway API checksum; existing values, controller/Gateway readiness, loopback guard. Normal installer no synthetic image or backend/configmap/route waits. New verification setup.sh applies synthetic only after target and confirmed absent game-edge-routes (overlaps routes); unreadable refuses, no app route write. Existing smoke requires setup; retain SSE/spoof/missing backend proof; replace global no-DB-service guard with actual no public exposure (existing loopback/ClusterIP checks). Fake tests normal install no fixtures and overlap refusal; update runbook.

## T02 Collector chart and fixture split

Read anchors: infra/platform/observability/{collector.yaml,collector-config.yaml,install.sh}; infra/verification/smoke/observability/{hops.yaml,hop.py,smoke.sh}.

Create observability/chart/templates/collector.yaml and release profile exact current Deployment+Service+ConfigMap; collector config single source chart/files/collector-config.yaml; same debug exporter, pinned digest, OTLP HTTP4318/health13133, resource/security. Installer only collector, render before writes, keep target/digest/readiness, no synthetic import/hops. New verification setup.sh owns hop config and Deployments, image preparation and readiness; explicit smoke only, guard exact owned synthetic names before fault scaling, preserve failure proof. No remote exporter/app instrumentation. Real parity, fake normal installer no fixtures, foreign context refusal; remove old collector YAML/config after mapping, update runbook.

## T03 Boundary proof

Read anchors: gateway/install.sh; observability/install.sh; verification/smoke/{gateway,observability}/setup.sh.

Use fake binaries to test both entrypoints and fixture guards. No normal installer invokes smoke; no app route modifications; no foreign context; existing pinned upstream Helm ownership unchanged. Run service tests/real render, bash -n. INF15 shared guard join.

## Closure
Actual local Helm lint/template where charts created, focused fake runner tests under service/tests and existing named tests; baseline JSON comparison except named deltas. No live mutation. Parent serializes exact successor map updates with custodian; INF15 consolidates. Record commands/counts, changed-file formatting and quality checks, docs health, archive and integrate. Stop on actual source contradiction; mechanical path reconciliation only.
