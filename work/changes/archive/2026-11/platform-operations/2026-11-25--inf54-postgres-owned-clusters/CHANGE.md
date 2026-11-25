# INF54 | Owned independent PostgreSQL clusters

**State: Done (source implementation; live owner experiment NOT-RUN).** Closed 2026-11-25 on Change branch `change/inf54-postgres-owned-clusters` from main `2dffa84dc966d0c07e3c6782a6c08e85f9587612`. Joined main at `55564146f6cb22c36aa88604154717e803c9de52`. Kind: implementation. Profile: RELEASE. Baseline planning SHA `c5a3e2d28c33d863a8d8168997bc33ce74fd59c3`. [Selected topology](../../../../../../docs/technical/platform/database-infrastructure.md#local-cnpg-topology-selected-2026-11-25) · [INF53 archive](../2026-11-25--inf53-postgres-instance-topology/CHANGE.md) · [TASKS](TASKS.md) · [PROOF](PROOF.md).

Outcome: additional named independently replicated PostgreSQL clusters in both dev and release, via INF53 shared control. Explicit owner-scoped namespace, no application shard routing or redistribution. Coordinate with VER02/VER topology resource adapters; they consume common builder and do not maintain a second CNPG manifest algorithm. No automatic cleanup, no ordinary slot endpoint switch. Predecessor [INF53](../2026-11-25--inf53-postgres-instance-topology/CHANGE.md) shared topology API and source tests joined; no live permission during this Change.

## Authority and baseline

- Technical: [database-infrastructure.md § Local CNPG topology](../../../../../../docs/technical/platform/database-infrastructure.md#local-cnpg-topology-selected-2026-11-25)
- Technical: [verification-programmes.md](../../../../../../docs/technical/platform/verification-programmes.md)
- Runbook: [kubernetes-postgres.md](../../../../../../docs/runbooks/kubernetes-postgres.md)
- Baseline main: `f582bd005af5785df238c11794049bc9eda44798`

Touched implementation paths: `infra/platform/postgres/topology.mjs`, `infra/platform/postgres/tests/render.test.mjs`, `infra/platform/postgres/tests/topology.test.mjs`.

Touched documentation/status paths: `docs/technical/platform/database-infrastructure.md`, `docs/technical/platform/verification-programmes.md`, `docs/runbooks/kubernetes-postgres.md`, `STATUS.md`, `work/changes/README.md`, `work/changes/ledger/2026-11.md`, `work/undertakings/storyteller-workshop/OVERVIEW.md`, `work/changes/open/2026-11-25--ver02-owned-postgres-verification-resource/CHANGE.md`.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/technical/platform/database-infrastructure.md#local-cnpg-topology-selected-2026-11-25 | technical | changed: document owned `--owner` clusters, deterministic `offscreen-pg-<ownerId>` namespace, create-only ensure, CAS resize reuse, no implicit delete | infra/platform/postgres/topology.mjs; infra/platform/postgres/tests/topology.test.mjs; infra/platform/postgres/tests/render.test.mjs; docs/technical/platform/database-infrastructure.md; inspected on change branch from base `f582bd005af5785df238c11794049bc9eda44798` | source-tested: PROOF `node --test infra/platform/postgres/tests/*.test.mjs` 59/59 PASS; live owner dual-cluster experiment NOT-RUN | baseline+`--owner` refused; non-baseline without `--owner` refused; kubectl create only (no apply/adopt); wrong owner/context/operator conflict refused; no delete on omitted cluster | STATUS.md; work/changes/README.md; work/changes/ledger/2026-11.md; OVERVIEW.md |
| docs/runbooks/kubernetes-postgres.md owned independent clusters | technical/runbook | changed: dual-cluster plan/ensure/status examples for same owner at instances=2; preserve single-instance smoke and baseline scale limits | docs/runbooks/kubernetes-postgres.md; infra/platform/postgres/topology.mjs | source-tested via PROOF fixtures; live NOT-RUN | no production HA/failover/backup claim; ordinary slots stay on shared `dev-pg` | catalog Shared PostgreSQL topology section |
| docs/technical/platform/verification-programmes.md CNPG adapter builder | technical | changed: future CNPG verification adapter must consume INF54 shared builder; preserve VER02 Docker random run UID, bounded profiles, explicit fault and cleanup | docs/technical/platform/verification-programmes.md; work/changes/open/2026-11-25--ver02-owned-postgres-verification-resource/CHANGE.md | reviewed + INF54 source PASS; VER02 adapter implementation NOT-RUN | must not weaken VER02 Docker contract or maintain a second CNPG manifest algorithm | VER02 CHANGE alignment row |
| Product player/story/auth contracts | product | unchanged because no player-facing behavior moved | no product Markdown edits; inspected diff vs base `f582bd005af5785df238c11794049bc9eda44798` | reviewed | no product promise rewritten for owned clusters | map update not required because product docs untouched |
| Application shard routing and SCALE02 HA/RPO | technical | unchanged because INF54 only creates isolated experiment datasets; SCALE02 retains HA/RPO/backup acceptance | no SCALE02 or shard-routing edits; inspected diff vs base | reviewed | topology ensure does not redistribute data or rebind ordinary workload endpoints | map update not required because SCALE02 owners untouched |
