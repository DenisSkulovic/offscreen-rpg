import { isDeepStrictEqual } from 'node:util';
import {
  applyLibraryBatch,
  canonicalDocumentSchema,
  canonicalStructuredDocumentSchema,
  collectLibraryManifestEntries,
  DocumentStorageError,
  documentManifestSchema,
  loadLibraryIndex,
  stableNamespacedDocumentId,
  type DocumentManifest,
  type DocumentManifestEntry,
  type DocumentStore,
  type LibraryBatchOperation,
  type LibraryIndex,
  type StartPackageManifest,
} from '@offscreen/documents';

function assertPackageEntry(
  entry: StartPackageManifest['entries'][number],
  envelope: {
    documentId: string;
    revision: number;
    kind: string;
    authority: string;
    visibility: string;
  },
) {
  if (
    envelope.documentId !== entry.documentId ||
    envelope.revision !== entry.revision ||
    envelope.kind !== entry.kind ||
    envelope.authority !== entry.authority ||
    envelope.visibility !== entry.visibility
  ) {
    throw new Error(`Start package entry metadata mismatch: ${entry.path}`);
  }
}

function pathEntryMap(
  entries: readonly DocumentManifestEntry[],
): Map<string, DocumentManifestEntry> {
  return new Map(entries.map((entry) => [entry.path, entry]));
}

async function persistLibraryDelta(
  storage: DocumentStore,
  prior: LibraryIndex,
  next: LibraryIndex,
): Promise<string> {
  for (const [hash, node] of next.store) {
    if (!prior.store.has(hash)) {
      await storage.putLibraryNode(node);
    }
  }
  return storage.putLibraryRoot(next.root);
}

export async function instantiateStartPackage(
  storage: DocumentStore,
  args: {
    startRootHash: string;
    campaignId: string;
    operationId: string;
    baseRootHash?: string;
    baseRootRevision?: number;
  },
) {
  const start = await storage.readStartPackageManifest(args.startRootHash);
  const baseRootHash = args.baseRootHash ?? null;
  const baseRootRevision = args.baseRootRevision ?? 0;

  let v2Library: LibraryIndex | null = null;
  let base: DocumentManifest;
  if (baseRootHash) {
    try {
      const libraryRoot = await storage.readLibraryRoot(baseRootHash);
      if (libraryRoot.format === 'offscreen.library-root.v2') {
        v2Library = await loadLibraryIndex(
          (hash) => storage.readLibraryNode(hash),
          libraryRoot,
        );
        base = documentManifestSchema.parse({
          format: 'offscreen.manifest.v1',
          campaignId: args.campaignId,
          revision: baseRootRevision,
          previousRootHash: baseRootHash,
          authorOperationId: args.operationId,
          entries: collectLibraryManifestEntries(v2Library),
        });
      } else {
        base = await storage.readManifest(baseRootHash);
      }
    } catch (error) {
      if (error instanceof DocumentStorageError && error.code === 'corrupt') {
        base = await storage.readManifest(baseRootHash);
      } else {
        throw error;
      }
    }
  } else {
    base = documentManifestSchema.parse({
      format: 'offscreen.manifest.v1',
      campaignId: args.campaignId,
      revision: 0,
      previousRootHash: null,
      authorOperationId: null,
      entries: [],
    });
  }

  if (!v2Library) {
    if (
      base.campaignId !== args.campaignId ||
      base.revision !== baseRootRevision
    ) {
      throw new Error('Start instantiation base root mismatch');
    }
  }

  for (const reference of start.worlds) {
    const world = await storage.readWorldPackageManifest(reference.rootHash);
    if (
      world.worldId !== reference.worldId ||
      world.revision !== reference.revision
    ) {
      throw new Error(`Start world reference mismatch: ${reference.mount}`);
    }
  }
  const rules = await storage.readRulePackageManifest(start.rules.rootHash);
  if (
    rules.ruleSetId !== start.rules.ruleSetId ||
    rules.revision !== start.rules.revision ||
    rules.engine.adapterId !== start.rules.engine.adapterId ||
    rules.engine.adapterVersion !== start.rules.engine.adapterVersion
  ) {
    throw new Error('Start rule reference mismatch');
  }

  const reservedPaths = new Set([
    'start/reference.json',
    'world/references.json',
    'rules/reference.json',
  ]);
  if (start.entries.some((entry) => reservedPaths.has(entry.path))) {
    throw new Error('Start package entry collides with campaign references');
  }

  const entries: DocumentManifestEntry[] = [...base.entries];
  const activationEntries = [];
  for (const entry of start.entries) {
    const campaignPath =
      baseRootHash && entry.documentId === start.orientationDocumentId
        ? 'start/package.md'
        : entry.path;
    if (entries.some((existing) => existing.path === campaignPath)) {
      throw new Error(
        `Start package path collides with campaign: ${campaignPath}`,
      );
    }
    const campaignDocumentId = stableNamespacedDocumentId(
      'campaign-start',
      args.campaignId,
      entry.documentId,
    );
    const packageSource = {
      documentId: entry.documentId,
      revision: entry.revision,
    };
    let objectHash: string;
    if (entry.path.endsWith('.json')) {
      const source = await storage.readStructuredDocument(entry.objectHash);
      assertPackageEntry(entry, source.envelope);
      if (source.envelope.sources.length >= 64) {
        throw new Error(
          `Start document has no provenance capacity: ${entry.path}`,
        );
      }
      objectHash = await storage.putStructuredDocument(
        canonicalStructuredDocumentSchema.parse({
          ...source,
          envelope: {
            ...source.envelope,
            documentId: campaignDocumentId,
            revision: 1,
            sources: [...source.envelope.sources, packageSource],
          },
        }),
      );
    } else {
      const source = await storage.readDocument(entry.objectHash);
      assertPackageEntry(entry, source.envelope);
      if (source.envelope.sources.length >= 64) {
        throw new Error(
          `Start document has no provenance capacity: ${entry.path}`,
        );
      }
      objectHash = await storage.putDocument(
        canonicalDocumentSchema.parse({
          ...source,
          envelope: {
            ...source.envelope,
            documentId: campaignDocumentId,
            revision: 1,
            sources: [...source.envelope.sources, packageSource],
          },
        }),
      );
    }
    entries.push({
      documentId: campaignDocumentId,
      revision: 1,
      path: campaignPath,
      objectHash,
      kind: entry.kind,
      authority: entry.authority,
      visibility: entry.visibility,
    });
    activationEntries.push({
      packageDocumentId: entry.documentId,
      campaignDocumentId,
      revision: 1,
      path: campaignPath,
      activation: entry.activation,
    });
  }

  async function addReference(argsForReference: {
    role: string;
    path: string;
    kind: 'start-reference' | 'world-reference' | 'rule-reference';
    schemaId: string;
    data: unknown;
  }) {
    const existing = entries.find(
      (entry) => entry.path === argsForReference.path,
    );
    if (existing) {
      if (
        existing.kind !== argsForReference.kind ||
        existing.authority !== 'canon' ||
        existing.visibility !== 'storyteller-private'
      ) {
        throw new Error(
          `Campaign reference mismatch: ${argsForReference.path}`,
        );
      }
      const document = await storage.readStructuredDocument(
        existing.objectHash,
      );
      if (
        document.schemaId !== argsForReference.schemaId ||
        !isDeepStrictEqual(document.data, argsForReference.data)
      ) {
        throw new Error(
          `Campaign reference mismatch: ${argsForReference.path}`,
        );
      }
      return;
    }
    const documentId = stableNamespacedDocumentId(
      'campaign-start-reference',
      args.campaignId,
      argsForReference.role,
    );
    const document = canonicalStructuredDocumentSchema.parse({
      format: 'offscreen.structured-document.v1',
      envelope: {
        documentId,
        kind: argsForReference.kind,
        schemaVersion: 1,
        revision: 1,
        authority: 'canon',
        visibility: 'storyteller-private',
        sources: [],
      },
      schemaId: argsForReference.schemaId,
      data: argsForReference.data,
    });
    entries.push({
      documentId,
      revision: 1,
      path: argsForReference.path,
      objectHash: await storage.putStructuredDocument(document),
      kind: argsForReference.kind,
      authority: 'canon',
      visibility: 'storyteller-private',
    });
  }

  await addReference({
    role: 'start',
    path: 'start/reference.json',
    kind: 'start-reference',
    schemaId: 'start-reference.v1',
    data: {
      version: 1,
      startPackageId: start.startPackageId,
      rootHash: args.startRootHash,
      revision: start.revision,
      entries: activationEntries,
    },
  });
  await addReference({
    role: 'worlds',
    path: 'world/references.json',
    kind: 'world-reference',
    schemaId: 'world-references.v1',
    data: { version: 1, worlds: start.worlds },
  });
  await addReference({
    role: 'rules',
    path: 'rules/reference.json',
    kind: 'rule-reference',
    schemaId: 'rule-reference.v1',
    data: { version: 1, rules: start.rules },
  });

  if (v2Library) {
    const priorPaths = pathEntryMap(collectLibraryManifestEntries(v2Library));
    const batch: LibraryBatchOperation[] = [];
    for (const entry of entries) {
      const prior = priorPaths.get(entry.path);
      if (prior) {
        if (isDeepStrictEqual(prior, entry)) {continue;}
        throw new Error(
          `Start package path collides with campaign: ${entry.path}`,
        );
      }
      batch.push({ op: 'create', entry });
    }
    const nextLibrary = applyLibraryBatch(v2Library, batch);
    const rootHash = await persistLibraryDelta(storage, v2Library, nextLibrary);
    const manifest = documentManifestSchema.parse({
      format: 'offscreen.manifest.v1',
      campaignId: args.campaignId,
      revision: baseRootRevision + 1,
      previousRootHash: baseRootHash,
      authorOperationId: args.operationId,
      entries: collectLibraryManifestEntries(nextLibrary).sort((left, right) =>
        left.path.localeCompare(right.path),
      ),
    });
    return { rootHash, manifest, start };
  }

  const manifest = documentManifestSchema.parse({
    format: 'offscreen.manifest.v1',
    campaignId: args.campaignId,
    revision: base.revision + 1,
    previousRootHash: baseRootHash,
    authorOperationId: args.operationId,
    entries: entries.sort((left, right) => left.path.localeCompare(right.path)),
  });
  return {
    rootHash: await storage.putManifest(manifest),
    manifest,
    start,
  };
}
