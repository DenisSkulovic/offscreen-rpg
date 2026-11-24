# INF27 proof

T01 and T02 in `/home/dskul/projects/offscreen-rpg-inf27`.

- `node --test infra/workloads/tests/*.test.mjs`: 24 pass, 0 fail (child receipts; parent re-ran at join).
- Helm lint and template for release and development-with-bindings: pass (child). Development lint without bindings still fails schema `allOf` (pre-existing).
- Live cluster, Docker, Tilt: NOT-RUN.

Negative: schema rejects `replicas: 0`. Non-default `replicas` and `imagePullPolicy` change the rendered web Deployment. Trimmed keys (`watched`, `dev.podSecurityOnWorkers`, `catalog.roles`, `catalog.imageFamily`) do not change captured render baselines. Release migration annotations were not edited.
