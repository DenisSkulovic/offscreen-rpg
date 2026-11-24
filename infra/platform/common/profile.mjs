import { readKindProfile } from '../../clusters/kind/manager/config.mjs';
import { DEV_CLUSTER_OWNER } from '../../clusters/kind/manager/dev-bootstrap.mjs';

/** @typedef {'dev' | 'release'} PlatformProfileId */

const PLATFORM_HOME = Object.freeze({
  dev: Object.freeze({
    storageClass: 'standard',
    ownerLabel: 'offscreen.dev',
    ownerValue: DEV_CLUSTER_OWNER,
    namespaces: Object.freeze({
      postgres: 'offscreen-dev-postgres',
      temporal: 'offscreen-dev-temporal',
      objectStorage: 'offscreen-dev-objects',
      redis: 'offscreen-dev-redis',
    }),
  }),
  release: Object.freeze({
    storageClass: 'local-path',
    ownerLabel: 'offscreen.rpg',
    ownerValue: 'disposable',
    namespaces: Object.freeze({
      postgres: 'lab-postgres',
      temporal: 'lab-temporal',
      objectStorage: 'lab-objects',
    }),
  }),
});

/**
 * @param {PlatformProfileId} profileId
 */
export function readPlatformProfile(profileId) {
  if (profileId !== 'dev' && profileId !== 'release') {
    throw new Error(`unsupported platform profile: ${profileId}`);
  }
  const kind = readKindProfile(profileId);
  const home = PLATFORM_HOME[profileId];
  return {
    id: profileId,
    clusterName: kind.clusterName,
    contextName: kind.contextName,
    storageClass: home.storageClass,
    ownerLabel: home.ownerLabel,
    ownerValue: home.ownerValue,
    namespaces: {
      postgres: home.namespaces.postgres,
      temporal: home.namespaces.temporal,
      objectStorage: home.namespaces.objectStorage,
      redis: home.namespaces.redis ?? null,
    },
  };
}
