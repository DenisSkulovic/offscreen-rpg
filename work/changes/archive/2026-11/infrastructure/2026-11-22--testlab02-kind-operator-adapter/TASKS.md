# TESTLAB02 | Cheap bounded Cursor executor cards

**Baseline:** `undertaking/storyteller-workshop@34a4567015b98145cb3cc442de647f28751fd689`, recheck HEAD. One dedicated `change/testlab02-kind-operator-adapter` linked worktree, never move primary checkout. One Composer Standard parent, small serial children. Parent integrates full Change/archives when accepted; **live kind grant insertion is NOT authorized by the packet**.

### T01 | Valid JSON and status read/write gate
**Write:** `scripts/repo-tools/testlab-funding.mjs`, `scripts/repo-tools/testlab-funding.test.mjs`, `scripts/repo-tools/testlab-target-guard.mjs`, `scripts/repo-tools/testlab-target-guard.test.mjs`.
**Anchors:** CLI footer JSON.stringify; `runTestlabFundingStatus`, `buildTargetObservation`; `verifyTestlabTarget`.
**Algorithm:** exact BigInt string replacer at CLI output; add `intent: read|write` to target guard and pass read from status, write from ensure. Guard default write for old call sites. Remove false wrong-cluster from absent observer: explicit missing-kind-observer. Require expectation UIDs for actual write adapter, not synthetic same-as-observed.
**Proof:** `node --test scripts/repo-tools/testlab-{funding,target-guard}.test.mjs` (shell brace expansion if available); `node scripts/repo-tools/testlab-funding.mjs plan --target kind-offscreen-lab --owner test --suite turn03 --operator testlab:human --approval testlab:suite:turn03` exits 0 and JSON.parse works with exact decimal `250000`; status without auth flag can pass a fully valid injected read observation; ensure without flag blocks. Preserve disposal unit suite.
**STOP:** existing downstream guard callers depend on non-explicit write intent in a way that would authorize a write.

### T02 | Read-only Kubernetes observer
**Write:** `scripts/repo-tools/testlab-kind-observer.mjs`, `scripts/repo-tools/testlab-kind-observer.test.mjs`.
**Anchors:** `scripts/repo-tools/testlab-target-guard.mjs`; `infra/kubernetes/lab/chaos/preflight.mjs::readClusterUid`; `infra/kubernetes/lab/cnpg/cluster.yaml`; `infra/kubernetes/lab/dev/{authority,workers}.yaml`.
**Algorithm:** injected read command executor; only hardcoded `kind get clusters` and `kubectl --context kind-offscreen-lab get ... -o json` resources, block other verbs; parse kube-system and CNPG UID; exact deployment/Pod/Service/endpoint identity, Ready, template image and provider-free env (reject valueFrom/envFrom ambiguity). Shape to existing `TestlabTargetObservation`; derive independent expected UID only from explicit CLI flag for writes, not observed values. No Secrets read here.
**Proof:** focused `node --test scripts/repo-tools/testlab-kind-observer.test.mjs`; positive fixture, negatives wrong cluster, wrong CNPG, wrong namespace, empty endpoint, replaced image, pod not Ready, provider key secret reference, envFrom, subprocess error and size/timeout. No subprocess mutates cluster.

### T03 | Ephemeral bounded CNPG SQL connector
**Write:** `scripts/repo-tools/testlab-kind-db.mjs`, `scripts/repo-tools/testlab-kind-db.test.mjs`.
**Anchors:** `infra/kubernetes/lab/app-release/install.sh` secret propagation; `infra/kubernetes/lab/cnpg/cluster.yaml` database name; `packages/db/package.json` pg dependency; `tools/api-integration/test/helpers/testlab-disposable-grant-deps.ts`.
**Algorithm:** after T02 passes use kubectl GET Secret `lab-pg-app`, read URI in memory, validate service+DB+user, port-forward `lab-pg-rw` to auto local loopback port, `pg` Pool/Client and `SELECT current_database(), current_user`; expose `queryReadOnly` using `BEGIN READ ONLY` and `grantStore.withTransaction` using dedicated client `BEGIN/COMMIT/ROLLBACK`; guaranteed close and child termination. Never emit secret. No plain `DATABASE_URL` override.
**Proof:** injected fake spawner/pg client cases, port-forward startup/early-exit/timeout, wrong URI, wrong DB/user, transaction throw rollback, no secret leaks. `node --test scripts/repo-tools/testlab-kind-db.test.mjs`.
**STOP:** no way to establish exact CNPG primary endpoint or resolve `pg` without a new runtime dependency, return exact source contradiction.

### T04 | Wire bare CLI, preflight and safe rechecks
**Write:** `scripts/repo-tools/testlab-kind-cli.mjs`, `scripts/repo-tools/testlab-kind-cli.test.mjs`, narrow CLI footer change `scripts/repo-tools/testlab-funding.mjs`.
**Anchors:** T01–T03 modules; `runTestlabFundingCommand` and CLI footer; `scripts/repo-tools/testlab-grant-store.mjs::ensureTestlabGrant`.
**Algorithm:** bind only for `status|ensure --target kind-offscreen-lab`, preserve pure plan. Read status no authorization/SQL mutation; ensure requires user-supplied UIDs, approval, flag; preflight must pass before Secret access, recheck same K8s/DB/pod identity immediately before ensure, then call existing grantStore. Catch and redact structured error. Avoid cycles/double CLI invocation. No default grant creation.
**Proof:** `node --test scripts/repo-tools/testlab-kind-cli.test.mjs`, acceptance mocks demonstrate real invocation status returns `missing-active-grant` rather than wrong-cluster, ensure can create/reuse only with all guards, wrong UID/image/secret/approval blocks before mutation, kill/cleanup. Negative invoked plan performs zero subprocess calls. No live ensure.
**STOP:** binding would require modifying production DB schema/admission or authenticating users through a fake header.

### T05 | Permanent runbook, narrowly scoped proof and closure
**Write:** `docs/runbooks/provider-free-game-tests.md`, TESTLAB02 packet/evidence, minimal open/catalog/undertaking links by integration custodian. **Do not rewrite archived TESTLAB01 historical evidence or TURN03 proof.**
**Anchors:** T01–T04 test receipts; `docs/runbooks/provider-free-game-tests.md`; `work/changes/open/README.md`.
**Algorithm:** document commands, read-only status, *separately approved* kind ensure, concrete user/suite/UID fingerprints, how to check provider-free Pods/DB, virtual allowance and four-attempt exhaustion, safe cleanup; run focused unit CLI and provider-free disposable integration. If local live context available, read-only status observation may run; no live grant insertion. Archive only if all source implementation acceptance passes; retain live DB mutate as NOT RUN external action and hand TURN03 exact next approval gate.
**Proof:** four unit suites T01–T04, prior `testlab-grant-store.test.mjs`, provider-free disposable integration `pnpm --filter @offscreen/api-integration build` + `node --test tools/api-integration/dist/test/testlab-provider-free-launch.integration.js`; policy/default deny tests, changed-file formatting and code craft checks; no paid requests.
**STOP:** any live mutation, pod rollback, unrelated worktree or release image replacement proposed as 'validation'.

## Explicit permissions and cost
Code/tests/disposable Postgres proofs authorized by selected implementation Change. Read-only kind `status` can be attempted when cluster present. **Live kind `ensure` or replay of TURN03 pending operations cannot occur until the user provides separate explicit permission identifying target/owner/suite.** Preserve current dev/release mixed images and DXK08. Parent does not delegate general investigation; only the exact T-ID and 2–5 anchors.
