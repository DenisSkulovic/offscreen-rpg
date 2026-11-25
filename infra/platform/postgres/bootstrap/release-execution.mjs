import {
  RELEASE_CNPG_CONTEXT,
  RELEASE_CNPG_NAMESPACE,
  RELEASE_CNPG_CLUSTER,
} from '../config.mjs';
import { assessCnpgClusterTopologyReadiness } from '../cluster-readiness.mjs';
import { ensureReleaseCnpg } from './release-plan.mjs';

export function executeAuthorizedReleaseCnpg(deps) {
  const first = deps.collect();
  const decision = ensureReleaseCnpg(first, { authorize: true });
  if (
    !decision.ok &&
    decision.refusals.some((item) => item.id !== 'ensure-not-authorized')
  ) {
    return { ...decision, mutated: false };
  }
  if (!decision.ok) {
    return { ...decision, mutated: false };
  }
  const needsOperatorManifest = decision.actions.some(
    (action) => action.op === 'apply-operator',
  );
  const manifest =
    needsOperatorManifest && deps.readOperatorManifest
      ? deps.readOperatorManifest()
      : { body: '', sha256: first.pin?.sha256 ?? '' };
  if (
    needsOperatorManifest &&
    (manifest.sha256 !== first.pin?.sha256 ||
      !manifest.body.includes(`image: ${first.pin.operatorImage}`))
  ) {
    return {
      ...decision,
      ok: false,
      mutated: false,
      refusals: [
        {
          id: 'operator-manifest-sha-mismatch',
          detail: 'downloaded operator manifest does not match operator.pin',
        },
      ],
      actions: [],
    };
  }
  const again = deps.collect();
  const recheck = ensureReleaseCnpg(again, {
    authorize: true,
    operatorManifestSha256: manifest.sha256,
  });
  if (!recheck.ok) {
    return { ...recheck, mutated: false };
  }
  const completed = [];
  for (const action of recheck.actions) {
    if (action.op === 'verify-operator' || action.op === 'noop') {
      completed.push(action);
      continue;
    }
    if (
      action.op === 'wait-established-crd' ||
      action.op === 'wait-operator-rollout'
    ) {
      const waited = deps.run(
        'kubectl',
        ['--context', RELEASE_CNPG_CONTEXT, ...action.args],
        { timeoutMs: 260000 },
      );
      completed.push(action);
      if (!waited.ok) {
        return {
          ...recheck,
          ok: false,
          mutated: true,
          refusals: [
            {
              id: `${action.op}-failed`,
              detail: waited.stderr || `${action.op} failed`,
            },
          ],
          actions: completed,
        };
      }
      continue;
    }
    if (action.op === 'wait-webhook-endpoint') {
      let ready = false;
      for (let attempt = 0; attempt < 60; attempt += 1) {
        const endpoints = deps.run('kubectl', [
          '--context',
          RELEASE_CNPG_CONTEXT,
          '-n',
          'cnpg-system',
          'get',
          'endpoints',
          'cnpg-webhook-service',
          '-o',
          'jsonpath={.subsets[0].addresses[0].ip}',
        ]);
        if (endpoints.ok && String(endpoints.stdout ?? '').trim().length > 0) {
          ready = true;
          break;
        }
        if (deps.sleep) deps.sleep(2000);
      }
      completed.push(action);
      if (!ready) {
        return {
          ...recheck,
          ok: false,
          mutated: completed.some((item) => item.op?.startsWith('apply-')),
          refusals: [
            {
              id: 'webhook-endpoint-missing',
              detail: 'CloudNativePG webhook has no endpoint',
            },
          ],
          actions: completed,
        };
      }
      continue;
    }
    if (action.op === 'wait-cluster-ready') {
      const expectedInstances = recheck.expectedInstances;
      const now = deps.now ?? Date.now;
      const readinessTimeoutMs = deps.readinessTimeoutMs ?? 600_000;
      const deadline = now() + readinessTimeoutMs;
      /** @type {{ ok: false, detail: string } | { ok: true, currentPrimary: string }} */
      let topology = {
        ok: false,
        detail: 'cluster readiness poll did not start',
      };
      while (now() < deadline) {
        const clusterResult = deps.run('kubectl', [
          '--context',
          RELEASE_CNPG_CONTEXT,
          '-n',
          RELEASE_CNPG_NAMESPACE,
          'get',
          'cluster',
          RELEASE_CNPG_CLUSTER,
          '-o',
          'json',
        ]);
        if (clusterResult.ok && clusterResult.stdout) {
          try {
            const cluster = JSON.parse(String(clusterResult.stdout));
            topology = assessCnpgClusterTopologyReadiness(
              cluster,
              expectedInstances,
            );
            if (topology.ok) {
              break;
            }
          } catch {
            topology = {
              ok: false,
              detail: 'cluster JSON observation was malformed',
            };
          }
        } else {
          topology = {
            ok: false,
            detail: 'cluster observation failed during readiness poll',
          };
        }
        if (deps.sleep) deps.sleep(5000);
      }
      completed.push(action);
      if (!topology.ok) {
        return {
          ...recheck,
          ok: false,
          mutated: completed.some((item) => item.op?.startsWith('apply-')),
          refusals: [
            {
              id: 'cluster-readiness-failed',
              detail: topology.detail,
            },
          ],
          actions: completed,
        };
      }
      continue;
    }
    let applyResult = deps.run('kubectl', action.args, {
      input: action.op === 'apply-operator' ? manifest.body : action.manifest,
      timeoutMs: action.op === 'apply-operator' ? 180000 : 60000,
    });
    if (!applyResult.ok && action.op === 'apply-cluster') {
      for (let attempt = 0; attempt < 12 && !applyResult.ok; attempt += 1) {
        if (deps.sleep) deps.sleep(5000);
        applyResult = deps.run('kubectl', action.args, {
          input: action.manifest,
          timeoutMs: 60000,
        });
      }
    }
    completed.push(action);
    if (!applyResult.ok) {
      return {
        ...recheck,
        ok: false,
        mutated: true,
        refusals: [
          {
            id: `${action.op}-failed`,
            detail: applyResult.stderr || `${action.op} failed`,
          },
        ],
        actions: completed,
      };
    }
  }
  const expectedInstances = recheck.expectedInstances;
  const verify = deps.run('kubectl', [
    '--context',
    RELEASE_CNPG_CONTEXT,
    '-n',
    RELEASE_CNPG_NAMESPACE,
    'get',
    'cluster',
    RELEASE_CNPG_CLUSTER,
    '-o',
    'json',
  ]);
  if (!verify.ok || !verify.stdout) {
    return {
      ...recheck,
      ok: false,
      mutated: completed.some((item) => item.op?.startsWith('apply-')),
      refusals: [
        {
          id: 'cluster-topology-verify-failed',
          detail: 'final cluster topology observation failed',
        },
      ],
      actions: completed,
    };
  }
  let cluster;
  try {
    cluster = JSON.parse(String(verify.stdout));
  } catch {
    return {
      ...recheck,
      ok: false,
      mutated: completed.some((item) => item.op?.startsWith('apply-')),
      refusals: [
        {
          id: 'cluster-topology-verify-failed',
          detail: 'final cluster JSON was malformed',
        },
      ],
      actions: completed,
    };
  }
  const topology = assessCnpgClusterTopologyReadiness(
    cluster,
    expectedInstances,
  );
  if (!topology.ok) {
    return {
      ...recheck,
      ok: false,
      mutated: completed.some((item) => item.op?.startsWith('apply-')),
      refusals: [
        {
          id: 'cluster-topology-verify-failed',
          detail: topology.detail,
        },
      ],
      actions: completed,
    };
  }
  return {
    ...recheck,
    ok: true,
    mutated: completed.some((item) => item.op?.startsWith('apply-')),
    actions: completed,
    phase: 'Cluster in healthy state',
    instances: String(expectedInstances),
    currentPrimary: topology.currentPrimary,
  };
}
