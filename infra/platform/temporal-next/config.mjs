import { readPlatformProfile } from '../common/profile.mjs';
import { baselineCnpgClusterName } from '../postgres/config.mjs';

export const SERVER_IMAGE = 'docker.io/temporalio/server:1.32.2@sha256:7bf69188a6232fea14869b9cef3d94aa82a1601d99517f7e86c71f22da4e0670';
export const ADMIN_IMAGE = 'docker.io/temporalio/admin-tools:1.32.2@sha256:4a95866efba29d7e17ab012df5232795e8b0ad0f7d5f9d1ec4df321f7792a754';
export const SQL_IMAGE = 'docker.io/library/postgres:17.11-bookworm@sha256:665dc7b37ac52a17e298511414c21d23ffa4e6a6ef6225b3e5d59c7afb35e994';

// The initial replacement is deliberately isolated; production identities are not selectable.
export function compactConfig(profileId) {
  const profile = readPlatformProfile(profileId);
  const namespace = profile.namespaces.temporal + '-next';
  return {
    profileId,
    context: profile.contextName,
    namespace,
    owner: 'offscreen-temporal-next',
    endpoint: baselineCnpgClusterName(profileId) + '-rw.' + profile.namespaces.postgres + '.svc.cluster.local',
    port: 5432,
    secret: 'temporal-persistence',
    historyShards: 4,
    execution: { database: 'temporal_next', version: '1.19', directory: 'temporal', maxConns: 8 },
    visibility: { database: 'temporal_next_visibility', version: '1.14', directory: 'visibility', maxConns: 4 },
    resources: {
      requests: { cpu: '200m', memory: '384Mi' },
      limits: { cpu: '700m', memory: '768Mi' },
    },
  };
}
