import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseMarkdownDocument } from './markdown.mjs';
import { buildWikiModel } from './model.mjs';
import { rankPages } from './search.mjs';
import { summarizeHopper, summarizeHopperV2 } from './hopper.mjs';

const HISTORIC = new Set(['historic', 'evidence']);
const PROPOSED = new Set(['open-design', 'open-change']);
const INSTRUMENT_PREFIXES = [
  'scripts/repo-tools/wiki-benchmarks/',
  'work/designs/open/wiki-health/',
  'work/changes/open/2026-11-16--wiki02-static-retrieval-and-hopper/',
  'work/changes/open/2026-11-16--wiki03-isolated-agent-evaluation/',
  'work/changes/open/2026-11-16--wiki05-benchmark-validity/',
];

function isBenchmarkInstrument(rel) {
  return INSTRUMENT_PREFIXES.some((prefix) => rel.startsWith(prefix));
}

export function dcg(grades) {
  return grades.reduce((sum, grade, index) => sum + grade / Math.log2(index + 2), 0);
}

export function ndcgAt(rankedGrades, idealGrades, k) {
  const actual = dcg(rankedGrades.slice(0, k));
  const ideal = dcg([...idealGrades].sort((a, b) => b - a).slice(0, k));
  if (ideal === 0) return 0;
  return actual / ideal;
}

/** Exponential gain. Rank 1 uses log2(2). One grade per unique page. */
export function pageGain(grade) {
  return 2 ** grade - 1;
}

export function pageDcg(grades) {
  return grades.reduce((sum, grade, index) => sum + pageGain(grade) / Math.log2(index + 2), 0);
}

export function pageNdcgAt(rankedGrades, idealGrades, k) {
  const actual = pageDcg(rankedGrades.slice(0, k));
  const ideal = pageDcg([...idealGrades].sort((a, b) => b - a).slice(0, k));
  if (ideal === 0) return 0;
  return actual / ideal;
}

function uniquePaths(owners, role) {
  const paths = [];
  for (const owner of owners) {
    if (role && owner.role !== role) continue;
    if (!paths.includes(owner.path)) paths.push(owner.path);
  }
  return paths;
}

/**
 * Page-level retrieval. CompleteAnswer@k is the old all-or-nothing "recall".
 * ownerRecall@k is the fraction of distinct mandatory pages. MRR is the first relevant page.
 */
export function retrievalMetrics(rankedPaths, owners) {
  const mandatory = uniquePaths(owners, 'mandatory');
  const relevant = uniquePaths(owners);
  const primary = mandatory[0] ?? null;
  const top = (k) => rankedPaths.slice(0, k);
  const complete = (k) => (mandatory.length > 0 && mandatory.every((path) => top(k).includes(path)) ? 1 : 0);
  const recall = (k) => {
    if (mandatory.length === 0) return 0;
    return mandatory.filter((path) => top(k).includes(path)).length / mandatory.length;
  };
  const first = rankedPaths.findIndex((path) => relevant.includes(path));
  const lastMandatoryRanks = mandatory
    .map((path) => rankedPaths.indexOf(path) + 1)
    .filter((rank) => rank > 0);
  const completionRank = lastMandatoryRanks.length === mandatory.length ? Math.max(...lastMandatoryRanks) : null;
  const gradeOf = new Map();
  for (const owner of owners) gradeOf.set(owner.path, Math.max(gradeOf.get(owner.path) ?? 0, owner.grade ?? 0));
  const rankedGrades = top(5).map((path) => gradeOf.get(path) ?? 0);
  const ideal = [...gradeOf.values()];
  return {
    mandatoryPages: mandatory.length,
    mandatoryHitsAt5: mandatory.filter((path) => top(5).includes(path)).length,
    completeAnswerAt1: complete(1),
    completeAnswerAt5: complete(5),
    completeAnswerAt10: complete(10),
    ownerRecallAt5: recall(5),
    ownerRecallAt10: recall(10),
    primaryRecallAt5: primary !== null && top(5).includes(primary) ? 1 : 0,
    mrr: first === -1 ? 0 : 1 / (first + 1),
    completionReciprocal: completionRank ? 1 / completionRank : 0,
    ndcgAt5: Number(pageNdcgAt(rankedGrades, ideal, 5).toFixed(4)),
    pageGrades: [...gradeOf.entries()].map(([path, grade]) => ({ path, grade })),
  };
}

function percentile(sorted, p) {
  if (sorted.length === 0) return null;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

function shortest(adjacency, start, goal) {
  if (start === goal) return [start];
  const queue = [start];
  const previous = new Map([[start, null]]);
  while (queue.length > 0) {
    const current = queue.shift();
    for (const next of adjacency.get(current) ?? []) {
      if (previous.has(next)) continue;
      previous.set(next, current);
      if (next === goal) {
        const path = [goal];
        let cursor = current;
        while (cursor) {
          path.push(cursor);
          cursor = previous.get(cursor);
        }
        return path.reverse();
      }
      queue.push(next);
    }
  }
  return null;
}

function headingTextMap(root, pages) {
  const map = new Map();
  for (const rel of pages) {
    let text;
    try {
      text = readFileSync(path.join(root, ...rel.split('/')), 'utf8');
    } catch {
      continue;
    }
    const parsed = parseMarkdownDocument(text);
    for (const heading of parsed.headings) map.set(`${rel}#${heading.id}`, heading.text);
    map.set(`${rel}#`, parsed.headings[0]?.text ?? '');
  }
  return map;
}

function pageRecord(root, rel, kind) {
  const text = readFileSync(path.join(root, ...rel.split('/')), 'utf8');
  const parsed = parseMarkdownDocument(text);
  const title = parsed.headings.find((heading) => heading.depth === 1)?.text ?? rel;
  const headings = parsed.headings
    .filter((heading) => heading.depth === 2 || heading.depth === 3)
    .map((heading) => heading.text)
    .join('\n');
  const body = text.replace(/```[\s\S]*?```/g, ' ');
  return { id: rel, kind, title, headings, body, headingSet: new Set(parsed.headings.map((heading) => heading.text)) };
}

export function validateCases(root, cases) {
  const errors = [];
  for (const item of cases) {
    const hoppers = item.owners.filter((owner) => owner.hopper);
    if (hoppers.length !== 1) errors.push(`${item.id}: expected exactly one hopper target`);
    for (const owner of item.owners) {
      const abs = path.join(root, ...owner.path.split('/'));
      let parsed;
      try {
        parsed = parseMarkdownDocument(readFileSync(abs, 'utf8'));
      } catch {
        errors.push(`${item.id}: missing ${owner.path}`);
        continue;
      }
      if (!parsed.headings.some((heading) => heading.text === owner.headingText)) {
        errors.push(`${item.id}: heading not found in ${owner.path}: ${owner.headingText}`);
      }
    }
  }
  return errors;
}

function normativeKind(kind, rel) {
  if (kind.startsWith('canonical')) return true;
  return ['STATUS.md', 'AGENTS.md', 'ROADMAP.md', 'README.md', 'work/changes/README.md'].includes(rel);
}

/**
 * @param {string} root
 * @param {object[]} cases
 * @param {{ repoSha?: string|null, dirty?: boolean|null, seed?: number, trials?: number }} meta
 */
export function runStaticBenchmark(root, cases, meta) {
  const model = buildWikiModel(root, meta);
  const kindOf = new Map(model.graph.nodes.map((node) => [node.id, node.kind]));
  const adjacency = new Map();
  for (const edge of model.graph.edges) {
    if (edge.kind === 'image' || edge.kind === 'observed-in') continue;
    if (!adjacency.has(edge.from)) adjacency.set(edge.from, new Set());
    adjacency.get(edge.from).add(edge.to);
  }
  const indexedIds = model.graph.nodes
    .map((node) => node.id)
    .filter((id) => id.endsWith('.md') || id.endsWith('.mdc'));
  const records = [];
  for (const id of indexedIds) {
    try {
      records.push(pageRecord(root, id, kindOf.get(id) ?? 'other-page'));
    } catch {
      // Destination nodes that are not readable stay out of the index.
    }
  }
  const recordOf = new Map(records.map((record) => [record.id, record]));
  const headingText = headingTextMap(root, indexedIds.filter((id) => recordOf.has(id)));
  const hardErrors = model.issues.filter((item) => item.severity === 'error');
  const rows = [];
  for (const item of cases) {
    const mandatory = item.owners.filter((owner) => owner.role === 'mandatory');
    const hopperOwner = item.owners.find((owner) => owner.hopper);
    const routes = item.owners.map((owner) => {
      const route = shortest(adjacency, item.entrypoint, owner.path);
      const record = recordOf.get(owner.path);
      return {
        path: owner.path,
        role: owner.role,
        reachable: Boolean(route),
        hops: route ? route.length - 1 : null,
        route,
        headingPresent: Boolean(record?.headingSet.has(owner.headingText)),
      };
    });
    const needsProposal = item.owners.some((owner) => PROPOSED.has(kindOf.get(owner.path)));
    const corpus = records.filter((record) => {
      if (isBenchmarkInstrument(record.id)) return false;
      if (HISTORIC.has(record.kind)) return false;
      if (needsProposal) return normativeKind(record.kind, record.id) || PROPOSED.has(record.kind);
      return normativeKind(record.kind, record.id);
    });
    const ranked = rankPages(corpus, item.question);
    const gradeOf = new Map(item.owners.map((owner) => [owner.path, owner.grade]));
    const top5 = ranked.slice(0, 5);
    const top10 = ranked.slice(0, 10);
    const mandatoryHits = mandatory.filter((owner) => top5.some((row) => row.path === owner.path));
    const recallAt5 = mandatoryHits.length === mandatory.length ? 1 : 0;
    const recallAt1 = mandatory.every((owner) => ranked[0]?.path === owner.path) ? 1 : 0;
    const recallAt10 = mandatory.every((owner) => top10.some((row) => row.path === owner.path)) ? 1 : 0;
    const firstMandatory = mandatory
      .map((owner) => ranked.findIndex((row) => row.path === owner.path) + 1)
      .filter((rank) => rank > 0)
      .sort((a, b) => a - b)[0];
    const reciprocal = recallAt5 === 1 && firstMandatory ? 1 / firstMandatory : 0;
    const rankedGrades = top5.map((row) => gradeOf.get(row.path) ?? 0);
    const ndcg = ndcgAt(rankedGrades, item.owners.map((owner) => owner.grade), 5);
    const wrongAuthority = top5.some((row) => {
      if (HISTORIC.has(row.kind)) return true;
      if (!needsProposal && PROPOSED.has(row.kind)) return true;
      return false;
    });
    const hopper = summarizeHopper({
      start: item.entrypoint,
      edges: model.graph.edges,
      headingText,
      question: item.question,
      target: hopperOwner.path,
      seed: meta.seed ?? 1,
      trials: meta.trials ?? 100,
    });
    rows.push({
      id: item.id,
      category: item.category,
      question: item.question,
      routes,
      routeSuccess: routes.filter((route) => route.role === 'mandatory').every((route) => route.reachable),
      recallAt1,
      recallAt5,
      recallAt10,
      reciprocal,
      ndcgAt5: Number(ndcg.toFixed(4)),
      wrongAuthority,
      top5: top5.map((row) => ({ path: row.path, kind: row.kind, score: row.score })),
      hopper: {
        greedyHit: hopper.greedy.hit,
        greedyHops: hopper.greedy.hops,
        greedyTrail: hopper.greedy.trail,
        stochasticHitAt3: hopper.stochastic.hitAt3,
        stochasticHitAt6: hopper.stochastic.hitAt6,
        stochasticMedianHops: hopper.stochastic.medianHopsWhenHit,
        stochasticLoops: hopper.stochastic.loops,
        stochasticBacktracks: hopper.stochastic.backtracks,
        stochasticWrongAuthority: hopper.stochastic.wrongAuthority,
        randomHitAt6: hopper.random.hitAt6,
      },
    });
  }
  const mean = (values) => (values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length);
  const hops = rows.flatMap((row) =>
    row.routes.filter((route) => route.role === 'mandatory' && route.hops !== null).map((route) => route.hops),
  );
  hops.sort((a, b) => a - b);
  const byCategory = {};
  for (const category of [...new Set(rows.map((row) => row.category))]) {
    const subset = rows.filter((row) => row.category === category);
    byCategory[category] = {
      cases: subset.length,
      routeSuccess: mean(subset.map((row) => (row.routeSuccess ? 1 : 0))),
      recallAt5: mean(subset.map((row) => row.recallAt5)),
      mrr: mean(subset.map((row) => row.reciprocal)),
      ndcgAt5: mean(subset.map((row) => row.ndcgAt5)),
      hopperHitAt6: mean(subset.map((row) => row.hopper.stochasticHitAt6)),
    };
  }
  return {
    schema: 'wiki.static.v1',
    datasetVersion: 'wiki-static-v1',
    lexer: 'wiki-lexer-v1',
    repoSha: meta.repoSha ?? null,
    dirty: meta.dirty ?? null,
    seed: meta.seed ?? 1,
    trials: meta.trials ?? 100,
    benchmarkStatus: hardErrors.length > 0 ? 'blocked-by-graph-integrity' : 'measured',
    indexExclusions: INSTRUMENT_PREFIXES,
    graphHardErrors: hardErrors.map((item) => ({ code: item.code, path: item.path })),
    cases: rows.length,
    independentReview: false,
    metrics: {
      routeSuccess: mean(rows.map((row) => (row.routeSuccess ? 1 : 0))),
      hopMean: mean(hops),
      hopMedian: percentile(hops, 50),
      hopP95: percentile(hops, 95),
      recallAt1: mean(rows.map((row) => row.recallAt1)),
      recallAt5: mean(rows.map((row) => row.recallAt5)),
      recallAt10: mean(rows.map((row) => row.recallAt10)),
      mrr: mean(rows.map((row) => row.reciprocal)),
      ndcgAt5: mean(rows.map((row) => row.ndcgAt5)),
      wrongAuthorityAt5: mean(rows.map((row) => (row.wrongAuthority ? 1 : 0))),
      hopperGreedyHit: mean(rows.map((row) => (row.hopper.greedyHit ? 1 : 0))),
      hopperHitAt3: mean(rows.map((row) => row.hopper.stochasticHitAt3)),
      hopperHitAt6: mean(rows.map((row) => row.hopper.stochasticHitAt6)),
      randomHitAt6: mean(rows.map((row) => row.hopper.randomHitAt6)),
    },
    byCategory,
    failures: rows
      .filter((row) => !row.routeSuccess || row.recallAt5 === 0 || row.hopper.stochasticHitAt6 < 0.5)
      .map((row) => row.id),
    rows,
  };
}

function corpusFor(records, mode, needsProposal) {
  return records.filter((record) => {
    if (isBenchmarkInstrument(record.id)) return false;
    if (mode === 'adversarial') return true;
    if (HISTORIC.has(record.kind)) return false;
    if (mode === 'proposal-aware') return normativeKind(record.kind, record.id) || PROPOSED.has(record.kind);
    if (needsProposal) return normativeKind(record.kind, record.id) || PROPOSED.has(record.kind);
    return normativeKind(record.kind, record.id);
  });
}

function routeSet(adjacency, entrypoint, owners) {
  return owners.map((owner) => {
    const route = shortest(adjacency, entrypoint, owner.path);
    return {
      path: owner.path,
      role: owner.role,
      reachable: Boolean(route),
      hops: route ? route.length - 1 : null,
      route,
    };
  });
}

/**
 * Honest page-level metrics. Does not rename v1 fields. Graph hard errors still block a success claim.
 */
export function runStaticBenchmarkV2(root, cases, meta) {
  const model = buildWikiModel(root, meta);
  const kindOf = new Map(model.graph.nodes.map((node) => [node.id, node.kind]));
  const adjacency = new Map();
  for (const edge of model.graph.edges) {
    if (edge.kind === 'image' || edge.kind === 'observed-in') continue;
    if (!adjacency.has(edge.from)) adjacency.set(edge.from, new Set());
    adjacency.get(edge.from).add(edge.to);
  }
  const indexedIds = model.graph.nodes
    .map((node) => node.id)
    .filter((id) => id.endsWith('.md') || id.endsWith('.mdc'));
  const records = [];
  for (const id of indexedIds) {
    try {
      records.push(pageRecord(root, id, kindOf.get(id) ?? 'other-page'));
    } catch {
      // Unreadable destinations stay out of the index.
    }
  }
  const recordOf = new Map(records.map((record) => [record.id, record]));
  const headingText = headingTextMap(root, indexedIds.filter((id) => recordOf.has(id)));
  const hardErrors = model.issues.filter((item) => item.severity === 'error');
  const rows = [];
  for (const item of cases) {
    const needsProposal = item.owners.some((owner) => PROPOSED.has(kindOf.get(owner.path)));
    const compoundStatus = item.owners.some((owner) => owner.path === 'STATUS.md');
    const primaryCorpus = corpusFor(records, needsProposal ? 'proposal-aware' : 'normative', needsProposal);
    const adversarial = corpusFor(records, 'adversarial', needsProposal);
    const ranked = rankPages(primaryCorpus, item.question);
    const rankedAdversarial = rankPages(adversarial, item.question);
    const metrics = retrievalMetrics(ranked.map((row) => row.path), item.owners);
    const adversarialTop = rankedAdversarial.slice(0, 5);
    const historicExposed = adversarialTop.some((row) => HISTORIC.has(row.kind));
    const proposedInTop = ranked.slice(0, 5).filter((row) => PROPOSED.has(row.kind));
    const mandatoryProposed = item.owners.filter(
      (owner) => owner.role === 'mandatory' && PROPOSED.has(kindOf.get(owner.path)),
    );
    const docsRoutes = routeSet(adjacency, item.entrypoint, item.owners);
    const docsRouteSuccess = docsRoutes.filter((route) => route.role === 'mandatory').every((route) => route.reachable);
    const agentRoutes = item.id === 'A06' ? routeSet(adjacency, 'AGENTS.md', item.owners) : null;
    const labelHopper = summarizeHopperV2({
      start: item.entrypoint,
      edges: model.graph.edges,
      headingText,
      question: item.question,
      target: item.owners.find((owner) => owner.hopper).path,
      seed: meta.seed ?? 1,
      trials: meta.trials ?? 100,
      contextMode: 'label',
    });
    const rowHopper = summarizeHopperV2({
      start: item.entrypoint,
      edges: model.graph.edges,
      headingText,
      question: item.question,
      target: item.owners.find((owner) => owner.hopper).path,
      seed: meta.seed ?? 1,
      trials: meta.trials ?? 100,
      contextMode: 'row',
    });
    rows.push({
      id: item.id,
      category: item.category,
      question: item.question,
      compoundStatus,
      corpus: needsProposal ? 'proposal-aware' : 'normative',
      ...metrics,
      proposedSupport: proposedInTop.map((row) => row.path),
      proposedIsMandatoryOwner: mandatoryProposed.map((owner) => owner.path),
      authority: {
        normative: {
          evaluated: false,
          reason: 'Historic and evidence pages are excluded before ranking, so this lane does not measure exposure.',
        },
        adversarial: {
          evaluated: true,
          historicCandidatesPresent: true,
          historicInTop5: historicExposed,
          top5: adversarialTop.map((row) => ({ path: row.path, kind: row.kind })),
        },
      },
      docsRouteSuccess,
      docsRouteCounted: item.id !== 'A06',
      routes: docsRoutes,
      agentWorkflow: agentRoutes
        ? {
            entrypoint: 'AGENTS.md',
            routeSuccess: agentRoutes.filter((route) => route.role === 'mandatory').every((route) => route.reachable),
            routes: agentRoutes,
            note: 'AGENTS.md is an independent entry. This does not add a docs-root link.',
          }
        : null,
      hopperLabel: {
        greedyHit: labelHopper.greedy.hit,
        greedyHitAt3: labelHopper.greedy.hitAt3,
        forwardOpens: labelHopper.greedy.forwardOpens,
        stochasticHitAt3: labelHopper.stochastic.hitAt3,
        stochasticHitAt6: labelHopper.stochastic.hitAt6,
        stopped: labelHopper.greedy.stopped,
      },
      hopperRow: {
        greedyHit: rowHopper.greedy.hit,
        greedyHitAt3: rowHopper.greedy.hitAt3,
        forwardOpens: rowHopper.greedy.forwardOpens,
        routeEdges: rowHopper.greedy.routeEdges,
        stochasticHitAt3: rowHopper.stochastic.hitAt3,
        stochasticHitAt6: rowHopper.stochastic.hitAt6,
        backtracks: rowHopper.stochastic.backtracks,
        preventedRevisits: rowHopper.stochastic.preventedRevisits,
        noCandidate: rowHopper.stochastic.noCandidate,
        stopped: rowHopper.greedy.stopped,
      },
    });
  }
  const mean = (values) => (values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length);
  const scored = rows.filter((row) => row.docsRouteCounted);
  const statusRows = rows.filter((row) => row.compoundStatus);
  const mandatoryPages = rows.reduce((sum, row) => sum + row.mandatoryPages, 0);
  const mandatoryHits = rows.reduce((sum, row) => sum + row.mandatoryHitsAt5, 0);
  const byCategory = {};
  for (const category of [...new Set(rows.map((row) => row.category))]) {
    const subset = rows.filter((row) => row.category === category);
    byCategory[category] = {
      cases: subset.length,
      completeAnswerAt5: mean(subset.map((row) => row.completeAnswerAt5)),
      ownerRecallAt5: mean(subset.map((row) => row.ownerRecallAt5)),
      mrr: mean(subset.map((row) => row.mrr)),
      ndcgAt5: mean(subset.map((row) => row.ndcgAt5)),
      hopperRowHitAt3: mean(subset.map((row) => row.hopperRow.stochasticHitAt3)),
    };
  }
  return {
    schema: 'wiki.static.v2',
    datasetVersion: 'wiki-static-v1',
    lexer: 'wiki-lexer-v1',
    gain: '(2^grade - 1) / log2(rank + 1), one max grade per page',
    comparability: 'Not comparable with wiki.static.v1 Recall@5 or MRR. Those names measured complete-answer success and conditional reciprocal rank.',
    repoSha: meta.repoSha ?? null,
    dirty: meta.dirty ?? null,
    seed: meta.seed ?? 1,
    trials: meta.trials ?? 100,
    benchmarkStatus: hardErrors.length > 0 ? 'blocked-by-graph-integrity' : 'measured',
    graphHardErrors: hardErrors.map((item) => ({ code: item.code, path: item.path })),
    cases: rows.length,
    independentReview: false,
    metrics: {
      docsRouteSuccess: mean(scored.map((row) => (row.docsRouteSuccess ? 1 : 0))),
      completeAnswerAt5: mean(rows.map((row) => row.completeAnswerAt5)),
      ownerRecallAt5Macro: mean(rows.map((row) => row.ownerRecallAt5)),
      ownerRecallAt5Micro: mandatoryPages === 0 ? null : mandatoryHits / mandatoryPages,
      primaryRecallAt5: mean(rows.map((row) => row.primaryRecallAt5)),
      mrr: mean(rows.map((row) => row.mrr)),
      completionReciprocal: mean(rows.map((row) => row.completionReciprocal)),
      ndcgAt5: mean(rows.map((row) => row.ndcgAt5)),
      statusCompoundCompleteAt5: mean(statusRows.map((row) => row.completeAnswerAt5)),
      statusCompoundCases: statusRows.length,
      adversarialHistoricInTop5: mean(rows.map((row) => (row.authority.adversarial.historicInTop5 ? 1 : 0))),
      normativeAuthorityEvaluated: false,
      hopperLabelHitAt3: mean(rows.map((row) => row.hopperLabel.stochasticHitAt3)),
      hopperRowHitAt3: mean(rows.map((row) => row.hopperRow.stochasticHitAt3)),
      hopperRowHitAt6: mean(rows.map((row) => row.hopperRow.stochasticHitAt6)),
      hopperRowGreedyHit: mean(rows.map((row) => (row.hopperRow.greedyHit ? 1 : 0))),
    },
    a06: rows.find((row) => row.id === 'A06') ?? null,
    byCategory,
    rows,
  };
}
