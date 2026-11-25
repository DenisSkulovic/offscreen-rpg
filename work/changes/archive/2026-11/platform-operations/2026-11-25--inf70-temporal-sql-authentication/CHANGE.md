# INF70 | Authenticate existing Temporal SQL probes

**State: Done (source implementation; live Kubernetes/SQL authentication NOT-RUN).** Closed 2026-11-25 on Change branch `change/inf70-temporal-sql-authentication` from main `a5bd6cc82a87`. Joined main at `a5670bd150e6663a78fe3cd9f68732bd20962924`. Kind: implementation. Owner commissioned source-only 2026-11-25. No live Kubernetes, Docker, SQL, provider or destructive operations. Exclusive writes: three SQL command builders and focused tests named in TASKS. No successor auto-started (INF71 remains Ready, dependency-gated). Live authentication NOT-RUN; stub/source evidence only.

## Outcome
Existing Temporal kubectl SQL probes map container `POSTGRES_PASSWORD` into `PGPASSWORD`, forbid interactive prompts with `psql -w`, and pass database/query as positional argv so SQL bytes including shell metacharacters are preserved without embedding secrets in argv or receipts.

## Authority and baseline

- Programme: [TEMPORAL-INFRASTRUCTURE.md](../../../../../undertakings/storyteller-workshop/TEMPORAL-INFRASTRUCTURE.md) corrective wave
- Technical (unchanged durable-execution ownership claim): [persistence-and-caching.md](../../../../../../docs/technical/platform/persistence-and-caching.md)
- Runbook (unchanged narrative): [kubernetes-temporal.md](../../../../../../docs/runbooks/kubernetes-temporal.md)
- Chart credential owner: `infra/platform/temporal/chart/templates/_postgres.tpl` (`POSTGRES_PASSWORD`)
- No product behavior impacted; technical target is a narrow legacy correctness correction, not redesign.
- Baseline at packet authoring: `d622ec7e25200b03ab75cb3fa87e2f67506b40a1`; integration base at closure: `a5bd6cc82a87766249e8776d6b5638856b679cac`

Touched implementation paths: `infra/platform/temporal/dev-bootstrap.mjs`, `infra/platform/temporal/release-install.mjs`, `infra/platform/temporal/readiness.mjs`, `infra/platform/temporal/tests/sql-command.test.mjs`, `infra/platform/temporal/tests/readiness.test.mjs`, `infra/platform/temporal/tests/release-install.test.mjs`, `tools/dev-environments/test/dev-temporal-bootstrap.test.mjs`.

Touched documentation/status paths: `work/undertakings/storyteller-workshop/TEMPORAL-INFRASTRUCTURE.md`, `work/undertakings/storyteller-workshop/OVERVIEW.md`, `work/undertakings/storyteller-workshop/UNDERTAKING.md`, `work/changes/open/README.md`, `work/changes/README.md`, `work/changes/ledger/2026-11.md`.

[Tasks](TASKS.md)

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because no gameplay, authorization or financial behavior moves | none | no product edit |
| Technical | unchanged because the durable Temporal ownership/target was already selected; this Change only repairs legacy SQL probe credential wiring without redesign | `work/undertakings/storyteller-workshop/TEMPORAL-INFRASTRUCTURE.md`; `docs/runbooks/kubernetes-temporal.md` | source enforces existing chart `POSTGRES_PASSWORD` |
| Code | change: three builders use literal bash `-c` + `PGPASSWORD` + `psql -w` + positional database/query; add stub proof and update fakes; negative: missing/empty password refuse before stub, stub nonzero propagates, metacharacter query stays exact argv | `infra/platform/temporal/dev-bootstrap.mjs`; `infra/platform/temporal/release-install.mjs`; `infra/platform/temporal/readiness.mjs`; `infra/platform/temporal/tests/sql-command.test.mjs`; `infra/platform/temporal/tests/readiness.test.mjs`; `infra/platform/temporal/tests/release-install.test.mjs`; `tools/dev-environments/test/dev-temporal-bootstrap.test.mjs` | focused 28/28 |
| Related | change: programme corrective-wave status, OVERVIEW/UNDERTAKING notes, catalogs, ledger | `work/undertakings/storyteller-workshop/TEMPORAL-INFRASTRUCTURE.md`; `work/undertakings/storyteller-workshop/OVERVIEW.md`; `work/undertakings/storyteller-workshop/UNDERTAKING.md`; `work/changes/open/README.md`; `work/changes/README.md`; `work/changes/ledger/2026-11.md` | catalog/ledger |

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| `work/undertakings/storyteller-workshop/TEMPORAL-INFRASTRUCTURE.md` corrective wave INF70 SQL credential wiring | programme | changed: INF70 source Done; chart still `POSTGRES_PASSWORD`; no architecture refactor | `infra/platform/temporal/dev-bootstrap.mjs`; `infra/platform/temporal/release-install.mjs`; `infra/platform/temporal/readiness.mjs`; `infra/platform/temporal/tests/sql-command.test.mjs`; inspected on change branch from `a5bd6cc82a87` | source-tested: named four-file `node --test` **28/28 PASS**; live auth NOT-RUN | missing/empty `POSTGRES_PASSWORD` exits nonzero before stub; stub exit 1 propagates; metacharacter query preserved as argv | `work/undertakings/storyteller-workshop/OVERVIEW.md`; `work/undertakings/storyteller-workshop/UNDERTAKING.md`; catalogs; ledger |
| Product player/story/auth contracts | product | unchanged because no player-facing behavior moved | no product Markdown edits | reviewed | no product promise rewritten | N/A |
| Hosted Temporal readiness / live SQL authentication | ops | unchanged because no live mutation or hosted readiness claim authorized | no cluster/SQL access; live acceptance NOT-RUN | reviewed | no live credit claimed | INF71 remains Ready after INF70; INF64–69 planner-held |
| `docs/runbooks/kubernetes-temporal.md` smoke path | runbook | unchanged because probe argv/auth is installer policy, not the lab smoke narrative | runbook untouched | reviewed | smoke still describes pod/claim identity, not probe credential mapping | N/A |
| `infra/platform/temporal/chart/templates/_postgres.tpl` credential env name | chart | unchanged because already `POSTGRES_PASSWORD`; stop condition would fire on alternate name | `infra/platform/temporal/chart/templates/_postgres.tpl` asserted in sql-command test | source-tested | no `PGPASSWORD` chart env invented | N/A |
| `work/undertakings/storyteller-workshop/OVERVIEW.md` Temporal corrective note | undertaking | changed: record INF70 source Done without completion credit | OVERVIEW bullet only | reviewed | no percentage or live credit inflation | `work/undertakings/storyteller-workshop/TEMPORAL-INFRASTRUCTURE.md` |
| `work/changes/open/README.md` / `work/changes/README.md` Temporal corrective | catalog | changed: INF70 archived Done pointer; INF71 remains Ready after INF70 | open + root catalogs | reviewed | INF71 not auto-started | `work/changes/ledger/2026-11.md` |
| `work/changes/ledger/2026-11.md` | ledger | changed: add INF70 archive row | ledger row | reviewed | omitting Done row would hide archived source closure | N/A |

## Acceptance receipt
T01–T02 proofs pass (28/28); builders preserve identities/timeouts/result contracts; password never printed; chart credential remains `POSTGRES_PASSWORD`; live authentication NOT RUN. No hosted readiness credit.
