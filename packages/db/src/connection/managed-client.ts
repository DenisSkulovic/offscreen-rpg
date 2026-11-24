import {
  createAdmissionController,
  type AdmissionClock,
  type ReleasableClient,
} from './admission';

export interface ManagedClientOptions<C extends ReleasableClient> {
  maxActive: number;
  maxQueued: number;
  acquireTimeoutMs: number;
  connect: () => Promise<C>;
  end: () => Promise<void>;
  clock?: AdmissionClock;
}

export interface ManagedClientRuntime<C extends ReleasableClient> {
  withClient<T>(
    options: { timeoutMs: number; signal?: AbortSignal },
    run: (
      client: C,
      remainingMs: () => number,
      discard: () => void,
    ) => Promise<T>,
  ): Promise<T>;
  close(): Promise<void>;
}

export function safeBackgroundErrorSink(
  handler: (error: Error) => void,
): (error: Error) => void {
  return (error: Error) => {
    try {
      handler(error);
    } catch {
      // Idle socket handlers must not throw back into pg.
    }
  };
}

export function createManagedClientRuntime<C extends ReleasableClient>(
  options: ManagedClientOptions<C>,
): ManagedClientRuntime<C> {
  const admission = createAdmissionController<C>({
    maxActive: options.maxActive,
    maxQueued: options.maxQueued,
    acquireTimeoutMs: options.acquireTimeoutMs,
    connect: options.connect,
    ...(options.clock ? { clock: options.clock } : {}),
  });

  let outstanding = 0;
  const idleWaiters: Array<() => void> = [];

  const notifyIfIdle = () => {
    if (outstanding === 0) {
      while (idleWaiters.length > 0) {
        idleWaiters.shift()!();
      }
    }
  };

  const waitForOutstanding = (): Promise<void> => {
    if (outstanding === 0) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      idleWaiters.push(resolve);
    });
  };

  let closePromise: Promise<void> | undefined;
  let ended = false;

  const withClient = async <T>(
    acquireOptions: { timeoutMs: number; signal?: AbortSignal },
    run: (
      client: C,
      remainingMs: () => number,
      discard: () => void,
    ) => Promise<T>,
  ): Promise<T> => {
    outstanding += 1;
    try {
      return await admission.acquire(acquireOptions, run);
    } finally {
      outstanding -= 1;
      notifyIfIdle();
    }
  };

  const close = (): Promise<void> => {
    if (closePromise) {
      return closePromise;
    }
    admission.close();
    closePromise = waitForOutstanding().then(async () => {
      if (!ended) {
        ended = true;
        await options.end();
      }
    });
    return closePromise;
  };

  return { withClient, close };
}