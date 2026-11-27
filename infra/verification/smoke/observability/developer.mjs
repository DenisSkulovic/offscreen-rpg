import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { openForwards, startOwnedChild } from '../../../platform/observability/forward.mjs';

const MODULE_ROOT = dirname(fileURLToPath(import.meta.url));
export const DEVELOPER_PROBE_PATH = join(MODULE_ROOT, 'developer-probe.py');

export const DEVELOPER_BINDINGS = Object.freeze([
  { key: 'developerHttp' },
  { key: 'diagnosticHttp', localPort: 0 },
  { key: 'prometheus' },
  { key: 'loki' },
  { key: 'tempo' },
]);

/**
 * @param {{ developerHttp: number, diagnosticHttp: number, prometheus: number, loki: number, tempo: number }} ports
 * @param {string} stateDirectory
 * @param {number} budgetMs
 */
export function developerProbeArgs(ports, stateDirectory, budgetMs) {
  const pairs = [
    ['--developer-http-port', ports.developerHttp],
    ['--diagnostic-http-port', ports.diagnosticHttp],
    ['--prometheus-port', ports.prometheus],
    ['--loki-port', ports.loki],
    ['--tempo-port', ports.tempo],
    ['--state-directory', stateDirectory],
    ['--budget-ms', budgetMs],
  ];
  const args = [DEVELOPER_PROBE_PATH];
  for (const [flag, value] of pairs) {
    if (value == null || value === '') {
      return { ok: false, reasonCode: 'developer-args' };
    }
    args.push(flag, String(value));
  }
  return { ok: true, args };
}

/**
 * @param {object} session
 * @param {{ openForwards?: typeof openForwards, startOwnedChild?: typeof startOwnedChild }} [deps]
 */
export async function runDeveloperProof(session, deps = {}) {
  const platformFd = session.custody?.fd;
  const proofFd = session.proofCustody?.fd;
  const stateDirectory = session.proofCustody?.lockDirectory;
  if (!Number.isInteger(platformFd) || !Number.isInteger(proofFd) || !stateDirectory) {
    return { ok: false, reasonCode: 'wrong-lock', cleanup: false };
  }
  const open = deps.openForwards ?? openForwards;
  const start = deps.startOwnedChild ?? startOwnedChild;
  let forwards = null;
  try {
    forwards = await open(
      session.identity,
      { fd: platformFd, mode: 'proof' },
      {
        bindings: DEVELOPER_BINDINGS.map((binding) => ({ ...binding })),
        deadline: session.clock.now() + Math.min(90_000, session.remainingWorkMs()),
        now: session.clock.now,
      },
    );
  } catch {
    return { ok: false, reasonCode: 'forward-failed', cleanup: false };
  }
  try {
    const argv = developerProbeArgs(
      forwards.ports,
      stateDirectory,
      Math.min(600_000, session.remainingWorkMs()),
    );
    if (!argv.ok) {
      return { ok: false, reasonCode: argv.reasonCode, cleanup: true };
    }
    const child = start('/usr/bin/python3', argv.args, {
      fds: [platformFd, proofFd],
      deadline: session.clock.now() + Math.min(600_000, session.remainingWorkMs()),
      now: () => session.clock.now(),
    });
    const outcome = await child.outcome;
    if (!outcome.ok) {
      return { ok: false, reasonCode: 'developer-child-failed', cleanup: true };
    }
    let parsed;
    try {
      parsed = JSON.parse(outcome.stdout);
    } catch {
      return { ok: false, reasonCode: 'malformed-result', cleanup: true };
    }
    if (!parsed || parsed.ok !== true) {
      return {
        ok: false,
        reasonCode: parsed?.reasonCode ?? 'developer-failed',
        cleanup: true,
      };
    }
    return {
      ok: true,
      reasonCode: null,
      cleanup: true,
      identities: parsed.identities ?? null,
    };
  } finally {
    await forwards.close?.();
  }
}
