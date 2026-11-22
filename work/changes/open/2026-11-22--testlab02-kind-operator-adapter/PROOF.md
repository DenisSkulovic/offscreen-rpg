# TESTLAB02 | Discriminating acceptance matrix

**Planner baseline:** archived TESTLAB01 Done `34a4567015b9` for disposable tests. No kind observer or SQL connector exists. `plan` CLI serializes a `BigInt` and fails. `status` reports synthetic empty observation and write-authorization refusal, not actual kind state.

| Boundary | Positive | Negative/forbidden |
| --- | --- | --- |
| CLI receipt | `plan` exits 0 and exact JSON decimal string `250000` | no precision loss / crash / secret output |
| Read vs write | kind status works without mutation flag | kind ensure blocked without separately provided flag and UID pins |
| Correct cluster | kube-system UID matches expected context; CNPG UID observed | wrong context, absent kind name, replaced cluster UID |
| Correct workload | actual Ready GA/executor Pods, live images aligned, scripted offline env | provider-authorized, key/pin via literal or Secret ref, envFrom, stale image |
| Correct DB | CNPG `lab-pg`, `lab-pg-rw` actual primary endpoint, secret URI `lab`/user `lab`, session reports same | arbitrary DB URL, wrong DB/user, wrong UID, missing service primary |
| No secret leak | pg connection URI only in memory, redacted stdout | subprocess exception, URI, auth token or secret never printed |
| Safe runtime I/O | readonly status uses SQL `BEGIN READ ONLY` and closes port-forward | no grant INSERT/UPDATE/DELETE and no mutating kubectl |
| Authorized ensure | existing grantStore transactional create/reuse when all pins and approval | absent flag, owner, pins, drift, expired/exhausted grant refuse |
| Concurrent/retry | existing lock and store idempotence proven in disposable test | no double grant/duplicate operator write on retry; no unknown-result auto reattempt |
| Cleanup | after status/ensure/error close Pool and port-forward | no leaked local forward/process |
| TURN03 truth | same blocked pending launches untouched during Change | no falsified scene2, provider call, full cold-kind PASS |

Commands: `node --test scripts/repo-tools/testlab-{funding,target-guard,kind-observer,kind-db,kind-cli,grant-store}.test.mjs` from repo root (or individual files), `node scripts/repo-tools/testlab-funding.mjs plan --target kind-offscreen-lab --owner test --suite turn03 --operator testlab:human --approval testlab:suite:turn03`, plus `pnpm --filter @offscreen/api-integration build` and `node --test tools/api-integration/dist/test/testlab-provider-free-launch.integration.js` (disposable only). Record exactly which were run vs NOT RUN. No paid API calls. No live grant creation as acceptance criterion.
