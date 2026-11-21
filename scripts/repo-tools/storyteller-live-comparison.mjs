/**
 * SA12 dry-run live comparison CLI. Defaults to dry-run; never opens a provider.
 * Paid mode is intentionally unsupported in this script.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  dryRunLiveComparison,
  fingerprintFrozenStoryAuthority,
  formatLiveComparisonTrial,
} from '../../packages/lab-support/dist/live-comparison.js';

const option = (name) =>
  process.argv
    .slice(2)
    .find((argument) => argument.startsWith(`${name}=`))
    ?.slice(name.length + 1);

if (process.argv.includes('--paid') || option('--mode') === 'paid') {
  console.error(
    'Paid live comparison is not available from this script. Dry-run only; authorize a separate spend-capped runner for provider calls.',
  );
  process.exit(2);
}

const now = new Date().toISOString();
const route = {
  provider: 'openrouter',
  endpointProvider: 'Dry Run Provider',
  endpointTag: 'dry-run/default',
  route: 'openrouter:dry-run/model',
  model: 'dry-run/model',
  priceVersion: 'dry-run-unverified',
  outputProtocol: 'native-json-schema',
  responseTransport: 'buffered-json',
  serviceTier: 'default',
  inputMicrousdPerMillion: '0',
  cacheReadMicrousdPerMillion: '0',
  cacheWriteMicrousdPerMillion: '0',
  outputMicrousdPerMillion: '0',
  supportsStructuredOutput: true,
  reasoning: 'disabled',
  verifiedAt: now,
  validUntil: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
};
const recipe = {
  primaryCalls: 1,
  retrievalReads: 0,
  repairCalls: 0,
  judgeCalls: 0,
  comparisonCalls: 0,
  backgroundCalls: 0,
  maxInFlightCalls: 1,
  maxInputTokens: 8000,
  maxGeneratedTokens: 1024,
  maxReasoningTokens: 0,
  maxMicrousd: '0',
};

const baselinePrompt = option('--baseline-prompt') ?? 'storyteller.v17';
const candidatePrompt = option('--candidate-prompt') ?? 'storyteller.v16';
const storyId = option('--story-id') ?? randomUUID();

const result = dryRunLiveComparison({
  createdAt: now,
  case: {
    id: option('--case-id') ?? 'sa12-dry-run-fixture',
    version: option('--case-version') ?? '1',
    storyFingerprint: fingerprintFrozenStoryAuthority({
      storyId,
      revision: Number(option('--revision') ?? 1),
      rootHash: option('--root-hash') ?? null,
      rootRevision: Number(option('--root-revision') ?? 0),
      promptVersion: baselinePrompt,
    }),
  },
  variedDimension: 'promptVersion',
  baseline: {
    id: 'baseline',
    label: `Baseline ${baselinePrompt}`,
    promptVersion: baselinePrompt,
    recipe,
    route,
  },
  candidate: {
    id: 'candidate',
    label: `Candidate ${candidatePrompt}`,
    promptVersion: candidatePrompt,
    recipe,
    route,
  },
  hardCashCapMicrousd: option('--cash-cap-microusd') ?? '0',
  maxDispatches: 2,
});

if (!result.ok) {
  console.error(
    `Dry-run comparison blocked: ${result.failures.join(', ')}`,
  );
  process.exit(1);
}

const directory = join(
  tmpdir(),
  'offscreen-rpg-live-comparison',
  `${Date.now()}-${randomUUID()}`,
);
await mkdir(directory, { recursive: true });
await Promise.all([
  writeFile(
    join(directory, 'live-comparison-trial.json'),
    `${JSON.stringify(result.trial, null, 2)}\n`,
    { flag: 'wx' },
  ),
  writeFile(
    join(directory, 'live-comparison-trial.md'),
    formatLiveComparisonTrial(result.trial),
    { flag: 'wx' },
  ),
]);

process.stdout.write(
  `SA12 dry-run comparison saved to ${directory}\nmode=${result.trial.mode}; provider=${result.trial.providerTransport}; varied=${result.trial.variedDimension}; spend=$0\n`,
);
