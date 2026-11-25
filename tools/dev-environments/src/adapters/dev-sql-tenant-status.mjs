import { spawnSync } from 'node:child_process';
import { DEV_CNPG_CONTEXT, DEV_CNPG_NAMESPACE } from '../../../../infra/platform/postgres/config.mjs';

export function runSqlTenantReadOnly(command, args, timeoutMs = 15000) {
  const result = spawnSync(command, args, { encoding: 'utf8', timeout: timeoutMs });
  return { ok: !result.error && result.status === 0, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function classify(resource) {
  if (!resource) return 'absent';
  if (resource.owner === 'offscreen-dev' && resource.uid) return 'owned';
  return 'foreign';
}

export function collectDevSqlTenantInventory(deps = {}) {
  const run = deps.run ?? runSqlTenantReadOnly;
  const current = run('kubectl', ['config', 'current-context']);
  const listed = run('kubectl', ['--context', DEV_CNPG_CONTEXT, '-n', DEV_CNPG_NAMESPACE, 'get', 'database.postgresql.cnpg.io,databaserole.postgresql.cnpg.io,secret', '-l', 'offscreen.dev/slot', '-o', 'json']);
  const body = parseJson(listed.stdout);
  const resources = (body?.items ?? []).map((item) => ({
    kind: item.kind,
    name: item.metadata?.name,
    owner: item.metadata?.labels?.['offscreen.dev/owner'] ?? null,
    slot: item.metadata?.labels?.['offscreen.dev/slot'] ?? null,
    uid: item.metadata?.uid ?? null,
    secretType: item.kind === 'Secret' ? item.type ?? null : null,
  }));
  return {
    context: DEV_CNPG_CONTEXT,
    currentContext: current.ok ? current.stdout.trim() : null,
    namespace: DEV_CNPG_NAMESPACE,
    sqlCatalog: 'not-authorized',
    resources,
  };
}

export function statusDevSqlTenants(probe) {
  const refusals = [];
  if (probe.context !== DEV_CNPG_CONTEXT) refusals.push({ id: 'wrong-context', detail: probe.context ?? 'unset' });
  for (const resource of probe.resources ?? []) {
    if (classify(resource) === 'foreign') refusals.push({ id: 'foreign-resource', detail: resource.name });
    if (resource.kind === 'Secret' && resource.secretType && resource.secretType !== 'kubernetes.io/basic-auth') {
      refusals.push({ id: 'secret-type', detail: resource.name });
    }
  }
  return { mode: 'status', readOnly: true, sqlCatalog: probe.sqlCatalog ?? 'not-authorized', refusals, resources: probe.resources ?? [] };
}

export function planDevSqlTenants(probe) {
  return { ...statusDevSqlTenants(probe), mode: 'plan', actions: [] };
}
