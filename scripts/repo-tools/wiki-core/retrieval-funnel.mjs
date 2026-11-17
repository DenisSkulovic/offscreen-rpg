export const FUNNEL_SCHEMA = 'repo.retrieval-funnel.v1';

const SHA = /^[0-9a-f]{40}$/;

export function normPath(value) {
  return String(value ?? '').replaceAll('\\', '/');
}

export function samePath(hitPath, ownerPath) {
  const value = normPath(hitPath);
  const owner = normPath(ownerPath);
  return Boolean(owner) && (value === owner || value.endsWith(`/${owner}`));
}

function blob(hit) {
  return `${normPath(hit.path)}\n${hit.text ?? ''}\n${hit.symbol ?? ''}`;
}

function keyOf(hit) {
  const path = normPath(hit.path);
  if (hit.symbol) return `${path}#${hit.symbol}`;
  const line = Number(hit.line) || 0;
  const bucket = line > 0 ? Math.floor((line - 1) / 20) : 0;
  return `${path}@${bucket}`;
}

export function fuseCandidates(groups, options = {}) {
  const k = options.k ?? 60;
  const cap = options.cap ?? 30;
  const merged = new Map();
  for (const group of groups ?? []) {
    (group.hits ?? []).forEach((hit, index) => {
      const key = keyOf(hit);
      const rank = index + 1;
      const weight = 1 / (k + rank);
      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, {
          ...hit,
          path: normPath(hit.path),
          origins: [group.id],
          rrf: weight,
          bestRank: rank,
        });
        return;
      }
      existing.rrf += weight;
      existing.bestRank = Math.min(existing.bestRank, rank);
      if (!existing.origins.includes(group.id)) existing.origins.push(group.id);
      if (!existing.authority && hit.authority) existing.authority = hit.authority;
      if (!existing.notice && hit.notice) existing.notice = hit.notice;
      if (!existing.match && hit.match) existing.match = hit.match;
      if ((hit.text ?? '').length > (existing.text ?? '').length) existing.text = hit.text;
    });
  }
  return [...merged.values()]
    .sort((a, b) => b.rrf - a.rrf || a.bestRank - b.bestRank || a.path.localeCompare(b.path))
    .slice(0, cap);
}

function matches(hit, role) {
  if (!role || role.adjudication) return false;
  if (role.notPath && samePath(hit.path, role.notPath)) return false;
  if (!samePath(hit.path, role.path)) return false;
  if (role.symbol && !blob(hit).includes(role.symbol)) return false;
  return true;
}

function authorityOk(hit, role) {
  if (!role.authority) return true;
  if (role.authority === 'proposal') return hit.authority === 'proposal' || hit.notice === 'NOT SELECTED';
  return hit.authority !== 'proposal' && hit.authority !== 'historic';
}

export function scoreCandidates(candidates, item) {
  const list = (candidates ?? []).slice(0, 30);
  if (item.freshness) {
    return { unknown: true, comparable: false, reason: 'freshness-only', countsTowardVerified: false };
  }
  if (item.forbiddenPath) {
    const leaked = list.some((hit) => normPath(hit.path).includes(item.forbiddenPath) || blob(hit).includes(item.secret ?? ''));
    return { unknown: false, leaked, evidenceAt5: !leaked, abstained: !leaked, countsTowardVerified: item.review === 'reviewed' };
  }
  if (item.absent) {
    const forbidden = String(item.forbidden ?? '').toLowerCase();
    const mentions = forbidden ? list.filter((hit) => blob(hit).toLowerCase().includes(forbidden)) : [];
    const existenceClaim = mentions.some((hit) => {
      const code = /\.(?:ts|tsx|mjs|cjs|js)$/i.test(normPath(hit.path));
      const denial = /not installed|not authorized|proposed, not installed/i.test(blob(hit));
      return code && !denial;
    });
    return {
      unknown: false,
      recallAt5: null,
      recallAt20: null,
      recallAt30: null,
      generationMiss: false,
      buried: false,
      evidenceAt5: !existenceClaim,
      abstained: !existenceClaim,
      existenceClaim,
      mentions: mentions.length,
      noise: list.length,
      countsTowardVerified: item.review === 'reviewed',
    };
  }
  const required = (item.roles ?? []).filter((role) => !role.adjudication);
  const found = required.map((role) => {
    const row = list.findIndex((hit) => matches(hit, role));
    return { role: role.id, rank: row === -1 ? null : row + 1 };
  });
  const ranks = found.map((row) => row.rank).filter((rank) => rank !== null).sort((a, b) => a - b);
  const best = ranks[0] ?? null;
  const top = list.slice(0, 5);
  const archiveFirst = Boolean(top[0] && normPath(top[0].path).includes('work/changes/archive/'));
  const statusOk = !item.status || top.some((hit) => normPath(hit.path) === 'STATUS.md' || hit.match === 'status-companion');
  const evidenceAt5 = required.some((role) => top.some((hit) => matches(hit, role) && authorityOk(hit, role))) && !archiveFirst && statusOk;
  return {
    unknown: false,
    found,
    bestRank: best,
    recallAt5: best !== null && best <= 5,
    recallAt20: best !== null && best <= 20,
    recallAt30: best !== null && best <= 30,
    generationMiss: best === null,
    buried: best !== null && best > 5 && best <= 30,
    evidenceAt5,
    archiveFirst,
    statusOk,
    countsTowardVerified: item.review === 'reviewed',
  };
}

function armFence(arm, record) {
  if (!arm || arm.status === 'not-configured') return 'not-configured';
  if (arm.status === 'uncomparable') return arm.reason ?? 'uncomparable';
  if (record.dirty === true || arm.dirty === true) return 'dirty-worktree';
  if (!SHA.test(record.sha ?? '') || (arm.sha && arm.sha !== record.sha)) return 'revision-mismatch';
  if (arm.indexSha && arm.indexSha !== record.sha) return 'stale-index';
  if (arm.status && arm.status !== 'ran') return arm.status;
  return null;
}

export function evaluateFunnel(record) {
  if (!record || record.schema !== FUNNEL_SCHEMA) throw new Error(`Expected schema ${FUNNEL_SCHEMA}.`);
  const arms = record.arms ?? {};
  const fences = Object.fromEntries(Object.entries(arms).map(([id, arm]) => [id, armFence(arm, record)]));
  const usable = Object.entries(arms)
    .filter(([id, arm]) => fences[id] === null && arm?.status !== 'uncomparable' && arm?.status !== 'not-configured')
    .map(([id, arm]) => ({ id, hits: arm.hits ?? [] }));
  const exploratoryGroups = Object.entries(arms)
    .filter(([, arm]) => arm?.status === 'ran')
    .map(([id, arm]) => ({ id, hits: arm.hits ?? [] }));
  const cases = (record.cases ?? []).map((item) => {
    const perArm = Object.fromEntries(Object.entries(arms).map(([id, arm]) => {
      const score = scoreCandidates(arm?.hits ?? [], item);
      return [id, fences[id] ? { unknown: true, reason: fences[id], exploratory: score } : score];
    }));
    const comparable = fences.A === null && fences.B === null;
    const fusedHits = fuseCandidates(comparable ? usable : exploratoryGroups);
    const fusedScore = scoreCandidates(fusedHits, item);
    const preview = fusedHits.slice(0, 5).map((hit) => ({ path: hit.path, line: hit.line ?? null, origins: hit.origins }));
    return {
      id: item.id,
      review: item.review ?? 'unreviewed',
      arms: perArm,
      fused: comparable
        ? { ...fusedScore, hits: preview }
        : { unknown: true, reason: fences.A || fences.B || 'uncomparable', exploratory: fusedScore, hits: preview },
    };
  });
  const verified = cases.filter((item) => item.review === 'reviewed' && item.fused.countsTowardVerified && item.fused.unknown !== true);
  return {
    schema: FUNNEL_SCHEMA,
    sha: record.sha ?? null,
    dirty: record.dirty === true,
    fences,
    verifiedCount: verified.length,
    diagnosticOnly: verified.length === 0,
    cases,
  };
}
