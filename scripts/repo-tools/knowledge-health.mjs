// Deterministic knowledge-authority checks. No provider calls.
// work/changes/archive is never a deletion or duplicate target.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { root } from './process.mjs';

const BANNED = [
  /compatibility stub/i,
  /until cutover/i,
  /until P5/i,
  /skeleton\s*[—-]/i,
  /to be folded/i,
];

const FIRST_HOP = [
  'docs/README.md',
  'docs/product/README.md',
  'docs/technical/README.md',
  'AGENTS.md',
  'STATUS.md',
  'ROADMAP.md',
];

const FORBIDDEN_PATHS = [
  'docs/progress.md',
  'docs/questions.md',
  'TODO.md',
  'docs/product/journeys',
  'docs/product/storytelling',
  'docs/technical/playthroughs',
];

export function violationsInText(rel, text) {
  const found = [];
  for (const pattern of BANNED) {
    if (pattern.test(text)) found.push(`${rel}: banned phrasing /${pattern.source}/`);
  }
  if (
    FIRST_HOP.includes(rel.replaceAll('\\', '/')) &&
    text.includes('doc01-legacy-snapshot')
  ) {
    found.push(`${rel}: first-hop link to doc01-legacy-snapshot`);
  }
  if (
    FIRST_HOP.includes(rel.replaceAll('\\', '/')) &&
    /docs\/programs\//.test(text)
  ) {
    found.push(`${rel}: first-hop link to docs/programs`);
  }
  return found;
}

function walkFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(abs, out);
    else if (entry.isFile() && entry.name.endsWith('.md')) out.push(abs);
  }
  return out;
}

export function collectKnowledgeViolations(repo = root) {
  const failures = [];
  for (const rel of FORBIDDEN_PATHS) {
    if (existsSync(path.join(repo, rel))) failures.push(`forbidden path still present: ${rel}`);
  }
  const technical = path.join(repo, 'docs', 'technical');
  if (existsSync(technical)) {
    for (const entry of readdirSync(technical, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'README.md') {
        failures.push(`flat technical contract still present: docs/technical/${entry.name}`);
      }
    }
  }
  const docs = path.join(repo, 'docs');
  const hashes = new Map();
  for (const abs of walkFiles(docs)) {
    const rel = path.relative(repo, abs).replaceAll('\\', '/');
    const text = readFileSync(abs, 'utf8');
    failures.push(...violationsInText(rel, text));
    const digest = createHash('sha256').update(text).digest('hex');
    const prior = hashes.get(digest);
    if (prior) failures.push(`duplicate docs blob: ${prior} and ${rel}`);
    else hashes.set(digest, rel);
  }
  for (const rel of FIRST_HOP) {
    const abs = path.join(repo, rel);
    if (!existsSync(abs) || !statSync(abs).isFile()) continue;
    failures.push(...violationsInText(rel, readFileSync(abs, 'utf8')));
  }
  return failures;
}

function selfTest() {
  const failures = [];
  const samples = [
    ['docs/technical/engine/old-compat.md', 'This is a compatibility stub of the contract.'],
    ['docs/technical/storyteller/prompts-and-tools.md', 'Status: skeleton — to be folded later.'],
    ['docs/README.md', 'See [old](../evidence/inspections/doc01-legacy-snapshot/programs/README.md).'],
    ['docs/progress.md', 'alias'],
  ];
  for (const [rel, text] of samples) {
    const hit = violationsInText(rel, text);
    if (rel === 'docs/progress.md') {
      if (FORBIDDEN_PATHS.includes(rel) === false) failures.push('self-test missed progress alias policy');
    } else if (hit.length === 0) failures.push(`self-test missed ${rel}`);
  }
  const ok = violationsInText(
    'docs/technical/engine/selected-architecture.md',
    '# Selected engine architecture\n\nA long coherent contract with a negative case.\n',
  );
  if (ok.length) failures.push('self-test flagged a normal contract');
  if (!FORBIDDEN_PATHS.includes('work/changes/archive') && failures.length === 0) {
    console.log('knowledge-health self-test: ok');
    return 0;
  }
  if (failures.length) {
    for (const item of failures) console.error(item);
    return 1;
  }
  console.log('knowledge-health self-test: ok');
  return 0;
}

function main() {
  if (process.argv.includes('--self-test')) {
    process.exitCode = selfTest();
    return;
  }
  const failures = collectKnowledgeViolations();
  if (!failures.length) {
    console.log('knowledge-health: ok');
    return;
  }
  for (const item of failures) console.error(item);
  console.error(`knowledge-health: ${failures.length} violation(s)`);
  process.exitCode = 1;
}

if (process.argv[1] && process.argv[1].endsWith('knowledge-health.mjs')) main();
