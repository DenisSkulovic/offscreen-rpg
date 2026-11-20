import { z } from 'zod';
import {
  readStorytellerPublicationClientConfig,
  type StorytellerPublicationClientConfig,
} from '../custody/storyteller-publication-client';
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

const controlConfigSchema = temporalSchema.extend({
  publication: z.custom<StorytellerPublicationClientConfig>(),
});

export function readControlWorkerConfig(env: Record<string, string | undefined>) {
  forbidBroadDatabaseOnControl(env);
  return controlConfigSchema.parse({
    address: env['TEMPORAL_ADDRESS'],
    namespace: env['TEMPORAL_NAMESPACE'],
    publication: readStorytellerPublicationClientConfig(env),
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

const broadDatabaseEnvKeys = [
  'DATABASE_URL',
  'POSTGRES_URL',
  'PGDATABASE',
  'PGUSER',
  'PGPASSWORD',
  'PGHOST',
] as const;

function refuseBroadDatabaseEnv(role: string, present: string[]): never {
  throw new Error(
    `Storyteller ${role} refused broad database env: ${present.join(', ')}`,
  );
}

function listBroadDatabaseEnvKeys(
  env: Record<string, string | undefined>,
): string[] {
  return broadDatabaseEnvKeys.filter((key) => {
    const value = env[key];
    return value != null && String(value).trim().length > 0;
  });
}

/** Executor must not boot with a general SQL writer credential in-process. */
export function forbidBroadDatabaseOnExecutor(
  env: Record<string, string | undefined>,
) {
  const present = listBroadDatabaseEnvKeys(env);
  if (present.length > 0) {
    refuseBroadDatabaseEnv('executor', present);
  }
}

/** Control worker must not boot with a general SQL writer credential in-process. */
export function forbidBroadDatabaseOnControl(
  env: Record<string, string | undefined>,
) {
  const present = listBroadDatabaseEnvKeys(env);
  if (present.length > 0) {
    refuseBroadDatabaseEnv('control', present);
  }
}
