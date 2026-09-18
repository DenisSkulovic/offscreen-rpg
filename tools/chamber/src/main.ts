import { randomBytes } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { betterAuth } from 'better-auth';
import { testUtils } from 'better-auth/plugins';
import { chromium } from 'playwright';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { applyMigrations } from '@offscreen/db/migrate';
import { startRuntime } from '@offscreen/worker/runtime';
import { createApp } from '@offscreen/api/app';
import { authOptions, createAuth } from '@offscreen/api/auth';
import { stopChamberResources } from './stop.js';

// An explicit local CLI, never imported by the production API or test discovery.
// Does not load .env or .env.openrouter and has no model/provider dependency.
const smoke = process.argv.includes('--smoke');
if (process.argv.slice(2).some((arg) => arg !== '--smoke')) {
  throw new Error('Only --smoke is supported.');
}
const origin = 'http://127.0.0.1:3100';
const workspaceRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const gitCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
  cwd: workspaceRoot,
  encoding: 'utf8',
}).trim();
const gitDirty =
  execFileSync('git', ['status', '--porcelain'], {
    cwd: workspaceRoot,
    encoding: 'utf8',
  }).trim().length > 0;
const databaseURL =
  process.env['CHAMBER_DATABASE_URL'] ??
  'postgresql://offscreen:local-development-only@127.0.0.1:5432/offscreen_chamber';
const parsedURL = new URL(databaseURL);
if (
  !['postgres:', 'postgresql:'].includes(parsedURL.protocol) ||
  !['127.0.0.1', 'localhost'].includes(parsedURL.hostname) ||
  parsedURL.pathname !== '/offscreen_chamber' ||
  parsedURL.search
) {
  throw new Error(
    'Chamber requires the local offscreen_chamber database, without connection query overrides.',
  );
}
function sessionCookiesFromLogin(
  cookieHeader: string | null,
  cookieOrigin: string,
) {
  if (!cookieHeader) {
    throw new Error('Provisioning did not return a session cookie');
  }
  return cookieHeader.split(';').map((part) => {
    const at = part.indexOf('=');
    return {
      name: part.slice(0, at).trim(),
      value: part.slice(at + 1).trim(),
      url: cookieOrigin,
    };
  });
}
async function requireFreePort(port: number) {
  const probe = createServer();
  await new Promise<void>((resolve, reject) => {
    probe.once('error', () => {
      reject(
        new Error(
          `Port ${port} is occupied. Stop that development process first.`,
        ),
      );
    });
    probe.listen(port, '127.0.0.1', () => {
      probe.close((error) => (error ? reject(error) : resolve()));
    });
  });
}
await requireFreePort(3001);
await requireFreePort(3100);
const adminURL = new URL(databaseURL);
adminURL.pathname = '/postgres';
const admin = createDatabase(
  readDatabaseConfig({ DATABASE_URL: adminURL.href }),
  () => {},
);
try {
  const exists = await admin.db.$client.query(
    "SELECT 1 FROM pg_database WHERE datname = 'offscreen_chamber'",
  );
  if (!exists.rowCount) {
    await admin.db.$client.query('CREATE DATABASE offscreen_chamber');
  }
} finally {
  await admin.close();
}
const config = readDatabaseConfig({ DATABASE_URL: databaseURL });
await applyMigrations(
  config,
  fileURLToPath(new URL('../../../../packages/db/migrations', import.meta.url)),
);
const database = createDatabase(config, () => {});
const authConfig = {
  origin,
  secret: randomBytes(32).toString('hex'),
  githubClientId: 'local-unused',
  githubClientSecret: 'local-unused',
};
// Provision through existing library test utilities, but never mount that plugin in the API.
const utilities = testUtils();
type ProvisioningHelpers = NonNullable<
  ReturnType<typeof utilities.init>['context']
>['test'];
const provisioner = betterAuth({
  ...authOptions(database, authConfig),
  plugins: [
    {
      ...utilities,
      init(context: Parameters<typeof utilities.init>[0]) {
        const result = utilities.init(context);
        return { ...result, options: result.options ?? {} };
      },
    },
  ],
});
const app = await createApp(
  database,
  createAuth(database, authConfig),
  origin,
  {
    developerTools: true,
    qaContext: {
      git: { commit: gitCommit, dirty: gitDirty },
      environment: { identity: 'local-chamber' },
    },
  },
);
let runtime: Awaited<ReturnType<typeof startRuntime>> | undefined;
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
let web: ReturnType<typeof spawn> | undefined;
let webExit: Promise<unknown> | undefined;
let stopping: Promise<void> | undefined;
const stop = () =>
  (stopping ??= stopChamberResources({
    browser,
    runtime,
    web,
    webExit,
    app,
    database,
  }));
process.once('SIGINT', () => {
  void stop();
});
process.once('SIGTERM', () => {
  void stop();
});
try {
  const provisionContext = await provisioner.$context;
  // better-auth plugins augment context dynamically; retain that exact plugin type here.
  const helpers = (
    provisionContext as typeof provisionContext & { test: ProvisioningHelpers }
  ).test;
  const existing = await database.db.$client.query(
    'SELECT id FROM "user" WHERE email = $1',
    ['chamber@local.invalid'],
  );
  const userId =
    (existing.rows[0]?.id as string | undefined) ??
    (
      await helpers.saveUser(
        helpers.createUser({
          name: 'Local Player',
          email: 'chamber@local.invalid',
        }),
      )
    ).id;
  const login = await helpers.login({ userId });
  await app.listen(3001, '127.0.0.1');
  runtime = await startRuntime(
    database,
    {
      address: '127.0.0.1:7233',
      namespace: 'default',
      taskQueue: 'local-chamber',
    },
    () => {},
  );
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
      cwd: fileURLToPath(new URL('../../../../apps/web', import.meta.url)),
      env: {
        PATH: process.env['PATH'],
        SYSTEMROOT: process.env['SYSTEMROOT'],
        TEMP: process.env['TEMP'],
        TMP: process.env['TMP'],
        NODE_ENV: 'production',
        API_INTERNAL_ORIGIN: 'http://127.0.0.1:3001',
      },
      windowsHide: true,
      stdio: 'ignore',
    },
  );
  webExit = once(web, 'exit');
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (web.exitCode !== null) {
      throw new Error('Web server stopped during startup.');
    }
    try {
      if ((await fetch(`${origin}/sign-in`)).ok) {
        ready = true;
        break;
      }
    } catch {
      /* starting */
    }
    await delay(200);
  }
  if (!ready) {
    throw new Error('Web server did not become ready.');
  }
  browser = await chromium.launch({ headless: smoke });
  const launchedBrowser = browser;
  const context = await launchedBrowser.newContext();
  await context.addCookies(
    sessionCookiesFromLogin(login.headers.get('cookie'), origin),
  );
  const page = await context.newPage();
  await page.goto(`${origin}/chamber`);
  await page.getByRole('button', { name: 'Start scripted chamber' }).waitFor();
  await page.getByRole('combobox', { name: 'Scenario' }).waitFor();
  if (smoke) {
    await page
      .getByRole('combobox', { name: 'Scenario' })
      .selectOption('chamber.v5');
    await page
      .getByRole('region', { name: 'Selected scenario purpose' })
      .getByText('authoritative item transfer', { exact: false })
      .waitFor();
    await page.getByRole('button', { name: 'Start scripted chamber' }).click();
    await page.getByRole('region', { name: 'Inspector' }).waitFor();
    await page
      .getByRole('button', { name: 'Give the letter to the caretaker' })
      .click();
    await page.getByRole('heading', { name: 'Letter delivered.' }).waitFor();
    await page
      .getByRole('region', { name: 'Inspector' })
      .getByText('held by caretaker', { exact: false })
      .waitFor();
    await page.reload();
    await page
      .getByText('Sealed letter — held by caretaker', { exact: true })
      .waitFor();
    await page
      .getByRole('region', { name: 'Inspector' })
      .getByText('held by caretaker', { exact: false })
      .waitFor();
    const unauthenticated = await fetch(`${origin}/api/me`);
    if (unauthenticated.status !== 401) {
      throw new Error('Anonymous access was not rejected.');
    }
    console.log(
      'Local launcher smoke passed: authenticated play, inspector, transfer, reload and anonymous rejection. Model spend: $0; no provider calls.',
    );
  } else {
    console.log(
      'Scripted chamber opened. Bookmark story URLs to reopen them in this browser session. Data persists in offscreen_chamber. Close the browser or press Ctrl+C to stop local execution. Model spend: $0; no provider calls.',
    );
    await Promise.race([
      new Promise<void>((resolve) => {
        launchedBrowser.once('disconnected', () => resolve());
      }),
      runtime.done.then(() => {
        if (!stopping) {
          throw new Error('Worker stopped.');
        }
      }),
      webExit.then(() => {
        if (!stopping) {
          throw new Error('Web server stopped.');
        }
      }),
    ]);
  }
} finally {
  await stop();
}
