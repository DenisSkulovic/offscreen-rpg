import { randomUUID } from 'node:crypto';

import {
  SESSION_CHECK_SQL,
  TargetSessionError,
  createOpsClient,
  targetLabel,
  toTargetDisplay,
  verifySession,
  type ParsedTarget,
} from '../target.js';
import {
  ENROLLMENT_DDL_STATEMENTS,
  ENROLLMENT_SCHEMA_VERSION,
  SQL_INSERT_IDENTITY,
  SQL_NAMESPACE_ABSENT_CHECK,
  SQL_READ_MARKER,
  SQL_TRY_ADVISORY_XACT_LOCK,
} from './schema.js';

export class EnrollError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnrollError';
  }
}

export class EnrollOutcomeUnknownError extends EnrollError {
  constructor() {
    super(
      'enrollment commit outcome unknown; inspect target marker manually before retrying',
    );
    this.name = 'EnrollOutcomeUnknownError';
  }
}

export type EnrollMarker = Readonly<{
  targetId: string;
  schemaVersion: typeof ENROLLMENT_SCHEMA_VERSION;
}>;

export type EnrollResult = Readonly<{
  targetId: string;
  schemaVersion: typeof ENROLLMENT_SCHEMA_VERSION;
  label: string;
}>;

export interface EnrollQueryable {
  query(
    sql: string,
    values?: readonly unknown[],
  ): Promise<{ rows: Array<Record<string, unknown>> }>;
}

export interface EnrollClient extends EnrollQueryable {
  connect(): Promise<unknown>;
  end(): Promise<void>;
}

export type ExecuteEnrollOptions = Readonly<{
  randomUuid?: () => string;
}>;

function parseMarkerRow(row: Record<string, unknown>): EnrollMarker {
  const targetId = row.target_id;
  const schemaVersion = row.schema_version;
  if (typeof targetId !== 'string' || targetId.length === 0) {
    throw new EnrollError('enrollment marker has invalid target_id');
  }
  if (schemaVersion !== ENROLLMENT_SCHEMA_VERSION) {
    throw new EnrollError('enrollment marker has unexpected schema_version');
  }
  return Object.freeze({
    targetId,
    schemaVersion: ENROLLMENT_SCHEMA_VERSION,
  });
}

function rowAbsent(rows: Array<Record<string, unknown>>): boolean {
  const absent = rows[0]?.absent;
  return absent === true;
}

function lockAcquired(rows: Array<Record<string, unknown>>): boolean {
  return rows[0]?.acquired === true;
}

async function rollbackQuietly(client: EnrollQueryable): Promise<void> {
  try {
    await client.query('ROLLBACK');
  } catch {
    // Absorb rollback failures during failure paths.
  }
}

async function closeClient(client: EnrollClient): Promise<void> {
  try {
    await client.end();
  } catch {
    // Absorb close failures after reporting.
  }
}

export function redactEnrollError(error: unknown): string {
  if (error instanceof EnrollOutcomeUnknownError) {
    return 'enrollment outcome unknown; inspect target marker manually';
  }
  if (error instanceof EnrollError) {
    if (error.message.includes('confirm-target')) {
      return 'target confirmation does not match DB_OPS_URL';
    }
    if (error.message.includes('advisory lock')) {
      return 'enrollment advisory lock busy';
    }
    if (error.message.includes('already enrolled')) {
      return 'operational schema already present';
    }
    return 'database enrollment refused';
  }
  if (error instanceof TargetSessionError) {
    return 'database session verification failed';
  }
  return 'database enrollment failed';
}

export async function executeEnroll(
  target: ParsedTarget,
  confirmTarget: string,
  client: EnrollClient,
  options: ExecuteEnrollOptions = {},
): Promise<EnrollResult> {
  const label = targetLabel(toTargetDisplay(target));
  if (confirmTarget !== label) {
    throw new EnrollError(
      'confirm-target does not match DB_OPS_URL endpoint label',
    );
  }

  const randomUuid = options.randomUuid ?? randomUUID;
  let outcomeUnknown = false;

  try {
    await client.connect();
    await verifySession(client, target, { requirePrimary: true });

    await client.query('BEGIN');
    try {
      const lockResult = await client.query(SQL_TRY_ADVISORY_XACT_LOCK);
      if (!lockAcquired(lockResult.rows)) {
        await rollbackQuietly(client);
        throw new EnrollError('enrollment advisory lock busy; refused');
      }

      await verifySession(client, target, { requirePrimary: true });

      const namespaceResult = await client.query(SQL_NAMESPACE_ABSENT_CHECK);
      if (!rowAbsent(namespaceResult.rows)) {
        await rollbackQuietly(client);
        throw new EnrollError(
          'offscreen_ops namespace already enrolled; refused',
        );
      }

      for (const statement of ENROLLMENT_DDL_STATEMENTS) {
        await client.query(statement);
      }

      const targetId = randomUuid();
      await client.query(SQL_INSERT_IDENTITY, [targetId]);

      try {
        await client.query('COMMIT');
      } catch {
        outcomeUnknown = true;
        throw new EnrollOutcomeUnknownError();
      }
    } catch (error) {
      if (!(error instanceof EnrollOutcomeUnknownError)) {
        await rollbackQuietly(client);
      }
      throw error;
    }

    await client.query('BEGIN READ ONLY');
    try {
      const markerResult = await client.query(SQL_READ_MARKER);
      const row = markerResult.rows[0];
      if (row === undefined) {
        throw new EnrollError('enrollment marker missing after commit');
      }
      const marker = parseMarkerRow(row);
      return Object.freeze({
        targetId: marker.targetId,
        schemaVersion: marker.schemaVersion,
        label,
      });
    } finally {
      await rollbackQuietly(client);
    }
  } finally {
    await closeClient(client);
    if (outcomeUnknown) {
      // Caller must not replay enrollment automatically.
    }
  }
}

export async function enrollTarget(
  target: ParsedTarget,
  confirmTarget: string,
  options: ExecuteEnrollOptions = {},
): Promise<EnrollResult> {
  const client = createOpsClient(target);
  return executeEnroll(target, confirmTarget, client, options);
}

export { SESSION_CHECK_SQL };
