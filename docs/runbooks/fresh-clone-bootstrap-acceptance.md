# Local bootstrap engineering acceptance

This is an engineering proof procedure, not a second bootstrap runbook. Ordinary agents use [fresh-clone bootstrap](fresh-clone-bootstrap.md). Current source correction checkpoint: 8689d1b61084b708895b691c7133ae2b07c3a7cd; subsequent documentation commits do not imply tested source. Integration is held pending mandatory correctness evidence.

## A. Focused source regression (owner-operated, no cluster writes)

Run in the existing bootstrap acceptance worktree only after inspecting local status. Fetch, verify the desired remote SHA, fast-forward the local acceptance branch without discarding local changes, and confirm the exact tested SHA. Do not switch the primary worktree. Dependencies must already be installed as specified by the canonical runbook. Stop if the worktree is dirty or cannot fast-forward.

From the intended worktree root:

```bash
(
  set -euo pipefail
  git rev-parse HEAD
  git status --short
  test -z "$(git status --porcelain)"
  node --version
  command -v flock
  timeout 180s node --test infra/platform/object-storage/tests/provision.test.mjs tools/dev-environments/test/dev-s3-tenant.test.mjs tools/dev-environments/test/dev-s3-tenant-live-adapter.test.mjs
  timeout 180s node --test infra/platform/object-storage/tests/mutation-guard.test.mjs
  timeout 180s node --test infra/platform/object-storage/tests/object-storage-install.test.mjs infra/platform/object-storage/tests/readiness.test.mjs infra/verification/smoke/object-storage/proof.test.mjs
  timeout 180s node --test infra/environments/infra-cli.test.mjs
)
```

Require every selected suite to pass with zero failures and no unexpected timeout. These fixtures use injected observations or temporary local guard state, not live canonical cluster mutation. The proof CLI tests do not establish runtime S3 protocol proof: its live ensure remains unwired, and the retired dev S3 tenant trial refuses execution. Retain failed output, with secrets redacted. Do not proceed to live proof on failure. Record suite counts and wall times. The guard contention tests must exercise real local flock and subprocess behavior. A timeout is a failure, not permission to delete a lock or pending receipt.

## B. Fresh tenant and repeat proof (separate live authorization)

Selected route: ordinary owned development allocation/startup, not arbitrary dev-N injection or a retired trial. Prefer the same isolated supported workstation specimen used for the fresh-agent experiment so the ordinary CLI is the actual allocator. Before commission, verify that its Docker engine, Kind contexts, registry root and local mutation state are distinct from the owner's current WSL environment, and confirm the exact candidate SHA. Do not use a second canonical-context cluster against the same Docker engine or share a registry between distinct cluster incarnations. If no isolated supported workstation is available, planner and owner must select a genuinely unused registry allocation in the existing dev cluster after inspecting the actual allocation/startup source and resource inventory; do not guess a slot. Do not run this alternative without that explicit selection.

Require complete absent tenant tuple before startup, then a successful ordinary fresh startup with no repair, exact provider tuple admission, no pending receipt, all six workloads ready, and documented endpoint reachability. Record nonsecret bucket/principal/Secret name and UID; never print key material. Park only the owned runtime. Restart the same owned environment, require read-only exact S3 reuse and unchanged Secret UID and credential identity (compare internally, no credential bytes or hashes in report), then park again. Preserve tenants and artifacts. No arbitrary bucket ownership changes, receipt removal or destructive cleanup. An uncertain mutation stops further provider writes pending owner review.

The current dev-1 recovered specimen and all three current clusters must remain untouched. Full protocol isolation matrix and release scoped runtime proof are separate object-storage gates, not proven by HeadBucket. No paid calls.

## C. Fresh-agent usability experiment

Prerequisites: genuinely fresh Claude Code session; candidate checkout on an isolated supported Windows/WSL2 workstation with independent Docker engine, Kind contexts, registry and lock state; prepared host tools permitted, no inherited workspace dependencies or local config. Verify host and target identity before commission. Explicit owner authority for the selected dev foundation, core service ensure, owned application startup and parking; privileged host setup and fresh PostgreSQL maintenance require separately recorded approvals. No release or optional services selected. No other writer active. Do not manufacture isolation by deleting existing clusters.

Give the agent only this prompt, actual checkout/target and scoped authorizations (not this proof document, historical commands, or known fixes):

> In the assigned repository checkout, prepare the local development environment using the repository's documented procedure. Start your owned application environment, verify readiness, then park it. Target only the assigned local development cluster. No release or optional services, paid model calls, destructive cleanup or improvised recovery. Request any required scoped owner approval before mutation. Report the exact revision, commands, outcomes and any undocumented decision or failure.

The owner observes rather than coaching. Record initial host/dependency/cluster facts, agent-discovered documentation, phase exit codes and timings, readiness evidence, allocated slot, parking evidence and each intervention. Require zero undocumented decisions, unexpected interventions, implementation-source reads needed for a successful normal path, wrong-context operations, unauthorized mutations and invented recovery commands. Explicit expected maintenance approval does not count as an unexpected intervention. If the agent cannot proceed safely, record the specific documentation/implementation blocker; do not silently guide it through the experiment.

Separate negative scenarios: use an isolated specimen lacking a documented required prerequisite, and an isolated partial/unknown platform fixture chosen and authorized by the owner. Require stop before dependent mutations and clear identification of the missing/unknown condition. The negative fixture must be specified by planner from actual source and provisioned only with separate approval; do not create a partial state in the owner's current clusters. No automatic retries, deletion or repair. Record before/after nonsecret resource identities and command trace. Do not claim a scenario passed if only a simulated unit test ran.

## Receipt

Record tested full SHA; host/target identity (nonsecret); scenario; start/end and duration; command/exit; expected vs observed result; mutation status; resource custody/cleanup; remaining gates. Record counts for each usability metric and explicit approvals. Distinguish PASS, FAIL and NOT RUN. Preserve raw local receipts privately; commit only redacted evidence. Integration custodian reconciles current main, reruns affected mandatory seams and records integrated SHA before retirement. No integration while correctness or required acceptance gates remain open.

## Focused regression receipt: PASS (2026-11-26)

Owner-operated WSL run at exact candidate `f20225ef9af45845032a0cb03006ee38718e576d`, Node v24.19.0, /usr/bin/flock, clean acceptance worktree fast-forwarded to candidate. All four batches completed, no failures, skips, cancellations or timeouts:

| Batch | Passed | Wall time |
| --- | ---: | ---: |
| Tenant classifier, orchestration and adapter | 49/49 | 0.138s |
| Mutation guard, real local flock and child fixtures | 20/20 | 9.537s |
| Provider install, readiness and proof harness | 55/55 | 0.336s |
| Infrastructure CLI | 36/36 | 0.398s |
| Total | 160/160 | 10.409s across test batches |

Terminal ended with FOCUSED ACCEPTANCE PASSED. Negative foundation messages were expected fixture output; no live provisioning was performed by the selected tests. This receipt closes the focused regression gate for the tested SHA, not the uninterrupted fresh tenant, live SDK/protocol, fresh-agent or integration gates. No repair or paid model call was required. Next: select and verify an isolated live acceptance target before mutation.
