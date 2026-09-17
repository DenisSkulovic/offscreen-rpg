import { z } from 'zod';

const configSchema = z.object({
  address: z.string().trim().min(1).default('127.0.0.1:7233'),
  namespace: z.string().trim().min(1).default('default'),
  taskQueue: z.string().trim().min(1).default('offscreen-local'),
});
export function readWorkerConfig(env: Record<string, string | undefined>) {
  return configSchema.parse({
    address: env['TEMPORAL_ADDRESS'],
    namespace: env['TEMPORAL_NAMESPACE'],
    taskQueue: env['TEMPORAL_TASK_QUEUE'],
  });
}
export type WorkerConfig = ReturnType<typeof readWorkerConfig>;
