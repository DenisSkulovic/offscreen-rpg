import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { sql } from 'drizzle-orm';
import { applyMigrations } from '@offscreen/db/migrate';
import {
  createDatabase,
  readDatabaseConfig,
  type Database,
} from '@offscreen/db';
import {
  LaunchLedgerError,
  admitLaunchOperation,
  readLaunchOperation,
  toPublicLaunchStatus,
  withLockedLaunchOperation,
} from '../src/launch-ledger.js';

const url = process.env['DATABASE_TEST_URL'];
if (!url || new URL(url).pathname !== '/offscreen_db_test') {
  throw new Error(
    'DATABASE_TEST_URL must explicitly target the disposable offscreen_db_test database.',
  );
}
const host = new URL(url).hostname;
if (host !== '127.0.0.1' && host !== 'localhost') {
  throw new Error(
    'DATABASE_TEST_URL must use loopback host 127.0.0.1 or localhost.',
  );
}

function resolveMigrationsDir(): string {
  const candidates = [
    resolve(process.cwd(), 'packages/db/migrations'),
    resolve(process.cwd(), '../../packages/db/migrations'),
  ];
  for (const candidate of candidates) {
    if (existsSync(resolve(candidate, 'meta/_journal.json'))) {
      return candidate;
    }
  }
  throw new Error('Could not locate packages/db/migrations.');
}

const migrations = resolveMigrationsDir();
const config = readDatabaseConfig({ DATABASE_URL: url });

const SIDE_TABLES = [
  'story',
  'generation',
  'story_passage',
  'outbox_message',
  'outbox',
] as const;

async function insertUser(database: Database, ownerId: string) {
  await database.db.execute(
    sql`insert into "user" (id, name, email, email_verified, created_at, updated_at)
        values (${ownerId}, ${'WR07L'}, ${`${ownerId}@example.test`}, true, now(), now())
        on conflict (id) do nothing`,
  );
}

async function countTable(
  database: Database,
  relation: string,
): Promise<number | null> {
  const result = await database.db.execute<{ count: string | null }>(
    sql.raw(`select count(*)::text as count from ${relation}`),
  );
  const count = result.rows[0]?.count;
  return count === undefined || count === null ? null : Number(count);
}

async function captureSideTableCounts(
  database: Database,
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  const seen = new Set<string>();
  for (const candidate of SIDE_TABLES) {
    if (seen.has(candidate)) {
      continue;
    }
    seen.add(candidate);
    const reg = await database.db.execute<{ name: string | null }>(
      sql`select to_regclass(${`public.${candidate}`})::text as name`,
    );
    const name = reg.rows[0]?.name;
    if (!name) {
      continue;
    }
    const counted = await countTable(database, name);
    assert.ok(counted !== null, `expected countable relation ${name}`);
    counts[name] = counted;
  }
  return counts;
}

function promptRequest(operationId: string, prompt: string) {
  return {
    operationId,
    source: { kind: 'prompt' as const, prompt },
  };
}

async function withDisposableDatabase(
  run: (database: Database) => Promise<void>,
) {
  await applyMigrations(config, migrations);
  await applyMigrations(config, migrations);
  const database = createDatabase(config, () => {});
  try {
    await run(database);
  } finally {
    await database.close();
  }
}

test('WR07L T02: launch ledger admission and owner-scoped reads', async () => {
  await withDisposableDatabase(async (database) => {
    const ownerId = `owner-${randomUUID()}`;
    const owner2Id = `owner2-${randomUUID()}`;
    const owner3Id = `owner3-${randomUUID()}`;
    await insertUser(database, ownerId);
    await insertUser(database, owner2Id);
    await insertUser(database, owner3Id);

    const operationId = randomUUID();
    const secretPrompt =
      'Ash storms over Red Mountain, courier of House Hlaalu.';
    const beforeCounts = await captureSideTableCounts(database);

    const admitted = await admitLaunchOperation(database, {
      ownerId,
      request: promptRequest(operationId, secretPrompt),
    });

    assert.equal(admitted.state, 'pending');
    assert.equal(admitted.request.source.kind, 'prompt');
    if (admitted.request.source.kind === 'prompt') {
      assert.equal(admitted.request.source.prompt, secretPrompt);
    }

    const publicStatus = toPublicLaunchStatus(admitted);
    assert.equal(publicStatus.state, 'pending');
    assert.ok(
      !('storyId' in publicStatus && publicStatus.storyId !== undefined),
    );
    const publicJson = JSON.stringify(publicStatus);
    assert.ok(!publicJson.includes(secretPrompt));

    const storyLaunchCount = await database.db.execute<{ count: string }>(
      sql`select count(*)::text as count from story_launch where owner_id = ${ownerId}`,
    );
    assert.equal(Number(storyLaunchCount.rows[0]?.count), 1);

    const reordered = await admitLaunchOperation(database, {
      ownerId,
      request: {
        source: { prompt: secretPrompt, kind: 'prompt' },
        operationId,
      },
    });
    assert.equal(reordered.requestHash, admitted.requestHash);
    assert.equal(reordered.reservedStoryId, admitted.reservedStoryId);
    assert.equal(
      Number(
        (
          await database.db.execute<{ count: string }>(
            sql`select count(*)::text as count from story_launch where owner_id = ${ownerId}`,
          )
        ).rows[0]?.count,
      ),
      1,
    );

    const readBack = await readLaunchOperation(database, {
      ownerId,
      operationId,
    });
    assert.equal(readBack.requestHash, admitted.requestHash);
    assert.equal(readBack.reservedStoryId, admitted.reservedStoryId);

    const otherPrompt = 'A different tale under the same operation id.';
    await admitLaunchOperation(database, {
      ownerId: owner2Id,
      request: promptRequest(operationId, otherPrompt),
    });
    const owner2Read = await readLaunchOperation(database, {
      ownerId: owner2Id,
      operationId,
    });
    assert.equal(
      owner2Read.request.source.kind === 'prompt'
        ? owner2Read.request.source.prompt
        : '',
      otherPrompt,
    );

    const owner1AfterOwner2 = await readLaunchOperation(database, {
      ownerId,
      operationId,
    });
    assert.equal(
      owner1AfterOwner2.request.source.kind === 'prompt'
        ? owner1AfterOwner2.request.source.prompt
        : '',
      secretPrompt,
    );

    await assert.rejects(
      () => readLaunchOperation(database, { ownerId: owner3Id, operationId }),
      (error: unknown) => {
        assert.ok(error instanceof LaunchLedgerError);
        assert.equal(error.code, 'launch_not_found');
        return true;
      },
    );

    await database.db.transaction(async (tx) => {
      const locked = await withLockedLaunchOperation(
        tx,
        { ownerId, operationId },
        async (operation) => operation,
      );
      assert.equal(locked.state, 'pending');
    });
    const stillPending = await readLaunchOperation(database, {
      ownerId,
      operationId,
    });
    assert.equal(stillPending.state, 'pending');

    const afterCounts = await captureSideTableCounts(database);
    assert.deepEqual(afterCounts, beforeCounts);
  });
});

test('WR07L T02: launch ledger negative cases', async () => {
  await withDisposableDatabase(async (database) => {
    const ownerId = `owner-${randomUUID()}`;
    await insertUser(database, ownerId);
    const operationId = randomUUID();
    const firstPrompt = 'First canonical prompt for conflict testing.';
    const secondPrompt = 'Second prompt must not replace the stored request.';

    const first = await admitLaunchOperation(database, {
      ownerId,
      request: promptRequest(operationId, firstPrompt),
    });

    await assert.rejects(
      () =>
        admitLaunchOperation(database, {
          ownerId,
          request: promptRequest(operationId, secondPrompt),
        }),
      (error: unknown) => {
        assert.ok(error instanceof LaunchLedgerError);
        assert.equal(error.code, 'launch_conflict');
        return true;
      },
    );

    const afterConflict = await readLaunchOperation(database, {
      ownerId,
      operationId,
    });
    assert.equal(afterConflict.requestHash, first.requestHash);
    assert.equal(afterConflict.reservedStoryId, first.reservedStoryId);
    assert.equal(
      afterConflict.reservedFirstPassageId,
      first.reservedFirstPassageId,
    );
    assert.equal(
      afterConflict.request.source.kind === 'prompt'
        ? afterConflict.request.source.prompt
        : '',
      firstPrompt,
    );

    await assert.rejects(
      () =>
        admitLaunchOperation(database, {
          ownerId,
          request: promptRequest(operationId, '   '),
        }),
      (error: unknown) => {
        assert.ok(error instanceof LaunchLedgerError);
        assert.equal(error.code, 'launch_invalid');
        return true;
      },
    );

    await assert.rejects(
      () =>
        readLaunchOperation(database, {
          ownerId,
          operationId: 'not-a-uuid',
        }),
      (error: unknown) => {
        assert.ok(error instanceof LaunchLedgerError);
        assert.equal(error.code, 'launch_invalid');
        return true;
      },
    );

    await assert.rejects(
      () =>
        readLaunchOperation(database, {
          ownerId,
          operationId: randomUUID(),
        }),
      (error: unknown) => {
        assert.ok(error instanceof LaunchLedgerError);
        assert.equal(error.code, 'launch_not_found');
        return true;
      },
    );
  });
});

test('WR07L T03: concurrent admission, conflict, and reconnect', async () => {
  await applyMigrations(config, migrations);
  await applyMigrations(config, migrations);
  let database = createDatabase(config, () => {});
  try {
    const ownerId = `owner-${randomUUID()}`;
    await insertUser(database, ownerId);
    const beforeCounts = await captureSideTableCounts(database);

    const operationIdSame = randomUUID();
    const samePrompt =
      'Concurrent same-body prompt over the Ascadian Isles, kwama mine dusk.';
    const [concurrentA, concurrentB] = await Promise.all([
      admitLaunchOperation(database, {
        ownerId,
        request: promptRequest(operationIdSame, samePrompt),
      }),
      admitLaunchOperation(database, {
        ownerId,
        request: promptRequest(operationIdSame, samePrompt),
      }),
    ]);

    assert.equal(concurrentA.reservedStoryId, concurrentB.reservedStoryId);
    assert.equal(
      concurrentA.reservedFirstPassageId,
      concurrentB.reservedFirstPassageId,
    );
    assert.equal(concurrentA.requestHash, concurrentB.requestHash);

    const sameBodyRowCount = await database.db.execute<{ count: string }>(
      sql`select count(*)::text as count from story_launch where owner_id = ${ownerId} and operation_id = ${operationIdSame}`,
    );
    assert.equal(Number(sameBodyRowCount.rows[0]?.count), 1);

    const operationIdConflict = randomUUID();
    const promptAlpha =
      'Alpha prompt wins or loses the concurrent conflict race.';
    const promptBeta =
      'Beta prompt must not replace the stored request if it loses.';
    const conflictOutcomes = await Promise.allSettled([
      admitLaunchOperation(database, {
        ownerId,
        request: promptRequest(operationIdConflict, promptAlpha),
      }),
      admitLaunchOperation(database, {
        ownerId,
        request: promptRequest(operationIdConflict, promptBeta),
      }),
    ]);

    const conflictFulfilled = conflictOutcomes.filter(
      (outcome) => outcome.status === 'fulfilled',
    );
    const conflictRejected = conflictOutcomes.filter(
      (outcome) => outcome.status === 'rejected',
    );
    assert.equal(conflictFulfilled.length, 1);
    assert.equal(conflictRejected.length, 1);
    const rejectedOutcome = conflictRejected[0];
    assert.ok(rejectedOutcome?.status === 'rejected');
    const rejection = rejectedOutcome.reason;
    assert.ok(rejection instanceof LaunchLedgerError);
    assert.equal(rejection.code, 'launch_conflict');

    const fulfilledOutcome = conflictFulfilled[0];
    assert.ok(fulfilledOutcome?.status === 'fulfilled');
    const admittedWinner = fulfilledOutcome.value;
    const storedConflict = await readLaunchOperation(database, {
      ownerId,
      operationId: operationIdConflict,
    });
    assert.equal(storedConflict.requestHash, admittedWinner.requestHash);
    assert.equal(
      storedConflict.reservedStoryId,
      admittedWinner.reservedStoryId,
    );

    const storedPrompt =
      storedConflict.request.source.kind === 'prompt'
        ? storedConflict.request.source.prompt
        : '';
    assert.ok(storedPrompt === promptAlpha || storedPrompt === promptBeta);
    const readmitSameBody = await admitLaunchOperation(database, {
      ownerId,
      request: promptRequest(operationIdConflict, storedPrompt),
    });
    assert.equal(readmitSameBody.requestHash, storedConflict.requestHash);
    assert.equal(
      readmitSameBody.reservedStoryId,
      storedConflict.reservedStoryId,
    );
    assert.equal(
      readmitSameBody.reservedFirstPassageId,
      storedConflict.reservedFirstPassageId,
    );

    await database.close();
    database = createDatabase(config, () => {});

    const afterReconnect = await readLaunchOperation(database, {
      ownerId,
      operationId: operationIdSame,
    });
    assert.equal(afterReconnect.requestHash, concurrentA.requestHash);
    assert.equal(afterReconnect.reservedStoryId, concurrentA.reservedStoryId);

    const publicAfterReconnect = toPublicLaunchStatus(afterReconnect);
    assert.equal(publicAfterReconnect.state, 'pending');
    const reconnectPublicJson = JSON.stringify(publicAfterReconnect);
    assert.ok(!reconnectPublicJson.includes(samePrompt));

    const afterCounts = await captureSideTableCounts(database);
    assert.deepEqual(afterCounts, beforeCounts);
  } finally {
    await database.close();
  }
});
