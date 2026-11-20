import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateCommitMessage } from './check-commit-message.mjs';

const valid = `fix(STORY03/control): publish saved results through Game Authority

Why: Control-worker SQL writes bypassed the selected publication owner.
Evidence: focused custody tests PASS; browser flow NOT RUN (no cluster).
Remaining: cold kind integration remains in TURN03.
Refs: STORY03 T07`;
const check = (message) => validateCommitMessage(message);

test('accepts specific outcome, reason, evidence, optional remaining and refs', () => {
  assert.deepEqual(check(valid), []);
  assert.deepEqual(check(`docs(repo): explain repository commit message policy\n\nWhy: Commit subjects in the history follow inconsistent formats.\nEvidence: source audit of 1040 sampled commit messages.`), []);
  assert.deepEqual(check(`policy(agents): bind commit quality to root agent instructions\n\nWhy: Agent handoffs often bypass the preferred message style.\nEvidence: checked AGENTS.md link and canonical rule.`), []);
});

test('accepts CRLF and normal Git trailers', () => {
  assert.deepEqual(check(valid.replaceAll('\n', '\r\n') + '\r\n\r\nCo-authored-by: Cursor <cursoragent@cursor.com>'), []);
});

test('allows Git-generated merge and rebase housekeeping messages', () => {
  for (const msg of ['Merge branch \'main\' of https://github.com/example/repo', 'Revert "feat(web): add button"', 'fixup! fix(web): fix a race', 'squash! docs(repo): repair link']) {
    assert.deepEqual(check(msg), []);
  }
});

test('rejects unstructured, unscoped and unknown-type headers', () => {
  assert.ok(check('Fix the Storyteller.\n\nWhy: Broken publication route.\nEvidence: local test passed.').length);
  assert.ok(check('fix: repair the Storyteller custody route\n\nWhy: Wrong writer owns publication.\nEvidence: local test passed.').length);
  assert.ok(check('stuff(web): repair the Storyteller custody route\n\nWhy: Wrong writer owns publication.\nEvidence: local test passed.').length);
});

test('rejects missing rationale and fabricated-looking bare evidence', () => {
  assert.match(check('feat(web): show the confirmed next scene').join(' '), /Why:/);
  assert.match(check(valid.replace(/^Why:.*$/m, 'Why: TBD')).join(' '), /Why:/);
  assert.match(check(valid.replace(/^Evidence:.*$/m, 'Evidence: NOT RUN')).join(' '), /Evidence:/);
  assert.match(check(valid.replace(/^Evidence:.*$/m, 'Evidence: N/A')).join(' '), /Evidence:/);
});

test('rejects one-line body, terminal period and vague subject', () => {
  assert.match(check(valid.replace('\n\nWhy:', '\nWhy:')).join(' '), /blank line/);
  assert.match(check(valid.replace('Game Authority\n', 'Game Authority.\n')).join(' '), /period/);
  assert.match(check(valid.replace('publish saved results through Game Authority', 'update')).join(' '), /vague|catch-all/);
});

test('rejects header longer than 100 characters', () => {
  const long = valid.replace('publish saved results through Game Authority', 'publish saved results through Game Authority and additionally perform a superfluous secondary expensive remote integration smoke test');
  assert.match(check(long).join(' '), /100/);
});
