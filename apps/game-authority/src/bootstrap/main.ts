import { z } from 'zod';
import { classifyRuntimeError } from '@offscreen/runtime-logging';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { resolve } from 'node:path';
import {
  contentHashSchema,
  createDocumentStoreFromEnv,
  importRulePackageDirectory,
  rulePackageReferenceSchema,
  S3DocumentStore,
  type DocumentStore,
} from '@offscreen/documents';
import {
  createGameAuthoritySeam,
  createStorytellerPublicationSeam,
  createStorytellerTaskCustodySeam,
} from '../application.js';
import { readGameAuthorityConfig } from '../config.js';
import { startGameAuthorityServer } from '../server.js';
import {
  createWriterRoundSeam,
  writerRoundCapturePolicyModeForBootstrap,
} from '../writer-round-control-seam.js';
import {
  readWriterRoundBootstrapMode,
  writerRoundModelPolicyForBootstrap,
} from '../writer-round-lab-policy.js';
import { writeDevLoadedRuntimeReceipt } from '@offscreen/runtime-logging/dev-loaded-runtime';

if (process.env.OFFSCREEN_DEV_WATCHED_COMPILATION === '1') {
  writeDevLoadedRuntimeReceipt({
    role: 'game-authority',
    entryModuleUrl: import.meta.url,
  });
}

function log(
  level: 'info' | 'error',
  event: string,
  message: string,
  error?: unknown,
) {
  process.stderr.write(
    `${JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      event,
      message,
      service: 'game-authority',
      ...(error === undefined
        ? {}
        : { errorKind: classifyRuntimeError(error) }),
    })}\n`,
  );
}

const executorTokenSchema = z.string().min(16).max(256);
const defaultRuleSourceDirectory = 'content/rules/srd-5.2.1-subset';

function readDistinctExecutorToken(
  env: Record<string, string | undefined>,
  forbidden: readonly string[],
) {
  const parsed = executorTokenSchema.safeParse(env.GAME_AUTHORITY_EXECUTOR_TOKEN);
  if (!parsed.success) {
    throw new Error('Invalid GAME_AUTHORITY_EXECUTOR_TOKEN');
  }
  if (forbidden.includes(parsed.data)) {
    throw new Error(
      'GAME_AUTHORITY_EXECUTOR_TOKEN must differ from other Game Authority credentials',
    );
  }
  return parsed.data;
}

async function resolveBootstrapDefaultRules(
  documentStore: DocumentStore | undefined,
  env: NodeJS.ProcessEnv = process.env,
) {
  const pinnedRootHash = env['OFFSCREEN_DEFAULT_RULE_ROOT_HASH']?.trim();
  const ruleSource = env['OFFSCREEN_DEFAULT_RULE_SOURCE']?.trim();

  if (pinnedRootHash) {
    if (ruleSource) {
      throw new Error(
        'OFFSCREEN_DEFAULT_RULE_ROOT_HASH and OFFSCREEN_DEFAULT_RULE_SOURCE cannot both be set',
      );
    }
    if (!documentStore) {
      throw new Error(
        'OFFSCREEN_DEFAULT_RULE_ROOT_HASH requires a configured document store',
      );
    }
    const rootHash = contentHashSchema.parse(pinnedRootHash);
    const manifest = await documentStore.readRulePackageManifest(rootHash);
    return rulePackageReferenceSchema.parse({
      ruleSetId: manifest.ruleSetId,
      rootHash,
      revision: manifest.revision,
      engine: manifest.engine,
    });
  }

  if (!documentStore) {
    return undefined;
  }

  const imported = await importRulePackageDirectory(
    documentStore,
    resolve(ruleSource ?? defaultRuleSourceDirectory),
  );
  return rulePackageReferenceSchema.parse({
    ruleSetId: imported.manifest.ruleSetId,
    rootHash: imported.rootHash,
    revision: imported.manifest.revision,
    engine: imported.manifest.engine,
  });
}

async function main() {
  const config = readGameAuthorityConfig(process.env);
  const executorToken = readDistinctExecutorToken(process.env, [
    config.token,
    config.controlToken,
  ]);
  const database = createDatabase(readDatabaseConfig(process.env), (error) => {
    log(
      'error',
      'game-authority.database.background_error',
      'Game Authority database connection failed.',
      error,
    );
  });
  const documentStore = createDocumentStoreFromEnv(process.env);
  if (documentStore instanceof S3DocumentStore) {
    await documentStore.ensureBucket();
  }
  await database.checkConnection();
  const applicationOptions = documentStore ? { documentStore } : {};
  const defaultRules = await resolveBootstrapDefaultRules(documentStore);
  const seamOptions = {
    ...applicationOptions,
    ...(defaultRules ? { defaultRules } : {}),
  };
  const writerRoundBootstrapMode = readWriterRoundBootstrapMode(process.env);
  const writerRounds =
    writerRoundBootstrapMode === 'unavailable' || documentStore === undefined
      ? undefined
      : createWriterRoundSeam(database, documentStore, {
          providerPolicy: writerRoundModelPolicyForBootstrap(
            writerRoundBootstrapMode,
            process.env,
          ),
          capturePolicyMode: writerRoundCapturePolicyModeForBootstrap(
            writerRoundBootstrapMode,
          ),
        });

  const server = await startGameAuthorityServer({
    seam: createGameAuthoritySeam(database, seamOptions),
    custody: createStorytellerTaskCustodySeam(database, applicationOptions),
    publication: createStorytellerPublicationSeam(
      database,
      applicationOptions,
    ),
    ...(writerRounds === undefined ? {} : { writerRounds }),
    ...(documentStore === undefined ? {} : { documentStore }),
    token: config.token,
    executorToken,
    controlToken: config.controlToken,
    timeoutMs: config.timeoutMs,
    host: config.host,
    port: config.port,
  });
  log('info', 'game-authority.listening', 'Game Authority story seam is listening.');
  const stop = () => {
    void server.close().finally(() => database.close());
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}

void main().catch((error) => {
  log(
    'error',
    'game-authority.startup_failed',
    'Game Authority startup failed.',
    error,
  );
  process.exitCode = 1;
});
