# Fresh-clone workstation bootstrap

Start here for ordinary local Kubernetes development on Windows + WSL2 (Ubuntu 24.04 x86-64). Native Linux and macOS host preparation are NOT IMPLEMENTED. Source-only work does not require clusters. Release is a separate purpose, not a development prerequisite.

## 1. Host and dependencies

Run from the intended clone/worktree root. Confirm the assigned branch, HEAD and target before any mutation. Read [host prerequisites](../../infra/host/README.md).

```bash
bash infra/host/check.sh
pnpm install --frozen-lockfile
```

Run the second command only after the host check succeeds. If blocked, follow the reported WSL preparation instructions and repeat the check. Docker Desktop/WSL configuration and `bash infra/host/setup.sh --install-system-packages` require explicit owner authorization; do not self-authorize privilege escalation or replace existing tools silently.

## 2. Development foundation

```bash
node infra/environments/infra-cli.mjs up --env dev --services none --json
```

This creates an absent owned development cluster or verifies the existing foundation. Require exit zero, phase `cluster-ready`, context `kind-offscreen-dev` and empty selectedServices. Node readiness is not complete DNS, storage or application connectivity acceptance. The plan command previews service selection, not observed cluster creation decisions.

## 3. Development services

Observe PostgreSQL first:

```bash
node infra/environments/infra-cli.mjs status --env dev --services postgres --json
```

If PostgreSQL is absent, obtain explicit owner maintenance authorization and quiescence before the following command. Stop topology, tenant, Temporal and concurrent provisioning writers. The local baseline lock alone does not coordinate all writers. Do not export or persist the grant, self-authorize it, or use it to repair partial installation.

```bash
OFFSCREEN_POSTGRES_MAINTENANCE=authorized node infra/environments/infra-cli.mjs up --env dev --services postgres --json
```

If PostgreSQL is already installed, do not grant maintenance authorization for ordinary reuse. Unknown, partial or not-ready state stops progression. See [PostgreSQL safety contract](../../infra/platform/postgres/README.md).

```bash
node infra/environments/infra-cli.mjs up --env dev --services core --json
node infra/environments/infra-cli.mjs status --env dev --services core --json
```

Development core is PostgreSQL, object storage and Temporal. Require successful ensure and exact selected readiness below. Fresh CNPG initialization revokes PUBLIC CONNECT and TEMPORARY on postgres and dev/lab before Temporal. Historical compatible PostgreSQL reuse does not modify initialization history. Temporal's independent SQL isolation gate remains authoritative; occupied database maintenance requires separate authorization. See [Temporal maintenance guidance](kubernetes-temporal.md).

### Selected readiness assertion

Status exit zero alone is NOT readiness. Require all of the following on the JSON receipt:

- ok is true, phase is status, profileId is dev and contextName is kind-offscreen-dev.
- cluster is present.
- selectedServices contains exactly postgres, object-storage and temporal, each once.
- services contains exactly the same keys, every state is installed.

For a reproducible shell assertion, use this read-only pipeline from Bash with pipefail enabled:

```bash
(
  set -euo pipefail
  node infra/environments/infra-cli.mjs status --env dev --services core --json |
    node --input-type=module -e '
      import assert from "node:assert/strict";
      import { readFileSync } from "node:fs";
      const r = JSON.parse(readFileSync(0, "utf8"));
      const expected = ["object-storage", "postgres", "temporal"];
      assert.equal(r.ok, true);
      assert.equal(r.phase, "status");
      assert.equal(r.profileId, "dev");
      assert.equal(r.contextName, "kind-offscreen-dev");
      assert.equal(r.cluster, "present");
      assert.deepEqual([...r.selectedServices].sort(), expected);
      assert.deepEqual(Object.keys(r.services).sort(), expected);
      for (const id of expected) assert.equal(r.services[id].state, "installed", id);
      console.log("Selected development core: READY");
    '
)
```

For other explicitly authorized selections, apply the same predicate with the exact requested profile, context and service IDs. Do not infer readiness from status exit code, or treat an absent optional service as a core failure. These are structural observations, not protocol or workload acceptance.

### Optional development services

Only when required by the assigned purpose, select Redis and/or RabbitMQ explicitly, e.g.:

```bash
node infra/environments/infra-cli.mjs up --env dev --services redis,rabbitmq --json
node infra/environments/infra-cli.mjs status --env dev --services redis,rabbitmq --json
```

Assert exact readiness of the selected extras using the preceding predicate. Do not use the all alias. Legacy observability is excluded. See [operator quick reference](local-development-platform.md).

## 4. Application development

Follow [owned development environment](dev-worktree-stacks.md) for configuration, slot admission and lifecycle. Do not inherit another worktree's credentials or reserve/attach a foreign slot.

```bash
pnpm dev
pnpm dev:status
```

Require owned session readiness and expected workload/endpoint observations from that runbook. No paid model calls are authorized by bootstrap. When finished, park only the owned environment:

```bash
pnpm dev:stop
pnpm dev:status
```

After successful parking, status exit code 2 with the explicit no-session result is expected; any other failure requires investigation. Parking preserves tenants, cluster foundations and retained image artifacts. It does not authorize deleting data or pruning Docker storage.

## 5. Separate release purpose

Only if expressly selected, create/verify the release foundation with the direct Node entrypoint and --env release --services none --json. Observe release PostgreSQL; use the same scoped maintenance approval procedure if absent. Ensure and observe release core using --env release --services core --json. Assert the exact profile release, context kind-offscreen-release, present cluster, and installed postgres, object-storage, temporal and gateway. Redis is separately selected. Release RabbitMQ runtime acceptance is gated; legacy observability is excluded. Release application deployment is separate: see [local development](local-development.md).

## Failure and acceptance boundaries

Stop on unexpected nonzero exit, refusal, partial/unknown state or failed readiness assertion. Preserve receipts and report the exact SHA, profile/context, failed phase, known mutations and skipped steps. Read-only re-observation is allowed. Do not retry blindly, reset clusters, delete receipts, rotate credentials, repair a partial tuple or adopt foreign resources. Owner decides recovery. Never report raw credential bytes, environment dumps or kubeconfig. Direct Node infrastructure commands avoid incidental package-manager dispatch; install dependencies explicitly.

Engineering acceptance is separate from routine bootstrap. Use the relevant cases in [verification catalog](../../infra/verification/CAPABILITIES.md) when assigned; the broad diagnostic suite is not a normal startup prerequisite. No hosted deployment, unprepared-host installation, or complete protocol acceptance is implied by a successful local run.

## Acceptance checkpoint (26 November 2026)

- Core: dev 3/3 and release 4/4 READY; combined reuse 12.315 s and 12.732 s respectively. Explicit PostgreSQL ACL maintenance was required. Dev object storage and Temporal are repaired specimens, not uninterrupted fresh acceptance. The object-storage pending receipt was manually reconciled and archived after identity review; the incomplete Temporal role/Secret were explicitly removed before successful provisioning.
- Redis: fresh install and repeated ensure passed on both profiles.
- RabbitMQ dev: at `7d69be0a`, live ordinary smoke completed in 2.837 s, with SMOKE-PUBLISHED, SMOKE-EMPTY, MGMT-OK, METRICS-OK and a separate same-run wrong-password Pod log AUTH-REFUSED 403. At `7f8296bc`, 44 focused Node tests passed and structural observation returned ready; repeat ensure reported mutation none in 1.717 s. At `7d69be0a`, 14 Python tests passed. Original installation timed out on a defective inventory observer; corrected uninterrupted fresh acceptance was subsequently demonstrated by the cold selected-platform run below.
- RabbitMQ smoke custody: at `f5615710`, 30 supervisor tests passed, all four required baseline UIDs were captured, live positive and mandatory negative proof plus UID-conditioned cleanup completed in 4.234 s. Historical fixture count remained 17. Owner dry-run demonstrated wrong UID Conflict and correct UID acceptance without deletion. Owner subsequently removed all 17 historical fixtures using UID-preconditioned deletion and verified absence; local receipts retained. Disruptive modes remain blocked from live CLI; their simulated tests are not runtime evidence. Fresh release RabbitMQ remains separately gated.
- PostgreSQL ACL policy: at `8338fa87`, 103 source tests passed, historical dev/release reuse passed in 9.325 s and 7.463 s, and all eight observed non-template database ACLs were owner-only. Fresh initialization subsequently passed at 093161ae.
- Uninterrupted cold selected-platform provisioning PASS at `093161ae04c13f0a5416e4f5dbf1fd75ac031511`: CLI tests 36/36; dev and release foundations created in 28.788s and 36.338s wall time; PostgreSQL installed in 78.377s and 76.374s. Both profiles had owner-only ACLs on postgres and dev/lab before Temporal, with zero PUBLIC CONNECT or TEMPORARY violations. Dev core 103.215s, release core 282.425s, dev Redis/RabbitMQ 135.832s, release Redis 12.958s. Exact selected status assertions passed 5/5 per profile. No intervention or source change during this successful sequence. Prior failed cold attempt exposed node convergence race, corrected before the successful reset/retry. Host dependencies and cached images retained; independent observability experiment preserved. Total elapsed of two batches 12m49s, excluding time between batches. Host memory 8.5GiB used, 11GiB available; Docker volumes 13.13GB including unrelated experiment.
- Outstanding at the historical cold checkpoint: repeat ensure and protocol verification against fresh specimens, owned application startup/park, fresh-agent runbook experiment, unprepared-host/fresh-clone proof and remaining diagnostic hardening. Existing object-storage proof CLI live path is not wired; do not claim protocol proof from it. Legacy observability and release RabbitMQ excluded. No hosted deployment proof.

## Later acceptance receipts (owner handoff, 26 November 2026)

The following results were supplied by the owner in the bootstrap handoff; they are historical results, not reruns against the current branch.

| Tested revision | Observed result | Limit |
| --- | --- | --- |
| 192f4b12 | Warm ensure of five selected services per profile: dev 19.952s, release 16.349s; ordinary dev RabbitMQ smoke 13.649s, mandatory positive/negative authentication and cleanup passed, no pending mutation receipts observed | Release RabbitMQ excluded |
| 64a64498 | SQL tenant regression 18/18, read-only Temporal persistence verification passed, fresh SQL tenant 34s, schema migration passed; subsequent SQL reuse about 1.7s | Temporal databases admitted only with verified identity and isolation |
| 4ead12e856043ea38e106b555d07ce3ae657ecad | S3 adapter regression 15/15; recovered dev-1 tuple exact; scoped policy, empty groups, no custom bucket policy and authenticated HeadBucket observed | Not fresh uninterrupted tenant provisioning |
| 4ead12e856043ea38e106b555d07ce3ae657ecad | Application startup 254.7s (image build/distribution 212.5s, workload readiness 23.8s), six READY roles; game / HTTP 200, control /control HTTP 307 | Redirect reachability only; no authenticated control functionality or paid model call proof |
| Same owner session following startup | Owned parking 0.628s; status exit 2/no session; three clusters retained; WSL available RAM 6.2 to 9.9 GiB of 19 GiB | Retained tenant and image artifacts; not destructive cleanup |

S3 recovery: fresh dev-1 creation had produced bucket, IAM user, policy and Secret but the bucket was admin-only. The owner verified the empty bucket, IAM inventory and Secret UID b1c74b2a-d83b-4389-a806-9fa7f6fe60b2 and explicitly assigned bucket ownership to dev-1. No deletion or credential rotation. Subsequent reuse/startup passed. Do not repeat this recovery as ordinary ensure or claim it as uninterrupted fresh provisioning.

Later source corrections a8a591c1, 3c5c93d2 and 8689d1b6 route tenant writes through provider custody, harden observation and change guard failure handling. They are committed but focused and live proof are NOT RUN as of this record.

Current remaining mandatory bootstrap gates: focused regression of the correction set; fresh owned tenant provisioning and warm reuse; agent usability and refusal experiment; main reconciliation and affected seam verification. Fresh release RabbitMQ, legacy observability, occupied migration, hosted deployment and unprepared-host installation proof remain separate. Do not interpret earlier repaired specimens as evidence against the later successful uninterrupted shared-platform sequence, or as proof of fresh application tenancy.

See [bootstrap engineering acceptance](fresh-clone-bootstrap-acceptance.md) for the owner-operated proof campaign. Record exact tested SHA and failures; fix the source, not only the running cluster.
