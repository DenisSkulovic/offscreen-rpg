import type { WriterRoundModelPolicy } from '@offscreen/storyteller/providers/writer-round-transport';
import { SCRIPTED_OFFLINE_MODEL } from '@offscreen/story-engine/storyteller/writer-round-capture-validation';

export const OFFSCREEN_WRITER_EXECUTION_MODE_ENV =
  'OFFSCREEN_WRITER_EXECUTION_MODE' as const;

export const WRITER_EXECUTION_MODE_SCRIPTED_OFFLINE_LAB =
  'scripted-offline-lab' as const;

export type WriterRoundBootstrapMode =
  | 'unavailable'
  | typeof WRITER_EXECUTION_MODE_SCRIPTED_OFFLINE_LAB;

/** Continuation v3 mission budget ceiling (writer-continuation.ts). */
const continuationBudgetMicrousd = 250_000n;

/** Fixed GA-owned scripted lab WriterRoundModelPolicy for WR10B. */
export const scriptedOfflineLabWriterRoundPolicy: WriterRoundModelPolicy = {
  model: SCRIPTED_OFFLINE_MODEL,
  provider: 'OpenAI',
  priceVersion: 'wr10b.lab.v1',
  inputMicrousdPerMillion: '1000000',
  outputMicrousdPerMillion: '1000000',
  maxInputTokens: 8000,
  maxOutputTokens: 2000,
  maxModelRounds: 4,
  maxMicrousd: continuationBudgetMicrousd,
  timeoutMs: 30_000,
};

export function readWriterRoundBootstrapMode(
  env: Record<string, string | undefined>,
): WriterRoundBootstrapMode {
  const raw = env[OFFSCREEN_WRITER_EXECUTION_MODE_ENV];
  if (raw === undefined || raw.trim() === '') {
    return 'unavailable';
  }
  const trimmed = raw.trim();
  if (trimmed === WRITER_EXECUTION_MODE_SCRIPTED_OFFLINE_LAB) {
    const providerKey = env['OPENROUTER_API_KEY'];
    if (providerKey !== undefined && providerKey.trim() !== '') {
      throw new Error(
        `${OFFSCREEN_WRITER_EXECUTION_MODE_ENV}=${WRITER_EXECUTION_MODE_SCRIPTED_OFFLINE_LAB} cannot be combined with OPENROUTER_API_KEY`,
      );
    }
    return WRITER_EXECUTION_MODE_SCRIPTED_OFFLINE_LAB;
  }
  throw new Error(
    `unsupported ${OFFSCREEN_WRITER_EXECUTION_MODE_ENV}: ${trimmed}`,
  );
}