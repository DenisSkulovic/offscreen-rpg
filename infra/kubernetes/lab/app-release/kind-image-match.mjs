#!/usr/bin/env node
// Decide whether kind already has the same local image id.
export function shouldSkipKindLoad(localId, nodeIds) {
  if (typeof localId !== 'string' || localId.length === 0) return false;
  if (!Array.isArray(nodeIds)) return false;
  return nodeIds.some((id) => typeof id === 'string' && id.length > 0 && id === localId);
}

function isCli() {
  return process.argv[1] && process.argv[1].endsWith('kind-image-match.mjs');
}

if (isCli()) {
  const localId = process.argv[2] ?? '';
  const nodeIds = process.argv.slice(3);
  process.exit(shouldSkipKindLoad(localId, nodeIds) ? 0 : 1);
}
