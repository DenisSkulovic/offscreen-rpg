import assert from 'node:assert/strict';
import { test } from 'node:test';
import { UnauthorizedException } from '@nestjs/common';
import { IdentityService } from '../dist/src/modules/auth/identity.js';

test('missing session is unauthorized and does not invent a player', async () => {
  const identity = new IdentityService({
    api: {
      async getSession() {
        return null;
      },
    },
  });
  await assert.rejects(() => identity.requireUser({}), UnauthorizedException);
});

test('a Better Auth session is the authenticated actor', async () => {
  const identity = new IdentityService({
    api: {
      async getSession() {
        return {
          user: {
            id: 'github-user',
            name: 'GitHub Player',
            email: 'player@example.com',
          },
        };
      },
    },
  });
  assert.deepEqual(await identity.requireUser({ cookie: 'session=1' }), {
    id: 'github-user',
    name: 'GitHub Player',
    email: 'player@example.com',
  });
});
