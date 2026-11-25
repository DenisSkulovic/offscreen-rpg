import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareFreshTemporalPersistence } from '../temporal-persistence/prepare.mjs';

const context = 'kind-offscreen-dev';
const namespace = 'offscreen-dev-postgres';
const roleType = 'databaserole.postgresql.cnpg.io';
const databaseType = 'database.postgresql.cnpg.io';

function fixture({ collision = false, publicConnect = false, failSchema = false } = {}) {
  const calls = [];
  const resources = new Map();
  let revision = 100;
  const put = (type, body) => {
    resources.set(type + '/' + body.metadata.name, body);
  };
  const namespaceBody = (name) => ({
    metadata: { name, uid: name + '-uid', labels: { 'offscreen.dev/owner': 'offscreen-dev' } },
  });
  put('namespace', namespaceBody('offscreen-dev-system'));
  put('namespace', namespaceBody(namespace));
  put('cluster.postgresql.cnpg.io', {
    metadata: {
      name: 'dev-pg', namespace, uid: 'pg-uid',
      labels: { 'offscreen.dev/owner': 'offscreen-dev' },
    },
    spec: {
      instances: 1, imageName: 'ghcr.io/cloudnative-pg/postgresql:18.7-system-trixie',
      bootstrap: { initdb: { database: 'dev', owner: 'dev' } },
    },
    status: {
      instances: 1, readyInstances: 1, phase: 'Cluster in healthy state',
      conditions: [{ type: 'Ready', status: 'True' }], currentPrimary: 'dev-pg-2',
    },
  });
  put('pod', {
    metadata: {
      name: 'dev-pg-2', namespace,
      labels: { 'cnpg.io/cluster': 'dev-pg', 'cnpg.io/instanceRole': 'primary' },
    },
  });
  if (collision) put('secret', { metadata: { name: 'temporal-db', namespace } });
  const ok = (body = '') => ({
    ok: true, status: 0, stdout: typeof body === 'string' ? body : JSON.stringify(body),
  });
  const reconcile = (body) => {
    if (body.kind !== 'Secret') {
      body.status = { applied: true, observedGeneration: body.metadata.generation };
      if (body.kind === 'DatabaseRole' && body.spec.login) {
        body.status.secretResourceVersion = resources.get('secret/temporal-db').metadata.resourceVersion;
      }
    }
    return body;
  };

  const run = (command, args, options = {}) => {
    calls.push({ command, args, options });
    if (command === 'kind') return ok('offscreen-dev\n');
    assert.equal(args[1], context);
    if (args.includes('config')) {
      return ok({
        contexts: [{ name: context, context: { cluster: context } }],
        clusters: [{ name: context, cluster: { server: 'https://127.0.0.1:24443' } }],
      });
    }
    const verb = args.find((arg) => ['get', 'create', 'patch', 'exec'].includes(arg));
    const tail = args.slice(args.indexOf(verb) + 1).filter((arg, index, all) =>
      arg !== '-n' && all[index - 1] !== '-n');
    if (verb === 'get') {
      const [type, name] = tail;
      if (name === '-o') {
        return ok({ items: [...resources.entries()].filter(([key]) => key.startsWith(type + '/')).map(([, value]) => value) });
      }
      return ok(resources.get(type + '/' + name) ?? '');
    }
    if (verb === 'create') {
      const body = JSON.parse(options.input);
      const type = body.kind === 'Secret' ? 'secret' :
        body.kind === 'DatabaseRole' ? roleType : databaseType;
      body.metadata.uid = body.kind + '-' + body.metadata.name;
      body.metadata.generation = 1;
      body.metadata.resourceVersion = String(revision++);
      if (body.kind === 'Secret') {
        body.data = Object.fromEntries(Object.entries(body.stringData).map(([key, value]) => [key, Buffer.from(value).toString('base64')]));
        delete body.stringData;
      }
      put(type, reconcile(body));
      return ok(body);
    }
    if (verb === 'patch') {
      const [type, name] = tail;
      const body = resources.get(type + '/' + name);
      const patch = JSON.parse(args[args.indexOf('-p') + 1]);
      assert.equal(patch.metadata.resourceVersion, body.metadata.resourceVersion);
      Object.assign(body.spec, patch.spec);
      body.metadata.resourceVersion = String(revision++);
      body.metadata.generation++;
      return ok(reconcile(body));
    }
    if (verb === 'exec') {
      assert.ok(args.includes('dev-pg-2'));
      const statement = args.at(-1);
      if (statement.includes('a.grantee = 0')) return ok(publicConnect ? 'f' : 't');
      if (statement.startsWith('REVOKE')) return ok('REVOKE');
      if (failSchema && statement.includes('has_schema_privilege')) return ok('f');
      return ok('t');
    }
    throw new Error('unexpected mocked command');
  };
  return { run, calls };
}

function mutations(calls) {
  return calls.filter(({ args }) => args.includes('create') || args.includes('patch') ||
    args.at(-1)?.startsWith('REVOKE'));
}

test('wrong context is rejected without invoking commands', () => {
  const { run, calls } = fixture();
  assert.throws(() => prepareFreshTemporalPersistence('dev', { confirmContext: 'wrong' }, { run }), /confirmation/);
  assert.equal(calls.length, 0);
});

test('existing credential refuses without mutation', () => {
  const { run, calls } = fixture({ collision: true });
  assert.throws(() => prepareFreshTemporalPersistence('dev', { confirmContext: context }, { run }), /already exists/);
  assert.equal(mutations(calls).length, 0);
});

test('PUBLIC CONNECT refuses before creating any credentials', () => {
  const { run, calls } = fixture({ publicConnect: true });
  assert.throws(() => prepareFreshTemporalPersistence('dev', { confirmContext: context }, { run }), /PUBLIC CONNECT/);
  assert.equal(mutations(calls).length, 0);
});

test('fresh preparation orders closed stores and ACLs before login; credentials only via stdin', () => {
  const { run, calls } = fixture();
  const result = prepareFreshTemporalPersistence('dev', { confirmContext: context }, { run });
  assert.deepEqual(result, { namespace, secretName: 'temporal-db', secretVersion: '100' });
  const writes = mutations(calls);
  const creates = writes.filter(({ args }) => args.includes('create')).map(({ options }) => JSON.parse(options.input));
  assert.equal(creates.length, 4);
  assert.equal(creates[1].spec.login, false);
  assert.ok(creates.slice(2).every((body) => body.spec.allowConnections === false));
  const password = creates[0].stringData.password;
  assert.ok(calls.every(({ args }) => !args.some((arg) => arg.includes(password))));
  assert.equal(calls.filter(({ options }) => options.input === password + '\n').length, 2);
  const finalWrite = writes.at(-1);
  assert.equal(JSON.parse(finalWrite.args[finalWrite.args.indexOf('-p') + 1]).spec.login, true);
  assert.equal(writes.filter(({ args }) => args.at(-1)?.startsWith('REVOKE')).length, 2);
  assert.ok(calls.every(({ args }) => !args.includes('delete')));
});

test('failed schema verification preserves resources and never enables login', () => {
  const { run, calls } = fixture({ failSchema: true });
  assert.throws(() => prepareFreshTemporalPersistence('dev', { confirmContext: context }, { run }), /empty owner-writable/);
  assert.ok(!calls.some(({ args }) => args.includes('patch') &&
    args.includes(roleType)));
  assert.ok(calls.every(({ args }) => !args.includes('delete')));
});
