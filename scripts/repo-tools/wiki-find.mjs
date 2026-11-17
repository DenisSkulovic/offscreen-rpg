/**
 * pnpm wiki:find "question" --kind product --top 5
 * pnpm wiki:find --self-test
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSectionIndex, findSections, gitRouteMeta } from './wiki-core/route.mjs';
import { root } from './process.mjs';

function usage() {
  console.error('Usage: pnpm wiki:find "question" [--kind product|technical|status] [--top 5] [--include-historic] [--json]');
  return 2;
}

export async function main(argv = process.argv.slice(2)) {
  if (argv.includes('--self-test')) {
    const selfTest = await import('./wiki-core/route-self-test.mjs');
    return selfTest.runRouteSelfTest();
  }
  const json = argv.includes('--json');
  const includeHistoric = argv.includes('--include-historic');
  let kind = null;
  let top = 5;
  const query = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--json' || arg === '--include-historic') continue;
    if (arg === '--kind') {
      kind = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg === '--top') {
      top = Number(argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg.startsWith('--')) return usage();
    query.push(arg);
  }
  if (!query.length || !Number.isInteger(top) || top < 1) return usage();
  const meta = gitRouteMeta(root);
  const index = buildSectionIndex(root, { ...meta, includeHistoric });
  const result = findSections(index, query.join(' '), { kind, top, includeHistoric });
  const payload = { ...result, repoSha: meta.repoSha, dirty: meta.dirty };
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
    return 0;
  }
  console.log(`${payload.schema} find @ ${meta.repoSha ?? 'unknown'}${meta.dirty ? ' dirty' : ''}`);
  console.log(`Query: ${payload.query}`);
  const printItem = (item) => {
    console.log(
      `${item.ref}  ${item.authority}  ${item.match}  score ${item.score}  ${item.bytes} bytes  lines ${item.lineStart}-${item.lineEnd}`,
    );
    console.log(`  ${item.preview.slice(0, 220)}`);
  };
  console.log('Normative:');
  if (payload.normative.length === 0) console.log('  (none)');
  for (const item of payload.normative) printItem(item);
  if (payload.statusCompanion && !payload.normative.some((item) => item.ref === payload.statusCompanion.ref)) {
    console.log('Status companion:');
    printItem(payload.statusCompanion);
  }
  if (payload.proposalLane.length > 0) {
    console.log('Proposal lane (NOT SELECTED):');
    for (const item of payload.proposalLane) printItem(item);
  }
  if (payload.historic.length > 0) {
    console.log('Historic:');
    for (const item of payload.historic) printItem(item);
  }
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  process.exit(await main());
}
