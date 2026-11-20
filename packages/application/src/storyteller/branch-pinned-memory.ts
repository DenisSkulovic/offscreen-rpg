import type { DocumentStore } from '@offscreen/documents';

export class BranchPinnedMemoryError extends Error {
  readonly code: 'not-owned' | 'stale-root' | 'unknown-handle' | 'read-limit';

  constructor(code: BranchPinnedMemoryError['code']) {
    super(code);
    this.name = 'BranchPinnedMemoryError';
    this.code = code;
  }
}

const maximumBranchPinnedHandles = 8;

export async function resolveBranchPinnedEvidence(input: {
  storage: DocumentStore;
  authorize: (args: { ownerId: string; storyId: string }) => Promise<boolean>;
  ownerId: string;
  storyId: string;
  rootHash: string;
  rootRevision: number;
  handles: readonly string[];
}): Promise<{
  storyId: string;
  ownerId: string;
  rootHash: string;
  rootRevision: number;
  partial: false;
  evidence: Array<{
    documentId: string;
    path: string;
    kind: string;
    objectHash: string;
    revision: number;
  }>;
}> {
  if (input.handles.length > maximumBranchPinnedHandles) {
    throw new BranchPinnedMemoryError('read-limit');
  }

  const authorized = await input.authorize({
    ownerId: input.ownerId,
    storyId: input.storyId,
  });
  if (!authorized) {
    throw new BranchPinnedMemoryError('not-owned');
  }

  const manifest = await input.storage.readManifest(input.rootHash);
  if (
    manifest.campaignId !== input.storyId ||
    manifest.revision !== input.rootRevision
  ) {
    throw new BranchPinnedMemoryError('stale-root');
  }

  const evidence: Array<{
    documentId: string;
    path: string;
    kind: string;
    objectHash: string;
    revision: number;
  }> = [];

  for (const handle of input.handles) {
    const entry = manifest.entries.find(
      (candidate) =>
        candidate.documentId === handle &&
        candidate.visibility !== 'developer-private' &&
        candidate.kind !== 'private-possibility',
    );
    if (!entry) {
      throw new BranchPinnedMemoryError('unknown-handle');
    }
    evidence.push({
      documentId: entry.documentId,
      path: entry.path,
      kind: entry.kind,
      objectHash: entry.objectHash,
      revision: entry.revision,
    });
  }

  return {
    storyId: input.storyId,
    ownerId: input.ownerId,
    rootHash: input.rootHash,
    rootRevision: input.rootRevision,
    partial: false,
    evidence,
  };
}