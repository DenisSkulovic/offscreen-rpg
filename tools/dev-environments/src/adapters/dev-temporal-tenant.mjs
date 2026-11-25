import { deriveDevSqlTenant } from '../rendering/dev-sql-tenant-contract.mjs';
import { readPlatformProfile } from '../../../../infra/platform/common/profile.mjs';

const profile = readPlatformProfile('dev');
const DEV_TEMPORAL_CONTEXT = profile.contextName;
const DEV_TEMPORAL_NAMESPACE = profile.namespaces.temporal;
const DEV_TEMPORAL_OWNER = profile.ownerValue;

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
    address: 'temporal-frontend:7233',
    retentionSeconds: DEV_TEMPORAL_RETENTION_SECONDS,
    taskQueues: ['storyteller-execute-v1', 'control'],
  };
}

export { parseTemporalDescribe } from '../../../../infra/platform/temporal/namespaces.mjs';

function describeOutcome(value) {
  if (!value) return { status: 'absent' };
  if (value.status) return value;
  if (value.failure) return { status: value.failure, detail: value.detail ?? value.failure };
  if (value.id == null) return { status: 'malformed-output', detail: 'namespace id missing' };
  return { status: 'ready', id: value.id, retentionSeconds: value.retentionSeconds };
}

export async function ensureDevTemporalTenant({ slotId, authorizeLive, adapter }) {
  if (authorizeLive !== LIVE_TOKEN) return stopped('ensure-not-authorized', 'live Temporal namespace ensure remains held');
  const host = adapter.identity();
  if (host.context !== DEV_TEMPORAL_CONTEXT || host.namespace !== DEV_TEMPORAL_NAMESPACE || host.owner !== DEV_TEMPORAL_OWNER) {
    return stopped('wrong-binding', 'Temporal tenants bind to kind-offscreen-dev/offscreen-dev-temporal');
  }
  if (host.ready !== true) return stopped('platform-not-ready', 'owned Temporal release is not ready');
  const names = deriveDevTemporalTenant(slotId);
  if (names.temporalNamespace === 'default') return stopped('reserved-namespace', 'default');
  const existing = describeOutcome(await adapter.describe(names.temporalNamespace));
  if (existing.status === 'command-failed' || existing.status === 'malformed-output') {
    return stopped(existing.status, existing.detail ?? existing.status);
  }
  if (existing.status === 'ready' && existing.retentionSeconds !== names.retentionSeconds) {
    return stopped('retention-conflict', String(existing.retentionSeconds));
  }
  let mutated = false;
  if (existing.status === 'absent') {
    try {
      await adapter.create(names);
    } catch {
      return stopped('create-failed', 'temporal namespace create failed');
    }
    mutated = true;
  }
  let ready = existing.status === 'ready' ? existing : null;
  for (let attempt = 0; attempt < 5 && !ready; attempt += 1) {
    if (attempt > 0) await adapter.wait?.(attempt);
    const seen = describeOutcome(await adapter.describe(names.temporalNamespace));
    if (seen.status === 'ready') ready = seen;
    else if (seen.status === 'command-failed' || seen.status === 'malformed-output') {
      return stopped(seen.status, seen.detail ?? seen.status);
    }
  }
  if (!ready) return stopped(mutated ? 'namespace-not-visible' : 'namespace-not-ready', 'describe returned no namespace id');
  if (ready.retentionSeconds !== names.retentionSeconds) return stopped('retention-conflict', String(ready.retentionSeconds));
  return { ok: true, mutated, refusals: [], namespace: names.temporalNamespace, id: ready.id };
}
