import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { runScriptedPlayerSmoke } from './player-smoke.mjs';

const START_ROOT = 'a'.repeat(64);
const RULES_ROOT = 'b'.repeat(64);
const SCENE1_HASH = 'c'.repeat(64);
const SCENE2_HASH = 'd'.repeat(64);
const RELEASE = 'e'.repeat(40);
const SECRET = 'session=super-secret-cookie';

const IDENTITY = Object.freeze({
  draftId: '11111111-1111-4111-8111-111111111111',
  generationId: '22222222-2222-4222-8222-222222222222',
  storyId: '33333333-3333-4333-8333-333333333333',
  operationId: '44444444-4444-4444-8444-444444444444',
  forkId: '55555555-5555-4555-8555-555555555555',
  sourcePins: {
    start: { rootHash: START_ROOT },
    rules: { rootHash: RULES_ROOT },
  },
  campaign: { campaignId: 'harbor-watch' },
  draft: { title: 'Harbor watch', premise: 'Orientation only' },
});

const READINESS = Object.freeze({
  releaseSha: RELEASE,
  bucket: 'lab-objects',
  contextName: 'kind-offscreen-lab',
  imagesCurrent: true,
  sessionVerified: true,
});

const FIXTURE = Object.freeze({
  verified: true,
  bucket: 'lab-objects',
  releaseSha: RELEASE,
  startRootHash: START_ROOT,
  rulesRootHash: RULES_ROOT,
  evidence: 'injected-readonly-store',
});

/**
 * @param {{
 *   authStatus?: number,
 *   openingPending?: boolean,
 *   receiptPending?: boolean,
 *   omitScene1Checkpoint?: boolean,
 *   omitScene2Checkpoint?: boolean,
 *   omitChildLineage?: boolean,
 *   secret?: string,
 * }} [opts]
 */
function buildFakeRequest(opts = {}) {
  /** @type {Array<{ method: string, path: string }>} */
  const calls = [];
  const passage1 = '66666666-6666-4666-8666-666666666666';
  const passage2 = '88888888-8888-4888-8888-888888888888';
  const scene1 = {
    id: IDENTITY.storyId,
    revision: 1,
    current: {
      id: passage1,
      interaction: {
        id: '77777777-7777-4777-8777-777777777777',
        specification: { options: [{ id: 'ask-balmora' }] },
      },
    },
  };

  const request = async (method, path) => {
    calls.push({ method, path });
    if (opts.authStatus != null && path.endsWith('/start')) {
      return {
        status: opts.authStatus,
        body: { cookie: opts.secret ?? SECRET },
      };
    }
    if (method === 'PUT' && path === `/api/drafts/${IDENTITY.draftId}`) {
      return { status: 200, body: { revision: 1, note: opts.secret } };
    }
    if (
      method === 'PUT' &&
      path ===
        `/api/drafts/${IDENTITY.draftId}/openings/${IDENTITY.generationId}`
    ) {
      return { status: 202, body: {} };
    }
    if (
      method === 'GET' &&
      path === `/api/drafts/${IDENTITY.draftId}/openings/latest`
    ) {
      return {
        status: 200,
        body: {
          preview: {
            id: IDENTITY.generationId,
            state: opts.openingPending ? 'pending' : 'succeeded',
          },
        },
      };
    }
    if (method === 'PUT' && path === `/api/stories/${IDENTITY.storyId}/start`) {
      return { status: 200, body: scene1 };
    }
    if (
      method === 'GET' &&
      path === `/api/stories/${IDENTITY.storyId}/scenes/1`
    ) {
      return {
        status: 200,
        body: {
          ...scene1,
          checkpointHash: opts.omitScene1Checkpoint ? undefined : SCENE1_HASH,
          canon: { rootHash: START_ROOT },
        },
      };
    }
    if (
      method === 'PUT' &&
      path ===
        `/api/stories/${IDENTITY.storyId}/resolutions/${IDENTITY.operationId}`
    ) {
      return { status: 202, body: { provider: opts.secret } };
    }
    if (path.endsWith('/receipt')) {
      return {
        status: 200,
        body: {
          operationId: IDENTITY.operationId,
          state: opts.receiptPending ? 'processing' : 'settled',
          raw: opts.secret,
        },
      };
    }
    if (method === 'GET' && path === `/api/stories/${IDENTITY.storyId}`) {
      return {
        status: 200,
        body: opts.receiptPending
          ? scene1
          : {
              id: IDENTITY.storyId,
              revision: 2,
              current: { id: passage2, interaction: null },
              prose: opts.secret,
            },
      };
    }
    if (
      method === 'GET' &&
      path === `/api/stories/${IDENTITY.storyId}/scenes/2`
    ) {
      return {
        status: 200,
        body: {
          id: IDENTITY.storyId,
          revision: 2,
          current: { id: passage2, interaction: null },
          checkpointHash: opts.omitScene2Checkpoint ? undefined : SCENE2_HASH,
          canon: { rootHash: RULES_ROOT },
        },
      };
    }
    if (
      method === 'PUT' &&
      path === `/api/stories/${IDENTITY.storyId}/forks/${IDENTITY.forkId}`
    ) {
      return { status: 200, body: { id: IDENTITY.forkId } };
    }
    if (method === 'GET' && path === `/api/stories/${IDENTITY.forkId}`) {
      return {
        status: 200,
        body: {
          id: IDENTITY.forkId,
          revision: 1,
          current: { id: passage1, interaction: null },
          lineage: opts.omitChildLineage
            ? null
            : { sourceStoryId: IDENTITY.storyId, sourcePassageId: passage1 },
        },
      };
    }
    throw new Error(`unexpected ${method} ${path} ${opts.secret ?? ''}`);
  };

  return { request, calls };
}

function smoke(overrides = {}) {
  const fake = overrides.fake ?? buildFakeRequest(overrides.http);
  return {
    fake,
    run: () =>
      runScriptedPlayerSmoke({
        authorized: true,
        readiness: READINESS,
        verifiedFixture: FIXTURE,
        identity: IDENTITY,
        request: fake.request,
        maxAttempts: 3,
        sleep: async () => {},
        ...overrides.args,
      }),
  };
}

function assertLocalOnly(result) {
  const encoded = JSON.stringify(result);
  assert.equal(encoded.includes('PASS'), false);
  assert.equal(encoded.includes('kind-cross-pod'), false);
  assert.equal(encoded.includes(SECRET), false);
  assert.equal(result.evidence, 'source-only-observation');
  assert.equal('PASS' in result, false);
}

describe('scripted player smoke preconditions', () => {
  it('refuses without authorization and does not call', async () => {
    const { fake, run } = smoke({ args: { authorized: false } });
    const result = await run();
    assert.equal(result.status, 'BLOCKED');
    assert.equal(result.code, 'operator-authorization-required');
    assert.equal(fake.calls.length, 0);
  });

  it('refuses a wrong cluster, release, bucket or root with zero calls', async () => {
    const cases = [
      { readiness: { ...READINESS, contextName: 'kind-offscreen-dev' } },
      { readiness: { ...READINESS, releaseSha: 'f'.repeat(40) } },
      { readiness: { ...READINESS, bucket: 'other-bucket' } },
      {
        identity: {
          ...IDENTITY,
          sourcePins: {
            start: { rootHash: '1'.repeat(64) },
            rules: { rootHash: RULES_ROOT },
          },
        },
      },
      { readiness: { ...READINESS, imagesCurrent: false } },
      { verifiedFixture: { ...FIXTURE, verified: false } },
      { identity: { ...IDENTITY, operationId: '' } },
      { request: undefined },
    ];
    for (const args of cases) {
      const { fake, run } = smoke({ args });
      const result = await run();
      assert.notEqual(result.status, 'OBSERVED-LOCAL');
      assert.equal(fake.calls.length, 0);
      assertLocalOnly(result);
    }
  });
});

describe('scripted player smoke injected route', () => {
  it('observes scene1, resolution, scene2 and the historical fork once', async () => {
    const { fake, run } = smoke({ http: { secret: SECRET } });
    const result = await run();
    assert.equal(result.status, 'OBSERVED-LOCAL');
    assert.equal(result.operationId, IDENTITY.operationId);
    assert.equal(result.passage1Id, '66666666-6666-4666-8666-666666666666');
    assert.equal(result.passage2Id, '88888888-8888-4888-8888-888888888888');
    assert.equal(result.scene1CheckpointHash, SCENE1_HASH);
    assert.equal(result.scene2CheckpointHash, SCENE2_HASH);
    assert.equal(result.forkLineage, 'historical-fork-observed');
    assert.equal(
      fake.calls.filter(
        (call) => call.method === 'PUT' && call.path.includes('/resolutions/'),
      ).length,
      1,
    );
    assert.equal(
      fake.calls.some(
        (call) => call.path.includes('provider') || call.path.includes('llm'),
      ),
      false,
    );
    assertLocalOnly(result);
  });

  it('does not resend an opening that stays pending', async () => {
    const { fake, run } = smoke({ http: { openingPending: true } });
    const result = await run();
    assert.equal(result.status, 'BLOCKED');
    assert.equal(
      fake.calls.filter(
        (call) => call.method === 'PUT' && call.path.includes('/openings/'),
      ).length,
      1,
    );
    assert.equal(
      fake.calls.some((call) => call.path.endsWith('/start')),
      false,
    );
    assertLocalOnly(result);
  });

  it('keeps one resolution when the receipt stays pending', async () => {
    const { fake, run } = smoke({ http: { receiptPending: true } });
    const result = await run();
    assert.equal(result.status, 'BLOCKED');
    assert.equal(
      fake.calls.filter(
        (call) => call.method === 'PUT' && call.path.includes('/resolutions/'),
      ).length,
      1,
    );
    assert.equal(
      fake.calls.some((call) => call.path.includes('/forks/')),
      false,
    );
    assertLocalOnly(result);
  });

  it('stops on 401 and 403 without a second start', async () => {
    for (const authStatus of [401, 403]) {
      const { fake, run } = smoke({ http: { authStatus, secret: SECRET } });
      const result = await run();
      assert.equal(result.status, 'FAIL');
      assert.equal(
        fake.calls.filter((call) => call.path.endsWith('/start')).length,
        1,
      );
      assertLocalOnly(result);
    }
  });

  it('does not fork when scene1 has no checkpoint', async () => {
    const { fake, run } = smoke({ http: { omitScene1Checkpoint: true } });
    const result = await run();
    assert.equal(result.status, 'FAIL');
    assert.equal(
      fake.calls.some((call) => call.path.includes('/forks/')),
      false,
    );
    assertLocalOnly(result);
  });

  it('does not treat a missing scene2 checkpoint or a false fork as success', async () => {
    const missing = await smoke({ http: { omitScene2Checkpoint: true } }).run();
    assert.equal(missing.status, 'FAIL');
    assert.equal(missing.code, 'scene2-checkpoint-unproved');
    assert.equal(missing.scene2CheckpointHash, null);

    const unproved = await smoke({ http: { omitChildLineage: true } }).run();
    assert.equal(unproved.status, 'FAIL');
    assert.equal(unproved.code, 'fork-not-proved');
    assertLocalOnly(missing);
    assertLocalOnly(unproved);
  });

  it('hides an unexpected transport error', async () => {
    const result = await runScriptedPlayerSmoke({
      authorized: true,
      readiness: READINESS,
      verifiedFixture: FIXTURE,
      identity: IDENTITY,
      request: async () => {
        throw new Error(`boom ${SECRET}`);
      },
      maxAttempts: 2,
      sleep: async () => {},
    });
    assert.equal(result.status, 'FAIL');
    assert.equal(result.code, 'trace-failed');
    assert.equal(result.summary, undefined);
    assertLocalOnly(result);
  });
});
