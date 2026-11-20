import assert from 'node:assert/strict';
import { test } from 'node:test';
import { UnauthorizedException } from '@nestjs/common';
import { IdentityService, POC_OPEN_ACCESS } from '../dist/src/modules/auth/identity.js';
import { POC_LOCAL_PLAYER } from '../dist/src/modules/auth/config.js';

const authNeverCalled = {
  api: {
    getSession() {
      throw new Error('Better Auth getSession must not run');
    },
  },
};

test('POC open access returns the fixed player without a session', async () => {
  const identity = new IdentityService(authNeverCalled, true);
  assert.deepEqual(await identity.requireUser({}), POC_LOCAL_PLAYER);
});

test('missing session without POC open access is 401', async () => {
  const identity = new IdentityService(
    {
      api: {
        async getSession() {
          return null;
        },
      },
    },
    false,
  );
  await assert.rejects(() => identity.requireUser({}), UnauthorizedException);
});

test('POC_OPEN_ACCESS token symbol is stable for Nest wiring', () => {
  assert.equal(typeof POC_OPEN_ACCESS, 'symbol');
});