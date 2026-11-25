import {
  SESSION_CHECK_SQL,
  TargetSessionError,
  targetLabel,
  toTargetDisplay,
  verifySession,
  type ParsedTarget,
} from '../target.js';
import {
  LedgerOutcomeUnknownError,
  assertMarkerTargetId,
  readMarker,
  redactLedgerError,
  requireUuidSyntax,
  type LedgerQueryable,
  type OpsMarker,
} from '../ledger/repository.js';
import { SQL_TRY_ADVISORY_SESSION_LOCK } from '../ledger/schema.js';

export class SessionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionError';
  }
}

export class SessionOutcomeUnknownError extends SessionError {
  constructor() {
    super(
      'operation session commit outcome unknown; inspect ledger manually before retrying',
    );
    this.name = 'SessionOutcomeUnknownError';
  }
}

export type SessionQueryResult = Readonly<{
  rows: Array<Record<string, unknown>>;
  rowCount: number | null;
}>;

export interface SessionClient extends LedgerQueryable {
  connect(): Promise<void>;
  end(): Promise<void>;
}

export type MutationSessionRequest = Readonly<{
  targetId: string;
  confirmTarget: string;
}>;

export type ReadOnlySessionRequest = Readonly<{
  targetId: string;
}>;

export type SessionContext = Readonly<{
  marker: OpsMarker;
  runTransaction: <T>(
    fn: (queryable: LedgerQueryable) => Promise<T>,
  ) => Promise<T>;
  query: LedgerQueryable['query'];
}>;

function lockAcquired(rows: Array<Record<string, unknown>>): boolean {
  return rows[0]?.acquired === true;
}

async function rollbackQuietly(client: LedgerQueryable): Promise<void> {
  try {
    await client.query('ROLLBACK');
  } catch {
    // Absorb rollback failures during failure paths.
  }
}

async function closeClient(client: SessionClient): Promise<void> {
  try {
    await client.end();
  } catch {
    // Absorb close failures after reporting.
  }
}

export function redactSessionError(error: unknown): string {
  if (
    error instanceof SessionOutcomeUnknownError ||
    error instanceof LedgerOutcomeUnknownError
  ) {
    return 'operation commit outcome unknown; inspect ledger manually';
  }
  if (error instanceof SessionError) {
    if (error.message.includes('confirm-target')) {
      return 'target confirmation does not match DB_OPS_URL';
    }
    if (error.message.includes('advisory lock')) {
      return 'operation session advisory lock busy';
    }
    return 'operation session refused';
  }
  const ledger = redactLedgerError(error);
  if (ledger !== 'database operation ledger failed') {
    return ledger;
  }
  if (error instanceof TargetSessionError) {
    return 'database session verification failed';
  }
  return 'operation session failed';
}

async function runTransactionOnClient<T>(
  client: SessionClient,
  fn: (queryable: LedgerQueryable) => Promise<T>,
): Promise<T> {
  await client.query('BEGIN');
  try {
    const value = await fn(client);
    try {
      await client.query('COMMIT');
    } catch {
      throw new LedgerOutcomeUnknownError();
    }
    return value;
  } catch (error) {
    if (!(error instanceof LedgerOutcomeUnknownError)) {
      await rollbackQuietly(client);
    }
    throw error;
  }
}

async function beginReadOnly(client: LedgerQueryable): Promise<void> {
  await client.query('BEGIN READ ONLY');
}

export async function withMutationSession<T>(
  target: ParsedTarget,
  request: MutationSessionRequest,
  client: SessionClient,
  run: (context: SessionContext) => Promise<T>,
): Promise<T> {
  const label = targetLabel(toTargetDisplay(target));
  if (request.confirmTarget !== label) {
    throw new SessionError(
      'confirm-target does not match DB_OPS_URL endpoint label',
    );
  }

  const targetId = requireUuidSyntax(request.targetId, 'target_id');
  let outcomeUnknown = false;

  try {
    await client.connect();
    await verifySession(client, target, { requirePrimary: true });

    const lockResult = await client.query(SQL_TRY_ADVISORY_SESSION_LOCK);
    if (!lockAcquired(lockResult.rows)) {
      throw new SessionError('operation session advisory lock busy; refused');
    }

    const marker = await readMarker(client);
    assertMarkerTargetId(marker, targetId);

    await verifySession(client, target, { requirePrimary: true });

    const context: SessionContext = Object.freeze({
      marker,
      runTransaction: (fn) => runTransactionOnClient(client, fn),
      query: (sql, values) => client.query(sql, values),
    });

    return await run(context);
  } catch (error) {
    if (
      error instanceof LedgerOutcomeUnknownError ||
      error instanceof SessionOutcomeUnknownError
    ) {
      outcomeUnknown = true;
    }
    throw error;
  } finally {
    await closeClient(client);
    if (outcomeUnknown) {
      // Caller must not replay automatically.
    }
  }
}

export async function withReadOnlySession<T>(
  target: ParsedTarget,
  request: ReadOnlySessionRequest,
  client: SessionClient,
  run: (context: SessionContext) => Promise<T>,
): Promise<T> {
  const targetId = requireUuidSyntax(request.targetId, 'target_id');

  try {
    await client.connect();
    await verifySession(client, target, { requirePrimary: false });

    await beginReadOnly(client);
    try {
      const marker = await readMarker(client);
      assertMarkerTargetId(marker, targetId);

      const context: SessionContext = Object.freeze({
        marker,
        runTransaction: async () => {
          throw new SessionError(
            'read-only session cannot run mutating transactions',
          );
        },
        query: (sql, values) => client.query(sql, values),
      });

      return await run(context);
    } finally {
      await rollbackQuietly(client);
    }
  } finally {
    await closeClient(client);
  }
}

export async function runInTransaction<T>(
  client: SessionClient,
  fn: (queryable: LedgerQueryable) => Promise<T>,
): Promise<T> {
  return runTransactionOnClient(client, fn);
}

export { SESSION_CHECK_SQL, LedgerOutcomeUnknownError };
