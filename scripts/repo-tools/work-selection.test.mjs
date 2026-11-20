import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCurrentWork } from './work-selection.mjs';

test('one valid empty Current work declaration is allowed', () => {
  assert.deepEqual(parseCurrentWork('# Work\n\nCurrent work: none\n'), {
    ok: true,
    selected: 'none',
    kind: null,
    href: null,
    target: null,
  });
});

test('an open Change and an independent Task are distinct top-level selections', () => {
  const change = parseCurrentWork('Current work: [BOOT03](changes/open/2026-11-19--boot03-game-authority-start-admission/CHANGE.md)\n');
  assert.equal(change.ok, true);
  assert.equal(change.kind, 'change');
  assert.equal(change.target, 'work/changes/open/2026-11-19--boot03-game-authority-start-admission/CHANGE.md');

  const task = parseCurrentWork('Current work: [run](tasks/open/2026-11-20--test-run/TASK.md)\n');
  assert.equal(task.ok, true);
  assert.equal(task.kind, 'task');
  assert.equal(task.target, 'work/tasks/open/2026-11-20--test-run/TASK.md');
});

test('invalid, ambiguous and archived selections fail closed', () => {
  const invalid = [
    '',
    'Current work: none\nCurrent work: none\n',
    'Current work: [old](changes/archive/2026-11/other/old/CHANGE.md)',
    'Current work: [done](tasks/archive/2026-11/old/TASK.md)',
    'Current work: [not a task](changes/open/leaf/TASKS.md)',
    'Current work: [design](designs/open/design/README.md)',
    'Current work: [escape](../private/TASK.md)',
    'Current work: [absolute](/tasks/open/leaf/TASK.md)',
    'Current work: [frag](tasks/open/leaf/TASK.md#T01)',
    'Current work: [external](https://example.com/TASK.md)',
    'Current work: [one](tasks/open/a/TASK.md), [two](tasks/open/b/TASK.md)',
  ];
  for (const value of invalid) {
    assert.equal(parseCurrentWork(value).ok, false, value);
  }
});
