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
function currentChange(route, changesDirRelative = 'docs/changes') {
  const declarations = [...route.matchAll(/^Current change: (.+?)\s*$/gm)];
  if (declarations.length !== 1) {
    throw new Error(
      `${changesDirRelative}/README.md: expected exactly one Current change declaration.`,
    );
  }
  const selected = declarations[0][1].trim();
  if (selected === 'none') return null;
  const match = /^\[[^\]]+\]\(([^)]+)\)$/.exec(selected);
  if (!match || match[1].includes('#')) {
    throw new Error(
      'Current change must be none or a relative CHANGE.md link.',
    );
  }
  const changeRoot = path.join(root, ...changesDirRelative.split('/'));
  const absolute = path.resolve(changeRoot, match[1]);
  const relativeToRoot = path.relative(root, absolute).split(path.sep).join('/');
  if (
    path.basename(absolute) !== 'CHANGE.md' ||
    !(
      relativeToRoot.startsWith('work/changes/') ||
      relativeToRoot.startsWith('work/changes/')
    )
  ) {
    throw new Error(
      'Current change must point to CHANGE.md under work/changes/ or work/changes/.',
    );
  }
  return relativeToRoot;
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
    const statusPath = existsSync(path.join(root, 'STATUS.md'))
      ? 'STATUS.md'
      : 'docs/progress.md';
    const orientation = section(
      read(statusPath),
      '## Orientation',
      statusPath,
    );
    // DOC01: prefer work/changes when it declares Current change; else docs/changes.
    const workChanges = path.join(root, 'work', 'changes', 'README.md');
    let changeRoute = 'work/changes/README.md';
    let changeDoc = read(changeRoute);
    if (existsSync(workChanges)) {
      const workDoc = readFileSync(workChanges, 'utf8');
      if (/^Current change: /m.test(workDoc) && !/^Current change: see /im.test(workDoc)) {
        changeRoute = 'work/changes/README.md';
        changeDoc = workDoc;
      }
    }
    const change = currentChange(
      changeDoc,
      changeRoute.replace(/\/README\.md$/, ''),
    );
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
    console.log(`\n## Orientation (${statusPath})\n${orientation}`);
    console.log(`\n## Current Change\n${change ?? 'None selected (valid).'}`);
    if (args.includes('--checkpoint')) {
      console.log(
        `\n## Current checkpoint\n${checkpoint ?? 'No active implementation Change.'}`,
      );
    }
    console.log('\n## Read next');
    console.log('STATUS.md — demonstrated boundary');
    console.log('ROADMAP.md — owner strategy (see also TODO.md)');
    console.log(`${changeRoute} — Change queue and execution contract`);
    console.log('docs/product/README.md — product bible map');
    console.log('docs/technical/README.md — technical owner map');
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
