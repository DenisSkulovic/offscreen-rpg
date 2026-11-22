# TESTLAB01 | Cursor Composer tasks

Base reviewed: `73186189e2912d5d809a996595f8a0c1f97a53b0`; check actual post-merge undertaking HEAD and live worktree ownership. **No live SQL mutation is authorized by this packet.** One parent; inexpensive Composer Standard children, normally serial. Integrate under `undertaking/storyteller-workshop`, squash archive on acceptance.

## T01 | Pure contract and entitlement factory | READY PATCH-S
**Files to write:** new `scripts/repo-tools/testlab-grant-contract.mjs`, `scripts/repo-tools/testlab-grant-contract.test.mjs`.
**Read:** `tools/api-integration/test/longform-acceptance/launch-grant.mjs`, `packages/db/src/schema/storyteller.ts` grant checks, `packages/story-engine/src/storyteller/launch-admission.ts::loadAdmissibleGrant`.
**Algorithm:** typed validated explicit owner/suite/operator/approval and target; fixed `writer:launch` profile, limits = 250000 microUSD, expiry 24h, run maxAttempts=4. Reject empty/wrong route, missing authorization and invalid expiry. Return immutable plan/SQL values, no writes or provider actions.
**Proof:** `node --test scripts/repo-tools/testlab-grant-contract.test.mjs`; positive exact shape and finite expiry; negative noExpiry/invalid profile/unauthorized params refuse.

## T02 | Atomic idempotent DB provisioner | READY PATCH-M, disposable DB only
**Files:** `scripts/repo-tools/testlab-grant-store.mjs`, matching focused test. Refactor test `launch-grant.mjs` only when exact original semantics/consumers are preserved.
**Read:** T01 module, `launch-grant.mjs`, `packages/db/src/schema/storyteller.ts`, `launch-admission.ts`.
**Algorithm:** under advisory lock for (owner,suite), verify existing auth user and query current grants; return same IDs for matching active grant; reject duplicate, foreign, exhausted and incompatible state; otherwise one transaction inserts funding→run→grant with expiry and bounded IDs/counters. No DB credential is baked in. Concurrency race test; rollback on failed insert. Do not modify admission or schema.
**Proof:** focused Node tests with explicit injected query runner and one real disposable Postgres integration fixture if the existing harness provides one. Positive same owner/suite twice returns identical IDs; negative concurrent ensures, absent auth user, incompatible grant, forced third insert error causes 0 partially committed rows.
**STOP:** no available disposable DB/test adapter with real transaction semantics; return exact dependency mismatch, do not connect to real lab as substitute.

## T03 | Provider-free environment and target verifier | READY PATCH-M, read-only
**Files:** `scripts/repo-tools/testlab-target-guard.mjs`, `scripts/repo-tools/testlab-target-guard.test.mjs`.
**Read:** `scripts/repo-tools/stack-preflight.mjs`, `infra/kubernetes/lab/dev/owned-app-resources.json`, `apps/game-authority/src/writer-round-lab-policy.ts`, `packages/storyteller/src/providers/writer-provider-authorization-policy.ts`, `infra/kubernetes/lab/dev/{authority,workers}.yaml`.
**Algorithm:** pure policy check for explicit disposable/real-kind test target. Local kind requires observed exact cluster context and namespace, selected DB instance identity, GA and executor actual deployment images/env without outputting secrets; enforce scripted offline on both and absent provider credentials/pins; deny unknown/prod targets. Require operator grant instruction on live target. Do not `kubectl config use-context`; no mutations.
**Proof:** `node --test scripts/repo-tools/testlab-target-guard.test.mjs`; positive scripted and exact UID passes; negatives provider-authorized, missing/mixed pin/key, wrong cluster or ambiguous DB all refuse *before DB connection*.

## T04 | Narrow CLI and machine receipt | after T01–T03
**Files:** `scripts/repo-tools/testlab-funding.mjs`, `scripts/repo-tools/testlab-funding.test.mjs` (and narrow package.json alias only if noncolliding).
**Read:** T01–03 contracts, `scripts/repo-tools/stack.mjs` for CLI UX, `tools/api-integration/package.json` for test entrypoint.
**Algorithm:** `plan` and `status` read-only; `ensure --target disposable` requires real disposable fixture runner, `ensure --target kind-offscreen-lab --owner <id> --suite <id> --approval <string>` requires correct runtime guard and explicit operator authorization separate from packet. One JSON receipt with outcome created/reused/blocked and IDs, expiration, no secrets. No auto grant on `pnpm dev` or web login. Never show 'ready' if guard incomplete.
**Proof:** invocation tests positive created/reused, negative no approval/foreign context/second owner no mutation. Logs redact secrets.

## T05 | Repeatable integration and zero-provider tripwire | after T04
**Files:** `tools/api-integration/test/testlab-provider-free-launch.integration.ts` and test-only support if needed, `scripts/repo-tools/testlab-provider-free-proof.mjs` (small).
**Read:** `tools/api-integration/test/longform-acceptance/launch-grant.mjs`, `tools/api-integration/test/turn03-distributed-poc-fixture.integration.ts`, `packages/story-engine/src/storyteller/launch-admission.ts`, `packages/storyteller/src/providers/writer-round-transport.ts`.
**Algorithm:** real migrated disposable PG, seeded auth user, prepare launch with real `admitLaunchOperation`, provider-free grant `ensure`, real `admitLaunchWriterMission` then inspect generation and one `story.launch.v1` outbox. Negative missing/expired/incompatible grants and wrong owner. Inject fail-on-provider-send transport; assert zero attempted real LLM sends. Do not conflate offline test success with full browser/TURN03 proof. May adapt file names if existing harness owns equivalent test.
**Proof:** `pnpm --filter @offscreen/api-integration build` then `node --test tools/api-integration/dist/test/testlab-provider-free-launch.integration.js` from repo root; verify actual test path once created. Negative no grant => no generation/outbox; replay => one generation/outbox.
**STOP:** no safe way to install provider tripwire without crossing production adapter/change ownership. Return exact boundary, don't fake green.

## T06 | Operator runbook, integration and closure | after T05
**Files:** `docs/runbooks/provider-free-game-tests.md`, minimal links from `docs/runbooks/local-development.md`, TESTLAB01 Change/evidence/archive.
**Read:** T01–05 receipts, `work/changes/open/README.md`, TURN03 current execution.
**Algorithm:** document normal repeatable workflow, preflight/status/ensure, suite identity and expirations, data retention, no automatic top-up, zero spend and dry-run safeguards. Reconcile test proof on disposable PG; **do not** run live kind `ensure` without separate owner permission. Deliver a precise TURN03 handoff: how operator could authorize grant and replay same request with same hash.
**Proof:** focused tests above, relevant docs checks, no simulation/LLM network; report static vs integration vs NOT-RUN honestly, squash/merge and archive only after mandatory disposable acceptance.

## Stop and cost policy
Children get only their T-ID and its 2–5 anchors; parent batches at most 2–3 T-IDs before checkpoint. Never fan out research swarms. One significant shared-code contradiction is returned to ChatGPT with file/symbol. No source changes in TURN03/MA12/WR10, schema, launch admission, provider transport, Kubernetes common overlay or DXK08/DXK09 files. No unapproved live cluster/DB mutation, paid provider or Git reset. Parent finalizes Change within same commissioned chat, merges into undertaking, archives and supplies concise receipts, never auto-starts next Change.
