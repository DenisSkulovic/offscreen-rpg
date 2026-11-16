// Read-only, zero-provider-cost review of Change execution checkpoints and
// Done-packet reconciliation ledgers. Advisory only; not a repo-wide rewrite.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { root } from './process.mjs';

const changesRoot = path.join(root, 'docs', 'changes');
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
    const done =
      /\*\*State:\*\*[^*]*\bDone\b/i.test(text) ||
      /\*\*State:[^*]*\bDone\b/i.test(text) ||
      /\*\*Status:\*\*[^*]*\bDone\b/i.test(text) ||
      /\*\*Status:[^*]*\bDone\b/i.test(text) ||
      /^State:\s*[^\n]*\bDone\b/im.test(text) ||
      /^Status:\s*[^\n]*\bDone\b/im.test(text);
    if (!done) return null;
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

  // DOC01 taxonomy: forbidden transient classes inside canonical docs/ (advisory while migration open).
  const forbiddenTop = new Set([
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
  const docsRoot = path.join(root, 'docs');
  const legacy = [];
  if (existsSync(docsRoot)) {
    for (const entry of readdirSync(docsRoot, { withFileTypes: true })) {
      if (entry.isDirectory() && forbiddenTop.has(entry.name)) {
        legacy.push('docs/' + entry.name);
      }
    }
  }
  console.log('DOC01 taxonomy (advisory during migration; hard gate after P6):');
  if (!legacy.length) {
    console.log('ok | no forbidden top-level docs/ namespaces');
  } else {
    for (const name of legacy.sort()) {
      console.log('LEGACY | ' + name + ' (retire after DOC01 no-loss proof)');
    }
  }
}
