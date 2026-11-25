# INF63 | Reject unidentified resource ownership

**State: Done (source implementation; live Kubernetes NOT-RUN).** Closed 2026-11-25 on Change branch `change/inf63-temporal-explicit-ownership` from main `039801bc47ca`. Kind: implementation. Owner commissioned source-only 2026-11-25. No live Kubernetes/Docker, provider, tenant, SQL or Temporal mutations. Exclusive writes: `schema-policy.mjs` and `tests/schema-policy.test.mjs`. INF61 and INF62 remain open Ready siblings; this parent was sole active join writer for INF63. No successor auto-started. Live tests NOT-RUN, source evidence only.

## Outcome
Reject unidentified resource ownership so Temporal bootstrap refuses resources that lack an explicit matching owner label or trusted-adapter `foreign===false` verdict. Uid alone never proves ownership.

## Authority and baseline

- Programme: [TEMPORAL-INFRASTRUCTURE.md](../../../../../undertakings/storyteller-workshop/TEMPORAL-INFRASTRUCTURE.md) fail-closed ownership decision
- Technical (unchanged durable-execution ownership claim): [persistence-and-caching.md](../../../../../../docs/technical/platform/persistence-and-caching.md)
- Runbook (unchanged narrative): [kubernetes-temporal.md](../../../../../../docs/runbooks/kubernetes-temporal.md)
- No product/technical behavior is impacted beyond enforcing the already-selected fail-closed ownership rule in local Temporal installer policy.
- Baseline main at commission planning: `4cba2d3974db34ac47b3834b81ded9f5b6f60b56`; integration base at closure: `039801bc47ca`

Touched implementation paths: `infra/platform/temporal/schema-policy.mjs`, `infra/platform/temporal/tests/schema-policy.test.mjs`.

Touched documentation/status paths: `work/undertakings/storyteller-workshop/TEMPORAL-INFRASTRUCTURE.md`, `work/undertakings/storyteller-workshop/OVERVIEW.md`, `work/changes/open/README.md`, `work/changes/ledger/2026-11.md`.

[Tasks](TASKS.md)

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because no gameplay, authorization or financial behavior moves | none | no product edit |
| Technical | unchanged because the fail-closed ownership decision was already selected; no hosted readiness claim | work/undertakings/storyteller-workshop/TEMPORAL-INFRASTRUCTURE.md; docs/runbooks/kubernetes-temporal.md | source enforces existing decision |
| Code | change: remove uid-only owned fallback in `classifyTemporalResource`; add direct + planner refusal fixtures; negative: uid-only, conflicting owner+foreign=false, missing label refuse without actions | infra/platform/temporal/schema-policy.mjs; infra/platform/temporal/tests/schema-policy.test.mjs | focused 36/36 |
| Related | change: programme Wave A status, OVERVIEW note, open catalog, ledger | work/changes/open/README.md; work/changes/ledger/2026-11.md | catalog/ledger |

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| work/undertakings/storyteller-workshop/TEMPORAL-INFRASTRUCTURE.md fail-closed ambiguous ownership | programme | unchanged because decision already selected; source now enforces it without uid-only owned fallback | `infra/platform/temporal/schema-policy.mjs`; `infra/platform/temporal/tests/schema-policy.test.mjs`; programme Wave A row; inspected on change branch from `039801bc47ca` | source-tested: `node --test` schema-policy + release-install + dev-temporal-bootstrap **36/36 PASS**; live Kubernetes NOT-RUN | uid-only present → foreign; conflicting owner + foreign=false → foreign; missing label → foreign; planner uid-only PVC → refusal `foreign-pvc`, actions [] | OVERVIEW; open README; ledger |
| Product player/story/auth contracts | product | unchanged because no player-facing behavior moved | no product Markdown edits | reviewed | no product promise rewritten | N/A |
| Hosted Temporal readiness / live install | ops | unchanged because no live mutation or hosted readiness claim authorized | no cluster access; live acceptance NOT-RUN | reviewed | no live credit claimed | INF61/INF62 remain Ready; later INF64–69 planner-held |
| docs/runbooks/kubernetes-temporal.md smoke path | runbook | unchanged because ownership predicate is installer policy, not the lab smoke narrative | runbook untouched | reviewed | smoke still describes pod uid vs claim uid identity, not ownership admission | N/A |
| work/undertakings/storyteller-workshop/OVERVIEW.md Temporal note | undertaking | changed: record INF63 source Done without completion credit | OVERVIEW bullet only | reviewed | no percentage or live credit inflation | TEMPORAL-INFRASTRUCTURE.md |
| work/changes/open/README.md Temporal wave | catalog | changed: INF63 → archived Done pointer | open README Temporal section | reviewed | INF61/INF62 remain Ready | ledger |
| work/changes/ledger/2026-11.md | ledger | changed: add INF63 archive row | ledger row | reviewed | omitting Done row would hide archived source closure | N/A |

## Acceptance receipt
All T-ID tests pass; preserved baseline identities and no unexpected target/resource changes; source SHA recorded after join; no live claim. Live Kubernetes NOT RUN.
