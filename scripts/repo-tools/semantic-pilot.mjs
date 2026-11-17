import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { root } from './process.mjs';
import { CODE_CASES, DOC_CASES } from './semantic-pilot-cases.mjs';

const SCHEMA = 'repo.semantic-pilot.v1';
const SECRET = 'SEMANTIC_PILOT_SECRET_PROBE';

function pathOf(hit) {
  return hit.path || String(hit.ref || '').split('#')[0];
}

function owns(hit, owners) {
  const value = pathOf(hit).replaceAll('\\', '/');
  return owners.some((owner) => value === owner || value.endsWith(`/${owner}`));
}

export function judgeHits(hits, expect) {
  const top = (hits ?? []).slice(0, 5);
  const blob = (hit) => `${pathOf(hit)}\n${hit.text ?? ''}\n${hit.symbol ?? ''}`;
  if (expect.freshness) {
    return { ownerAt1: null, ownerAt3: null, ownerAt5: null, passed: null, unknown: true, reason: 'freshness-only' };
  }
  if (expect.forbiddenPath) {
    const leaked = top.some((hit) => pathOf(hit).includes(expect.forbiddenPath) || blob(hit).includes(SECRET));
    return { ownerAt1: leaked ? 0 : 1, ownerAt3: null, ownerAt5: null, passed: !leaked, falsePositive: leaked, unknown: false };
  }
  if (expect.absent) {
    const claimed = top.some((hit) => blob(hit).toLowerCase().includes(expect.forbidden ?? 'grafana'));
    return {
      ownerAt1: 0,
      ownerAt3: 0,
      ownerAt5: 0,
      passed: top.length === 0,
      falsePositive: top.length > 0,
      claimed,
      nearestNeighbor: top.length > 0 && !claimed,
      unknown: false,
    };
  }
  if (expect.archiveForbidden) {
    const archiveFirst = top[0] && pathOf(top[0]).includes('work/changes/archive/');
    const owner = top.some((hit) => owns(hit, expect.owners));
    return { ownerAt1: owner && top[0] && owns(top[0], expect.owners) ? 1 : 0, ownerAt3: null, ownerAt5: null, passed: owner && !archiveFirst, falsePositive: Boolean(archiveFirst), unknown: false };
  }
  const rank = (k) => (top.slice(0, k).some((hit) => owns(hit, expect.owners ?? [])) ? 1 : 0);
  const symbolOk = !expect.symbol || top.some((hit) => owns(hit, expect.owners ?? []) && blob(hit).includes(expect.symbol));
  const decoyFirst = expect.decoy && top[0] && blob(top[0]).includes(expect.decoy) && !blob(top[0]).includes(expect.symbol);
  let authorityOk = true;
  if (expect.authority === 'proposal') {
    authorityOk = Boolean(top[0] && (top[0].authority === 'proposal' || top[0].notice === 'NOT SELECTED') && owns(top[0], expect.owners ?? []));
  }
  const statusOk = !expect.status || top.some((hit) => pathOf(hit) === 'STATUS.md' || hit.match === 'status-companion');
  const passed = rank(5) === 1 && symbolOk && !decoyFirst && authorityOk && statusOk;
  return {
    ownerAt1: rank(1),
    ownerAt3: rank(3),
    ownerAt5: rank(5),
    passed,
    falsePositive: Boolean(decoyFirst) || (expect.authority === 'proposal' && !authorityOk && rank(1) === 1),
    unknown: false,
  };
}

function run(command, args, options = {}) {
  const started = Date.now();
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    encoding: 'utf8',
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: options.timeout ?? 20000,
  });
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    ms: Date.now() - started,
    error: result.error ? result.error.message : null,
  };
}

function rgHits(query) {
  const result = run('rg', ['-n', '--max-count', '5', '-g', '!node_modules', '-g', '!.git', '-g', '!out', '-g', '!.grepai', '-g', '!scripts/repo-tools/semantic-pilot*', query], { timeout: 15000 });
  if (result.status !== 0 && result.status !== 1) {
    return { status: 'failed', hits: [], ms: result.ms, error: result.stderr || result.error };
  }
  const hits = result.stdout.split(/\r?\n/).filter(Boolean).slice(0, 5).map((line) => {
    const match = /^([^:]+):(\d+):(.*)$/.exec(line);
    return match
      ? { path: match[1].replaceAll('\\', '/'), line: Number(match[2]), text: match[3], bytes: Buffer.byteLength(line) }
      : { path: line, text: line, bytes: Buffer.byteLength(line) };
  });
  return { status: 'ran', hits, ms: result.ms, bytes: Buffer.byteLength(result.stdout) };
}

function wikiHits(query) {
  const result = run(process.execPath, [path.join(root, 'scripts/repo-tools/wiki-find.mjs'), query, '--json', '--top', '5'], { timeout: 20000 });
  if (result.status !== 0) return { status: 'failed', hits: [], ms: result.ms, error: result.stderr || result.error };
  const payload = JSON.parse(result.stdout);
  const rows = payload.primaryLane === 'proposal' ? payload.proposalLane : payload.normative;
  const hits = (rows ?? []).slice(0, payload.statusCompanion ? 4 : 5).map((item) => ({
    path: item.path,
    ref: item.ref,
    authority: item.authority,
    notice: item.notice ?? null,
    text: item.preview ?? '',
    bytes: item.bytes ?? 0,
    match: item.match ?? null,
  }));
  if (payload.statusCompanion) {
    hits.push({
      path: payload.statusCompanion.path,
      ref: payload.statusCompanion.ref,
      authority: payload.statusCompanion.authority,
      text: payload.statusCompanion.preview ?? '',
      bytes: payload.statusCompanion.bytes ?? 0,
      match: 'status-companion',
    });
  }
  return { status: 'ran', hits: hits.slice(0, 5), ms: result.ms, bytes: Buffer.byteLength(result.stdout), primaryLane: payload.primaryLane };
}

function optionalHits(bin, args) {
  if (!bin || !existsSync(bin)) return { status: 'not-configured', hits: [], ms: 0 };
  const result = run(bin, args, { timeout: 60000 });
  if (result.error || result.status !== 0) {
    return { status: 'failed', hits: [], ms: result.ms, error: (result.stderr || result.error || '').slice(0, 400) };
  }
  let payload;
  try {
    payload = JSON.parse(result.stdout);
  } catch {
    return { status: 'failed', hits: [], ms: result.ms, error: 'candidate did not return JSON', bytes: Buffer.byteLength(result.stdout) };
  }
  const rows = Array.isArray(payload) ? payload : payload.results ?? payload.hits ?? [];
  const hits = rows.slice(0, 5).map((item) => {
    const file = item.path ?? item.file ?? item.file_path ?? null;
    const line = item.line ?? item.start_line ?? null;
    const endLine = item.end_line ?? item.endLine ?? null;
    let text = item.content ?? item.text ?? item.chunk ?? item.snippet ?? '';
    const relative = file ? path.relative(root, file).replaceAll('\\', '/') : null;
    const repoFile = relative && !relative.startsWith('..') ? relative : file;
    if (!text && repoFile && line && existsSync(path.join(root, repoFile))) {
      const lines = readFileSync(path.join(root, repoFile), 'utf8').split(/\r?\n/);
      const start = Math.max(0, Number(line) - 1);
      const end = Math.min(lines.length, Number(endLine ?? start + 20));
      text = lines.slice(start, Math.max(end, start + 1)).join('\n');
    }
    return { path: repoFile, line, text, bytes: Buffer.byteLength(text || JSON.stringify(item)) };
  });
  return { status: 'ran', hits, ms: result.ms, bytes: Buffer.byteLength(result.stdout) };
}

export function fingerprint(tools) {
  const sha = run('git', ['rev-parse', 'HEAD']);
  const status = run('git', ['status', '--porcelain']);
  return {
    schema: SCHEMA,
    sha: sha.status === 0 ? sha.stdout.trim() : null,
    dirty: Boolean(status.stdout && status.stdout.trim()),
    os: `${process.platform} ${process.arch}`,
    node: process.version,
    tools,
  };
}

function summarize(arm) {
  if (!arm || arm.status !== 'ran') return { status: arm?.status ?? 'unknown', passed: null, error: arm?.error ?? null };
  return {
    status: arm.status,
    ms: arm.ms,
    bytes: arm.bytes ?? null,
    hits: (arm.hits ?? []).slice(0, 5).map((hit) => ({ path: pathOf(hit), line: hit.line ?? null })),
    ...arm.judgment,
  };
}

export function buildReport(input) {
  const cases = input.cases.map((item) => ({
    id: item.id,
    lane: item.lane,
    query: item.query,
    baseline: summarize(item.baseline),
    candidate: summarize(item.candidate),
  }));
  return {
    schema: SCHEMA,
    fingerprint: input.fingerprint,
    agentTrial: false,
    independentReview: false,
    cases,
  };
}

function attach(kind, cases, search) {
  return cases.map((item) => {
    if (item.freshness) {
      return { ...item, lane: kind, baseline: { status: 'not-applicable', judgment: judgeHits([], item) }, candidate: { status: 'not-applicable', judgment: judgeHits([], item) } };
    }
    const baseline = search.baseline(item.query);
    const candidate = search.candidate(item.query);
    return {
      ...item,
      lane: kind,
      baseline: { ...baseline, judgment: baseline.status === 'ran' ? judgeHits(baseline.hits, item) : { passed: null, unknown: true } },
      candidate: { ...candidate, judgment: candidate.status === 'ran' ? judgeHits(candidate.hits, item) : { passed: null, unknown: true } },
    };
  });
}

function defaultGrepai() {
  const local = path.join(process.env.LOCALAPPDATA ?? '', 'offscreen-trial', 'grepai', 'grepai.exe');
  return existsSync(local) ? local : null;
}

function defaultQmd() {
  const local = path.join(process.env.LOCALAPPDATA ?? '', 'offscreen-trial', 'qmd', 'node_modules', '@tobilu', 'qmd', 'bin', 'qmd');
  return existsSync(local) ? local : null;
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--self-test')) {
    return import('./semantic-pilot-self-test.mjs').then((mod) => mod.runSemanticPilotSelfTest());
  }
  if (args.includes('--help') || args.length === 0) {
    console.log('Usage: pnpm repo:semantic-pilot --self-test | --run');
    console.log('Local search trial. Missing vendor tools are not-configured. No model agent is launched.');
    return;
  }
  if (!args.includes('--run')) throw new Error('Pass --run or --self-test.');
  const grepai = defaultGrepai();
  const qmd = defaultQmd();
  const grepaiStatus = grepai ? run(grepai, ['status']) : null;
  const grepaiReady = Boolean(grepaiStatus && grepaiStatus.status === 0);
  const tools = {
    rg: 'cursor-ripgrep',
    wikiFind: 'pnpm wiki:find',
    grepai: !grepai ? 'not-configured' : grepaiReady ? '1.2.0 ollama nomic-embed-text' : 'present-no-index',
    qmd: qmd ? '2.8.3 keyword search' : 'not-configured',
    sifs: 'not-configured',
    ollama: existsSync(path.join(process.env.LOCALAPPDATA ?? '', 'Programs', 'Ollama', 'ollama.exe')) ? 'present' : 'not-checked',
  };
  const code = attach('code', CODE_CASES, {
    baseline: rgHits,
    candidate: (query) => grepaiReady
      ? optionalHits(grepai, ['search', query, '--json', '--limit', '5', '--compact'])
      : { status: tools.grepai, hits: [], error: grepaiStatus?.stderr?.trim() || null },
  });
  const docs = attach('docs', DOC_CASES, {
    baseline: wikiHits,
    candidate: (query) => qmd
      ? optionalHits(process.execPath, [qmd, 'search', query, '--format', 'json', '--full-path', '-n', '5'])
      : { status: 'not-configured', hits: [] },
  });
  const secretFile = path.join(root, 'out', 'semantic-pilot', 'secret-probe.txt');
  mkdirSync(path.dirname(secretFile), { recursive: true });
  writeFileSync(secretFile, `${SECRET}\n`);
  const secret = rgHits(SECRET);
  const secretJudgment = judgeHits(secret.hits, { forbiddenPath: 'secret-probe' });
  const secretCandidate = grepaiReady
    ? optionalHits(grepai, ['search', SECRET, '--json', '--limit', '5', '--compact'])
    : { status: tools.grepai, hits: [] };
  const secretQmd = qmd
    ? optionalHits(process.execPath, [qmd, 'search', SECRET, '--format', 'json', '--full-path', '-n', '5'])
    : { status: 'not-configured', hits: [] };
  const report = buildReport({
    fingerprint: {
      ...fingerprint(tools),
      index: grepaiStatus
        ? { ready: grepaiReady, status: (grepaiStatus.stdout || grepaiStatus.stderr || '').trim().slice(0, 500) }
        : null,
    },
    cases: [
      ...code,
      ...docs,
      {
        id: 'N1',
        lane: 'negative',
        query: 'ignored secret probe',
        baseline: { ...secret, judgment: secretJudgment },
        candidate: { ...secretCandidate, judgment: secretCandidate.status === 'ran' ? judgeHits(secretCandidate.hits, { forbiddenPath: 'secret-probe' }) : { passed: null, unknown: true } },
      },
      {
        id: 'N2',
        lane: 'negative',
        query: 'qmd ignored secret probe',
        baseline: { status: 'not-applicable', judgment: { passed: null, unknown: true } },
        candidate: { ...secretQmd, judgment: secretQmd.status === 'ran' ? judgeHits(secretQmd.hits, { forbiddenPath: 'secret-probe' }) : { passed: null, unknown: true } },
      },
    ],
  });
  const dir = path.join(root, 'out', 'semantic-pilot', report.fingerprint.sha ?? 'unknown');
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`${SCHEMA} @ ${report.fingerprint.sha}${report.fingerprint.dirty ? ' dirty' : ''}`);
  for (const item of report.cases) {
    const base = item.baseline.passed === null ? item.baseline.status : item.baseline.passed ? 'pass' : 'miss';
    const cand = item.candidate.passed === null ? item.candidate.status : item.candidate.passed ? 'pass' : 'miss';
    console.log(`${item.id}  baseline ${base}  candidate ${cand}`);
  }
  console.log(`Wrote ${path.join(dir, 'report.json')}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  Promise.resolve(main()).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
