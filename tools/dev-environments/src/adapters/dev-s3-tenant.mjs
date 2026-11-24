import {
  DEV_S3_CONTEXT,
  DEV_S3_NAMESPACE,
  DEV_S3_OWNER,
  DEV_S3_PVC,
  DEV_S3_SECRET,
} from '../../../../infra/platform/object-storage/dev-bootstrap.mjs';
import { deriveDevSqlTenant } from '../rendering/dev-sql-tenant-contract.mjs';

const LIVE_TOKEN = 'kind-offscreen-dev-s3-tenant-live';

function refusal(id, detail) {
  return { id, detail };
}

function stopped(id, detail, extra = {}) {
  return {
    ok: false,
    mutated: Boolean(extra.retained?.length),
    refusals: [refusal(id, detail)],
    ...extra,
  };
}

export function deriveDevS3Tenant(slotId) {
  const names = deriveDevSqlTenant(slotId);
  return {
    slotId: names.slotId,
    bucket: `offscreen-dev-${names.digits}`,
    user: names.slotId,
    secret: `dev-${names.digits}-s3`,
    context: DEV_S3_CONTEXT,
    namespace: DEV_S3_NAMESPACE,
    owner: DEV_S3_OWNER,
    role: 'readwrite',
  };
}

export function planDevS3Tenant(slotId) {
  const names = deriveDevS3Tenant(slotId);
  return {
    readOnly: true,
    context: names.context,
    namespace: names.namespace,
    actions: [
      `s3.bucket.create -name ${names.bucket}`,
      `s3.user.provision -name ${names.user} -bucket ${names.bucket} -role readwrite`,
      `store credentials in Secret ${names.secret}`,
    ],
  };
}

function assertHost(host) {
  if (
    !host ||
    host.context !== DEV_S3_CONTEXT ||
    host.namespace !== DEV_S3_NAMESPACE ||
    host.owner !== DEV_S3_OWNER
  ) {
    return stopped(
      'wrong-binding',
      'S3 tenants bind to kind-offscreen-dev/offscreen-dev-objects',
    );
  }
  if (host.image !== 'docker.io/chrislusf/seaweedfs:4.54')
    return stopped('unexpected-image', host.image ?? 'missing');
  if (host.pvc !== DEV_S3_PVC || host.pvcReplaced === true)
    return stopped('pvc-replaced', DEV_S3_PVC);
  if (host.adminSecret !== DEV_S3_SECRET)
    return stopped(
      'admin-secret',
      'the shared admin secret is not a tenant credential',
    );
  if (
    !host.commands?.includes('s3.bucket.create') ||
    !host.commands?.includes('s3.user.provision')
  ) {
    return stopped(
      'weed-command-missing',
      's3.bucket.create or s3.user.provision',
    );
  }
  return null;
}

export async function ensureDevS3Tenant({ slotId, authorizeLive, adapter }) {
  if (authorizeLive !== LIVE_TOKEN)
    return stopped(
      'ensure-not-authorized',
      'live S3 tenant ensure remains held',
    );
  if (!adapter || adapter.injectedProbe === true)
    return stopped(
      'injected-probe',
      'an injected probe cannot authorize S3 mutation',
    );
  const binding = assertHost(adapter.identity());
  if (binding) return binding;
  const names = deriveDevS3Tenant(slotId);
  const retained = [];
  const bucket = adapter.bucket(names.bucket);
  if (bucket && bucket.owner !== names.user && bucket.owner !== 'pending')
    return stopped('foreign-bucket', bucket.owner, { retained });
  const identity = adapter.user(names.user);
  if (identity && identity.owner !== names.user)
    return stopped('foreign-identity', identity.owner, { retained });
  const secret = adapter.secret(names.secret);
  if (secret && secret.owner !== DEV_S3_OWNER)
    return stopped('foreign-secret', names.secret, { retained });
  if (identity && !secret)
    return stopped('partial-identity', names.user, { retained });
  if (!identity && secret)
    return stopped('partial-secret', names.secret, { retained });
  let mutated = false;
  if (!bucket) {
    adapter.createBucket(names);
    mutated = true;
  }
  if (secret) retained.push({ name: secret.name, uid: secret.uid });
  if (!identity) {
    const created = adapter.provisionUser(names);
    retained.push({ name: created.secret, uid: created.uid });
    mutated = true;
  }
  const after = adapter.access(names);
  if (after?.status === 'deferred') {
    return {
      ok: true,
      mutated,
      refusals: [],
      retained,
      bucket: names.bucket,
      user: names.user,
      accessEvidence: 'not-exercised',
    };
  }
  if (
    after.ownWrite !== true ||
    after.otherWrite !== false ||
    after.adminDistributed === true
  ) {
    return stopped('scope-not-enforced', names.bucket, { retained, mutated });
  }
  return {
    ok: true,
    mutated,
    refusals: [],
    retained,
    bucket: names.bucket,
    user: names.user,
    accessEvidence: 'exercised',
  };
}
