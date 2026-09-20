import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { betterAuth } from 'better-auth';
import { testUtils } from 'better-auth/plugins';
import {
  createDatabase,
  readDatabaseConfig,
  type Database,
} from '@offscreen/db';
import { applyMigrations } from '@offscreen/db/migrate';
import { startRuntime } from '@offscreen/worker/runtime';
import { createApp } from '@offscreen/api/app';
import type { ChamberStorytellerControl } from '@offscreen/application/developer-tools';
import type { StorytellerRuntimeOptions } from '@offscreen/application/storyteller';
import { authOptions } from '@offscreen/api/auth';
import { requireCookie } from './require.js';

const databaseURL = process.env['DATABASE_TEST_URL'];
if (!databaseURL || new URL(databaseURL).pathname !== '/offscreen_auth_test') {
  throw new Error(
    'DATABASE_TEST_URL must target the disposable offscreen_auth_test database.',
  );
}

type SessionLogin = {
  headers: Headers;
  token: string;
};

export type AppIntegration = {
  database: Database;
  origin: string;
  auth: {
    $context: Promise<{
      internalAdapter: {
        updateSession: (
          token: string,
          data: { expiresAt: Date; updatedAt?: Date },
        ) => Promise<unknown>;
      };
    }>;
  };
  helpers: {
    login: (args: { userId: string }) => Promise<SessionLogin>;
  };
  user: { id: string; name: string; email: string };
  otherUser: { id: string };
  ownerId: string;
  cookie: string;
  otherCookie: string;
  restartWorker: () => Promise<void>;
};

async function release(steps: ReadonlyArray<() => void | Promise<void>>) {
  const failures: unknown[] = [];
  for (const step of steps) {
    try {
      await step();
    } catch (error) {
      failures.push(error);
    }
  }
  if (failures.length === 0) {
    return;
  }
  if (failures.length === 1) {
    throw failures[0];
  }
  throw new AggregateError(failures, 'App integration cleanup failed');
}

/** Shared API/web/worker/session stack for selectable auth and story suites. */
export async function withAppIntegration(
  run: (context: AppIntegration) => Promise<void>,
  options: {
    chamberStorytellerControl?: ChamberStorytellerControl;
    storytellerRuntime?: StorytellerRuntimeOptions;
  } = {},
) {
  const config = readDatabaseConfig({ DATABASE_URL: databaseURL });
  await applyMigrations(
    config,
    fileURLToPath(
      new URL('../../../../../packages/db/migrations', import.meta.url),
    ),
  );
  const database = createDatabase(config, () => {});
  const origin = 'http://127.0.0.1:3100';
  const utilities = testUtils();
  const strictUtilities = {
    ...utilities,
    init(context: Parameters<typeof utilities.init>[0]) {
      const result = utilities.init(context);
      return { ...result, options: result.options ?? {} };
    },
  };
  const auth = betterAuth({
    ...authOptions(database, {
      origin,
      secret: 'integration-only-not-a-runtime-secret-1234',
      githubClientId: 'test-client',
      githubClientSecret: 'test-secret',
    }),
    plugins: [strictUtilities],
  });
  const app = await createApp(database, auth, origin, {
    developerTools: true,
    ...(options.chamberStorytellerControl
      ? { chamberStorytellerControl: options.chamberStorytellerControl }
      : {}),
  });
  const helpers = (await auth.$context).test;
  const user = await helpers.saveUser(
    helpers.createUser({ name: 'Integration Reader' }),
  );
  const otherUser = await helpers.saveUser(helpers.createUser());
  let web: ReturnType<typeof spawn> | undefined;
  let exited: Promise<unknown> | undefined;
  let runtime: Awaited<ReturnType<typeof startRuntime>> | undefined;
  const restartWorker = async () => {
    await runtime?.stop();
    runtime = await startRuntime(
      database,
      {
        address: process.env['TEMPORAL_ADDRESS'] ?? '127.0.0.1:7233',
        namespace: 'default',
        taskQueue: 'browser-integration',
      },
      () => {},
      options.storytellerRuntime,
    );
  };
  try {
    await app.listen(3001, '127.0.0.1');
    web = spawn(
      process.execPath,
      [
        'node_modules/next/dist/bin/next',
        'start',
        '--hostname',
        '127.0.0.1',
        '--port',
        '3100',
      ],
      {
        cwd: fileURLToPath(new URL('../../../../../apps/web', import.meta.url)),
        env: { ...process.env, API_INTERNAL_ORIGIN: 'http://127.0.0.1:3001' },
        stdio: 'ignore',
        windowsHide: true,
      },
    );
    exited = once(web, 'exit');
    let ready = false;
    for (let attempt = 0; attempt < 50; attempt++) {
      try {
        if ((await fetch(`${origin}/sign-in`)).ok) {
          ready = true;
          break;
        }
      } catch {
        /* server starting */
      }
      if (web.exitCode !== null) {
        throw new Error('Web server exited during startup');
      }
      await delay(200);
    }
    assert.ok(ready, 'Web server started');
    const login = await helpers.login({ userId: user.id });
    const cookie = requireCookie(login.headers);
    const otherLogin = await helpers.login({ userId: otherUser.id });
    const otherCookie = requireCookie(otherLogin.headers);
    await run({
      database,
      origin,
      auth,
      helpers,
      user,
      otherUser,
      ownerId: user.id,
      cookie,
      otherCookie,
      restartWorker,
    });
  } finally {
    await release([
      async () => {
        await runtime?.stop();
      },
      async () => {
        if (web) {
          web.kill();
          await exited;
        }
      },
      async () => {
        await database.db.$client.query(
          'DELETE FROM draft_opening WHERE draft_id IN (SELECT id FROM story_draft WHERE owner_id = $1)',
          [user.id],
        );
        await database.db.$client.query(
          'DELETE FROM outbox WHERE operation_id IN (SELECT id FROM generation WHERE owner_id = $1)',
          [user.id],
        );
        await database.db.$client.query(
          'DELETE FROM outbox WHERE operation_id IN (SELECT p.id FROM story_passage p JOIN story s ON s.id = p.story_id WHERE s.owner_id = $1)',
          [user.id],
        );
        await database.db.$client.query(
          'DELETE FROM story_resolution WHERE story_id IN (SELECT id FROM story WHERE owner_id = $1)',
          [user.id],
        );
        await database.db.$client.query(
          'DELETE FROM story_passage WHERE story_id IN (SELECT id FROM story WHERE owner_id = $1)',
          [user.id],
        );
        await database.db.$client.query(
          'DELETE FROM story_control WHERE story_id IN (SELECT id FROM story WHERE owner_id = $1)',
          [user.id],
        );
        await database.db.$client.query(
          'DELETE FROM story_item WHERE story_id IN (SELECT id FROM story WHERE owner_id = $1)',
          [user.id],
        );
        await database.db.$client.query(
          'DELETE FROM story_document_commit WHERE story_id IN (SELECT id FROM story WHERE owner_id = $1)',
          [user.id],
        );
        await database.db.$client.query(
          'DELETE FROM story WHERE owner_id = $1',
          [user.id],
        );
        // Only the disposable integration owner's artifacts; production retains billing evidence.
        await database.db.$client.query(
          'DELETE FROM storyteller_usage_allocation WHERE attempt_id IN (SELECT a.id FROM storyteller_attempt a JOIN generation g ON g.id = a.generation_id WHERE g.owner_id = $1)',
          [user.id],
        );
        await database.db.$client.query(
          'DELETE FROM storyteller_attempt WHERE generation_id IN (SELECT id FROM generation WHERE owner_id = $1)',
          [user.id],
        );
        await database.db.$client.query(
          'DELETE FROM storyteller_operation WHERE generation_id IN (SELECT id FROM generation WHERE owner_id = $1)',
          [user.id],
        );
        await database.db.$client.query(
          'DELETE FROM storyteller_retry WHERE generation_id IN (SELECT id FROM generation WHERE owner_id = $1)',
          [user.id],
        );
        await database.db.$client.query(
          'DELETE FROM storyteller_publication WHERE generation_id IN (SELECT id FROM generation WHERE owner_id = $1)',
          [user.id],
        );
        await database.db.$client.query(
          'DELETE FROM generation WHERE owner_id = $1',
          [user.id],
        );
        await database.db.$client.query(
          'DELETE FROM story_draft WHERE owner_id = $1',
          [user.id],
        );
      },
      async () => {
        await helpers.deleteUser(otherUser.id);
        await helpers.deleteUser(user.id);
      },
      async () => {
        await app.close();
      },
      async () => {
        await database.close();
      },
    ]);
  }
}
