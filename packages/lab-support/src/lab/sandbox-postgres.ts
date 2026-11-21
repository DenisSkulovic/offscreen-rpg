/**
 * Live disposable Sandbox Postgres: DROP/CREATE + specimen store.
 * Only after confirmDisposableProvision + sandbox URL guard.
 */
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { applyMigrations } from '@offscreen/db/migrate';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  assertDestructiveSandboxProvisionAllowed,
  buildSandboxDatabaseUrl,
  sandboxDatabaseNameForRun,
} from './sandbox-guard.js';
import type { FixtureSpecimen } from './fixture-specimens.js';
import type { SandboxPublicSummary, SandboxStore } from './sandbox-materializer.js';

const SPECIMEN_DDL = `
CREATE TABLE IF NOT EXISTS chamber_lab_specimen (
  run_id text NOT NULL,
  story_id uuid NOT NULL,
  fixture_id text NOT NULL,
  fixture_version integer NOT NULL,
  fixture_hash text NOT NULL,
  state jsonb NOT NULL,
  PRIMARY KEY (run_id, story_id)
)`;

type Db = ReturnType<typeof createDatabase>;

async function query(
  database: Db,
  text: string,
  params: unknown[] = [],
): Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }> {
  const client = database.db.$client as {
    query: (
      text: string,
      params?: unknown[],
    ) => Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }>;
  };
  return client.query(text, params);
}

function adminUrl(): string {
  return 'postgresql://offscreen:local-development-only@127.0.0.1:5432/postgres';
}

function migrationsDir(): string {
  const candidates = [
    join(process.cwd(), 'packages/db/migrations'),
    join(process.cwd(), '../../packages/db/migrations'),
    join(process.cwd(), '../db/migrations'),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(
    `Cannot locate packages/db/migrations from cwd ${process.cwd()}`,
  );
}

export async function provisionDisposableSandboxDatabase(args: {
  runId: string;
  confirmDisposableProvision: boolean;
  applyFullMigrations?: boolean;
}): Promise<{
  connectionString: string;
  databaseName: string;
  runId: string;
}> {
  const connectionString = buildSandboxDatabaseUrl({ runId: args.runId });
  const target = assertDestructiveSandboxProvisionAllowed({
    connectionString,
    runId: args.runId,
    confirmDisposableProvision: args.confirmDisposableProvision,
  });
  const admin = createDatabase(
    readDatabaseConfig({ DATABASE_URL: adminUrl() }),
    () => {},
  );
  try {
    await query(admin, `DROP DATABASE IF EXISTS ${target.databaseName} WITH (FORCE)`);
    await query(admin, `CREATE DATABASE ${target.databaseName}`);
  } finally {
    await admin.close();
  }

  if (args.applyFullMigrations === true) {
    await applyMigrations(
      readDatabaseConfig({ DATABASE_URL: target.connectionString }),
      migrationsDir(),
    );
  } else {
    const database = createDatabase(
      readDatabaseConfig({ DATABASE_URL: target.connectionString }),
      () => {},
    );
    try {
      await query(database, SPECIMEN_DDL);
    } finally {
      await database.close();
    }
  }

  return {
    connectionString: target.connectionString,
    databaseName: target.databaseName,
    runId: args.runId,
  };
}

export async function destroyDisposableSandboxDatabase(args: {
  runId: string;
  confirmDisposableProvision: boolean;
}): Promise<void> {
  const connectionString = buildSandboxDatabaseUrl({ runId: args.runId });
  const target = assertDestructiveSandboxProvisionAllowed({
    connectionString,
    runId: args.runId,
    confirmDisposableProvision: args.confirmDisposableProvision,
  });
  const admin = createDatabase(
    readDatabaseConfig({ DATABASE_URL: adminUrl() }),
    () => {},
  );
  try {
    await query(
      admin,
      `DROP DATABASE IF EXISTS ${target.databaseName} WITH (FORCE)`,
    );
  } finally {
    await admin.close();
  }
}

function summarizeFromState(
  storyId: string,
  state: FixtureSpecimen['state'],
  fixtureHash: string,
): SandboxPublicSummary {
  const progressRatio =
    state.acceptedPlan &&
    state.activityProgress &&
    state.acceptedPlan.action.process.kind === 'clock-wait.v1' &&
    state.activityProgress.process.kind === 'clock-wait.v1'
      ? state.activityProgress.process.elapsedFictionalSeconds /
        state.acceptedPlan.action.process.requiredFictionalSeconds
      : null;
  return {
    storyId,
    gameSecond: state.gameSecond,
    progressRatio,
    itemKeys: state.items.map((item) => item.key),
    itemHolders: Object.fromEntries(
      state.items.map((item) => [item.key, item.holderKey]),
    ),
    decisionDueGameSecond: state.decision?.dueGameSecond ?? null,
    fixtureHash,
  };
}

export function createPostgresSandboxStore(
  connectionString: string,
): SandboxStore {
  const database = createDatabase(
    readDatabaseConfig({ DATABASE_URL: connectionString }),
    () => {},
  );
  return {
    kind: 'postgres',
    async writeSpecimen(args) {
      await query(
        database,
        `INSERT INTO chamber_lab_specimen
          (run_id, story_id, fixture_id, fixture_version, fixture_hash, state)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)
         ON CONFLICT (run_id, story_id) DO UPDATE SET
           fixture_id = EXCLUDED.fixture_id,
           fixture_version = EXCLUDED.fixture_version,
           fixture_hash = EXCLUDED.fixture_hash,
           state = EXCLUDED.state`,
        [
          args.runId,
          args.storyId,
          args.specimen.recipe.id,
          args.specimen.recipe.version,
          args.specimen.hash,
          JSON.stringify(args.specimen.state),
        ],
      );
    },
    async readSummary(args) {
      const result = await query(
        database,
        `SELECT story_id, fixture_hash, state
         FROM chamber_lab_specimen
         WHERE run_id = $1 AND story_id = $2`,
        [args.runId, args.storyId],
      );
      const row = result.rows[0] as
        | { story_id: string; fixture_hash: string; state: unknown }
        | undefined;
      if (!row) return null;
      return summarizeFromState(
        row.story_id,
        row.state as FixtureSpecimen['state'],
        row.fixture_hash,
      );
    },
    async mutateItemHolder(args) {
      const result = await query(
        database,
        `SELECT state FROM chamber_lab_specimen
         WHERE run_id = $1 AND story_id = $2`,
        [args.runId, args.storyId],
      );
      const row = result.rows[0] as
        | { state: FixtureSpecimen['state'] }
        | undefined;
      if (!row) throw new Error('Unknown sandbox story');
      const state = structuredClone(row.state);
      const item = state.items.find((entry) => entry.key === args.itemKey);
      if (!item) throw new Error('Unknown sandbox item');
      item.holderKey = args.holderKey;
      await query(
        database,
        `UPDATE chamber_lab_specimen SET state = $3::jsonb
         WHERE run_id = $1 AND story_id = $2`,
        [args.runId, args.storyId, JSON.stringify(state)],
      );
    },
    async close() {
      await database.close();
    },
  };
}

export function expectedSandboxDatabaseName(runId: string): string {
  return sandboxDatabaseNameForRun(runId);
}
