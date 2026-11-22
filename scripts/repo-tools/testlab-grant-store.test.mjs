import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  buildTestlabSuiteApprovalIdentity,
  ensureTestlabGrant,
  testlabGrantAdvisoryLockKeys,
} from './testlab-grant-store.mjs';
import {
  LAUNCH_MIN_MICROUSD_SQL,
  TESTLAB_LAUNCH_ROUTE,
  TESTLAB_RUN_MAX_ATTEMPTS,
  buildTestlabEntitlementProfile,
} from './testlab-grant-contract.mjs';

const BASE_NOW = Date.parse('2026-11-22T12:00:00.000Z');
const SUITE = 'suite-turn03-smoke';
const OWNER = 'user-owner-1';

function defaultInput(overrides = {}) {
  return {
    ownerId: OWNER,
    suiteId: SUITE,
    targetIdentity: 'disposable',
    operatorId: 'operator-testlab',
    approvalIdentity: buildTestlabSuiteApprovalIdentity(SUITE),
    now: BASE_NOW,
    ...overrides,
  };
}

/**
 * @returns {{
 *   deps: { withTransaction: (fn: (tx: { query: Function }) => Promise<unknown>) => Promise<unknown> },
 *   state: {
 *     users: Set<string>,
 *     funding: Map<string, Record<string, unknown>>,
 *     runs: Map<string, Record<string, unknown>>,
 *     grants: Map<string, Record<string, unknown>>,
 *     committed: boolean,
 *   },
 *   failOnInsert?: 'grant' | null,
 * }}
 */
function createFakeStore(options = {}) {
  /** @type {{ users: Set<string>, funding: Map<string, Record<string, unknown>>, runs: Map<string, Record<string, unknown>>, grants: Map<string, Record<string, unknown>>, committed: boolean }} */
  const state = {
    users: new Set(options.users ?? [OWNER]),
    funding: new Map(),
    runs: new Map(),
    grants: new Map(),
    committed: true,
  };

  /** @type {Promise<void>} */
  let transactionGate = Promise.resolve();

  /**
   * @param {'funding'|'run'|'grant'} kind
   * @param {unknown[]} params
   */
  function applyInsert(kind, params) {
    if (kind === 'funding') {
      const [id, limit] = params;
      state.funding.set(String(id), {
        id: String(id),
        limit_microusd: BigInt(limit),
        stopped: false,
        verified_at: new Date(BASE_NOW),
      });
      return;
    }
    if (kind === 'run') {
      const [id, accountId, limit, maxAttempts] = params;
      state.runs.set(String(id), {
        id: String(id),
        account_id: String(accountId),
        limit_microusd: BigInt(limit),
        max_attempts: Number(maxAttempts),
        admitted_attempts: 0,
        enabled: true,
      });
      return;
    }
    const [
      grantId,
      revision,
      userId,
      accountId,
      runId,
      entitlementProfileJson,
      expiresAt,
      requestedRoute,
      requestedFundingMode,
      operatorId,
      approvalIdentity,
    ] = params;
    if (options.failOnInsert === 'grant') {
      throw new Error('forced-grant-insert-failure');
    }
    state.grants.set(String(grantId), {
      grant_id: String(grantId),
      account_id: String(accountId),
      run_id: String(runId),
      revision: Number(revision),
      user_id: String(userId),
      enabled: true,
      revoked_at: null,
      no_expiry: false,
      expires_at: new Date(expiresAt),
      requested_route: String(requestedRoute),
      requested_funding_mode: String(requestedFundingMode),
      operator_id: String(operatorId),
      approval_identity: String(approvalIdentity),
      entitlement_profile: JSON.parse(String(entitlementProfileJson)),
    });
  }

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
      applyInsert('funding', params);
      return Promise.resolve({ rows: [] });
    }
    if (sql.includes('INSERT INTO storyteller_run')) {
      applyInsert('run', params);
      return Promise.resolve({ rows: [] });
    }
    if (sql.includes('INSERT INTO storyteller_current_owner_grant')) {
      applyInsert('grant', params);
      return Promise.resolve({ rows: [] });
    }
    throw new Error(`unexpected sql in fake runner: ${sql}`);
  }

  const deps = {
    async withTransaction(fn) {
      const prior = transactionGate;
      /** @type {() => void} */
      let releaseTransaction;
      transactionGate = new Promise((resolve) => {
        releaseTransaction = resolve;
      });
      await prior;

      const snapshot = {
        users: new Set(state.users),
        funding: new Map(state.funding),
        runs: new Map(state.runs),
        grants: new Map(state.grants),
      };
      state.committed = false;
      const tx = {
        query,
      };
      try {
        const outcome = await fn(tx);
        state.committed = true;
        return outcome;
      } catch (error) {
        state.users = snapshot.users;
        state.funding = snapshot.funding;
        state.runs = snapshot.runs;
        state.grants = snapshot.grants;
        state.committed = true;
        throw error;
      } finally {
        releaseTransaction();
      }
    },
  };

  return { deps, state };
}

/**
 * @param {ReturnType<typeof createFakeStore>['state']} state
 * @param {Record<string, unknown>} overrides
 */
function seedMatchingGrant(state, overrides = {}) {
  const fundingId = randomUUID();
  const runId = randomUUID();
  const grantId = randomUUID();
  const expiresAt = new Date(BASE_NOW + 24 * 60 * 60 * 1000);
  state.funding.set(fundingId, {
    id: fundingId,
    limit_microusd: BigInt(LAUNCH_MIN_MICROUSD_SQL),
    stopped: false,
    verified_at: new Date(BASE_NOW),
  });
  state.runs.set(runId, {
    id: runId,
    account_id: fundingId,
    limit_microusd: BigInt(LAUNCH_MIN_MICROUSD_SQL),
    max_attempts: TESTLAB_RUN_MAX_ATTEMPTS,
    admitted_attempts: 0,
    enabled: true,
  });
  state.grants.set(grantId, {
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
    approval_identity: buildTestlabSuiteApprovalIdentity(SUITE),
    entitlement_profile: buildTestlabEntitlementProfile(1),
    ...overrides,
  });
  return { fundingId, runId, grantId };
}

test('positive: same owner and suite twice returns identical IDs', async () => {
  const { deps } = createFakeStore();
  const first = await ensureTestlabGrant(deps, defaultInput());
  const second = await ensureTestlabGrant(deps, defaultInput());
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(first.outcome, 'created');
  assert.equal(second.outcome, 'reused');
  assert.equal(first.fundingId, second.fundingId);
  assert.equal(first.runId, second.runId);
  assert.equal(first.grantId, second.grantId);
});

test('negative: absent auth user refuses with no writes', async () => {
  const { deps, state } = createFakeStore({ users: [] });
  const result = await ensureTestlabGrant(deps, defaultInput());
  assert.equal(result.ok, false);
  assert.equal(result.refusals[0].id, 'missing-auth-user');
  assert.equal(state.funding.size, 0);
  assert.equal(state.runs.size, 0);
  assert.equal(state.grants.size, 0);
});

test('negative: incompatible active grant refuses without writes', async () => {
  const { deps, state } = createFakeStore();
  seedMatchingGrant(state, {
    requested_route: 'writer:continue',
  });
  const beforeFunding = state.funding.size;
  const result = await ensureTestlabGrant(deps, defaultInput());
  assert.equal(result.ok, false);
  assert.equal(result.refusals[0].id, 'incompatible-grant');
  assert.equal(state.funding.size, beforeFunding);
});

test('negative: forced third insert error rolls back all partial rows', async () => {
  const { deps, state } = createFakeStore({ failOnInsert: 'grant' });
  await assert.rejects(
    () => ensureTestlabGrant(deps, defaultInput()),
    /forced-grant-insert-failure/,
  );
  assert.equal(state.funding.size, 0);
  assert.equal(state.runs.size, 0);
  assert.equal(state.grants.size, 0);
});

test('negative: concurrent ensures serialize and reuse one grant', async () => {
  const { deps, state } = createFakeStore();
  const [a, b] = await Promise.all([
    ensureTestlabGrant(deps, defaultInput()),
    ensureTestlabGrant(deps, defaultInput()),
  ]);
  assert.equal(a.ok, true);
  assert.equal(b.ok, true);
  assert.deepEqual(
    { fundingId: a.fundingId, runId: a.runId, grantId: a.grantId },
    { fundingId: b.fundingId, runId: b.runId, grantId: b.grantId },
  );
  assert.equal(state.grants.size, 1);
  assert.ok(a.outcome === 'created' || a.outcome === 'reused');
  assert.ok(b.outcome === 'created' || b.outcome === 'reused');
});

test('advisory lock keys are stable for owner and suite', () => {
  const keys = testlabGrantAdvisoryLockKeys(OWNER, SUITE);
  assert.deepEqual(keys, testlabGrantAdvisoryLockKeys(OWNER, SUITE));
  assert.notDeepEqual(
    testlabGrantAdvisoryLockKeys(OWNER, SUITE),
    testlabGrantAdvisoryLockKeys(OWNER, 'other-suite'),
  );
});
