import { DEV_CLUSTER_NAME } from '../../../../../scripts/repo-tools/dev-worktree-allocator.mjs';
import { deriveDevNamespace } from '../../../../../scripts/repo-tools/dev-worktree-registry.mjs';
import { DEV_CNPG_NAMESPACE } from './dev-cnpg-bootstrap.mjs';
import { DEV_S3_NAMESPACE } from './dev-object-store-bootstrap.mjs';
import { deriveDevS3Tenant } from './dev-s3-tenant.mjs';
import { DEV_SQL_POOL_MAX, deriveDevSqlTenant } from './dev-sql-tenant-contract.mjs';

const COOKIE_PREFIX = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const WORKLOADS = ['game-web', 'game-api', 'game-authority', 'game-control', 'game-executor', 'game-relay'];
const SERVICES = ['game-web', 'game-api', 'game-authority'];
const LEGACY_NAMESPACES = ['lab-edge', 'lab-authority', 'lab-workers'];
const FORBIDDEN_SECRET_NAMES = ['postgres-superuser', 'seaweed-admin'];

function refusal(id, detail) {
  const error = new Error(detail);
  error.code = id;
  return error;
}

export function deriveSlotCookiePrefix(slotId) {
  const names = deriveDevSqlTenant(slotId);
  if (!COOKIE_PREFIX.test(names.slotId)) throw refusal('cookie-prefix', names.slotId);
  return names.slotId;
}

function env(name, value) {
  return { name, value: String(value) };
}

function secretEnv(name, secret, key) {
  return { name, valueFrom: { secretKeyRef: { name: secret, key } } };
}

function labels(slotId, app) {
  return {
    app,
    'offscreen.dev/slot': slotId,
    'offscreen.dev/owner': 'offscreen-dev',
    'offscreen.rpg/profile': 'dev-slot',
  };
}

function deployment(slotId, namespace, name, container) {
  const owned = labels(slotId, name);
  return {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: { name, namespace, labels: owned },
    spec: {
      replicas: 1,
      selector: { matchLabels: { app: name, 'offscreen.dev/slot': slotId } },
      template: {
        metadata: { labels: owned },
        spec: {
          automountServiceAccountToken: false,
          enableServiceLinks: false,
          containers: [container],
        },
      },
    },
  };
}

function service(slotId, namespace, name, port) {
  return {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: { name, namespace, labels: labels(slotId, name) },
    spec: {
      type: 'ClusterIP',
      selector: { app: name, 'offscreen.dev/slot': slotId },
      ports: [{ name: 'http', port, targetPort: 'http' }],
    },
  };
}

/**
 * Render one slot application graph. Secret values stay outside the documents.
 * @param {string} slotId
 * @param {{ schemaReady: boolean, ports: { game: number } }} input
 */
export function renderDevSlotAppGraph(slotId, input) {
  const sql = deriveDevSqlTenant(slotId);
  const s3 = deriveDevS3Tenant(slotId);
  const prefix = deriveSlotCookiePrefix(slotId);
  if (!input?.schemaReady) throw refusal('stale-schema', `${sql.slotId} schema gate is closed`);
  if (!Number.isInteger(input.ports?.game) || input.ports.game < 1) throw refusal('ports', 'game port is missing');
  const namespace = sql.appNamespace;
  const imageFor = (role) => `offscreen-dev-workspace:${sql.slotId}-${role}`;
  const appSecret = `${sql.slotId}-app`;
  const dbSecret = sql.runtimeSecret;
  const origin = `http://${namespace}.svc.cluster.local`;
  const authority = `http://game-authority.${namespace}.svc.cluster.local:3002`;
  const api = `http://game-api.${namespace}.svc.cluster.local:3001`;
  const s3Endpoint = `http://object-store.${DEV_S3_NAMESPACE}.svc.cluster.local:8333`;
  const temporal = `temporal-server.offscreen-dev-temporal.svc.cluster.local:7233`;
  const temporalNamespace = namespace;
  const pool = env('DB_POOL_MAX', DEV_SQL_POOL_MAX);
  const slot = env('OFFSCREEN_DEV_SLOT', sql.slotId);
  const documentStore = env('OFFSCREEN_DOCUMENT_STORE', 's3');
  const documents = [
    { apiVersion: 'v1', kind: 'Namespace', metadata: { name: namespace, labels: labels(sql.slotId, 'slot') } },
    service(sql.slotId, namespace, 'game-web', 3000),
    service(sql.slotId, namespace, 'game-api', 3001),
    service(sql.slotId, namespace, 'game-authority', 3002),
    deployment(sql.slotId, namespace, 'game-web', {
      name: 'web', image: imageFor('web'), imagePullPolicy: 'Never', workingDir: '/app',
      command: ['pnpm', '--filter', '@offscreen/web', 'exec', 'next', 'dev', '--hostname', '0.0.0.0', '--port', '3000'],
      ports: [{ name: 'http', containerPort: 3000 }],
      env: [slot, env('API_PROXY_ORIGIN', api), env('API_INTERNAL_ORIGIN', api)],
    }),
    deployment(sql.slotId, namespace, 'game-api', {
      name: 'api', image: imageFor('api'), imagePullPolicy: 'Never', workingDir: '/app/apps/api',
      command: ['sh', '-c', 'pnpm exec tsc --noEmitOnError && (pnpm exec tsc --watch --noEmitOnError --preserveWatchOutput --pretty false & exec node --watch-path=dist dist/src/main.js)'],
      ports: [{ name: 'http', containerPort: 3001 }],
      env: [
        slot, pool, env('APP_ORIGIN', `http://127.0.0.1:${input.ports.game}`),
        env('BETTER_AUTH_COOKIE_PREFIX', prefix),
        env('GAME_AUTHORITY_ORIGIN', authority),
        env('GAME_AUTHORITY_MODE', 'distributed'),
        env('API_HOST', '0.0.0.0'), env('API_PORT', '3001'),
        documentStore,
        env('OFFSCREEN_DOCUMENT_S3_BUCKET', s3.bucket),
        env('OFFSCREEN_DOCUMENT_S3_ENDPOINT', s3Endpoint),
        secretEnv('DATABASE_URL', dbSecret, 'uri'),
        secretEnv('OFFSCREEN_DOCUMENT_S3_ACCESS_KEY_ID', s3.secret, 'access-key-id'),
        secretEnv('OFFSCREEN_DOCUMENT_S3_SECRET_ACCESS_KEY', s3.secret, 'secret-access-key'),
        secretEnv('GAME_AUTHORITY_SERVICE_TOKEN', appSecret, 'game-authority-service-token'),
        secretEnv('BETTER_AUTH_SECRET', appSecret, 'better-auth-secret'),
        secretEnv('GITHUB_CLIENT_ID', appSecret, 'github-client-id'),
        secretEnv('GITHUB_CLIENT_SECRET', appSecret, 'github-client-secret'),
      ],
    }),
    deployment(sql.slotId, namespace, 'game-authority', {
      name: 'authority', image: imageFor('authority'), imagePullPolicy: 'Never', workingDir: '/app/apps/game-authority',
      command: ['sh', '-c', 'pnpm exec tsc -p tsconfig.dev.json && node dist/src/bootstrap/main.js'],
      ports: [{ name: 'http', containerPort: 3002 }],
      env: [
        slot, pool, documentStore, env('GAME_AUTHORITY_HOST', '0.0.0.0'), env('GAME_AUTHORITY_PORT', '3002'),
        env('OFFSCREEN_DOCUMENT_S3_BUCKET', s3.bucket), env('OFFSCREEN_DOCUMENT_S3_ENDPOINT', s3Endpoint),
        secretEnv('DATABASE_URL', dbSecret, 'uri'),
        secretEnv('OFFSCREEN_DOCUMENT_S3_ACCESS_KEY_ID', s3.secret, 'access-key-id'),
        secretEnv('OFFSCREEN_DOCUMENT_S3_SECRET_ACCESS_KEY', s3.secret, 'secret-access-key'),
        secretEnv('GAME_AUTHORITY_SERVICE_TOKEN', appSecret, 'game-authority-service-token'),
        secretEnv('GAME_AUTHORITY_CONTROL_TOKEN', appSecret, 'game-authority-control-token'),
        secretEnv('GAME_AUTHORITY_EXECUTOR_TOKEN', appSecret, 'game-authority-executor-token'),
      ],
    }),
    deployment(sql.slotId, namespace, 'game-control', {
      name: 'control', image: imageFor('worker'), imagePullPolicy: 'Never', workingDir: '/app/apps/worker',
      command: ['sh', '-c', 'pnpm exec tsc -p tsconfig.dev.json && node dist/src/bootstrap/control-main.js'],
      env: [
        slot, env('TEMPORAL_ADDRESS', temporal), env('TEMPORAL_NAMESPACE', temporalNamespace),
        env('TEMPORAL_TASK_QUEUE', 'control'), env('GAME_AUTHORITY_ORIGIN', authority),
        secretEnv('GAME_AUTHORITY_CONTROL_TOKEN', appSecret, 'game-authority-control-token'),
      ],
    }),
    deployment(sql.slotId, namespace, 'game-executor', {
      name: 'executor', image: imageFor('worker'), imagePullPolicy: 'Never', workingDir: '/app/apps/worker',
      command: ['sh', '-c', 'pnpm exec tsc -p tsconfig.dev.json && node dist/src/bootstrap/executor-main.js'],
      env: [
        slot, env('TEMPORAL_ADDRESS', temporal), env('TEMPORAL_NAMESPACE', temporalNamespace),
        env('TEMPORAL_TASK_QUEUE', 'storyteller-execute-v1'), env('GAME_AUTHORITY_ORIGIN', authority),
        secretEnv('GAME_AUTHORITY_EXECUTOR_TOKEN', appSecret, 'game-authority-executor-token'),
      ],
    }),
    deployment(sql.slotId, namespace, 'game-relay', {
      name: 'relay', image: imageFor('worker'), imagePullPolicy: 'Never', workingDir: '/app/apps/worker',
      command: ['sh', '-c', 'pnpm exec tsc -p tsconfig.dev.json && node dist/src/bootstrap/main.js'],
      env: [
        slot, pool, documentStore, env('TEMPORAL_ADDRESS', temporal), env('TEMPORAL_NAMESPACE', temporalNamespace),
        env('OFFSCREEN_DOCUMENT_S3_BUCKET', s3.bucket), env('OFFSCREEN_DOCUMENT_S3_ENDPOINT', s3Endpoint),
        secretEnv('DATABASE_URL', dbSecret, 'uri'),
        secretEnv('OFFSCREEN_DOCUMENT_S3_ACCESS_KEY_ID', s3.secret, 'access-key-id'),
        secretEnv('OFFSCREEN_DOCUMENT_S3_SECRET_ACCESS_KEY', s3.secret, 'secret-access-key'),
      ],
    }),
  ];
  assertRenderedGraph(documents, sql.slotId);
  return { slotId: sql.slotId, namespace, images: { web: imageFor('web'), api: imageFor('api'), authority: imageFor('authority'), worker: imageFor('worker') }, cookiePrefix: prefix, appSecret, dbSecret, s3Secret: s3.secret, origin, documents };
}

export function assertRenderedGraph(documents, slotId) {
  const namespace = deriveDevNamespace(slotId);
  const text = JSON.stringify(documents);
  for (const legacy of LEGACY_NAMESPACES) {
    if (text.includes(legacy)) throw refusal('legacy-namespace', legacy);
  }
  if (text.includes('TEMPORAL_NAMESPACE":"default"') || text.includes('"value":"default"')) {
    throw refusal('temporal-default', slotId);
  }
  for (const forbidden of [deriveDevSqlTenant(slotId).migrationSecret, ...FORBIDDEN_SECRET_NAMES, 'admin']) {
    if (text.includes(`"name":"${forbidden}"`)) throw refusal('admin-leak', forbidden);
  }
  const names = documents.filter((item) => item.kind === 'Deployment').map((item) => item.metadata.name);
  if (names.join() !== WORKLOADS.join()) throw refusal('workloads', names.join());
  const services = documents.filter((item) => item.kind === 'Service').map((item) => item.metadata.name);
  if (services.join() !== SERVICES.join()) throw refusal('services', services.join());
  for (const item of documents) {
    if (item.metadata.namespace && item.metadata.namespace !== namespace) throw refusal('foreign-namespace', item.metadata.name);
    if (item.kind === 'Deployment' && !String(item.spec.template.spec.containers[0].image).startsWith(`offscreen-dev-workspace:${slotId}-`)) {
      throw refusal('image', item.metadata.name);
    }
  }
  return true;
}

export function assertSlotOwnership(record, observed) {
  const sql = deriveDevSqlTenant(record?.slotId);
  if (!record || record.namespace !== sql.appNamespace || record.cluster !== DEV_CLUSTER_NAME) {
    throw refusal('owner-binding', 'owner-binding failed for this slot');
  }
  if (observed?.context !== DEV_CLUSTER_NAME) throw refusal('context', `wrong context ${observed?.context ?? 'missing'}`);
  if (observed?.namespace !== sql.appNamespace) throw refusal('foreign-namespace', `foreign-namespace ${observed?.namespace ?? 'missing'}`);
  for (const name of observed.workloads ?? []) {
    if (!WORKLOADS.includes(name)) throw refusal('unexpected-workload', name);
  }
  for (const [name, uid] of Object.entries(record.resourceUids ?? {})) {
    if (observed.secretUids?.[name] && observed.secretUids[name] !== uid) throw refusal('secret-uid', `secret-uid mismatch ${name}`);
  }
  if (observed.secrets?.includes(sql.migrationSecret)) throw refusal('admin-leak', `admin-leak ${sql.migrationSecret}`);
  if (!observed.schemaReady) throw refusal('stale-schema', `stale-schema ${sql.slotId}`);
  if (observed.cookiePrefix !== sql.slotId) throw refusal('cookie-prefix', `cookie-prefix ${observed.cookiePrefix ?? 'missing'}`);
  return { namespace: sql.appNamespace, postgresNamespace: DEV_CNPG_NAMESPACE };
}
