/**
 * Zero-provider static retrieval benchmark. No model calls.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { runStaticBenchmark, runStaticBenchmarkV2, validateCases } from './wiki-core/bench.mjs';
import { CASES, DATASET_VERSION, INDEPENDENT_REVIEW, REVIEW_STATUS } from './wiki-benchmarks/static-v1.mjs';
import { PARAPHRASE_STATUS, paraphraseCases } from './wiki-benchmarks/static-v2-paraphrases.mjs';
import { root } from './process.mjs';

function gitMeta(repo) {
  const sha = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' });
  const status = spawnSync('git', ['status', '--porcelain'], { cwd: repo, encoding: 'utf8' });
  if (sha.status !== 0) return { repoSha: null, dirty: null };
  return { repoSha: sha.stdout.trim(), dirty: Boolean(status.stdout && status.stdout.trim()) };
}

function printHuman(report) {
  const metrics = report.metrics;
  console.log(
    `Wiki static bench @ ${report.repoSha ?? 'unknown'}${report.dirty ? ' (dirty worktree)' : ''}  status ${report.benchmarkStatus}`,
  );
  console.log(
    `Dataset ${report.datasetVersion}  cases ${report.cases}  seed ${report.seed}  trials ${report.trials}  independentReview ${report.independentReview}`,
  );
  console.log(
    `Routes ${pct(metrics.routeSuccess)}  hops median ${metrics.hopMedian ?? 'n/a'}  p95 ${metrics.hopP95 ?? 'n/a'}`,
  );
  console.log(
    `Lexical Recall@5 ${pct(metrics.recallAt5)}  MRR ${num(metrics.mrr)}  nDCG@5 ${num(metrics.ndcgAt5)}  wrong-authority@5 ${pct(metrics.wrongAuthorityAt5)}`,
  );
  console.log(
    `Hopper greedy ${pct(metrics.hopperGreedyHit)}  stochastic hit@3 ${pct(metrics.hopperHitAt3)}  hit@6 ${pct(metrics.hopperHitAt6)}  random hit@6 ${pct(metrics.randomHitAt6)}`,
  );
  if (report.graphHardErrors.length > 0) {
    console.log('Graph integrity blocks a successful benchmark claim:');
    for (const item of report.graphHardErrors) console.log(`  ${item.path}  ${item.code}`);
  }
  console.log(`Failures: ${report.failures.join(', ') || 'none'}`);
}

function pct(value) {
  return value === null || value === undefined ? 'n/a' : `${(value * 100).toFixed(1)}%`;
}
function num(value) {
  return value === null || value === undefined ? 'n/a' : value.toFixed(3);
}

async function main() {
  const args = process.argv.slice(2);
  let seed = 20261116;
  const seedAt = args.indexOf('--seed');
  if (seedAt !== -1) seed = Number(args[seedAt + 1]);
  if (args.includes('--self-test')) {
    const selfTest = await import('./wiki-core/bench-self-test.mjs');
    process.exit(selfTest.runBenchSelfTest());
  }
  const meta = gitMeta(root);
  const errors = validateCases(root, CASES);
  if (errors.length > 0) {
    console.error('Gold dataset failed validation:');
    for (const error of errors) console.error(`  ${error}`);
    process.exit(2);
  }
  const started = performance.now();
  const report = runStaticBenchmark(root, CASES, { ...meta, seed, trials: 100 });
  report.reviewStatus = REVIEW_STATUS;
  report.independentReview = INDEPENDENT_REVIEW;
  report.datasetVersion = DATASET_VERSION;
  const v2 = runStaticBenchmarkV2(root, CASES, { ...meta, seed, trials: 100 });
  const paraphrases = paraphraseCases(CASES);
  const paraphraseReport = runStaticBenchmarkV2(root, paraphrases, { ...meta, seed, trials: 20 });
  paraphraseReport.approval = PARAPHRASE_STATUS;
  paraphraseReport.trials = 20;
  paraphraseReport.note = 'Implementer paraphrases. Not an independent held-out set. Hopper trials are 20, not 100.';
  report.elapsedMs = Math.round(performance.now() - started);
  const semantic = { ...report };
  delete semantic.elapsedMs;
  report.semanticSha256 = createHash('sha256').update(JSON.stringify(semantic)).digest('hex');
  const v2Semantic = { ...v2 };
  v2.semanticSha256 = createHash('sha256').update(JSON.stringify(v2Semantic)).digest('hex');
  const folder = `${meta.repoSha ?? 'unknown'}${meta.dirty ? '-dirty' : ''}`;
  const dir = path.join(root, 'out', 'wiki-health', folder);
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `static-${seed}.json`);
  const v2File = path.join(dir, `static-v2-${seed}.json`);
  const paraphraseFile = path.join(dir, `static-v2-paraphrase-${seed}.json`);
  writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(v2File, `${JSON.stringify(v2, null, 2)}\n`);
  writeFileSync(paraphraseFile, `${JSON.stringify(paraphraseReport, null, 2)}\n`);
  const summary = {
    v1: {
      schema: report.schema,
      benchmarkStatus: report.benchmarkStatus,
      metrics: report.metrics,
      semanticSha256: report.semanticSha256,
      file,
    },
    v2: {
      schema: v2.schema,
      benchmarkStatus: v2.benchmarkStatus,
      metrics: v2.metrics,
      a06: v2.a06
        ? {
            docsRouteSuccess: v2.a06.docsRouteSuccess,
            docsRouteCounted: v2.a06.docsRouteCounted,
            agentRouteSuccess: v2.a06.agentWorkflow?.routeSuccess ?? null,
          }
        : null,
      semanticSha256: v2.semanticSha256,
      file: v2File,
    },
    paraphrases: {
      approval: PARAPHRASE_STATUS,
      cases: paraphraseReport.cases,
      metrics: paraphraseReport.metrics,
      file: paraphraseFile,
    },
  };
  if (args.includes('--json')) console.log(JSON.stringify(summary, null, 2));
  else {
    printHuman(report);
    const metrics = v2.metrics;
    console.log('--- wiki.static.v2 (not comparable with the v1 names above) ---');
    console.log(
      `CompleteAnswer@5 ${pct(metrics.completeAnswerAt5)}  owner Recall@5 macro ${pct(metrics.ownerRecallAt5Macro)}  micro ${pct(metrics.ownerRecallAt5Micro)}  primary ${pct(metrics.primaryRecallAt5)}`,
    );
    console.log(
      `Standard MRR ${num(metrics.mrr)}  completion reciprocal ${num(metrics.completionReciprocal)}  page nDCG@5 ${num(metrics.ndcgAt5)}`,
    );
    console.log(
      `STATUS-compound CompleteAnswer@5 ${pct(metrics.statusCompoundCompleteAt5)} over ${metrics.statusCompoundCases} cases`,
    );
    console.log(
      `Authority: normative exposure not evaluated. Adversarial historic-in-top5 ${pct(metrics.adversarialHistoricInTop5)}`,
    );
    console.log(
      `Hopper label hit@3 ${pct(metrics.hopperLabelHitAt3)}  row-aware hit@3 ${pct(metrics.hopperRowHitAt3)}  row-aware hit@6 ${pct(metrics.hopperRowHitAt6)}  row greedy ${pct(metrics.hopperRowGreedyHit)}`,
    );
    if (v2.a06) {
      console.log(
        `A06 docs-root route counted=${v2.a06.docsRouteCounted} success=${v2.a06.docsRouteSuccess}  AGENTS route success=${v2.a06.agentWorkflow?.routeSuccess}`,
      );
    }
    console.log(
      `Paraphrases ${PARAPHRASE_STATUS}  CompleteAnswer@5 ${pct(paraphraseReport.metrics.completeAnswerAt5)}  owner Recall@5 ${pct(paraphraseReport.metrics.ownerRecallAt5Macro)}`,
    );
    console.log(`Output ${file}`);
    console.log(`Output ${v2File}`);
    console.log(`Output ${paraphraseFile}`);
    console.log(`Elapsed ${report.elapsedMs} ms`);
    console.log(`Semantic v1 ${report.semanticSha256}`);
    console.log(`Semantic v2 ${v2.semanticSha256}`);
  }
  process.exit(report.benchmarkStatus === 'measured' && v2.benchmarkStatus === 'measured' ? 0 : 1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}
