import { hashCanonicalJson } from './canonical-json.js';
import {
  contentHashSchema,
  libraryNodeV2Schema,
  type LibraryNodeV2,
  type LibraryTrieChildV2,
} from './schema.js';

export type LibraryTrieStore = ReadonlyMap<string, LibraryNodeV2>;

const EMPTY_LIBRARY_NODE = libraryNodeV2Schema.parse({
  format: 'offscreen.library-node.v2',
  value: null,
  children: [],
});

export const emptyLibraryRootHash = hashCanonicalJson(EMPTY_LIBRARY_NODE);

export function createEmptyLibraryTrie(): {
  store: LibraryTrieStore;
  rootHash: string;
} {
  return {
    store: new Map([[emptyLibraryRootHash, EMPTY_LIBRARY_NODE]]),
    rootHash: emptyLibraryRootHash,
  };
}

function assertValidKey(key: string): void {
  if (key.length === 0) {
    throw new Error('Library trie key must not be empty');
  }
  if (key.normalize('NFC') !== key) {
    throw new Error('Library trie key must be NFC-normalized');
  }
}

function assertValidHash(hash: string): void {
  contentHashSchema.parse(hash);
}

function keyToNibbles(key: string): string[] {
  const bytes = Buffer.from(key, 'utf8');
  const nibbles: string[] = [];
  for (const byte of bytes) {
    nibbles.push((byte >> 4).toString(16));
    nibbles.push((byte & 0x0f).toString(16));
  }
  return nibbles;
}

function loadNode(store: LibraryTrieStore, hash: string): LibraryNodeV2 {
  assertValidHash(hash);
  const node = store.get(hash);
  if (node === undefined) {
    throw new Error(`Missing library node for hash ${hash}`);
  }
  return libraryNodeV2Schema.parse(node);
}

function commitNode(
  store: LibraryTrieStore,
  node: LibraryNodeV2,
): { store: LibraryTrieStore; hash: string } {
  const validated = libraryNodeV2Schema.parse(node);
  const hash = hashCanonicalJson(validated);
  const next = new Map(store);
  next.set(hash, validated);
  return { store: next, hash };
}

function updateChildren(
  children: LibraryTrieChildV2[],
  nibble: string,
  childHash: string,
): LibraryTrieChildV2[] {
  const without = children.filter((child) => child.nibble !== nibble);
  if (childHash === emptyLibraryRootHash) {
    return without;
  }
  const next = [...without, { nibble, hash: childHash }];
  next.sort((left, right) => left.nibble.localeCompare(right.nibble));
  return next;
}

function collapseNode(
  store: LibraryTrieStore,
  node: LibraryNodeV2,
): { store: LibraryTrieStore; hash: string } {
  const validated = libraryNodeV2Schema.parse(node);
  if (validated.value === null && validated.children.length === 0) {
    return { store, hash: emptyLibraryRootHash };
  }
  return commitNode(store, validated);
}

function setAt(
  store: LibraryTrieStore,
  nodeHash: string,
  nibbles: string[],
  value: Record<string, unknown>,
): { store: LibraryTrieStore; hash: string } {
  const node = loadNode(store, nodeHash);
  if (nibbles.length === 0) {
    return commitNode(store, {
      format: 'offscreen.library-node.v2',
      value,
      children: node.children,
    });
  }
  const head = nibbles[0] as string;
  const tail = nibbles.slice(1);
  const child = node.children.find((entry) => entry.nibble === head);
  const priorChildHash = child?.hash ?? emptyLibraryRootHash;
  const childResult = setAt(store, priorChildHash, tail, value);
  if (childResult.hash === priorChildHash) {
    return { store: childResult.store, hash: nodeHash };
  }
  return commitNode(childResult.store, {
    format: 'offscreen.library-node.v2',
    value: node.value,
    children: updateChildren(node.children, head, childResult.hash),
  });
}

function deleteAt(
  store: LibraryTrieStore,
  nodeHash: string,
  nibbles: string[],
): { store: LibraryTrieStore; hash: string; deleted: boolean } {
  const node = loadNode(store, nodeHash);
  if (nibbles.length === 0) {
    if (node.value === null) {
      return { store, hash: nodeHash, deleted: false };
    }
    const collapsed = collapseNode(store, {
      format: 'offscreen.library-node.v2',
      value: null,
      children: node.children,
    });
    return { store: collapsed.store, hash: collapsed.hash, deleted: true };
  }
  const head = nibbles[0] as string;
  const tail = nibbles.slice(1);
  const child = node.children.find((entry) => entry.nibble === head);
  if (child === undefined) {
    return { store, hash: nodeHash, deleted: false };
  }
  const childResult = deleteAt(store, child.hash, tail);
  if (!childResult.deleted) {
    return { store: childResult.store, hash: nodeHash, deleted: false };
  }
  if (childResult.hash === child.hash) {
    return { store: childResult.store, hash: nodeHash, deleted: true };
  }
  const collapsed = collapseNode(childResult.store, {
    format: 'offscreen.library-node.v2',
    value: node.value,
    children: updateChildren(node.children, head, childResult.hash),
  });
  return {
    store: collapsed.store,
    hash: collapsed.hash,
    deleted: true,
  };
}

export function getLibraryTrieValue(
  store: LibraryTrieStore,
  rootHash: string,
  key: string,
): Record<string, unknown> | null {
  assertValidKey(key);
  assertValidHash(rootHash);
  let hash = rootHash;
  for (const nibble of keyToNibbles(key)) {
    const node = loadNode(store, hash);
    const child = node.children.find((entry) => entry.nibble === nibble);
    if (child === undefined) {
      return null;
    }
    hash = child.hash;
  }
  const terminal = loadNode(store, hash);
  if (terminal.value === null) {
    return null;
  }
  return terminal.value;
}

export function setLibraryTrieValue(
  store: LibraryTrieStore,
  rootHash: string,
  key: string,
  value: Record<string, unknown>,
): { store: LibraryTrieStore; rootHash: string } {
  assertValidKey(key);
  assertValidHash(rootHash);
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    throw new Error('Library trie value must be a plain JSON object');
  }
  const result = setAt(store, rootHash, keyToNibbles(key), value);
  return { store: result.store, rootHash: result.hash };
}

export function deleteLibraryTrieKey(
  store: LibraryTrieStore,
  rootHash: string,
  key: string,
): { store: LibraryTrieStore; rootHash: string } {
  assertValidKey(key);
  assertValidHash(rootHash);
  const result = deleteAt(store, rootHash, keyToNibbles(key));
  if (!result.deleted) {
    throw new Error('Library trie key not found');
  }
  return { store: result.store, rootHash: result.hash };
}