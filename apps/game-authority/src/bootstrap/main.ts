import { classifyRuntimeError } from '@offscreen/application/runtime-logging';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import {
  createDocumentStoreFromEnv,
  S3DocumentStore,
} from '@offscreen/documents';
import { createGameAuthoritySeam } from '../application.js';
import { readGameAuthorityConfig } from '../config.js';
import { startGameAuthorityServer } from '../server.js';

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

async function main() {
  const config = readGameAuthorityConfig(process.env);
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
  const server = await startGameAuthorityServer({
    seam: createGameAuthoritySeam(
      database,
      documentStore ? { documentStore } : {},
    ),
    token: config.token,
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
