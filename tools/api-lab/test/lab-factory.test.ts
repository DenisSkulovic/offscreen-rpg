import assert from 'node:assert/strict';
import { UnauthorizedException } from '@nestjs/common';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { createApp } from '@offscreen/api/app';
import { createAuth } from '@offscreen/api/auth';
import test from 'node:test';
import { createLabApp } from '../src/create-lab-app.js';

const origin = 'http://127.0.0.1:3999';

function database() {
  return createDatabase(
    readDatabaseConfig({
      DATABASE_URL: 'postgresql://localhost/ma12_lab_unused',
    }),
    () => {},
  );
}

function authFor(db: ReturnType<typeof database>) {
  return createAuth(db, {
    origin,
    secret: 'ma12-lab-only-placeholder-secret-1234',
    githubClientId: 'test',
    githubClientSecret: 'test',
  });
}

test('production createApp does not expose Lab routes', async () => {
  const db = database();
  const app = await createApp(db, authFor(db), origin);
  try {
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    const response = await fetch(`${base}/api/chamber-tools/lab/commands`);
    assert.equal(response.status, 404);
  } finally {
    await app.close();
  }
});

test('Lab factory keeps owner, origin and body checks', async () => {
  const db = database();
  let user: { id: string; name: string; email: string } | null = null;
  const app = await createLabApp(db, authFor(db), origin, {
    identity: {
      async requireUser() {
        if (!user) {
          throw new UnauthorizedException();
        }
        return user;
      },
    },
    qaContext: {
      git: { commit: 'ma12', dirty: false },
      environment: { identity: 'local-test' },
    },
  });
  try {
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    const unauthenticated = await fetch(
      `${base}/api/chamber-tools/lab/commands`,
    );
    assert.equal(unauthenticated.status, 401);

    user = { id: 'owner-a', name: 'A', email: 'a@local.invalid' };
    const badOrigin = await fetch(`${base}/api/chamber-tools/lab/runs`, {
      method: 'PUT',
      headers: {
        origin: 'http://evil.example',
        'content-type': 'application/json',
      },
      body: '{}',
    });
    assert.equal(badOrigin.status, 403);
    assert.deepEqual(await badOrigin.json(), { code: 'invalid_origin' });

    const malformed = await fetch(`${base}/api/chamber-tools/lab/runs`, {
      method: 'PUT',
      headers: { origin, 'content-type': 'application/json' },
      body: '{}',
    });
    assert.equal(malformed.status, 400);

    const scenarios = await fetch(`${base}/api/chamber-tools/lab/scenarios`);
    assert.equal(scenarios.status, 200);
    const catalogue = (await scenarios.json()) as Array<{
      id: string;
      version: number;
      availabilityPerLane: Record<string, { state: string }>;
    }>;
    const scenario = catalogue.find(
      (entry) =>
        entry.availabilityPerLane['bench-policy']?.state === 'available',
    );
    assert.ok(scenario);
    const opened = await fetch(`${base}/api/chamber-tools/lab/runs`, {
      method: 'PUT',
      headers: { origin, 'content-type': 'application/json' },
      body: JSON.stringify({
        scenarioId: scenario.id,
        scenarioVersion: scenario.version,
        lane: 'bench-policy',
      }),
    });
    const openedBody = await opened.text();
    assert.equal(opened.status, 200, openedBody);
    const run = JSON.parse(openedBody) as { runId: string };
    user = { id: 'owner-b', name: 'B', email: 'b@local.invalid' };
    const otherOwner = await fetch(
      `${base}/api/chamber-tools/lab/runs/${run.runId}`,
    );
    assert.equal(otherOwner.status, 404);
  } finally {
    await app.close();
  }
});
