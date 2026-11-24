import type { CacheCodec } from '../core/cache-store.js';

/** Byte-preserving codec that copies on encode and decode so callers cannot mutate stored bytes. */
export function bytesCodec(): CacheCodec<Uint8Array> {
  return {
    encode(value: Uint8Array): Uint8Array {
      return new Uint8Array(value);
    },
    decode(bytes: Uint8Array): Uint8Array {
      return new Uint8Array(bytes);
    },
  };
}
