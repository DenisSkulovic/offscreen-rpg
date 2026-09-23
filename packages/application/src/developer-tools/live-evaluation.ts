import {
  liveEvaluationManifestSchema,
  memoryEvaluationManifestSchema,
  type LiveEvaluationManifest,
  type LiveEvaluationRecipe,
  type MemoryEvaluationManifest,
  type MemoryEvaluationPacketConfig,
} from '@offscreen/contracts/live-evaluation';

function requiredReservationMicrousd(input: {
  route: LiveEvaluationManifest['route'];
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
  // Runtime reserves the admitted operation envelope, not the current body's
  // byte count. Keep the held preview identical to that fail-closed boundary.
  const reservationMicrousd = requiredReservationMicrousd(input).toString();
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
  const requiredReservation = requiredReservationMicrousd({
    route: manifest.route,
    recipe,
  });
  const reservationMicrousd = BigInt(manifest.reservationMicrousd);
  if (
    reservationMicrousd < requiredReservation ||
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

export function createMemoryEvaluationManifest(input: {
  config: MemoryEvaluationPacketConfig;
  createdAt: string;
  review: {
    generationId: string;
    attemptId: string;
    packetSha256: string;
    state: string;
    serializedBytes: number;
  };
}): MemoryEvaluationManifest {
  if (input.review.state !== 'awaiting-review') {
    throw new Error('Memory evaluation packet must be awaiting review');
  }
  if (
    input.review.serializedBytes >
    input.config.recipe.maxSerializedBytesPerRequest
  ) {
    throw new Error('Memory evaluation packet exceeds its serialized limit');
  }
  const { maxContextTokens: _maxContextTokens, ...route } = input.config.route;
  return memoryEvaluationManifestSchema.parse({
    version: 'memory-live-evaluation.v1',
    id: input.config.id,
    gate: 'bounded-memory-operation',
    case: input.config.case,
    packet: {
      generationId: input.review.generationId,
      attemptId: input.review.attemptId,
      sha256: input.review.packetSha256,
      serializedBytes: input.review.serializedBytes,
      reservedInputTokens: Math.min(
        input.review.serializedBytes,
        input.config.recipe.maxInputTokensPerRound,
      ),
      inputBoundMethod: 'utf8-byte-capped-by-route',
    },
    route,
    recipe: input.config.recipe,
    reservationMicrousd: '0',
    createdAt: input.createdAt,
  });
}

export type MemoryEvaluationPreflightFailure =
  | 'packet_not_held'
  | 'packet_identity_mismatch'
  | 'route_verification_stale'
  | 'route_not_free'
  | 'packet_limit_exceeded'
  | 'accounting_not_ready'
  | 'trace_not_ready';

/** Credential-free review of the first attempt; it cannot release either round. */
export function preflightMemoryEvaluation(input: {
  manifest: unknown;
  now: string;
  review: {
    generationId: string;
    attemptId: string;
    packetSha256: string;
    state: string;
  };
  accountingReady: boolean;
  traceReady: boolean;
}) {
  const manifest = memoryEvaluationManifestSchema.parse(input.manifest);
  const failures: MemoryEvaluationPreflightFailure[] = [];
  const now = Date.parse(input.now);
  if (input.review.state !== 'awaiting-review') {
    failures.push('packet_not_held');
  }
  if (
    input.review.generationId !== manifest.packet.generationId ||
    input.review.attemptId !== manifest.packet.attemptId ||
    input.review.packetSha256 !== manifest.packet.sha256
  ) {
    failures.push('packet_identity_mismatch');
  }
  if (
    Date.parse(manifest.route.verifiedAt) > now ||
    Date.parse(manifest.route.validUntil) <= now
  ) {
    failures.push('route_verification_stale');
  }
  if (
    manifest.route.inputMicrousdPerMillion !== '0' ||
    manifest.route.outputMicrousdPerMillion !== '0' ||
    manifest.reservationMicrousd !== '0'
  ) {
    failures.push('route_not_free');
  }
  if (
    manifest.packet.serializedBytes >
      manifest.recipe.maxSerializedBytesPerRequest ||
    manifest.packet.reservedInputTokens > manifest.recipe.maxInputTokensPerRound
  ) {
    failures.push('packet_limit_exceeded');
  }
  if (!input.accountingReady) failures.push('accounting_not_ready');
  if (!input.traceReady) failures.push('trace_not_ready');
  return failures.length === 0
    ? { eligible: true as const, manifest }
    : { eligible: false as const, manifest, failures };
}
