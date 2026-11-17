import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { root } from './process.mjs';
import { FUNNEL_CASES } from './retrieval-funnel-oracle.mjs';
import { FUNNEL_SCHEMA_V2, evaluateFunnel } from './wiki-core/retrieval-funnel.mjs';
import { enclosingSymbol, followEvidence } from './wiki-core/source-route.mjs';

const EXCLUDES = [
  '!node_modules',
  '!.git',
  '!out',
  '!.grepai',
  '!scripts/repo-tools/semantic-pilot*',
  '!scripts/repo-tools/retrieval-funnel*',
  '!work/changes/archive/**',
  '!work/changes/open/2026-11-17--har06-retrieval-funnel/**',
  '!work/changes/open/2026-11-17--har07-evidence-verified-source-navigation/**',
  '!work/designs/open/repository-agent-workbench/SOURCE-ROUTE-AUDIT-2026-11-17.md',
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
      if (!hits.some((item) => `${item.path}:${item.line}` === key)) hits.push(prove(hit));
    }
  }
  return { status: 'ran', hits, ms, bytes, calls };
}

function prove(hit) {
  if (!/\.(?:ts|tsx|mjs|js)$/i.test(hit.path) || !hit.line) {
    return { ...hit, provenance: `rg:${hit.path}:${hit.line ?? ''}` };
  }
  const abs = path.join(root, ...hit.path.split('/'));
  if (!existsSync(abs)) return { ...hit, provenance: `rg:${hit.path}:${hit.line}` };
  const proof = enclosingSymbol(readFileSync(abs, 'utf8'), hit.line);
  return { ...hit, proof, provenance: `rg:${hit.path}:${hit.line}` };
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
    ref: item.ref ?? item.path,
    line: item.lineStart ?? null,
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
  const route = wiki.status === 'failed'
    ? { hits: [], unresolved: [{ reason: 'wiki-failed' }], spent: {} }
    : followEvidence({ root, question: item.question, headings: wiki.hits ?? [] });
  return {
    A: { ...lexical, sha, tool: 'rg' },
    B: {
      status: wiki.status === 'failed' ? 'failed' : 'ran',
      sha,
      tool: 'wiki-source-route',
      hits: route.hits,
      navigation: { spent: route.spent, unresolved: route.unresolved },
      ms: wiki.ms ?? 0,
      bytes: wiki.bytes ?? 0,
      calls: wiki.calls ?? 0,
      error: wiki.error ?? null,
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
      schema: FUNNEL_SCHEMA_V2,
      sha,
      dirty,
      cases: [item],
      arms: {
        A: { ...arms.A, dirty },
        B: { ...arms.B, dirty },
        C: { ...semantic, sha, dirty },
      },
    });
    const aPaths = new Set((arms.A.hits ?? []).map((hit) => hit.path));
    const bOnly = (arms.B.hits ?? []).filter((hit) => !aPaths.has(hit.path)).map((hit) => ({
      path: hit.path,
      line: hit.line ?? null,
      symbol: hit.proof?.symbol ?? null,
      trace: hit.trace ?? [],
    }));
    return {
      ...one.cases[0],
      ms: { A: arms.A.ms ?? 0, B: arms.B.ms ?? 0 },
      calls: { A: arms.A.calls ?? 0, B: arms.B.calls ?? 0 },
      navigation: arms.B.navigation ?? null,
      bOnly,
    };
  });
  const secretEval = evaluateFunnel({
    schema: FUNNEL_SCHEMA_V2,
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
    schema: FUNNEL_SCHEMA_V2,
    sha,
    dirty,
    proxy: 'scripted-lexical-and-source-route',
    agentTrial: false,
    verifiedCount: 0,
    diagnosticOnly: true,
    fences: secretEval.fences,
    cases: [...cases, secretEval.cases[0]],
  };
  const dir = path.join(root, 'out', 'retrieval-funnel', sha ?? 'unknown');
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`${FUNNEL_SCHEMA_V2} @ ${sha}${dirty ? ' dirty' : ''}`);
  console.log('Verified headline: none. Every case is unreviewed, so this run is diagnostic only.');
  console.log(`Optional semantic arm: ${semantic.status}${semantic.reason ? ` (${semantic.reason})` : ''}`);
  for (const item of report.cases) {
    const fused = item.fused ?? {};
    const view = fused.exploratory ?? fused;
    const label = (view.reason ?? fused.reason) === 'freshness-only'
      ? 'freshness'
      : item.id === 'N1'
      ? (view.leaked ? 'leak' : 'hidden')
      : view.existenceClaim ? 'existence-claim' : view.abstained ? 'abstain' : view.fileGenerationMiss ? 'file-miss' : `${view.symbolVerified ? 'symbol' : 'file-only'}@${view.fileBestRank}`;
    const fence = fused.unknown ? ` uncomparable:${fused.reason}` : '';
    const route = item.bOnly?.length ? ` B-only ${item.bOnly.length}` : '';
    console.log(`${item.id}  ${label}${fence}${route}`);
    if (item.id?.startsWith('C') && item.bOnly?.length) {
      for (const hop of item.bOnly.slice(0, 4)) {
        const kinds = (hop.trace ?? []).map((step) => step.kind).join('>');
        console.log(`    ${hop.path}:${hop.line ?? '-'} ${hop.symbol ?? ''} ${kinds}`);
      }
    }
  }
  console.log(`Wrote ${path.join(dir, 'report.json')}`);
}
