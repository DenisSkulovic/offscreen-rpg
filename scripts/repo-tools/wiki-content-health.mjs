/**
 * pnpm wiki:content-health
 * pnpm wiki:content-health --json
 * pnpm wiki:content-health --changed <base-sha>
 * pnpm wiki:content-health --self-test
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanDocuments } from './wiki-core/content-health.mjs';
import { root } from './process.mjs';

function git(repo, args) {
  const result = spawnSync('git', args, { cwd: repo, encoding: 'utf8' });
  if (result.status !== 0) return null;
  return result.stdout.trim();
}

function walk(repo, dirRel, out) {
  const abs = path.join(repo, ...dirRel.split('/').filter(Boolean));
  if (!existsSync(abs)) return;
  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'out') continue;
    const rel = `${dirRel}/${entry.name}`.replace(/^\//, '');
    if (entry.isDirectory()) {
      if (rel.includes('work/changes/archive')) continue;
      walk(repo, rel, out);
    } else if (entry.name.endsWith('.md')) out.push(rel.replaceAll('\\', '/'));
  }
}

function scriptNames(repo) {
  const names = new Set();
  for (const rel of ['package.json', 'apps/web/package.json']) {
    const abs = path.join(repo, rel);
    if (!existsSync(abs)) continue;
    const parsed = JSON.parse(readFileSync(abs, 'utf8'));
    for (const name of Object.keys(parsed.scripts ?? {})) names.add(name);
  }
  return [...names];
}

function documents(repo, only) {
  const paths = [];
  if (only) paths.push(...only.filter((rel) => rel.endsWith('.md') && existsSync(path.join(repo, rel))));
  else {
    for (const start of ['docs', '.agents']) walk(repo, start, paths);
    for (const file of ['AGENTS.md', 'STATUS.md']) {
      if (existsSync(path.join(repo, file))) paths.push(file);
    }
  }
  return paths.map((rel) => ({ path: rel, text: readFileSync(path.join(repo, rel), 'utf8') }));
}

function argValue(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] ?? null : null;
}

export async function main(argv = process.argv.slice(2)) {
  if (argv.includes('--self-test')) {
    const selfTest = await import('./wiki-core/content-health-self-test.mjs');
    return selfTest.runContentHealthSelfTest();
  }
  const json = argv.includes('--json');
  const changed = argValue(argv, '--changed');
  const sha = git(root, ['rev-parse', 'HEAD']);
  const dirty = Boolean(git(root, ['status', '--porcelain']));
  let only = null;
  if (changed) {
    const names = git(root, ['diff', '--name-only', changed]);
    only = names ? names.split(/\r?\n/).filter(Boolean) : [];
  }
  const report = {
    ...scanDocuments(documents(root, only), {
      scripts: scriptNames(root),
      exists: (rel) => existsSync(path.join(root, rel)),
    }),
    repoSha: sha,
    dirty,
    changed: changed ?? null,
  };
  const dir = path.join(root, 'out', 'wiki-health', `${sha ?? 'unknown'}${dirty ? '-dirty' : ''}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'content-health.json'), JSON.stringify(report, null, 2));
  if (json) {
    console.log(JSON.stringify(report, null, 2));
    return 0;
  }
  console.log(`wiki.content-health.v1 @ ${sha ?? 'unknown'}${dirty ? ' dirty' : ''}`);
  console.log(`${report.issues.length} review candidates. A candidate is not a truth score.`);
  const counts = new Map();
  for (const item of report.issues) counts.set(item.code, (counts.get(item.code) ?? 0) + 1);
  for (const [code, count] of counts) console.log(`  ${code}: ${count}`);
  for (const item of report.issues.slice(0, 15)) {
    console.log(`  ${item.path}${item.line ? `:${item.line}` : ''}  ${item.code}  ${item.quote}`);
  }
  if (report.issues.length > 15) console.log(`  … ${report.issues.length - 15} more`);
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  process.exit(await main());
}
