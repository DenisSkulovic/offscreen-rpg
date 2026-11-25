import { performance } from 'node:perf_hooks';
import process from 'node:process';
import { setTimeout } from 'node:timers';

/**
 * @param {unknown} error
 */
export function admissionErrorCategory(error) {
  if (
    error &&
    typeof error === 'object' &&
    error.name === 'DatabaseAdmissionError' &&
    typeof error.category === 'string'
  ) {
    return error.category;
  }
  return null;
}

/**
 * @param {{ resolve: () => void, release: () => void, acquired: Promise<void>, hold: Promise<void> }} gate
 */
export function createHoldGate() {
  /** @type {() => void} */
  let signalAcquired;
  /** @type {() => void} */
  let releaseHold;
  const acquired = new Promise((resolve) => {
    signalAcquired = resolve;
  });
  const hold = new Promise((resolve) => {
    releaseHold = resolve;
  });
  return {
    acquired,
    hold,
    signalAcquired: () => signalAcquired(),
    release: () => releaseHold(),
  };
}

/**
 * @param {() => boolean} predicate
 * @param {{ timeoutMs?: number, intervalMs?: number }} [options]
 */
export async function waitUntil(predicate, options = {}) {
  const timeoutMs = options.timeoutMs ?? 10_000;
  const intervalMs = options.intervalMs ?? 5;
  const deadline = performance.now() + timeoutMs;
  while (performance.now() < deadline) {
    if (predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error('wait-until-timeout');
}

/**
 * Count active backends for a runtime role, excluding observer/admin sessions.
 *
 * @param {import('pg').Client} client
 * @param {{ database: string, role: string, applicationName?: string | null }} filter
 */
export async function countRuntimeBackendSessions(client, filter) {
  const params = [filter.database, filter.role];
  let sql = `SELECT count(*)::int AS count
             FROM pg_stat_activity
             WHERE datname = $1
               AND usename = $2
               AND pid <> pg_backend_pid()
               AND backend_type = 'client backend'`;
  if (filter.applicationName) {
    params.push(filter.applicationName);
    sql += ' AND application_name = $3';
  }
  const result = await client.query(sql, params);
  return Number(result.rows[0]?.count ?? 0);
}

/**
 * @param {number[]} samples
 */
export function assertMonotonicDurations(samples) {
  for (let index = 1; index < samples.length; index += 1) {
    if (samples[index] < samples[index - 1]) {
      return false;
    }
  }
  return true;
}

export const STAMPEDE_ENQUEUE_COUNT = 100;
export const STAMPEDE_ACCEPTED_AFTER_RELEASE = 25;
/** Programme target; steady saturated may be 75–80 depending on enqueue timing. */
export const STAMPEDE_SATURATED_TARGET = 75;
export const STAMPEDE_SATURATED_MIN = 75;
export const STAMPEDE_SATURATED_MAX = 80;
export const STAMPEDE_ACTIVE_EXPECTED = 5;
export const STAMPEDE_QUEUED_EXPECTED = 20;
export const STRESS_WAVE_COUNT = 10;
export const STRESS_OPS_PER_WAVE = 100;

export const MULTIPROCESS_CHILD_COUNT = 3;
export const MULTIPROCESS_POOL_MAX = 3;
export const MULTIPROCESS_QUEUE_MAX = 6;
export const MULTIPROCESS_OPS_PER_CHILD = 30;
export const MULTIPROCESS_REFUSALS_PER_CHILD = 21;
export const MULTIPROCESS_ACCEPTED_PER_CHILD = 3;
export const MULTIPROCESS_QUEUED_PER_CHILD = 6;
export const MULTIPROCESS_SESSION_PEAK_BUDGET = 9;
export const CONSTRAINED_PROFILE_MAX_CONNECTIONS = 20;
export const SCENARIO_BUDGET_TIMEOUT_MS = 120_000;

const PROVIDER_ENV_PREFIXES = [
  'OPENAI_',
  'ANTHROPIC_',
  'AWS_',
  'AZURE_',
  'GCP_',
  'GOOGLE_',
  'GITHUB_',
  'NPM_TOKEN',
  'HF_',
];

/**
 * @param {unknown} error
 */
export function postgresSqlState(error) {
  if (!error || typeof error !== 'object') {
    return null;
  }
  const code =
    /** @type {{ code?: string }} */ (error).code ??
    /** @type {{ cause?: { code?: string } }} */ (error).cause?.code;
  return typeof code === 'string' ? code : null;
}

/**
 * @param {unknown} error
 */
export function classifyAdmissionOrServerRefusal(error) {
  const admission = admissionErrorCategory(error);
  if (admission) {
    return {
      layer: 'admission',
      category: admission,
      sqlState: postgresSqlState(error),
    };
  }
  const sqlState = postgresSqlState(error);
  if (sqlState === '53300') {
    return { layer: 'server', category: 'too_many_connections', sqlState };
  }
  if (sqlState) {
    return { layer: 'server', category: 'postgres', sqlState };
  }
  return { layer: 'unknown', category: 'unclassified', sqlState: null };
}

/**
 * Build child env with only explicit database subject keys (no ambient secrets).
 *
 * @param {Record<string, string>} subjectEnv
 */
export function buildPrivateChildEnv(subjectEnv) {
  const allowed = new Set([
    'DATABASE_URL',
    'DB_POOL_MAX',
    'DB_CONNECT_TIMEOUT_MS',
    'DB_STATEMENT_TIMEOUT_MS',
    'DB_IDLE_TRANSACTION_TIMEOUT_MS',
    'DB_MANAGED_QUEUE_MAX',
    'DB_MANAGED_ACQUIRE_TIMEOUT_MS',
    'VERIFY_APPLICATION_NAME',
    'NODE_PATH',
    'NODE_OPTIONS',
    'VERIFY_CHILD_INDEX',
    'VERIFY_WORKER_MODE',
  ]);
  /** @type {Record<string, string>} */
  const childEnv = {
    NODE_ENV: 'production',
    VERIFY_WORKER_MODE: 'live',
  };
  for (const [key, value] of Object.entries(subjectEnv)) {
    if (allowed.has(key) && typeof value === 'string') {
      childEnv[key] = value;
    }
  }
  return childEnv;
}

/**
 * @param {NodeJS.ProcessEnv} [base]
 */
export function stripUnrelatedProviderEnv(base = process.env) {
  /** @type {Record<string, string>} */
  const env = {};
  for (const [key, value] of Object.entries(base)) {
    if (typeof value !== 'string') {
      continue;
    }
    if (
      key === 'DATABASE_URL' ||
      key.startsWith('DB_') ||
      key.startsWith('VERIFY_')
    ) {
      continue;
    }
    if (PROVIDER_ENV_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      continue;
    }
    if (/PASSWORD|SECRET|TOKEN|CREDENTIAL|API_KEY/i.test(key)) {
      continue;
    }
    env[key] = value;
  }
  return env;
}
