/**
 * Read-only verification that shared dev platform cores are ready before slot SQL.
 * Does not run platform ensure; slot startup assumes cores were installed separately.
 */

import { spawnSync } from 'node:child_process';
import { observeDevObjectStoreReady } from '../../../../infra/platform/object-storage/readiness.mjs';
import { observeDevPostgresReady } from '../../../../infra/platform/postgres/readiness.mjs';
import { observeTemporalReady } from '../../../../infra/platform/temporal/readiness.mjs';

/**
 * @param {string} command
 * @param {string[]} args
 * @returns {{ status: number | null, stdout?: string, stderr?: string }}
 */
function defaultRun(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    timeout: 30_000,
  });
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

/**
 * @param {(command: string, args: string[]) => { status: number | null, stdout?: string, stderr?: string }} run
 */
function adaptRunForPlatform(run) {
  return (command, args, options = {}) => {
    const timeoutMs = options.timeoutMs ?? 30_000;
    const result = run(command, args);
    const timedOut =
      typeof result === 'object' &&
      result !== null &&
      'timedOut' in result &&
      result.timedOut === true;
    return {
      ok: !timedOut && result.status === 0,
      status: result.status,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      timedOut,
      missing: false,
      timeoutMs,
    };
  };
}

/**
 * @param {(command: string, args: string[]) => { status: number | null, stdout?: string, stderr?: string }} run
 */
export function sampleCnpgReady(run) {
  return observeDevPostgresReady({ run: adaptRunForPlatform(run) });
}

/**
 * @param {(command: string, args: string[]) => { status: number | null, stdout?: string, stderr?: string }} run
 */
export function sampleObjectStoreReady(run) {
  return observeDevObjectStoreReady({ run: adaptRunForPlatform(run) });
}

/**
 * @param {(command: string, args: string[]) => { status: number | null, stdout?: string, stderr?: string }} run
 */
export function sampleTemporalReady(run) {
  return observeDevTemporalReady({ run: adaptRunForPlatform(run) });
}

/**
 * @param {{
 *   run?: (command: string, args: string[]) => { status: number | null, stdout?: string, stderr?: string },
 *   verifyCnpg?: () => { ok: boolean, detail?: string },
 *   verifyObjectStore?: () => { ok: boolean, detail?: string },
 *   verifyTemporal?: () => { ok: boolean, detail?: string },
 * }} [deps]
 */
export async function verifySharedCoreReadiness(deps = {}) {
  const run = deps.run ?? defaultRun;
  const cnpg = deps.verifyCnpg?.() ?? sampleCnpgReady(run);
  if (!cnpg.ok) {
    return cnpg;
  }
  const objectStore = deps.verifyObjectStore?.() ?? sampleObjectStoreReady(run);
  if (!objectStore.ok) {
    return objectStore;
  }
  const temporal = deps.verifyTemporal?.() ?? sampleTemporalReady(run);
  return temporal;
}
