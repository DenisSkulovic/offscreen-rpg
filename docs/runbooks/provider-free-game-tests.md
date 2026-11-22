# Provider-free game tests (TESTLAB01)

Operator runbook for **repeatable, finite, auditable** per-owner launch grants in real SQL, with a **fail-closed, zero-paid-provider** test harness. This documents the `scripts/repo-tools/testlab-*.mjs` tooling and its proof commands as implemented in the repository.

Ordinary local boot stays on [Local development](local-development.md). Disposable-database integration checks stay on [Local integration tests](local-integration-tests.md).

**Authorization boundary:** Change **TESTLAB01** documents and tests this tooling. It does **not** authorize a live `kind-offscreen-lab` database write. Running `ensure` against the real lab cluster still needs separate operator approval, a complete kind target observation, and the explicit CLI grant flag below.

## What these commands touch

| Job | What it touches | Live LLM / production |
| --- | --- | --- |
| `plan` | Pure JSON plan; no database or cluster I/O | No |
| `status` | Read-only SQL when a query hook is supplied | No |
| `ensure` | May insert storyteller funding/run/grant rows when hooks pass guards | No provider calls; not production entitlement |
| Provider-free launch integration test | Disposable sandbox Postgres only | No; tripwire fails if a provider path is invoked |
| Bare CLI `node scripts/repo-tools/testlab-funding.mjs …` | Prints JSON receipt only; without injected hooks, `ensure`/`status` block before mutation | No |

`pnpm dev`, sign-in, and ordinary startup **do not** create or refresh testlab grants. There is **no** automatic first-user or login entitlement and **no** production entitlement profile in this path—the canonical testlab profile is `p3c-launch-entitlement.v1` with route `writer:launch` only.

## Provider-free writer mode

Targets must run the writer in **scripted offline lab** mode:

- Env: `OFFSCREEN_WRITER_EXECUTION_MODE=scripted-offline-lab`
- Refused: `provider-authorized` mode, `OPENROUTER_API_KEY`, and provider pin env vars (`OFFSCREEN_WRITER_PROVIDER_MODEL`, `OFFSCREEN_WRITER_PROVIDER_POLICY_VERSION`)

For `kind-offscreen-lab`, verification also requires the observed cluster and Postgres instance identities to match the lab fixture (`kind-offscreen-lab` / `offscreen-lab`, CNPG `lab-postgres/lab-pg`), plus game-authority and game-executor deployments with provider-free env. Guards run **before** any grant mutation; a failed guard yields `outcome: "blocked"` and **no** SQL inserts.

## Grant contract (plan output)

When inputs are valid, `plan` describes a single launch grant with:

| Field | Value |
| --- | --- |
| Expiry | 24 hours from `now` (`TESTLAB_GRANT_EXPIRY_MS`) |
| Funding / run ceiling | 250000 microUSD (simulated capacity; SQL uses `250000`) |
| Run `maxAttempts` | 4 |
| Requested route | `writer:launch` |
| Funding mode | `prepaid` |
| Default approval identity | `testlab:suite:<suiteId>` when `--approval` is omitted in ensure paths that derive it |
| Default operator for ensure | `testlab:provisioner` when `--operator` is omitted |

`plan` requires non-empty `--owner`, `--suite`, `--operator`, `--approval`, and `--target` (`disposable` or `kind-offscreen-lab`). Optional `--now <epoch-ms>` fixes time for deterministic tests.

## CLI: `testlab-funding.mjs`

Script path: `scripts/repo-tools/testlab-funding.mjs`

Usage (from script help text):

```sh
node scripts/repo-tools/testlab-funding.mjs plan|status|ensure \
  --target <disposable|kind-offscreen-lab> [flags]
```

Common flags (parsed from argv):

| Flag | Commands | Meaning |
| --- | --- | --- |
| `--target disposable` \| `kind-offscreen-lab` | all | Selects target policy in `testlab-target-guard.mjs` |
| `--owner <userId>` | plan, status, ensure | Better Auth user id that owns the grant |
| `--suite <suiteId>` | plan, status, ensure | Test suite id; ties to approval identity |
| `--approval <identity>` | plan, ensure; optional on status | Must match stored grant; defaults to `testlab:suite:<suite>` where applicable |
| `--operator <id>` | plan; optional on ensure | Required on `plan`; ensure defaults to `testlab:provisioner` |
| `--operator-grant-authorized` | ensure (`kind-offscreen-lab` only) | Boolean flag; **required** for kind ensure (no value) |
| `--now <epoch-ms>` | all | Optional clock override |

The CLI prints one JSON receipt to stdout and sets exit code `1` when `outcome` is `blocked` (or `ok === false` on plan).

### `plan`

Dry-run contract check only:

```sh
node scripts/repo-tools/testlab-funding.mjs plan \
  --target disposable \
  --owner <userId> \
  --suite <suiteId> \
  --operator <operatorId> \
  --approval testlab:suite:<suiteId>
```

Success: `{ "ok": true, "plan": { … } }`. Failure: `{ "outcome": "blocked", "refusals": [ … ] }`.

### `status`

Readiness check against active admissible grants for `--owner`. Requires a read-only query implementation (the bare CLI returns `missing-read-query`; integration code injects `queryReadOnly`).

```sh
node scripts/repo-tools/testlab-funding.mjs status \
  --target disposable \
  --owner <userId> \
  --suite <suiteId>
```

Supply `--approval` or `--suite` when multiple active grants could exist. Foreign-suite active grants for the same owner are refused (`foreign-suite-grant`). Missing grant: `ready: false`, `missing-active-grant`.

### `ensure`

Provisions or reuses a grant when target guards pass and the grant store is wired.

**Disposable:** `--owner` and `--suite` are required. For mutation, callers must inject `grantStore`, `observeDisposableTarget`, and related hooks (see `tools/api-integration/test/helpers/testlab-disposable-grant-deps.ts`). The bare CLI blocks with `missing-disposable-runner` before writes.

**kind-offscreen-lab:** requires `--owner`, `--suite`, and `--approval`, plus **`--operator-grant-authorized`**, and a complete kind observation hook. Without the flag, the CLI blocks with `operator-grant-cli-missing`. **TESTLAB01 does not authorize operators to run this against the live lab database**; document and test only unless a separate Change grants that approval.

Example shape (not an authorization to run on kind):

```sh
node scripts/repo-tools/testlab-funding.mjs ensure \
  --target kind-offscreen-lab \
  --owner <userId> \
  --suite <suiteId> \
  --approval testlab:suite:<suiteId> \
  --operator-grant-authorized
```

#### Ensure outcomes (grant store)

| Situation | Outcome | Top-up? |
| --- | --- | --- |
| One active grant matches the testlab fingerprint for owner + suite | `reused` | No (idempotent no-op) |
| No matching grant; no blocking active row | `created` | N/A (insert) |
| Active grant for another suite | `refused` / blocked (`foreign-suite-grant`) | No |
| Active grant expired | `refused` (`expired-grant`) | No |
| `admitted_attempts >= maxAttempts` | `refused` (`exhausted-attempts`) | No |
| Active grant wrong route, limits, profile, or operator | `refused` (`incompatible-grant`) | No |
| Target guard failure (keys, cluster, writer mode, etc.) | `blocked` | No |

Fingerprint matching includes suite approval identity, `writer:launch`, prepaid mode, revision, 250000 microUSD limits, `maxAttempts` 4, non-exhausted attempts, and the canonical entitlement profile.

## Targets: `disposable` vs `kind-offscreen-lab`

| | `disposable` | `kind-offscreen-lab` |
| --- | --- | --- |
| Use | Sandbox Postgres (test containers / disposable DB packages) | Local kind lab `kind-offscreen-lab` |
| Runtime | `runtimeMode: test-container` | Cluster UID, db instance UID, workload env observation |
| Operator CLI grant | Not used | `--operator-grant-authorized` required for ensure |
| Production | Refused if marked production | Refused; must match lab ownership map |

`verifyTestlabTarget` rejects production targets and any supplied database connection handle on the observation (pre-connection only).

## Secrets

Stdout/stderr from funding tooling runs `redactSecrets` on errors (connection strings, password/token patterns, bearer tokens, sk- keys). **Do not** paste raw receipts into tickets if they might contain environment-specific material. This runbook does not print credentials.

## Proof commands (recorded PASS for TESTLAB01)

These commands were used as the acceptance proof for the provider-free launch path. Re-run when validating the worktree; this page does not imply they were executed at read time.

**Integration (disposable Postgres, zero LLM):**

```sh
pnpm --filter @offscreen/api-integration build
node --test tools/api-integration/dist/test/testlab-provider-free-launch.integration.js
```

Optional narrow wrapper (build + same test): `node scripts/repo-tools/testlab-provider-free-proof.mjs`

**Unit / policy tests for repo-tools:**

```sh
node --test scripts/repo-tools/testlab-funding.test.mjs
node --test scripts/repo-tools/testlab-target-guard.test.mjs
node --test scripts/repo-tools/testlab-grant-store.test.mjs
node --test scripts/repo-tools/testlab-grant-contract.test.mjs
```

The integration test provisions disposable Postgres, ensures a grant via injected funding deps, admits a pending launch with `admitLaunchWriterMission`, and asserts the provider tripwire count stays zero.

## TURN03 handoff (separate approval; not PASS here)

Cold-kind gameplay proof **[TURN03](../../work/changes/open/2026-11-19--turn03-full-distributed-forkable-turn-proof/CHANGE.md)** is independent. **TURN03 is not claimed as passing** in TESTLAB01.

Later, with **separate operator approval** (not granted by TESTLAB01), an operator may:

1. Ensure a testlab grant for a specific `--owner` and `--suite` (and matching `--approval`) on the approved target, using the kind ensure path and `--operator-grant-authorized` only when that approval exists.
2. Replay the **same** canonical launch request hash already stored on `story_launch` for that owner (same `operationId` / request payload the player or harness prepared), so admission sees an active admissible grant without widening entitlement.

TESTLAB01 only establishes the grant tooling, guards, and disposable provider-free launch proof—not the full browser→cluster TURN03 gate.