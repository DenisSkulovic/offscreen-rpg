import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import {
  classifyRuntimeError,
  writeRuntimeLog,
} from '@offscreen/application/runtime-logging';
import {
  createDocumentStoreFromEnv,
  S3DocumentStore,
} from '@offscreen/documents';
import { startControlRuntime } from '../runtime/control';
import { readControlWorkerConfig } from './config';

async function main() {
  const database = createDatabase(readDatabaseConfig(process.env), () =>
    writeRuntimeLog({
      level: 'error',
      event: 'worker.database.background_error',
      message: 'Control worker database connection failed outside a request.',
      service: 'worker',
    }),
  );
  let runtime: Awaited<ReturnType<typeof startControlRuntime>> | undefined;
  const stop = () => {
    void runtime?.stop().catch(() => {
      process.exitCode = 1;
    });
  };
  try {
    await database.checkConnection();
    const documentStore = createDocumentStoreFromEnv(process.env);
    if (documentStore instanceof S3DocumentStore) {
      await documentStore.ensureBucket();
    }
    runtime = await startControlRuntime(
      database,
      readControlWorkerConfig(process.env),
      documentStore ? { documentStore } : {},
    );
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
    await runtime.done;
  } finally {
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
    try {
      await runtime?.stop();
    } finally {
      await database.close();
    }
  }
}
void main().catch((error) => {
  writeRuntimeLog({
    level: 'error',
    event: 'worker.control.unexpected_stop',
    message: 'Control Storyteller worker stopped unexpectedly.',
    service: 'worker',
    errorKind: classifyRuntimeError(error),
  });
  process.exitCode = 1;
});