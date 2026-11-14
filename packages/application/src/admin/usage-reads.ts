import { and, eq, inArray } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import {
  storytellerAttempt,
  storytellerFunding,
  storytellerUsageAllocation,
} from '@offscreen/db/storyteller-schema';
import type {
  UsageStatusEnvelopeV1,
  UsageStatusV1,
} from '@offscreen/contracts/admin';
import type { AdminEnvironment } from './registry.js';
import { AdminSessionError } from './session.js';

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function bigintString(value: bigint | number | string | null | undefined): string {
  if (value === null || value === undefined) return '0';
  return BigInt(value).toString();
}

export function projectUsageStatus(input: {
  accountRef: string;
  fundingVerifiedAt: Date | string | null;
  reserved: bigint;
  dispatched: bigint;
  settled: bigint;
  uncertain: bigint;
  hasAllocationRows: boolean;
  hasUnknownCost: boolean;
  windows: UsageStatusV1['windows'];
  measuredAt?: string;
}): UsageStatusV1 {
  const measuredAt = input.measuredAt ?? new Date().toISOString();
  let costAuthority: UsageStatusV1['costAuthority'] = 'recorded';
  if (input.hasUnknownCost) costAuthority = 'unknown';
  else if (!input.hasAllocationRows) costAuthority = 'unknown';

  let sourceCoverage: UsageStatusV1['sourceCoverage'] = 'since-enabled';
  if (!input.hasAllocationRows) sourceCoverage = 'partial';

  return {
    accountRef: input.accountRef,
    usageUnit: 'microusd',
    sourceCoverage,
    measuredAt,
    fundingVerifiedAt: input.fundingVerifiedAt
      ? toIso(input.fundingVerifiedAt)
      : null,
    reserved: bigintString(input.reserved),
    dispatched: bigintString(input.dispatched),
    settled: bigintString(input.settled),
    uncertain: bigintString(input.uncertain),
    costAuthority,
    commercialIntegration: 'unsupported',
    commercialExplanationCode: 'no-commercial-source',
    windows: input.windows,
  };
}

export function createAdminUsageReads(database: Database) {
  return {
    async readUsageStatus(input: {
      accountRef: string;
      environment: AdminEnvironment;
    }): Promise<UsageStatusEnvelopeV1> {
      const [funding] = await database.db
        .select({
          id: storytellerFunding.id,
          verifiedAt: storytellerFunding.verifiedAt,
          reservedMicrousd: storytellerFunding.reservedMicrousd,
          settledMicrousd: storytellerFunding.settledMicrousd,
        })
        .from(storytellerFunding)
        .where(eq(storytellerFunding.id, input.accountRef))
        .limit(1);
      if (!funding) throw new AdminSessionError('not_authorized');

      const attemptRows = await database.db
        .select({ id: storytellerAttempt.id })
        .from(storytellerAttempt)
        .where(eq(storytellerAttempt.accountId, input.accountRef))
        .limit(500);
      const attemptIds = attemptRows.map((row) => row.id);

      let allocationRows: Array<{
        windowId: string;
        windowVersion: number;
        scope: 'platform' | 'account' | 'story';
        metric:
          | 'requests'
          | 'input_tokens'
          | 'generated_tokens'
          | 'microusd'
          | 'background_jobs';
        state: 'reserved' | 'dispatched' | 'settled' | 'uncertain' | 'released';
        reserved: bigint;
        consumed: bigint | null;
      }> = [];

      if (attemptIds.length > 0) {
        allocationRows = await database.db
          .select({
            windowId: storytellerUsageAllocation.windowId,
            windowVersion: storytellerUsageAllocation.windowVersion,
            scope: storytellerUsageAllocation.scope,
            metric: storytellerUsageAllocation.metric,
            state: storytellerUsageAllocation.state,
            reserved: storytellerUsageAllocation.reserved,
            consumed: storytellerUsageAllocation.consumed,
          })
          .from(storytellerUsageAllocation)
          .where(
            and(
              inArray(storytellerUsageAllocation.attemptId, attemptIds),
              eq(storytellerUsageAllocation.metric, 'microusd'),
            ),
          );
      }

      let reserved = 0n;
      let dispatched = 0n;
      let settled = 0n;
      let uncertain = 0n;
      let hasUnknownCost = false;
      const windowKeys = new Map<string, UsageStatusV1['windows'][number]>();

      for (const row of allocationRows) {
        const amount =
          row.state === 'settled' || row.state === 'released'
            ? (row.consumed ?? row.reserved)
            : row.reserved;
        if (
          (row.state === 'settled' || row.state === 'released') &&
          row.consumed === null
        ) {
          hasUnknownCost = true;
        }
        if (row.state === 'reserved') reserved += amount;
        else if (row.state === 'dispatched') dispatched += amount;
        else if (row.state === 'settled') settled += amount;
        else if (row.state === 'uncertain') uncertain += amount;

        const key = `${row.windowId}:${row.windowVersion}:${row.scope}:${row.metric}`;
        if (!windowKeys.has(key)) {
          windowKeys.set(key, {
            windowId: row.windowId,
            windowVersion: row.windowVersion,
            scope: row.scope,
            metric: row.metric,
          });
        }
      }

      // Funding ledger is authoritative for open account reservation when no
      // allocation rows exist — still mark cost authority unknown, not zero-settled.
      if (allocationRows.length === 0) {
        reserved = BigInt(funding.reservedMicrousd);
        settled = BigInt(funding.settledMicrousd);
        hasUnknownCost = true;
      }

      const observedAt = new Date().toISOString();
      const data = projectUsageStatus({
        accountRef: funding.id,
        fundingVerifiedAt: funding.verifiedAt,
        reserved,
        dispatched,
        settled,
        uncertain,
        hasAllocationRows: allocationRows.length > 0,
        hasUnknownCost,
        windows: [...windowKeys.values()].slice(0, 32),
        measuredAt: observedAt,
      });

      return {
        version: 1,
        subject: {
          kind: 'account',
          id: funding.id,
          environment: input.environment,
        },
        data,
        observedAt,
        consistency: allocationRows.length > 0 ? 'verified' : 'partial',
        sources: [
          {
            kind: 'storyteller.funding',
            coverage: 'complete',
            observedAt,
          },
          {
            kind: 'storyteller.usage_allocation',
            coverage:
              allocationRows.length > 0 ? 'since-enabled' : 'partial',
            observedAt,
          },
        ],
        limitations: ['unsupported', 'incomplete-evidence'],
      };
    },
  };
}

export type AdminUsageReads = ReturnType<typeof createAdminUsageReads>;
