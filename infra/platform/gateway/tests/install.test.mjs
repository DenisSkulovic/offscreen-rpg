import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { parse } from 'yaml';
import { RELEASE_API_PORT } from '../../../clusters/kind/manager/config.mjs';
import { RELEASE_BASELINE_NAMESPACE } from '../../common/commands.mjs';
import {
  ADMISSION_POLICY,
  conditionTrue,
  ensureGatewayInstall,
  GATEWAY_CLASS_NAME,
  GATEWAY_CRD_NAMES,
  GATEWAY_NAME,
  HELM_NAMESPACE,
  HELM_RELEASE,
  IMAGE_DIGEST,
  kubectlMutationKind,
  LAB_EDGE_NAMESPACE,
  loadVerifiedPins,
  parseGatewayApiBundle,
} from '../install.mjs';

const gatewayDir = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = join(gatewayDir, '../../..');
const installPath = join(gatewayDir, 'install.sh');
const gatewayYaml = join(gatewayDir, 'gateway.yaml');
const smokeRoutes = join(
  repoRoot,
  'infra/verification/smoke/gateway/routes.yaml',
);

const context = 'kind-offscreen-release';
const kubeCluster = 'kind-offscreen-release';

/**
 * @param {object} bundleDoc
 */
function minimalLiveFromBundle(bundleDoc) {
  const live = structuredClone(bundleDoc);
  live.metadata = {
    ...bundleDoc.metadata,
    resourceVersion: '42',
    uid: 'uid-42',
  };
  if (bundleDoc.kind === 'CustomResourceDefinition') {
    live.status = {
      conditions: [
        { type: 'Established', status: 'True' },
        { type: 'NamesAccepted', status: 'True' },
      ],
      storedVersions: (bundleDoc.spec?.versions ?? [])
        .filter((v) => v.storage)
        .map((v) => v.name),
    };
  }
  return live;
}

const bundleDocs = parseGatewayApiBundle(
  join(gatewayDir, 'vendor/gateway-api-v1.6.3-standard.yaml'),
);

/**
 * @param {Record<string, object | 'absent' | 'unreadable'>} objects
 * @param {{ helmRelease?: 'absent' | 'deployed' | 'foreign', crdExtra?: string[], timeoutOn?: string, gatewaySystemBusy?: boolean, labForeign?: boolean, bundleDrift?: boolean, dockerFails?: boolean, dockerTimedOut?: boolean, dockerNonLoopback?: boolean, staleGatewayCondition?: boolean }} [options]
 */
function makeFixture(objects, options = {}) {
  const calls = [];
  const pins = loadVerifiedPins({ gatewayRoot: gatewayDir });
  const ok = (stdout = '') => ({
    ok: true,
    status: 0,
    stdout,
    stderr: '',
    timedOut: false,
    missing: false,
  });

  const readyDeployment = {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
      name: 'lab-gateway-traefik',
      namespace: HELM_NAMESPACE,
      generation: 2,
      labels: { 'app.kubernetes.io/managed-by': 'Helm' },
      annotations: {
        'meta.helm.sh/release-name': HELM_RELEASE,
        'meta.helm.sh/release-namespace': HELM_NAMESPACE,
      },
    },
    spec: {
      replicas: 1,
      template: {
        spec: {
          containers: [{ image: `docker.io/traefik@${IMAGE_DIGEST}` }],
        },
      },
    },
    status: {
      observedGeneration: 2,
      replicas: 1,
      updatedReplicas: 1,
      availableReplicas: 1,
      readyReplicas: 1,
    },
  };

  const readyService = {
    metadata: {
      name: 'lab-gateway-traefik',
      namespace: HELM_NAMESPACE,
      labels: { 'app.kubernetes.io/managed-by': 'Helm' },
      annotations: {
        'meta.helm.sh/release-name': HELM_RELEASE,
        'meta.helm.sh/release-namespace': HELM_NAMESPACE,
      },
    },
    spec: {
      type: 'ClusterIP',
      ports: [{ name: 'web', port: 80, targetPort: 'web' }],
    },
  };

  const helmMeta = {
    labels: { 'app.kubernetes.io/managed-by': 'Helm' },
    annotations: {
      'meta.helm.sh/release-name': HELM_RELEASE,
      'meta.helm.sh/release-namespace': HELM_NAMESPACE,
    },
  };

  const readyGatewayClass = {
    metadata: {
      ...helmMeta,
      name: GATEWAY_CLASS_NAME,
      generation: 1,
    },
    spec: { controllerName: 'traefik.io/gateway-controller' },
    status: {
      conditions: [{ type: 'Accepted', status: 'True', observedGeneration: 1 }],
    },
  };

  const expectedGatewayYaml = parse(readFileSync(gatewayYaml, 'utf8'));
  const readyGateway = {
    metadata: {
      name: GATEWAY_NAME,
      namespace: LAB_EDGE_NAMESPACE,
      generation: 3,
      labels: { 'offscreen.rpg/lab': 'disposable' },
    },
    spec: expectedGatewayYaml.spec,
    status: {
      conditions: [
        { type: 'Accepted', status: 'True', observedGeneration: 3 },
        { type: 'Programmed', status: 'True', observedGeneration: 3 },
      ],
      listeners: [
        {
          name: 'web',
          conditions: [
            { type: 'Accepted', status: 'True', observedGeneration: 3 },
            { type: 'ResolvedRefs', status: 'True', observedGeneration: 3 },
            { type: 'Programmed', status: 'True', observedGeneration: 3 },
          ],
        },
      ],
    },
  };

  const inventory = new Map(Object.entries(objects));
  let helmInstalled = false;
  let gatewayApplied = false;

  const run = (command, args, runOptions = {}) => {
    calls.push({ command, args, input: runOptions.input ?? '' });
    if (
      options.timeoutOn &&
      `${command}\0${args.join('\0')}`.includes(options.timeoutOn)
    ) {
      return {
        ok: false,
        status: null,
        stdout: '',
        stderr: '',
        timedOut: true,
        missing: false,
      };
    }

    if (command === 'kind' && args[0] === 'get') {
      return ok('offscreen-release\n');
    }

    if (command === 'docker') {
      if (options.dockerTimedOut) {
        return {
          ok: false,
          status: null,
          stdout: '',
          stderr: '',
          timedOut: true,
          missing: false,
        };
      }
      if (options.dockerFails) {
        return {
          ok: false,
          status: 1,
          stdout: '',
          stderr: 'docker failed',
          timedOut: false,
          missing: false,
        };
      }
      if (options.dockerNonLoopback) {
        return ok('offscreen-release-control-plane 0.0.0.0:8080->80/tcp\n');
      }
      return ok('offscreen-release-control-plane 127.0.0.1:6443->6443/tcp\n');
    }

    if (command === 'helm') {
      if (args[0] === 'list') {
        if (helmInstalled) {
          return ok(
            JSON.stringify([
              {
                name: HELM_RELEASE,
                namespace: HELM_NAMESPACE,
                status: 'deployed',
                chart: 'traefik-42.4.1',
              },
            ]),
          );
        }
        if (options.helmRelease === 'absent') return ok('[]');
        if (options.helmRelease === 'foreign') {
          return ok(
            JSON.stringify([
              {
                name: HELM_RELEASE,
                namespace: HELM_NAMESPACE,
                status: 'deployed',
                chart: 'traefik-99.0.0',
              },
            ]),
          );
        }
        return ok(
          JSON.stringify([
            {
              name: HELM_RELEASE,
              namespace: HELM_NAMESPACE,
              status: 'deployed',
              chart: 'traefik-42.4.1',
            },
          ]),
        );
      }
      if (args[0] === 'upgrade') {
        helmInstalled = true;
        return ok('');
      }
      if (args[0] === 'template') {
        return ok('kind: Deployment\nmetadata:\n  name: lab-gateway-traefik\n');
      }
      throw new Error(`unexpected helm: ${args.join(' ')}`);
    }

    if (command !== 'kubectl') {
      throw new Error(`unexpected command: ${command}`);
    }

    if (args.includes('config') && args.includes('view')) {
      return ok(
        JSON.stringify({
          contexts: [
            {
              name: context,
              context: { cluster: kubeCluster, user: kubeCluster },
            },
          ],
          clusters: [
            {
              name: kubeCluster,
              cluster: { server: `https://127.0.0.1:${RELEASE_API_PORT}` },
            },
          ],
          users: [{ name: kubeCluster, user: {} }],
        }),
      );
    }

    if (
      args.includes('customresourcedefinitions') &&
      args.includes('-o') &&
      args.includes('json')
    ) {
      const names = [...GATEWAY_CRD_NAMES];
      if (options.crdExtra) names.push(...options.crdExtra);
      const presentNames = names.filter((name) => {
        const key = `customresourcedefinition//${name}`;
        const entry = inventory.get(key);
        return (
          entry !== 'absent' && entry !== 'unreadable' && entry !== undefined
        );
      });
      return ok(
        JSON.stringify({
          items: presentNames.map((name) => ({
            metadata: { name },
            spec: { group: 'gateway.networking.k8s.io' },
          })),
        }),
      );
    }

    if (args.includes('svc') && args.includes('-A')) {
      return ok(`${HELM_NAMESPACE} lab-gateway-traefik ClusterIP\n`);
    }

    if (args.includes('apply') && args.includes('--server-side')) {
      for (const doc of bundleDocs) {
        const resource =
          doc.kind === 'CustomResourceDefinition'
            ? 'customresourcedefinition'
            : doc.kind === 'ValidatingAdmissionPolicy'
              ? 'validatingadmissionpolicy'
              : 'validatingadmissionpolicybinding';
        inventory.set(
          `${resource}//${doc.metadata.name}`,
          minimalLiveFromBundle(doc),
        );
      }
      return ok('');
    }

    if (args.includes('wait')) {
      return ok('');
    }

    if (
      args.includes('apply') &&
      args.some((a) => a.includes('gateway.yaml'))
    ) {
      gatewayApplied = true;
      inventory.set(
        `gateway/${LAB_EDGE_NAMESPACE}/${GATEWAY_NAME}`,
        readyGateway,
      );
      return ok('');
    }

    if (args.includes('create')) {
      const body = parse(runOptions.input ?? '{}');
      if (
        body?.kind === 'Namespace' &&
        body.metadata?.name === LAB_EDGE_NAMESPACE
      ) {
        inventory.set(`namespace//${LAB_EDGE_NAMESPACE}`, {
          metadata: {
            name: LAB_EDGE_NAMESPACE,
            labels: body.metadata.labels,
          },
        });
      }
      return ok('');
    }

    if (args.includes('replace') && args.includes('--dry-run=server')) {
      const body = JSON.parse(runOptions.input ?? '{}');
      if (options.bundleDrift) {
        body.spec = { drift: true };
      }
      return ok(JSON.stringify(body));
    }

    if (
      args.includes('get') &&
      args.includes('all') &&
      args.includes(HELM_NAMESPACE)
    ) {
      return ok(options.gatewaySystemBusy ? 'pod/busy\n' : '');
    }

    const getIndex = args.indexOf('get');
    if (getIndex >= 0) {
      const resource = args[getIndex + 1];
      const name = args[getIndex + 2];
      let ns = '';
      if (args[getIndex + 2] === '-n') {
        ns = args[getIndex + 3];
      }
      const actualName =
        args[getIndex + 2] === '-n' ? args[getIndex + 4] : name;
      const normalizedKey = ns
        ? `${resource}/${ns}/${actualName}`
        : `${resource}//${actualName}`;

      if (
        resource === 'namespace' &&
        actualName === RELEASE_BASELINE_NAMESPACE
      ) {
        return ok(
          JSON.stringify({
            metadata: {
              name: RELEASE_BASELINE_NAMESPACE,
              uid: 'baseline-uid',
              labels: { 'offscreen.rpg/lab': 'disposable' },
            },
          }),
        );
      }

      const entry = inventory.get(normalizedKey);
      if (entry === 'unreadable') {
        return {
          ok: false,
          status: 1,
          stdout: '',
          stderr: 'fail',
          timedOut: false,
          missing: false,
        };
      }
      if ((!entry || entry === 'absent') && helmInstalled) {
        if (resource === 'deployment' && actualName === 'lab-gateway-traefik') {
          return ok(JSON.stringify(readyDeployment));
        }
        if (resource === 'service' && actualName === 'lab-gateway-traefik') {
          return ok(JSON.stringify(readyService));
        }
        if (resource === 'gatewayclass' && actualName === GATEWAY_CLASS_NAME) {
          return ok(JSON.stringify(readyGatewayClass));
        }
      }

      if (!entry || entry === 'absent') {
        return ok('');
      }

      if (resource === 'deployment' && actualName === 'lab-gateway-traefik') {
        return ok(JSON.stringify(readyDeployment));
      }
      if (resource === 'service' && actualName === 'lab-gateway-traefik') {
        return ok(JSON.stringify(readyService));
      }
      if (resource === 'gatewayclass' && actualName === GATEWAY_CLASS_NAME) {
        return ok(JSON.stringify(readyGatewayClass));
      }
      if (resource === 'gateway' && actualName === GATEWAY_NAME) {
        if (gatewayApplied || entry !== 'absent') {
          const gatewayBody = structuredClone(readyGateway);
          if (options.staleGatewayCondition) {
            for (const condition of gatewayBody.status.conditions) {
              delete condition.observedGeneration;
            }
            for (const listener of gatewayBody.status.listeners ?? []) {
              for (const condition of listener.conditions ?? []) {
                delete condition.observedGeneration;
              }
            }
          }
          return ok(JSON.stringify(gatewayBody));
        }
        return ok('');
      }
      if (
        resource === 'namespace' &&
        actualName === LAB_EDGE_NAMESPACE &&
        options.labForeign
      ) {
        return ok(
          JSON.stringify({
            metadata: {
              name: LAB_EDGE_NAMESPACE,
              labels: { 'offscreen.rpg/lab': 'foreign' },
            },
          }),
        );
      }

      return ok(JSON.stringify(entry));
    }

    throw new Error(`unexpected kubectl: ${args.join(' ')}`);
  };

  const seedBundleAbsent = () => {
    for (const crd of GATEWAY_CRD_NAMES) {
      inventory.set(`customresourcedefinition//${crd}`, 'absent');
    }
    inventory.set(`validatingadmissionpolicy//${ADMISSION_POLICY}`, 'absent');
    inventory.set(
      `validatingadmissionpolicybinding//${ADMISSION_POLICY}`,
      'absent',
    );
  };

  const seedBundlePresent = () => {
    for (const doc of bundleDocs) {
      const resource =
        doc.kind === 'CustomResourceDefinition'
          ? 'customresourcedefinition'
          : doc.kind === 'ValidatingAdmissionPolicy'
            ? 'validatingadmissionpolicy'
            : 'validatingadmissionpolicybinding';
      inventory.set(
        `${resource}//${doc.metadata.name}`,
        minimalLiveFromBundle(doc),
      );
    }
  };

  const seedHelmAbsent = () => {
    for (const id of [
      ['serviceaccount', HELM_NAMESPACE, 'lab-gateway-traefik'],
      ['clusterrole', '', 'lab-gateway-traefik-gateway-system'],
      ['clusterrolebinding', '', 'lab-gateway-traefik-gateway-system'],
      ['service', HELM_NAMESPACE, 'lab-gateway-traefik'],
      ['deployment', HELM_NAMESPACE, 'lab-gateway-traefik'],
      ['gatewayclass', '', GATEWAY_CLASS_NAME],
    ]) {
      const key = id[1] ? `${id[0]}/${id[1]}/${id[2]}` : `${id[0]}//${id[2]}`;
      if (!inventory.has(key)) {
        inventory.set(key, 'absent');
      }
    }
    if (!inventory.has(`namespace//${HELM_NAMESPACE}`)) {
      inventory.set(`namespace//${HELM_NAMESPACE}`, 'absent');
    }
    if (!inventory.has(`namespace//${LAB_EDGE_NAMESPACE}`)) {
      inventory.set(`namespace//${LAB_EDGE_NAMESPACE}`, 'absent');
    }
    if (!inventory.has(`gateway/${LAB_EDGE_NAMESPACE}/${GATEWAY_NAME}`)) {
      inventory.set(`gateway/${LAB_EDGE_NAMESPACE}/${GATEWAY_NAME}`, 'absent');
    }
  };

  const seedHelmPresent = () => {
    inventory.set(`serviceaccount/${HELM_NAMESPACE}/lab-gateway-traefik`, {
      metadata: {
        ...helmMeta,
        name: 'lab-gateway-traefik',
        namespace: HELM_NAMESPACE,
      },
    });
    inventory.set(`clusterrole//lab-gateway-traefik-gateway-system`, {
      metadata: { ...helmMeta, name: 'lab-gateway-traefik-gateway-system' },
    });
    inventory.set(`clusterrolebinding//lab-gateway-traefik-gateway-system`, {
      metadata: { ...helmMeta, name: 'lab-gateway-traefik-gateway-system' },
    });
    inventory.set(
      `service/${HELM_NAMESPACE}/lab-gateway-traefik`,
      readyService,
    );
    inventory.set(
      `deployment/${HELM_NAMESPACE}/lab-gateway-traefik`,
      readyDeployment,
    );
    inventory.set(`gatewayclass//${GATEWAY_CLASS_NAME}`, readyGatewayClass);
    inventory.set(`namespace//${LAB_EDGE_NAMESPACE}`, {
      metadata: {
        name: LAB_EDGE_NAMESPACE,
        labels: { 'offscreen.rpg/lab': 'disposable' },
      },
    });
    inventory.set(
      `gateway/${LAB_EDGE_NAMESPACE}/${GATEWAY_NAME}`,
      readyGateway,
    );
  };

  return {
    run,
    calls,
    inventory,
    seedBundleAbsent,
    seedBundlePresent,
    seedHelmAbsent,
    seedHelmPresent,
    pins,
  };
}

/**
 * @param {{ command: string, args: string[] }[]} calls
 */
function mutatingCalls(calls) {
  return calls.filter(({ command, args }) => {
    if (command === 'helm' && args.includes('upgrade')) return true;
    if (command !== 'kubectl') return false;
    return kubectlMutationKind(args) != null;
  });
}

test('platform gateway.yaml contains only the lab-edge Gateway', () => {
  const text = readFileSync(gatewayYaml, 'utf8');
  assert.match(text, /kind:\s*Gateway/);
  assert.match(text, /name:\s*lab-edge/);
  assert.doesNotMatch(text, /kind:\s*HTTPRoute/);
  assert.doesNotMatch(text, /synthetic-api/);
});

test('verification routes.yaml owns the synthetic HTTPRoute', () => {
  const text = readFileSync(smokeRoutes, 'utf8');
  assert.match(text, /name:\s*lab-edge-routes/);
  assert.match(text, /synthetic-api/);
  assert.doesNotMatch(text, /kind:\s*Gateway/);
});

test('install.sh does not reference synthetic smoke fixtures', () => {
  const text = readFileSync(installPath, 'utf8');
  assert.doesNotMatch(text, /GATEWAY_SMOKE_ROOT/);
  assert.doesNotMatch(text, /synthetic-backend/);
  assert.doesNotMatch(text, /backends\.yaml/);
  assert.doesNotMatch(text, /lab-edge-routes/);
  assert.doesNotMatch(text, /synthetic-web/);
  assert.doesNotMatch(text, /synthetic-api/);
  assert.doesNotMatch(text, /(source|\.\/|bash ).*verification\/smoke/);
  assert.doesNotMatch(text, /(source|\.\/|bash ).*setup\.sh/);
  assert.doesNotMatch(text, /(source|\.\/|bash ).*smoke\.sh/);
  assert.doesNotMatch(text, /game-edge-routes/);
  assert.doesNotMatch(text, /HTTPRoute/);
  assert.match(text, /install\.mjs/);
  assert.doesNotMatch(text, /traefik\/traefik/);
  assert.doesNotMatch(text, /helm repo/);
});

test('fresh install applies bundle and helm once', () => {
  const fx = makeFixture({}, { helmRelease: 'absent' });
  fx.seedBundleAbsent();
  fx.seedHelmAbsent();
  const result = ensureGatewayInstall({ run: fx.run, gatewayRoot: gatewayDir });
  assert.equal(result.ok, true);
  assert.equal(result.mutated, true);
  const mutating = mutatingCalls(fx.calls);
  assert.ok(mutating.some((c) => c.args.includes('--server-side')));
  assert.ok(
    mutating.some((c) => c.command === 'helm' && c.args.includes('upgrade')),
  );
});

test('complete reuse performs no mutating kubectl or helm', () => {
  const fx = makeFixture({}, { helmRelease: 'deployed' });
  fx.seedBundlePresent();
  fx.seedHelmPresent();
  const result = ensureGatewayInstall({ run: fx.run, gatewayRoot: gatewayDir });
  assert.equal(result.ok, true, result.error);
  assert.equal(result.mutated, false);
  assert.equal(mutatingCalls(fx.calls).length, 0);
  assert.ok(
    fx.calls.some(
      (c) =>
        c.command === 'kubectl' &&
        c.args.includes('replace') &&
        c.args.includes('--dry-run=server'),
    ),
  );
});

test('partial bundle refuses with no writes', () => {
  const first = GATEWAY_CRD_NAMES[0];
  const live = minimalLiveFromBundle(
    bundleDocs.find((d) => d.metadata.name === first),
  );
  /** @type {Record<string, object | 'absent'>} */
  const initial = {};
  for (const crd of GATEWAY_CRD_NAMES) {
    initial[`customresourcedefinition//${crd}`] =
      crd === first ? live : 'absent';
  }
  initial[`validatingadmissionpolicy//${ADMISSION_POLICY}`] = 'absent';
  initial[`validatingadmissionpolicybinding//${ADMISSION_POLICY}`] = 'absent';
  const partial = makeFixture(initial, { helmRelease: 'absent' });
  partial.seedHelmAbsent();
  const result = ensureGatewayInstall({
    run: partial.run,
    gatewayRoot: gatewayDir,
  });
  assert.equal(result.ok, false);
  assert.match(result.error ?? '', /partial gateway api bundle/);
  assert.equal(mutatingCalls(partial.calls).length, 0);
});

test('bundle spec drift refuses with no writes', () => {
  const fx = makeFixture({}, { helmRelease: 'deployed', bundleDrift: true });
  fx.seedBundlePresent();
  fx.seedHelmPresent();
  const result = ensureGatewayInstall({ run: fx.run, gatewayRoot: gatewayDir });
  assert.equal(result.ok, false);
  assert.match(result.error ?? '', /bundle spec drift/);
  assert.equal(mutatingCalls(fx.calls).length, 0);
});

test('unreadable bundle inventory refuses with no writes', () => {
  const objects = {};
  for (const crd of GATEWAY_CRD_NAMES) {
    objects[`customresourcedefinition//${crd}`] = 'unreadable';
  }
  objects[`validatingadmissionpolicy//${ADMISSION_POLICY}`] = 'unreadable';
  objects[`validatingadmissionpolicybinding//${ADMISSION_POLICY}`] =
    'unreadable';
  const fx = makeFixture(objects, { helmRelease: 'absent' });
  const result = ensureGatewayInstall({ run: fx.run, gatewayRoot: gatewayDir });
  assert.equal(result.ok, false);
  assert.equal(mutatingCalls(fx.calls).length, 0);
});

test('foreign helm release refuses with no writes', () => {
  const fx = makeFixture({}, { helmRelease: 'foreign' });
  fx.seedBundlePresent();
  fx.seedHelmPresent();
  const result = ensureGatewayInstall({ run: fx.run, gatewayRoot: gatewayDir });
  assert.equal(result.ok, false);
  assert.match(result.error ?? '', /foreign or drifted helm release/);
  assert.equal(mutatingCalls(fx.calls).length, 0);
});

test('foreign lab-edge namespace refuses with no writes', () => {
  const initial = {};
  for (const crd of GATEWAY_CRD_NAMES) {
    initial[`customresourcedefinition//${crd}`] = 'absent';
  }
  initial[`validatingadmissionpolicy//${ADMISSION_POLICY}`] = 'absent';
  initial[`validatingadmissionpolicybinding//${ADMISSION_POLICY}`] = 'absent';
  initial[`namespace//${LAB_EDGE_NAMESPACE}`] = {
    metadata: {
      name: LAB_EDGE_NAMESPACE,
      labels: { 'offscreen.rpg/lab': 'foreign' },
    },
  };
  const fx = makeFixture(initial, { helmRelease: 'absent' });
  fx.seedHelmAbsent();
  const result = ensureGatewayInstall({
    run: fx.run,
    gatewayRoot: gatewayDir,
  });
  assert.equal(result.ok, false);
  assert.match(result.error ?? '', /lab-edge namespace foreign/);
  assert.ok(
    fx.calls.every(
      ({ args }) => !args.includes('label') || !args.includes('--overwrite'),
    ),
  );
  assert.equal(mutatingCalls(fx.calls).length, 0);
});

test('conditionTrue rejects missing observedGeneration', () => {
  assert.equal(
    conditionTrue({ type: 'Accepted', status: 'True' }, 'Accepted', 2),
    false,
  );
  assert.equal(
    conditionTrue(
      { type: 'Accepted', status: 'True', observedGeneration: 2 },
      'Accepted',
      2,
    ),
    true,
  );
});

test('unreadable docker ps refuses before mutations', () => {
  const fx = makeFixture({}, { helmRelease: 'absent', dockerFails: true });
  fx.seedBundleAbsent();
  fx.seedHelmAbsent();
  const result = ensureGatewayInstall({ run: fx.run, gatewayRoot: gatewayDir });
  assert.equal(result.ok, false);
  assert.match(result.error ?? '', /docker ps failed/);
  assert.equal(mutatingCalls(fx.calls).length, 0);
});

test('docker ps timeout refuses before mutations', () => {
  const fx = makeFixture({}, { helmRelease: 'absent', dockerTimedOut: true });
  fx.seedBundleAbsent();
  fx.seedHelmAbsent();
  const result = ensureGatewayInstall({ run: fx.run, gatewayRoot: gatewayDir });
  assert.equal(result.ok, false);
  assert.match(result.error ?? '', /docker ps timed out/);
  assert.equal(mutatingCalls(fx.calls).length, 0);
});

test('non-loopback docker publish refuses before mutations', () => {
  const fx = makeFixture(
    {},
    { helmRelease: 'absent', dockerNonLoopback: true },
  );
  fx.seedBundleAbsent();
  fx.seedHelmAbsent();
  const result = ensureGatewayInstall({ run: fx.run, gatewayRoot: gatewayDir });
  assert.equal(result.ok, false);
  assert.match(result.error ?? '', /non-loopback published container port/);
  assert.equal(mutatingCalls(fx.calls).length, 0);
});

test('bundle object appearing before apply refuses without mutation', () => {
  const fx = makeFixture({}, { helmRelease: 'absent' });
  fx.seedBundleAbsent();
  fx.seedHelmAbsent();
  let perCrdGet = 0;
  const run = (command, args, options) => {
    if (
      command === 'kubectl' &&
      args.includes('get') &&
      args.includes('customresourcedefinition') &&
      !args.includes('customresourcedefinitions')
    ) {
      if (perCrdGet === 10) {
        const doc = bundleDocs.find(
          (d) => d.metadata.name === GATEWAY_CRD_NAMES[0],
        );
        fx.inventory.set(
          `customresourcedefinition//${GATEWAY_CRD_NAMES[0]}`,
          minimalLiveFromBundle(doc),
        );
      }
      perCrdGet += 1;
    }
    return fx.run(command, args, options);
  };
  const result = ensureGatewayInstall({ run, gatewayRoot: gatewayDir });
  assert.equal(result.ok, false);
  assert.match(result.error ?? '', /appeared before write/);
  assert.equal(mutatingCalls(fx.calls).length, 0);
});

test('stale gateway readiness refuses on reuse with no mutations', () => {
  const fx = makeFixture(
    {},
    { helmRelease: 'deployed', staleGatewayCondition: true },
  );
  fx.seedBundlePresent();
  fx.seedHelmPresent();
  const result = ensureGatewayInstall({ run: fx.run, gatewayRoot: gatewayDir });
  assert.equal(result.ok, false);
  assert.match(result.error ?? '', /readiness: gateway conditions stale/);
  assert.equal(mutatingCalls(fx.calls).length, 0);
});

test('command timeout is classified without sleeping', () => {
  const fx = makeFixture(
    {},
    {
      helmRelease: 'absent',
      timeoutOn: 'customresourcedefinitions',
    },
  );
  fx.seedBundleAbsent();
  fx.seedHelmAbsent();
  const result = ensureGatewayInstall({ run: fx.run, gatewayRoot: gatewayDir });
  assert.equal(result.ok, false);
  assert.match(result.error ?? '', /timed out|inventory/);
  assert.equal(mutatingCalls(fx.calls).length, 0);
});
