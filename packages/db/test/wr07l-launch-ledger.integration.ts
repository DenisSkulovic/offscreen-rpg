import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { resolve } from 'node:path';
import { Client } from 'pg';
import { readDatabaseConfig } from '../src/config';
import { applyMigrations } from '../src/migrate';

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
const config = readDatabaseConfig({ DATABASE_URL: url });
const migrations = resolve(__dirname, '../../migrations');
const journalPath = resolve(__dirname, '../../migrations/meta/_journal.json');

const requestHash = 'ab'.repeat(32);

const expectedConstraints = [
  'story_launch_pkey',
  'story_launch_reserved_story_id_key',
  'story_launch_reserved_first_passage_id_key',
  'story_launch_generation_id_key',
  'story_launch_request_hash',
  'story_launch_state',
  'story_launch_ready_shape',
  'story_launch_public_reason',
  'story_launch_uncertain_explanation',
  'story_launch_owner_id_user_id_fk',
  'story_launch_generation_id_generation_id_fk',
];

async function expectViolation(
  client: Client,
  savepoint: string,
  run: () => Promise<void>,
  code: string,
): Promise<void> {
  await client.query(`SAVEPOINT ${savepoint}`);
  try {
    await run();
    assert.fail(`expected SQLSTATE ${code}`);
  } catch (error: unknown) {
    const pgError = error as { code?: string };
    assert.equal(pgError.code, code);
    await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
  }
}

test('WR07L T01: story_launch ledger constraints', async () => {
  const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as {
    entries: Array<{ tag: string }>;
  };
  assert.ok(
    journal.entries.some((e) => e.tag === '0019_wr05s_scene_checkpoint_schema'),
    'journal must retain 0019_wr05s_scene_checkpoint_schema',
  );
  assert.ok(
    journal.entries.some((e) => e.tag === '0020_wr07l_launch_ledger'),
    'journal must include 0020_wr07l_launch_ledger',
  );

  await applyMigrations(config, migrations);
  await applyMigrations(config, migrations);

  const client = new Client(config);
  await client.connect();
  try {
    await client.query('BEGIN');
    try {
      const userId = `user_${randomUUID()}`;
      await client.query(
        `INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
         VALUES ($1, 'WR07L', $2, true, now(), now())`,
        [userId, `${userId}@example.test`],
      );

      const pendingOperationId = randomUUID();
      const reservedStoryPending = randomUUID();
      const reservedPassagePending = randomUUID();
      await client.query(
        `INSERT INTO story_launch (
           owner_id, operation_id, request_hash, request,
           reserved_story_id, reserved_first_passage_id,
           generation_id, state, scene_sequence, public_reason, uncertain_explanation
         ) VALUES ($1, $2, $3, '{}'::jsonb, $4, $5, NULL, 'pending', NULL, NULL, NULL)`,
        [
          userId,
          pendingOperationId,
          requestHash,
          reservedStoryPending,
          reservedPassagePending,
        ],
      );
      const pendingRow = await client.query<{ state: string }>(
        `SELECT state FROM story_launch WHERE owner_id = $1 AND operation_id = $2`,
        [userId, pendingOperationId],
      );
      assert.equal(pendingRow.rows[0]?.state, 'pending');

      const generationId = randomUUID();
      await client.query(
        `INSERT INTO generation (id, owner_id, kind, input, state)
         VALUES ($1, $2, 'wr07l-test', '{}'::jsonb, 'pending')`,
        [generationId, userId],
      );

      const readyOperationId = randomUUID();
      const reservedStoryReady = randomUUID();
      const reservedPassageReady = randomUUID();
      await client.query(
        `INSERT INTO story_launch (
           owner_id, operation_id, request_hash, request,
           reserved_story_id, reserved_first_passage_id,
           generation_id, state, scene_sequence
         ) VALUES ($1, $2, $3, '{}'::jsonb, $4, $5, $6, 'ready', 1)`,
        [
          userId,
          readyOperationId,
          requestHash,
          reservedStoryReady,
          reservedPassageReady,
          generationId,
        ],
      );
      const readyRow = await client.query<{ scene_sequence: number }>(
        `SELECT scene_sequence FROM story_launch WHERE owner_id = $1 AND operation_id = $2`,
        [userId, readyOperationId],
      );
      assert.equal(readyRow.rows[0]?.scene_sequence, 1);

      const baseInsert = async (overrides: {
        operationId?: string;
        reservedStoryId?: string;
        reservedPassageId?: string;
        state?: string;
        sceneSequence?: number | null;
        generationId?: string | null;
        requestHash?: string;
        publicReason?: string | null;
        uncertainExplanation?: string | null;
      }) => {
        await client.query(
          `INSERT INTO story_launch (
             owner_id, operation_id, request_hash, request,
             reserved_story_id, reserved_first_passage_id,
             generation_id, state, scene_sequence, public_reason, uncertain_explanation
           ) VALUES ($1, $2, $3, '{}'::jsonb, $4, $5, $6, $7, $8, $9, $10)`,
          [
            userId,
            overrides.operationId ?? randomUUID(),
            overrides.requestHash ?? requestHash,
            overrides.reservedStoryId ?? randomUUID(),
            overrides.reservedPassageId ?? randomUUID(),
            overrides.generationId ?? null,
            overrides.state ?? 'pending',
            overrides.sceneSequence ?? null,
            overrides.publicReason ?? null,
            overrides.uncertainExplanation ?? null,
          ],
        );
      };

      await expectViolation(
        client,
        'wr07l_ready_no_gen',
        () =>
          baseInsert({
            state: 'ready',
            sceneSequence: 1,
            generationId: null,
          }),
        '23514',
      );

      await expectViolation(
        client,
        'wr07l_ready_bad_seq',
        () =>
          baseInsert({
            state: 'ready',
            sceneSequence: 2,
            generationId: randomUUID(),
          }),
        '23514',
      );

      await expectViolation(
        client,
        'wr07l_pending_seq',
        () => baseInsert({ state: 'pending', sceneSequence: 1 }),
        '23514',
      );

      await expectViolation(
        client,
        'wr07l_hash_upper',
        () => baseInsert({ requestHash: 'AB'.repeat(32) }),
        '23514',
      );

      await expectViolation(
        client,
        'wr07l_hash_short',
        () => baseInsert({ requestHash: 'ab'.repeat(16) }),
        '23514',
      );

      await expectViolation(
        client,
        'wr07l_held_rejected',
        () => baseInsert({ state: 'held', publicReason: 'rejected' }),
        '23514',
      );

      await expectViolation(
        client,
        'wr07l_failed_policy',
        () =>
          baseInsert({
            state: 'failed',
            publicReason: 'policy',
          }),
        '23514',
      );

      await expectViolation(
        client,
        'wr07l_pending_reason',
        () => baseInsert({ state: 'pending', publicReason: 'policy' }),
        '23514',
      );

      await expectViolation(
        client,
        'wr07l_uncertain_null',
        () => baseInsert({ state: 'uncertain', uncertainExplanation: null }),
        '23514',
      );

      await expectViolation(
        client,
        'wr07l_pending_explanation',
        () =>
          baseInsert({
            state: 'pending',
            uncertainExplanation: 'should not persist',
          }),
        '23514',
      );

      const dupStoryId = randomUUID();
      await expectViolation(
        client,
        'wr07l_dup_story',
        async () => {
          await baseInsert({ reservedStoryId: dupStoryId });
          await baseInsert({ reservedStoryId: dupStoryId });
        },
        '23505',
      );

      const names = await client.query<{ conname: string }>(
        `SELECT c.conname
         FROM pg_constraint c
         JOIN pg_class t ON c.conrelid = t.oid
         WHERE t.relname = 'story_launch'
           AND c.conname = ANY($1::text[])`,
        [expectedConstraints],
      );
      assert.equal(names.rows.length, expectedConstraints.length);
    } finally {
      await client.query('ROLLBACK');
    }
  } finally {
    await client.end();
  }
});
