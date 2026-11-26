/**
 * Ordered cold-slot reconciliation. Workloads start only after this returns ok.
 * Injected dependencies keep unit tests off the cluster. The live entrypoint
 * binds the existing provisioners; it does not call the proof trial scripts.
 */

import { migrateOwnedDevSlot } from '../adapters/dev-slot-migrate.mjs';
export {
  fingerprintDevImageContext,
  planSlotImageArtifact,
  planUnionImageUse,
  UNION_ROLE_FILTER,
} from '../../../../infra/images/development/image-plan.mjs';
import {
  fingerprintDevImageContext,
  UNION_ROLE_FILTER as UNION_FILTER,
} from '../../../../infra/images/development/image-plan.mjs';
import { startupTimingChildEnv, timePhase } from './dev-startup-timing.mjs';
import {
  preserveOwnedServicePorts,
  selectColdStartDocuments,
  validateOwnedSlotInventory,
} from '../rendering/dev-slot-app-graph.mjs';
import { verifySharedCoreReadiness } from './dev-shared-core-readiness.mjs';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DEV_CLUSTER = 'kind-offscreen-dev';
const MIN_MEMORY_MIB = 1536;

/** Include workspace dependencies so a clean checkout can compile @offscreen/db. */
export const MIGRATION_PACKAGE_BUILD_ARGS = [
  '--filter',
  '@offscreen/db...',
  'build',
];

function oauthCandidates(worktree, env = process.env) {
  return [
    env.OFFSCREEN_DEV_OAUTH_FILE,
    join(worktree, '.env'),
    join(homedir(), '.local/state/offscreen-rpg/dev-oauth.env'),
  ].filter(Boolean);
}

function oauthFileFor(worktree, env = process.env) {
  return (
    oauthCandidates(worktree, env).find((path) => existsSync(path)) ?? null
  );
}

/**
 * Content check used before SQL, S3, or Temporal mutation.
 * File selection stays override, worktree .env, then the shared home file.
 * @param {string} worktree
 * @param {NodeJS.ProcessEnv} [env]
 */
export async function resolveOauthReadiness(worktree, env = process.env) {
  const path = oauthFileFor(worktree, env);
  if (!path)
    return { ok: false, detail: 'approved local OAuth file is missing' };
  const { assertApprovedOauthFile } =
    await import('../rendering/dev-slot-project.mjs');
  try {
    assertApprovedOauthFile(path);
    return { ok: true, path };
  } catch (error) {
    const detail = error instanceof Error ? error.message : '';
    if (
      detail === 'approved local OAuth configuration is missing' ||
      detail === 'approved local OAuth configuration is unreadable'
    ) {
      return { ok: false, detail };
    }
    return {
      ok: false,
      detail: 'approved local OAuth configuration is missing',
    };
  }
}

export const SLOT_IMAGE_ROLES = Object.freeze([
  ['web', '@offscreen/web^...'],
  ['api', '@offscreen/api^...'],
  ['authority', '@offscreen/game-authority^...'],
  ['worker', '@offscreen/worker^...'],
]);

/**
 * @param {string} slotId
 * @param {(ref: string) => boolean} imageExists
 */
export function planSlotImageBuilds(slotId, imageExists) {
  const refs = {};
  const missing = [];
  for (const [role, filter] of SLOT_IMAGE_ROLES) {
    const ref = `offscreen-dev-workspace:${slotId}-${role}`;
    refs[role] = ref;
    if (!imageExists(ref)) missing.push({ role, filter, ref });
  }
  return { refs, missing };
}

/**
 * @param {string} phase
 * @param {string} detail
 * @param {object[]} [retained]
 */
function stopped(phase, detail, retained = [], workloadsTouched = false) {
  return {
    ok: false,
    phase,
    detail,
    retained,
    readyForWorkloads: false,
    workloadsTouched,
  };
}

function phaseResult(value) {
  if (value && value.ok === false) {
    const refusal = value.refusals?.[0];
    if (!refusal) return 'refused';
    return refusal.detail ? `${refusal.id}: ${refusal.detail}` : refusal.id;
  }
  return null;
}

/**
 * @param {{
 *   worktree: string,
 *   registryRoot: string,
 *   memoryMiB?: number,
 *   portOccupied?: boolean,
 *   processOwned?: boolean,
 *   owner?: object,
 * }} input
 * @param {{
 *   allocate: Function,
 *   probeCluster: Function,
 *   ensureSql: Function,
 *   ensureMigration: Function,
 *   ensureS3: Function,
 *   ensureTemporal: Function,
 *   project: Function,
 *   ensureImages: Function,
 *   verifySharedCore?: () => Promise<{ ok: boolean, detail?: string }>,
 *   prepareMigrationArtifact?: (record: object) => Promise<{ ok: boolean, detail?: string }>,
 * }} deps
 */
export async function reconcileDevSlot(input, deps) {
  if (input.processOwned === false) {
    return stopped('process', 'remembered process start time does not match');
  }
  if (input.portOccupied === true) {
    return stopped('port', 'allocated loopback port is occupied');
  }

  let record = input.owner ?? null;
  if (!record) {
    try {
      record = deps.allocate(input.worktree, input.registryRoot);
    } catch (error) {
      return stopped(
        'allocate',
        error instanceof Error ? error.message : 'allocate failed',
      );
    }
  }
  if (record.cluster !== DEV_CLUSTER) {
    return stopped('cluster', `refusing cluster ${record.cluster}`);
  }

  const health = await deps.probeCluster();
  if (!health?.ok || health.cluster !== DEV_CLUSTER) {
    return stopped(
      'cluster',
      health?.detail ?? 'kind-offscreen-dev is not healthy',
    );
  }
  const memory = input.memoryMiB ?? health.memoryMiB ?? 0;
  if (memory < MIN_MEMORY_MIB) {
    return stopped(
      'capacity',
      `available memory ${memory}MiB is below ${MIN_MEMORY_MIB}MiB`,
    );
  }

  if (deps.validateOauth) {
    const oauth = await deps.validateOauth(input.worktree);
    if (!oauth?.ok)
      return stopped(
        'oauth',
        oauth?.detail ?? 'approved local OAuth configuration is missing',
      );
  }

  if (deps.verifySharedCore) {
    const core = await deps.verifySharedCore();
    if (!core?.ok) {
      return stopped(
        'platform',
        core?.detail ?? 'shared platform core is not ready',
      );
    }
  }

  if (deps.prepareMigrationArtifact) {
    const artifact = await timePhase('artifact', 'reconcile', () =>
      deps.prepareMigrationArtifact(record),
    );
    if (!artifact?.ok) {
      return stopped(
        'artifact',
        artifact?.detail ?? 'migration artifact is not ready',
        [],
      );
    }
  }

  const retained = [];
  const sql = await timePhase('sql', 'reconcile', () => deps.ensureSql(record));
  const sqlDetail = phaseResult(sql);
  if (sqlDetail) return stopped('sql', sqlDetail, sql.retained ?? []);
  retained.push(...(sql.retained ?? []));

  const migration = await timePhase('migration', 'reconcile', () =>
    deps.ensureMigration(record),
  );
  const migrationDetail = phaseResult(migration);
  if (migrationDetail) return stopped('migration', migrationDetail, retained);
  if (migration?.ok !== true) {
    return stopped(
      'migration',
      migrationDetail ?? 'migration did not produce schema proof',
      retained,
    );
  }

  const s3 = await timePhase('s3', 'reconcile', () => deps.ensureS3(record));
  const s3Detail = phaseResult(s3);
  if (s3Detail)
    return stopped('s3', s3Detail, [...retained, ...(s3.retained ?? [])]);

  const temporal = await timePhase('temporal', 'reconcile', () =>
    deps.ensureTemporal(record),
  );
  const temporalDetail = phaseResult(temporal);
  if (temporalDetail) return stopped('temporal', temporalDetail, retained);

  let projected;
  try {
    projected = await deps.project(record, migration);
  } catch (error) {
    return stopped(
      'project',
      error instanceof Error ? error.message : 'project failed',
      retained,
    );
  }
  if (projected?.ok === false) {
    return stopped(
      'project',
      phaseResult(projected) ?? 'project refused',
      retained,
    );
  }

  const images = await timePhase('images', 'reconcile', () =>
    deps.ensureImages(record, projected),
  );
  const imageDetail = phaseResult(images);
  if (imageDetail) return stopped('images', imageDetail, retained);

  let workloadsTouched = false;
  if (deps.applyWorkloads) {
    const workloads = await timePhase('workloads', 'reconcile', () =>
      deps.applyWorkloads(record, projected, images),
    );
    workloadsTouched = Boolean(workloads?.workloadsTouched);
    const workloadDetail = phaseResult(workloads);
    if (workloadDetail) {
      return stopped('workloads', workloadDetail, retained, workloadsTouched);
    }
  }

  const identities = {
    slotId: record.slotId,
    namespace: record.namespace,
    cluster: record.cluster,
    secretUids: {
      db: projected.dbUid ?? null,
      s3: projected.s3Uid ?? null,
      app: projected.appUid ?? null,
    },
    images: images.refs ?? projected.images ?? null,
  };
  const serialized = JSON.stringify(identities);
  if (/password|secret-access-key|github-client-secret/i.test(serialized)) {
    return stopped('redaction', 'resource report included a credential');
  }
  return {
    ok: true,
    phase: 'ready',
    retained,
    readyForWorkloads: true,
    record,
    identities,
    workloadsTouched,
  };
}

/**
 * Host compile for migration entrypoint after admission gates; read-only when present.
 *
 * @param {{ worktree: string, registryRoot: string }} input
 * @param {{ slotId: string }} record
 * @param {{ spawnSync?: typeof import('node:child_process').spawnSync }} [deps]
 */
export async function prepareMigrationArtifact(input, record, deps = {}) {
  const { spawnSync: defaultSpawnSync } = await import('node:child_process');
  const spawnSync = deps.spawnSync ?? defaultSpawnSync;
  const built = join(input.worktree, 'packages/db/dist/src/migrate.js');
  if (!existsSync(built)) {
    const { assertExclusiveHostWrite } =
      await import('../domain/dev-host-output-guard.mjs');
    assertExclusiveHostWrite({
      checkout: input.worktree,
      registryRoot: input.registryRoot,
      selfSlotId: record.slotId,
      operation: 'database build',
      outputPath: 'packages/db/dist',
    });
    const compiled = await timePhase('database-build', 'reconcile', () =>
      Promise.resolve(
        spawnSync('pnpm', MIGRATION_PACKAGE_BUILD_ARGS, {
          cwd: input.worktree,
          encoding: 'utf8',
          env: { ...process.env, ...startupTimingChildEnv() },
        }),
      ),
    );
    if (compiled.status !== 0 || !existsSync(built)) {
      return {
        ok: false,
        detail: 'packages/db build failed before tenant mutation',
      };
    }
  }
  return { ok: true };
}

/**
 * @param {{ slotId: string }} owner
 * @param {{
 *   status?: () => { state: string, reason?: string },
 *   ensureTenant?: (input: object) => Promise<object>,
 * }} [deps]
 */
export async function admitOwnedDevS3Tenant(owner, deps = {}) {
  const { statusObjectStorage } =
    await import('../../../../infra/platform/object-storage/providers/seaweedfs/install.mjs');
  const status = deps.status?.() ?? statusObjectStorage('dev');
  if (status.state !== 'native-noop') {
    return {
      ok: false,
      detail: status.reason ?? status.state,
      retained: [],
    };
  }
  if (deps.ensureTenant) {
    return deps.ensureTenant({
      slotId: owner.slotId,
      authorizeLive: 'kind-offscreen-dev-s3-tenant-live',
    });
  }
  const { ensureDevS3Tenant } = await import('../adapters/dev-s3-tenant.mjs');
  const { createDevS3LiveAdapter } =
    await import('../adapters/dev-s3-tenant-live-adapter.mjs');
  return ensureDevS3Tenant({
    slotId: owner.slotId,
    authorizeLive: 'kind-offscreen-dev-s3-tenant-live',
    adapter: createDevS3LiveAdapter(),
  });
}

/**
 * Live binding. SQL ensure includes every registry slot so existing dev
 * databases stay in the executor's expected catalog.
 *
 * @param {{ worktree: string, registryRoot: string, owner?: object, launchAdmissionProved?: boolean }} input
 */
export async function reconcileOwnedDevSlot(input) {
  const { readFileSync } = await import('node:fs');
  const { spawnSync } = await import('node:child_process');
  const readAvailableMemoryMiB = () => {
    try {
      const text = readFileSync('/proc/meminfo', 'utf8');
      const available = text.match(/^MemAvailable:\s+(\d+)\s+kB/m);
      return available ? Math.floor(Number(available[1]) / 1024) : 0;
    } catch {
      return 0;
    }
  };
  if (input.launchAdmissionProved !== true) {
    const { assertHelmAvailable } =
      await import('../../../../infra/workloads/render.mjs');
    try {
      assertHelmAvailable({ run: spawnSync });
    } catch (error) {
      return stopped(
        'helm',
        error instanceof Error ? error.message : 'helm is not available',
      );
    }
  }
  const { allocateDevWorktreeOwner } =
    await import('../domain/dev-worktree-allocator.mjs');
  const { readRegistryJson } =
    await import('../domain/dev-worktree-registry.mjs');
  const { executeDevSqlTenants } =
    await import('../adapters/dev-sql-tenant-executor.mjs');
  const { createLiveDevSqlAdapter } =
    await import('../adapters/dev-sql-tenant-live-adapter.mjs');
  const temporalTenant = await import('../adapters/dev-temporal-tenant.mjs');
  const { ensureDevTemporalTenant } = temporalTenant;
  const { projectDevSlot } = await import('../rendering/dev-slot-project.mjs');
  const { readPlatformProfile } =
    await import('../../../../infra/platform/common/profile.mjs');
  const { observeTemporalReady } =
    await import('../../../../infra/platform/temporal/readiness.mjs');
  const { describeTemporalNamespace, createTemporalNamespace } =
    await import('../../../../infra/platform/temporal/namespaces.mjs');
  const temporal = readPlatformProfile('dev');

  return reconcileDevSlot(
    { ...input, owner: input.owner },
    {
      allocate: allocateDevWorktreeOwner,
      validateOauth: (worktree) => resolveOauthReadiness(worktree),
      verifySharedCore: () =>
        verifySharedCoreReadiness({
          run: (command, args) => {
            const result = spawnSync(command, args, {
              encoding: 'utf8',
              timeout: 30_000,
            });
            return {
              status: result.status,
              stdout: result.stdout ?? '',
              stderr: result.stderr ?? '',
            };
          },
        }),
      prepareMigrationArtifact: (record) =>
        prepareMigrationArtifact(input, record),
      probeCluster: async () => {
        const cluster = spawnSync(
          'kubectl',
          [
            '--context',
            'kind-offscreen-dev',
            'get',
            'namespace',
            'offscreen-dev-postgres',
            '-o',
            'name',
          ],
          { encoding: 'utf8' },
        );
        const memoryMiB = readAvailableMemoryMiB();
        return {
          ok: cluster.status === 0 && memoryMiB >= MIN_MEMORY_MIB,
          cluster: 'kind-offscreen-dev',
          memoryMiB,
          detail:
            cluster.status === 0
              ? 'ready'
              : 'kind-offscreen-dev postgres namespace is missing',
        };
      },
      ensureSql: (owner) => {
        const raw = readRegistryJson(input.registryRoot);
        const known =
          raw?.version === 2
            ? Object.keys(raw.environmentsById ?? {})
            : Object.values(raw?.ownersByWorktree ?? {}).map(
                (item) => item.slotId,
              );
        const knownSlots = [...new Set([owner.slotId, ...known])];
        return executeDevSqlTenants({
          knownSlots,
          selectedSlot: owner.slotId,
          authorizeLive: 'kind-offscreen-dev-sql-tenant-live',
          adapter: createLiveDevSqlAdapter(),
        });
      },
      ensureMigration: (owner) => migrateOwnedDevSlot(owner, input.worktree),
      ensureS3: (owner) => admitOwnedDevS3Tenant(owner),
      ensureTemporal: (owner) =>
        ensureDevTemporalTenant({
          slotId: owner.slotId,
          authorizeLive: 'kind-offscreen-dev-temporal-tenant-live',
          adapter: {
            identity() {
              return {
                context: temporal.contextName,
                namespace: temporal.namespaces.temporal,
                owner: temporal.ownerValue,
                ready: observeTemporalReady('dev').ok,
              };
            },
            describe: (name) => describeTemporalNamespace('dev', name),
            create: (names) =>
              createTemporalNamespace('dev', names.temporalNamespace, 1),
            wait: () => new Promise((resolve) => setTimeout(resolve, 1000)),
          },
        }),
      project: (owner, migration) =>
        projectDevSlot({
          record: owner,
          oauthFile: oauthFileFor(input.worktree),
          schemaProof: {
            ok: true,
            slotId: migration.slotId ?? owner.slotId,
            appliedMigrations: migration.appliedMigrations,
            expectedMigrations: migration.expectedMigrations,
          },
        }),
      ensureImages: (owner) => ensureOwnedSlotImages(owner, input.worktree),
      applyWorkloads: (_owner, projected) => applyOwnedSlotWorkloads(projected),
    },
  );
}

const IMAGE_DIAGNOSTIC_LIMIT = 1200;

/**
 * Turn a slot image subprocess result into a bounded refusal.
 * Phase lines are emitted by load-dev-slot-image.sh.
 * @param {{ role: string }} image
 * @param {{ status: number | null, stdout?: string, stderr?: string }} built
 */
export function describeImageLoadFailure(image, built) {
  const combined = `${built.stderr ?? ''}\n${built.stdout ?? ''}`;
  const phases = [
    ...combined.matchAll(/^phase=(\S+) role=(\S+)(?: node=(\S+))?$/gm),
  ];
  const last = phases.at(-1);
  const phase = last?.[1] ?? 'unknown';
  const node = last?.[3] ?? null;
  const redacted = combined
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, '[redacted-url]')
    .replace(
      /\b(password|secret|token|api[_-]?key)\s*[=:]\s*\S+/gi,
      '$1=[redacted]',
    )
    .replace(/\bAKIA[0-9A-Z]{16}\b/g, '[redacted-key]');
  const diagnostic = redacted
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('phase='))
    .slice(-8)
    .join(' | ')
    .slice(-IMAGE_DIAGNOSTIC_LIMIT);
  const status = built.status ?? 'null';
  const where = node ? ` node=${node}` : '';
  return {
    id: 'image-build',
    detail:
      `role=${image.role} phase=${phase}${where} exit=${status} ${diagnostic}`.trim(),
  };
}

export async function ensureOwnedSlotImages(
  owner,
  worktree,
  spawnImage = null,
) {
  const { spawnSync } = await import('node:child_process');
  const identity = fingerprintDevImageContext(worktree, {
    roleFilter: UNION_FILTER,
  });
  if (!identity.ok) {
    return {
      ok: false,
      refusals: [
        {
          id: 'image-build',
          detail: `role=union phase=fingerprint exit=1 ${identity.reason}`,
        },
      ],
      rebuilt: 0,
    };
  }
  const run =
    spawnImage ??
    (() =>
      spawnSync(
        'bash',
        [
          'infra/images/development/load-dev-slot-image.sh',
          owner.slotId,
          'all',
        ],
        {
          cwd: worktree,
          encoding: 'utf8',
          env: {
            ...process.env,
            ...startupTimingChildEnv(),
            OFFSCREEN_IMAGE_FINGERPRINT: identity.fingerprint,
          },
        },
      ));
  const built = run({
    slotId: owner.slotId,
    fingerprint: identity.fingerprint,
    filter: UNION_FILTER,
  });
  if (built.status !== 0) {
    return {
      ok: false,
      refusals: [describeImageLoadFailure({ role: 'union' }, built)],
      rebuilt: 0,
    };
  }
  const plan = planSlotImageBuilds(owner.slotId, () => true);
  const builds = Number(built.stdout?.match(/builds=(\d+)/)?.[1] ?? '1');
  return {
    ok: true,
    refs: plan.refs,
    fingerprint: identity.fingerprint,
    rebuilt: builds,
  };
}

function workloadRefusal(id, detail) {
  return { ok: false, workloadsTouched: false, refusals: [{ id, detail }] };
}

/**
 * @param {string} text
 */
function parseClusterJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function applyOwnedSlotWorkloads(projected, deps = {}) {
  const { spawnSync } = await import('node:child_process');
  const run = deps.run ?? spawnSync;
  const context = 'kind-offscreen-dev';
  const namespace = projected.record.namespace;
  const slotId = projected.record.slotId;
  const { assertHelmAvailable } =
    await import('../../../../infra/workloads/render.mjs');
  try {
    assertHelmAvailable({ run: deps.helmRun ?? run });
  } catch (error) {
    return workloadRefusal(
      'helm',
      error instanceof Error ? error.message : 'helm is not available',
    );
  }
  if (deps.skipRenderCheck !== true) {
    try {
      const { renderDevSlotAppGraph } =
        await import('../rendering/dev-slot-app-graph.mjs');
      renderDevSlotAppGraph(slotId, {
        schemaReady: true,
        ports: projected.record.ports,
      });
    } catch (error) {
      return workloadRefusal(
        'render',
        error instanceof Error ? error.message : 'workload render failed',
      );
    }
  }

  const documents = projected.documents ?? [];
  const namespaceDoc = documents.find((item) => item.kind === 'Namespace');
  if (namespaceDoc?.metadata?.name) {
    const observedNamespace = run(
      'kubectl',
      [
        '--context',
        context,
        'get',
        'namespace',
        namespaceDoc.metadata.name,
        '-o',
        'json',
      ],
      { encoding: 'utf8' },
    );
    if (observedNamespace.status !== 0 || observedNamespace.error) {
      return workloadRefusal(
        'workload-inventory',
        'owned workload inventory read failed',
      );
    }
    const namespaceJson = parseClusterJson(observedNamespace.stdout ?? '');
    if (!namespaceJson?.metadata?.name) {
      return workloadRefusal(
        'workload-inventory',
        'owned workload inventory read malformed',
      );
    }
    const renderedLabels = namespaceDoc.metadata.labels ?? {};
    const observedLabels = namespaceJson.metadata.labels ?? {};
    if (
      observedLabels['offscreen.dev/slot'] !==
        renderedLabels['offscreen.dev/slot'] ||
      observedLabels['offscreen.dev/owner'] !==
        renderedLabels['offscreen.dev/owner']
    ) {
      return workloadRefusal(
        'workload-inventory',
        `managed-name collision ${namespaceJson.metadata.name}`,
      );
    }
  }

  const listed = run(
    'kubectl',
    [
      '--context',
      context,
      '-n',
      namespace,
      'get',
      'deployments,services',
      '-o',
      'json',
    ],
    { encoding: 'utf8' },
  );
  if (listed.status !== 0 || listed.error) {
    return workloadRefusal(
      'workload-inventory',
      'owned workload inventory read failed',
    );
  }
  const inventory = parseClusterJson(listed.stdout ?? '');
  if (!inventory) {
    return workloadRefusal(
      'workload-inventory',
      'owned workload inventory read malformed',
    );
  }
  const validation = validateOwnedSlotInventory(inventory, slotId);
  if (!validation.ok) {
    return workloadRefusal(validation.id, validation.detail);
  }

  const existingDeployments = (inventory.items ?? [])
    .filter((item) => item.kind === 'Deployment')
    .map((item) => item.metadata?.name ?? '')
    .filter(Boolean);
  const pending = selectColdStartDocuments(documents, existingDeployments);
  const deploymentsToCreate = pending.filter(
    (item) => item.kind === 'Deployment',
  );
  const servicesToApply = preserveOwnedServicePorts(
    documents,
    inventory.items ?? [],
  );

  if (deploymentsToCreate.length === 0 && servicesToApply.length === 0) {
    return { ok: true, workloadsTouched: false };
  }

  let workloadsTouched = false;

  if (deploymentsToCreate.length > 0) {
    const created = run(
      'kubectl',
      ['--context', context, '-n', namespace, 'create', '-f', '-'],
      {
        input: JSON.stringify({
          apiVersion: 'v1',
          kind: 'List',
          items: deploymentsToCreate,
        }),
        encoding: 'utf8',
      },
    );
    if (created.status === 0) {
      workloadsTouched = true;
    } else {
      return {
        ok: false,
        workloadsTouched,
        refusals: [
          { id: 'workload-apply', detail: 'owned workload apply failed' },
        ],
      };
    }
  }

  if (servicesToApply.length > 0) {
    const applied = run(
      'kubectl',
      ['--context', context, '-n', namespace, 'apply', '-f', '-'],
      {
        input: JSON.stringify({
          apiVersion: 'v1',
          kind: 'List',
          items: servicesToApply,
        }),
        encoding: 'utf8',
      },
    );
    if (applied.status === 0) {
      workloadsTouched = true;
      return { ok: true, workloadsTouched };
    }
    return {
      ok: false,
      workloadsTouched,
      refusals: [
        { id: 'workload-apply', detail: 'owned workload apply failed' },
      ],
    };
  }

  return { ok: true, workloadsTouched };
}
