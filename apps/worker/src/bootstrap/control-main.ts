import {
  classifyRuntimeError,
  writeRuntimeLog,
} from '@offscreen/runtime-logging';
import { startControlRuntime } from '../runtime/control';
import { readControlWorkerConfig } from './config';
import { writeDevLoadedRuntimeReceipt } from '@offscreen/runtime-logging/dev-loaded-runtime';

if (process.env.OFFSCREEN_DEV_WATCHED_COMPILATION === '1') {
  writeDevLoadedRuntimeReceipt({
    role: 'worker-control',
    entryModuleUrl: import.meta.url,
  });
}

async function main() {
  let runtime: Awaited<ReturnType<typeof startControlRuntime>> | undefined;
  const stop = () => {
    void runtime?.stop().catch(() => {
      process.exitCode = 1;
    });
  };
  try {
    runtime = await startControlRuntime(readControlWorkerConfig(process.env));
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
    event: 'worker.control.unexpected_stop',
    message: 'Control Storyteller worker stopped unexpectedly.',
    service: 'worker',
    errorKind: classifyRuntimeError(error),
  });
  process.exitCode = 1;
});