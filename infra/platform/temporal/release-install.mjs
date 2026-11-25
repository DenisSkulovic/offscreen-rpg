#!/usr/bin/env node
// Release Temporal installer. Invoked from install.sh after digest and volume guards.

import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPlatformObject } from '../common/commands.mjs';
import { readPlatformProfile } from '../common/profile.mjs';
import {
  renderPlatformDocuments,
  renderPlatformManifestText,
  renderPlatformYaml,
} from '../common/render.mjs';
import { decideTemporalBootstrap } from './schema-policy.mjs';
import { TEMPORAL_LEGACY_YAML_SUCCESSORS } from './dev-bootstrap.mjs';
import { probeLegacyTemporalSql } from './legacy-sql-probe.mjs';

const temporalRoot = dirname(fileURLToPath(import.meta.url));
const chartRoot = join(temporalRoot, 'chart');

const releaseProfile = readPlatformProfile('release');
const RELEASE_NAMESPACE = releaseProfile.namespaces.temporal;
const RELEASE_OWNER = releaseProfile.ownerValue;
const RELEASE_SECRET = 'temporal-db';
const RELEASE_SCHEMA_JOB = 'temporal-schema';
const RELEASE_NAMESPACE_JOB = 'temporal-namespace';
const RELEASE_SQL_PROBE_TIMEOUT_MS = 30_000;

export { TEMPORAL_LEGACY_YAML_SUCCESSORS };

/**
 * @param {object | undefined} object
 */
function classifyReleaseObject(object) {
  if (!object) return 'absent';
  const owner =
    object.metadata?.labels?.['offscreen.rpg/lab'] ??
    object.metadata?.labels?.['offscreen.dev/owner'] ??
    null;
  if (owner !== RELEASE_OWNER) return 'foreign';
  return 'owned';
}

/**
 * @param {object | undefined} status
 * @returns {'Complete' | 'Failed' | 'Pending' | 'Unknown'}
 */
function jobConditionFromStatus(status) {
  const conditions = Array.isArray(status?.conditions) ? status.conditions : [];
  const complete = conditions.find((item) => item.type === 'Complete');
  if (complete?.status === 'True') return 'Complete';
  if (complete?.status === 'False') return 'Failed';
  if (Number(status?.succeeded ?? 0) >= 1) return 'Complete';
  if (Number(status?.failed ?? 0) > 0) return 'Failed';
  if (status?.active != null) return 'Pending';
  return 'Unknown';
}

/**
 * @param {object} object
 */
function toObservation(object) {
  return {
    state: 'present',
    foreign: classifyReleaseObject(object) === 'foreign',
    owner:
      object.metadata?.labels?.['offscreen.rpg/lab'] ??
      object.metadata?.labels?.['offscreen.dev/owner'] ??
      null,
    uid: object.metadata?.uid,
    image: object.spec?.template?.spec?.containers?.[0]?.image,
    condition:
      object.kind === 'Job' ? jobConditionFromStatus(object.status) : undefined,
  };
}

/**
 * @param {string} resource
 * @param {string} name
 * @param {boolean} [namespaced]
 * @param {{ run?: import('../common/commands.mjs').runPlatformCommand }} [deps]
 */
function readObservation(resource, name, namespaced = true, deps = {}) {
  const result = readPlatformObject(
    {
      profileId: 'release',
      resource,
      name,
      namespace: namespaced ? RELEASE_NAMESPACE : undefined,
    },
    deps,
  );
  if (result.state === 'unreadable')
    return { state: 'unreadable', reason: result.reason };
  if (result.state === 'absent') return { state: 'absent' };
  return toObservation(result.object);
}

/**
 * @param {{ run?: Function, defaultNamespace?: object, clusterHealth?: object, sql?: object, serverHealth?: object }} [deps]
 */
export function observeReleaseTemporal(deps = {}) {
  return {
    namespace: readObservation('namespace', RELEASE_NAMESPACE, false, deps),
    secret: readObservation('secret', RELEASE_SECRET, true, deps),
    pvc: readObservation(
      'persistentvolumeclaim',
      'temporal-postgres',
      true,
      deps,
    ),
    postgres: readObservation('deployment', 'temporal-postgres', true, deps),
    server: readObservation('deployment', 'temporal-server', true, deps),
    admin: readObservation('deployment', 'temporal-admin', true, deps),
    schemaJob: readObservation('job', RELEASE_SCHEMA_JOB, true, deps),
    namespaceJob: readObservation('job', RELEASE_NAMESPACE_JOB, true, deps),
    defaultNamespace: deps.defaultNamespace ?? { state: 'absent' },
    clusterHealth: deps.clusterHealth ?? { state: 'absent' },
    sql: deps.sql,
    serverHealth: deps.serverHealth,
  };
}

/**
 * @param {ReturnType<typeof observeReleaseTemporal>} observations
 */
export function planReleaseTemporalInstall(observations) {
  const bootstrap = decideTemporalBootstrap({
    profileId: 'release',
    ownerValue: RELEASE_OWNER,
    namespace: observations.namespace,
    secret: observations.secret,
    pvc: observations.pvc,
    postgres: observations.postgres,
    server: observations.server,
    schemaJob: observations.schemaJob,
    sql: observations.sql,
    serverHealth: observations.serverHealth,
    verifiedExistingSchema: false,
  });

  if (!bootstrap.ok) return bootstrap;

  /** @type {object[]} */
  const actions = [...bootstrap.actions];

  if (observations.admin?.state === 'unreadable') {
    return {
      ok: false,
      refusals: [
        {
          id: 'resource-unreadable-admin',
          detail: 'admin Deployment observation is unreadable',
        },
      ],
      actions: [],
    };
  }
  if (observations.admin?.state === 'present' && observations.admin.foreign) {
    return {
      ok: false,
      refusals: [
        {
          id: 'foreign-admin',
          detail: 'temporal-admin exists without lab ownership',
        },
      ],
      actions: [],
    };
  }
  if (observations.admin?.state === 'absent') {
    actions.push({ op: 'apply-admin' });
  } else if (observations.admin?.state === 'present') {
    actions.push({ op: 'reuse-admin' });
  }

  const health = observations.clusterHealth?.state;
  const serverReady = observations.server?.state === 'present';
  if (serverReady && (health === 'healthy' || health === 'release-serving')) {
    if (observations.namespaceJob?.state === 'unreadable') {
      return {
        ok: false,
        refusals: [
          {
            id: 'resource-unreadable-namespace-job',
            detail: 'namespace Job observation is unreadable',
          },
        ],
        actions: [],
      };
    }
    if (observations.namespaceJob?.state === 'present') {
      if (observations.namespaceJob.condition === 'Failed') {
        return {
          ok: false,
          refusals: [
            {
              id: 'namespace-job-failed',
              detail:
                'the default namespace Job failed and will not be deleted',
            },
          ],
          actions: [],
        };
      }
      if (observations.namespaceJob.condition === 'Pending') {
        actions.push({
          op: 'wait-namespace-job',
          uid: observations.namespaceJob.uid,
        });
      } else if (observations.namespaceJob.condition === 'Complete') {
        actions.push({ op: 'reuse-namespace-job' });
      }
    } else if (observations.defaultNamespace?.state === 'present') {
      actions.push({ op: 'reuse-default-namespace' });
    } else if (observations.defaultNamespace?.state === 'unreadable') {
      return {
        ok: false,
        refusals: [
          {
            id: 'default-namespace-unreadable',
            detail: 'default Temporal namespace could not be described',
          },
        ],
        actions: [],
      };
    } else if (observations.defaultNamespace?.state === 'absent') {
      actions.push({ op: 'create-namespace-job' });
      actions.push({ op: 'wait-namespace-job' });
    }
  }

  return { ok: true, refusals: bootstrap.refusals, actions };
}

/**
 * @param {'namespace' | 'postgres' | 'schema' | 'server' | 'admin' | 'namespace-job'} section
 */
export function renderReleaseSection(section) {
  return renderPlatformYaml(
    renderPlatformDocuments(
      { service: 'temporal', profile: 'release', section },
      { chartRoot },
    ),
  );
}

/**
 * @param {object} deps
 */
const RELEASE_REUSE_OPS = new Set([
  'reuse-secret',
  'reuse-schema-job',
  'reuse-existing-schema',
  'reuse-server',
  'reuse-admin',
  'reuse-namespace-job',
  'reuse-default-namespace',
]);

/**
 * @param {unknown} result
 * @returns {result is { ok: true }}
 */
function readinessOk(result) {
  return (
    result != null &&
    typeof result === 'object' &&
    /** @type {{ ok?: unknown }} */ (result).ok === true
  );
}

export function executeReleaseTemporalInstall(deps) {
  const plan = planReleaseTemporalInstall(deps.observe());
  if (!plan.ok) return { ...plan, mutated: false, writes: [] };

  /** @type {object[]} */
  const completed = [];
  /** @type {string[]} */
  const writes = [];

  for (const action of plan.actions) {
    if (RELEASE_REUSE_OPS.has(action.op)) {
      completed.push(action);
      continue;
    }

    if (
      action.op === 'wait-authenticated-sql' ||
      action.op === 'verify-schema-tables'
    ) {
      const phase =
        action.op === 'wait-authenticated-sql' ? 'authenticated' : 'schema';
      /** @type {{ ok: boolean, refusals?: { id: string, detail: string }[] }} */
      let probe;
      if (typeof deps.probeSql !== 'function') {
        probe = {
          ok: false,
          refusals: [
            {
              id: 'sql-probe-missing',
              detail: 'SQL probe callback is missing',
            },
          ],
        };
      } else {
        try {
          probe = deps.probeSql(phase);
        } catch {
          probe = {
            ok: false,
            refusals: [
              {
                id: 'sql-probe-threw',
                detail: 'SQL probe callback threw',
              },
            ],
          };
        }
      }
      if (probe == null || typeof probe !== 'object') {
        probe = {
          ok: false,
          refusals: [{ id: 'sql-probe-failed', detail: 'SQL probe failed' }],
        };
      }
      const probeOk = probe.ok === true;
      completed.push({
        ...action,
        ok: probeOk,
        refusals: probe.refusals ?? [],
      });
      if (!probeOk) {
        return {
          ok: false,
          mutated: writes.length > 0,
          refusals: probe.refusals ?? [
            { id: 'sql-probe-failed', detail: 'SQL probe failed' },
          ],
          actions: completed,
          writes,
        };
      }
      continue;
    }

    if (action.op === 'wait-postgres-ready') {
      if (typeof deps.waitPostgresReady !== 'function') {
        const refusals = [
          {
            id: 'postgres-wait-missing',
            detail: 'postgres ready waiter is missing',
          },
        ];
        completed.push({ ...action, ok: false, refusals });
        return {
          ok: false,
          mutated: writes.length > 0,
          refusals,
          actions: completed,
          writes,
        };
      }
      /** @type {unknown} */
      let ready;
      try {
        ready = deps.waitPostgresReady();
      } catch {
        const refusals = [
          {
            id: 'postgres-not-ready',
            detail: 'PostgreSQL rollout did not finish',
          },
        ];
        completed.push({ ...action, ok: false, refusals });
        return {
          ok: false,
          mutated: writes.length > 0,
          refusals,
          actions: completed,
          writes,
        };
      }
      if (!readinessOk(ready)) {
        const refusals =
          ready != null &&
          typeof ready === 'object' &&
          Array.isArray(/** @type {{ refusals?: unknown }} */ (ready).refusals)
            ? /** @type {{ refusals: { id: string, detail: string }[] }} */ (
                ready
              ).refusals
            : [
                {
                  id: 'postgres-not-ready',
                  detail: 'PostgreSQL rollout did not finish',
                },
              ];
        completed.push({ ...action, ok: false, refusals });
        return {
          ok: false,
          mutated: writes.length > 0,
          refusals,
          actions: completed,
          writes,
        };
      }
      completed.push({ ...action, .../** @type {object} */ (ready) });
      continue;
    }

    if (action.op === 'wait-schema-job' || action.op === 'wait-namespace-job') {
      const waiter =
        action.op === 'wait-schema-job'
          ? deps.waitSchemaJob
          : deps.waitNamespaceJob;
      if (typeof waiter !== 'function') {
        const refusals = [
          {
            id: `${action.op}-wait-missing`,
            detail: 'job wait callback is missing',
          },
        ];
        completed.push({ ...action, ok: false, refusals });
        return {
          ok: false,
          mutated: writes.length > 0,
          refusals,
          actions: completed,
          writes,
        };
      }
      /** @type {unknown} */
      let ready;
      try {
        ready = waiter();
      } catch {
        const refusals = [
          { id: `${action.op}-failed`, detail: 'job wait failed' },
        ];
        completed.push({ ...action, ok: false, refusals });
        return {
          ok: false,
          mutated: writes.length > 0,
          refusals,
          actions: completed,
          writes,
        };
      }
      if (!readinessOk(ready)) {
        const refusals =
          ready != null &&
          typeof ready === 'object' &&
          Array.isArray(/** @type {{ refusals?: unknown }} */ (ready).refusals)
            ? /** @type {{ refusals: { id: string, detail: string }[] }} */ (
                ready
              ).refusals
            : [{ id: `${action.op}-failed`, detail: 'job wait failed' }];
        completed.push({ ...action, ok: false, refusals });
        return {
          ok: false,
          mutated: writes.length > 0,
          refusals,
          actions: completed,
          writes,
        };
      }
      completed.push({ ...action, .../** @type {object} */ (ready) });
      continue;
    }

    if (action.op === 'create-secret') {
      const password =
        deps.generatePassword?.() ?? randomBytes(24).toString('hex');
      const manifest = `apiVersion: v1\nkind: Secret\nmetadata:\n  name: ${RELEASE_SECRET}\n  namespace: ${RELEASE_NAMESPACE}\n  labels:\n    offscreen.rpg/lab: ${RELEASE_OWNER}\ntype: Opaque\nstringData:\n  password: ${password}\n`;
      const created = deps.kubectl(['create', '-f', '-'], { input: manifest });
      writes.push('create-secret');
      completed.push({ op: 'create-secret' });
      if (!created.ok) {
        if (created.stderr?.includes('AlreadyExists')) {
          return {
            ok: false,
            reobserve: true,
            mutated: writes.length > 0,
            refusals: [
              {
                id: 'secret-create-conflict',
                detail: 'secret already exists; reobserve',
              },
            ],
            actions: completed,
            writes,
          };
        }
        return {
          ok: false,
          mutated: writes.length > 0,
          refusals: [
            { id: 'create-secret-failed', detail: 'secret create failed' },
          ],
          actions: completed,
          writes,
        };
      }
      continue;
    }

    const sectionByOp = {
      'ensure-namespace': 'namespace',
      'apply-postgres': 'postgres',
      'create-schema-job': 'schema',
      'apply-server': 'server',
      'apply-admin': 'admin',
      'create-namespace-job': 'namespace-job',
    };
    if (!Object.hasOwn(sectionByOp, action.op)) {
      return {
        ok: false,
        mutated: writes.length > 0,
        refusals: [
          {
            id: 'unknown-action',
            detail: 'unsupported Temporal install action',
          },
        ],
        actions: completed,
        writes,
      };
    }
    const section =
      sectionByOp[/** @type {keyof typeof sectionByOp} */ (action.op)];
    const verb =
      action.op === 'create-schema-job' || action.op === 'create-namespace-job'
        ? 'create'
        : 'apply';
    const manifest = renderReleaseSection(section);
    const applied = deps.kubectl([verb, '-f', '-'], {
      input: manifest,
      namespaced: section !== 'namespace',
    });
    writes.push(action.op);
    completed.push({ op: action.op });
    if (!applied.ok) {
      return {
        ok: false,
        mutated: writes.length > 0,
        refusals: [
          {
            id: `${action.op}-failed`,
            detail: 'apply failed; owned data was not deleted',
          },
        ],
        actions: completed,
        writes,
      };
    }
    if (action.op === 'apply-server') {
      if (typeof deps.waitServerReady !== 'function') {
        const refusals = [
          {
            id: 'server-wait-missing',
            detail: 'server ready waiter is missing',
          },
        ];
        completed.push({ op: 'verify-server-ready', ok: false, refusals });
        return {
          ok: false,
          mutated: writes.length > 0,
          refusals,
          actions: completed,
          writes,
        };
      }
      /** @type {unknown} */
      let ready;
      try {
        ready = deps.waitServerReady();
      } catch {
        const refusals = [
          {
            id: 'server-not-ready',
            detail: 'Temporal server did not become ready',
          },
        ];
        completed.push({ op: 'verify-server-ready', ok: false, refusals });
        return {
          ok: false,
          mutated: writes.length > 0,
          refusals,
          actions: completed,
          writes,
        };
      }
      if (!readinessOk(ready)) {
        const refusals =
          ready != null &&
          typeof ready === 'object' &&
          Array.isArray(/** @type {{ refusals?: unknown }} */ (ready).refusals)
            ? /** @type {{ refusals: { id: string, detail: string }[] }} */ (
                ready
              ).refusals
            : [
                {
                  id: 'server-not-ready',
                  detail: 'Temporal server did not become ready',
                },
              ];
        completed.push({ op: 'verify-server-ready', ok: false, refusals });
        return {
          ok: false,
          mutated: writes.length > 0,
          refusals,
          actions: completed,
          writes,
        };
      }
      completed.push({
        op: 'verify-server-ready',
        .../** @type {object} */ (ready),
      });
    }
    if (action.op === 'apply-admin') {
      if (typeof deps.waitAdminReady !== 'function') {
        const refusals = [
          {
            id: 'admin-wait-missing',
            detail: 'admin ready waiter is missing',
          },
        ];
        completed.push({ op: 'verify-admin-ready', ok: false, refusals });
        return {
          ok: false,
          mutated: writes.length > 0,
          refusals,
          actions: completed,
          writes,
        };
      }
      /** @type {unknown} */
      let ready;
      try {
        ready = deps.waitAdminReady();
      } catch {
        const refusals = [
          {
            id: 'admin-not-ready',
            detail: 'Temporal admin did not become ready',
          },
        ];
        completed.push({ op: 'verify-admin-ready', ok: false, refusals });
        return {
          ok: false,
          mutated: writes.length > 0,
          refusals,
          actions: completed,
          writes,
        };
      }
      if (!readinessOk(ready)) {
        const refusals =
          ready != null &&
          typeof ready === 'object' &&
          Array.isArray(/** @type {{ refusals?: unknown }} */ (ready).refusals)
            ? /** @type {{ refusals: { id: string, detail: string }[] }} */ (
                ready
              ).refusals
            : [
                {
                  id: 'admin-not-ready',
                  detail: 'Temporal admin did not become ready',
                },
              ];
        completed.push({ op: 'verify-admin-ready', ok: false, refusals });
        return {
          ok: false,
          mutated: writes.length > 0,
          refusals,
          actions: completed,
          writes,
        };
      }
      completed.push({
        op: 'verify-admin-ready',
        .../** @type {object} */ (ready),
      });
    }
  }

  return {
    ok: true,
    mutated: writes.length > 0,
    refusals: plan.refusals,
    actions: completed,
    writes,
  };
}

/**
 * @param {{ images: Record<string, string> }} pins
 */
export function verifyReleaseRenderedPins(pins) {
  const manifest = renderPlatformManifestText(
    { service: 'temporal', profile: 'release', section: 'all' },
    { chartRoot },
  );
  for (const [key, image] of Object.entries(pins.images ?? {})) {
    if (!manifest.includes(image))
      throw new Error(
        `${key} image is not present in rendered release manifest`,
      );
  }
  if (!manifest.includes('local-path')) {
    throw new Error('rendered postgres PVC must request local-path');
  }
  if (/start-dev/.test(manifest))
    throw new Error('rendered manifest names start-dev');
  return { ok: true };
}

/**
 * @param {string[]} baseKubectl
 * @param {string[]} args
 * @param {{ input?: string, namespaced?: boolean, timeoutMs?: number }} [options]
 */
function runKubectl(baseKubectl, args, options = {}) {
  const kubectl = [...baseKubectl];
  if (options.namespaced !== false && !args.includes('-n'))
    kubectl.push('-n', RELEASE_NAMESPACE);
  kubectl.push(...args);
  const child = spawnSync(kubectl[0], kubectl.slice(1), {
    encoding: 'utf8',
    input: options.input,
    timeout: options.timeoutMs ?? 300000,
  });
  return {
    ok: !child.error && child.status === 0,
    stdout: child.stdout ?? '',
    stderr: `${child.stderr ?? ''}${child.error ? child.error.message : ''}`,
  };
}

/**
 * @param {string[]} baseKubectl
 * @param {string} database
 * @param {string} query
 * @returns {{ ok: boolean, stdout: string, stderr: string }}
 */
function execReleasePostgresSql(baseKubectl, database, query) {
  return runKubectl(
    baseKubectl,
    [
      'exec',
      'deploy/temporal-postgres',
      '--',
      'bash',
      '-c',
      ': "${POSTGRES_PASSWORD:?missing database password}"; export PGPASSWORD="$POSTGRES_PASSWORD"; exec psql -w -h 127.0.0.1 -U temporal -d "$1" -Atqc "$2"',
      'temporal-sql',
      database,
      query,
    ],
    { timeoutMs: RELEASE_SQL_PROBE_TIMEOUT_MS },
  );
}

/**
 * @param {string[]} kubectlBase from install.sh KUBECTL array without trailing args
 */
export function runLiveReleaseInstall(kubectlBase) {
  const observe = () => {
    const observations = observeReleaseTemporal();
    if (observations.admin?.state === 'present') {
      const health = runKubectl(kubectlBase, [
        'exec',
        'deploy/temporal-admin',
        '--',
        'temporal',
        'operator',
        'cluster',
        'health',
      ]);
      observations.clusterHealth =
        health.ok && health.stdout.includes('SERVING')
          ? { state: 'release-serving' }
          : { state: 'unhealthy' };
      const describe = runKubectl(kubectlBase, [
        'exec',
        'deploy/temporal-admin',
        '--',
        'temporal',
        'operator',
        'namespace',
        'describe',
        'default',
      ]);
      if (!describe.ok && describe.stderr.includes('not found')) {
        observations.defaultNamespace = { state: 'absent' };
      } else if (describe.ok) {
        observations.defaultNamespace = { state: 'present' };
      } else {
        observations.defaultNamespace = {
          state: 'unreadable',
          reason: 'describe failed',
        };
      }
    }
    return observations;
  };

  return executeReleaseTemporalInstall({
    observe,
    kubectl: (args, options) => runKubectl(kubectlBase, args, options),
    generatePassword: () => randomBytes(24).toString('hex'),
    waitPostgresReady: () => {
      const result = runKubectl(kubectlBase, [
        'rollout',
        'status',
        'deployment/temporal-postgres',
        `--timeout=${300}s`,
      ]);
      return {
        ok: result.ok,
        refusals: result.ok
          ? []
          : [{ id: 'postgres-not-ready', detail: 'PostgreSQL rollout failed' }],
      };
    },
    waitSchemaJob: () => {
      const result = runKubectl(kubectlBase, [
        'wait',
        '--for=condition=complete',
        `job/${RELEASE_SCHEMA_JOB}`,
        `--timeout=${240}s`,
      ]);
      return {
        ok: result.ok,
        refusals: result.ok
          ? []
          : [
              {
                id: 'schema-job-timeout',
                detail: 'schema job did not complete',
              },
            ],
      };
    },
    waitNamespaceJob: () => {
      const result = runKubectl(kubectlBase, [
        'wait',
        '--for=condition=complete',
        `job/${RELEASE_NAMESPACE_JOB}`,
        `--timeout=${240}s`,
      ]);
      return {
        ok: result.ok,
        refusals: result.ok
          ? []
          : [
              {
                id: 'namespace-job-timeout',
                detail: 'namespace job did not complete',
              },
            ],
      };
    },
    waitServerReady: () => {
      const result = runKubectl(kubectlBase, [
        'rollout',
        'status',
        'deployment/temporal-server',
        `--timeout=${300}s`,
      ]);
      return { ok: result.ok };
    },
    waitAdminReady: () => {
      const result = runKubectl(kubectlBase, [
        'rollout',
        'status',
        'deployment/temporal-admin',
        `--timeout=${180}s`,
      ]);
      return { ok: result.ok };
    },
    probeSql: (phase) =>
      probeLegacyTemporalSql(({ database, query }) => {
        const result = execReleasePostgresSql(kubectlBase, database, query);
        return { ok: result.ok, stdout: result.stdout };
      }, phase),
  });
}
