import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openTestlabKindDatabase, validateLabAppUri } from './testlab-kind-db.mjs';

const SECRET = Buffer.from('postgresql://lab:s3cret@lab-pg-rw.lab-postgres.svc:5432/lab').toString('base64');

function secretExec() {
  return async () => ({
    code: 0,
    stdout: JSON.stringify({ data: { uri: SECRET } }),
  });
}

function fakeClient() {
  const queries = [];
  return {
    queries,
    async query(sql, params) {
      queries.push(sql);
      if (sql.startsWith('SELECT current_database')) {
        return { rows: [{ database: 'lab', user: 'lab' }] };
      }
      return { rows: [{ ok: true, params }] };
    },
    async end() {
      queries.push('end');
    },
  };
}

test('rejects a non lab-pg-rw URI', () => {
  const result = validateLabAppUri('postgresql://lab:x@localhost/lab');
  assert.equal(result.ok, false);
  assert.equal(result.id, 'secret-uri-host');
});

test('read-only session rolls back and closes the forward', async () => {
  const client = fakeClient();
  let killed = false;
  const session = await openTestlabKindDatabase({
    exec: secretExec(),
    createClient: async (connectionString) => {
      assert.equal(connectionString.includes('s3cret'), true);
      assert.equal(connectionString.includes('127.0.0.1'), true);
      return client;
    },
    spawnPortForward: async () => ({ ok: true, port: 54321, kill() { killed = true; } }),
  });
  assert.equal(session.ok, true);
  await session.queryReadOnly('SELECT 1', []);
  assert.ok(client.queries.includes('BEGIN READ ONLY'));
  assert.ok(client.queries.includes('ROLLBACK'));
  await session.close();
  assert.equal(killed, true);
  assert.equal(JSON.stringify(client.queries).includes('s3cret'), false);
});

test('transaction throw rolls back', async () => {
  const client = fakeClient();
  const session = await openTestlabKindDatabase({
    exec: secretExec(),
    createClient: async () => client,
    spawnPortForward: async () => ({ ok: true, port: 1, kill() {} }),
  });
  await assert.rejects(session.grantStore.withTransaction(async () => {
    throw new Error('boom postgresql://lab:s3cret@lab-pg-rw/lab');
  }));
  assert.ok(client.queries.includes('ROLLBACK'));
});

test('port-forward timeout', async () => {
  const session = await openTestlabKindDatabase({
    exec: secretExec(),
    spawnPortForward: async () => ({ ok: false, id: 'port-forward-timeout', message: 'late' }),
  });
  assert.equal(session.ok, false);
  assert.equal(session.id, 'port-forward-timeout');
});
