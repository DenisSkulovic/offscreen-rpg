import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { filter, firstValueFrom, take } from 'rxjs';
import { createStoryUpdateHub } from '../dist/src/modules/stories/story-update-hub.js';

function fakeConfig() {
  return {
    connectionString: 'postgres://hub-test/offscreen',
    max: 1,
    connectionTimeoutMillis: 1000,
    statement_timeout: 1000,
    idle_in_transaction_session_timeout: 1000,
    idleTimeoutMillis: 1000,
  };
}

function createFakeClientFactory(control) {
  return () => {
    const client = {
      listeners: {
        notification: [],
        error: [],
        end: [],
      },
      ended: false,
      async connect() {
        control.connectCount += 1;
        if (control.failNextConnect) {
          control.failNextConnect = false;
          throw new Error('listen connect failed');
        }
      },
      async query(sql) {
        control.queries.push(sql);
      },
      on(event, listener) {
        client.listeners[event].push(listener);
      },
      removeAllListeners() {
        client.listeners.notification = [];
        client.listeners.error = [];
        client.listeners.end = [];
      },
      async end() {
        client.ended = true;
        control.endCount += 1;
      },
      emit(event, payload) {
        for (const listener of client.listeners[event]) {
          listener(payload);
        }
      },
    };
    control.clients.push(client);
    return client;
  };
}

test('LISTEN disconnect reconnects and signals SSE clients to refresh (negative recovery)', async () => {
  const control = {
    connectCount: 0,
    endCount: 0,
    failNextConnect: false,
    queries: [],
    clients: [],
  };
  /** @type {Array<() => void>} */
  const scheduled = [];
  const hub = createStoryUpdateHub(fakeConfig(), {
    createClient: createFakeClientFactory(control),
    reconnectInitialMs: 1,
    reconnectMaxMs: 1,
    scheduleReconnect: (fn) => {
      scheduled.push(fn);
      return {
        cancel() {
          const index = scheduled.indexOf(fn);
          if (index >= 0) {
            scheduled.splice(index, 1);
          }
        },
      };
    },
  });

  await hub.start();
  assert.equal(hub.isListenerHealthy(), true);
  assert.equal(control.connectCount, 1);

  const storyId = randomUUID();
  const ownerId = randomUUID();
  const recovered = firstValueFrom(
    hub.subscribe({ ownerId, storyId }).pipe(
      filter((event) => event.type === 'listener-recovered'),
      take(1),
    ),
  );

  control.clients[0].emit('error', new Error('pg listen dropped'));
  assert.equal(hub.isListenerHealthy(), false);
  assert.equal(scheduled.length, 1);

  const run = scheduled.shift();
  assert.ok(run);
  run();

  const event = await recovered;
  assert.equal(event.type, 'listener-recovered');
  assert.equal(hub.isListenerHealthy(), true);
  assert.equal(control.connectCount, 2);
  assert.ok(control.queries.some((sql) => String(sql).startsWith('LISTEN ')));

  await hub.close();
});

test('closed hub does not reconnect after listen failure', async () => {
  const control = {
    connectCount: 0,
    endCount: 0,
    failNextConnect: false,
    queries: [],
    clients: [],
  };
  let scheduled = 0;
  const hub = createStoryUpdateHub(fakeConfig(), {
    createClient: createFakeClientFactory(control),
    scheduleReconnect: () => {
      scheduled += 1;
      return { cancel() {} };
    },
  });
  await hub.start();
  await hub.close();
  hub.simulateListenFailureForTests();
  assert.equal(scheduled, 0);
  assert.equal(hub.isListenerHealthy(), false);
});
