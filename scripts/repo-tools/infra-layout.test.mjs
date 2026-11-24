import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..');

const MAP_PATH = 'work/undertakings/storyteller-workshop/INF-MOVE-MAP.json';
const ATLAS_PATH = 'infra/README.md';
const PARALLEL_PATH = 'work/undertakings/storyteller-workshop/INF-PARALLEL.md';
const EXPECTED_BASELINE = 'b01a68b4e91fbbb68f4e67c91427db7435e44738';
const EXPECTED_ROW_COUNTS = { INF02: 76, INF03: 19, INF04: 44, INF05: 118 };

/** Destination roots selected in infra/README.md (2026-11-24 layout). */
export const ALLOWED_DESTINATION_ROOTS = [
  'infra/clusters/kind/dev/',
  'infra/clusters/kind/release/',
  'infra/platform/postgres/',
  'infra/platform/temporal/',
  'infra/platform/object-storage/',
  'infra/platform/gateway/',
  'infra/platform/observability/',
  'infra/platform/redis/',
  'infra/platform/rabbitmq/',
  'infra/workloads/dev/',
  'infra/workloads/release/',
  'infra/environments/dev/',
  'infra/environments/release/',
  'infra/images/development/',
  'infra/images/release/',
  'infra/dev/',
  'infra/verification/',
  'tools/dev-environments/',
];

/** No new generic lab bucket as a relocation target. */
export const FORBIDDEN_DESTINATION_ROOTS = [
  'infra/kubernetes/lab/',
  'infra/lab/',
];

const DEV_ENTRY_SCRIPTS = [
  'dev',
  'dev:new',
  'dev:reserve',
  'dev:attach',
  'dev:status',
  'dev:stop',
];

const STACK_ENTRY_SCRIPTS = [
  'stack:up',
  'stack:status',
  'stack:down',
  'stack:reset',
  'stack:acceptance',
];

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(repoRoot, relativePath), 'utf8'));
}

function gitLsFiles(scope) {
  const out = execFileSync('git', ['ls-files', scope], {
    cwd: repoRoot,
    encoding: 'utf8',
  }).trim();
  return out ? out.split('\n') : [];
}

function gitTrackedMode(relativePath) {
  const out = execFileSync('git', ['ls-files', '-s', '--', relativePath], {
    cwd: repoRoot,
    encoding: 'utf8',
  }).trim();
  if (!out) {
    return null;
  }
  return out.split(/\s+/)[0];
}

export function destinationRoot(destination) {
  for (const root of ALLOWED_DESTINATION_ROOTS) {
    if (destination === root.slice(0, -1) || destination.startsWith(root)) {
      return root;
    }
  }
  return null;
}

export function isForbiddenLabDestination(destination) {
  return FORBIDDEN_DESTINATION_ROOTS.some(
    (root) => destination === root.slice(0, -1) || destination.startsWith(root),
  );
}

export function assertUniqueDestinations(rows) {
  const seen = new Map();
  for (const row of rows) {
    if (seen.has(row.to)) {
      throw new Error(
        `duplicate destination: ${row.to} (also claimed by ${seen.get(row.to)})`,
      );
    }
    seen.set(row.to, row.from);
  }
}

export function assertUniqueSources(rows) {
  const seen = new Map();
  for (const row of rows) {
    if (seen.has(row.from)) {
      throw new Error(`duplicate source: ${row.from}`);
    }
    seen.set(row.from, row.to);
  }
}

export function assertAllowedDestinations(rows) {
  for (const row of rows) {
    if (isForbiddenLabDestination(row.to)) {
      throw new Error(`forbidden lab destination root: ${row.to}`);
    }
    if (!destinationRoot(row.to)) {
      throw new Error(`destination outside selected layout: ${row.to}`);
    }
  }
}

export function assertLabInventoryCoverage(rows, trackedLabPaths) {
  const mapped = new Set(
    rows
      .filter((r) => r.from.startsWith('infra/kubernetes/lab/'))
      .map((r) => r.from),
  );
  const missing = trackedLabPaths.filter((path) => !mapped.has(path));
  if (missing.length > 0) {
    throw new Error(
      `tracked lab files missing from move map: ${missing.join(', ')}`,
    );
  }
  const extra = [...mapped].filter((path) => !trackedLabPaths.includes(path));
  if (extra.length > 0) {
    throw new Error(
      `move map lists lab sources that are not tracked: ${extra.join(', ')}`,
    );
  }
}

export function assertTrackedModes(rows) {
  for (const row of rows) {
    const trackedMode = gitTrackedMode(row.from);
    assert.ok(trackedMode, `expected tracked source path ${row.from}`);
    assert.equal(
      trackedMode,
      row.mode,
      `mode mismatch for ${row.from}: map ${row.mode}, git ${trackedMode}`,
    );
  }
}

export function assertStagedMovePaths(
  rows,
  root,
  { requireInitialOldPaths = false } = {},
) {
  for (const row of rows) {
    const oldExists = existsSync(join(root, row.from));
    const newExists = existsSync(join(root, row.to));
    if (oldExists && newExists) {
      throw new Error(
        `staged move violation (both paths present): ${row.from} and ${row.to}`,
      );
    }
    if (!oldExists && !newExists) {
      throw new Error(
        `staged move violation (neither path present): ${row.from} / ${row.to}`,
      );
    }
    if (requireInitialOldPaths) {
      if (!oldExists) {
        throw new Error(`pre-INF02 source missing at old path: ${row.from}`);
      }
      if (newExists) {
        throw new Error(`pre-INF02 destination must not exist yet: ${row.to}`);
      }
    }
  }
}

export function auditMoveMap(
  map,
  { trackedLabPaths, requireInitialOldPaths = false } = {},
) {
  assert.equal(map.baseline, EXPECTED_BASELINE, 'move map baseline SHA');
  assert.equal(map.rows.length, 257, 'total assigned rows');
  assertUniqueSources(map.rows);
  assertUniqueDestinations(map.rows);
  assertAllowedDestinations(map.rows);
  if (trackedLabPaths) {
    assertLabInventoryCoverage(map.rows, trackedLabPaths);
  }
  assertStagedMovePaths(map.rows, repoRoot, { requireInitialOldPaths });
}

test('infra ownership atlas links resolve from repository root', () => {
  for (const relativePath of [ATLAS_PATH, PARALLEL_PATH, MAP_PATH]) {
    assert.ok(existsSync(join(repoRoot, relativePath)), relativePath);
  }
  const atlas = readFileSync(join(repoRoot, ATLAS_PATH), 'utf8');
  assert.match(atlas, /INF-PARALLEL\.md/);
  assert.match(atlas, /INF-MOVE-MAP\.json/);
});

test('root dev, stack and context entry points exist as named by the atlas', () => {
  const pkg = readJson('package.json');
  for (const key of DEV_ENTRY_SCRIPTS) {
    assert.ok(key in pkg.scripts, `missing ${key}`);
    assert.match(pkg.scripts[key], /dev-tilt\.mjs/);
  }
  for (const key of STACK_ENTRY_SCRIPTS) {
    assert.ok(key in pkg.scripts, `missing ${key}`);
    assert.match(pkg.scripts[key], /stack/);
  }

  for (const relativePath of [
    'scripts/repo-tools/dev-tilt.mjs',
    'scripts/repo-tools/stack.mjs',
    'scripts/repo-tools/stack-lifecycle.mjs',
    'scripts/repo-tools/stack-preflight.mjs',
    'Tiltfile',
  ]) {
    assert.ok(existsSync(join(repoRoot, relativePath)), relativePath);
  }

  const tiltfile = readFileSync(join(repoRoot, 'Tiltfile'), 'utf8');
  assert.match(tiltfile, /allow_k8s_contexts\('kind-offscreen-dev'\)/);
  assert.match(tiltfile, /allow_k8s_contexts\('kind-offscreen-lab'\)/);
  assert.match(tiltfile, /infra\/kubernetes\/lab\/dev\/Tiltfile/);

  const preflight = readFileSync(
    join(repoRoot, 'scripts/repo-tools/stack-preflight.mjs'),
    'utf8',
  );
  assert.match(preflight, /kind-offscreen-lab/);
});

test('tracked INF-MOVE-MAP inventory matches HEAD and selected layout', () => {
  const map = readJson(MAP_PATH);
  const trackedLab = gitLsFiles('infra/kubernetes/lab');
  auditMoveMap(map, {
    trackedLabPaths: trackedLab,
    requireInitialOldPaths: true,
  });
  assertTrackedModes(map.rows);

  const byChange = Object.create(null);
  for (const row of map.rows) {
    byChange[row.change] = (byChange[row.change] ?? 0) + 1;
  }
  for (const [change, count] of Object.entries(EXPECTED_ROW_COUNTS)) {
    assert.equal(byChange[change], count, `row count for ${change}`);
  }
});

test('fixture negative: duplicate destination is rejected', () => {
  const rows = [
    {
      change: 'INF04',
      from: 'infra/kubernetes/lab/dev/a.mjs',
      to: 'infra/dev/a.mjs',
      mode: '100644',
    },
    {
      change: 'INF04',
      from: 'infra/kubernetes/lab/dev/b.mjs',
      to: 'infra/dev/a.mjs',
      mode: '100644',
    },
  ];
  assert.throws(() => assertUniqueDestinations(rows), /duplicate destination/);
});

test('fixture negative: tracked lab file missing from map is rejected', () => {
  const rows = [
    {
      change: 'INF04',
      from: 'infra/kubernetes/lab/dev/only.mjs',
      to: 'infra/dev/only.mjs',
      mode: '100644',
    },
  ];
  const tracked = [
    'infra/kubernetes/lab/dev/only.mjs',
    'infra/kubernetes/lab/dev/unmapped.mjs',
  ];
  assert.throws(
    () => assertLabInventoryCoverage(rows, tracked),
    /missing from move map/,
  );
});

test('staged move helper rejects neither path present', () => {
  const rows = [
    {
      change: 'INF04',
      from: 'infra/kubernetes/lab/__fixture_missing_old__.mjs',
      to: 'infra/dev/__fixture_missing_new__.mjs',
      mode: '100644',
    },
  ];
  assert.throws(
    () => assertStagedMovePaths(rows, repoRoot),
    /neither path present/,
  );
});
