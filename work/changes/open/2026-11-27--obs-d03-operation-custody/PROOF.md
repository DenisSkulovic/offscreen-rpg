# OBS-D03 proof

NOT RUN. Commands from repo root; only existing offline Helm/dependencies and short local subprocess tests. No cluster, image pull, network or paid operation during Cursor implementation. Any required live acceptance is owner-operated after separate authorization; no PASS inferred from fixtures.

| Gate | Predicate |
|---|---|
| V05/A4 | shared/shared coexist; shared/exclusive conflict; proof writer lock; independent worktree same inode exclusion; legacy/invalid fence; replaced record or inode refused; compare advance/clear only own |
| V05 | owned helper parent death kills direct command, inherited FD retains lock until actual close; abort exit0 fails, ignored TERM bounded, overflow/EPIPE/oversized stdin/preabort, no later mutation |
| A5 | exact ensure sequence; any uncertain mutation possible, pending retained; no success after timeout/cancel |
| OD-07 | old/new compatibility or verified owner-controlled exclusion, persisted fences recognized; never assume main merge stops old WSL processes |

```bash
node --test --test-concurrency=1 infra/platform/observability/tests/{custody,forward,install}.test.mjs
```
Feasibility specimen observed 2026-11-27 in the isolated assistant Linux container (kernel 6.18.57, Python 3.13.5, util-linux flock 2.41.5; independently rerun and observed PASS): inherited descriptor held an exclusive flock after the flock subprocess exited and original parent fd closed; independent descriptor refused; direct Python prctl(PR_SET_PDEATHSIG,SIGKILL) + parent-PID check + exec child released last inherited lock after supervisor SIGKILL. Standalone specimen, not repository implementation, not WSL verification. Actual D03 subprocess tests remain mandatory.

Actual subprocess tests: private handshake PID+fd inode, kill only exact owned helper; wrong expected parent PID no side effect; direct child exits after parent death; contender blocked until last inherited FD closes. Simulated close-unconfirmed must retain active registration and fail terminal outcome. Record actual result distinct from close. Existing surviving sleeper test is flock-only evidence.

Parent requires exact source SHA, focused normal/negative results, changed-file formatting/lint and diff review, no unexpected write owner. Fail stops affected integration; report unrun tests and pending program gates. Retain branch/worktree if acceptance pending; no merge without current approved boundary and applicable proof. Full A/V certification remains open.
