import { randomBytes } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
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
import {
  createChamberStorytellerControl,
  createLiveEvaluationManifest,
  createMemoryEvaluationManifest,
  preflightMemoryEvaluation,
} from '@offscreen/application/developer-tools';
import type { ExecutionPolicy } from '@offscreen/storyteller/tasks';
import { authOptions, createAuth } from '@offscreen/api/auth';
import { stopChamberResources } from './stop.js';
import { captureHeldOpeningPacket } from './packet-review.js';
import { createOpenRouterProvider } from '@offscreen/storyteller/providers/openrouter';
import {
  enableSingleLiveAttempt,
  closeSingleLiveAttempt,
  captureHeldContinuation,
  provisionAndPreflightLiveEvaluation,
  preflightAdditionalLiveEvaluation,
  releaseHeldPacket,
  saveLiveEvaluationReport,
  verifyOpenRouterAuthority,
  waitForGenerationTerminal,
} from './live-evaluation-run.js';
import { runMemoryEvaluation } from './memory-evaluation-run.js';
import {
  evaluationPacketAuthority,
  evaluationPacketInspectionSchema,
  memoryEvaluationPacketAuthority,
  readEvaluationPacketConfig,
  readMemoryEvaluationPacketConfig,
} from './evaluation-config.js';
import {
  LocalDocumentStore,
  importRulePackageDirectory,
} from '@offscreen/documents';
import { captureHeldMemoryPacket } from './memory-packet-review.js';

// An explicit local CLI, never imported by the production API or test discovery.
// It never loads dotenv files; only the two explicitly authorized run modes
// construct provider transport from an already-present process credential.
const smoke = process.argv.includes('--smoke');
const review = process.argv.includes('--review');
const packetReview = process.argv.includes('--packet-review');
const memoryPacketReview = process.argv.includes('--memory-packet-review');
const memoryEvaluationPacket = process.argv.includes(
  '--memory-evaluation-packet',
);
const memoryEvaluationRun = process.argv.includes('--memory-evaluation-run');
const evaluationPacket = process.argv.includes('--evaluation-packet');
const evaluationRun = process.argv.includes('--evaluation-run');
const storyMode = process.argv.includes('--story-mode');
const resetDatabase = process.argv.includes('--reset-database');
const configArgument = process.argv
  .slice(2)
  .find((argument) => argument.startsWith('--config='));
const authorizationArgument = process.argv
  .slice(2)
  .find((argument) => argument.startsWith('--authorize='));
const runModes = [
  smoke,
  review,
  packetReview,
  memoryPacketReview,
  memoryEvaluationPacket,
  memoryEvaluationRun,
  evaluationPacket,
  evaluationRun,
  storyMode,
].filter(Boolean);
if (
  runModes.length > 1 ||
  process.argv
    .slice(2)
    .some(
      (arg) =>
        ![
          '--smoke',
          '--review',
          '--packet-review',
          '--memory-packet-review',
          '--memory-evaluation-packet',
          '--memory-evaluation-run',
          '--evaluation-packet',
          '--evaluation-run',
          '--story-mode',
          '--reset-database',
          '--',
        ].includes(arg) &&
        !arg.startsWith('--config=') &&
        !arg.startsWith('--authorize='),
    )
) {
  throw new Error(
    'Use at most one run mode; evaluation packet modes also require --config=<path>.',
  );
}
if (
  (evaluationPacket ||
    evaluationRun ||
    memoryEvaluationPacket ||
    memoryEvaluationRun) !== Boolean(configArgument)
) {
  throw new Error('Evaluation modes require exactly one --config=<path>.');
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
const memoryDryRunProfile = {
  ...dryRunProfile,
  id: 'chamber-memory-dry-run.v1',
  limits: {
    ...dryRunProfile.limits,
    maxInputTokensPerRequest: 12_000,
    maxSerializedBytesPerRequest: 48_000,
    maxGeneratedTokensPerRequest: 2_048,
    maxInputTokensPerOperation: 24_000,
    maxGeneratedTokensPerOperation: 4_096,
    maxModelRoundsPerOperation: 2,
    maxReadsPerOperation: 1,
    maxRetainedReadBytes: 4_096,
  },
};
const memoryDryRunPolicy = resolveEffectiveUsagePolicy({
  platform: memoryDryRunProfile,
  entitlement: memoryDryRunProfile,
  restrictions: [],
  requestedRoute: dryRunRoute,
  requestedFundingMode: 'prepaid',
});
if (memoryDryRunPolicy.kind !== 'allowed') {
  throw new Error('Chamber memory dry-run policy is invalid');
}
const memoryDryRunExecution: ExecutionPolicy = {
  ...dryRunExecution,
  policy: {
    ...dryRunExecution.policy,
    version: 'chamber-memory-dry-run.v1',
    maxInputTokens: 12_000,
    maxOutputTokens: 2_048,
  },
};
const workspaceRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const evaluationConfig = configArgument
  ? memoryEvaluationPacket || memoryEvaluationRun
    ? null
    : await readEvaluationPacketConfig(
        resolve(workspaceRoot, configArgument.slice('--config='.length)),
      )
  : null;
const memoryEvaluationConfig =
  (memoryEvaluationPacket || memoryEvaluationRun) && configArgument
    ? await readMemoryEvaluationPacketConfig(
        resolve(workspaceRoot, configArgument.slice('--config='.length)),
      )
    : null;
const evaluationAuthority = evaluationConfig
  ? evaluationPacketAuthority(evaluationConfig)
  : null;
const memoryEvaluationAuthority = memoryEvaluationConfig
  ? memoryEvaluationPacketAuthority(memoryEvaluationConfig)
  : null;
if (
  evaluationRun &&
  authorizationArgument?.slice('--authorize='.length) !== evaluationConfig?.id
) {
  throw new Error(
    '--evaluation-run requires --authorize=<evaluation-id> matching the config.',
  );
}
if (
  memoryEvaluationRun &&
  authorizationArgument?.slice('--authorize='.length) !==
    memoryEvaluationConfig?.id
) {
  throw new Error(
    '--memory-evaluation-run requires --authorize=<evaluation-id> matching the config.',
  );
}
const evaluationPolicy =
  evaluationAuthority && evaluationConfig
    ? resolveEffectiveUsagePolicy({
        platform: evaluationAuthority.profile,
        entitlement: evaluationAuthority.profile,
        restrictions: [],
        requestedRoute: evaluationConfig.route.route,
        requestedFundingMode: 'prepaid',
      })
    : null;
const memoryEvaluationPolicy =
  memoryEvaluationAuthority && memoryEvaluationConfig
    ? resolveEffectiveUsagePolicy({
        platform: memoryEvaluationAuthority.profile,
        entitlement: memoryEvaluationAuthority.profile,
        restrictions: [],
        requestedRoute: memoryEvaluationConfig.route.route,
        requestedFundingMode: 'prepaid',
      })
    : null;
if (evaluationPolicy?.kind === 'denied') {
  throw new Error(`Evaluation usage policy denied: ${evaluationPolicy.reason}`);
}
if (memoryEvaluationPolicy?.kind === 'denied') {
  throw new Error(
    `Memory evaluation usage policy denied: ${memoryEvaluationPolicy.reason}`,
  );
}
const liveDispatchPolicy =
  evaluationPolicy?.kind === 'allowed'
    ? evaluationPolicy.policy
    : memoryEvaluationPolicy?.kind === 'allowed'
      ? memoryEvaluationPolicy.policy
      : null;
const gitCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
  cwd: workspaceRoot,
  encoding: 'utf8',
}).trim();
const gitDirty =
  execFileSync('git', ['status', '--porcelain'], {
    cwd: workspaceRoot,
    encoding: 'utf8',
  }).trim().length > 0;
const localDatabaseName = storyMode
  ? 'offscreen_story_local'
  : 'offscreen_chamber';
const databaseURL = storyMode
  ? (process.env['STORY_LOCAL_DATABASE_URL'] ??
    `postgresql://offscreen:local-development-only@127.0.0.1:5432/${localDatabaseName}`)
  : (process.env['CHAMBER_DATABASE_URL'] ??
    `postgresql://offscreen:local-development-only@127.0.0.1:5432/${localDatabaseName}`);
const parsedURL = new URL(databaseURL);
if (
  !['postgres:', 'postgresql:'].includes(parsedURL.protocol) ||
  !['127.0.0.1', 'localhost'].includes(parsedURL.hostname) ||
  parsedURL.pathname !== `/${localDatabaseName}` ||
  parsedURL.search
) {
  throw new Error(
    `Local ${storyMode ? 'Story mode' : 'Chamber'} requires the ${localDatabaseName} database, without connection query overrides.`,
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
  if (resetDatabase) {
    await admin.db.$client.query(
      `DROP DATABASE IF EXISTS ${localDatabaseName} WITH (FORCE)`,
    );
    console.log(`Reset disposable local ${localDatabaseName} database.`);
  }
  const exists = await admin.db.$client.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [localDatabaseName],
  );
  if (!exists.rowCount) {
    await admin.db.$client.query(`CREATE DATABASE ${localDatabaseName}`);
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
const openRouterApiKey =
  evaluationRun || memoryEvaluationRun
    ? (process.env['OPENROUTER_API_KEY'] ?? '')
    : '';
const creditsBefore =
  evaluationRun && evaluationConfig
    ? await verifyOpenRouterAuthority(evaluationConfig, openRouterApiKey)
    : memoryEvaluationRun && memoryEvaluationConfig
      ? await verifyOpenRouterAuthority(
          memoryEvaluationConfig,
          openRouterApiKey,
        )
      : null;
const storytellerControl = createChamberStorytellerControl();
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
const documentStore = new LocalDocumentStore(
  join(
    workspaceRoot,
    'data',
    storyMode ? 'story-local-documents' : 'chamber-documents',
  ),
);
const defaultRulePackage = await importRulePackageDirectory(
  documentStore,
  join(workspaceRoot, 'content', 'rules', 'srd-5.2.1-subset'),
);
let chamberUserId: string | undefined;
const localUserEmail = storyMode
  ? 'story-local@local.invalid'
  : 'chamber@local.invalid';
const chamberIdentity = {
  async requireUser() {
    if (!chamberUserId) throw new Error('Chamber identity is not provisioned');
    return {
      id: chamberUserId,
      name: 'Local Player',
      email: localUserEmail,
    };
  },
};
const app = await createApp(
  database,
  createAuth(database, authConfig),
  origin,
  {
    identity: chamberIdentity,
    documentStore,
    defaultRules: {
      ruleSetId: defaultRulePackage.manifest.ruleSetId,
      rootHash: defaultRulePackage.rootHash,
      revision: defaultRulePackage.manifest.revision,
      engine: defaultRulePackage.manifest.engine,
    },
    developerTools: !storyMode,
    ...(!storyMode ? { chamberStorytellerControl: storytellerControl } : {}),
    ...(packetReview ||
    memoryPacketReview ||
    memoryEvaluationPacket ||
    memoryEvaluationRun ||
    evaluationPacket ||
    evaluationRun
      ? {
          storytellerExecution:
            evaluationAuthority?.execution ??
            memoryEvaluationAuthority?.execution ??
            (memoryPacketReview ? memoryDryRunExecution : dryRunExecution),
          storytellerUsagePolicy:
            evaluationPolicy?.kind === 'allowed'
              ? evaluationPolicy.policy
              : memoryEvaluationPolicy?.kind === 'allowed'
                ? memoryEvaluationPolicy.policy
                : memoryPacketReview
                  ? memoryDryRunPolicy.policy
                  : dryRunPolicy.policy,
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
    [localUserEmail],
  );
  const userId =
    (existing.rows[0]?.id as string | undefined) ??
    (
      await helpers.saveUser(
        helpers.createUser({
          name: 'Local Player',
          email: localUserEmail,
        }),
      )
    ).id;
  chamberUserId = userId;
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
    (evaluationRun || memoryEvaluationRun) && liveDispatchPolicy
      ? {
          provider: createOpenRouterProvider({
            enabled: true,
            apiKey: openRouterApiKey,
            recordResponse: async (evidence) => {
              const parsed = JSON.parse(evidence.raw) as { id?: unknown };
              const providerId =
                typeof parsed.id === 'string' &&
                /^[a-zA-Z0-9_-]{1,200}$/.test(parsed.id)
                  ? parsed.id
                  : crypto.randomUUID();
              const directory = join(tmpdir(), 'offscreen-rpg-packet-review');
              await mkdir(directory, { recursive: true });
              await writeFile(
                join(directory, `provider-response-${providerId}.json`),
                `${JSON.stringify(evidence, null, 2)}\n`,
                { flag: 'wx' },
              );
            },
          }),
          dispatchAuthority: () => liveDispatchPolicy,
          documentStore,
        }
      : memoryPacketReview || memoryEvaluationPacket
        ? {
            provider: async () => {
              throw new Error(
                'Held memory packet attempted provider transport',
              );
            },
            dispatchAuthority: () =>
              memoryEvaluationPolicy?.kind === 'allowed'
                ? memoryEvaluationPolicy.policy
                : memoryDryRunPolicy.policy,
            documentStore,
          }
        : { scriptedGate: storytellerControl.evaluate, documentStore },
  );
  if (memoryPacketReview || memoryEvaluationPacket || memoryEvaluationRun) {
    const cookie = sessionCookiesFromLogin(login.headers.get('cookie'), origin)
      .map(({ name, value }) => `${name}=${value}`)
      .join('; ');
    const captured = await captureHeldMemoryPacket({
      apiOrigin: 'http://127.0.0.1:3001',
      browserOrigin: origin,
      cookie,
      database,
      documentStore,
      ownerId: userId,
      execution: memoryEvaluationAuthority?.execution ?? memoryDryRunExecution,
      usagePolicy:
        memoryEvaluationPolicy?.kind === 'allowed'
          ? memoryEvaluationPolicy.policy
          : memoryDryRunPolicy.policy,
    });
    if (memoryEvaluationConfig) {
      const expectedAllowance = {
        modelRounds: memoryEvaluationConfig.recipe.modelRounds,
        perRoundInputTokenCeiling:
          memoryEvaluationConfig.recipe.maxInputTokensPerRound,
        operationInputTokenCeiling:
          memoryEvaluationConfig.recipe.maxInputTokensPerOperation,
        perRequestSerializedByteCeiling:
          memoryEvaluationConfig.recipe.maxSerializedBytesPerRequest,
        operationGeneratedTokenCeiling:
          memoryEvaluationConfig.recipe.maxGeneratedTokensPerOperation,
        reads: memoryEvaluationConfig.recipe.retrievalReads,
        retainedReadByteCeiling:
          memoryEvaluationConfig.recipe.maxRetainedReadBytes,
      };
      if (
        JSON.stringify(captured.allowance) !== JSON.stringify(expectedAllowance)
      ) {
        throw new Error(
          'Captured memory task allowance does not match evaluation configuration',
        );
      }
      const inspection = evaluationPacketInspectionSchema.parse(
        captured.review.inspection,
      );
      const manifest = createMemoryEvaluationManifest({
        config: memoryEvaluationConfig,
        createdAt: new Date().toISOString(),
        review: {
          generationId: captured.review.generationId,
          attemptId: captured.review.attemptId,
          packetSha256: captured.review.packetSha256,
          state: captured.review.state,
          serializedBytes: inspection.serializedBytes,
        },
      });
      const preflight = preflightMemoryEvaluation({
        manifest,
        now: new Date().toISOString(),
        review: captured.review,
        accountingReady: true,
        traceReady: true,
      });
      if (!preflight.eligible) {
        throw new Error(
          `Memory evaluation preflight failed: ${preflight.failures.join(', ')}`,
        );
      }
      const manifestPath = join(
        dirname(captured.evidencePath),
        `memory-evaluation-manifest-${captured.review.attemptId}.json`,
      );
      await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, {
        flag: 'wx',
      });
      if (memoryEvaluationRun && creditsBefore) {
        console.log(
          `Held memory evaluation packet saved to ${captured.evidencePath}; manifest saved to ${manifestPath}. No provider attempt has occurred; beginning the explicitly authorized run.`,
        );
        const saved = await runMemoryEvaluation({
          apiOrigin: 'http://127.0.0.1:3001',
          browserOrigin: origin,
          cookie,
          database,
          directory: dirname(captured.evidencePath),
          config: memoryEvaluationConfig,
          firstManifest: manifest,
          firstReview: captured.review,
          creditsBefore,
          apiKey: openRouterApiKey,
        });
        console.log(
          `Memory live evaluation report saved to ${saved.path}. No retry is permitted.`,
        );
      } else {
        console.log(
          `Held memory evaluation packet saved to ${captured.evidencePath}; manifest saved to ${manifestPath}. Verified: memory state held, zero provider attempts. Model spend: $0 (no provider call).`,
        );
      }
    } else {
      console.log(
        `Held memory packet saved to ${captured.evidencePath}. Corpus: ${captured.corpus.scenes} passages, ${captured.corpus.evidence} canonical records. Verified: memory state held, zero provider attempts. Model spend: $0.`,
      );
    }
  } else if (packetReview || evaluationPacket || evaluationRun) {
    const cookie = sessionCookiesFromLogin(login.headers.get('cookie'), origin)
      .map(({ name, value }) => `${name}=${value}`)
      .join('; ');
    const {
      evidencePath,
      draftId,
      review: heldReview,
    } = await captureHeldOpeningPacket({
      apiOrigin: 'http://127.0.0.1:3001',
      browserOrigin: origin,
      cookie,
      database,
      ...(evaluationConfig
        ? { contentId: 'seyda-neen-arrival.v1' }
        : {}),
    });
    if (evaluationConfig) {
      const inspection = evaluationPacketInspectionSchema.parse(
        heldReview.inspection,
      );
      const { maxContextTokens: _maxContextTokens, ...route } =
        evaluationConfig.route;
      const manifest = createLiveEvaluationManifest({
        id: evaluationConfig.id,
        createdAt: new Date().toISOString(),
        case: evaluationConfig.case,
        review: {
          generationId: heldReview.generationId,
          packetSha256: heldReview.packetSha256,
          state: heldReview.state,
          serializedBytes: inspection.serializedBytes,
        },
        route,
        recipe: evaluationConfig.recipe,
      });
      const manifestPath = join(
        dirname(evidencePath),
        `evaluation-manifest-${heldReview.generationId}.json`,
      );
      await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, {
        flag: 'wx',
      });
      if (evaluationRun && creditsBefore) {
        await provisionAndPreflightLiveEvaluation({
          database,
          config: evaluationConfig,
          manifest,
          review: heldReview,
          credits: creditsBefore,
        });
        await enableSingleLiveAttempt(database, evaluationConfig);
        try {
          await releaseHeldPacket({
            apiOrigin: 'http://127.0.0.1:3001',
            browserOrigin: origin,
            cookie,
            review: heldReview,
          });
          const openingState = await waitForGenerationTerminal(
            database,
            heldReview.generationId,
          );
          const creditsAfterOpening = await verifyOpenRouterAuthority(
            evaluationConfig,
            openRouterApiKey,
          );
          const saved = await saveLiveEvaluationReport({
            database,
            directory: dirname(evidencePath),
            config: evaluationConfig,
            generationId: heldReview.generationId,
            creditsBefore,
            creditsAfter: creditsAfterOpening,
          });
          console.log(
            `Live evaluation report saved to ${saved.path}. No retry is permitted.`,
          );
          if (evaluationConfig.recipe.primaryCalls > 1) {
            if (openingState !== 'succeeded') {
              throw new Error(
                'Opening failed; the short playable loop cannot continue',
              );
            }
            const continuation = await captureHeldContinuation({
              apiOrigin: 'http://127.0.0.1:3001',
              browserOrigin: origin,
              cookie,
              draftId,
              openingGenerationId: heldReview.generationId,
              evidenceDirectory: dirname(evidencePath),
            });
            const continuationInspection =
              evaluationPacketInspectionSchema.parse(
                continuation.review.inspection,
              );
            const continuationManifest = createLiveEvaluationManifest({
              id: evaluationConfig.id,
              createdAt: new Date().toISOString(),
              case: evaluationConfig.case,
              review: {
                generationId: continuation.review.generationId,
                packetSha256: continuation.review.packetSha256,
                state: continuation.review.state,
                serializedBytes: continuationInspection.serializedBytes,
              },
              route,
              recipe: evaluationConfig.recipe,
            });
            preflightAdditionalLiveEvaluation({
              manifest: continuationManifest,
              review: continuation.review,
              credits: creditsAfterOpening,
              localAvailableMicrousd: BigInt(
                evaluationConfig.recipe.maxMicrousd,
              ),
            });
            const continuationManifestPath = join(
              dirname(evidencePath),
              `evaluation-manifest-${continuation.generationId}.json`,
            );
            await writeFile(
              continuationManifestPath,
              `${JSON.stringify(continuationManifest, null, 2)}\n`,
              { flag: 'wx' },
            );
            await releaseHeldPacket({
              apiOrigin: 'http://127.0.0.1:3001',
              browserOrigin: origin,
              cookie,
              review: continuation.review,
            });
            await waitForGenerationTerminal(
              database,
              continuation.generationId,
            );
            const creditsAfterContinuation = await verifyOpenRouterAuthority(
              evaluationConfig,
              openRouterApiKey,
            );
            const continuationReport = await saveLiveEvaluationReport({
              database,
              directory: dirname(evidencePath),
              config: evaluationConfig,
              generationId: continuation.generationId,
              creditsBefore: creditsAfterOpening,
              creditsAfter: creditsAfterContinuation,
            });
            console.log(
              `Continuation report saved to ${continuationReport.path}; selected ${continuation.selectedOption.id} (${continuation.selectedOption.label}).`,
            );
          }
        } finally {
          await closeSingleLiveAttempt(database, evaluationConfig);
        }
      }
      console.log(
        evaluationRun
          ? `Evaluation manifest saved to ${manifestPath}. The authorized one-shot run is terminal.`
          : `Evaluation manifest saved to ${manifestPath}. Funding remains disabled; explicit provisioning and release are still required.`,
      );
    }
    console.log(
      evaluationRun
        ? `Reviewed opening packet saved to ${evidencePath}. Its exact hash was released once after preflight; see the terminal report for spend and outcome.`
        : `API-only held opening packet saved to ${evidencePath}. Verified: awaiting review, zero provider attempts. Model spend: $0; no browser, provider call or reservation.`,
    );
  } else {
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
    await page.goto(`${origin}${storyMode ? '/stories' : '/chamber'}`);
    if (!storyMode) {
      await page
        .getByRole('button', { name: 'Start scripted chamber' })
        .waitFor();
      await page.getByRole('combobox', { name: 'Scenario' }).waitFor();
    }
    if (review) {
      const evidenceDirectory = join(tmpdir(), 'offscreen-rpg-review');
      await mkdir(evidenceDirectory, { recursive: true });
      await page.goto(`${origin}/stories/new`);
      await page
        .getByLabel('Choose your storyteller')
        .selectOption('quiet-eerie-mystery/1');
      await page
        .getByLabel('Who are you, and where does this begin?')
        .fill('I am SpongeBob in the pineapple with Gary.');
      await page
        .getByRole('button', { name: 'Save draft', exact: true })
        .click();
      await page
        .getByRole('link', { name: 'Review opening candidate' })
        .click();
      await page
        .getByLabel('Opening seed')
        .selectOption('pineapple-mechanics.v4');
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
      await page
        .getByRole('button', { name: 'Start story', exact: true })
        .click();
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
      await page
        .getByRole('button', { name: 'Start scripted chamber' })
        .click();
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
      const localIdentity = await fetch(`${origin}/api/me`);
      if (
        !localIdentity.ok ||
        (await localIdentity.json() as { email?: unknown }).email !==
          localUserEmail
      ) {
        throw new Error('Chamber local identity was not available.');
      }
      console.log(
        'Local launcher smoke passed: loopback identity, play, inspector, transfer and reload. Model spend: $0; no provider calls.',
      );
    } else {
      console.log(
        storyMode
          ? 'Local Story mode opened at http://127.0.0.1:3100/stories. It uses ordinary player pages, a dedicated persistent local database and no Chamber tools. Model spend: $0; no provider calls.'
          : packetReview
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
  }
} finally {
  await stop();
}
