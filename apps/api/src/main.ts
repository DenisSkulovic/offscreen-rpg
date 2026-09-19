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
  try {
    await database.checkConnection();
    const app = await createApp(
      database,
      createAuth(database, authConfig),
      authConfig.origin,
      { storytellerExecution: readStorytellerExecution(process.env) },
    );
    app.enableShutdownHooks();
    await app.listen(config.port, config.host);
  } catch (error) {
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
