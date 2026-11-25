import { readPlatformProfile } from '../common/profile.mjs';
import { runPlatformCommand } from '../common/commands.mjs';

const NAME = /^[a-z][a-z0-9-]{0,62}$/;

function assertName(name) {
  if (typeof name !== 'string' || !NAME.test(name)) {
    throw new Error('invalid Temporal namespace name');
  }
}

function namespaceCommand(profileId, args, run) {
  const profile = readPlatformProfile(profileId);
  return run('kubectl', [
    '--context', profile.contextName, '-n', profile.namespaces.temporal,
    'exec', 'deploy/temporal-admintools', '--',
    'temporal', 'operator', 'namespace', ...args,
    '--address', 'temporal-frontend:7233',
  ], { timeoutMs: 30_000 });
}

/** Parse the JSON response only; a generic Kubernetes "not found" is not absence. */
export function parseTemporalDescribe(text, status, name) {
  if (name !== undefined) assertName(name);
  const body = String(text ?? '');
  if (status !== 0) {
    const missing = name
      ? new RegExp(`namespace\\s+["']?${name}["']?\\s+(?:is\\s+)?(?:not found|does not exist)`, 'i')
      : /namespace\s+[^\n]+\s+(?:is\s+)?(?:not found|does not exist)/i;
    if (/\bNamespaceNotFound\b/.test(body) || missing.test(body)) {
      return { status: 'absent' };
    }
    return { status: 'command-failed', detail: 'Temporal namespace describe failed' };
  }
  try {
    const value = JSON.parse(body);
    const info = value.namespaceInfo ?? value.NamespaceInfo;
    const config = value.config ?? value.Config;
    const id = info?.id ?? info?.Id;
    const actualName = info?.name ?? info?.Name;
    const raw = config?.workflowExecutionRetentionTtl ?? config?.WorkflowExecutionRetentionTtl;
    const retentionSeconds = typeof raw === 'number' ? raw :
      typeof raw === 'string' && /^\d+s$/.test(raw) ? Number(raw.slice(0, -1)) :
      raw === '24h0m0s' ? 86400 : 0;
    if (typeof id !== 'string' || !id ||
        (name !== undefined && actualName !== name) ||
        !Number.isSafeInteger(retentionSeconds) || retentionSeconds <= 0) {
      throw new Error('incomplete namespace response');
    }
    return { status: 'ready', id, retentionSeconds };
  } catch {
    return { status: 'malformed-output', detail: 'Temporal namespace describe returned invalid JSON or identity' };
  }
}

/** Read-only namespace observation through the owned admin deployment. */
export function describeTemporalNamespace(profileId, name, { run = runPlatformCommand } = {}) {
  assertName(name);
  const result = namespaceCommand(profileId, ['describe', '--namespace', name, '--output', 'json'], run);
  if (result.timedOut || result.missing || result.status == null) {
    return { status: 'command-failed', detail: 'Temporal namespace describe transport failed' };
  }
  return parseTemporalDescribe(result.ok ? result.stdout : result.stderr, result.ok ? 0 : result.status, name);
}

/**
 * Register once after the environment owner has verified readiness and absence.
 * Namespace registration is not part of ordinary read-only platform observation.
 */
export function createTemporalNamespace(profileId, name, retentionDays, { run = runPlatformCommand } = {}) {
  assertName(name);
  if (!Number.isSafeInteger(retentionDays) || retentionDays < 1 || retentionDays > 30) {
    throw new Error('invalid Temporal namespace retention');
  }
  const result = namespaceCommand(profileId, [
    'create', '--namespace', name, '--retention', `${retentionDays}d`,
  ], run);
  if (!result.ok) {
    const alreadyExists = new RegExp(`namespace\\s+["']?${name}["']?\\s+already exists`, 'i');
    if (result.timedOut || result.missing ||
        !(/\bNamespaceAlreadyExists\b/.test(result.stderr ?? '') || alreadyExists.test(result.stderr ?? ''))) {
      throw new Error('Temporal namespace create failed');
    }
  }
}
