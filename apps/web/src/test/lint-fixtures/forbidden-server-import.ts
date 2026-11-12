/**
 * Deliberate negative fixture for W13. Ignored by default lint; checked by
 * `pnpm lint:web:negatives` which expects this import to fail.
 */
import { requireViewer } from '@/src/server/viewer';

export async function leakCookieReader() {
  return requireViewer();
}
