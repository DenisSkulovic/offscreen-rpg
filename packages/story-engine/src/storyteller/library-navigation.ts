import {
  documentManifestEntrySchema,
  getLibraryTriePathValue,
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

function manifestEntryToLibraryEntry(entry: DocumentManifestEntry): LibraryEntry {
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

function visibleEntry(
  entry: LibraryEntry,
  access: LibraryAccess,
): boolean {
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
const maxReadCharacters = 16_384;

function normalizedPath(path: string, directory: boolean): boolean {
  if (!path || path.startsWith('/') || path.includes('\\')) return false;
  const segments = path.split('/');
  if (directory && segments.at(-1) === '') segments.pop();
  return segments.every((part) => part !== '' && part !== '.' && part !== '..');
}

function validPageSize(value: number, max: number) {
  if (!Number.isInteger(value) || value < 1 || value > max) {
    throw new LibraryNavigationError('invalid-page');
  }
  return value;
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
  async function tryV2Root(): Promise<LibraryRootV2 | null> {
    if (
      input.reader.readLibraryRoot === undefined ||
      input.reader.readLibraryNode === undefined
    ) {
      return null;
    }
    try {
      const root = await input.reader.readLibraryRoot(input.rootHash);
      if (root.format === 'offscreen.library-root.v2') return root;
    } catch {
      return null;
    }
    return null;
  }

  async function entriesForCurrentAccess(): Promise<readonly LibraryEntry[]> {
    const access = await input.authorize();
    if (!access) throw new LibraryNavigationError('not-authorized');
    const v2Root = await tryV2Root();
    if (v2Root) {
      const readNode = (hash: string) => input.reader.readLibraryNode!(hash);
      const page = await pageLibraryPaths(readNode, v2Root.pathsRootHash, {
        pageSize: maxPageEntries,
      });
      return page.entries
        .map(manifestEntryToLibraryEntry)
        .filter((entry) => visibleEntry(entry, access));
    }
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
    return manifest.entries.filter((entry) => visibleEntry(entry, access));
  }

  async function entryForObjectHash(
    objectHash: string,
    access: LibraryAccess,
  ): Promise<LibraryEntry | null> {
    const v2Root = await tryV2Root();
    if (v2Root) {
      const readNode = (hash: string) => input.reader.readLibraryNode!(hash);
      let after: string | undefined;
      do {
        const page = await pageLibraryPaths(readNode, v2Root.pathsRootHash, {
          pageSize: maxPageEntries,
          ...(after === undefined ? {} : { after }),
        });
        for (const raw of page.entries) {
          const entry = manifestEntryToLibraryEntry(
            documentManifestEntrySchema.parse(raw),
          );
          if (entry.objectHash === objectHash) {
            return visibleEntry(entry, access) ? entry : null;
          }
        }
        after = page.nextAfter ?? undefined;
      } while (after !== undefined);
      return null;
    }
    const manifest = await input.reader.readManifest(input.rootHash);
    if (
      manifest.campaignId !== input.storyId ||
      manifest.revision !== input.rootRevision
    ) {
      throw new LibraryNavigationError('stale-root');
    }
    for (const raw of manifest.entries) {
      if (raw.objectHash !== objectHash) continue;
      const entry = manifestEntryToLibraryEntry(
        documentManifestEntrySchema.parse(raw),
      );
      return visibleEntry(entry, access) ? entry : null;
    }
    return null;
  }

  async function entryForPath(
    path: string,
    access: LibraryAccess,
  ): Promise<LibraryEntry | null> {
    const v2Root = await tryV2Root();
    if (v2Root) {
      const readNode = (hash: string) => input.reader.readLibraryNode!(hash);
      const value = await getLibraryTriePathValue(
        readNode,
        v2Root.pathsRootHash,
        path,
      );
      if (value === null) return null;
      const entry = manifestEntryToLibraryEntry(
        documentManifestEntrySchema.parse(value),
      );
      return visibleEntry(entry, access) ? entry : null;
    }
    const entries = await entriesForCurrentAccess();
    return entries.find((item) => item.path === path) ?? null;
  }

  return {
    async browse(options: {
      prefix?: string;
      after?: string;
      pageSize?: number;
      cursor?: LibraryBrowseCursor;
    } = {}) {
      const prefix =
        options.cursor?.prefix ?? options.prefix ?? '';
      const after = options.cursor?.after ?? options.after;
      if (
        options.cursor !== undefined &&
        options.cursor.rootHash !== input.rootHash
      ) {
        throw new LibraryNavigationError('stale-root');
      }
      if (prefix && !normalizedPath(prefix, true)) {
        throw new LibraryNavigationError('invalid-path');
      }
      if (
        after !== undefined &&
        (!normalizedPath(after, false) || !after.startsWith(prefix))
      ) {
        throw new LibraryNavigationError('invalid-path');
      }
      const pageSize = validPageSize(options.pageSize ?? 32, maxPageEntries);
      const access = await input.authorize();
      if (!access) throw new LibraryNavigationError('not-authorized');
      const v2Root = await tryV2Root();
      if (v2Root) {
        const readNode = (hash: string) => input.reader.readLibraryNode!(hash);
        const page = await pageLibraryPaths(readNode, v2Root.pathsRootHash, {
          prefix,
          ...(after === undefined ? {} : { after }),
          pageSize,
        });
        const entries = page.entries
          .map(manifestEntryToLibraryEntry)
          .filter((entry) => visibleEntry(entry, access));
        return {
          rootHash: input.rootHash,
          rootRevision: input.rootRevision,
          entries: entries.map(
            ({ documentId, revision, path, objectHash, kind, authority, visibility }) => ({
              documentId,
              revision,
              path,
              objectHash,
              kind,
              authority,
              visibility,
            }),
          ),
          nextAfter: page.nextAfter,
        };
      }
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
      const entries = manifest.entries
        .filter((entry) => visibleEntry(entry, access))
        .filter(
          (entry) =>
            entry.path.startsWith(prefix) &&
            (after === undefined || entry.path > after),
        )
        .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
      const selected = entries.slice(0, pageSize);
      const last = selected.at(-1);
      return {
        rootHash: input.rootHash,
        rootRevision: input.rootRevision,
        entries: selected.map(
          ({ documentId, revision, path, objectHash, kind, authority, visibility }) => ({
            documentId,
            revision,
            path,
            objectHash,
            kind,
            authority,
            visibility,
          }),
        ),
        nextAfter: entries.length > pageSize ? last?.path ?? null : null,
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
      const access = await input.authorize();
      if (!access) throw new LibraryNavigationError('not-authorized');
      const entry = await entryForPath(options.path, access);
      if (!entry) throw new LibraryNavigationError('not-found');
      if (!entry.path.endsWith('.md')) {
        throw new LibraryNavigationError('not-found');
      }
      const source =
        entry.kind === 'source-passage'
          ? await input.reader.readSourcePassage(entry.objectHash)
          : await input.reader.readDocument(entry.objectHash);
      const envelope = source.envelope;
      if (envelope.documentId !== entry.documentId) {
        throw new LibraryNavigationError('corrupt-source');
      }
      if (
        envelope.revision !== entry.revision ||
        envelope.kind !== entry.kind ||
        envelope.authority !== entry.authority ||
        envelope.visibility !== entry.visibility
      ) {
        throw new LibraryNavigationError('corrupt-source');
      }
      const text = 'body' in source
        ? source.body
        : source.content.paragraphs.join('\n\n');
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
      const after = options.after;
      if (
        after !== undefined &&
        (!normalizedPath(after, false) || !after.startsWith(prefix))
      ) {
        throw new LibraryNavigationError('invalid-path');
      }
      const pageSize = validPageSize(options.pageSize ?? 32, maxPageEntries);
      const access = await input.authorize();
      if (!access) throw new LibraryNavigationError('not-authorized');
      const hints: Array<{
        path: string;
        objectHash: string;
        kind: string;
        documentId: string;
        revision: number;
      }> = [];
      let browseAfter = after;
      let nextAfter: string | null = null;
      while (hints.length < pageSize) {
        const page = await this.browse({
          prefix,
          ...(browseAfter === undefined ? {} : { after: browseAfter }),
          pageSize: maxPageEntries,
        });
        for (const entry of page.entries) {
          if (!entry.path.includes(query)) continue;
          if (hints.length === 0 && after !== undefined && entry.path <= after) {
            continue;
          }
          hints.push({
            path: entry.path,
            objectHash: entry.objectHash,
            kind: entry.kind,
            documentId: entry.documentId,
            revision: entry.revision,
          });
          if (hints.length >= pageSize) {
            nextAfter = entry.path;
            break;
          }
        }
        if (hints.length >= pageSize) break;
        if (page.nextAfter === null) {
          nextAfter = null;
          break;
        }
        browseAfter = page.nextAfter;
      }
      return {
        rootHash: input.rootHash,
        rootRevision: input.rootRevision,
        query,
        hints: hints.slice(0, pageSize),
        nextAfter: hints.length >= pageSize ? nextAfter : null,
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
      const access = await input.authorize();
      if (!access) throw new LibraryNavigationError('not-authorized');
      const entry = await entryForObjectHash(options.objectHash, access);
      if (!entry) throw new LibraryNavigationError('not-found');
      const source =
        entry.kind === 'source-passage'
          ? await input.reader.readSourcePassage(entry.objectHash)
          : await input.reader.readDocument(entry.objectHash);
      const envelope = source.envelope;
      if (envelope.documentId !== entry.documentId) {
        throw new LibraryNavigationError('corrupt-source');
      }
      if (
        envelope.revision !== entry.revision ||
        envelope.kind !== entry.kind ||
        envelope.authority !== entry.authority ||
        envelope.visibility !== entry.visibility
      ) {
        throw new LibraryNavigationError('corrupt-source');
      }
      const text =
        'body' in source
          ? source.body
          : source.content.paragraphs.join('\n\n');
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
    },
  };
}
