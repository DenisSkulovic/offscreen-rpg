import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createRequire } from 'node:module';
import {
  applicationDomain,
  runtimeCycles,
  sortEdges,
  stronglyConnectedComponents,
  typeOnlyCycles,
} from './module-graph-core.mjs';
import {
  buildModuleGraph,
  isProductionSource,
  renderHuman,
  renderMermaid,
  resolveRelative,
  SCHEMA,
} from './module-graph.mjs';

const require = createRequire(import.meta.url);
const typescript = require('typescript');

test('an acyclic four-node graph has no strongly connected component', () => {
  const nodes = ['a', 'b', 'c', 'd'];
  const edges = [
    { from: 'a', to: 'd', kind: 'runtime' },
    { from: 'b', to: 'c', kind: 'runtime' },
    { from: 'a', to: 'b', kind: 'runtime' },
  ];
  assert.deepEqual(stronglyConnectedComponents(nodes, edges), []);
  assert.deepEqual(runtimeCycles(nodes, edges), []);
});

test('a three-node runtime cycle is reported as one sorted component', () => {
  const nodes = ['c', 'a', 'b'];
  const edges = [
    { from: 'c', to: 'a', kind: 'runtime' },
    { from: 'a', to: 'b', kind: 'runtime' },
    { from: 'b', to: 'c', kind: 'reexport' },
  ];
  assert.deepEqual(runtimeCycles(nodes, edges), [['a', 'b', 'c']]);
});

test('type-only edges do not become a runtime cycle', () => {
  const nodes = ['stories', 'storyteller', 'documents'];
  const edges = [
    { from: 'stories', to: 'storyteller', kind: 'type-only' },
    { from: 'storyteller', to: 'stories', kind: 'type-only' },
    { from: 'stories', to: 'documents', kind: 'runtime' },
  ];
  assert.deepEqual(runtimeCycles(nodes, edges), []);
  assert.deepEqual(typeOnlyCycles(nodes, edges), [['stories', 'storyteller']]);
});

test('edge order does not change the component result', () => {
  const nodes = ['a', 'b'];
  const forward = [
    { from: 'b', to: 'a', kind: 'dynamic' },
    { from: 'a', to: 'b', kind: 'runtime' },
  ];
  const reverse = [...forward].reverse();
  assert.deepEqual(
    runtimeCycles(nodes, forward),
    runtimeCycles(nodes, reverse),
  );
  assert.deepEqual(
    sortEdges(reverse).map((edge) => edge.from),
    ['a', 'b'],
  );
});

test('index.js resolves to the TypeScript source under NodeNext', () => {
  const files = new Set([
    'packages/application/src/stories/index.ts',
    'packages/application/src/storyteller/recovery.ts',
  ]);
  assert.equal(
    resolveRelative(
      'packages/application/src/stories/index.ts',
      '../storyteller/recovery.js',
      files,
    ),
    'packages/application/src/storyteller/recovery.ts',
  );
  assert.equal(
    resolveRelative(
      'packages/application/src/stories/reader.ts',
      './index.js',
      files,
    ),
    'packages/application/src/stories/index.ts',
  );
});

test('a declared workspace import is a resolved source edge', () => {
  const report = buildModuleGraph({
    baselineSha: 'abc',
    typescript,
    packages: [
      packageRecord('packages/contracts', '@offscreen/contracts', {
        './stories': './dist/stories.js',
      }),
      packageRecord(
        'packages/application',
        '@offscreen/application',
        { '.': './dist/index.js' },
        { '@offscreen/contracts': 'workspace:*' },
      ),
    ],
    sources: [
      {
        path: 'packages/application/src/stories/index.ts',
        text: "import { story } from '@offscreen/contracts/stories';\nexport const value = story;\n",
      },
    ],
  });
  assert.equal(report.result, 'clear');
  assert.equal(report.sourceEdges[0]?.resolved, true);
  assert.equal(report.sourceEdges[0]?.toPackage, '@offscreen/contracts');
  assert.deepEqual(report.errors, []);
});

test('an undeclared production import and a missing export name the source file', () => {
  const report = buildModuleGraph({
    baselineSha: 'abc',
    typescript,
    packages: [
      packageRecord('packages/contracts', '@offscreen/contracts', {
        './stories': './dist/stories.js',
      }),
      packageRecord('packages/application', '@offscreen/application', {
        '.': './dist/index.js',
      }),
    ],
    sources: [
      {
        path: 'packages/application/src/stories/index.ts',
        text: "import { story } from '@offscreen/contracts/missing';\nimport { other } from '@offscreen/contracts/stories';\n",
      },
    ],
  });
  const codes = report.mismatches.map(
    (item) => `${item.code} ${item.file} ${item.specifier}`,
  );
  assert.ok(
    codes.includes(
      'unknown-export-subpath packages/application/src/stories/index.ts @offscreen/contracts/missing',
    ),
  );
  assert.ok(
    codes.includes(
      'undeclared-production-import packages/application/src/stories/index.ts @offscreen/contracts/stories',
    ),
  );
  assert.equal(report.result, 'fail');
});

test('a missing relative file is reported and a type-only cycle stays out of runtime', () => {
  const report = buildModuleGraph({
    baselineSha: 'abc',
    typescript,
    packages: [
      packageRecord('packages/application', '@offscreen/application', {
        '.': './dist/index.js',
      }),
    ],
    sources: [
      {
        path: 'packages/application/src/stories/index.ts',
        text: "import type { Draft } from '../storyteller/publication.js';\nimport { gone } from './absent.js';\n",
      },
      {
        path: 'packages/application/src/storyteller/publication.ts',
        text: "import type { Story } from '../stories/index.js';\n",
      },
    ],
  });
  assert.deepEqual(report.domainRuntimeSccs, []);
  assert.deepEqual(report.domainTypeOnlySccs, [['stories', 'storyteller']]);
  assert.ok(
    report.mismatches.some(
      (item) =>
        item.code === 'unresolved-relative' &&
        item.file === 'packages/application/src/stories/index.ts' &&
        item.specifier === './absent.js',
    ),
  );
  assert.equal(report.result, 'observed');
  assert.equal(renderHuman(report).includes('PASS'), false);
});

test('a JSON import resolves when the file exists beside the source scan', () => {
  const report = buildModuleGraph({
    baselineSha: 'abc',
    typescript,
    exists: (relative) =>
      relative === 'packages/storyteller/src/profiles/definitions/quiet.json',
    packages: [
      packageRecord('packages/storyteller', '@offscreen/storyteller', {
        '.': './dist/index.js',
      }),
    ],
    sources: [
      {
        path: 'packages/storyteller/src/profiles/index.ts',
        text: "import quiet from './definitions/quiet.json';\nexport const profile = quiet;\n",
      },
    ],
  });
  assert.equal(report.mismatches.length, 0);
});

test('stylesheet imports are not missing TypeScript modules', () => {
  const report = buildModuleGraph({
    baselineSha: 'abc',
    typescript,
    packages: [
      packageRecord('apps/web', '@offscreen/web', { '.': './dist/index.js' }),
    ],
    sources: [
      {
        path: 'apps/web/src/features/play/ui/story-frame.tsx',
        text: "import './story-frame.css';\n",
      },
    ],
  });
  assert.equal(report.mismatches.length, 0);
  assert.equal(report.result, 'clear');
});

test('tests may use devDependencies and stay off the production graph', () => {
  const report = buildModuleGraph({
    baselineSha: 'abc',
    typescript,
    packages: [
      packageRecord('packages/contracts', '@offscreen/contracts', {
        '.': './dist/index.js',
      }),
      packageRecord(
        'packages/application',
        '@offscreen/application',
        { '.': './dist/index.js' },
        {},
        { '@offscreen/contracts': 'workspace:*' },
      ),
    ],
    sources: [
      {
        path: 'packages/application/src/stories/index.test.ts',
        text: "import { story } from '@offscreen/contracts';\n",
      },
      {
        path: 'packages/application/dist/stories/generated.ts',
        text: "import { story } from '@offscreen/contracts';\n",
      },
    ],
  });
  assert.equal(
    isProductionSource('packages/application/src/stories/index.test.ts'),
    false,
  );
  assert.equal(
    isProductionSource('packages/application/dist/stories/generated.ts'),
    false,
  );
  assert.equal(report.sourceEdges[0]?.production, false);
  assert.equal(report.result, 'clear');
});

test('a manifest dependency cycle fails and a missing baseline cannot pass', () => {
  const cycle = buildModuleGraph({
    baselineSha: 'abc',
    typescript,
    packages: [
      packageRecord(
        'packages/cache',
        '@offscreen/cache',
        { '.': './dist/index.js' },
        { '@offscreen/application': 'workspace:*' },
      ),
      packageRecord(
        'packages/application',
        '@offscreen/application',
        { '.': './dist/index.js' },
        { '@offscreen/cache': 'workspace:*' },
      ),
    ],
    sources: [],
  });
  assert.equal(cycle.result, 'fail');
  assert.equal(cycle.errors[0]?.code, 'package-dependency-cycle');

  const missing = buildModuleGraph({
    baselineSha: null,
    typescript,
    packages: [],
    sources: [],
  });
  assert.equal(missing.result, 'unavailable');
  assert.equal(renderHuman(missing).includes('PASS'), false);
  const unparsed = buildModuleGraph({
    baselineSha: 'abc',
    typescript: null,
    packages: [],
    sources: [],
  });
  assert.equal(unparsed.errors[0]?.code, 'parser-unavailable');
  assert.equal(renderHuman(unparsed).includes('PASS'), false);
});

test('json is stable and mermaid is a compact flowchart', () => {
  const input = {
    baselineSha: 'abc',
    typescript,
    packages: [
      packageRecord('packages/application', '@offscreen/application', {
        '.': './dist/index.js',
      }),
    ],
    sources: [
      {
        path: 'packages/application/src/stories/index.ts',
        text: "import { admission } from '../storyteller/admission.js';\n",
      },
      {
        path: 'packages/application/src/storyteller/admission.ts',
        text: "export const admission = 1;\nimport { story } from '../stories/index.js';\n",
      },
    ],
  };
  const first = JSON.stringify(buildModuleGraph(input));
  const second = JSON.stringify(buildModuleGraph(input));
  assert.equal(first, second);
  const report = buildModuleGraph(input);
  assert.equal(report.schema, SCHEMA);
  const mermaid = renderMermaid(report);
  assert.match(mermaid, /^flowchart LR\n/u);
  assert.match(mermaid, /stories --> storyteller/u);
  assert.match(mermaid, /storyteller --> stories/u);
});

test('the command refuses a root that has no Git baseline', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'module-graph-'));
  try {
    const result = spawnSync(
      globalThis.process.execPath,
      ['scripts/repo-tools/module-graph.mjs', '--root', root, '--json'],
      { cwd: path.resolve(import.meta.dirname, '..', '..'), encoding: 'utf8' },
    );
    assert.equal(result.status, 2);
    assert.match(result.stdout, /"result": "unavailable"/u);
    assert.equal(result.stdout.includes('PASS'), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

function packageRecord(
  directory,
  name,
  exportsField,
  dependencies = {},
  devDependencies = {},
) {
  return {
    directory,
    name,
    manifest: { name, exports: exportsField, dependencies, devDependencies },
  };
}

test('application domains are the first source subdirectory', () => {
  assert.equal(
    applicationDomain('packages/application/src/stories/index.ts'),
    'stories',
  );
  assert.equal(
    applicationDomain('packages/application/src/storyteller/publication.ts'),
    'storyteller',
  );
  assert.equal(applicationDomain('packages/application/src/index.ts'), null);
  assert.equal(applicationDomain('packages/cache/src/index.ts'), null);
});
