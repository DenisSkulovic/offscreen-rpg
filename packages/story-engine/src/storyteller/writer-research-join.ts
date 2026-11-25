/**
 * WR04 T03/T04: research verification, join hashing, and parent resume.
 */
import { randomUUID, createHash } from 'node:crypto';
import { and, asc, eq, sql } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import { enqueue } from '@offscreen/outbox/enqueue';
import type { Transaction } from '@offscreen/db';
import {
  storytellerWriterChild,
  storytellerWriterMission,
  storytellerWriterStep,
} from '@offscreen/story-persistence/storyteller';
import type { DocumentStore } from '@offscreen/documents';
import { hashCanonicalJson } from '@offscreen/documents';
import type {
  WriterMissionCapture,
  WriterResearchCaptureV1,
  WriterResearchResultV1,
  WriterToolInvocationResult,
} from '@offscreen/storyteller/tasks';
import {
  WRITER_RESEARCH_DELEGATE_TOOL_NAME,
  writerResearchResultEvidenceSchema,
  writerResearchResultV1Schema,
} from '@offscreen/storyteller/tasks';
import {
  createPinnedLibraryNavigation,
  LibraryNavigationError,
  type LibraryAccess,
} from './library-navigation';
import { defaultWriterContextId } from './writer-child-custody';
import { prepareWriterRoundWire } from '@offscreen/storyteller/providers/openrouter';
import { compileWriterRoundCapturedRequest } from '@offscreen/storyteller/tasks';
import {
  buildWriterResearchCaptureFromChildRow,
  writerResearchJoinOperationId,
  WRITER_RESEARCH_RESULT_SCHEMA,
} from './writer-research';

type LibraryReader = Parameters<
  typeof createPinnedLibraryNavigation
>[0]['reader'];

export class WriterResearchJoinError extends Error {
  constructor(
    readonly code:
      | 'foreign-citation-root'
      | 'forged-citation'
      | 'invalid-section'
      | 'private-citation-denied'
      | 'invalid-result',
  ) {
    super(code);
    this.name = 'WriterResearchJoinError';
  }
}

export type WriterResearchJoinChildEntry = Readonly<{
  childOrdinal: number;
  childId: string;
  resultCasHash: string;
  verifiedResultHash: string;
}>;

function markdownSectionExists(body: string, section: string): boolean {
  const target = section.trim();
  if (!target) return false;
  const targetLower = target.toLowerCase();
  for (const line of body.split('\n')) {
    const heading = line.match(/^#{1,6}\s+(.+)$/);
    const headingText = heading?.[1];
    if (headingText !== undefined && headingText.trim().toLowerCase() === targetLower) {
      return true;
    }
  }
  return false;
}

async function readFullDocumentBody(
  reader: LibraryReader,
  objectHash: string,
): Promise<string> {
  const source = await reader.readDocument(objectHash);
  return source.body;
}

/** Reject citations outside the pinned child root or invisible under the grant. */
export async function verifyWriterResearchEvidenceCitation(
  input: {
    storyId: string;
    capture: WriterResearchCaptureV1;
    access: LibraryAccess;
    reader: LibraryReader;
    evidence: WriterResearchResultV1['claims'][number]['evidence'][number];
  },
): Promise<void> {
  const evidence = writerResearchResultEvidenceSchema.parse(input.evidence);
  if (evidence.rootHash !== input.capture.rootHash) {
    throw new WriterResearchJoinError('foreign-citation-root');
  }
  const navigation = createPinnedLibraryNavigation({
    reader: input.reader,
    storyId: input.storyId,
    rootHash: input.capture.rootHash,
    rootRevision: input.capture.rootRevision,
    authorize: async () => input.access,
  });
  try {
    const opened = await navigation.readByObjectHash({
      objectHash: evidence.objectHash,
      characters: 16_384,
    });
    if (opened.documentId !== evidence.documentId) {
      throw new WriterResearchJoinError('forged-citation');
    }
    if (
      opened.visibility === 'storyteller-private' ||
      opened.visibility === 'developer-private'
    ) {
      if (!input.access.privateDocuments) {
        throw new WriterResearchJoinError('private-citation-denied');
      }
    }
    const body = await readFullDocumentBody(input.reader, evidence.objectHash);
    if (!markdownSectionExists(body, evidence.section)) {
      throw new WriterResearchJoinError('invalid-section');
    }
  } catch (error) {
    if (error instanceof WriterResearchJoinError) {
      throw error;
    }
    if (
      error instanceof LibraryNavigationError &&
      (error.code === 'not-found' || error.code === 'stale-root')
    ) {
      throw new WriterResearchJoinError('forged-citation');
    }
    throw error;
  }
}

export async function verifyWriterResearchResultCitations(
  input: {
    storyId: string;
    capture: WriterResearchCaptureV1;
    access: LibraryAccess;
    reader: LibraryReader;
    result: WriterResearchResultV1;
  },
): Promise<WriterResearchResultV1> {
  const parsed = writerResearchResultV1Schema.parse(input.result);
  for (const claim of parsed.claims) {
    for (const evidence of claim.evidence) {
      await verifyWriterResearchEvidenceCitation({
        storyId: input.storyId,
        capture: input.capture,
        access: input.access,
        reader: input.reader,
        evidence,
      });
    }
  }
  return parsed;
}

export function hashVerifiedWriterResearchResult(
  result: WriterResearchResultV1,
): string {
  return hashCanonicalJson(result);
}

/** Completion order must not change the parent join digest. */
export function hashWriterResearchJoinBundle(
  entries: readonly WriterResearchJoinChildEntry[],
): string {
  const sorted = [...entries].sort(
    (left, right) => left.childOrdinal - right.childOrdinal,
  );
  const canonical = sorted.map((entry) => ({
    childOrdinal: entry.childOrdinal,
    childId: entry.childId,
    resultCasHash: entry.resultCasHash,
    verifiedResultHash: entry.verifiedResultHash,
  }));
  return createHash('sha256')
    .update(`${JSON.stringify(canonical)}\n`, 'utf8')
    .digest('hex');
}

export const WRITER_RESEARCH_JOIN_WAKE_TOPIC = 'writer.research.join.v1';

const WRITER_TOOL_SUMMARY_SCHEMA = 'writer-tool-invocation-summary.v1';

export class WriterResearchParentJoinError extends Error {
  constructor(
    readonly code:
      | 'mission_not_found'
      | 'delegate_tool_missing'
      | 'revision_conflict'
      | 'required_child_missing'
      | 'join_hash_mismatch'
      | 'stale_mission'
      | 'invalid_result'
      | 'join_incomplete',
  ) {
    super(code);
    this.name = 'WriterResearchParentJoinError';
  }
}

export type WriterResearchJoinTarget = Readonly<{
  missionId: string;
  parentToolCallId: string;
  joinOperationId: string;
}>;

export function resolveWriterResearchJoinTarget(input: {
  missionId: string;
  parentToolCallId: string;
}): WriterResearchJoinTarget {
  return {
    missionId: input.missionId,
    parentToolCallId: input.parentToolCallId,
    joinOperationId: writerResearchJoinOperationId(
      input.missionId,
      input.parentToolCallId,
    ),
  };
}

export async function submitWriterResearchJoinNotice(
  tx: Transaction,
  target: WriterResearchJoinTarget,
): Promise<void> {
  await enqueue(tx, {
    id: target.joinOperationId,
    topic: WRITER_RESEARCH_JOIN_WAKE_TOPIC,
    operationId: target.joinOperationId,
  });
}

export type WriterResearchDelegateJoinPayload = Readonly<{
  version: 'writer-research-delegate-join.v1';
  missionId: string;
  parentToolCallId: string;
  joinBundleHash: string;
  children: readonly {
    childOrdinal: number;
    childId: string;
    required: boolean;
    resultCasHash: string | null;
    verifiedResultHash: string | null;
    gaps: string[];
  }[];
}>;

export const WRITER_RESEARCH_DELEGATE_JOIN_SCHEMA =
  'writer-research-delegate-join.v1';

async function loadDelegateToolStep(
  tx: Transaction,
  missionId: string,
  parentToolCallId: string,
) {
  const [row] = await tx
    .select()
    .from(storytellerWriterStep)
    .where(
      and(
        eq(storytellerWriterStep.missionId, missionId),
        eq(storytellerWriterStep.contextId, missionId),
        eq(storytellerWriterStep.toolCallId, parentToolCallId),
      ),
    )
    .limit(1);
  return row ?? null;
}

async function nextParentContextOrdinal(
  tx: Transaction,
  missionId: string,
): Promise<number> {
  const ordinals = await tx
    .select({ ordinal: storytellerWriterStep.ordinal })
    .from(storytellerWriterStep)
    .where(
      and(
        eq(storytellerWriterStep.missionId, missionId),
        eq(storytellerWriterStep.contextId, missionId),
      ),
    );
  return ordinals.reduce((max, row) => Math.max(max, row.ordinal), 0) + 1;
}

async function bumpMissionNextRevision(
  tx: Transaction,
  missionId: string,
  insertedOrdinal: number,
) {
  const ordinals = await tx
    .select({ ordinal: storytellerWriterStep.ordinal })
    .from(storytellerWriterStep)
    .where(eq(storytellerWriterStep.missionId, missionId));
  const globalMax = ordinals.reduce(
    (max, row) => Math.max(max, row.ordinal),
    insertedOrdinal,
  );
  await tx
    .update(storytellerWriterMission)
    .set({
      nextRevision: sql`GREATEST(${storytellerWriterMission.nextRevision}, ${globalMax + 1})`,
      updatedAt: sql`clock_timestamp()`,
    })
    .where(eq(storytellerWriterMission.id, missionId));
}

async function loadPriorToolSummariesForJoin(
  database: Database,
  storage: DocumentStore,
  missionId: string,
  beforeOrdinal: number,
): Promise<WriterToolInvocationResult[]> {
  const rows = await database.db
    .select({
      toolCallId: storytellerWriterStep.toolCallId,
      resultCasHash: storytellerWriterStep.resultCasHash,
    })
    .from(storytellerWriterStep)
    .where(
      and(
        eq(storytellerWriterStep.missionId, missionId),
        eq(storytellerWriterStep.contextId, missionId),
        sql`${storytellerWriterStep.ordinal} < ${beforeOrdinal}`,
        sql`${storytellerWriterStep.toolCallId} IS NOT NULL`,
        sql`${storytellerWriterStep.resultCasHash} IS NOT NULL`,
      ),
    )
    .orderBy(asc(storytellerWriterStep.ordinal));
  const summaries: WriterToolInvocationResult[] = [];
  for (const row of rows) {
    if (!row.resultCasHash || !row.toolCallId) continue;
    const record = await storage.readStructuredDocument(row.resultCasHash);
    if (record.schemaId === WRITER_TOOL_SUMMARY_SCHEMA && record.data) {
      summaries.push(record.data as WriterToolInvocationResult);
    }
  }
  return summaries;
}

export async function persistWriterResearchDelegateJoin(
  storage: DocumentStore,
  payload: WriterResearchDelegateJoinPayload,
): Promise<string> {
  return storage.putStructuredDocument({
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
    schemaId: WRITER_RESEARCH_DELEGATE_JOIN_SCHEMA,
    data: JSON.parse(JSON.stringify(payload)),
  });
}

export function summarizeWriterResearchDelegateJoin(
  parentToolCallId: string,
  joinBundleHash: string,
): WriterToolInvocationResult {
  return {
    version: 'writer-tool-result.v1',
    toolCallId: parentToolCallId,
    name: WRITER_RESEARCH_DELEGATE_TOOL_NAME,
    resultHash: joinBundleHash,
    summary: `${WRITER_RESEARCH_DELEGATE_TOOL_NAME} joined`,
  };
}

export type JoinWriterResearchParentResult =
  | {
      status: 'replayed';
      joinBundleHash: string;
      nextOrdinal: number;
      nextWireSha256: string;
    }
  | {
      status: 'joined';
      joinBundleHash: string;
      nextOrdinal: number;
      nextWireSha256: string;
    }
  | { status: 'held'; reason: string }
  | { status: 'incomplete' };

export async function joinWriterResearchParent(
  database: Database,
  storage: DocumentStore,
  input: {
    missionId: string;
    parentToolCallId: string;
    capture: WriterMissionCapture;
    access: LibraryAccess;
    reader: LibraryReader;
  },
): Promise<JoinWriterResearchParentResult> {
  const contextId = defaultWriterContextId(input.missionId);
  const [mission] = await database.db
    .select()
    .from(storytellerWriterMission)
  .where(eq(storytellerWriterMission.id, input.missionId))
    .limit(1);
  if (!mission) {
    throw new WriterResearchParentJoinError('mission_not_found');
  }
  if (mission.state === 'held' || mission.state === 'failed') {
    return { status: 'held', reason: 'stale_mission' };
  }

  const children = await database.db
    .select()
    .from(storytellerWriterChild)
    .where(
      and(
        eq(storytellerWriterChild.missionId, input.missionId),
        eq(storytellerWriterChild.parentToolCallId, input.parentToolCallId),
      ),
    )
    .orderBy(asc(storytellerWriterChild.childOrdinal));

  if (children.length === 0) {
    throw new WriterResearchParentJoinError('delegate_tool_missing');
  }

  const joinEntries: WriterResearchJoinChildEntry[] = [];
  const gapsFromChildren: string[] = [];

  for (const child of children) {
    const childRequired =
      typeof (child.policy as { required?: boolean }).required === 'boolean'
        ? Boolean((child.policy as { required?: boolean }).required)
        : true;
    const childCapture = buildWriterResearchCaptureFromChildRow({
      missionId: input.missionId,
      child,
      required: childRequired,
    });
    if (child.state === 'ready' && child.resultCasHash) {
      const record = await storage.readStructuredDocument(child.resultCasHash);
      if (record.schemaId !== WRITER_RESEARCH_RESULT_SCHEMA || !record.data) {
        throw new WriterResearchParentJoinError('invalid_result');
      }
      const parsed = writerResearchResultV1Schema.parse(record.data);
      try {
        const verified = await verifyWriterResearchResultCitations({
          storyId: input.capture.storyId,
          capture: childCapture,
          access: input.access,
          reader: input.reader,
          result: parsed,
        });
        const verifiedResultHash = hashVerifiedWriterResearchResult(verified);
        joinEntries.push({
          childOrdinal: child.childOrdinal,
          childId: child.childId,
          resultCasHash: child.resultCasHash,
          verifiedResultHash,
        });
      } catch (error) {
        if (error instanceof WriterResearchJoinError) {
          return { status: 'held', reason: error.code };
        }
        throw error;
      }
    } else if (child.state === 'held' || child.state === 'failed') {
      if (!childRequired) {
        gapsFromChildren.push(
          `Child ${child.childOrdinal} (${child.childId}): ${child.state}`,
        );
        continue;
      }
      gapsFromChildren.push(
        `Child ${child.childOrdinal} (${child.childId}): ${child.state}`,
      );
    } else if (
      child.state === 'pending' ||
      child.state === 'running' ||
      child.state === 'uncertain'
    ) {
      return { status: 'incomplete' };
    }
  }

  const missingRequired = children.some((child) => {
    const childRequired =
      typeof (child.policy as { required?: boolean }).required === 'boolean'
        ? Boolean((child.policy as { required?: boolean }).required)
        : true;
    if (!childRequired) {
      return false;
    }
    return (
      child.state !== 'ready' ||
      !child.resultCasHash ||
      !joinEntries.some((entry) => entry.childId === child.childId)
    );
  });
  if (missingRequired) {
    return { status: 'held', reason: 'required_child_missing' };
  }

  const joinBundleHash = hashWriterResearchJoinBundle(joinEntries);
  const delegateToolStep = await database.db.transaction(async (tx) => {
    return loadDelegateToolStep(tx, input.missionId, input.parentToolCallId);
  });
  if (!delegateToolStep) {
    throw new WriterResearchParentJoinError('delegate_tool_missing');
  }
  if (delegateToolStep.resultCasHash) {
    const summaryRecord = await storage.readStructuredDocument(
      delegateToolStep.resultCasHash,
    );
    const summary = summaryRecord.data as WriterToolInvocationResult | null;
    if (summary?.resultHash && summary.resultHash !== joinBundleHash) {
      throw new WriterResearchParentJoinError('join_hash_mismatch');
    }
    const nextStepRows = await database.db
      .select()
      .from(storytellerWriterStep)
      .where(
        and(
          eq(storytellerWriterStep.missionId, input.missionId),
          eq(storytellerWriterStep.contextId, contextId),
          sql`${storytellerWriterStep.toolCallId} IS NULL`,
          sql`${storytellerWriterStep.ordinal} > ${delegateToolStep.ordinal}`,
          eq(storytellerWriterStep.state, 'model-request-prepared'),
        ),
      )
      .orderBy(asc(storytellerWriterStep.ordinal))
      .limit(1);
    const nextStep = nextStepRows[0];
    if (nextStep) {
      return {
        status: 'replayed' as const,
        joinBundleHash,
        nextOrdinal: nextStep.ordinal,
        nextWireSha256: nextStep.requestCasHash,
      };
    }
  }

  const joinPayload: WriterResearchDelegateJoinPayload = {
    version: 'writer-research-delegate-join.v1',
    missionId: input.missionId,
    parentToolCallId: input.parentToolCallId,
    joinBundleHash,
    children: children.map((child) => {
      const entry = joinEntries.find((row) => row.childId === child.childId);
      return {
        childOrdinal: child.childOrdinal,
        childId: child.childId,
        required: true,
        resultCasHash: entry?.resultCasHash ?? null,
        verifiedResultHash: entry?.verifiedResultHash ?? null,
        gaps: gapsFromChildren,
      };
    }),
  };

  const joinCasHash = await persistWriterResearchDelegateJoin(
    storage,
    joinPayload,
  );
  const toolSummary = summarizeWriterResearchDelegateJoin(
    input.parentToolCallId,
    joinBundleHash,
  );
  const summaryCasHash = await storage.putStructuredDocument({
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
    schemaId: WRITER_TOOL_SUMMARY_SCHEMA,
    data: JSON.parse(JSON.stringify(toolSummary)),
  });

  const maxOrdinal = await database.db
    .select({ ordinal: storytellerWriterStep.ordinal })
    .from(storytellerWriterStep)
    .where(
      and(
        eq(storytellerWriterStep.missionId, input.missionId),
        eq(storytellerWriterStep.contextId, contextId),
      ),
    );
  const globalMax = maxOrdinal.reduce(
    (max, row) => Math.max(max, row.ordinal),
    delegateToolStep.ordinal,
  );
  const priorForWire = await loadPriorToolSummariesForJoin(
    database,
    storage,
    input.missionId,
    globalMax + 1,
  );
  const roundRequest = compileWriterRoundCapturedRequest(
    input.capture,
    priorForWire,
  );
  const nextWire = prepareWriterRoundWire({
    model: input.capture.modelSelection.model,
    provider: 'OpenAI',
    messages: roundRequest.messages,
    outputSchema: roundRequest.outputSchema,
    maxGeneratedTokens: input.capture.budgets.maxGeneratedTokens,
    maxSerializedRequestBytes: 48 * 1024,
    maxInputTokens: input.capture.budgets.maxInputTokens,
  });

  const joined = await database.db.transaction(async (tx) => {
    const locked = await loadDelegateToolStep(
      tx,
      input.missionId,
      input.parentToolCallId,
    );
    if (!locked) {
      throw new WriterResearchParentJoinError('delegate_tool_missing');
    }
    if (locked.resultCasHash) {
      const [existingNext] = await tx
        .select()
        .from(storytellerWriterStep)
        .where(
          and(
            eq(storytellerWriterStep.missionId, input.missionId),
            eq(storytellerWriterStep.contextId, contextId),
            sql`${storytellerWriterStep.toolCallId} IS NULL`,
            sql`${storytellerWriterStep.ordinal} > ${locked.ordinal}`,
            eq(storytellerWriterStep.state, 'model-request-prepared'),
          ),
        )
        .orderBy(asc(storytellerWriterStep.ordinal))
        .limit(1);
      if (existingNext) {
        return {
          replayed: true as const,
          nextOrdinal: existingNext.ordinal,
          nextWireSha256: existingNext.requestCasHash,
        };
      }
    }
    const [updatedTool] = await tx
      .update(storytellerWriterStep)
      .set({
        resultCasHash: summaryCasHash,
        state: 'tools-applied',
        revision: locked.revision + 1,
        updatedAt: sql`clock_timestamp()`,
      })
      .where(
        and(
          eq(storytellerWriterStep.missionId, input.missionId),
          eq(storytellerWriterStep.contextId, contextId),
          eq(storytellerWriterStep.ordinal, locked.ordinal),
          eq(storytellerWriterStep.revision, locked.revision),
        ),
      )
      .returning();
    if (!updatedTool) {
      throw new WriterResearchParentJoinError('revision_conflict');
    }
    const nextOrdinal = await nextParentContextOrdinal(tx, input.missionId);
    await tx.insert(storytellerWriterStep).values({
      missionId: input.missionId,
      contextId,
      ordinal: nextOrdinal,
      requestCasHash: nextWire.sha256,
      revision: 1,
      state: 'model-request-prepared',
    });
    await tx
      .update(storytellerWriterMission)
      .set({ state: 'active', updatedAt: sql`clock_timestamp()` })
      .where(eq(storytellerWriterMission.id, input.missionId));
    await bumpMissionNextRevision(tx, input.missionId, nextOrdinal);
    return {
      replayed: false as const,
      nextOrdinal,
      nextWireSha256: nextWire.sha256,
      joinCasHash,
    };
  });

  if (joined.replayed) {
    return {
      status: 'replayed',
      joinBundleHash,
      nextOrdinal: joined.nextOrdinal,
      nextWireSha256: joined.nextWireSha256,
    };
  }
  return {
    status: 'joined',
    joinBundleHash,
    nextOrdinal: joined.nextOrdinal,
    nextWireSha256: joined.nextWireSha256,
  };
}