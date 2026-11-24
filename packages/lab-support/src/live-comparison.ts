/**
 * SA12: provider-free dry-run comparison runner.
 * Paid live dispatch remains a separately authorized path and is rejected here.
 */
import { createHash, randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import {
  humanReviewWorksheetSchema,
  liveComparisonCandidateSchema,
  liveComparisonTrialManifestSchema,
  type LiveComparisonCandidate,
  type LiveComparisonDimension,
  type LiveComparisonTrialManifest,
  type LiveEvaluationRecipe,
} from './interfaces/live-evaluation.js';

function requiredReservationMicrousd(input: {
  route: LiveComparisonCandidate['route'];
  recipe: LiveEvaluationRecipe;
}) {
  const admittedInputPrice = [
    input.route.inputMicrousdPerMillion,
    input.route.cacheReadMicrousdPerMillion,
    input.route.cacheWriteMicrousdPerMillion,
  ].reduce((maximum, price) => {
    const parsed = BigInt(price);
    return parsed > maximum ? parsed : maximum;
  }, 0n);
  const pricedMillionthsOfMicrousd =
    BigInt(input.recipe.maxInputTokens) * admittedInputPrice +
    BigInt(input.recipe.maxGeneratedTokens) *
      BigInt(input.route.outputMicrousdPerMillion);
  return (pricedMillionthsOfMicrousd + 999_999n) / 1_000_000n;
}

function differingDimensions(
  baseline: LiveComparisonCandidate,
  candidate: LiveComparisonCandidate,
): LiveComparisonDimension[] {
  const diffs: LiveComparisonDimension[] = [];
  if (baseline.promptVersion !== candidate.promptVersion) {
    diffs.push('promptVersion');
  }
  if (!isDeepStrictEqual(baseline.recipe, candidate.recipe)) {
    diffs.push('recipe');
  }
  if (!isDeepStrictEqual(baseline.route, candidate.route)) {
    diffs.push('route');
  }
  return diffs;
}

export type DryRunLiveComparisonFailure =
  | 'paid_mode_forbidden'
  | 'allow_paid_forbidden'
  | 'not_one_variable'
  | 'identical_candidates'
  | 'cash_cap_below_reservation'
  | 'unknown_pricing'
  | 'missing_case_identity';

export type DryRunLiveComparisonResult =
  | { ok: true; trial: LiveComparisonTrialManifest }
  | {
      ok: false;
      failures: DryRunLiveComparisonFailure[];
      trial?: LiveComparisonTrialManifest;
    };

/**
 * Build a dry-run A/B comparison packet. Never contacts a provider.
 * Rejects paid mode and multi-variable diffs fail-closed.
 */
export function dryRunLiveComparison(input: {
  id?: string;
  createdAt?: string;
  case: LiveComparisonTrialManifest['case'];
  baseline: unknown;
  candidate: unknown;
  variedDimension: LiveComparisonDimension;
  hardCashCapMicrousd?: string;
  maxModelRounds?: 1 | 2 | 3;
  maxDispatches?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Must remain false/omitted. Explicit true is rejected. */
  allowPaid?: boolean;
}): DryRunLiveComparisonResult {
  const failures: DryRunLiveComparisonFailure[] = [];
  if (input.allowPaid === true) {
    failures.push('allow_paid_forbidden');
  }
  if (
    !input.case?.id ||
    !input.case?.version ||
    !input.case?.storyFingerprint
  ) {
    failures.push('missing_case_identity');
  }

  const baseline = liveComparisonCandidateSchema.parse(input.baseline);
  const candidate = liveComparisonCandidateSchema.parse(input.candidate);
  if (baseline.id === candidate.id) {
    failures.push('identical_candidates');
  }
  const diffs = differingDimensions(baseline, candidate);
  if (diffs.length !== 1 || diffs[0] !== input.variedDimension) {
    failures.push('not_one_variable');
  }

  const baselineReservation = requiredReservationMicrousd({
    route: baseline.route,
    recipe: baseline.recipe,
  });
  const candidateReservation = requiredReservationMicrousd({
    route: candidate.route,
    recipe: candidate.recipe,
  });
  const worstCase =
    baselineReservation > candidateReservation
      ? baselineReservation
      : candidateReservation;
  // Two variants may each reserve once; dry-run reports worst-case *per variant*
  // and total planned dispatches ceiling.
  const maxDispatches = BigInt(input.maxDispatches ?? 2);
  const plannedCeiling = worstCase * maxDispatches;
  const hardCashCapMicrousd =
    input.hardCashCapMicrousd ?? plannedCeiling.toString();

  if (
    baseline.route.inputMicrousdPerMillion === '' ||
    candidate.route.inputMicrousdPerMillion === ''
  ) {
    failures.push('unknown_pricing');
  }
  if (BigInt(hardCashCapMicrousd) < plannedCeiling) {
    failures.push('cash_cap_below_reservation');
  }

  const id = input.id ?? randomUUID();
  const createdAt = input.createdAt ?? new Date().toISOString();
  const humanReview = humanReviewWorksheetSchema.parse({
    version: 'human-review-worksheet.v1',
    comparisonId: id,
    dimensions: {
      profileFaithfulness: 'unobserved',
      narrativeOriginality: 'unobserved',
      oldPromiseRecall: 'unobserved',
      mechanicallyEarnedConsequence: 'unobserved',
      quietness: 'unobserved',
      nextChoiceAppeal: 'unobserved',
    },
    notes: '',
    completedAt: null,
  });

  const trial = liveComparisonTrialManifestSchema.parse({
    version: 'live-comparison-trial.v1',
    id,
    mode: 'dry-run',
    createdAt,
    case: input.case,
    variedDimension: input.variedDimension,
    baseline,
    candidate,
    stopPolicy: {
      hardCashCapMicrousd,
      maxModelRounds: input.maxModelRounds ?? 1,
      maxDispatches: Number(maxDispatches),
      allowPaid: false,
      allowAutomaticFallback: false,
      allowRetryAfterUncertain: false,
    },
    worstCaseReservationMicrousd: worstCase.toString(),
    providerTransport: 'none',
    outcomes: [
      {
        candidateId: baseline.id,
        status: 'dry-run-only',
        chargedMicrousd: null,
        latencyMs: null,
        publicationEligible: null,
        reportedInputTokens: null,
        reportedOutputTokens: null,
        reportedReasoningTokens: null,
        reportedCacheReadTokens: null,
        reportedCacheWriteTokens: null,
      },
      {
        candidateId: candidate.id,
        status: 'dry-run-only',
        chargedMicrousd: null,
        latencyMs: null,
        publicationEligible: null,
        reportedInputTokens: null,
        reportedOutputTokens: null,
        reportedReasoningTokens: null,
        reportedCacheReadTokens: null,
        reportedCacheWriteTokens: null,
      },
    ],
    humanReview,
  });

  if (failures.length) {
    return { ok: false, failures, trial };
  }
  return { ok: true, trial };
}

export function formatLiveComparisonTrial(
  trial: LiveComparisonTrialManifest,
): string {
  const lines = [
    `# Live comparison trial ${trial.id}`,
    '',
    `- Mode: **${trial.mode}** (provider transport: ${trial.providerTransport})`,
    `- Case: ${trial.case.id}@${trial.case.version}`,
    `- Story fingerprint: \`${trial.case.storyFingerprint}\``,
    `- Varied dimension: **${trial.variedDimension}**`,
    `- Worst-case reservation / variant: ${trial.worstCaseReservationMicrousd} µUSD`,
    `- Hard cash cap: ${trial.stopPolicy.hardCashCapMicrousd} µUSD`,
    `- Max dispatches: ${trial.stopPolicy.maxDispatches}`,
    `- allowPaid: ${trial.stopPolicy.allowPaid}`,
    '',
    '## Candidates',
    '',
    `| Id | Label | Prompt | Model | Max µUSD |`,
    `| --- | --- | --- | --- | --- |`,
    `| ${trial.baseline.id} | ${trial.baseline.label} | ${trial.baseline.promptVersion} | ${trial.baseline.route.model} | ${trial.baseline.recipe.maxMicrousd} |`,
    `| ${trial.candidate.id} | ${trial.candidate.label} | ${trial.candidate.promptVersion} | ${trial.candidate.route.model} | ${trial.candidate.recipe.maxMicrousd} |`,
    '',
    '## Outcomes',
    '',
    ...trial.outcomes.map(
      (outcome) =>
        `- ${outcome.candidateId}: ${outcome.status}; charged=${outcome.chargedMicrousd ?? 'n/a'}`,
    ),
    '',
    '## Human review worksheet',
    '',
    'All dimensions default to `unobserved`. Do not fill with an LLM judge.',
    '',
    ...Object.entries(trial.humanReview.dimensions).map(
      ([key, value]) => `- ${key}: ${value}`,
    ),
    '',
  ];
  return `${lines.join('\n')}\n`;
}

export function fingerprintFrozenStoryAuthority(input: {
  storyId: string;
  revision: number;
  rootHash: string | null;
  rootRevision: number;
  promptVersion: string;
}) {
  return createHash('sha256')
    .update(
      JSON.stringify({
        storyId: input.storyId,
        revision: input.revision,
        rootHash: input.rootHash,
        rootRevision: input.rootRevision,
        promptVersion: input.promptVersion,
      }),
    )
    .digest('hex')
    .slice(0, 32);
}
