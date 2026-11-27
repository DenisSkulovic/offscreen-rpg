# R5 source and integration map
Inspected integration baseline 5f5750eca2f31d92fac6bfa478d1cae7203e1815. This is design integration evidence, not executable task commission.

| Existing owner | Actual seam | Proposed delta / preserved behavior |
| --- | --- | --- |
| infra/platform/observability/artifacts.mjs | OBSERVABILITY_RELEASE_ORDER, loadPins, loadArtifacts, renderObservabilityDocuments | values/locks paths; ordered valuesPaths descriptor with dev Collector overlay, base predecessor projection; keep hash preflight, inventory and exact immutable image gate |
| infra/platform/observability/tests/render.test.mjs, readiness.test.mjs | specimensRoot, LOCK_PATH, pins and backup fixtures | move only first; both profile render parity then actual dev overlay test |
| scripts/repo-tools/check-lab-manifests.mjs, infra-layout.test.mjs | explicit runtime YAML and artifact paths | reconcile exact owner census, no broad rename of historical lab terminology |
| infra/platform/observability/inventory.mjs | collectInventory, sanitizeListedObject, sanitizeSecretObservation, listHelmReleases, fetchHelmManifest | retain bounded census; scoped relay projection, current revision history metadata, exact manifest revision, Secret resourceVersion for proof; no secret data output |
| infra/platform/observability/readiness.mjs | assessDirectInventory, verifyHelmRevisions, verifyControllerChains, verifyWorkloadImages, classifyInventory | known predecessor/current/unknown classification, strict history validation, active Collector Pod and endpoint ownership, configuration projection; existing other service checks preserved |
| infra/platform/observability/identity.mjs | captureIdentity, recheckIdentity, readNamespaceUid | complete documented CA/Kind/Docker/baseline binding and frozen explicit reads; keep deadline and cleanup |
| infra/platform/observability/install.mjs | helmInstallArgv, runObservabilityEnsure, runObservabilityPlan/Status, runObservabilityCli | namespace create UID capture fix, explicit predecessor refusal, descriptor parity, separate scoped upgrade function; no release mutation |
| infra/platform/observability/custody.mjs | acquireCustody, validatePendingRecord, updatePendingReceipt, runMutation | versioned upgrade pending, compare-and-clear, private atomic update, bounded diagnostics, shared session lock vs exclusive mutation |
| infra/environments/infra-cli.mjs, platform-plan.mjs | existing public status/ensure routing | preserve service selection and existing behavior except new predecessor refusal/detail; no generic upgrade CLI |
| package.json | public scripts | obs:connect and obs:upgrade are absent; add scoped root scripts after defense |
| infra/verification/smoke/observability/signal-probe.py | trace_check/logs_check/metrics_check, observe_positive_queries, run_probe | uniform keyword payload invocation, normal/privacy fixture and real path; existing synthetic contract unchanged |
| infra/verification/smoke/observability/signals.mjs | runSignalsProof, deleteProofResourcesWithUid | initialize terminal first, track UID immediately, wait Pod, actual exec Python in Pod with writable evidence volume, qualified DNS, bounded lifetime and UID cleanup |
| infra/verification/smoke/observability/resources.mjs | queryGrafanaDatasourceHealth, runResourcesProof, listClusterNodes | actual authenticated health, real forward, 10s cadence, frozen reads, filtered evidence |
| infra/verification/smoke/observability/resource-observation.py | kubelet summary and Prom query | retain scoped resource values only; no broad raw node summary |
| docs/technical/platform/observability-native-infrastructure.md | OBS-04 and lifecycle authority | only after defense promote scoped dev amendments, preserve release and original obligations |
| work/changes/open/2026-11-26--observability-native | active acceptance and path references | serial ownership, old proof ledger not silently waived; path amendment not historical rewrite |
| Agent Core design branch d58c19775c74631290fa562daf69a1b2f552fe5a | P0/P1 README no telemetry export | unchanged; no dependency or provider traffic |

R5-GEOGRAPHY.md freezes new module paths and dependency direction; R5-PROOF-CONTRACT.md freezes proof-host custody and cancellation. R4 LIFECYCLE.md freezes history schema, live projection, custody and direct-exec supervisor. Baseline tracked reference census completed and classified in R5-GEOGRAPHY; recheck changed HEAD before commission. Final task anchors remain packet-phase work after committee approval; no claim of completed implementation planning. Unexpected normalization contradictions return to planner.
