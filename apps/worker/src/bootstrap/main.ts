import { readStorytellerWorkerOptions } from '@offscreen/application/storyteller';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { readWorkerConfig } from './config';
import { startRuntime } from '../runtime';
import {
  classifyRuntimeError,
  writeRuntimeLog,
} from '@offscreen/application/runtime-logging';
import { OutboxRelayError } from '../outbox/relay';

async function main() {
  const database = createDatabase(readDatabaseConfig(process.env), () =>
    writeRuntimeLog({
      level: 'error',
      event: 'worker.database.background_error',
      message: 'Worker database connection failed outside a request.',
      service: 'worker',
    }),
  );
  let runtime: Awaited<ReturnType<typeof startRuntime>> | undefined;
  const stop = () => {
    void runtime?.stop().catch(() => {
      process.exitCode = 1;
    });
  };
  try {
    await database.checkConnection();
    runtime = await startRuntime(
      database,
      readWorkerConfig(process.env),
      (error) =>
        writeRuntimeLog({
          level: 'warn',
          event: 'worker.outbox.delivery_retry',
          message: 'Outbox notice was retained for retry.',
          service: 'worker',
          errorKind: classifyRuntimeError(error),
          ...(error instanceof OutboxRelayError
            ? {
                correlation: {
                  noticeId: error.noticeId,
                  operationId: error.operationId,
                  topic: error.topic,
                },
              }
            : {}),
        }),
      readStorytellerWorkerOptions(process.env),
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
    event: 'worker.runtime.unexpected_stop',
    message: 'Worker stopped unexpectedly.',
    service: 'worker',
    errorKind: classifyRuntimeError(error),
  });
  process.exitCode = 1;
});
