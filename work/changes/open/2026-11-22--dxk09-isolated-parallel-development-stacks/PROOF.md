# DXK09 | Falsifiable proof plan

**Evidence tiers:** source inspect / unit tests / disposable provider-free local cluster / real Windows-WSL two-worktree session. None executed during planning at `62c930a2`.

| Claim | Positive proof | Discriminating negative |
| --- | --- | --- |
| Stable slot ownership | same canonical worktree and slot repeat returns same identities | second worktree tries same live slot: refusal, no kill, no resource edit |
| Port isolation | slots s01/s02 have disjoint loopback ports | foreign listener on selected port: refusal before mutation |
| Cluster guard | all mutated resources in kind-offscreen-dev context | context kind-offscreen-lab or unknown: zero apply/delete/build |
| Resource ownership | two sets of six Deployments in different namespaces | labels/namespace mismatch on stop: no cross-slot deletion |
| SQL isolation | same story/auth operation ID independently stored in distinct DBs | A DB credentials cannot read/write B DB; release DB untouched |
| Object storage | same object logical key stored under separate buckets | A credentials rejected when writing B bucket |
| Temporal isolation | same logical workflow ID admitted independently in both namespaces, distinct queues | A worker does not poll B namespace/queue |
| Auth | correct user GitHub sign-in per matching origin | missing/mismatched callback or cookie from wrong origin: not READY / denied |
| Tilt sync | change API source in A, only A API reloads | B image/deployment/source hash and start time unchanged |
| Change fallback | unsafe manifest edit in A rebuilds A only | B untouched, release image unchanged |
| Cleanup | stop A leaves A tenants and B workloads intact | stop with B worktree owner mismatch refuses |
| Capacity | enough RAM admits second stack | insufficient resources refuses third/fourth without partial install |
| Release separation | pre/post resource UID/hash comparison on release lab | dev runner against release cluster refuses |

Recommended focused commands after implementation: `node --test scripts/repo-tools/dev-tilt.test.mjs` plus `node --test scripts/repo-tools/dev-stack*.test.mjs`, `pnpm repo:code-quality:changed` with exact base and changed-file Prettier; read tests before asserting command availability. Live Kubernetes and OAuth proof require configured workstation and explicit scope. Never claim full PASS from static checks.

Acceptance record must include exact source HEAD, worktree realpaths, context names, per-slot Pod UID and namespaces, separate tenant identifiers (without secrets), Tilt resource histories, SQL/S3/Temporal negative evidence, no paid provider activity and any NOT RUN gates. Archive only after complete acceptance.
