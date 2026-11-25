import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { PoolClient, QueryResult } from 'pg';
import {
  type AdmissionClock,
  type ReleasableClient,
  DatabaseAdmissionError,
} from '../src/connection/admission';
import { createManagedClientRuntime } from '../src/connection/managed-client';
import { DatabaseTransactionError } from '../src/transaction/errors';
import { executeManagedTransaction } from '../src/transaction/execute';
import type { TransactionPolicy } from '../src/transaction/policy';
import {
  createDatabaseTelemetry,
  type AdmissionInstrumentation,
  type DatabaseTelemetryHandle,
} from '../src/telemetry/runtime';
import type { DatabaseTelemetryEvent } from '../src/telemetry/types';

class FakeClock implements AdmissionClock {
  nowValue = 0;
  timers: Array<{ at: number; fn: () => void; handle: symbol }> = [];

  now = () => this.nowValue;

  setTimeout = (fn: () => void, delayMs: number) => {
    const handle = Symbol('timer');
    this.timers.push({ at: this.nowValue + delayMs, fn, handle });
    return handle;
  };

  clearTimeout = (handle: unknown) => {
    this.timers = this.timers.filter((timer) => timer.handle !== handle);
  };

  tick(ms: number) {
    this.nowValue += ms;
    const due = this.timers
      .filter((timer) => timer.at <= this.nowValue)
      .sort((a, b) => a.at - b.at);
    this.timers = this.timers.filter((timer) => timer.at > this.nowValue);
    for (const timer of due) {
      timer.fn();
    }
  }
}

type FakeClient = ReleasableClient &
  PoolClient & {
    releases: number;
    discardCalls: number;
    query(text: string, values?: unknown[]): Promise<QueryResult>;
  };

function okResult(command: string): QueryResult {
  return { command, rowCount: 0, rows: [], oid: 0, fields: [] };
}

function createFakeClient(
  handlers: Record<string, () => Promise<QueryResult> | QueryResult> = {},
): FakeClient {
  return {
    releases: 0,
    discardCalls: 0,
    release(err?: Error | boolean) {
      this.releases += 1;
      if (err === true) {
        this.discardCalls += 1;
      }
      if (err instanceof Error) {
        throw err;
      }
    },
    async query(text: string) {
      const handler = handlers[text];
      if (handler) {
        return await handler();
      }
      if (text.startsWith('BEGIN')) {
        return okResult('BEGIN');
      }
      if (text.startsWith('SELECT set_config')) {
        return okResult('SELECT');
      }
      if (text === 'COMMIT') {
        return okResult('COMMIT');
      }
      if (text === 'ROLLBACK') {
        return okResult('ROLLBACK');
      }
      return okResult('SELECT');
    },
  } as FakeClient;
}

function basePolicy(
  overrides: Partial<TransactionPolicy> = {},
): TransactionPolicy {
  return {
    name: 'worker.batch',
    workload: 'worker',
    isolation: 'read committed',
    readOnly: false,
    retry: 'none',
    timeoutMs: 5_000,
    statementTimeoutMs: 4_000,
    lockTimeoutMs: 1_000,
    ...overrides,
  };
}

function instrumentationFor(
  telemetry: DatabaseTelemetryHandle,
): AdmissionInstrumentation {
  return {
    emit: (event) => telemetry.emit(event),
    registerAdmissionGauges: (reader) =>
      telemetry.registerAdmissionGauges(reader),
  };
}

function attachInstrumentation(
  observer?: (event: DatabaseTelemetryEvent) => void,
) {
  const telemetry = createDatabaseTelemetry(observer);
  return {
    telemetry,
    instrumentation: instrumentationFor(telemetry),
  };
}

function instrumentedRuntime(
  connect: () => Promise<FakeClient>,
  clock: FakeClock,
  observer?: (event: DatabaseTelemetryEvent) => void,
) {
  const { telemetry, instrumentation } = attachInstrumentation(observer);
  const runtime = createManagedClientRuntime<FakeClient>({
    maxActive: 1,
    maxQueued: 1,
    acquireTimeoutMs: 2_000,
    clock,
    connect,
    end: async () => {},
    instrumentation,
  });
  return { runtime, telemetry };
}

const ALLOWED_EVENT_KEYS = new Set([
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

test('observer exceptions are isolated and do not break acquire', async () => {
  let calls = 0;
  const { telemetry, instrumentation } = attachInstrumentation(() => {
    calls += 1;
    throw new Error('observer boom');
  });
  const client = createFakeClient();
  const runtime = createManagedClientRuntime<FakeClient>({
    maxActive: 1,
    maxQueued: 0,
    acquireTimeoutMs: 1_000,
    connect: async () => client,
    end: async () => {},
    instrumentation,
  });

  await runtime.withClient({ timeoutMs: 100 }, async () => 'ok');
  assert.equal(calls, 1);
  assert.equal(telemetry.snapshot().counters['acquire|ok|interactive'], 1);
});

test('saturation increments bounded acquire error counter', async () => {
  const clock = new FakeClock();
  const client = createFakeClient();
  let releaseHold: (() => void) | undefined;

  const { telemetry, instrumentation } = attachInstrumentation();
  const runtime = createManagedClientRuntime<FakeClient>({
    maxActive: 1,
    maxQueued: 1,
    acquireTimeoutMs: 5_000,
    clock,
    connect: async () => client,
    end: async () => {},
    instrumentation,
  });

  const hold = runtime.withClient({ timeoutMs: 5_000 }, async () => {
    await new Promise<void>((resolve) => {
      releaseHold = resolve;
    });
  });
  await new Promise((resolve) => setImmediate(resolve));
  void runtime.withClient({ timeoutMs: 5_000 }, async () => 'queued');

  await assert.rejects(
    runtime.withClient({ timeoutMs: 5_000 }, async () => 'rejected'),
    (error: unknown) => {
      assert.ok(error instanceof DatabaseAdmissionError);
      assert.equal(error.category, 'saturated');
      return true;
    },
  );

  releaseHold?.();
  await hold.catch(() => {});

  assert.equal(
    telemetry.snapshot().counters['acquire|error|interactive|saturated'],
    1,
  );
  const gauges = telemetry.snapshot().gauges;
  assert.ok(gauges.admissionActive >= 0);
  assert.ok(gauges.admissionQueued >= 0);
});

test('managed transaction maps semantic policy name to database.transaction', async () => {
  const events: DatabaseTelemetryEvent[] = [];
  const { telemetry, instrumentation } = attachInstrumentation((event) =>
    events.push(event),
  );
  const client = createFakeClient();
  const runtime = createManagedClientRuntime<FakeClient>({
    maxActive: 1,
    maxQueued: 0,
    acquireTimeoutMs: 1_000,
    connect: async () => client,
    end: async () => {},
    instrumentation,
  });

  await executeManagedTransaction(
    {
      withClient: runtime.withClient,
      onBackgroundError: () => {},
      telemetry,
    },
    basePolicy(),
    async () => 'ok',
  );

  const transactionEvent = events.find(
    (event) => event.operation === 'transaction',
  );
  assert.ok(transactionEvent);
  assert.equal(transactionEvent.operationName, 'database.transaction');
  assert.equal(transactionEvent.isolation, 'read committed');
  assert.equal(telemetry.snapshot().counters['transaction|ok|worker'], 1);
});

test('rollback and retry counters settle once per attempt', async () => {
  const conflict = Object.assign(new Error('serialization failure'), {
    code: '40001',
  });
  let attempts = 0;
  const client = createFakeClient();
  const { runtime, telemetry } = instrumentedRuntime(
    async () => client,
    new FakeClock(),
  );

  await executeManagedTransaction(
    {
      withClient: runtime.withClient,
      onBackgroundError: () => {},
      telemetry,
    },
    basePolicy({ retry: 'sql-only-conflicts' }),
    async () => {
      attempts += 1;
      if (attempts < 2) {
        throw conflict;
      }
      return 'retried';
    },
    () => 25,
  );

  assert.equal(telemetry.snapshot().counters['rollback|ok|worker'], 1);
  assert.equal(telemetry.snapshot().counters['retry|ok|worker'], 1);
  assert.equal(telemetry.snapshot().counters['transaction|ok|worker'], 1);
});

test('commit-unknown is classified on final transaction error', async () => {
  const client = createFakeClient({
    COMMIT: () => {
      throw new Error('transport lost');
    },
  });
  const { runtime, telemetry } = instrumentedRuntime(
    async () => client,
    new FakeClock(),
  );

  await assert.rejects(
    executeManagedTransaction(
      {
        withClient: runtime.withClient,
        onBackgroundError: () => {},
        telemetry,
      },
      basePolicy(),
      async () => 'done',
    ),
    (error: unknown) => {
      assert.ok(error instanceof DatabaseTransactionError);
      assert.equal(error.category, 'commit-unknown');
      return true;
    },
  );

  assert.equal(
    telemetry.snapshot().counters['transaction|error|worker|commit-unknown'],
    1,
  );
});

test('observer receives allowlisted fields only even when callback throws secret-bearing error', async () => {
  const observed: DatabaseTelemetryEvent[] = [];
  const { telemetry, instrumentation } = attachInstrumentation((event) => {
    observed.push(event);
    for (const key of Object.keys(event as object)) {
      assert.ok(ALLOWED_EVENT_KEYS.has(key));
    }
  });
  const client = createFakeClient();
  const runtime = createManagedClientRuntime<FakeClient>({
    maxActive: 1,
    maxQueued: 0,
    acquireTimeoutMs: 1_000,
    connect: async () => client,
    end: async () => {},
    instrumentation,
  });

  const secret = Object.assign(new Error('failed with dsn=postgres://secret'), {
    code: '40001',
  });

  await assert.rejects(
    executeManagedTransaction(
      {
        withClient: runtime.withClient,
        onBackgroundError: () => {},
        telemetry,
      },
      basePolicy(),
      async () => {
        throw secret;
      },
    ),
    () => true,
  );

  for (const event of observed) {
    assert.equal('query' in (event as object), false);
    const serialized = JSON.stringify(event);
    assert.equal(serialized.includes('postgres://secret'), false);
    assert.equal(serialized.includes('dsn'), false);
  }
});

test('release failure after successful callback records committed connection error', async () => {
  const client = createFakeClient();
  const baseRelease = client.release.bind(client);
  let releaseAttempts = 0;
  client.release = (err?: Error | boolean) => {
    releaseAttempts += 1;
    if (releaseAttempts === 1 && err === undefined) {
      throw new Error('release refused');
    }
    return baseRelease(err);
  };

  const { runtime, telemetry } = instrumentedRuntime(
    async () => client,
    new FakeClock(),
  );

  await runtime.withClient({ timeoutMs: 100 }, async () => 'ok');

  assert.equal(
    telemetry.snapshot().counters['connection|error|interactive|application'],
    1,
  );
});

test('interleaved runtimes isolate gauges, counters, and observers', async () => {
  const eventsA: DatabaseTelemetryEvent[] = [];
  const eventsB: DatabaseTelemetryEvent[] = [];
  const { telemetry: telemetryA, instrumentation: instrumentationA } =
    attachInstrumentation((event) => eventsA.push(event));
  const { telemetry: telemetryB, instrumentation: instrumentationB } =
    attachInstrumentation((event) => eventsB.push(event));

  const clientA = createFakeClient();
  const clientB = createFakeClient();

  const runtimeA = createManagedClientRuntime<FakeClient>({
    maxActive: 1,
    maxQueued: 1,
    acquireTimeoutMs: 5_000,
    connect: async () => clientA,
    end: async () => {},
    instrumentation: instrumentationA,
  });
  const runtimeB = createManagedClientRuntime<FakeClient>({
    maxActive: 1,
    maxQueued: 1,
    acquireTimeoutMs: 5_000,
    connect: async () => clientB,
    end: async () => {},
    instrumentation: instrumentationB,
  });

  let releaseA: (() => void) | undefined;
  let releaseB: (() => void) | undefined;

  const holdA = runtimeA.withClient({ timeoutMs: 5_000 }, async () => {
    await new Promise<void>((resolve) => {
      releaseA = resolve;
    });
  });
  await new Promise((resolve) => setImmediate(resolve));
  void runtimeA.withClient({ timeoutMs: 5_000 }, async () => 'queued-a');

  const holdB = runtimeB.withClient({ timeoutMs: 5_000 }, async () => {
    await new Promise<void>((resolve) => {
      releaseB = resolve;
    });
  });
  await new Promise((resolve) => setImmediate(resolve));
  void runtimeB.withClient({ timeoutMs: 5_000 }, async () => 'queued-b');

  const snapA = telemetryA.snapshot();
  const snapB = telemetryB.snapshot();

  assert.equal(snapA.gauges.admissionActive, 1);
  assert.equal(snapA.gauges.admissionQueued, 1);
  assert.equal(snapB.gauges.admissionActive, 1);
  assert.equal(snapB.gauges.admissionQueued, 1);
  assert.equal(snapA.counters['acquire|ok|interactive'], 1);
  assert.equal(snapB.counters['acquire|ok|interactive'], 1);
  assert.equal(snapA.counters['acquire|error|interactive|saturated'] ?? 0, 0);
  assert.equal(snapB.counters['acquire|error|interactive|saturated'] ?? 0, 0);

  assert.equal(eventsA.length, 1);
  assert.equal(eventsB.length, 1);
  assert.equal(eventsA[0]?.operation, 'acquire');
  assert.equal(eventsB[0]?.operation, 'acquire');

  await assert.rejects(
    runtimeA.withClient({ timeoutMs: 5_000 }, async () => 'saturate-a'),
    (error: unknown) => {
      assert.ok(error instanceof DatabaseAdmissionError);
      assert.equal(error.category, 'saturated');
      return true;
    },
  );

  assert.equal(
    telemetryA.snapshot().counters['acquire|error|interactive|saturated'],
    1,
  );
  assert.equal(
    telemetryB.snapshot().counters['acquire|error|interactive|saturated'] ?? 0,
    0,
  );
  assert.equal(eventsA.length, 2);
  assert.equal(eventsB.length, 1);

  releaseA?.();
  releaseB?.();
  await holdA.catch(() => {});
  await holdB.catch(() => {});
});

test('telemetry snapshot exposes nonnegative gauges and monotonic elapsed time', async () => {
  const clock = new FakeClock();
  const client = createFakeClient();
  const { telemetry } = instrumentedRuntime(async () => client, clock);

  const first = telemetry.snapshot();
  clock.tick(10);
  const second = telemetry.snapshot();

  assert.ok(second.elapsedMs >= first.elapsedMs);
  assert.ok(second.gauges.admissionActive >= 0);
  assert.ok(second.gauges.admissionQueued >= 0);
  assert.ok(second.gauges.poolIdle >= 0);
  assert.ok(second.gauges.poolWaiting >= 0);
});
