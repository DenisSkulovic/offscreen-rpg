# INF26 proof

T01: `node --test tools/dev-environments/test/dev-cnpg-bootstrap.test.mjs infra/platform/postgres/tests/*.test.mjs` — 22 pass, 0 fail. Negatives: unreadable cluster/pod, foreign owner, unknown instance role refuse before exec.

T02: object, temporal, and postgres readiness tests 14/14; dev startup quartet 31/31; object-storage and temporal platform tests 53/53. Negatives: nonzero kubectl with JSON stdout, failed schema Job, partial legacy SQL, and foreign ownership refuse with no apply/create/delete.

Live cluster, Docker, and Tilt: NOT-RUN.
