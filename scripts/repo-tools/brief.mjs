import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fail, root, run } from './process.mjs';

function read(relative) {
  return readFileSync(path.join(root, relative), 'utf8');
}

// These two small Markdown contracts are maintained in the documentation rule.
// Fail visibly when an owner changes them instead of printing an empty brief.
function section(document, heading, source) {
  const lines = document.split(/\r?\n/);
  const starts = lines.flatMap((line, index) =>
    line === heading ? [index] : [],
  );
  if (starts.length !== 1) {
    throw new Error(`${source}: expected exactly one "${heading}" section.`);
  }
  const body = lines.slice(starts[0] + 1);
  const end = body.findIndex((line) => /^#{1,2} /.test(line));
  const value = body
    .slice(0, end < 0 ? undefined : end)
    .join('\n')
    .trim();
  if (!value) throw new Error(`${source}: "${heading}" is empty.`);
  return value;
}

function currentPlan(route) {
  const links = [
    ...route.matchAll(/^Current plan: \[[^\]]+\]\(([^)]+)\)\s*$/gm),
  ];
  if (links.length !== 1) {
    throw new Error(
      'docs/features/README.md: expected one Current plan: Markdown link.',
    );
  }
  const absolute = path.resolve(root, 'docs/features', links[0][1]);
  const relative = path.relative(path.join(root, 'docs/features'), absolute);
  if (
    relative.startsWith('..') ||
    path.isAbsolute(relative) ||
    path.basename(absolute) !== 'PLAN.md'
  ) {
    throw new Error(
      'Current plan must point to a PLAN.md inside docs/features.',
    );
  }
  return path.relative(root, absolute).split(path.sep).join('/');
}

try {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log('Usage: pnpm repo:brief [--checkpoint]');
    console.log(
      'Read-only Git/status/route summary. --checkpoint includes only the selected plan checkpoint.',
    );
  } else {
    if (args.some((arg) => arg !== '--checkpoint')) {
      throw new Error(
        'Unknown argument. Usage: pnpm repo:brief [--checkpoint]',
      );
    }
    const orientation = section(
      read('docs/progress.md'),
      '## Orientation',
      'docs/progress.md',
    );
    const plan = currentPlan(read('docs/features/README.md'));
    const checkpoint = section(read(plan), '## Current checkpoint', plan);

    console.log('# Repository brief');
    console.log(
      `Branch: ${run('git', ['branch', '--show-current'], { capture: true })}`,
    );
    console.log('\n## Working tree');
    console.log(
      run('git', ['status', '--short'], { capture: true }) || 'clean',
    );
    console.log('\n## Recent commits');
    console.log(run('git', ['log', '-3', '--oneline'], { capture: true }));
    console.log(`\n## Orientation (docs/progress.md)\n${orientation}`);
    console.log(`\n## Current gameplay plan\n${plan}`);
    if (args.includes('--checkpoint')) {
      console.log(`\n## Current checkpoint\n${checkpoint}`);
    }
    console.log('\n## Read next');
    console.log('docs/README.md — choose a question and depth');
    console.log(
      'docs/engineering/code-navigation.md — find the implemented owner',
    );
    console.log(
      '.agents/README.md — conditional rules and repository commands',
    );
    console.log(
      'Use --checkpoint to include the selected handoff; no services or providers are contacted.',
    );
  }
} catch (error) {
  fail(error);
}
