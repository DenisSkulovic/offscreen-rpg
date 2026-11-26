import { readStorytellerExecution } from '@offscreen/story-engine/storyteller';
import { createApp } from './app.js';
import { readConfig } from './config.js';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { createAuth } from './modules/auth/auth.js';
import { readAuthConfig } from './modules/auth/config.js';
import {
  classifyRuntimeError,
  writeRuntimeLog,
} from '@offscreen/runtime-logging';
import { createCacheAdapter } from '@offscreen/cache';
import {
  createStorySnapshotCache,
  readStorySnapshotCacheEnvironment,
} from '@offscreen/story-engine/stories/read-cache-options';
import {
  createDocumentStoreFromEnv,
  S3DocumentStore,
} from '@offscreen/documents';
import { resolveStartupDefaultRules } from './default-rules-startup.js';

let startupStage = 'configuration';

async function main() {
  const config = readConfig(process.env);
  const authConfig = readAuthConfig(process.env);
  const databaseConfig = readDatabaseConfig(process.env);
  const database = createDatabase(databaseConfig, () =>
    writeRuntimeLog({
      level: 'error',
      event: 'api.database.background_error',
      message: 'API database connection failed outside a request.',
      service: 'api',
    }),
  );
  startupStage = 'cache';
  const cache = await createCacheAdapter(process.env, (incident) =>
    writeRuntimeLog({
      level: 'warn',
      event: 'api.cache.adapter_unavailable',
      message:
        'Optional Redis cache operation failed; database reads remain authoritative.',
      service: 'api',
      correlation: { operation: incident.operation },
      errorKind: incident.errorKind,
    }),
  );
  try {
    startupStage = 'database-connection';
    await database.checkConnection();
    startupStage = 'document-store';
    const documentStore = createDocumentStoreFromEnv(process.env);
    if (documentStore instanceof S3DocumentStore) {
      await documentStore.requireBucket();
    }
    startupStage = 'default-rules';
    const defaultRules = await resolveStartupDefaultRules(
      documentStore,
      process.env,
    );
    startupStage = 'application-construction';
    const app = await createApp(
      database,
      createAuth(database, authConfig),
      authConfig.origin,
      {
        databaseConfig,
        ...(documentStore ? { documentStore } : {}),
        ...(defaultRules ? { defaultRules } : {}),
        terminalPairingHmacSecret: authConfig.secret,
        storytellerExecution: readStorytellerExecution(process.env),
        storySnapshotCache: createStorySnapshotCache(
          cache.store,
          readStorySnapshotCacheEnvironment(process.env),
        ),
        closeCache: cache.close,
        onCacheIncident: (incident) =>
          writeRuntimeLog({
            level: 'warn',
            event: 'api.cache.read_fallback',
            message:
              'Cached projection was unavailable; PostgreSQL fallback is in use.',
            service: 'api',
            correlation: {
              operation: incident.operation,
              projection: incident.projection,
            },
            errorKind: incident.errorKind,
          }),
      },
    );
    app.enableShutdownHooks();
    startupStage = 'listen';
    await app.listen(config.port, config.host);
  } catch (error) {
    await Promise.allSettled([cache.close(), database.close()]);
    throw error;
  }
}

void main().catch((error) => {
  writeRuntimeLog({
    level: 'error',
    event: 'api.runtime.startup_failed',
    message: 'API startup failed at the reported initialization stage.',
    correlation: { stage: startupStage },
    service: 'api',
    errorKind: classifyRuntimeError(error),
  });
  process.exitCode = 1;
});
