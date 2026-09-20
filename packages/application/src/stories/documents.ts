import {
  canonicalDocumentSchema,
  documentAuthoritySchema,
  documentKindSchema,
  documentManifestSchema,
  documentSourceSchema,
  documentVisibilitySchema,
  hashCanonicalJson,
  logicalDocumentPathSchema,
  selectCompleteMarkdownSection,
  type DocumentManifest,
  type DocumentManifestEntry,
  type DocumentStore,
  worldPackageReferenceSchema,
} from '@offscreen/documents';
import type { Database } from '@offscreen/db';
import { story, storyDocumentCommit } from '@offscreen/db/story-schema';
import { storyPassage } from '@offscreen/db/story-schema';
import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { enqueue } from '../outbox/index';
import { StoryError, parseStoryIdentifier } from './errors';
import { lockOwnedStory } from './persistence';
import { passageContentSchema } from '@offscreen/contracts/stories';

export const knowledgeIndexTopic = 'knowledge.index.v1';

const descriptiveKindSchema = documentKindSchema.exclude([
  'source-passage',
  'creative-guidance',
  'activity-definition',
  'state-projection',
]);

export const admittedDocumentChangeSchema = z.strictObject({
  documentId: z.uuid(),
  expectedRevision: z.number().int().positive().nullable(),
  path: logicalDocumentPathSchema.refine((path) => path.endsWith('.md'), {
    message: 'Descriptive campaign documents use Markdown paths',
  }),
  kind: descriptiveKindSchema,
  authority: documentAuthoritySchema,
  visibility: documentVisibilitySchema,
  title: z.string().min(1).max(240),
  body: z.string().max(512 * 1024),
  sources: z.array(documentSourceSchema).max(64).default([]),
});

export const admitDocumentChangesSchema = z.strictObject({
  expectedRootHash: z
    .string()
    .regex(/^[0-9a-f]{64}$/)
    .nullable(),
  expectedRootRevision: z.number().int().nonnegative(),
  changes: z.array(admittedDocumentChangeSchema).min(1).max(32),
});

function emptyManifest(campaignId: string): DocumentManifest {
  return documentManifestSchema.parse({
    format: 'offscreen.manifest.v1',
    campaignId,
    revision: 0,
    previousRootHash: null,
    authorOperationId: null,
    entries: [],
  });
}

function assertUniqueChanges(
  changes: z.infer<typeof admitDocumentChangesSchema>['changes'],
) {
  if (new Set(changes.map((change) => change.documentId)).size !== changes.length)
    throw new StoryError('invalid', 'duplicate_document');
  if (new Set(changes.map((change) => change.path)).size !== changes.length)
    throw new StoryError('invalid', 'duplicate_path');
}

function assertManifestReferences(byIdentity: ReadonlySet<string>) {
  return (sources: readonly { documentId: string; revision: number }[]) => {
    if (
      sources.some(
        (source) => !byIdentity.has(`${source.documentId}@${source.revision}`),
      )
    ) {
      throw new StoryError('invalid', 'missing_document_source');
    }
  };
}

export function createCampaignDocuments(
  database: Database,
  storage: DocumentStore,
) {
  async function readWorldReferences(rootHash: string | null) {
    if (!rootHash) return [];
    const manifest = await storage.readManifest(rootHash);
    const entry = manifest.entries.find(
      (candidate) => candidate.path === 'world/references.json',
    );
    if (!entry) return [];
    const document = await storage.readStructuredDocument(entry.objectHash);
    return z
      .strictObject({
        version: z.literal(1),
        worlds: z.array(worldPackageReferenceSchema).max(8),
      })
      .parse(document.data).worlds;
  }

  async function readPinnedWorld(ownerId: string, storyId: string, mount: string) {
    const [owned] = await database.db
      .select({ rootHash: story.documentRootHash })
      .from(story)
      .where(
        and(
          eq(story.id, parseStoryIdentifier(storyId)),
          eq(story.ownerId, ownerId),
        ),
      );
    if (!owned) throw new StoryError('not_found');
    const rootHash = owned.rootHash;
    const reference = (await readWorldReferences(rootHash)).find(
      (candidate) => candidate.mount === mount,
    );
    if (!reference) throw new StoryError('not_found');
    const manifest = await storage.readWorldPackageManifest(reference.rootHash);
    if (
      manifest.worldId !== reference.worldId ||
      manifest.revision !== reference.revision
    ) {
      throw new StoryError('unavailable', 'world_reference');
    }
    return { reference, manifest };
  }

  function truncateUtf8(content: string, maximumBytes: number) {
    const bytes = Buffer.from(content, 'utf8');
    if (bytes.length <= maximumBytes) return { content, complete: true, bytes };
    let end = maximumBytes;
    while (end > 0) {
      try {
        return {
          content: new TextDecoder('utf-8', { fatal: true }).decode(
            bytes.subarray(0, end),
          ),
          complete: false,
          bytes,
        };
      } catch {
        end -= 1;
      }
    }
    return { content: '', complete: false, bytes };
  }

  async function readManifestHistory(
    campaignId: string,
    rootHash: string | null,
    current: DocumentManifest,
  ) {
    const manifests = [current];
    const seen = new Set(rootHash ? [rootHash] : []);
    let previous = current.previousRootHash;
    while (previous !== null) {
      if (manifests.length >= 256 || seen.has(previous))
        throw new Error('Document manifest history is invalid or exceeds its bound');
      seen.add(previous);
      const manifest = await storage.readManifest(previous);
      if (
        manifest.campaignId !== campaignId ||
        manifest.revision !== current.revision - manifests.length
      )
        throw new Error('Document manifest history is not contiguous');
      manifests.push(manifest);
      previous = manifest.previousRootHash;
    }
    return manifests;
  }

  const operations = {
    async listWorldDocuments(args: {
      ownerId: string;
      storyId: string;
      mount: string;
      prefix?: string;
      limit?: number;
    }) {
      const limit = z.number().int().min(1).max(100).parse(args.limit ?? 50);
      const { reference, manifest } = await readPinnedWorld(
        args.ownerId,
        args.storyId,
        args.mount,
      );
      const matching = manifest.entries.filter(
        (entry) => !args.prefix || entry.path.startsWith(args.prefix),
      );
      return {
        reference,
        title: manifest.title,
        items: matching.slice(0, limit).map((entry) => ({
          documentId: entry.documentId,
          path: entry.path,
          kind: entry.kind,
          authority: entry.authority,
          visibility: entry.visibility,
          revision: entry.revision,
          sourceBytes: entry.sourceBytes,
          sections: entry.sections,
        })),
        truncated: matching.length > limit,
      };
    },

    async readWorldDocument(args: {
      ownerId: string;
      storyId: string;
      mount: string;
      documentId: string;
      sectionLine?: number;
      maxBytes?: number;
    }) {
      const maxBytes = z
        .number()
        .int()
        .min(256)
        .max(64 * 1024)
        .parse(args.maxBytes ?? 16 * 1024);
      const { reference, manifest } = await readPinnedWorld(
        args.ownerId,
        args.storyId,
        args.mount,
      );
      const entry = manifest.entries.find(
        (candidate) => candidate.documentId === parseStoryIdentifier(args.documentId),
      );
      if (!entry) throw new StoryError('not_found');
      const document = await storage.readDocument(entry.objectHash);
      if (
        document.envelope.documentId !== entry.documentId ||
        document.envelope.revision !== entry.revision ||
        document.envelope.kind !== entry.kind
      ) {
        throw new StoryError('unavailable', 'world_document');
      }
      const sectionLine = z
        .number()
        .int()
        .positive()
        .optional()
        .parse(args.sectionLine);
      let selected = document.body;
      if (sectionLine) {
        try {
          selected = selectCompleteMarkdownSection(
            document.body,
            entry.sections,
            sectionLine,
          );
        } catch (error) {
          if (
            error instanceof Error &&
            error.message === 'markdown_section_not_found'
          ) {
            throw new StoryError('not_found');
          }
          throw error;
        }
      }
      const bounded = truncateUtf8(selected, maxBytes);
      return {
        reference,
        entry,
        title: document.title,
        selectedSectionLine: sectionLine ?? null,
        content: bounded.content,
        complete: bounded.complete,
        selectedBytes: bounded.bytes.length,
        returnedBytes: Buffer.byteLength(bounded.content, 'utf8'),
      };
    },

    async projectPassageSources(args: {
      ownerId: string;
      storyId: string;
      limit?: number;
    }) {
      const storyId = parseStoryIdentifier(args.storyId);
      const parsedLimit = z
        .number()
        .int()
        .min(1)
        .max(100)
        .safeParse(args.limit ?? 20);
      if (!parsedLimit.success) throw new StoryError('invalid');
      const limit = parsedLimit.data;
      const rows = await database.db
        .select({
          storyId: story.id,
          passageId: storyPassage.id,
          sequence: storyPassage.sequence,
          content: storyPassage.content,
          contentDocumentHash: storyPassage.contentDocumentHash,
          response: storyPassage.response,
          sourceGenerationId: storyPassage.sourceGenerationId,
          sourceGenerationPart: storyPassage.sourceGenerationPart,
        })
        .from(story)
        .innerJoin(storyPassage, eq(storyPassage.storyId, story.id))
        .where(and(eq(story.id, storyId), eq(story.ownerId, args.ownerId)))
        .orderBy(storyPassage.sequence)
        .limit(limit);
      if (!rows.length) throw new StoryError('not_found');
      return {
        ownership: 'sql-projection' as const,
        completeThroughSequence: rows.at(-1)?.sequence ?? 0,
        passages: await Promise.all(rows.map(async (row) => {
          const content = row.contentDocumentHash
            ? passageContentSchema.parse(
                (await storage.readSourcePassage(row.contentDocumentHash)).content,
              )
            : passageContentSchema.parse(row.content);
          return {
            passageId: row.passageId,
            sequence: row.sequence,
            title: content.title,
            markdown: `# ${content.title}\n\n${content.paragraphs.join('\n\n')}\n`,
            response: row.response,
            sourceGenerationId: row.sourceGenerationId,
            sourceGenerationPart: row.sourceGenerationPart,
          };
        })),
      };
    },

    async readRoot(args: { ownerId: string; storyId: string }) {
      const [owned] = await database.db
        .select({
          rootHash: story.documentRootHash,
          rootRevision: story.documentRootRevision,
        })
        .from(story)
        .where(
          and(
            eq(story.id, parseStoryIdentifier(args.storyId)),
            eq(story.ownerId, args.ownerId),
          ),
        );
      if (!owned) throw new StoryError('not_found');
      const manifest = owned.rootHash
        ? await storage.readManifest(owned.rootHash)
        : emptyManifest(args.storyId);
      if (
        manifest.campaignId !== args.storyId ||
        manifest.revision !== owned.rootRevision
      ) {
        throw new Error('Published document root does not match its campaign');
      }
      return { rootHash: owned.rootHash, manifest };
    },

    async readDocument(args: {
      ownerId: string;
      storyId: string;
      documentId: string;
      revision?: number;
    }) {
      const documentId = parseStoryIdentifier(args.documentId);
      const { rootHash, manifest } = await this.readRoot(args);
      const history = await readManifestHistory(args.storyId, rootHash, manifest);
      const entry = history
        .flatMap((candidate) => candidate.entries)
        .find(
          (candidate) =>
            candidate.documentId === documentId &&
            (args.revision === undefined ||
              candidate.revision === args.revision),
        );
      if (!entry) throw new StoryError('not_found');
      const document =
        entry.kind === 'source-passage'
          ? await storage.readSourcePassage(entry.objectHash)
          : await storage.readDocument(entry.objectHash);
      if (
        document.envelope.documentId !== entry.documentId ||
        document.envelope.revision !== entry.revision
      ) {
        throw new Error('Document object does not match its manifest entry');
      }
      return { rootHash, entry, document };
    },

    async admit(args: {
      ownerId: string;
      storyId: string;
      operationId: string;
      body: unknown;
    }) {
      const storyId = parseStoryIdentifier(args.storyId);
      const operationId = parseStoryIdentifier(args.operationId);
      const request = admitDocumentChangesSchema.safeParse(args.body);
      if (!request.success) throw new StoryError('invalid');
      assertUniqueChanges(request.data.changes);
      const requestHash = hashCanonicalJson(request.data);

      const [priorCommit] = await database.db
        .select({
          requestHash: storyDocumentCommit.requestHash,
          rootHash: storyDocumentCommit.rootHash,
          rootRevision: storyDocumentCommit.rootRevision,
        })
        .from(storyDocumentCommit)
        .innerJoin(story, eq(story.id, storyDocumentCommit.storyId))
        .where(
          and(
            eq(storyDocumentCommit.storyId, storyId),
            eq(storyDocumentCommit.operationId, operationId),
            eq(story.ownerId, args.ownerId),
          ),
        );
      if (priorCommit) {
        if (priorCommit.requestHash !== requestHash)
          throw new StoryError('conflict', 'operation_identity');
        return {
          rootHash: priorCommit.rootHash,
          rootRevision: priorCommit.rootRevision,
          replayed: true,
        };
      }

      const current = await this.readRoot({ ownerId: args.ownerId, storyId });
      if (
        current.rootHash !== request.data.expectedRootHash ||
        current.manifest.revision !== request.data.expectedRootRevision
      ) {
        throw new StoryError('conflict', 'document_root');
      }

      const entriesByDocument = new Map(
        current.manifest.entries.map((entry) => [entry.documentId, entry]),
      );
      const changedDocuments = [];
      for (const change of request.data.changes) {
        const previous = entriesByDocument.get(change.documentId);
        if (
          (previous === undefined && change.expectedRevision !== null) ||
          (previous !== undefined && previous.revision !== change.expectedRevision)
        ) {
          throw new StoryError('conflict', 'document_revision');
        }
        const revision = (change.expectedRevision ?? 0) + 1;
        const document = canonicalDocumentSchema.parse({
          format: 'offscreen.document.v1',
          envelope: {
            documentId: change.documentId,
            kind: change.kind,
            schemaVersion: 1,
            revision,
            authority: change.authority,
            visibility: change.visibility,
            sources: change.sources,
          },
          title: change.title,
          body: change.body,
        });
        changedDocuments.push({ change, document });
      }

      for (const { change, document } of changedDocuments) {
        const objectHash = await storage.putDocument(document);
        entriesByDocument.set(change.documentId, {
          documentId: change.documentId,
          revision: document.envelope.revision,
          path: change.path,
          objectHash,
          kind: change.kind,
          authority: change.authority,
          visibility: change.visibility,
        });
      }
      const nextEntries = [...entriesByDocument.values()].sort((left, right) =>
        left.path.localeCompare(right.path),
      );
      if (new Set(nextEntries.map((entry) => entry.path)).size !== nextEntries.length)
        throw new StoryError('conflict', 'document_path');
      const history = await readManifestHistory(
        storyId,
        current.rootHash,
        current.manifest,
      );
      const availableSources = new Set(
        [...history.flatMap((manifest) => manifest.entries), ...nextEntries].map(
          (entry) => `${entry.documentId}@${entry.revision}`,
        ),
      );
      const requireSources = assertManifestReferences(availableSources);
      for (const { document } of changedDocuments)
        requireSources(document.envelope.sources);

      const nextManifest = documentManifestSchema.parse({
        format: 'offscreen.manifest.v1',
        campaignId: storyId,
        revision: current.manifest.revision + 1,
        previousRootHash: current.rootHash,
        authorOperationId: operationId,
        entries: nextEntries,
      });
      const rootHash = await storage.putManifest(nextManifest);

      return database.db.transaction(async (tx) => {
        const locked = await lockOwnedStory(tx, {
          ownerId: args.ownerId,
          storyId,
        });
        const [receipt] = await tx
          .select()
          .from(storyDocumentCommit)
          .where(
            and(
              eq(storyDocumentCommit.storyId, storyId),
              eq(storyDocumentCommit.operationId, operationId),
            ),
          );
        if (receipt) {
          if (receipt.requestHash !== requestHash)
            throw new StoryError('conflict', 'operation_identity');
          return {
            rootHash: receipt.rootHash,
            rootRevision: receipt.rootRevision,
            replayed: true,
          };
        }
        if (
          locked.documentRootHash !== current.rootHash ||
          locked.documentRootRevision !== current.manifest.revision
        ) {
          throw new StoryError('conflict', 'document_root');
        }
        await tx.insert(storyDocumentCommit).values({
          storyId,
          operationId,
          requestHash,
          baseRootHash: current.rootHash,
          rootHash,
          rootRevision: nextManifest.revision,
        });
        await tx
          .update(story)
          .set({
            documentRootHash: rootHash,
            documentRootRevision: nextManifest.revision,
            viewVersion: locked.viewVersion + 1,
          })
          .where(eq(story.id, storyId));
        await enqueue(tx, {
          id: randomUUID(),
          topic: knowledgeIndexTopic,
          operationId,
        });
        return {
          rootHash,
          rootRevision: nextManifest.revision,
          replayed: false,
        };
      });
    },
  };
  return operations;
}
