import type { MigrationMeta } from 'drizzle-orm/migrator';
import type { AppliedMigrationLedgerRow } from './journal';

export type MigrationRunnerOps = {
  connect(): Promise<void>;
  tryLock(): Promise<boolean>;
  setLockTimeout(): Promise<void>;
  readLedger(): Promise<readonly AppliedMigrationLedgerRow[]>;
  migrateVerified(entries: MigrationMeta[]): Promise<void>;
  close(): Promise<void>;
  get connectionError(): Error | undefined;
};

/**
 * Runs the migration orchestration in a fixed order. Fake implementations record
 * calls without standing up PostgreSQL.
 */
export async function runMigrationWithOps(
  ops: MigrationRunnerOps,
  verifiedEntries: MigrationMeta[],
  assertLedger: (rows: readonly AppliedMigrationLedgerRow[]) => void,
): Promise<void> {
  let primaryError: unknown;
  let closeError: unknown;

  try {
    await ops.connect();
    const acquired = await ops.tryLock();
    if (!acquired) {
      throw new Error(
        'Another database migration is running; retry after it finishes.',
      );
    }
    await ops.setLockTimeout();
    const ledger = await ops.readLedger();
    assertLedger(ledger);
    await ops.migrateVerified(verifiedEntries);
    const connectionError = ops.connectionError;
    if (connectionError) {
      throw connectionError;
    }
  } catch (error) {
    primaryError = error;
  } finally {
    try {
      await ops.close();
    } catch (error) {
      closeError = error;
    }
  }

  // A failed close must not replace an earlier migration or connection failure.
  if (primaryError !== undefined) {
    throw primaryError;
  }
  if (closeError !== undefined) {
    throw closeError;
  }
}
