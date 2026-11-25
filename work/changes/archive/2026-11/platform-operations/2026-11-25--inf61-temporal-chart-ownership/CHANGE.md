# INF61 | Helm chart decomposition

**State: Done (source implementation; live Kubernetes NOT-RUN).** Closed 2026-11-25 on Change branch `change/inf61-temporal-chart-ownership` from main `039801bc47cae0fd68f65e7e32d1b8b09a80119b`. Joined main at `f1d4a69516820967c71411d4114d5926e4e49232`. Kind: implementation. Owner commissioned source-only 2026-11-25. No live Kubernetes/Docker/SQL mutations, provider calls, tenant deletion or data migration. Exclusive source writes were chart templates (and optional render tests); render contracts unchanged. INF63 already joined on main before this squash; INF62 remains the Wave A custodian. Live tests NOT-RUN, source evidence only.

## Outcome and ownership
Helm chart decomposition. Dependencies: None. Exclusive source writes: `infra/platform/temporal/chart/templates` (and focused render fixtures). [Tasks](TASKS.md) · [Programme](../../../../../undertakings/storyteller-workshop/TEMPORAL-INFRASTRUCTURE.md).

Touched implementation paths: `infra/platform/temporal/chart/templates/_helpers.tpl`, `infra/platform/temporal/chart/templates/_namespace.tpl`, `infra/platform/temporal/chart/templates/_postgres.tpl`, `infra/platform/temporal/chart/templates/_schema.tpl`, `infra/platform/temporal/chart/templates/_server.tpl`, `infra/platform/temporal/chart/templates/_admin.tpl`, `infra/platform/temporal/chart/templates/_namespace-job.tpl`.

Touched documentation/status paths: `docs/runbooks/kubernetes-temporal.md`, `work/undertakings/storyteller-workshop/TEMPORAL-INFRASTRUCTURE.md`, `work/undertakings/storyteller-workshop/OVERVIEW.md`, `work/undertakings/storyteller-workshop/UNDERTAKING.md`, `work/changes/README.md`, `work/changes/open/README.md`, `work/changes/ledger/2026-11.md`.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because no gameplay, authorization or financial behavior moves | none | no product edit |
| Technical | change: docs/runbooks/kubernetes-temporal.md records ownership partials for chart defines; no hosted readiness claim | docs/technical/platform/deployment-and-compatibility.md | runbook + source render |
| Code | change: infra/platform/temporal/chart/templates ownership split; render contracts byte-stable; negative: dev admin/namespace-job refuse, no duplicate kind/name, no Secret material | docs/runbooks/kubernetes-temporal.md | render.test 6/6 |
| Related | change: TEMPORAL-INFRASTRUCTURE, OVERVIEW, UNDERTAKING, work/changes catalog/ledger/open indexes | work/changes/README.md | catalog/ledger |

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| Temporal Helm define ownership layout under infra/platform/temporal/chart/templates | code | changed: named doc/script defines moved into ownership partials; jsonFrom + validate remain in _helpers.tpl; rendered section contracts, identities, pins and scripts unchanged | infra/platform/temporal/chart/templates/_helpers.tpl; infra/platform/temporal/chart/templates/_namespace.tpl; infra/platform/temporal/chart/templates/_postgres.tpl; infra/platform/temporal/chart/templates/_schema.tpl; infra/platform/temporal/chart/templates/_server.tpl; infra/platform/temporal/chart/templates/_admin.tpl; infra/platform/temporal/chart/templates/_namespace-job.tpl; inspected on change branch from 039801bc47cae0fd68f65e7e32d1b8b09a80119b | source-tested: pre/post renderPlatformDocuments deep equality for all profile×section pairs; node --test infra/platform/temporal/tests/render.test.mjs 6/6 PASS; live Kubernetes NOT-RUN | dev admin / namespace-job refuse release-only; no duplicate kind/name; no Secret material in rendered docs; section isolation preserved | docs/runbooks/kubernetes-temporal.md; programme/catalog/ledger links |
| docs/runbooks/kubernetes-temporal.md#what-this-procedure-is ownership partials | runbook | changed: note ownership partials for defines; install path and section wrappers unchanged | docs/runbooks/kubernetes-temporal.md; infra/platform/temporal/chart/templates/_helpers.tpl; inspected on change branch from 039801bc47cae0fd68f65e7e32d1b8b09a80119b | source-tested render + reviewed | no live install credit; no Secret/password in Git claim retained | work/undertakings/storyteller-workshop/TEMPORAL-INFRASTRUCTURE.md; work/changes/README.md; work/changes/open/README.md; work/changes/ledger/2026-11.md |
| docs/technical/platform/deployment-and-compatibility.md Temporal/lab claims | technical | unchanged because hosted readiness, identities, pins and disposable-lab boundary did not move | no normative heading rewrite; boundary reviewed against chart render | reviewed | no production Temporal claim added | N/A |
| Product player/story/auth contracts | product | unchanged because no player-facing behavior moved | no product Markdown edits | reviewed | no product promise rewritten | N/A |
| Live Temporal install/smoke/recovery | ops | unchanged because no live mutation authorized; INF62–63 and later live gates remain separate | no cluster access; live acceptance NOT-RUN | reviewed | no live credit claimed | open INF62/INF63 packets |

## Acceptance
Every task proof passes, source compatibility and identities preserved, no unrelated changes. Report actual SHA, tests and remaining limits. Archive and integrate on main under repository workflow. Live NOT RUN.

## Acceptance receipt
T01 PASS. Pre/post render deep equality across all 14 profile×section pairs. Focused render suite 6/6. Negative: release-only sections refuse on dev; no admin Deployment or namespace Job in `dev` `all`. Live Kubernetes NOT-RUN. Joined main at `f1d4a69516820967c71411d4114d5926e4e49232`.
