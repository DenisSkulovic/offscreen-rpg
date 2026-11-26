# PostgreSQL native baseline renewal

Commissioned by owner 2026-11-26, direct ChatGPT implementation; target main de2d42f90f6b0ebc69eea21d88e1f6df42657070; implementation branch change/postgres-native-baseline. Owner waived additional independent design review for this scope only. Frozen design c6d3a752d01cf1ba2135f8ed277627ebb7cb0615, see [dossier](https://github.com/DenisSkulovic/offscreen-rpg/tree/c6d3a752d01cf1ba2135f8ed277627ebb7cb0615/work/designs/open/postgres-platform/). No deployment or existing cluster mutation authorized. Scope: compatibility, observation, native ensure, existing adapter migration, proof. Preserve topology/tenant/Temporal contracts. Source and live acceptance pending; no integration until proof.

## Implementation checkpoint

Shared native worker, observation and compatibility policy, custody, public adapters and initial test migrations are committed on the Change branch. Source acceptance has not been executed. Exact upstream operator artifact must be placed at `infra/platform/postgres/vendor/cnpg-1.30.2.yaml` and independently verified against `operator.pin` before runtime use. Do not substitute regenerated YAML. The maintenance gate is `OFFSCREEN_POSTGRES_MAINTENANCE=authorized` for creation only, representing owner-confirmed quiescence of topology, tenant, Temporal and other baseline writers. It is not permission to delete or repair existing objects.

Remaining proof: vendor inventory compatibility against measured specimens, all affected source tests, worker acknowledgment/unknown/collision/no-op paths, disposable native installation and repeat invocation. No live proof or main integration claimed.

## Source acceptance checkpoint

Owner ran the focused suite at b127bb0: 173/173 pass, vendor committed. Broader suite: 426/432 pass; status regression traced to loss of absent/unreadable distinction and old kubeconfig fixture. Corrected here; rerun pending. Five other failures involve move-map, image-loading and retired tenant proof paths; compare against main before attributing them to this change. Runtime acceptance remains blocked pending isolated target proof.

Owner recheck at c292f6c: PostgreSQL tests and infra-cli, 123/123 pass. Status regression closed. No live acceptance yet. Five remaining downstream failures require baseline comparison, not speculative edits.

Control experiment on main de2d42f90: 33/38 passed, exact same five downstream failure names (move-map, Docker context, two slot-image tests, tenant trial proof paths). Classified as pre-existing, outside this Change. Runtime acceptance still not run.

Disposable dev proof harness: owner explicitly authorized isolated approach. Harness routes only through a private generated kubeconfig bound to unique Kind name, loopback port, control-plane label/port and per-run namespace UID/marker. It adapts target identity in the injected proof runner, not production entrypoints. Real Helm/kubectl, custody and SQL remain in use. No automatic cleanup, no dev/release cluster changes. This proves worker fresh/repeat behavior with target routing adapted; not the unmodified production CLI or release guard. Runtime not yet executed.

## Live dev worker proof

Owner terminal at 06abebb91: isolated Kind offscreen-pg-proof-635f0281d80c, port 24444, evidence /tmp/offscreen-pg-proof-oUzT3k. Total 2m02s. Fresh ensure ready, exactly three persistent commands acknowledged (26-object operator SSA, Namespace create, Cluster create); dev-pg-1 writable, instance count 1. Repeat without maintenance ready, zero persistent commands, all 28 inventory/namespace/cluster UIDs unchanged. Native admission and SQL succeeded. PASS for dev worker with isolated target routing, not production CLI or release guard. Negative live acceptance and release profile proof remain.
