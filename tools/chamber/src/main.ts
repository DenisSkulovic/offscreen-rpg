import { randomBytes } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { betterAuth } from 'better-auth';
import { testUtils } from 'better-auth/plugins';
import { chromium } from 'playwright';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { applyMigrations } from '@offscreen/db/migrate';
import { startRuntime } from '@offscreen/worker/runtime';
import { createApp } from '@offscreen/api/app';
import { resolveEffectiveUsagePolicy } from '@offscreen/application/storyteller';
import type { ExecutionPolicy } from '@offscreen/storyteller/tasks';
import { latestOpeningSchema } from '@offscreen/contracts/openings';
import { dispatchReviewResponseSchema } from '@offscreen/contracts/chamber';
import { authOptions, createAuth } from '@offscreen/api/auth';
import { stopChamberResources } from './stop.js';

// An explicit local CLI, never imported by the production API or test discovery.
// Does not load .env or .env.openrouter and has no model/provider dependency.
const smoke = process.argv.includes('--smoke');
const review = process.argv.includes('--review');
const packetReview = process.argv.includes('--packet-review');
if (
  [smoke, review, packetReview].filter(Boolean).length > 1 ||
  process.argv
    .slice(2)
    .some((arg) => !['--smoke', '--review', '--packet-review'].includes(arg))
) {
  throw new Error('Use at most one of --smoke, --review or --packet-review.');
}
const origin = 'http://127.0.0.1:3100';
const dryRunRoute = 'openrouter:dry-run-unselected';
const dryRunProfile = {
  schemaVersion: 1 as const,
  id: 'chamber-dry-run.v1',
  revision: 1,
  enabled: true,
  allowedRoutes: [dryRunRoute],
  defaultRoute: dryRunRoute,
  fundingModes: ['prepaid' as const],
  recovery: 'explicit-resume' as const,
  limits: {
    maxInputTokensPerRequest: 8_000,
    maxSerializedBytesPerRequest: 32_000,
    maxGeneratedTokensPerRequest: 1_024,
    maxReasoningTokensPerRequest: 0,
    maxInputTokensPerOperation: 8_000,
    maxGeneratedTokensPerOperation: 1_024,
    maxModelRoundsPerOperation: 1,
    maxReadsPerOperation: 0,
    maxRetainedReadBytes: 0,
    maxMicrousdPerOperation: '10000',
    maxInFlightDispatches: 1,
    maxBackgroundJobsPerWindow: 0,
  },
  windows: [],
};
const dryRunPolicy = resolveEffectiveUsagePolicy({
  platform: dryRunProfile,
  entitlement: dryRunProfile,
  restrictions: [],
  requestedRoute: dryRunRoute,
  requestedFundingMode: 'prepaid',
});
if (dryRunPolicy.kind !== 'allowed') {
  throw new Error('Chamber dry-run policy is invalid');
}
// This deliberately names no purchasable model and carries zero prices. It is
// only capable of building a representative packet; the mandatory hold occurs
// before provider construction, funding reservation, or network I/O.
const dryRunExecution: ExecutionPolicy = {
  mode: 'provider',
  accountId: '00000000-0000-4000-8000-000000000001',
  runId: '00000000-0000-4000-8000-000000000002',
  dispatchReview: { mode: 'hold' },
  policy: {
    version: 'chamber-dry-run.v1',
    route: dryRunRoute,
    model: 'dry-run/model-not-selected',
    provider: 'openrouter',
    priceVersion: 'unpriced-dry-run',
    inputMicrousdPerMillion: '0',
    outputMicrousdPerMillion: '0',
    maxInputTokens: 8_000,
    maxOutputTokens: 1_024,
    timeoutMs: 30_000,
  },
};
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
    ...(packetReview
      ? {
          storytellerExecution: dryRunExecution,
          storytellerUsagePolicy: dryRunPolicy.policy,
        }
      : {}),
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
  // Review mode uses the launcher's authenticated production path and saves
  // disposable visual evidence. This avoids introducing test-only auth routes
  // merely to let an automated reviewer see the same pages as a local player.
  browser = await chromium.launch({ headless: smoke || review });
  const launchedBrowser = browser;
  const context = await launchedBrowser.newContext();
  await context.addCookies(
    sessionCookiesFromLogin(login.headers.get('cookie'), origin),
  );
  const page = await context.newPage();
  await page.goto(`${origin}/chamber`);
  await page.getByRole('button', { name: 'Start scripted chamber' }).waitFor();
  await page.getByRole('combobox', { name: 'Scenario' }).waitFor();
  if (packetReview) {
    await page.goto(`${origin}/stories/new`);
    await page
      .getByLabel('Choose your storyteller')
      .selectOption('quiet-eerie-mystery/1');
    await page
      .getByLabel('Who are you, and where does this begin?')
      .fill(
        'I am a newly arrived prisoner in Seyda Neen. I have little money, no local standing, and want to reach Balmora without the world waiting passively for me.',
      );
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await page
      .getByRole('link', { name: 'Review opening candidate' })
      .click();
    await page
      .getByRole('button', { name: 'Generate opening candidate', exact: true })
      .click();
    await page
      .getByRole('heading', { name: 'Held before provider dispatch' })
      .waitFor({ timeout: 30000 });
    const draftId = new URL(page.url()).pathname.split('/')[2];
    if (!draftId) throw new Error('Missing packet-review draft identity');
    const latest = latestOpeningSchema.parse(
      await context.request
        .get(`${origin}/api/drafts/${draftId}/openings/latest`)
        .then((response) => response.json()),
    );
    if (!latest.preview) throw new Error('Missing held opening');
    const captured = dispatchReviewResponseSchema.parse(
      await context.request
        .get(
          `${origin}/api/chamber-tools/generations/${latest.preview.id}/dispatch-review`,
        )
        .then((response) => response.json()),
    );
    const evidenceDirectory = join(tmpdir(), 'offscreen-rpg-packet-review');
    await mkdir(evidenceDirectory, { recursive: true });
    const evidencePath = join(evidenceDirectory, 'opening-request.json');
    await writeFile(evidencePath, `${JSON.stringify(captured, null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'w',
    });
    console.log(
      `Held opening packet saved to ${evidencePath}. Browser remains open for inspection. Model spend: $0; no provider calls, reservations or attempts.`,
    );
  } else if (review) {
    const evidenceDirectory = join(tmpdir(), 'offscreen-rpg-review');
    await mkdir(evidenceDirectory, { recursive: true });
    await page.goto(`${origin}/stories/new`);
    await page
      .getByLabel('Choose your storyteller')
      .selectOption('quiet-eerie-mystery/1');
    await page
      .getByLabel('Who are you, and where does this begin?')
      .fill('I am SpongeBob in the pineapple with Gary.');
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await page
      .getByRole('link', { name: 'Review opening candidate' })
      .click();
    await page.getByLabel('Opening seed').selectOption('pineapple-mechanics.v4');
    await page
      .getByRole('button', {
        name: 'Generate opening candidate',
        exact: true,
      })
      .click();
    await page
      .getByRole('button', { name: 'Start story', exact: true })
      .waitFor({ timeout: 30000 });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({
      path: join(evidenceDirectory, 'opening-wide.png'),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: join(evidenceDirectory, 'opening-narrow.png'),
      fullPage: true,
    });
    await page.getByRole('button', { name: 'Start story', exact: true }).click();
    await page.waitForURL('**/play/**');
    await page
      .getByRole('button', { name: 'Slip behind the sofa', exact: true })
      .waitFor({ timeout: 30000 });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({
      path: join(evidenceDirectory, 'play-wide.png'),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: join(evidenceDirectory, 'play-narrow.png'),
      fullPage: true,
    });
    console.log(
      `Local review evidence saved to ${evidenceDirectory}. Model spend: $0; no provider calls.`,
    );
  } else if (smoke) {
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
      packetReview
        ? 'Held-packet Chamber opened. Create a draft and generate its opening to inspect the exact credential-free request before dispatch. The configured route is deliberately unpriced and model-unselected; release is unavailable. Model spend: $0; no provider calls.'
        : 'Scripted chamber opened. Bookmark story URLs to reopen them in this browser session. Data persists in offscreen_chamber. Close the browser or press Ctrl+C to stop local execution. Model spend: $0; no provider calls.',
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
