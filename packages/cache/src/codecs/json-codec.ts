import type { CacheCodec } from '../core/cache-store.js';

/**
 * JSON cache codec: values round-trip through JSON.stringify/parse with caller-side schema validation.
 */
export function jsonCodec<T>(parse: (value: unknown) => T): CacheCodec<T> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder('utf-8', { fatal: true });

  return {
    encode(value: T): Uint8Array {
      return encoder.encode(JSON.stringify(value));
    },
    decode(bytes: Uint8Array): T {
      let text: string;
      try {
        text = decoder.decode(bytes);
      } catch (cause) {
        throw new Error('Cache JSON codec requires valid UTF-8 bytes', {
          cause,
        });
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch (cause) {
        throw new Error('Cache JSON codec received malformed JSON', { cause });
      }
      return parse(parsed);
    },
  };
}
