# INF47 | Historical incident reconstruction and acceptance

**State: Done (source CLI; live install/query NOT-RUN).** Closed 2026-11-25 on Change branch `change/inf47-historical-observability-queries` from main `ef1620b326dc9e0ae70093b5d678a84ea97b1929`. Kind: implementation. Profile: STATE. INF49 staged composition and emitted `schemaVersion=1` kinds reused; `report.py`/`export.py` landed with fixture proof. Diagnostic retains single Python discovery; MON-01..09 mapped to fixture evidence without live PASS. No host installation, activation, external listener, provider or cluster mutation. Live monitoring acceptance separately authorized. [Tasks](TASKS.md) · [Execution](EXECUTION.md) · [Source map](SOURCE-MAP.md) · [Proof](PROOF.md).

## Authority and baseline

- Technical: [workstation-observability.md](../../../../../../docs/technical/platform/workstation-observability.md) Historical interfaces and acceptance / schema.
- Operator: [workstation-observability runbook](../../../../../../docs/runbooks/workstation-observability.md).
- Capabilities: [infra/verification/CAPABILITIES.md](../../../../../../infra/verification/CAPABILITIES.md) MON-01..09.
- Baseline main at branch create: `15567fc6e3d890802cfaad41f3bfa76e1d9941c9`; reconciled to `ef1620b326dc9e0ae70093b5d678a84ea97b1929` before closure.

Touched implementation paths: `infra/monitoring/report.py`, `infra/monitoring/export.py`, `infra/monitoring/tests/test_report.py`, `infra/monitoring/tests/test_export.py`, `package.json`, `infra/verification/CAPABILITIES.md`, `infra/verification/verify.mjs`, `infra/verification/verify.test.mjs`, `infra/verification/diagnostic.mjs`, `infra/verification/diagnostic.test.mjs`.

Touched documentation/status paths: `docs/technical/platform/workstation-observability.md`, `docs/runbooks/workstation-observability.md`, `work/QUEUE.md`, `work/changes/README.md`, `work/changes/open/README.md`, `work/changes/ledger/2026-11.md`, `work/undertakings/storyteller-workshop/CONSOLIDATION.md`, `work/undertakings/storyteller-workshop/WORKSTATION-OBSERVABILITY.md`, `work/undertakings/storyteller-workshop/LOCAL-DEV-PLATFORM.md`, `work/undertakings/storyteller-workshop/OVERVIEW.md`.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/technical/platform/workstation-observability.md Historical interfaces and acceptance | technical | changed: status/report/export CLIs implemented with versioned JSON/manifest; source fixture-proven; live query/install still NOT selected | infra/monitoring/report.py; infra/monitoring/export.py; infra/monitoring/tests/test_report.py; infra/monitoring/tests/test_export.py; package.json; SHA pending join | source-tested: monitoring Python 161/161 PASS; verify+diagnostic Node 21/21 PASS; live NOT-RUN | span >90d refused; absent gauges stay null; Netdata unavailable → available:false; tracked-tree export refused; secrets/kubeconfig/atop refused; ExportError not swallowed by ValueError; no automatic causality | runbook; CAPABILITIES; catalogs; consolidation; WORKSTATION-OBSERVABILITY |
| docs/runbooks/workstation-observability.md Inspection | operator | changed: inspection section documents source CLI usage, loopback Netdata, no causal ranking; live still operator-gated | docs/runbooks/workstation-observability.md | source-reviewed + fixture export/report | no unsupervised activation; export outside tracked tree | archive link on retirement |
| infra/verification/CAPABILITIES.md MON-01..09 | technical | changed: MON rows map to diagnostic fixture modules including report/export for MON-08; live remains NOT-RUN | infra/verification/CAPABILITIES.md; verify.mjs; diagnostic.mjs | source-tested Node 21/21 | catalog never marks live PASS from fixtures | N/A |
| Product player/story/auth contracts | product | unchanged because no player-facing behavior moved | no product Markdown edits | reviewed | no product promise rewritten for historical CLI | N/A |
| Live Netdata/systemd activation | operator | unchanged because INF47 is query/export only; activation remains separately authorized | no install.sh --activate in this Change | NOT-RUN | source fixtures never activate | N/A |
