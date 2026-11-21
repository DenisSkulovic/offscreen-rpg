import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { CapturedProviderRequest } from './opening';
import {
  writerOpeningSceneProposalV2Schema,
  writerRoundDecisionSchema,
  writerSceneProposalV1Schema,
  writerSceneProposalV3Schema,
  writerToolCallSchema,
  type WriterMissionCapture,
  type WriterToolInvocationResult,
} from './writer-mission';

const WRITER_ROUND_SYSTEM =
  'You are a writer agent on a bounded mission. Reply with exactly one JSON object: either tool-calls with typed tool requests, or a final scene proposal.';

/**
 * Wire schema for one capture version.
 * Version-1 requests must stay byte-identical to the pre-WR07N oracle, so they
 * offer only the version-1 proposal. Opening captures offer only the version-2
 * scene body. The shared parser still accepts both; capture validation rejects
 * a crossed pair.
 */
function writerRoundDecisionSchemaForCapture(capture: WriterMissionCapture) {
  const proposalSchema =
    capture.version === 'writer-mission.v1'
      ? writerSceneProposalV1Schema
      : capture.version === 'writer-mission.v2'
        ? writerOpeningSceneProposalV2Schema
        : writerSceneProposalV3Schema;

  return z
    .discriminatedUnion('kind', [
      z.strictObject({
        kind: z.literal('tool-calls'),
        calls: z.array(writerToolCallSchema).min(1).max(8),
      }),
      z.strictObject({
        kind: z.literal('final'),
        proposal: proposalSchema,
      }),
    ])
    .superRefine((decision, context) => {
      if (decision.kind !== 'tool-calls') {
        return;
      }
      const ids = decision.calls.map((call) => call.id);
      if (new Set(ids).size !== ids.length) {
        context.addIssue({
          code: 'custom',
          path: ['calls'],
          message: 'Tool-call ids must be unique within a round',
        });
      }
    });
}

/** Domain JSON Schema for writer-round decisions (strict projection happens at the wire). */
export function writerRoundOutputJsonSchema(
  capture?: WriterMissionCapture,
): unknown {
  if (capture === undefined) {
    return z.toJSONSchema(writerRoundDecisionSchema);
  }
  return z.toJSONSchema(writerRoundDecisionSchemaForCapture(capture));
}

function writerRoundPinsForCapture(
  capture: WriterMissionCapture,
): Record<string, unknown> {
  const leading = {
    libraryRootHash: capture.libraryRootHash,
    libraryRootRevision: capture.libraryRootRevision,
    profileObjectHash: capture.profileObjectHash,
    skillObjectHashes: capture.skillObjectHashes,
    toolsAllowlist: capture.toolsAllowlist,
  };
  if (capture.version === 'writer-mission.v1') {
    return { ...leading, sceneFrontier: capture.sceneFrontier };
  }
  if (capture.version === 'writer-mission.v2') {
    const { sceneScope } = capture;
    return {
      ...leading,
      sceneScope: {
        kind: sceneScope.kind,
        reservedStoryId: sceneScope.reservedStoryId,
        reservedFirstPassageId: sceneScope.reservedFirstPassageId,
      },
    };
  }
  if (capture.version === 'writer-mission.v3') {
    const { sceneScope } = capture;
    return {
      ...leading,
      sceneScope: {
        kind: sceneScope.kind,
        baseSceneSequence: sceneScope.baseSceneSequence,
        basePassageId: sceneScope.basePassageId,
        baseCheckpointHash: sceneScope.baseCheckpointHash,
        baseRootHash: sceneScope.baseRootHash,
        baseRootRevision: sceneScope.baseRootRevision,
        baseNarrativeRevision: sceneScope.baseNarrativeRevision,
        baseCampaignStateRevision: sceneScope.baseCampaignStateRevision,
        controllingIntentOrReceiptId: sceneScope.controllingIntentOrReceiptId,
        scenarioKind: sceneScope.scenarioKind,
      },
    };
  }
  throw new Error('continuation capture is not an opening round');
}

/** Compile pinned mission context and durable prior tool summaries into one provider request. */
export function compileWriterRoundCapturedRequest(
  capture: WriterMissionCapture,
  priorToolResults: readonly WriterToolInvocationResult[],
): CapturedProviderRequest {
  return {
    messages: [
      { role: 'system', content: WRITER_ROUND_SYSTEM },
      {
        role: 'user',
        content: JSON.stringify({
          version: 'writer-round.v1',
          pins: writerRoundPinsForCapture(capture),
          priorToolResults,
        }),
      },
    ],
    outputSchema: writerRoundOutputJsonSchema(
      capture,
    ) as CapturedProviderRequest['outputSchema'],
  };
}

/** CAS hash for the captured request object (pre-wire); wire SHA covers the full HTTP body. */
export function hashWriterRoundCapturedRequest(
  request: CapturedProviderRequest,
): string {
  return createHash('sha256')
    .update(JSON.stringify(request), 'utf8')
    .digest('hex');
}
