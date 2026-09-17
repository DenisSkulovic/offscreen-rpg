import { createApp } from './app.js';
import { readConfig } from './config.js';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { createAuth } from './auth/auth.js';
import { readAuthConfig } from './auth/config.js';

async function main() {
  const config = readConfig(process.env);
  const authConfig = readAuthConfig(process.env);
  const database = createDatabase(readDatabaseConfig(process.env), () =>
    console.error('Database connection failed.'),
  );
  try {
    await database.checkConnection();
    const app = await createApp(
      database,
      createAuth(database, authConfig),
      authConfig.origin,
    );
    app.enableShutdownHooks();
    await app.listen(config.port, config.host);
  } catch (error) {
    await database.close();
    throw error;
  }
}

void main().catch(() => {
  console.error(
    'API startup failed. Check configuration and preceding startup logs.',
  );
  process.exitCode = 1;
});
