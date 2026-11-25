import { eq } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import { campaignDelegatedOffer } from '@offscreen/story-persistence/campaign';
import type { DocumentStore } from '@offscreen/documents';
import { lockStoryById, readDatabaseClockMs } from '../stories/persistence';
import { admitPreapprovedWithdrawal } from './actions';

const NON_ADVANCE_STATUSES = new Set([
  'paused',
  'revoked',
  'held',
  'admitted',
  'consumed',
]);

type AdvancePhase =
  | { kind: 'stop' }
  | { kind: 'wait'; remainingMs: number }
  | { kind: 'admit'; storyId: string; offerId: string };

/** Provider-free scheduler tick: sleep until due, then shared withdrawal admission. */
export async function advanceDelegatedWithdrawal(
  database: Database,
  wakeOperationId: string,
  documentStore?: DocumentStore,
): Promise<number | null> {
  const phase = await database.db.transaction(async (tx): Promise<AdvancePhase> => {
    const [row] = await tx
      .select()
      .from(campaignDelegatedOffer)
      .where(eq(campaignDelegatedOffer.wakeOperationId, wakeOperationId));

    if (!row || row.wakeOperationId !== wakeOperationId) {
      return { kind: 'stop' };
    }

    await lockStoryById(tx, row.storyId);

    const [current] = await tx
      .select()
      .from(campaignDelegatedOffer)
      .where(eq(campaignDelegatedOffer.wakeOperationId, wakeOperationId));

    if (!current || current.wakeOperationId !== wakeOperationId) {
      return { kind: 'stop' };
    }

    if (NON_ADVANCE_STATUSES.has(current.status)) {
      return { kind: 'stop' };
    }

    if (current.status !== 'armed') {
      return { kind: 'stop' };
    }

    const clockMs = await readDatabaseClockMs(tx, current.storyId);
    const dueMs = current.dueAt.getTime();
    if (clockMs < dueMs) {
      return { kind: 'wait', remainingMs: dueMs - clockMs };
    }

    return {
      kind: 'admit',
      storyId: current.storyId,
      offerId: current.offerId,
    };
  });

  if (phase.kind === 'wait') {
    return phase.remainingMs;
  }
  if (phase.kind === 'admit') {
    await admitPreapprovedWithdrawal(
      database,
      { storyId: phase.storyId, offerId: phase.offerId },
      documentStore,
    );
  }
  return null;
}