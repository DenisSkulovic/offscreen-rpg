import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import test from 'node:test';
import {
  CODE_HEALTH_MISSING,
  countLines,
  hasPacketStyleTestBasename,
  isProductionSource,
  isTrackedTestSource,
  normalizePath,
  resolveStaticRelativeImport,
  scanCodeHealth,
  THRESHOLDS,
} from './code-health-core.mjs';
import {
  SCHEMA,
  buildBaselineReadSet,
  buildCodeHealthReport,
  buildDiagnosticsScope,
  collectWorkingEntries,
  createGitCapture,
  createGitShow,
  formatJsonReport,
  main,
  parseNulPaths,
  renderHuman,
} from './code-health.mjs';

function lineBlock(count, body = '// line') {
  return `${Array.from({ length: count }, (_, index) => `${body} ${index + 1}`).join('\n')}\n`;
}

/** @param {number} count @param {string} [dir] */
function entryPaths(count, dir = 'packages/sample/src') {
  return Array.from(
    { length: count },
    (_, index) => `${dir}/module-${String(index + 1).padStart(3, '0')}.ts`,
  );
}

function memoryReader(initial) {
  /** @type {Map<string, string>} */
  const files = new Map(Object.entries(initial));
  return {
    files,
    readText(path) {
      if (!files.has(path)) {
        const error = new Error(`missing ${path}`);
        error.code = CODE_HEALTH_MISSING;
        throw error;
      }
      return files.get(path);
    },
    readTextNull(path) {
      if (!files.has(path)) {
        return null;
      }
      return files.get(path);
    },
  };
}

test('countLines respects newline rules', () => {
  assert.equal(countLines(''), 0);
  assert.equal(countLines('a\n'), 1);
  assert.equal(countLines('a\nb'), 2);
  assert.equal(countLines('a\nb\n'), 2);
});

test('isProductionSource excludes tests, fixtures, and dist segments', () => {
  assert.equal(isProductionSource('packages/foo/bar.ts'), true);
  assert.equal(isProductionSource('packages/foo/bar.test.ts'), false);
  assert.equal(isProductionSource('packages/foo/fixtures/x.ts'), false);
  assert.equal(isProductionSource('packages/foo/dist/x.ts'), false);
  assert.equal(isProductionSource('docs/foo.ts'), false);
});

test('tracked test inventory is separate from production sizing', () => {
  const prod = 'packages/sample/src/live.ts';
  const unit = 'packages/sample/src/live.test.ts';
  const fixture = 'packages/sample/src/fixtures/demo.ts';
  const paths = [prod, unit, fixture];
  const { readText } = memoryReader({
    [prod]: lineBlock(10),
    [unit]: 'import test from "node:test";\n',
    [fixture]: 'export const fixture = 1;\n',
  });
  const report = scanCodeHealth(paths, { readText });
  assert.equal(report.summary.productionFiles, 1);
  assert.equal(report.summary.testFiles, 2);
  assert.equal(report.files[0].path, prod);
  assert.equal(report.files[0].lines, 10);
  assert.deepEqual(
    report.tests.map((item) => item.path),
    [fixture, unit],
  );
  assert.ok(isTrackedTestSource(unit));
  assert.ok(!isProductionSource(unit));
});

test('new packet-style test basenames are advisory naming debt', () => {
  const legacy = 'packages/cache/src/cache03-strategies.test.ts';
  const fresh = 'packages/cache/src/cq06-new-behavior.test.ts';
  const good = 'packages/cache/src/redis-connection.test.ts';
  const paths = [legacy, fresh, good];
  const { readText } = memoryReader(
    Object.fromEntries(
      paths.map((path) => [path, 'import test from "node:test";\n']),
    ),
  );
  const withoutBaseline = scanCodeHealth(paths, { readText });
  assert.ok(hasPacketStyleTestBasename(legacy));
  assert.ok(hasPacketStyleTestBasename(fresh));
  assert.ok(!hasPacketStyleTestBasename(good));
  const debtPaths = withoutBaseline.findings
    .filter((item) => item.kind === 'test-naming-packet-debt-new')
    .map((item) => item.path);
  assert.ok(debtPaths.includes(fresh));
  assert.ok(debtPaths.includes(legacy));

  const withBaseline = scanCodeHealth(paths, {
    readText,
    baselineEntries: [legacy, good],
    readBaseline(path) {
      return path === legacy || path === good
        ? 'import test from "node:test";\n'
        : null;
    },
  });
  const gatedPaths = withBaseline.findings
    .filter((item) => item.kind === 'test-naming-packet-debt-new')
    .map((item) => item.path);
  assert.deepEqual(gatedPaths, [fresh]);
});

test('production static imports from test paths are advisory with reason and line', () => {
  const prod = 'packages/cache/src/cache-adapter.ts';
  const source = `
import { createDisabledStore } from './core/test-stores.js';
import type { Fake } from './core/test-stores.js';
import { jsonCodec } from './codecs/json-codec.js';
`;
  const { readText } = memoryReader({ [prod]: source });
  const report = scanCodeHealth([prod], { readText });
  const boundary = report.findings.filter(
    (item) => item.kind === 'production-test-boundary-import',
  );
  assert.equal(boundary.length, 1);
  assert.equal(boundary[0].line, 2);
  assert.match(boundary[0].reason, /test-stores/);
  assert.equal(
    boundary[0].resolvedTarget,
    'packages/cache/src/core/test-stores.js',
  );
});

test('resolveStaticRelativeImport normalizes Windows-style separators', () => {
  const from = 'packages\\cache\\src\\adapter.ts';
  const resolved = resolveStaticRelativeImport(
    from,
    '..\\core\\test-stores.js',
  );
  assert.equal(resolved, 'packages/cache/core/test-stores.js');
  assert.equal(
    normalizePath('packages\\sample\\cq06-new.test.ts'),
    'packages/sample/cq06-new.test.ts',
  );
});

test('unchanged legacy production test helper imports stay below new-debt gate', () => {
  const prod = 'packages/cache/src/index.ts';
  const legacySource = `import { createDisabledStore } from './core/test-stores.js';\n`;
  const { readText } = memoryReader({ [prod]: legacySource });
  const withBaseline = scanCodeHealth([prod], {
    readText,
    baselineEntries: [prod],
    readBaseline(path) {
      return path === prod ? legacySource : null;
    },
  });
  assert.equal(
    withBaseline.findings.filter(
      (item) => item.kind === 'production-test-boundary-import',
    ).length,
    0,
  );
  assert.equal(withBaseline.strictRegressions.length, 0);
});

test('35 direct production files trigger directory-direct-files-review', () => {
  const paths = entryPaths(35);
  const { readText } = memoryReader(
    Object.fromEntries(paths.map((path) => [path, 'export const x = 1;\n'])),
  );
  const report = scanCodeHealth(paths, { readText });
  const kinds = report.findings.map((item) => item.kind);
  assert.ok(kinds.includes('directory-direct-files-review'));
  const dir = report.directories.find(
    (item) => item.path === 'packages/sample/src',
  );
  assert.ok(dir);
  assert.equal(dir.directFiles, 35);
});

test('63 flat storyteller files report hotspot without throwing', () => {
  const paths = entryPaths(63, 'packages/application/src/storyteller');
  const { readText } = memoryReader(
    Object.fromEntries(paths.map((path) => [path, 'export const s = 1;\n'])),
  );
  const report = scanCodeHealth(paths, { readText });
  assert.ok(
    report.findings.some(
      (item) => item.kind === 'directory-direct-files-review',
    ),
  );
  assert.equal(report.summary.productionFiles, 63);
});

test('1200-line module is file-lines-high', () => {
  const path = 'packages/large/huge.ts';
  const { readText } = memoryReader({ [path]: lineBlock(1200) });
  const report = scanCodeHealth([path], { readText });
  assert.ok(
    report.findings.some(
      (item) => item.kind === 'file-lines-high' && item.path === path,
    ),
  );
  assert.equal(report.files[0].lines, 1200);
});

test('class methods, accessors, and constructors count as function-like nodes', () => {
  const path = 'packages/ast/class-methods.ts';
  const source = `
export class Widget {
  constructor(
    private a: number,
    private b: number,
    private c: number,
    private d: number,
    private e: number,
    private f: number,
  ) {
    this.a = a;
  }

  run(): number {
    return this.a;
  }

  get value(): number {
    return this.a;
  }
}
`;
  const { readText } = memoryReader({ [path]: source });
  const report = scanCodeHealth([path], { readText });
  const file = report.files[0];
  assert.equal(file.functionCount, 3);
  assert.ok(
    report.findings.some(
      (item) =>
        item.kind === 'parameter-count-review' &&
        item.name === 'constructor' &&
        item.value === 6,
    ),
  );
});

test('nested callables do not inflate parent cyclomatic complexity', () => {
  const path = 'packages/ast/nested-cyclomatic.ts';
  const outerBranches = Array.from(
    { length: 11 },
    (_, i) => `  if (v === ${i}) { return ${i}; }`,
  ).join('\n');
  const innerBranches = Array.from(
    { length: 14 },
    (_, i) => `    if (n === ${i}) { return ${i}; }`,
  ).join('\n');
  const source = `
export function outer(v: number) {
${outerBranches}
  const inner = () => {
${innerBranches}
    return -1;
  };
  return inner();
}
`;
  const { readText } = memoryReader({ [path]: source });
  const report = scanCodeHealth([path], { readText });
  const outerFinding = report.findings.filter(
    (item) =>
      item.kind === 'cyclomatic-complexity-review' && item.name === 'outer',
  );
  const innerFinding = report.findings.filter(
    (item) =>
      item.kind === 'cyclomatic-complexity-review' &&
      item.name === '<anonymous>',
  );
  assert.equal(outerFinding.length, 0);
  assert.equal(innerFinding.length, 1);
  assert.ok(innerFinding[0].value > THRESHOLDS.cyclomaticComplexityReview);
});

test('short simple functions stay below advisory thresholds', () => {
  const path = 'packages/ast/simple.ts';
  const source = `
export function tiny(a: number, b: number): number {
  return a + b;
}
`;
  const { readText } = memoryReader({ [path]: source });
  const report = scanCodeHealth([path], { readText });
  const advisoryKinds = new Set([
    'function-body-span-review',
    'function-body-span-severe',
    'cyclomatic-complexity-review',
    'function-nesting-advisory',
    'parameter-count-review',
  ]);
  assert.ok(!report.findings.some((item) => advisoryKinds.has(item.kind)));
});

test('advisory boundary values for span, nesting, parameters, and file size', () => {
  const longBody = lineBlock(58, '  const step =').trim();
  const longFn = `export function longBody() {\n${longBody}\n}\n`;
  const pathLongFn = 'packages/ast/long-body.ts';
  const multiParamFn = `export function wide(\n${Array.from(
    { length: 6 },
    (_, i) => `  p${i}: number,`,
  ).join('\n')}\n) {\n  return 0;\n}\n`;
  const pathWideFn = 'packages/ast/wide-fn.ts';
  const nestPath = 'packages/ast/nest-boundary.ts';
  const nestSource = `
export function shallow() {
  if (a) {
    if (b) {
      if (c) {
        return 1;
      }
    }
  }
  return 0;
}
export function deep() {
  if (a) {
    if (b) {
      if (c) {
        if (d) {
          return 1;
        }
      }
    }
  }
  return 0;
}
`;
  const filePath = 'packages/ast/medium-file.ts';
  const { readText } = memoryReader({
    [pathLongFn]: longFn,
    [pathWideFn]: multiParamFn,
    [nestPath]: nestSource,
    [filePath]: lineBlock(300),
  });
  const report = scanCodeHealth([pathLongFn, pathWideFn, nestPath, filePath], {
    readText,
  });

  assert.ok(
    report.findings.some(
      (item) =>
        item.kind === 'function-body-span-review' &&
        item.name === 'longBody' &&
        item.value >= THRESHOLDS.functionBodySpanReview,
    ),
  );
  assert.ok(
    !report.findings.some(
      (item) =>
        item.kind === 'function-nesting-advisory' && item.name === 'shallow',
    ),
  );
  assert.ok(
    report.findings.some(
      (item) =>
        item.kind === 'function-nesting-advisory' &&
        item.name === 'deep' &&
        item.value === 4,
    ),
  );
  assert.ok(
    report.findings.some(
      (item) =>
        item.kind === 'parameter-count-review' &&
        item.name === 'wide' &&
        item.value === 6,
    ),
  );
  assert.ok(
    report.findings.some(
      (item) => item.kind === 'file-lines-advisory' && item.path === filePath,
    ),
  );
  assert.ok(
    !report.findings.some(
      (item) => item.kind === 'file-lines-review' && item.path === filePath,
    ),
  );
});

test('AST function span and control-flow nesting beat brace-count heuristics', () => {
  const path = 'packages/ast/nested.ts';
  const source = `
export const run = () =>
  Array.from({ length: 1 }, () => {
    try {
      switch (1) {
        case 1:
          if (true) {
            for (let i = 0; i < 1; i += 1) {
              while (false) {
                return i;
              }
            }
          }
          break;
        default:
          break;
      }
    } catch {
      return null;
    }
    return 0;
  });
`;
  const { readText } = memoryReader({ [path]: source });
  const report = scanCodeHealth([path], { readText });
  const file = report.files[0];
  assert.equal(file.functionCount, 2);
  assert.ok(file.maxFunctionLines >= 5);
  assert.equal(file.maxControlFlowNesting, 5);
  assert.ok(
    report.findings.some((item) => item.kind === 'control-flow-nesting-review'),
  );
});

test('as, non-null, and any are inventory only', () => {
  const path = 'packages/types/inventory.ts';
  const source = `
export function demo(value: unknown): any {
  const narrowed = value as string;
  return narrowed!.length;
}
`;
  const { readText } = memoryReader({ [path]: source });
  const report = scanCodeHealth([path], { readText });
  const file = report.files[0];
  assert.equal(file.assertionCount, 1);
  assert.equal(file.nonNullCount, 1);
  assert.equal(file.anyCount, 1);
  assert.ok(
    !report.findings.some((item) => /assertion|non-null|any/i.test(item.kind)),
  );
});

test('34 production files plus excluded neighbors do not cross directory threshold', () => {
  const prod = entryPaths(34);
  const extra = [
    'packages/sample/src/foo.test.ts',
    'packages/sample/src/fixtures/demo.ts',
    'packages/sample/src/dist/legacy.ts',
  ];
  const paths = [...prod, ...extra];
  const { readText } = memoryReader(
    Object.fromEntries([
      ...prod.map((path) => [path, 'export const v = 1;\n']),
      ...extra.map((path) => [path, 'export const v = 2;\n']),
    ]),
  );
  const report = scanCodeHealth(paths, { readText });
  assert.equal(report.summary.productionFiles, 34);
  assert.ok(
    !report.findings.some(
      (item) => item.kind === 'directory-direct-files-review',
    ),
  );
});

test('missing readText results omit the file', () => {
  const paths = ['packages/missing/one.ts', 'packages/missing/two.ts'];
  const { readText } = memoryReader({
    'packages/missing/two.ts': 'export const two = 2;\n',
  });
  const report = scanCodeHealth(paths, { readText });
  assert.deepEqual(
    report.files.map((item) => item.path),
    ['packages/missing/two.ts'],
  );
});

test('baseline strict regressions and growth boundaries', () => {
  const high = 'packages/growth/high.ts';
  const cross = 'packages/growth/cross.ts';
  const grow = 'packages/growth/grow.ts';
  const smallGrow = 'packages/growth/small-grow.ts';

  const current = {
    [high]: lineBlock(1510),
    [cross]: lineBlock(1201),
    [grow]: lineBlock(780),
    [smallGrow]: lineBlock(730),
  };
  const baseline = {
    [high]: lineBlock(1500),
    [cross]: lineBlock(1199),
    [grow]: lineBlock(600),
    [smallGrow]: lineBlock(600),
  };

  const { readText } = memoryReader(current);
  const report = scanCodeHealth(Object.keys(current), {
    readText,
    baselineEntries: Object.keys(baseline),
    readBaseline(path) {
      return baseline[path] ?? null;
    },
  });

  assert.equal(report.baselineAvailable, true);
  assert.ok(!report.strictRegressions.some((item) => item.path === high));
  assert.ok(
    report.strictRegressions.some(
      (item) =>
        item.path === cross && item.kind === 'strict-file-lines-high-crossing',
    ),
  );
  assert.ok(
    report.strictRegressions.some(
      (item) => item.path === grow && item.kind === 'strict-significant-growth',
    ),
  );
  assert.ok(!report.strictRegressions.some((item) => item.path === smallGrow));
});

test('baseline membership without content read is not strict-new', () => {
  const paths = entryPaths(40);
  const { readText } = memoryReader(
    Object.fromEntries(paths.map((p) => [p, 'export const x = 1;\n'])),
  );
  const report = scanCodeHealth(paths, {
    readText,
    baselineEntries: paths,
    readBaseline() {
      return null;
    },
  });
  assert.equal(report.baselineAvailable, true);
  assert.equal(report.strictRegressions.length, 0);
});

test('1199 to 1201 is strict regression with baseline', () => {
  const path = 'packages/edge/cross.ts';
  const { readText, files } = memoryReader({ [path]: lineBlock(1201) });
  const report = scanCodeHealth([path], {
    readText,
    baselineEntries: [path],
    readBaseline(p) {
      return p === path ? lineBlock(1199) : (files.get(p) ?? null);
    },
  });
  assert.ok(
    report.strictRegressions.some(
      (item) => item.kind === 'strict-file-lines-high-crossing',
    ),
  );
});

test('repeated scan yields stable ordered JSON', () => {
  const paths = entryPaths(3).concat(['packages/sample/src/zebra.ts']);
  paths.sort();
  const { readText } = memoryReader(
    Object.fromEntries(
      paths.map((path) => [path, `export const v = "${path}";\n`]),
    ),
  );
  const first = scanCodeHealth(paths, { readText });
  const second = scanCodeHealth(paths, { readText });
  assert.deepEqual(first, second);
  assert.deepEqual(
    first.files.map((item) => item.path),
    [...first.files.map((item) => item.path)].sort(),
  );
  assert.deepEqual(
    first.findings.map((item) => item.id),
    [...first.findings.map((item) => item.id)].sort(),
  );
  assert.equal(first.thresholdsVersion, THRESHOLDS.thresholdsVersion);
});

function git(cwd, args) {
  const result = spawnSync(
    'git',
    [
      '-c',
      'user.name=Code Health Test',
      '-c',
      'user.email=health@example.com',
      ...args,
    ],
    { cwd, encoding: 'utf8', shell: false },
  );
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || 'git failed').trim());
  }
  return result.stdout ?? '';
}

function gitFixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'code-health-'));
  git(root, ['init']);
  const add = (rel, text) => {
    const abs = path.join(root, ...rel.split('/'));
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, text);
  };
  const remove = (rel) => {
    unlinkSync(path.join(root, ...rel.split('/')));
  };
  return {
    root,
    add,
    remove,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

test('parseNulPaths preserves spaces and non-ASCII segments', () => {
  const parsed = parseNulPaths('packages/foo bar/baz.ts\0packages/café/x.ts\0');
  assert.deepEqual(parsed, ['packages/foo bar/baz.ts', 'packages/café/x.ts']);
});

test('adapter CLI: json schema and bounded human output in temp repo', () => {
  const fx = gitFixture();
  try {
    fx.add('packages/sample/alpha.ts', 'export const alpha = 1;\n');
    fx.add('packages/sample/beta.ts', lineBlock(10, '// beta'));
    fx.add('.gitignore', 'packages/sample/ignored.ts\ndist/**\n');
    git(fx.root, ['add', '.']);
    git(fx.root, ['commit', '-m', 'baseline']);

    const built = buildCodeHealthReport({ repositoryRoot: fx.root });
    assert.equal(built.ok, true);
    assert.equal(built.scan.summary.productionFiles, 2);

    const payload = formatJsonReport({
      scan: built.scan,
      head: built.head,
      baselineRef: built.baselineRef,
    });
    assert.equal(payload.schema, SCHEMA);
    assert.equal(payload.head?.length, 40);
    assert.equal(payload.baselineRef, null);
    assert.equal(payload.baselineAvailable, false);
    assert.ok(Array.isArray(payload.files));
    assert.ok(Array.isArray(payload.directories));
    assert.ok(Array.isArray(payload.findings));
    assert.ok(Array.isArray(payload.strictRegressions));
    assert.equal(payload.thresholdsVersion, THRESHOLDS.thresholdsVersion);

    const jsonExit = main(['--json'], { repositoryRoot: fx.root });
    assert.equal(jsonExit, 0);

    assert.match(renderHuman(payload), /Largest source files/);
    assert.match(renderHuman(payload), /Review-only signals/);
    assert.equal(main([], { repositoryRoot: fx.root }), 0);
  } finally {
    fx.cleanup();
  }
});

test('adapter negative: strict-new with missing base exits 2', () => {
  const fx = gitFixture();
  try {
    fx.add('packages/sample/one.ts', 'export const one = 1;\n');
    git(fx.root, ['add', '.']);
    git(fx.root, ['commit', '-m', 'one']);
    const code = main(['--strict-new', '--base', 'does-not-exist'], {
      repositoryRoot: fx.root,
    });
    assert.equal(code, 2);
  } finally {
    fx.cleanup();
  }
});

test('adapter: untracked production included; gitignored and dist excluded', () => {
  const fx = gitFixture();
  try {
    fx.add('packages/pkg/src/tracked.ts', 'export const tracked = 1;\n');
    fx.add('.gitignore', 'packages/pkg/ignored.ts\n');
    git(fx.root, ['add', '.']);
    git(fx.root, ['commit', '-m', 'seed']);

    fx.add('packages/pkg/src/new.ts', 'export const fresh = 1;\n');
    fx.add('packages/pkg/ignored.ts', 'export const ignored = 1;\n');
    fx.add('packages/pkg/dist/bundle.ts', 'export const dist = 1;\n');

    const gitCapture = createGitCapture(fx.root);
    const listed = collectWorkingEntries(fx.root, gitCapture);
    assert.ok(listed.ok);
    const production = listed.entries.filter((entry) =>
      isProductionSource(entry),
    );
    assert.ok(production.includes('packages/pkg/src/new.ts'));
    assert.ok(production.includes('packages/pkg/src/tracked.ts'));
    assert.ok(!production.includes('packages/pkg/ignored.ts'));
    assert.ok(!production.includes('packages/pkg/dist/bundle.ts'));
  } finally {
    fx.cleanup();
  }
});

test('adapter: deleted tracked file is not counted', () => {
  const fx = gitFixture();
  try {
    fx.add('packages/pkg/src/live.ts', 'export const live = 1;\n');
    fx.add('packages/pkg/src/removed.ts', 'export const removed = 1;\n');
    git(fx.root, ['add', '.']);
    git(fx.root, ['commit', '-m', 'both']);

    fx.remove('packages/pkg/src/removed.ts');
    git(fx.root, ['rm', 'packages/pkg/src/removed.ts']);

    const gitCapture = createGitCapture(fx.root);
    const listed = collectWorkingEntries(fx.root, gitCapture);
    assert.ok(listed.ok);
    assert.ok(listed.entries.includes('packages/pkg/src/live.ts'));
    assert.ok(!listed.entries.includes('packages/pkg/src/removed.ts'));
  } finally {
    fx.cleanup();
  }
});

test('adapter: path with space round-trips through git listing', () => {
  const fx = gitFixture();
  try {
    const rel = 'packages/pkg/src/my file.ts';
    fx.add(rel, 'export const spaced = 1;\n');
    git(fx.root, ['add', '.']);
    git(fx.root, ['commit', '-m', 'space']);

    const gitCapture = createGitCapture(fx.root);
    const listed = collectWorkingEntries(fx.root, gitCapture);
    assert.ok(listed.entries.includes(rel));

    const built = buildCodeHealthReport({ repositoryRoot: fx.root });
    assert.equal(built.ok, true);
    assert.ok(built.scan.files.some((file) => file.path === rel));
  } finally {
    fx.cleanup();
  }
});

test('adapter: running main does not dirty git status', () => {
  const fx = gitFixture();
  try {
    fx.add('packages/pkg/src/stable.ts', 'export const stable = 1;\n');
    git(fx.root, ['add', '.']);
    git(fx.root, ['commit', '-m', 'stable']);

    const before = git(fx.root, ['status', '--porcelain']).trim();
    assert.equal(before, '');

    const exitCode = main(['--json'], { repositoryRoot: fx.root });
    assert.equal(exitCode, 0);

    const after = git(fx.root, ['status', '--porcelain']).trim();
    assert.equal(after, '');
  } finally {
    fx.cleanup();
  }
});

test('adapter: non-git directory fails with exit 2', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'code-health-nogit-'));
  try {
    mkdirSync(path.join(root, 'packages', 'x'), { recursive: true });
    writeFileSync(
      path.join(root, 'packages', 'x', 'a.ts'),
      'export const a = 1;\n',
    );
    assert.equal(main([], { repositoryRoot: root }), 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('CLI strict-new: file crosses 1200 lines (1199 -> 1201)', () => {
  const fx = gitFixture();
  try {
    const rel = 'packages/growth/cross.ts';
    fx.add(rel, lineBlock(1199));
    git(fx.root, ['add', '.']);
    git(fx.root, ['commit', '-m', 'under threshold']);
    const base = git(fx.root, ['rev-parse', 'HEAD']).trim();
    fx.add(rel, lineBlock(1201));
    const code = main(['--strict-new', '--base', base, '--json'], {
      repositoryRoot: fx.root,
    });
    assert.equal(code, 1);
    const built = buildCodeHealthReport({
      repositoryRoot: fx.root,
      baselineRef: base,
    });
    assert.ok(
      built.scan.strictRegressions.some(
        (item) => item.kind === 'strict-file-lines-high-crossing',
      ),
    );
  } finally {
    fx.cleanup();
  }
});

test('CLI strict-new: directory crosses 35 direct production files', () => {
  const fx = gitFixture();
  try {
    const dir = 'packages/sample/src';
    for (const rel of entryPaths(34, dir)) {
      fx.add(rel, 'export const x = 1;\n');
    }
    git(fx.root, ['add', '.']);
    git(fx.root, ['commit', '-m', '34 files']);
    const base = git(fx.root, ['rev-parse', 'HEAD']).trim();
    fx.add(`${dir}/module-035.ts`, 'export const x = 1;\n');
    const code = main(['--strict-new', '--base', base, '--json'], {
      repositoryRoot: fx.root,
    });
    assert.equal(code, 1);
    const built = buildCodeHealthReport({
      repositoryRoot: fx.root,
      baselineRef: base,
    });
    assert.ok(
      built.scan.strictRegressions.some(
        (item) => item.kind === 'strict-directory-direct-files-crossing',
      ),
    );
  } finally {
    fx.cleanup();
  }
});

test('CLI strict-new: significant growth 600 -> 780', () => {
  const fx = gitFixture();
  try {
    const rel = 'packages/growth/grow.ts';
    fx.add(rel, lineBlock(600));
    git(fx.root, ['add', '.']);
    git(fx.root, ['commit', '-m', '600 lines']);
    const base = git(fx.root, ['rev-parse', 'HEAD']).trim();
    fx.add(rel, lineBlock(780));
    const code = main(['--strict-new', '--base', base, '--json'], {
      repositoryRoot: fx.root,
    });
    assert.equal(code, 1);
    const built = buildCodeHealthReport({
      repositoryRoot: fx.root,
      baselineRef: base,
    });
    assert.ok(
      built.scan.strictRegressions.some(
        (item) => item.kind === 'strict-significant-growth',
      ),
    );
  } finally {
    fx.cleanup();
  }
});

test('CLI strict-new: already-large 1500 -> 1510 is review only', () => {
  const fx = gitFixture();
  try {
    const rel = 'packages/growth/high.ts';
    fx.add(rel, lineBlock(1500));
    git(fx.root, ['add', '.']);
    git(fx.root, ['commit', '-m', '1500 lines']);
    const base = git(fx.root, ['rev-parse', 'HEAD']).trim();
    fx.add(rel, lineBlock(1510));
    const code = main(['--strict-new', '--base', base, '--json'], {
      repositoryRoot: fx.root,
    });
    assert.equal(code, 0);
    const built = buildCodeHealthReport({
      repositoryRoot: fx.root,
      baselineRef: base,
    });
    assert.equal(built.ok, true);
    const payload = formatJsonReport({
      scan: built.scan,
      head: built.head,
      baselineRef: built.baselineRef,
    });
    assert.equal(payload.strictRegressions.length, 0);
    assert.ok(
      payload.findings.some(
        (item) => item.kind === 'file-lines-high' && item.path === rel,
      ),
    );
  } finally {
    fx.cleanup();
  }
});

test('CLI strict-new: 40 unchanged production files exit 0 with baselineAvailable', () => {
  const fx = gitFixture();
  try {
    for (const rel of entryPaths(40)) {
      fx.add(rel, 'export const x = 1;\n');
    }
    git(fx.root, ['add', '.']);
    git(fx.root, ['commit', '-m', 'forty files']);
    const base = git(fx.root, ['rev-parse', 'HEAD']).trim();
    const code = main(['--strict-new', '--base', base, '--json'], {
      repositoryRoot: fx.root,
    });
    assert.equal(code, 0);
    const built = buildCodeHealthReport({
      repositoryRoot: fx.root,
      baselineRef: base,
    });
    assert.equal(built.ok, true);
    assert.equal(built.scan.baselineAvailable, true);
    assert.equal(built.scan.strictRegressions.length, 0);
    assert.ok(
      !built.scan.strictRegressions.some(
        (item) => item.kind === 'strict-directory-direct-files-crossing',
      ),
    );
  } finally {
    fx.cleanup();
  }
});

test('baseline content reads skip unchanged production files', () => {
  const fx = gitFixture();
  try {
    for (const rel of entryPaths(40)) {
      fx.add(rel, 'export const x = 1;\n');
    }
    git(fx.root, ['add', '.']);
    git(fx.root, ['commit', '-m', 'unchanged production set']);
    const base = git(fx.root, ['rev-parse', 'HEAD']).trim();
    let shows = 0;
    const execFile = (command, args, options) => {
      if (args.includes('show')) shows += 1;
      return execFileSync(command, args, options);
    };
    const built = buildCodeHealthReport({
      repositoryRoot: fx.root,
      baselineRef: base,
      gitCapture: createGitCapture(fx.root, execFile),
      gitShow: createGitShow(fx.root, execFile),
    });
    assert.equal(built.ok, true);
    assert.equal(built.scan.baselineAvailable, true);
    assert.equal(shows, 0);
    const selected = buildBaselineReadSet({
      preliminary: built.scan,
      baselinePaths: new Set(entryPaths(40)),
      modifiedPaths: new Set([entryPaths(1)[0]]),
    });
    assert.deepEqual([...selected], [entryPaths(1)[0]]);
  } finally {
    fx.cleanup();
  }
});

test('diagnostics scope separates changed findings from existing debt', () => {
  const changedProd = 'packages/sample/src/changed.ts';
  const unchangedProd = 'packages/sample/src/legacy.ts';
  const changedTest = 'packages/sample/src/cq06-scope.test.ts';
  const paths = [changedProd, unchangedProd, changedTest];
  const { readText } = memoryReader(
    Object.fromEntries([
      [changedProd, lineBlock(301)],
      [unchangedProd, lineBlock(301)],
      [changedTest, 'import test from "node:test";\n'],
    ]),
  );
  const scan = scanCodeHealth(paths, { readText });
  const scope = buildDiagnosticsScope(scan, {
    modifiedScopedPaths: new Set([changedProd, changedTest]),
    baselineAvailable: true,
    baselineRef: 'base-sha',
  });
  assert.ok(scope);
  assert.equal(scope.changedPathCount, 2);
  assert.ok(
    scope.changedFindings.some(
      (item) =>
        item.kind === 'file-lines-advisory' && item.path === changedProd,
    ),
  );
  assert.ok(
    scope.changedFindings.some(
      (item) => item.kind === 'test-naming-packet-debt-new',
    ),
  );
  assert.ok(!scope.changedFindings.some((item) => item.path === unchangedProd));
  assert.ok(scope.existingDebt.findingCount >= 1);
  assert.ok(scope.existingDebt.fileCount >= 1);

  const scanWithBaseline = scanCodeHealth(paths, {
    readText,
    baselineEntries: [unchangedProd],
    readBaseline(path) {
      return path === unchangedProd ? lineBlock(301) : null;
    },
  });
  const payload = formatJsonReport({
    scan: scanWithBaseline,
    head: 'head-sha',
    baselineRef: 'base-sha',
    modifiedScopedPaths: new Set([changedProd, changedTest]),
  });
  assert.ok(payload.diagnosticsScope);
  assert.equal(
    payload.diagnosticsScope.changedFindingCount,
    scope.changedFindingCount,
  );
  assert.equal(payload.diagnosticsScope.existingDebt.fileCount, 1);

  const human = renderHuman(payload);
  assert.match(human, /Changed\/new diagnostics \(scoped to diff\)/);
  assert.match(human, /existing debt on unchanged files/);
});

test('diagnostics scope is omitted without baseline', () => {
  const path = 'packages/sample/src/only.ts';
  const { readText } = memoryReader({ [path]: lineBlock(10) });
  const scan = scanCodeHealth([path], { readText });
  assert.equal(
    buildDiagnosticsScope(scan, {
      baselineAvailable: false,
      baselineRef: null,
    }),
    null,
  );
  const payload = formatJsonReport({
    scan,
    head: 'head-sha',
    baselineRef: null,
  });
  assert.equal(payload.diagnosticsScope, null);
});

test('changed-file history cap refuses a partial strict baseline', () => {
  const fx = gitFixture();
  try {
    const paths = entryPaths(2);
    for (const rel of paths) fx.add(rel, 'export const x = 1;\n');
    git(fx.root, ['add', '.']);
    git(fx.root, ['commit', '-m', 'two files']);
    const base = git(fx.root, ['rev-parse', 'HEAD']).trim();
    for (const rel of paths) fx.add(rel, 'export const x = 2;\n');
    const built = buildCodeHealthReport({
      repositoryRoot: fx.root,
      baselineRef: base,
      maxBaselineShowCalls: 1,
    });
    assert.equal(built.ok, true);
    assert.equal(built.forceBaselineUnavailable, true);
    assert.equal(built.scan.baselineAvailable, false);
    assert.equal(built.scan.strictRegressions.length, 0);
  } finally {
    fx.cleanup();
  }
});
