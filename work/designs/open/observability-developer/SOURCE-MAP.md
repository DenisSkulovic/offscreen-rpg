# Current source and integration map

Inspected main at `40b44b3909f0226e075dad70fe053aba55e37a88`; principal source entrypoints and D01 callers checked remotely. This map is architecture integration evidence, not an exhaustive successor task census. Recheck affected symbols and tests at each packet's baseline. Historical original R5 source map and full geography census remain at [audited revision](https://github.com/DenisSkulovic/offscreen-rpg/tree/270a3b6e323872e4735f8d5ceac4a71027433ffd/work/designs/open/observability-developer).

| Owner | Current seam / target |
| --- | --- |
| artifacts.mjs | loadPins, loadArtifacts, OBSERVABILITY_RELEASE_ORDER, renderObservabilityDocuments, lintObservability; runtime reads specimens/; D01 moves eight inputs and unifies ordered values argv; D04 adds dev overlay and predecessor variant |
| identity.mjs | captureIdentity/recheckIdentity/readNamespaceUid; complete frozen snapshot and Docker/CA/endpoint/baseline/target UID binding |
| custody.mjs | acquireCustody, readPending, runMutation; durable versioned intent, compare-and-clear, shared/exclusive lock and bounded cancellation |
| inventory.mjs | collectInventory, sanitizeSecretObservation, listHelmReleases, fetchHelmManifest; frozen bounded reads, revision and exact admission projection, no secret data |
| readiness.mjs | classifyInventory/observeObservability, structuralReady, verifyHelmRevisions, verifyControllerChains; classify known predecessor/current, refuse unknown/partial/foreign/pending |
| install.mjs, receipt.mjs | helmInstallArgv, runObservabilityEnsure, runObservabilityPlan/Status, parseEnsureReceipt, normalizePlatformResult/DiagnosticResult; preserve exact install phase prefix and public typed outcomes, no implicit upgrade |
| infra/environments/infra-cli.mjs, platform-plan.mjs | public service selection/status/ensure/diagnostic routing; preserve unrelated defaults and release behavior |
| forward.mjs, connect.mjs, upgrade.mjs (planned) | reusable owned foreground forwarding, public scoped dev connect and exact transition; share custody/identity, no reverse dependency on proof |
| proof.mjs, proof-host.mjs | runLiveProof/runProofOperationSession; owned proof supervision, authorization, bounded receipt; no unowned mutation |
| signals.mjs, signal-probe.py | runSignalsProof/deleteProofResourcesWithUid currently deletes namespace; repair per-create durable UID custody and real Pod execution, default argument handling and strict synthetic query/privacy |
| proof-resources.mjs, developer.mjs, developer-probe.py (planned) | individual resource ledger, host developer traffic and fresh all-signal checks; no cluster credentials in Python |
| resources.mjs, resource-observation.py | queryGrafanaDatasourceHealth/runResourcesProof; currently default port 0 and interval 0; real auth/forward, 12×10s role-scoped observation |
| disruptions.mjs | runPersistenceProof/runOutageProof/restoreTempoAfterOutage; exact restoration, preserved identities and fresh recovery |
| partial-install.mjs | runPartialInstallProof/writeHelmPathWrapper; existing quota wrapper, candidate simpler isolated fault still unratified |
| package.json | obs:connect and obs:upgrade absent; add only with corresponding implemented command |
| docs/technical/platform/observability-native-infrastructure.md, docs/runbooks/kubernetes-observability.md | permanent selected guarantees vs actual operational commands; do not advertise unavailable capabilities |

## Maintained geography

```text
infra/platform/observability/
  artifacts.mjs  identity.mjs  inventory.mjs  readiness.mjs
  custody.mjs  receipt.mjs  install.mjs
  upgrade.mjs             # exact occupied transition, no generic CLI framework
  connect.mjs             # public foreground CLI, reusable internal forwarding
  forward.mjs             # owned child start/probe/stop, accepts held custody
  exec-owned.py           # Linux direct-exec parent-death wrapper
  values/{collector,prometheus,loki,tempo,grafana}.yaml
  values/profiles/dev/collector.yaml
  locks/{charts.yaml,images.tsv}
  expected-inventory.json
  vendor/                 # five existing archives
  tests/                  # existing tests + upgrade.test.mjs, forward.test.mjs
infra/verification/smoke/observability/
  proof.mjs  proof-host.mjs  signals.mjs  disruptions.mjs
  resources.mjs  partial-install.mjs
  proof-resources.mjs     # per-create UID ledger and scoped individual cleanup
  developer.mjs           # host developer proof operation
  developer-probe.py      # fresh OTLP/query predicates
  signal-probe.py  resource-observation.py
  tests/                  # existing + test_developer_probe.py, proof-resources.test.mjs
docs/technical/platform/observability-native-infrastructure.md
docs/runbooks/kubernetes-observability.md
work/designs/open/observability-developer/experiments/
evidence/runs/            # curated sanitized actual receipts
```

Preserve chart versions, images, inventory, data, credentials and historical artifacts. Move runtime paths only with all current consumers; no compatibility alias. Runtime never imports design or verification. The forwarding primitive is shared by connect/upgrade/proof host, not a second supervisor. Keep proof entrypoint under verification and experiment scripts under design evidence. D01 [source map](../../../changes/open/2026-11-27--obs-d01-native-artifacts/SOURCE-MAP.md) lists exact maintained move and current caller anchors; D04 owns the overlay and runtime activation. No live changes or proof in this source review.
