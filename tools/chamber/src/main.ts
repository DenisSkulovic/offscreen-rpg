/**
 * Local Chamber launcher: child processes, auth bootstrap and eval harness
 * wiring. Must not own application use cases; see
 * @offscreen/lab-support/chamber.ts for the composed facade.
 */
import { randomBytes } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
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
import { createLabApp } from '@offscreen/api-lab/create-lab-app';
import { resolveEffectiveUsagePolicy } from '@offscreen/story-engine/storyteller';
import {
  createChamberStorytellerControl,
  createLiveEvaluationManifest,
  createMemoryEvaluationManifest,
  preflightMemoryEvaluation,
} from '@offscreen/lab-support';
import type { ExecutionPolicy } from '@offscreen/storyteller/tasks';
import type { StartPackageReference } from '@offscreen/contracts/campaign';
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
  importRulePackageDirectory,
  importStartPackageDirectory,
  importWorldPackageDirectory,
} from '@offscreen/content-packages';
import { LocalDocumentStore } from '@offscreen/documents';
import {
  captureHeldMemoryComparisonPackets,
  captureHeldMemoryPacket,
} from './memory-packet-review.js';
import { parseLauncherFlags } from './modes/cli-flags.js';
import {
  evaluationAuthorizationDenial,
  planLaunch,
} from './modes/plan-launch.js';
import { createLocalStoryProvider } from './story-provider.js';
import {
  bootstrapLocalStoryFunding,
  describeStoryFundingDenial,
  pinnedLocalStoryDispatchAuthority,
} from './story-funding.js';

// An explicit local CLI, never imported by the production API or test discovery.
// It never loads dotenv files; only the two explicitly authorized run modes
// construct provider transport from an already-present process credential.

const launcherFlags = parseLauncherFlags(process.argv.slice(2));
const smoke = launcherFlags.smoke;
const forensicCampaigns = launcherFlags.forensicCampaigns;
const review = launcherFlags.review;
const packetReview = launcherFlags.packetReview;
const memoryPacketReview = launcherFlags.memoryPacketReview;
const memoryComparisonPackets = launcherFlags.memoryComparisonPackets;
const memoryEvaluationPacket = launcherFlags.memoryEvaluationPacket;
const memoryEvaluationRun = launcherFlags.memoryEvaluationRun;
const evaluationPacket = launcherFlags.evaluationPacket;
const evaluationRun = launcherFlags.evaluationRun;
const storyMode = launcherFlags.storyMode;
const noBrowser = launcherFlags.noBrowser;
const configArgument = launcherFlags.configPath
  ? `--config=${launcherFlags.configPath}`
  : undefined;
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
const storyAccountId = '00000000-0000-4000-8000-000000000010';
const storyDefaultRunId = '00000000-0000-4000-8000-000000000011';
// OBS00-L: an explicit finite trial uses its own saved Run; its caps live in SQL.
const storyTrial = launcherFlags.storyTrial;
const storyRunId = storyTrial?.runId ?? storyDefaultRunId;
const chamberDatabaseUrl = process.env['CHAMBER_DATABASE_URL'];
const storyDatabaseUrl = process.env['STORY_LOCAL_DATABASE_URL'];
const launchPlan = planLaunch({
  flags: launcherFlags,
  ...(chamberDatabaseUrl !== undefined ? { chamberDatabaseUrl } : {}),
  ...(storyDatabaseUrl !== undefined ? { storyDatabaseUrl } : {}),
});
if (!launchPlan.ok) throw new Error(launchPlan.reason);
const resetDatabase = launchPlan.resetDatabase;
const localDatabaseName = launchPlan.databaseName;
const databaseURL = launchPlan.databaseUrl;
const storyModel = launchPlan.story?.model ?? 'openai/gpt-5.6-luna';
const storyMaxMicrousd = launchPlan.story?.maxMicrousd ?? 10_000;
const storyMaxOutputTokens = launchPlan.story?.maxOutputTokens ?? 2_048;
const storyMaxInputTokens = launchPlan.story?.maxInputTokens ?? 12_000;
const storyRoute =
  launchPlan.story?.route ?? `openrouter:${storyModel.slice('openai/'.length)}`;
const storyProvider = 'OpenAI';
const storyEndpointTag = 'openai';
const storyServiceTier = 'default' as const;

async function readLocalOpenRouterKey() {
  const content = await readFile(
    join(workspaceRoot, '.env.openrouter'),
    'utf8',
  );
  const entry = content
    .split(/\r?\n/)
    .find((line) => line.trim().startsWith('OPENROUTER_API_KEY='));
  const key = entry?.slice(entry.indexOf('=') + 1).trim() ?? '';
  if (!key)
    throw new Error(
      'Local Story mode requires OPENROUTER_API_KEY in .env.openrouter',
    );
  return key;
}

async function storyLiveAuthority() {
  const apiKey = await readLocalOpenRouterKey();
  const headers = { authorization: `Bearer ${apiKey}` };
  const [creditsResponse, endpointsResponse] = await Promise.all([
    fetch('https://openrouter.ai/api/v1/credits', {
      headers,
      redirect: 'error',
    }),
    fetch(`https://openrouter.ai/api/v1/models/${storyModel}/endpoints`, {
      redirect: 'error',
    }),
  ]);
  if (!creditsResponse.ok || !endpointsResponse.ok) {
    throw new Error('Could not verify the local Story model and account');
  }
  const credits = (await creditsResponse.json()) as {
    data?: { total_credits?: number; total_usage?: number };
  };
  const endpoints = (await endpointsResponse.json()) as {
    data?: {
      endpoints?: Array<{
        provider_name?: string;
        tag?: string;
        context_length?: number;
        pricing?: {
          prompt?: string;
          completion?: string;
          input_cache_read?: string;
          input_cache_write?: string;
        };
        supported_parameters?: string[];
      }>;
    };
  };
  const eligible = (endpoints.data?.endpoints ?? []).filter(
    (endpoint) =>
      endpoint.provider_name === storyProvider &&
      endpoint.tag === storyEndpointTag &&
      (endpoint.context_length ?? 0) >= storyMaxInputTokens &&
      endpoint.supported_parameters?.includes('response_format') &&
      endpoint.supported_parameters?.includes('structured_outputs'),
  );
  if (!eligible.length)
    throw new Error('No eligible exact Story model endpoint is available');
  const perMillionMicrousd = (price: string | undefined) =>
    BigInt(Math.ceil(Number(price) * 1_000_000_000_000));
  const inputPrice = eligible.reduce((maximum, endpoint) => {
    const price = perMillionMicrousd(endpoint.pricing?.prompt);
    return price > maximum ? price : maximum;
  }, 0n);
  const outputPrice = eligible.reduce((maximum, endpoint) => {
    const price = perMillionMicrousd(endpoint.pricing?.completion);
    return price > maximum ? price : maximum;
  }, 0n);
  const cacheReadPrice = eligible.reduce((maximum, endpoint) => {
    const price = perMillionMicrousd(endpoint.pricing?.input_cache_read);
    return price > maximum ? price : maximum;
  }, 0n);
  const cacheWritePrice = eligible.reduce((maximum, endpoint) => {
    const price = perMillionMicrousd(endpoint.pricing?.input_cache_write);
    return price > maximum ? price : maximum;
  }, 0n);
  const verifiedAt = new Date().toISOString();
  const profile = {
    schemaVersion: 1 as const,
    id: 'local-story-live.v1',
    revision: 1,
    enabled: true,
    allowedRoutes: [storyRoute],
    defaultRoute: storyRoute,
    fundingModes: ['prepaid' as const],
    recovery: 'explicit-resume' as const,
    limits: {
      maxInputTokensPerRequest: storyMaxInputTokens,
      maxSerializedBytesPerRequest: storyMaxInputTokens * 4,
      maxGeneratedTokensPerRequest: storyMaxOutputTokens,
      maxReasoningTokensPerRequest: 0,
      maxInputTokensPerOperation: storyMaxInputTokens * 2,
      maxGeneratedTokensPerOperation: storyMaxOutputTokens * 2,
      maxModelRoundsPerOperation: 2,
      maxReadsPerOperation: 0,
      maxRetainedReadBytes: 0,
      maxMicrousdPerOperation: String(storyMaxMicrousd),
      maxInFlightDispatches: 1,
      maxBackgroundJobsPerWindow: 0,
    },
    windows: [],
  };
  const resolved = resolveEffectiveUsagePolicy({
    platform: profile,
    entitlement: profile,
    restrictions: [],
    requestedRoute: storyRoute,
    requestedFundingMode: 'prepaid',
  });
  if (resolved.kind !== 'allowed')
    throw new Error('Local Story usage policy is invalid');
  return {
    apiKey,
    usagePolicy: resolved.policy,
    execution: {
      mode: 'provider' as const,
      accountId: storyAccountId,
      runId: storyRunId,
      dispatchReview: { mode: 'observe' as const },
      policy: {
        version: 'local-story-live.v1',
        route: storyRoute,
        model: storyModel,
        provider: storyProvider,
        priceVersion: `openrouter-endpoints-${verifiedAt}`,
        outputProtocol: 'native-json-schema' as const,
        responseTransport: 'buffered-json' as const,
        serviceTier: storyServiceTier,
        inputMicrousdPerMillion: inputPrice.toString(),
        cacheReadMicrousdPerMillion: cacheReadPrice.toString(),
        cacheWriteMicrousdPerMillion: cacheWritePrice.toString(),
        outputMicrousdPerMillion: outputPrice.toString(),
        maxInputTokens: storyMaxInputTokens,
        maxOutputTokens: storyMaxOutputTokens,
        timeoutMs: 60_000,
      },
    },
    totalUsageMicrousd: BigInt(
      Math.floor((credits.data?.total_usage ?? 0) * 1_000_000),
    ),
    verifiedAt,
  };
}
const storyAuthority = storyMode ? await storyLiveAuthority() : null;
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
const evaluationDenial = evaluationAuthorizationDenial({
  evaluationRun,
  memoryEvaluationRun,
  authorize: launcherFlags.authorize,
  evaluationId: evaluationRun
    ? (evaluationConfig?.id ?? null)
    : memoryEvaluationRun
      ? (memoryEvaluationConfig?.id ?? null)
      : null,
});
if (evaluationDenial) throw new Error(evaluationDenial);
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
await requireFreePort(launchPlan.ports.api);
if (launchPlan.ports.web !== null) await requireFreePort(launchPlan.ports.web);
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
if (storyAuthority) {
  // OBS00-L: a restart creates missing rows only. It never clears a stop, re-enables
  // a disabled run, widens a saved trial cap or resets a counter.
  const funding = await bootstrapLocalStoryFunding(database.db.$client, {
    accountId: storyAccountId,
    defaultRunId: storyDefaultRunId,
    accountLimitMicrousd: 1_000_000n,
    defaultRunLimitMicrousd: 1_000_000n,
    defaultRunMaxAttempts: 250,
    trial: storyTrial
      ? {
          runId: storyTrial.runId,
          maxMicrousd: BigInt(storyTrial.maxMicrousd),
          maxAttempts: storyTrial.maxAttempts,
        }
      : null,
    verifiedAt: storyAuthority.verifiedAt,
  });
  if (funding.state === 'denied') {
    await database.close();
    throw new Error(describeStoryFundingDenial(funding.reasons));
  }
}
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
let storyOpeningContent;
let seydaStartPackage: StartPackageReference | undefined;
if (storyMode || evaluationConfig) {
  const world = await importWorldPackageDirectory(documentStore, {
    sourceDirectory: join(
      workspaceRoot,
      'content',
      'worlds',
      'vvardenfell-poc',
    ),
    worldId: '7c14e5bc-4d72-4f8c-9a6b-97f334b83c11',
    operationId: '89ec4571-24ee-49da-826c-ce25ad6b3e41',
    title: 'Vvardenfell POC',
  });
  if (
    world.rootHash !==
    '5b37ec632d019c983e25f5d481ed2b23c1de464e5932994be16c5befcbc75ec9'
  ) {
    throw new Error(
      'Checked-in Vvardenfell package root changed without updating the start package',
    );
  }
  const start = await importStartPackageDirectory(
    documentStore,
    join(workspaceRoot, 'content', 'starts', 'seyda-neen-prisoner'),
  );
  seydaStartPackage = {
    startPackageId: start.manifest.startPackageId,
    rootHash: start.rootHash,
    revision: start.manifest.revision,
  };
  if (storyMode) {
    storyOpeningContent = [
      {
        id: 'seyda-neen-arrival.v1',
        name: 'Seyda Neen — prisoner arrival',
        description:
          'Begin aboard the prison ship and pass through the maintained Seyda Neen release sequence.',
        draft: {
          title: 'Prisoner in Seyda Neen',
          premise:
            'I am a prisoner arriving by ship at Seyda Neen in Vvardenfell. Begin aboard the prison ship and follow the canonical release process.',
          storytellingDirection:
            'Ground the story in the supplied canonical setting. Preserve player agency, concrete continuity, and room for ordinary life as well as larger events.',
        },
        startPackage: seydaStartPackage,
      },
    ];
  }
}
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
const chamberHostOptions = {
  databaseConfig: config,
  identity: chamberIdentity,
  documentStore,
  defaultRules: {
    ruleSetId: defaultRulePackage.manifest.ruleSetId,
    rootHash: defaultRulePackage.rootHash,
    revision: defaultRulePackage.manifest.revision,
    engine: defaultRulePackage.manifest.engine,
  },
  ...(storyOpeningContent ? { openingContent: storyOpeningContent } : {}),
  ...(storyMode ? { scriptedOpeningFallback: false } : {}),
  ...(storyAuthority
    ? {
        storytellerExecution: storyAuthority.execution,
        storytellerUsagePolicy: storyAuthority.usagePolicy,
      }
    : packetReview ||
        memoryPacketReview ||
        memoryComparisonPackets ||
        memoryEvaluationPacket ||
        memoryEvaluationRun ||
        evaluationPacket ||
        evaluationRun
      ? {
          storytellerExecution:
            evaluationAuthority?.execution ??
            memoryEvaluationAuthority?.execution ??
            (memoryPacketReview || memoryComparisonPackets
              ? memoryDryRunExecution
              : dryRunExecution),
          storytellerUsagePolicy:
            evaluationPolicy?.kind === 'allowed'
              ? evaluationPolicy.policy
              : memoryEvaluationPolicy?.kind === 'allowed'
                ? memoryEvaluationPolicy.policy
                : memoryPacketReview || memoryComparisonPackets
                  ? memoryDryRunPolicy.policy
                  : dryRunPolicy.policy,
        }
      : {}),
};
const chamberAuth = createAuth(database, authConfig);
const app = storyMode
  ? await createApp(database, chamberAuth, origin, chamberHostOptions)
  : await createLabApp(database, chamberAuth, origin, {
      ...chamberHostOptions,
      chamberStorytellerControl: storytellerControl,
      qaContext: {
        git: { commit: gitCommit, dirty: gitDirty },
        environment: { identity: 'local-chamber' },
      },
    });
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
      taskQueue: storyMode ? 'local-story' : 'local-chamber',
    },
    () => {},
    storyAuthority
      ? {
          provider: createLocalStoryProvider({
            apiKey: storyAuthority.apiKey,
            evidenceDirectory: join(
              workspaceRoot,
              'data',
              'story-local-evidence',
            ),
          }),
          dispatchAuthority: pinnedLocalStoryDispatchAuthority(
            storyAuthority.usagePolicy,
          ),
          documentStore,
        }
      : (evaluationRun || memoryEvaluationRun) && liveDispatchPolicy
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
        : memoryPacketReview ||
            memoryComparisonPackets ||
            memoryEvaluationPacket
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
  if (storyMode && storyAuthority) {
    const statusDirectory = join(workspaceRoot, 'data', 'story-agent');
    await mkdir(statusDirectory, { recursive: true });
    await writeFile(
      join(statusDirectory, 'server.json'),
      `${JSON.stringify(
        {
          version: 'story-agent-server.v1',
          processId: process.pid,
          startedAt: new Date().toISOString(),
          apiOrigin: 'http://127.0.0.1:3001',
          model: storyModel,
          provider: storyProvider,
          route: storyRoute,
          maxMicrousdPerOperation: String(storyMaxMicrousd),
          maxInputTokensPerRequest: storyMaxInputTokens,
          maxSerializedBytesPerRequest: storyMaxInputTokens * 4,
          maxOutputTokensPerRequest: storyMaxOutputTokens,
          inputMicrousdPerMillion:
            storyAuthority.execution.policy.inputMicrousdPerMillion,
          outputMicrousdPerMillion:
            storyAuthority.execution.policy.outputMicrousdPerMillion,
          pricingVerifiedAt: storyAuthority.verifiedAt,
          cumulativeProviderUsageMicrousdAtStartup:
            storyAuthority.totalUsageMicrousd.toString(),
          runId: storyRunId,
          trial: storyTrial
            ? {
                runId: storyTrial.runId,
                maxMicrousd: String(storyTrial.maxMicrousd),
                maxAttempts: storyTrial.maxAttempts,
                enforcedBy:
                  'storyteller_run SQL row; saved, not re-minted on restart',
              }
            : null,
          reasoning: 'disabled',
          fallback: false,
        },
        null,
        2,
      )}\n`,
    );
  }
  if (memoryComparisonPackets) {
    const cookie = sessionCookiesFromLogin(login.headers.get('cookie'), origin)
      .map(({ name, value }) => `${name}=${value}`)
      .join('; ');
    const captureInput = {
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
    };
    const comparison = await captureHeldMemoryComparisonPackets(captureInput);
    console.log(
      `Held memory comparison saved to ${comparison.path}. Verified: identical immutable case, two held packets, zero provider attempts. Model spend: $0.`,
    );
  } else if (
    memoryPacketReview ||
    memoryEvaluationPacket ||
    memoryEvaluationRun
  ) {
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
      ...(memoryEvaluationConfig
        ? {
            comparison: {
              interactionId: memoryEvaluationConfig.case.interactionId,
              mode: memoryEvaluationConfig.case.mode,
              maxRepairRounds: memoryEvaluationConfig.recipe.repairCalls,
            },
          }
        : {}),
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
        const projection = captured.finalProjection;
        console.log(
          `Held memory evaluation packet saved to ${captured.evidencePath}; manifest saved to ${manifestPath}.${projection && captured.finalProjectionPath ? ` Provider-free final-round projection saved to ${captured.finalProjectionPath} (${projection.serializedBytes} bytes, sha256 ${projection.packetSha256}).` : ''} Verified: memory state held, zero provider attempts. Model spend: $0 (no provider call).`,
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
      ...(evaluationConfig ? { contentId: 'seyda-neen-arrival.v1' } : {}),
      ...(evaluationConfig && seydaStartPackage
        ? { startPackage: seydaStartPackage }
        : {}),
    });
    if (evaluationConfig) {
      const inspection = evaluationPacketInspectionSchema.parse(
        heldReview.inspection,
      );
      const { maxContextTokens: _maxContextTokens, ...route } =
        evaluationConfig.route;
      void _maxContextTokens;
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
    if (noBrowser) {
      console.log(
        `Local Story API ready at http://127.0.0.1:3001. Live Storyteller: ${storyModel} through the exact ${storyProvider} route with at most ${storyMaxInputTokens} input and ${storyMaxOutputTokens} generated tokens per request; one initial call and at most one explicit invalid-output repair inside the same operation ceiling, with no fallback or automatic retry. Starting the server made no inference call. OpenRouter cumulative usage at startup: $${(Number(storyAuthority!.totalUsageMicrousd) / 1_000_000).toFixed(6)}.`,
      );
      await runtime.done.then(() => {
        if (!stopping) throw new Error('Worker stopped.');
      });
      // A pending promise does not keep Node alive after the signal handler has
      // closed the API, database and worker resources.
      await new Promise<void>(() => {});
    }
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
    browser = await chromium.launch({
      headless: smoke || forensicCampaigns || review,
    });
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
      await page.locator('#chamber-scenario').waitFor();
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
    } else if (smoke || forensicCampaigns) {
      await page.locator('#chamber-scenario').selectOption('chamber.v5');
      await page
        .getByRole('region', { name: 'Selected scenario purpose' })
        .getByText('authoritative item transfer', { exact: false })
        .waitFor();
      await page
        .getByRole('button', { name: 'Start scripted chamber' })
        .click();
      await page.getByRole('region', { name: 'Inspector' }).waitFor();
      const storyAId = new URL(page.url()).searchParams.get('id');
      if (!storyAId) {
        throw new Error('Expected Story A chamber id in URL');
      }
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
        ((await localIdentity.json()) as { email?: unknown }).email !==
          localUserEmail
      ) {
        throw new Error('Chamber local identity was not available.');
      }
      let storyBId: string | null = null;
      let storyBRevisionBefore: number | null = null;
      let storyBRevisionAfter: number | null = null;
      let storyBDueAt: string | null = null;
      if (forensicCampaigns) {
        await page.goto(`${origin}/chamber`);
        await page.locator('#chamber-scenario').selectOption('chamber.v4');
        await page
          .getByRole('button', { name: 'Start scripted chamber' })
          .click();
        await page.getByRole('button', { name: 'Approach the gate' }).click();
        await page
          .getByText('This response window cannot be paused.', {
            exact: false,
          })
          .waitFor();
        const storyBUrl = page.url();
        storyBId = new URL(storyBUrl).searchParams.get('id');
        if (!storyBId) {
          throw new Error('Expected Story B chamber id in URL');
        }
        const cookie = login.headers.get('cookie');
        if (!cookie) {
          throw new Error('Expected chamber session cookie for Story B reads');
        }
        const beforeResponse = await fetch(
          `${origin}/api/stories/${storyBId}`,
          {
            headers: { cookie },
          },
        );
        if (!beforeResponse.ok) {
          throw new Error(`Story B read failed: ${beforeResponse.status}`);
        }
        const before = (await beforeResponse.json()) as {
          revision?: number;
          decision?: { dueAt?: string };
        };
        storyBRevisionBefore =
          typeof before.revision === 'number' ? before.revision : null;
        storyBDueAt =
          typeof before.decision?.dueAt === 'string'
            ? before.decision.dueAt
            : null;
        await page.close();
        const limit = Date.now() + 30000;
        let latest = before;
        while (latest.revision === before.revision && Date.now() < limit) {
          await delay(300);
          const poll = await fetch(`${origin}/api/stories/${storyBId}`, {
            headers: { cookie },
          });
          if (!poll.ok) {
            throw new Error(`Story B poll failed: ${poll.status}`);
          }
          latest = (await poll.json()) as {
            revision?: number;
            decision?: { dueAt?: string };
          };
        }
        storyBRevisionAfter =
          typeof latest.revision === 'number' ? latest.revision : null;
        const reopened = await context.newPage();
        await reopened.goto(storyBUrl);
        await reopened
          .getByRole('heading', { name: 'A quiet departure.' })
          .waitFor();
        const evidenceDirectory = join(
          workspaceRoot,
          'evidence',
          'runs',
          '2026-11-15--connected-forensic-trial',
        );
        await mkdir(evidenceDirectory, { recursive: true });
        const evidencePath = join(evidenceDirectory, 'S1-CAMPAIGN-IDS.json');
        await writeFile(
          evidencePath,
          `${JSON.stringify(
            {
              recordedAt: new Date().toISOString(),
              database: 'offscreen_chamber',
              providerCalls: 0,
              storyA: {
                scenario: 'chamber.v5',
                storyId: storyAId,
                note: 'letter transfer via authored choice; no Storyteller G',
              },
              storyB: {
                scenario: 'chamber.v4',
                storyId: storyBId,
                revisionBeforeDefault: storyBRevisionBefore,
                revisionAfterDefault: storyBRevisionAfter,
                dueAt: storyBDueAt,
                note: 'timed offer defaulted while browser closed; Temporal worker; response_source via SQL after',
              },
            },
            null,
            2,
          )}\n`,
          'utf8',
        );
        console.log(
          `Forensic campaigns recorded to ${evidencePath}. Story A=${storyAId}; Story B=${storyBId}; revision ${storyBRevisionBefore}->${storyBRevisionAfter}. Model spend: $0; no provider calls.`,
        );
      } else {
        console.log(
          'Local launcher smoke passed: loopback identity, play, inspector, transfer and reload. Model spend: $0; no provider calls.',
        );
      }
    } else {
      console.log(
        storyMode
          ? `Local Story mode opened at http://127.0.0.1:3100/stories. Live Storyteller: ${storyModel} through the exact ${storyProvider} route with at most ${storyMaxInputTokens} input and ${storyMaxOutputTokens} generated tokens per request; one initial call and at most one explicit invalid-output repair inside the same operation ceiling, with no fallback or automatic retry. Starting the launcher made no inference call. OpenRouter cumulative usage at startup: $${(Number(storyAuthority!.totalUsageMicrousd) / 1_000_000).toFixed(6)}.`
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
