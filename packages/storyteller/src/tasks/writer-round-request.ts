import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { CapturedProviderRequest } from './opening';
import {
  writerRoundDecisionSchema,
  type WriterMissionCapture,
  type WriterToolInvocationResult,
} from './writer-mission';

const WRITER_ROUND_SYSTEM =
  'You are a writer agent on a bounded mission. Reply with exactly one JSON object: either tool-calls with typed tool requests, or a final scene proposal.';

/** Domain JSON Schema for writer-round decisions (strict projection happens at the wire). */
export function writerRoundOutputJsonSchema(): unknown {
  return z.toJSONSchema(writerRoundDecisionSchema);
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
    outputSchema:
      writerRoundOutputJsonSchema() as CapturedProviderRequest['outputSchema'],
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
