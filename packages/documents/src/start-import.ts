import { lstat, readFile, realpath } from 'node:fs/promises';
import { extname, isAbsolute, relative, resolve } from 'node:path';
import { z } from 'zod';
import type { DocumentStore } from './local-store.js';
import {
  markdownTitle,
  stableNamespacedDocumentId,
} from './markdown-metadata.js';
import {
  canonicalDocumentSchema,
  canonicalStructuredDocumentSchema,
  documentAuthoritySchema,
  documentVisibilitySchema,
  logicalDocumentPathSchema,
  rulePackageReferenceSchema,
  startPackageDocumentKindSchema,
  startPackageManifestSchema,
  worldPackageReferenceSchema,
} from './schema.js';

export const maximumStartImportFiles = 512;
export const maximumStartImportFileBytes = 512 * 1024;
export const maximumStartImportBytes = 8 * 1024 * 1024;

const startSourceDocumentSchema = z.strictObject({
  path: logicalDocumentPathSchema,
  kind: startPackageDocumentKindSchema,
  activation: z.enum([
    'initial-canon',
    'private-possibility',
    'executable-obligation',
  ]),
  authority: documentAuthoritySchema,
  visibility: documentVisibilitySchema,
  title: z.string().trim().min(1).max(240).optional(),
  schemaId: z
    .string()
    .regex(/^[a-z0-9.-]+\.v\d+$/)
    .optional(),
});

export const startPackageSourceSchema = z.strictObject({
  format: z.literal('offscreen.start-package-source.v1'),
  startPackageId: z.uuid(),
  authorOperationId: z.uuid(),
  title: z.string().trim().min(1).max(160),
  worlds: z.array(worldPackageReferenceSchema).max(8),
  rules: rulePackageReferenceSchema,
  documents: z
    .array(startSourceDocumentSchema)
    .min(1)
    .max(maximumStartImportFiles),
});

function resolveSourcePath(root: string, path: string) {
  const absolute = resolve(root, ...path.split('/'));
  const fromRoot = relative(root, absolute);
  if (fromRoot.startsWith('..') || isAbsolute(fromRoot)) {
    throw new Error('Start source path escapes its package directory');
  }
  return absolute;
}

export async function importStartPackageDirectory(
  storage: DocumentStore,
  sourceDirectory: string,
) {
  const root = await realpath(resolve(sourceDirectory));
  const descriptorPath = resolve(root, 'start-package.json');
  const descriptorMetadata = await lstat(descriptorPath);
  if (!descriptorMetadata.isFile() || descriptorMetadata.isSymbolicLink()) {
    throw new Error('Start package descriptor must be a regular file');
  }
  const source = startPackageSourceSchema.parse(
    JSON.parse(await readFile(descriptorPath, 'utf8')),
  );
  if (
    new Set(source.documents.map((document) => document.path)).size !==
    source.documents.length
  ) {
    throw new Error('Start source document paths must be unique');
  }
  if (
    !source.documents.some(
      (document) => document.path.toLowerCase() === 'start.md',
    )
  ) {
    throw new Error('Start package requires START.md');
  }

  let totalBytes = 0;
  const entries = [];
  for (const declared of source.documents) {
    const extension = extname(declared.path).toLowerCase();
    if (extension === '.md' && declared.schemaId) {
      throw new Error(
        `Markdown start document cannot declare schemaId: ${declared.path}`,
      );
    }
    if (extension === '.json' && !declared.schemaId) {
      throw new Error(
        `Structured start document requires schemaId: ${declared.path}`,
      );
    }
    const absolute = resolveSourcePath(root, declared.path);
    const metadata = await lstat(absolute);
    if (!metadata.isFile() || metadata.isSymbolicLink()) {
      throw new Error(
        `Start source document must be a regular file: ${declared.path}`,
      );
    }
    if (metadata.size > maximumStartImportFileBytes) {
      throw new Error(
        `Start source document exceeds its size limit: ${declared.path}`,
      );
    }
    totalBytes += metadata.size;
    if (totalBytes > maximumStartImportBytes) {
      throw new Error('Start import exceeds its total size limit');
    }
    const content = new TextDecoder('utf-8', { fatal: true }).decode(
      await readFile(absolute),
    );
    const documentId = stableNamespacedDocumentId(
      'start',
      source.startPackageId,
      declared.path,
    );
    const envelope = {
      documentId,
      kind: declared.kind,
      schemaVersion: 1 as const,
      revision: 1,
      authority: declared.authority,
      visibility: declared.visibility,
      sources: [],
    };
    const objectHash = declared.schemaId
      ? await storage.putStructuredDocument(
          canonicalStructuredDocumentSchema.parse({
            format: 'offscreen.structured-document.v1',
            envelope,
            schemaId: declared.schemaId,
            data: JSON.parse(content),
          }),
        )
      : await storage.putDocument(
          canonicalDocumentSchema.parse({
            format: 'offscreen.document.v1',
            envelope,
            title: declared.title ?? markdownTitle(declared.path, content),
            body: content,
          }),
        );
    entries.push({
      documentId,
      revision: 1,
      path: declared.path,
      objectHash,
      kind: declared.kind,
      authority: declared.authority,
      visibility: declared.visibility,
      activation: declared.activation,
    });
  }
  const orientation = entries.find(
    (entry) => entry.path.toLowerCase() === 'start.md',
  );
  if (!orientation) throw new Error('Start orientation was not imported');
  const manifest = startPackageManifestSchema.parse({
    format: 'offscreen.start-package-manifest.v1',
    startPackageId: source.startPackageId,
    title: source.title,
    revision: 1,
    previousRootHash: null,
    authorOperationId: source.authorOperationId,
    orientationDocumentId: orientation.documentId,
    worlds: source.worlds,
    rules: source.rules,
    entries: entries.sort((left, right) => left.path.localeCompare(right.path)),
  });
  return {
    rootHash: await storage.putStartPackageManifest(manifest),
    manifest,
    source,
  };
}
