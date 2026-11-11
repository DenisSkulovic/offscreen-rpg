// Read-only, zero-provider-cost audit of feature checkpoint context size.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { root } from './process.mjs';

const featuresRoot = path.join(root, 'docs', 'features');
const limit = 300; // Advisory review trigger from documentation policy; not a hard gate.
const entries = readdirSync(featuresRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

const results = entries.map((name) => {
  const pathname = path.join(featuresRoot, name, 'PLAN.md');
  let text;
  try {
    text = readFileSync(pathname, 'utf8');
  } catch (error) {
    return { name, words: 0, bytes: 0, issue: 'PLAN.md unreadable: ' + error.message };
  }
  const headings = [...text.matchAll(/^## Current checkpoint\s*$/gm)];
  if (headings.length !== 1) {
    return { name, words: 0, bytes: 0, issue: 'Expected exactly one Current checkpoint heading' };
  }
  const after = text.slice(headings[0].index + headings[0][0].length);
  const nextHeading = /^## /gm.exec(after);
  const checkpoint = (nextHeading ? after.slice(0, nextHeading.index) : after).trim();
  const words = checkpoint ? checkpoint.split(/\s+/).length : 0;
  const bytes = Buffer.byteLength(checkpoint, 'utf8');
  return { name, words, bytes, issue: !words ? 'Empty checkpoint' : undefined, review: words > limit };
});

results.sort((a, b) => b.words - a.words || a.name.localeCompare(b.name));
if (process.argv.length > 2 && !process.argv.slice(2).every((arg) => arg === '--json')) {
  console.error('Usage: pnpm repo:docs-health [--json]');
  process.exitCode = 1;
} else if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ checkpointReviewWords: limit, results }, null, 2));
} else {
  console.log('Feature checkpoint health (read-only; advisory >' + limit + ' words):');
  for (const result of results) {
    const flag = result.issue ? 'INVALID' : result.review ? 'REVIEW' : 'ok';
    console.log(String(result.words).padStart(5) + ' words | ' + String(result.bytes).padStart(6) + ' bytes | ' + flag.padEnd(7) + ' | ' + result.name);
    if (result.issue) console.log('  ' + result.issue);
  }
  console.log('Review flags are not failure gates. Move durable evidence to its owner, keep checkpoints actionable, and preserve meaningful design.');
}
