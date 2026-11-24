# INF06 bounded implementation tasks

Read EXECUTION.md. One child at a time. Source-only, no live operations. Actual contradiction stops; ordinary caller reconciliation is execution.

## T01 | Authoritative profiles and shared host probes
Implement config.mjs and host-probe.mjs as selected; move dev bootstrap/probe/CLI into manager, update imports, preserve API compatibility. Derive topology pins in stack-preflight. Test config, host parsers, dev plan/status/refusals and release pin guards. No lifecycle change yet.

## T02 | Shared creation authority
Implement lifecycle.mjs and release create CLI. Dev executeAuthorizedDevCluster delegates create; release up.sh delegates create while preserving snapshot/assembly guards. Injected runner tests both profiles, context restoration, failed create, no-op, stale inventory and no mutation on refusal. Keep release lib shell adapter. No live bootstrap.

## T03 | Foundation versus environment and destructive boundary
Move namespace, storage and owned resource config to selected homes; rename down.sh destroy.sh with exact confirmation and exact Kind label volume selection. Update stack lifecycle command, CI, tests, runbooks and historical-map successor guard. Verify unchanged app down allowlist and byte-equivalent manifests. Fake command negative tests only.

## T04 | Close and prove
Run focused tests and syntax/CI/docs guards listed in EXECUTION.md. Verify no active duplicate topology or kind create owner; all current callers resolve. Update infra/README and technical/runbook ownership. Record exact receipt, limitations, source-only NOT-RUN live. Integrate and retire branch; no next packet automatically.
