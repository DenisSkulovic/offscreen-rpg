import {
  assertPlatformTarget,
  readPlatformObject,
  runPlatformCommand,
  PLATFORM_COMMAND_TIMEOUT_MS,
} from '../common/commands.mjs';
import { readPlatformProfile } from '../common/profile.mjs';
import {
  DEV_S3_NAMESPACE,
  DEV_S3_OWNER,
  DEV_S3_PVC,
  objectStoreReadinessMet,
} from './dev-bootstrap.mjs';

const devProfile = readPlatformProfile('dev');
const DEPLOYMENT_NAME = 'object-store';
const OWNER_LABEL = `${devProfile.ownerLabel}/owner`;
const S3_HTTP_PROBE_TIMEOUT_MS = 30_000;

/**
 * @param {typeof runPlatformCommand} run
 */
function execS3HttpProbe(run) {
  return run(
    'kubectl',
    [
      '--context',
      devProfile.contextName,
      '-n',
      DEV_S3_NAMESPACE,
      'exec',
      `deploy/${DEPLOYMENT_NAME}`,
      '--',
      'curl',
      '-s',
      '-o',
      '/dev/null',
      '-w',
      '%{http_code}',
      'http://127.0.0.1:8333/',
    ],
    { timeoutMs: S3_HTTP_PROBE_TIMEOUT_MS },
  );
}

/**
 * Read-only observation that the dev object store PVC, Deployment, and HTTP endpoint are ready.
 * @param {{ run?: typeof runPlatformCommand }} [deps]
 * @returns {{
 *   ok: boolean,
 *   detail?: string,
 *   pvcPhase?: string,
 *   availableReplicas?: string,
 *   s3Status?: string,
 * }}
 */
export function observeDevObjectStoreReady(deps = {}) {
  const run = deps.run ?? runPlatformCommand;

  try {
    assertPlatformTarget('dev', { run });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, detail: message };
  }

  const pvcObservation = readPlatformObject(
    {
      profileId: 'dev',
      resource: 'persistentvolumeclaim',
      name: DEV_S3_PVC,
      namespace: DEV_S3_NAMESPACE,
    },
    { run },
  );
  if (pvcObservation.state === 'unreadable') {
    return {
      ok: false,
      detail: `shared object store PVC is unreadable: ${pvcObservation.reason}`,
    };
  }
  if (pvcObservation.state === 'absent') {
    return { ok: false, detail: 'shared object store PVC is absent' };
  }
  const pvcOwner = pvcObservation.object?.metadata?.labels?.[OWNER_LABEL];
  if (pvcOwner !== DEV_S3_OWNER) {
    return {
      ok: false,
      detail: 'shared object store PVC has foreign ownership',
    };
  }
  const pvcPhase = pvcObservation.object?.status?.phase ?? '';

  const deploymentObservation = readPlatformObject(
    {
      profileId: 'dev',
      resource: 'deployment',
      name: DEPLOYMENT_NAME,
      namespace: DEV_S3_NAMESPACE,
    },
    { run },
  );
  if (deploymentObservation.state === 'unreadable') {
    return {
      ok: false,
      detail: `shared object store Deployment is unreadable: ${deploymentObservation.reason}`,
    };
  }
  if (deploymentObservation.state === 'absent') {
    return { ok: false, detail: 'shared object store Deployment is absent' };
  }
  const deployOwner =
    deploymentObservation.object?.metadata?.labels?.[OWNER_LABEL];
  if (deployOwner !== DEV_S3_OWNER) {
    return {
      ok: false,
      detail: 'shared object store Deployment has foreign ownership',
    };
  }
  const availableReplicas = String(
    deploymentObservation.object?.status?.availableReplicas ?? '',
  );

  const http = execS3HttpProbe(run);
  if (http.missing) {
    return { ok: false, detail: 'kubectl is missing for S3 HTTP probe' };
  }
  if (http.timedOut) {
    return { ok: false, detail: 'S3 HTTP probe timed out' };
  }
  if (!http.ok) {
    return {
      ok: false,
      detail: 'S3 HTTP probe command failed',
      pvcPhase,
      availableReplicas,
      s3Status: '',
    };
  }
  const s3Status = String(http.stdout ?? '').trim();

  const sample = { pvcPhase, availableReplicas, s3Status };
  if (!objectStoreReadinessMet(sample)) {
    return {
      ok: false,
      detail: 'shared object store is not Bound, available, or HTTP-ready',
      ...sample,
    };
  }
  return { ok: true, ...sample };
}

export const DEV_OBJECT_STORE_COMMAND_TIMEOUT_MS = PLATFORM_COMMAND_TIMEOUT_MS;
export const DEV_OBJECT_STORE_HTTP_PROBE_TIMEOUT_MS = S3_HTTP_PROBE_TIMEOUT_MS;
