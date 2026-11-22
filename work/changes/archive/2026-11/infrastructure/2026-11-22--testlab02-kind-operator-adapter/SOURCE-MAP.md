# TESTLAB02 | Inspected source and ownership map

Inspected attached lean repo snapshot `34a4567015b98145cb3cc442de647f28751fd689` and its current `undertaking/storyteller-workshop` GitHub HEAD (identical). The live pod observations below are Cursor's report, **not** independently interrogated by ChatGPT.

| Owner/function | Current reality | Exact change |
| --- | --- | --- |
| `scripts/repo-tools/testlab-funding.mjs::runTestlabFundingCommand` and CLI invocation footer | injected hook dependency, no runtime kind hook; CLI `JSON.stringify(receipt)` throws for `plan.plan` with `250000n` | use explicit JSON replacer only at receipt emission; bind kind adapter for bare CLI when target kind, preserving pure injected API |
| `scripts/repo-tools/testlab-funding.mjs::buildTargetObservation` | kind read uses empty observation when hook absent; write flag required even before observer | fail explicit missing-kind-observer rather than fabricated wrong-cluster; after adapter wiring report actual runtime read failures |
| `scripts/repo-tools/testlab-funding.mjs::runTestlabFundingStatus` | calls `verifyTestlabTarget(observation)` and then `queryReadOnly` only if target is verified | pass intent read, database query only under proven observation |
| `scripts/repo-tools/testlab-funding.mjs::runTestlabFundingEnsure` | requires grantStore injection and `--operator-grant-authorized` | intent write; require actual pinned UID arguments, independent owner approval; call existing store, no SQL bypass |
| `scripts/repo-tools/testlab-target-guard.mjs::verifyTestlabTarget` | requires operatorGrantAuthorized true even for read-only status; verifies cluster UID, expected UID, CNPG identity, GA/executor env; does not itself query kube APIs | add explicit intent parameter, preserve strict write checks; reject envFrom/valueFrom ambiguity before trusting absence of credentials |
| `scripts/repo-tools/testlab-grant-store.mjs::ensureTestlabGrant` | parameterized real funding/run/grant SQL transaction and advisory lock | **no edit** unless focused regression demonstrates defect |
| `tools/api-integration/test/helpers/testlab-disposable-grant-deps.ts` | disposable DB hook shows `withTransaction` shape `{query}` | borrow interface only; live adapter has isolated connection/pool/transaction management |
| `infra/kubernetes/lab/chaos/preflight.mjs::readClusterUid` | gets `kube-system` namespace UID as cluster UID; explicit kubectl adapter pattern | reuse method, no dependence on chaos mutation controls |
| `infra/kubernetes/lab/cnpg/cluster.yaml` | CloudNativePG Cluster `lab-postgres/lab-pg`, initialized DB/owner `lab` | exact CNPG expected identity, don't select by arbitrary URL |
| `infra/kubernetes/lab/app-release/install.sh` | copies `lab-postgres/lab-pg-app` Secret `uri` to app `game-db`; no operator funding setup | read secret in memory only; **do not alter** installer |
| `infra/kubernetes/lab/dev/{authority,workers}.yaml` | declares scripted writer mode for GA/executor | compare actual Kubernetes resources, not manifests only |
| `packages/db/package.json` | declares `pg@8.23.0`; root scripts are not a `pg` dependency owner | resolve pg via `createRequire` rooted at `packages/db/package.json`, don't install another package |
| `docs/runbooks/provider-free-game-tests.md` | truthful hook-only operator instructions | document new connected read-only status/guarded ensure |
| `work/changes/open/2026-11-19--turn03-full-distributed-forkable-turn-proof/TURN03-CURRENT-EXECUTION.md` | separate 8-gate TURN03 acceptance | read-only pointer update only; no proof claim or live launch replay |

## Selected operational seams
`scripts/repo-tools/testlab-kind-observer.mjs`: injected subprocess runner for `kubectl --context kind-offscreen-lab get`, `kind get clusters`; returns policy observation + independent UID refs and sanitized workload metadata. No mutation subprocesses; only fixed Kubernetes object selectors.

`scripts/repo-tools/testlab-kind-db.mjs`: injected kubectl port-forward spawn, secret read, pool factory, one readonly SQL session or one transaction-scoped grantStore. Returns deps in current TESTLAB01 interface, shields secret, closes/kills in finally. Bound exactly to observed kube UID, CNPG UID and pinned DB/owner. Revalidate before write.

`scripts/repo-tools/testlab-kind-cli.mjs`: thin command orchestrator to combine observer, DB adapter, `runTestlabFundingCommand`; only imported into CLI when `--target kind-offscreen-lab` and `status|ensure`. Existing callable unit API remains dependency-injected.

**Important trust judgment:** the live workload *image tags* reported by Cursor are mixed: Web release, API/GA/worker Tilt. This alone is not the grant target identity. GA and executor actual Pod env/ready-image + CNPG are the relevant gates, and full TURN03 cold-release proof must still validate release image coherency separately.
