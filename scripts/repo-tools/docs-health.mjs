// Read-only, zero-provider-cost review of Change execution checkpoints and
// Done-packet reconciliation ledgers. Advisory only; not a repo-wide rewrite.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { root } from './process.mjs';

const changesRoot = path.join(root, 'docs', 'changes');
const limit = 300; // Advisory review trigger; not a hard gate.
const directories = readdirSync(changesRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

const planEntries = directories.filter((name) =>
  existsSync(path.join(changesRoot, name, 'PLAN.md')),
);

const results = planEntries.map((name) => {
  const pathname = path.join(changesRoot, name, 'PLAN.md');
  let text;
  try {
    text = readFileSync(pathname, 'utf8');
  } catch (error) {
    return {
      name,
      words: 0,
      bytes: 0,
      issue: 'PLAN.md unreadable: ' + error.message,
    };
  }
  const headings = [...text.matchAll(/^## Current checkpoint\s*$/gm)];
  if (headings.length !== 1) {
    return {
      name,
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
    name,
    words,
    bytes,
    issue: !words ? 'Empty checkpoint' : undefined,
    review: words > limit,
  };
});

results.sort((a, b) => b.words - a.words || a.name.localeCompare(b.name));

const ledgerResults = directories
  .map((name) => {
    const pathname = path.join(changesRoot, name, 'CHANGE.md');
    if (!existsSync(pathname)) return null;
    let text;
    try {
      text = readFileSync(pathname, 'utf8');
    } catch (error) {
      return {
        name,
        issue: 'CHANGE.md unreadable: ' + error.message,
      };
    }
    const done =
      /\*\*State:\*\*[^*]*\bDone\b/i.test(text) ||
      /^\*\*State:\*\*[^\n]*\bDone\b/im.test(text) ||
      /^State:\s*[^\n]*\bDone\b/im.test(text);
    if (!done) return null;
    const hasLedger = /^## Reconciliation ledger\b/m.test(text);
    return {
      name,
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
}
