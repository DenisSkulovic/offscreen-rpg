import { fileURLToPath } from 'node:url';
import { betterAuth } from 'better-auth';
import { testUtils } from 'better-auth/plugins';
import {
  createDatabase,
  readDatabaseConfig,
  type Database,
} from '@offscreen/db';
import { applyMigrations } from '@offscreen/db/migrate';
import { createApp } from '@offscreen/api/app';
import { authOptions } from '@offscreen/api/auth';
import { requireCookie } from './require.js';

const databaseURL = process.env['DATABASE_TEST_URL'];
if (!databaseURL || new URL(databaseURL).pathname !== '/offscreen_auth_test') {
  throw new Error(
    'DATABASE_TEST_URL must target the disposable offscreen_auth_test database.',
  );
}

export type ApiOnlyAuth = {
  database: Database;
  origin: string;
  helpers: {
    login: (args: { userId: string }) => Promise<{ headers: Headers }>;
  };
  user: { id: string; name: string; email: string };
  otherUser: { id: string; name: string; email: string };
  cookie: string;
  otherCookie: string;
};

/** Nest + Better Auth only (no Next/Temporal). For Admin session proofs. */
export async function withApiOnlyAuth(
  run: (context: ApiOnlyAuth) => Promise<void>,
) {
  const config = readDatabaseConfig({ DATABASE_URL: databaseURL });
  await applyMigrations(
    config,
    fileURLToPath(
      new URL('../../../../../packages/db/migrations', import.meta.url),
    ),
  );
  const database = createDatabase(config, () => {});
  const origin = 'http://127.0.0.1:3199';
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
      pocOpenAccess: false,
    }),
    plugins: [strictUtilities],
  });
  const app = await createApp(database, auth, origin);
  const helpers = (await auth.$context).test;
  const user = await helpers.saveUser(
    helpers.createUser({ name: 'Staff Candidate' }),
  );
  const otherUser = await helpers.saveUser(
    helpers.createUser({ name: 'Ordinary Player' }),
  );
  try {
    await app.listen(3199, '127.0.0.1');
    const login = await helpers.login({ userId: user.id });
    const cookie = requireCookie(login.headers);
    const otherLogin = await helpers.login({ userId: otherUser.id });
    const otherCookie = requireCookie(otherLogin.headers);
    await run({
      database,
      origin,
      helpers,
      user,
      otherUser,
      cookie,
      otherCookie,
    });
  } finally {
    await database.db.$client.query(
      `DELETE FROM admin_case_link WHERE case_id IN (
         SELECT id FROM admin_case WHERE created_by_staff_id IN (
           SELECT id FROM admin_staff_principal WHERE auth_user_id = ANY($1::text[])
         ) OR assigned_staff_id IN (
           SELECT id FROM admin_staff_principal WHERE auth_user_id = ANY($1::text[])
         )
       )`,
      [[user.id, otherUser.id]],
    );
    await database.db.$client.query(
      `DELETE FROM admin_case WHERE created_by_staff_id IN (
         SELECT id FROM admin_staff_principal WHERE auth_user_id = ANY($1::text[])
       ) OR assigned_staff_id IN (
         SELECT id FROM admin_staff_principal WHERE auth_user_id = ANY($1::text[])
       )`,
      [[user.id, otherUser.id]],
    );
    await database.db.$client.query(
      `DELETE FROM admin_audit_event WHERE auth_user_id = ANY($1::text[])
         OR staff_principal_id IN (
           SELECT id FROM admin_staff_principal WHERE auth_user_id = ANY($1::text[])
         )`,
      [[user.id, otherUser.id]],
    );
    await database.db.$client.query(
      `DELETE FROM admin_staff_session WHERE staff_principal_id IN (
         SELECT id FROM admin_staff_principal WHERE auth_user_id = ANY($1::text[])
       )`,
      [[user.id, otherUser.id]],
    );
    await database.db.$client.query(
      `DELETE FROM admin_capability_assignment WHERE staff_principal_id IN (
         SELECT id FROM admin_staff_principal WHERE auth_user_id = ANY($1::text[])
       )`,
      [[user.id, otherUser.id]],
    );
    await database.db.$client.query(
      `DELETE FROM admin_staff_principal WHERE auth_user_id = ANY($1::text[])`,
      [[user.id, otherUser.id]],
    );
    await helpers.deleteUser(otherUser.id);
    await helpers.deleteUser(user.id);
    await app.close();
    await database.close();
  }
}
