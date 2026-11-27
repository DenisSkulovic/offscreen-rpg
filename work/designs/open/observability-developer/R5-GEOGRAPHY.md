# Maintained geography
Selected target placement, not commissioned implementation. Existing owners retained; no new root folders.
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
Root package.json scripts obs:connect -> node infra/platform/observability/connect.mjs; obs:upgrade -> node infra/platform/observability/upgrade.mjs; no arbitrary target args, dev profile fixed, explicit owner authorization for live upgrade. Existing proof.mjs adds developer gate; no separate proof CLI. forward.mjs imports identity/custody types and wrapper, no proof dependencies; connect/upgrade/proof-host call it with held capability. Proxy is same owned child primitive, not second supervisor. Runtime never imports verification or design. proof-resources handles all diagnostic Pod lifecycles including disruptions, proof-host owns session and locks/receipt; developer.mjs owns host traffic via forward; Python signal/query code receives explicit endpoints/time budgets, no cluster credentials. Existing canonical runbook updated after defense with actual CLI, port map, trusted telemetry examples, retained namespace cleanup boundary, known predecessor refusal, pending recovery manual boundary, no invented supported commands. Technical owner updated after ratification; no duplicate canonical doc. 
## Maintained reference census
Owner returned complete matching-file list for stated regex at exact baseline and operational lines for infra/scripts/docs/package.json. Earlier long output clipped, replaced by compact census; no claim of exhaustive arbitrary semantic search beyond these patterns. Maintained reference disposition:
- artifacts.mjs 10,49–55,178,494,501,524: paths and descriptor terminology.
- readiness.test.mjs 29–34 and render.test.mjs 19–21,167,197,218,553: lock/values fixtures.
- vendor/README.md:3 lock path.
- proof.test.mjs:166,177: mock values descriptors -> ordered valuesPaths and maintained paths.
- check-lab-manifests.mjs:72–76: five exact values paths plus dev overlay; check-lab-manifests.test.mjs:109 lock path assertion.
- infra-layout.test.mjs:944–946 new locks/root inventory; retain existing retired-path assertions and add all eight old runtime input paths.
- infra/README.md:46 update current runtime geography and nomenclature.
- native canonical doc: maintained values/locks and historical provenance; update actual realization when T01 lands.
- Native predecessor packet is archived; keep historical references unchanged. Current operational mappings belong to successor SOURCE-MAP and T01.
- INF-MOVE-MAP.json historical destinations unchanged; retirement guard unchanged.
- Other matched paths: agent methodology, ENGINEERING/STATUS/WORKFLOW, Chamber and UI fixtures, other platform contracts/tests (including Redis chart name), bootstrap histories, evidence, research, archived Changes/designs, other open designs/Changes and ledger/session entries: not observability operational path owners, preserve. No global specimen terminology ban. Existing proof Python test naming test_signal_probe.py retained; new test name test_developer_probe.py.
This closes OD-04 named census requirement at baseline. Recheck on changed integration HEAD before packet commission, and D0 post-move grep negative for old operational paths. No runtime edits.
