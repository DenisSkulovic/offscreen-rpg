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
}>;

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
  async function entriesForCurrentAccess(): Promise<readonly LibraryEntry[]> {
    const access = await input.authorize();
    if (!access) throw new LibraryNavigationError('not-authorized');
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
    return manifest.entries.filter(
      (entry) =>
        entry.visibility === 'player-known' ||
        (entry.visibility === 'storyteller-private' && access.privateDocuments),
    );
  }

  return {
    async browse(options: {
      prefix?: string;
      after?: string;
      pageSize?: number;
    } = {}) {
      const prefix = options.prefix ?? '';
      const after = options.after;
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
      const entries = (await entriesForCurrentAccess())
        .filter((entry) => entry.path.startsWith(prefix) && (after === undefined || entry.path > after))
        .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
      const selected = entries.slice(0, pageSize);
      const last = selected.at(-1);
      return {
        rootHash: input.rootHash,
        rootRevision: input.rootRevision,
        entries: selected.map(({ documentId, revision, path, objectHash, kind, authority, visibility }) => ({
          documentId, revision, path, objectHash, kind, authority, visibility,
        })),
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
      const characters = validPageSize(options.characters ?? 4096, maxReadCharacters);
      const entries = await entriesForCurrentAccess();
      const entry = entries.find((item) => item.path === options.path);
      if (!entry) throw new LibraryNavigationError('not-found');
      if (!entry.path.endsWith('.md')) {
        throw new LibraryNavigationError('not-found');
      }
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
        nextOffset: offset + characters < codepoints.length ? offset + characters : null,
        totalCharacters: codepoints.length,
      };
    },
  };
}
