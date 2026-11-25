# INF59 | Redis installer safety and readiness

**State: Done (source implementation; live Kubernetes NOT-RUN).** Closed 2026-11-25 on Change branch `change/inf59-redis-reconciliation-safety` from main `7326338a578b8be26513a78326128a8cb0bd56dd` (includes INF58 join). Kind: implementation. Profile: STANDARD. Owner commissioned source-only in 2026-11-25 Redis exploration. No live Kubernetes/Docker, provider, tenant, SQL or Redis mutations. No application package or VER07/VER08 changes. INF58 archived first; this parent was sole remaining join writer. INF60 remains dependency-satisfied for commission but is not auto-started. Live tests NOT-RUN, source evidence only.

## Outcome
Unify the read-only ownership model and guarded local reconciliation while preserving existing shell and dev entrypoints, target fences and receipt behavior. No permission to mutate running infrastructure during implementation.

## Authority and baseline

- Technical: [persistence-and-caching.md § Redis boundary](../../../../../../docs/technical/platform/persistence-and-caching.md#redis-boundary)
- Runbook: [kubernetes-redis.md](../../../../../../docs/runbooks/kubernetes-redis.md)
- Direction: [REDIS-INFRASTRUCTURE.md](../../../../../undertakings/storyteller-workshop/REDIS-INFRASTRUCTURE.md)
- Operator experience: [infrastructure-operator-experience.md](../../../../../../docs/technical/platform/infrastructure-operator-experience.md)
- Baseline main at commission planning: `c5da10d8d722c3d067fbb06d84d8fd57c22faf00`; integration base at closure: `7326338a578b8be26513a78326128a8cb0bd56dd`

Touched implementation paths: `infra/platform/redis/observations.mjs`, `infra/platform/redis/reconcile.mjs`, `infra/platform/redis/readiness.mjs`, `infra/platform/redis/release-install.mjs`, `infra/platform/redis/dev-install.mjs`, `infra/platform/redis/install.sh`, `infra/platform/redis/tests/dev-install.test.mjs`, `infra/platform/redis/tests/install.test.mjs`, `infra/platform/common/profile.mjs`, `infra/environments/infra-cli.mjs`, `infra/environments/infra-cli.test.mjs`.

Touched documentation/status paths: `docs/runbooks/kubernetes-redis.md`, `docs/technical/platform/persistence-and-caching.md`, `work/undertakings/storyteller-workshop/REDIS-INFRASTRUCTURE.md`, `work/undertakings/storyteller-workshop/OVERVIEW.md`, `work/changes/README.md`, `work/changes/open/README.md`, `work/changes/ledger/2026-11.md`.

[Tasks](TASKS.md)

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because no gameplay, authorization or financial behavior moves | none | no product edit |
| Technical | change: local disposable Redis installer ownership, create-or-CAS patch, readiness predicates, and runbook command paths; not hosted production proof | docs/runbooks/kubernetes-redis.md; persistence-and-caching.md#redis-boundary | source tests + runbook |
| Code | change: redis observe/reconcile/readiness/release-install + infra-cli redis status mapping; negative: foreign/unreadable, auth render refusal, CAS conflict, incompatible service/selector, partial mutation | kubernetes/REDIS-INFRASTRUCTURE.md | focused 79/79 |
| Related | change: REDIS-INFRASTRUCTURE source map, OVERVIEW note, catalogs/ledger | work/changes/README.md | catalog/ledger |

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/runbooks/kubernetes-redis.md installer ownership and CAS path | runbook | changed: document shared observe/reconcile, create-or-CAS, loopback adapter, partial-mutation reporting, smoke fence on existing Redis | `infra/platform/redis/{observations,reconcile,readiness,release-install,dev-install}.mjs`; `install.sh`; tests; runbook; inspected on change branch from `7326338a` | source-tested: `node --test` install+dev-install+infra-cli+platform-plan **79/79 PASS**; live Kubernetes NOT-RUN | foreign/unreadable; auth material; AlreadyExists adopt refused; CAS conflict; incompatible Service/selector/immutable ConfigMap; readiness stale/missing config | REDIS-INFRASTRUCTURE.md; OVERVIEW; catalogs/ledger |
| docs/technical/platform/persistence-and-caching.md#redis-boundary | technical | changed: note local installer fences are lab-only, not hosted auth/TLS/multi-operator safety | heading sentence + runbook link; no durable-authority rewrite | reviewed + source | no production auth claim added | runbook |
| Product player/story/auth contracts | product | unchanged because no player-facing behavior moved | no product Markdown edits | reviewed | no product promise rewritten | N/A |
| Live Redis install/smoke/readiness | ops | unchanged because no live mutation authorized | no cluster access; live acceptance NOT-RUN | reviewed | no live credit claimed | INF29/capability catalogue unchanged |
| Chart sizing / INF58 config-hash | chart | unchanged because INF59 never edits chart or render tests; readiness consumes hash when present | chart untouched on this branch beyond main merge of INF58 | reviewed | render tests not re-owned | INF58 archive |

## Acceptance receipt
All T-ID tests pass; preserved baseline identities and no unexpected target/resource changes; source SHA recorded after join; no live claim. Failure or partial mutation reporting must not claim ready. Known local-only security and concurrency limits retained.
