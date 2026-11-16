/**
 * Isolated agent-evaluation harness. Default paths are fake and dry-run only.
 * This file does not launch a model CLI.
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { dryRunReport } from './wiki-core/agent-harness.mjs';

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--self-test')) {
    const selfTest = await import('./wiki-core/agent-self-test.mjs');
    process.exit(selfTest.runAgentSelfTest());
  }
  if (args.includes('--approve-model-usage') || args.includes('--case')) {
    console.error(
      'Real model launch refused. WIKI03 does not authorize a model, cap, sandbox proof, or fresh process.',
    );
    process.exit(2);
  }
  const report = dryRunReport();
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}
