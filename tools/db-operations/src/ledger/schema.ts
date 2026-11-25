/** Shared with schema migrator: single-bigint advisory namespace. */
export const ENROLLMENT_ADVISORY_LOCK = 683291351;

export const OPS_SCHEMA = 'offscreen_ops';

export const SQL_TRY_ADVISORY_XACT_LOCK = `SELECT pg_try_advisory_xact_lock(${String(ENROLLMENT_ADVISORY_LOCK)}::bigint) AS acquired`;

/** Session-scoped lock for mutation execution (released on client end). */
export const SQL_TRY_ADVISORY_SESSION_LOCK = `SELECT pg_try_advisory_lock(${String(ENROLLMENT_ADVISORY_LOCK)}::bigint) AS acquired`;

export const SQL_NAMESPACE_ABSENT_CHECK = `SELECT to_regnamespace('${OPS_SCHEMA}') IS NULL AS absent`;

export const SQL_CREATE_OPS_SCHEMA = `CREATE SCHEMA ${OPS_SCHEMA}`;

export const SQL_CREATE_IDENTITY_TABLE = `CREATE TABLE ${OPS_SCHEMA}.identity(
  singleton boolean PRIMARY KEY CHECK (singleton),
  target_id uuid NOT NULL UNIQUE,
  schema_version integer NOT NULL CHECK (schema_version = 1)
)`;

export const SQL_INSERT_IDENTITY = `INSERT INTO ${OPS_SCHEMA}.identity (singleton, target_id, schema_version) VALUES (true, $1::uuid, 1)`;

export const SQL_CREATE_EXECUTION_TABLE = `CREATE TABLE ${OPS_SCHEMA}.execution(
  operation_key text PRIMARY KEY,
  artifact_sha text NOT NULL CHECK (artifact_sha ~ '^[0-9a-f]{40}$'),
  run_id uuid NOT NULL UNIQUE,
  actor text NOT NULL,
  state text NOT NULL CHECK (state IN ('running', 'paused', 'succeeded')),
  checkpoint bigint NOT NULL DEFAULT 0 CHECK (checkpoint >= 0),
  processed bigint NOT NULL DEFAULT 0 CHECK (processed >= 0),
  started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)`;

export const SQL_CREATE_EXECUTION_EVENT_TABLE = `CREATE TABLE ${OPS_SCHEMA}.execution_event(
  event_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES ${OPS_SCHEMA}.execution (run_id),
  event text NOT NULL CHECK (event IN ('started', 'batch', 'paused', 'succeeded')),
  checkpoint bigint NOT NULL CHECK (checkpoint >= 0),
  processed bigint NOT NULL CHECK (processed >= 0),
  recorded_at timestamptz NOT NULL DEFAULT now()
)`;

/** DDL applied only after namespace absence is confirmed (no IF NOT EXISTS). */
export const ENROLLMENT_DDL_STATEMENTS = Object.freeze([
  SQL_CREATE_OPS_SCHEMA,
  SQL_CREATE_IDENTITY_TABLE,
  SQL_CREATE_EXECUTION_TABLE,
  SQL_CREATE_EXECUTION_EVENT_TABLE,
] as const);

export const SQL_READ_MARKER = `SELECT target_id::text AS target_id, schema_version FROM ${OPS_SCHEMA}.identity WHERE singleton = true`;

export const ENROLLMENT_SCHEMA_VERSION = 1 as const;
