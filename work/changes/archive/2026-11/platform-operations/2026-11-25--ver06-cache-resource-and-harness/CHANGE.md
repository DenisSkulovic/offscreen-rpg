# VER06 | Owned Redis resource and CACHE07 harness migration

**State: Done (source implementation; live Redis acquire/fault/cleanup NOT-RUN).** Closed 2026-11-25 on Change branch `change/ver06-cache-resource-and-harness` from main `e67ffede3a666c64d506403b92814f4ea84d0215`. Joined main at `4bce83f3cd47fe39c97f0d167edd911acd4c862c`. Kind: implementation. Profile: PROOF. Baseline `816b9e6e447041e119b2208cca7d62a66827de0c`. VER01/VER02 joined; no overlapping CACHE08 source writes.

[Cache architecture](../../../../../../docs/technical/platform/persistence-and-caching.md) · [Verification contract](../../../../../../docs/technical/platform/verification-programmes.md) · [TASKS](TASKS.md).

Separate linked Change worktree from current main; branch guard `--change VER06 --target main`. One bounded Composer child at a time, parent serializes shared manifest/lockfile/catalog joins. Source implementation and focused tests commissioned; live resources only explicit operator `--live` through common runner. No shared Redis/SQL, production, provider, tenant, or deployment mutation. Preserve public API/domain authority and existing work. Record exact SHA, paths, command/cwd, positive/negative tests and tier. Source join does not confer live acceptance. Actual safety or semantic contradiction returns to planner with exact evidence; missing live permission not source blocker. No unselected successor.

## planned-impact.v1
| Plane | Disposition |
| --- | --- |
| Product | No gameplay/auth/spend change |
| Technical | Selected cache and verification guarantees |
| Source | TASKS named owners only |
| Proof | Source/fixture/live separated; no fabricated PASS |
| Related | Canonical docs, capability catalogue and receipts |

## Reconciliation ledger
| Claim | Authority | Source SHA | Evidence | Negative |
| --- | --- | --- | --- | --- |
| Owned Redis Docker adapter (plan/create/auth/fault/cleanup) | verification-programmes.md Realization VER06 + Cache programme Redis resource | 4bce83f3cd47fe39c97f0d167edd911acd4c862c; inspected vs main `e67ffede3a666c64d506403b92814f4ea84d0215` | source-tested: `node --test tools/verification/resources/redis/*.test.mjs` 23/23 PASS; live Docker acquire NOT-RUN | docker-endpoint-not-local; image-not-local; foreign-run-label; port-not-loopback; REDIS_URL/DOCKER_HOST refused; credentials omitted from public facts |
| CACHE07 harness migrates off resource lifecycle; legacy `--live` refuses | persistence-and-caching.md Current state; verification-programmes.md Cache programme | same | source-tested: `node --test packages/cache/test/distributed/harness.test.mjs` 21/21 PASS | legacy live retired before Docker/worker; hung RPC timeout; malformed/partial reject; cleanup-failed; suite-interrupted; harness has no container removal authority |
| `@offscreen/cache` suite registered; source profile runs package+harness tests; live IDs NOT-RUN | verification-programmes.md Realization VER06 | same | source-tested: focused catalog/plan/adapter/cli tests PASS; `node tools/verification/runner/cli.mjs package cache --profile source` PASS (CA-S01/CA-S02); quality-lint clean on owned files | redis section without `--live`: 0 acquire calls, CA-R* NOT-RUN; unimplemented live → scenario-not-implemented |
| Live Redis/memory/SQL acceptance | VER07 / VER08 | N/A | NOT-RUN | must not claim live PASS from VER06 source join |
