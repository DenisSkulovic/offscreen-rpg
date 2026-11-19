/**
 * Maintained wiki graph health. Zero provider, zero network.
 *
 * pnpm wiki:health
 * pnpm wiki:health --json
 * pnpm wiki:health --self-test
 * pnpm wiki:graph
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { root } from './process.mjs';

export const WIKI_HEALTH_NOT_RUN_EXIT = 3;

export function missingWikiDependency(error) {
  const code = error && error.code;
  const message = error instanceof Error ? error.message : String(error);
  return code === 'ERR_MODULE_NOT_FOUND'
    || /Cannot find package|Cannot find module|ERR_MODULE_NOT_FOUND/i.test(message);
}

async function defaultWikiLoader() {
  return import('./wiki-core/model.mjs');
}

/**
 * Run the wiki graph checker. A missing Node dependency is NOT-RUN (exit 3),
 * which is neither PASS (0) nor FAIL (1).
 */
export async function executeWikiHealth(repo, meta = {}, loader = defaultWikiLoader) {
  let imported;
  try {
    imported = await loader();
  } catch (error) {
    if (missingWikiDependency(error)) {
      return {
        status: 'NOT-RUN',
        exitCode: WIKI_HEALTH_NOT_RUN_EXIT,
        reason: 'Node dependencies required by the wiki parser are not installed.',
      };
    }
    throw error;
  }
  const model = imported.buildWikiModel(repo, meta);
  const hardErrors = model.health.integrity.hardErrors;
  return {
    status: hardErrors > 0 ? 'FAIL' : 'PASS',
    exitCode: hardErrors > 0 ? 1 : 0,
    hardErrors,
    model,
  };
}

function reportNotRun(reason) {
  console.error('Wiki health: NOT-RUN');
  console.error(reason);
  console.error('This result is not a pass and not a documentation failure.');
  process.exit(WIKI_HEALTH_NOT_RUN_EXIT);
}

function gitMeta(repo) {
  const sha = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' });
  const status = spawnSync('git', ['status', '--porcelain'], { cwd: repo, encoding: 'utf8' });
  if (sha.status !== 0) {
    return { repoSha: null, dirty: null };
  }
  return {
    repoSha: sha.stdout.trim(),
    dirty: Boolean(status.stdout && status.stdout.trim()),
  };
}

function dotEscape(value) {
  return String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}

function toDot(graph) {
  const lines = ['digraph wiki {', '  rankdir=LR;'];
  for (const edge of graph.edges) {
    if (edge.kind === 'image' || edge.kind === 'observed-in') continue;
    const label = edge.toAnchor ? `${edge.kind} #${edge.toAnchor}` : edge.kind;
    lines.push(
      `  "${dotEscape(edge.from)}" -> "${dotEscape(edge.to)}" [label="${dotEscape(label)}"];`,
    );
  }
  lines.push('}');
  return `${lines.join('\n')}\n`;
}

function printHuman(model) {
  const { health, issues } = model;
  const hard = issues.filter((item) => item.severity === 'error');
  const warnings = issues.filter((item) => item.severity === 'warning');
  console.log(
    `Wiki health @ ${health.repoSha ?? 'unknown'}${health.dirty ? ' (dirty worktree)' : ''}`,
  );
  console.log(
    `Integrity  broken paths: ${health.integrity.brokenPaths}  anchors: ${health.integrity.brokenAnchors}  case: ${health.integrity.caseMismatches}  authority: ${health.integrity.authorityRoutes}  unreachable: ${health.integrity.unreachableCanonical}`,
  );
  console.log(
    `Topology   canonical: ${health.denominators.canonicalPages}  reachable: ${health.denominators.reachableCanonical}  p50: ${health.discoverability.hopMedian ?? 'n/a'}  p95: ${health.discoverability.hopP95 ?? 'n/a'}  max: ${health.discoverability.hopMax ?? 'n/a'}  orphans: ${health.discoverability.orphanWarnings}`,
  );
  console.log(`Schema     ${health.schema} / graph ${model.graph.schema}`);
  const shown = hard.slice(0, 25);
  if (shown.length > 0) {
    console.log('Hard errors:');
    for (const item of shown) {
      console.log(`  ${item.path}${item.line ? `:${item.line}` : ''}  ${item.code}  ${item.target ?? ''}  ${item.message}`);
    }
    if (hard.length > shown.length) console.log(`  … ${hard.length - shown.length} more hard errors`);
  }
  if (warnings.length > 0) {
    console.log(`Warnings: ${warnings.length} (showing 10)`);
    for (const item of warnings.slice(0, 10)) {
      console.log(`  ${item.path}${item.line ? `:${item.line}` : ''}  ${item.code}  ${item.message}`);
    }
  }
}

function writeReports(repo, model) {
  const folderName = `${model.health.repoSha ?? 'unknown'}${model.health.dirty ? '-dirty' : ''}`;
  const dir = path.join(repo, 'out', 'wiki-health', folderName);
  mkdirSync(dir, { recursive: true });
  const generatedAt = new Date().toISOString();
  const health = { ...model.health, generatedAt };
  const graph = { ...model.graph, generatedAt };
  writeFileSync(path.join(dir, 'metrics.json'), `${JSON.stringify(health, null, 2)}\n`);
  writeFileSync(path.join(dir, 'issues.json'), `${JSON.stringify(model.issues, null, 2)}\n`);
  writeFileSync(path.join(dir, 'graph.json'), `${JSON.stringify(graph, null, 2)}\n`);
  writeFileSync(path.join(dir, 'graph.dot'), toDot(graph));
  return dir;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const known = new Set(['--json', '--self-test', '--graph']);
  for (const arg of args) {
    if (!known.has(arg)) {
      console.error(`Unknown argument: ${arg}`);
      process.exit(2);
    }
  }
  if (args.has('--self-test')) {
    try {
      const selfTest = await import('./wiki-core/self-test.mjs');
      process.exit(selfTest.runSelfTest());
    } catch (error) {
      if (missingWikiDependency(error)) {
        reportNotRun('Node dependencies required by the wiki parser are not installed.');
      }
      throw error;
    }
  }
  const meta = gitMeta(root);
  const started = performance.now();
  let executed;
  try {
    executed = await executeWikiHealth(root, meta);
  } catch (error) {
    if (missingWikiDependency(error)) {
      reportNotRun('Node dependencies required by the wiki parser are not installed.');
    }
    throw error;
  }
  if (executed.status === 'NOT-RUN') reportNotRun(executed.reason);
  const model = executed.model;
  const dir = writeReports(root, model);
  const elapsed = Math.round(performance.now() - started);
  if (args.has('--json')) {
    console.log(JSON.stringify({ ...model.health, generatedAt: new Date().toISOString(), outputDir: dir, elapsedMs: elapsed }, null, 2));
  } else if (args.has('--graph')) {
    console.log(`Wrote ${path.join(dir, 'graph.dot')}`);
    console.log(`Wiki graph ${model.graph.schema} @ ${meta.repoSha ?? 'unknown'} nodes=${model.graph.nodes.length} edges=${model.graph.edges.length}`);
  } else {
    printHuman(model);
    console.log(`Output     ${dir}`);
    console.log(`Elapsed    ${elapsed} ms`);
  }
  process.exit(model.health.integrity.hardErrors > 0 ? 1 : 0);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}
