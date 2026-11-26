# PostgreSQL native baseline renewal

Commissioned by owner 2026-11-26, direct ChatGPT implementation; target main de2d42f90f6b0ebc69eea21d88e1f6df42657070; implementation branch change/postgres-native-baseline. Owner waived additional independent design review for this scope only. Frozen design c6d3a752d01cf1ba2135f8ed277627ebb7cb0615, see [dossier](https://github.com/DenisSkulovic/offscreen-rpg/tree/c6d3a752d01cf1ba2135f8ed277627ebb7cb0615/work/designs/open/postgres-platform/). No deployment or existing cluster mutation authorized. Scope: compatibility, observation, native ensure, existing adapter migration, proof. Preserve topology/tenant/Temporal contracts. Source and live acceptance pending; no integration until proof.

## Implementation checkpoint

Shared native worker, observation and compatibility policy, custody, public adapters and initial test migrations are committed on the Change branch. Source acceptance has not been executed. Exact upstream operator artifact must be placed at `infra/platform/postgres/vendor/cnpg-1.30.2.yaml` and independently verified against `operator.pin` before runtime use. Do not substitute regenerated YAML. The maintenance gate is `OFFSCREEN_POSTGRES_MAINTENANCE=authorized` for creation only, representing owner-confirmed quiescence of topology, tenant, Temporal and other baseline writers. It is not permission to delete or repair existing objects.

Remaining proof: vendor inventory compatibility against measured specimens, all affected source tests, worker acknowledgment/unknown/collision/no-op paths, disposable native installation and repeat invocation. No live proof or main integration claimed.
