import { performance } from 'node:perf_hooks';
import { assertPlatformTarget, runPlatformCommand, PLATFORM_COMMAND_TIMEOUT_MS } from '../common/commands.mjs';
import { observeWritablePrimary } from './bootstrap/observation.mjs';

export const DEV_POSTGRES_READINESS_POLL_MS = 5000;
export const DEV_POSTGRES_READINESS_TIMEOUT_MS = 480000;
export const DEV_POSTGRES_SQL_PROBE_TIMEOUT_MS = 30000;
export const DEV_POSTGRES_COMMAND_TIMEOUT_MS = PLATFORM_COMMAND_TIMEOUT_MS;

/** Narrow slot-startup readiness contract; no full operator inventory scan. */
export function observeDevPostgresReady({ run = runPlatformCommand } = {}) {
  try {
    assertPlatformTarget('dev', { run });
    const result = observeWritablePrimary('dev', { run });
    return result.ok ? { ok: true, primaryPod: result.primaryPod } : result;
  } catch {
    return { ok: false, detail: 'shared CNPG target or primary observation unavailable' };
  }
}

export function waitForDevPostgresReadiness(deps = {}) {
  const now = deps.now ?? (() => performance.now());
  const sleep = deps.sleep ?? (ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms));
  const deadline = now() + (deps.readinessTimeoutMs ?? DEV_POSTGRES_READINESS_TIMEOUT_MS);
  const execute = deps.run ?? runPlatformCommand;
  const run = (command, args, options = {}) => {
    const remaining = Math.floor(deadline - now());
    if (remaining < 1) return { ok: false, timedOut: true, stdout: '', stderr: '' };
    return execute(command, args, { ...options, timeoutMs: Math.min(remaining, options.timeoutMs ?? PLATFORM_COMMAND_TIMEOUT_MS) });
  };
  let last = { ok: false, detail: 'shared CNPG readiness deadline exhausted' };
  while (now() < deadline) {
    last = observeDevPostgresReady({ run });
    if (last.ok && now() < deadline) return last;
    const remaining = deadline - now();
    if (remaining <= 0) break;
    sleep(Math.min(remaining, DEV_POSTGRES_READINESS_POLL_MS));
  }
  return last.ok ? { ok: false, detail: 'shared CNPG readiness deadline exhausted' } : last;
}
