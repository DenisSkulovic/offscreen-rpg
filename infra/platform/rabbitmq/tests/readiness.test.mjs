import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CUSTOM_API_MAP,
  discoverApiVersion,
  LEGACY_MESSAGING_NAMESPACE,
  observeRabbitmqInventory,
  rabbitmqTargetFromProfile,
  resolveCustomApiGate,
} from '../inventory.mjs';
import {
  brokerSpecForbiddenFieldsAcceptable,
  observeRabbitmqReady,
  observeRabbitmqStructural,
} from '../readiness.mjs';
import {
  BROKER_IMAGE_PIN,
  NATIVE_DESIGN_LABEL,
  NATIVE_DESIGN_VALUE,
} from '../vendor-bundles.mjs';

const devTarget = rabbitmqTargetFromProfile('dev');

function ok(stdout = '', status = 0) {
  return {
    ok: status === 0,
    status,
    stdout,
    stderr: '',
    timedOut: false,
    missing: false,
  };
}

function fail(status = 1, stderr = 'denied') {
  return {
    ok: false,
    status,
    stdout: '',
    stderr,
    timedOut: false,
    missing: false,
  };
}

function recognizedBroker(overrides = {}) {
  return {
    apiVersion: 'rabbitmq.com/v1beta1',
    kind: 'RabbitmqCluster',
    metadata: {
      name: devTarget.brokerName,
      namespace: devTarget.brokerNamespace,
      uid: 'cr-uid-1',
      generation: 3,
      labels: { [NATIVE_DESIGN_LABEL]: NATIVE_DESIGN_VALUE },
      ...overrides.metadata,
    },
    spec: {
      replicas: 1,
      image: BROKER_IMAGE_PIN,
      service: { type: 'ClusterIP' },
      persistence: {
        storageClassName: devTarget.storageClass,
        storage: '5Gi',
      },
      resources: {
        requests: { cpu: '200m', memory: '1Gi' },
        limits: { cpu: '500m', memory: '1Gi' },
      },
      ...overrides.spec,
    },
    status: {
      observedGeneration: 3,
      conditions: [
        { type: 'AllReplicasReady', status: 'True' },
        { type: 'ReconcileSuccess', status: 'True' },
      ],
      defaultUser: {
        serviceReference: {
          name: devTarget.brokerName,
          namespace: devTarget.brokerNamespace,
        },
        secretReference: {
          name: 'rabbitmq-default-user',
          namespace: devTarget.brokerNamespace,
        },
      },
      ...overrides.status,
    },
  };
}

function happyLiveObjects() {
  const service = {
    metadata: {
      name: devTarget.brokerName,
      namespace: devTarget.brokerNamespace,
      uid: 'svc-uid-1',
    },
    spec: {
      type: 'ClusterIP',
      ports: [
        { port: 5672, name: 'amqp' },
        { port: 15672, name: 'management' },
        { port: 15692, name: 'prometheus' },
      ],
    },
  };
  const statefulSet = {
    metadata: {
      name: 'rabbitmq-server',
      namespace: devTarget.brokerNamespace,
      uid: 'sts-uid-1',
      generation: 2,
      ownerReferences: [
        { kind: 'RabbitmqCluster', uid: 'cr-uid-1', controller: true },
      ],
    },
    status: {
      observedGeneration: 2,
      replicas: 1,
      readyReplicas: 1,
      currentReplicas: 1,
      updatedReplicas: 1,
      currentRevision: 'rev-a',
      updateRevision: 'rev-a',
    },
  };
  const pod = {
    metadata: {
      name: 'rabbitmq-server-0',
      namespace: devTarget.brokerNamespace,
      uid: 'pod-uid-1',
      ownerReferences: [
        { kind: 'StatefulSet', uid: 'sts-uid-1', controller: true },
      ],
    },
    status: {
      podIP: '10.42.0.19',
      podIPs: [{ ip: '10.42.0.19' }],
      conditions: [{ type: 'Ready', status: 'True' }],
    },
    spec: {
      containers: [{ name: 'rabbitmq', image: BROKER_IMAGE_PIN }],
      volumes: [
        {
          name: 'persistence',
          persistentVolumeClaim: { claimName: 'persistence-rabbitmq-server-0' },
        },
      ],
    },
  };
  const endpointSlice = {
    metadata: {
      ownerReferences: [{ kind: 'Service', uid: 'svc-uid-1' }],
      labels: { 'kubernetes.io/service-name': devTarget.brokerName },
    },
    endpoints: [
      {
        addresses: ['10.42.0.19'],
        conditions: { ready: true, terminating: false },
        targetRef: {
          kind: 'Pod',
          name: 'rabbitmq-server-0',
          namespace: devTarget.brokerNamespace,
          uid: 'pod-uid-1',
        },
      },
    ],
  };
  const secret = {
    metadata: {
      name: 'rabbitmq-default-user',
      namespace: devTarget.brokerNamespace,
    },
    data: { username: 'dXNlcg==', password: 'cGFzcw==' },
  };
  const pvc = {
    metadata: {
      name: 'persistence-rabbitmq-server-0',
      namespace: devTarget.brokerNamespace,
      uid: 'pvc-uid-1',
    },
    spec: {
      storageClassName: devTarget.storageClass,
      volumeName: 'pv-1',
      resources: { requests: { storage: '5Gi' } },
    },
  };
  const pv = {
    metadata: { name: 'pv-1', uid: 'pv-uid-1' },
    spec: {
      claimRef: {
        namespace: devTarget.brokerNamespace,
        name: 'persistence-rabbitmq-server-0',
        uid: 'pvc-uid-1',
      },
    },
  };
  return { service, statefulSet, pod, endpointSlice, secret, pvc, pv };
}

/**
 * @param {Partial<ReturnType<typeof happyLiveObjects>>} overrides
 */
function buildRun(overrides = {}) {
  const body = { ...happyLiveObjects(), ...overrides };
  return (command, args) => {
    if (command !== 'kubectl') {
      return fail();
    }
    const joined = args.join(' ');
    if (joined.includes('get --raw')) {
      if (joined.includes('/apis/rabbitmq.com/v1beta1')) {
        return ok(
          JSON.stringify({
            resources: [{ name: 'rabbitmqclusters' }],
          }),
        );
      }
      return ok(JSON.stringify({ resources: [{ name: 'rabbitmqclusters' }] }));
    }
    if (joined.includes('get service')) {
      return ok(JSON.stringify(body.service));
    }
    if (joined.includes('get statefulset.apps')) {
      return ok(JSON.stringify({ items: [body.statefulSet] }));
    }
    if (joined.includes('get pod')) {
      return ok(JSON.stringify({ items: [body.pod] }));
    }
    if (joined.includes('get endpointslice')) {
      return ok(JSON.stringify({ items: [body.endpointSlice] }));
    }
    if (joined.includes('get secret')) {
      return ok(JSON.stringify(body.secret));
    }
    if (joined.includes('get pvc')) {
      return ok(JSON.stringify(body.pvc));
    }
    if (joined.includes('get pv pv-1')) {
      return ok(JSON.stringify(body.pv));
    }
    if (joined.includes('get pv -o')) {
      return ok(JSON.stringify({ items: [body.pv] }));
    }
    if (
      joined.includes('kind get clusters') ||
      joined.includes('config view')
    ) {
      return ok('kind-offscreen-dev');
    }
    return ok('');
  };
}

test('absent custom API via discovery classifies prerequisite absence', () => {
  const run = (command, args) => {
    if (args.join(' ').includes('get --raw /apis/cert-manager.io/v1')) {
      return fail(404);
    }
    return ok('');
  };
  const gate = resolveCustomApiGate('Certificate', devTarget, {
    run,
    readObject: () => ({ state: 'absent' }),
  });
  assert.equal(gate.state, 'absent_by_prerequisite');
});

test('unestablished CRD refuses custom reads', () => {
  const gate = resolveCustomApiGate('Issuer', devTarget, {
    run: () => fail(404),
    readObject: () => ({
      state: 'present',
      object: {
        status: { conditions: [{ type: 'Established', status: 'False' }] },
      },
    }),
  });
  assert.equal(gate.state, 'unknown');
  assert.equal(gate.reason, 'crd-unestablished');
});

test('denied discovery read returns unknown', () => {
  const discovery = discoverApiVersion(devTarget, 'cert-manager.io', 'v1', () =>
    fail(403),
  );
  assert.equal(discovery.state, 'unknown');
  assert.equal(discovery.reason, 'discovery-denied');
});

test('inconsistent CRD and discovery returns unknown', () => {
  const gate = resolveCustomApiGate('RabbitmqCluster', devTarget, {
    run: () =>
      ok(
        JSON.stringify({
          resources: [{ name: 'rabbitmqclusters' }],
        }),
      ),
    readObject: () => ({ state: 'absent' }),
  });
  assert.equal(gate.state, 'unknown');
  assert.equal(gate.reason, 'inconsistent-crd-discovery');
});

test('foreign RabbitmqCluster refuses census', () => {
  const inventory = observeRabbitmqInventory(devTarget, {
    skipTargetAssert: true,
    readObject: ({ resource, name }) => {
      if (resource === 'namespace' && name === LEGACY_MESSAGING_NAMESPACE) {
        return { state: 'absent' };
      }
      if (
        resource === 'customresourcedefinitions.apiextensions.k8s.io' &&
        name === CUSTOM_API_MAP.RabbitmqCluster.crd
      ) {
        return {
          state: 'present',
          object: {
            status: { conditions: [{ type: 'Established', status: 'True' }] },
            spec: { versions: [{ served: true }] },
          },
        };
      }
      return { state: 'absent' };
    },
    run: (command, args) => {
      const joined = args.join(' ');
      if (joined.includes('get --raw /apis/rabbitmq.com/v1beta1')) {
        return ok(
          JSON.stringify({
            resources: [{ name: 'rabbitmqclusters' }],
          }),
        );
      }
      if (joined.includes('get --raw')) {
        return fail(404);
      }
      if (joined.includes('rabbitmqclusters.rabbitmq.com')) {
        return ok(
          JSON.stringify({
            items: [
              {
                metadata: {
                  name: 'other',
                  namespace: 'foreign-ns',
                },
              },
            ],
          }),
        );
      }
      if (joined.includes('get pv')) {
        return ok(JSON.stringify({ items: [] }));
      }
      return ok('');
    },
  });
  assert.equal(inventory.state, 'foreign');
});

test('partial install refuses census', () => {
  const inventory = observeRabbitmqInventory(devTarget, {
    skipTargetAssert: true,
    readObject: ({ resource, name }) => {
      if (resource === 'namespace' && name === 'cert-manager') {
        return {
          state: 'present',
          object: {
            metadata: {
              name: 'cert-manager',
              labels: { [NATIVE_DESIGN_LABEL]: NATIVE_DESIGN_VALUE },
            },
          },
        };
      }
      if (
        resource === 'customresourcedefinitions.apiextensions.k8s.io' &&
        name === CUSTOM_API_MAP.RabbitmqCluster.crd
      ) {
        return {
          state: 'present',
          object: {
            status: { conditions: [{ type: 'Established', status: 'True' }] },
            spec: { versions: [{ served: true }] },
          },
        };
      }
      return { state: 'absent' };
    },
    run: (command, args) => {
      const joined = args.join(' ');
      if (joined.includes('get --raw /apis/rabbitmq.com/v1beta1')) {
        return ok(
          JSON.stringify({
            resources: [{ name: 'rabbitmqclusters' }],
          }),
        );
      }
      if (joined.includes('get --raw')) {
        return fail(404);
      }
      if (joined.includes('rabbitmqclusters.rabbitmq.com')) {
        return ok(JSON.stringify({ items: [] }));
      }
      if (joined.includes('get pv')) {
        return ok(JSON.stringify({ items: [] }));
      }
      return ok('');
    },
  });
  assert.equal(inventory.state, 'partial');
});

test('legacy messaging namespace refuses census', () => {
  const inventory = observeRabbitmqInventory(devTarget, {
    skipTargetAssert: true,
    readObject: ({ name }) => {
      if (name === LEGACY_MESSAGING_NAMESPACE) {
        return {
          state: 'present',
          object: { metadata: { name: LEGACY_MESSAGING_NAMESPACE } },
        };
      }
      return { state: 'absent' };
    },
    run: () => ok(JSON.stringify({ items: [] })),
  });
  assert.equal(inventory.state, 'legacy_occupied');
});

test('wrong endpoint refuses structural readiness', () => {
  const broker = recognizedBroker();
  const live = happyLiveObjects();
  live.endpointSlice.endpoints[0].targetRef.uid = 'other-pod';
  const result = observeRabbitmqStructural(devTarget, broker, buildRun(live));
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'wrong-endpoint');
});

test('missing credential key refuses structural readiness', () => {
  const broker = recognizedBroker();
  const live = happyLiveObjects();
  delete live.secret.data.password;
  const result = observeRabbitmqStructural(devTarget, broker, buildRun(live));
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'missing-credential-key');
});

test('wrong image refuses structural readiness', () => {
  const broker = recognizedBroker({
    spec: { image: 'docker.io/library/rabbitmq:4.0.0' },
  });
  const result = observeRabbitmqStructural(devTarget, broker, buildRun({}));
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'wrong-image');
});

test('wrong storage refuses structural readiness', () => {
  const broker = recognizedBroker();
  const live = happyLiveObjects();
  live.pvc.spec.storageClassName = 'wrong-class';
  const result = observeRabbitmqStructural(devTarget, broker, buildRun(live));
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'wrong-storage');
});

test('stale readiness refuses structural observation', () => {
  const broker = recognizedBroker({
    status: {
      observedGeneration: 2,
      conditions: [
        { type: 'AllReplicasReady', status: 'True' },
        { type: 'ReconcileSuccess', status: 'True' },
      ],
      defaultUser: recognizedBroker().status.defaultUser,
    },
  });
  const result = observeRabbitmqStructural(devTarget, broker, buildRun({}));
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'stale-readiness');
});

test('forbidden override refuses structural observation', () => {
  const forbidden = brokerSpecForbiddenFieldsAcceptable({
    replicas: 1,
    override: { statefulSet: { spec: { replicas: 2 } } },
  });
  assert.equal(forbidden.ok, false);
  assert.equal(forbidden.reason, 'forbidden-override');
  const broker = recognizedBroker({
    spec: {
      override: { statefulSet: { spec: { replicas: 2 } } },
    },
  });
  const result = observeRabbitmqStructural(devTarget, broker, buildRun({}));
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'forbidden-override');
});

test('external exposure refuses structural observation', () => {
  const broker = recognizedBroker({ spec: { service: { type: 'NodePort' } } });
  const result = observeRabbitmqStructural(devTarget, broker, buildRun({}));
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'external-exposure');
});

test('recognized structural fixture returns ready without secret values', () => {
  const broker = recognizedBroker();
  const inventory = {
    state: 'recognized',
    targetBroker: { state: 'present', object: broker },
  };
  const ready = observeRabbitmqReady('dev', {
    skipTargetAssert: true,
    inventory,
    run: buildRun({}),
  });
  assert.equal(ready.ok, true);
  assert.equal(ready.state, 'ready');
  assert.deepEqual(ready.credentialKeyNames, ['username', 'password']);
  assert.equal(JSON.stringify(ready).includes('dXNlcg=='), false);
  assert.equal(JSON.stringify(ready).includes('cGFzcw=='), false);
});

test('custom API map matches R8 certificate issuer and rabbitmq cluster resources', () => {
  assert.equal(
    CUSTOM_API_MAP.Certificate.resource,
    'certificates.cert-manager.io',
  );
  assert.equal(CUSTOM_API_MAP.Issuer.resource, 'issuers.cert-manager.io');
  assert.equal(
    CUSTOM_API_MAP.RabbitmqCluster.resource,
    'rabbitmqclusters.rabbitmq.com',
  );
});
