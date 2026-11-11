import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fail, root, run } from './process.mjs';

function read(relative) {
  return readFileSync(path.join(root, relative), 'utf8');
}

// These Markdown headings are maintained in the documentation rule.
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

// An intentionally empty implementation queue is valid. Never select a parked
// gameplay Change merely to make the brief happy.
function currentChange(route) {
  const declarations = [
    ...route.matchAll(/^Current change: (.+?)\s*$/gm),
  ];
  if (declarations.length !== 1) {
    throw new Error(
      'docs/changes/README.md: expected exactly one Current change declaration.',
    );
  }
  const selected = declarations[0][1].trim();
  if (selected === 'none') return null;
  const match = /^\[[^\]]+\]\(([^)]+)\)$/.exec(selected);
  if (!match || match[1].includes('#')) {
    throw new Error('Current change must be none or a relative CHANGE.md link.');
  }
  const changeRoot = path.join(root, 'docs', 'changes');
  const absolute = path.resolve(changeRoot, match[1]);
  const relative = path.relative(changeRoot, absolute);
  if (
    relative.startsWith('..') ||
    path.isAbsolute(relative) ||
    path.basename(absolute) !== 'CHANGE.md'
  ) {
    throw new Error('Current change must point to CHANGE.md inside docs/changes.');
  }
  return path.relative(root, absolute).split(path.sep).join('/');
}

try {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log('Usage: pnpm repo:brief [--checkpoint]');
    console.log(
      'Read-only Git/status/priority summary. --checkpoint includes a selected Change checkpoint, when one exists.',
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
    const change = currentChange(read('docs/changes/README.md'));
    let checkpoint = null;
    if (change && args.includes('--checkpoint')) {
      const plan = path.posix.join(path.posix.dirname(change), 'PLAN.md');
      checkpoint = existsSync(path.join(root, plan))
        ? section(read(plan), '## Current checkpoint', plan)
        : section(read(change), '## Handoff and next action', change);
    }

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
    console.log(`\n## Current Change\n${change ?? 'None selected (valid).'}`);
    if (args.includes('--checkpoint')) {
      console.log(
        `\n## Current checkpoint\n${checkpoint ?? 'No active implementation Change.'}`,
      );
    }
    console.log('\n## Read next');
    console.log('TODO.md — current engineering-portfolio priority');
    console.log('docs/changes/README.md — Change queue and execution contract');
    console.log('docs/README.md — choose a question and depth');
    console.log(
      'docs/engineering/code-navigation.md — find the implemented owner',
    );
    console.log(
      '.agents/README.md — conditional rules and repository commands',
    );
    console.log(
      'Use --checkpoint for an active Change handoff; no services or providers are contacted.',
    );
  }
} catch (error) {
  fail(error);
}
