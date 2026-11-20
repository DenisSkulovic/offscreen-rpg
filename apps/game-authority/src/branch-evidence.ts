import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import {
  BranchPinnedMemoryError,
  resolveBranchPinnedEvidence,
} from '@offscreen/application/storyteller';
import type { DocumentStore } from '@offscreen/documents';
import {
  parseStorytellerTaskCustodyEvidenceRequest,
  storytellerTaskCustodyEvidenceResponseSchema,
  storytellerTaskCustodyFetchResponseSchema,
} from '@offscreen/contracts/storyteller-task-custody';
import type { StorytellerTaskCustodySeam } from './application.js';

const frozenTaskContextSchema = z.object({
  source: z.object({ storyId: z.uuid() }),
  context: z.object({
    canonicalKnowledge: z.object({
      rootHash: z.string().regex(/^[0-9a-f]{64}$/),
      rootRevision: z.number().int().positive(),
    }),
  }),
});

export type BranchEvidenceServerOptions = {
  custody?: StorytellerTaskCustodySeam;
  documentStore?: DocumentStore;
  timeoutMs: number;
};

export type BranchEvidenceDeps = {
  withTimeout: <T>(work: Promise<T>, timeoutMs: number) => Promise<T>;
  readRawBody: (request: IncomingMessage) => Promise<Buffer | undefined>;
  sendCustody: (response: ServerResponse, status: number, body: unknown) => void;
  sendCustodyHttpError: (
    response: ServerResponse,
    status: number,
    code: 'invalid' | 'not_found' | 'conflict' | 'unavailable' | 'unauthorized',
    reason?: string,
  ) => void;
};

export async function handleBranchEvidence(
  request: IncomingMessage,
  response: ServerResponse,
  generationId: string,
  options: BranchEvidenceServerOptions,
  deps: BranchEvidenceDeps,
): Promise<void> {
  if (!options.custody) {
    deps.sendCustodyHttpError(response, 503, 'unavailable');
    return;
  }

  const raw = await deps.readRawBody(request);
  const parsed = parseStorytellerTaskCustodyEvidenceRequest(raw ?? '');
  if (!parsed.ok) {
    deps.sendCustodyHttpError(response, 400, 'invalid', parsed.reason);
    return;
  }
  const requestBody = parsed.value;

  let fetched: unknown;
  try {
    fetched = await deps.withTimeout(
      options.custody.fetchCommittedGeneration(generationId),
      options.timeoutMs,
    );
  } catch {
    deps.sendCustodyHttpError(response, 503, 'unavailable');
    return;
  }

  const fetchParsed = storytellerTaskCustodyFetchResponseSchema.safeParse(fetched);
  if (!fetchParsed.success) {
    deps.sendCustodyHttpError(response, 503, 'unavailable');
    return;
  }

  const outcome = fetchParsed.data;
  if (outcome.status !== 'ready') {
    const reason = outcome.reason;
    if (
      reason === 'unknown-generation' ||
      reason === 'unreadable-task' ||
      reason === 'unsupported-execution'
    ) {
      deps.sendCustody(
        response,
        200,
        storytellerTaskCustodyEvidenceResponseSchema.parse({
          status: 'refused',
          reason,
        }),
      );
      return;
    }
    deps.sendCustodyHttpError(response, 503, 'unavailable');
    return;
  }

  const trustedOwnerId = outcome.ownerId;
  const taskParsed = frozenTaskContextSchema.safeParse(outcome.task);
  if (!taskParsed.success) {
    deps.sendCustody(
      response,
      200,
      storytellerTaskCustodyEvidenceResponseSchema.parse({
        status: 'refused',
        reason: 'unreadable-task',
      }),
    );
    return;
  }

  const frozenStoryId = taskParsed.data.source.storyId;
  const frozenRootHash = taskParsed.data.context.canonicalKnowledge.rootHash;
  const frozenRootRevision =
    taskParsed.data.context.canonicalKnowledge.rootRevision;

  if (requestBody.storyId !== frozenStoryId) {
    deps.sendCustody(
      response,
      200,
      storytellerTaskCustodyEvidenceResponseSchema.parse({
        status: 'refused',
        reason: 'story-mismatch',
      }),
    );
    return;
  }

  if (
    outcome.pinnedRoot !== requestBody.rootHash ||
    frozenRootHash !== requestBody.rootHash ||
    frozenRootRevision !== requestBody.rootRevision
  ) {
    deps.sendCustody(
      response,
      200,
      storytellerTaskCustodyEvidenceResponseSchema.parse({
        status: 'refused',
        reason: 'root-mismatch',
      }),
    );
    return;
  }

  if (!options.documentStore) {
    deps.sendCustodyHttpError(response, 503, 'unavailable');
    return;
  }

  try {
    const resolved = await deps.withTimeout(
      resolveBranchPinnedEvidence({
        storage: options.documentStore,
        ownerId: trustedOwnerId,
        storyId: requestBody.storyId,
        rootHash: requestBody.rootHash,
        rootRevision: requestBody.rootRevision,
        handles: requestBody.handles,
        authorize: async ({ ownerId, storyId }) =>
          ownerId === trustedOwnerId && storyId === frozenStoryId,
      }),
      options.timeoutMs,
    );

    deps.sendCustody(
      response,
      200,
      storytellerTaskCustodyEvidenceResponseSchema.parse({
        status: 'ready',
        generationId,
        ownerId: trustedOwnerId,
        rootHash: requestBody.rootHash,
        rootRevision: requestBody.rootRevision,
        partial: false,
        evidence: resolved.evidence,
      }),
    );
  } catch (error) {
    if (error instanceof BranchPinnedMemoryError) {
      const reasonMap = {
        'stale-root': 'root-mismatch',
        'unknown-handle': 'unknown-handle',
        'read-limit': 'read-limit',
        'not-owned': 'story-mismatch',
      } as const;
      deps.sendCustody(
        response,
        200,
        storytellerTaskCustodyEvidenceResponseSchema.parse({
          status: 'refused',
          reason: reasonMap[error.code],
        }),
      );
      return;
    }
    deps.sendCustodyHttpError(response, 503, 'unavailable');
  }
}