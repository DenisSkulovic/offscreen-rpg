// Read-only, zero-provider-cost review of Change execution checkpoints and
// Done-packet reconciliation ledgers. Advisory only; not a repo-wide rewrite.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { changeNeedsLedger } from './archive-changes.mjs';
import { collectKnowledgeViolations, resolvedLocalLink } from './knowledge-health.mjs';
import { root } from './process.mjs';

/** Content paths a lean snapshot omits on purpose. Sensitive and build excludes are not in this list. */
export const LEAN_CONTENT_OMISSIONS = [
  'work/changes/archive/**',
  'work/sessions/legacy-minutes/**',
  'evidence/runs/**',
  'evidence/inspections/**',
  'research/legacy-engineering/**',
];

const SKELETON_CLAIM = /skeleton\s*[—-]/gi;

function globToRegExp(pattern) {
  let source = '';
  let index = 0;
  while (index < pattern.length) {
    if (pattern.startsWith('**/', index)) {
      source += '(?:.*/)?';
      index += 3;
      continue;
    }
    if (pattern.startsWith('**', index)) {
      source += '.*';
      index += 2;
      continue;
    }
    const char = pattern[index];
    if (char === '*') source += '[^/]*';
    else if ('\\^$+?.()|{}[]'.includes(char)) source += `\\${char}`;
    else source += char;
    index += 1;
  }
  return new RegExp(`^${source}$`);
}

function readLeanManifest(repo) {
  const manifestPath = path.join(repo, 'SNAPSHOT.json');
  if (!existsSync(manifestPath)) return null;
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    if (manifest.profile !== 'lean') return null;
    return manifest;
  } catch {
    return null;
  }
}

function leanOmissionMatchers(repo) {
  const manifest = readLeanManifest(repo);
  if (!manifest) return null;
  const declared = manifest.packaging?.excludedPatterns;
  const patterns = Array.isArray(declared)
    ? LEAN_CONTENT_OMISSIONS.filter((pattern) => declared.includes(pattern))
    : LEAN_CONTENT_OMISSIONS;
  return patterns.map(globToRegExp);
}

function occurrenceIsPath(text, index, length) {
  let start = index;
  while (start > 0 && !/\s/.test(text[start - 1])) start -= 1;
  let end = index + length;
  while (end < text.length && !/\s/.test(text[end])) end += 1;
  const token = text.slice(start, end);
  if (/^[a-z][a-z0-9+.-]*:/i.test(token)) return true;
  if (token.includes('/')) return true;
  const destination = text.lastIndexOf('](', index);
  if (destination >= 0) {
    const close = text.indexOf(')', destination + 2);
    if (close >= index + length) {
      const href = text.slice(destination + 2, close).trim();
      if (href.includes('/') || /^[a-z][a-z0-9+.-]*:/i.test(href)) return true;
    }
  }
  return false;
}

export function skeletonBanIsPathOnly(text) {
  const matches = [...String(text).matchAll(SKELETON_CLAIM)];
  if (matches.length === 0) return false;
  return matches.every((match) => occurrenceIsPath(text, match.index, match[0].length));
}

function isSkeletonViolation(item) {
  return /: banned phrasing \/skeleton\\s\*\[/.test(item);
}

function skeletonViolationIsPathOnly(repo, item) {
  const rel = item.slice(0, item.indexOf(': banned phrasing /'));
  const abs = path.join(repo, rel);
  if (!rel || !existsSync(abs)) return false;
  return skeletonBanIsPathOnly(readFileSync(abs, 'utf8'));
}

function parseBrokenLink(item) {
  const marker = ': broken local link ';
  const index = item.indexOf(marker);
  if (index < 0) return null;
  return { from: item.slice(0, index), href: item.slice(index + marker.length), item };
}

function isExpectedLeanOmission(broken, matchers) {
  const target = resolvedLocalLink(broken.from, broken.href);
  if (!target || target.startsWith('..') || target.startsWith('/')) return false;
  return matchers.some((pattern) => pattern.test(target));
}

/**
 * Split knowledge-health strings into repository regressions, lean packaging
 * omissions, and path-only terminology exemptions. A full checkout has no
 * SNAPSHOT.json and stays strict.
 */
export function classifyDocumentationFindings(repo, failures) {
  const matchers = leanOmissionMatchers(repo);
  const regressions = [];
  const expectedOmissions = [];
  const pathTerminologyExemptions = [];
  for (const item of failures) {
    if (isSkeletonViolation(item) && skeletonViolationIsPathOnly(repo, item)) {
      pathTerminologyExemptions.push(item);
      continue;
    }
    const broken = parseBrokenLink(item);
    if (broken && matchers && isExpectedLeanOmission(broken, matchers)) {
      expectedOmissions.push(broken);
      continue;
    }
    regressions.push(item);
  }
  return {
    schema: 'offscreen.docs-health.v1',
    mode: matchers ? 'lean-snapshot' : 'full-checkout',
    status: regressions.length ? 'FAIL' : 'PASS',
    regressions,
    expectedOmissions,
    pathTerminologyExemptions,
  };
}

export function documentationHealthReport(repo = root) {
  return classifyDocumentationFindings(repo, collectKnowledgeViolations(repo));
}

const changesRoot = path.join(root, 'work', 'changes');
const limit = 300; // Advisory review trigger; not a hard gate.

/** @returns {{ rel: string, absDir: string }[]} packet dirs that contain CHANGE.md */
function listChangePackets(dir = changesRoot, parts = []) {
  if (!existsSync(dir)) return [];
  /** @type {{ rel: string, absDir: string }[]} */
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const absDir = path.join(dir, entry.name);
    const nextParts = [...parts, entry.name];
    if (existsSync(path.join(absDir, 'CHANGE.md'))) {
      found.push({
        rel: nextParts.join('/'),
        absDir,
      });
    } else {
      found.push(...listChangePackets(absDir, nextParts));
    }
  }
  return found;
}

function reportKnowledge(repo, { json = false } = {}) {
  const report = documentationHealthReport(repo);
  const write = json ? console.error : console.log;
  if (report.mode === 'lean-snapshot' || report.expectedOmissions.length) {
    write(
      `Lean omissions: ${report.expectedOmissions.length} (expected missing archive or evidence; not repository regressions)`,
    );
  }
  if (report.pathTerminologyExemptions.length) {
    write(
      `Path terminology exemptions: ${report.pathTerminologyExemptions.length} (URL or path text, not a banned claim)`,
    );
  }
  if (!report.regressions.length) {
    write('knowledge-health: ok');
  } else {
    for (const item of report.regressions) console.error(item);
    console.error(`knowledge-health: ${report.regressions.length} violation(s)`);
    process.exitCode = 1;
  }
  return report;
}

function main() {
  const packets = listChangePackets();

const planEntries = packets.filter((packet) =>
  existsSync(path.join(packet.absDir, 'PLAN.md')),
);

const results = planEntries.map((packet) => {
  const pathname = path.join(packet.absDir, 'PLAN.md');
  let text;
  try {
    text = readFileSync(pathname, 'utf8');
  } catch (error) {
    return {
      name: packet.rel,
      words: 0,
      bytes: 0,
      issue: 'PLAN.md unreadable: ' + error.message,
    };
  }
  const headings = [...text.matchAll(/^## Current checkpoint\s*$/gm)];
  if (headings.length !== 1) {
    return {
      name: packet.rel,
      words: 0,
      bytes: 0,
      issue: 'Expected exactly one Current checkpoint heading',
    };
  }
  const after = text.slice(headings[0].index + headings[0][0].length);
  const nextHeading = /^## /gm.exec(after);
  const checkpoint = (
    nextHeading ? after.slice(0, nextHeading.index) : after
  ).trim();
  const words = checkpoint ? checkpoint.split(/\s+/).length : 0;
  const bytes = Buffer.byteLength(checkpoint, 'utf8');
  return {
    name: packet.rel,
    words,
    bytes,
    issue: !words ? 'Empty checkpoint' : undefined,
    review: words > limit,
  };
});

results.sort((a, b) => b.words - a.words || a.name.localeCompare(b.name));

const ledgerResults = packets
  .map((packet) => {
    const pathname = path.join(packet.absDir, 'CHANGE.md');
    let text;
    try {
      text = readFileSync(pathname, 'utf8');
    } catch (error) {
      return {
        name: packet.rel,
        issue: 'CHANGE.md unreadable: ' + error.message,
      };
    }
    if (!changeNeedsLedger(text)) return null;
    const hasLedger = /^## Reconciliation ledger\b/m.test(text);
    return {
      name: packet.rel,
      issue: hasLedger
        ? undefined
        : 'Done CHANGE.md missing ## Reconciliation ledger (required before Done)',
    };
  })
  .filter(Boolean);

if (
  process.argv.length > 2 &&
  !process.argv.slice(2).every((arg) => arg === '--json')
) {
  console.error('Usage: pnpm repo:docs-health [--json]');
  process.exitCode = 1;
} else if (process.argv.includes('--json')) {
  console.log(
    JSON.stringify(
        {
          checkpointReviewWords: limit,
          packetCount: packets.length,
          results,
          doneWithoutReconciliationLedger: ledgerResults,
          documentationHealth: documentationHealthReport(root),
        },
      null,
      2,
    ),
  );
} else {
  console.log(
    'Change checkpoint health (read-only; advisory >' + limit + ' words):',
  );
  console.log('Packets scanned: ' + packets.length + ' (open/ + archive/).');
  if (!results.length)
    console.log('No Change execution plans found. An empty queue is valid.');
  for (const result of results) {
    const flag = result.issue ? 'INVALID' : result.review ? 'REVIEW' : 'ok';
    console.log(
      String(result.words).padStart(5) +
        ' words | ' +
        String(result.bytes).padStart(6) +
        ' bytes | ' +
        flag.padEnd(7) +
        ' | ' +
        result.name,
    );
    if (result.issue) console.log('  ' + result.issue);
  }
  console.log(
    'Done-packet reconciliation ledger (advisory; required by Change-close gate):',
  );
  const missing = ledgerResults.filter((row) => row.issue);
  if (!ledgerResults.length) {
    console.log('No Done CHANGE.md packets scanned, or none marked Done.');
  } else if (!missing.length) {
    console.log(
      'ok | all ' + ledgerResults.length + ' Done packets declare a ledger heading',
    );
  } else {
    for (const row of missing) {
      console.log('MISSING | ' + row.name);
      console.log('  ' + row.issue);
    }
    console.log(
      String(missing.length) +
        ' / ' +
        ledgerResults.length +
        ' Done packets lack ## Reconciliation ledger (historical packets may predate the gate).',
    );
  }
  console.log(
    'Review flags are not failure gates. Move durable evidence to its owner and keep checkpoints actionable.',
  );

  // DOC01 P7 gardening: forbidden transient path classes under docs/ (names, not prose).
  const forbiddenDirNames = new Set([
    'programs',
    'engineering',
    'history',
    'changes',
    'operations',
    'handoff',
    'evidence',
    'evaluations',
    'minutes',
    'archive',
    'audits',
  ]);
  const allowedTopDirs = new Set([
    'product',
    'technical',
    'decisions',
    'runbooks',
  ]);
  const docsRoot = path.join(root, 'docs');
  /** @type {string[]} */
  const legacy = [];
  /** @type {string[]} */
  const unexpectedTop = [];
  function walkForbidden(dir, relBase) {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const rel = relBase + '/' + entry.name;
      if (forbiddenDirNames.has(entry.name)) {
        legacy.push(rel);
        continue; // do not descend into flagged trees
      }
      walkForbidden(path.join(dir, entry.name), rel);
    }
  }
  if (existsSync(docsRoot)) {
    for (const entry of readdirSync(docsRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (forbiddenDirNames.has(entry.name)) {
        legacy.push('docs/' + entry.name);
        continue;
      }
      if (!allowedTopDirs.has(entry.name)) {
        unexpectedTop.push('docs/' + entry.name);
      }
      walkForbidden(path.join(docsRoot, entry.name), 'docs/' + entry.name);
    }
  }
  // Default strict after P6. Set DOC01_TAXONOMY_STRICT=0 for advisory-only.
  const strictTaxonomy = process.env.DOC01_TAXONOMY_STRICT !== '0';
  console.log(
    'DOC01 taxonomy (' +
      (strictTaxonomy ? 'STRICT' : 'advisory') +
      '):',
  );
  if (!legacy.length && !unexpectedTop.length) {
    console.log('ok | docs/ namespaces within product|technical|decisions|runbooks');
  } else {
    for (const name of legacy.sort()) {
      console.log('FORBIDDEN | ' + name);
    }
    for (const name of unexpectedTop.sort()) {
      console.log('UNEXPECTED | ' + name + ' (needs owner rationale or relocate)');
    }
    if (strictTaxonomy && legacy.length) {
      console.error(
        'DOC01 taxonomy STRICT: forbidden docs/ path classes present.',
      );
      process.exitCode = 1;
    }
  }
}

  reportKnowledge(root, { json: process.argv.includes('--json') });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}
