import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compareRetrieval, compareSet } from './wiki-core/retrieval-compare.mjs';

function fail(error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log('Usage: pnpm repo:retrieval-compare [--self-test] [record.json]');
    console.log('Compare two recorded retrieval arms on one pinned SHA. No network and no model.');
    return 0;
  }
  if (args.includes('--self-test')) {
    const selfTest = await import('./wiki-core/retrieval-compare-self-test.mjs');
    selfTest.runRetrievalCompareSelfTest();
    return 0;
  }
  const file = args.find((arg) => !arg.startsWith('--'));
  if (!file) throw new Error('Pass a JSON file or --self-test.');
  const parsed = JSON.parse(readFileSync(file, 'utf8'));
  const report = Array.isArray(parsed) ? compareSet(parsed) : compareRetrieval(parsed);
  console.log(JSON.stringify(report, null, 2));
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => fail(error));
}
