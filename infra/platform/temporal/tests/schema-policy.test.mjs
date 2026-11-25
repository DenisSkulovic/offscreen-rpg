import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TEMPORAL_SQL_DATABASES_QUERY,
  TEMPORAL_SQL_SCHEMA_VERSION_QUERY,
  classifyTemporalResource,
  decideTemporalBootstrap,
} from '../schema-policy.mjs';

const OWNER = 'offscreen-dev';

/** @param {object} [extra] */
function present(extra = {}) {
  return {
    state: 'present',
    foreign: false,
    owner: OWNER,
    uid: 'uid-1',
    ...extra,
  };
}

function absent() {
  return { state: 'absent' };
}

/** @param {string} [reason] */
function unreadable(reason = 'probe failed') {
  return { state: 'unreadable', reason };
}

function foreignOwned() {
  return { state: 'present', foreign: true, uid: 'foreign-uid' };
}

/** @param {object} [overrides] */
function input(overrides = {}) {
  return {
    ownerValue: OWNER,
    namespace: absent(),
    secret: absent(),
    pvc: absent(),
    postgres: absent(),
    server: absent(),
    schemaJob: absent(),
    ...overrides,
  };
}

function readableSql({
  temporal = false,
  temporal_visibility = false,
  tables = {},
} = {}) {
  return {
    state: 'readable',
    databases: { temporal, temporal_visibility },
    schemaTables: {
      temporal: tables.temporal ?? false,
      temporal_visibility: tables.temporal_visibility ?? false,
    },
  };
}

test('exported SQL probes stay fixed', () => {
  assert.equal(
    TEMPORAL_SQL_DATABASES_QUERY,
    "SELECT datname FROM pg_database WHERE datname IN ('temporal','temporal_visibility');",
  );
  assert.equal(
    TEMPORAL_SQL_SCHEMA_VERSION_QUERY,
    'SELECT EXISTS(SELECT 1 FROM public.schema_version);',
  );
});

test('classifyTemporalResource respects absent, unreadable, foreign, and owned', () => {
  assert.equal(classifyTemporalResource(absent(), OWNER), 'absent');
  assert.equal(classifyTemporalResource(unreadable(), OWNER), 'unreadable');
  assert.equal(classifyTemporalResource(foreignOwned(), OWNER), 'foreign');
  assert.equal(
    classifyTemporalResource(
      { state: 'present', owner: 'other', uid: 'x' },
      OWNER,
    ),
    'foreign',
  );
  assert.equal(classifyTemporalResource(present(), OWNER), 'owned');
});

test('classifyTemporalResource rejects unidentified ownership proofs', () => {
  const uidOnly = { state: 'present', uid: 'orphan-uid' };
  assert.equal(classifyTemporalResource(uidOnly, OWNER), 'foreign');
  assert.equal(classifyTemporalResource(uidOnly), 'foreign');

  assert.equal(
    classifyTemporalResource(
      { state: 'present', foreign: false, owner: 'other-tenant', uid: 'u1' },
      OWNER,
    ),
    'foreign',
  );

  const missingLabel = { state: 'present', uid: 'u2' };
  assert.equal(classifyTemporalResource(missingLabel, OWNER), 'foreign');
  assert.equal(
    classifyTemporalResource({ state: 'present' }, OWNER),
    'foreign',
  );

  assert.equal(
    classifyTemporalResource(
      { state: 'present', owner: OWNER, uid: 'u3' },
      OWNER,
    ),
    'owned',
  );

  assert.equal(
    classifyTemporalResource(
      { state: 'present', foreign: false, uid: 'u4' },
      OWNER,
    ),
    'owned',
  );
  assert.equal(
    classifyTemporalResource({ state: 'present', foreign: false }),
    'owned',
  );

  assert.equal(classifyTemporalResource(unreadable(), OWNER), 'unreadable');
  assert.equal(classifyTemporalResource(absent(), OWNER), 'absent');
});

test('uid-only persisted resource refuses bootstrap without actions', () => {
  const decision = decideTemporalBootstrap(
    input({
      secret: present(),
      pvc: { state: 'present', uid: 'unowned-pvc' },
    }),
  );
  assert.equal(decision.ok, false);
  assert.equal(decision.refusals[0]?.id, 'foreign-pvc');
  assert.equal(decision.actions.length, 0);
});

test('fresh bootstrap plans namespace, create-secret via stdin, postgres, schema, then server', () => {
  const decision = decideTemporalBootstrap(input());
  assert.equal(decision.ok, true);
  assert.deepEqual(decision.refusals, []);
  assert.deepEqual(
    decision.actions.map((item) => item.op),
    [
      'ensure-namespace',
      'create-secret',
      'apply-postgres',
      'wait-postgres-ready',
      'wait-authenticated-sql',
      'create-schema-job',
      'wait-schema-job',
      'verify-schema-tables',
      'apply-server',
    ],
  );
  const create = decision.actions.find((item) => item.op === 'create-secret');
  assert.equal(create?.via, 'kubectl-create-stdin');
  assert.equal(JSON.stringify(decision).includes('password'), false);
});

test('interrupted empty bootstrap reuses secret and creates schema only', () => {
  const decision = decideTemporalBootstrap(
    input({
      namespace: present(),
      secret: present(),
      pvc: present(),
      postgres: present({ ready: true }),
      sql: readableSql(),
    }),
  );
  assert.equal(decision.ok, true);
  assert.deepEqual(
    decision.actions.map((item) => item.op),
    [
      'reuse-secret',
      'wait-postgres-ready',
      'wait-authenticated-sql',
      'create-schema-job',
      'wait-schema-job',
      'verify-schema-tables',
      'apply-server',
    ],
  );
});

test('empty databases after postgres still creates schema when server and job are absent', () => {
  const decision = decideTemporalBootstrap(
    input({
      secret: present(),
      pvc: present(),
      postgres: present(),
      sql: readableSql(),
    }),
  );
  assert.equal(decision.ok, true);
  assert.equal(
    decision.actions.some((item) => item.op === 'create-schema-job'),
    true,
  );
  assert.equal(
    decision.actions.some((item) => item.op === 'apply-postgres'),
    false,
  );
});

test('pending schema Job waits for the same uid and does not apply server', () => {
  const decision = decideTemporalBootstrap(
    input({
      secret: present(),
      pvc: present(),
      postgres: present(),
      schemaJob: present({
        condition: 'Pending',
        uid: 'job-77',
        failedPods: 3,
      }),
      sql: readableSql(),
    }),
  );
  assert.equal(decision.ok, true);
  const wait = decision.actions.find((item) => item.op === 'wait-schema-job');
  assert.equal(wait?.uid, 'job-77');
  assert.equal(
    decision.actions.some((item) => item.op === 'apply-server'),
    false,
  );
});

test('complete schema Job reuses, verifies tables, then applies server', () => {
  const decision = decideTemporalBootstrap(
    input({
      namespace: present(),
      secret: present(),
      pvc: present(),
      postgres: present(),
      schemaJob: present({ condition: 'Complete', uid: 'job-done' }),
      sql: readableSql({
        temporal: true,
        temporal_visibility: true,
        tables: { temporal: true, temporal_visibility: true },
      }),
    }),
  );
  assert.equal(decision.ok, true);
  assert.deepEqual(
    decision.actions.map((item) => item.op),
    [
      'reuse-secret',
      'wait-postgres-ready',
      'wait-authenticated-sql',
      'reuse-schema-job',
      'verify-schema-tables',
      'apply-server',
    ],
  );
});

test('failed schema Job refuses without delete actions', () => {
  const decision = decideTemporalBootstrap(
    input({
      secret: present(),
      schemaJob: present({ condition: 'Failed', uid: 'job-bad' }),
    }),
  );
  assert.equal(decision.ok, false);
  assert.equal(decision.refusals[0]?.id, 'schema-job-failed');
  assert.equal(JSON.stringify(decision.actions).includes('delete'), false);
});

test('legacy TTL-expired Job path reuses schema when SQL and server health pass', () => {
  const decision = decideTemporalBootstrap(
    input({
      namespace: present(),
      secret: present(),
      pvc: present(),
      postgres: present(),
      server: present(),
      sql: readableSql({
        temporal: true,
        temporal_visibility: true,
        tables: { temporal: true, temporal_visibility: true },
      }),
      serverHealth: { state: 'healthy', mode: 'release-serving' },
      profileId: 'release',
    }),
  );
  assert.equal(decision.ok, true);
  assert.deepEqual(
    decision.actions.map((item) => item.op),
    [
      'reuse-secret',
      'wait-postgres-ready',
      'wait-authenticated-sql',
      'verify-schema-tables',
      'reuse-existing-schema',
      'reuse-server',
    ],
  );
});

test('legacy reuse without server present refuses', () => {
  const decision = decideTemporalBootstrap(
    input({
      secret: present(),
      postgres: present(),
      sql: readableSql({
        temporal: true,
        temporal_visibility: true,
        tables: { temporal: true, temporal_visibility: true },
      }),
    }),
  );
  assert.equal(decision.ok, false);
  assert.equal(decision.refusals[0]?.id, 'legacy-missing-server');
});

test('partial schema tables without job refuses', () => {
  const decision = decideTemporalBootstrap(
    input({
      secret: present(),
      postgres: present(),
      sql: readableSql({
        temporal: true,
        temporal_visibility: true,
        tables: { temporal: true, temporal_visibility: false },
      }),
    }),
  );
  assert.equal(decision.ok, false);
  assert.equal(decision.refusals[0]?.id, 'partial-schema-tables');
});

test('legacy reuse refuses unhealthy server and partial SQL', () => {
  const unhealthy = decideTemporalBootstrap(
    input({
      secret: present(),
      pvc: present(),
      postgres: present(),
      server: present(),
      sql: readableSql({
        temporal: true,
        temporal_visibility: true,
        tables: { temporal: true, temporal_visibility: true },
      }),
      serverHealth: { state: 'unhealthy' },
    }),
  );
  assert.equal(unhealthy.ok, false);
  assert.equal(unhealthy.refusals[0]?.id, 'server-unhealthy');

  const partial = decideTemporalBootstrap(
    input({
      secret: present(),
      postgres: present(),
      sql: readableSql({ temporal: true, temporal_visibility: false }),
    }),
  );
  assert.equal(partial.ok, false);
  assert.equal(partial.refusals[0]?.id, 'partial-schema-databases');
});

test('unknown job condition refuses', () => {
  const decision = decideTemporalBootstrap(
    input({
      secret: present(),
      schemaJob: present({ condition: 'Unknown' }),
    }),
  );
  assert.equal(decision.ok, false);
  assert.equal(decision.refusals[0]?.id, 'schema-job-unknown');
});

test('missing secret with persisted PVC refuses', () => {
  const decision = decideTemporalBootstrap(
    input({
      secret: absent(),
      pvc: present(),
    }),
  );
  assert.equal(decision.ok, false);
  assert.equal(decision.refusals[0]?.id, 'missing-secret-persisted');
});

test('secret create conflict stops for reobserve', () => {
  const decision = decideTemporalBootstrap(
    input({
      secretCreateConflict: true,
    }),
  );
  assert.equal(decision.ok, false);
  assert.equal(decision.reobserve, true);
  assert.equal(decision.refusals[0]?.id, 'secret-create-conflict');
  assert.equal(decision.actions.length, 0);
});

test('unreadable and foreign observations refuse without actions', () => {
  for (const [field, observation, id] of [
    ['secret', unreadable(), 'resource-unreadable-secret'],
    ['pvc', foreignOwned(), 'foreign-pvc'],
    ['postgres', unreadable(), 'resource-unreadable-postgres'],
    ['server', foreignOwned(), 'foreign-server'],
    ['schemaJob', unreadable(), 'resource-unreadable-schemaJob'],
  ]) {
    const decision = decideTemporalBootstrap(
      input({
        [field]: observation,
        secret: field === 'secret' ? observation : present(),
      }),
    );
    assert.equal(decision.ok, false);
    assert.equal(decision.refusals[0]?.id, id);
    assert.equal(decision.actions.length, 0);
  }
});

test('server present before schema bootstrap refuses', () => {
  const decision = decideTemporalBootstrap(
    input({
      secret: present(),
      server: present(),
      sql: readableSql(),
    }),
  );
  assert.equal(decision.ok, false);
  assert.equal(decision.refusals[0]?.id, 'server-before-schema');
});

test('complete job without verified schema tables refuses', () => {
  const decision = decideTemporalBootstrap(
    input({
      secret: present(),
      postgres: present(),
      schemaJob: present({ condition: 'Complete' }),
      sql: readableSql({
        temporal: true,
        temporal_visibility: true,
        tables: { temporal: false, temporal_visibility: true },
      }),
    }),
  );
  assert.equal(decision.ok, false);
  assert.equal(decision.refusals[0]?.id, 'schema-tables-unverified');
});

test('verifiedExistingSchema allows complete job without readable SQL tables', () => {
  const decision = decideTemporalBootstrap(
    input({
      secret: present(),
      postgres: present(),
      schemaJob: present({ condition: 'Complete' }),
      verifiedExistingSchema: true,
    }),
  );
  assert.equal(decision.ok, true);
  assert.equal(
    decision.actions.some((item) => item.op === 'apply-server'),
    true,
  );
});

test('sql unreadable when required refuses', () => {
  const decision = decideTemporalBootstrap(
    input({
      secret: present(),
      postgres: present(),
      schemaJob: present({ condition: 'Pending' }),
      sql: { state: 'unreadable', reason: 'psql error' },
    }),
  );
  assert.equal(decision.ok, false);
  assert.equal(decision.refusals[0]?.id, 'sql-unreadable');
});

test('apply-server always follows schema verification in action order', () => {
  const decision = decideTemporalBootstrap(input());
  const serverIndex = decision.actions.findIndex(
    (item) => item.op === 'apply-server',
  );
  const verifyIndex = decision.actions.findIndex(
    (item) => item.op === 'verify-schema-tables',
  );
  assert.ok(serverIndex > verifyIndex);
});
