import { isDeepStrictEqual } from 'node:util';
import { ZodError } from 'zod';
import {
  DocumentStorageError,
  hashCanonicalJson,
  sceneCheckpointSchema,
  type DocumentStore,
  type SceneCheckpoint,
} from '@offscreen/documents';
import { storyPassage, storySceneCheckpoint } from '@offscreen/db/story-schema';
import { and, eq } from 'drizzle-orm';
import type { Transaction } from '../outbox/index';
import { StoryError, parseStoryIdentifier } from './errors';
import { lockOwnedStory } from './persistence';

export type SceneCheckpointStore = Pick<
  DocumentStore,
  'readManifest'
> & {
  readSceneCheckpoint(hash: string): Promise<SceneCheckpoint>;
};

type InsertSceneCheckpointReference = Readonly<{
  ownerId: string;
  operationId: string;
  expectedRevision: number;
  expectedRootHash: string | null;
  expectedRootRevision: number;
  checkpoint: unknown;
  documentStore: SceneCheckpointStore;
}>;

type CheckpointRow = typeof storySceneCheckpoint.$inferSelect;

function parseCheckpoint(value: unknown): SceneCheckpoint {
  try {
    return sceneCheckpointSchema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new StoryError('invalid', 'malformed_checkpoint');
    }
    throw error;
  }
}

function storageFailure(error: unknown, kind: 'checkpoint' | 'canon'): never {
  if (error instanceof DocumentStorageError) {
    if (error.code === 'unavailable') {
      throw new StoryError('unavailable', 'checkpoint_store_unavailable');
    }
    if (error.code === 'missing') {
      throw new StoryError(
        'invalid',
        kind === 'canon' ? 'missing_canon_root' : 'missing_checkpoint_object',
      );
    }
    throw new StoryError(
      'invalid',
      kind === 'canon' ? 'canon_root_mismatch' : 'checkpoint_hash_mismatch',
    );
  }
  throw error;
}

async function verifyStagedCheckpoint(
  documentStore: SceneCheckpointStore,
  checkpoint: SceneCheckpoint,
  checkpointHash: string,
) {
  let stored: SceneCheckpoint;
  try {
    stored = await documentStore.readSceneCheckpoint(checkpointHash);
  } catch (error) {
    storageFailure(error, 'checkpoint');
  }
  if (
    hashCanonicalJson(stored) !== checkpointHash ||
    !isDeepStrictEqual(stored, checkpoint)
  ) {
    throw new StoryError('invalid', 'checkpoint_hash_mismatch');
  }
  if (checkpoint.canon.rootHash === null) return;
  let manifest;
  try {
    manifest = await documentStore.readManifest(checkpoint.canon.rootHash);
  } catch (error) {
    storageFailure(error, 'canon');
  }
  if (
    manifest.campaignId !== checkpoint.storyId ||
    manifest.revision !== checkpoint.canon.rootRevision
  ) {
    throw new StoryError('invalid', 'canon_root_mismatch');
  }
}

function sameReference(
  existing: CheckpointRow,
  proposed: {
    passageId: string;
    transitionId: string | null;
    operationId: string;
    checkpointHash: string;
    canonRootHash: string | null;
    canonRootRevision: number;
    stateSchemaVersion: number;
    pins: SceneCheckpoint['pins'];
  },
) {
  return (
    existing.passageId === proposed.passageId &&
    existing.transitionId === proposed.transitionId &&
    existing.operationId === proposed.operationId &&
    existing.checkpointHash === proposed.checkpointHash &&
    existing.canonRootHash === proposed.canonRootHash &&
    existing.canonRootRevision === proposed.canonRootRevision &&
    existing.stateSchemaVersion === proposed.stateSchemaVersion &&
    isDeepStrictEqual(existing.pins, proposed.pins)
  );
}

function isUniqueViolation(error: unknown) {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && typeof current === 'object' && !seen.has(current)) {
    seen.add(current);
    if ('code' in current && current.code === '23505') return true;
    current = 'cause' in current ? current.cause : undefined;
  }
  return false;
}

/**
 * Insert the SQL selector for a checkpoint object that is already staged.
 * The story row is locked and compared. It is not updated. A second identical
 * insert returns the same hash. A different hash for that scene conflicts.
 * Object storage is read before the story lock and is not a second writer.
 */
export async function insertSceneCheckpointReference(
  tx: Transaction,
  args: InsertSceneCheckpointReference,
): Promise<{ idempotent: boolean; checkpointHash: string }> {
  const checkpoint = parseCheckpoint(args.checkpoint);
  const operationId = parseStoryIdentifier(args.operationId);
  if (checkpoint.sceneSequence !== args.expectedRevision) {
    throw new StoryError('conflict', 'stale_story_revision');
  }
  if (
    checkpoint.canon.rootHash !== args.expectedRootHash ||
    checkpoint.canon.rootRevision !== args.expectedRootRevision
  ) {
    throw new StoryError('conflict', 'stale_canon_root');
  }
  const checkpointHash = hashCanonicalJson(checkpoint);
  await verifyStagedCheckpoint(args.documentStore, checkpoint, checkpointHash);
  const current = await lockOwnedStory(tx, {
    ownerId: args.ownerId,
    storyId: checkpoint.storyId,
  });
  if (
    current.revision !== args.expectedRevision ||
    current.documentRootHash !== args.expectedRootHash ||
    current.documentRootRevision !== args.expectedRootRevision
  ) {
    throw new StoryError('conflict', 'stale_story_revision');
  }
  const [passage] = await tx
    .select()
    .from(storyPassage)
    .where(eq(storyPassage.id, checkpoint.passageId));
  if (
    !passage ||
    passage.storyId !== checkpoint.storyId ||
    passage.sequence !== checkpoint.sceneSequence
  ) {
    throw new StoryError('invalid', 'checkpoint_passage_mismatch');
  }
  if ((passage.transitionId ?? null) !== checkpoint.transitionId) {
    throw new StoryError('conflict', 'checkpoint_transition_mismatch');
  }
  const proposed = {
    storyId: checkpoint.storyId,
    sceneSequence: checkpoint.sceneSequence,
    passageId: checkpoint.passageId,
    transitionId: checkpoint.transitionId,
    operationId,
    checkpointHash,
    canonRootHash: checkpoint.canon.rootHash,
    canonRootRevision: checkpoint.canon.rootRevision,
    stateSchemaVersion: checkpoint.stateSchemaVersion,
    pins: checkpoint.pins,
  };
  const [existing] = await tx
    .select()
    .from(storySceneCheckpoint)
    .where(
      and(
        eq(storySceneCheckpoint.storyId, checkpoint.storyId),
        eq(storySceneCheckpoint.sceneSequence, checkpoint.sceneSequence),
      ),
    );
  if (existing) {
    if (sameReference(existing, proposed)) {
      return { idempotent: true, checkpointHash };
    }
    throw new StoryError('conflict', 'checkpoint_hash_conflict');
  }
  try {
    await tx.insert(storySceneCheckpoint).values(proposed);
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const [raced] = await tx
      .select()
      .from(storySceneCheckpoint)
      .where(
        and(
          eq(storySceneCheckpoint.storyId, checkpoint.storyId),
          eq(storySceneCheckpoint.sceneSequence, checkpoint.sceneSequence),
        ),
      );
    if (raced && sameReference(raced, proposed)) {
      return { idempotent: true, checkpointHash };
    }
    throw new StoryError('conflict', 'checkpoint_hash_conflict');
  }
  return { idempotent: false, checkpointHash };
}

/**
 * A selector whose object is missing, whose bytes hash to something else,
 * or whose canon root does not match the row is invalid. This read does not
 * repair the row or the story.
 */
export async function readSceneCheckpointReference(
  tx: Transaction,
  args: Readonly<{
    storyId: string;
    sceneSequence: number;
    documentStore: SceneCheckpointStore;
  }>,
): Promise<{ idempotent: false; checkpointHash: string; checkpoint: SceneCheckpoint }> {
  const storyId = parseStoryIdentifier(args.storyId);
  const [row] = await tx
    .select()
    .from(storySceneCheckpoint)
    .where(
      and(
        eq(storySceneCheckpoint.storyId, storyId),
        eq(storySceneCheckpoint.sceneSequence, args.sceneSequence),
      ),
    );
  if (!row) throw new StoryError('not_found');
  let checkpoint: SceneCheckpoint;
  try {
    checkpoint = await args.documentStore.readSceneCheckpoint(row.checkpointHash);
  } catch (error) {
    storageFailure(error, 'checkpoint');
  }
  if (
    hashCanonicalJson(checkpoint) !== row.checkpointHash ||
    checkpoint.storyId !== row.storyId ||
    checkpoint.sceneSequence !== row.sceneSequence ||
    checkpoint.passageId !== row.passageId ||
    checkpoint.transitionId !== row.transitionId ||
    checkpoint.stateSchemaVersion !== row.stateSchemaVersion ||
    checkpoint.canon.rootHash !== row.canonRootHash ||
    checkpoint.canon.rootRevision !== row.canonRootRevision ||
    !isDeepStrictEqual(checkpoint.pins, row.pins)
  ) {
    throw new StoryError('invalid', 'checkpoint_hash_mismatch');
  }
  if (checkpoint.canon.rootHash !== null) {
    let manifest;
    try {
      manifest = await args.documentStore.readManifest(checkpoint.canon.rootHash);
    } catch (error) {
      storageFailure(error, 'canon');
    }
    if (
      manifest.campaignId !== checkpoint.storyId ||
      manifest.revision !== checkpoint.canon.rootRevision
    ) {
      throw new StoryError('invalid', 'canon_root_mismatch');
    }
  }
  return {
    idempotent: false,
    checkpointHash: row.checkpointHash,
    checkpoint,
  };
}
