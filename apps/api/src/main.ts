import { createApp } from './app';
import { readConfig } from './config';

async function main() {
  const config = readConfig(process.env);
  const app = await createApp();
  app.enableShutdownHooks();
  await app.listen(config.port, config.host);
}

void main().catch(() => {
  console.error(
    'API startup failed. Check configuration and preceding startup logs.',
  );
  process.exitCode = 1;
});
