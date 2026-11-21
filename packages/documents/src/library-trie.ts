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

/** Overlay store: reads fall through to base; writes touch only the edit path. */
export type LibraryTrieEdit = {
  readonly base: LibraryTrieStore;
  readonly overlay: Map<string, LibraryNodeV2>;
  readonly parsedBase: Map<string, LibraryNodeV2>;
  get(hash: string): LibraryNodeV2 | undefined;
  set(hash: string, node: LibraryNodeV2): void;
  hasOverlay(hash: string): boolean;
  finalize(): LibraryTrieStore;
};

export function createLibraryTrieEdit(base: LibraryTrieStore): LibraryTrieEdit {
  const overlay = new Map<string, LibraryNodeV2>();
  const parsedBase = new Map<string, LibraryNodeV2>();
  return {
    base,
    overlay,
    parsedBase,
    get(hash: string) {
      return overlay.get(hash) ?? base.get(hash);
    },
    set(hash: string, node: LibraryNodeV2) {
      overlay.set(hash, node);
    },
    hasOverlay(hash: string) {
      return overlay.has(hash);
    },
    finalize() {
      if (overlay.size === 0) {
        return new Map(base);
      }
      const next = new Map(base);
      for (const [hash, node] of overlay) {
        next.set(hash, node);
      }
      return next;
    },
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

function loadNodeForEdit(store: LibraryTrieEdit, hash: string): LibraryNodeV2 {
  assertValidHash(hash);
  const node = store.get(hash);
  if (node === undefined) {
    throw new Error(`Missing library node for hash ${hash}`);
  }
  if (store.hasOverlay(hash)) {
    return node;
  }
  const cached = store.parsedBase.get(hash);
  if (cached !== undefined) {
    return cached;
  }
  const parsed = libraryNodeV2Schema.parse(node);
  store.parsedBase.set(hash, parsed);
  return parsed;
}

function commitNode(
  store: LibraryTrieEdit,
  node: LibraryNodeV2,
): { store: LibraryTrieEdit; hash: string } {
  const validated = libraryNodeV2Schema.parse(node);
  const hash = hashCanonicalJson(validated);
  store.set(hash, validated);
  return { store, hash };
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
  store: LibraryTrieEdit,
  node: LibraryNodeV2,
): { store: LibraryTrieEdit; hash: string } {
  const validated = libraryNodeV2Schema.parse(node);
  if (validated.value === null && validated.children.length === 0) {
    return { store, hash: emptyLibraryRootHash };
  }
  return commitNode(store, validated);
}

function setAt(
  store: LibraryTrieEdit,
  nodeHash: string,
  nibbles: string[],
  value: Record<string, unknown>,
): { store: LibraryTrieEdit; hash: string } {
  const node = loadNodeForEdit(store, nodeHash);
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
  store: LibraryTrieEdit,
  nodeHash: string,
  nibbles: string[],
): { store: LibraryTrieEdit; hash: string; deleted: boolean } {
  const node = loadNodeForEdit(store, nodeHash);
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

function assertTrieValue(value: Record<string, unknown>): void {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    throw new Error('Library trie value must be a plain JSON object');
  }
}

export function finalizeLibraryTrieEdit(edit: LibraryTrieEdit): LibraryTrieStore {
  return edit.finalize();
}

export function libraryTrieEditReadView(edit: LibraryTrieEdit): LibraryTrieStore {
  return {
    get(hash: string) {
      return edit.get(hash);
    },
  } as LibraryTrieStore;
}

export function setLibraryTrieValueInEdit(
  edit: LibraryTrieEdit,
  rootHash: string,
  key: string,
  value: Record<string, unknown>,
): string {
  assertValidKey(key);
  assertValidHash(rootHash);
  assertTrieValue(value);
  const result = setAt(edit, rootHash, keyToNibbles(key), value);
  return result.hash;
}

export function deleteLibraryTrieKeyInEdit(
  edit: LibraryTrieEdit,
  rootHash: string,
  key: string,
): string {
  assertValidKey(key);
  assertValidHash(rootHash);
  const result = deleteAt(edit, rootHash, keyToNibbles(key));
  if (!result.deleted) {
    throw new Error('Library trie key not found');
  }
  return result.hash;
}

export function setLibraryTrieValue(
  store: LibraryTrieStore,
  rootHash: string,
  key: string,
  value: Record<string, unknown>,
): { store: LibraryTrieStore; rootHash: string } {
  const editStore = createLibraryTrieEdit(store);
  const nextRootHash = setLibraryTrieValueInEdit(editStore, rootHash, key, value);
  return { store: editStore.finalize(), rootHash: nextRootHash };
}

export function deleteLibraryTrieKey(
  store: LibraryTrieStore,
  rootHash: string,
  key: string,
): { store: LibraryTrieStore; rootHash: string } {
  const editStore = createLibraryTrieEdit(store);
  const nextRootHash = deleteLibraryTrieKeyInEdit(editStore, rootHash, key);
  return { store: editStore.finalize(), rootHash: nextRootHash };
}