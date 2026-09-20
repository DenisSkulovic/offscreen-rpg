import { constants } from 'node:fs';
import {
  link,
  mkdir,
  open,
  readFile,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { z } from 'zod';
import { canonicalJson, sha256 } from './canonical-json.js';
import {
  canonicalDocumentSchema,
  canonicalSourcePassageSchema,
  canonicalStructuredDocumentSchema,
  contentHashSchema,
  documentManifestSchema,
  rulePackageManifestSchema,
  startPackageManifestSchema,
  worldPackageManifestSchema,
  type CanonicalDocument,
  type CanonicalSourcePassage,
  type CanonicalStructuredDocument,
  type DocumentManifest,
  type RulePackageManifest,
  type StartPackageManifest,
  type WorldPackageManifest,
} from './schema.js';
import {
  renderCanonicalMarkdown,
  renderSourcePassageMarkdown,
} from './markdown.js';

export const maximumStoredObjectBytes = 1024 * 1024;

export class DocumentStorageError extends Error {
  constructor(
    readonly code: 'unavailable' | 'missing' | 'corrupt' | 'too-large',
    options?: ErrorOptions,
  ) {
    super(code, options);
  }
}

async function durableExclusiveWrite(path: string, bytes: string) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${randomUUID()}.staged`;
  let handle;
  try {
    handle = await open(
      temporary,
      constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY,
    );
    await handle.writeFile(bytes, 'utf8');
    await handle.sync();
    await handle.close();
    handle = undefined;
    try {
      await link(temporary, path);
      await unlink(temporary);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      await unlink(temporary).catch(() => undefined);
    }
  } catch (error) {
    await handle?.close().catch(() => undefined);
    await unlink(temporary).catch(() => undefined);
    throw error;
  }
}

export class LocalDocumentStore {
  readonly root: string;

  constructor(root: string) {
    if (!root.trim()) throw new Error('Document storage root is required');
    this.root = resolve(root);
  }

  private objectPath(hash: string) {
    const valid = contentHashSchema.parse(hash);
    return join(
      this.root,
      'objects',
      'sha256',
      valid.slice(0, 2),
      `${valid}.json`,
    );
  }

  private async putValidated(value: unknown) {
    const bytes = canonicalJson(value);
    if (Buffer.byteLength(bytes) > maximumStoredObjectBytes) {
      throw new DocumentStorageError('too-large');
    }
    const hash = sha256(bytes);
    const path = this.objectPath(hash);
    try {
      await durableExclusiveWrite(path, bytes);
      const stored = await readFile(path, 'utf8');
      if (sha256(stored) !== hash || stored !== bytes) {
        throw new DocumentStorageError('corrupt');
      }
      return hash;
    } catch (error) {
      if (error instanceof DocumentStorageError) throw error;
      throw new DocumentStorageError('unavailable', { cause: error });
    }
  }

  putDocument(document: CanonicalDocument) {
    return this.putValidated(canonicalDocumentSchema.parse(document));
  }

  putSourcePassage(passage: CanonicalSourcePassage) {
    return this.putValidated(canonicalSourcePassageSchema.parse(passage));
  }

  putStructuredDocument(document: CanonicalStructuredDocument) {
    return this.putValidated(canonicalStructuredDocumentSchema.parse(document));
  }

  putManifest(manifest: DocumentManifest) {
    return this.putValidated(documentManifestSchema.parse(manifest));
  }

  putWorldPackageManifest(manifest: WorldPackageManifest) {
    return this.putValidated(worldPackageManifestSchema.parse(manifest));
  }

  putRulePackageManifest(manifest: RulePackageManifest) {
    return this.putValidated(rulePackageManifestSchema.parse(manifest));
  }

  putStartPackageManifest(manifest: StartPackageManifest) {
    return this.putValidated(startPackageManifestSchema.parse(manifest));
  }

  private async readValidated<T>(
    hash: string,
    schema: z.ZodType<T>,
  ): Promise<T> {
    let bytes: string;
    try {
      bytes = await readFile(this.objectPath(hash), 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new DocumentStorageError('missing', { cause: error });
      }
      throw new DocumentStorageError('unavailable', { cause: error });
    }
    if (Buffer.byteLength(bytes) > maximumStoredObjectBytes) {
      throw new DocumentStorageError('too-large');
    }
    if (sha256(bytes) !== hash) throw new DocumentStorageError('corrupt');
    try {
      return schema.parse(JSON.parse(bytes));
    } catch (error) {
      throw new DocumentStorageError('corrupt', { cause: error });
    }
  }

  readDocument(hash: string) {
    return this.readValidated(hash, canonicalDocumentSchema);
  }

  readSourcePassage(hash: string) {
    return this.readValidated(hash, canonicalSourcePassageSchema);
  }

  readStructuredDocument(hash: string) {
    return this.readValidated(hash, canonicalStructuredDocumentSchema);
  }

  readManifest(hash: string) {
    return this.readValidated(hash, documentManifestSchema);
  }

  readWorldPackageManifest(hash: string) {
    return this.readValidated(hash, worldPackageManifestSchema);
  }

  readRulePackageManifest(hash: string) {
    return this.readValidated(hash, rulePackageManifestSchema);
  }

  readStartPackageManifest(hash: string) {
    return this.readValidated(hash, startPackageManifestSchema);
  }

  async exportPublishedRoot(rootHash: string, destination: string) {
    const manifest = await this.readManifest(rootHash);
    const exportRoot = resolve(destination);
    await mkdir(exportRoot, { recursive: true });
    const checksums: Record<string, string> = {};
    for (const entry of manifest.entries) {
      const path = resolve(exportRoot, ...entry.path.split('/'));
      const relativePath = relative(exportRoot, path);
      if (relativePath.startsWith('..') || isAbsolute(relativePath))
        throw new DocumentStorageError('corrupt');
      if (entry.kind === 'source-passage') {
        const passage = await this.readSourcePassage(entry.objectHash);
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, renderSourcePassageMarkdown(passage), {
          encoding: 'utf8',
          flag: 'wx',
        });
        checksums[entry.path] = entry.objectHash;
        continue;
      }
      if (entry.path.endsWith('.json')) {
        const document = await this.readStructuredDocument(entry.objectHash);
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, canonicalJson(document), {
          encoding: 'utf8',
          flag: 'wx',
        });
        checksums[entry.path] = entry.objectHash;
        continue;
      }
      const document = await this.readDocument(entry.objectHash);
      await mkdir(dirname(path), { recursive: true });
      const content = entry.path.endsWith('.md')
        ? renderCanonicalMarkdown(document)
        : `${document.body.trimEnd()}\n`;
      await writeFile(path, content, { encoding: 'utf8', flag: 'wx' });
      checksums[entry.path] = entry.objectHash;
    }
    await writeFile(
      join(exportRoot, 'manifest.json'),
      canonicalJson({ rootHash, manifest }),
      { encoding: 'utf8', flag: 'wx' },
    );
    await writeFile(
      join(exportRoot, 'checksums.json'),
      canonicalJson(checksums),
      { encoding: 'utf8', flag: 'wx' },
    );
    return {
      rootHash,
      destination: exportRoot,
      documents: manifest.entries.length,
    };
  }
}

export type DocumentStore = Pick<
  LocalDocumentStore,
  | 'putDocument'
  | 'putSourcePassage'
  | 'putStructuredDocument'
  | 'putManifest'
  | 'putWorldPackageManifest'
  | 'putRulePackageManifest'
  | 'putStartPackageManifest'
  | 'readDocument'
  | 'readSourcePassage'
  | 'readStructuredDocument'
  | 'readManifest'
  | 'readWorldPackageManifest'
  | 'readRulePackageManifest'
  | 'readStartPackageManifest'
>;
