# Native lifecycle experiment (R4)

This is a concrete **design specimen**, not runtime code. Use only the owner-operated experiment command. The chart is namespace-fenced to offscreen-redis-proof-* and has exactly three namespaced resource types, no credentials, hooks or namespace creation. Retains baseline resource envelope; immutable digest observed in both Kind runtimes and Docker experiment. No-auth fixture is only for trusted local Kind; namespace alone is not network isolation. No real application traffic.

Run from the repository root, using a temporary extraction of this dossier from the candidate commit; Python script imports current main target guard. Explicit --confirm-disposable kind-offscreen-release authorizes a fresh randomly named namespace and its deletion, including all fixture children. No edits to baseline Redis, shared lab-a or dev. Two Redis Pods at most (256MiB aggregate limits, 1 CPU limit), host MemAvailable floor 512MiB is an experimental admission guard not capacity proof; Kubernetes scheduler still governs actual placement. Do not run concurrent experiments or other writers in the namespace. If image not cached, kubelet may pull the digest. All waits bounded; no blind retries.

| Stage | Discriminator |
| --- | --- |
| Local render/lint | Valid chart before mutation |
| Fresh install | Helm revision and three owned objects; config, digest, UID chain, endpoint and PING via Service |
| Repeat | Same object UIDs and revision; no install invoked |
| Collision | Orphan with matching metadata refused before Helm, UID/resourceVersion/data unchanged, no release |
| Failed install | Readiness fault in copied fixture chart, native failure retains record and objects; repeat refuses; good pool unaffected |
| Cleanup | Namespace UID and resourceVersion preconditions; wait for deletion; legacy resource UIDs unchanged before cleanup |

Limits: guard is a small specimen, not full production compatibility comparator; no production upgrade, adoption, or claim against arbitrary competing writers. PING originates in Redis Pod through Service, not a distinct application client. Failure exercises readiness-timeout partial lifecycle, not mid-create network loss or all fault classes. Exact chart/schema and Python source checks must run locally; no live run by planner. Namespace cleanup is explicitly authorized for this fixture only; if identity/custody changes or unknown creation outcome, refuse deletion and report. Unsuccessful wait is not cleanup proof. No baseline destructive operations. No committee submission yet.

Next after result: assess whether native Helm reduces code with adequate invariants; design migration of existing objects and actual consumer/security boundaries. The chart is intentionally separate from infra/platform/redis.

## Observed result

[Owner run](results.md) passed all specimen stages in 46s; no production acceptance.
