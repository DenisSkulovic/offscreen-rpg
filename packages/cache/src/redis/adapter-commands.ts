import {
  createLazyRedisLifecycleClient,
  type RedisClientFactory,
} from './redis-connection.js';
import type { RedisStoreCommands } from './redis-store.js';

export type CacheAdapterRedisCommands = Readonly<{
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string,
    options?: Readonly<{ EX?: number; PX?: number }>,
  ): Promise<string | null>;
}>;

export function createCommandCapturingClientFactory(): Readonly<{
  factory: RedisClientFactory;
  getCommands: () => CacheAdapterRedisCommands | null;
}> {
  let commands: CacheAdapterRedisCommands | null = null;
  const factory: RedisClientFactory = (settings) =>
    createLazyRedisLifecycleClient(settings, {
      onSdkCreated(client) {
        const active = client;
        commands = {
          get: (key) => active.get(key),
          set: (key, value, options) => active.set(key, value, options),
        };
      },
      onSdkClosed() {
        commands = null;
      },
    });
  return {
    factory,
    getCommands: () => commands,
  };
}

export function createRedisStoreCommands(
  getCommands: () => CacheAdapterRedisCommands | null,
): RedisStoreCommands {
  return {
    get(key, signal) {
      if (signal?.aborted) {
        return Promise.reject(new Error('Aborted'));
      }
      const client = getCommands();
      if (!client) {
        return Promise.reject(new Error('RedisUnavailable'));
      }
      // Return the SDK promise itself. A Promise.race deadline would settle
      // this method while the command is still in flight, and the store would
      // release its outstanding slot before Redis actually finishes.
      return client.get(key);
    },
    set(key, value, pxMs, signal) {
      if (signal?.aborted) {
        return Promise.reject(new Error('Aborted'));
      }
      const client = getCommands();
      if (!client) {
        return Promise.reject(new Error('RedisUnavailable'));
      }
      return client.set(key, value, { PX: pxMs }).then(() => undefined);
    },
  };
}
