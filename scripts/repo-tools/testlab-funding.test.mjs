import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import {
  buildTestlabSuiteApprovalIdentity,
  ensureTestlabGrant,
} from './testlab-grant-store.mjs';
import {
  LAUNCH_MIN_MICROUSD_SQL,
  TESTLAB_LAUNCH_ROUTE,
  TESTLAB_RUN_MAX_ATTEMPTS,
  buildTestlabEntitlementProfile,
} from './testlab-grant-contract.mjs';
import {
  OPENROUTER_API_KEY_ENV,
  WRITER_EXECUTION_MODE_SCRIPTED_OFFLINE_LAB,
  OFFSCREEN_WRITER_EXECUTION_MODE_ENV,
} from './testlab-target-guard.mjs';
import {
  runTestlabFundingCommand,
  runTestlabFundingPlan,
  runTestlabFundingEnsure,
  runTestlabFundingStatus,
  redactSecrets,
  TESTLAB_OPERATOR_GRANT_CLI_FLAG,
} from './testlab-funding.mjs';

const BASE_NOW = Date.parse('2026-11-22T12:00:00.000Z');
const SUITE = 'suite-funding-smoke';
const OWNER = 'user-funding-owner-1';
const OWNER_TWO = 'user-funding-owner-2';
const PLANTED_SECRET = 'PLANTED_testlab_secret_abc123';

function disposableObservation(overrides = {}) {
  return {
    target: 'disposable',
    runtimeMode: 'test-container',
    localEnv: {
      [OFFSCREEN_WRITER_EXECUTION_MODE_ENV]:
        WRITER_EXECUTION_MODE_SCRIPTED_OFFLINE_LAB,
    },
    ...overrides,
  };
}

/**
 * @param {object} [options]
 */
function createFakeStore(options = {}) {
  /** @type {{ users: Set<string>, funding: Map<string, Record<string, unknown>>, runs: Map<string, Record<string, unknown>>, grants: Map<string, Record<string, unknown>> }} */
  const state = {
    users: new Set(options.users ?? [OWNER, OWNER_TWO]),
    funding: new Map(),
    runs: new Map(),
    grants: new Map(),
  };

  /**
   * @param {string} sql
   * @param {unknown[]} params
   */
  function query(sql, params = []) {
    if (sql.includes('pg_advisory_xact_lock')) {
      return Promise.resolve({ rows: [] });
    }
    if (sql.includes('FROM "user"')) {
      const userId = String(params[0]);
      return Promise.resolve({
        rows: state.users.has(userId) ? [{ id: userId }] : [],
      });
    }
    if (sql.includes('FROM storyteller_current_owner_grant')) {
      const ownerId = String(params[0]);
      const rows = [];
      for (const grant of state.grants.values()) {
        if (grant.user_id !== ownerId) {
          continue;
        }
        const funding = state.funding.get(String(grant.account_id));
        const run = state.runs.get(String(grant.run_id));
        if (!funding || !run) {
          continue;
        }
        rows.push({
          ...grant,
          funding_limit_microusd: funding.limit_microusd,
          stopped: funding.stopped,
          run_limit_microusd: run.limit_microusd,
          max_attempts: run.max_attempts,
          admitted_attempts: run.admitted_attempts,
          run_enabled: run.enabled,
        });
      }
      return Promise.resolve({ rows });
    }
    if (sql.includes('INSERT INTO storyteller_funding')) {
      const [id, limit] = params;
      state.funding.set(String(id), {
        id: String(id),
        limit_microusd: BigInt(limit),
        stopped: false,
        verified_at: new Date(BASE_NOW),
      });
      return Promise.resolve({ rows: [] });
    }
    if (sql.includes('INSERT INTO storyteller_run')) {
      const [id, accountId, limit, maxAttempts] = params;
      state.runs.set(String(id), {
        id: String(id),
        account_id: String(accountId),
        limit_microusd: BigInt(limit),
        max_attempts: Number(maxAttempts),
        admitted_attempts: 0,
        enabled: true,
      });
      return Promise.resolve({ rows: [] });
    }
    if (sql.includes('INSERT INTO storyteller_current_owner_grant')) {
      const [
        grantId,
        ,
        userId,
        accountId,
        runId,
        ,
        expiresAt,
        requestedRoute,
        requestedFundingMode,
        operatorId,
        approvalIdentity,
      ] = params;
      state.grants.set(String(grantId), {
        grant_id: String(grantId),
        account_id: String(accountId),
        run_id: String(runId),
        revision: 1,
        user_id: String(userId),
        enabled: true,
        revoked_at: null,
        no_expiry: false,
        expires_at: new Date(expiresAt),
        requested_route: String(requestedRoute),
        requested_funding_mode: String(requestedFundingMode),
        operator_id: String(operatorId),
        approval_identity: String(approvalIdentity),
        entitlement_profile: buildTestlabEntitlementProfile(1),
      });
      return Promise.resolve({ rows: [] });
    }
    throw new Error(`unexpected sql in fake runner: ${sql}`);
  }

  const grantStore = {
    async withTransaction(fn) {
      return fn({ query });
    },
  };

  const queryReadOnly = query;

  return { state, grantStore, queryReadOnly };
}

function defaultEnsureFlags(overrides = {}) {
  return {
    target: 'disposable',
    owner: OWNER,
    suite: SUITE,
    approval: buildTestlabSuiteApprovalIdentity(SUITE),
    operator: 'operator-testlab',
    now: String(BASE_NOW),
    ...overrides,
  };
}

function fundingDeps(store, observation = disposableObservation()) {
  return {
    grantStore: store.grantStore,
    queryReadOnly: store.queryReadOnly,
    observeDisposableTarget: async () => observation,
    now: () => BASE_NOW,
    logError: () => {},
  };
}

test('plan: prints contract plan JSON when inputs are valid', () => {
  const receipt = runTestlabFundingPlan(defaultEnsureFlags(), {
    now: () => BASE_NOW,
  });
  assert.equal(receipt.ok, true);
  assert.equal(receipt.plan.ownerId, OWNER);
  assert.equal(receipt.plan.suiteId, SUITE);
  assert.equal(receipt.plan.targetIdentity, 'disposable');
  assert.equal(receipt.plan.grant.requestedRoute, TESTLAB_LAUNCH_ROUTE);
});

test('positive: ensure disposable creates then reuses with receipt', async () => {
  const store = createFakeStore();
  const deps = fundingDeps(store);
  const first = await runTestlabFundingEnsure(defaultEnsureFlags(), deps);
  const second = await runTestlabFundingEnsure(defaultEnsureFlags(), deps);

  assert.equal(first.outcome, 'created');
  assert.equal(second.outcome, 'reused');
  assert.equal(first.fundingId, second.fundingId);
  assert.equal(first.grantId, second.grantId);
  assert.equal(first.targetIdentity, 'disposable');
  assert.ok(typeof first.expiresAtMs === 'number');
  assert.equal(store.state.grants.size, 1);
});

test('positive: status reports reused without inserts', async () => {
  const store = createFakeStore();
  const deps = fundingDeps(store);
  await ensureTestlabGrant(store.grantStore, {
    ownerId: OWNER,
    suiteId: SUITE,
    targetIdentity: 'disposable',
    operatorId: 'operator-testlab',
    approvalIdentity: buildTestlabSuiteApprovalIdentity(SUITE),
    now: BASE_NOW,
  });
  const before = store.state.grants.size;
  const receipt = await runTestlabFundingStatus(defaultEnsureFlags(), deps);
  assert.equal(receipt.outcome, 'reused');
  assert.equal(receipt.ready, true);
  assert.ok(receipt.grantId);
  assert.equal(store.state.grants.size, before);
});

test('negative: kind ensure without approval is blocked with zero writes', async () => {
  const store = createFakeStore();
  const deps = {
    ...fundingDeps(store),
    observeKindTarget: async () => ({
      target: 'kind-offscreen-lab',
      operatorGrantAuthorized: true,
    }),
  };
  const receipt = await runTestlabFundingEnsure(
    {
      target: 'kind-offscreen-lab',
      owner: OWNER,
      suite: SUITE,
      operatorGrantAuthorized: true,
      now: String(BASE_NOW),
    },
    deps,
  );
  assert.equal(receipt.outcome, 'blocked');
  assert.equal(store.state.grants.size, 0);
  assert.ok(!JSON.stringify(receipt).includes('ready'));
});

test('negative: foreign context blocks ensure before mutation', async () => {
  const store = createFakeStore();
  const deps = fundingDeps(store, {
    localEnv: {
      [OFFSCREEN_WRITER_EXECUTION_MODE_ENV]:
        WRITER_EXECUTION_MODE_SCRIPTED_OFFLINE_LAB,
      [OPENROUTER_API_KEY_ENV]: PLANTED_SECRET,
    },
  });
  const receipt = await runTestlabFundingEnsure(defaultEnsureFlags(), deps);
  assert.equal(receipt.outcome, 'blocked');
  assert.equal(store.state.grants.size, 0);
  assert.ok(receipt.refusals.some((r) => r.id === 'openrouter-key-present'));
  const serialized = JSON.stringify(receipt);
  assert.ok(!serialized.includes(PLANTED_SECRET));
});

test('negative: second owner without auth user does not mutate', async () => {
  const store = createFakeStore({ users: [OWNER] });
  const deps = fundingDeps(store);
  const receipt = await runTestlabFundingEnsure(
    defaultEnsureFlags({ owner: OWNER_TWO }),
    deps,
  );
  assert.equal(receipt.outcome, 'blocked');
  assert.equal(store.state.grants.size, 0);
});

test('negative: disposable ensure refuses without injected runner hook', async () => {
  const store = createFakeStore();
  const receipt = await runTestlabFundingEnsure(defaultEnsureFlags(), {
    grantStore: store.grantStore,
    now: () => BASE_NOW,
  });
  assert.equal(receipt.outcome, 'blocked');
  assert.equal(receipt.refusals[0].id, 'missing-disposable-runner');
  assert.equal(store.state.grants.size, 0);
});

test('negative: kind ensure requires explicit operator grant CLI flag', async () => {
  const store = createFakeStore();
  const receipt = await runTestlabFundingEnsure(
    {
      target: 'kind-offscreen-lab',
      owner: OWNER,
      suite: SUITE,
      approval: buildTestlabSuiteApprovalIdentity(SUITE),
      now: String(BASE_NOW),
    },
    {
      grantStore: store.grantStore,
      observeKindTarget: async () => ({ target: 'kind-offscreen-lab' }),
      now: () => BASE_NOW,
    },
  );
  assert.equal(receipt.outcome, 'blocked');
  assert.equal(receipt.refusals[0].id, 'operator-grant-cli-missing');
  assert.equal(store.state.grants.size, 0);
});

test('status never prints ready when guard is incomplete', async () => {
  const store = createFakeStore();
  const receipt = await runTestlabFundingStatus(
    defaultEnsureFlags({ target: 'disposable' }),
    {
      queryReadOnly: store.queryReadOnly,
      observeDisposableTarget: async () => ({
        target: 'disposable',
        runtimeMode: 'production',
      }),
      now: () => BASE_NOW,
    },
  );
  assert.equal(receipt.outcome, 'blocked');
  assert.ok(!Object.prototype.hasOwnProperty.call(receipt, 'ready'));
});

test('log redaction strips planted secrets from errors', async () => {
  /** @type {string[]} */
  const errors = [];
  const store = createFakeStore();
  const deps = {
    ...fundingDeps(store),
    logError: (message) => {
      errors.push(redactSecrets(message));
    },
    grantStore: {
      async withTransaction() {
        throw new Error(`failed with password=${PLANTED_SECRET}`);
      },
    },
  };
  const receipt = await runTestlabFundingEnsure(defaultEnsureFlags(), deps);
  assert.equal(receipt.outcome, 'blocked');
  assert.equal(errors.length, 1);
  assert.ok(!errors[0].includes(PLANTED_SECRET));
  assert.ok(errors[0].includes('[REDACTED]'));
  assert.ok(redactSecrets(`token=${PLANTED_SECRET}`).includes('[REDACTED]'));
});

test('runTestlabFundingCommand blocks foreign suite for same owner', async () => {
  const store = createFakeStore();
  const otherSuite = 'suite-other';
  const fundingId = randomUUID();
  const runId = randomUUID();
  const grantId = randomUUID();
  const expiresAt = new Date(BASE_NOW + 24 * 60 * 60 * 1000);
  store.state.funding.set(fundingId, {
    id: fundingId,
    limit_microusd: BigInt(LAUNCH_MIN_MICROUSD_SQL),
    stopped: false,
  });
  store.state.runs.set(runId, {
    id: runId,
    account_id: fundingId,
    limit_microusd: BigInt(LAUNCH_MIN_MICROUSD_SQL),
    max_attempts: TESTLAB_RUN_MAX_ATTEMPTS,
    admitted_attempts: 0,
    enabled: true,
  });
  store.state.grants.set(grantId, {
    grant_id: grantId,
    account_id: fundingId,
    run_id: runId,
    revision: 1,
    user_id: OWNER,
    enabled: true,
    revoked_at: null,
    no_expiry: false,
    expires_at: expiresAt,
    requested_route: TESTLAB_LAUNCH_ROUTE,
    requested_funding_mode: 'prepaid',
    operator_id: 'operator-testlab',
    approval_identity: buildTestlabSuiteApprovalIdentity(otherSuite),
    entitlement_profile: buildTestlabEntitlementProfile(1),
  });

  const receipt = await runTestlabFundingCommand(
    'ensure',
    defaultEnsureFlags(),
    fundingDeps(store),
  );
  assert.equal(receipt.outcome, 'blocked');
  assert.equal(store.state.grants.size, 1);
  assert.equal(store.state.funding.size, 1);
});

test('negative: kind status without an observer is missing-kind-observer', async () => {
  const receipt = await runTestlabFundingStatus(
    { target: 'kind-offscreen-lab', owner: OWNER, suite: SUITE },
    {},
  );
  assert.equal(receipt.outcome, 'blocked');
  assert.equal(receipt.refusals[0].id, 'missing-kind-observer');
});

test('CLI operator grant flag constant matches packet', () => {
  assert.equal(TESTLAB_OPERATOR_GRANT_CLI_FLAG, '--operator-grant-authorized');
});

test('plan CLI prints JSON with decimal 250000', () => {
  const result = spawnSync(
    process.execPath,
    [
      'scripts/repo-tools/testlab-funding.mjs',
      'plan',
      '--target',
      'kind-offscreen-lab',
      '--owner',
      'test',
      '--suite',
      'turn03',
      '--operator',
      'testlab:human',
      '--approval',
      'testlab:suite:turn03',
    ],
    {
      encoding: 'utf8',
      cwd: fileURLToPath(new URL('../..', import.meta.url)),
    },
  );
  assert.equal(result.status, 0, result.stderr);
  const receipt = JSON.parse(result.stdout);
  assert.equal(receipt.ok, true);
  assert.equal(receipt.plan.funding.limitMicrousd, '250000');
  assert.equal(result.stdout.includes('250000'), true);
});
