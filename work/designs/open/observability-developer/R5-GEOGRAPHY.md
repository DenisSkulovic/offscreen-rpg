# R5 geography | OD-04
Normative placement, not commissioned implementation. Existing owners retained; no new root folders.
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
  tests/                  # existing + developer-probe.test.py, proof-resources.test.mjs
docs/technical/platform/observability-native-infrastructure.md
docs/runbooks/kubernetes-observability.md
work/designs/open/observability-developer/experiments/
evidence/runs/            # curated sanitized actual receipts
```
Root package.json scripts obs:connect -> node infra/platform/observability/connect.mjs; obs:upgrade -> node infra/platform/observability/upgrade.mjs; no arbitrary target args, dev profile fixed, explicit owner authorization for live upgrade. Existing proof.mjs adds developer gate; no separate proof CLI. forward.mjs imports identity/custody types and wrapper, no proof dependencies; connect/upgrade/proof-host call it with held capability. Proxy is same owned child primitive, not second supervisor. Runtime never imports verification or design. proof-resources handles all diagnostic Pod lifecycles including disruptions, proof-host owns session and locks/receipt; developer.mjs owns host traffic via forward; Python signal/query code receives explicit endpoints/time budgets, no cluster credentials. Existing canonical runbook updated after defense with actual CLI, port map, trusted telemetry examples, retained namespace cleanup boundary, known predecessor refusal, pending recovery manual boundary, no invented supported commands. Technical owner updated after ratification; no duplicate canonical doc. 
## Reference census
Owner's baseline grep in DESIGN-R2 found artifacts.mjs, tests/render.test.mjs, readiness.test.mjs, scripts/repo-tools/check-lab-manifests.mjs, infra-layout.test.mjs, canonical native doc and active native EXECUTION/INTERFACES/TASKS. This is not exhaustive. A complete tracked-reference census is required before D0; run from exact baseline with git --no-pager grep -nI -i -E 'specimen(sRoot)?|specFile|image-lock-candidate\.tsv|observability/(chart|install\.sh)|obs:connect|obs:upgrade' -- . and git ls-files infra/platform/observability infra/verification/smoke/observability; classify every matching current operational reference, historical design/evidence reference and unrelated use. Do not rewrite historical references. No fallback runtime path. Planner must record complete census before dispatch (not delegate discovery). Current connector does not provide exhaustive tracked grep; owner command still required, explicit OD-04 residual evidence gap. 
