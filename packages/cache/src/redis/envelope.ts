import { type CacheEntry, isCacheEntryLive } from '../core/cache-store.js';

export const REDIS_ENTRY_MAX_BYTES = 1_048_576;
const REDIS_ENTRY_MAX_ENCODED_BASE64_LENGTH =
  Math.ceil(REDIS_ENTRY_MAX_BYTES / 3) * 4;
const REDIS_ENVELOPE_RAW_MAX_LENGTH =
  REDIS_ENTRY_MAX_ENCODED_BASE64_LENGTH + 256;
const CANONICAL_BASE64_PATTERN =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$/;

type EnvelopeV1 = Readonly<{
  v: 1;
  p: string;
  o: number;
  e: number;
}>;

export function encodeEnvelope(entry: CacheEntry): string {
  const envelope: EnvelopeV1 = {
    v: 1,
    p: Buffer.from(entry.bytes).toString('base64'),
    o: entry.observedAtMs,
    e: entry.expiresAtMs,
  };
  return JSON.stringify(envelope);
}

function isCanonicalBase64Payload(encoded: string): boolean {
  if (
    encoded.length === 0 ||
    encoded.length > REDIS_ENTRY_MAX_ENCODED_BASE64_LENGTH
  ) {
    return false;
  }
  return CANONICAL_BASE64_PATTERN.test(encoded);
}

export function decodeEnvelope(
  raw: string,
  nowMs: number,
):
  | { kind: 'hit'; entry: CacheEntry }
  | { kind: 'bypass'; reason: 'invalid' | 'expired' | 'oversize' } {
  if (raw.length > REDIS_ENVELOPE_RAW_MAX_LENGTH) {
    return { kind: 'bypass', reason: 'invalid' };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { kind: 'bypass', reason: 'invalid' };
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    (parsed as EnvelopeV1).v !== 1
  ) {
    return { kind: 'bypass', reason: 'invalid' };
  }
  const envelope = parsed as EnvelopeV1;
  if (typeof envelope.p !== 'string') {
    return { kind: 'bypass', reason: 'invalid' };
  }
  if (envelope.p.length > 0 && !isCanonicalBase64Payload(envelope.p)) {
    return { kind: 'bypass', reason: 'invalid' };
  }
  if (!Number.isSafeInteger(envelope.o) || !Number.isSafeInteger(envelope.e)) {
    return { kind: 'bypass', reason: 'invalid' };
  }
  if (envelope.o > envelope.e) {
    return { kind: 'bypass', reason: 'invalid' };
  }
  if (envelope.e <= nowMs) {
    return { kind: 'bypass', reason: 'expired' };
  }
  let bytes: Uint8Array;
  if (envelope.p.length === 0) {
    bytes = new Uint8Array(0);
  } else {
    try {
      const buf = Buffer.from(envelope.p, 'base64');
      if (buf.length > REDIS_ENTRY_MAX_BYTES) {
        return { kind: 'bypass', reason: 'oversize' };
      }
      bytes = new Uint8Array(buf);
    } catch {
      return { kind: 'bypass', reason: 'invalid' };
    }
  }
  const entry: CacheEntry = {
    bytes,
    observedAtMs: envelope.o,
    expiresAtMs: envelope.e,
  };
  if (!isCacheEntryLive(entry, nowMs)) {
    return { kind: 'bypass', reason: 'expired' };
  }
  return {
    kind: 'hit',
    entry: {
      bytes: new Uint8Array(entry.bytes),
      observedAtMs: entry.observedAtMs,
      expiresAtMs: entry.expiresAtMs,
    },
  };
}
