/**
 * Create-once Temporal schema bootstrap policy.
 * Pure decision logic: injected observations only, no kubectl.
 */

/** @typedef {'absent' | 'present' | 'unreadable'} PlatformReadState */

/**
 * @typedef {object} PlatformResourceObservation
 * @property {PlatformReadState} state
 * @property {string} [reason]
 * @property {boolean} [foreign]
 * @property {string | null} [owner]
 * @property {string} [uid]
 * @property {'Complete' | 'Failed' | 'Pending' | 'Unknown'} [condition]
 * @property {boolean} [ready]
 * @property {number} [failedPods]
 */

/**
 * @typedef {object} SqlObservation
 * @property {'readable' | 'unreadable'} state
 * @property {string} [reason]
 * @property {{ temporal: boolean, temporal_visibility: boolean }} [databases]
 * @property {{ temporal: boolean, temporal_visibility: boolean }} [schemaTables]
 */

/**
 * @typedef {object} ServerHealthObservation
 * @property {'healthy' | 'unhealthy' | 'unreadable' | 'absent'} state
 * @property {string} [reason]
 * @property {'release-serving' | 'dev-readiness'} [mode]
 */

/**
 * @typedef {object} TemporalBootstrapInput
 * @property {PlatformResourceObservation} [namespace]
 * @property {PlatformResourceObservation} secret
 * @property {PlatformResourceObservation} pvc
 * @property {PlatformResourceObservation} postgres
 * @property {PlatformResourceObservation} server
 * @property {PlatformResourceObservation} schemaJob
 * @property {SqlObservation} [sql]
 * @property {ServerHealthObservation} [serverHealth]
 * @property {'dev' | 'release'} [profileId]
 * @property {string} [ownerValue]
 * @property {boolean} [verifiedExistingSchema]
 * @property {boolean} [secretCreateConflict]
 */

/**
 * @typedef {object} TemporalBootstrapDecision
 * @property {boolean} ok
 * @property {boolean} [reobserve]
 * @property {{ id: string, detail: string }[]} refusals
 * @property {object[]} actions
 */

/** Fixed SQL probes executed via the postgres pod (PGPASSWORD from pod env). */
export const TEMPORAL_SQL_DATABASES_QUERY =
  "SELECT datname FROM pg_database WHERE datname IN ('temporal','temporal_visibility');";
export const TEMPORAL_SQL_SCHEMA_VERSION_QUERY =
  'SELECT EXISTS(SELECT 1 FROM public.schema_version);';

const PERSISTED_WITHOUT_SECRET = ['pvc', 'postgres', 'server', 'schemaJob'];
const SCHEMA_OPS = new Set([
  'create-schema-job',
  'wait-schema-job',
  'verify-schema-tables',
  'reuse-schema-job',
  'reuse-existing-schema',
]);

/**
 * @param {PlatformResourceObservation | undefined} observation
 * @param {string} [ownerValue]
 * @returns {'absent' | 'owned' | 'foreign' | 'unreadable'}
 */
export function classifyTemporalResource(observation, ownerValue) {
  if (!observation || observation.state === 'absent') return 'absent';
  if (observation.state === 'unreadable') return 'unreadable';
  if (observation.state !== 'present') return 'unreadable';
  if (observation.foreign === true) return 'foreign';
  if (
    ownerValue &&
    observation.owner != null &&
    observation.owner !== ownerValue
  ) {
    return 'foreign';
  }
  if (observation.foreign === false) return 'owned';
  if (observation.owner != null && observation.owner === ownerValue) {
    return 'owned';
  }
  if (observation.uid) return 'owned';
  return 'foreign';
}

/**
 * @param {SqlObservation | undefined} sql
 * @returns {boolean | null}
 */
function bothDatabasesExist(sql) {
  if (!sql || sql.state !== 'readable' || !sql.databases) return null;
  return (
    sql.databases.temporal === true &&
    sql.databases.temporal_visibility === true
  );
}

/**
 * @param {SqlObservation | undefined} sql
 * @returns {boolean | null}
 */
function anyDatabaseExists(sql) {
  if (!sql || sql.state !== 'readable' || !sql.databases) return null;
  return (
    sql.databases.temporal === true ||
    sql.databases.temporal_visibility === true
  );
}

/**
 * @param {SqlObservation | undefined} sql
 * @returns {boolean | null}
 */
function bothSchemaTablesNonempty(sql) {
  if (!sql || sql.state !== 'readable' || !sql.schemaTables) return null;
  return (
    sql.schemaTables.temporal === true &&
    sql.schemaTables.temporal_visibility === true
  );
}

/**
 * @param {string} name
 * @param {'absent' | 'owned' | 'foreign' | 'unreadable'} classification
 * @param {{ id: string, detail: string }[]} refusals
 */
function pushResourceRefusal(name, classification, refusals) {
  if (classification === 'unreadable') {
    refusals.push({
      id: `resource-unreadable-${name}`,
      detail: `${name} observation is unreadable`,
    });
    return true;
  }
  if (classification === 'foreign') {
    refusals.push({
      id: `foreign-${name}`,
      detail: `${name} exists without platform ownership`,
    });
    return true;
  }
  return false;
}

/**
 * @param {object[]} actions
 * @returns {boolean}
 */
function serverBeforeSchema(actions) {
  const serverIndex = actions.findIndex((item) => item.op === 'apply-server');
  if (serverIndex < 0) return false;
  const schemaIndex = actions.findIndex((item) => SCHEMA_OPS.has(item.op));
  const verifyIndex = actions.findIndex(
    (item) => item.op === 'verify-schema-tables',
  );
  const lastSchema = Math.max(schemaIndex, verifyIndex);
  if (lastSchema < 0) return true;
  return serverIndex < lastSchema;
}

/**
 * @param {TemporalBootstrapInput} input
 * @returns {TemporalBootstrapDecision}
 */
export function decideTemporalBootstrap(input) {
  /** @type {{ id: string, detail: string }[]} */
  const refusals = [];
  const ownerValue = input.ownerValue;

  /** @type {Record<string, 'absent' | 'owned' | 'foreign' | 'unreadable'>} */
  const kind = {
    namespace: classifyTemporalResource(input.namespace, ownerValue),
    secret: classifyTemporalResource(input.secret, ownerValue),
    pvc: classifyTemporalResource(input.pvc, ownerValue),
    postgres: classifyTemporalResource(input.postgres, ownerValue),
    server: classifyTemporalResource(input.server, ownerValue),
    schemaJob: classifyTemporalResource(input.schemaJob, ownerValue),
  };

  for (const name of Object.keys(kind)) {
    if (pushResourceRefusal(name, kind[name], refusals)) {
      return { ok: false, refusals, actions: [] };
    }
  }

  if (input.secretCreateConflict === true) {
    return {
      ok: false,
      reobserve: true,
      refusals: [
        {
          id: 'secret-create-conflict',
          detail: 'kubectl create secret conflicted; reobserve before retrying',
        },
      ],
      actions: [],
    };
  }

  const secretOwned = kind.secret === 'owned';
  if (
    !secretOwned &&
    PERSISTED_WITHOUT_SECRET.some((key) => kind[key] === 'owned')
  ) {
    return {
      ok: false,
      refusals: [
        {
          id: 'missing-secret-persisted',
          detail:
            'PVC, postgres, server, or schema Job exists without the database Secret',
        },
      ],
      actions: [],
    };
  }

  const jobCondition =
    kind.schemaJob === 'owned'
      ? (input.schemaJob.condition ?? 'Unknown')
      : null;

  if (kind.schemaJob === 'owned' && jobCondition === 'Failed') {
    return {
      ok: false,
      refusals: [
        {
          id: 'schema-job-failed',
          detail:
            'the existing schema Job failed and will not be deleted or replaced',
        },
      ],
      actions: [],
    };
  }

  if (kind.schemaJob === 'owned' && jobCondition === 'Unknown') {
    return {
      ok: false,
      refusals: [
        {
          id: 'schema-job-unknown',
          detail:
            'the schema Job has no terminal Complete, Failed, or Pending condition',
        },
      ],
      actions: [],
    };
  }

  const sql = input.sql;
  const databasesExist = bothDatabasesExist(sql);
  const anyDb = anyDatabaseExists(sql);
  const schemaTablesOk = bothSchemaTablesNonempty(sql);
  const jobAbsent = kind.schemaJob === 'absent';

  if (
    jobAbsent &&
    sql?.state === 'readable' &&
    anyDb === true &&
    databasesExist !== true
  ) {
    return {
      ok: false,
      refusals: [
        {
          id: 'partial-schema-databases',
          detail:
            'only one Temporal database exists while the schema Job is absent; no automatic repair',
        },
      ],
      actions: [],
    };
  }

  if (
    jobAbsent &&
    sql?.state === 'readable' &&
    databasesExist === true &&
    schemaTablesOk !== true
  ) {
    return {
      ok: false,
      refusals: [
        {
          id: 'partial-schema-tables',
          detail:
            'Temporal databases exist but schema_version is missing or empty; no adoption without a Job',
        },
      ],
      actions: [],
    };
  }

  const legacyExpiredReuse =
    jobAbsent &&
    databasesExist === true &&
    schemaTablesOk === true &&
    kind.server === 'owned';

  if (legacyExpiredReuse) {
    const health = input.serverHealth?.state ?? 'absent';
    if (health === 'unreadable') {
      return {
        ok: false,
        refusals: [
          {
            id: 'server-health-unreadable',
            detail: 'pinned server health could not be verified',
          },
        ],
        actions: [],
      };
    }
    if (health !== 'healthy') {
      return {
        ok: false,
        refusals: [
          {
            id: 'server-unhealthy',
            detail:
              'legacy schema reuse requires a healthy pinned server (release SERVING or dev readiness with SQL)',
          },
        ],
        actions: [],
      };
    }
  }

  if (
    jobAbsent &&
    sql?.state === 'readable' &&
    databasesExist === true &&
    schemaTablesOk === true &&
    kind.server === 'absent'
  ) {
    return {
      ok: false,
      refusals: [
        {
          id: 'legacy-missing-server',
          detail:
            'expired schema Job with existing databases requires a present pinned server for reuse',
        },
      ],
      actions: [],
    };
  }

  if (
    kind.server === 'owned' &&
    kind.schemaJob === 'absent' &&
    !legacyExpiredReuse &&
    !input.verifiedExistingSchema &&
    databasesExist !== true
  ) {
    return {
      ok: false,
      refusals: [
        {
          id: 'server-before-schema',
          detail: 'server is present before schema bootstrap succeeded',
        },
      ],
      actions: [],
    };
  }

  const needsSqlForDecision =
    legacyExpiredReuse ||
    (kind.schemaJob === 'owned' && jobCondition === 'Complete') ||
    (kind.schemaJob === 'owned' && jobCondition === 'Pending') ||
    (kind.postgres === 'owned' && jobAbsent && kind.server === 'absent');
  if (sql?.state === 'unreadable' && needsSqlForDecision) {
    return {
      ok: false,
      refusals: [
        {
          id: 'sql-unreadable',
          detail:
            'authenticated SQL checks are required but the database probe is unreadable',
        },
      ],
      actions: [],
    };
  }

  /** @type {object[]} */
  const actions = [];

  if (kind.namespace === 'absent') {
    actions.push({ op: 'ensure-namespace' });
  }

  if (secretOwned) {
    actions.push({ op: 'reuse-secret' });
  } else if (
    kind.secret === 'absent' &&
    !PERSISTED_WITHOUT_SECRET.some((key) => kind[key] === 'owned')
  ) {
    actions.push({
      op: 'create-secret',
      via: 'kubectl-create-stdin',
      allowConflictReobserve: true,
    });
  }

  const needPostgresApply = kind.pvc === 'absent' || kind.postgres === 'absent';
  if (needPostgresApply) {
    actions.push({ op: 'apply-postgres' });
  }

  if (needPostgresApply || kind.postgres === 'owned') {
    actions.push({ op: 'wait-postgres-ready' });
    actions.push({ op: 'wait-authenticated-sql' });
  }

  /** @type {'pending' | 'complete' | 'create' | 'legacy' | 'none'} */
  let schemaPath = 'none';

  if (kind.schemaJob === 'owned' && jobCondition === 'Pending') {
    schemaPath = 'pending';
    actions.push({
      op: 'wait-schema-job',
      uid: input.schemaJob.uid,
    });
  } else if (kind.schemaJob === 'owned' && jobCondition === 'Complete') {
    schemaPath = 'complete';
    actions.push({ op: 'reuse-schema-job', uid: input.schemaJob.uid });
    actions.push({ op: 'verify-schema-tables' });
    if (
      sql?.state === 'readable' &&
      schemaTablesOk !== true &&
      input.verifiedExistingSchema !== true
    ) {
      return {
        ok: false,
        refusals: [
          {
            id: 'schema-tables-unverified',
            detail:
              'completed schema Job requires both schema_version tables to be verified',
          },
        ],
        actions,
      };
    }
  } else if (legacyExpiredReuse) {
    schemaPath = 'legacy';
    actions.push({ op: 'verify-schema-tables', source: 'legacy-sql' });
    actions.push({ op: 'reuse-existing-schema' });
  } else if (jobAbsent && kind.server === 'absent') {
    const mayCreateSchema =
      input.verifiedExistingSchema === true ||
      sql?.state !== 'readable' ||
      anyDb !== true;
    if (mayCreateSchema) {
      schemaPath = 'create';
      actions.push({ op: 'create-schema-job' });
      actions.push({ op: 'wait-schema-job' });
      actions.push({ op: 'verify-schema-tables' });
    }
  }

  const schemaReadyForServer =
    schemaPath === 'legacy' ||
    schemaPath === 'create' ||
    (schemaPath === 'complete' &&
      (input.verifiedExistingSchema === true ||
        schemaTablesOk === true ||
        sql?.state !== 'readable')) ||
    input.verifiedExistingSchema === true;

  if (schemaPath === 'pending') {
    return { ok: true, refusals, actions };
  }

  if (schemaReadyForServer && kind.server === 'absent') {
    actions.push({ op: 'apply-server' });
  } else if (schemaReadyForServer && kind.server === 'owned') {
    actions.push({ op: 'reuse-server' });
  }

  if (serverBeforeSchema(actions)) {
    return {
      ok: false,
      refusals: [
        {
          id: 'server-before-schema',
          detail: 'server apply is not allowed before schema success',
        },
      ],
      actions,
    };
  }

  return { ok: true, refusals, actions };
}
