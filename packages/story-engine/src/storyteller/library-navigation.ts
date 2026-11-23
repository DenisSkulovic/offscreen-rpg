import {
  documentManifestEntrySchema,
  getLibraryTriePathValue,
  libraryRootV2Schema,
  pageLibraryPaths,
  type DocumentManifestEntry,
  type LibraryNodeV2,
  type LibraryRootV2,
} from '@offscreen/documents';

/**
 * Provider-neutral, read-only Library navigation for a captured campaign root.
 *
 * This is an adapter to the current manifest store, not a decision that the
 * future Library must use flat manifests. The caller, not the model, supplies
 * the authorization function and captured root.
 *
 * A v2 root stores only trie hashes. Story identity stays on the trusted host
 * input; this module does not invent campaignId or revision on that root.
 */
type Visibility = 'player-known' | 'storyteller-private' | 'developer-private';

type LibraryEntry = Readonly<{
  documentId: string;
  revision: number;
  path: string;
  objectHash: string;
  kind: string;
  authority: string;
  visibility: Visibility;
}>;

type SourceEnvelope = Readonly<{
  documentId: string;
  revision: number;
  kind: string;
  authority: string;
  visibility: Visibility;
}>;

type LibraryReader = Readonly<{
  readManifest(rootHash: string): Promise<{
    campaignId: string;
    revision: number;
    entries: readonly LibraryEntry[];
  }>;
  readDocument(objectHash: string): Promise<{
    envelope: SourceEnvelope;
    body: string;
  }>;
  readSourcePassage(objectHash: string): Promise<{
    envelope: SourceEnvelope;
    content: { paragraphs: readonly string[] };
  }>;
  readLibraryRoot?: (rootHash: string) => Promise<LibraryRootV2>;
  readLibraryNode?: (hash: string) => Promise<LibraryNodeV2>;
}>;

export type LibraryBrowseCursor = Readonly<{
  rootHash: string;
  prefix: string;
  after?: string;
}>;

function manifestEntryToLibraryEntry(
  entry: DocumentManifestEntry,
): LibraryEntry {
  return {
    documentId: entry.documentId,
    revision: entry.revision,
    path: entry.path,
    objectHash: entry.objectHash,
    kind: entry.kind,
    authority: entry.authority,
    visibility: entry.visibility,
  };
}

function visibleEntry(entry: LibraryEntry, access: LibraryAccess): boolean {
  return (
    entry.visibility === 'player-known' ||
    (entry.visibility === 'storyteller-private' && access.privateDocuments)
  );
}

export type LibraryAccess = Readonly<{ privateDocuments: boolean }>;

export class LibraryNavigationError extends Error {
  constructor(
    readonly code:
      | 'not-authorized'
      | 'stale-root'
      | 'invalid-path'
      | 'invalid-page'
      | 'not-found'
      | 'corrupt-source',
  ) {
    super(code);
    this.name = 'LibraryNavigationError';
  }
}

const maxPageEntries = 128;
const maxRawEntries = 512;
const maxReadCharacters = 16_384;

function normalizedPath(path: string, directory: boolean): boolean {
  if (!path || path.startsWith('/') || path.includes('\\')) {
    return false;
  }
  const segments = path.split('/');
  if (directory && segments.at(-1) === '') {
    segments.pop();
  }
  return segments.every((part) => part !== '' && part !== '.' && part !== '..');
}

function validPageSize(value: number, max: number) {
  if (!Number.isInteger(value) || value < 1 || value > max) {
    throw new LibraryNavigationError('invalid-page');
  }
  return value;
}

/**
 * A continuation may land on a non-visible raw path. Callers round-trip that
 * bound, so the wire value stays a string but does not contain the path text.
 * A plain path is still accepted so older cursors keep working.
 */
function encodeHiddenContinuation(path: string): string {
  return Buffer.from(
    JSON.stringify({ libraryContinuation: 1, path }),
    'utf8',
  ).toString('base64url');
}

function decodeContinuation(after: string): string | null {
  if (after.includes('/')) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(after, 'base64url').toString('utf8'),
    );
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'libraryContinuation' in parsed &&
      parsed.libraryContinuation === 1 &&
      'path' in parsed &&
      typeof parsed.path === 'string'
    ) {
      return parsed.path;
    }
  } catch {
    return null;
  }
  return null;
}

function exclusivePath(
  after: string | undefined,
  prefix: string,
): string | undefined {
  if (after === undefined) {
    return undefined;
  }
  const path = decodeContinuation(after) ?? after;
  if (!normalizedPath(path, false) || !path.startsWith(prefix)) {
    throw new LibraryNavigationError('invalid-path');
  }
  return path;
}

function publishedAfter(
  path: string,
  visible: boolean,
  more: boolean,
): string | null {
  if (!more) {
    return null;
  }
  return visible ? path : encodeHiddenContinuation(path);
}

function publicEntry(entry: LibraryEntry) {
  return {
    documentId: entry.documentId,
    revision: entry.revision,
    path: entry.path,
    objectHash: entry.objectHash,
    kind: entry.kind,
    authority: entry.authority,
    visibility: entry.visibility,
  };
}

/**
 * Each operation rechecks caller-supplied authorization before any storage read.
 * Authentication and provider/operation budgets must be enforced by the host.
 */
export function createPinnedLibraryNavigation(input: {
  reader: LibraryReader;
  storyId: string;
  rootHash: string;
  rootRevision: number;
  authorize: () => Promise<LibraryAccess | null>;
}) {
  async function requireAccess(): Promise<LibraryAccess> {
    const access = await input.authorize();
    if (!access) {
      throw new LibraryNavigationError('not-authorized');
    }
    return access;
  }

  /**
   * v2 readers must not fall through to a v1 manifest when the root or a node
   * is missing or malformed. Absence of the v2 reader methods is the only
   * signal that this capture is a v1 manifest.
   */
  async function requireSourceRoot(): Promise<
    { kind: 'v2'; root: LibraryRootV2 } | { kind: 'v1' }
  > {
    if (
      input.reader.readLibraryRoot === undefined ||
      input.reader.readLibraryNode === undefined
    ) {
      return { kind: 'v1' };
    }
    let raw: unknown;
    try {
      raw = await input.reader.readLibraryRoot(input.rootHash);
    } catch {
      throw new LibraryNavigationError('corrupt-source');
    }
    const parsed = libraryRootV2Schema.safeParse(raw);
    if (!parsed.success) {
      throw new LibraryNavigationError('corrupt-source');
    }
    return { kind: 'v2', root: parsed.data };
  }

  async function readV1Manifest() {
    const manifest = await input.reader.readManifest(input.rootHash);
    if (
      manifest.campaignId !== input.storyId ||
      manifest.revision !== input.rootRevision
    ) {
      throw new LibraryNavigationError('stale-root');
    }
    const paths = new Set<string>();
    for (const entry of manifest.entries) {
      if (paths.has(entry.path)) {
        throw new LibraryNavigationError('corrupt-source');
      }
      paths.add(entry.path);
    }
    return manifest;
  }

  function readNode(hash: string): Promise<LibraryNodeV2> {
    const read = input.reader.readLibraryNode;
    if (read === undefined) {
      return Promise.reject(new LibraryNavigationError('corrupt-source'));
    }
    return read(hash).catch((error: unknown) => {
      if (error instanceof LibraryNavigationError) {
        throw error;
      }
      throw new LibraryNavigationError('corrupt-source');
    });
  }

  async function scanVisibleV2(options: {
    root: LibraryRootV2;
    access: LibraryAccess;
    prefix: string;
    after?: string;
    pageSize: number;
    query?: string;
  }): Promise<{ entries: LibraryEntry[]; nextAfter: string | null }> {
    let after = options.after;
    let inspected = 0;
    const entries: LibraryEntry[] = [];
    while (entries.length < options.pageSize && inspected < maxRawEntries) {
      const batch = Math.min(maxPageEntries, maxRawEntries - inspected);
      let page: Awaited<ReturnType<typeof pageLibraryPaths>>;
      try {
        page = await pageLibraryPaths(readNode, options.root.pathsRootHash, {
          prefix: options.prefix,
          ...(after === undefined ? {} : { after }),
          pageSize: batch,
        });
      } catch (error) {
        if (error instanceof LibraryNavigationError) {
          throw error;
        }
        throw new LibraryNavigationError('corrupt-source');
      }
      if (page.entries.length === 0) {
        return { entries, nextAfter: null };
      }
      for (let index = 0; index < page.entries.length; index += 1) {
        const raw = page.entries[index];
        inspected += 1;
        let entry: LibraryEntry;
        try {
          entry = manifestEntryToLibraryEntry(
            documentManifestEntrySchema.parse(raw),
          );
        } catch {
          throw new LibraryNavigationError('corrupt-source');
        }
        const visible = visibleEntry(entry, options.access);
        const matched =
          visible &&
          (options.query === undefined || entry.path.includes(options.query));
        if (matched) {
          entries.push(entry);
        }
        const pageFull = entries.length >= options.pageSize;
        const budgetSpent = inspected >= maxRawEntries;
        if (pageFull || budgetSpent) {
          const moreInBatch = index < page.entries.length - 1;
          const more = moreInBatch || page.nextAfter !== null;
          return {
            entries: entries.slice(0, options.pageSize),
            nextAfter: publishedAfter(entry.path, visible, more),
          };
        }
      }
      if (page.nextAfter === null) {
        return { entries, nextAfter: null };
      }
      after = page.nextAfter;
    }
    return { entries, nextAfter: null };
  }

  function scanVisibleV1(
    manifestEntries: readonly LibraryEntry[],
    options: {
      access: LibraryAccess;
      prefix: string;
      after?: string;
      pageSize: number;
      query?: string;
    },
  ): { entries: LibraryEntry[]; nextAfter: string | null } {
    const ordered = manifestEntries
      .filter(
        (entry) =>
          entry.path.startsWith(options.prefix) &&
          (options.after === undefined || entry.path > options.after),
      )
      .sort((left, right) => left.path.localeCompare(right.path));
    const entries: LibraryEntry[] = [];
    for (
      let index = 0;
      index < ordered.length && index < maxRawEntries;
      index += 1
    ) {
      const entry = ordered[index];
      if (entry === undefined) {
        break;
      }
      const visible = visibleEntry(entry, options.access);
      const matched =
        visible &&
        (options.query === undefined || entry.path.includes(options.query));
      if (matched) {
        entries.push(entry);
      }
      const pageFull = entries.length >= options.pageSize;
      const budgetSpent = index + 1 >= maxRawEntries;
      if (pageFull || budgetSpent) {
        const more = index < ordered.length - 1;
        return {
          entries: entries.slice(0, options.pageSize),
          nextAfter: publishedAfter(entry.path, visible, more),
        };
      }
    }
    return { entries, nextAfter: null };
  }

  async function entryForObjectHash(
    objectHash: string,
    access: LibraryAccess,
  ): Promise<LibraryEntry | null> {
    const source = await requireSourceRoot();
    if (source.kind === 'v2') {
      let after: string | undefined;
      do {
        let page: Awaited<ReturnType<typeof pageLibraryPaths>>;
        try {
          page = await pageLibraryPaths(readNode, source.root.pathsRootHash, {
            pageSize: maxPageEntries,
            ...(after === undefined ? {} : { after }),
          });
        } catch (error) {
          if (error instanceof LibraryNavigationError) {
            throw error;
          }
          throw new LibraryNavigationError('corrupt-source');
        }
        for (const raw of page.entries) {
          let entry: LibraryEntry;
          try {
            entry = manifestEntryToLibraryEntry(
              documentManifestEntrySchema.parse(raw),
            );
          } catch {
            throw new LibraryNavigationError('corrupt-source');
          }
          if (entry.objectHash === objectHash) {
            return visibleEntry(entry, access) ? entry : null;
          }
        }
        after = page.nextAfter ?? undefined;
      } while (after !== undefined);
      return null;
    }
    const manifest = await readV1Manifest();
    for (const raw of manifest.entries) {
      if (raw.objectHash !== objectHash) {
        continue;
      }
      return visibleEntry(raw, access) ? raw : null;
    }
    return null;
  }

  async function entryForPath(
    path: string,
    access: LibraryAccess,
  ): Promise<LibraryEntry | null> {
    const source = await requireSourceRoot();
    if (source.kind === 'v2') {
      let value: unknown;
      try {
        value = await getLibraryTriePathValue(
          readNode,
          source.root.pathsRootHash,
          path,
        );
      } catch (error) {
        if (error instanceof LibraryNavigationError) {
          throw error;
        }
        throw new LibraryNavigationError('corrupt-source');
      }
      if (value === null) {
        return null;
      }
      let entry: LibraryEntry;
      try {
        entry = manifestEntryToLibraryEntry(
          documentManifestEntrySchema.parse(value),
        );
      } catch {
        throw new LibraryNavigationError('corrupt-source');
      }
      return visibleEntry(entry, access) ? entry : null;
    }
    const manifest = await readV1Manifest();
    const entry = manifest.entries.find((item) => item.path === path);
    if (entry === undefined || !visibleEntry(entry, access)) {
      return null;
    }
    return entry;
  }

  async function readMatchedEntry(
    entry: LibraryEntry,
    offset: number,
    characters: number,
  ) {
    const source =
      entry.kind === 'source-passage'
        ? await input.reader.readSourcePassage(entry.objectHash)
        : await input.reader.readDocument(entry.objectHash);
    const envelope = source.envelope;
    if (
      envelope.documentId !== entry.documentId ||
      envelope.revision !== entry.revision ||
      envelope.kind !== entry.kind ||
      envelope.authority !== entry.authority ||
      envelope.visibility !== entry.visibility
    ) {
      throw new LibraryNavigationError('corrupt-source');
    }
    const text =
      'body' in source ? source.body : source.content.paragraphs.join('\n\n');
    const codepoints = Array.from(text);
    return {
      rootHash: input.rootHash,
      rootRevision: input.rootRevision,
      path: entry.path,
      documentId: entry.documentId,
      revision: entry.revision,
      objectHash: entry.objectHash,
      kind: entry.kind,
      authority: entry.authority,
      visibility: entry.visibility,
      content: codepoints.slice(offset, offset + characters).join(''),
      nextOffset:
        offset + characters < codepoints.length ? offset + characters : null,
      totalCharacters: codepoints.length,
    };
  }

  return {
    async browse(
      options: {
        prefix?: string;
        after?: string;
        pageSize?: number;
        cursor?: LibraryBrowseCursor;
      } = {},
    ) {
      const prefix = options.cursor?.prefix ?? options.prefix ?? '';
      const rawAfter = options.cursor?.after ?? options.after;
      if (
        options.cursor !== undefined &&
        options.cursor.rootHash !== input.rootHash
      ) {
        throw new LibraryNavigationError('stale-root');
      }
      if (prefix && !normalizedPath(prefix, true)) {
        throw new LibraryNavigationError('invalid-path');
      }
      const after = exclusivePath(rawAfter, prefix);
      const pageSize = validPageSize(options.pageSize ?? 32, maxPageEntries);
      const access = await requireAccess();
      const source = await requireSourceRoot();
      const page =
        source.kind === 'v2'
          ? await scanVisibleV2({
              root: source.root,
              access,
              prefix,
              ...(after === undefined ? {} : { after }),
              pageSize,
            })
          : scanVisibleV1((await readV1Manifest()).entries, {
              access,
              prefix,
              ...(after === undefined ? {} : { after }),
              pageSize,
            });
      return {
        rootHash: input.rootHash,
        rootRevision: input.rootRevision,
        entries: page.entries.map(publicEntry),
        nextAfter: page.nextAfter,
      };
    },

    async open(options: {
      path: string;
      offset?: number;
      characters?: number;
    }) {
      if (!normalizedPath(options.path, false)) {
        throw new LibraryNavigationError('invalid-path');
      }
      const offset = options.offset ?? 0;
      if (!Number.isSafeInteger(offset) || offset < 0) {
        throw new LibraryNavigationError('invalid-page');
      }
      const characters = validPageSize(
        options.characters ?? 4096,
        maxReadCharacters,
      );
      const access = await requireAccess();
      const entry = await entryForPath(options.path, access);
      if (!entry || !entry.path.endsWith('.md')) {
        throw new LibraryNavigationError('not-found');
      }
      return readMatchedEntry(entry, offset, characters);
    },

    async find(options: {
      query: string;
      prefix?: string;
      after?: string;
      pageSize?: number;
    }) {
      const query = options.query.trim();
      if (!query || query.length > 256) {
        throw new LibraryNavigationError('invalid-path');
      }
      const prefix = options.prefix ?? '';
      if (prefix && !normalizedPath(prefix, true)) {
        throw new LibraryNavigationError('invalid-path');
      }
      const after = exclusivePath(options.after, prefix);
      const pageSize = validPageSize(options.pageSize ?? 32, maxPageEntries);
      const access = await requireAccess();
      const source = await requireSourceRoot();
      const page =
        source.kind === 'v2'
          ? await scanVisibleV2({
              root: source.root,
              access,
              prefix,
              ...(after === undefined ? {} : { after }),
              pageSize,
              query,
            })
          : scanVisibleV1((await readV1Manifest()).entries, {
              access,
              prefix,
              ...(after === undefined ? {} : { after }),
              pageSize,
              query,
            });
      return {
        rootHash: input.rootHash,
        rootRevision: input.rootRevision,
        query,
        hints: page.entries.map((entry) => ({
          path: entry.path,
          objectHash: entry.objectHash,
          kind: entry.kind,
          documentId: entry.documentId,
          revision: entry.revision,
        })),
        nextAfter: page.nextAfter,
      };
    },

    async readByObjectHash(options: {
      objectHash: string;
      offset?: number;
      characters?: number;
    }) {
      const offset = options.offset ?? 0;
      if (!Number.isSafeInteger(offset) || offset < 0) {
        throw new LibraryNavigationError('invalid-page');
      }
      const characters = validPageSize(
        options.characters ?? 4096,
        maxReadCharacters,
      );
      const access = await requireAccess();
      const entry = await entryForObjectHash(options.objectHash, access);
      if (!entry) {
        throw new LibraryNavigationError('not-found');
      }
      return readMatchedEntry(entry, offset, characters);
    },
  };
}
