import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { deriveDevWorkloadBindings } from '../../infra/workloads/tests/helpers/dev-bindings.mjs';
import { renderWorkloadDocuments } from '../../infra/workloads/render.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..');

const MAP_PATH = 'work/undertakings/storyteller-workshop/INF-MOVE-MAP.json';
const ATLAS_PATH = 'infra/README.md';
const PARALLEL_PATH = 'work/undertakings/storyteller-workshop/INF-PARALLEL.md';
const EXPECTED_BASELINE = 'b01a68b4e91fbbb68f4e67c91427db7435e44738';
const EXPECTED_ROW_COUNTS = { INF02: 76, INF03: 19, INF04: 44, INF05: 118 };

/** Destination roots selected in infra/README.md (2026-11-24 layout). */
export const ALLOWED_DESTINATION_ROOTS = [
  'infra/clusters/kind/common/',
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
  'infra/workloads/chart/',
  'infra/workloads/profiles/',
  'infra/environments/dev/',
  'infra/environments/release/',
  'infra/images/common/',
  'infra/images/distribution/',
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

/** INF06 successor relocations: INF01–05 mapped destination → current home. */
export const INF06_SUCCESSOR_RELOCATIONS = [
  {
    from: 'infra/clusters/kind/release/namespaces.yaml',
    to: 'infra/environments/release/namespaces.yaml',
  },
  {
    from: 'infra/clusters/kind/release/local-path-storage.yaml',
    to: 'infra/clusters/kind/common/local-path-storage.yaml',
  },
  {
    from: 'infra/environments/dev/owned-app-resources.json',
    to: 'infra/environments/release/owned-app-resources.json',
  },
  {
    from: 'infra/clusters/kind/release/down.sh',
    to: 'infra/clusters/kind/release/destroy.sh',
  },
];

/** INF07 successor relocations: INF04 mapped destination → current home. */
export const INF07_SUCCESSOR_RELOCATIONS = [
  {
    from: 'infra/images/release/docker.npmrc',
    to: 'infra/images/common/docker.npmrc',
  },
  {
    from: 'infra/images/release/Dockerfile.api',
    to: 'infra/images/release/Dockerfile.services',
  },
  {
    from: 'infra/images/release/Dockerfile.game-authority',
    to: 'infra/images/release/Dockerfile.services',
  },
  {
    from: 'infra/images/release/Dockerfile.worker',
    to: 'infra/images/release/Dockerfile.services',
  },
  {
    from: 'infra/images/development/tilt/load-dev-image.sh',
    to: 'infra/images/development/load-dev-slot-image.sh',
  },
];

/** INF18 retired infra/dev runtime shims in favor of tools/dev-environments/runtime. */
export const INF18_SUCCESSOR_RELOCATIONS = [
  {
    from: 'infra/dev/dev-watched-compilation-receipt.mjs',
    to: 'tools/dev-environments/runtime/generation.mjs',
  },
  {
    from: 'infra/dev/dev-watched-compilation-receipt.test.mjs',
    to: 'tools/dev-environments/test/dev-generation.test.mjs',
  },
  {
    from: 'infra/dev/dev-loaded-runtime-status.mjs',
    to: 'tools/dev-environments/runtime/status.mjs',
  },
  {
    from: 'infra/dev/dev-watch-compilation.mjs',
    to: 'tools/dev-environments/runtime/compile-watch.mjs',
  },
  {
    from: 'infra/dev/dev-image-runtime-modules.mjs',
    to: 'infra/images/development/packaging.mjs',
  },
  {
    from: 'infra/dev/dev-image-runtime-modules.test.mjs',
    to: 'infra/images/development/tests/packaging.test.mjs',
  },
];

/** INF17 collapsed the nested dev graph into the root Tiltfile and sync-plan. */
export const INF17_SUCCESSOR_RELOCATIONS = [
  { from: 'infra/dev/Tiltfile', to: 'Tiltfile' },
  {
    from: 'infra/dev/dev-sync-paths.mjs',
    to: 'infra/images/development/sync-plan.mjs',
  },
  {
    from: 'infra/dev/dev-sync-paths.test.mjs',
    to: 'infra/images/development/sync-plan.test.mjs',
  },
  {
    from: 'infra/dev/dev-tiltfile-api-authority.test.mjs',
    to: 'infra/verification/source/tilt/dev-tiltfile-api-authority.test.mjs',
  },
  {
    from: 'infra/dev/dev-tiltfile-web.test.mjs',
    to: 'infra/verification/source/tilt/dev-tiltfile-web.test.mjs',
  },
  {
    from: 'infra/dev/dev-tiltfile-workers.test.mjs',
    to: 'infra/verification/source/tilt/dev-tiltfile-workers.test.mjs',
  },
];

/** Staging-only successor: compat shim may remain at the predecessor path. */
export const INF07_EFFECTIVE_DESTINATION_SUCCESSORS = [
  ...INF07_SUCCESSOR_RELOCATIONS,
  {
    from: 'infra/images/development/tilt/build-release-images.sh',
    to: 'infra/images/release/build-release-images.sh',
  },
];

/** INF08 retired static workload YAML (replaced by Helm chart + slot render). */
export const INF08_RETIRED_WORKLOAD_PATHS = [
  'infra/workloads/dev/web.yaml',
  'infra/workloads/dev/api.yaml',
  'infra/workloads/dev/authority.yaml',
  'infra/workloads/dev/workers.yaml',
  'infra/workloads/release/edge.yaml',
  'infra/workloads/release/authority.yaml',
  'infra/workloads/release/workers.yaml',
  'infra/workloads/release/migrate.yaml',
];

/**
 * INF16 retired release Tilt graph: single release install authority.
 * Proof: exact absence of infra/environments/release/Tiltfile.
 */
export const INF16_RETIRED_RELEASE_TILT_PATH =
  'infra/environments/release/Tiltfile';

/** INF16 successor for historical move-map destination rows. */
export const INF16_SUCCESSOR_RELOCATIONS = [
  {
    from: 'infra/environments/release/Tiltfile',
    to: 'infra/environments/release/install.sh',
  },
];

/** INF19 verification ownership: environments/release fixture homes → release-acceptance. */
export const INF19_SUCCESSOR_RELOCATIONS = [
  {
    from: 'infra/environments/release/namespaces.yaml',
    to: 'infra/verification/fixtures/probes/namespaces.yaml',
  },
  {
    from: 'infra/environments/release/release-acceptance-preflight.mjs',
    to: 'infra/verification/release-acceptance/release-acceptance-preflight.mjs',
  },
  {
    from: 'infra/environments/release/release-acceptance-preflight.test.mjs',
    to: 'infra/verification/release-acceptance/release-acceptance-preflight.test.mjs',
  },
  {
    from: 'infra/environments/release/content-bootstrap/Dockerfile',
    to: 'infra/verification/release-acceptance/content-bootstrap/Dockerfile',
  },
  {
    from: 'infra/environments/release/content-bootstrap/build.sh',
    to: 'infra/verification/release-acceptance/content-bootstrap/build.sh',
  },
  {
    from: 'infra/environments/release/content-bootstrap/images.pin',
    to: 'infra/verification/release-acceptance/content-bootstrap/images.pin',
  },
  {
    from: 'infra/environments/release/content-bootstrap/importer-job.yaml',
    to: 'infra/verification/release-acceptance/content-bootstrap/importer-job.yaml',
  },
  {
    from: 'infra/environments/release/content-bootstrap/namespace.yaml',
    to: 'infra/verification/release-acceptance/content-bootstrap/namespace.yaml',
  },
  {
    from: 'infra/environments/release/content-bootstrap/package-lock.json',
    to: 'infra/verification/release-acceptance/content-bootstrap/package-lock.json',
  },
  {
    from: 'infra/environments/release/content-bootstrap/package.json',
    to: 'infra/verification/release-acceptance/content-bootstrap/package.json',
  },
  {
    from: 'infra/environments/release/content-bootstrap/reader-job.yaml',
    to: 'infra/verification/release-acceptance/content-bootstrap/reader-job.yaml',
  },
  {
    from: 'infra/environments/release/content-bootstrap/smoke.sh',
    to: 'infra/verification/release-acceptance/content-bootstrap/smoke.sh',
  },
];

/** INF15 successor relocations: INF01–05 platform YAML → Helm chart homes. */
export const INF15_SUCCESSOR_RELOCATIONS = [
  {
    from: 'infra/platform/postgres/cluster.yaml',
    to: 'infra/platform/postgres/chart/templates/cluster.yaml',
  },
  {
    from: 'infra/platform/postgres/namespace.yaml',
    to: 'infra/platform/postgres/chart/templates/namespace.yaml',
  },
  {
    from: 'infra/platform/temporal/admin.yaml',
    to: 'infra/platform/temporal/chart/templates/admin.yaml',
  },
  {
    from: 'infra/platform/temporal/namespace-job.yaml',
    to: 'infra/platform/temporal/chart/templates/namespace-job.yaml',
  },
  {
    from: 'infra/platform/temporal/namespace.yaml',
    to: 'infra/platform/temporal/chart/templates/namespace.yaml',
  },
  {
    from: 'infra/platform/temporal/postgres.yaml',
    to: 'infra/platform/temporal/chart/templates/postgres.yaml',
  },
  {
    from: 'infra/platform/temporal/schema-job.yaml',
    to: 'infra/platform/temporal/chart/templates/schema-job.yaml',
  },
  {
    from: 'infra/platform/temporal/server.yaml',
    to: 'infra/platform/temporal/chart/templates/server.yaml',
  },
  {
    from: 'infra/platform/object-storage/store.yaml',
    to: 'infra/platform/object-storage/chart/templates/store.yaml',
  },
  {
    from: 'infra/platform/redis/redis.yaml',
    to: 'infra/platform/redis/chart/templates/redis.yaml',
  },
  {
    from: 'infra/platform/rabbitmq/broker.yaml',
    to: 'infra/platform/rabbitmq/chart/templates/broker.yaml',
  },
  {
    from: 'infra/platform/rabbitmq/namespace.yaml',
    to: 'infra/platform/rabbitmq/chart/templates/namespace.yaml',
  },
  {
    from: 'infra/platform/observability/collector.yaml',
    to: 'infra/platform/observability/chart/templates/collector.yaml',
  },
  {
    from: 'infra/platform/observability/collector-config.yaml',
    to: 'infra/platform/observability/chart/files/collector-config.yaml',
  },
  {
    from: 'infra/platform/gateway/routes.yaml',
    to: 'infra/platform/gateway/gateway.yaml',
  },
];

/** Historical INF15 staging predecessors (all retired). */
export const INF15_STAGING_PREDECESSOR_PATHS = [];

/** INF08 successor relocations for historical move-map destination rows. */
export const INF08_SUCCESSOR_RELOCATIONS = [
  {
    from: 'infra/workloads/dev/web.yaml',
    to: 'infra/workloads/chart/templates/deployments.yaml',
  },
  {
    from: 'infra/workloads/dev/api.yaml',
    to: 'infra/workloads/chart/templates/deployments.yaml',
  },
  {
    from: 'infra/workloads/dev/authority.yaml',
    to: 'infra/workloads/chart/templates/deployments.yaml',
  },
  {
    from: 'infra/workloads/dev/workers.yaml',
    to: 'infra/workloads/chart/templates/deployments.yaml',
  },
  {
    from: 'infra/workloads/release/edge.yaml',
    to: 'infra/workloads/chart/templates/deployments.yaml',
  },
  {
    from: 'infra/workloads/release/authority.yaml',
    to: 'infra/workloads/chart/templates/deployments.yaml',
  },
  {
    from: 'infra/workloads/release/workers.yaml',
    to: 'infra/workloads/chart/templates/deployments.yaml',
  },
  {
    from: 'infra/workloads/release/migrate.yaml',
    to: 'infra/workloads/chart/templates/migration-job.yaml',
  },
];

function effectiveMoveDestination(destination) {
  let current = destination;
  for (const table of [
    INF06_SUCCESSOR_RELOCATIONS,
    INF07_EFFECTIVE_DESTINATION_SUCCESSORS,
    INF08_SUCCESSOR_RELOCATIONS,
    INF15_SUCCESSOR_RELOCATIONS,
    INF17_SUCCESSOR_RELOCATIONS,
    INF18_SUCCESSOR_RELOCATIONS,
    INF19_SUCCESSOR_RELOCATIONS,
  ]) {
    const successor = table.find((row) => row.from === current);
    if (successor) {
      current = successor.to;
    }
  }
  return current;
}

export function assertInf08WorkloadRetirement(root) {
  for (const relativePath of INF08_RETIRED_WORKLOAD_PATHS) {
    if (existsSync(join(root, relativePath))) {
      throw new Error(`INF08 predecessor must be retired: ${relativePath}`);
    }
  }
  for (const relativePath of [
    'infra/workloads/chart/templates/deployments.yaml',
    'infra/workloads/chart/templates/services.yaml',
    'infra/workloads/chart/templates/migration-job.yaml',
    'infra/environments/release/game-edge-route.yaml',
    'infra/workloads/render.mjs',
  ]) {
    if (!existsSync(join(root, relativePath))) {
      throw new Error(`INF08 successor missing: ${relativePath}`);
    }
  }
  const devOverlay = deriveDevWorkloadBindings('dev-1', 3100);
  const devDocs = renderWorkloadDocuments({
    profile: 'development',
    section: 'all',
    bindings: devOverlay.bindings,
  });
  assert.equal(devDocs.length, 10);
  const releaseDocs = renderWorkloadDocuments({
    profile: 'release',
    section: 'all',
  });
  assert.equal(releaseDocs.length, 12);
}

export function assertInf06SuccessorRelocations(root) {
  for (const row of INF06_SUCCESSOR_RELOCATIONS) {
    const destination = effectiveMoveDestination(row.to);
    const oldExists = existsSync(join(root, row.from));
    const newExists = existsSync(join(root, destination));
    if (oldExists && newExists) {
      throw new Error(
        `INF06 successor violation (both paths present): ${row.from} and ${destination}`,
      );
    }
    if (!newExists) {
      throw new Error(`INF06 successor destination missing: ${destination}`);
    }
    if (oldExists) {
      throw new Error(`INF06 predecessor must be retired: ${row.from}`);
    }
  }
}

export function assertInf15PlatformChartSuccessors(root) {
  for (const row of INF15_SUCCESSOR_RELOCATIONS) {
    const oldExists = existsSync(join(root, row.from));
    const newExists = existsSync(join(root, row.to));
    if (INF15_STAGING_PREDECESSOR_PATHS.includes(row.from)) {
      if (!newExists) {
        throw new Error(`INF15 successor destination missing: ${row.to}`);
      }
      continue;
    }
    if (oldExists && newExists) {
      throw new Error(
        `INF15 successor violation (both paths present): ${row.from} and ${row.to}`,
      );
    }
    if (!newExists) {
      throw new Error(`INF15 successor destination missing: ${row.to}`);
    }
    if (oldExists) {
      throw new Error(`INF15 predecessor must be retired: ${row.from}`);
    }
  }
  const verificationRoute = 'infra/verification/smoke/gateway/routes.yaml';
  if (!existsSync(join(root, verificationRoute))) {
    throw new Error(
      `INF15 gateway verification successor missing: ${verificationRoute}`,
    );
  }
}

export function assertInf19VerificationFixtureOwnership(root) {
  for (const row of INF19_SUCCESSOR_RELOCATIONS) {
    const oldExists = existsSync(join(root, row.from));
    const newExists = existsSync(join(root, row.to));
    if (oldExists && newExists) {
      throw new Error(
        `INF19 successor violation (both paths present): ${row.from} and ${row.to}`,
      );
    }
    if (!newExists) {
      throw new Error(`INF19 successor destination missing: ${row.to}`);
    }
    if (oldExists) {
      throw new Error(`INF19 predecessor must be retired: ${row.from}`);
    }
  }
}

export function assertInf16ReleaseTiltRetirement(root) {
  if (existsSync(join(root, INF16_RETIRED_RELEASE_TILT_PATH))) {
    throw new Error(
      `INF16 predecessor must be retired: ${INF16_RETIRED_RELEASE_TILT_PATH}`,
    );
  }
  for (const row of INF16_SUCCESSOR_RELOCATIONS) {
    if (existsSync(join(root, row.from))) {
      throw new Error(`INF16 predecessor must be retired: ${row.from}`);
    }
    if (!existsSync(join(root, row.to))) {
      throw new Error(`INF16 release authority missing: ${row.to}`);
    }
  }
  for (const relativePath of ['infra/images/release/build-release-images.sh']) {
    if (!existsSync(join(root, relativePath))) {
      throw new Error(`INF16 release authority missing: ${relativePath}`);
    }
  }
}

export function assertInf18DevFolderRetirement(root) {
  if (existsSync(join(root, 'infra/dev'))) {
    throw new Error('INF18 predecessor directory must be retired: infra/dev/');
  }
  for (const row of INF18_SUCCESSOR_RELOCATIONS) {
    if (existsSync(join(root, row.from))) {
      throw new Error(`INF18 predecessor must be retired: ${row.from}`);
    }
    if (!existsSync(join(root, row.to))) {
      throw new Error(`INF18 successor missing: ${row.to}`);
    }
  }
}

export function assertInf07SuccessorRelocations(root) {
  for (const row of INF07_SUCCESSOR_RELOCATIONS) {
    const oldExists = existsSync(join(root, row.from));
    const newExists = existsSync(join(root, row.to));
    if (oldExists && newExists) {
      throw new Error(
        `INF07 successor violation (both paths present): ${row.from} and ${row.to}`,
      );
    }
    if (!newExists) {
      throw new Error(`INF07 successor destination missing: ${row.to}`);
    }
    if (oldExists) {
      throw new Error(`INF07 predecessor must be retired: ${row.from}`);
    }
  }
  const releaseBuild = 'infra/images/release/build-release-images.sh';
  if (!existsSync(join(root, releaseBuild))) {
    throw new Error(`INF07 successor destination missing: ${releaseBuild}`);
  }
}

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

function relocatedDestinationPresent(root, destination) {
  return Boolean(
    gitTrackedMode(destination) || existsSync(join(root, destination)),
  );
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
  const labRows = rows.filter((r) =>
    r.from.startsWith('infra/kubernetes/lab/'),
  );
  const mapped = new Set(labRows.map((r) => r.from));
  const tracked = new Set(trackedLabPaths);
  const missing = trackedLabPaths.filter((path) => !mapped.has(path));
  if (missing.length > 0) {
    throw new Error(
      `tracked lab files missing from move map: ${missing.join(', ')}`,
    );
  }
  const extra = [];
  for (const path of mapped) {
    if (tracked.has(path)) continue;
    const row = labRows.find((entry) => entry.from === path);
    if (
      row?.to &&
      (relocatedDestinationPresent(
        repoRoot,
        effectiveMoveDestination(row.to),
      ) ||
        (effectiveMoveDestination(row.to) === INF16_RETIRED_RELEASE_TILT_PATH &&
          !existsSync(join(repoRoot, INF16_RETIRED_RELEASE_TILT_PATH))))
    ) {
      continue;
    }
    extra.push(path);
  }
  if (extra.length > 0) {
    throw new Error(
      `move map lists lab sources that are not tracked: ${extra.join(', ')}`,
    );
  }
}

export function assertTrackedModes(rows) {
  for (const row of rows) {
    const trackedMode = gitTrackedMode(row.from);
    if (!trackedMode) {
      const destination = effectiveMoveDestination(row.to);
      if (
        destination === INF16_RETIRED_RELEASE_TILT_PATH &&
        !existsSync(join(repoRoot, destination))
      ) {
        continue;
      }
      const relocatedMode = gitTrackedMode(destination);
      if (!relocatedMode) {
        assert.ok(
          existsSync(join(repoRoot, destination)),
          `expected relocated destination ${destination}`,
        );
        continue;
      }
      assert.equal(
        relocatedMode,
        row.mode,
        `mode mismatch for relocated ${row.from}: map ${row.mode}, git ${relocatedMode}`,
      );
      continue;
    }
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
    const destination = effectiveMoveDestination(row.to);
    const oldExists = existsSync(join(root, row.from));
    const newExists = existsSync(join(root, destination));
    if (oldExists && newExists) {
      throw new Error(
        `staged move violation (both paths present): ${row.from} and ${destination}`,
      );
    }
    if (!oldExists && !newExists) {
      if (
        destination === INF16_RETIRED_RELEASE_TILT_PATH &&
        !existsSync(join(root, INF16_RETIRED_RELEASE_TILT_PATH))
      ) {
        continue;
      }
      throw new Error(
        `staged move violation (neither path present): ${row.from} / ${destination}`,
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
    'tools/dev-environments/src/cli/dev-tilt.mjs',
    'scripts/repo-tools/stack.mjs',
    'scripts/repo-tools/stack-lifecycle.mjs',
    'scripts/repo-tools/stack-preflight.mjs',
    'Tiltfile',
  ]) {
    assert.ok(existsSync(join(repoRoot, relativePath)), relativePath);
  }

  const tiltfile = readFileSync(join(repoRoot, 'Tiltfile'), 'utf8');
  assert.equal(
    existsSync(join(repoRoot, INF16_RETIRED_RELEASE_TILT_PATH)),
    false,
  );
  assert.match(tiltfile, /allow_k8s_contexts\('kind-offscreen-dev'\)/);
  assert.doesNotMatch(tiltfile, /allow_k8s_contexts\('kind-offscreen-release'\)/);
  assert.doesNotMatch(tiltfile, /infra\/dev\/Tiltfile/);
  assert.match(tiltfile, /sync-plan\.mjs --tilt/);
  assertInf16ReleaseTiltRetirement(repoRoot);

  const libSh = readFileSync(
    join(repoRoot, 'infra/clusters/kind/release/lib.sh'),
    'utf8',
  );
  assert.match(libSh, /CLUSTER_NAME="offscreen-release"/);
  assert.match(libSh, /CONTEXT_NAME="kind-offscreen-release"/);
});

test('tracked INF-MOVE-MAP inventory matches HEAD and selected layout', () => {
  const map = readJson(MAP_PATH);
  const trackedLab = gitLsFiles('infra/kubernetes/lab');
  auditMoveMap(map, {
    trackedLabPaths: trackedLab,
    requireInitialOldPaths: false,
  });
  assertInf06SuccessorRelocations(repoRoot);
  assertInf07SuccessorRelocations(repoRoot);
  assertInf08WorkloadRetirement(repoRoot);
  assertInf15PlatformChartSuccessors(repoRoot);
  assertInf16ReleaseTiltRetirement(repoRoot);
  assertInf18DevFolderRetirement(repoRoot);
  assertInf19VerificationFixtureOwnership(repoRoot);
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
