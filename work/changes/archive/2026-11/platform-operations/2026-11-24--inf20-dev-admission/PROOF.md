# INF20 proof

- `node --test tools/dev-environments/test/dev-tilt.test.mjs tools/dev-environments/test/dev-v2-cli-startup.test.mjs` — 58 pass, 0 fail. Negatives: missing Tilt, daemon down, foreign port, stale PID, active session (zero reconcile); spawn/fingerprint/timeout/early-exit rollback without foreign signal.
- `node --test tools/dev-environments/test/dev-slot-startup.test.mjs tools/dev-environments/test/dev-fu03-startup.test.mjs` — 20 pass, 0 fail. Negatives: no artifact/SQL on bad platform or OAuth; artifact failure before SQL.
- Live cluster, Tilt, and Docker: NOT-RUN.
