import {
  liveEvaluationManifestSchema,
  type LiveEvaluationManifest,
  type LiveEvaluationRecipe,
} from '@offscreen/contracts/live-evaluation';

export function createLiveEvaluationManifest(input: {
  id: string;
  createdAt: string;
  case: LiveEvaluationManifest['case'];
  review: {
    generationId: string;
    packetSha256: string;
    state: string;
    serializedBytes: number;
  };
  route: LiveEvaluationManifest['route'];
  recipe: LiveEvaluationRecipe;
}) {
  if (input.review.state !== 'awaiting-review') {
    throw new Error('Evaluation packet must be awaiting review');
  }
  // A tokenizer token cannot represent less than one encoded byte. This is a
  // deliberately conservative compatibility bound, not provider metering.
  const inputTokenUpperBound = input.review.serializedBytes;
  const pricedMillionthsOfMicrousd =
    BigInt(inputTokenUpperBound) *
      BigInt(input.route.inputMicrousdPerMillion) +
    BigInt(input.recipe.maxGeneratedTokens) *
      BigInt(input.route.outputMicrousdPerMillion);
  const reservationMicrousd = (
    (pricedMillionthsOfMicrousd + 999_999n) /
    1_000_000n
  ).toString();
  return liveEvaluationManifestSchema.parse({
    version: 'live-evaluation.v1',
    id: input.id,
    gate:
      input.recipe.primaryCalls === 1
        ? 'single-structured-response'
        : 'short-playable-loop',
    case: input.case,
    packet: {
      generationId: input.review.generationId,
      sha256: input.review.packetSha256,
      serializedBytes: input.review.serializedBytes,
      inputTokenUpperBound,
      inputBoundMethod: 'utf8-byte-upper-bound',
    },
    route: input.route,
    recipe: input.recipe,
    reservationMicrousd,
    createdAt: input.createdAt,
  });
}

export type LiveEvaluationPreflightFailure =
  | 'packet_not_held'
  | 'packet_identity_mismatch'
  | 'pricing_stale'
  | 'structured_output_unsupported'
  | 'gate_recipe_too_rich'
  | 'input_limit_exceeded'
  | 'reservation_mismatch'
  | 'funding_snapshot_stale'
  | 'funding_insufficient'
  | 'accounting_not_ready'
  | 'trace_not_ready';

export type LiveEvaluationPreflight =
  | { eligible: true; manifest: LiveEvaluationManifest }
  | {
      eligible: false;
      manifest: LiveEvaluationManifest;
      failures: LiveEvaluationPreflightFailure[];
    };

/** Pure fail-closed Gate-1 review. It cannot reserve funds or release a packet. */
export function preflightLiveEvaluation(input: {
  manifest: unknown;
  now: string;
  review: {
    generationId: string;
    packetSha256: string;
    state: string;
  };
  funding: {
    availableMicrousd: string;
    verifiedAt: string;
    validUntil: string;
    accountingReady: boolean;
  };
  traceReady: boolean;
}): LiveEvaluationPreflight {
  const manifest = liveEvaluationManifestSchema.parse(input.manifest);
  const failures: LiveEvaluationPreflightFailure[] = [];
  const now = Date.parse(input.now);

  if (input.review.state !== 'awaiting-review') {
    failures.push('packet_not_held');
  }
  if (
    input.review.generationId !== manifest.packet.generationId ||
    input.review.packetSha256 !== manifest.packet.sha256
  ) {
    failures.push('packet_identity_mismatch');
  }
  if (
    Date.parse(manifest.route.verifiedAt) > now ||
    Date.parse(manifest.route.validUntil) <= now
  ) {
    failures.push('pricing_stale');
  }
  if (!manifest.route.supportsStructuredOutput) {
    failures.push('structured_output_unsupported');
  }
  const recipe = manifest.recipe;
  if (
    recipe.primaryCalls > 3 ||
    recipe.retrievalReads !== 0 ||
    recipe.repairCalls !== 0 ||
    recipe.judgeCalls !== 0 ||
    recipe.comparisonCalls !== 0 ||
    recipe.backgroundCalls !== 0 ||
    recipe.maxInFlightCalls !== 1 ||
    recipe.maxReasoningTokens !== 0
  ) {
    failures.push('gate_recipe_too_rich');
  }
  if (manifest.packet.inputTokenUpperBound > recipe.maxInputTokens) {
    failures.push('input_limit_exceeded');
  }
  const pricedMillionthsOfMicrousd =
    BigInt(manifest.packet.inputTokenUpperBound) *
      BigInt(manifest.route.inputMicrousdPerMillion) +
    BigInt(recipe.maxGeneratedTokens) *
      BigInt(manifest.route.outputMicrousdPerMillion);
  const requiredReservationMicrousd =
    (pricedMillionthsOfMicrousd + 999_999n) / 1_000_000n;
  const reservationMicrousd = BigInt(manifest.reservationMicrousd);
  if (
    reservationMicrousd < requiredReservationMicrousd ||
    reservationMicrousd > BigInt(recipe.maxMicrousd)
  ) {
    failures.push('reservation_mismatch');
  }
  if (
    Date.parse(input.funding.verifiedAt) > now ||
    Date.parse(input.funding.validUntil) <= now
  ) {
    failures.push('funding_snapshot_stale');
  }
  if (
    BigInt(input.funding.availableMicrousd) <
    BigInt(manifest.reservationMicrousd)
  ) {
    failures.push('funding_insufficient');
  }
  if (!input.funding.accountingReady) {
    failures.push('accounting_not_ready');
  }
  if (!input.traceReady) {
    failures.push('trace_not_ready');
  }

  return failures.length === 0
    ? { eligible: true, manifest }
    : { eligible: false, manifest, failures };
}
