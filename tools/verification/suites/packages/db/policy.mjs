/** @typedef {{ host: string, port: number, database: string, user: string, password: string }} RuntimeConnectFacts */

export const DEFAULT_SUBJECT_POOL_ENV = Object.freeze({
  DB_POOL_MAX: '5',
  DB_CONNECT_TIMEOUT_MS: '5000',
  DB_STATEMENT_TIMEOUT_MS: '10000',
  DB_IDLE_TRANSACTION_TIMEOUT_MS: '10000',
  DB_MANAGED_QUEUE_MAX: '20',
  DB_MANAGED_ACQUIRE_TIMEOUT_MS: '5000',
});

/**
 * Build an explicit env map for readDatabaseConfig; never reads ambient process.env.
 *
 * @param {RuntimeConnectFacts} connect
 * @param {Record<string, string>} [overrides]
 */
export function buildDatabaseSubjectEnv(connect, overrides = {}) {
  const user = encodeURIComponent(connect.user);
  const password = encodeURIComponent(connect.password);
  const database = connect.database.replace(/^\//, '');
  const { VERIFY_APPLICATION_NAME, ...poolOverrides } = overrides;
  let databaseUrl = `postgresql://${user}:${password}@${connect.host}:${connect.port}/${database}`;
  if (VERIFY_APPLICATION_NAME) {
    const url = new URL(databaseUrl);
    url.searchParams.set('application_name', VERIFY_APPLICATION_NAME);
    databaseUrl = url.toString();
  }
  return Object.freeze({
    ...DEFAULT_SUBJECT_POOL_ENV,
    DATABASE_URL: databaseUrl,
    ...(VERIFY_APPLICATION_NAME
      ? { VERIFY_APPLICATION_NAME: String(VERIFY_APPLICATION_NAME) }
      : {}),
    ...poolOverrides,
  });
}

/** Default probe shape when legacy execute is not exercised. */
export const LEGACY_DIRECT_EXECUTE_PROBE = Object.freeze({
  id: 'legacy-direct-db-execute',
  status: 'NOT-RUN',
  reason: 'probe-not-invoked',
  reasonCode: 'no-legacy-surface',
});

/**
 * @param {string} scenarioId
 */
export function dbScenarioOwnership(scenarioId) {
  if (scenarioId === 'DB-S01' || scenarioId === 'DB-S02') {
    return 'source';
  }
  if (
    scenarioId === 'DB-A01' ||
    scenarioId === 'DB-A02' ||
    scenarioId === 'DB-A03' ||
    scenarioId === 'DB-A04' ||
    scenarioId === 'DB-P01' ||
    scenarioId === 'DB-R01' ||
    scenarioId === 'DB-P02' ||
    scenarioId === 'DB-P03' ||
    scenarioId === 'DB-P04'
  ) {
    return 'admission';
  }
  return null;
}