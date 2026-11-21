import {
  selectForkLineageEvidence,
  type ForkLineagePassageRow,
} from '@offscreen/storyteller/context';

export class ForkLineageMemoryError extends Error {
  readonly code: 'not-owned';

  constructor(code: ForkLineageMemoryError['code']) {
    super(code);
    this.name = 'ForkLineageMemoryError';
    this.code = code;
  }
}

export async function readForkLineageMemory(input: {
  ownerId: string;
  ancestorStoryId: string;
  authorize: (
    ownerId: string,
    ancestorStoryId: string,
  ) => boolean | Promise<boolean>;
  pinnedRootHash: string;
  pinnedPassageHashById: ReadonlyMap<string, string> | Record<string, string>;
  cutoffSequence: number;
  parentPassages: readonly ForkLineagePassageRow[];
  childPassages: readonly ForkLineagePassageRow[];
}): Promise<ReturnType<typeof selectForkLineageEvidence>> {
  const authorized = await input.authorize(
    input.ownerId,
    input.ancestorStoryId,
  );
  if (!authorized) {
    throw new ForkLineageMemoryError('not-owned');
  }
  return selectForkLineageEvidence({
    ancestorStoryId: input.ancestorStoryId,
    pinnedRootHash: input.pinnedRootHash,
    pinnedPassageHashById: input.pinnedPassageHashById,
    cutoffSequence: input.cutoffSequence,
    parentPassages: input.parentPassages,
    childPassages: input.childPassages,
  });
}