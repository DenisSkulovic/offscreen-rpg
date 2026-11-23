/**
 * Physical object bytes only. Callers own names, hashes, schemas and equality.
 * 32 MiB is the hard ceiling for one put or one bounded get.
 */
export const maximumObjectBytes = 32 * 1024 * 1024;

export type ObjectStorageErrorCode =
  'missing' | 'unavailable' | 'too-large' | 'invalid-key' | 'conflict';

export class ObjectStorageError extends Error {
  constructor(
    readonly code: ObjectStorageErrorCode,
    options?: ErrorOptions,
  ) {
    super(code, options);
    this.name = 'ObjectStorageError';
  }
}

export type PutIfAbsentResult = 'written' | 'already-exists';

export interface ObjectStorage {
  putIfAbsent(
    key: string,
    bytes: Uint8Array,
    contentType: string,
  ): Promise<PutIfAbsentResult>;
  get(key: string, maxBytes: number): Promise<Uint8Array>;
  exists(key: string): Promise<boolean>;
}

const segment = /^[\x21-\x7E]+$/;

/** Reject traversal and non-ASCII before any disk or network key is used. */
export function assertObjectKey(key: string) {
  if (
    key.length === 0 ||
    key.length > 1024 ||
    key.includes('\\') ||
    key.startsWith('/')
  ) {
    throw new ObjectStorageError('invalid-key');
  }
  const parts = key.split('/');
  for (const part of parts) {
    if (
      part.length === 0 ||
      part === '.' ||
      part === '..' ||
      !segment.test(part)
    ) {
      throw new ObjectStorageError('invalid-key');
    }
  }
}

export function assertByteCeiling(maxBytes: number) {
  if (
    !Number.isInteger(maxBytes) ||
    maxBytes < 1 ||
    maxBytes > maximumObjectBytes
  ) {
    throw new ObjectStorageError('too-large');
  }
}

function concat(chunks: Uint8Array[], total: number) {
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

function asBytes(chunk: Uint8Array | string) {
  return typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
}

/**
 * Stop once `maxBytes` is exceeded. Never call `transformToString` or
 * `transformToByteArray`; those buffer the whole object first.
 */
export async function readBoundedBody(
  body: unknown,
  maxBytes: number,
): Promise<Uint8Array> {
  assertByteCeiling(maxBytes);
  if (body == null) {
    throw new ObjectStorageError('unavailable', {
      cause: new Error('empty-object-body'),
    });
  }
  if (typeof body === 'string' || body instanceof Uint8Array) {
    const bytes = asBytes(body);
    if (bytes.byteLength > maxBytes) throw new ObjectStorageError('too-large');
    return bytes;
  }
  if (typeof body !== 'object') {
    throw new ObjectStorageError('unavailable', {
      cause: new Error('unreadable-object-body'),
    });
  }
  const web = body as {
    getReader?: () => ReadableStreamDefaultReader<Uint8Array>;
  };
  if (typeof web.getReader === 'function') {
    return readWebStream(web.getReader(), maxBytes);
  }
  const iterable = body as AsyncIterable<Uint8Array | string>;
  if (typeof iterable[Symbol.asyncIterator] === 'function') {
    return readAsyncChunks(iterable, maxBytes);
  }
  throw new ObjectStorageError('unavailable', {
    cause: new Error('unreadable-object-body'),
  });
}

async function readWebStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  maxBytes: number,
) {
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const step = await reader.read();
      if (step.done) break;
      total += step.value.byteLength;
      if (total > maxBytes) throw new ObjectStorageError('too-large');
      chunks.push(step.value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  return concat(chunks, Math.min(total, maxBytes));
}

async function readAsyncChunks(
  body: AsyncIterable<Uint8Array | string>,
  maxBytes: number,
) {
  const chunks: Uint8Array[] = [];
  let total = 0;
  const iterator = body[Symbol.asyncIterator]();
  try {
    for (;;) {
      const step = await iterator.next();
      if (step.done) break;
      const bytes = asBytes(step.value);
      total += bytes.byteLength;
      if (total > maxBytes) throw new ObjectStorageError('too-large');
      chunks.push(bytes);
    }
  } finally {
    await iterator.return?.().catch(() => undefined);
  }
  return concat(chunks, total > maxBytes ? maxBytes : total);
}
