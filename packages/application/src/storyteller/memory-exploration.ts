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
  | 'stale-root'
  | 'invalid-handle'
  | 'read-limit';

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
  memoryHandles: readonly EvidenceHandle[];
  sourceHandles: readonly EvidenceHandle[];
  rounds: readonly unknown[];
}>;

function normalize(value: string) {
  return value.normalize('NFKC').toLocaleLowerCase('en-US').trim();
}

/**
 * Provider-free canonical dispatcher for a captured root. Its serializable
 * snapshot is the persistence boundary; publication remains a separate flow.
 */
export function createCanonicalMemoryExplorer(input: {
  storage: DocumentStore;
  index: LexicalStoryIndex;
  recipe: ResolvedStoryRetrievalRecipe;
  snapshot?: MemoryExplorationSnapshot;
}) {
  const { storage, index, recipe } = input;
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
      !validHandleSet(initial.memoryHandles, 'm') ||
      !validHandleSet(initial.sourceHandles, 's') ||
      initial.storyId !== index.storyId ||
      initial.rootHash !== index.rootHash ||
      initial.rootRevision !== index.rootRevision)
  ) {
    throw new Error('Invalid memory exploration snapshot');
  }
  let readsUsed = initial?.readsUsed ?? 0;
  let retainedBytes = initial?.retainedBytes ?? 0;
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
    prefix: 'm' | 's',
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
          handle: handleFor(sourceUnit, sourceHandles, sourceHandleByUnit, 's'),
          documentId: entry.documentId,
          revision: entry.revision,
        },
      ];
    });
  }

  function candidateResult(
    candidate: StoryRetrievalCandidate,
    registry: boolean,
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
      ...(registry ? {} : { snippet: candidate.snippet }),
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
    const results = [];
    for (const operation of request.requests) {
      readsUsed += 1;
      if (
        operation.operation === 'search_memory' ||
        operation.operation === 'query_registry'
      ) {
        const registry = operation.operation === 'query_registry';
        const tuning = registry
          ? {
              ...recipe.query.tuning,
              id: `${recipe.query.tuning.id}.registry`,
              includeSourcePassages: false,
              fieldWeights: {
                ...recipe.query.tuning.fieldWeights,
                body: 0,
              },
            }
          : recipe.query.tuning;
        const result = index.search({
          storyId: index.storyId,
          rootHash: index.rootHash,
          rootRevision: index.rootRevision,
          query: operation.query,
          ...recipe.query,
          tuning,
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
          operation: operation.operation,
          state: result.candidates.length ? 'ok' : 'no-match',
          coverage: result.coverage,
          candidates: result.candidates.map((candidate) =>
            candidateResult(candidate, registry, manifest),
          ),
        });
        continue;
      }
      const handles =
        operation.operation === 'inspect_memory'
          ? memoryHandles
          : sourceHandles;
      const unit = handles.get(operation.handle);
      if (!unit) {
        throw new CanonicalMemoryExplorationError('invalid-handle');
      }
      const loaded = await readUnit(unit);
      const bytes = Buffer.byteLength(loaded.body, 'utf8');
      if (retainedBytes + bytes > recipe.assembly.maxBytes) {
        results.push({
          requestId: operation.requestId,
          operation: operation.operation,
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
        operation: operation.operation,
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
