/**
 * Provider-free held-out retrieval exam. Uses the existing finder and reader.
 * A miss stays a miss. This does not call a model or a database, and it does
 * not certify the wiki corpus.
 *
 * node scripts/repo-tools/wiki-core/heldout-exam.mjs
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSectionIndex, findSections, gitRouteMeta, readSection } from './route.mjs';
import { HELDOUT_K, HELDOUT_SCHEMA, QUESTIONS, REQUIRED_CASES } from './heldout-questions.mjs';
import { root as repoRoot } from '../process.mjs';

const READ_MAX_CHARS = 5000;

function laneName(status) {
  if (status === 'proposal') return 'proposal';
  if (status === 'uncertain') return 'uncertain';
  return 'normative';
}

function laneItems(found, status) {
  const name = laneName(status);
  if (name === 'proposal') return found.proposalLane ?? [];
  if (name === 'uncertain') return found.uncertain ?? [];
  return found.normative ?? [];
}

function primaryItems(found) {
  if (found.primaryLane === 'proposal') return found.proposalLane ?? [];
  if (found.primaryLane === 'uncertain') return found.uncertain ?? [];
  return found.normative ?? [];
}

export function judgeHeldout(question, found, indexed, read) {
  const gold = question.gold;
  const k = question.k ?? HELDOUT_K;
  const expectedLane = laneName(gold.status);
  const ownerHit = laneItems(found, gold.status).slice(0, k).some((item) => item.ref === gold.ref);
  const scoredAsSelected = (found.normative ?? []).some(
    (item) => item.ref === gold.ref && item.selected === true && gold.status !== 'selected',
  );
  const authorityOk = Boolean(indexed)
    && indexed.lane === expectedLane
    && (gold.status !== 'proposal' || indexed.realization === 'proposed')
    && (gold.status !== 'uncertain' || indexed.realization === gold.realization)
    && (gold.status !== 'selected' || indexed.authority !== 'uncertain');
  const phrases = [gold.negative, ...(gold.also ?? [])];
  const negativeOk = Boolean(read?.ok) && phrases.every((phrase) => String(read.text ?? '').includes(phrase));
  const lead = primaryItems(found)[0] ?? null;
  const falseConfidence = gold.status !== 'selected' && lead?.selected === true;
  const reasons = [];
  if (!indexed) reasons.push('missing-gold-heading');
  if (!ownerHit) reasons.push('owner-recall');
  if (indexed && !authorityOk) reasons.push('authority');
  if (scoredAsSelected) reasons.push('scored-as-selected');
  if (!negativeOk) reasons.push('negative');
  if (falseConfidence) reasons.push('false-confidence');
  return {
    id: question.id,
    pass: reasons.length === 0,
    reasons,
    ownerHit,
    authorityOk,
    negativeOk,
    scoredAsSelected,
    falseConfidence,
    gold: gold.ref,
    goldStatus: gold.status,
    indexedLane: indexed?.lane ?? null,
    indexedAuthority: indexed?.authority ?? null,
    indexedRealization: indexed?.realization ?? null,
    leadRef: lead?.ref ?? null,
    leadLane: lead?.lane ?? null,
    leadSelected: lead?.selected ?? null,
    readOk: Boolean(read?.ok),
    truncated: Boolean(read?.truncated),
    bytes: read?.bytes ?? 0,
    sectionBytes: read?.sectionBytes ?? 0,
    path: read?.path ?? gold.ref.split('#')[0],
  };
}

function item(ref, extras) {
  return {
    ref,
    selected: false,
    lane: 'proposal',
    authority: 'proposal',
    realization: 'proposed',
    ...extras,
  };
}

export function assertScorerRefusesSelectedGrant() {
  const proposal = QUESTIONS[0];
  const prohibited = judgeHeldout(
    proposal,
    {
      primaryLane: 'normative',
      normative: [item(proposal.gold.ref, { selected: true, lane: 'normative', authority: 'selected-technical' })],
      proposalLane: [],
      uncertain: [],
    },
    { lane: 'normative', authority: 'selected-technical', realization: 'proposed' },
    { ok: true, text: proposal.gold.negative, bytes: 10, sectionBytes: 10 },
  );
  if (prohibited.pass || !prohibited.scoredAsSelected) {
    throw new Error('scorer accepted a prohibited staff read as selected');
  }
  const unratified = QUESTIONS.find((question) => question.id === 'retention-unratified-grant');
  const grant = judgeHeldout(
    unratified,
    {
      primaryLane: 'normative',
      normative: [item(unratified.gold.ref, { selected: true, lane: 'normative', authority: 'selected-technical' })],
      proposalLane: [],
      uncertain: [],
    },
    { lane: 'proposal', authority: 'proposal', realization: 'proposed' },
    { ok: true, text: unratified.gold.negative, bytes: 10, sectionBytes: 10 },
  );
  if (grant.pass || !grant.reasons.includes('scored-as-selected')) {
    throw new Error('scorer accepted an unratified grant as selected');
  }
  const lead = judgeHeldout(
    proposal,
    {
      primaryLane: 'normative',
      normative: [item('docs/product/README.md#product', { selected: true, lane: 'normative', authority: 'ratified-product' })],
      proposalLane: [item(proposal.gold.ref)],
      uncertain: [],
    },
    { lane: 'proposal', authority: 'proposal', realization: 'proposed' },
    { ok: true, text: proposal.gold.negative, bytes: 12, sectionBytes: 12 },
  );
  if (lead.pass || !lead.falseConfidence) {
    throw new Error('scorer passed a proposal while a selected page led');
  }
  const clean = judgeHeldout(
    proposal,
    {
      primaryLane: 'proposal',
      normative: [],
      proposalLane: [item(proposal.gold.ref)],
      uncertain: [],
    },
    { lane: 'proposal', authority: 'proposal', realization: 'proposed' },
    { ok: true, text: proposal.gold.negative, bytes: 8, sectionBytes: 8 },
  );
  if (!clean.pass) {
    throw new Error(`scorer rejected a proposal that stayed unselected: ${clean.reasons.join(',')}`);
  }
}

function assertCasesFrozen() {
  if (QUESTIONS.length < 15 || QUESTIONS.length > 20) {
    throw new Error(`held-out exam needs 15-20 questions, found ${QUESTIONS.length}`);
  }
  const present = new Set(QUESTIONS.flatMap((question) => question.cases));
  const missing = REQUIRED_CASES.filter((name) => !present.has(name));
  if (missing.length > 0) throw new Error(`missing required cases: ${missing.join(', ')}`);
}

export function runHeldoutExam(root = repoRoot) {
  assertCasesFrozen();
  assertScorerRefusesSelectedGrant();
  const meta = gitRouteMeta(root);
  const index = buildSectionIndex(root, meta);
  const byRef = new Map(index.sections.map((section) => [`${section.path}#${section.anchor}`, section]));
  const rows = [];
  for (const question of QUESTIONS) {
    const found = findSections(index, question.prompt, { top: HELDOUT_K });
    const read = readSection(root, question.gold.ref, { maxChars: READ_MAX_CHARS, ...meta });
    rows.push(judgeHeldout(question, found, byRef.get(question.gold.ref) ?? null, read));
  }
  const passes = rows.filter((row) => row.pass);
  const misses = rows.filter((row) => !row.pass);
  const uniqueRefs = [...new Set(QUESTIONS.map((question) => question.gold.ref))];
  const uniqueHits = uniqueRefs.filter((ref) => rows.filter((row) => row.gold === ref).every((row) => row.ownerHit));
  const pages = new Set(rows.map((row) => row.path));
  return {
    schema: HELDOUT_SCHEMA,
    routeSchema: index.schema,
    repoSha: meta.repoSha,
    shortSha: meta.repoSha ? meta.repoSha.slice(0, 8) : null,
    dirty: meta.dirty,
    k: HELDOUT_K,
    maxChars: READ_MAX_CHARS,
    questions: rows.length,
    uniqueRefs: uniqueRefs.length,
    pass: passes.length,
    miss: misses.length,
    ownerRecallAt5: rows.filter((row) => row.ownerHit).length,
    uniqueOwnerRecall: uniqueHits.length,
    authorityErrors: rows.filter((row) => row.reasons.includes('authority') || row.reasons.includes('missing-gold-heading')).length,
    negativeMisses: rows.filter((row) => row.reasons.includes('negative')).length,
    scoredAsSelected: rows.filter((row) => row.scoredAsSelected).length,
    falseConfidence: rows.filter((row) => row.falseConfidence).length,
    bytesOpened: rows.reduce((sum, row) => sum + row.bytes, 0),
    sectionBytes: rows.reduce((sum, row) => sum + row.sectionBytes, 0),
    pagesRead: pages.size,
    reads: rows.length,
    misses,
    rows,
  };
}

function printReport(report) {
  const sha = report.repoSha ?? 'unknown';
  console.log(`${report.schema} ${report.routeSchema} @ ${sha}${report.dirty ? ' dirty' : ''}`);
  console.log(`short ${report.shortSha ?? 'unknown'}  k=${report.k}  maxChars=${report.maxChars}`);
  console.log(`questions ${report.questions}  uniqueRefs ${report.uniqueRefs}`);
  console.log(`pass ${report.pass}  miss ${report.miss}`);
  console.log(`ownerRecall@${report.k} ${report.ownerRecallAt5}/${report.questions}`);
  console.log(`uniqueOwnerRecall ${report.uniqueOwnerRecall}/${report.uniqueRefs}`);
  console.log(`authorityErrors ${report.authorityErrors}`);
  console.log(`negativeMisses ${report.negativeMisses}`);
  console.log(`scoredAsSelected ${report.scoredAsSelected}`);
  console.log(`falseConfidence ${report.falseConfidence}`);
  console.log(`bytesOpened ${report.bytesOpened}  sectionBytes ${report.sectionBytes}  pagesRead ${report.pagesRead}  reads ${report.reads}`);
  const passIds = report.rows.filter((row) => row.pass).map((row) => row.id);
  console.log(`passes: ${passIds.join(', ') || 'none'}`);
  if (report.misses.length === 0) console.log('misses: none');
  for (const row of report.misses) {
    console.log(`MISS ${row.id}  ${row.reasons.join(',')}`);
    console.log(`  gold ${row.gold}  ${row.goldStatus}  indexed ${row.indexedLane ?? 'missing'}/${row.indexedAuthority ?? '-'} ${row.indexedRealization ?? '-'}`);
    console.log(`  lead ${row.leadRef ?? 'none'}  ${row.leadLane ?? '-'}  selected=${row.leadSelected}  truncated=${row.truncated}`);
  }
  console.log('No fresh-agent score and no human score. A green link index is not semantic correctness. This is not a comprehension exam of the whole corpus.');
}

function main() {
  try {
    const report = runHeldoutExam();
    printReport(report);
    return report.miss > 0 ? 1 : 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    return 2;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  process.exit(main());
}
