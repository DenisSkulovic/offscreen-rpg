/**
 * Read-only verification that shared dev platform cores are ready before slot SQL.
 * Does not run platform ensure; slot startup assumes cores were installed separately.
 */

import { spawnSync } from 'node:child_process';
import {
  DEV_S3_CONTEXT,
  DEV_S3_NAMESPACE,
  DEV_S3_PVC,
  objectStoreReadinessMet,
} from '../../../../infra/platform/object-storage/dev-bootstrap.mjs';
import {
  DEV_CNPG_CLUSTER,
  DEV_CNPG_CONTEXT,
  DEV_CNPG_NAMESPACE,
} from '../../../../infra/platform/postgres/dev-bootstrap.mjs';
import {
  DEV_TEMPORAL_CONTEXT,
  DEV_TEMPORAL_NAMESPACE,
  DEV_TEMPORAL_SCHEMA_JOB,
} from '../../../../infra/platform/temporal/dev-bootstrap.mjs';

/**
 * @param {string} command
 * @param {string[]} args
 * @returns {{ status: number | null, stdout?: string, stderr?: string }}
 */
function defaultRun(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8', timeout: 30_000 });
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

/**
 * @param {(command: string, args: string[]) => { status: number | null, stdout?: string, stderr?: string }} run
 */
export function sampleCnpgReady(run) {
  const ready = run('kubectl', [
    '--context',
    DEV_CNPG_CONTEXT,
    '-n',
    DEV_CNPG_NAMESPACE,
    'get',
    'cluster.postgresql.cnpg.io',
    DEV_CNPG_CLUSTER,
    '-o',
    'jsonpath={.status.conditions[?(@.type=="Ready")].status}',
  ]);
  if (ready.status !== 0) {
    return { ok: false, detail: 'shared CNPG cluster status is unreadable' };
  }
  if ((ready.stdout ?? '').trim() !== 'True') {
    return { ok: false, detail: 'shared CNPG cluster is not Ready' };
  }
  const sql = run('kubectl', [
    '--context',
    DEV_CNPG_CONTEXT,
    '-n',
    DEV_CNPG_NAMESPACE,
    'exec',
    `${DEV_CNPG_CLUSTER}-1`,
    '--',
    'psql',
    '-U',
    'postgres',
    '-d',
    'dev',
    '-tAc',
    'SELECT 1',
  ]);
  if (sql.status !== 0 || (sql.stdout ?? '').trim() !== '1') {
    return { ok: false, detail: 'shared CNPG did not answer authenticated SELECT 1' };
  }
  return { ok: true };
}

/**
 * @param {(command: string, args: string[]) => { status: number | null, stdout?: string, stderr?: string }} run
 */
export function sampleObjectStoreReady(run) {
  const pvcPhase =
    run('kubectl', [
      '--context',
      DEV_S3_CONTEXT,
      '-n',
      DEV_S3_NAMESPACE,
      'get',
      'pvc',
      DEV_S3_PVC,
      '-o',
      'jsonpath={.status.phase}',
    ]).stdout?.trim() ?? '';
  const availableReplicas =
    run('kubectl', [
      '--context',
      DEV_S3_CONTEXT,
      '-n',
      DEV_S3_NAMESPACE,
      'get',
      'deploy',
      'object-store',
      '-o',
      'jsonpath={.status.availableReplicas}',
    ]).stdout?.trim() ?? '';
  const s3Status =
    run('kubectl', [
      '--context',
      DEV_S3_CONTEXT,
      '-n',
      DEV_S3_NAMESPACE,
      'exec',
      'deploy/object-store',
      '--',
      'curl',
      '-s',
      '-o',
      '/dev/null',
      '-w',
      '%{http_code}',
      'http://127.0.0.1:8333/',
    ]).stdout?.trim() ?? '';
  if (!objectStoreReadinessMet({ pvcPhase, availableReplicas, s3Status })) {
    return {
      ok: false,
      detail: 'shared object store is not Bound, available, or HTTP-ready',
    };
  }
  return { ok: true };
}

/**
 * @param {(command: string, args: string[]) => { status: number | null, stdout?: string, stderr?: string }} run
 */
export function sampleTemporalReady(run) {
  const postgresReady =
    run('kubectl', [
      '--context',
      DEV_TEMPORAL_CONTEXT,
      '-n',
      DEV_TEMPORAL_NAMESPACE,
      'get',
      'deploy',
      'temporal-postgres',
      '-o',
      'jsonpath={.status.availableReplicas}',
    ]).stdout?.trim() ?? '';
  const schemaSucceeded =
    run('kubectl', [
      '--context',
      DEV_TEMPORAL_CONTEXT,
      '-n',
      DEV_TEMPORAL_NAMESPACE,
      'get',
      'job',
      DEV_TEMPORAL_SCHEMA_JOB,
      '-o',
      'jsonpath={.status.succeeded}',
    ]).stdout?.trim() ?? '';
  const schemaFailed =
    run('kubectl', [
      '--context',
      DEV_TEMPORAL_CONTEXT,
      '-n',
      DEV_TEMPORAL_NAMESPACE,
      'get',
      'job',
      DEV_TEMPORAL_SCHEMA_JOB,
      '-o',
      'jsonpath={.status.failed}',
    ]).stdout?.trim() ?? '';
  const serverReady =
    run('kubectl', [
      '--context',
      DEV_TEMPORAL_CONTEXT,
      '-n',
      DEV_TEMPORAL_NAMESPACE,
      'get',
      'deploy',
      'temporal-server',
      '-o',
      'jsonpath={.status.availableReplicas}',
    ]).stdout?.trim() ?? '';
  if (Number(schemaFailed) > 0) {
    return { ok: false, detail: 'shared Temporal schema Job failed' };
  }
  if (
    Number(postgresReady) < 1 ||
    schemaSucceeded !== '1' ||
    Number(serverReady) < 1
  ) {
    return {
      ok: false,
      detail: 'shared Temporal schema or server is not ready',
    };
  }
  return { ok: true };
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