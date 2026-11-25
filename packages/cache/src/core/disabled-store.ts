import type { CacheStore } from './cache-store.js';

/**
 * {@link CacheStore} that always bypasses get and set with reason `disabled` (no backing storage).
 */
export function createDisabledStore(): CacheStore {
  return {
    async get() {
      return { kind: 'bypass', reason: 'disabled' };
    },
    async set() {
      return { kind: 'bypass', reason: 'disabled' };
    },
  };
}
