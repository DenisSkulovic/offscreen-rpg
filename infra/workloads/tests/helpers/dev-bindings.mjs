import {
  DEV_POD_RUNTIME_RECEIPT_DIR,
  deriveSlotCookiePrefix,
} from '../../../../tools/dev-environments/src/rendering/dev-slot-app-graph.mjs';
import { localObjectStorageBinding } from '../../../platform/object-storage/binding.mjs';
import { DEV_S3_NAMESPACE } from '../../../platform/object-storage/dev-bootstrap.mjs';
import {
  DEV_SQL_POOL_MAX,
  deriveDevSqlTenant,
} from '../../../../tools/dev-environments/src/rendering/dev-sql-tenant-contract.mjs';
import { deriveDevS3Tenant } from '../../../../tools/dev-environments/src/adapters/dev-s3-tenant.mjs';

export function deriveDevWorkloadBindings(slotId, gamePort) {
  const sql = deriveDevSqlTenant(slotId);
  const s3 = deriveDevS3Tenant(slotId);
  const namespace = sql.appNamespace;
  const imageFor = (role) => `offscreen-dev-workspace:${sql.slotId}-${role}`;
  const authority = `http://game-authority.${namespace}.svc.cluster.local:3002`;
  const api = `http://game-api.${namespace}.svc.cluster.local:3001`;
  const s3Endpoint = `http://object-store.${DEV_S3_NAMESPACE}.svc.cluster.local:8333`;
  const temporal = `temporal-frontend.offscreen-dev-temporal.svc.cluster.local:7233`;
  return {
    bindings: {
      slotId: sql.slotId,
      namespace,
      gamePort,
      cookiePrefix: deriveSlotCookiePrefix(slotId),
      dbPoolMax: DEV_SQL_POOL_MAX,
      objectStorage: localObjectStorageBinding({
        bucket: s3.bucket,
        endpoint: s3Endpoint,
        secretName: s3.secret,
      }),
      temporalAddress: temporal,
      temporalNamespace: namespace,
      dbSecret: sql.runtimeSecret,
      appSecret: `${sql.slotId}-app`,
      receiptDir: DEV_POD_RUNTIME_RECEIPT_DIR,
      images: {
        web: imageFor('web'),
        api: imageFor('api'),
        authority: imageFor('authority'),
        worker: imageFor('worker'),
      },
      schemaReady: true,
      authorityOrigin: authority,
      apiOrigin: api,
    },
  };
}
