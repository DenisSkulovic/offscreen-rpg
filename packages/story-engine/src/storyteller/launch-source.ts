import type { DocumentStore } from '@offscreen/documents';
import {
  applyLibraryBatch,
  canonicalDocumentSchema,
  createEmptyLibraryIndex,
  documentManifestEntrySchema,
  stableNamespacedDocumentId,
  type LibraryIndex,
} from '@offscreen/documents';

const LAUNCH_STORY_PROMPT_PATH = 'STORY_PROMPT.md' as const;

async function persistLibraryIndex(
  storage: DocumentStore,
  library: LibraryIndex,
): Promise<string> {
  for (const node of library.store.values()) {
    await storage.putLibraryNode(node);
  }
  return storage.putLibraryRoot(library.root);
}

export type StageLaunchPromptLibraryInput = {
  ownerId: string;
  prompt: string;
};

export type StageLaunchPromptLibraryResult = {
  libraryRootHash: string;
  libraryRootRevision: 1;
  documentId: string;
  objectHash: string;
};

/** Stages one verbatim Story Prompt as a new Library-v2 root (revision 1). */
export async function stageLaunchPromptLibrary(
  storage: DocumentStore,
  input: StageLaunchPromptLibraryInput,
): Promise<StageLaunchPromptLibraryResult> {
  const documentId = stableNamespacedDocumentId(
    'launch-story-prompt',
    input.ownerId,
    LAUNCH_STORY_PROMPT_PATH,
  );

  const document = canonicalDocumentSchema.parse({
    format: 'offscreen.document.v1',
    envelope: {
      documentId,
      schemaVersion: 1,
      revision: 1,
      kind: 'premise',
      authority: 'source',
      visibility: 'storyteller-private',
      sources: [],
    },
    title: 'STORY_PROMPT',
    body: input.prompt,
  });
  const objectHash = await storage.putDocument(document);

  const entry = documentManifestEntrySchema.parse({
    revision: 1,
    path: LAUNCH_STORY_PROMPT_PATH,
    documentId,
    objectHash,
    kind: 'premise',
    authority: 'source',
    visibility: 'storyteller-private',
  });

  const library = applyLibraryBatch(createEmptyLibraryIndex(), [
    { op: 'create', entry },
  ]);
  const libraryRootHash = await persistLibraryIndex(storage, library);

  return {
    libraryRootHash,
    libraryRootRevision: 1,
    documentId,
    objectHash,
  };
}

export type PinLaunchPresetRootInput = {
  presetRootHash: string;
};

export type PinLaunchPresetRootResult = {
  libraryRootHash: string;
  libraryRootRevision: 1;
};

/** Pins a preset library root without writing storage or hashing a prompt. */
export function pinLaunchPresetRoot(
  input: PinLaunchPresetRootInput,
): PinLaunchPresetRootResult {
  return {
    libraryRootHash: input.presetRootHash,
    libraryRootRevision: 1,
  };
}

export function assertLaunchSourceOwner(
  expectedOwnerId: string,
  actualOwnerId: string,
): void {
  if (expectedOwnerId !== actualOwnerId) {
    throw new Error('launch_owner_mismatch');
  }
}