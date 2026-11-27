/**
 * Read-only Change plan/close guard. Zero provider, zero writes.
 *
 * pnpm wiki:change-guard --mode plan --change work/changes/open/<leaf>
 *   or work/changes/open/<design-slug>/<leaf>
 * pnpm wiki:change-guard --mode close --change work/changes/open/<leaf> --base <git-sha>
 * pnpm wiki:change-guard --self-test
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { guardChange } from './wiki-core/change-guard.mjs';
import { root } from './process.mjs';

function argValue(args, name) {
  const index = args.indexOf(name);
  if (index < 0) return null;
  return args[index + 1] ?? null;
}

function gitChangedPaths(repo, base) {
  function read(args) {
    const result = spawnSync('git', args, { cwd: repo, encoding: 'utf8' });
    if (result.status !== 0) {
      return { error: (result.stderr || result.stdout || 'git failed').trim() };
    }
    return { paths: result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) };
  }
  const diff = read(['diff', '--name-only', base]);
  if (diff.error) return diff;
  const untracked = read(['ls-files', '--others', '--exclude-standard']);
  if (untracked.error) return untracked;
  return { paths: [...new Set([...diff.paths, ...untracked.paths])] };
}

function printHuman(result) {
  console.log(`${result.schema} ${result.mode} ${result.status}`);
  if (result.change) console.log(result.change);
  if (result.findings.length === 0) {
    console.log('No findings.');
    return;
  }
  for (const item of result.findings) {
    const where = `${item.path ?? '-'}${item.line ? `:${item.line}` : ''}`;
    console.log(`${where}  ${item.severity}  ${item.code}  ${item.field}  ${item.message}`);
  }
}

export async function main(argv = process.argv.slice(2)) {
  if (argv.includes('--self-test')) {
    const selfTest = await import('./wiki-core/change-guard-self-test.mjs');
    return selfTest.runChangeGuardSelfTest();
  }
  const json = argv.includes('--json');
  const mode = argValue(argv, '--mode');
  const change = argValue(argv, '--change');
  const base = argValue(argv, '--base');
  if (mode !== 'plan' && mode !== 'close') {
    console.error('Pass --mode plan or --mode close, or --self-test.');
    return 2;
  }
  if (mode === 'close' && !change) {
    console.error('Close mode requires --change. It will not pick a packet.');
    return 2;
  }
  let changedPaths = [];
  if (mode === 'close' && change && !String(change).replaceAll('\\', '/').includes('work/changes/archive/')) {
    if (!base) {
      console.error('Close mode requires --base <git-sha> so the diff is explicit.');
      return 2;
    }
    const diff = gitChangedPaths(root, base);
    if (diff.error) {
      console.error(diff.error);
      return 1;
    }
    changedPaths = diff.paths;
  }
  let historyStatus = null;
  if (mode === 'close') {
    const shallow = spawnSync('git', ['rev-parse', '--is-shallow-repository'], {
      cwd: root,
      encoding: 'utf8',
    });
    if (shallow.status !== 0 || shallow.stdout.trim() === 'true') historyStatus = 'unavailable';
  }
  const result = guardChange({ repo: root, mode, changePath: change, changedPaths, historyStatus });
  if (json) console.log(JSON.stringify(result, null, 2));
  else printHuman(result);
  return result.status === 'failed' ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  process.exit(await main());
}
