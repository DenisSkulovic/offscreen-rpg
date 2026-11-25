# INF62 | Honest bootstrap SQL gates

**State: Done (source implementation; live Kubernetes/SQL NOT-RUN).** Closed 2026-11-25 on Change branch `change/inf62-temporal-bootstrap-verification` from main after INF61/INF63 joins (`37bd5519`). Joined main at `b39fa83ae9d077183a864e3147c1aa4bc99c6c1c`. Kind: implementation. Owner commissioned source-only 2026-11-25. No live Kubernetes/Docker/SQL mutations, provider calls, tenant deletion or data migration. Exclusive source writes: `infra/platform/temporal/release-install.mjs`, `infra/platform/temporal/dev-bootstrap.mjs`, `infra/platform/temporal/legacy-sql-probe.mjs`, corresponding executor tests. Wave A siblings INF61 and INF63 already archived/joined; this parent joined INF62 last. No successor auto-started. Live tests NOT-RUN, source evidence only.

## Outcome and ownership
Honest bootstrap SQL gates. Dependencies: None. Exclusive source writes: `infra/platform/temporal/release-install.mjs`, `infra/platform/temporal/dev-bootstrap.mjs`, `infra/platform/temporal/legacy-sql-probe.mjs`, corresponding executor tests. [Tasks](TASKS.md) · [Programme](../../../../../undertakings/storyteller-workshop/TEMPORAL-INFRASTRUCTURE.md).

Touched implementation paths: `infra/platform/temporal/legacy-sql-probe.mjs`, `infra/platform/temporal/release-install.mjs`, `infra/platform/temporal/dev-bootstrap.mjs`, `infra/platform/temporal/tests/legacy-sql-probe.test.mjs`, `infra/platform/temporal/tests/release-install.test.mjs`, `tools/dev-environments/test/dev-temporal-bootstrap.test.mjs`.

Touched documentation/status paths: `docs/runbooks/kubernetes-temporal.md`, `work/undertakings/storyteller-workshop/TEMPORAL-INFRASTRUCTURE.md`, `work/undertakings/storyteller-workshop/OVERVIEW.md`, `work/undertakings/storyteller-workshop/UNDERTAKING.md`, `work/changes/README.md`, `work/changes/open/README.md`, `work/changes/ledger/2026-11.md`.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because no gameplay, authorization or financial behavior moves | none | no product edit |
| Technical | change: docs/runbooks/kubernetes-temporal.md records mandatory SQL existence gates; no hosted readiness claim | work/undertakings/storyteller-workshop/TEMPORAL-INFRASTRUCTURE.md | runbook + source fixtures |
| Code | change: infra/platform/temporal/legacy-sql-probe.mjs `probeLegacyTemporalSql`; wire infra/platform/temporal/release-install.mjs and infra/platform/temporal/dev-bootstrap.mjs; fail-closed missing waiters/probe; negatives for absent/failed/wrong/one-sided schema | docs/runbooks/kubernetes-temporal.md | focused 49/49 with schema-policy |
| Related | change: work/undertakings/storyteller-workshop/TEMPORAL-INFRASTRUCTURE.md Wave A Done; OVERVIEW; UNDERTAKING; work/changes/README.md; work/changes/open/README.md; work/changes/ledger/2026-11.md | work/changes/README.md | catalog/ledger |

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| work/undertakings/storyteller-workshop/TEMPORAL-INFRASTRUCTURE.md schema verification existence-only | programme | unchanged because decision already selected; source now enforces it via shared probe | infra/platform/temporal/legacy-sql-probe.mjs; infra/platform/temporal/release-install.mjs; infra/platform/temporal/dev-bootstrap.mjs; Wave A Done row; tip `37bd5519` | source-tested: `node --test` infra/platform/temporal/tests/release-install.test.mjs tools/dev-environments/test/dev-temporal-bootstrap.test.mjs infra/platform/temporal/tests/legacy-sql-probe.test.mjs infra/platform/temporal/tests/schema-policy.test.mjs **49/49 PASS**; live NOT-RUN | missing/failed/throwing exec; wrong SELECT 1; schema one-sided fail; absent probeSql stops before apply-server | work/undertakings/storyteller-workshop/OVERVIEW.md; work/undertakings/storyteller-workshop/UNDERTAKING.md; work/changes/README.md; work/changes/open/README.md; work/changes/ledger/2026-11.md |
| docs/runbooks/kubernetes-temporal.md#what-this-procedure-is SQL existence gates | runbook | changed: document mandatory SQL existence gates and fail-closed stop before server apply | docs/runbooks/kubernetes-temporal.md; infra/platform/temporal/legacy-sql-probe.mjs; inspected on change branch from `37bd5519` | source-tested + reviewed | Job complete alone is not schema authority; missing probe fails closed | work/undertakings/storyteller-workshop/TEMPORAL-INFRASTRUCTURE.md |
| docs/technical/platform/persistence-and-caching.md Temporal claims | technical | unchanged because durable-execution ownership and hosted readiness did not move | no normative heading rewrite | reviewed | no production Temporal claim added | N/A |
| Product player/story/auth contracts | product | unchanged because no player-facing behavior moved | no product Markdown edits | reviewed | no product promise rewritten | N/A |
| Live Temporal install/smoke/recovery | ops | unchanged because no live mutation authorized; later live gates remain separate | no cluster access; live acceptance NOT-RUN | reviewed | no live credit claimed | INF64–69 planner-held |

## Acceptance
Every task proof passes, source compatibility and identities preserved, no unrelated changes. Report actual SHA, tests and remaining limits. Archive and integrate on main under repository workflow. Live NOT RUN.

## Acceptance receipt
T01–T03 PASS. Focused suite 49/49 including INF63 schema-policy compatibility. Negative: absent/failed/wrong SQL probe and one-sided schema refuse before apply-server; missing postgres waiter fails closed. Live Kubernetes/SQL NOT-RUN.
