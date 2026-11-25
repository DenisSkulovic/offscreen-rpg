# INF58 | Redis chart configuration and rollout identity

**State: Done (source implementation; live Kubernetes NOT-RUN).** Closed 2026-11-25 on Change branch `change/inf58-redis-chart-configuration` from main `c5b6f892cf7b7a433ce5cf11604c9735296890d8`. Joined main at `a9e455feb130dc9170998b707e3d80111055881a`. Kind: implementation. Profile: STANDARD. Owner commissioned source-only in 2026-11-25 Redis exploration. No live Kubernetes/Docker, provider, tenant, SQL or Redis mutations. No application package or VER07/VER08 changes. INF59 may proceed independently; INF60 remains dependency-gated on INF58 + INF59 source receipts. Live tests NOT-RUN, source evidence only.

## Outcome
Standalone Redis resource configuration is explicit, validated and inspectable without changing default identity or sizing. Templates are split by resource; deterministic configuration changes annotate `offscreen.rpg/redis-config-sha256` and retain Recreate rollout. Existing local cache semantics preserved.

## Authority and baseline

- Technical: [persistence-and-caching.md § Redis boundary](../../../../docs/technical/platform/persistence-and-caching.md#redis-boundary)
- Runbook: [kubernetes-redis.md](../../../../docs/runbooks/kubernetes-redis.md)
- Direction: [REDIS-INFRASTRUCTURE.md](../../../undertakings/storyteller-workshop/REDIS-INFRASTRUCTURE.md)
- Operator experience: [infrastructure-operator-experience.md](../../../../docs/technical/platform/infrastructure-operator-experience.md)
- Baseline main at commission: `c5b6f892cf7b7a433ce5cf11604c9735296890d8`

Touched implementation paths: `infra/platform/redis/chart/values.yaml`, `infra/platform/redis/chart/values.schema.json`, `infra/platform/redis/chart/profiles/development.yaml`, `infra/platform/redis/chart/profiles/release.yaml`, `infra/platform/redis/chart/templates/_helpers.tpl`, `infra/platform/redis/chart/templates/_configmap.tpl`, `infra/platform/redis/chart/templates/_deployment.tpl`, `infra/platform/redis/chart/templates/_service.tpl`, `infra/platform/redis/chart/templates/redis.yaml`, `infra/platform/redis/tests/render.test.mjs`.

Touched documentation/status paths: `docs/runbooks/kubernetes-redis.md`, `work/undertakings/storyteller-workshop/REDIS-INFRASTRUCTURE.md`, `work/undertakings/storyteller-workshop/OVERVIEW.md`, `work/changes/README.md`, `work/changes/open/README.md`, `work/changes/ledger/2026-11.md`.

[Tasks](TASKS.md)

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because no gameplay, authorization or financial behavior moves | none | no product edit |
| Technical | change: docs/runbooks/kubernetes-redis.md records validated chart budgets and config-hash Recreate rollout; not hosted production proof | docs/technical/platform/persistence-and-caching.md#redis-boundary | runbook + source render |
| Code | change: infra/platform/redis/chart values/schema/profiles/templates and infra/platform/redis/tests/render.test.mjs; negative: bad enum, oversize maxmemory, request>limit, wrong namespace, and extra fields must fail render | docs/runbooks/kubernetes-redis.md | render.test 13/13 |
| Related | change: work/undertakings/storyteller-workshop/REDIS-INFRASTRUCTURE.md source map, OVERVIEW note, work/changes catalog/ledger/open indexes | work/changes/README.md | catalog/ledger |

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/runbooks/kubernetes-redis.md sizing and config-hash Recreate rollout | runbook | changed: document validated chart budgets, both-profile render namespaces, `offscreen.rpg/redis-config-sha256`, Recreate singleton; defaults unchanged | `infra/platform/redis/chart/values.yaml`; `infra/platform/redis/chart/values.schema.json`; `infra/platform/redis/chart/profiles/development.yaml`; `infra/platform/redis/chart/profiles/release.yaml`; `infra/platform/redis/chart/templates/_helpers.tpl`; `infra/platform/redis/chart/templates/_configmap.tpl`; `infra/platform/redis/chart/templates/_deployment.tpl`; `infra/platform/redis/chart/templates/_service.tpl`; `infra/platform/redis/chart/templates/redis.yaml`; `infra/platform/redis/tests/render.test.mjs`; `docs/runbooks/kubernetes-redis.md`; inspected on change branch from `c5b6f892` | source-tested: `node --test infra/platform/redis/tests/render.test.mjs` 13/13 PASS; `pnpm infra:render redis release all` and `pnpm infra:render redis dev all` exit 0; live Kubernetes NOT-RUN | bad eviction enum; zero/string memory schema; maxmemory above half limit; request CPU above limit; wrong release namespace; extra top-level field | `work/undertakings/storyteller-workshop/REDIS-INFRASTRUCTURE.md`; `work/undertakings/storyteller-workshop/OVERVIEW.md`; `work/changes/README.md`; `work/changes/open/README.md`; `work/changes/ledger/2026-11.md` |
| docs/technical/platform/persistence-and-caching.md#redis-boundary | technical | unchanged because disposable acceleration boundary, no durable authority, and no hosted proof claims remain the same; chart budgets stay local disposable | no normative heading rewrite; boundary reviewed against chart defaults | reviewed | no production auth/TLS claim added | N/A beyond runbook procedure detail |
| Product player/story/auth contracts | product | unchanged because no player-facing behavior moved | no product Markdown edits | reviewed | no product promise rewritten | N/A |
| Live Redis install/smoke/readiness | ops | unchanged because no live mutation authorized; INF59 owns installer safety | no cluster access; live acceptance NOT-RUN | reviewed | no live credit claimed | open INF59 packet |

## Acceptance receipt
All T-ID tests pass; preserved baseline identities and default sizing; no unexpected target/resource identity changes; source SHA recorded after join; no live claim. Known local-only security and concurrency limits retained.
