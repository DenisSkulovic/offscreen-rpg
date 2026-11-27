# Source map
Baseline a74dbae646167b55b6babec0ed4be9280ba58d9b; Gateway delta inspected after 855bb833d6404ff5ba12a2735ba9a4d9b120ad3f. Committee pass 03 anchors platform-plan.mjs:659 runner timeout, :121 release mapping; infra-cli.mjs:525 legacy observer. Existing RabbitMQ source unchanged by Gateway. Prior source inventory in accepted dossier R4/SOURCE-GAPS; canonical normative target includes detailed contracts.
| Current seam | Intended delta |
|---|---|
| infra/platform/common/profile.mjs, render.mjs, cli.mjs | canonical namespaces/storage, both-profile renderer, preserve section interfaces |
| infra/platform/rabbitmq/chart/templates, profiles, values/schema | two native objects; remove externalSecret/definitions/topology |
| infra/platform/rabbitmq/vendor | preserve exact bytes, validate hash/identity, transform only expected image fields |
| infra/platform/common/commands.mjs assertPlatformTarget/readPlatformObject | reuse target guard; read baseline UID and explicit cluster-scoped PV/discovery locally |
| infra/platform/rabbitmq/release-install.mjs, install.sh | replace with one guarded installer and read-only observer; thin authorized wrapper |
| infra/environments/platform-plan.mjs corePhases/platformRunnerSpawnTimeout/runPlatformPlan | dispatch both, preserve release preview, typed outcome and RabbitMQ-specific lifetime |
| infra/environments/infra-cli.mjs observeSelectedServiceState | same observer both profiles, remove legacy imports |
| infra/verification/provisioning.mjs buildProvisioningChecks/runProvisioning, diagnostic-engine.mjs runCommand | opt-in only, bounded group supervision and typed possible mutation |
| infra/verification/diagnostic.mjs, diagnostic-live.mjs, verify.mjs | both-profile read-only catalog and focused source registrations |
| infra/verification/smoke/rabbitmq/amqp_smoke.py, smoke.sh; infra/verification/faults/run.sh, worker_loss.py, assert_exactly_once.py | replace fixed names/unsafe deletes, retain duplicate assertion semantics, host proof.mjs owns custody |
| infra/monitoring/kube.py, scripts/repo-tools/check-lab-manifests.mjs, infra-layout.test.mjs | preserve classification and layout contracts, update explicit successor |
| infra/README.md, infra/verification/CAPABILITIES.md, docs/runbooks/kubernetes-rabbitmq.md | reflect source and actual proof status only |
No application or dev-slot changes. Prior owner grep found no current app callers. Focused grep check at source closure; unexpected active consumer is stop condition. Preserve concurrent object-storage, Redis and Gateway edits; shared files reconcile by service-specific keys, not wholesale replacement.