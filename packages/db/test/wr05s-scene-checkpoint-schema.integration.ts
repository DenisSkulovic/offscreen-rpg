import assert from 'node:assert/strict';
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

const checkpointHash = 'ab'.repeat(32);

const expectedConstraints = [
  'story_scene_checkpoint_pkey',
  'story_scene_checkpoint_passage',
  'story_scene_checkpoint_operation',
  'story_scene_checkpoint_transition',
  'story_scene_checkpoint_sequence',
  'story_scene_checkpoint_hash',
  'story_scene_checkpoint_canon',
  'story_scene_checkpoint_opening',
  'story_scene_checkpoint_schema',
  'story_scene_checkpoint_story_id_story_id_fk',
  'story_scene_checkpoint_passage_id_story_passage_id_fk',
];

test('WR05S T02: story_scene_checkpoint schema versions 1 and 2', async () => {
  await applyMigrations(config, migrations);
  await applyMigrations(config, migrations);

  const client = new Client(config);
  await client.connect();
  try {
    await client.query('BEGIN');
    try {
      const def = await client.query<{ pg_get_constraintdef: string }>(
        `SELECT pg_get_constraintdef(oid) AS pg_get_constraintdef
         FROM pg_constraint
         WHERE conname = 'story_scene_checkpoint_schema'`,
      );
      const constraintDef = def.rows[0]?.pg_get_constraintdef ?? '';
      assert.ok(
        /IN \(1, 2\)/i.test(constraintDef) ||
          /=\s*ANY\s*\(\s*ARRAY\[1,\s*2\]\s*\)/i.test(constraintDef),
        `expected schema check to allow 1 and 2: ${constraintDef}`,
      );

      const userId = `user_${randomUUID()}`;
      await client.query(
        `INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
         VALUES ($1, 'WR05S', $2, true, now(), now())`,
        [userId, `${userId}@example.test`],
      );

      const storyId = randomUUID();
      await client.query(
        `INSERT INTO story (id, owner_id, source) VALUES ($1, $2, 'wr05s-test')`,
        [storyId, userId],
      );

      const passageV1 = randomUUID();
      const passageV2 = randomUUID();
      const passageV3 = randomUUID();
      await client.query(
        `INSERT INTO story_passage (id, story_id, sequence)
         VALUES ($1, $2, 1), ($3, $2, 2), ($4, $2, 3)`,
        [passageV1, storyId, passageV2, passageV3],
      );

      const operationV1 = randomUUID();
      const operationV2 = randomUUID();
      const transitionId = randomUUID();

      await client.query(
        `INSERT INTO story_scene_checkpoint (
           story_id, scene_sequence, passage_id, transition_id, operation_id,
           checkpoint_hash, canon_root_hash, canon_root_revision, state_schema_version, pins
         ) VALUES ($1, 1, $2, NULL, $3, $4, NULL, 0, 1, '{}'::jsonb)`,
        [storyId, passageV1, operationV1, checkpointHash],
      );
      await client.query(
        `INSERT INTO story_scene_checkpoint (
           story_id, scene_sequence, passage_id, transition_id, operation_id,
           checkpoint_hash, canon_root_hash, canon_root_revision, state_schema_version, pins
         ) VALUES ($1, 2, $2, $3, $4, $5, NULL, 0, 2, '{}'::jsonb)`,
        [storyId, passageV2, transitionId, operationV2, checkpointHash],
      );

      const operationV3 = randomUUID();
      const transitionV3 = randomUUID();
      await client.query('SAVEPOINT wr05s_schema_v3');
      try {
        await client.query(
          `INSERT INTO story_scene_checkpoint (
             story_id, scene_sequence, passage_id, transition_id, operation_id,
             checkpoint_hash, canon_root_hash, canon_root_revision, state_schema_version, pins
           ) VALUES ($1, 3, $2, $3, $4, $5, NULL, 0, 3, '{}'::jsonb)`,
          [storyId, passageV3, transitionV3, operationV3, checkpointHash],
        );
        assert.fail('state_schema_version 3 should violate check constraint');
      } catch (error: unknown) {
        const pgError = error as { code?: string };
        assert.equal(pgError.code, '23514');
        await client.query('ROLLBACK TO SAVEPOINT wr05s_schema_v3');
      }

      const names = await client.query<{ conname: string }>(
        `SELECT c.conname
         FROM pg_constraint c
         JOIN pg_class t ON c.conrelid = t.oid
         WHERE t.relname = 'story_scene_checkpoint'
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
