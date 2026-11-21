import { hashCanonicalJson } from './canonical-json.js';
import {
  createEmptyLibraryTrie,
  createLibraryTrieEdit,
  deleteLibraryTrieKey,
  deleteLibraryTrieKeyInEdit,
  emptyLibraryRootHash,
  finalizeLibraryTrieEdit,
  getLibraryTrieValue,
  libraryTrieEditReadView,
  setLibraryTrieValue,
  setLibraryTrieValueInEdit,
  type LibraryTrieEdit,
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

export async function loadLibraryIndex(
  readNode: (hash: string) => Promise<LibraryNodeV2>,
  root: LibraryRootV2,
): Promise<LibraryIndex> {
  const store = new Map<string, LibraryNodeV2>();
  const visited = new Set<string>();
  const visit = async (nodeHash: string): Promise<void> => {
    if (visited.has(nodeHash)) return;
    visited.add(nodeHash);
    const node = await readNode(nodeHash);
    store.set(nodeHash, node);
    for (const child of node.children) {
      await visit(child.hash);
    }
  };
  await visit(root.pathsRootHash);
  await visit(root.idsRootHash);
  if (!store.has(emptyLibraryRootHash)) {
    const empty = createEmptyLibraryTrie();
    store.set(emptyLibraryRootHash, empty.store.get(emptyLibraryRootHash)!);
  }
  const library: LibraryIndex = {
    store,
    root,
    rootHash: hashCanonicalJson(root),
  };
  assertLibraryIndexConsistent(library);
  return library;
}

export function collectLibraryManifestEntries(
  library: LibraryIndex,
): DocumentManifestEntry[] {
  const paths = new Map<string, Record<string, unknown>>();
  collectTrieLeaves(library.store, library.root.pathsRootHash, [], paths);
  return [...paths.values()]
    .map((value) => documentManifestEntrySchema.parse(value))
    .sort((left, right) => left.path.localeCompare(right.path));
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

function applyOneInEdit(
  edit: LibraryTrieEdit,
  pathsRootHash: string,
  idsRootHash: string,
  operation: LibraryBatchOperation,
): { pathsRootHash: string; idsRootHash: string } {
  const readStore = libraryTrieEditReadView(edit);
  switch (operation.op) {
    case 'create': {
      const entry = documentManifestEntrySchema.parse(operation.entry);
      const idKey = idTrieKey(entry.documentId);
      if (getLibraryTrieValue(readStore, pathsRootHash, entry.path) !== null) {
        throw new Error('Document path already exists');
      }
      if (getLibraryTrieValue(readStore, idsRootHash, idKey) !== null) {
        throw new Error('Document ID already exists');
      }
      const nextPathsRootHash = setLibraryTrieValueInEdit(
        edit,
        pathsRootHash,
        entry.path,
        manifestRecord(entry),
      );
      const nextIdsRootHash = setLibraryTrieValueInEdit(
        edit,
        idsRootHash,
        idKey,
        idLeafValue(entry),
      );
      return {
        pathsRootHash: nextPathsRootHash,
        idsRootHash: nextIdsRootHash,
      };
    }
    case 'replace': {
      const entry = documentManifestEntrySchema.parse(operation.entry);
      const idKey = idTrieKey(entry.documentId);
      const existingId = getLibraryTrieValue(readStore, idsRootHash, idKey);
      if (existingId === null) {
        throw new Error('Cannot replace unknown document ID');
      }
      const idLeaf = libraryIdLeafSchema.parse(existingId);
      if (idLeaf.path !== entry.path) {
        throw new Error('Replace cannot change document path; use rename');
      }
      const existingPath = getLibraryTrieValue(readStore, pathsRootHash, entry.path);
      if (existingPath === null) {
        throw new Error('Cannot replace missing path entry');
      }
      const prior = documentManifestEntrySchema.parse(existingPath);
      if (prior.documentId !== entry.documentId) {
        throw new Error('Path entry documentId does not match replace target');
      }
      const nextPathsRootHash = setLibraryTrieValueInEdit(
        edit,
        pathsRootHash,
        entry.path,
        manifestRecord(entry),
      );
      return {
        pathsRootHash: nextPathsRootHash,
        idsRootHash,
      };
    }
    case 'delete': {
      const idKey = idTrieKey(operation.documentId);
      const existingId = getLibraryTrieValue(readStore, idsRootHash, idKey);
      if (existingId === null) {
        throw new Error('Cannot delete unknown document ID');
      }
      const idLeaf = libraryIdLeafSchema.parse(existingId);
      const nextPathsRootHash = deleteLibraryTrieKeyInEdit(edit, pathsRootHash, idLeaf.path);
      const nextIdsRootHash = deleteLibraryTrieKeyInEdit(edit, idsRootHash, idKey);
      return {
        pathsRootHash: nextPathsRootHash,
        idsRootHash: nextIdsRootHash,
      };
    }
    case 'rename': {
      const idKey = idTrieKey(operation.documentId);
      const newPath = logicalDocumentPathSchema.parse(operation.path);
      const existingId = getLibraryTrieValue(readStore, idsRootHash, idKey);
      if (existingId === null) {
        throw new Error('Cannot rename unknown document ID');
      }
      const idLeaf = libraryIdLeafSchema.parse(existingId);
      if (idLeaf.path === newPath) {
        return { pathsRootHash, idsRootHash };
      }
      if (getLibraryTrieValue(readStore, pathsRootHash, newPath) !== null) {
        throw new Error('Document path already exists');
      }
      const existingPath = getLibraryTrieValue(readStore, pathsRootHash, idLeaf.path);
      if (existingPath === null) {
        throw new Error('Cannot rename missing path entry');
      }
      const entry = documentManifestEntrySchema.parse(existingPath);
      if (entry.documentId !== operation.documentId) {
        throw new Error('Path entry documentId does not match rename target');
      }
      const renamed = documentManifestEntrySchema.parse({ ...entry, path: newPath });
      const pathsAfterSet = setLibraryTrieValueInEdit(
        edit,
        pathsRootHash,
        newPath,
        manifestRecord(renamed),
      );
      const nextPathsRootHash = deleteLibraryTrieKeyInEdit(edit, pathsAfterSet, idLeaf.path);
      const nextIdsRootHash = setLibraryTrieValueInEdit(
        edit,
        idsRootHash,
        idKey,
        idLeafValue(renamed),
      );
      return {
        pathsRootHash: nextPathsRootHash,
        idsRootHash: nextIdsRootHash,
      };
    }
    default: {
      const _exhaustive: never = operation;
      throw new Error(`Unknown library batch operation: ${String(_exhaustive)}`);
    }
  }
}

function applyOne(
  store: LibraryTrieStore,
  pathsRootHash: string,
  idsRootHash: string,
  operation: LibraryBatchOperation,
): { store: LibraryTrieStore; pathsRootHash: string; idsRootHash: string } {
  const edit = createLibraryTrieEdit(store);
  const next = applyOneInEdit(edit, pathsRootHash, idsRootHash, operation);
  return {
    store: finalizeLibraryTrieEdit(edit),
    pathsRootHash: next.pathsRootHash,
    idsRootHash: next.idsRootHash,
  };
}

export function applyLibraryBatch(
  library: LibraryIndex,
  operations: readonly LibraryBatchOperation[],
): LibraryIndex {
  const edit = createLibraryTrieEdit(library.store);
  let pathsRootHash = library.root.pathsRootHash;
  let idsRootHash = library.root.idsRootHash;

  for (const operation of operations) {
    const next = applyOneInEdit(edit, pathsRootHash, idsRootHash, operation);
    pathsRootHash = next.pathsRootHash;
    idsRootHash = next.idsRootHash;
  }

  const store = finalizeLibraryTrieEdit(edit);

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