import assert from 'node:assert/strict';
import test from 'node:test';
import {
  causalSqlStatements,
  observeScriptedContinuationSql,
} from './causal-sql.mjs';

const OPERATION_ID = '44444444-4444-4444-8444-444444444444';
const STORY_ID = '55555555-5555-4555-8555-555555555555';
const OWNER_ID = 'player-owner';
const NOTICE_ID = '66666666-6666-4666-8666-666666666666';
const ATTEMPT_ID = '77777777-7777-4777-8777-777777777777';
const SECRET = 'postgres://lab-secret-must-not-leak';

function input(overrides = {}) {
  return {
    operationId: OPERATION_ID,
    storyId: STORY_ID,
    ownerId: OWNER_ID,
    topic: causalSqlStatements.topic,
    ...overrides,
  };
}

function happyRows() {
  return {
    notice: [
      {
        id: NOTICE_ID,
        topic: causalSqlStatements.topic,
        operation_id: OPERATION_ID,
      },
    ],
    attempt: [
      {
        id: ATTEMPT_ID,
        generation_id: OPERATION_ID,
        owner_id: OWNER_ID,
        story_id: STORY_ID,
        state: 'settled',
      },
    ],
    publication: [{ generation_id: OPERATION_ID, state: 'published' }],
    passages: [{ sequence: 1 }, { sequence: 2 }],
  };
}

function fakeReader(rows, options = {}) {
  const calls = [];
  return {
    calls,
    async query(sql, params) {
      calls.push({ sql, params });
      if (options.throwOn === calls.length) {
        throw new Error(`driver failed ${SECRET}`);
      }
      if (sql === causalSqlStatements.notice) return { rows: rows.notice };
      if (sql === causalSqlStatements.attempt) return { rows: rows.attempt };
      if (sql === causalSqlStatements.publication) {
        return { rows: rows.publication };
      }
      if (sql === causalSqlStatements.passages) return { rows: rows.passages };
      throw new Error('unexpected sql');
    },
  };
}

test('one correlated notice, attempt, publication and passages is injected evidence', async () => {
  const reader = fakeReader(happyRows());
  const receipt = await observeScriptedContinuationSql({
    ...input(),
    reader,
  });

  assert.deepEqual(
    reader.calls.map((call) => call.sql),
    [
      causalSqlStatements.notice,
      causalSqlStatements.attempt,
      causalSqlStatements.publication,
      causalSqlStatements.passages,
    ],
  );
  assert.deepEqual(reader.calls[0].params, [
    OPERATION_ID,
    causalSqlStatements.topic,
  ]);
  assert.deepEqual(reader.calls[1].params, [OPERATION_ID]);
  assert.deepEqual(reader.calls[2].params, [OPERATION_ID]);
  assert.deepEqual(reader.calls[3].params, [STORY_ID]);
  assert.equal(reader.calls.length, 4);
  assert.deepEqual(receipt, {
    observed: true,
    status: 'observed',
    code: 'scripted-continuation',
    evidence: 'injected-readonly-query',
    counts: { notices: 1, attempts: 1, publications: 1, passages: 2 },
    noticeId: NOTICE_ID,
    attemptId: ATTEMPT_ID,
    publicationState: 'published',
  });
  assert.equal(JSON.stringify(receipt).includes('kind-cross-pod'), false);
  assert.equal(JSON.stringify(receipt).includes(OWNER_ID), false);
});

test('malformed ids, empty owner, wrong topic and SQL fragments issue no query', async () => {
  const cases = [
    input({ operationId: `'; DROP TABLE outbox;--` }),
    input({ storyId: 'not-a-uuid' }),
    input({ ownerId: '   ' }),
    input({ topic: 'storyteller.profiled.v1' }),
    input({ topic: `${causalSqlStatements.topic}' OR '1'='1` }),
  ];
  for (const specimen of cases) {
    const reader = fakeReader(happyRows());
    const receipt = await observeScriptedContinuationSql({
      ...specimen,
      reader,
    });
    assert.equal(reader.calls.length, 0);
    assert.equal(receipt.observed, false);
    assert.equal(receipt.status, 'FAIL');
    assert.equal(receipt.evidence, 'injected-readonly-query');
  }
});

test('missing notice or attempt blocks and a duplicate or foreign attempt fails', async () => {
  const missingNotice = fakeReader({ ...happyRows(), notice: [] });
  const blockedNotice = await observeScriptedContinuationSql({
    ...input(),
    reader: missingNotice,
  });
  assert.equal(blockedNotice.status, 'BLOCKED');
  assert.equal(blockedNotice.code, 'missing-notice');
  assert.equal(missingNotice.calls.length, 1);

  const duplicateNotice = fakeReader({
    ...happyRows(),
    notice: [...happyRows().notice, ...happyRows().notice],
  });
  const failedNotice = await observeScriptedContinuationSql({
    ...input(),
    reader: duplicateNotice,
  });
  assert.equal(failedNotice.status, 'FAIL');
  assert.equal(failedNotice.code, 'duplicate-notice');
  assert.equal(duplicateNotice.calls.length, 1);

  const missingAttempt = fakeReader({ ...happyRows(), attempt: [] });
  const blockedAttempt = await observeScriptedContinuationSql({
    ...input(),
    reader: missingAttempt,
  });
  assert.equal(blockedAttempt.status, 'BLOCKED');
  assert.equal(blockedAttempt.code, 'missing-attempt');
  assert.equal(missingAttempt.calls.length, 2);

  const foreign = fakeReader({
    ...happyRows(),
    attempt: [{ ...happyRows().attempt[0], owner_id: 'other-player' }],
  });
  const failedOwner = await observeScriptedContinuationSql({
    ...input(),
    reader: foreign,
  });
  assert.equal(failedOwner.status, 'FAIL');
  assert.equal(failedOwner.code, 'attempt-ownership');
  assert.equal(foreign.calls.length, 2);

  const otherStory = fakeReader({
    ...happyRows(),
    attempt: [
      {
        ...happyRows().attempt[0],
        story_id: '88888888-8888-4888-8888-888888888888',
      },
    ],
  });
  const failedStory = await observeScriptedContinuationSql({
    ...input(),
    reader: otherStory,
  });
  assert.equal(failedStory.code, 'attempt-ownership');

  const nullStory = fakeReader({
    ...happyRows(),
    attempt: [{ ...happyRows().attempt[0], story_id: null }],
  });
  const failedNull = await observeScriptedContinuationSql({
    ...input(),
    reader: nullStory,
  });
  assert.equal(failedNull.observed, false);
  assert.equal(failedNull.code, 'attempt-ownership');

  const duplicateAttempt = fakeReader({
    ...happyRows(),
    attempt: [...happyRows().attempt, ...happyRows().attempt],
  });
  const failedDuplicate = await observeScriptedContinuationSql({
    ...input(),
    reader: duplicateAttempt,
  });
  assert.equal(failedDuplicate.code, 'duplicate-attempt');
  assert.equal(duplicateAttempt.calls.length, 2);
});

test('publication and passage history reject incomplete and contradictory rows', async () => {
  const cases = [
    [{ ...happyRows(), publication: [] }, 'BLOCKED', 'missing-publication', 3],
    [
      {
        ...happyRows(),
        publication: [{ generation_id: OPERATION_ID, state: 'pending' }],
      },
      'BLOCKED',
      'publication-pending',
      3,
    ],
    [
      {
        ...happyRows(),
        publication: [{ generation_id: OPERATION_ID, state: 'stale' }],
      },
      'FAIL',
      'publication-not-published',
      3,
    ],
    [
      {
        ...happyRows(),
        publication: [{ generation_id: OPERATION_ID, state: 'blocked' }],
      },
      'FAIL',
      'publication-not-published',
      3,
    ],
    [
      { ...happyRows(), passages: [{ sequence: 1 }] },
      'BLOCKED',
      'incomplete-passages',
      4,
    ],
    [{ ...happyRows(), passages: [] }, 'BLOCKED', 'missing-passages', 4],
    [
      { ...happyRows(), passages: [{ sequence: 1 }, { sequence: 3 }] },
      'FAIL',
      'inconsistent-passages',
      4,
    ],
    [
      {
        ...happyRows(),
        passages: [{ sequence: 1 }, { sequence: 2 }, { sequence: 3 }],
      },
      'FAIL',
      'inconsistent-passages',
      4,
    ],
    [
      { ...happyRows(), passages: [{ sequence: 2 }, { sequence: 1 }] },
      'FAIL',
      'inconsistent-passages',
      4,
    ],
    [
      { ...happyRows(), passages: [{ sequence: 1 }, { sequence: 1 }] },
      'FAIL',
      'inconsistent-passages',
      4,
    ],
  ];

  for (const [rows, status, code, calls] of cases) {
    const reader = fakeReader(rows);
    const receipt = await observeScriptedContinuationSql({
      ...input(),
      reader,
    });
    assert.equal(receipt.status, status);
    assert.equal(receipt.code, code);
    assert.equal(receipt.observed, false);
    assert.equal(reader.calls.length, calls);
    assert.equal(
      reader.calls.every((call) => call.sql.startsWith('SELECT ')),
      true,
    );
  }
});

test('a secret-bearing reader error blocks once and does not retry or leak', async () => {
  const reader = fakeReader(happyRows(), { throwOn: 2 });
  const receipt = await observeScriptedContinuationSql({ ...input(), reader });
  assert.equal(reader.calls.length, 2);
  assert.equal(receipt.status, 'BLOCKED');
  assert.equal(receipt.code, 'query-unavailable');
  assert.equal(receipt.observed, false);
  const encoded = JSON.stringify(receipt);
  assert.equal(encoded.includes(SECRET), false);
  assert.equal(encoded.includes('postgres'), false);
  assert.equal(encoded.includes('driver failed'), false);
});

test('statements stay fixed parameterized selects', () => {
  const statements = [
    causalSqlStatements.notice,
    causalSqlStatements.attempt,
    causalSqlStatements.publication,
    causalSqlStatements.passages,
  ];
  assert.equal(causalSqlStatements.topic, 'storyteller.distributed.v1');
  for (const sql of statements) {
    assert.equal(sql.startsWith('SELECT '), true);
    assert.equal(
      /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE)\b/i.test(sql),
      false,
    );
    assert.equal(sql.includes('${'), false);
  }
  assert.equal(
    causalSqlStatements.passages.endsWith('ORDER BY sequence ASC'),
    true,
  );
});
