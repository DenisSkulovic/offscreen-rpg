import process from 'node:process';

import { acquireCustody, readPending } from './custody.mjs';
import { readPlatformProfile } from '../common/profile.mjs';
import { captureIdentity, recheckIdentity } from './identity.mjs';
import { loadObservabilityVariants } from './artifacts.mjs';
import { classifyInventory } from './readiness.mjs';
import { openForwards, probeForwardTransport } from './forward.mjs';

const PUBLIC_KEYS = ['developerHttp', 'developerGrpc', 'grafana'];
const QUERY_KEYS = ['prometheus', 'loki', 'tempo'];

/**
 * @param {string[]} argv
 */
export function parseConnectArgs(argv) {
  if (argv.length === 0) {
    return { queries: false };
  }
  if (argv.length === 1 && argv[0] === '--queries') {
    return { queries: true };
  }
  const error = new Error('refused: observability connect arguments are invalid');
  error.reasonCode = 'invalid-args';
  error.exitCode = 2;
  throw error;
}

/**
 * @param {{
 *   argv?: string[],
 *   signal?: AbortSignal,
 *   readPlatformProfile?: typeof readPlatformProfile,
 *   acquireCustody?: typeof acquireCustody,
 *   captureIdentity?: typeof captureIdentity,
 *   recheckIdentity?: typeof recheckIdentity,
 *   loadObservabilityVariants?: typeof loadObservabilityVariants,
 *   classifyInventory?: typeof classifyInventory,
 *   readPending?: typeof readPending,
 *   collectInventory?: (identity: object) => Promise<object>,
 *   openForwards?: typeof openForwards,
 *   probeForwardTransport?: typeof probeForwardTransport,
 *   readGrafanaAdmin?: (identity: object, expectedSecretUid: string) => Promise<{ user: string, password: string }>,
 *   now?: () => number,
 *   intervalMs?: number,
 * }} [deps]
 */
export async function runObservabilityConnect(deps = {}) {
  let args;
  try {
    args = parseConnectArgs(deps.argv ?? []);
  } catch (error) {
    return { ok: false, reasonCode: error.reasonCode ?? 'invalid-args', ports: null, cleanup: null, exitCode: 2 };
  }
  const profile = (deps.readPlatformProfile ?? readPlatformProfile)('dev');
  const acquire = deps.acquireCustody ?? acquireCustody;
  const held = await acquire(profile.contextName, { mode: 'shared', signal: deps.signal });
  let identity;
  try {
    identity = (deps.captureIdentity ?? captureIdentity)('dev', profile.contextName, deps);
    const variants = (deps.loadObservabilityVariants ?? loadObservabilityVariants)('dev', deps);
    const snapshot = await (deps.collectInventory ?? (async () => ({ pending: false })))(identity);
    const classified = (deps.classifyInventory ?? classifyInventory)(snapshot, variants.desired, {
      predecessorArtifacts: variants.predecessor ?? null,
    });
    if (classified.reasonCode !== 'ready' || classified.pending === true || classified.state !== 'ready') {
      await held.close?.();
      return {
        ok: false,
        reasonCode: classified.reasonCode ?? 'not-ready',
        ports: null,
        cleanup: null,
        exitCode: 1,
      };
    }
    const checked = (deps.recheckIdentity ?? recheckIdentity)(identity, deps);
    if (!checked.ok) {
      await held.close?.();
      return { ok: false, reasonCode: 'identity', ports: null, cleanup: null, exitCode: 1 };
    }
    const bindings = [...PUBLIC_KEYS, ...(args.queries ? QUERY_KEYS : [])].map((key) => ({ key }));
    const opened = await (deps.openForwards ?? openForwards)(identity, { ...held, mode: 'shared', pending: false }, {
      bindings,
      signal: deps.signal,
      now: deps.now,
    });
    let grafanaAuth = null;
    if (opened.ports.grafana != null && deps.readGrafanaAdmin) {
      grafanaAuth = await deps.readGrafanaAdmin(identity, snapshot.grafanaAdminUid);
    }
    const transport = await (deps.probeForwardTransport ?? probeForwardTransport)(opened.ports, {
      signal: deps.signal,
      now: deps.now,
      grafanaAuth,
    });
    if (!transport.ok) {
      const cleanup = await opened.close();
      await held.close?.();
      return { ok: false, reasonCode: transport.reasonCode, ports: opened.ports, cleanup, exitCode: 1 };
    }
    return {
      ok: true,
      reasonCode: 'connected',
      ports: opened.ports,
      cleanup: opened.close,
      exitCode: 0,
      held,
      identity,
      failure: opened.failure,
    };
  } catch (error) {
    await held.close?.();
    return {
      ok: false,
      reasonCode: error.reasonCode ?? 'connect',
      ports: null,
      cleanup: null,
      exitCode: error.exitCode ?? 1,
    };
  }
}

/**
 * @param {string[]} argv
 * @param {{ signal?: AbortSignal }} [deps]
 */
export async function main(argv = process.argv.slice(2), deps = {}) {
  const result = await runObservabilityConnect({ ...deps, argv });
  if (result.ok && result.ports) {
    for (const [key, port] of Object.entries(result.ports)) {
      process.stdout.write(`${key} 127.0.0.1:${port}\n`);
    }
  }
  return result.exitCode ?? (result.ok ? 0 : 1);
}
