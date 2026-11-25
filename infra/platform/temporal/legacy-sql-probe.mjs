import { TEMPORAL_SQL_SCHEMA_VERSION_QUERY } from './schema-policy.mjs';

/** Authenticated reachability probe against the postgres database. */
export const TEMPORAL_AUTHENTICATED_SQL_QUERY = 'SELECT 1';

const SCHEMA_STORES = ['temporal', 'temporal_visibility'];

/**
 * @typedef {'authenticated' | 'schema'} LegacySqlPhase
 */

/**
 * @typedef {object} SqlExecResult
 * @property {boolean} ok
 * @property {string} [stdout]
 */

/**
 * @typedef {(input: { database: string, query: string }) => SqlExecResult} LegacySqlExec
 */

/**
 * Minimal legacy SQL existence check (not version compatibility).
 * @param {LegacySqlExec | null | undefined} exec
 * @param {LegacySqlPhase} phase
 * @returns {{ ok: boolean, refusals: { id: string, detail: string }[] }}
 */
export function probeLegacyTemporalSql(exec, phase) {
  /** @type {{ id: string, detail: string }[]} */
  const refusals = [];

  if (typeof exec !== 'function') {
    return {
      ok: false,
      refusals: [
        {
          id: 'sql-exec-missing',
          detail: 'SQL exec callback is missing',
        },
      ],
    };
  }

  if (phase === 'authenticated') {
    return probeAuthenticated(exec, refusals);
  }

  if (phase === 'schema') {
    return probeSchemaStores(exec, refusals);
  }

  return {
    ok: false,
    refusals: [
      {
        id: 'sql-phase-invalid',
        detail: 'legacy SQL probe phase is not supported',
      },
    ],
  };
}

/**
 * @param {LegacySqlExec} exec
 * @param {{ id: string, detail: string }[]} refusals
 */
function probeAuthenticated(exec, refusals) {
  let result;
  try {
    result = exec({
      database: 'postgres',
      query: TEMPORAL_AUTHENTICATED_SQL_QUERY,
    });
  } catch {
    return {
      ok: false,
      refusals: [
        {
          id: 'sql-exec-threw',
          detail: 'authenticated SQL probe threw',
        },
      ],
    };
  }
  if (!result || result.ok !== true) {
    return {
      ok: false,
      refusals: [
        {
          id: 'sql-exec-failed',
          detail: 'authenticated SQL probe failed',
        },
      ],
    };
  }
  if (String(result.stdout ?? '').trim() !== '1') {
    return {
      ok: false,
      refusals: [
        {
          id: 'sql-output-wrong',
          detail: 'postgres did not return exact SELECT 1',
        },
      ],
    };
  }
  return { ok: true, refusals };
}

/**
 * @param {LegacySqlExec} exec
 * @param {{ id: string, detail: string }[]} refusals
 */
function probeSchemaStores(exec, refusals) {
  for (const database of SCHEMA_STORES) {
    let result;
    try {
      result = exec({
        database,
        query: TEMPORAL_SQL_SCHEMA_VERSION_QUERY,
      });
    } catch {
      return {
        ok: false,
        refusals: [
          {
            id: 'sql-exec-threw',
            detail: 'schema SQL probe threw',
          },
        ],
      };
    }
    if (!result || result.ok !== true) {
      return {
        ok: false,
        refusals: [
          {
            id: 'sql-exec-failed',
            detail: `schema SQL probe failed for ${database}`,
          },
        ],
      };
    }
    if (String(result.stdout ?? '').trim() !== 't') {
      return {
        ok: false,
        refusals: [
          {
            id: 'schema-version-missing',
            detail: `schema_version is not present in ${database}`,
          },
        ],
      };
    }
  }
  return { ok: true, refusals };
}
