import { randomUUID } from 'node:crypto';
import { and, eq, isNull, sql } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import {
  storytellerWriterMission,
  storytellerWriterStep,
} from '@offscreen/db/storyteller-schema';
import type { DocumentStore } from '@offscreen/documents';
import {
  applyLibraryBatch,
  canonicalDocumentSchema,
  createEmptyLibraryIndex,
  hashCanonicalJson,
  loadLibraryIndex,
  logicalDocumentPathSchema,
  type LibraryIndex,
} from '@offscreen/documents';
import type { WriterMissionCapture, WriterToolName } from '@offscreen/storyteller/tasks';
import type { Transaction } from '../outbox/index';
import {
  createPinnedLibraryNavigation,
  LibraryNavigationError,
  type LibraryAccess,
} from './library-navigation';

const WORKDESK_TOOLS = [
  'workdesk.stage',
  'workdesk.read',
  'workdesk.diff',
  'workdesk.discard',
] as const satisfies readonly WriterToolName[];

type WorkdeskToolName = (typeof WORKDESK_TOOLS)[number];

const maxStageBodyCharacters = 16_384;

export class WriterWorkdeskError extends Error {
  constructor(
    readonly code:
      | 'tool-not-granted'
      | 'tool-not-supported'
      | 'invalid-args'
      | 'mission-not-found'
      | 'stage-revision-conflict'
      | 'tool-call-replay-mismatch'
      | 'no-stage-root'
      | 'not-authorized',
  ) {
    super(code);
    this.name = 'WriterWorkdeskError';
  }
}

export type WriterWorkdeskToolCall = Readonly<{
  id: string;
  name: WriterToolName;
  args: Record<string, unknown>;
}>;

export type WriterWorkdeskToolSuccess = Readonly<{
  ok: true;
  toolCallId: string;
  name: WorkdeskToolName;
  result: unknown;
  resultByteLength: number;
  replayed: boolean;
}>;

export type WriterWorkdeskToolFailure = Readonly<{
  ok: false;
  toolCallId: string;
  name: WriterToolName;
  code: string;
  resultByteLength: 0;
  replayed: false;
}>;

export type WriterWorkdeskToolOutcome =
  | WriterWorkdeskToolSuccess
  | WriterWorkdeskToolFailure;

const structuredResultSchemaId = 'writer-workdesk-tool-result.v1';

function resultByteLength(result: unknown): number {
  return Buffer.byteLength(JSON.stringify(result), 'utf8');
}

function navigationErrorCode(error: unknown): string {
  if (error instanceof LibraryNavigationError) return error.code;
  if (error instanceof WriterWorkdeskError) return error.code;
  return 'internal-error';
}

function assertWorkdeskTool(name: WriterToolName): asserts name is WorkdeskToolName {
  if (!(WORKDESK_TOOLS as readonly string[]).includes(name)) {
    throw new WriterWorkdeskError('tool-not-supported');
  }
}

function assertToolGranted(capture: WriterMissionCapture, name: WriterToolName): void {
  if (!capture.toolsAllowlist.includes(name)) {
    throw new WriterWorkdeskError('tool-not-granted');
  }
}

function privateWorkdeskPath(path: string): string {
  const parsed = logicalDocumentPathSchema.parse(path);
  if (!parsed.startsWith('private/')) {
    throw new WriterWorkdeskError('invalid-args');
  }
  return parsed;
}

function hashWorkdeskRequest(
  name: WorkdeskToolName,
  args: Record<string, unknown>,
): string {
  return hashCanonicalJson({ name, args });
}

function createStorageLibraryReader(storage: DocumentStore) {
  return {
    readManifest: async () => {
      throw new Error('v1 manifest not supported for workdesk');
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

async function persistLibraryIndex(
  storage: DocumentStore,
  library: LibraryIndex,
): Promise<string> {
  for (const node of library.store.values()) {
    await storage.putLibraryNode(node);
  }
  return storage.putLibraryRoot(library.root);
}

async function loadStageLibraryIndex(
  storage: DocumentStore,
  stageRootHash: string | null,
): Promise<LibraryIndex> {
  if (stageRootHash === null) {
    return createEmptyLibraryIndex();
  }
  const root = await storage.readLibraryRoot(stageRootHash);
  return loadLibraryIndex(
    (hash) => storage.readLibraryNode(hash),
    root,
  );
}

async function persistToolResult(
  storage: DocumentStore,
  missionId: string,
  toolCallId: string,
  result: unknown,
): Promise<string> {
  const record = await storage.putStructuredDocument({
    format: 'offscreen.structured-document.v1',
    envelope: {
      documentId: randomUUID(),
      schemaVersion: 1,
      revision: 1,
      kind: 'lore',
      authority: 'noncanonical',
      visibility: 'storyteller-private',
      sources: [],
    },
    schemaId: structuredResultSchemaId,
    data: JSON.parse(JSON.stringify({ missionId, toolCallId, result })),
  });
  return record;
}

async function readToolResult(storage: DocumentStore, resultCasHash: string): Promise<unknown> {
  const record = await storage.readStructuredDocument(resultCasHash);
  if (
    record.schemaId !== structuredResultSchemaId ||
    record.data === null ||
    typeof record.data !== 'object'
  ) {
    throw new Error('invalid_workdesk_result');
  }
  const data = record.data as { result?: unknown };
  return data.result;
}

function diffText(left: string, right: string): Readonly<{
  lines: readonly { kind: 'same' | 'left' | 'right'; text: string }[];
}> {
  const leftLines = left.split('\n');
  const rightLines = right.split('\n');
  const lines: { kind: 'same' | 'left' | 'right'; text: string }[] = [];
  const max = Math.max(leftLines.length, rightLines.length);
  for (let index = 0; index < max; index += 1) {
    const leftText = leftLines[index];
    const rightText = rightLines[index];
    if (leftText === rightText) {
      if (leftText !== undefined) {
        lines.push({ kind: 'same', text: leftText });
      }
    } else {
      if (leftText !== undefined) {
        lines.push({ kind: 'left', text: leftText });
      }
      if (rightText !== undefined) {
        lines.push({ kind: 'right', text: rightText });
      }
    }
  }
  return { lines };
}

type MissionStageRow = {
  stageRootHash: string | null;
  stageRootRevision: number | null;
  nextRevision: number;
  storyId: string;
};

async function findExistingToolStep(
  database: Database,
  missionId: string,
  toolCallId: string,
) {
  const rows = await database.db
    .select({
      requestCasHash: storytellerWriterStep.requestCasHash,
      resultCasHash: storytellerWriterStep.resultCasHash,
    })
    .from(storytellerWriterStep)
    .where(
      and(
        eq(storytellerWriterStep.missionId, missionId),
        eq(storytellerWriterStep.contextId, missionId),
        eq(storytellerWriterStep.toolCallId, toolCallId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

async function casMissionStage(
  tx: Transaction,
  input: {
    missionId: string;
    expectedStageRevision: number;
    stageRootHash: string | null;
    nextStageRevision: number | null;
  },
): Promise<MissionStageRow> {
  const revisionPredicate =
    input.expectedStageRevision === 0
      ? isNull(storytellerWriterMission.stageRootRevision)
      : eq(
          storytellerWriterMission.stageRootRevision,
          input.expectedStageRevision,
        );

  const [updated] = await tx
    .update(storytellerWriterMission)
    .set({
      stageRootHash: input.stageRootHash,
      stageRootRevision: input.nextStageRevision,
      updatedAt: sql`clock_timestamp()`,
    })
    .where(
      and(eq(storytellerWriterMission.id, input.missionId), revisionPredicate),
    )
    .returning({
      stageRootHash: storytellerWriterMission.stageRootHash,
      stageRootRevision: storytellerWriterMission.stageRootRevision,
      nextRevision: storytellerWriterMission.nextRevision,
      storyId: storytellerWriterMission.storyId,
    });

  if (!updated) {
    throw new WriterWorkdeskError('stage-revision-conflict');
  }
  return updated;
}

async function recordWorkdeskToolStep(
  tx: Transaction,
  input: {
    missionId: string;
    toolCallId: string;
    requestCasHash: string;
    resultCasHash: string;
  },
): Promise<void> {
  const ordinals = await tx
    .select({ ordinal: storytellerWriterStep.ordinal })
    .from(storytellerWriterStep)
    .where(eq(storytellerWriterStep.missionId, input.missionId));
  const ordinal =
    ordinals.reduce((max, row) => Math.max(max, row.ordinal), 0) + 1;
  await tx.insert(storytellerWriterStep).values({
    missionId: input.missionId,
    contextId: input.missionId,
    ordinal,
    toolCallId: input.toolCallId,
    requestCasHash: input.requestCasHash,
    resultCasHash: input.resultCasHash,
    revision: 1,
    state: 'tools-applied',
  });
  await tx
    .update(storytellerWriterMission)
    .set({
      nextRevision: ordinal + 1,
      updatedAt: sql`clock_timestamp()`,
    })
    .where(eq(storytellerWriterMission.id, input.missionId));
}

async function lockMissionRow(
  tx: Transaction,
  missionId: string,
): Promise<MissionStageRow & { ownerId: string }> {
  const [mission] = await tx
    .select({
      stageRootHash: storytellerWriterMission.stageRootHash,
      stageRootRevision: storytellerWriterMission.stageRootRevision,
      nextRevision: storytellerWriterMission.nextRevision,
      storyId: storytellerWriterMission.storyId,
      ownerId: storytellerWriterMission.ownerId,
    })
    .from(storytellerWriterMission)
    .where(eq(storytellerWriterMission.id, missionId))
    .for('update');
  if (!mission) {
    throw new WriterWorkdeskError('mission-not-found');
  }
  return mission;
}

function currentStageRevision(row: MissionStageRow): number {
  return row.stageRootRevision ?? 0;
}

async function stagePrivateDocument(
  database: Database,
  storage: DocumentStore,
  input: {
    missionId: string;
    storyId: string;
    toolCallId: string;
    expectedStageRevision: number;
    path: string;
    body: string;
    title?: string;
    op: 'create' | 'replace';
  },
): Promise<{ result: unknown; replayed: boolean }> {
  if (input.body.length > maxStageBodyCharacters) {
    throw new WriterWorkdeskError('invalid-args');
  }

  const requestCasHash = hashWorkdeskRequest('workdesk.stage', {
    expectedStageRevision: input.expectedStageRevision,
    path: input.path,
    body: input.body,
    title: input.title ?? null,
    op: input.op,
  });

  const existing = await findExistingToolStep(database, input.missionId, input.toolCallId);
  if (existing?.resultCasHash) {
    if (existing.requestCasHash !== requestCasHash) {
      throw new WriterWorkdeskError('tool-call-replay-mismatch');
    }
    const result = await readToolResult(storage, existing.resultCasHash);
    return { result, replayed: true };
  }

  const priorRoot = await database.db.transaction(async (tx) => {
    const mission = await lockMissionRow(tx, input.missionId);
    if (currentStageRevision(mission) !== input.expectedStageRevision) {
      throw new WriterWorkdeskError('stage-revision-conflict');
    }
    return {
      stageRootHash: mission.stageRootHash,
      nextRevision: mission.nextRevision,
    };
  });

  const workingLibrary = await loadStageLibraryIndex(storage, priorRoot.stageRootHash);

  let targetDocumentId: string = randomUUID();
  let entryRevision = 1;
  if (input.op === 'replace') {
    if (priorRoot.stageRootHash === null) {
      throw new WriterWorkdeskError('invalid-args');
    }
    const reader = createStorageLibraryReader(storage);
    const navigation = createPinnedLibraryNavigation({
      reader,
      storyId: input.storyId,
      rootHash: priorRoot.stageRootHash,
      rootRevision: input.expectedStageRevision,
      authorize: async () => ({ privateDocuments: true }),
    });
    const opened = await navigation.open({ path: input.path });
    targetDocumentId = opened.documentId;
    entryRevision = opened.revision + 1;
  }

  const document = canonicalDocumentSchema.parse({
    format: 'offscreen.document.v1',
    envelope: {
      documentId: targetDocumentId,
      schemaVersion: 1,
      revision: entryRevision,
      kind: 'lore',
      authority: 'noncanonical',
      visibility: 'storyteller-private',
      sources: [],
    },
    title: input.title ?? input.path.split('/').pop() ?? 'Draft',
    body: input.body,
  });
  const objectHash = await storage.putDocument(document);

  const batch =
    input.op === 'create'
      ? [
          {
            op: 'create' as const,
            entry: {
              documentId: targetDocumentId,
              revision: 1,
              path: input.path,
              objectHash,
              kind: 'lore' as const,
              authority: 'noncanonical' as const,
              visibility: 'storyteller-private' as const,
            },
          },
        ]
      : [
          {
            op: 'replace' as const,
            entry: {
              documentId: targetDocumentId,
              revision: entryRevision,
              path: input.path,
              objectHash,
              kind: 'lore' as const,
              authority: 'noncanonical' as const,
              visibility: 'storyteller-private' as const,
            },
          },
        ];

  const nextLibrary = applyLibraryBatch(workingLibrary, batch);
  const stageRootHash = await persistLibraryIndex(storage, nextLibrary);
  const nextStageRevision = input.expectedStageRevision + 1;

  const result = {
    stageRootHash,
    stageRootRevision: nextStageRevision,
    path: input.path,
    objectHash,
    documentId: targetDocumentId,
  };

  const resultCasHash = await persistToolResult(
    storage,
    input.missionId,
    input.toolCallId,
    result,
  );

  await database.db.transaction(async (tx) => {
    const mission = await lockMissionRow(tx, input.missionId);
    if (currentStageRevision(mission) !== input.expectedStageRevision) {
      throw new WriterWorkdeskError('stage-revision-conflict');
    }
    await casMissionStage(tx, {
      missionId: input.missionId,
      expectedStageRevision: input.expectedStageRevision,
      stageRootHash,
      nextStageRevision,
    });
    await recordWorkdeskToolStep(tx, {
      missionId: input.missionId,
      toolCallId: input.toolCallId,
      requestCasHash,
      resultCasHash,
    });
  });

  return { result, replayed: false };
}

async function discardPrivateStage(
  database: Database,
  storage: DocumentStore,
  input: {
    missionId: string;
    toolCallId: string;
    expectedStageRevision: number;
  },
): Promise<{ result: unknown; replayed: boolean }> {
  const requestCasHash = hashWorkdeskRequest('workdesk.discard', {
    expectedStageRevision: input.expectedStageRevision,
  });

  const existing = await findExistingToolStep(database, input.missionId, input.toolCallId);
  if (existing?.resultCasHash) {
    if (existing.requestCasHash !== requestCasHash) {
      throw new WriterWorkdeskError('tool-call-replay-mismatch');
    }
    const result = await readToolResult(storage, existing.resultCasHash);
    return { result, replayed: true };
  }

  const result = {
    discarded: true,
    priorStageRootRevision: input.expectedStageRevision,
  };

  const resultCasHash = await persistToolResult(
    storage,
    input.missionId,
    input.toolCallId,
    result,
  );

  await database.db.transaction(async (tx) => {
    const mission = await lockMissionRow(tx, input.missionId);
    if (currentStageRevision(mission) !== input.expectedStageRevision) {
      throw new WriterWorkdeskError('stage-revision-conflict');
    }
    if (mission.stageRootHash === null) {
      throw new WriterWorkdeskError('no-stage-root');
    }
    await casMissionStage(tx, {
      missionId: input.missionId,
      expectedStageRevision: input.expectedStageRevision,
      stageRootHash: null,
      nextStageRevision: null,
    });
    await recordWorkdeskToolStep(tx, {
      missionId: input.missionId,
      toolCallId: input.toolCallId,
      requestCasHash,
      resultCasHash,
    });
  });

  return { result, replayed: false };
}

async function loadMissionStage(
  database: Database,
  missionId: string,
): Promise<MissionStageRow> {
  const rows = await database.db
    .select({
      stageRootHash: storytellerWriterMission.stageRootHash,
      stageRootRevision: storytellerWriterMission.stageRootRevision,
      nextRevision: storytellerWriterMission.nextRevision,
      storyId: storytellerWriterMission.storyId,
    })
    .from(storytellerWriterMission)
    .where(eq(storytellerWriterMission.id, missionId))
    .limit(1);
  const mission = rows[0];
  if (!mission) {
    throw new WriterWorkdeskError('mission-not-found');
  }
  return mission;
}

async function readStagedPath(
  database: Database,
  storage: DocumentStore,
  input: {
    missionId: string;
    storyId: string;
    path: string;
    access: LibraryAccess;
    offset?: number;
    characters?: number;
  },
): Promise<unknown> {
  const mission = await loadMissionStage(database, input.missionId);
  if (mission.stageRootHash === null || mission.stageRootRevision === null) {
    throw new WriterWorkdeskError('no-stage-root');
  }
  const reader = createStorageLibraryReader(storage);
  const navigation = createPinnedLibraryNavigation({
    reader,
    storyId: input.storyId,
    rootHash: mission.stageRootHash,
    rootRevision: mission.stageRootRevision,
    authorize: async () => input.access,
  });
  return navigation.open({
    path: input.path,
    ...(input.offset !== undefined ? { offset: input.offset } : {}),
    ...(input.characters !== undefined ? { characters: input.characters } : {}),
  });
}

async function diffStagedBodies(
  database: Database,
  storage: DocumentStore,
  input: {
    missionId: string;
    storyId: string;
    leftPath: string;
    rightPath: string;
    access: LibraryAccess;
  },
): Promise<unknown> {
  const mission = await loadMissionStage(database, input.missionId);
  if (mission.stageRootHash === null || mission.stageRootRevision === null) {
    throw new WriterWorkdeskError('no-stage-root');
  }
  const reader = createStorageLibraryReader(storage);
  const navigation = createPinnedLibraryNavigation({
    reader,
    storyId: input.storyId,
    rootHash: mission.stageRootHash,
    rootRevision: mission.stageRootRevision,
    authorize: async () => input.access,
  });
  const [left, right] = await Promise.all([
    navigation.open({ path: input.leftPath }),
    navigation.open({ path: input.rightPath }),
  ]);
  const diff = diffText(left.content, right.content);
  return {
    stageRootHash: mission.stageRootHash,
    stageRootRevision: mission.stageRootRevision,
    leftPath: input.leftPath,
    rightPath: input.rightPath,
    leftObjectHash: left.objectHash,
    rightObjectHash: right.objectHash,
    lines: diff.lines,
  };
}

export async function executeWriterWorkdeskTool(
  database: Database,
  storage: DocumentStore,
  input: {
    missionId: string;
    capture: WriterMissionCapture;
    access: LibraryAccess;
    call: WriterWorkdeskToolCall;
  },
): Promise<WriterWorkdeskToolOutcome> {
  const fail = (code: string): WriterWorkdeskToolFailure => ({
    ok: false,
    toolCallId: input.call.id,
    name: input.call.name,
    code,
    resultByteLength: 0,
    replayed: false,
  });

  try {
    assertWorkdeskTool(input.call.name);
    assertToolGranted(input.capture, input.call.name);
    const name = input.call.name;

    switch (name) {
      case 'workdesk.stage': {
        const expectedStageRevision =
          typeof input.call.args.expectedStageRevision === 'number'
            ? input.call.args.expectedStageRevision
            : undefined;
        const path =
          typeof input.call.args.path === 'string'
            ? privateWorkdeskPath(input.call.args.path)
            : undefined;
        const body = typeof input.call.args.body === 'string' ? input.call.args.body : undefined;
        const title =
          typeof input.call.args.title === 'string' ? input.call.args.title : undefined;
        const op = input.call.args.op === 'replace' ? 'replace' : 'create';
        if (
          expectedStageRevision === undefined ||
          path === undefined ||
          body === undefined ||
          !Number.isInteger(expectedStageRevision) ||
          expectedStageRevision < 0
        ) {
          throw new WriterWorkdeskError('invalid-args');
        }
        const { result, replayed } = await stagePrivateDocument(database, storage, {
          missionId: input.missionId,
          storyId: input.capture.storyId,
          toolCallId: input.call.id,
          expectedStageRevision,
          path,
          body,
          op,
          ...(title !== undefined ? { title } : {}),
        });
        return {
          ok: true,
          toolCallId: input.call.id,
          name,
          result,
          resultByteLength: resultByteLength(result),
          replayed,
        };
      }
      case 'workdesk.read': {
        const path =
          typeof input.call.args.path === 'string'
            ? privateWorkdeskPath(input.call.args.path)
            : undefined;
        if (path === undefined) {
          throw new WriterWorkdeskError('invalid-args');
        }
        const offset =
          typeof input.call.args.offset === 'number' ? input.call.args.offset : undefined;
        const characters =
          typeof input.call.args.characters === 'number'
            ? input.call.args.characters
            : undefined;
        const result = await readStagedPath(database, storage, {
          missionId: input.missionId,
          storyId: input.capture.storyId,
          path,
          access: input.access,
          ...(offset !== undefined ? { offset } : {}),
          ...(characters !== undefined ? { characters } : {}),
        });
        return {
          ok: true,
          toolCallId: input.call.id,
          name,
          result,
          resultByteLength: resultByteLength(result),
          replayed: false,
        };
      }
      case 'workdesk.diff': {
        const leftPath =
          typeof input.call.args.leftPath === 'string'
            ? privateWorkdeskPath(input.call.args.leftPath)
            : undefined;
        const rightPath =
          typeof input.call.args.rightPath === 'string'
            ? privateWorkdeskPath(input.call.args.rightPath)
            : undefined;
        if (leftPath === undefined || rightPath === undefined) {
          throw new WriterWorkdeskError('invalid-args');
        }
        const result = await diffStagedBodies(database, storage, {
          missionId: input.missionId,
          storyId: input.capture.storyId,
          leftPath,
          rightPath,
          access: input.access,
        });
        return {
          ok: true,
          toolCallId: input.call.id,
          name,
          result,
          resultByteLength: resultByteLength(result),
          replayed: false,
        };
      }
      case 'workdesk.discard': {
        const expectedStageRevision =
          typeof input.call.args.expectedStageRevision === 'number'
            ? input.call.args.expectedStageRevision
            : undefined;
        if (
          expectedStageRevision === undefined ||
          !Number.isInteger(expectedStageRevision) ||
          expectedStageRevision < 1
        ) {
          throw new WriterWorkdeskError('invalid-args');
        }
        const { result, replayed } = await discardPrivateStage(database, storage, {
          missionId: input.missionId,
          toolCallId: input.call.id,
          expectedStageRevision,
        });
        return {
          ok: true,
          toolCallId: input.call.id,
          name,
          result,
          resultByteLength: resultByteLength(result),
          replayed,
        };
      }
      default: {
        return fail('tool-not-supported');
      }
    }
  } catch (error) {
    return fail(navigationErrorCode(error));
  }
}

export function hashWriterWorkdeskRequest(
  name: WorkdeskToolName,
  args: Record<string, unknown>,
): string {
  return hashWorkdeskRequest(name, args);
}

export function hashWriterWorkdeskResult(result: unknown): string {
  return hashCanonicalJson(result);
}