function stopped(id, detail) {
  return { ok: false, mutated: false, refusals: [{ id, detail }] };
}

export function holdLiveTenantMutation() {
  return stopped('ensure-not-authorized', 'host CLI mutation remains disabled');
}

export function createDevSqlKubectlAdapter() {
  return {
    injectedProbe: false,
    identity() {
      throw Object.assign(new Error('live SQL adapter transport is disabled'), {
        code: 'live-adapter-disabled',
      });
    },
  };
}
