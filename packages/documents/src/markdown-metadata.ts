import { createHash } from 'node:crypto';
import { basename, extname } from 'node:path';

export function stableNamespacedDocumentId(
  namespace: string,
  ownerId: string,
  path: string,
) {
  const bytes = createHash('sha256')
    .update(`offscreen:${namespace}:${ownerId}:${path}`)
    .digest()
    .subarray(0, 16);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x50;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function markdownTitle(path: string, content: string) {
  const heading = content
    .split(/\r?\n/u)
    .map((line) => /^#\s+(.+?)\s*$/u.exec(line)?.[1]?.trim())
    .find((value) => value);
  if (heading) return heading;
  const name = basename(path, extname(path)).replaceAll(/[-_]+/gu, ' ').trim();
  return name || 'Untitled document';
}

export function markdownSections(content: string) {
  return content.split(/\r?\n/u).flatMap((line, index) => {
    const match = /^(#{1,6})\s+(.+?)\s*$/u.exec(line);
    if (!match?.[1] || !match[2]) return [];
    return [
      {
        heading: match[2].trim().slice(0, 240),
        level: match[1].length,
        line: index + 1,
      },
    ];
  });
}
