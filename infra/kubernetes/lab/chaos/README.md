# Chaos lab (K8S10) — plan-only controller

Read-only preflight and deterministic target planning for the disposable `offscreen-lab` kind cluster. **Plan mode is the default**; the CLI does not create, delete, or mutate cluster resources.

## Safety

- Kubectl always uses `--context kind-offscreen-lab` (see `infra/kubernetes/lab/lib.sh`).
- Plan mode forbids `delete`, `exec`, `apply`, `scale`, and related mutating verbs.
- `--execute` is **rejected** until T04 implements controlled fault injection.
- The runner never auto-switches kubectl context or creates/deletes a kind cluster.
- Cluster identity requires a read-only `kube-system` namespace UID; image ownership requires a pinned `sha256:` digest present in the release ref **and** on the live Deployment manifest (no tag-only guesses).

## Command grammar

From the repository root:

```bash
node infra/kubernetes/lab/chaos/controller.mjs \
  --mode plan \
  --run-id <safe-id> \
  --seed <seed> \
  --release-ref <path-to-release-ref.json> \
  [--max-events N]
```

Flags:

| Flag | Default | Meaning |
| --- | --- | --- |
| `--mode plan` | yes | Read-only preflight + sanitized plan JSON on stdout |
| `--dry-run` | implicit in plan | No side effects |
| `--run-id` | required | Lowercase alphanumeric + hyphen, 2–64 chars |
| `--seed` | required | Deterministic selector input (passed to T01 `selectTarget`) |
| `--release-ref` | required | JSON file listing pinned Deployment owners + digests |
| `--max-events` | `1` | Upper bound recorded on the plan (execution is future work) |
| `--execute` | — | Rejected with `execute-not-implemented` until T04 |

## Release ref shape

```json
{
  "schema": "offscreen.chaos-release-ref.v1",
  "releaseOwners": [
    {
      "namespace": "lab-app",
      "name": "storyteller-worker",
      "uid": "<deployment-uid>",
      "kind": "Deployment",
      "imageDigest": "sha256:<64-hex>",
      "labels": { "offscreen.rpg/chaos-eligible": "true" }
    }
  ]
}
```

## Preflight checks (fail closed)

1. Safe `runId`, seed, and `max-events`
2. No conflicting operator at `/tmp/offscreen-k8s-cluster.lock`
3. `MemAvailable` ≥ 4 GiB (mirrors `lib.sh`)
4. Current kubectl context is exactly `kind-offscreen-lab`
5. `kind get clusters` lists `offscreen-lab`
6. Cluster UID from `kube-system` metadata
7. Release ref owners match live Deployment UID + digest
8. Pod snapshot + T01 selector → one stable target

## Plan output

stdout is a single JSON object:

- `status: "planned"` with `target.podUid`, cluster metadata, and `preflight.mutatingInvocations: 0`
- `status: "refused"` with `reason` / `detail` when any check fails

Schema id: `offscreen.chaos-plan.v1`.

## Tests

Unit tests mock kubectl/kind; no cluster required:

```bash
node --test infra/kubernetes/lab/chaos/test/preflight.test.mjs
node --test infra/kubernetes/lab/chaos/test/selector.test.mjs
```

## Related

- Pure selector: `selector.mjs` (T01)
- Lab guards: `infra/kubernetes/lab/lib.sh`
- Program docs: `work/changes/open/2026-11-19--k8s10-distributed-fault-and-load-harness/`