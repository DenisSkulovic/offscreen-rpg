import { lstat, readdir, readFile, realpath } from 'node:fs/promises';
import { extname, isAbsolute, relative, resolve } from 'node:path';
import { z } from 'zod';
import {
  canonicalDocumentSchema,
  documentAuthoritySchema,
  documentVisibilitySchema,
  logicalDocumentPathSchema,
  worldPackageDocumentKindSchema,
  worldPackageManifestSchema,
} from './schema.js';
import type { DocumentStore } from './local-store.js';
import {
  markdownSections,
  markdownTitle,
  stableNamespacedDocumentId,
} from './markdown-metadata.js';

export const maximumWorldImportFiles = 256;
export const maximumWorldImportFileBytes = 512 * 1024;
export const maximumWorldImportBytes = 8 * 1024 * 1024;

const worldImportFileSchema = z.strictObject({
  path: z.string().min(1).max(320),
  content: z.string(),
  title: z.string().trim().min(1).max(240).optional(),
  kind: worldPackageDocumentKindSchema.optional(),
  authority: documentAuthoritySchema.optional(),
  visibility: documentVisibilitySchema.optional(),
});

export const worldPackageImportSchema = z.strictObject({
  worldId: z.uuid(),
  operationId: z.uuid(),
  title: z.string().trim().min(1).max(160),
  files: z.array(worldImportFileSchema).min(1).max(maximumWorldImportFiles),
});

function normalizeImportPath(path: string) {
  if (path.includes('\\'))
    throw new Error('World import paths use forward slashes');
  const extension = extname(path).toLowerCase();
  const normalized = extension === '.txt' ? `${path.slice(0, -4)}.md` : path;
  if (!normalized.toLowerCase().endsWith('.md')) {
    throw new Error('World import currently supports Markdown and text files');
  }
  return logicalDocumentPathSchema.parse(normalized);
}

export async function importWorldPackage(
  storage: DocumentStore,
  input: z.input<typeof worldPackageImportSchema>,
) {
  const request = worldPackageImportSchema.parse(input);
  const normalized = request.files.map((file) => ({
    ...file,
    path: normalizeImportPath(file.path),
  }));
  if (new Set(normalized.map((file) => file.path)).size !== normalized.length) {
    throw new Error('World import paths must be unique after normalization');
  }
  const sourceBytes = normalized.map((file) =>
    Buffer.byteLength(file.content, 'utf8'),
  );
  if (sourceBytes.some((bytes) => bytes > maximumWorldImportFileBytes)) {
    throw new Error('A world import file exceeds its size limit');
  }
  if (
    sourceBytes.reduce((total, bytes) => total + bytes, 0) >
    maximumWorldImportBytes
  ) {
    throw new Error('World import exceeds its total size limit');
  }
  const orientationIndex = normalized.findIndex(
    (file) => file.path.toLowerCase() === 'world.md',
  );
  if (orientationIndex < 0) {
    throw new Error('World import requires WORLD.md');
  }

  const entries = [];
  for (const [index, file] of normalized.entries()) {
    const orientation = index === orientationIndex;
    if (orientation && file.kind && file.kind !== 'orientation') {
      throw new Error('WORLD.md must be an orientation document');
    }
    const documentId = stableNamespacedDocumentId(
      'world',
      request.worldId,
      file.path,
    );
    const kind = orientation ? ('orientation' as const) : (file.kind ?? 'lore');
    const authority = file.authority ?? 'canon';
    const visibility = file.visibility ?? 'player-known';
    const document = canonicalDocumentSchema.parse({
      format: 'offscreen.document.v1',
      envelope: {
        documentId,
        kind,
        schemaVersion: 1,
        revision: 1,
        authority,
        visibility,
        sources: [],
      },
      title: file.title ?? markdownTitle(file.path, file.content),
      body: file.content,
    });
    entries.push({
      documentId,
      revision: 1,
      path: file.path,
      objectHash: await storage.putDocument(document),
      kind,
      authority,
      visibility,
      sourceBytes: sourceBytes[index] ?? 0,
      sections: markdownSections(file.content),
    });
  }
  const orientation = entries[orientationIndex];
  if (!orientation) throw new Error('World orientation was not imported');
  const manifest = worldPackageManifestSchema.parse({
    format: 'offscreen.world-package-manifest.v1',
    worldId: request.worldId,
    title: request.title,
    revision: 1,
    previousRootHash: null,
    authorOperationId: request.operationId,
    orientationDocumentId: orientation.documentId,
    entries: entries.sort((left, right) => left.path.localeCompare(right.path)),
  });
  return {
    rootHash: await storage.putWorldPackageManifest(manifest),
    manifest,
  };
}

function assertWithinRoot(root: string, candidate: string) {
  const path = relative(root, candidate);
  if (path.startsWith('..') || isAbsolute(path)) {
    throw new Error('World import path escapes its source directory');
  }
}

export async function readWorldImportDirectory(sourceDirectory: string) {
  const root = await realpath(resolve(sourceDirectory));
  const files: Array<{ path: string; content: string }> = [];
  const ignoredPaths: string[] = [];
  let totalBytes = 0;

  async function visit(directory: string) {
    assertWithinRoot(root, await realpath(directory));
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const absolute = resolve(directory, entry.name);
      const relativePath = relative(root, absolute).replaceAll('\\', '/');
      if (entry.name.startsWith('.')) {
        ignoredPaths.push(relativePath);
        continue;
      }
      if (entry.isSymbolicLink()) {
        throw new Error(`World import rejects symbolic link: ${relativePath}`);
      }
      if (entry.isDirectory()) {
        await visit(absolute);
        continue;
      }
      if (!entry.isFile()) {
        throw new Error(`World import rejects special file: ${relativePath}`);
      }
      const extension = extname(entry.name).toLowerCase();
      if (extension !== '.md' && extension !== '.txt') {
        ignoredPaths.push(relativePath);
        continue;
      }
      const metadata = await lstat(absolute);
      if (metadata.size > maximumWorldImportFileBytes) {
        throw new Error(
          `World import file exceeds its size limit: ${relativePath}`,
        );
      }
      totalBytes += metadata.size;
      if (totalBytes > maximumWorldImportBytes) {
        throw new Error('World import exceeds its total size limit');
      }
      if (files.length >= maximumWorldImportFiles) {
        throw new Error('World import exceeds its file-count limit');
      }
      const bytes = await readFile(absolute);
      const content = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      files.push({ path: relativePath, content });
    }
  }

  await visit(root);
  return { files, ignoredPaths };
}

export async function importWorldPackageDirectory(
  storage: DocumentStore,
  input: Omit<z.input<typeof worldPackageImportSchema>, 'files'> & {
    sourceDirectory: string;
  },
) {
  const { sourceDirectory, ...request } = input;
  const discovered = await readWorldImportDirectory(sourceDirectory);
  const imported = await importWorldPackage(storage, {
    ...request,
    files: discovered.files,
  });
  return { ...imported, ignoredPaths: discovered.ignoredPaths };
}
