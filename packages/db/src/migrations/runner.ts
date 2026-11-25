import type { MigrationMeta } from 'drizzle-orm/migrator';
import {
  AppliedMigrationPrefixError,
  type AppliedMigrationLedgerRow,
} from './journal';

export class MigrationLockBusyError extends Error {
  constructor() {
    super('Another database migration is running; retry after it finishes.');
    this.name = 'MigrationLockBusyError';
  }
}

export type MigrationRunnerOps = {
  connect(): Promise<void>;
  tryLock(): Promise<boolean>;
  setLockTimeout(): Promise<void>;
  readLedger(): Promise<readonly AppliedMigrationLedgerRow[]>;
  migrateVerified(entries: MigrationMeta[]): Promise<void>;
  close(): Promise<void>;
  get connectionError(): Error | undefined;
};

type StepResult =
  { outcome: 'success' } | { outcome: 'failure'; error: unknown };

/**
 * Runs the migration orchestration in a fixed order. Fake implementations record
 * calls without standing up PostgreSQL.
 */
export async function runMigrationWithOps(
  ops: MigrationRunnerOps,
  verifiedEntries: MigrationMeta[],
  assertLedger: (rows: readonly AppliedMigrationLedgerRow[]) => void,
): Promise<void> {
  let primary: StepResult = { outcome: 'success' };
  let closeStep: StepResult = { outcome: 'success' };

  try {
    await ops.connect();
    const acquired = await ops.tryLock();
    if (!acquired) {
      throw new MigrationLockBusyError();
    }
    await ops.setLockTimeout();
    const ledger = await ops.readLedger();
    assertLedger(ledger);
    await ops.migrateVerified(verifiedEntries);
    let connectionError = ops.connectionError;
    if (connectionError) {
      throw connectionError;
    }
    const postRows = await ops.readLedger();
    assertLedger(postRows);
    if (postRows.length !== verifiedEntries.length) {
      throw new AppliedMigrationPrefixError('length', postRows.length);
    }
    connectionError = ops.connectionError;
    if (connectionError) {
      throw connectionError;
    }
  } catch (error) {
    primary = { outcome: 'failure', error };
  } finally {
    try {
      await ops.close();
    } catch (error) {
      closeStep = { outcome: 'failure', error };
    }
  }

  // A failed close must not replace an earlier migration or connection failure.
  if (primary.outcome === 'failure') {
    throw primary.error;
  }
  if (closeStep.outcome === 'failure') {
    throw closeStep.error;
  }
}
