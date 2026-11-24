import { createHash } from 'node:crypto';

/** Key-sorted JSON digest; drops only root-level id and prevId (DB01 frozen baseline). */
export function canonicalSnapshotDigest(
  snapshot: Record<string, unknown>,
): string {
  const canonical = canonicalize(snapshot, true);
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

function canonicalize(value: unknown, isRoot: boolean): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalize(entry, false));
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    if (isRoot && (key === 'id' || key === 'prevId')) {
      continue;
    }
    out[key] = canonicalize(record[key], false);
  }
  return out;
}