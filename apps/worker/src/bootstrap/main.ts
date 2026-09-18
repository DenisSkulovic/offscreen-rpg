import { readStorytellerWorkerOptions } from '@offscreen/application/storyteller';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { readWorkerConfig } from './config';
import { startRuntime } from '../runtime';

async function main() {
  const database = createDatabase(readDatabaseConfig(process.env), () =>
    console.error('Worker database connection failed'),
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
      () => console.error('Outbox delivery failed; notice retained for retry'),
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
void main().catch(() => {
  console.error('Worker stopped unexpectedly');
  process.exitCode = 1;
});
