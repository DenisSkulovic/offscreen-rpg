import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fail, root, run } from './process.mjs';

function read(relative) {
  return readFileSync(path.join(root, relative), 'utf8');
}

function paragraph(document, prefix) {
  return document
    .split(/\r?\n/)
    .find((line) => line.startsWith(prefix))
    ?.trim();
}

function checkpoint(relative) {
  const document = read(relative);
  const marker = '## Current checkpoint';
  const start = document.indexOf(marker);
  if (start < 0) return null;
  return document
    .slice(start)
    .split(/\r?\n## /, 1)[0]
    .trim();
}

try {
  const progress = read('docs/progress.md');
  const route = read('docs/features/README.md');
  console.log('# Repository brief');
  console.log(
    `Branch: ${run('git', ['branch', '--show-current'], { capture: true })}`,
  );
  console.log('\n## Working tree');
  console.log(run('git', ['status', '--short'], { capture: true }) || 'clean');
  console.log('\n## Recent commits');
  console.log(run('git', ['log', '-5', '--oneline'], { capture: true }));
  console.log('\n## Product status');
  for (const prefix of [
    '**Prepared implementation work:**',
    '**Current focus:**',
  ]) {
    const value = paragraph(progress, prefix);
    if (value) console.log(value);
  }
  const prepared = paragraph(route, 'Current prepared work:');
  if (prepared) console.log(`\n## Coding route\n${prepared}`);
  const plans = [
    'docs/features/2026-09-19--19-08--bounded-storyteller-cost/PLAN.md',
    'docs/features/2026-09-19--18-49--canonical-campaign-storage/PLAN.md',
    'docs/features/2026-09-18--20-09--storyteller-memory-and-recall/PLAN.md',
  ];
  console.log('\n## Prepared feature checkpoints');
  for (const plan of plans) {
    const value = checkpoint(plan);
    if (value) console.log(`\n${plan}\n${value}`);
  }
  console.log('\n## Repeated operations');
  console.log('pnpm infra ps');
  console.log('pnpm db:baseline');
  console.log('pnpm test:focus storyteller "test name pattern"');
} catch (error) {
  fail(error);
}
