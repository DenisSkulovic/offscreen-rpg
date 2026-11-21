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
  storyEngineDomain,
  stronglyConnectedComponents,
  typeOnlyCycles,
} from './module-graph-core.mjs';
import {
  buildModuleGraph,
  collectRequireSpecifiers,
  isApplicationImportBanScope,
  isForbiddenApplicationSpecifier,
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

test('a synthetic forbidden application import in production scope fails', () => {
  const report = buildModuleGraph({
    baselineSha: 'abc',
    typescript,
    packages: [
      packageRecord('apps/api', '@offscreen/api', { '.': './dist/index.js' }),
      packageRecord('packages/application', '@offscreen/application', {
        '.': './dist/index.js',
      }),
    ],
    sources: [
      {
        path: 'apps/api/src/app.ts',
        text: "import { createDrafts } from '@offscreen/application/drafts';\n",
      },
    ],
  });
  assert.equal(report.result, 'fail');
  assert.ok(
    report.errors.some(
      (item) =>
        item.code === 'forbidden-production-application-import' &&
        item.file === 'apps/api/src/app.ts',
    ),
  );
});

test('comment-only application mention and legacy test imports stay out of scope', () => {
  const host = buildModuleGraph({
    baselineSha: 'abc',
    typescript,
    packages: [
      packageRecord('apps/worker', '@offscreen/worker', {
        '.': './dist/index.js',
      }),
    ],
    sources: [
      {
        path: 'apps/worker/src/runtime/index.ts',
        text: "// import { createOutbox } from '@offscreen/application/outbox';\nexport const ready = true;\n",
      },
    ],
  });
  assert.ok(
    !host.errors.some(
      (item) => item.code === 'forbidden-production-application-import',
    ),
  );
  assert.equal(
    isApplicationImportBanScope('packages/application/test/wr07b.test.mjs'),
    false,
  );
  assert.equal(
    isForbiddenApplicationSpecifier('@offscreen/application/stories'),
    true,
  );
  const legacy = buildModuleGraph({
    baselineSha: 'abc',
    typescript,
    packages: [
      packageRecord('packages/application', '@offscreen/application', {
        '.': './dist/index.js',
        './stories': './dist/stories/index.js',
      }),
    ],
    sources: [
      {
        path: 'packages/application/test/compat.test.mjs',
        text: "import { StoryError } from '@offscreen/application/stories';\n",
      },
    ],
  });
  assert.ok(
    !legacy.errors.some(
      (item) => item.code === 'forbidden-production-application-import',
    ),
  );
});

test('repo-tools require of application fails and comments do not', () => {
  assert.deepEqual(
    collectRequireSpecifiers(
      "const mod = require('@offscreen/application/outbox');\n",
    ).map((item) => item.specifier),
    ['@offscreen/application/outbox'],
  );
  assert.deepEqual(
    collectRequireSpecifiers("// require('@offscreen/application/outbox')\n"),
    [],
  );
  const report = buildModuleGraph({
    baselineSha: 'abc',
    typescript,
    packages: [],
    sources: [
      {
        path: 'scripts/repo-tools/synthetic-forbidden.mjs',
        text: "const x = require('@offscreen/application/drafts');\n",
      },
    ],
  });
  assert.equal(report.result, 'fail');
  assert.ok(
    report.errors.some(
      (item) => item.code === 'forbidden-production-application-import',
    ),
  );
});

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

test('story engine domains map the four production namespaces', () => {
  assert.equal(
    storyEngineDomain('packages/story-engine/src/stories/index.ts'),
    'story-engine:authority.stories',
  );
  assert.equal(
    storyEngineDomain('packages\\story-engine\\src\\campaign\\narration.ts'),
    'story-engine:authority.campaign',
  );
  assert.equal(
    storyEngineDomain('packages/story-engine/src/storyteller/admission.ts'),
    'story-engine:writer',
  );
  assert.equal(
    storyEngineDomain('packages/story-engine/src/generations/orchestrator.ts'),
    'story-engine:generation',
  );
  assert.equal(
    storyEngineDomain('packages/story-engine/src/stories/nested/module.ts'),
    'story-engine:authority.stories',
  );
});

test('story engine domain refuses lookalike, test, generated and non-module paths', () => {
  assert.equal(
    storyEngineDomain('packages/story-engine-extra/src/stories/index.ts'),
    null,
  );
  assert.equal(
    storyEngineDomain('packages/application/src/stories/index.ts'),
    null,
  );
  assert.equal(
    storyEngineDomain('packages/story-engine/src/stories/index.test.ts'),
    null,
  );
  assert.equal(
    storyEngineDomain('packages/story-engine/src/stories/__tests__/helper.ts'),
    null,
  );
  assert.equal(
    storyEngineDomain('packages/story-engine/src/campaign/generated/stub.ts'),
    null,
  );
  assert.equal(
    storyEngineDomain('packages/story-engine/src/dist/stories/index.ts'),
    null,
  );
  assert.equal(storyEngineDomain('packages/story-engine/src/index.ts'), null);
  assert.equal(storyEngineDomain('packages/story-engine/src/stories'), null);
  assert.equal(
    storyEngineDomain('packages/story-engine/src/custody/ledger.ts'),
    null,
  );
  assert.equal(
    storyEngineDomain('packages/story-engine/dist/stories/index.ts'),
    null,
  );
});

const storyEnginePackage = packageRecord(
  'packages/story-engine',
  '@offscreen/story-engine',
  { '.': './dist/index.js' },
);

test('story engine runtime same-domain relative import forms a file SCC', () => {
  const report = buildModuleGraph({
    baselineSha: 'test',
    typescript,
    packages: [storyEnginePackage],
    sources: [
      {
        path: 'packages/story-engine/src/stories/a.ts',
        text: "import { b } from './b.js';\nexport const a = b;\n",
      },
      {
        path: 'packages/story-engine/src/stories/b.ts',
        text: "import { a } from './a.js';\nexport const b = a;\n",
      },
    ],
  });
  assert.deepEqual(report.storyEngineRuntimeFileSccs, [
    [
      'packages/story-engine/src/stories/a.ts',
      'packages/story-engine/src/stories/b.ts',
    ],
  ]);
  assert.deepEqual(report.storyEngineRuntimeDomainSccs, []);
  assert.equal(report.storyEngineFileEdges.length, 2);
});

test('story engine type-only same-domain import forms only a type-only file SCC', () => {
  const report = buildModuleGraph({
    baselineSha: 'test',
    typescript,
    packages: [storyEnginePackage],
    sources: [
      {
        path: 'packages/story-engine/src/stories/a.ts',
        text: "import type { B } from './b.js';\nexport type A = B;\n",
      },
      {
        path: 'packages/story-engine/src/stories/b.ts',
        text: "import type { A } from './a.js';\nexport type B = A;\n",
      },
    ],
  });
  assert.deepEqual(report.storyEngineRuntimeFileSccs, []);
  assert.deepEqual(report.storyEngineTypeOnlyFileSccs, [
    [
      'packages/story-engine/src/stories/a.ts',
      'packages/story-engine/src/stories/b.ts',
    ],
  ]);
});

test('known authority-writer debt warns and a sixth runtime import fails', () => {
  const admission = {
    path: 'packages/story-engine/src/storyteller/admission.ts',
    text: 'export const prepareStorytellerResolution = 1;\n',
  };
  const known = buildModuleGraph({
    baselineSha: 'test',
    typescript,
    packages: [storyEnginePackage],
    sources: [
      admission,
      {
        path: 'packages/story-engine/src/stories/resolution.ts',
        text: "import { prepareStorytellerResolution } from '../storyteller/admission.js';\n",
      },
    ],
  });
  assert.ok(
    known.warnings.some((item) => item.code === 'authority-writer-debt'),
  );
  assert.ok(
    !known.errors.some(
      (item) => item.code === 'forbidden-authority-writer-import',
    ),
  );

  const forbidden = buildModuleGraph({
    baselineSha: 'test',
    typescript,
    packages: [storyEnginePackage],
    sources: [
      admission,
      {
        path: 'packages/story-engine/src/stories/new.ts',
        text: "import { prepareStorytellerResolution } from '../storyteller/admission.js';\n",
      },
    ],
  });
  assert.ok(
    forbidden.errors.some(
      (item) =>
        item.code === 'forbidden-authority-writer-import' &&
        item.file === 'packages/story-engine/src/stories/new.ts',
    ),
  );
  assert.equal(forbidden.result, 'fail');
});

test('type-only authority to writer import stays neutral', () => {
  const report = buildModuleGraph({
    baselineSha: 'test',
    typescript,
    packages: [storyEnginePackage],
    sources: [
      {
        path: 'packages/story-engine/src/storyteller/admission.ts',
        text: 'export type StorytellerAdmission = { ready: true };\n',
      },
      {
        path: 'packages/story-engine/src/stories/resolution.ts',
        text: "import type { StorytellerAdmission } from '../storyteller/admission.js';\n",
      },
    ],
  });
  assert.ok(
    !report.warnings.some((item) => item.code === 'authority-writer-debt'),
  );
  assert.ok(
    !report.errors.some(
      (item) => item.code === 'forbidden-authority-writer-import',
    ),
  );
  assert.deepEqual(report.storyEngineRuntimeDomainSccs, []);
});

test('forbidden engine-to-lab and pure-to-engine package runtime imports fail', () => {
  const engineToLab = buildModuleGraph({
    baselineSha: 'test',
    typescript,
    packages: [
      storyEnginePackage,
      packageRecord('packages/lab-support', '@offscreen/lab-support', {
        '.': './dist/index.js',
      }),
    ],
    sources: [
      {
        path: 'packages/story-engine/src/stories/index.ts',
        text: "import { bench } from '@offscreen/lab-support';\nexport const value = bench;\n",
      },
    ],
  });
  assert.ok(
    engineToLab.errors.some((item) => item.code === 'forbidden-engine-to-lab'),
  );

  const pureToEngine = buildModuleGraph({
    baselineSha: 'test',
    typescript,
    packages: [
      storyEnginePackage,
      packageRecord(
        'packages/game',
        '@offscreen/game',
        { '.': './dist/index.js' },
        { '@offscreen/story-engine': 'workspace:*' },
      ),
    ],
    sources: [
      {
        path: 'packages/game/src/effects.ts',
        text: "import { createStoryResolution } from '@offscreen/story-engine';\nexport const ready = createStoryResolution;\n",
      },
    ],
  });
  assert.ok(
    pureToEngine.errors.some(
      (item) => item.code === 'forbidden-pure-to-application',
    ),
  );
});

test('legacy application graph fields and schema stay stable', () => {
  const report = buildModuleGraph({
    baselineSha: 'test',
    typescript,
    packages: [storyEnginePackage],
    sources: [
      {
        path: 'packages/story-engine/src/stories/index.ts',
        text: 'export const ready = true;\n',
      },
    ],
  });
  assert.equal(report.schema, SCHEMA);
  assert.ok(Array.isArray(report.domainEdges));
  assert.ok(Array.isArray(report.runtimePackageSccs));
  assert.ok(Array.isArray(report.storyEngineFileEdges));
  assert.ok(Array.isArray(report.storyEngineRuntimeFileSccs));
});
