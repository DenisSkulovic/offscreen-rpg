import { z } from 'zod';
import { prepareWriterRoundTransport } from '@offscreen/storyteller/providers/writer-round-transport';
import { writerRoundOutputJsonSchema } from '@offscreen/storyteller/tasks';
import {
  readStorytellerPublicationClientConfig,
  type StorytellerPublicationClientConfig,
} from '../custody/storyteller-publication-client';
import {
  readStorytellerTaskCustodyClientConfig,
  type StorytellerTaskCustodyClientConfig,
} from '../custody/storyteller-task-custody-client';
import {
  readWriterRoundPrivateClientConfig,
  type WriterRoundPrivateClientConfig,
} from '../custody/writer-round-private-client';
import { prepareScriptedOfflineLabWriterRoundTransport } from '../custody/scripted-offline-lab-writer-round-transport';
import {
  assertScriptedOfflineLabNotMixedWithProviderPin,
  OFFSCREEN_WRITER_EXECUTION_MODE_ENV,
  readWriterProviderAuthorizationPolicy,
  WRITER_EXECUTION_MODE_PROVIDER_AUTHORIZED,
  WRITER_EXECUTION_MODE_SCRIPTED_OFFLINE_LAB,
} from '@offscreen/storyteller/providers/writer-provider-authorization-policy';
import {
  WRITER_CONTINUATION_ADMISSION_SCRIPTED,
  type WriterContinuationAdmission,
} from '@offscreen/story-engine/storyteller/writer-continuation';

export { WRITER_CONTINUATION_ADMISSION_SCRIPTED };

export {
  OFFSCREEN_WRITER_EXECUTION_MODE_ENV,
  WRITER_EXECUTION_MODE_SCRIPTED_OFFLINE_LAB,
  WRITER_EXECUTION_MODE_PROVIDER_AUTHORIZED,
} from '@offscreen/storyteller/providers/writer-provider-authorization-policy';

const temporalSchema = z.object({
  address: z.string().trim().min(1).default('127.0.0.1:7233'),
  namespace: z.string().trim().min(1).default('default'),
});

const configSchema = temporalSchema.extend({
  taskQueue: z.string().trim().min(1).default('offscreen-local'),
  writerContinuationAdmission: z.custom<WriterContinuationAdmission>().optional(),
});

export function readWorkerContinuationAdmission(
  env: Record<string, string | undefined>,
): WriterContinuationAdmission {
  const raw = env[OFFSCREEN_WRITER_EXECUTION_MODE_ENV];
  if (raw === undefined || raw.trim() === '') {
    return WRITER_CONTINUATION_ADMISSION_SCRIPTED;
  }
  const trimmed = raw.trim();
  if (trimmed === WRITER_EXECUTION_MODE_SCRIPTED_OFFLINE_LAB) {
    const providerKey = env['OPENROUTER_API_KEY'];
    if (providerKey !== undefined && providerKey.trim() !== '') {
      throw new Error(
        `${OFFSCREEN_WRITER_EXECUTION_MODE_ENV}=${WRITER_EXECUTION_MODE_SCRIPTED_OFFLINE_LAB} cannot be combined with OPENROUTER_API_KEY`,
      );
    }
    assertScriptedOfflineLabNotMixedWithProviderPin(env);
    return WRITER_CONTINUATION_ADMISSION_SCRIPTED;
  }
  if (trimmed === WRITER_EXECUTION_MODE_PROVIDER_AUTHORIZED) {
    return readWriterProviderAuthorizationPolicy(env).admission;
  }
  if (trimmed === 'unavailable') {
    return WRITER_CONTINUATION_ADMISSION_SCRIPTED;
  }
  throw new Error(
    `unsupported ${OFFSCREEN_WRITER_EXECUTION_MODE_ENV}: ${trimmed}`,
  );
}

export function readWorkerConfig(env: Record<string, string | undefined>) {
  return configSchema.parse({
    address: env['TEMPORAL_ADDRESS'],
    namespace: env['TEMPORAL_NAMESPACE'],
    taskQueue: env['TEMPORAL_TASK_QUEUE'],
    writerContinuationAdmission: readWorkerContinuationAdmission(env),
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

export type WriterExecutionModeKind =
  | 'provider-default'
  | typeof WRITER_EXECUTION_MODE_SCRIPTED_OFFLINE_LAB
  | typeof WRITER_EXECUTION_MODE_PROVIDER_AUTHORIZED;

export type PrepareWriterRoundTransportFn = typeof prepareWriterRoundTransport;

export type ExecutionWorkerWriterRoundConfig = Readonly<{
  mode: WriterExecutionModeKind;
  privateCustody: WriterRoundPrivateClientConfig;
  prepareTransport: PrepareWriterRoundTransportFn;
  apiKey: string | undefined;
  outputSchema: unknown;
  fetchImpl: typeof fetch;
}>;

const executionConfigSchema = temporalSchema.extend({
  custody: z.custom<StorytellerTaskCustodyClientConfig>(),
  writerRound: z.custom<ExecutionWorkerWriterRoundConfig>(),
});

function refuseWriterExecutionConfig(message: string): never {
  throw new Error(`Invalid writer execution configuration: ${message}`);
}

function readWriterExecutionMode(
  env: Record<string, string | undefined>,
): WriterExecutionModeKind {
  const raw = env[OFFSCREEN_WRITER_EXECUTION_MODE_ENV];
  if (raw === undefined || raw.trim() === '') {
    return 'provider-default';
  }
  const trimmed = raw.trim();
  if (trimmed === WRITER_EXECUTION_MODE_SCRIPTED_OFFLINE_LAB) {
    const providerKey = env['OPENROUTER_API_KEY'];
    if (providerKey !== undefined && providerKey.trim() !== '') {
      refuseWriterExecutionConfig(
        `${OFFSCREEN_WRITER_EXECUTION_MODE_ENV}=${WRITER_EXECUTION_MODE_SCRIPTED_OFFLINE_LAB} cannot be combined with OPENROUTER_API_KEY`,
      );
    }
    assertScriptedOfflineLabNotMixedWithProviderPin(env);
    return WRITER_EXECUTION_MODE_SCRIPTED_OFFLINE_LAB;
  }
  if (trimmed === WRITER_EXECUTION_MODE_PROVIDER_AUTHORIZED) {
    readWriterProviderAuthorizationPolicy(env);
    return WRITER_EXECUTION_MODE_PROVIDER_AUTHORIZED;
  }
  refuseWriterExecutionConfig(
    `unsupported ${OFFSCREEN_WRITER_EXECUTION_MODE_ENV}: ${trimmed}`,
  );
}

function readExecutionWriterRoundConfig(
  env: Record<string, string | undefined>,
): ExecutionWorkerWriterRoundConfig {
  const mode = readWriterExecutionMode(env);
  const privateCustody = readWriterRoundPrivateClientConfig(env);
  if (mode === WRITER_EXECUTION_MODE_SCRIPTED_OFFLINE_LAB) {
    return {
      mode,
      privateCustody,
      prepareTransport: prepareScriptedOfflineLabWriterRoundTransport,
      apiKey: undefined,
      outputSchema: writerRoundOutputJsonSchema(),
      fetchImpl: fetch,
    };
  }
  if (mode === WRITER_EXECUTION_MODE_PROVIDER_AUTHORIZED) {
    const providerKey = env['OPENROUTER_API_KEY'];
    if (providerKey === undefined || providerKey.trim() === '') {
      refuseWriterExecutionConfig(
        `${WRITER_EXECUTION_MODE_PROVIDER_AUTHORIZED} requires OPENROUTER_API_KEY`,
      );
    }
    return {
      mode,
      privateCustody,
      prepareTransport: prepareWriterRoundTransport,
      apiKey: providerKey.trim(),
      outputSchema: writerRoundOutputJsonSchema(),
      fetchImpl: fetch,
    };
  }
  const providerKey = env['OPENROUTER_API_KEY'];
  const apiKey =
    providerKey !== undefined && providerKey.trim() !== ''
      ? providerKey.trim()
      : undefined;
  return {
    mode: 'provider-default',
    privateCustody,
    prepareTransport: prepareWriterRoundTransport,
    apiKey,
    outputSchema: writerRoundOutputJsonSchema(),
    fetchImpl: fetch,
  };
}

export function readExecutionWorkerConfig(
  env: Record<string, string | undefined>,
) {
  forbidBroadDatabaseOnExecutor(env);
  return executionConfigSchema.parse({
    address: env['TEMPORAL_ADDRESS'],
    namespace: env['TEMPORAL_NAMESPACE'],
    custody: readStorytellerTaskCustodyClientConfig(env),
    writerRound: readExecutionWriterRoundConfig(env),
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
