import { and, eq, sql } from 'drizzle-orm';
import {
  storytellerCurrentOwnerGrant,
  storytellerFunding as funding,
  storytellerRun as run,
} from '@offscreen/db/storyteller-schema';
import { executionPolicySchema, type ExecutionPolicy } from '@offscreen/storyteller/tasks';
import type { Transaction } from '@offscreen/db/outbox';

type ProviderExecution = Extract<ExecutionPolicy, { mode: 'provider' }>;

/** Test-only grant revocation under the OBS00-B dispatch funding lock order. */
export async function testRevokeCurrentOwnerGrant(
  tx: Transaction,
  execution: unknown,
  grantId: string,
): Promise<boolean> {
  const providerExecution = executionPolicySchema.parse(execution);
  if (providerExecution.mode !== 'provider') {
    return false;
  }
  return revokeCurrentOwnerGrantUnderFundingLock(tx, providerExecution, grantId);
}

export async function revokeCurrentOwnerGrantUnderFundingLock(
  tx: Transaction,
  execution: ProviderExecution,
  grantId: string,
): Promise<boolean> {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(714092631)`);
  const [account] = await tx
    .select({ id: funding.id })
    .from(funding)
    .where(eq(funding.id, execution.accountId))
    .for('update');
  const [allowance] = await tx
    .select({ id: run.id })
    .from(run)
    .where(
      and(eq(run.id, execution.runId), eq(run.accountId, execution.accountId)),
    )
    .for('update');
  if (!account || !allowance) {
    return false;
  }
  const [revoked] = await tx
    .update(storytellerCurrentOwnerGrant)
    .set({
      enabled: false,
      revokedAt: sql`clock_timestamp()`,
      updatedAt: sql`clock_timestamp()`,
    })
    .where(eq(storytellerCurrentOwnerGrant.id, grantId))
    .returning({ id: storytellerCurrentOwnerGrant.id });
  return Boolean(revoked);
}