import { startExecutionRuntime } from '../runtime/execution';
import { readExecutionWorkerConfig } from './config';
import {
  classifyRuntimeError,
  writeRuntimeLog,
} from '@offscreen/application/runtime-logging';

async function main() {
  let runtime: Awaited<ReturnType<typeof startExecutionRuntime>> | undefined;
  const stop = () => {
    void runtime?.stop().catch(() => {
      process.exitCode = 1;
    });
  };
  try {
    runtime = await startExecutionRuntime(readExecutionWorkerConfig(process.env));
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
    await runtime.done;
  } finally {
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
    await runtime?.stop();
  }
}
void main().catch((error) => {
  writeRuntimeLog({
    level: 'error',
    event: 'worker.executor.unexpected_stop',
    message: 'Storyteller executor stopped unexpectedly.',
    service: 'worker',
    errorKind: classifyRuntimeError(error),
  });
  process.exitCode = 1;
});