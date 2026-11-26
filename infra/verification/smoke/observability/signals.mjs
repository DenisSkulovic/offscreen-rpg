import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runPlatformCommand } from '../../../platform/common/commands.mjs';

const MODULE_ROOT = dirname(fileURLToPath(import.meta.url));
export const SIGNAL_PROBE_PATH = join(MODULE_ROOT, 'signal-probe.py');

export const PROBE_IMAGE =
  'docker.io/library/python@sha256:191083cdf6c7bda8c76158983163ead5d5cf7b77cf3033e805bb0f5296f51b4b';

export const PLATFORM_OBSERVABILITY_NS = 'offscreen-dev-observability';

export const BACKEND_URLS = Object.freeze({
  collector: `http://obs-collector.${PLATFORM_OBSERVABILITY_NS}.svc.cluster.local:4318`,
  prometheus: `http://obs-prometheus.${PLATFORM_OBSERVABILITY_NS}.svc.cluster.local:9090`,
  loki: `http://obs-loki.${PLATFORM_OBSERVABILITY_NS}.svc.cluster.local:3100`,
  tempo: `http://obs-tempo.${PLATFORM_OBSERVABILITY_NS}.svc.cluster.local:3200`,
});

export const SIGNALS_PHASE_BUDGET_MS = Object.freeze({
  preflight: 30_000,
  namespace: 30_000,
  objectWrite: 30_000,
  imagePull: 300_000,
  podWait: 270_000,
  probeLogs: 30_000,
  normalProbe: 120_000,
  privacyProbe: 300_000,
});

/**
 * @param {string} [hex]
 */
export function buildProofNamespaceName(hex = randomBytes(4).toString('hex')) {
  return `obs-proof-${hex}`;
}

/**
 * @param {string} contextName
 * @param {string} namespaceName
 * @param {{ run?: typeof runPlatformCommand }} [deps]
 */
export function checkProofNamespaceAbsent(
  contextName,
  namespaceName,
  deps = {},
) {
  const run = deps.run ?? runPlatformCommand;
  const result = run(
    'kubectl',
    ['--context', contextName, 'get', 'namespace', namespaceName, '-o', 'name'],
    { timeoutMs: 15_000 },
  );
  if (!result.ok) {
    const combined = `${result.stderr ?? ''}\n${result.stdout ?? ''}`;
    if (combined.includes('NotFound') || combined.includes('not found')) {
      return { ok: true, absent: true };
    }
    return { ok: false, reasonCode: 'namespace-read-failed' };
  }
  return { ok: true, absent: false };
}

/**
 * @param {object} session
 * @param {{ run?: typeof runPlatformCommand, pythonRunner?: (input: object) => Promise<{ ok: boolean, exitCode?: number, reasonCode?: string }>, ensureProofResources?: (input: object) => Promise<object>, cleanupProofResources?: (input: object) => Promise<{ ok: boolean }> }} [deps]
 */
export async function runSignalsProof(session, deps = {}) {
  const run = deps.run ?? runPlatformCommand;
  const pythonRunner = deps.pythonRunner ?? null;
  const evidenceDir = session.evidenceDir;
  const identity = session.identity;
  const contextName = identity.contextName;
  const proofNamespace = buildProofNamespaceName();

  if (session.remainingWorkMs() < SIGNALS_PHASE_BUDGET_MS.preflight) {
    terminal = { ok: false, reasonCode: 'signals-preflight-budget' };
    return terminal;
  }

  const absent = deps.ensureProofResources
    ? { ok: true, absent: true }
    : checkProofNamespaceAbsent(contextName, proofNamespace, { run });
  if (!absent.ok) {
    terminal = {
      ok: false,
      reasonCode: absent.reasonCode ?? 'namespace-precheck-failed',
    };
    return terminal;
  }
  if (!absent.absent) {
    terminal = { ok: false, reasonCode: 'proof-namespace-present' };
    return terminal;
  }

  /** @type {{ namespaceUid?: string, configMapUid?: string, podUid?: string, namespace?: string } | null} */
  let created = null;
  let cleanupOk = false;
  /** @type {{ ok: boolean, reasonCode?: string | null, proofNamespace?: string, cleanup?: boolean }} */
  let terminal = {
    ok: false,
    reasonCode: 'signals-incomplete',
    cleanup: false,
  };

  const fail = (reasonCode) => {
    terminal = { ok: false, reasonCode };
    throw new Error('signals-terminal');
  };

  try {
    if (deps.ensureProofResources) {
      const provisioned = await deps.ensureProofResources({
        session,
        proofNamespace,
        probeImage: PROBE_IMAGE,
        signalProbePath: SIGNAL_PROBE_PATH,
      });
      if (!provisioned.ok) {
        fail(provisioned.reasonCode ?? 'proof-resource-create-failed');
      }
      created = provisioned.resources;
    } else {
      if (session.remainingWorkMs() < SIGNALS_PHASE_BUDGET_MS.namespace) {
        fail('namespace-budget');
      }
      const nsCreate = run(
        'kubectl',
        [
          '--context',
          contextName,
          'create',
          'namespace',
          proofNamespace,
          '-o',
          'json',
        ],
        { timeoutMs: 30_000 },
      );
      if (!nsCreate.ok) {
        fail('namespace-create-failed');
      }
      let namespaceUid = '';
      try {
        namespaceUid = JSON.parse(nsCreate.stdout).metadata?.uid ?? '';
      } catch {
        fail('namespace-create-unreadable');
      }
      const cmName = `obs-proof-cm-${randomBytes(4).toString('hex')}`;
      const cmCreate = run(
        'kubectl',
        [
          '--context',
          contextName,
          '-n',
          proofNamespace,
          'create',
          'configmap',
          cmName,
          `--from-file=signal-probe.py=${SIGNAL_PROBE_PATH}`,
          '-o',
          'json',
        ],
        { timeoutMs: 30_000 },
      );
      if (!cmCreate.ok) {
        fail('configmap-create-failed');
      }
      let configMapUid = '';
      try {
        configMapUid = JSON.parse(cmCreate.stdout).metadata?.uid ?? '';
      } catch {
        fail('configmap-create-unreadable');
      }
      const podName = `obs-proof-pod-${randomBytes(4).toString('hex')}`;
      const podManifest = {
        apiVersion: 'v1',
        kind: 'Pod',
        metadata: { name: podName, namespace: proofNamespace },
        spec: {
          restartPolicy: 'Never',
          automountServiceAccountToken: false,
          activeDeadlineSeconds: 240,
          volumes: [{ name: 'probe', configMap: { name: cmName } }],
          containers: [
            {
              name: 'probe',
              image: PROBE_IMAGE,
              command: ['sleep', '300'],
              volumeMounts: [{ name: 'probe', mountPath: '/opt/probe' }],
              securityContext: {
                allowPrivilegeEscalation: false,
                readOnlyRootFilesystem: true,
                runAsNonRoot: true,
                runAsUser: 65534,
                capabilities: { drop: ['ALL'] },
              },
            },
          ],
        },
      };
      const podCreate = run(
        'kubectl',
        [
          '--context',
          contextName,
          '-n',
          proofNamespace,
          'create',
          '-f',
          '-',
          '-o',
          'json',
        ],
        { timeoutMs: 30_000, input: JSON.stringify(podManifest) },
      );
      if (!podCreate.ok) {
        fail('pod-create-failed');
      }
      let podUid = '';
      try {
        podUid = JSON.parse(podCreate.stdout).metadata?.uid ?? '';
      } catch {
        fail('pod-create-unreadable');
      }
      created = {
        namespace: proofNamespace,
        namespaceUid,
        configMapUid,
        configMapName: cmName,
        podUid,
        podName,
      };
    }

    const probeWorkDir = join(evidenceDir, 'probe-work');
    const collector = BACKEND_URLS.collector;
    const prom = BACKEND_URLS.prometheus;
    const loki = BACKEND_URLS.loki;
    const tempo = BACKEND_URLS.tempo;

    const runPythonProbe = async (mode) => {
      const argv = [
        SIGNAL_PROBE_PATH,
        probeWorkDir,
        collector,
        prom,
        loki,
        tempo,
        '',
        mode,
      ];
      if (pythonRunner) {
        return pythonRunner({ argv, mode, session, created });
      }
      const result = run('python3', argv, {
        timeoutMs: Math.min(session.remainingWorkMs(), 240_000),
      });
      if (!result.ok) {
        return {
          ok: false,
          reasonCode:
            mode === 'privacy' ? 'privacy-probe-failed' : 'normal-probe-failed',
        };
      }
      return { ok: true };
    };

    if (session.remainingWorkMs() < SIGNALS_PHASE_BUDGET_MS.normalProbe) {
      fail('normal-probe-budget');
    }
    const normal = await runPythonProbe('normal');
    if (!normal.ok) {
      fail(normal.reasonCode ?? 'normal-probe-failed');
    }

    if (session.remainingWorkMs() < SIGNALS_PHASE_BUDGET_MS.privacyProbe) {
      fail('privacy-probe-budget');
    }
    const privacy = await runPythonProbe('privacy');
    if (!privacy.ok) {
      fail(privacy.reasonCode ?? 'privacy-probe-failed');
    }

    terminal = {
      ok: true,
      reasonCode: null,
      proofNamespace: created.namespace,
    };
  } catch (error) {
    if (
      !(error instanceof Error && error.message === 'signals-terminal') &&
      !terminal.reasonCode
    ) {
      terminal = { ok: false, reasonCode: 'signals-failed' };
    }
  } finally {
    if (created) {
      if (deps.cleanupProofResources) {
        const cleanup = await deps.cleanupProofResources({ session, created });
        cleanupOk = cleanup.ok === true;
      } else if (session.deleteProofResources) {
        const cleanup = await session.deleteProofResources(created);
        cleanupOk = cleanup.ok === true;
      }
      if (!cleanupOk) {
        terminal = { ok: false, reasonCode: 'cleanup-failed', cleanup: false };
      } else if (terminal.ok) {
        terminal.cleanup = true;
      }
    }
  }
  return terminal;
}

/**
 * @param {string} path
 */
export function readSignalProbeSource(path = SIGNAL_PROBE_PATH) {
  return readFileSync(path, 'utf8');
}

/**
 * @param {string} contextName
 * @param {{ namespace: string, namespaceUid: string, configMapName: string, configMapUid: string, podName: string, podUid: string }} resources
 * @param {{ run?: typeof runPlatformCommand }} [deps]
 */
export async function deleteProofResourcesWithUid(
  contextName,
  resources,
  deps = {},
) {
  const run = deps.run ?? runPlatformCommand;
  const deleteWithUid = (uri, uid) =>
    run(
      'kubectl',
      ['--context', contextName, 'delete', '--raw', uri, '-f', '-'],
      {
        timeoutMs: 15_000,
        input: JSON.stringify({
          apiVersion: 'v1',
          kind: 'DeleteOptions',
          preconditions: { uid },
          gracePeriodSeconds: 0,
        }),
      },
    );

  const pod = deleteWithUid(
    `/api/v1/namespaces/${resources.namespace}/pods/${resources.podName}`,
    resources.podUid,
  );
  if (!pod.ok) {
    return { ok: false, reasonCode: 'pod-delete-failed' };
  }
  const configMap = deleteWithUid(
    `/api/v1/namespaces/${resources.namespace}/configmaps/${resources.configMapName}`,
    resources.configMapUid,
  );
  if (!configMap.ok) {
    return { ok: false, reasonCode: 'configmap-delete-failed' };
  }
  const namespace = deleteWithUid(
    `/api/v1/namespaces/${resources.namespace}`,
    resources.namespaceUid,
  );
  if (!namespace.ok) {
    return { ok: false, reasonCode: 'namespace-delete-failed' };
  }
  return { ok: true };
}
