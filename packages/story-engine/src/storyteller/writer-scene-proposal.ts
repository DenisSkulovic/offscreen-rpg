/**
 * WR03 T07: validate typed submit_scene / final proposals without publication.
 */
import { eq } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import { storytellerWriterMission } from '@offscreen/db/storyteller-schema';
import type { DocumentStore } from '@offscreen/documents';
import { passageContentSchema } from '@offscreen/story-interface/stories';
import type { z } from 'zod';
import {
  writerSceneProposalSchema,
  type WriterMissionCapture,
  type WriterOpeningSceneProposal,
  type WriterSceneProposal,
} from '@offscreen/storyteller/tasks';

type PassageContent = z.infer<typeof passageContentSchema>;
import {
  createPinnedLibraryNavigation,
  LibraryNavigationError,
  type LibraryAccess,
} from './library-navigation';

type LibraryReader = Parameters<typeof createPinnedLibraryNavigation>[0]['reader'];

function createStorageLibraryReader(storage: DocumentStore): LibraryReader {
  return {
    readManifest: async () => {
      throw new Error('v1 manifest not supported for workdesk stage');
    },
    readDocument: async (objectHash: string) => {
      const document = await storage.readDocument(objectHash);
      return {
        envelope: document.envelope,
        body: document.body,
      };
    },
    readSourcePassage: async (objectHash: string) => {
      const passage = await storage.readSourcePassage(objectHash);
      return {
        envelope: passage.envelope,
        content: passage.content,
      };
    },
    readLibraryRoot: (rootHash: string) => storage.readLibraryRoot(rootHash),
    readLibraryNode: (hash: string) => storage.readLibraryNode(hash),
  };
}

export class WriterSceneProposalError extends Error {
  constructor(
    readonly code:
      | 'mission-not-found'
      | 'unknown-staged-hash'
      | 'foreign-citation-root'
      | 'forged-citation'
      | 'private-possibility-as-fact',
  ) {
    super(code);
    this.name = 'WriterSceneProposalError';
  }
}

type WriterSceneProposalSourceEvidence = Readonly<{
  rootHash: string;
  objectHash: string;
  section: string;
  assertedAsFact: boolean;
  path: string;
  documentId: string;
  revision: number;
  kind: string;
}>;

export type WriterSceneProposalAcceptedV1 = Readonly<{
  format: 'offscreen.writer-scene-proposal.v1';
  summary: string;
  stagedObjectHashes: readonly string[];
  sourceEvidence: readonly WriterSceneProposalSourceEvidence[];
}>;

export type WriterSceneProposalAcceptedV2 = Readonly<{
  format: 'offscreen.writer-scene-proposal.v2';
  summary: string;
  scene: Readonly<{
    content: PassageContent;
    interaction: WriterOpeningSceneProposal['scene']['interaction'];
  }>;
  stagedObjectHashes: readonly string[];
  sourceEvidence: readonly WriterSceneProposalSourceEvidence[];
}>;

export type WriterSceneProposalAccepted =
  | WriterSceneProposalAcceptedV1
  | WriterSceneProposalAcceptedV2;

async function listRootObjectHashes(
  navigation: ReturnType<typeof createPinnedLibraryNavigation>,
): Promise<Set<string>> {
  const hashes = new Set<string>();
  let after: string | undefined;
  do {
    const page = await navigation.browse({
      prefix: '',
      ...(after === undefined ? {} : { after }),
      pageSize: 128,
    });
    for (const entry of page.entries) {
      hashes.add(entry.objectHash);
    }
    after = page.nextAfter ?? undefined;
  } while (after !== undefined);
  return hashes;
}

/**
 * Validates staged hashes and library provenance; does not publish or call Game Authority.
 */
export async function acceptWriterSceneProposal(
  database: Database,
  storage: DocumentStore,
  input: {
    missionId: string;
    capture: WriterMissionCapture;
    access: LibraryAccess;
    reader: LibraryReader;
    proposal: WriterSceneProposal;
  },
): Promise<WriterSceneProposalAccepted> {
  const proposal = writerSceneProposalSchema.parse(input.proposal);
  const [mission] = await database.db
    .select({
      stageRootHash: storytellerWriterMission.stageRootHash,
      stageRootRevision: storytellerWriterMission.stageRootRevision,
    })
    .from(storytellerWriterMission)
    .where(eq(storytellerWriterMission.id, input.missionId))
    .limit(1);
  if (!mission) {
    throw new WriterSceneProposalError('mission-not-found');
  }

  const authorize = async () => input.access;
  const stageHashes = new Set<string>();
  if (
    mission.stageRootHash !== null &&
    mission.stageRootRevision !== null &&
    proposal.stagedObjectHashes.length > 0
  ) {
    const stageNavigation = createPinnedLibraryNavigation({
      reader: createStorageLibraryReader(storage),
      storyId: input.capture.storyId,
      rootHash: mission.stageRootHash,
      rootRevision: mission.stageRootRevision,
      authorize: async () => ({ privateDocuments: true }),
    });
    const stagedInRoot = await listRootObjectHashes(stageNavigation);
    for (const hash of stagedInRoot) {
      stageHashes.add(hash);
    }
  }

  for (const objectHash of proposal.stagedObjectHashes) {
    if (!stageHashes.has(objectHash)) {
      throw new WriterSceneProposalError('unknown-staged-hash');
    }
  }

  const libraryNavigation = createPinnedLibraryNavigation({
    reader: input.reader,
    storyId: input.capture.storyId,
    rootHash: input.capture.libraryRootHash,
    rootRevision: input.capture.libraryRootRevision,
    authorize,
  });

  const provenance: WriterSceneProposalSourceEvidence[] = [];
  for (const citation of proposal.sourceEvidence) {
    if (citation.rootHash !== input.capture.libraryRootHash) {
      throw new WriterSceneProposalError('foreign-citation-root');
    }
    try {
      const opened = await libraryNavigation.readByObjectHash({
        objectHash: citation.objectHash,
      });
      if (
        citation.assertedAsFact &&
        opened.kind === 'private-possibility'
      ) {
        throw new WriterSceneProposalError('private-possibility-as-fact');
      }
      provenance.push({
        rootHash: citation.rootHash,
        objectHash: citation.objectHash,
        section: citation.section,
        assertedAsFact: citation.assertedAsFact,
        path: opened.path,
        documentId: opened.documentId,
        revision: opened.revision,
        kind: opened.kind,
      });
    } catch (error) {
      if (error instanceof WriterSceneProposalError) {
        throw error;
      }
      if (
        error instanceof LibraryNavigationError &&
        error.code === 'not-found'
      ) {
        throw new WriterSceneProposalError('forged-citation');
      }
      throw error;
    }
  }

  if (proposal.version === 2) {
    return {
      format: 'offscreen.writer-scene-proposal.v2',
      summary: proposal.summary,
      scene: {
        content: proposal.scene.content,
        interaction: proposal.scene.interaction,
      },
      stagedObjectHashes: proposal.stagedObjectHashes,
      sourceEvidence: provenance,
    };
  }

  return {
    format: 'offscreen.writer-scene-proposal.v1',
    summary: proposal.summary,
    stagedObjectHashes: proposal.stagedObjectHashes,
    sourceEvidence: provenance,
  };
}