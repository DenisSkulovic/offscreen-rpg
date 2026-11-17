import assert from 'node:assert/strict';
import { compareRetrieval, compareSet, COMPARE_SCHEMA } from './retrieval-compare.mjs';

const PIN = 'a'.repeat(40);
const OTHER = 'b'.repeat(40);
const CLEAN = {
  'docs/rules.md#award': 'The engine awards the reward.',
  'packages/application/src/settle.ts#once': 'settle once',
  'packages/storyteller/src/publish.ts#send': 'publish the passage',
  'docs/page.md#café': 'unicode heading',
};

function arm(id, extra) {
  return {
    id,
    tool: id === 'A' ? 'wiki-find' : 'recorded-candidate',
    toolVersion: '0',
    corpus: 'fixture',
    sha: PIN,
    indexSha: PIN,
    dirty: false,
    hits: [],
    ...extra,
  };
}

function hit(ref, extra = {}) {
  return {
    rank: 1,
    ref,
    authority: 'normative',
    lines: [1, 2],
    bytes: 400,
    text: CLEAN[ref] ?? 'pinned text',
    ...extra,
  };
}

function record(caseId, gold, arms) {
  return { schema: COMPARE_SCHEMA, caseId, query: caseId, sha: PIN, gold, arms };
}

const readSpan = (hit) => CLEAN[hit.ref] ?? null;

export function runRetrievalCompareSelfTest() {
  const exact = compareRetrieval(
    record('exact', { owners: [{ ref: 'docs/rules.md#award', authority: 'normative' }], excerpts: { 'docs/rules.md#award': 'awards the reward' } }, [
      arm('A', { hits: [hit('docs/rules.md#award')] }),
      arm('B', { hits: [hit('docs/rules.md#award')] }),
    ]),
    { readSpan },
  );
  assert.equal(exact.comparable, true);
  assert.equal(exact.arms.every((item) => item.passed), true);
  assert.equal(exact.arms[0].completeAnswerAt5, 1);

  const wrong = compareRetrieval(
    record('wrong-owner', { owners: [{ ref: 'docs/rules.md#award', authority: 'normative' }] }, [
      arm('A', { hits: [hit('docs/rules.md#award')] }),
      arm('B', { hits: [hit('docs/other.md#decoy', { bytes: 12 })] }),
    ]),
    { readSpan },
  );
  assert.equal(wrong.arms[1].passed, false);
  assert.equal(wrong.arms[1].ownerRecallAt5, 0);
  assert.ok(wrong.arms[1].bytes < wrong.arms[0].bytes);
  assert.equal('winner' in wrong, false);

  const mismatch = compareRetrieval(
    record('stale-sha', { owners: [{ ref: 'docs/rules.md#award', authority: 'normative' }] }, [
      arm('A', { hits: [hit('docs/rules.md#award')] }),
      arm('B', { sha: OTHER, hits: [hit('docs/rules.md#award', { bytes: 8 })] }),
    ]),
    { readSpan },
  );
  assert.equal(mismatch.comparable, false);
  assert.equal(mismatch.reason, 'revision-mismatch');
  assert.equal('arms' in mismatch, false);

  const staleIndex = compareRetrieval(
    record('stale-index', { owners: [{ ref: 'docs/rules.md#award', authority: 'normative' }], excerpts: { 'docs/rules.md#award': 'awards the reward' } }, [
      arm('A', { hits: [hit('docs/rules.md#award')] }),
      arm('B', { indexSha: OTHER, indexAge: 'old', hits: [hit('docs/rules.md#award')] }),
    ]),
    { readSpan },
  );
  assert.equal(staleIndex.arms[1].stale, true);
  assert.equal(staleIndex.arms[1].passed, false);
  assert.equal(staleIndex.arms[1].completeAnswerAt5, 0);

  const dirty = compareRetrieval(
    record('dirty', {
      owners: [{ ref: 'docs/rules.md#award', authority: 'normative' }],
      excerpts: { 'docs/rules.md#award': 'only on the dirty worktree' },
    }, [
      arm('A', { hits: [hit('docs/rules.md#award')] }),
      arm('B', { dirty: true, hits: [hit('docs/rules.md#award', { text: 'only on the dirty worktree', bytes: 15 })] }),
    ]),
    { readSpan },
  );
  assert.equal(dirty.arms[1].dirty, true);
  assert.equal(dirty.arms[1].passed, false);

  const missing = compareRetrieval(
    record('absent', { absent: true, owners: [] }, [
      arm('A', { hits: [] }),
      arm('B', { hits: [hit('docs/proposal.md#idea', { authority: 'proposal', bytes: 9 })] }),
    ]),
    { readSpan },
  );
  assert.equal(missing.arms[0].refusal, true);
  assert.equal(missing.arms[0].passed, true);
  assert.equal(missing.arms[1].passed, false);
  assert.equal(missing.arms[1].wrongAuthority, 1);

  const decoy = compareRetrieval(
    record('decoy', { owners: [{ ref: 'docs/rules.md#award', authority: 'normative' }] }, [
      arm('A', { hits: [hit('docs/rules.md#award')] }),
      arm('B', { hits: [hit('work/designs/open/idea.md#draft', { authority: 'historic', bytes: 11 })] }),
    ]),
    { readSpan },
  );
  assert.equal(decoy.arms[1].passed, false);
  assert.equal(decoy.arms[1].wrongAuthority, 1);

  const unicode = compareRetrieval(
    record('unicode', { owners: [{ ref: 'docs/page.md#café', authority: 'normative' }] }, [
      arm('A', { hits: [hit('docs/page.md#café')] }),
      arm('B', { hits: [hit('docs/page.md#cafe')] }),
    ]),
    { readSpan },
  );
  assert.equal(unicode.arms[0].passed, true);
  assert.equal(unicode.arms[1].passed, false);

  const cross = compareRetrieval(
    record('cross-package', {
      owners: [
        { ref: 'packages/application/src/settle.ts#once', authority: 'source' },
        { ref: 'packages/storyteller/src/publish.ts#send', authority: 'source' },
      ],
    }, [
      arm('A', { hits: [hit('packages/application/src/settle.ts#once', { authority: 'source' }), hit('packages/storyteller/src/publish.ts#send', { authority: 'source', rank: 2 })] }),
      arm('B', { hits: [hit('packages/application/src/settle.ts#once', { authority: 'source' })] }),
    ]),
    { readSpan },
  );
  assert.equal(cross.arms[0].completeAnswerAt5, 1);
  assert.equal(cross.arms[1].completeAnswerAt5, 0);
  assert.equal(cross.arms[1].ownerRecallAt5, 0.5);

  const summary = compareSet([
    record('exact', { owners: [{ ref: 'docs/rules.md#award', authority: 'normative' }], excerpts: { 'docs/rules.md#award': 'awards the reward' } }, [
      arm('A', { hits: [hit('docs/rules.md#award')] }),
      arm('B', { hits: [hit('docs/other.md#decoy', { bytes: 12 })] }),
    ]),
  ], { readSpan });
  assert.equal(summary.arms.find((item) => item.id === 'B').passed, 0);
  assert.equal(JSON.stringify(summary).includes('"winner"'), false);
  assert.equal(JSON.stringify(summary).includes('"score"'), false);

  console.log(
    'Retrieval-compare self-test passed: exact text, wrong owner, revision mismatch, stale index, dirty text, refusal, proposal decoy, unicode heading, cross-package recall. No combined score.',
  );
}
