import {
  DEV_S3_CONTEXT,
  DEV_S3_NAMESPACE,
  DEV_S3_OWNER,
  DEV_S3_PVC,
  DEV_S3_SECRET,
} from '../../../../infra/platform/object-storage/dev-bootstrap.mjs';
import {
  classifyTenantObservation,
  deriveObjectStorageTenant,
  ensureObjectStorageTenant,
  expectedTenantPolicy,
} from '../../../../infra/platform/object-storage/providers/seaweedfs/provision.mjs';

const LIVE_TOKEN = 'kind-offscreen-dev-s3-tenant-live';

function refusal(id, detail) {
  return { id, detail };
}

function stopped(id, detail, extra = {}) {
  return {
    ok: false,
    mutated: Boolean(extra.mutated),
    refusals: [refusal(id, detail)],
    ...extra,
  };
}

export function deriveDevS3Tenant(slotId) {
  const tenant = deriveObjectStorageTenant('dev', slotId);
  return {
    slotId: tenant.slotId,
    bucket: tenant.bucket,
    user: tenant.user,
    secret: tenant.secret,
    policyName: tenant.policyName,
    context: tenant.context,
    namespace: tenant.namespace,
    owner: tenant.owner,
    role: tenant.role,
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

const PROVISION_REFUSAL_MAP = {
  'bucket-owner-mismatch': 'foreign-bucket',
  'orphan-policy': 'tenant-refused',
  'partial-tuple': 'tenant-refused',
  'secret-name': 'partial-secret',
  'head-bucket': 'scope-not-enforced',
  'observation-unreadable': 'tenant-unknown',
  'required-inventory-missing': 'tenant-unknown',
  'bucket-policy-unknown': 'tenant-unknown',
  'write-ambiguous': 'tenant-unknown',
  'write-failed': 'tenant-unknown',
};

function mapProvisionRefusal(reason, state, extra = {}) {
  const id =
    state === 'unknown'
      ? (PROVISION_REFUSAL_MAP[reason] ?? 'tenant-unknown')
      : (PROVISION_REFUSAL_MAP[reason] ?? 'tenant-refused');
  return stopped(id, reason, extra);
}

/**
 * @param {object} adapter
 * @param {ReturnType<typeof deriveDevS3Tenant>} names
 */
function readObservationFromAdapter(adapter, names) {
  if (typeof adapter.readObservation === 'function') {
    return adapter.readObservation(names);
  }

  const bucket = adapter.bucket(names.bucket);
  const userRaw = adapter.user(names.user);
  const secretRaw = adapter.secret(names.secret);
  const policyInventory =
    typeof adapter.policyInventory === 'function'
      ? adapter.policyInventory(names)
      : null;
  const policyDocument =
    typeof adapter.policyDocument === 'function'
      ? adapter.policyDocument(names)
      : null;
  const groupsEmpty =
    typeof adapter.groupsEmpty === 'function'
      ? adapter.groupsEmpty(names)
      : null;
  const bucketPolicies =
    typeof adapter.bucketPolicies === 'function'
      ? adapter.bucketPolicies(names)
      : null;

  let headBucket =
    typeof adapter.headBucket === 'function' ? adapter.headBucket(names) : null;

  const user =
    userRaw == null
      ? null
      : {
          name: names.user,
          enabled: userRaw.enabled !== false,
          source: userRaw.source ?? 'dynamic',
          policies: userRaw.policies ?? [],
          actions: userRaw.actions ?? [],
          serviceAccounts: userRaw.serviceAccounts ?? [],
          credentials: userRaw.credentials ?? [],
        };

  let secretObservation = null;
  if (secretRaw) {
    const accessKeyId =
      secretRaw.accessKeyId ?? user?.credentials?.[0]?.accessKey ?? '';
    secretObservation = {
      name: secretRaw.name ?? names.secret,
      uid: secretRaw.uid,
      accessKeyId,
    };
  }

  if (headBucket == null && typeof adapter.access === 'function') {
    const access = adapter.access(names);
    if (access?.status === 'deferred') {
      headBucket = 'unknown';
    } else if (
      access &&
      access.ownWrite === true &&
      access.otherWrite === false &&
      access.adminDistributed === false
    ) {
      headBucket = 'ok';
    } else if (access) {
      headBucket = 'denied';
    }
  }

  return {
    bucket: bucket ? { name: names.bucket, owner: bucket.owner } : null,
    user,
    policyInventory,
    policyDocument,
    groupsEmpty,
    secret: secretObservation,
    bucketPolicies,
    headBucket,
    unreadable: Boolean(adapter.observationUnreadable),
  };
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
  if (typeof adapter.withCustody === 'function') {
    return adapter.withCustody((scoped) => ensureAdmittedTenant(slotId, scoped));
  }
  return ensureAdmittedTenant(slotId, adapter);
}

async function ensureAdmittedTenant(slotId, adapter) {
  const binding = assertHost(adapter.identity());
  if (binding) return binding;
  const names = deriveDevS3Tenant(slotId);

  const preliminary = await readObservationFromAdapter(adapter, names);
  if (preliminary.user && !preliminary.secret) {
    const secret = adapter.secret(names.secret);
    const retained = secret ? [{ name: secret.name, uid: secret.uid }] : [];
    return stopped('partial-identity', names.user, { retained });
  }
  if (!preliminary.user && preliminary.secret) {
    const secret = adapter.secret(names.secret);
    const retained = secret ? [{ name: secret.name, uid: secret.uid }] : [];
    return stopped('partial-secret', names.secret, { retained });
  }

  const result = await ensureObjectStorageTenant('dev', {
    authorize: true,
    slotId,
    readObservation: async () => readObservationFromAdapter(adapter, names),
    writeFresh: async (tenant) => {
      if (typeof adapter.writeFresh === 'function') {
        return adapter.writeFresh(tenant);
      }
      const before = await readObservationFromAdapter(adapter, names);
      const classified = classifyTenantObservation(tenant, before);
      if (classified.state !== 'absent') {
        return { ok: false, mutated: false, reason: 'write-refused' };
      }
      await adapter.createBucket(names);
      await adapter.provisionUser(names);
      return { ok: true, mutated: true };
    },
  });

  const retained = [];
  const secret = adapter.secret(names.secret);
  if (secret) retained.push({ name: secret.name, uid: secret.uid });

  if (!result.ok) {
    return mapProvisionRefusal(result.reason, result.state, {
      mutated: result.mutated,
      retained,
    });
  }

  const observation = await readObservationFromAdapter(adapter, names);
  const after = adapter.access?.(names);
  if (result.state === 'reuse' && observation.headBucket !== 'ok') {
    return stopped('scope-not-enforced', names.bucket, {
      retained,
      mutated: false,
    });
  }
  if (
    result.state === 'reuse' &&
    after &&
    after.status !== 'deferred' &&
    (after.ownWrite !== true ||
      after.otherWrite !== false ||
      after.adminDistributed === true)
  ) {
    return stopped('scope-not-enforced', names.bucket, {
      retained,
      mutated: result.mutated,
    });
  }

  const accessEvidence =
    observation.headBucket === 'ok' ||
    (after &&
      after.status !== 'deferred' &&
      after.ownWrite === true &&
      after.otherWrite === false)
      ? 'exercised'
      : 'not-exercised';

  return {
    ok: true,
    mutated: result.mutated,
    refusals: [],
    retained,
    bucket: names.bucket,
    user: names.user,
    accessEvidence,
  };
}

export function mockObservationForStore(store, names, options = {}) {
  const bucket = store.buckets[names.bucket] ?? null;
  const user = store.users[names.user] ?? null;
  const secret = store.secrets[names.secret] ?? null;
  const policyInventory =
    options.policyInventory ?? store.policyInventory ?? [];
  const policyOnRecord =
    policyInventory.includes(names.policyName) ||
    (user?.policies ?? []).includes(names.policyName);
  const policyDocument =
    options.policyDocument ??
    (policyOnRecord ? expectedTenantPolicy(names.bucket) : null);
  return {
    bucket: bucket
      ? {
          name: names.bucket,
          owner: bucket.owner === 'pending' ? names.user : bucket.owner,
        }
      : null,
    user: user
      ? {
          name: names.user,
          enabled: user.enabled !== false,
          source: user.source ?? 'dynamic',
          policies: user.policies ?? [names.policyName],
          actions: user.actions ?? [],
          serviceAccounts: user.serviceAccounts ?? [],
          credentials: user.credentials ?? [
            {
              accessKey: secret?.accessKeyId ?? store.accessKeyId ?? 'AK-MOCK',
              status: 'Active',
            },
          ],
        }
      : null,
    policyInventory,
    policyDocument,
    groupsEmpty: options.groupsEmpty ?? true,
    secret: secret
      ? {
          name: secret.name,
          uid: secret.uid,
          accessKeyId: secret.accessKeyId ?? store.accessKeyId ?? 'AK-MOCK',
        }
      : null,
    bucketPolicies: options.bucketPolicies ?? [],
    headBucket: options.headBucket ?? (user && bucket && secret ? 'ok' : null),
    unreadable: Boolean(options.unreadable),
  };
}
