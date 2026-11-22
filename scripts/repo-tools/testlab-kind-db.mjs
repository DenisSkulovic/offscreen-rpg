/**
 * Ephemeral loopback SQL session for the pinned kind CNPG database.
 * The Secret URI stays in memory. Callers close the session in finally.
 */

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LAB_OWNED_APP_IDENTITY } from './testlab-target-guard.mjs';
import { refusedKindReadArgv } from './testlab-kind-observer.mjs';

const requireFromDb = createRequire(
  path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../packages/db/package.json',
  ),
);

const CONTEXT = LAB_OWNED_APP_IDENTITY.contextName;
const SECRET_ARGV = [
  'kubectl',
  '--context',
  CONTEXT,
  '-n',
  'lab-postgres',
  'get',
  'secret',
  'lab-pg-app',
  '-o',
  'json',
];

/**
 * @param {string} uri
 */
export function validateLabAppUri(uri) {
  let parsed;
  try {
    parsed = new URL(uri);
  } catch {
    return { ok: false, id: 'secret-uri-invalid', message: 'lab-pg-app uri is not a URL.' };
  }
  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
    return { ok: false, id: 'secret-uri-invalid', message: 'lab-pg-app uri must be postgres.' };
  }
  const host = parsed.hostname;
  const hostOk =
    host === 'lab-pg-rw' ||
    host.startsWith('lab-pg-rw.lab-postgres');
  if (!hostOk) {
    return { ok: false, id: 'secret-uri-host', message: 'lab-pg-app uri must target service lab-pg-rw.' };
  }
  const database = parsed.pathname.replace(/^\//, '');
  if (database !== 'lab' || decodeURIComponent(parsed.username) !== 'lab') {
    return { ok: false, id: 'secret-uri-identity', message: 'lab-pg-app uri must use database lab and user lab.' };
  }
  return { ok: true, parsed };
}

/**
 * @param {URL} parsed
 * @param {number} port
 */
function loopbackUrl(parsed, port) {
  const next = new URL(parsed.href);
  next.hostname = '127.0.0.1';
  next.port = String(port);
  return next;
}

/**
 * @param {{ exec: Function, spawnPortForward?: Function, createClient?: Function, timeoutMs?: number }} deps
 */
export async function openTestlabKindDatabase(deps = {}) {
  const exec = deps.exec ?? defaultSecretExec;
  const secretRead = await exec(SECRET_ARGV);
  if (!secretRead || secretRead.code !== 0) {
    return { ok: false, id: 'secret-unreadable', message: 'Could not read lab-pg-app.' };
  }
  let secret;
  try {
    secret = JSON.parse(secretRead.stdout);
  } catch {
    return { ok: false, id: 'secret-unreadable', message: 'lab-pg-app was not JSON.' };
  }
  const encoded = secret?.data?.uri;
  if (typeof encoded !== 'string') {
    return { ok: false, id: 'secret-uri-missing', message: 'lab-pg-app data.uri is missing.' };
  }
  const uri = Buffer.from(encoded, 'base64').toString('utf8');
  const validated = validateLabAppUri(uri);
  if (!validated.ok) return validated;

  const portForward = deps.spawnPortForward ?? defaultPortForward;
  const child = await portForward({ timeoutMs: deps.timeoutMs ?? 8_000 });
  if (!child.ok) return child;

  const connectionString = loopbackUrl(validated.parsed, child.port).href;
  const createClient = deps.createClient ?? defaultCreateClient;
  const client = await createClient(connectionString);
  let closed = false;

  async function close() {
    if (closed) return;
    closed = true;
    try {
      await client.end();
    } finally {
      child.kill();
    }
  }

  try {
    const identity = await client.query('SELECT current_database() AS database, current_user AS user');
    const row = identity.rows?.[0] ?? {};
    if (row.database !== 'lab' || row.user !== 'lab') {
      await close();
      return { ok: false, id: 'db-session-identity', message: 'Session is not database lab as user lab.' };
    }
  } catch {
    await close();
    return { ok: false, id: 'db-session-identity', message: 'Session identity query failed.' };
  }

  return {
    ok: true,
    async queryReadOnly(sql, params = []) {
      await client.query('BEGIN READ ONLY');
      try {
        const result = await client.query(sql, params);
        await client.query('ROLLBACK');
        return { rows: result.rows };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    },
    grantStore: {
      async withTransaction(fn) {
        await client.query('BEGIN');
        try {
          const value = await fn({
            query: (sql, params) => client.query(sql, params),
          });
          await client.query('COMMIT');
          return value;
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      },
    },
    close,
  };
}

function defaultSecretExec(argv) {
  return new Promise((resolve) => {
    const child = spawn(argv[0], argv.slice(1), { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });
    child.on('close', (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

function defaultCreateClient(connectionString) {
  const pg = requireFromDb('pg');
  const client = new pg.Client({ connectionString });
  return client.connect().then(() => client);
}

function defaultPortForward({ timeoutMs }) {
  const refused = refusedKindReadArgv([
    'kubectl',
    '--context',
    CONTEXT,
    '-n',
    'lab-postgres',
    'get',
    'service',
    'lab-pg-rw',
    '-o',
    'json',
  ]);
  if (refused) return Promise.resolve({ ok: false, id: 'port-forward-refused', message: refused });
  return new Promise((resolve) => {
    const child = spawn(
      'kubectl',
      [
        '--context',
        CONTEXT,
        '-n',
        'lab-postgres',
        'port-forward',
        'service/lab-pg-rw',
        ':5432',
        '--address',
        '127.0.0.1',
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill('SIGKILL');
      resolve({ ok: false, id: 'port-forward-timeout', message: 'port-forward did not become ready.' });
    }, timeoutMs);
    const onData = (chunk) => {
      const text = chunk.toString('utf8');
      const match = text.match(/Forwarding from 127\.0\.0\.1:(\d+)/);
      if (!match || settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        ok: true,
        port: Number(match[1]),
        kill() {
          child.kill('SIGTERM');
        },
      });
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('exit', () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ok: false, id: 'port-forward-exited', message: 'port-forward exited before ready.' });
    });
  });
}
