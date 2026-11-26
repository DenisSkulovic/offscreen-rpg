const RETIRED = 'retired object-store signing proof: does not sign or restart';

/**
 * @param {unknown} _request
 */
export function signS3Request(_request) {
  throw new Error(RETIRED);
}

/**
 * @param {unknown} _deps
 */
export async function proveDevObjectStoreS3(_deps) {
  throw new Error(RETIRED);
}
