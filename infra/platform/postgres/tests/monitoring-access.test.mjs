import test from 'node:test';
import assert from 'node:assert/strict';
import { readPlatformProfile } from '../../common/profile.mjs';
import { CATALOG_SQL } from '../../../../tools/dev-environments/src/adapters/dev-sql-tenant-live-adapter.mjs';
import {
  parseArguments, resolveSelection, runMonitoringAccess, MUTATION_TIMEOUT_MS,
} from '../monitoring-access.mjs';

const CTX = 'kind-offscreen-dev';
const AUTH = { OFFSCREEN_POSTGRES_MAINTENANCE: 'authorized', OFFSCREEN_POSTGRES_MONITORING_ACCESS: 'authorized' };
const ROLE = (oid, name, extra = {}) => ({
  oid, name, login: true, inherit: false, superuser: false, createdb: false, createrole: false,
  replication: false, bypassrls: false, ...extra,
});
const EXPORTER = 16003;

function freshState() {
  const owners = { postgres: 10, dev: 16001, temporal: 16002, temporal_visibility: 16002, dev_1: 16010, template0: 10, template1: 10 };
  const oids = { postgres: 1, dev: 2, temporal: 3, temporal_visibility: 4, dev_1: 5, template0: 6, template1: 7 };
  return {
    roles: [ROLE(10, 'postgres', { superuser: true }), ROLE(3373, 'pg_monitor', { login: false }), ROLE(16001, 'dev'),
      ROLE(16002, 'temporal'), ROLE(EXPORTER, 'cnpg_metrics_exporter'), ROLE(16010, 'dev_1_mig'), ROLE(16011, 'dev_1_run')],
    databases: Object.keys(owners).map((name) => ({
      oid: oids[name], name, ownerOid: owners[name], allowConnections: true,
      acl: [{ granteeOid: owners[name], grantorOid: owners[name], privilegeType: 'CONNECT', isGrantable: false }],
    })),
    monitor: { exporterOid: EXPORTER, monitorMember: true, assumers: [] },
    uids: { 'namespace/kube-system': 'ks-1', 'namespace/offscreen-dev-postgres': 'ns-1',
      'cluster.postgresql.cnpg.io/dev-pg': 'cl-1', 'pod/dev-pg-1': 'pod-1' },
    tenant: true,
    ownerLabel: true,
  };
}

function catalogText(state) {
  const roles = state.roles;
  const effective = [];
  for (const role of roles.filter((r) => /^(dev|temporal|dev_[0-9]+_(mig|run))$/.test(r.name))) {
    for (const database of state.databases) effective.push({ roleOid: role.oid, databaseOid: database.oid, connect: role.oid === database.ownerOid });
  }
  return JSON.stringify({
    databases: state.databases.map((d) => ({ oid: d.oid, name: d.name, ownerOid: d.ownerOid, allowConnections: d.allowConnections, acl: d.acl })),
    roles, monitor: state.monitor, effective,
  });
}

function objectFor(state, resource, name) {
  const profile = readPlatformProfile('dev');
  const ns = 'offscreen-dev-postgres';
  const uid = state.uids[`${resource}/${name}`] ?? `uid-${resource}-${name}`;
  const metadata = { name, uid };
  if (resource === 'namespace') {
    if (name === ns) metadata.labels = state.ownerLabel ? { [`${profile.ownerLabel}/owner`]: profile.ownerValue } : {};
    return { metadata };
  }
  metadata.namespace = ns;
  if (resource === 'cluster.postgresql.cnpg.io') {
    return { metadata, spec: { instances: 1 }, status: { instances: 1, readyInstances: 1, phase: 'Cluster in healthy state',
      currentPrimary: 'dev-pg-1', conditions: [{ type: 'Ready', status: 'True' }] } };
  }
  if (resource === 'pod') {
    metadata.labels = { 'cnpg.io/cluster': 'dev-pg', 'cnpg.io/instanceRole': 'primary' };
    metadata.ownerReferences = [{ kind: 'Cluster', uid: state.uids['cluster.postgresql.cnpg.io/dev-pg'] }];
    return { metadata, spec: { containers: [{ name: 'postgres', image: 'ghcr.io/cloudnative-pg/postgresql@sha256:abc' }] },
      status: { conditions: [{ type: 'Ready', status: 'True' }] } };
  }
  if (!state.tenant) return null;
  metadata.labels = { 'offscreen.dev/owner': 'offscreen-dev', 'offscreen.dev/slot': 'dev-1' };
  if (resource === 'database.postgresql.cnpg.io') {
    return { metadata, spec: { cluster: { name: 'dev-pg' }, name: 'dev_1', owner: 'dev_1_mig' }, status: { applied: true } };
  }
  if (state.dropRunCr && name === 'dev-1-run') return null;
  const role = name === 'dev-1-mig' ? 'dev_1_mig' : name === 'dev-1-run' ? 'dev_1_run' : null;
  if (!role) return null;
  return { metadata, spec: { cluster: { name: 'dev-pg' }, name: role, superuser: false }, status: { applied: true } };
}

function world(mutate = () => {}, options = {}) {
  const state = freshState();
  mutate(state);
  const calls = { mutations: [], reads: 0, catalogReads: 0 };
  let budget = options.budget ?? 1_800_000;
  const run = (command, args, opts = {}) => {
    assert.equal(command, 'kubectl');
    if (args[2] === 'get') {
      calls.reads += 1;
      const object = objectFor(state, args[3], args[4] === '-n' ? args[6] : args[4]);
      return { ok: true, stdout: object ? JSON.stringify(object) : '', stderr: '' };
    }
    assert.ok(args.includes('exec') && args.includes('-i') && args.includes('ON_ERROR_STOP=1') && args.includes('postgres'));
    assert.equal(args[args.indexOf('-U') + 1], 'postgres');
    if (opts.input === CATALOG_SQL) {
      assert.equal(opts.mutation, undefined);
      calls.catalogReads += 1;
      const text = catalogText(state);
      if (options.onCatalog) options.onCatalog(state, calls.catalogReads);
      return { ok: true, stdout: text, stderr: '' };
    }
    assert.equal(opts.mutation, true);
    assert.equal(opts.timeoutMs, MUTATION_TIMEOUT_MS);
    calls.mutations.push({ args, input: opts.input, remaining: budget });
    if (options.commit === 'unknown') return { ok: false, timedOut: true, stdout: '', stderr: '' };
    if (options.commit !== 'noop') {
      for (const [, name] of opts.input.matchAll(/GRANT CONNECT ON DATABASE "([a-z0-9_]+)" TO cnpg_metrics_exporter;/g)) {
        state.databases.find((d) => d.name === name).acl.push(
          { granteeOid: EXPORTER, grantorOid: state.databases.find((d) => d.name === name).ownerOid, privilegeType: 'CONNECT', isGrantable: options.commit === 'grantable' });
      }
    }
    return { ok: true, stdout: 'BEGIN\nSET\nCOMMIT\nmonitoring-access-committed\n', stderr: '' };
  };
  const custody = { acquire() { calls.locked = true; }, close() { calls.closed = true; }, remaining: () => budget, run };
  const wrap = (f) => { const base = run; custody.run = (...a) => f(base, ...a); deps.run = custody.run; };
  const deps = {
    env: AUTH, run, createCustody: () => custody,
    assertTarget: () => ({ ok: true, baselineUid: 'b-1' }),
    verifyTemporal: () => ({ ok: options.temporal ?? true }),
  };
  return { state, calls, deps, wrap, setBudget: (value) => { budget = value; } };
}

const args = (command, ...names) => [command, '--confirm-context', CTX, ...names.flatMap((n) => ['--database', n])];
const apply = (w, ...names) => runMonitoringAccess(args('apply', ...names), w.deps);
const refusalId = (result) => result.refusals?.[0]?.id;

test('argument and authorization refusals perform no native call', () => {
  const w = world();
  const cases = [
    [['apply', '--database', 'dev'], 'context-not-confirmed'],
    [['apply', '--confirm-context', 'kind-offscreen-release', '--database', 'dev'], 'context-not-confirmed'],
    [['apply', '--confirm-context', CTX], 'no-database-selected'],
    [['apply', '--confirm-context', CTX, '--database', 'dev', '--release'], 'missing-flag-value'],
    [['apply', '--confirm-context', CTX, '--release', 'x', '--database', 'dev'], 'unknown-argument'],
    [['apply', '--confirm-context', CTX, '--all', 'x', '--database', 'dev'], 'unknown-argument'],
    [['purge', '--confirm-context', CTX, '--database', 'dev'], 'unknown-command'],
    [args('apply', 'dev', 'dev'), 'duplicate-database'],
    [args('apply', '*'), 'invalid-database-name'],
    [args('apply', 'dev_%'), 'invalid-database-name'],
    [args('apply', 'template0'), 'database-not-allowed'],
    [args('apply', 'template1'), 'database-not-allowed'],
    [args('apply', 'dev_template'), 'database-not-allowed'],
    [args('apply', 'dev_01'), 'database-not-allowed'],
    [args('apply', 'dev_0'), 'database-not-allowed'],
    [args('apply', 'lab_pg'), 'database-not-allowed'],
    [args('apply', 'temporal'), 'temporal-pair-incomplete'],
  ];
  for (const [argv, id] of cases) assert.equal(refusalId(runMonitoringAccess(argv, w.deps)), id, JSON.stringify(argv));
  for (const key of ['OFFSCREEN_POSTGRES_MAINTENANCE', 'OFFSCREEN_POSTGRES_MONITORING_ACCESS']) {
    const env = { ...AUTH, [key]: 'yes' };
    assert.equal(refusalId(runMonitoringAccess(args('apply', 'dev'), { ...w.deps, env })), key.endsWith('MAINTENANCE') ? 'maintenance-not-authorized' : 'monitoring-access-not-authorized');
    const missing = { ...AUTH }; delete missing[key];
    assert.ok(refusalId(runMonitoringAccess(args('apply', 'dev'), { ...w.deps, env: missing })));
  }
  assert.equal(w.calls.reads + w.calls.catalogReads + w.calls.mutations.length, 0);
  assert.equal(w.calls.locked, undefined);
  assert.deepEqual(parseArguments(args('status', 'dev')), { command: 'status', databases: ['dev'] });
  assert.deepEqual(resolveSelection(['dev_12']).map((s) => s.owner), ['dev_12_mig']);
});

test('status is read-only, needs no authorization and reports sanitized disposition', () => {
  const w = world();
  const result = runMonitoringAccess(args('status', 'postgres', 'dev'), { ...w.deps, env: {} });
  assert.equal(result.ok, true);
  assert.deepEqual(result.databases, [{ name: 'postgres', state: 'missing' }, { name: 'dev', state: 'missing' }]);
  assert.equal(result.pending, 2);
  assert.equal(w.calls.mutations.length, 0);
  assert.equal(w.calls.locked, undefined);
  assert.doesNotMatch(JSON.stringify(result), /GRANT CONNECT|SELECT|password/i);
});

test('apply grants exactly the missing CONNECT via fixed stdin SQL and verifies readback', () => {
  const w = world();
  const result = apply(w, 'postgres', 'dev', 'dev_1', 'temporal', 'temporal_visibility');
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.outcome, 'applied');
  assert.equal(result.changed, 5);
  assert.equal(w.calls.mutations.length, 1);
  const [{ args: argv, input }] = w.calls.mutations;
  assert.ok(!argv.some((a) => /GRANT|cnpg_metrics/.test(a)), 'SQL travels on stdin only');
  for (const name of ['postgres', 'dev', 'dev_1', 'temporal', 'temporal_visibility']) {
    assert.ok(input.includes(`GRANT CONNECT ON DATABASE "${name}" TO cnpg_metrics_exporter;`));
  }
  assert.equal((input.match(/GRANT /g) ?? []).length, 5);
  assert.doesNotMatch(input, /GRANT OPTION|PASSWORD|ALTER|CREATE |DROP|REVOKE|template/i);
  assert.match(input, /^BEGIN;\nSET LOCAL lock_timeout = '5s';\nSET LOCAL statement_timeout = '20s';\nSET LOCAL transaction_timeout = '45s';\n/);
  assert.match(input, /COMMIT;\nSELECT 'monitoring-access-committed';\n$/);
  assert.ok(input.indexOf('monitoring-access-drift') < input.indexOf('GRANT CONNECT'));
  assert.ok(input.lastIndexOf('monitoring-access-drift') > input.lastIndexOf('GRANT CONNECT'));
  assert.ok(w.calls.locked && w.calls.closed);
  assert.doesNotMatch(JSON.stringify(result), /GRANT CONNECT|SELECT|password/i);
  assert.equal(w.state.databases.find((d) => d.name === 'template0').acl.length, 1);
});

test('exact repeat performs zero mutation, partial state grants only the missing database', () => {
  const done = world();
  assert.equal(apply(done, 'dev').ok, true);
  const repeat = world((state) => state.databases.find((d) => d.name === 'dev').acl.push(
    { granteeOid: EXPORTER, grantorOid: 16001, privilegeType: 'CONNECT', isGrantable: false }));
  const result = apply(repeat, 'dev');
  assert.equal(result.outcome, 'unchanged');
  assert.equal(repeat.calls.mutations.length, 0);
  const partial = world((state) => state.databases.find((d) => d.name === 'dev').acl.push(
    { granteeOid: EXPORTER, grantorOid: 16001, privilegeType: 'CONNECT', isGrantable: false }));
  const mixed = apply(partial, 'dev', 'postgres');
  assert.equal(mixed.ok, true);
  assert.equal(mixed.changed, 1);
  assert.equal((partial.calls.mutations[0].input.match(/GRANT /g) ?? []).length, 1);
  assert.match(partial.calls.mutations[0].input, /DATABASE "postgres"/);
  assert.doesNotMatch(partial.calls.mutations[0].input, /DATABASE "dev"/);
});

const REFUSE_BEFORE_WRITE = [
  ['foreign namespace', (s) => { s.ownerLabel = false; }, 'namespace-foreign', ['dev']],
  ['absent tenant CRs', (s) => { s.tenant = false; }, 'native-object-absent', ['dev_1']],
  ['partial tenant role CR', (s) => { s.dropRunCr = true; }, 'native-object-absent', ['dev_1']],
  ['unknown database', (s) => { s.databases = s.databases.filter((d) => d.name !== 'postgres'); }, 'database-missing', ['postgres']],
  ['wrong owner', (s) => { s.databases.find((d) => d.name === 'dev').ownerOid = 16002; }, 'database-owner-mismatch', ['dev']],
  ['role absent', (s) => { s.roles = s.roles.filter((r) => r.name !== 'cnpg_metrics_exporter'); s.monitor = null; }, 'monitor-role-absent', ['dev']],
  ['role superuser', (s) => { s.roles.find((r) => r.name === 'cnpg_metrics_exporter').superuser = true; }, 'monitor-role-unsafe', ['dev']],
  ['role assumable', (s) => { s.monitor.assumers = [16001]; }, 'monitor-role-unsafe', ['dev']],
  ['role not pg_monitor', (s) => { s.monitor.monitorMember = false; }, 'monitor-role-unsafe', ['dev']],
  ['grant option ACL', (s) => s.databases.find((d) => d.name === 'dev').acl.push({ granteeOid: EXPORTER, grantorOid: 16001, privilegeType: 'CONNECT', isGrantable: true }), 'monitor-acl-invalid', ['dev']],
  ['extra privilege ACL', (s) => s.databases.find((d) => d.name === 'dev').acl.push({ granteeOid: EXPORTER, grantorOid: 16001, privilegeType: 'CREATE', isGrantable: false }), 'monitor-acl-invalid', ['dev']],
  ['wrong grantor ACL', (s) => s.databases.find((d) => d.name === 'dev').acl.push({ granteeOid: EXPORTER, grantorOid: 10, privilegeType: 'CONNECT', isGrantable: false }), 'monitor-acl-invalid', ['dev']],
  ['template carries exporter grant', (s) => s.databases.find((d) => d.name === 'template1').acl.push({ granteeOid: EXPORTER, grantorOid: 10, privilegeType: 'CONNECT', isGrantable: false }), 'monitor-acl-unapproved', ['dev']],
  ['temporal unverified', null, 'temporal-persistence-unverified', ['temporal', 'temporal_visibility'], { temporal: false }],
  ['unsafe tenant role', (s) => { s.roles.find((r) => r.name === 'dev_1_run').createrole = true; }, 'tenant-role-unsafe', ['dev_1']],
];

for (const [label, mutate, id, names, options] of REFUSE_BEFORE_WRITE) {
  test(`refuses before any write: ${label}`, () => {
    const w = world(mutate ?? (() => {}), options);
    const result = apply(w, ...names);
    assert.equal(result.ok, false);
    if (id) assert.equal(refusalId(result), id);
    assert.equal(w.calls.mutations.length, 0);
    assert.ok(w.calls.closed);
  });
}

test('foreign Database CR (wrong owner) refuses', () => {
  const w = world();
  w.wrap((original, command, runArgs, opts) => {
    const result = original(command, runArgs, opts);
    if (runArgs[3] === 'database.postgresql.cnpg.io') {
      const object = JSON.parse(result.stdout);
      object.spec.owner = 'someone_else';
      return { ...result, stdout: JSON.stringify(object) };
    }
    return result;
  });
  const result = apply(w, 'dev_1');
  assert.equal(refusalId(result), 'tenant-database-declaration');
  assert.equal(w.calls.mutations.length, 0);
});

test('drift between the after-lock and pre-mutation observations refuses without dispatch', () => {
  for (const drift of [
    (s) => { s.uids['pod/dev-pg-1'] = 'pod-2'; },
    (s) => { s.uids['cluster.postgresql.cnpg.io/dev-pg'] = 'cl-2'; s.uids['pod/dev-pg-1'] = 'pod-1'; },
    (s) => { s.uids['namespace/kube-system'] = 'ks-2'; },
    (s) => { s.databases.find((d) => d.name === 'dev').oid = 99; },
    (s) => { s.roles.find((r) => r.name === 'cnpg_metrics_exporter').oid = 777; s.monitor.exporterOid = 777; },
    (s) => { s.databases.find((d) => d.name === 'postgres').acl.push({ granteeOid: 0, grantorOid: 10, privilegeType: 'CONNECT', isGrantable: false }); },
  ]) {
    const w = world(() => {}, { onCatalog: (state, n) => { if (n === 1) drift(state); } });
    const result = apply(w, 'dev');
    assert.equal(refusalId(result), 'observation-drift');
    assert.equal(w.calls.mutations.length, 0);
  }
});

test('custody budget below 60000ms refuses before dispatch and the budget is not rewritten', () => {
  const w = world(() => {}, { budget: 59_999 });
  const result = apply(w, 'dev');
  assert.equal(refusalId(result), 'custody-budget-insufficient');
  assert.equal(w.calls.mutations.length, 0);
  const late = world(() => {}, { onCatalog: (_state, n) => {} });
  late.setBudget(60_000);
  assert.equal(apply(late, 'dev').ok, true);
  assert.equal(late.calls.mutations[0].remaining, 60_000);
});

test('unknown commit result refuses, never retries and never repairs', () => {
  const w = world(() => {}, { commit: 'unknown' });
  const result = apply(w, 'dev');
  assert.equal(result.ok, false);
  assert.equal(result.outcome, 'unknown-outcome');
  assert.equal(result.retried, false);
  assert.equal(w.calls.mutations.length, 1);
  assert.equal(w.calls.catalogReads, 2);
});

test('postcheck mismatch is reported without automatic repair', () => {
  for (const commit of ['noop', 'grantable']) {
    const w = world(() => {}, { commit });
    const result = apply(w, 'dev');
    assert.equal(result.ok, false);
    // A grant-option row is refused by the shared predicate at readback; a missing row is a mismatch.
    assert.equal(result.outcome, commit === 'noop' ? 'postcheck-mismatch' : 'committed-readback-unavailable');
    assert.equal(w.calls.mutations.length, 1);
  }
  const effective = world(() => {}, { commit: 'ok' });
  let seenMutation = false;
  effective.wrap((original, command, runArgs, opts) => {
    if (opts?.mutation) seenMutation = true;
    const result = original(command, runArgs, opts);
    if (seenMutation && opts?.input === CATALOG_SQL) {
      const text = JSON.parse(result.stdout);
      text.effective[0].connect = !text.effective[0].connect;
      return { ...result, stdout: JSON.stringify(text) };
    }
    return result;
  });
  const changed = apply(effective, 'dev');
  assert.equal(changed.outcome, 'postcheck-mismatch');
});

test('apply output and SQL never contain credentials', () => {
  const w = world();
  const result = apply(w, 'postgres');
  const text = JSON.stringify(result) + w.calls.mutations[0].input;
  assert.doesNotMatch(text, /password|secret|token|sha256|postgresql:\/\//i);
});
