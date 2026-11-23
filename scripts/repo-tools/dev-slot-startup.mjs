/**
 * Ordered cold-slot reconciliation. Workloads start only after this returns ok.
 * Injected dependencies keep unit tests off the cluster. The live entrypoint
 * binds the existing provisioners; it does not call the proof trial scripts.
 */

import { migrateOwnedDevSlot } from './dev-slot-migrate.mjs';
export { fingerprintDevImageContext, planSlotImageArtifact, planUnionImageUse, UNION_ROLE_FILTER } from './dev-slot-image-plan.mjs';
import { fingerprintDevImageContext, UNION_ROLE_FILTER as UNION_FILTER } from './dev-slot-image-plan.mjs';
import { timePhase } from './dev-startup-timing.mjs';
import { selectColdStartDocuments } from '../../infra/kubernetes/lab/dev/backing/dev-slot-app-graph.mjs';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DEV_CLUSTER = 'kind-offscreen-dev';
const MIN_MEMORY_MIB = 1536;

function oauthCandidates(worktree, env = process.env) {
  return [
    env.OFFSCREEN_DEV_OAUTH_FILE,
    join(worktree, '.env'),
    join(homedir(), '.local/state/offscreen-rpg/dev-oauth.env'),
  ].filter(Boolean);
}

function oauthFileFor(worktree, env = process.env) {
  return oauthCandidates(worktree, env).find((path) => existsSync(path)) ?? null;
}

/**
 * Content check used before SQL, S3, or Temporal mutation.
 * File selection stays override, worktree .env, then the shared home file.
 * @param {string} worktree
 * @param {NodeJS.ProcessEnv} [env]
 */
export async function resolveOauthReadiness(worktree, env = process.env) {
  const path = oauthFileFor(worktree, env);
  if (!path) return { ok: false, detail: 'approved local OAuth file is missing' };
  const { assertApprovedOauthFile } = await import('../../infra/kubernetes/lab/dev/backing/dev-slot-project.mjs');
  try {
    assertApprovedOauthFile(path);
    return { ok: true, path };
  } catch (error) {
    const detail = error instanceof Error ? error.message : '';
    if (detail === 'approved local OAuth configuration is missing' || detail === 'approved local OAuth configuration is unreadable') {
      return { ok: false, detail };
    }
    return { ok: false, detail: 'approved local OAuth configuration is missing' };
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
function stopped(phase, detail, retained = []) {
  return { ok: false, phase, detail, retained, readyForWorkloads: false };
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
      return stopped('allocate', error instanceof Error ? error.message : 'allocate failed');
    }
  }
  if (record.cluster !== DEV_CLUSTER) {
    return stopped('cluster', `refusing cluster ${record.cluster}`);
  }

  const health = await deps.probeCluster();
  if (!health?.ok || health.cluster !== DEV_CLUSTER) {
    return stopped('cluster', health?.detail ?? 'kind-offscreen-dev is not healthy');
  }
  const memory = input.memoryMiB ?? health.memoryMiB ?? 0;
  if (memory < MIN_MEMORY_MIB) {
    return stopped('capacity', `available memory ${memory}MiB is below ${MIN_MEMORY_MIB}MiB`);
  }

  if (deps.validateOauth) {
    const oauth = await deps.validateOauth(input.worktree);
    if (!oauth?.ok) return stopped('oauth', oauth?.detail ?? 'approved local OAuth configuration is missing');
  }

  const retained = [];
  const sql = await timePhase('sql', 'reconcile', () => deps.ensureSql(record));
  const sqlDetail = phaseResult(sql);
  if (sqlDetail) return stopped('sql', sqlDetail, sql.retained ?? []);
  retained.push(...(sql.retained ?? []));

  const migration = await timePhase('migration', 'reconcile', () => deps.ensureMigration(record));
  const migrationDetail = phaseResult(migration);
  if (migrationDetail) return stopped('migration', migrationDetail, retained);

  const s3 = await timePhase('s3', 'reconcile', () => deps.ensureS3(record));
  const s3Detail = phaseResult(s3);
  if (s3Detail) return stopped('s3', s3Detail, [...retained, ...(s3.retained ?? [])]);

  const temporal = await timePhase('temporal', 'reconcile', () => deps.ensureTemporal(record));
  const temporalDetail = phaseResult(temporal);
  if (temporalDetail) return stopped('temporal', temporalDetail, retained);

  let projected;
  try {
    projected = await deps.project(record);
  } catch (error) {
    return stopped('project', error instanceof Error ? error.message : 'project failed', retained);
  }
  if (projected?.ok === false) {
    return stopped('project', phaseResult(projected) ?? 'project refused', retained);
  }

  const images = await timePhase('images', 'reconcile', () => deps.ensureImages(record, projected));
  const imageDetail = phaseResult(images);
  if (imageDetail) return stopped('images', imageDetail, retained);

  if (deps.applyWorkloads) {
    const workloads = await timePhase('workloads', 'reconcile', () => deps.applyWorkloads(record, projected, images));
    const workloadDetail = phaseResult(workloads);
    if (workloadDetail) return stopped('workloads', workloadDetail, retained);
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
  return { ok: true, phase: 'ready', retained, readyForWorkloads: true, record, identities };
}

/**
 * Live binding. SQL ensure includes every registry slot so existing dev
 * databases stay in the executor's expected catalog.
 *
 * @param {{ worktree: string, registryRoot: string }} input
 */
export async function reconcileOwnedDevSlot(input) {
  const { readFileSync } = await import('node:fs');
  const { spawnSync } = await import('node:child_process');
  const { allocateDevWorktreeOwner } = await import('./dev-worktree-allocator.mjs');
  const { readRegistryJson } = await import('./dev-worktree-registry.mjs');
  const { executeDevSqlTenants } = await import('../../infra/kubernetes/lab/dev/backing/dev-sql-tenant-executor.mjs');
  const { createLiveDevSqlAdapter } = await import('../../infra/kubernetes/lab/dev/backing/dev-sql-tenant-live-adapter.mjs');
  const { ensureDevS3Tenant } = await import('../../infra/kubernetes/lab/dev/backing/dev-s3-tenant.mjs');
  const { createDevS3LiveAdapter } = await import('../../infra/kubernetes/lab/dev/backing/dev-s3-tenant-live-adapter.mjs');
  const temporalTenant = await import('../../infra/kubernetes/lab/dev/backing/dev-temporal-tenant.mjs');
  const { ensureDevTemporalTenant } = temporalTenant;
  const { projectDevSlot } = await import('../../infra/kubernetes/lab/dev/backing/dev-slot-project.mjs');
  const temporal = await import('../../infra/kubernetes/lab/dev/backing/dev-temporal-bootstrap.mjs');

  return reconcileDevSlot({ ...input, owner: input.owner }, {
    allocate: allocateDevWorktreeOwner,
    validateOauth: (worktree) => resolveOauthReadiness(worktree),
    probeCluster: async () => {
      const cluster = spawnSync('kubectl', ['--context', 'kind-offscreen-dev', 'get', 'namespace', 'offscreen-dev-postgres', '-o', 'name'], { encoding: 'utf8' });
      let memoryMiB = 0;
      try {
        const text = readFileSync('/proc/meminfo', 'utf8');
        const available = text.match(/^MemAvailable:\s+(\d+)\s+kB/m);
        memoryMiB = available ? Math.floor(Number(available[1]) / 1024) : 0;
      } catch {
        memoryMiB = 0;
      }
      const oauth = await resolveOauthReadiness(input.worktree);
      if (!oauth.ok) {
        return { ok: false, cluster: 'kind-offscreen-dev', memoryMiB, detail: oauth.detail };
      }
      const built = join(input.worktree, 'packages/db/dist/src/migrate.js');
      if (!existsSync(built)) {
        const { assertExclusiveHostWrite } = await import('./dev-host-output-guard.mjs');
        assertExclusiveHostWrite({
          checkout: input.worktree,
          registryRoot: input.registryRoot,
          selfSlotId: input.owner?.slotId,
          operation: 'database build',
          outputPath: 'packages/db/dist',
        });
        const compiled = await timePhase('database-build', 'reconcile', () => Promise.resolve(spawnSync('pnpm', ['--filter', '@offscreen/db', 'build'], { cwd: input.worktree, encoding: 'utf8' })));
        if (compiled.status !== 0 || !existsSync(built)) {
          return { ok: false, cluster: 'kind-offscreen-dev', memoryMiB, detail: 'packages/db build failed before tenant mutation' };
        }
      }
      return {
        ok: cluster.status === 0 && memoryMiB >= MIN_MEMORY_MIB,
        cluster: 'kind-offscreen-dev',
        memoryMiB,
        detail: cluster.status === 0 ? 'ready' : 'kind-offscreen-dev postgres namespace is missing',
      };
    },
    ensureSql: (owner) => {
      const raw = readRegistryJson(input.registryRoot);
      const known = raw?.version === 2
        ? Object.keys(raw.environmentsById ?? {})
        : Object.values(raw?.ownersByWorktree ?? {}).map((item) => item.slotId);
      const slots = [...new Set([owner.slotId, ...known])];
      return executeDevSqlTenants({
        slots,
        authorizeLive: 'kind-offscreen-dev-sql-tenant-live',
        adapter: createLiveDevSqlAdapter(),
      });
    },
    ensureMigration: (owner) => migrateOwnedDevSlot(owner, input.worktree),
    ensureS3: (owner) => ensureDevS3Tenant({
      slotId: owner.slotId,
      authorizeLive: 'kind-offscreen-dev-s3-tenant-live',
      adapter: createDevS3LiveAdapter(),
    }),
    ensureTemporal: (owner) => ensureDevTemporalTenant({
      slotId: owner.slotId,
      authorizeLive: 'kind-offscreen-dev-temporal-tenant-live',
      adapter: {
        identity() {
          const listed = spawnSync('kubectl', [
            '--context', temporal.DEV_TEMPORAL_CONTEXT,
            '-n', temporal.DEV_TEMPORAL_NAMESPACE,
            'get', 'deploy', 'temporal-server', '-o', 'jsonpath={.spec.template.spec.containers[0].image}',
          ], { encoding: 'utf8' });
          return {
            context: temporal.DEV_TEMPORAL_CONTEXT,
            namespace: temporal.DEV_TEMPORAL_NAMESPACE,
            owner: temporal.DEV_TEMPORAL_OWNER,
            image: (listed.stdout ?? '').trim(),
          };
        },
        async describe(name) {
          const described = spawnSync('kubectl', [
            '--context', temporal.DEV_TEMPORAL_CONTEXT,
            '-n', temporal.DEV_TEMPORAL_NAMESPACE,
            'run', `temporal-admin-describe-${Date.now()}`,
            '--rm', '-i', '--restart=Never',
            '--image', 'docker.io/temporalio/admin-tools:1.32.2',
            '--command', '--', 'temporal', 'operator', 'namespace', 'describe',
            '--namespace', name, '--address', 'temporal-server:7233', '--output', 'json',
          ], { encoding: 'utf8', timeout: 60000 });
          const text = `${described.stdout ?? ''}\n${described.stderr ?? ''}`;
          const parsed = temporalTenant.parseTemporalDescribe(text, described.status ?? 1);
          if (parsed.status === 'absent') return null;
          if (parsed.status !== 'ready') return { failure: parsed.status, detail: parsed.detail };
          return { id: parsed.id, retentionSeconds: parsed.retentionSeconds };
        },
        async create(names) {
          const created = spawnSync('kubectl', [
            '--context', temporal.DEV_TEMPORAL_CONTEXT,
            '-n', temporal.DEV_TEMPORAL_NAMESPACE,
            'run', `temporal-admin-create-${Date.now()}`,
            '--rm', '-i', '--restart=Never',
            '--image', 'docker.io/temporalio/admin-tools:1.32.2',
            '--command', '--', 'temporal', 'operator', 'namespace', 'create',
            '--namespace', names.temporalNamespace, '--retention', '1d',
            '--address', 'temporal-server:7233',
          ], { encoding: 'utf8', timeout: 60000 });
          const text = `${created.stdout ?? ''}${created.stderr ?? ''}`;
          if (created.status !== 0 && !text.includes('already exists')) {
            throw new Error('temporal namespace create failed');
          }
        },
      },
    }),
    project: (owner) => projectDevSlot({
      record: owner,
      registryRoot: input.registryRoot,
      worktree: input.worktree,
      oauthFile: oauthFileFor(input.worktree),
    }),
    ensureImages: (owner) => ensureOwnedSlotImages(owner, input.worktree),
    applyWorkloads: (_owner, projected) => applyOwnedSlotWorkloads(projected),
  });
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
  const phases = [...combined.matchAll(/^phase=(\S+) role=(\S+)(?: node=(\S+))?$/gm)];
  const last = phases.at(-1);
  const phase = last?.[1] ?? 'unknown';
  const node = last?.[3] ?? null;
  const redacted = combined
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, '[redacted-url]')
    .replace(/\b(password|secret|token|api[_-]?key)\s*[=:]\s*\S+/gi, '$1=[redacted]')
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
    detail: `role=${image.role} phase=${phase}${where} exit=${status} ${diagnostic}`.trim(),
  };
}

export async function ensureOwnedSlotImages(owner, worktree, spawnImage = null) {
  const { spawnSync } = await import('node:child_process');
  const identity = fingerprintDevImageContext(worktree, { roleFilter: UNION_FILTER });
  if (!identity.ok) {
    return { ok: false, refusals: [{ id: 'image-build', detail: `role=union phase=fingerprint exit=1 ${identity.reason}` }], rebuilt: 0 };
  }
  const run = spawnImage ?? (() => spawnSync('bash', [
    'infra/kubernetes/lab/dev/load-dev-slot-image.sh',
    owner.slotId,
    'all',
  ], {
    cwd: worktree,
    encoding: 'utf8',
    env: { ...process.env, OFFSCREEN_IMAGE_FINGERPRINT: identity.fingerprint },
  }));
  const built = run({ slotId: owner.slotId, fingerprint: identity.fingerprint, filter: UNION_FILTER });
  if (built.status !== 0) {
    return { ok: false, refusals: [describeImageLoadFailure({ role: 'union' }, built)], rebuilt: 0 };
  }
  const plan = planSlotImageBuilds(owner.slotId, () => true);
  const builds = Number(built.stdout?.match(/builds=(\d+)/)?.[1] ?? '1');
  return { ok: true, refs: plan.refs, fingerprint: identity.fingerprint, rebuilt: builds };
}

async function applyOwnedSlotWorkloads(projected) {
  const { spawnSync } = await import('node:child_process');
  const listed = spawnSync('kubectl', [
    '--context', 'kind-offscreen-dev', '-n', projected.record.namespace,
    'get', 'deployments', '-o', 'jsonpath={.items[*].metadata.name}',
  ], { encoding: 'utf8' });
  const existing = listed.status === 0 ? listed.stdout.split(/\s+/).filter(Boolean) : [];
  const list = { apiVersion: 'v1', kind: 'List', items: selectColdStartDocuments(projected.documents ?? [], existing) };
  const applied = spawnSync('kubectl', ['--context', 'kind-offscreen-dev', 'apply', '-f', '-'], {
    input: JSON.stringify(list),
    encoding: 'utf8',
  });
  if (applied.status !== 0) {
    return { ok: false, refusals: [{ id: 'workload-apply', detail: 'owned workload apply failed' }] };
  }
  return { ok: true };
}

