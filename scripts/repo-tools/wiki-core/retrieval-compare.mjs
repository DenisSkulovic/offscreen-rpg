import { retrievalMetrics } from './bench.mjs';

export const COMPARE_SCHEMA = 'repo.retrieval-compare.v1';

const DECOY = new Set(['proposal', 'historic', 'open-design', 'open-change', 'evidence']);
const SHA = /^[0-9a-f]{40}$/;

function refOf(hit) {
  return hit.ref ?? hit.symbol ?? null;
}

function isDecoy(authority) {
  return DECOY.has(authority);
}

function acceptedHit(hit, gold, readSpan) {
  const ref = refOf(hit);
  const owner = (gold.owners ?? []).find((item) => item.ref === ref);
  if (!owner || isDecoy(hit.authority)) return false;
  if (owner.authority && hit.authority && owner.authority !== hit.authority) return false;
  const text = readSpan(hit) ?? hit.text ?? '';
  if (!text) return false;
  const excerpt = gold.excerpts?.[ref];
  if (excerpt && !text.includes(excerpt)) return false;
  return true;
}

function scoreArm(arm, record, readSpan) {
  const gold = record.gold ?? {};
  const hits = Array.isArray(arm.hits) ? arm.hits : [];
  const stale = Boolean(arm.indexSha) && arm.indexSha !== record.sha;
  const dirty = arm.dirty === true;
  const blocked = dirty ? 'dirty-worktree' : stale ? 'stale-index' : null;
  const accepted = blocked ? [] : hits.filter((hit) => acceptedHit(hit, gold, readSpan));
  const owners = (gold.owners ?? []).map((owner) => ({
    path: owner.ref,
    role: owner.role ?? 'mandatory',
    grade: owner.grade ?? 1,
  }));
  const metrics = retrievalMetrics(accepted.map(refOf), owners);
  const wrongAuthority = hits.slice(0, 5).filter((hit) => isDecoy(hit.authority)).length;
  const refusal = gold.absent === true && hits.length === 0 && !blocked;
  const firstDecoy = hits[0] && isDecoy(hits[0].authority);
  const passed = !blocked && wrongAuthority === 0 && !firstDecoy && (refusal || (gold.absent !== true && metrics.completeAnswerAt5 === 1));
  return {
    id: arm.id,
    tool: arm.tool ?? null,
    toolVersion: arm.toolVersion ?? null,
    corpus: arm.corpus ?? null,
    sha: arm.sha,
    indexSha: arm.indexSha ?? null,
    indexAge: arm.indexAge ?? null,
    stale,
    dirty,
    blocked,
    completeAnswerAt5: blocked ? 0 : metrics.completeAnswerAt5,
    ownerRecallAt5: blocked ? 0 : metrics.ownerRecallAt5,
    firstGoodRank: metrics.mrr === 0 ? null : Math.round(1 / metrics.mrr),
    wrongAuthority,
    notFound: hits.length === 0,
    refusal,
    bytes: hits.reduce((sum, hit) => sum + (Number(hit.bytes) || 0), 0),
    calls: Number.isInteger(arm.calls) ? arm.calls : hits.length,
    passed,
  };
}

export function compareRetrieval(record, options = {}) {
  if (!record || record.schema !== COMPARE_SCHEMA) {
    throw new Error(`Expected schema ${COMPARE_SCHEMA}.`);
  }
  const readSpan = options.readSpan ?? (() => null);
  const arms = Array.isArray(record.arms) ? record.arms : [];
  if (arms.length < 2) throw new Error('A comparison needs two recorded arms.');
  const shas = [record.sha, ...arms.map((arm) => arm.sha)];
  if (shas.some((sha) => !SHA.test(sha ?? '')) || new Set(shas).size !== 1) {
    return {
      schema: COMPARE_SCHEMA,
      comparable: false,
      reason: 'revision-mismatch',
      caseId: record.caseId ?? null,
      sha: record.sha ?? null,
    };
  }
  return {
    schema: COMPARE_SCHEMA,
    comparable: true,
    caseId: record.caseId ?? null,
    query: record.query ?? null,
    sha: record.sha,
    arms: arms.map((arm) => scoreArm(arm, record, readSpan)),
  };
}

export function compareSet(records, options = {}) {
  const cases = records.map((record) => compareRetrieval(record, options));
  const buckets = new Map();
  for (const item of cases) {
    if (!item.comparable) continue;
    for (const arm of item.arms) {
      const bucket = buckets.get(arm.id) ?? {
        id: arm.id,
        cases: 0,
        completeAnswerAt5: 0,
        ownerRecallAt5: 0,
        wrongAuthority: 0,
        stale: 0,
        dirty: 0,
        bytes: 0,
        calls: 0,
        passed: 0,
      };
      bucket.cases += 1;
      bucket.completeAnswerAt5 += arm.completeAnswerAt5;
      bucket.ownerRecallAt5 += arm.ownerRecallAt5;
      bucket.wrongAuthority += arm.wrongAuthority;
      bucket.stale += arm.stale ? 1 : 0;
      bucket.dirty += arm.dirty ? 1 : 0;
      bucket.bytes += arm.bytes;
      bucket.calls += arm.calls;
      bucket.passed += arm.passed ? 1 : 0;
      buckets.set(arm.id, bucket);
    }
  }
  return {
    schema: COMPARE_SCHEMA,
    cases,
    arms: [...buckets.values()].map((bucket) => ({
      ...bucket,
      completeAnswerAt5: bucket.cases === 0 ? 0 : bucket.completeAnswerAt5 / bucket.cases,
      ownerRecallAt5: bucket.cases === 0 ? 0 : bucket.ownerRecallAt5 / bucket.cases,
    })),
  };
}
