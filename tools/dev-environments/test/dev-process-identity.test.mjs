import test from 'node:test';
import assert from 'node:assert/strict';
import { assessOwnedProcess, processStartTicksFromStat } from '../src/domain/dev-process-identity.mjs';

test('start ticks are read after a command name that contains spaces', () => {
  const fields = Array.from({ length: 20 }, (_, index) => String(index + 1));
  const stat = `4242 (tilt up) ${fields.join(' ')}`;
  assert.equal(processStartTicksFromStat(stat), '20');
});

test('a missing start time never counts as ownership', () => {
  const result = assessOwnedProcess(
    { pid: 9 },
    { pidAlive: () => true, readStartTicks: () => '9' },
  );
  assert.equal(result.owned, false);
  assert.equal(result.reason, 'missing_start_time');
});
