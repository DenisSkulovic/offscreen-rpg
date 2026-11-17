import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { parseMarkdownDocument } from './markdown.mjs';
import { resolveHref } from './paths.mjs';
import { readSection } from './route.mjs';

export const ROUTE_BUDGET = {
  headings: 8,
  reads: 4,
  edges: 12,
  packageMaps: 2,
  importHops: 2,
  candidates: 30,
};

const CODE = /\.(?:ts|tsx|mjs|cjs|js)$/i;

export function enclosingSymbol(source, line) {
  const lines = String(source ?? '').split(/\r?\n/);
  const limit = Math.min(lines.length, Math.max(1, Number(line) || 1));
  const stack = [];
  let pending = null;
  let pendingLine = null;
  let paren = 0;
  let armed = false;
  for (let index = 0; index < limit; index += 1) {
    const text = lines[index];
    if (!pending) {
      const declared = text.match(/(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)/);
      if (declared) {
        pending = declared[1];
        pendingLine = index + 1;
        paren = 0;
        armed = false;
      }
    }
    for (const char of text) {
      if (char === '(') paren += 1;
      else if (char === ')') {
        paren = Math.max(0, paren - 1);
        if (pending && paren === 0) armed = true;
      } else if (char === '{') {
        const body = Boolean(pending && armed && paren === 0);
        stack.push(body ? { name: pending, line: pendingLine } : null);
        if (body) {
          pending = null;
          pendingLine = null;
          armed = false;
        }
      } else if (char === '}') stack.pop();
    }
  }
  const named = [...stack].reverse().find((frame) => frame?.name);
  return {
    method: 'enclosing-read',
    symbol: named?.name ?? null,
    declarationLine: named?.line ?? null,
  };
}

function tokensOf(question) {
  return String(question ?? '').toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length >= 5);
}

function sharesToken(value, tokens) {
  const stem = String(value ?? '').toLowerCase();
  return tokens.some((token) => {
    const size = Math.min(5, token.length, stem.length);
    if (size < 5) return false;
    return stem.includes(token.slice(0, size)) || token.includes(stem.slice(0, size));
  });
}

function excluded(rel) {
  const value = String(rel ?? '').replaceAll('\\', '/');
  return value.startsWith('out/')
    || value.startsWith('work/changes/archive/')
    || value.includes('secret-probe')
    || value.startsWith('scripts/repo-tools/retrieval-funnel')
    || value.startsWith('scripts/repo-tools/semantic-pilot');
}

function resolveLocalImport(fromRel, spec) {
  if (spec.startsWith('.')) {
    const base = path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), spec));
    const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}.mjs`, `${base}/index.ts`];
    return candidates;
  }
  return [];
}

export function resolvePackageModule(root, spec) {
  const match = /^@offscreen\/([^/]+)\/(.+)$/.exec(spec);
  if (!match) return null;
  const pkgPath = path.join(root, 'packages', match[1], 'package.json');
  if (!existsSync(pkgPath)) return null;
  const body = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const exported = body.exports?.[`./${match[2]}`];
  const target = typeof exported === 'string' ? exported : exported?.default;
  if (!target) return null;
  const raw = path.posix.normalize(`packages/${match[1]}/${String(target).replace(/^\.\//, '')}`);
  const ts = raw.replace(/\.d\.ts$/, '.ts').replace(/\.js$/, '.ts');
  const candidates = [ts];
  if (ts.includes('/dist/src/')) candidates.push(ts.replace('/dist/src/', '/src/'));
  if (ts.includes('/dist/')) candidates.push(ts.replace('/dist/', '/src/'));
  for (const rel of candidates) {
    if (existsSync(path.join(root, ...rel.split('/')))) return rel;
    const mjs = rel.replace(/\.ts$/, '.mjs');
    if (existsSync(path.join(root, ...mjs.split('/')))) return mjs;
  }
  return null;
}

export function followEvidence(options) {
  const budget = { ...ROUTE_BUDGET, ...options.budget };
  const tokens = tokensOf(options.question);
  const root = options.root;
  const readText = options.readText ?? ((rel) => readFileSync(path.join(root, ...rel.split('/')), 'utf8'));
  const exists = options.exists ?? ((rel) => existsSync(path.join(root, ...rel.split('/'))));
  const resolveLink = options.resolveLink ?? ((from, href) => resolveHref(root, from, href));
  const resolveModule = options.resolveModule ?? ((spec) => resolvePackageModule(root, spec));
  const hits = [];
  const unresolved = [];
  function note(entry) {
    if (unresolved.length < 24) unresolved.push(entry);
  }
  const seen = new Set();
  const grounded = new Set();
  let reads = 0;
  let edges = 0;
  let packageMaps = 0;

  function room() {
    return hits.length < budget.candidates && edges < budget.edges;
  }

  function addHit(hit) {
    if (hits.length >= budget.candidates) return;
    const key = `${hit.path}:${hit.line ?? ''}:${hit.proof?.symbol ?? ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    hits.push(hit);
  }

  function ground(rel, authority, notice, trace, depth) {
    if (!room() || excluded(rel) || !CODE.test(rel) || grounded.has(rel)) return;
    grounded.add(rel);
    if (!exists(rel)) {
      note({ reason: 'missing-source', path: rel, trace });
      return;
    }
    const source = readText(rel);
    const lines = source.split(/\r?\n/);
    const phrases = tokens.filter((token) => token.length >= 6);
    const groups = new Map();
    lines.forEach((text, index) => {
      const lower = text.toLowerCase();
      const score = phrases.filter((phrase) => lower.includes(phrase.slice(0, 6))).length;
      if (score === 0) return;
      const proof = enclosingSymbol(source, index + 1);
      const key = proof.symbol ?? `line:${index + 1}`;
      const current = groups.get(key);
      if (!current || score > current.score) {
        groups.set(key, { text, index, score: (current?.score ?? 0) + score, proof });
      } else current.score += score;
    });
    const ranked = [...groups.values()].sort((left, right) => right.score - left.score || left.index - right.index).slice(0, 3);
    for (const row of ranked) {
      if (!room()) break;
      addHit({
        path: rel,
        line: row.index + 1,
        text: row.text,
        authority,
        notice,
        origin: 'navigation',
        provenance: `route:${rel}:${row.index + 1}`,
        proof: row.proof,
        trace: [...trace, { kind: 'targeted-search', to: `${rel}#${row.proof.symbol ?? row.index + 1}`, line: row.index + 1 }],
        bytes: Buffer.byteLength(row.text),
      });
    }
    if (ranked.length > 0) edges += 1;
    followImports(rel, source, authority, notice, trace, depth);
  }

  function followImports(rel, source, authority, notice, trace, depth) {
    if (depth >= budget.importHops || !room()) return;
    for (const match of source.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      if (!room() || edges >= budget.edges) {
        note({ reason: 'edge-budget', from: rel });
        return;
      }
      const spec = match[1];
      let next = null;
      let kind = 'import';
      if (spec.startsWith('@offscreen/')) {
        next = resolveModule(spec);
        kind = 'verified-module-ref';
      } else if (spec.startsWith('.')) {
        next = resolveLocalImport(rel, spec).find((candidate) => exists(candidate));
      }
      if (!next || excluded(next)) {
        if (!next) note({ reason: 'unresolved-import', from: rel, spec });
        continue;
      }
      if (!sharesToken(`${spec} ${next}`, tokens)) {
        note({ reason: 'import-not-selected', from: rel, spec });
        continue;
      }
      edges += 1;
      const hop = { kind, from: rel, to: next };
      ground(next, authority, notice, [...trace, hop], depth + 1);
    }
  }

  function followPage(rel, authority, notice, trace, asMap) {
    if (asMap) {
      if (packageMaps >= budget.packageMaps) {
        note({ reason: 'package-map-budget', path: rel });
        return;
      }
      packageMaps += 1;
    } else if (reads >= budget.reads) {
      note({ reason: 'read-budget', path: rel });
      return;
    } else reads += 1;
    const fileRel = rel.split('#')[0];
    const sectionRef = rel.includes('#') ? rel : null;
    if (!exists(fileRel)) {
      note({ reason: 'missing-path', path: rel });
      return;
    }
    const full = readText(fileRel);
    const page = sectionRef && !options.readText ? readSection(root, sectionRef) : { ok: true, text: full, truncated: false };
    if (!page.ok) {
      note({ reason: page.error ?? 'unreadable', path: rel });
      return;
    }
    const text = page.text ?? '';
    const moduleText = full || text;
    for (const match of moduleText.matchAll(/@offscreen\/[A-Za-z0-9-]+\/[A-Za-z0-9-]+/g)) {
      if (!room()) return;
      const spec = match[0];
      const file = resolveModule(spec);
      if (!file) {
        note({ reason: 'unresolved-module', spec, from: rel });
        continue;
      }
      if (grounded.has(file)) continue;
      edges += 1;
      const hop = { kind: 'verified-module-ref', from: rel, to: file, spec };
      addHit({
        path: file,
        line: null,
        text: spec,
        authority,
        notice,
        origin: 'navigation',
        provenance: `module:${spec}`,
        trace: [...trace, hop],
        bytes: Buffer.byteLength(spec),
      });
      ground(file, authority, notice, [...trace, hop], 0);
    }
    const doc = parseMarkdownDocument(text);
    for (const reference of doc.references) {
      if (!room()) return;
      if (reference.kind !== 'link') continue;
      const resolved = resolveLink(rel.split('#')[0], reference.href);
      if (!resolved.ok || !resolved.rel) {
        note({ reason: resolved.code ?? 'unresolved-link', href: reference.href, from: rel });
        continue;
      }
      if (excluded(resolved.rel)) {
        note({ reason: 'excluded', path: resolved.rel, from: rel });
        continue;
      }
      const isMap = resolved.rel.startsWith('packages/') && resolved.rel.endsWith('README.md');
      const interesting = isMap || sharesToken(`${reference.label} ${reference.context} ${resolved.rel}`, tokens);
      if (!interesting) {
        note({ reason: 'not-selected', path: resolved.rel, from: rel });
        continue;
      }
      edges += 1;
      const kind = resolved.rel.startsWith('packages/') && resolved.rel.endsWith('README.md') ? 'source-map-link' : CODE.test(resolved.rel) ? 'source-map-link' : 'wiki-link';
      const hop = { kind, from: rel, to: resolved.rel, line: reference.line };
      addHit({
        path: resolved.rel,
        line: reference.line,
        text: reference.label,
        authority,
        notice,
        origin: 'navigation',
        provenance: `link:${rel}:${resolved.rel}`,
        trace: [...trace, hop],
        bytes: Buffer.byteLength(reference.label ?? ''),
      });
      if (CODE.test(resolved.rel)) ground(resolved.rel, authority, notice, [...trace, hop], 0);
      if (!asMap && resolved.rel.startsWith('packages/') && resolved.rel.endsWith('README.md')) {
        followPage(resolved.rel, authority, notice, [...trace, hop], true);
      }
    }
    if (page.truncated) note({ reason: 'section-truncated', path: rel });
  }

  for (const heading of (options.headings ?? []).slice(0, budget.headings)) {
    const ref = heading.ref ?? heading.path;
    addHit({
      path: heading.path,
      line: heading.line ?? null,
      text: heading.text ?? heading.preview ?? '',
      authority: heading.authority ?? null,
      notice: heading.notice ?? null,
      origin: 'wiki',
      provenance: `wiki:${ref}`,
      trace: [{ kind: 'wiki-link', from: options.question, to: ref }],
      bytes: heading.bytes ?? 0,
    });
    followPage(ref, heading.authority ?? null, heading.notice ?? null, [{ kind: 'wiki-link', to: ref }], false);
  }

  return {
    hits: hits.slice(0, budget.candidates),
    unresolved,
    budget,
    spent: { reads, edges, packageMaps, candidates: hits.length },
  };
}
