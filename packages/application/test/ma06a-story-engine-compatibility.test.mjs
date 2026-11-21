import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../..');
const domains = ['stories', 'campaign', 'storyteller', 'generations'];
const require = createRequire(
  pathToFileURL(join(repoRoot, 'packages/application/package.json')),
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

test('application domain modules are direct story-engine reexports', () => {
  const forwarder =
    /^export \* from '@offscreen\/story-engine\/(?:stories|campaign|storyteller|generations)\/[^']+';\n$/;
  const files = domains.flatMap((domain) =>
    walk(join(repoRoot, 'packages/application/src', domain)).filter((file) =>
      file.endsWith('.ts'),
    ),
  );
  assert.ok(files.length > 0);
  for (const file of files) {
    assert.match(readFileSync(file, 'utf8'), forwarder, file);
  }
});

test('historic application dist imports are the story-engine functions', () => {
  const specs = new Set();
  const importPattern =
    /(?:from|import)\s*(?:\(\s*)?['"](\.\.\/dist\/(?:stories|campaign|storyteller|generations)\/[^'"]+)['"]/g;
  for (const file of walk(join(repoRoot, 'packages/application/test'))) {
    if (!/\.(mjs|js|ts)$/.test(file)) continue;
    for (const match of readFileSync(file, 'utf8').matchAll(importPattern)) {
      specs.add(match[1]);
    }
  }
  assert.ok(specs.size >= 81);
  for (const spec of specs) {
    const relativeDist = spec.replace('../dist/', '');
    const applicationExports = require(
      join(repoRoot, 'packages/application/dist', relativeDist),
    );
    const engineExports = require(
      join(repoRoot, 'packages/story-engine/dist', relativeDist),
    );
    assert.deepEqual(
      Object.keys(applicationExports).sort(),
      Object.keys(engineExports).sort(),
      relativeDist,
    );
    for (const key of Object.keys(engineExports)) {
      assert.equal(
        applicationExports[key],
        engineExports[key],
        `${relativeDist}#${key}`,
      );
    }
  }
});
