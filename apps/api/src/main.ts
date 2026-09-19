import { readStorytellerExecution } from '@offscreen/application/storyteller';
import { createApp } from './app.js';
import { readConfig } from './config.js';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { createAuth } from './modules/auth/auth.js';
import { readAuthConfig } from './modules/auth/config.js';
import {
  classifyRuntimeError,
  writeRuntimeLog,
} from '@offscreen/application/runtime-logging';
import { createCacheAdapter } from '@offscreen/cache';

async function main() {
  const config = readConfig(process.env);
  const authConfig = readAuthConfig(process.env);
  const database = createDatabase(readDatabaseConfig(process.env), () =>
    writeRuntimeLog({
      level: 'error',
      event: 'api.database.background_error',
      message: 'API database connection failed outside a request.',
      service: 'api',
    }),
  );
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
    await database.checkConnection();
    const app = await createApp(
      database,
      createAuth(database, authConfig),
      authConfig.origin,
      {
        storytellerExecution: readStorytellerExecution(process.env),
        readCache: cache.cache,
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
    await app.listen(config.port, config.host);
  } catch (error) {
    await cache.close();
    await database.close();
    throw error;
  }
}

void main().catch((error) => {
  writeRuntimeLog({
    level: 'error',
    event: 'api.runtime.startup_failed',
    message: 'API startup failed; check configuration and preceding logs.',
    service: 'api',
    errorKind: classifyRuntimeError(error),
  });
  process.exitCode = 1;
});
