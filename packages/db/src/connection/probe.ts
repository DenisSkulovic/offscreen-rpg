import type { PoolClient } from 'pg';
import { DatabaseAdmissionError } from './admission.js';
import type { ManagedClientRuntime } from './managed-client.js';
import type { DatabaseTelemetryHandle } from '../telemetry/runtime.js';

export interface CheckDatabaseConnectionOptions {
  withClient: ManagedClientRuntime<PoolClient>['withClient'];
  probeTimeoutMs: number;
  telemetry: DatabaseTelemetryHandle;
}

export async function checkDatabaseConnection(
  options: CheckDatabaseConnectionOptions,
): Promise<void> {
  const { withClient, probeTimeoutMs, telemetry } = options;

  let discardLease: (() => void) | undefined;
  let acquired = false;
  const probeStartedAt = performance.now();

  // Acquire slot and run SELECT 1 on the leased client.
  const work = withClient(
    {
      timeoutMs: probeTimeoutMs,
      operationName: 'database.probe',
      workload: 'interactive',
    },
    async (client, _remainingMs, discard) => {
      acquired = true;
      discardLease = discard;
      await client.query('SELECT 1');
    },
  );

  // Outward deadline: reject callers on timeout; discard lease after acquire.
  let probeTimer: ReturnType<typeof setTimeout> | undefined;
  let settled = false;

  try {
    await new Promise<void>((resolve, reject) => {
      probeTimer = setTimeout(() => {
        if (settled) {
          return;
        }
        settled = true;
        if (acquired && discardLease) {
          discardLease();
        }
        reject(new DatabaseAdmissionError('timeout'));
        void work.catch(() => {
          // Bounded probe response; permit held until query settles.
        });
      }, probeTimeoutMs);

      void work.then(
        () => {
          if (probeTimer !== undefined) {
            clearTimeout(probeTimer);
          }
          if (settled) {
            return;
          }
          settled = true;
          resolve();
        },
        (error) => {
          if (probeTimer !== undefined) {
            clearTimeout(probeTimer);
          }
          if (settled) {
            return;
          }
          settled = true;
          reject(error);
        },
      );
    });

    // Telemetry: wall-clock duration for successful probe.
    telemetry.emit({
      operation: 'connection',
      outcome: 'ok',
      workload: 'interactive',
      operationName: 'database.probe',
      durationMs: Math.max(0, Math.floor(performance.now() - probeStartedAt)),
    });
  } catch (error) {
    const category =
      error instanceof DatabaseAdmissionError ? error.category : 'unavailable';
    telemetry.emit({
      operation: 'connection',
      outcome: 'error',
      workload: 'interactive',
      operationName: 'database.probe',
      category,
      durationMs: Math.max(0, Math.floor(performance.now() - probeStartedAt)),
    });
    throw error;
  }
}
