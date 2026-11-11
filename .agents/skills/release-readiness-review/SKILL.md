---
name: release-readiness-review
description: Design or independently review deployment compatibility, build provenance, migrations, worker rollout, feature exposure, rollback and recovery for an Offscreen RPG release. Read-only; no deployments or CI runs by default.
---

# Release and delivery readiness

**Trigger:** first hosted deployment, meaningful production change, schema/worker/API compatibility, credentials/config rotation, release automation, rollback or operational incident. Not for every local commit or documentation edit.

1. Read accepted scope and [delivery technical contract](../../../docs/technical/delivery-and-validation.md). Distinguish **commit, build, artifact, deploy, feature release and user acceptance** before making readiness claims.
2. Consult relevant sections of [Release and delivery engineering](../../knowledge/release-and-delivery-engineering.md). Compare simple manual delivery, full deploy, rolling, blue/green, canary, feature flags and GitOps **by actual risk/ops cost**. Kubernetes is never a default requirement.
3. Identify source SHA/artifact identity, config/secrets, dependency versions, schema compatibility, active browsers, old/new worker overlap and queued/durable operations. For schema change, also consult [data/migration knowledge](../../knowledge/data-modeling-and-migrations.md) where needed, not automatically.
4. Define proportionate build/verification gates and **user-observable** acceptance evidence. A green pipeline or liveness probe is not sufficient. No expensive CI or external service should be started merely for review.
5. Specify abort/roll-forward/rollback: what can revert, what persisted state/external effects cannot, and what a safe operator actually does. Name concrete blast radius, diagnostic evidence and who approves the deployment.
6. Output: `release identity and change | delivery alternatives | compatibility matrix | required verification | observable success/abort gate | recoverability and owner | remaining approval`.

**Permission:** read-only. No hosted action, CI rerun, migration, deployment, secret access, external inference or production operation without explicit scope-specific authorization.
