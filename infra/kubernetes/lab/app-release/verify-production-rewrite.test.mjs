import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { LAB_NEST_SERVICE_ORIGIN } from './lab-nest-service-origin.mjs';
import {
  assertLocalDevRewriteUsesLoopback,
  assertReleaseRewriteMatchesNestService,
  assertReleaseRewriteNotLoopback,
  readApiRewriteDestination,
} from './verify-production-rewrite.mjs';

function writeManifest(dir, destination) {
  writeFileSync(
    join(dir, 'routes-manifest.json'),
    JSON.stringify({
      rewrites: {
        afterFiles: [{ source: '/api/:path*', destination }],
      },
    }),
  );
}

describe('verify-production-rewrite', () => {
  it('rejects loopback destinations for release builds', () => {
    assert.throws(
      () =>
        assertReleaseRewriteNotLoopback(
          'http://127.0.0.1:3001/api/:path*',
        ),
      /must not target loopback/,
    );
    assert.throws(
      () =>
        assertReleaseRewriteNotLoopback(
          'http://localhost:3001/api/stories',
        ),
      /must not target loopback/,
    );
  });

  it('accepts lab Nest Service DNS for release builds', () => {
    const destination = `${LAB_NEST_SERVICE_ORIGIN}/api/:path*`;
    assert.doesNotThrow(() => assertReleaseRewriteNotLoopback(destination));
    assert.doesNotThrow(() =>
      assertReleaseRewriteMatchesNestService(destination),
    );
  });

  it('reads /api rewrite destination from routes-manifest.json', () => {
    const dir = mkdtempSync(join(tmpdir(), 'next-routes-'));
    try {
      writeManifest(dir, `${LAB_NEST_SERVICE_ORIGIN}/api/:path*`);
      assert.equal(
        readApiRewriteDestination(join(dir, 'routes-manifest.json')),
        `${LAB_NEST_SERVICE_ORIGIN}/api/:path*`,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('expects loopback rewrite for default local dev build', () => {
    assert.doesNotThrow(() =>
      assertLocalDevRewriteUsesLoopback('http://127.0.0.1:3001/api/:path*'),
    );
  });
});

describe('verify-production-rewrite integration', () => {
  it('validates existing apps/web production routes manifest when present', () => {
    const manifestPath = fileURLToPath(
      new URL('../../../apps/web/.next/routes-manifest.json', import.meta.url),
    );
    try {
      const destination = readApiRewriteDestination(manifestPath);
      const proxyOrigin = process.env.API_PROXY_ORIGIN;
      if (proxyOrigin === LAB_NEST_SERVICE_ORIGIN) {
        assertReleaseRewriteNotLoopback(destination);
        assertReleaseRewriteMatchesNestService(destination);
      } else if (proxyOrigin === undefined) {
        assertLocalDevRewriteUsesLoopback(destination);
      }
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        return;
      }
      throw error;
    }
  });
});