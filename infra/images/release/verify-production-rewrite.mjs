import { readFileSync } from 'node:fs';
import {
  LAB_NEST_SERVICE_ORIGIN,
  LOOPBACK_NEST_ORIGIN,
} from './release-service-origin.mjs';

const API_REWRITE_SOURCE = '/api/:path*';

/**
 * @param {string} routesManifestPath
 * @returns {string}
 */
export function readApiRewriteDestination(routesManifestPath) {
  const manifest = JSON.parse(readFileSync(routesManifestPath, 'utf8'));
  const rewrite = manifest.rewrites?.afterFiles?.find(
    (entry) => entry.source === API_REWRITE_SOURCE,
  );
  if (!rewrite?.destination) {
    throw new Error(`missing ${API_REWRITE_SOURCE} rewrite in routes manifest`);
  }
  return rewrite.destination;
}

/**
 * @param {string} destination
 */
export function assertReleaseRewriteNotLoopback(destination) {
  if (/127\.0\.0\.1|localhost/i.test(destination)) {
    throw new Error(
      `release /api rewrite must not target loopback (got ${destination})`,
    );
  }
}

/**
 * @param {string} destination
 * @param {string} [expectedOrigin]
 */
export function assertReleaseRewriteMatchesNestService(
  destination,
  expectedOrigin = LAB_NEST_SERVICE_ORIGIN,
) {
  const expectedPrefix = `${expectedOrigin}/api/`;
  if (!destination.startsWith(expectedPrefix)) {
    throw new Error(
      `release /api rewrite expected prefix ${expectedPrefix}, got ${destination}`,
    );
  }
}

/**
 * @param {string} destination
 */
export function assertLocalDevRewriteUsesLoopback(destination) {
  const expected = `${LOOPBACK_NEST_ORIGIN}/api/:path*`;
  if (destination !== expected) {
    throw new Error(
      `local dev /api rewrite expected ${expected}, got ${destination}`,
    );
  }
}