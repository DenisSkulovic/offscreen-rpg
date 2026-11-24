import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  assertPlatformTarget,
  readPlatformObject,
} from '../common/commands.mjs';
import { verifyManifestBytes } from '../common/pins.mjs';
import { readPlatformProfile } from '../common/profile.mjs';
import {
  renderPlatformDocuments,
  renderPlatformYaml,
} from '../common/render.mjs';

const moduleDir = dirname(fileURLToPath(import.meta.url));
const chartRoot = join(moduleDir, 'chart');

export const BROKER_NAME = 'lab-broker';
export const NAMESPACE = 'messaging';
export const SECRET_NAME = 'lab-broker-user';
export const DEFINITIONS_CONFIGMAP = 'lab-broker-definitions';
export const BROKER_IMAGE = 'docker.io/library/rabbitmq:4.3.4-management';
export const OPERATOR_IMAGE = 'ghcr.io/rabbitmq/cluster-operator:2.23.3';
export const POD_NAME = 'lab-broker-server-0';
export const CLIENT_USER = 'lab-client';
export const STORAGE_CLASS = 'local-path';
export const STORAGE_SIZE = '1Gi';

export const CERT_MANAGER_SHA256 =
  'c04a51295adda2b1a775146751f973e787190778c7f35180861d9678876e5c74';
export const CLUSTER_OPERATOR_SHA256 =
  '3ccd8a7c8a7f319ff21c444f3599829242f3cc1c18ae2dedea170cfcefeb8681';

const CERT_MANAGER_MANIFEST = join(
  moduleDir,
  'vendor/cert-manager-v1.21.3.yaml',
);
const OPERATOR_MANIFEST = join(
  moduleDir,
  'vendor/cluster-operator-v2.23.3.yml',
);
const DEFINITIONS_PATH = join(moduleDir, 'definitions.json');

/**
 * @param {string} [definitionsPath]
 */
export function readExpectedQueues(definitionsPath = DEFINITIONS_PATH) {
  const text = readFileSync(definitionsPath, 'utf8');
  const parsed = JSON.parse(text);
  const queues = parsed.queues ?? [];
  if (!Array.isArray(queues) || queues.length === 0) {
    throw new Error('definitions.json has no queues');
  }
  return queues.map((q) => ({
    name: q.name,
    durable: Boolean(q.durable),
    type: q.arguments?.['x-queue-type'] ?? 'classic',
  }));
}

/**
 * @param {string} [definitionsPath]
 */
export function readDefinitionsBytes(definitionsPath = DEFINITIONS_PATH) {
  return readFileSync(definitionsPath);
}

/**
 * @param {object} broker
 */
export function brokerMatchesExpected(broker) {
  if (!broker || typeof broker !== 'object') return false;
  if (broker.metadata?.name !== BROKER_NAME) return false;
  if (broker.metadata?.namespace !== NAMESPACE) return false;
  const spec = broker.spec ?? {};
  if (spec.replicas !== 1) return false;
  if (spec.image !== BROKER_IMAGE) return false;
  if (spec.persistence?.storageClassName !== STORAGE_CLASS) return false;
  if (spec.persistence?.storage !== STORAGE_SIZE) return false;
  return true;
}

/**
 * @param {{ name: string, durable: boolean, type: string }[]} actual
 * @param {{ name: string, durable: boolean, type: string }[]} expected
 */
export function queuesMatchExpected(actual, expected) {
  if (actual.length !== expected.length) return false;
  for (const want of expected) {
    const found = actual.find(
      (q) =>
        q.name === want.name &&
        q.durable === want.durable &&
        q.type === want.type,
    );
    if (!found) return false;
  }
  return true;
}

/**
 * @param {ReturnType<typeof readPlatformObject>} result
 */
function objectPresent(result) {
  return result.state === 'present';
}

/**
 * @param {ReturnType<typeof readPlatformObject>} result
 */
function refuseUnreadable(result, id) {
  if (result.state === 'unreadable') {
    return { ok: false, id, reason: result.reason ?? 'unreadable' };
  }
  return null;
}

/**
 * @param {typeof import('../common/commands.mjs').runPlatformCommand} run
 * @param {string[]} args
 * @param {{ input?: string, attempts?: number, retryOn?: RegExp }} [options]
 */
function kubectlApplyWithRetry(run, args, options = {}) {
  const attempts = options.attempts ?? 1;
  const retryOn =
    options.retryOn ??
    /failed calling webhook|connection refused|certificate signed by unknown authority/;
  const err = [];
  for (let i = 0; i < attempts; i += 1) {
    const result = run('kubectl', args, { input: options.input });
    if (result.ok) return result;
    const text = `${result.stderr ?? ''}\n${result.stdout ?? ''}`;
    err.push(text);
    if (!retryOn.test(text)) {
      return { ...result, stderr: text };
    }
    if (i + 1 < attempts) options.sleep?.(2000);
  }
  return { ok: false, stdout: '', stderr: err.join('\n') };
}

/**
 * @param {{
 *   run?: typeof import('../common/commands.mjs').runPlatformCommand,
 *   renderDocuments?: typeof renderPlatformDocuments,
 *   readObject?: typeof readPlatformObject,
 *   definitionsBytes?: Buffer,
 *   expectedQueues?: ReturnType<typeof readExpectedQueues>,
 *   generatePassword?: () => string,
 *   authorize?: boolean,
 *   rabbitmqRoot?: string,
 *   profileId?: 'release',
 *   skipVendorVerify?: boolean,
 *   operatorWebhookAlwaysFails?: boolean,
 *   brokerWebhookAlwaysFails?: boolean,
 *   waitReplicas?: (run: Function) => Promise<boolean> | boolean,
 * }} [deps]
 */
export async function runRabbitmqReleaseInstall(deps = {}) {
  const run =
    deps.run ??
    (() => {
      throw new Error('run is required');
    });
  const renderDocuments =
    deps.renderDocuments ??
    ((section) =>
      renderPlatformDocuments(
        { service: 'rabbitmq', profile: 'release', section },
        { chartRoot },
      ));
  const readObject = deps.readObject ?? readPlatformObject;
  const definitionsBytes = deps.definitionsBytes ?? readDefinitionsBytes();
  const expectedQueues = deps.expectedQueues ?? readExpectedQueues();
  const generatePassword =
    deps.generatePassword ?? (() => randomBytes(16).toString('hex'));
  const authorize = deps.authorize ?? false;
  const profileId = deps.profileId ?? 'release';
  const root = deps.rabbitmqRoot ?? moduleDir;

  /** @type {Array<{ op: string }>} */
  const actions = [];
  /** @type {Array<{ id: string, reason?: string }>} */
  const refusals = [];
  let mutated = false;
  const sleep = deps.sleep ?? (() => {});
  const wait = (args) => run('kubectl', args, { timeoutMs: 260000 });

  const refuse = (id, reason) => {
    refusals.push({ id, reason });
    return { ok: false, actions, refusals, mutated };
  };

  if (!authorize) {
    return refuse('ensure-not-authorized', 'mutation not authorized');
  }

  const verifyVendor =
    deps.verifyVendor ??
    (() => {
      verifyManifestBytes(
        readFileSync(CERT_MANAGER_MANIFEST),
        CERT_MANAGER_SHA256,
      );
      verifyManifestBytes(
        readFileSync(OPERATOR_MANIFEST),
        CLUSTER_OPERATOR_SHA256,
      );
    });
  if (!deps.skipVendorVerify) {
    try {
      verifyVendor();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'digest failed';
      return refuse('vendor-digest-mismatch', message);
    }
    actions.push({ op: 'verify-vendor-digests' });
  }

  const operator = readObject({
    profileId,
    resource: 'deployment',
    name: 'rabbitmq-cluster-operator',
    namespace: 'rabbitmq-system',
  });
  const unreadableOp = refuseUnreadable(operator, 'operator-unreadable');
  if (unreadableOp) return refuse(unreadableOp.id, unreadableOp.reason);
  if (objectPresent(operator)) {
    const image =
      operator.object?.spec?.template?.spec?.containers?.[0]?.image ?? '';
    if (image !== OPERATOR_IMAGE) {
      return refuse('operator-image-mismatch', image);
    }
  }
  // An earlier multi-document apply may have created the Deployment but failed
  // before creating its certificate/issuer. Reconcile the pinned bundle again.
  const certificate = readObject({
    profileId, resource: 'certificate', name: 'cluster-operator-serving-cert',
    namespace: 'rabbitmq-system',
  });
  const issuer = readObject({
    profileId, resource: 'issuer', name: 'selfsigned-issuer',
    namespace: 'rabbitmq-system',
  });
  for (const [name, observation] of [['certificate', certificate], ['issuer', issuer]]) {
    if (observation.state === 'unreadable' && objectPresent(operator)) {
      return refuse('operator-dependency-unreadable', name);
    }
  }
  const needsOperatorApply = !objectPresent(operator) || !objectPresent(certificate) || !objectPresent(issuer);
  if (!needsOperatorApply) {
    actions.push({ op: 'reuse-operator' });
  } else {
    if (deps.operatorWebhookAlwaysFails) {
      return refuse(
        'operator-webhook-failed',
        'webhook not accepting operator',
      );
    }
    actions.push({ op: 'apply-cert-manager' });
    const applyResult = kubectlApplyWithRetry(
      run,
      [
        'apply',
        '--server-side',
        '--field-manager=k8s03-rabbitmq',
        '-f',
        CERT_MANAGER_MANIFEST,
      ],
      { attempts: deps.operatorWebhookAlwaysFails ? 1 : 24, sleep },
    );
    if (!applyResult.ok) {
      return refuse('apply-cert-manager-failed');
    }
    mutated = true;
    for (const crd of ['certificates.cert-manager.io', 'issuers.cert-manager.io']) {
      if (!wait(['wait', '--for=condition=Established', 'crd/' + crd, '--timeout=180s']).ok) {
        return refuse('cert-manager-crd-not-ready', crd);
      }
    }
    for (const name of ['cert-manager', 'cert-manager-webhook', 'cert-manager-cainjector']) {
      if (!wait(['-n', 'cert-manager', 'rollout', 'status', 'deployment/' + name, '--timeout=240s']).ok) {
        return refuse('cert-manager-not-ready', name);
      }
    }
    actions.push({ op: 'apply-operator' });
    const operatorApply = kubectlApplyWithRetry(
      run,
      [
        'apply',
        '--server-side',
        '--field-manager=k8s03-rabbitmq',
        '-f',
        OPERATOR_MANIFEST,
      ],
      { attempts: deps.operatorWebhookAlwaysFails ? 1 : 24, sleep },
    );
    if (!operatorApply.ok) {
      return refuse(
        'operator-webhook-failed',
        'RabbitMQ cluster operator manifest was not accepted: ' + String(operatorApply.stderr ?? '').slice(-1200),
      );
    }
    mutated = true;
  }

  {
    if (!wait(['wait', '--for=condition=Established', 'crd/rabbitmqclusters.rabbitmq.com', '--timeout=180s']).ok ||
        !wait(['-n', 'rabbitmq-system', 'wait', '--for=condition=Ready', 'certificate/cluster-operator-serving-cert', '--timeout=240s']).ok ||
        !wait(['-n', 'rabbitmq-system', 'rollout', 'status', 'deployment/rabbitmq-cluster-operator', '--timeout=240s']).ok) {
      return refuse('operator-not-ready');
    }
  }
  actions.push({ op: 'wait-operator-webhook' });

  const namespaceDoc = renderDocuments('namespace');
  if (namespaceDoc.length !== 1 || namespaceDoc[0].kind !== 'Namespace') {
    return refuse('render-namespace-invalid');
  }
  const ns = readObject({
    profileId,
    resource: 'namespace',
    name: NAMESPACE,
  });
  const unreadableNs = refuseUnreadable(ns, 'namespace-unreadable');
  if (unreadableNs) return refuse(unreadableNs.id, unreadableNs.reason);
  if (!objectPresent(ns)) {
    actions.push({ op: 'apply-namespace' });
    const yaml = renderPlatformYaml(namespaceDoc);
    const applyNs = run('kubectl', ['apply', '-f', '-'], { input: yaml });
    if (!applyNs.ok) return refuse('apply-namespace-failed');
    mutated = true;
  } else {
    actions.push({ op: 'reuse-namespace' });
  }

  const cm = readObject({
    profileId,
    resource: 'configmap',
    name: DEFINITIONS_CONFIGMAP,
    namespace: NAMESPACE,
  });
  const unreadableCm = refuseUnreadable(cm, 'definitions-configmap-unreadable');
  if (unreadableCm) return refuse(unreadableCm.id, unreadableCm.reason);
  if (objectPresent(cm)) {
    const data = cm.object?.data?.['definitions.json'];
    if (typeof data !== 'string') {
      return refuse('definitions-configmap-missing-data');
    }
    const existing = Buffer.from(data, 'utf8');
    if (
      createHash('sha256').update(existing).digest('hex') !==
      createHash('sha256').update(definitionsBytes).digest('hex')
    ) {
      return refuse(
        'definitions-migration-needed',
        'existing definitions bytes differ from repository definitions.json',
      );
    }
    actions.push({ op: 'reuse-definitions-configmap' });
  } else {
    actions.push({ op: 'create-definitions-configmap' });
    const createCm = run(
      'kubectl',
      [
        '-n',
        NAMESPACE,
        'create',
        'configmap',
        DEFINITIONS_CONFIGMAP,
        `--from-file=definitions.json=${join(root, 'definitions.json')}`,
        '--dry-run=client',
        '-o',
        'yaml',
      ],
      undefined,
    );
    if (!createCm.ok) return refuse('render-definitions-configmap-failed');
    const applyCm = run('kubectl', ['apply', '-f', '-'], {
      input: createCm.stdout ?? '',
    });
    if (!applyCm.ok) return refuse('apply-definitions-configmap-failed');
    mutated = true;
  }

  const brokerObj = readObject({
    profileId,
    resource: 'rabbitmqcluster',
    name: BROKER_NAME,
    namespace: NAMESPACE,
  });
  const unreadableBroker = refuseUnreadable(brokerObj, 'broker-unreadable');
  if (unreadableBroker)
    return refuse(unreadableBroker.id, unreadableBroker.reason);

  const pvc = readObject({
    profileId,
    resource: 'persistentvolumeclaim',
    name: `persistence-${BROKER_NAME}-server-0`,
    namespace: NAMESPACE,
  });
  const unreadablePvc = refuseUnreadable(pvc, 'pvc-unreadable');
  if (unreadablePvc) return refuse(unreadablePvc.id, unreadablePvc.reason);

  const secret = readObject({
    profileId,
    resource: 'secret',
    name: SECRET_NAME,
    namespace: NAMESPACE,
  });
  const unreadableSecret = refuseUnreadable(secret, 'secret-unreadable');
  if (unreadableSecret)
    return refuse(unreadableSecret.id, unreadableSecret.reason);

  const brokerOrPvcExists =
    objectPresent(brokerObj) ||
    objectPresent(pvc) ||
    objectPresent(
      readObject({
        profileId,
        resource: 'pod',
        name: POD_NAME,
        namespace: NAMESPACE,
      }),
    );

  if (!objectPresent(secret)) {
    if (brokerOrPvcExists) {
      return refuse(
        'missing-secret-with-data',
        'broker or PVC exists but lab-broker-user is absent',
      );
    }
    actions.push({ op: 'create-secret-stdin' });
    const password = generatePassword();
    const conf = `default_user = ${CLIENT_USER}\ndefault_pass = ${password}\n`;
    const secretYaml = `apiVersion: v1
kind: Secret
metadata:
  name: ${SECRET_NAME}
  namespace: ${NAMESPACE}
type: Opaque
stringData:
  default_user.conf: |
    ${conf.trimEnd().replace(/\n/g, '\n    ')}
  username: ${CLIENT_USER}
  password: ${password}
  provider: rabbitmq
  type: rabbitmq
  host: ${BROKER_NAME}.${NAMESPACE}.svc
  port: "5672"
`;
    const createSecret = run('kubectl', ['create', '-f', '-'], {
      input: secretYaml,
    });
    if (!createSecret.ok) return refuse('create-secret-failed');
    mutated = true;
  } else {
    actions.push({ op: 'reuse-secret' });
  }

  const brokerDocs = renderDocuments('broker');
  if (brokerDocs.length !== 1 || brokerDocs[0].kind !== 'RabbitmqCluster') {
    return refuse('render-broker-invalid');
  }

  let brokerFresh = false;
  if (objectPresent(brokerObj)) {
    if (!brokerMatchesExpected(brokerObj.object)) {
      return refuse(
        'foreign-broker',
        'existing broker does not match expected identity',
      );
    }
    actions.push({ op: 'reuse-broker' });
  } else {
    if (deps.brokerWebhookAlwaysFails) {
      return refuse('broker-webhook-failed', 'webhook not accepting broker');
    }
    actions.push({ op: 'apply-broker' });
    const brokerYaml = renderPlatformYaml(brokerDocs);
    const applyBroker = kubectlApplyWithRetry(run, ['apply', '-f', '-'], {
      input: brokerYaml,
      attempts: deps.brokerWebhookAlwaysFails ? 1 : 24,
      sleep,
    });
    if (!applyBroker.ok) {
      return refuse(
        'broker-webhook-failed',
        'Broker was not accepted by the operator webhook: ' + String(applyBroker.stderr ?? '').slice(-1600),
      );
    }
    mutated = true;
    brokerFresh = true;
  }

  const waitReplicas =
    deps.waitReplicas ??
    (() => {
      if (!wait(['-n', NAMESPACE, 'wait', '--for=condition=AllReplicasReady', 'rabbitmqcluster/' + BROKER_NAME, '--timeout=240s']).ok) return false;
      const status = readObject({
        profileId,
        resource: 'rabbitmqcluster',
        name: BROKER_NAME,
        namespace: NAMESPACE,
      });
      if (!objectPresent(status)) return false;
      const conditions = status.object?.status?.conditions ?? [];
      const ready = conditions.find((c) => c.type === 'AllReplicasReady');
      return ready?.status === 'True';
    });
  const ready = await waitReplicas(run);
  if (!ready) {
    return refuse('broker-not-ready', 'AllReplicasReady is not True');
  }
  actions.push({ op: 'verify-all-replicas-ready' });

  const readQueues = () => {
    const result = run('kubectl', [
      '-n', NAMESPACE, 'exec', POD_NAME, '-c', 'rabbitmq', '--',
      'rabbitmqctl', 'list_queues', 'name', 'durable', 'type', '--formatter=json',
    ]);
    if (!result.ok) return null;
    try {
      const queues = JSON.parse(result.stdout ?? '');
      if (!Array.isArray(queues) || !queues.every(q =>
        q && typeof q.name === 'string' && typeof q.durable === 'boolean' &&
        typeof q.type === 'string')) return null;
      return queues;
    } catch {
      return null;
    }
  };
  const actualQueues = readQueues();
  if (!actualQueues) return refuse('list-queues-failed');

  const queuesOk = queuesMatchExpected(actualQueues, expectedQueues);

  const brokerReused = !brokerFresh && objectPresent(brokerObj);

  if (brokerReused) {
    if (!queuesOk) {
      return refuse(
        'queue-mismatch',
        'reentry queue set does not match definitions.json',
      );
    }
    actions.push({ op: 'reentry-verify-queues' });
    return { ok: true, actions, refusals, mutated: false };
  }

  if (brokerFresh || !queuesOk) {
    const usersResult = run('kubectl', [
      '-n',
      NAMESPACE,
      'exec',
      POD_NAME,
      '--',
      'rabbitmqctl',
      'list_users',
      '--quiet',
    ]);
    if (!usersResult.ok) return refuse('list-users-failed');
    const users = (usersResult.stdout ?? '')
      .split('\n')
      .map((l) => l.trim().split(/\s+/)[0])
      .filter(Boolean);
    if (!users.includes(CLIENT_USER)) {
      return refuse(
        'lab-client-missing',
        'lab-client was not created from external secret',
      );
    }
    actions.push({ op: 'verify-lab-client' });

    const expectedQueuePresent = expectedQueues.every((want) =>
      actualQueues.some(
        (q) =>
          q.name === want.name &&
          q.durable === want.durable &&
          q.type === want.type,
      ),
    );
    if (expectedQueuePresent) {
      actions.push({ op: 'skip-import-queue-present' });
    } else {
      actions.push({ op: 'import-definitions-once' });
      const importResult = run('kubectl', [
        '-n',
        NAMESPACE,
        'exec',
        POD_NAME,
        '--',
        'sh',
        '-c',
        [
          'set -eu',
          'conf=/etc/rabbitmq/conf.d/11-default_user.conf',
          'user=$(sed -n "s/^default_user = //p" "$conf")',
          'pass=$(sed -n "s/^default_pass = //p" "$conf")',
          `test "$user" = "${CLIENT_USER}"`,
          'rabbitmqadmin --non-interactive --host 127.0.0.1 --port 15672 --username "$user" --password "$pass" definitions import --file /etc/rabbitmq/definitions.json',
        ].join('\n'),
      ]);
      if (!importResult.ok) {
        return refuse('import-definitions-failed');
      }
      mutated = true;
    }
  }

  const finalQueues = readQueues();
  if (!finalQueues || !queuesMatchExpected(finalQueues, expectedQueues)) {
    return refuse('queue-postcondition-failed', 'final queue set does not match definitions.json');
  }
  return { ok: true, actions, refusals, mutated };
}

/**
 * Live entry when executed directly after shell guards and target check.
 */
async function main() {
  try {
    assertPlatformTarget('release');
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'target verification failed';
    process.stderr.write(`${message}\n`);
    process.exit(1);
  }
  const { runPlatformCommand } = await import('../common/commands.mjs');
  const profile = readPlatformProfile('release');
  const kubectl = (command, args, options) => {
    if (command !== 'kubectl') {
      return runPlatformCommand(command, args, options);
    }
    return runPlatformCommand(
      command,
      ['--context', profile.contextName, ...args],
      options,
    );
  };
  const result = await runRabbitmqReleaseInstall({
    run: kubectl,
    authorize: true,
    sleep: (ms) => { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); },
  });
  if (!result.ok) {
    const last = result.refusals.at(-1);
    process.stderr.write(
      `RabbitMQ install refused: ${last?.id ?? 'unknown'}${last?.reason ? ` (${last.reason})` : ''}\n`,
    );
    process.exit(1);
  }
  process.stdout.write(
    `Broker ${BROKER_NAME} is ready in namespace ${NAMESPACE}. Replicas: 1. User: ${CLIENT_USER}.\n`,
  );
}

const entry = process.argv[1];
if (entry && fileURLToPath(import.meta.url) === entry) {
  main();
}
