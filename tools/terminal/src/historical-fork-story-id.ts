import { createHash } from 'node:crypto';

function formatNamespacedUuid(bytes: Uint8Array) {
  const normalized = new Uint8Array(bytes.subarray(0, 16));
  normalized[6] = ((normalized[6] ?? 0) & 0x0f) | 0x50;
  normalized[8] = ((normalized[8] ?? 0) & 0x3f) | 0x80;
  const hex = [...normalized]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const FORK_STORY_SEED = (sourceStoryId: string, sequence: number) =>
  `offscreen:fork-story:${sourceStoryId}:${sequence}`;

/** Same seed shape as web `historicalForkStoryId`. */
export function historicalForkStoryId(
  sourceStoryId: string,
  sequence: number,
): string {
  const encoded = Buffer.from(FORK_STORY_SEED(sourceStoryId, sequence), 'utf8');
  const digest = createHash('sha256').update(encoded).digest();
  return formatNamespacedUuid(new Uint8Array(digest));
}
