import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { storyLaunch } from '@offscreen/db/launch-schema';
import { StoryError } from '@offscreen/story-engine/stories';
import {
  storyLaunchRequestSchema,
  type StoryLaunchRequest,
  type StoryLaunchStatus,
} from '@offscreen/contracts/story-launch';
import type { Database } from '@offscreen/db';
import { storytellerWriterMission } from '@offscreen/db/storyteller-schema';
import type { DocumentStore } from '@offscreen/documents';
import { hashCanonicalJson } from '@offscreen/documents';
import {
  acceptWriterSceneProposal,
  admitLaunchWriterMission,
  pinLaunchPresetRoot,
  publishLaunchOpeningScene,
  runScriptedLaunchWriter,
  stageLaunchPromptLibrary,
  WriterSceneProposalError,
} from '@offscreen/story-engine/storyteller';
import {
  WRITER_MANDATORY_TOOL_NAMES,
  writerMissionCaptureV2OpeningSchema,
  writerOpeningSceneProposalV2Schema,
} from '@offscreen/storyteller/tasks';
import { z } from 'zod';
import {
  admitLaunchOperation,
  LaunchLedgerError,
  readLaunchOperation,
  toPublicLaunchStatus,
} from './launch-ledger.js';

const LAUNCH_SCRIPTED_PROFILE_HASH = createHash('sha256')
  .update('launch-scripted-profile.v1', 'utf8')
  .digest('hex');

const STORY_PROMPT_SECTION = 'STORY_PROMPT.md' as const;

function mapLaunchLedgerError(error: LaunchLedgerError): never {
  if (error.code === 'launch_conflict') {
    throw new StoryError('conflict');
  }
  if (error.code === 'launch_not_found') {
    throw new StoryError('not_found');
  }
  throw new StoryError('invalid');
}

async function assertLaunchOperationOwnerScope(
  database: Database,
  ownerId: string,
  operationId: string,
): Promise<void> {
  const rows = await database.db
    .select({ ownerId: storyLaunch.ownerId })
    .from(storyLaunch)
    .where(eq(storyLaunch.operationId, operationId))
    .limit(1);
  const existing = rows[0];
  if (existing && existing.ownerId !== ownerId) {
    throw new StoryError('not_found');
  }
}

function assertLaunchOperationId(
  urlOperationId: string,
  body: StoryLaunchRequest,
): void {
  const parsed = z.uuid().safeParse(urlOperationId);
  if (!parsed.success || parsed.data !== body.operationId) {
    throw new StoryError('conflict');
  }
}

function buildLaunchWriterCapture(input: {
  generationId: string;
  ownerId: string;
  reservedStoryId: string;
  reservedFirstPassageId: string;
  libraryRootHash: string;
  libraryRootRevision: number;
}) {
  const captureBody = {
    version: 'writer-mission.v2' as const,
    generationId: input.generationId,
    operationId: input.generationId,
    ownerId: input.ownerId,
    storyId: input.reservedStoryId,
    libraryRootHash: input.libraryRootHash,
    libraryRootRevision: input.libraryRootRevision,
    profileObjectHash: LAUNCH_SCRIPTED_PROFILE_HASH,
    skillObjectHashes: [] as string[],
    toolsAllowlist: [...WRITER_MANDATORY_TOOL_NAMES],
    sceneScope: {
      kind: 'opening' as const,
      reservedStoryId: input.reservedStoryId,
      reservedFirstPassageId: input.reservedFirstPassageId,
    },
    modelSelection: {
      provider: 'openrouter' as const,
      model: 'scripted-offline',
    },
    budgets: {
      maxModelRounds: 4,
      maxInputTokens: 8000,
      maxGeneratedTokens: 2000,
      maxMicrousd: '250000',
      deadlineMs: 120_000,
    },
  };
  const capturedRequestHash = hashCanonicalJson(captureBody);
  return writerMissionCaptureV2OpeningSchema.parse({
    ...captureBody,
    capturedRequestHash,
  });
}

function openingParagraphs(request: StoryLaunchRequest): string[] {
  if (request.source.kind === 'prompt') {
    return [request.source.prompt];
  }
  if (request.source.customPrompt) {
    return [request.source.customPrompt];
  }
  return ['The prepared experience opens.'];
}

function buildOpeningProposal(
  request: StoryLaunchRequest,
  library:
    | { libraryRootHash: string; objectHash: string }
    | { libraryRootHash: string },
) {
  const paragraphs = openingParagraphs(request);
  const sourceEvidence =
    request.source.kind === 'prompt' && 'objectHash' in library
      ? [
          {
            rootHash: library.libraryRootHash,
            objectHash: library.objectHash,
            section: STORY_PROMPT_SECTION,
            assertedAsFact: false,
          },
        ]
      : [];
  return writerOpeningSceneProposalV2Schema.parse({
    version: 2,
    summary: 'Launch opening scene.',
    stagedObjectHashes: [],
    sourceEvidence,
    scene: {
      content: { version: 1, title: 'Opening', paragraphs },
      interaction: null,
    },
  });
}

function storageLibraryReader(storage: DocumentStore) {
  return {
    readManifest: async () => {
      throw new Error('v1 manifest not supported for launch library');
    },
    readDocument: async (objectHash: string) => {
      const document = await storage.readDocument(objectHash);
      return { envelope: document.envelope, body: document.body };
    },
    readSourcePassage: async (objectHash: string) => {
      const passage = await storage.readSourcePassage(objectHash);
      return { envelope: passage.envelope, content: passage.content };
    },
    readLibraryRoot: (rootHash: string) => storage.readLibraryRoot(rootHash),
    readLibraryNode: (hash: string) => storage.readLibraryNode(hash),
  };
}

type LaunchLibraryStaging =
  | {
      kind: 'prompt';
      libraryRootHash: string;
      libraryRootRevision: number;
      objectHash: string;
    }
  | {
      kind: 'preset';
      libraryRootHash: string;
      libraryRootRevision: number;
    };

async function finalizeReadyLaunch(
  database: Database,
  storage: DocumentStore,
  input: {
    ownerId: string;
    operationId: string;
    request: StoryLaunchRequest;
    reservedStoryId: string;
    reservedFirstPassageId: string;
    generationId: string;
    library: LaunchLibraryStaging;
  },
): Promise<StoryLaunchStatus> {
  const writerResult = await runScriptedLaunchWriter(
    database,
    input.reservedStoryId,
  );
  if (writerResult === 'failed' || writerResult === 'uncertain') {
    const operation = await readLaunchOperation(database, {
      ownerId: input.ownerId,
      operationId: input.operationId,
    });
    return toPublicLaunchStatus(operation);
  }

  const missions = await database.db
    .select()
    .from(storytellerWriterMission)
    .where(eq(storytellerWriterMission.generationId, input.generationId))
    .limit(1);
  const mission = missions[0];
  if (!mission) {
    throw new StoryError('unavailable');
  }

  const proposal = buildOpeningProposal(
    input.request,
    input.library.kind === 'prompt'
      ? {
          libraryRootHash: input.library.libraryRootHash,
          objectHash: input.library.objectHash,
        }
      : { libraryRootHash: input.library.libraryRootHash },
  );

  if (input.request.source.kind === 'prompt') {
    const capture = buildLaunchWriterCapture({
      generationId: input.generationId,
      ownerId: input.ownerId,
      reservedStoryId: input.reservedStoryId,
      reservedFirstPassageId: input.reservedFirstPassageId,
      libraryRootHash: input.library.libraryRootHash,
      libraryRootRevision: input.library.libraryRootRevision,
    });
    try {
      await acceptWriterSceneProposal(database, storage, {
        missionId: mission.id,
        capture,
        access: { privateDocuments: true },
        reader: storageLibraryReader(storage),
        proposal,
      });
    } catch (error) {
      if (error instanceof WriterSceneProposalError) {
        throw new StoryError('invalid', error.code);
      }
      throw error;
    }
  }

  await publishLaunchOpeningScene(database, storage, {
    ownerId: input.ownerId,
    operationId: input.operationId,
    proposal,
  });

  const ready = await readLaunchOperation(database, {
    ownerId: input.ownerId,
    operationId: input.operationId,
  });
  return toPublicLaunchStatus(ready);
}

export type LaunchPutServiceOptions = {
  documentStore?: DocumentStore;
};

export function createLaunchPutService(
  database: Database,
  options: LaunchPutServiceOptions = {},
) {
  const resolveStorage = (storage?: DocumentStore): DocumentStore => {
    if (storage) return storage;
    if (options.documentStore) return options.documentStore;
    throw new StoryError('unavailable', 'document_store');
  };

  return {
    async getLaunch(input: {
      ownerId: string;
      operationId: string;
    }): Promise<StoryLaunchStatus> {
      try {
        await assertLaunchOperationOwnerScope(
          database,
          input.ownerId,
          input.operationId,
        );
        const operation = await readLaunchOperation(database, {
          ownerId: input.ownerId,
          operationId: input.operationId,
        });
        return toPublicLaunchStatus(operation);
      } catch (error) {
        if (error instanceof LaunchLedgerError) {
          mapLaunchLedgerError(error);
        }
        throw error;
      }
    },

    async putLaunch(input: {
      ownerId: string;
      operationId: string;
      body: unknown;
    }): Promise<StoryLaunchStatus> {
      const parsed = storyLaunchRequestSchema.safeParse(input.body);
      if (!parsed.success) {
        throw new StoryError('invalid');
      }
      try {
        assertLaunchOperationId(input.operationId, parsed.data);
      } catch (error) {
        if (error instanceof StoryError) {
          throw error;
        }
        throw error;
      }
      await assertLaunchOperationOwnerScope(
        database,
        input.ownerId,
        parsed.data.operationId,
      );

      let operation;
      try {
        operation = await admitLaunchOperation(database, {
          ownerId: input.ownerId,
          request: parsed.data,
        });
      } catch (error) {
        if (error instanceof LaunchLedgerError) {
          mapLaunchLedgerError(error);
        }
        throw error;
      }

      if (operation.state === 'ready') {
        return toPublicLaunchStatus(operation);
      }

      const storage = resolveStorage();

      let library: LaunchLibraryStaging;
      if (parsed.data.source.kind === 'prompt') {
        const promptStaging = await stageLaunchPromptLibrary(storage, {
          ownerId: input.ownerId,
          prompt: parsed.data.source.prompt,
        });
        library = {
          kind: 'prompt',
          libraryRootHash: promptStaging.libraryRootHash,
          libraryRootRevision: promptStaging.libraryRootRevision,
          objectHash: promptStaging.objectHash,
        };
      } else {
        const pinned = pinLaunchPresetRoot({
          presetRootHash: parsed.data.source.presetRootHash,
        });
        library = {
          kind: 'preset',
          libraryRootHash: pinned.libraryRootHash,
          libraryRootRevision: pinned.libraryRootRevision,
        };
      }

      try {
        await admitLaunchWriterMission(database, {
          ownerId: input.ownerId,
          operationId: parsed.data.operationId,
          libraryRootHash: library.libraryRootHash,
          libraryRootRevision: library.libraryRootRevision,
        });
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === 'launch_not_admitted'
        ) {
          throw new StoryError('invalid', 'not-admitted');
        }
        throw error;
      }

      const admitted = await readLaunchOperation(database, {
        ownerId: input.ownerId,
        operationId: parsed.data.operationId,
      });
      if (!admitted.generationId) {
        throw new StoryError('unavailable');
      }

      return finalizeReadyLaunch(database, storage, {
        ownerId: input.ownerId,
        operationId: parsed.data.operationId,
        request: parsed.data,
        reservedStoryId: admitted.reservedStoryId,
        reservedFirstPassageId: admitted.reservedFirstPassageId,
        generationId: admitted.generationId,
        library,
      });
    },
  };
}