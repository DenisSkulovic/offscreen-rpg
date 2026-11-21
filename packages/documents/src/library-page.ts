import {
  contentHashSchema,
  documentManifestEntrySchema,
  libraryNodeV2Schema,
  type DocumentManifestEntry,
  type LibraryNodeV2,
} from './schema.js';

const maxPageSize = 128;

function keyToNibbles(key: string): string[] {
  const bytes = Buffer.from(key, 'utf8');
  const nibbles: string[] = [];
  for (const byte of bytes) {
    nibbles.push((byte >> 4).toString(16));
    nibbles.push((byte & 0x0f).toString(16));
  }
  return nibbles;
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

async function loadNode(
  readNode: (hash: string) => Promise<LibraryNodeV2>,
  hash: string,
): Promise<LibraryNodeV2> {
  contentHashSchema.parse(hash);
  const node = await readNode(hash);
  return libraryNodeV2Schema.parse(node);
}

async function descendPrefix(
  readNode: (hash: string) => Promise<LibraryNodeV2>,
  rootHash: string,
  prefix: string,
): Promise<{ nodeHash: string; prefixNibbles: string[] } | null> {
  if (prefix.length === 0) {
    return { nodeHash: rootHash, prefixNibbles: [] };
  }
  const nibbles = keyToNibbles(prefix);
  let hash = rootHash;
  for (const nibble of nibbles) {
    const node = await loadNode(readNode, hash);
    const child = node.children.find((entry) => entry.nibble === nibble);
    if (child === undefined) {
      return null;
    }
    hash = child.hash;
  }
  return { nodeHash: hash, prefixNibbles: nibbles };
}

type CollectState = {
  prefix: string;
  after: string | undefined;
  pageSize: number;
  entries: DocumentManifestEntry[];
  hasMore: boolean;
};

async function collectLeaves(
  readNode: (hash: string) => Promise<LibraryNodeV2>,
  nodeHash: string,
  prefixNibbles: string[],
  state: CollectState,
): Promise<void> {
  if (state.hasMore) return;
  const node = await loadNode(readNode, nodeHash);
  if (node.value !== null) {
    const path = nibblesToKey(prefixNibbles);
    if (
      path.startsWith(state.prefix) &&
      (state.after === undefined || path > state.after)
    ) {
      const entry = documentManifestEntrySchema.parse(node.value);
      if (entry.path !== path) {
        throw new Error('Path trie key does not match manifest path');
      }
      state.entries.push(entry);
      if (state.entries.length > state.pageSize) {
        state.hasMore = true;
        state.entries.pop();
        return;
      }
    }
  }
  const children = [...node.children].sort((a, b) =>
    a.nibble < b.nibble ? -1 : a.nibble > b.nibble ? 1 : 0,
  );
  for (const child of children) {
    await collectLeaves(
      readNode,
      child.hash,
      [...prefixNibbles, child.nibble],
      state,
    );
    if (state.hasMore) return;
  }
}

export async function getLibraryTriePathValue(
  readNode: (hash: string) => Promise<LibraryNodeV2>,
  rootHash: string,
  key: string,
): Promise<Record<string, unknown> | null> {
  if (key.length === 0) {
    throw new Error('Library trie key must not be empty');
  }
  if (key.normalize('NFC') !== key) {
    throw new Error('Library trie key must be NFC-normalized');
  }
  contentHashSchema.parse(rootHash);
  let hash = rootHash;
  for (const nibble of keyToNibbles(key)) {
    const node = await loadNode(readNode, hash);
    const child = node.children.find((entry) => entry.nibble === nibble);
    if (child === undefined) {
      return null;
    }
    hash = child.hash;
  }
  const terminal = await loadNode(readNode, hash);
  if (terminal.value === null) {
    return null;
  }
  return terminal.value;
}

export async function pageLibraryPaths(
  readNode: (hash: string) => Promise<LibraryNodeV2>,
  pathsRootHash: string,
  options: {
    prefix?: string;
    after?: string;
    pageSize?: number;
  } = {},
): Promise<{ entries: DocumentManifestEntry[]; nextAfter: string | null }> {
  const prefix = options.prefix ?? '';
  const after = options.after;
  const pageSize = Math.min(
    Math.max(1, options.pageSize ?? 32),
    maxPageSize,
  );
  if (!Number.isInteger(pageSize)) {
    throw new Error('pageSize must be a positive integer');
  }

  const start = await descendPrefix(readNode, pathsRootHash, prefix);
  if (start === null) {
    return { entries: [], nextAfter: null };
  }

  const state: CollectState = {
    prefix,
    after,
    pageSize,
    entries: [],
    hasMore: false,
  };
  await collectLeaves(
    readNode,
    start.nodeHash,
    start.prefixNibbles,
    state,
  );

  const last = state.entries.at(-1);
  return {
    entries: state.entries,
    nextAfter: state.hasMore ? last?.path ?? null : null,
  };
}