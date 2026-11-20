/**
 * Stable in-cluster Nest Service origin for TURN02 lab-edge app release.
 * Baked into the Next production build as API_PROXY_ORIGIN; set API_INTERNAL_ORIGIN
 * to the same value at Pod runtime for SSR.
 */
export const LAB_NEST_SERVICE_ORIGIN =
  'http://game-api.lab-edge.svc.cluster.local:3001';

/** Local Compose / dev default; must not appear in release image rewrite manifest. */
export const LOOPBACK_NEST_ORIGIN = 'http://127.0.0.1:3001';