import { z } from 'zod';
import { lstat, readFile, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import {
  canonicalDocumentSchema,
  logicalDocumentPathSchema,
  rulePackageManifestSchema,
} from './schema.js';
import type { DocumentStore } from './local-store.js';
import {
  markdownSections,
  markdownTitle,
  stableNamespacedDocumentId,
} from './markdown-metadata.js';

export const maximumRuleImportFiles = 256;
export const maximumRuleImportFileBytes = 512 * 1024;
export const maximumRuleImportBytes = 8 * 1024 * 1024;

const topicSchema = z.string().regex(/^[a-z][a-z0-9-]{0,79}$/);

const ruleImportFileSchema = z.strictObject({
  path: logicalDocumentPathSchema.refine((path) => path.endsWith('.md'), {
    message: 'Rule source pages must be Markdown',
  }),
  content: z.string(),
  topics: z.array(topicSchema).min(1).max(32),
});

export const rulePackageImportSchema = z.strictObject({
  ruleSetId: z.uuid(),
  operationId: z.uuid(),
  title: z.string().trim().min(1).max(160),
  engine: z.strictObject({
    adapterId: z.string().regex(/^[a-z][a-z0-9.-]{0,119}$/),
    adapterVersion: z.number().int().positive(),
  }),
  license: z.strictObject({
    name: z.string().trim().min(1).max(200),
    source: z.url(),
    attribution: z.string().trim().min(1).max(500),
  }),
  files: z.array(ruleImportFileSchema).min(1).max(maximumRuleImportFiles),
});

export const rulePackageSourceSchema = z.strictObject({
  format: z.literal('offscreen.rule-package-source.v1'),
  ruleSetId: z.uuid(),
  authorOperationId: z.uuid(),
  title: z.string().trim().min(1).max(160),
  engine: rulePackageImportSchema.shape.engine,
  license: rulePackageImportSchema.shape.license,
  pages: z
    .array(
      z.strictObject({
        path: ruleImportFileSchema.shape.path,
        topics: ruleImportFileSchema.shape.topics,
      }),
    )
    .min(1)
    .max(maximumRuleImportFiles),
});

export async function importRulePackage(
  storage: DocumentStore,
  input: z.input<typeof rulePackageImportSchema>,
) {
  const request = rulePackageImportSchema.parse(input);
  if (
    new Set(request.files.map((file) => file.path)).size !==
    request.files.length
  ) {
    throw new Error('Rule import paths must be unique');
  }
  const sourceBytes = request.files.map((file) =>
    Buffer.byteLength(file.content, 'utf8'),
  );
  if (sourceBytes.some((bytes) => bytes > maximumRuleImportFileBytes)) {
    throw new Error('A rule import file exceeds its size limit');
  }
  if (
    sourceBytes.reduce((total, bytes) => total + bytes, 0) >
    maximumRuleImportBytes
  ) {
    throw new Error('Rule import exceeds its total size limit');
  }
  const orientationIndex = request.files.findIndex(
    (file) => file.path.toLowerCase() === 'rules.md',
  );
  if (orientationIndex < 0) throw new Error('Rule import requires RULES.md');

  const entries = [];
  for (const [index, file] of request.files.entries()) {
    const orientation = index === orientationIndex;
    const documentId = stableNamespacedDocumentId(
      'rules',
      request.ruleSetId,
      file.path,
    );
    const kind = orientation
      ? ('orientation' as const)
      : ('rule-reference' as const);
    const document = canonicalDocumentSchema.parse({
      format: 'offscreen.document.v1',
      envelope: {
        documentId,
        kind,
        schemaVersion: 1,
        revision: 1,
        authority: 'source',
        visibility: 'player-known',
        sources: [],
      },
      title: markdownTitle(file.path, file.content),
      body: file.content,
    });
    entries.push({
      documentId,
      revision: 1,
      path: file.path,
      objectHash: await storage.putDocument(document),
      kind,
      authority: 'source' as const,
      visibility: 'player-known' as const,
      sourceBytes: sourceBytes[index] ?? 0,
      topics: file.topics,
      sections: markdownSections(file.content).map((section) => ({
        ...section,
        topics: file.topics,
      })),
    });
  }
  const orientation = entries[orientationIndex];
  if (!orientation) throw new Error('Rule orientation was not imported');
  const manifest = rulePackageManifestSchema.parse({
    format: 'offscreen.rule-package-manifest.v1',
    ruleSetId: request.ruleSetId,
    title: request.title,
    revision: 1,
    previousRootHash: null,
    authorOperationId: request.operationId,
    orientationDocumentId: orientation.documentId,
    engine: request.engine,
    license: request.license,
    entries: entries.sort((left, right) => left.path.localeCompare(right.path)),
  });
  return {
    rootHash: await storage.putRulePackageManifest(manifest),
    manifest,
  };
}

export async function importRulePackageDirectory(
  storage: DocumentStore,
  sourceDirectory: string,
) {
  const root = await realpath(resolve(sourceDirectory));
  const descriptorPath = resolve(root, 'rule-package.json');
  const descriptorMetadata = await lstat(descriptorPath);
  if (!descriptorMetadata.isFile() || descriptorMetadata.isSymbolicLink()) {
    throw new Error('Rule package descriptor must be a regular file');
  }
  const descriptor = rulePackageSourceSchema.parse(
    JSON.parse(await readFile(descriptorPath, 'utf8')),
  );
  if (
    new Set(descriptor.pages.map((page) => page.path)).size !==
    descriptor.pages.length
  ) {
    throw new Error('Rule source page paths must be unique');
  }
  const files = [];
  for (const page of descriptor.pages) {
    const absolute = resolve(root, ...page.path.split('/'));
    const relativePath = relative(root, absolute);
    if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
      throw new Error('Rule source path escapes its package directory');
    }
    const metadata = await lstat(absolute);
    if (!metadata.isFile() || metadata.isSymbolicLink()) {
      throw new Error(`Rule source page must be a regular file: ${page.path}`);
    }
    if (metadata.size > maximumRuleImportFileBytes) {
      throw new Error(`Rule source page exceeds its size limit: ${page.path}`);
    }
    const bytes = await readFile(absolute);
    files.push({
      path: page.path,
      topics: page.topics,
      content: new TextDecoder('utf-8', { fatal: true }).decode(bytes),
    });
  }
  const imported = await importRulePackage(storage, {
    ruleSetId: descriptor.ruleSetId,
    operationId: descriptor.authorOperationId,
    title: descriptor.title,
    engine: descriptor.engine,
    license: descriptor.license,
    files,
  });
  return { ...imported, source: descriptor };
}
