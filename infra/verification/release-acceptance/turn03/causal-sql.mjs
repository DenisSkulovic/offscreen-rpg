/**
 * Injected read-only observation of one scripted continuation.
 *
 * A caller must already hold a database-level read-only account and tenant
 * authorization. These SELECT strings do not create that privilege, open a
 * connection, or prove a live cluster. Success is `injected-readonly-query`
 * only. It is not cross-Pod evidence, Temporal proof, or a TURN03 gate PASS.
 */

const DISTRIBUTED_TOPIC = 'storyteller.distributed.v1';
const EVIDENCE = 'injected-readonly-query';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const NOTICE_SQL =
  'SELECT id, topic, operation_id FROM outbox WHERE operation_id = $1 AND topic = $2';
const ATTEMPT_SQL =
  'SELECT id, generation_id, owner_id, story_id, state FROM storyteller_attempt WHERE generation_id = $1';
const PUBLICATION_SQL =
  'SELECT generation_id, state FROM storyteller_publication WHERE generation_id = $1';
const PASSAGE_SQL =
  'SELECT sequence FROM story_passage WHERE story_id = $1 ORDER BY sequence ASC';

/**
 * @param {{
 *   reader: { query: (sql: string, params: unknown[]) => Promise<{ rows: unknown[] }> },
 *   operationId: string,
 *   storyId: string,
 *   ownerId: string,
 *   topic: string,
 * }} input
 */
export async function observeScriptedContinuationSql(input) {
  // 1. Reject caller identity before any SQL. Injection and bad topics never reach the reader.
  const identity = validateIdentity(input);
  if (identity) return identity;

  if (!input.reader || typeof input.reader.query !== 'function') {
    return result({
      observed: false,
      status: 'BLOCKED',
      code: 'reader-unavailable',
      counts: emptyCounts(),
    });
  }

  // 2. One matching distributed notice. Absence blocks; a duplicate or mismatch fails.
  const notice = await readOnce(input.reader, NOTICE_SQL, [
    input.operationId,
    DISTRIBUTED_TOPIC,
  ]);
  if (notice.blocked) return notice.blocked;
  const noticeJudgement = judgeNotice(notice.rows, input.operationId);
  if (!noticeJudgement.ok) return noticeJudgement.result;

  // 3. One attempt for that generation, owned by the expected player and story.
  const attempt = await readOnce(input.reader, ATTEMPT_SQL, [
    input.operationId,
  ]);
  if (attempt.blocked) return attempt.blocked;
  const attemptJudgement = judgeAttempt(attempt.rows, input);
  if (!attemptJudgement.ok) return attemptJudgement.result;

  // 4. Publication for the same generation. Pending stays blocked; other states fail.
  const publication = await readOnce(input.reader, PUBLICATION_SQL, [
    input.operationId,
  ]);
  if (publication.blocked) return publication.blocked;
  const publicationJudgement = judgePublication(
    publication.rows,
    input.operationId,
  );
  if (!publicationJudgement.ok) return publicationJudgement.result;

  // 5. The story's ordered passage sequence must be exactly scene 1 then scene 2.
  const passages = await readOnce(input.reader, PASSAGE_SQL, [input.storyId]);
  if (passages.blocked) return passages.blocked;
  const passageJudgement = judgePassages(passages.rows);
  if (!passageJudgement.ok) return passageJudgement.result;

  return result({
    observed: true,
    status: 'observed',
    code: 'scripted-continuation',
    counts: {
      notices: 1,
      attempts: 1,
      publications: 1,
      passages: 2,
    },
    noticeId: noticeJudgement.id,
    attemptId: attemptJudgement.id,
    publicationState: 'published',
  });
}

export const causalSqlStatements = Object.freeze({
  topic: DISTRIBUTED_TOPIC,
  notice: NOTICE_SQL,
  attempt: ATTEMPT_SQL,
  publication: PUBLICATION_SQL,
  passages: PASSAGE_SQL,
});

function validateIdentity(input) {
  if (!input || typeof input !== 'object') {
    return result({
      observed: false,
      status: 'FAIL',
      code: 'malformed-identity',
      counts: emptyCounts(),
    });
  }
  if (!isUuid(input.operationId) || !isUuid(input.storyId)) {
    return result({
      observed: false,
      status: 'FAIL',
      code: 'malformed-identity',
      counts: emptyCounts(),
    });
  }
  if (typeof input.ownerId !== 'string' || input.ownerId.trim() === '') {
    return result({
      observed: false,
      status: 'FAIL',
      code: 'malformed-identity',
      counts: emptyCounts(),
    });
  }
  if (input.topic !== DISTRIBUTED_TOPIC) {
    return result({
      observed: false,
      status: 'FAIL',
      code: 'unexpected-topic',
      counts: emptyCounts(),
    });
  }
  return null;
}

async function readOnce(reader, sql, params) {
  let response;
  try {
    response = await reader.query(sql, params);
  } catch {
    return {
      blocked: result({
        observed: false,
        status: 'BLOCKED',
        code: 'query-unavailable',
        counts: emptyCounts(),
      }),
    };
  }
  if (!response || !Array.isArray(response.rows)) {
    return {
      blocked: result({
        observed: false,
        status: 'BLOCKED',
        code: 'query-unavailable',
        counts: emptyCounts(),
      }),
    };
  }
  return { rows: response.rows };
}

function judgeNotice(rows, operationId) {
  if (rows.length === 0) {
    return {
      ok: false,
      result: result({
        observed: false,
        status: 'BLOCKED',
        code: 'missing-notice',
        counts: { ...emptyCounts(), notices: 0 },
      }),
    };
  }
  if (rows.length !== 1) {
    return {
      ok: false,
      result: result({
        observed: false,
        status: 'FAIL',
        code: 'duplicate-notice',
        counts: { ...emptyCounts(), notices: rows.length },
      }),
    };
  }
  const row = rows[0];
  if (
    !isRow(row) ||
    !isUuid(row.id) ||
    row.topic !== DISTRIBUTED_TOPIC ||
    row.operation_id !== operationId
  ) {
    return {
      ok: false,
      result: result({
        observed: false,
        status: 'FAIL',
        code: 'notice-mismatch',
        counts: { ...emptyCounts(), notices: 1 },
      }),
    };
  }
  return { ok: true, id: row.id };
}

function judgeAttempt(rows, input) {
  if (rows.length === 0) {
    return {
      ok: false,
      result: result({
        observed: false,
        status: 'BLOCKED',
        code: 'missing-attempt',
        counts: { ...emptyCounts(), notices: 1, attempts: 0 },
      }),
    };
  }
  if (rows.length !== 1) {
    return {
      ok: false,
      result: result({
        observed: false,
        status: 'FAIL',
        code: 'duplicate-attempt',
        counts: { ...emptyCounts(), notices: 1, attempts: rows.length },
      }),
    };
  }
  const row = rows[0];
  if (
    !isRow(row) ||
    !isUuid(row.id) ||
    row.generation_id !== input.operationId ||
    row.owner_id !== input.ownerId ||
    row.story_id !== input.storyId
  ) {
    return {
      ok: false,
      result: result({
        observed: false,
        status: 'FAIL',
        code: 'attempt-ownership',
        counts: { ...emptyCounts(), notices: 1, attempts: 1 },
      }),
    };
  }
  return { ok: true, id: row.id };
}

function judgePublication(rows, operationId) {
  if (rows.length === 0) {
    return {
      ok: false,
      result: result({
        observed: false,
        status: 'BLOCKED',
        code: 'missing-publication',
        counts: { ...emptyCounts(), notices: 1, attempts: 1, publications: 0 },
      }),
    };
  }
  if (rows.length !== 1) {
    return {
      ok: false,
      result: result({
        observed: false,
        status: 'FAIL',
        code: 'duplicate-publication',
        counts: {
          ...emptyCounts(),
          notices: 1,
          attempts: 1,
          publications: rows.length,
        },
      }),
    };
  }
  const row = rows[0];
  if (!isRow(row) || row.generation_id !== operationId) {
    return {
      ok: false,
      result: result({
        observed: false,
        status: 'FAIL',
        code: 'publication-mismatch',
        counts: { ...emptyCounts(), notices: 1, attempts: 1, publications: 1 },
      }),
    };
  }
  if (row.state === 'pending') {
    return {
      ok: false,
      result: result({
        observed: false,
        status: 'BLOCKED',
        code: 'publication-pending',
        counts: { ...emptyCounts(), notices: 1, attempts: 1, publications: 1 },
      }),
    };
  }
  if (row.state !== 'published') {
    return {
      ok: false,
      result: result({
        observed: false,
        status: 'FAIL',
        code: 'publication-not-published',
        counts: { ...emptyCounts(), notices: 1, attempts: 1, publications: 1 },
      }),
    };
  }
  return { ok: true };
}

function judgePassages(rows) {
  const sequences = [];
  for (const row of rows) {
    if (!isRow(row) || !Number.isInteger(row.sequence)) {
      return {
        ok: false,
        result: result({
          observed: false,
          status: 'FAIL',
          code: 'inconsistent-passages',
          counts: passageCounts(rows.length),
        }),
      };
    }
    sequences.push(row.sequence);
  }
  if (sequences.length === 1 && sequences[0] === 1) {
    return {
      ok: false,
      result: result({
        observed: false,
        status: 'BLOCKED',
        code: 'incomplete-passages',
        counts: passageCounts(1),
      }),
    };
  }
  if (sequences.length === 0) {
    return {
      ok: false,
      result: result({
        observed: false,
        status: 'BLOCKED',
        code: 'missing-passages',
        counts: passageCounts(0),
      }),
    };
  }
  const exact =
    sequences.length === 2 && sequences[0] === 1 && sequences[1] === 2;
  if (!exact) {
    return {
      ok: false,
      result: result({
        observed: false,
        status: 'FAIL',
        code: 'inconsistent-passages',
        counts: passageCounts(sequences.length),
      }),
    };
  }
  return { ok: true };
}

function passageCounts(passages) {
  return { notices: 1, attempts: 1, publications: 1, passages };
}

function emptyCounts() {
  return { notices: 0, attempts: 0, publications: 0, passages: 0 };
}

function result(body) {
  const receipt = {
    observed: body.observed,
    status: body.status,
    code: body.code,
    evidence: EVIDENCE,
    counts: body.counts,
  };
  if (body.noticeId) receipt.noticeId = body.noticeId;
  if (body.attemptId) receipt.attemptId = body.attemptId;
  if (body.publicationState) receipt.publicationState = body.publicationState;
  return receipt;
}

function isUuid(value) {
  return typeof value === 'string' && UUID.test(value);
}

function isRow(value) {
  return value !== null && typeof value === 'object';
}
