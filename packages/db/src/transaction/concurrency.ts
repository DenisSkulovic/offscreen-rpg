import { sql } from 'drizzle-orm';
import {
  AffectedRowConflictError,
  databaseTransactionError,
} from './errors.js';
import type { Transaction } from './types.js';

const SIGNED_INT32_MIN = -2_147_483_648;
const SIGNED_INT32_MAX = 2_147_483_647;

const INVALID_ADVISORY_LOCK_KEY_MESSAGE =
  'Transaction advisory lock key must be a signed 32-bit integer.';

export function expectOneAffected(count: number): void {
  if (!Number.isInteger(count) || count !== 1) {
    throw new AffectedRowConflictError(count);
  }
}

function validateAdvisoryLockKey(key: number): void {
  if (typeof key !== 'number' || !Number.isInteger(key)) {
    throw databaseTransactionError(
      'application',
      undefined,
      INVALID_ADVISORY_LOCK_KEY_MESSAGE,
    );
  }
  if (key < SIGNED_INT32_MIN || key > SIGNED_INT32_MAX) {
    throw databaseTransactionError(
      'application',
      undefined,
      INVALID_ADVISORY_LOCK_KEY_MESSAGE,
    );
  }
}

export async function acquireTransactionAdvisoryLock(
  tx: Transaction,
  key: number,
): Promise<void> {
  validateAdvisoryLockKey(key);
  await tx.execute(sql`SELECT pg_advisory_xact_lock(${key}::bigint)`);
}
