import { z } from 'zod';
import {
  readStorytellerTaskCustodyClientConfig,
  type StorytellerTaskCustodyClientConfig,
} from '../custody/storyteller-task-custody-client';

const temporalSchema = z.object({
  address: z.string().trim().min(1).default('127.0.0.1:7233'),
  namespace: z.string().trim().min(1).default('default'),
});

const configSchema = temporalSchema.extend({
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

const controlConfigSchema = temporalSchema;

export function readControlWorkerConfig(env: Record<string, string | undefined>) {
  return controlConfigSchema.parse({
    address: env['TEMPORAL_ADDRESS'],
    namespace: env['TEMPORAL_NAMESPACE'],
  });
}
export type ControlWorkerConfig = ReturnType<typeof readControlWorkerConfig>;

const executionConfigSchema = temporalSchema.extend({
  custody: z.custom<StorytellerTaskCustodyClientConfig>(),
});

export function readExecutionWorkerConfig(
  env: Record<string, string | undefined>,
) {
  forbidBroadDatabaseOnExecutor(env);
  return executionConfigSchema.parse({
    address: env['TEMPORAL_ADDRESS'],
    namespace: env['TEMPORAL_NAMESPACE'],
    custody: readStorytellerTaskCustodyClientConfig(env),
  });
}
export type ExecutionWorkerConfig = z.infer<typeof executionConfigSchema>;

/** Executor must not boot with a general SQL writer credential in-process. */
export function forbidBroadDatabaseOnExecutor(
  env: Record<string, string | undefined>,
) {
  const blocked = [
    'DATABASE_URL',
    'POSTGRES_URL',
    'PGDATABASE',
    'PGUSER',
    'PGPASSWORD',
    'PGHOST',
  ] as const;
  const present = blocked.filter((key) => {
    const value = env[key];
    return value != null && String(value).trim().length > 0;
  });
  if (present.length > 0) {
    throw new Error(
      `Storyteller executor refused broad database env: ${present.join(', ')}`,
    );
  }
}
