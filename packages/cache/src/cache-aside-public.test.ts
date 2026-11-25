import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CacheOverloadError,
  createSingleFlight,
  type SingleFlight,
} from '@offscreen/cache/strategies';

test('public strategies entry exports single-flight', async () => {
  const flight: SingleFlight<string> = createSingleFlight<string>({
    maxActiveKeys: 2,
    maxWaitersPerKey: 2,
  });

  const result = await flight.run('public', async () => 'ready');
  assert.equal(result.value, 'ready');
  assert.equal(result.coalesced, false);
  assert.equal(new CacheOverloadError().name, 'CacheOverloadError');
});
