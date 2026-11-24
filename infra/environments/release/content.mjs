import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { assertPlatformTarget, readPlatformObject, runPlatformCommand } from '../../platform/common/commands.mjs';
import { ensureKindImage, matchesRuntimeImageDigest } from '../../images/distribution/kind-image-loader.mjs';
import { EXPECTED_IMPORT_ROOTS } from '../../verification/release-acceptance/turn03/fixture-import-roots.mjs';

const NAMESPACE = 'lab-edge';
const CONTEXT = 'kind-offscreen-release';
const IMAGE = 'offscreen-lab-content-bootstrap:boot02';
const ROLE = 'release-content';
const LABEL = 'offscreen.rpg/role';
const OWNER = 'offscreen.rpg/lab';
const BUILD = fileURLToPath(new URL('../../verification/release-acceptance/content-bootstrap/build.sh', import.meta.url));
export const RELEASE_FIXTURE_READER = 'release-fixture-reader';

function fail(message) { throw new Error('release content: ' + message); }
function named(kind, name, run, namespace = NAMESPACE) {
  return readPlatformObject({ profileId: 'release', resource: kind, name, namespace }, { run });
}

export function fixtureRootsFromReceipt(raw, action) {
  let body;
  try { body = JSON.parse(raw); } catch { fail(action + ' receipt malformed'); }
  if (body?.ok !== true || body.fixtureId !== 'seyda-neen-prisoner' ||
      body.campaignCreated !== false || body.catalogue !== false || body.openingCandidate !== false ||
      (action === 'reader' && body.match !== 'yes') ||
      (action === 'importer' && body.pinPath !== null)) fail(action + ' receipt invalid');
  const roots = { world: body.worldRootHash, rule: body.ruleRootHash, start: body.startRootHash };
  if (Object.keys(EXPECTED_IMPORT_ROOTS).some(key => roots[key] !== EXPECTED_IMPORT_ROOTS[key])) fail(action + ' root mismatch');
  return roots;
}

export function buildFixtureJob(action, digest) {
  if (!['importer', 'reader'].includes(action) || !/^sha256:[0-9a-f]{64}$/.test(digest)) fail('invalid Job input');
  const name = 'release-fixture-' + action;
  const labels = { app: name, [OWNER]: 'disposable', [LABEL]: ROLE };
  const env = {
    HOME: '/tmp', AWS_EC2_METADATA_DISABLED: 'true',
    OFFSCREEN_DOCUMENT_STORE: 's3', OFFSCREEN_DOCUMENT_S3_BUCKET: 'lab-objects',
    OFFSCREEN_DOCUMENT_S3_ENDPOINT: 'http://object-store.lab-objects.svc.cluster.local:8333',
    OFFSCREEN_DOCUMENT_S3_FORCE_PATH_STYLE: 'true', OFFSCREEN_DOCUMENT_S3_REGION: 'us-east-1',
  };
  return {
    apiVersion: 'batch/v1', kind: 'Job',
    metadata: { name, namespace: NAMESPACE, labels, annotations: { 'offscreen.rpg/content-image-id': digest } },
    spec: {
      backoffLimit: 0, activeDeadlineSeconds: 360,
      template: { metadata: { labels }, spec: {
        restartPolicy: 'Never', automountServiceAccountToken: false, enableServiceLinks: false,
        securityContext: { runAsNonRoot: true, runAsUser: 1000, runAsGroup: 1000, seccompProfile: { type: 'RuntimeDefault' } },
        containers: [{
          name: action, image: IMAGE, imagePullPolicy: 'Never',
          command: ['node'], args: ['scripts/repo-tools/' + (action === 'importer' ? 'import' : 'read') + '-pinned-fixture.mjs', '--s3'],
          env: [
            ...Object.entries(env).map(([name, value]) => ({ name, value })),
            ...[['OFFSCREEN_DOCUMENT_S3_ACCESS_KEY_ID', 'access-key-id'], ['OFFSCREEN_DOCUMENT_S3_SECRET_ACCESS_KEY', 'secret-access-key']].map(([name, key]) => ({
              name, valueFrom: { secretKeyRef: { name: 'game-runtime', key } },
            })),
          ],
          resources: { requests: { cpu: '50m', memory: '128Mi' }, limits: { cpu: '500m', memory: '512Mi' } },
          securityContext: { allowPrivilegeEscalation: false, readOnlyRootFilesystem: true, capabilities: { drop: ['ALL'] } },
          volumeMounts: [{ name: 'scratch', mountPath: '/tmp' }],
        }],
        volumes: [{ name: 'scratch', emptyDir: {} }],
      } },
    },
  };
}

function ownedJob(job, name) {
  return job?.metadata?.name === name && job.metadata.namespace === NAMESPACE &&
    job.metadata.labels?.[OWNER] === 'disposable' && job.metadata.labels?.[LABEL] === ROLE &&
    typeof job.metadata.uid === 'string' && job.metadata.uid.length > 0;
}

function terminal(job) {
  return (job.status?.conditions ?? []).some(c => ['Complete', 'Failed'].includes(c.type) && c.status === 'True');
}

function prepareJob(run, name) {
  const old = named('job', name, run);
  if (old.state === 'unreadable') fail(name + ' unreadable');
  if (old.state === 'absent') return;
  if (!ownedJob(old.object, name) || !terminal(old.object)) fail(name + ' foreign or still active');
  const deleted = run('kubectl', ['--context', CONTEXT, 'delete', '--raw',
    '/apis/batch/v1/namespaces/' + NAMESPACE + '/jobs/' + name, '-f', '-'], {
    input: JSON.stringify({ apiVersion: 'v1', kind: 'DeleteOptions', preconditions: { uid: old.object.metadata.uid }, propagationPolicy: 'Foreground' }),
  });
  if (!deleted.ok) fail(name + ' UID-guarded delete refused');
  const waited = run('kubectl', ['--context', CONTEXT, '-n', NAMESPACE, 'wait', '--for=delete', 'job/' + name, '--timeout=90s'], { timeoutMs: 95000 });
  if (!waited.ok || named('job', name, run).state !== 'absent') fail(name + ' deletion not confirmed');
}

function executeJob(action, receipt, run) {
  const manifest = buildFixtureJob(action, receipt.digest);
  const name = manifest.metadata.name;
  prepareJob(run, name);
  const kubectl = args => ['--context', CONTEXT, '-n', NAMESPACE, ...args];
  const created = run('kubectl', kubectl(['create', '-f', '-', '-o', 'json']), { input: JSON.stringify(manifest) });
  if (!created.ok) fail(name + ' create failed');
  let job;
  try { job = JSON.parse(created.stdout); } catch { fail(name + ' creation receipt malformed'); }
  if (!ownedJob(job, name)) fail(name + ' creation ownership mismatch');
  const uid = job.metadata.uid;
  const completed = run('kubectl', kubectl(['wait', '--for=condition=complete', 'job/' + name, '--timeout=360s']), { timeoutMs: 365000 });
  if (!completed.ok) fail(name + ' did not complete; inspect Job events and logs locally');
  const current = named('job', name, run);
  if (current.state !== 'present' || !ownedJob(current.object, name) || current.object.metadata.uid !== uid ||
      !(current.object.status?.conditions ?? []).some(c => c.type === 'Complete' && c.status === 'True')) fail(name + ' completion ownership mismatch');
  const listed = run('kubectl', kubectl(['get', 'pods', '-l', 'job-name=' + name, '-o', 'json']));
  if (!listed.ok) fail(name + ' Pod list unreadable');
  const pods = JSON.parse(listed.stdout).items;
  const owned = Array.isArray(pods) ? pods.filter(p => p.metadata?.ownerReferences?.some(o => o.kind === 'Job' && o.uid === uid && o.name === name && o.controller === true)) : [];
  if (owned.length !== 1 || owned[0].status?.phase !== 'Succeeded') fail(name + ' successful Pod missing or ambiguous');
  const pod = owned[0];
  const status = pod.status.containerStatuses?.find(c => c.name === action);
  const observedDigest = status?.imageID?.match(/sha256:[a-f0-9]{64}$/)?.[0];
  const identity = receipt.nodes?.[pod.spec?.nodeName];
  if (!identity || identity.targetDigest !== receipt.digest || !matchesRuntimeImageDigest({
    profileId: 'release', node: pod.spec.nodeName, observedDigest, expectedDigest: receipt.digest,
    acceptedIds: [identity.configId, identity.manifestDigest, identity.targetDigest],
    run: (command, args) => { const r = run(command, args); return { ...r, status: r.ok ? 0 : 1 }; },
  })) fail(name + ' image provenance mismatch');
  const logs = run('kubectl', kubectl(['logs', 'pod/' + pod.metadata.name, '-c', action]));
  if (!logs.ok) fail(name + ' receipt unreadable');
  return fixtureRootsFromReceipt(logs.stdout, action);
}

/** Reconcile immutable content before application rollout. Every reader is a fresh Pod.
 * Uses the already projected application S3 identity to prove actual runtime access.
 * The separate least-privilege reader acceptance scenario remains distinct.
 */
export function ensureReleaseContent({ run = runPlatformCommand, load = ensureKindImage, verifyTarget = assertPlatformTarget } = {}) {
  verifyTarget('release', { run });
  const credentials = named('secret', 'game-runtime', run);
  if (credentials.state !== 'present' || credentials.object.metadata?.labels?.[OWNER] !== 'disposable' ||
      !credentials.object.metadata?.uid || !credentials.object.data?.['access-key-id'] || !credentials.object.data?.['secret-access-key']) fail('runtime S3 credential projection missing or foreign');
  const built = run('bash', [BUILD], { timeoutMs: 900000 });
  if (!built.ok) fail('bootstrap image build failed; run ' + BUILD + ' for build diagnostics');
  const receipt = load({ profileId: 'release', ref: IMAGE, run: (command, args) => {
    const r = run(command, args, { timeoutMs: 180000 });
    return { ...r, status: r.ok ? 0 : 1 };
  } });
  executeJob('importer', receipt, run);
  const roots = executeJob('reader', receipt, run);
  return { ok: true, roots };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { roots } = ensureReleaseContent();
    console.log('Release content verified: ' + JSON.stringify(roots));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
