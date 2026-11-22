import { deriveDevSqlTenant } from './dev-sql-tenant-contract.mjs';
import { DEV_TEMPORAL_CONTEXT, DEV_TEMPORAL_NAMESPACE, DEV_TEMPORAL_OWNER, DEV_TEMPORAL_SERVER_IMAGE } from './dev-temporal-bootstrap.mjs';

const LIVE_TOKEN = 'kind-offscreen-dev-temporal-tenant-live';
export const DEV_TEMPORAL_RETENTION_SECONDS = 24 * 60 * 60;

function stopped(id, detail) {
  return { ok: false, mutated: false, refusals: [{ id, detail }] };
}

export function deriveDevTemporalTenant(slotId) {
  const names = deriveDevSqlTenant(slotId);
  return {
    slotId: names.slotId,
    temporalNamespace: names.appNamespace,
    kubernetesNamespace: DEV_TEMPORAL_NAMESPACE,
    address: 'temporal-server:7233',
    retentionSeconds: DEV_TEMPORAL_RETENTION_SECONDS,
    taskQueues: ['storyteller-execute-v1', 'control'],
  };
}

export async function ensureDevTemporalTenant({ slotId, authorizeLive, adapter }) {
  if (authorizeLive !== LIVE_TOKEN) return stopped('ensure-not-authorized', 'live Temporal namespace ensure remains held');
  const host = adapter.identity();
  if (host.context !== DEV_TEMPORAL_CONTEXT || host.namespace !== DEV_TEMPORAL_NAMESPACE || host.owner !== DEV_TEMPORAL_OWNER) {
    return stopped('wrong-binding', 'Temporal tenants bind to kind-offscreen-dev/offscreen-dev-temporal');
  }
  if (host.image !== DEV_TEMPORAL_SERVER_IMAGE) return stopped('unexpected-image', host.image ?? 'missing');
  const names = deriveDevTemporalTenant(slotId);
  if (names.temporalNamespace === 'default') return stopped('reserved-namespace', 'default');
  const existing = await adapter.describe(names.temporalNamespace);
  if (existing && existing.retentionSeconds !== names.retentionSeconds) {
    return stopped('retention-conflict', String(existing.retentionSeconds));
  }
  if (!existing) await adapter.create(names);
  const after = await adapter.describe(names.temporalNamespace);
  if (!after || after.id == null) return stopped('namespace-not-ready', names.temporalNamespace);
  return { ok: true, mutated: !existing, refusals: [], namespace: names.temporalNamespace, id: after.id };
}
