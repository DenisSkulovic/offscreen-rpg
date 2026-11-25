import { DEV_CLUSTER_NAME } from '../domain/dev-worktree-allocator.mjs';
import { deriveDevNamespace } from '../domain/dev-worktree-registry.mjs';
import { DEV_CNPG_NAMESPACE } from '../../../../infra/platform/postgres/config.mjs';
import { DEV_S3_NAMESPACE } from '../../../../infra/platform/object-storage/dev-bootstrap.mjs';
import { deriveDevS3Tenant } from '../adapters/dev-s3-tenant.mjs';
import {
  DEV_SQL_POOL_MAX,
  deriveDevSqlTenant,
} from './dev-sql-tenant-contract.mjs';
import {
  renderWorkloadDocuments,
  renderWorkloadYaml,
} from '../../../../infra/workloads/render.mjs';

const COOKIE_PREFIX = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const WORKLOADS = [
  'game-web',
  'game-api',
  'game-authority',
  'game-control',
  'game-executor',
  'game-relay',
];
const SERVICES = ['game-web', 'game-api', 'game-authority'];
const LEGACY_NAMESPACES = ['lab-edge', 'lab-authority', 'lab-workers'];
const FORBIDDEN_SECRET_NAMES = ['postgres-superuser', 'seaweed-admin'];
/** Pod-local receipt root. /tmp is writable by the container user; /app is not. */
export const DEV_POD_RUNTIME_RECEIPT_DIR = '/tmp/offscreen-dev-runtime';

function refusal(id, detail) {
  const error = new Error(detail);
  error.code = id;
  return error;
}

export function deriveSlotCookiePrefix(slotId) {
  const names = deriveDevSqlTenant(slotId);
  if (!COOKIE_PREFIX.test(names.slotId))
    throw refusal('cookie-prefix', names.slotId);
  return names.slotId;
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
  if (!input?.schemaReady)
    throw refusal('stale-schema', `${sql.slotId} schema gate is closed`);
  if (!Number.isInteger(input.ports?.game) || input.ports.game < 1)
    throw refusal('ports', 'game port is missing');
  const namespace = sql.appNamespace;
  const imageFor = (role) => `offscreen-dev-workspace:${sql.slotId}-${role}`;
  const appSecret = `${sql.slotId}-app`;
  const dbSecret = sql.runtimeSecret;
  const origin = `http://${namespace}.svc.cluster.local`;
  const authority = `http://game-authority.${namespace}.svc.cluster.local:3002`;
  const api = `http://game-api.${namespace}.svc.cluster.local:3001`;
  const s3Endpoint = `http://object-store.${DEV_S3_NAMESPACE}.svc.cluster.local:8333`;
  const temporal = `temporal-frontend.offscreen-dev-temporal.svc.cluster.local:7233`;
  const temporalNamespace = namespace;

  const bindings = {
    slotId: sql.slotId,
    namespace,
    gamePort: input.ports.game,
    cookiePrefix: prefix,
    dbPoolMax: DEV_SQL_POOL_MAX,
    s3Bucket: s3.bucket,
    s3Endpoint,
    temporalAddress: temporal,
    temporalNamespace,
    dbSecret,
    appSecret,
    s3Secret: s3.secret,
    receiptDir: DEV_POD_RUNTIME_RECEIPT_DIR,
    images: {
      web: imageFor('web'),
      api: imageFor('api'),
      authority: imageFor('authority'),
      worker: imageFor('worker'),
    },
    schemaReady: true,
    authorityOrigin: authority,
    apiOrigin: api,
  };

  const documents = renderWorkloadDocuments({
    profile: 'development',
    section: 'all',
    bindings,
  });
  assertRenderedGraph(documents, sql.slotId);
  return {
    slotId: sql.slotId,
    namespace,
    images: bindings.images,
    cookiePrefix: prefix,
    appSecret,
    dbSecret,
    s3Secret: s3.secret,
    origin,
    documents,
  };
}

export function assertRenderedGraph(documents, slotId) {
  const namespace = deriveDevNamespace(slotId);
  const text = JSON.stringify(documents);
  for (const legacy of LEGACY_NAMESPACES) {
    if (text.includes(legacy)) throw refusal('legacy-namespace', legacy);
  }
  if (
    text.includes('TEMPORAL_NAMESPACE":"default"') ||
    text.includes('"value":"default"')
  ) {
    throw refusal('temporal-default', slotId);
  }
  for (const forbidden of [
    deriveDevSqlTenant(slotId).migrationSecret,
    ...FORBIDDEN_SECRET_NAMES,
    'admin',
  ]) {
    if (text.includes(`"name":"${forbidden}"`))
      throw refusal('admin-leak', forbidden);
  }
  const names = documents
    .filter((item) => item.kind === 'Deployment')
    .map((item) => item.metadata.name);
  if (names.join() !== WORKLOADS.join())
    throw refusal('workloads', names.join());
  const services = documents
    .filter((item) => item.kind === 'Service')
    .map((item) => item.metadata.name);
  if (services.join() !== SERVICES.join())
    throw refusal('services', services.join());
  for (const item of documents) {
    if (item.metadata.namespace && item.metadata.namespace !== namespace)
      throw refusal('foreign-namespace', item.metadata.name);
    if (
      item.kind === 'Deployment' &&
      !String(item.spec.template.spec.containers[0].image).startsWith(
        `offscreen-dev-workspace:${slotId}-`,
      )
    ) {
      throw refusal('image', item.metadata.name);
    }
  }
  return true;
}

const CLUSTER_METADATA = [
  'resourceVersion',
  'uid',
  'managedFields',
  'status',
  'generation',
];

/**
 * Declarative Deployments for a slot Tilt session. Read-only: no tenants, secrets, or kubectl.
 * @param {NodeJS.ProcessEnv} [env]
 */
export function renderTiltDeploymentDocuments(env = process.env) {
  const slotId = env.OFFSCREEN_DEV_SLOT?.trim() ?? '';
  const namespace = env.OFFSCREEN_DEV_NAMESPACE?.trim() ?? '';
  const gamePort = Number(env.OFFSCREEN_DEV_GAME_PORT);
  if (!slotId.startsWith('dev-'))
    throw refusal('slot', 'OFFSCREEN_DEV_SLOT must name a dev slot');
  if (!namespace)
    throw refusal('namespace', 'OFFSCREEN_DEV_NAMESPACE is required');
  const expected = deriveDevNamespace(slotId);
  if (namespace !== expected)
    throw refusal('namespace-mismatch', `${namespace} is not ${expected}`);
  if (!Number.isInteger(gamePort) || gamePort < 1)
    throw refusal('ports', 'OFFSCREEN_DEV_GAME_PORT is required');
  const graph = renderDevSlotAppGraph(slotId, {
    schemaReady: true,
    ports: { game: gamePort },
  });
  if (graph.namespace !== namespace)
    throw refusal('namespace-mismatch', graph.namespace);
  return graph.documents.filter((item) => item.kind === 'Deployment');
}

export function renderTiltDeploymentYaml(env = process.env) {
  const documents = renderTiltDeploymentDocuments(env);
  const text = JSON.stringify(documents);
  for (const field of CLUSTER_METADATA) {
    if (text.includes(`"${field}"`)) throw refusal('cluster-metadata', field);
  }
  return renderWorkloadYaml(documents);
}

/**
 * Cold start may create missing Deployments once. Names already present stay
 * with Tilt; this pass does not rewrite their Pod templates.
 * @param {Array<{ kind?: string, metadata?: { name?: string } }>} documents
 * @param {string[]} existingDeploymentNames
 */
export function selectColdStartDocuments(
  documents,
  existingDeploymentNames = [],
) {
  const existing = new Set(existingDeploymentNames);
  return documents.filter((document) => {
    if (document.kind === 'Namespace') return false;
    if (document.kind === 'Deployment') {
      return !existing.has(document.metadata?.name ?? '');
    }
    return true;
  });
}

/**
 * @param {{ items?: Array<{ kind?: string, metadata?: { name?: string, labels?: Record<string, string> } }> }} inventory
 * @param {string} slotId
 */
export function validateOwnedSlotInventory(inventory, slotId) {
  const items = inventory?.items;
  if (!Array.isArray(items)) {
    return {
      ok: false,
      id: 'workload-inventory',
      detail: 'owned workload inventory read malformed',
    };
  }
  for (const item of items) {
    const name = item.metadata?.name ?? '';
    const kind = item.kind ?? '';
    const labels = item.metadata?.labels ?? {};
    if (kind === 'Deployment') {
      if (!WORKLOADS.includes(name)) {
        return {
          ok: false,
          id: 'workload-inventory',
          detail: `unexpected workload ${name}`,
        };
      }
      if (
        labels['offscreen.dev/slot'] !== slotId ||
        labels['offscreen.dev/owner'] !== 'offscreen-dev'
      ) {
        return {
          ok: false,
          id: 'workload-inventory',
          detail: `managed-name collision ${name}`,
        };
      }
      continue;
    }
    if (kind === 'Service') {
      if (!SERVICES.includes(name)) {
        return {
          ok: false,
          id: 'workload-inventory',
          detail: `unexpected service ${name}`,
        };
      }
      if (
        labels['offscreen.dev/slot'] !== slotId ||
        labels['offscreen.dev/owner'] !== 'offscreen-dev'
      ) {
        return {
          ok: false,
          id: 'workload-inventory',
          detail: `managed-name collision ${name}`,
        };
      }
    }
  }
  return { ok: true };
}

/**
 * @param {Array<{ kind?: string, metadata?: { name?: string }, spec?: { ports?: unknown[] } }>} documents
 * @param {Array<{ kind?: string, metadata?: { name?: string }, spec?: { ports?: unknown[] } }>} clusterItems
 */
export function preserveOwnedServicePorts(documents, clusterItems) {
  const live = new Map(
    clusterItems
      .filter((item) => item.kind === 'Service' && item.metadata?.name)
      .map((item) => [item.metadata.name, item]),
  );
  return documents
    .filter((document) => document.kind === 'Service')
    .map((document) => {
      const name = document.metadata?.name ?? '';
      const observed = live.get(name);
      if (!observed?.spec?.ports) return document;
      return {
        ...document,
        spec: { ...document.spec, ports: observed.spec.ports },
      };
    });
}

export function assertSlotOwnership(record, observed) {
  const sql = deriveDevSqlTenant(record?.slotId);
  if (
    !record ||
    record.namespace !== sql.appNamespace ||
    record.cluster !== DEV_CLUSTER_NAME
  ) {
    throw refusal('owner-binding', 'owner-binding failed for this slot');
  }
  if (observed?.context !== DEV_CLUSTER_NAME)
    throw refusal('context', `wrong context ${observed?.context ?? 'missing'}`);
  if (observed?.namespace !== sql.appNamespace)
    throw refusal(
      'foreign-namespace',
      `foreign-namespace ${observed?.namespace ?? 'missing'}`,
    );
  for (const name of observed.workloads ?? []) {
    if (!WORKLOADS.includes(name)) throw refusal('unexpected-workload', name);
  }
  for (const [name, uid] of Object.entries(record.resourceUids ?? {})) {
    if (observed.secretUids?.[name] && observed.secretUids[name] !== uid)
      throw refusal('secret-uid', `secret-uid mismatch ${name}`);
  }
  if (observed.secrets?.includes(sql.migrationSecret))
    throw refusal('admin-leak', `admin-leak ${sql.migrationSecret}`);
  if (!observed.schemaReady)
    throw refusal('stale-schema', `stale-schema ${sql.slotId}`);
  if (observed.cookiePrefix !== sql.slotId)
    throw refusal(
      'cookie-prefix',
      `cookie-prefix ${observed.cookiePrefix ?? 'missing'}`,
    );
  return { namespace: sql.appNamespace, postgresNamespace: DEV_CNPG_NAMESPACE };
}

if (process.argv.includes('--tilt-deployments')) {
  process.stdout.write(renderTiltDeploymentYaml());
}
