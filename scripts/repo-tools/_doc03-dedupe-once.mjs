import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dropToKeeper = new Map([
  [
    'evidence/inspections/doc01-retained-observations/programs/experience/evidence/renders/ux01-story-frame-1440.png',
    'evidence/inspections/ux01-story-frame/ux01-story-frame-1440.png',
  ],
  [
    'evidence/inspections/doc01-retained-observations/programs/experience/evidence/renders/ux01-story-frame-375.png',
    'evidence/inspections/ux01-story-frame/ux01-story-frame-375.png',
  ],
  [
    'evidence/inspections/doc01-retained-observations/programs/observability/evaluations/2026-11-15--connected-forensic-trial/S1-CAMPAIGN-IDS.json',
    'evidence/runs/2026-11-15--connected-forensic-trial/S1-CAMPAIGN-IDS.json',
  ],
  [
    'evidence/inspections/doc01-retained-observations/programs/observability/evaluations/2026-11-15--connected-forensic-trial/S2-LEDGER.json',
    'evidence/runs/2026-11-15--connected-forensic-trial/S2-LEDGER.json',
  ],
  [
    'evidence/inspections/doc01-retained-observations/programs/observability/evaluations/2026-11-15--connected-forensic-trial/S3-FAULT-MATRIX.json',
    'evidence/runs/2026-11-15--connected-forensic-trial/S3-FAULT-MATRIX.json',
  ],
  [
    'evidence/inspections/doc01-retained-observations/programs/observability/evidence/assets/obs07-support-situation-synthetic.png',
    'evidence/runs/obs07-support-situation/assets/obs07-support-situation-synthetic.png',
  ],
  [
    'evidence/runs/observability-program-2026-11-15/assets/obs07-support-situation-synthetic.png',
    'evidence/runs/obs07-support-situation/assets/obs07-support-situation-synthetic.png',
  ],
  [
    'evidence/runs/observability-program-2026-11-15/obs06-case-scoped-situation-read-2026-11-15.md',
    'evidence/runs/obs06-case-scoped-situation/obs06-case-scoped-situation-read-2026-11-15.md',
  ],
  [
    'evidence/inspections/doc01-retained-observations/programs/observability/evidence/obs06-support-situation-source-audit-2026-11-15.md',
    'evidence/runs/observability-program-2026-11-15/obs06-support-situation-source-audit-2026-11-15.md',
  ],
  [
    'evidence/runs/observability-program-2026-11-15/qa-sf01-storyteller-integration-2026-11-15.md',
    'evidence/runs/qa-sf01-storyteller-integration/qa-sf01-storyteller-integration-2026-11-15.md',
  ],
  [
    'evidence/runs/qa-sf01-storyteller-integration-2026-11-15.md',
    'evidence/runs/qa-sf01-storyteller-integration/qa-sf01-storyteller-integration-2026-11-15.md',
  ],
]);

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const abs = path.join(dir, entry.name);
    const rel = path.relative(root, abs).replaceAll('\\', '/');
    if (rel === 'work/changes/archive' || rel.startsWith('work/changes/archive/')) continue;
    if (entry.isDirectory()) walk(abs, out);
    else if (/\.(md|mdc)$/.test(entry.name)) out.push(abs);
  }
  return out;
}

let fixed = 0;
for (const abs of walk(root)) {
  const rel = path.relative(root, abs).replaceAll('\\', '/');
  const before = readFileSync(abs, 'utf8');
  const after = before.replace(/\]\(([^)\s]+)\)/g, (match, href) => {
    const pathPart = href.split('#')[0];
    if (!pathPart || /^(https?:|mailto:)/.test(href)) return match;
    const resolved = path.relative(root, path.resolve(path.dirname(abs), pathPart)).replaceAll('\\', '/');
    const keeper = dropToKeeper.get(resolved);
    if (!keeper) return match;
    let next = path.relative(path.dirname(abs), path.join(root, keeper)).replaceAll('\\', '/');
    if (!next.startsWith('.')) next = `./${next}`;
    const hash = href.includes('#') ? `#${href.split('#').slice(1).join('#')}` : '';
    fixed += 1;
    return `](${next}${hash})`;
  });
  if (after !== before) writeFileSync(abs, after);
}

for (const rel of dropToKeeper.keys()) {
  if (existsSync(path.join(root, rel))) {
    execFileSync('git', ['rm', '-f', rel], { cwd: root, stdio: 'inherit' });
  }
}
console.log(`rewired ${fixed} duplicate links`);
