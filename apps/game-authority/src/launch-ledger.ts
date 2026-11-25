import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import {
  storyLaunchRequestSchema,
  storyLaunchStatusSchema,
  type StoryLaunchRequest,
  type StoryLaunchStatus,
} from '@offscreen/story-interface/story-launch';
import type { Database } from '@offscreen/db';
import { storyLaunch } from '@offscreen/story-persistence/launch';
import { hashCanonicalJson } from '@offscreen/documents';
import { z } from 'zod';

export class LaunchLedgerError extends Error {
  readonly code: 'launch_invalid' | 'launch_conflict' | 'launch_not_found';

  constructor(
    code: LaunchLedgerError['code'],
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'LaunchLedgerError';
    this.code = code;
  }
}

export type LaunchOperationState = (typeof storyLaunch.$inferSelect)['state'];

export type LaunchOperation = {
  ownerId: string;
  operationId: string;
  request: StoryLaunchRequest;
  requestHash: string;
  reservedStoryId: string;
  reservedFirstPassageId: string;
  state: LaunchOperationState;
  generationId: string | null;
  sceneSequence: number | null;
  publicReason: string | null;
  uncertainExplanation: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type LaunchDbExecutor = Pick<Database['db'], 'select' | 'insert'>;

const operationIdSchema = z.uuid();

function parseOperationId(operationId: string): string {
  const parsed = operationIdSchema.safeParse(operationId);
  if (!parsed.success) {
    throw new LaunchLedgerError(
      'launch_invalid',
      'Launch operation id is invalid.',
    );
  }
  return parsed.data;
}

function mapRowToOperation(
  row: typeof storyLaunch.$inferSelect,
): LaunchOperation {
  const parsedRequest = storyLaunchRequestSchema.safeParse(row.request);
  if (!parsedRequest.success) {
    throw new LaunchLedgerError(
      'launch_invalid',
      'Stored launch request is invalid.',
    );
  }
  return {
    ownerId: row.ownerId,
    operationId: row.operationId,
    request: parsedRequest.data,
    requestHash: row.requestHash,
    reservedStoryId: row.reservedStoryId,
    reservedFirstPassageId: row.reservedFirstPassageId,
    state: row.state,
    generationId: row.generationId,
    sceneSequence: row.sceneSequence,
    publicReason: row.publicReason,
    uncertainExplanation: row.uncertainExplanation,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function selectLaunchForUpdate(
  executor: LaunchDbExecutor,
  ownerId: string,
  operationId: string,
): Promise<typeof storyLaunch.$inferSelect | undefined> {
  const rows = await executor
    .select()
    .from(storyLaunch)
    .where(
      and(
        eq(storyLaunch.ownerId, ownerId),
        eq(storyLaunch.operationId, operationId),
      ),
    )
    .for('update');
  return rows[0];
}

export async function admitLaunchOperation(
  database: Database,
  input: { ownerId: string; request: unknown },
): Promise<LaunchOperation> {
  if (input.ownerId.trim().length === 0) {
    throw new LaunchLedgerError('launch_invalid', 'Launch owner is required.');
  }

  const parsedRequest = storyLaunchRequestSchema.safeParse(input.request);
  if (!parsedRequest.success) {
    throw new LaunchLedgerError('launch_invalid', 'Launch request is invalid.');
  }

  const requestHash = hashCanonicalJson(parsedRequest.data);
  const reservedStoryId = randomUUID();
  const reservedFirstPassageId = randomUUID();

  return database.db.transaction(async (tx) => {
    await tx
      .insert(storyLaunch)
      .values({
        ownerId: input.ownerId,
        operationId: parsedRequest.data.operationId,
        requestHash,
        request: parsedRequest.data,
        reservedStoryId,
        reservedFirstPassageId,
        state: 'pending',
        generationId: null,
        sceneSequence: null,
        publicReason: null,
        uncertainExplanation: null,
      })
      .onConflictDoNothing({
        target: [storyLaunch.ownerId, storyLaunch.operationId],
      });

    const row = await selectLaunchForUpdate(
      tx,
      input.ownerId,
      parsedRequest.data.operationId,
    );
    if (!row) {
      throw new LaunchLedgerError(
        'launch_not_found',
        'Launch operation not found.',
      );
    }
    if (row.requestHash !== requestHash) {
      throw new LaunchLedgerError(
        'launch_conflict',
        'Launch request conflicts with an existing operation.',
      );
    }
    return mapRowToOperation(row);
  });
}

export async function readLaunchOperation(
  database: Database,
  input: { ownerId: string; operationId: string },
): Promise<LaunchOperation> {
  const operationId = parseOperationId(input.operationId);
  const rows = await database.db
    .select()
    .from(storyLaunch)
    .where(
      and(
        eq(storyLaunch.ownerId, input.ownerId),
        eq(storyLaunch.operationId, operationId),
      ),
    );
  const row = rows[0];
  if (!row) {
    throw new LaunchLedgerError(
      'launch_not_found',
      'Launch operation not found.',
    );
  }
  return mapRowToOperation(row);
}

export function toPublicLaunchStatus(
  operation: LaunchOperation,
): StoryLaunchStatus {
  const base = {
    operationId: operation.operationId,
    requestHash: operation.requestHash,
    createdAt: operation.createdAt.toISOString(),
    updatedAt: operation.updatedAt.toISOString(),
  };

  let status: StoryLaunchStatus;
  switch (operation.state) {
    case 'pending':
    case 'preparing':
    case 'composing':
      status = { ...base, state: operation.state };
      break;
    case 'held': {
      if (
        operation.publicReason !== 'policy' &&
        operation.publicReason !== 'authorization' &&
        operation.publicReason !== 'capacity'
      ) {
        throw new LaunchLedgerError(
          'launch_invalid',
          'Launch held status is invalid.',
        );
      }
      status = { ...base, state: 'held', reason: operation.publicReason };
      break;
    }
    case 'failed': {
      if (
        operation.publicReason !== 'rejected' &&
        operation.publicReason !== 'not-admitted' &&
        operation.publicReason !== 'unavailable'
      ) {
        throw new LaunchLedgerError(
          'launch_invalid',
          'Launch failed status is invalid.',
        );
      }
      status = { ...base, state: 'failed', reason: operation.publicReason };
      break;
    }
    case 'uncertain': {
      if (
        operation.uncertainExplanation === null ||
        operation.uncertainExplanation.length < 1 ||
        operation.uncertainExplanation.length > 500
      ) {
        throw new LaunchLedgerError(
          'launch_invalid',
          'Launch uncertain status is invalid.',
        );
      }
      status = {
        ...base,
        state: 'uncertain',
        explanation: operation.uncertainExplanation,
      };
      break;
    }
    case 'ready': {
      if (operation.sceneSequence !== 1 || operation.generationId === null) {
        throw new LaunchLedgerError(
          'launch_invalid',
          'Launch ready status is invalid.',
        );
      }
      status = {
        ...base,
        state: 'ready',
        storyId: operation.reservedStoryId,
        sceneSequence: 1,
      };
      break;
    }
    default:
      throw new LaunchLedgerError('launch_invalid', 'Launch state is invalid.');
  }

  const parsed = storyLaunchStatusSchema.safeParse(status);
  if (!parsed.success) {
    throw new LaunchLedgerError(
      'launch_invalid',
      'Launch public status is invalid.',
    );
  }
  return parsed.data;
}

export type LaunchDbTransaction = Parameters<
  Parameters<Database['db']['transaction']>[0]
>[0];

export async function withLockedLaunchOperation<T>(
  tx: LaunchDbTransaction,
  input: { ownerId: string; operationId: string },
  callback: (operation: LaunchOperation) => Promise<T> | T,
): Promise<T> {
  const operationId = parseOperationId(input.operationId);
  const row = await selectLaunchForUpdate(tx, input.ownerId, operationId);
  if (!row) {
    throw new LaunchLedgerError(
      'launch_not_found',
      'Launch operation not found.',
    );
  }
  return callback(mapRowToOperation(row));
}
