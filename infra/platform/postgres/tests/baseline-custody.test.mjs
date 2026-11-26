import test from 'node:test';
import assert from 'node:assert/strict';
import { createBaselineCustody } from '../bootstrap/custody.mjs';

test('expired deadline issues no subprocess', () => {
  let clock = 0;
  const custody = createBaselineCustody({ now: () => clock, budgetMs: 100 });
  clock = 101;
  const result = custody.run('nonexistent-test-command', []);
  assert.equal(result.timedOut, true);
  assert.equal(result.ok, false);
  assert.equal(custody.remaining(), 0);
  custody.close();
});

test('mutation requires actual acquired custody', () => {
  const custody = createBaselineCustody();
  try {
    assert.throws(() => custody.run('kubectl', ['create'], { mutation: true }), /custody/);
    assert.throws(() => custody.run(process.execPath, ['-e', ''], { mutation: true }), /custody/);
  } finally { custody.close(); }
});

test('bounded subprocess cannot ignore timeout', () => {
  const custody = createBaselineCustody({ budgetMs: 3000 });
  try {
    const result = custody.run(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { timeoutMs: 100 });
    assert.equal(result.ok, false);
    assert.equal(result.timedOut, true);
    assert.equal(result.signal, 'SIGKILL');
  } finally { custody.close(); }
});
