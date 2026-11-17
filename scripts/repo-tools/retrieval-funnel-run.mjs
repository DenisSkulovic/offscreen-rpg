import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { root } from './process.mjs';
import { FUNNEL_CASES } from './retrieval-funnel-oracle.mjs';
import { FUNNEL_SCHEMA, evaluateFunnel } from './wiki-core/retrieval-funnel.mjs';

const EXCLUDES = [
  '!node_modules',
  '!.git',
  '!out',
  '!.grepai',
  '!scripts/repo-tools/semantic-pilot*',
  '!scripts/repo-tools/retrieval-funnel*',
  '!work/changes/archive/**',
  '!work/changes/open/2026-11-17--har06-retrieval-funnel/**',
  '!**/HAR06-DECISION.md',
];

function run(command, args, timeout = 20000) {
  const started = Date.now();
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout,
  });
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    ms: Date.now() - started,
    error: result.error ? result.error.message : null,
  };
}

function gitFact(args) {
  const result = run('git', args, 10000);
  return result.status === 0 ? result.stdout.trim() : null;
}

function rgHits(query, origin) {
  const result = run('rg', ['-n', '--max-count', '5', ...EXCLUDES.flatMap((item) => ['-g', item]), query], 15000);
  if (result.status !== 0 && result.status !== 1) {
    return { failed: true, hits: [], ms: result.ms, error: (result.stderr || result.error || '').slice(0, 300) };
  }
  const hits = result.stdout.split(/\r?\n/).filter(Boolean).slice(0, 8).map((line) => {
    const match = /^([^:]+):(\d+):(.*)$/.exec(line);
    return match
      ? { path: match[1].replaceAll('\\', '/'), line: Number(match[2]), text: match[3], origin, bytes: Buffer.byteLength(line) }
      : null;
  }).filter(Boolean);
  return { failed: false, hits, ms: result.ms, bytes: Buffer.byteLength(result.stdout) };
}

function collectLexical(queries, origin) {
  const hits = [];
  let ms = 0;
  let bytes = 0;
  let calls = 0;
  for (const query of queries) {
    if (hits.length >= 30) break;
    const found = rgHits(query, origin);
    calls += 1;
    ms += found.ms;
    bytes += found.bytes ?? 0;
    if (found.failed) return { status: 'failed', hits, ms, bytes, calls, error: found.error };
    for (const hit of found.hits) {
      if (hits.length >= 30) break;
      const key = `${hit.path}:${hit.line}`;
      if (!hits.some((item) => `${item.path}:${item.line}` === key)) hits.push(hit);
    }
  }
  return { status: 'ran', hits, ms, bytes, calls };
}

function wikiHits(question) {
  const result = run(process.execPath, [path.join(root, 'scripts/repo-tools/wiki-find.mjs'), question, '--json', '--top', '8'], 20000);
  if (result.status !== 0) return { status: 'failed', hits: [], ms: result.ms, error: (result.stderr || result.error || '').slice(0, 300) };
  const payload = JSON.parse(result.stdout);
  const primary = payload.primaryLane === 'proposal' ? payload.proposalLane : payload.normative;
  const extra = payload.primaryLane === 'proposal' ? [] : payload.proposalLane ?? [];
  const rows = [...(primary ?? []), ...extra];
  if (payload.statusCompanion) rows.push({ ...payload.statusCompanion, match: 'status-companion' });
  const hits = rows.slice(0, 12).map((item) => ({
    path: item.path,
    line: null,
    text: item.preview ?? '',
    authority: item.authority ?? null,
    notice: item.notice ?? null,
    match: item.match ?? null,
    origin: 'wiki',
    bytes: item.bytes ?? 0,
  }));
  return { status: 'ran', hits, ms: result.ms, bytes: Buffer.byteLength(result.stdout), calls: 1 };
}

function armFor(item, sha) {
  if (item.freshness) {
    return {
      A: { status: 'ran', sha, hits: [], ms: 0, calls: 0 },
      B: { status: 'ran', sha, hits: [], ms: 0, calls: 0 },
    };
  }
  const lexical = collectLexical(item.queries, 'rg');
  const wiki = wikiHits(item.question);
  const guidedHits = [...(wiki.hits ?? [])];
  for (const hit of lexical.hits ?? []) {
    if (guidedHits.length >= 30) break;
    guidedHits.push({ ...hit, origin: 'wiki-then-rg' });
  }
  return {
    A: { ...lexical, sha, tool: 'rg' },
    B: {
      status: wiki.status === 'failed' ? 'failed' : 'ran',
      sha,
      tool: 'wiki-find+rg',
      hits: guidedHits.slice(0, 30),
      ms: (wiki.ms ?? 0) + (lexical.ms ?? 0),
      bytes: (wiki.bytes ?? 0) + (lexical.bytes ?? 0),
      calls: (wiki.calls ?? 0) + (lexical.calls ?? 0),
      error: wiki.error ?? lexical.error ?? null,
    },
  };
}

function grepaiArm() {
  const bin = path.join(process.env.LOCALAPPDATA ?? '', 'offscreen-trial', 'grepai', 'grepai.exe');
  if (!existsSync(bin)) return { status: 'not-configured', hits: [], reason: 'grepai-absent' };
  const status = run(bin, ['status'], 15000);
  return {
    status: 'uncomparable',
    reason: 'index-revision-unattested',
    hits: [],
    note: (status.stdout || status.stderr || '').trim().slice(0, 400),
  };
}

export function runRetrievalFunnel() {
  const sha = gitFact(['rev-parse', 'HEAD']);
  const dirtyText = gitFact(['status', '--porcelain']) ?? '';
  const dirty = dirtyText.length > 0;
  const perCase = FUNNEL_CASES.map((item) => ({ item, arms: armFor(item, sha) }));
  const semantic = grepaiArm();
  const secretFile = path.join(root, 'out', 'retrieval-funnel', 'secret-probe.txt');
  mkdirSync(path.dirname(secretFile), { recursive: true });
  writeFileSync(secretFile, 'FUNNEL_SECRET_PROBE\n');
  const secret = collectLexical(['FUNNEL_SECRET_PROBE'], 'rg');
  const cases = perCase.map(({ item, arms }) => {
    const one = evaluateFunnel({
      schema: FUNNEL_SCHEMA,
      sha,
      dirty,
      cases: [item],
      arms: {
        A: { ...arms.A, dirty },
        B: { ...arms.B, dirty },
        C: { ...semantic, sha, dirty },
      },
    });
    return { ...one.cases[0], ms: { A: arms.A.ms ?? 0, B: arms.B.ms ?? 0 }, calls: { A: arms.A.calls ?? 0, B: arms.B.calls ?? 0 } };
  });
  const secretEval = evaluateFunnel({
    schema: FUNNEL_SCHEMA,
    sha,
    dirty,
    cases: [{ id: 'N1', forbiddenPath: 'secret-probe', secret: 'FUNNEL_SECRET_PROBE', review: 'unreviewed' }],
    arms: {
      A: { status: 'ran', sha, dirty, hits: secret.hits },
      B: { status: 'ran', sha, dirty, hits: [] },
      C: { ...semantic, sha, dirty },
    },
  });
  const report = {
    schema: FUNNEL_SCHEMA,
    sha,
    dirty,
    proxy: 'scripted-lexical-and-wiki',
    agentTrial: false,
    verifiedCount: 0,
    diagnosticOnly: true,
    fences: secretEval.fences,
    cases: [...cases, secretEval.cases[0]],
  };
  const dir = path.join(root, 'out', 'retrieval-funnel', sha ?? 'unknown');
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`${FUNNEL_SCHEMA} @ ${sha}${dirty ? ' dirty' : ''}`);
  console.log('Verified headline: none. Every case is unreviewed, so this run is diagnostic only.');
  console.log(`Optional semantic arm: ${semantic.status}${semantic.reason ? ` (${semantic.reason})` : ''}`);
  for (const item of report.cases) {
    const fused = item.fused ?? {};
    const view = fused.exploratory ?? fused;
    const label = (view.reason ?? fused.reason) === 'freshness-only'
      ? 'freshness'
      : item.id === 'N1'
      ? (view.leaked ? 'leak' : 'hidden')
      : view.existenceClaim ? 'existence-claim' : view.abstained ? 'abstain' : view.generationMiss ? 'not-in-30' : view.evidenceAt5 ? 'evidence@5' : view.buried ? `buried@${view.bestRank}` : `rank ${view.bestRank ?? '-'}`;
    const fence = fused.unknown ? ` uncomparable:${fused.reason}` : '';
    console.log(`${item.id}  ${label}${fence}`);
  }
  console.log(`Wrote ${path.join(dir, 'report.json')}`);
}
