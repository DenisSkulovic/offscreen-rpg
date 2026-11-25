# Verification contracts

Proposed design only. Keep existing verification runner; no additional global framework.

## tests/ directory

Proposed install.test.mjs covers command arguments, profile, target refusal, missing prerequisite, pin mismatch, healthy no-op, drift/upgrade refusal, failure/timeout and serialization. Add readiness.test.mjs for observation state distinctions, rollout and gRPC failures, optional UI/admin failure, and proof that no mutating command is invoked. Inject existing command runner; use node:test. Tests are deterministic and do not start clusters. Keep render checks against real pinned archive separate from mocked command tests.

## Live verification

Initial acceptance/source tests: archive checksum refusal; both profiles render with exact selected archive; inspect YAML for four deployments, services, correct image refs, no bundled DB, no leaked Secrets, schema hooks and correct DB references, no public listeners; context mismatch and missing PG/Secret refuse before Helm; healthy no-op; version drift refuses normal ensure; timeout and failed Job never reported ready; simultaneous ensure serialized; profile selection and parent receipt compatibility. Use existing node:test style where needed, Helm lint/template where supported. No new test framework.

Initial live acceptance (separately authorized, use existing infra verification runner and owned resources):
- Observe explicit cluster UID, CNPG readiness and schema versions; frontend health and service connectivity from app network.
- Deterministic SDK workflow with activity, timer and signal; unique fixture ID/namespace, no LLM/game/paid calls. Assert result and history; list completed workflow via visibility with bounded eventual-consistency wait.

Advanced resilience experiments (not startup gates or prerequisites to basic install acceptance):
- Pause fixture worker, observe outstanding task, restart it, assert same workflow/run resumes; activity attempts are not guaranteed exactly once, fixture effect idempotent.
- Authorized server restart while workflow waits, then signal and complete same run; assert durable history. Do not restart shared platform with foreign workloads without permission.
- Repeated ensure preserves release revision and does not initiate a rollout or rewrite credentials; pod UIDs may change independently due to Kubernetes recovery and are not an invariant. Verify denied target has no mutations. This no-op check belongs to basic acceptance, not a restart experiment.
- Record peak RSS, requests, CPU, PG sessions and disk, elapsed duration, image/chart pins and redacted failures. Separate PASS/FAIL/NOT-RUN; no source-only evidence masquerading as live proof.

Repeated ensure/no-op is basic acceptance, not an advanced resilience experiment. Record no rollout initiated rather than demand unchanged pod UIDs. No paid calls. No restart of shared service without permission.
