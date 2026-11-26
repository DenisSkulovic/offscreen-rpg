import { ensureBaseline } from './ensure.mjs';

/** Legacy entrypoint; all mutation authority belongs to the native worker. */
export function executeAuthorizedDevCnpg(deps = {}) {
  return ensureBaseline('dev', {
    authorized: true,
    maintenance: deps.maintenance === true,
    operatorManifestPath: deps.operatorManifestPath,
  });
}
