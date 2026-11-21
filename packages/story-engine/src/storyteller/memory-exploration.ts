import type { CreativeExplorationRecipe } from '@offscreen/contracts/creative-exploration';
import {
  creativeExplorationRecipeSchema,
  disabledCreativeExplorationRecipe,
} from '@offscreen/contracts/creative-exploration';
import type {
  StoryRetrievalCandidate,
  StoryRetrievalUnit,
} from '@offscreen/contracts/story-retrieval';
import type { DocumentStore } from '@offscreen/documents';
import {
  storytellerNeedsContextSchema,
  type StorytellerNeedsContext,
} from '@offscreen/storyteller/tasks';
import type { LexicalStoryIndex } from './lexical-story-index';
import type { ResolvedStoryRetrievalRecipe } from './retrieval-recipes';

type EvidenceHandle = Readonly<{
  handle: string;
  unit: StoryRetrievalUnit;
}>;

export type CanonicalMemoryExplorationFailureCode =
  'stale-root' | 'invalid-handle' | 'read-limit' | 'creative-limit';

export class CanonicalMemoryExplorationError extends Error {
  constructor(readonly code: CanonicalMemoryExplorationFailureCode) {
    super(`Memory exploration ${code}`);
  }
}

export type MemoryExplorationSnapshot = Readonly<{
  format: 'offscreen.memory-exploration-snapshot.v1';
  storyId: string;
  rootHash: string;
  rootRevision: number;
  readsUsed: number;
  retainedBytes: number;
  readyDecisions: number;
  memoryHandles: readonly EvidenceHandle[];
  sourceHandles: readonly EvidenceHandle[];
  rounds: readonly unknown[];
}>;

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function measureCreativeSnapshotUsage(
  snapshot: Pick<MemoryExplorationSnapshot, 'rounds'>,
) {
  let queries = 0;
  let leads = 0;
  let maxCandidatesInQuery = 0;
  const lenses = new Set<string>();
  for (const rawRound of snapshot.rounds) {
    const round = record(rawRound);
    const parsedRequest = storytellerNeedsContextSchema.safeParse(
      round?.request,
    );
    if (!parsedRequest.success) continue;
    const creativeRequests = parsedRequest.data.requests.filter(
      (request) =>
        request.operation === 'ask_memory' &&
        request.intent === 'possibilities',
    );
    if (!creativeRequests.length) {
      if (
        round &&
        Array.isArray(round.results) &&
        round.results.some(
          (rawResult) => record(rawResult)?.operation === 'creative_search',
        )
      ) {
        return null;
      }
      continue;
    }
    if (!round || !Array.isArray(round.results)) return null;
    const requestsById = new Map(
      creativeRequests.map((request) => [request.requestId, request]),
    );
    const returnedRequestIds = new Set<string>();
    for (const rawResult of round.results) {
      const result = record(rawResult);
      if (result?.operation !== 'creative_search') continue;
      const request =
        typeof result.requestId === 'string'
          ? requestsById.get(result.requestId)
          : undefined;
      if (
        !request ||
        returnedRequestIds.has(request.requestId) ||
        result.lens !== 'serendipity' ||
        !Array.isArray(result.candidates)
      ) {
        return null;
      }
      returnedRequestIds.add(request.requestId);
      queries += 1;
      lenses.add('serendipity');
      leads += result.candidates.length;
      maxCandidatesInQuery = Math.max(
        maxCandidatesInQuery,
        result.candidates.length,
      );
    }
    if (returnedRequestIds.size !== creativeRequests.length) return null;
  }
  return { queries, lenses: lenses.size, leads, maxCandidatesInQuery };
}

export function creativeSnapshotWithinRecipe(
  snapshot: Pick<MemoryExplorationSnapshot, 'rounds'>,
  recipe: CreativeExplorationRecipe,
) {
  const usage = measureCreativeSnapshotUsage(snapshot);
  if (!usage) return false;
  if (!usage.queries) return true;
  return (
    recipe.enabled &&
    usage.queries <= recipe.limits.maxQueries &&
    usage.lenses <= recipe.limits.maxLenses &&
    usage.leads <= recipe.limits.maxLeads &&
    usage.maxCandidatesInQuery <= recipe.limits.maxCandidatesPerQuery
  );
}

/**
 * Provider-free canonical dispatcher for a captured root. Its serializable
 * snapshot is the persistence boundary; publication remains a separate flow.
 */
export function createCanonicalMemoryExplorer(input: {
  storage: DocumentStore;
  index: LexicalStoryIndex;
  recipe: ResolvedStoryRetrievalRecipe;
  creativeExploration?: CreativeExplorationRecipe;
  snapshot?: MemoryExplorationSnapshot;
}) {
  const { storage, index, recipe } = input;
  const creativeExploration = creativeExplorationRecipeSchema.parse(
    input.creativeExploration ?? disabledCreativeExplorationRecipe,
  );
  const initial = input.snapshot;
  const validHandleSet = (entries: readonly EvidenceHandle[], prefix: string) =>
    entries.every((entry) =>
      new RegExp(`^${prefix}[1-9][0-9]*$`).test(entry.handle),
    ) && new Set(entries.map((entry) => entry.handle)).size === entries.length;
  if (
    initial &&
    (initial.format !== 'offscreen.memory-exploration-snapshot.v1' ||
      !Number.isInteger(initial.readsUsed) ||
      initial.readsUsed < 0 ||
      initial.readsUsed > recipe.assembly.maxReads ||
      !Number.isInteger(initial.retainedBytes) ||
      initial.retainedBytes < 0 ||
      initial.retainedBytes > recipe.assembly.maxBytes ||
      !Number.isInteger(initial.readyDecisions) ||
      initial.readyDecisions < 0 ||
      initial.readyDecisions > 1 ||
      !validHandleSet(initial.memoryHandles, 'm') ||
      !validHandleSet(initial.sourceHandles, 'x') ||
      !creativeSnapshotWithinRecipe(initial, creativeExploration) ||
      initial.storyId !== index.storyId ||
      initial.rootHash !== index.rootHash ||
      initial.rootRevision !== index.rootRevision)
  ) {
    throw new Error('Invalid memory exploration snapshot');
  }
  let readsUsed = initial?.readsUsed ?? 0;
  let retainedBytes = initial?.retainedBytes ?? 0;
  const readyDecisions = initial?.readyDecisions ?? 0;
  const memoryHandles = new Map(
    (initial?.memoryHandles ?? []).map((entry) => [entry.handle, entry.unit]),
  );
  const sourceHandles = new Map(
    (initial?.sourceHandles ?? []).map((entry) => [entry.handle, entry.unit]),
  );
  const rounds: unknown[] = [...(initial?.rounds ?? [])];
  const memoryHandleByUnit = new Map(
    [...memoryHandles].map(([handle, unit]) => [unit.unitId, handle]),
  );
  const sourceHandleByUnit = new Map(
    [...sourceHandles].map(([handle, unit]) => [unit.unitId, handle]),
  );

  function handleFor(
    unit: StoryRetrievalUnit,
    handles: Map<string, StoryRetrievalUnit>,
    byUnit: Map<string, string>,
    prefix: 'm' | 'x',
  ) {
    const existing = byUnit.get(unit.unitId);
    if (existing) return existing;
    const handle = `${prefix}${handles.size + 1}`;
    handles.set(handle, unit);
    byUnit.set(unit.unitId, handle);
    return handle;
  }

  async function currentEntry(unit: StoryRetrievalUnit) {
    const manifest = await storage.readManifest(index.rootHash);
    if (
      manifest.campaignId !== index.storyId ||
      manifest.revision !== index.rootRevision
    ) {
      throw new CanonicalMemoryExplorationError('stale-root');
    }
    const entry = manifest.entries.find(
      (candidate) =>
        candidate.documentId === unit.documentId &&
        candidate.revision === unit.revision &&
        candidate.objectHash === unit.sourceHash &&
        candidate.visibility !== 'developer-private',
    );
    if (!entry) throw new CanonicalMemoryExplorationError('invalid-handle');
    return entry;
  }

  function linkedSourceHandles(
    unit: StoryRetrievalUnit,
    manifest: Awaited<ReturnType<DocumentStore['readManifest']>>,
  ) {
    return unit.linkedDocumentIds.flatMap((documentId) => {
      const entry = manifest.entries.find(
        (candidate) =>
          candidate.documentId === documentId &&
          candidate.kind === 'source-passage' &&
          candidate.visibility !== 'developer-private',
      );
      if (!entry) return [];
      const sourceUnit: StoryRetrievalUnit = {
        ...unit,
        unitId: `${entry.documentId}@${entry.revision}#root`,
        documentId: entry.documentId,
        revision: entry.revision,
        sourceHash: entry.objectHash,
        path: entry.path,
        kind: entry.kind,
        authority: entry.authority,
        visibility: entry.visibility,
        linkedDocumentIds: [],
        title: entry.path,
        contextualKey: `${entry.kind} ${entry.path}`,
        bodyBytes: 0,
      };
      return [
        {
          handle: handleFor(sourceUnit, sourceHandles, sourceHandleByUnit, 'x'),
          documentId: entry.documentId,
          revision: entry.revision,
        },
      ];
    });
  }

  function candidateResult(
    candidate: StoryRetrievalCandidate,
    manifest: Awaited<ReturnType<DocumentStore['readManifest']>>,
  ) {
    return {
      handle: handleFor(candidate.unit, memoryHandles, memoryHandleByUnit, 'm'),
      documentId: candidate.unit.documentId,
      revision: candidate.unit.revision,
      title: candidate.unit.title,
      path: candidate.unit.path,
      kind: candidate.unit.kind,
      linkedSources: linkedSourceHandles(candidate.unit, manifest),
      snippet: candidate.snippet,
    };
  }

  async function readUnit(unit: StoryRetrievalUnit) {
    const entry = await currentEntry(unit);
    if (entry.kind === 'source-passage') {
      const passage = await storage.readSourcePassage(entry.objectHash);
      return {
        title: passage.content.title,
        body: passage.content.paragraphs.join('\n\n'),
      };
    }
    const document = await storage.readDocument(entry.objectHash);
    return {
      title: document.title,
      body: document.body,
    };
  }

  async function execute(rawRequest: StorytellerNeedsContext) {
    const request = storytellerNeedsContextSchema.parse(rawRequest);
    if (readsUsed + request.requests.length > recipe.assembly.maxReads) {
      throw new CanonicalMemoryExplorationError('read-limit');
    }
    const priorCreativeUsage = measureCreativeSnapshotUsage({ rounds });
    if (!priorCreativeUsage) {
      throw new Error('Invalid creative exploration snapshot');
    }
    const requestedCreative = request.requests.filter(
      (operation) =>
        operation.operation === 'ask_memory' &&
        operation.intent === 'possibilities',
    );
    const requestedLenses = new Set([
      ...rounds.flatMap((rawRound) => {
        const round = record(rawRound);
        const parsed = storytellerNeedsContextSchema.safeParse(round?.request);
        return parsed.success
          ? parsed.data.requests.flatMap((operation) =>
              operation.operation === 'ask_memory' &&
              operation.intent === 'possibilities'
                ? ['serendipity' as const]
                : [],
            )
          : [];
      }),
      ...requestedCreative.map(() => 'serendipity' as const),
    ]);
    if (
      requestedCreative.length > 0 &&
      (!creativeExploration.enabled ||
        priorCreativeUsage.queries + requestedCreative.length >
          creativeExploration.limits.maxQueries ||
        requestedLenses.size > creativeExploration.limits.maxLenses)
    ) {
      throw new CanonicalMemoryExplorationError('creative-limit');
    }
    let creativeLeadsUsed = priorCreativeUsage.leads;
    const results = [];
    for (const operation of request.requests) {
      readsUsed += 1;
      if (operation.operation === 'ask_memory') {
        const creative = operation.intent === 'possibilities';
        const resultOperation = creative
          ? ('creative_search' as const)
          : ('search_memory' as const);
        const creativeCandidateLimit = creative
          ? Math.min(
              creativeExploration.limits.maxCandidatesPerQuery,
              creativeExploration.limits.maxLeads - creativeLeadsUsed,
            )
          : null;
        if (creativeCandidateLimit === 0 && creative) {
          results.push({
            requestId: operation.requestId,
            operation: resultOperation,
            lens: 'serendipity' as const,
            question: operation.question,
            state: 'lead-limit',
            candidates: [],
          });
          continue;
        }
        const result = index.search({
          storyId: index.storyId,
          rootHash: index.rootHash,
          rootRevision: index.rootRevision,
          query: operation.question,
          ...recipe.query,
          ...(creativeCandidateLimit === null
            ? {}
            : {
                maxResults: Math.min(
                  recipe.query.maxResults,
                  creativeCandidateLimit,
                ),
              }),
          tuning: recipe.query.tuning,
        });
        const manifest = await storage.readManifest(index.rootHash);
        if (
          manifest.campaignId !== index.storyId ||
          manifest.revision !== index.rootRevision
        ) {
          throw new CanonicalMemoryExplorationError('stale-root');
        }
        results.push({
          requestId: operation.requestId,
          operation: resultOperation,
          ...(creative ? { lens: 'serendipity' as const } : {}),
          question: operation.question,
          state: result.candidates.length ? 'ok' : 'no-match',
          coverage: result.coverage,
          candidates: result.candidates.map((candidate) =>
            candidateResult(candidate, manifest),
          ),
        });
        if (creative) {
          creativeLeadsUsed += result.candidates.length;
        }
        continue;
      }
      const readingSource = operation.handle.startsWith('x');
      const handles = readingSource ? sourceHandles : memoryHandles;
      const unit = handles.get(operation.handle);
      if (!unit) {
        throw new CanonicalMemoryExplorationError('invalid-handle');
      }
      const loaded = await readUnit(unit);
      const bytes = Buffer.byteLength(loaded.body, 'utf8');
      if (retainedBytes + bytes > recipe.assembly.maxBytes) {
        results.push({
          requestId: operation.requestId,
          operation: readingSource ? 'read_source' : 'inspect_memory',
          state: 'byte-limit',
          handle: operation.handle,
          bytes,
        });
        continue;
      }
      retainedBytes += bytes;
      const manifest = await storage.readManifest(index.rootHash);
      const linkedSources = linkedSourceHandles(unit, manifest);
      results.push({
        requestId: operation.requestId,
        operation: readingSource ? 'read_source' : 'inspect_memory',
        state: 'ok',
        handle: operation.handle,
        title: loaded.title,
        body: loaded.body,
        bytes,
        linkedSources,
      });
    }
    const round = { request, results };
    rounds.push(round);
    return round;
  }

  function snapshot(): MemoryExplorationSnapshot {
    return {
      format: 'offscreen.memory-exploration-snapshot.v1',
      storyId: index.storyId,
      rootHash: index.rootHash,
      rootRevision: index.rootRevision,
      readsUsed,
      retainedBytes,
      readyDecisions,
      memoryHandles: [...memoryHandles].map(([handle, unit]) => ({
        handle,
        unit,
      })),
      sourceHandles: [...sourceHandles].map(([handle, unit]) => ({
        handle,
        unit,
      })),
      rounds,
    };
  }

  return { execute, snapshot };
}
