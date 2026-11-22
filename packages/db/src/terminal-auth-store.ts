import { timingSafeEqual } from 'node:crypto';
import { and, count, eq, gt, inArray, isNull } from 'drizzle-orm';

function equalSha256Hex(left: string, right: string): boolean {
  const a = Buffer.from(left, 'utf8');
  const b = Buffer.from(right, 'utf8');
  if (a.length !== b.length) {return false;}
  return timingSafeEqual(a, b);
}
import type { Database } from './database';
import { user } from './schema/auth';
import {
  terminalAccessToken,
  terminalDevicePairing,
  type TerminalPairingState,
} from './schema/terminal-auth';

export type TerminalPairingRow = typeof terminalDevicePairing.$inferSelect;
export type TerminalAccessTokenRow = typeof terminalAccessToken.$inferSelect;

export async function countRecentPairingsForIp(
  database: Database,
  sourceIpHash: string,
  windowStart: Date,
): Promise<number> {
  const rows = await database.db
    .select({ value: count() })
    .from(terminalDevicePairing)
    .where(
      and(
        eq(terminalDevicePairing.sourceIpHash, sourceIpHash),
        gt(terminalDevicePairing.createdAt, windowStart),
      ),
    );
  return rows[0]?.value ?? 0;
}

export async function countOutstandingPairingsForChallenge(
  database: Database,
  challengeSha256: string,
): Promise<number> {
  const rows = await database.db
    .select({ value: count() })
    .from(terminalDevicePairing)
    .where(
      and(
        eq(terminalDevicePairing.challengeSha256, challengeSha256),
        inArray(terminalDevicePairing.state, ['pending', 'approved']),
        gt(terminalDevicePairing.expiresAt, new Date()),
      ),
    );
  return rows[0]?.value ?? 0;
}

export async function insertTerminalPairing(
  database: Database,
  values: {
    codeHash: string;
    challengeSha256: string;
    sourceIpHash: string;
    clientLabel: string;
    expiresAt: Date;
  },
): Promise<string> {
  const [inserted] = await database.db
    .insert(terminalDevicePairing)
    .values(values)
    .returning({ id: terminalDevicePairing.id });
  if (!inserted) {
    throw new Error('pairing_insert_failed');
  }
  return inserted.id;
}

export async function approveTerminalPairingLocked(
  database: Database,
  pairingId: string,
  ownerId: string,
  codeHash: string,
  now: Date,
): Promise<'approved' | 'not_found' | 'expired' | 'wrong_code'> {
  return database.db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(terminalDevicePairing)
      .where(eq(terminalDevicePairing.id, pairingId))
      .for('update');
    if (!row || row.state !== 'pending' || row.ownerId) {
      return 'not_found';
    }
    if (row.expiresAt.getTime() <= now.getTime()) {
      return 'expired';
    }
    if (!equalSha256Hex(row.codeHash, codeHash)) {
      return 'wrong_code';
    }
    await tx
      .update(terminalDevicePairing)
      .set({
        state: 'approved',
        ownerId,
        approvedAt: now,
      })
      .where(eq(terminalDevicePairing.id, pairingId));
    return 'approved';
  });
}

export async function readPairingExchangeSnapshot(
  database: Database,
  pairingId: string,
): Promise<
  | {
      state: TerminalPairingState;
      expiresAt: Date;
      challengeSha256: string;
    }
  | undefined
> {
  const [row] = await database.db
    .select({
      state: terminalDevicePairing.state,
      expiresAt: terminalDevicePairing.expiresAt,
      challengeSha256: terminalDevicePairing.challengeSha256,
    })
    .from(terminalDevicePairing)
    .where(eq(terminalDevicePairing.id, pairingId))
    .limit(1);
  return row;
}

export type ExchangePairingResult =
  | { kind: 'pending' }
  | { kind: 'not_found' }
  | { kind: 'expired' }
  | { kind: 'consumed' }
  | {
      kind: 'issued';
      ownerId: string;
      tokenHash: string;
      tokenExpiresAt: Date;
    };

export async function exchangeTerminalPairingLocked(
  database: Database,
  pairingId: string,
  challengeSha256: string,
  mintTokenHash: () => string,
  now: Date,
  tokenExpiresAt: Date,
): Promise<ExchangePairingResult> {
  return database.db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(terminalDevicePairing)
      .where(eq(terminalDevicePairing.id, pairingId))
      .for('update');

    if (!row || !equalSha256Hex(row.challengeSha256, challengeSha256)) {
      return { kind: 'not_found' };
    }
    if (row.expiresAt.getTime() <= now.getTime()) {
      return { kind: 'expired' };
    }
    if (row.state === 'consumed') {
      return { kind: 'consumed' };
    }
    if (row.state === 'pending') {
      return { kind: 'pending' };
    }
    if (row.state !== 'approved' || !row.ownerId) {
      return { kind: 'not_found' };
    }

    await tx
      .update(terminalDevicePairing)
      .set({ state: 'consumed', consumedAt: now })
      .where(eq(terminalDevicePairing.id, pairingId));

    const tokenHash = mintTokenHash();
    await tx.insert(terminalAccessToken).values({
      tokenHash,
      userId: row.ownerId,
      scope: 'player-story',
      expiresAt: tokenExpiresAt,
    });

    return {
      kind: 'issued',
      ownerId: row.ownerId,
      tokenHash,
      tokenExpiresAt,
    };
  });
}

export async function readTerminalAccessToken(
  database: Database,
  tokenHash: string,
  now: Date,
): Promise<TerminalAccessTokenRow | undefined> {
  const [row] = await database.db
    .select()
    .from(terminalAccessToken)
    .where(
      and(
        eq(terminalAccessToken.tokenHash, tokenHash),
        eq(terminalAccessToken.scope, 'player-story'),
        gt(terminalAccessToken.expiresAt, now),
        isNull(terminalAccessToken.revokedAt),
      ),
    )
    .limit(1);
  return row;
}

export async function revokeTerminalAccessToken(
  database: Database,
  tokenId: string,
  now: Date,
): Promise<void> {
  await database.db
    .update(terminalAccessToken)
    .set({ revokedAt: now })
    .where(
      and(
        eq(terminalAccessToken.id, tokenId),
        isNull(terminalAccessToken.revokedAt),
      ),
    );
}

export async function readTerminalPairingConsent(
  database: Database,
  pairingId: string,
  now: Date,
): Promise<
  | {
      clientLabel: string;
      expiresAt: Date;
      state: TerminalPairingState;
    }
  | undefined
> {
  const [row] = await database.db
    .select({
      clientLabel: terminalDevicePairing.clientLabel,
      expiresAt: terminalDevicePairing.expiresAt,
      state: terminalDevicePairing.state,
    })
    .from(terminalDevicePairing)
    .where(eq(terminalDevicePairing.id, pairingId))
    .limit(1);
  if (!row) {
    return undefined;
  }
  if (row.expiresAt.getTime() <= now.getTime()) {
    return undefined;
  }
  if (row.state === 'consumed' || row.state === 'denied') {
    return undefined;
  }
  return row;
}

export async function readUserDisplay(
  database: Database,
  userId: string,
): Promise<{ id: string; name: string; email: string } | undefined> {
  const [row] = await database.db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return row;
}
