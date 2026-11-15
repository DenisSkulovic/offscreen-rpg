/**
 * OBS00-L provider-free proof. Every case uses a disposable
 * offscreen_chamber_run_<uuid> database, a counting fake provider, and a
 * throwing global fetch. No credential is read and no external HTTP is possible.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import type { Database } from '@offscreen/db';
import {
  createStorytellerBudget,
  createStorytellerRuntime,
  readStorytellerWorkerOptions,
  resolveEffectiveUsagePolicy,
  resourcesForEffectiveUsagePolicy,
} from '@offscreen/application/storyteller';
import {
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '@offscreen/application/developer-tools';
import { createRequestAuditFixtureCases } from '@offscreen/storyteller/providers/request-audit-fixtures';
import {
  storytellerTaskSchema,
  type ExecutionPolicy,
  type StorytellerTask,
} from '@offscreen/storyteller/tasks';
import {
  prepareOpenRouterWire,
  type ProviderOutcome,
  type StorytellerProvider,
} from '@offscreen/storyteller/providers/openrouter';
import {
  bootstrapLocalStoryFunding,
  describeStoryFundingDenial,
  pinnedLocalStoryDispatchAuthority,
  type StoryFundingBootstrapInput,
} from '../src/story-funding.js';

type ProviderExecution = Extract<ExecutionPolicy, { mode: 'provider' }>;

const accountId = '00000000-0000-4000-8000-000000000010';
const defaultRunId = '00000000-0000-4000-8000-000000000011';
const trialRunId = '00000000-0000-4000-8000-000000000012';
const route = 'fake:obs00-l';

const realFetch = globalThis.fetch;
let externalFetchCalls = 0;
test.before(() => {
  globalThis.fetch = (async () => {
    externalFetchCalls += 1;
    throw new Error('OBS00-L tests forbid external HTTP');
  }) as typeof fetch;
});
test.after(() => {
  globalThis.fetch = realFetch;
  assert.equal(externalFetchCalls, 0, 'zero external HTTP calls');
});

async function withDisposable(run: (database: Database) => Promise<void>) {
  const runId = randomUUID();
  const provisioned = await provisionDisposableSandboxDatabase({
    runId,
    confirmDisposableProvision: true,
    applyFullMigrations: true,
  });
  const database = createDatabase(
    readDatabaseConfig({ DATABASE_URL: provisioned.connectionString }),
    () => {},
  );
  try {
    await run(database);
  } finally {
    await database.close().catch(() => undefined);
    await destroyDisposableSandboxDatabase({
      runId,
      confirmDisposableProvision: true,
    });
  }
}

const trialInput = (
  overrides: Partial<StoryFundingBootstrapInput> = {},
): StoryFundingBootstrapInput => ({
  accountId,
  defaultRunId,
  accountLimitMicrousd: 1_000_000n,
  defaultRunLimitMicrousd: 1_000_000n,
  defaultRunMaxAttempts: 250,
  trial: { runId: trialRunId, maxMicrousd: 250_000n, maxAttempts: 4 },
  verifiedAt: new Date().toISOString(),
  ...overrides,
});

function executionFor(
  runId: string,
  prices: { input: string; output: string } = { input: '1000', output: '1000' },
): ProviderExecution {
  return {
    mode: 'provider',
    accountId,
    runId,
    dispatchReview: { mode: 'observe' },
    policy: {
      version: 'obs00-l.v1',
      route,
      model: 'fake/model',
      provider: 'fake',
      priceVersion: 'obs00-l-test',
      inputMicrousdPerMillion: prices.input,
      outputMicrousdPerMillion: prices.output,
      maxInputTokens: 100_000,
      maxOutputTokens: 2_000,
      timeoutMs: 1_000,
    },
  };
}

/** Same construction as the local Story launcher, with a synthetic route. */
function localPolicy(maxMicrousdPerOperation = '250000') {
  const profile = {
    schemaVersion: 1 as const,
    id: 'local-story-live.v1',
    revision: 1,
    enabled: true,
    allowedRoutes: [route],
    defaultRoute: route,
    fundingModes: ['prepaid' as const],
    recovery: 'explicit-resume' as const,
    limits: {
      maxInputTokensPerRequest: 100_000,
      maxSerializedBytesPerRequest: 400_000,
      maxGeneratedTokensPerRequest: 2_000,
      maxReasoningTokensPerRequest: 0,
      maxInputTokensPerOperation: 200_000,
      maxGeneratedTokensPerOperation: 4_000,
      maxModelRoundsPerOperation: 2,
      maxReadsPerOperation: 0,
      maxRetainedReadBytes: 0,
      maxMicrousdPerOperation: maxMicrousdPerOperation,
      maxInFlightDispatches: 1,
      maxBackgroundJobsPerWindow: 0,
    },
    windows: [],
  };
  const resolved = resolveEffectiveUsagePolicy({
    platform: profile,
    entitlement: profile,
    restrictions: [],
    requestedRoute: route,
    requestedFundingMode: 'prepaid',
  });
  if (resolved.kind !== 'allowed') throw new Error('policy denied');
  return resolved.policy;
}

function taskFor(
  execution: ProviderExecution,
  policy = localPolicy(),
): StorytellerTask {
  const [fixture] = createRequestAuditFixtureCases({
    caseIds: ['opening-narrative'],
  });
  assert.ok(fixture);
  return storytellerTaskSchema.parse({
    ...fixture.task,
    execution,
    resources: resourcesForEffectiveUsagePolicy(execution, policy),
  });
}

async function seedUser(database: Database) {
  const ownerId = `obs00-l-${randomUUID()}`;
  await database.db.$client.query(
    `insert into "user" (id, name, email, email_verified, created_at, updated_at)
     values ($1, 'OBS00-L', $2, true, now(), now())`,
    [ownerId, `${ownerId}@example.test`],
  );
  return ownerId;
}

async function seedGeneration(
  database: Database,
  ownerId: string,
  task: StorytellerTask,
) {
  const id = randomUUID();
  await database.db.$client.query(
    `insert into generation (id, owner_id, kind, input)
     values ($1, $2, 'storyteller.profiled.v1', $3::jsonb)`,
    [id, ownerId, JSON.stringify(task)],
  );
  return id;
}

async function ledger(database: Database, runId: string) {
  const funding = await database.db.$client.query(
    `select stopped, limit_microusd::text, settled_microusd::text, reserved_microusd::text
     from storyteller_funding where id = $1`,
    [accountId],
  );
  const run = await database.db.$client.query(
    `select enabled, limit_microusd::text, settled_microusd::text, reserved_microusd::text,
            max_attempts, admitted_attempts
     from storyteller_run where id = $1`,
    [runId],
  );
  const attempts = await database.db.$client.query(
    `select count(*)::int as total,
            count(*) filter (where state = 'uncertain')::int as uncertain,
            count(*) filter (where state = 'unsent')::int as unsent,
            count(*) filter (where state = 'settled')::int as settled
     from storyteller_attempt where run_id = $1`,
    [runId],
  );
  return {
    funding: funding.rows[0],
    run: run.rows[0],
    attempts: attempts.rows[0],
  };
}

async function failureCode(database: Database, generationId: string) {
  const result = await database.db.$client.query(
    'select state, failure_code from generation where id = $1',
    [generationId],
  );
  return result.rows[0] as { state: string; failure_code: string | null };
}

const telemetry = (providerId: string) => ({
  durationMs: 5,
  httpStatus: 200,
  providerId,
  reportedModel: 'fake/model',
  finishReason: 'stop',
});

function fakeProvider(
  charge: bigint,
  outcome: 'ok' | 'uncertain' = 'ok',
): { provider: StorytellerProvider; calls: () => number } {
  let calls = 0;
  return {
    calls: () => calls,
    // OBS00-C: a plain fake never reaches HTTP; it nominally attests the wire so
    // the dispatch-ledger behaviour under test is unchanged.
    provider: Object.assign(
      async (): Promise<ProviderOutcome> => {
        calls += 1;
        if (outcome === 'uncertain') {
          return { kind: 'uncertain', telemetry: telemetry(`fake-${calls}`) };
        }
        return {
          kind: 'result',
          // Deliberately schema-invalid: the attempt is still a billed provider attempt.
          output: { invalid: true },
          usage: {
            reportedCostMicrousd: charge,
            promptTokens: 20,
            completionTokens: 10,
            totalTokens: 30,
            reasoningTokens: 0,
            cachedTokens: 0,
            cacheWriteTokens: 0,
          },
          telemetry: telemetry(`fake-${calls}`),
        };
      },
      { prepareWire: prepareOpenRouterWire },
    ),
  };
}

async function runOne(
  database: Database,
  options: Parameters<typeof createStorytellerRuntime>[1],
  ownerId: string,
  task: StorytellerTask,
) {
  const generationId = await seedGeneration(database, ownerId, task);
  await createStorytellerRuntime(database, options).complete(generationId);
  return generationId;
}

test('trial Run is DB-bounded: four attempts accepted, fifth denied by attempt count with no transport', async () => {
  await withDisposable(async (database) => {
    const boot = await bootstrapLocalStoryFunding(
      database.db.$client,
      trialInput(),
    );
    assert.equal(boot.state, 'ready');
    assert.equal(boot.runId, trialRunId);
    const before = await ledger(database, trialRunId);
    assert.equal(before.run.max_attempts, 4);
    assert.equal(before.run.limit_microusd, '250000');
    assert.equal(before.run.enabled, true);

    const ownerId = await seedUser(database);
    const execution = executionFor(trialRunId);
    const task = taskFor(execution);
    const fake = fakeProvider(80n);
    const options = {
      provider: fake.provider,
      dispatchAuthority: pinnedLocalStoryDispatchAuthority(localPolicy()),
    };
    for (let index = 0; index < 4; index += 1) {
      const id = await runOne(database, options, ownerId, task);
      assert.equal((await failureCode(database, id)).state, 'failed');
      assert.equal(
        (await failureCode(database, id)).failure_code,
        'invalid_output',
        `attempt ${index + 1} reached the mock transport`,
      );
    }
    assert.equal(fake.calls(), 4);
    const full = await ledger(database, trialRunId);
    assert.equal(full.run.admitted_attempts, 4);
    assert.equal(full.run.settled_microusd, '320');
    assert.equal(full.run.reserved_microusd, '0');

    const fifthId = await runOne(database, options, ownerId, task);
    assert.deepEqual(await failureCode(database, fifthId), {
      state: 'failed',
      failure_code: 'budget_unavailable',
    });
    assert.equal(fake.calls(), 4, 'fifth attempt never reached the transport');
    const after = await ledger(database, trialRunId);
    assert.equal(after.attempts.total, 4);
    assert.equal(after.run.admitted_attempts, 4);
    assert.equal(after.run.settled_microusd, '320');
    assert.equal(after.funding.stopped, false);

    // Restart with the same saved trial id: caps and counters are not re-minted.
    const restart = await bootstrapLocalStoryFunding(
      database.db.$client,
      trialInput(),
    );
    assert.equal(restart.state, 'denied');
    assert.deepEqual(restart.state === 'denied' && restart.reasons, [
      'attempts-exhausted',
    ]);
    const restarted = await ledger(database, trialRunId);
    assert.deepEqual(restarted, after);
    const sixthId = await runOne(database, options, ownerId, task);
    assert.equal(
      (await failureCode(database, sixthId)).failure_code,
      'budget_unavailable',
    );
    assert.equal(fake.calls(), 4);
  });
});

test('a reservation that would exceed the remaining total cap is denied before transport and leaves the ledger unchanged', async () => {
  await withDisposable(async (database) => {
    await bootstrapLocalStoryFunding(database.db.$client, trialInput());
    const ownerId = await seedUser(database);
    // Expensive route: each worst-case reservation is a large share of 250,000.
    const execution = executionFor(trialRunId, {
      input: '1000000',
      output: '25000000',
    });
    const task = taskFor(execution);
    // Each attempt really settles 100,000 (below its 150,000 reservation).
    const fake = fakeProvider(100_000n);
    const options = {
      provider: fake.provider,
      dispatchAuthority: pinnedLocalStoryDispatchAuthority(localPolicy()),
    };
    const outcomes: string[] = [];
    let admitted = 0;
    for (let index = 0; index < 4; index += 1) {
      const id = await runOne(database, options, ownerId, task);
      const row = await failureCode(database, id);
      outcomes.push(row.failure_code ?? row.state);
      const snapshot = await ledger(database, trialRunId);
      if (row.failure_code === 'budget_unavailable') {
        // Denied: nothing moved relative to the last admitted state.
        assert.equal(snapshot.run.admitted_attempts, admitted);
        break;
      }
      admitted = snapshot.run.admitted_attempts;
    }
    const final = await ledger(database, trialRunId);
    const reserved = await database.db.$client.query(
      'select reserved_microusd::text as amount from storyteller_attempt limit 1',
    );
    console.log(
      `worst-case reservation per attempt: ${reserved.rows[0]?.amount} microusd; outcomes ${outcomes.join(',')}`,
    );
    assert.ok(
      final.run.admitted_attempts < 4,
      `total microusd cap, not attempt count, must stop admission (${outcomes.join(',')})`,
    );
    assert.equal(outcomes.at(-1), 'budget_unavailable');
    assert.equal(final.run.admitted_attempts, 2);
    assert.equal(final.run.settled_microusd, '200000');
    assert.equal(final.run.reserved_microusd, '0');
    assert.equal(fake.calls(), 2);
    assert.ok(
      BigInt(final.run.settled_microusd) +
        BigInt(final.run.reserved_microusd) <=
        250_000n,
    );
    assert.equal(final.funding.stopped, false);
  });
});

test('explicit stronger/more expensive route exceeding the per-operation microusd cap fails before transport, no fallback', async () => {
  await withDisposable(async (database) => {
    await bootstrapLocalStoryFunding(database.db.$client, trialInput());
    const ownerId = await seedUser(database);
    const execution = executionFor(trialRunId, {
      input: '1000000',
      output: '25000000',
    });
    // The pinned local policy caps one operation at 10,000 microusd.
    const policy = localPolicy('10000');
    const task = taskFor(execution, policy);
    const fake = fakeProvider(10n);
    const id = await runOne(
      database,
      {
        provider: fake.provider,
        dispatchAuthority: pinnedLocalStoryDispatchAuthority(policy),
      },
      ownerId,
      task,
    );
    assert.equal(
      (await failureCode(database, id)).failure_code,
      'budget_unavailable',
    );
    assert.equal(fake.calls(), 0);
    const snapshot = await ledger(database, trialRunId);
    assert.equal(snapshot.attempts.total, 0);
    assert.equal(snapshot.run.admitted_attempts, 0);
    assert.equal(snapshot.run.reserved_microusd, '0');
  });
});

test('restart never resurrects a stopped account: still stopped, zero provider calls', async () => {
  await withDisposable(async (database) => {
    await bootstrapLocalStoryFunding(database.db.$client, trialInput());
    await database.db.$client.query(
      'update storyteller_funding set stopped = true where id = $1',
      [accountId],
    );
    const before = await ledger(database, trialRunId);
    assert.equal(before.funding.stopped, true);

    for (const input of [trialInput(), trialInput({ trial: null })]) {
      const restart = await bootstrapLocalStoryFunding(
        database.db.$client,
        input,
      );
      assert.equal(restart.state, 'denied');
      assert.ok(
        restart.state === 'denied' &&
          restart.reasons.includes('account-stopped'),
      );
      assert.match(
        describeStoryFundingDenial(
          restart.state === 'denied' ? restart.reasons : [],
        ),
        /stopped/,
      );
    }
    const after = await ledger(database, trialRunId);
    assert.equal(after.funding.stopped, true);
    assert.deepEqual(after.run, before.run);

    const ownerId = await seedUser(database);
    const execution = executionFor(trialRunId);
    const fake = fakeProvider(10n);
    const id = await runOne(
      database,
      {
        provider: fake.provider,
        dispatchAuthority: pinnedLocalStoryDispatchAuthority(localPolicy()),
      },
      ownerId,
      taskFor(execution),
    );
    assert.equal(
      (await failureCode(database, id)).failure_code,
      'budget_unavailable',
    );
    assert.equal(fake.calls(), 0);
  });
});

test('restart never re-enables a disabled run: no active trial is granted', async () => {
  await withDisposable(async (database) => {
    await bootstrapLocalStoryFunding(database.db.$client, trialInput());
    await database.db.$client.query(
      'update storyteller_run set enabled = false where id = $1',
      [trialRunId],
    );
    const restart = await bootstrapLocalStoryFunding(
      database.db.$client,
      trialInput(),
    );
    assert.equal(restart.state, 'denied');
    assert.ok(
      restart.state === 'denied' && restart.reasons.includes('run-disabled'),
    );
    const after = await ledger(database, trialRunId);
    assert.equal(after.run.enabled, false);
    assert.equal(after.funding.stopped, false);

    const ownerId = await seedUser(database);
    const fake = fakeProvider(10n);
    const id = await runOne(
      database,
      {
        provider: fake.provider,
        dispatchAuthority: pinnedLocalStoryDispatchAuthority(localPolicy()),
      },
      ownerId,
      taskFor(executionFor(trialRunId)),
    );
    assert.equal(
      (await failureCode(database, id)).failure_code,
      'budget_unavailable',
    );
    assert.equal(fake.calls(), 0);

    // The default (non-trial) Run is also never revived by restart.
    await bootstrapLocalStoryFunding(
      database.db.$client,
      trialInput({ trial: null }),
    );
    await database.db.$client.query(
      'update storyteller_run set enabled = false where id = $1',
      [defaultRunId],
    );
    const defaultRestart = await bootstrapLocalStoryFunding(
      database.db.$client,
      trialInput({ trial: null }),
    );
    assert.ok(
      defaultRestart.state === 'denied' &&
        defaultRestart.reasons.includes('run-disabled'),
    );
    assert.equal((await ledger(database, defaultRunId)).run.enabled, false);
  });
});

test('uncertain dispatched attempt keeps its liability across restart and blocks any new send', async () => {
  await withDisposable(async (database) => {
    await bootstrapLocalStoryFunding(database.db.$client, trialInput());
    const ownerId = await seedUser(database);
    const execution = executionFor(trialRunId);
    const task = taskFor(execution);
    const uncertain = fakeProvider(0n, 'uncertain');
    const options = {
      provider: uncertain.provider,
      dispatchAuthority: pinnedLocalStoryDispatchAuthority(localPolicy()),
    };
    const firstId = await runOne(database, options, ownerId, task);
    assert.equal((await failureCode(database, firstId)).state, 'uncertain');
    assert.equal(uncertain.calls(), 1);
    const before = await ledger(database, trialRunId);
    assert.equal(before.attempts.uncertain, 1);
    assert.equal(before.funding.stopped, true);
    assert.notEqual(before.run.reserved_microusd, '0');
    assert.equal(before.run.admitted_attempts, 1);

    const restart = await bootstrapLocalStoryFunding(
      database.db.$client,
      trialInput(),
    );
    assert.equal(restart.state, 'denied');
    assert.ok(
      restart.state === 'denied' &&
        restart.reasons.includes('uncertain-attempt'),
    );
    const after = await ledger(database, trialRunId);
    assert.deepEqual(
      after,
      before,
      'liability and counters preserved byte-for-byte',
    );

    const retry = fakeProvider(10n);
    const secondId = await runOne(
      database,
      { ...options, provider: retry.provider },
      ownerId,
      task,
    );
    assert.equal(
      (await failureCode(database, secondId)).failure_code,
      'usage_uncertain',
    );
    assert.equal(retry.calls(), 0, 'no automatic retry or new send');
    assert.equal((await ledger(database, trialRunId)).attempts.total, 1);
  });
});

test('restart with the same saved trial id never mints a second budget; a changed cap is refused', async () => {
  await withDisposable(async (database) => {
    await bootstrapLocalStoryFunding(database.db.$client, trialInput());
    const ownerId = await seedUser(database);
    const fake = fakeProvider(80n);
    const options = {
      provider: fake.provider,
      dispatchAuthority: pinnedLocalStoryDispatchAuthority(localPolicy()),
    };
    await runOne(database, options, ownerId, taskFor(executionFor(trialRunId)));
    const before = await ledger(database, trialRunId);
    assert.equal(before.run.admitted_attempts, 1);

    const same = await bootstrapLocalStoryFunding(
      database.db.$client,
      trialInput(),
    );
    assert.equal(same.state, 'ready');
    assert.deepEqual(await ledger(database, trialRunId), before);

    // A larger/different cap under the same id must not widen the saved run.
    const widened = await bootstrapLocalStoryFunding(
      database.db.$client,
      trialInput({
        trial: { runId: trialRunId, maxMicrousd: 250_000n, maxAttempts: 3 },
      }),
    );
    assert.equal(widened.state, 'denied');
    assert.ok(
      widened.state === 'denied' &&
        widened.reasons.includes('trial-cap-mismatch'),
    );
    assert.deepEqual(await ledger(database, trialRunId), before);
  });
});

test('two concurrent attempts on the last remaining slot: SQL serializes admission, no fifth dispatch', async () => {
  await withDisposable(async (database) => {
    await bootstrapLocalStoryFunding(database.db.$client, trialInput());
    const ownerId = await seedUser(database);
    const execution = executionFor(trialRunId);
    const task = taskFor(execution);
    const fake = fakeProvider(80n);
    const options = {
      provider: fake.provider,
      dispatchAuthority: pinnedLocalStoryDispatchAuthority(localPolicy()),
    };
    for (let index = 0; index < 3; index += 1) {
      await runOne(database, options, ownerId, task);
    }
    assert.equal(fake.calls(), 3);
    const [a, b] = await Promise.all([
      seedGeneration(database, ownerId, task),
      seedGeneration(database, ownerId, task),
    ]);
    const runtime = createStorytellerRuntime(database, options);
    await Promise.all([runtime.complete(a!), runtime.complete(b!)]);
    assert.equal(fake.calls(), 4, 'exactly one of the racers dispatched');
    const outcomes = [
      (await failureCode(database, a!)).failure_code,
      (await failureCode(database, b!)).failure_code,
    ].sort();
    assert.deepEqual(outcomes, ['budget_unavailable', 'invalid_output']);
    const final = await ledger(database, trialRunId);
    assert.equal(final.run.admitted_attempts, 4);
    assert.equal(final.attempts.total, 4);
  });
});

test('captured task policy that differs from the independently pinned local policy is denied; no transport', async () => {
  await withDisposable(async (database) => {
    await bootstrapLocalStoryFunding(database.db.$client, trialInput());
    const ownerId = await seedUser(database);
    const execution = executionFor(trialRunId);
    // Task captured under one policy; the local launcher pins a different one.
    const capturedPolicy = localPolicy('250000');
    const pinned = localPolicy('240000');
    const task = taskFor(execution, capturedPolicy);
    const fake = fakeProvider(10n);
    const id = await runOne(
      database,
      {
        provider: fake.provider,
        dispatchAuthority: pinnedLocalStoryDispatchAuthority(pinned),
      },
      ownerId,
      task,
    );
    assert.equal(
      (await failureCode(database, id)).failure_code,
      'authority_unavailable',
    );
    assert.equal(fake.calls(), 0);
    const snapshot = await ledger(database, trialRunId);
    assert.equal(snapshot.attempts.unsent, 1);
    assert.equal(snapshot.run.reserved_microusd, '0');
    assert.equal(snapshot.run.settled_microusd, '0');
    assert.equal(snapshot.funding.stopped, false);
  });
});

test('stopped account is denied at budget.dispatch even when the pinned policy equals the captured one', async () => {
  await withDisposable(async (database) => {
    await bootstrapLocalStoryFunding(database.db.$client, trialInput());
    const ownerId = await seedUser(database);
    const execution = executionFor(trialRunId);
    const policy = localPolicy();
    const task = taskFor(execution, policy);
    const generationId = await seedGeneration(database, ownerId, task);
    const budget = createStorytellerBudget(database);
    const attemptId = randomUUID();
    assert.equal(
      await budget.reserve({ id: attemptId, generationId, ownerId, task }),
      'reserved',
    );
    // Authority matches (captured === pinned) but the account was stopped after reserve.
    await budget.stop(accountId);
    const granted =
      JSON.stringify(pinnedLocalStoryDispatchAuthority(policy)()) ===
      JSON.stringify(
        task.resources.authority.kind === 'effective-usage-policy'
          ? task.resources.authority.policy
          : null,
      );
    assert.equal(granted, true, 'static policy equals captured policy');
    assert.equal(await budget.dispatch(attemptId, execution, granted), false);
    assert.equal(await budget.attemptState(attemptId), 'unsent');
    const snapshot = await ledger(database, trialRunId);
    assert.equal(snapshot.run.reserved_microusd, '0');
    assert.equal(snapshot.funding.stopped, true);
  });
});

test('generic worker options without OBS00-B stay denied and carry no local trial authority', async () => {
  const options = readStorytellerWorkerOptions({
    STORYTELLER_LIVE_ENABLED: 'true',
    STORYTELLER_EXECUTION_JSON: JSON.stringify(executionFor(trialRunId)),
    OPENROUTER_API_KEY: 'synthetic-not-a-credential',
  });
  assert.equal('dispatchAuthority' in options, false);

  await withDisposable(async (database) => {
    await bootstrapLocalStoryFunding(database.db.$client, trialInput());
    const ownerId = await seedUser(database);
    const task = taskFor(executionFor(trialRunId));
    const fake = fakeProvider(10n);
    // Generic composition: same options shape, but counting fake transport only.
    const { provider: _real, ...generic } = options;
    void _real;
    const id = await runOne(
      database,
      { ...generic, provider: fake.provider },
      ownerId,
      task,
    );
    assert.equal(
      (await failureCode(database, id)).failure_code,
      'authority_unavailable',
    );
    assert.equal(fake.calls(), 0);
  });

  // No local-trial symbol or flag is reachable from production worker/application source.
  const root = fileURLToPath(new URL('../../../../', import.meta.url));
  const offenders: string[] = [];
  const scan = (directory: string) => {
    for (const name of readdirSync(directory)) {
      if (name === 'node_modules' || name === 'dist') continue;
      const path = join(directory, name);
      if (statSync(path).isDirectory()) scan(path);
      else if (
        /\.(ts|tsx|mjs|js)$/.test(name) &&
        /pinnedLocalStoryDispatchAuthority|story-trial-|bootstrapLocalStoryFunding/.test(
          readFileSync(path, 'utf8'),
        )
      ) {
        offenders.push(path);
      }
    }
  };
  scan(join(root, 'apps', 'worker', 'src'));
  scan(join(root, 'packages', 'application', 'src'));
  assert.deepEqual(offenders, []);
});

test('denial and status text carry no credential or payload', () => {
  const text = describeStoryFundingDenial([
    'account-stopped',
    'run-disabled',
    'uncertain-attempt',
    'trial-cap-mismatch',
  ]);
  assert.doesNotMatch(
    text,
    /sk-[a-z0-9]|Bearer\s|OPENROUTER_API_KEY|api[_-]?key/i,
  );
});
