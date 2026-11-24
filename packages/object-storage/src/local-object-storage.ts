import { constants, type Stats } from 'node:fs';
import {
  type FileHandle,
  link,
  lstat,
  mkdir,
  open,
  stat,
  unlink,
} from 'node:fs/promises';
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
    let handle: FileHandle | undefined;
    try {
      handle = await openLocalObject(path);
      const info = await handle.stat();
      if (!info.isFile()) throw new ObjectStorageError('unavailable');
      return await readBoundedFile(handle, maxBytes);
    } catch (error) {
      if (error instanceof ObjectStorageError) throw error;
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new ObjectStorageError('missing', { cause: error });
      }
      throw new ObjectStorageError('unavailable', { cause: error });
    } finally {
      await handle?.close().catch(() => undefined);
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

const readChunkBytes = 64 * 1024;

/**
 * Open the final path without following a final-component symlink.
 * Where O_NOFOLLOW is absent, lstat and refuse a symlink or non-file first.
 * Parent-directory symlink races are outside this check.
 */
async function openLocalObject(path: string): Promise<FileHandle> {
  const noFollow = constants.O_NOFOLLOW;
  if (typeof noFollow === 'number') {
    return open(path, constants.O_RDONLY | noFollow);
  }
  const linkInfo: Stats = await lstat(path);
  if (linkInfo.isSymbolicLink() || !linkInfo.isFile()) {
    throw new ObjectStorageError('unavailable');
  }
  return open(path, constants.O_RDONLY);
}

async function readBoundedFile(
  handle: FileHandle,
  maxBytes: number,
): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const room = maxBytes + 1 - total;
    const toRead = Math.min(readChunkBytes, room);
    const buffer = Buffer.allocUnsafe(toRead);
    const { bytesRead } = await handle.read(buffer, 0, toRead, null);
    if (bytesRead === 0) break;
    total += bytesRead;
    if (total > maxBytes) throw new ObjectStorageError('too-large');
    chunks.push(
      bytesRead === buffer.byteLength ? buffer : buffer.subarray(0, bytesRead),
    );
  }
  return assembleChunks(chunks, total);
}

function assembleChunks(chunks: Uint8Array[], total: number) {
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
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
