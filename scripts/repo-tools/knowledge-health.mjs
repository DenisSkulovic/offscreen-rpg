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
  'work/designs/open/doc01-unpromoted-design',
  'work/designs/open/doc01-migration',
  'work/designs/parked',
];

const LIVE_STATUS = [
  'AGENTS.md',
  'STATUS.md',
  '.agents/README.md',
  '.agents/HARNESS.md',
  '.agents/rules/documentation.md',
  '.agents/references/documentation-navigation-standard.md',
  'apps/web/README.md',
  'work/changes/README.md',
  'work/designs/README.md',
  'work/sessions/README.md',
  'docs/technical/platform/identities-and-access.md',
  'docs/technical/lab/chamber-and-fixtures.md',
  'docs/technical/lab/experiment-protocol.md',
  'packages/application/src/developer-tools/README.md',
  'research/README.md',
  'research/engineering-manuals.md',
  'research/legacy-engineering/README.md',
  'research/storyteller/tuning-and-memory.md',
];

const LIVE_BANNED = [
  /after DOC01 cutover/i,
  /until P6/i,
  /not implemented yet/i,
  /code remains unchanged/i,
  /Not implemented or authorized for source edits/i,
  /TanStack\/RHF\/SSE as already implemented/,
];

export function violationsInText(rel, text) {
  const found = [];
  for (const pattern of BANNED) {
    if (pattern.test(text)) found.push(`${rel}: banned phrasing /${pattern.source}/`);
  }
  if (FIRST_HOP.includes(rel.replaceAll('\\', '/')) && text.includes('doc01-legacy-snapshot')) {
    const allowed = /doc01-legacy-snapshot\/MANIFEST\.md/;
    const links = [...text.matchAll(/doc01-legacy-snapshot\/[^)\s]*/g)].map((match) => match[0]);
    if (links.some((link) => !allowed.test(link))) {
      found.push(`${rel}: first-hop link into the retired snapshot tree`);
    }
  }
  if (
    FIRST_HOP.includes(rel.replaceAll('\\', '/')) &&
    /docs\/programs\//.test(text)
  ) {
    found.push(`${rel}: first-hop link to docs/programs`);
  }
  if (LIVE_STATUS.includes(rel.replaceAll('\\', '/'))) {
    for (const pattern of LIVE_BANNED) {
      if (pattern.test(text)) found.push(`${rel}: stale status /${pattern.source}/`);
    }
  }
  return found;
}

const LINK_RE = /\[([^\]]*)\]\(((?:[^()]|\([^()]*\))+)\)/g;

export function resolvedLocalLink(fromRel, href) {
  const raw = href.trim();
  if (!raw || raw.startsWith('#') || raw.startsWith('//')) return null;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) return null;
  const pathPart = decodeURIComponent(raw.split('#')[0]);
  if (!pathPart) return null;
  const fromDir = path.posix.dirname(fromRel.replaceAll('\\', '/'));
  return path.posix.normalize(path.posix.join(fromDir, pathPart));
}

export function falseEvidenceAuthority(text) {
  return /binding implementation design/i.test(text) && /evidence\/inspections\//.test(text);
}

function linkTarget(fromRel, href) {
  const resolved = resolvedLocalLink(fromRel, href);
  if (!resolved || resolved.startsWith('..')) return resolved;
  return resolved;
}

function walkAll(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walkAll(abs, out);
    else if (entry.isFile()) out.push(abs);
  }
  return out;
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
  const maintained = [
    ...walkFiles(path.join(repo, 'docs')),
    ...walkFiles(path.join(repo, 'work', 'designs')),
    ...walkFiles(path.join(repo, '.agents')),
  ];
  for (const abs of maintained) {
    const rel = path.relative(repo, abs).replaceAll('\\', '/');
    const text = readFileSync(abs, 'utf8');
    for (const match of text.matchAll(/\[([^\]]*)\]\(([^)\s]+)\)/g)) {
      const target = linkTarget(rel, match[2]);
      const alias = /question|compatibility stub|legacy body/i.test(match[1]);
      const guarded = rel.endsWith('product-open-questions.md') || rel === 'work/sessions/README.md';
      if (target === rel && (alias || guarded)) failures.push(`${rel}: self-link`);
    }
  }
  const activeLinks = [
    ...walkFiles(path.join(repo, 'work', 'designs', 'open')),
    path.join(repo, 'work', 'designs', 'README.md'),
    path.join(repo, 'research', 'README.md'),
    path.join(repo, 'research', 'engineering-manuals.md'),
    path.join(repo, 'research', 'legacy-engineering', 'README.md'),
    path.join(repo, 'research', 'storyteller', 'tuning-and-memory.md'),
  ];
  for (const abs of activeLinks) {
    if (!existsSync(abs) || !statSync(abs).isFile()) continue;
    const rel = path.relative(repo, abs).replaceAll('\\', '/');
    const text = readFileSync(abs, 'utf8');
    for (const match of text.matchAll(LINK_RE)) {
      const href = match[2].trim();
      const target = resolvedLocalLink(rel, href);
      if (!target) continue;
      const absTarget = path.resolve(repo, target);
      if (!existsSync(absTarget)) failures.push(`${rel}: broken local link ${href}`);
    }
  }
  if (existsSync(technical)) {
    for (const abs of walkFiles(technical)) {
      const rel = path.relative(repo, abs).replaceAll('\\', '/');
      if (falseEvidenceAuthority(readFileSync(abs, 'utf8'))) {
        failures.push(`${rel}: evidence path declared as binding implementation design`);
      }
    }
  }
  const evidence = path.join(repo, 'evidence');
  const evidenceHashes = new Map();
  for (const abs of walkAll(evidence)) {
    const rel = path.relative(repo, abs).replaceAll('\\', '/');
    if (/\/handoff\//i.test(rel) || /HANDOFF|START-HERE/i.test(path.basename(rel))) {
      failures.push(`${rel}: executor handoff stored as inspection evidence`);
    }
    const digest = createHash('sha256').update(readFileSync(abs)).digest('hex');
    const prior = evidenceHashes.get(digest);
    if (prior) failures.push(`duplicate evidence blob: ${prior} and ${rel}`);
    else evidenceHashes.set(digest, rel);
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
  const broken = [
    ['work/designs/open/product-open-questions.md', '../../docs/product/gameplay/time-and-autonomy.md', 'work/docs/product/gameplay/time-and-autonomy.md'],
    ['work/designs/open/product-open-questions.md', '../changes/open/2026-11-13--gm-delegated-decision/CHANGE.md', 'work/designs/changes/open/2026-11-13--gm-delegated-decision/CHANGE.md'],
    ['work/designs/open/product-open-questions.md', '../changes/open/2026-11-13--gm-standing-life/CHANGE.md', 'work/designs/changes/open/2026-11-13--gm-standing-life/CHANGE.md'],
  ];
  for (const [from, href, expected] of broken) {
    if (resolvedLocalLink(from, href) !== expected) failures.push(`self-test link ${href} -> ${resolvedLocalLink(from, href)}`);
  }
  if (resolvedLocalLink('docs/technical/storyteller/context-and-memory.md', 'thread:the-warning') !== null) {
    failures.push('self-test treated thread: as a file');
  }
  if (!falseEvidenceAuthority('The [React/Next target F1–F15](../../../evidence/inspections/doc01-retained-observations/engineering/targets/react-next.md) is the binding implementation design.')) {
    failures.push('self-test missed evidence-as-binding declaration');
  }
  if (falseEvidenceAuthority('See [client architecture](../client/architecture.md). A dated file under evidence is not the contract.')) {
    failures.push('self-test flagged a non-binding evidence mention');
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
