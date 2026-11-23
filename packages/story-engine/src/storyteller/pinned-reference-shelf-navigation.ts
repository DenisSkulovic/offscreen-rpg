import {
  canonicalDocumentSchema,
  hashCanonicalJson,
  logicalDocumentPathSchema,
  rulePackageManifestSchema,
  rulePackageReferenceSchema,
  worldPackageManifestSchema,
  worldPackageReferenceSchema,
  type CanonicalDocument,
  type RulePackageManifest,
  type RulePackageReference,
  type WorldPackageManifest,
  type WorldPackageReference,
} from '@offscreen/documents';
import { z } from 'zod';

/**
 * Read-only navigation over host-pinned world packages and one rules package.
 *
 * The host supplies the pins and an authorize callback. A pin names a source.
 * It does not grant access. This helper is not a route and not a model tool.
 */

const rulesMount = 'rules';
const maxWorldMounts = 8;
const maxPageEntries = 128;
const maxEntriesScannedPerCall = 512;
const maxReadCodepoints = 16_384;
const maxOutputBytes = 64 * 1024;
const cursorVersion = 1;

const mountNameSchema = z.string().regex(/^[a-z][a-z0-9-]{0,79}$/);
const accessSchema = z.strictObject({
  privateDocuments: z.boolean(),
  accessVersion: z.string().min(1).max(200),
});

export type PinnedShelfAccess = z.infer<typeof accessSchema>;

export type PinnedShelfOperation = 'browse' | 'find-path' | 'read';

export type PinnedShelfAuthorizeQuery = Readonly<{
  mount: string;
  kind: 'world' | 'rules';
  operation: PinnedShelfOperation;
}>;

type ManifestEntry = WorldPackageManifest['entries'][number];

type ShelfReader = Readonly<{
  readWorldPackageManifest(hash: string): Promise<unknown>;
  readRulePackageManifest(hash: string): Promise<unknown>;
  readDocument(hash: string): Promise<unknown>;
}>;

type ResolvedMount = Readonly<{
  mount: string;
  kind: 'world' | 'rules';
  rootHash: string;
  matches(manifest: WorldPackageManifest | RulePackageManifest): boolean;
}>;

const browseArgsSchema = z.strictObject({
  mount: mountNameSchema,
  prefix: z.string().max(320).optional(),
  cursor: z.string().min(1).max(2048).optional(),
  pageSize: z.number().int().min(1).max(maxPageEntries).optional(),
});

const findArgsSchema = z.strictObject({
  mount: mountNameSchema,
  query: z.string().min(1).max(320),
  cursor: z.string().min(1).max(2048).optional(),
  pageSize: z.number().int().min(1).max(maxPageEntries).optional(),
});

const readArgsSchema = z.strictObject({
  mount: mountNameSchema,
  path: logicalDocumentPathSchema,
  offset: z.number().int().nonnegative().optional(),
  characters: z.number().int().min(1).max(maxReadCodepoints).optional(),
});

const cursorSchema = z.strictObject({
  version: z.literal(cursorVersion),
  mount: mountNameSchema,
  rootHash: z.string().regex(/^[0-9a-f]{64}$/),
  operation: z.enum(['browse', 'find-path']),
  selector: z.string().max(320),
  afterPath: z.string().min(1).max(320),
  accessVersion: z.string().min(1).max(200),
});

export class PinnedShelfNavigationError extends Error {
  constructor(
    readonly code:
      | 'not-authorized'
      | 'invalid-mount'
      | 'invalid-input'
      | 'invalid-cursor'
      | 'stale-source'
      | 'corrupt-source'
      | 'not-found'
      | 'output-limit',
  ) {
    super(code);
    this.name = 'PinnedShelfNavigationError';
  }
}

export type PinnedShelfCitation = Readonly<{
  mount: string;
  kind: 'world' | 'rules';
  worldId: string | null;
  ruleSetId: string | null;
  rootHash: string;
  path: string;
  documentId: string;
  objectHash: string;
  revision: number;
}>;

function fail(code: PinnedShelfNavigationError['code']): never {
  throw new PinnedShelfNavigationError(code);
}

function normalizedSelector(value: string): string {
  if (value.includes('\\') || value.includes('\0')) {fail('invalid-input');}
  const segments = value.split('/').filter((part) => part !== '');
  if (segments.some((part) => part === '.' || part === '..'))
    {fail('invalid-input');}
  return value;
}

function visible(entry: ManifestEntry, access: PinnedShelfAccess): boolean {
  if (entry.visibility === 'developer-private') {return false;}
  if (entry.visibility === 'storyteller-private')
    {return access.privateDocuments;}
  return entry.visibility === 'player-known';
}

function encodeCursor(value: z.infer<typeof cursorSchema>): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function decodeCursor(token: string): z.infer<typeof cursorSchema> {
  try {
    const parsed = cursorSchema.parse(
      JSON.parse(Buffer.from(token, 'base64url').toString('utf8')),
    );
    return parsed;
  } catch {
    fail('invalid-cursor');
  }
}

function assertOutputBound(value: unknown) {
  if (Buffer.byteLength(JSON.stringify(value)) > maxOutputBytes)
    {fail('output-limit');}
}

function sliceText(body: string, offset: number, characters: number) {
  const units = Array.from(body);
  const slice = units.slice(offset, offset + characters);
  let used = 0;
  const kept: string[] = [];
  for (const unit of slice) {
    const next = Buffer.byteLength(unit);
    if (used + next > maxOutputBytes) {break;}
    kept.push(unit);
    used += next;
  }
  return {
    text: kept.join(''),
    truncated: offset + kept.length < units.length,
  };
}

function sameEngine(
  left: RulePackageReference['engine'],
  right: RulePackageManifest['engine'],
): boolean {
  return (
    left.adapterId === right.adapterId &&
    left.adapterVersion === right.adapterVersion
  );
}

export function createPinnedReferenceShelfNavigation(input: {
  reader: ShelfReader;
  worlds: readonly WorldPackageReference[];
  rules?: RulePackageReference | null;
  authorize: (
    query: PinnedShelfAuthorizeQuery,
  ) => Promise<PinnedShelfAccess | null>;
}) {
  if (typeof input.authorize !== 'function') {fail('invalid-input');}
  if (!Array.isArray(input.worlds) || input.worlds.length > maxWorldMounts)
    {fail('invalid-input');}
  const worlds = input.worlds.map((world) =>
    worldPackageReferenceSchema.parse(world),
  );
  const rules =
    input.rules == null ? null : rulePackageReferenceSchema.parse(input.rules);
  const mounts = new Map<string, ResolvedMount>();
  for (const world of worlds) {
    if (world.mount === rulesMount || mounts.has(world.mount))
      {fail('invalid-mount');}
    mounts.set(world.mount, {
      mount: world.mount,
      kind: 'world',
      rootHash: world.rootHash,
      matches(manifest) {
        return (
          manifest.format === 'offscreen.world-package-manifest.v1' &&
          manifest.worldId === world.worldId &&
          manifest.revision === world.revision
        );
      },
    });
  }
  if (rules) {
    mounts.set(rulesMount, {
      mount: rulesMount,
      kind: 'rules',
      rootHash: rules.rootHash,
      matches(manifest) {
        return (
          manifest.format === 'offscreen.rule-package-manifest.v1' &&
          manifest.ruleSetId === rules.ruleSetId &&
          manifest.revision === rules.revision &&
          sameEngine(rules.engine, manifest.engine)
        );
      },
    });
  }

  function resolveMount(mount: string): ResolvedMount {
    return mounts.get(mount) ?? fail('invalid-mount');
  }

  async function authorizeMount(
    mount: ResolvedMount,
    operation: PinnedShelfOperation,
  ) {
    const access = accessSchema
      .nullable()
      .parse(
        await input.authorize({
          mount: mount.mount,
          kind: mount.kind,
          operation,
        }),
      );
    if (!access) {fail('not-authorized');}
    return access;
  }

  async function loadManifest(mount: ResolvedMount) {
    const raw =
      mount.kind === 'world'
        ? await input.reader.readWorldPackageManifest(mount.rootHash)
        : await input.reader.readRulePackageManifest(mount.rootHash);
    const parsed =
      mount.kind === 'world'
        ? worldPackageManifestSchema.safeParse(raw)
        : rulePackageManifestSchema.safeParse(raw);
    if (!parsed.success) {fail('corrupt-source');}
    if (!mount.matches(parsed.data)) {fail('stale-source');}
    const paths = new Set<string>();
    for (const entry of parsed.data.entries) {
      if (paths.has(entry.path)) {fail('corrupt-source');}
      paths.add(entry.path);
    }
    return parsed.data;
  }

  async function page(args: {
    mount: string;
    operation: 'browse' | 'find-path';
    selector: string;
    cursor?: string;
    pageSize?: number;
    matches(path: string): boolean;
  }) {
    const mount = resolveMount(args.mount);
    const access = await authorizeMount(mount, args.operation);
    const pageSize = args.pageSize ?? maxPageEntries;
    let afterPath: string | null = null;
    if (args.cursor) {
      const cursor = decodeCursor(args.cursor);
      if (
        cursor.mount !== mount.mount ||
        cursor.rootHash !== mount.rootHash ||
        cursor.operation !== args.operation ||
        cursor.selector !== args.selector ||
        cursor.accessVersion !== access.accessVersion
      ) {
        fail('invalid-cursor');
      }
      afterPath = cursor.afterPath;
    }
    const manifest = await loadManifest(mount);
    const ordered = [...manifest.entries].sort((left, right) => {
      if (left.path < right.path) {
        return -1;
      }
      if (left.path > right.path) {
        return 1;
      }
      return 0;
    });
    const start =
      afterPath === null
        ? 0
        : ordered.findIndex((entry) => entry.path > afterPath);
    const begin = start < 0 ? ordered.length : start;
    const entries: ManifestEntry[] = [];
    let scanned = 0;
    let lastScanned: string | null = afterPath;
    for (const entry of ordered.slice(begin)) {
      if (entries.length >= pageSize || scanned >= maxEntriesScannedPerCall)
        {break;}
      scanned += 1;
      lastScanned = entry.path;
      if (args.matches(entry.path) && visible(entry, access))
        {entries.push(entry);}
    }
    const reachedEnd = begin + scanned >= ordered.length;
    const nextCursor =
      reachedEnd || lastScanned === null
        ? null
        : encodeCursor({
            version: cursorVersion,
            mount: mount.mount,
            rootHash: mount.rootHash,
            operation: args.operation,
            selector: args.selector,
            afterPath: lastScanned,
            accessVersion: access.accessVersion,
          });
    const result = {
      mount: mount.mount,
      entries: entries.map((entry) => ({
        path: entry.path,
        documentId: entry.documentId,
        objectHash: entry.objectHash,
        revision: entry.revision,
        kind: entry.kind,
        authority: entry.authority,
        visibility: entry.visibility,
      })),
      nextCursor,
    };
    assertOutputBound(result);
    return result;
  }

  return {
    async browse(args: unknown) {
      const parsed = browseArgsSchema.parse(args);
      const prefix = normalizedSelector(parsed.prefix ?? '');
      return page({
        mount: parsed.mount,
        operation: 'browse',
        selector: prefix,
        ...(parsed.cursor === undefined ? {} : { cursor: parsed.cursor }),
        ...(parsed.pageSize === undefined ? {} : { pageSize: parsed.pageSize }),
        matches: (path) => path.startsWith(prefix),
      });
    },
    async findPath(args: unknown) {
      const parsed = findArgsSchema.parse(args);
      const query = normalizedSelector(parsed.query);
      if (query.length === 0) {fail('invalid-input');}
      return page({
        mount: parsed.mount,
        operation: 'find-path',
        selector: query,
        ...(parsed.cursor === undefined ? {} : { cursor: parsed.cursor }),
        ...(parsed.pageSize === undefined ? {} : { pageSize: parsed.pageSize }),
        matches: (path) => path.includes(query),
      });
    },
    async read(args: unknown) {
      const parsed = readArgsSchema.parse(args);
      if (!parsed.path.endsWith('.md')) {fail('invalid-input');}
      const mount = resolveMount(parsed.mount);
      const access = await authorizeMount(mount, 'read');
      const manifest = await loadManifest(mount);
      const entry = manifest.entries.find(
        (candidate) => candidate.path === parsed.path,
      );
      if (!entry || !visible(entry, access)) {fail('not-found');}
      const document = canonicalDocumentSchema.parse(
        await input.reader.readDocument(entry.objectHash),
      );
      if (hashCanonicalJson(document) !== entry.objectHash)
        {fail('corrupt-source');}
      assertEnvelope(document, entry);
      const sliced = sliceText(
        document.body,
        parsed.offset ?? 0,
        parsed.characters ?? maxReadCodepoints,
      );
      const worldId =
        manifest.format === 'offscreen.world-package-manifest.v1'
          ? manifest.worldId
          : null;
      const ruleSetId =
        manifest.format === 'offscreen.rule-package-manifest.v1'
          ? manifest.ruleSetId
          : null;
      const result = {
        text: sliced.text,
        truncated: sliced.truncated,
        cite: {
          mount: mount.mount,
          kind: mount.kind,
          worldId,
          ruleSetId,
          rootHash: mount.rootHash,
          path: entry.path,
          documentId: entry.documentId,
          objectHash: entry.objectHash,
          revision: entry.revision,
        } satisfies PinnedShelfCitation,
      };
      assertOutputBound(result);
      return result;
    },
  };
}

function assertEnvelope(document: CanonicalDocument, entry: ManifestEntry) {
  const envelope = document.envelope;
  if (
    envelope.documentId !== entry.documentId ||
    envelope.revision !== entry.revision ||
    envelope.kind !== entry.kind ||
    envelope.authority !== entry.authority ||
    envelope.visibility !== entry.visibility
  ) {
    fail('corrupt-source');
  }
}
