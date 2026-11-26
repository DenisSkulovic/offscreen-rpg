import { ensureBaseline } from './ensure.mjs';

/** Legacy entrypoint; all mutation authority belongs to the native worker. */
export function executeAuthorizedReleaseCnpg(deps = {}) {
  return ensureBaseline('release', {
    authorized: true,
    maintenance: deps.maintenance === true,
    operatorManifestPath: deps.operatorManifestPath,
  });
}
