#!/usr/bin/env node
import { isValidSha256Digest } from '../distribution/kind-image-loader.mjs';

// True only when every node already has the exact host OCI index digest.
export function allNodesMatchDigest(expectedDigest, nodeDigests) {
  if (!isValidSha256Digest(expectedDigest)) {
    return false;
  }
  if (!Array.isArray(nodeDigests) || nodeDigests.length === 0) {
    return false;
  }
  return nodeDigests.every(
    (digest) =>
      typeof digest === 'string' &&
      isValidSha256Digest(digest) &&
      digest === expectedDigest,
  );
}

function isCli() {
  return Boolean(process.argv[1]?.endsWith('kind-image-match.mjs'));
}

if (isCli()) {
  const localId = process.argv[2] ?? '';
  const nodeIds = process.argv.slice(3).filter(Boolean);
  process.exit(allNodesMatchDigest(localId, nodeIds) ? 0 : 1);
}