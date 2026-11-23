/**
 * Ordered cold-slot reconciliation. Workloads start only after this returns ok.
 * Injected dependencies keep unit tests off the cluster. The live entrypoint
 * binds the existing provisioners; it does not call the proof trial scripts.
 */

const DEV_CLUSTER = 'kind-offscreen-dev';
const MIN_MEMORY_MIB = 1536;

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
    return value.refusals?.[0]?.detail ?? value.refusals?.[0]?.id ?? 'refused';
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

  let record;
  try {
    record = deps.allocate(input.worktree, input.registryRoot);
  } catch (error) {
    return stopped('allocate', error instanceof Error ? error.message : 'allocate failed');
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

  const retained = [];
  const sql = await deps.ensureSql(record);
  const sqlDetail = phaseResult(sql);
  if (sqlDetail) return stopped('sql', sqlDetail, sql.retained ?? []);
  retained.push(...(sql.retained ?? []));

  const migration = await deps.ensureMigration(record);
  const migrationDetail = phaseResult(migration);
  if (migrationDetail) return stopped('migration', migrationDetail, retained);

  const s3 = await deps.ensureS3(record);
  const s3Detail = phaseResult(s3);
  if (s3Detail) return stopped('s3', s3Detail, [...retained, ...(s3.retained ?? [])]);

  const temporal = await deps.ensureTemporal(record);
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

  const images = await deps.ensureImages(record, projected);
  const imageDetail = phaseResult(images);
  if (imageDetail) return stopped('images', imageDetail, retained);

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
  const { readRegistry } = await import('./dev-worktree-registry.mjs');
  const { executeDevSqlTenants } = await import('../../infra/kubernetes/lab/dev/backing/dev-sql-tenant-executor.mjs');
  const { createLiveDevSqlAdapter } = await import('../../infra/kubernetes/lab/dev/backing/dev-sql-tenant-live-adapter.mjs');
  const { ensureDevS3Tenant } = await import('../../infra/kubernetes/lab/dev/backing/dev-s3-tenant.mjs');
  const { createDevS3LiveAdapter } = await import('../../infra/kubernetes/lab/dev/backing/dev-s3-tenant-live-adapter.mjs');
  const { ensureDevTemporalTenant } = await import('../../infra/kubernetes/lab/dev/backing/dev-temporal-tenant.mjs');
  const { projectDevSlot } = await import('../../infra/kubernetes/lab/dev/backing/dev-slot-project.mjs');
  const temporal = await import('../../infra/kubernetes/lab/dev/backing/dev-temporal-bootstrap.mjs');

  return reconcileDevSlot(input, {
    allocate: allocateDevWorktreeOwner,
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
      return {
        ok: false,
        cluster: 'kind-offscreen-dev',
        memoryMiB,
        detail: cluster.status === 0
          ? 'Drizzle migration runner is not bound; refusing before tenant mutation'
          : 'kind-offscreen-dev postgres namespace is missing',
      };
    },
    ensureSql: (owner) => {
      const known = Object.values(readRegistry(input.registryRoot).ownersByWorktree).map((item) => item.slotId);
      const slots = [...new Set([owner.slotId, ...known])];
      return executeDevSqlTenants({
        slots,
        authorizeLive: 'kind-offscreen-dev-sql-tenant-live',
        adapter: createLiveDevSqlAdapter(),
      });
    },
    ensureMigration: async () => ({
      ok: false,
      refusals: [{ id: 'migration-runner-unbound', detail: 'Drizzle migration runner is not bound; tenant mutation stops before SQL' }],
    }),
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
            '--namespace', name, '--address', 'temporal-server:7233',
          ], { encoding: 'utf8', timeout: 60000 });
          const text = `${described.stdout ?? ''}${described.stderr ?? ''}`;
          if (described.status !== 0) return null;
          return {
            id: text.match(/Id\s+([0-9a-f-]{36})/i)?.[1] ?? null,
            retentionSeconds: /24h0m0s|1d|86400/.test(text) ? 86400 : 0,
          };
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
    project: (owner) => projectDevSlot({ record: owner, registryRoot: input.registryRoot, worktree: input.worktree }),
    ensureImages: (owner) => ({ ok: true, refs: { slot: owner.slotId }, rebuilt: false }),
  });
}

