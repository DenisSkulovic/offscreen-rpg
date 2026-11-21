import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../..');
const legacyTestsRoot = here;
const require = createRequire(
  pathToFileURL(join(repoRoot, 'packages/story-engine/package.json')),
);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function sourceSpecifiers(text) {
  const specs = [];
  const pattern = /(?:from|import)\s*(?:\(\s*)?['"]([^'"]+)['"]/g;
  for (const match of text.matchAll(pattern)) {
    specs.push(match[1]);
  }
  return specs;
}

test('story-engine source and manifest do not import application', () => {
  const manifest = JSON.parse(
    readFileSync(join(repoRoot, 'packages/story-engine/package.json'), 'utf8'),
  );
  const declared = {
    ...manifest.dependencies,
    ...manifest.devDependencies,
    ...manifest.peerDependencies,
  };
  assert.equal(declared['@offscreen/application'], undefined);

  const hits = [];
  for (const file of walk(join(repoRoot, 'packages/story-engine/src'))) {
    if (!file.endsWith('.ts')) continue;
    for (const spec of sourceSpecifiers(readFileSync(file, 'utf8'))) {
      if (spec.startsWith('@offscreen/application')) {
        hits.push(`${relative(repoRoot, file)} -> ${spec}`);
      }
    }
  }
  assert.deepEqual(hits, []);
});

test('an application import is visible to the same specifier scan', () => {
  const specs = sourceSpecifiers(
    "import { createStories } from '@offscreen/application/stories';",
  );
  assert.ok(specs.includes('@offscreen/application/stories'));
});

test('direct story-engine owned dist exports resolve', () => {
  const samples = [
    'stories/index.js',
    'stories/errors.js',
    'campaign/settings.js',
    'storyteller/records.js',
    'generations/scripted-continuations.js',
  ];
  for (const subpath of samples) {
    const mod = require(join(repoRoot, 'packages/story-engine/dist', subpath));
    assert.ok(
      Object.keys(mod).length > 0,
      `story-engine dist/${subpath} has exports`,
    );
  }
});

test('relocated legacy tests use story-engine dist imports, not application dist', () => {
  const specs = new Set();
  const importPattern =
    /(?:from|import)\s*(?:\(\s*)?['"]([^'"]*packages\/story-engine\/dist\/[^'"]+)['"]/g;
  for (const file of walk(legacyTestsRoot)) {
    if (!/\.test\.mjs$/.test(file)) continue;
    for (const match of readFileSync(file, 'utf8').matchAll(importPattern)) {
      specs.add(match[1]);
    }
  }
  assert.ok(specs.size >= 81, `expected many story-engine dist imports, got ${specs.size}`);
  for (const spec of specs) {
    const distPath = spec.replace(/^(\.\.\/)+packages\/story-engine\/dist\//, '');
    const engineExports = require(
      join(repoRoot, 'packages/story-engine/dist', distPath),
    );
    assert.ok(Object.keys(engineExports).length > 0, distPath);
  }
});

test('negative: relocated legacy tests do not import application package paths', () => {
  const hits = [];
  for (const file of walk(legacyTestsRoot)) {
    if (!/\.test\.mjs$/.test(file)) continue;
    if (file.endsWith('ma06a-story-engine-compatibility.test.mjs')) continue;
    for (const spec of sourceSpecifiers(readFileSync(file, 'utf8'))) {
      if (spec.startsWith('@offscreen/application')) {
        hits.push(`${relative(repoRoot, file)} -> ${spec}`);
      }
    }
  }
  assert.deepEqual(hits, []);
});