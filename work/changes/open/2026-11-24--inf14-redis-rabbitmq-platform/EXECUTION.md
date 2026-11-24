# INF14 | execution

Integration undertaking/storyteller-workshop, verified HEAD 66ed7551a02ffcbee90a97db4452a4ffdfc8bc34; INF08 Done receipt at work/changes/archive/2026-11/platform-operations/2026-11-24--inf08-helm-workload-normalization/CHANGE.md (21/21 workload tests, 126/126 focused tests, live NOT-RUN). One isolated linked worktree and change/<id>-<slug> per Change; branch guard node scripts/repo-tools/change-branch-guard.mjs --change ID --target undertaking/storyteller-workshop. Parent one bounded Composer Standard child at a time. No live cluster, Docker build/load/pull, Helm install/upgrade/uninstall, credentials reads or writes, provider calls, database migration, or fault injection in proof. Actual local Helm lint/template and fake runner tests only. Existing operational entrypoints retain separate task-specific authorization. No version upgrade, namespace/PVC/Secret/selector rename, storage class change, scaling, new packages, public endpoints, new Helm release ownership, or tenant allocation redesign. Keep historical evidence and migration history. Human owner integration custodian: serialize joins and shared catalog/atlas/infra-layout edits; no simultaneous writes. Parents integrate/archive independently after own acceptance; no auto-next; no global QUEUE change. Check predecessor receipts and frozen source exports, then proceed without extra commission. Stop on actual semantic contradiction, not predecessor ordering. Report exact command/count and refusal trace, live NOT-RUN.

Consume frozen common API in [batch contract](../../../undertakings/storyteller-workshop/PLATFORM-PARALLEL.md); do not redesign shared interfaces.

## T01 Redis optional chart and smoke fence

Read anchors: infra/platform/redis/redis.yaml; infra/verification/smoke/redis/{client.yaml,smoke.sh}; docs/runbooks/kubernetes-redis.md.

Create redis/chart/templates/redis.yaml + release profile exact existing 8.2.1-alpine, lab-a, ClusterIP6379, ephemeral emptyDir32Mi, maxmemory32mb allkeys-lru, no persistence/auth, resources20m/32Mi and500m/128Mi, probes/security. Optional install.sh target+render, no FLUSHALL/scale/delete; not default app platform or dev. Smoke before trap/create must confirm no existing redis Deployment/Service/ConfigMap/client (common read, unreadable refuses); kubectl create exact fixture, track created UIDs, cleanup only own UID verified objects, conflict retains unknown. Explicit disposable confirmation before FLUSHALL/scale; retain TTL/flush/recovery proof, no application cache activation. Real parity and fake existing/unknown zero writes including trap; remove old redis.yaml after switch.

## T02 RabbitMQ lifecycle

Read anchors: infra/platform/rabbitmq/{broker.yaml,namespace.yaml,definitions.json,install.sh,vendor/}; infra/verification/smoke/rabbitmq/smoke.sh.

Create rabbitmq/chart/templates/{namespace,broker}.yaml + release profile exact lab-broker/messaging one replica 4.3.4-management, 1Gi local-path, requests200m/1Gi limits500m/1Gi, external lab-broker-user, definitions mount/classic. Keep exact vendored operator/cert-manager manifests and checksums. Installer uses common target/read/render, retains webhook waits; matching existing operator reuse, mismatch refuse. Secret create-only stdin when absent and no broker/PVC, existing reuse, missing with data refuse. Existing broker matching expected storage/image/identity reuse, verify AllReplicasReady. Definitions ConfigMap existing exact bytes reuse, changed refuse explicit migration-needed. Remove unconditional pod delete. Fresh broker verify lab-client then import existing definitions once; reentry read-only list_queues exact expected name/durable/type from definitions.json, refuse mismatch, no automatic reimport. Partial import leaves state, retry only if expected queue already exists. No auto restart. Fake reentry no delete/import, bad digest/foreign/unreadable/missing secret or changed definitions refusal, failed webhook no broker apply. Remove old manifests after chart integration; smoke crash proof remains separately authorized.

## T03 Optional boundary and proof

Read anchors: infra/platform/{redis,rabbitmq}; docs/runbooks/kubernetes-{redis,rabbitmq}.md.

Document optional only; Redis unauthenticated instance explicitly isolated/disposable, no automatic application runtime or shared dev service until CACHE isolation/auth contract selected. RabbitMQ optional until actual consumer requirement. Real render and fake lifecycle tests; retain proof semantics, no application env or package changes.

## Closure
Actual local Helm lint/template where charts created, focused fake runner tests under service/tests and existing named tests; baseline JSON comparison except named deltas. No live mutation. Parent serializes exact successor map updates with custodian; INF15 consolidates. Record commands/counts, changed-file formatting and quality checks, docs health, archive and integrate. Stop on actual source contradiction; mechanical path reconciliation only.
