import type {
  DatabaseTelemetry,
  DatabaseTelemetryCounters,
  DatabaseTelemetryEvent,
  DatabaseTelemetryGauges,
  DatabaseTelemetryOperation,
  DatabaseTelemetryOutcome,
  DatabaseTelemetrySnapshot,
} from './types.js';
import type {
  DatabaseErrorCategory,
  DatabaseWorkload,
} from '../transaction/policy.js';

type AdmissionGaugeReader = () => {
  readonly active: number;
  readonly queued: number;
};

type PoolGaugeReader = () => {
  readonly idle: number;
  readonly waiting: number;
};

function counterKey(
  operation: DatabaseTelemetryOperation,
  outcome: DatabaseTelemetryOutcome,
  workload: DatabaseWorkload,
  category?: DatabaseErrorCategory,
): string {
  return category === undefined
    ? `${operation}|${outcome}|${workload}`
    : `${operation}|${outcome}|${workload}|${category}`;
}

function toBoundedNumber(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return value;
}

const ALLOWLISTED_KEYS: ReadonlySet<keyof DatabaseTelemetryEvent> = new Set([
  'operation',
  'outcome',
  'workload',
  'category',
  'durationMs',
  'queueDurationMs',
  'count',
  'isolation',
  'operationName',
]);

function allowlistedEvent(
  event: DatabaseTelemetryEvent,
): DatabaseTelemetryEvent {
  const bounded: Record<string, unknown> = {};
  for (const key of ALLOWLISTED_KEYS) {
    if (key in event && event[key] !== undefined) {
      bounded[key] = event[key];
    }
  }
  return Object.freeze(bounded) as DatabaseTelemetryEvent;
}

export type DatabaseTelemetryHandle = Readonly<{
  emit: (event: DatabaseTelemetryEvent) => void;
  snapshot: () => DatabaseTelemetrySnapshot;
  registerAdmissionGauges: (reader: AdmissionGaugeReader) => void;
  setPoolGauges: (reader: PoolGaugeReader) => void;
}>;

export function createDatabaseTelemetry(
  observer?: DatabaseTelemetry,
): DatabaseTelemetryHandle {
  const startedAt = performance.now();
  const counters = new Map<string, number>();
  const admissionGaugeReaders = new Set<AdmissionGaugeReader>();
  let poolGaugeReader: PoolGaugeReader | undefined;
  let latestGauges: DatabaseTelemetryGauges = {
    admissionActive: 0,
    admissionQueued: 0,
    poolIdle: 0,
    poolWaiting: 0,
  };

  const refreshGauges = (): void => {
    let admissionActive = 0;
    let admissionQueued = 0;
    for (const reader of admissionGaugeReaders) {
      const snapshot = reader();
      admissionActive += snapshot.active;
      admissionQueued += snapshot.queued;
    }
    let poolIdle = 0;
    let poolWaiting = 0;
    if (poolGaugeReader) {
      const pool = poolGaugeReader();
      poolIdle = pool.idle;
      poolWaiting = pool.waiting;
    }
    latestGauges = {
      admissionActive: toBoundedNumber(admissionActive),
      admissionQueued: toBoundedNumber(admissionQueued),
      poolIdle: toBoundedNumber(poolIdle),
      poolWaiting: toBoundedNumber(poolWaiting),
    };
  };

  const bumpCounter = (event: DatabaseTelemetryEvent): void => {
    const increment = event.count ?? 1;
    if (!Number.isFinite(increment) || increment < 0) {
      return;
    }
    const key = counterKey(
      event.operation,
      event.outcome,
      event.workload,
      event.category,
    );
    counters.set(key, (counters.get(key) ?? 0) + increment);
  };

  const emit = (event: DatabaseTelemetryEvent): void => {
    bumpCounter(event);
    const bounded = allowlistedEvent(event);
    if (observer) {
      try {
        observer(bounded);
      } catch {
        // Observer failures must not affect database runtime.
      }
    }
  };

  const registerAdmissionGauges = (reader: AdmissionGaugeReader): void => {
    admissionGaugeReaders.add(reader);
    refreshGauges();
  };

  const setPoolGauges = (reader: PoolGaugeReader): void => {
    poolGaugeReader = reader;
    refreshGauges();
  };

  const snapshot = (): DatabaseTelemetrySnapshot => {
    refreshGauges();
    const counterCopy: Record<string, number> = {};
    for (const [key, value] of counters) {
      counterCopy[key] = value;
    }
    return Object.freeze({
      elapsedMs: toBoundedNumber(performance.now() - startedAt),
      counters: Object.freeze(counterCopy) as DatabaseTelemetryCounters,
      gauges: Object.freeze({ ...latestGauges }),
    });
  };

  return { emit, snapshot, registerAdmissionGauges, setPoolGauges };
}

export type AdmissionInstrumentation = Readonly<{
  emit: (event: DatabaseTelemetryEvent) => void;
  registerAdmissionGauges: (reader: AdmissionGaugeReader) => void;
}>;
