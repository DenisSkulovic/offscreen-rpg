import { hashCanonicalJson } from './canonical-json.js';
import {
  createEmptyLibraryTrie,
  deleteLibraryTrieKey,
  emptyLibraryRootHash,
  getLibraryTrieValue,
  setLibraryTrieValue,
  type LibraryTrieStore,
} from './library-trie.js';
import {
  documentManifestEntrySchema,
  libraryNodeV2Schema,
  libraryRootV2Schema,
  logicalDocumentPathSchema,
  type DocumentManifestEntry,
  type LibraryNodeV2,
  type LibraryRootV2,
} from './schema.js';
import { z } from 'zod';

const libraryIdLeafSchema = z.strictObject({
  documentId: z.uuid(),
  path: logicalDocumentPathSchema,
});

export type LibraryIndex = {
  store: LibraryTrieStore;
  root: LibraryRootV2;
  rootHash: string;
};

export type LibraryBatchOperation =
  | { op: 'create'; entry: DocumentManifestEntry }
  | { op: 'replace'; entry: DocumentManifestEntry }
  | { op: 'delete'; documentId: string }
  | { op: 'rename'; documentId: string; path: string };

function loadNode(store: LibraryTrieStore, hash: string): LibraryNodeV2 {
  const node = store.get(hash);
  if (node === undefined) {
    throw new Error(`Missing library node for hash ${hash}`);
  }
  return libraryNodeV2Schema.parse(node);
}

function nibblesToKey(nibbles: readonly string[]): string {
  if (nibbles.length % 2 !== 0) {
    throw new Error('Invalid library trie nibble path');
  }
  const bytes = Buffer.alloc(nibbles.length / 2);
  for (let index = 0; index < nibbles.length; index += 2) {
    const high = Number.parseInt(nibbles[index] as string, 16);
    const low = Number.parseInt(nibbles[index + 1] as string, 16);
    bytes[index / 2] = (high << 4) | low;
  }
  return bytes.toString('utf8');
}

function collectTrieLeaves(
  store: LibraryTrieStore,
  nodeHash: string,
  prefixNibbles: string[],
  out: Map<string, Record<string, unknown>>,
): void {
  const node = loadNode(store, nodeHash);
  if (node.value !== null) {
    out.set(nibblesToKey(prefixNibbles), node.value as Record<string, unknown>);
  }
  for (const child of node.children) {
    collectTrieLeaves(store, child.hash, [...prefixNibbles, child.nibble], out);
  }
}

function idTrieKey(documentId: string): string {
  return documentId.toLowerCase();
}

function idLeafValue(entry: Pick<DocumentManifestEntry, 'documentId' | 'path'>): Record<string, unknown> {
  return {
    documentId: entry.documentId,
    path: entry.path,
  };
}

function manifestRecord(entry: DocumentManifestEntry): Record<string, unknown> {
  return documentManifestEntrySchema.parse(entry) as Record<string, unknown>;
}

export function createEmptyLibraryIndex(): LibraryIndex {
  const trie = createEmptyLibraryTrie();
  const root = libraryRootV2Schema.parse({
    format: 'offscreen.library-root.v2',
    pathsRootHash: trie.rootHash,
    idsRootHash: trie.rootHash,
  });
  return {
    store: trie.store,
    root,
    rootHash: hashCanonicalJson(root),
  };
}

export function assertLibraryIndexConsistent(library: LibraryIndex): void {
  const paths = new Map<string, Record<string, unknown>>();
  const ids = new Map<string, Record<string, unknown>>();
  collectTrieLeaves(library.store, library.root.pathsRootHash, [], paths);
  collectTrieLeaves(library.store, library.root.idsRootHash, [], ids);

  for (const [idKey, idValue] of ids) {
    const leaf = libraryIdLeafSchema.parse(idValue);
    if (idKey !== idTrieKey(leaf.documentId)) {
      throw new Error('ID trie key does not match leaf documentId');
    }
    const pathEntry = paths.get(leaf.path);
    if (pathEntry === undefined) {
      throw new Error('ID index points to an absent path');
    }
    const manifest = documentManifestEntrySchema.parse(pathEntry);
    if (manifest.documentId !== leaf.documentId || manifest.path !== leaf.path) {
      throw new Error('ID index reverse-link mismatch');
    }
  }

  for (const [pathKey, pathValue] of paths) {
    const manifest = documentManifestEntrySchema.parse(pathValue);
    if (pathKey !== manifest.path) {
      throw new Error('Path trie key does not match manifest path');
    }
    const idValue = ids.get(idTrieKey(manifest.documentId));
    if (idValue === undefined) {
      throw new Error('Path entry has no matching ID index leaf');
    }
    const leaf = libraryIdLeafSchema.parse(idValue);
    if (leaf.documentId !== manifest.documentId || leaf.path !== manifest.path) {
      throw new Error('Path index reverse-link mismatch');
    }
  }
}

function applyOne(
  store: LibraryTrieStore,
  pathsRootHash: string,
  idsRootHash: string,
  operation: LibraryBatchOperation,
): { store: LibraryTrieStore; pathsRootHash: string; idsRootHash: string } {
  switch (operation.op) {
    case 'create': {
      const entry = documentManifestEntrySchema.parse(operation.entry);
      const idKey = idTrieKey(entry.documentId);
      if (getLibraryTrieValue(store, pathsRootHash, entry.path) !== null) {
        throw new Error('Document path already exists');
      }
      if (getLibraryTrieValue(store, idsRootHash, idKey) !== null) {
        throw new Error('Document ID already exists');
      }
      const pathResult = setLibraryTrieValue(store, pathsRootHash, entry.path, manifestRecord(entry));
      const idResult = setLibraryTrieValue(
        pathResult.store,
        idsRootHash,
        idKey,
        idLeafValue(entry),
      );
      return {
        store: idResult.store,
        pathsRootHash: pathResult.rootHash,
        idsRootHash: idResult.rootHash,
      };
    }
    case 'replace': {
      const entry = documentManifestEntrySchema.parse(operation.entry);
      const idKey = idTrieKey(entry.documentId);
      const existingId = getLibraryTrieValue(store, idsRootHash, idKey);
      if (existingId === null) {
        throw new Error('Cannot replace unknown document ID');
      }
      const idLeaf = libraryIdLeafSchema.parse(existingId);
      if (idLeaf.path !== entry.path) {
        throw new Error('Replace cannot change document path; use rename');
      }
      const existingPath = getLibraryTrieValue(store, pathsRootHash, entry.path);
      if (existingPath === null) {
        throw new Error('Cannot replace missing path entry');
      }
      const prior = documentManifestEntrySchema.parse(existingPath);
      if (prior.documentId !== entry.documentId) {
        throw new Error('Path entry documentId does not match replace target');
      }
      const pathResult = setLibraryTrieValue(store, pathsRootHash, entry.path, manifestRecord(entry));
      return {
        store: pathResult.store,
        pathsRootHash: pathResult.rootHash,
        idsRootHash,
      };
    }
    case 'delete': {
      const idKey = idTrieKey(operation.documentId);
      const existingId = getLibraryTrieValue(store, idsRootHash, idKey);
      if (existingId === null) {
        throw new Error('Cannot delete unknown document ID');
      }
      const idLeaf = libraryIdLeafSchema.parse(existingId);
      const pathResult = deleteLibraryTrieKey(store, pathsRootHash, idLeaf.path);
      const idResult = deleteLibraryTrieKey(pathResult.store, idsRootHash, idKey);
      return {
        store: idResult.store,
        pathsRootHash: pathResult.rootHash,
        idsRootHash: idResult.rootHash,
      };
    }
    case 'rename': {
      const idKey = idTrieKey(operation.documentId);
      const newPath = logicalDocumentPathSchema.parse(operation.path);
      const existingId = getLibraryTrieValue(store, idsRootHash, idKey);
      if (existingId === null) {
        throw new Error('Cannot rename unknown document ID');
      }
      const idLeaf = libraryIdLeafSchema.parse(existingId);
      if (idLeaf.path === newPath) {
        return { store, pathsRootHash, idsRootHash };
      }
      if (getLibraryTrieValue(store, pathsRootHash, newPath) !== null) {
        throw new Error('Document path already exists');
      }
      const existingPath = getLibraryTrieValue(store, pathsRootHash, idLeaf.path);
      if (existingPath === null) {
        throw new Error('Cannot rename missing path entry');
      }
      const entry = documentManifestEntrySchema.parse(existingPath);
      if (entry.documentId !== operation.documentId) {
        throw new Error('Path entry documentId does not match rename target');
      }
      const renamed = documentManifestEntrySchema.parse({ ...entry, path: newPath });
      const setNew = setLibraryTrieValue(store, pathsRootHash, newPath, manifestRecord(renamed));
      const dropOld = deleteLibraryTrieKey(setNew.store, setNew.rootHash, idLeaf.path);
      const setId = setLibraryTrieValue(dropOld.store, idsRootHash, idKey, idLeafValue(renamed));
      return {
        store: setId.store,
        pathsRootHash: dropOld.rootHash,
        idsRootHash: setId.rootHash,
      };
    }
    default: {
      const _exhaustive: never = operation;
      throw new Error(`Unknown library batch operation: ${String(_exhaustive)}`);
    }
  }
}

export function applyLibraryBatch(
  library: LibraryIndex,
  operations: readonly LibraryBatchOperation[],
): LibraryIndex {
  let store: LibraryTrieStore = new Map(library.store);
  let pathsRootHash = library.root.pathsRootHash;
  let idsRootHash = library.root.idsRootHash;

  for (const operation of operations) {
    const next = applyOne(store, pathsRootHash, idsRootHash, operation);
    store = next.store;
    pathsRootHash = next.pathsRootHash;
    idsRootHash = next.idsRootHash;
  }

  const root = libraryRootV2Schema.parse({
    format: 'offscreen.library-root.v2',
    pathsRootHash,
    idsRootHash,
  });
  const result: LibraryIndex = {
    store,
    root,
    rootHash: hashCanonicalJson(root),
  };
  assertLibraryIndexConsistent(result);
  return result;
}

export { emptyLibraryRootHash };