/**
 * OBS00-C: the local Story-mode provider composition, extracted from `main.ts`
 * so the exact launcher wiring is testable with an injected mock transport and
 * no credential or network. The provider is created directly (no wrapper), so
 * the per-round dispatch and the frozen reviewed wire reach `createOpenRouterProvider`
 * unchanged. Evidence hooks receive only the provider response and request
 * digest; the Authorization header is never part of the serialized body.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  createOpenRouterProvider,
  type StorytellerProvider,
} from '@offscreen/storyteller/providers/openrouter';

function evidenceId(providerId: string | null) {
  return providerId && /^[a-zA-Z0-9_-]{1,200}$/.test(providerId)
    ? providerId
    : crypto.randomUUID();
}

export function createLocalStoryProvider(input: {
  apiKey: string;
  /** `data/story-local-evidence` under the workspace in the real launcher. */
  evidenceDirectory: string;
  /** Test seam only; the launcher never passes it. */
  transport?: typeof fetch;
}): StorytellerProvider {
  return createOpenRouterProvider({
    enabled: true,
    apiKey: input.apiKey,
    ...(input.transport ? { transport: input.transport } : {}),
    recordResponse: async (evidence) => {
      await mkdir(input.evidenceDirectory, { recursive: true });
      await writeFile(
        join(
          input.evidenceDirectory,
          `provider-response-${evidenceId(evidence.providerId)}.json`,
        ),
        `${JSON.stringify(evidence, null, 2)}\n`,
        { flag: 'wx' },
      );
    },
    recordDiagnostic: async (evidence) => {
      await mkdir(input.evidenceDirectory, { recursive: true });
      await writeFile(
        join(
          input.evidenceDirectory,
          `provider-diagnostic-${evidenceId(evidence.providerId)}.json`,
        ),
        `${JSON.stringify(evidence, null, 2)}\n`,
        { flag: 'wx' },
      );
    },
  });
}
