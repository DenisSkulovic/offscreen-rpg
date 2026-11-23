import { constants } from 'node:fs';
import { link, mkdir, open, readFile, stat, unlink } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  assertByteCeiling,
  assertObjectKey,
  maximumObjectBytes,
  ObjectStorageError,
  type ObjectStorage,
  type PutIfAbsentResult,
} from './object-storage.js';

/**
 * Immutable local bytes. Exclusive staged write, fsync, then hard-link promotion.
 * An existing final path is left untouched.
 */
export class LocalObjectStorage implements ObjectStorage {
  readonly root: string;

  constructor(root: string) {
    if (!root.trim()) throw new Error('Object storage root is required');
    this.root = resolve(root);
  }

  async putIfAbsent(
    key: string,
    bytes: Uint8Array,
    contentType: string,
  ): Promise<PutIfAbsentResult> {
    requireContentType(contentType);
    if (bytes.byteLength > maximumObjectBytes) {
      throw new ObjectStorageError('too-large');
    }
    const path = this.resolveKey(key);
    try {
      const created = await durableExclusiveWrite(path, bytes);
      return created ? 'written' : 'already-exists';
    } catch (error) {
      if (error instanceof ObjectStorageError) throw error;
      throw new ObjectStorageError('unavailable', { cause: error });
    }
  }

  async get(key: string, maxBytes: number): Promise<Uint8Array> {
    assertByteCeiling(maxBytes);
    const path = this.resolveKey(key);
    try {
      const info = await stat(path);
      if (info.size > maxBytes) throw new ObjectStorageError('too-large');
      const bytes = await readFile(path);
      if (bytes.byteLength > maxBytes)
        throw new ObjectStorageError('too-large');
      return bytes;
    } catch (error) {
      if (error instanceof ObjectStorageError) throw error;
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new ObjectStorageError('missing', { cause: error });
      }
      throw new ObjectStorageError('unavailable', { cause: error });
    }
  }

  async exists(key: string): Promise<boolean> {
    const path = this.resolveKey(key);
    try {
      await stat(path);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
      throw new ObjectStorageError('unavailable', { cause: error });
    }
  }

  private resolveKey(key: string) {
    assertObjectKey(key);
    const path = resolve(this.root, ...key.split('/'));
    const fromRoot = relative(this.root, path);
    if (fromRoot.startsWith('..') || fromRoot === '') {
      throw new ObjectStorageError('invalid-key');
    }
    return path;
  }
}

async function durableExclusiveWrite(path: string, bytes: Uint8Array) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${randomUUID()}.staged`;
  let handle;
  try {
    handle = await open(
      temporary,
      constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY,
    );
    await handle.writeFile(bytes);
    await handle.sync();
    await handle.close();
    handle = undefined;
    try {
      await link(temporary, path);
      await unlink(temporary);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      await unlink(temporary).catch(() => undefined);
      return false;
    }
  } catch (error) {
    await handle?.close().catch(() => undefined);
    await unlink(temporary).catch(() => undefined);
    throw error;
  }
}

function requireContentType(contentType: string) {
  if (!contentType.trim()) throw new Error('Object content type is required');
}
