import { isDeepStrictEqual } from 'node:util';
import { ZodError } from 'zod';
import {
  DocumentStorageError,
  hashCanonicalJson,
  sceneCheckpointSchema,
  type DocumentStore,
  type SceneCheckpoint,
} from '@offscreen/documents';
import { storyPassage, storySceneCheckpoint } from '@offscreen/story-persistence/stories';
import { and, eq } from 'drizzle-orm';
import type { Transaction } from '@offscreen/db';
import { StoryError, parseStoryIdentifier } from './errors';
import { lockOwnedStory } from './persistence';

export type SceneCheckpointStore = Pick<
  DocumentStore,
  'readManifest' | 'readStructuredDocument' | 'readLibraryRoot'
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

export type StagedSceneCheckpoint = Readonly<{
  checkpoint: SceneCheckpoint;
  checkpointHash: string;
}>;

/** The real document adapter. A missing method is not a second, local store. */
export type SceneCheckpointWriterStore = SceneCheckpointStore & {
  putSceneCheckpoint(checkpoint: SceneCheckpoint): Promise<string>;
};

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
  await verifyCheckpointCanonRoot(
    documentStore,
    checkpoint.storyId,
    checkpoint.canon,
  );
}

async function verifyCheckpointCanonRoot(
  documentStore: SceneCheckpointStore,
  storyId: string,
  canon: { rootHash: string | null; rootRevision: number },
) {
  if (canon.rootHash === null) return;
  try {
    const libraryRoot = await documentStore.readLibraryRoot(canon.rootHash);
    if (libraryRoot.format === 'offscreen.library-root.v2') return;
  } catch (error) {
    if (!(error instanceof DocumentStorageError && error.code === 'corrupt')) {
      storageFailure(error, 'canon');
    }
  }
  let manifest;
  try {
    manifest = await documentStore.readManifest(canon.rootHash);
  } catch (error) {
    storageFailure(error, 'canon');
  }
  if (
    manifest.campaignId !== storyId ||
    manifest.revision !== canon.rootRevision
  ) {
    throw new StoryError('invalid', 'canon_root_mismatch');
  }
}

/** Re-read a checkpoint that was staged before the SQL transaction. */
export async function confirmStagedCheckpointObject(
  documentStore: SceneCheckpointStore,
  staged: StagedSceneCheckpoint,
) {
  await verifyStagedCheckpoint(
    documentStore,
    staged.checkpoint,
    staged.checkpointHash,
  );
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

function hasCallableMethods(value: object, names: readonly string[]): boolean {
  const record = value as Record<string, unknown>;
  return names.every((name) => typeof record[name] === 'function');
}

const CHECKPOINT_WRITER_METHODS = [
  'readManifest',
  'readStructuredDocument',
  'readLibraryRoot',
  'readSceneCheckpoint',
  'putSceneCheckpoint',
] as const;

export function checkpointWriterStore(
  store: object,
): SceneCheckpointWriterStore | undefined {
  if (!hasCallableMethods(store, CHECKPOINT_WRITER_METHODS)) {
    return undefined;
  }
  // Runtime check is the trust boundary; assertion only narrows a fully checked port.
  return store as SceneCheckpointWriterStore;
}

/**
 * Put the checkpoint on the caller-supplied adapter and read it back.
 * A transport failure throws. This function does not open a SQL transaction
 * and does not substitute another store.
 */
export async function stageSceneCheckpointObject(
  documentStore: SceneCheckpointWriterStore,
  checkpoint: unknown,
): Promise<StagedSceneCheckpoint> {
  const parsed = parseCheckpoint(checkpoint);
  const checkpointHash = hashCanonicalJson(parsed);
  let storedHash: string;
  try {
    storedHash = await documentStore.putSceneCheckpoint(parsed);
  } catch (error) {
    storageFailure(error, 'checkpoint');
  }
  if (storedHash !== checkpointHash) {
    throw new StoryError('invalid', 'checkpoint_hash_mismatch');
  }
  await verifyStagedCheckpoint(documentStore, parsed, checkpointHash);
  return { checkpoint: parsed, checkpointHash };
}

/**
 * Insert the selector for an object that was staged and verified before this
 * transaction. The story lock is SQL only. Object storage is not called.
 */
export async function insertStagedSceneCheckpointSelector(
  tx: Transaction,
  args: Readonly<{
    ownerId: string;
    operationId: string;
    staged: StagedSceneCheckpoint;
  }>,
): Promise<{ idempotent: boolean; checkpointHash: string }> {
  const checkpoint = args.staged.checkpoint;
  const operationId = parseStoryIdentifier(args.operationId);
  const checkpointHash = args.staged.checkpointHash;
  if (hashCanonicalJson(checkpoint) !== checkpointHash) {
    throw new StoryError('invalid', 'checkpoint_hash_mismatch');
  }
  const current = await lockOwnedStory(tx, {
    ownerId: args.ownerId,
    storyId: checkpoint.storyId,
  });
  if (
    current.revision !== checkpoint.sceneSequence ||
    current.documentRootHash !== checkpoint.canon.rootHash ||
    current.documentRootRevision !== checkpoint.canon.rootRevision
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
  return insertStagedSceneCheckpointSelector(tx, {
    ownerId: args.ownerId,
    operationId: args.operationId,
    staged: { checkpoint, checkpointHash },
  });
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
  return readSceneCheckpointForRow(args.documentStore, row);
}

export function sceneCheckpointIdentityMatches(
  current: CheckpointRow,
  expected: CheckpointRow,
) {
  return (
    current.checkpointHash === expected.checkpointHash &&
    current.storyId === expected.storyId &&
    current.sceneSequence === expected.sceneSequence &&
    current.passageId === expected.passageId &&
    current.transitionId === expected.transitionId &&
    current.stateSchemaVersion === expected.stateSchemaVersion &&
    current.canonRootHash === expected.canonRootHash &&
    current.canonRootRevision === expected.canonRootRevision &&
    isDeepStrictEqual(current.pins, expected.pins)
  );
}

/** Read and verify a checkpoint object for a row already loaded from SQL. */
export async function readSceneCheckpointForRow(
  documentStore: SceneCheckpointStore,
  row: CheckpointRow,
): Promise<{
  idempotent: false;
  checkpointHash: string;
  checkpoint: SceneCheckpoint;
}> {
  let checkpoint: SceneCheckpoint;
  try {
    checkpoint = await documentStore.readSceneCheckpoint(row.checkpointHash);
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
    await verifyCheckpointCanonRoot(
      documentStore,
      checkpoint.storyId,
      checkpoint.canon,
    );
  }
  return {
    idempotent: false,
    checkpointHash: row.checkpointHash,
    checkpoint,
  };
}
