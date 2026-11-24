import {
  assertPlatformTarget,
  readPlatformObject,
  runPlatformCommand,
  PLATFORM_COMMAND_TIMEOUT_MS,
} from '../common/commands.mjs';
import { readPlatformProfile } from '../common/profile.mjs';
import {
  DEV_TEMPORAL_NAMESPACE,
  DEV_TEMPORAL_OWNER,
  DEV_TEMPORAL_SCHEMA_JOB,
  temporalReadinessMet,
} from './dev-bootstrap.mjs';
import {
  TEMPORAL_SQL_DATABASES_QUERY,
  TEMPORAL_SQL_SCHEMA_VERSION_QUERY,
  anyDatabaseExists,
  bothDatabasesExist,
  bothSchemaTablesNonempty,
} from './schema-policy.mjs';

const devProfile = readPlatformProfile('dev');
const OWNER_LABEL = `${devProfile.ownerLabel}/owner`;
const POSTGRES_DEPLOY = 'temporal-postgres';
const SERVER_DEPLOY = 'temporal-server';
const SQL_PROBE_TIMEOUT_MS = 30_000;

/**
 * @param {string} stdout
 * @returns {{ temporal: boolean, temporal_visibility: boolean }}
 */
function parseDatabaseNames(stdout) {
  const names = new Set(
    String(stdout ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
  );
  return {
    temporal: names.has('temporal'),
    temporal_visibility: names.has('temporal_visibility'),
  };
}

/**
 * @param {string} stdout
 */
function parseSchemaVersionExists(stdout) {
  const trimmed = String(stdout ?? '')
    .trim()
    .toLowerCase();
  return trimmed === 't' || trimmed === 'true' || trimmed === '1';
}

/**
 * @param {typeof runPlatformCommand} run
 * @param {string} database
 * @param {string} query
 */
function execTemporalPostgresSql(run, database, query) {
  return run(
    'kubectl',
    [
      '--context',
      devProfile.contextName,
      '-n',
      DEV_TEMPORAL_NAMESPACE,
      'exec',
      `deploy/${POSTGRES_DEPLOY}`,
      '--',
      'bash',
      '-lc',
      `psql -h 127.0.0.1 -U temporal -d ${database} -Atqc ${JSON.stringify(query)}`,
    ],
    { timeoutMs: SQL_PROBE_TIMEOUT_MS },
  );
}

/**
 * @param {typeof runPlatformCommand} run
 * @returns {import('./schema-policy.mjs').SqlObservation | { state: 'unreadable', reason: string }}
 */
function collectLegacySqlEvidence(run) {
  const databases = execTemporalPostgresSql(
    run,
    'postgres',
    TEMPORAL_SQL_DATABASES_QUERY,
  );
  if (!databases.ok) {
    return { state: 'unreadable', reason: 'database inventory probe failed' };
  }
  const temporalSchema = execTemporalPostgresSql(
    run,
    'temporal',
    TEMPORAL_SQL_SCHEMA_VERSION_QUERY,
  );
  const visibilitySchema = execTemporalPostgresSql(
    run,
    'temporal_visibility',
    TEMPORAL_SQL_SCHEMA_VERSION_QUERY,
  );
  if (!temporalSchema.ok || !visibilitySchema.ok) {
    return { state: 'unreadable', reason: 'schema_version probe failed' };
  }
  return {
    state: 'readable',
    databases: parseDatabaseNames(databases.stdout),
    schemaTables: {
      temporal: parseSchemaVersionExists(temporalSchema.stdout),
      temporal_visibility: parseSchemaVersionExists(visibilitySchema.stdout),
    },
  };
}

/**
 * @param {import('./schema-policy.mjs').SqlObservation | { state: 'unreadable' }} sql
 * @returns {{ ok: true } | { ok: false, detail: string }}
 */
function legacySchemaReadyFromSql(sql) {
  if (sql.state !== 'readable') {
    return {
      ok: false,
      detail: 'legacy schema verification is unreadable without a schema Job',
    };
  }
  const anyDb = anyDatabaseExists(sql);
  const bothDb = bothDatabasesExist(sql);
  const tablesOk = bothSchemaTablesNonempty(sql);
  if (anyDb === true && bothDb !== true) {
    return {
      ok: false,
      detail:
        'only one Temporal database exists while the schema Job is absent',
    };
  }
  if (bothDb === true && tablesOk !== true) {
    return {
      ok: false,
      detail: 'Temporal databases exist but schema_version is missing or empty',
    };
  }
  if (bothDb === true && tablesOk === true) {
    return { ok: true };
  }
  return {
    ok: false,
    detail:
      'shared Temporal schema Job is absent and legacy schema is not verified',
  };
}

/**
 * @param {typeof runPlatformCommand} run
 * @returns {{ postgresReady: string, schemaSucceeded: string, schemaFailed: string, serverReady: string, jobAbsent: boolean, legacySchemaReady: boolean }}
 */
function sampleTemporalReadiness(run) {
  const readStatus = (resource, name) => {
    const observation = readPlatformObject(
      {
        profileId: 'dev',
        resource,
        name,
        namespace: DEV_TEMPORAL_NAMESPACE,
      },
      { run },
    );
    return observation;
  };

  const postgresObs = readStatus('deployment', POSTGRES_DEPLOY);
  const serverObs = readStatus('deployment', SERVER_DEPLOY);
  const jobObs = readStatus('job', DEV_TEMPORAL_SCHEMA_JOB);

  /** @type {string} */
  let postgresReady;
  if (postgresObs.state === 'present') {
    const owner = postgresObs.object?.metadata?.labels?.[OWNER_LABEL];
    if (owner !== DEV_TEMPORAL_OWNER) {
      return {
        refuse: {
          ok: false,
          detail: 'shared Temporal postgres has foreign ownership',
        },
      };
    }
    postgresReady = String(postgresObs.object?.status?.availableReplicas ?? '');
  } else if (postgresObs.state === 'unreadable') {
    return {
      refuse: {
        ok: false,
        detail: `shared Temporal postgres is unreadable: ${postgresObs.reason}`,
      },
    };
  } else {
    return {
      refuse: {
        ok: false,
        detail: 'shared Temporal postgres Deployment is absent',
      },
    };
  }

  /** @type {string} */
  let serverReady;
  if (serverObs.state === 'present') {
    const owner = serverObs.object?.metadata?.labels?.[OWNER_LABEL];
    if (owner !== DEV_TEMPORAL_OWNER) {
      return {
        refuse: {
          ok: false,
          detail: 'shared Temporal server has foreign ownership',
        },
      };
    }
    serverReady = String(serverObs.object?.status?.availableReplicas ?? '');
  } else if (serverObs.state === 'unreadable') {
    return {
      refuse: {
        ok: false,
        detail: `shared Temporal server is unreadable: ${serverObs.reason}`,
      },
    };
  } else {
    return {
      refuse: {
        ok: false,
        detail: 'shared Temporal server Deployment is absent',
      },
    };
  }

  let schemaSucceeded = '';
  let schemaFailed = '';
  let jobAbsent = false;
  let legacySchemaReady = false;

  if (jobObs.state === 'unreadable') {
    return {
      refuse: {
        ok: false,
        detail: `shared Temporal schema Job is unreadable: ${jobObs.reason}`,
      },
    };
  }
  if (jobObs.state === 'absent') {
    jobAbsent = true;
    const sql = collectLegacySqlEvidence(run);
    const legacy = legacySchemaReadyFromSql(sql);
    if (!legacy.ok) {
      return { refuse: { ok: false, detail: legacy.detail } };
    }
    legacySchemaReady = true;
  } else {
    const owner = jobObs.object?.metadata?.labels?.[OWNER_LABEL];
    if (owner !== DEV_TEMPORAL_OWNER) {
      return {
        refuse: {
          ok: false,
          detail: 'shared Temporal schema Job has foreign ownership',
        },
      };
    }
    schemaSucceeded = String(jobObs.object?.status?.succeeded ?? '');
    schemaFailed = String(jobObs.object?.status?.failed ?? '');
  }

  return {
    postgresReady,
    schemaSucceeded,
    schemaFailed,
    serverReady,
    jobAbsent,
    legacySchemaReady,
  };
}

/**
 * Read-only observation that shared dev Temporal postgres, schema, and server are ready.
 * @param {{ run?: typeof runPlatformCommand }} [deps]
 * @returns {{ ok: boolean, detail?: string }}
 */
export function observeDevTemporalReady(deps = {}) {
  const run = deps.run ?? runPlatformCommand;

  try {
    assertPlatformTarget('dev', { run });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, detail: message };
  }

  const sample = sampleTemporalReadiness(run);
  if ('refuse' in sample) {
    return sample.refuse;
  }

  if (Number(sample.schemaFailed) > 0) {
    return { ok: false, detail: 'shared Temporal schema Job failed' };
  }

  if (
    !temporalReadinessMet({
      postgresReady: sample.postgresReady,
      schemaSucceeded: sample.schemaSucceeded,
      schemaFailed: sample.schemaFailed,
      serverReady: sample.serverReady,
      jobAbsent: sample.jobAbsent,
      legacySchemaReady: sample.legacySchemaReady,
    })
  ) {
    return {
      ok: false,
      detail: 'shared Temporal schema or server is not ready',
    };
  }

  return { ok: true };
}

export const DEV_TEMPORAL_COMMAND_TIMEOUT_MS = PLATFORM_COMMAND_TIMEOUT_MS;
export const DEV_TEMPORAL_SQL_PROBE_TIMEOUT_MS = SQL_PROBE_TIMEOUT_MS;
