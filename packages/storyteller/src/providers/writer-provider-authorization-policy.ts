import { z } from 'zod';
import type { WriterRoundModelPolicy } from './writer-round-transport';

export const OFFSCREEN_WRITER_EXECUTION_MODE_ENV =
  'OFFSCREEN_WRITER_EXECUTION_MODE' as const;

export const WRITER_EXECUTION_MODE_SCRIPTED_OFFLINE_LAB =
  'scripted-offline-lab' as const;

export const WRITER_EXECUTION_MODE_PROVIDER_AUTHORIZED =
  'provider-authorized' as const;

export const OFFSCREEN_WRITER_PROVIDER_MODEL_ENV =
  'OFFSCREEN_WRITER_PROVIDER_MODEL' as const;

export const OFFSCREEN_WRITER_PROVIDER_POLICY_VERSION_ENV =
  'OFFSCREEN_WRITER_PROVIDER_POLICY_VERSION' as const;

const continuationBudgetMicrousd = 250_000n;

const providerModelSchema = z.string().trim().min(1).max(160);
const providerPolicyVersionSchema = z.string().trim().min(1).max(80);

export type WriterProviderAuthorizationAdmission = Readonly<{
  mode: 'provider';
  model: string;
  policyVersion: string;
}>;

export type WriterProviderAuthorizationParsed = Readonly<{
  policy: WriterRoundModelPolicy;
  admission: WriterProviderAuthorizationAdmission;
}>;

function refuseWriterProviderAuthorization(message: string): never {
  throw new Error(`Invalid writer provider authorization: ${message}`);
}

export function writerProviderPinEnvVarsPresent(
  env: Record<string, string | undefined>,
): boolean {
  const model = env[OFFSCREEN_WRITER_PROVIDER_MODEL_ENV];
  const policyVersion = env[OFFSCREEN_WRITER_PROVIDER_POLICY_VERSION_ENV];
  return (
    (model !== undefined && model.trim() !== '') ||
    (policyVersion !== undefined && policyVersion.trim() !== '')
  );
}

export function assertScriptedOfflineLabNotMixedWithProviderPin(
  env: Record<string, string | undefined>,
): void {
  if (writerProviderPinEnvVarsPresent(env)) {
    refuseWriterProviderAuthorization(
      `${WRITER_EXECUTION_MODE_SCRIPTED_OFFLINE_LAB} cannot be combined with ${OFFSCREEN_WRITER_PROVIDER_MODEL_ENV} or ${OFFSCREEN_WRITER_PROVIDER_POLICY_VERSION_ENV}`,
    );
  }
}

export function readWriterProviderAuthorizationPolicy(
  env: Record<string, string | undefined>,
): WriterProviderAuthorizationParsed {
  const rawModel = env[OFFSCREEN_WRITER_PROVIDER_MODEL_ENV];
  const rawPolicyVersion = env[OFFSCREEN_WRITER_PROVIDER_POLICY_VERSION_ENV];
  if (rawModel === undefined || rawModel.trim() === '') {
    refuseWriterProviderAuthorization(
      `${OFFSCREEN_WRITER_PROVIDER_MODEL_ENV} is required for provider-authorized mode`,
    );
  }
  if (rawPolicyVersion === undefined || rawPolicyVersion.trim() === '') {
    refuseWriterProviderAuthorization(
      `${OFFSCREEN_WRITER_PROVIDER_POLICY_VERSION_ENV} is required for provider-authorized mode`,
    );
  }
  const model = providerModelSchema.parse(rawModel);
  const policyVersion = providerPolicyVersionSchema.parse(rawPolicyVersion);
  const policy: WriterRoundModelPolicy = {
    model,
    provider: 'OpenAI',
    priceVersion: policyVersion,
    inputMicrousdPerMillion: '1000000',
    outputMicrousdPerMillion: '1000000',
    maxInputTokens: 8000,
    maxOutputTokens: 2000,
    maxModelRounds: 4,
    maxMicrousd: continuationBudgetMicrousd,
    timeoutMs: 30_000,
  };
  return {
    policy,
    admission: { mode: 'provider', model, policyVersion },
  };
}