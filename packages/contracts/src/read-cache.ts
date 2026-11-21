export type ReadCacheWrite = Readonly<{
  ttlSeconds: number;
  maxBytes: number;
}>;

/**
 * Optional acceleration for already-authorized public projections. Implementors
 * may miss or throw; neither outcome grants authority or changes a command.
 */
export interface ReadCache {
  get(key: string): Promise<unknown | null>;
  set(key: string, value: unknown, options: ReadCacheWrite): Promise<void>;
}

export const disabledReadCache: ReadCache = {
  async get() {
    return null;
  },
  async set() {},
};
