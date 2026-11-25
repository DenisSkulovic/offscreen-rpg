# INF71 | Fail closed at Temporal execution gates

**State: Done (source implementation; live Kubernetes/SQL/execution NOT-RUN).** Closed 2026-11-25 on Change branch `change/inf71-temporal-execution-refusals` from main `fb6c404f46e196369cc5b112e76bb63ebbc0cff2`. Joined main at `6cdd491cb937506c27a46679bb97bc370bb04dd2`. Kind: implementation. Owner commissioned source-only 2026-11-25. No live Kubernetes, Docker, SQL, provider or destructive operations. Exclusive writes: release and dev Temporal executors plus focused tests named in TASKS. No successor auto-started. Live execution NOT-RUN; deterministic source evidence only.

## Outcome
Release and authorized-dev Temporal executors refuse refused plans and malformed readiness/SQL/secret gates without further writes, use an explicit reuse allowlist and own-property action dispatch, and surface structured refusal receipts (including `secret-create-conflict` and `unknown-action`) without exposing raw errors.

## Authority and baseline

- Programme: [TEMPORAL-INFRASTRUCTURE.md](../../../../../undertakings/storyteller-workshop/TEMPORAL-INFRASTRUCTURE.md) corrective wave
- Technical (unchanged durable-execution ownership claim): [persistence-and-caching.md](../../../../../../docs/technical/platform/persistence-and-caching.md)
- Runbook (unchanged narrative): [kubernetes-temporal.md](../../../../../../docs/runbooks/kubernetes-temporal.md)
- Dependency: INF70 integrated (positional argv + explicit `PGPASSWORD`)
- No product behavior impacted; technical target is a narrow legacy correctness correction, not redesign.
- Baseline at packet authoring: `d622ec7e25200b03ab75cb3fa87e2f67506b40a1`; integration base at closure: `fb6c404f46e196369cc5b112e76bb63ebbc0cff2`

Touched implementation paths: `infra/platform/temporal/release-install.mjs`, `infra/platform/temporal/dev-bootstrap.mjs`, `infra/platform/temporal/tests/release-install.test.mjs`, `tools/dev-environments/test/dev-temporal-bootstrap.test.mjs`.

Touched documentation/status paths: `work/undertakings/storyteller-workshop/TEMPORAL-INFRASTRUCTURE.md`, `work/undertakings/storyteller-workshop/OVERVIEW.md`, `work/undertakings/storyteller-workshop/UNDERTAKING.md`, `work/changes/open/README.md`, `work/changes/README.md`, `work/changes/ledger/2026-11.md`.

[Tasks](TASKS.md) · [Programme](../../../../../undertakings/storyteller-workshop/TEMPORAL-INFRASTRUCTURE.md)

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because no gameplay, authorization or financial behavior moves | none | no product edit |
| Technical | unchanged because the durable Temporal ownership/target was already selected; this Change only repairs legacy executor fail-closed behavior without redesign | `work/undertakings/storyteller-workshop/TEMPORAL-INFRASTRUCTURE.md`; `docs/runbooks/kubernetes-temporal.md` | narrow legacy correctness |
| Code | change: release/dev executors refuse `!plan.ok` / authorization / raw policy failure with zero further writes; explicit reuse allowlist; `Object.hasOwn` unknown-action; required readiness/SQL checks; AlreadyExists → `secret-create-conflict`; raw receipt actions | `infra/platform/temporal/release-install.mjs`; `infra/platform/temporal/dev-bootstrap.mjs`; `infra/platform/temporal/tests/release-install.test.mjs`; `tools/dev-environments/test/dev-temporal-bootstrap.test.mjs` | focused parent suite **58/58** |
| Related | change: programme corrective-wave status, OVERVIEW/UNDERTAKING notes, catalogs, ledger | `work/undertakings/storyteller-workshop/TEMPORAL-INFRASTRUCTURE.md`; `work/undertakings/storyteller-workshop/OVERVIEW.md`; `work/undertakings/storyteller-workshop/UNDERTAKING.md`; `work/changes/open/README.md`; `work/changes/README.md`; `work/changes/ledger/2026-11.md` | catalog/ledger |

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| `work/undertakings/storyteller-workshop/TEMPORAL-INFRASTRUCTURE.md` corrective wave INF71 executor refusals | programme | changed: INF71 source Done; fail-closed execution gates; no architecture refactor | `infra/platform/temporal/release-install.mjs`; `infra/platform/temporal/dev-bootstrap.mjs`; inspected on change branch from `fb6c404f46e1` | source-tested: INF70 suite + both executor suites + schema-policy **58/58 PASS**; live execution NOT-RUN | refused plan → `mutated:false`, `writes:[]`; AlreadyExists → `secret-create-conflict` with no further writes; missing/thrown/malformed waiters refuse | `work/undertakings/storyteller-workshop/OVERVIEW.md`; `work/undertakings/storyteller-workshop/UNDERTAKING.md`; catalogs; ledger |
| Product player/story/auth contracts | product | unchanged because no player-facing behavior moved | no product Markdown edits | reviewed | no product promise rewritten | N/A |
| Hosted Temporal readiness / live executor mutation | ops | unchanged because no live mutation or hosted readiness claim authorized | no cluster/SQL access; live acceptance NOT-RUN | reviewed | no live credit claimed | INF64–69 planner-held |
| `docs/runbooks/kubernetes-temporal.md` smoke path | runbook | unchanged because executor refusal policy is installer logic, not the lab smoke narrative | runbook untouched | reviewed | smoke still describes pod/claim identity | N/A |
| Schema policy / plan topology / chart templates | code | unchanged because TASKS forbids schema-policy, chart and SQL builder edits | `infra/platform/temporal/schema-policy.mjs` exercised read-only via suite | source-tested | plan fixtures still drive allowlist completeness without production injection seam | N/A |
| `work/undertakings/storyteller-workshop/OVERVIEW.md` Temporal corrective note | undertaking | changed: record INF71 source Done without completion credit | OVERVIEW bullet only | reviewed | no percentage or live credit inflation | `work/undertakings/storyteller-workshop/TEMPORAL-INFRASTRUCTURE.md` |
| `work/changes/open/README.md` / `work/changes/README.md` Temporal corrective | catalog | changed: INF71 archived Done pointer | open + root catalogs | reviewed | no successor auto-started | `work/changes/ledger/2026-11.md` |
| `work/changes/ledger/2026-11.md` | ledger | changed: add INF71 archive row | ledger row | reviewed | omitting Done row would hide archived source closure | N/A |

## Acceptance receipt
T01–T02 proofs pass; parent combined INF70 + executor suites **58/58**; refused plans and malformed readiness/SQL/secret gates execute zero further writes; identities preserved; live execution NOT RUN. No hosted readiness credit.
