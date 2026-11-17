/**
 * Heading-level index and bounded read. Zero provider, zero writes.
 * Score = heading hits * 5 + question-row hits * 3 + intro-token hits.
 * A long page title yields to a child heading that contains a query word the title opening lacks.
 * A subject map is followed only when it is still the best hit, and only along a link label.
 * The static benchmark gold set is not an input.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parseMarkdownDocument } from './markdown.mjs';
import { collectMaintainedPages } from './model.mjs';
import { classifyRepoPath, resolveHref } from './paths.mjs';
import { tokenize } from './search.mjs';

export const ROUTE_SCHEMA = 'wiki.route.v1';
export const DEFAULT_MAX_CHARS = 5000;
const PREVIEW_CHARS = 320;
const PROPOSAL_PAGE = /proposal only|not installed or authorized|technical recommendation|unaccepted future|status:\s*proposed\b/i;
const PROPOSAL_QUERY = /\b(proposal|proposed|not installed|not selected)\b/i;
const STATUS_QUERY = /\b(implemented|implementation|tested|available|live|source-observed|exist|exists)\b/i;
const ROUTE_GLUE = new Set('page still only where mention describe separate how does instructions'.split(' '));
const LARGE_SECTION_BYTES = 6000;

function walkMarkdown(root, dirRel, out) {
  const absDir = path.join(root, ...dirRel.split('/'));
  if (!existsSync(absDir)) return;
  for (const entry of readdirSync(absDir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'out') continue;
    const rel = `${dirRel}/${entry.name}`;
    if (entry.isDirectory()) walkMarkdown(root, rel, out);
    else if (entry.isFile() && entry.name.endsWith('.md')) out.push(rel);
  }
}

export function routePages(root, { includeHistoric = false } = {}) {
  const pages = collectMaintainedPages(root);
  const extra = [];
  for (const dir of ['.agents/rules', '.agents/references']) walkMarkdown(root, dir, extra);
  if (includeHistoric) {
    for (const dir of ['evidence', 'research', 'work/changes/archive', 'work/sessions']) {
      walkMarkdown(root, dir, extra);
    }
  }
  return [...new Set([...pages, ...extra])].sort();
}

function pageOpening(pageText) {
  const firstSection = pageText.search(/^## /m);
  return pageText.slice(0, firstSection > 0 ? firstSection : 1200);
}

function authorityOf(rel, kind, pageText) {
  if (rel === 'STATUS.md') return 'status';
  const proposal = PROPOSAL_PAGE.test(pageOpening(pageText));
  if (kind === 'canonical-product') return 'ratified-product';
  if (kind === 'canonical-technical') return proposal ? 'proposal' : 'selected-technical';
  if (kind === 'canonical-support' || kind === 'canonical-page') return proposal ? 'proposal' : 'selected-support';
  if (kind === 'open-design' || kind === 'open-change') return 'proposal';
  if (kind === 'historic' || kind === 'evidence') return 'historic';
  if (kind === 'source-map') return 'source-map';
  if (kind === 'canonical-router' || kind === 'root-index' || kind === 'work-index') return 'router';
  return kind;
}

function laneOf(authority) {
  if (authority === 'proposal') return 'proposal';
  if (authority === 'historic' || authority === 'evidence') return 'historic';
  if (authority === 'status') return 'status';
  return 'normative';
}

function sectionSpan(headings, index, lineCount) {
  const current = headings[index];
  let end = lineCount;
  for (let cursor = index + 1; cursor < headings.length; cursor += 1) {
    if (headings[cursor].depth <= current.depth) {
      end = headings[cursor].line - 1;
      break;
    }
  }
  return { lineStart: current.line, lineEnd: Math.max(current.line, end) };
}

function readText(abs) {
  return readFileSync(abs, 'utf8');
}

export function buildSectionIndex(root, options = {}) {
  const pages = routePages(root, options);
  const parsed = new Map();
  const contexts = new Map();
  const outbound = new Map();
  for (const rel of pages) {
    const abs = path.join(root, ...rel.split('/'));
    if (!existsSync(abs)) continue;
    const text = readText(abs);
    const doc = parseMarkdownDocument(text);
    parsed.set(rel, { text, doc });
    for (const reference of doc.references) {
      if (reference.kind !== 'link' || !reference.href) continue;
      const resolved = resolveHref(root, rel, reference.href);
      if (!resolved.ok || !resolved.rel || resolved.isDir) continue;
      const key = `${resolved.rel}#${resolved.fragment ?? ''}`;
      const bucket = contexts.get(key) ?? [];
      if (reference.context) bucket.push(reference.context);
      contexts.set(key, bucket);
      const sourceKey = `${rel}#${reference.headingId ?? ''}`;
      const links = outbound.get(sourceKey) ?? [];
      links.push({
        label: reference.label,
        path: resolved.rel,
        anchor: resolved.fragment,
      });
      outbound.set(sourceKey, links);
    }
  }
  const sections = [];
  for (const [rel, { text, doc }] of parsed) {
    const lines = text.split(/\r?\n/);
    const kind = classifyRepoPath(rel);
    const authority = authorityOf(rel, kind, text);
    doc.headings.forEach((heading, index) => {
      const span = sectionSpan(doc.headings, index, lines.length);
      const nextHeading = doc.headings[index + 1];
      const introEnd = nextHeading ? nextHeading.line - 1 : lines.length;
      const intro = lines.slice(span.lineStart - 1, Math.max(span.lineStart, introEnd)).join('\n');
      const body = lines.slice(span.lineStart - 1, span.lineEnd).join('\n');
      const specific = contexts.get(`${rel}#${heading.id}`) ?? [];
      const pageLevel = heading.depth === 1 ? (contexts.get(`${rel}#`) ?? []) : [];
      sections.push({
        path: rel,
        anchor: heading.id,
        heading: heading.text,
        depth: heading.depth,
        lineStart: span.lineStart,
        lineEnd: span.lineEnd,
        bytes: Buffer.byteLength(body, 'utf8'),
        preview: intro.replace(/\s+/g, ' ').trim().slice(0, PREVIEW_CHARS),
        introTokens: [...new Set(tokenize(intro))],
        rowContext: [...specific, ...pageLevel].join(' ').slice(0, 500),
        outbound: outbound.get(`${rel}#${heading.id}`) ?? [],
        authority,
        lane: laneOf(authority),
        kind,
      });
    });
  }
  return {
    schema: ROUTE_SCHEMA,
    repoSha: options.repoSha ?? null,
    dirty: options.dirty ?? null,
    sections,
  };
}

function tokenHits(tokens, haystack) {
  const found = new Set(tokenize(haystack ?? ''));
  let hits = 0;
  for (const token of tokens) if (found.has(token)) hits += 1;
  return hits;
}

function queryTokens(query) {
  return tokenize(query).filter((token) => !ROUTE_GLUE.has(token));
}

function matchedTokens(section, tokens) {
  const heading = new Set(tokenize(section.heading));
  const intro = new Set(section.introTokens ?? tokenize(section.preview));
  const row = new Set(tokenize(section.rowContext));
  return tokens.filter((token) => heading.has(token) || intro.has(token) || row.has(token));
}

export function scoreSection(section, query) {
  const tokens = queryTokens(query);
  const headingHits = tokenHits(tokens, section.heading);
  const rowHits = tokenHits(tokens, section.rowContext);
  const introHits = tokens.filter((token) => (section.introTokens ?? []).includes(token)).length;
  let reason = 'none';
  if (introHits > 0) reason = 'intro';
  if (rowHits > 0) reason = 'question-row';
  if (headingHits > 0) reason = 'heading';
  return {
    score: headingHits * 5 + rowHits * 3 + introHits,
    reason,
    rowHits,
    tokens: matchedTokens(section, tokens),
  };
}

// A page title longer than LARGE_SECTION_BYTES loses to a child heading whose
// opening contains a query word the title opening does not. A subject map is
// followed only when it is still the best hit, and only along a link label
// that names a query word the map heading itself does not.
function suppressLargeAncestors(ranked) {
  const dropped = new Set();
  for (const row of ranked) {
    if (row.section.bytes < LARGE_SECTION_BYTES) continue;
    const intro = new Set(row.section.introTokens ?? []);
    const children = ranked.filter((other) => {
      if (other.section.path !== row.section.path || other.section.anchor === row.section.anchor) return false;
      if (other.section.depth <= row.section.depth) return false;
      if (other.section.lineStart < row.section.lineStart || other.section.lineEnd > row.section.lineEnd) return false;
      const childIntro = other.section.introTokens ?? [];
      return other.tokens.some((token) => childIntro.includes(token) && !intro.has(token));
    });
    const child = children.sort((a, b) => b.score - a.score)[0];
    if (!child) continue;
    dropped.add(row);
    child.score += row.rowHits * 3;
  }
  return ranked.filter((row) => !dropped.has(row));
}

function followRouterLink(tokens, ranked, available = ranked) {
  const best = ranked[0];
  if (!best || best.section.authority !== 'router') return ranked;
  const heading = new Set(tokenize(best.section.heading));
  let choice = null;
  for (const link of best.section.outbound ?? []) {
    const labelTokens = tokenize(link.label).filter((token) => tokens.includes(token) && !heading.has(token));
    if (labelTokens.length === 0 || !link.path) continue;
    const dest = available.find((row) => {
      if (row.section.path !== link.path) return false;
      if (link.anchor) return row.section.anchor === link.anchor;
      return row.section.depth === 1;
    });
    if (!dest) continue;
    if (!choice || labelTokens.length > choice.hits || (labelTokens.length === choice.hits && dest.score > choice.dest.score)) {
      choice = { hits: labelTokens.length, dest };
    }
  }
  if (!choice) return ranked;
  return [choice.dest, ...ranked.filter((row) => row !== choice.dest)];
}

function matchesKind(section, kind) {
  if (!kind) return true;
  if (kind === 'product') return section.path.startsWith('docs/product/');
  if (kind === 'technical') return section.path.startsWith('docs/technical/');
  if (kind === 'status') return section.path === 'STATUS.md';
  if (kind === 'proposal') return section.lane === 'proposal';
  return true;
}

function present(section, query) {
  const scored = scoreSection(section, query);
  return {
    path: section.path,
    anchor: section.anchor,
    heading: section.heading,
    lineStart: section.lineStart,
    lineEnd: section.lineEnd,
    authority: section.authority,
    lane: section.lane,
    selected: section.lane !== 'proposal' && section.lane !== 'historic',
    score: scored.score,
    match: scored.reason,
    preview: section.preview,
    rowContext: section.rowContext,
    bytes: section.bytes,
    ref: `${section.path}#${section.anchor}`,
  };
}

export function findSections(index, query, { kind = null, top = 5, includeHistoric = false } = {}) {
  const scored = index.sections
    .map((section) => ({ section, ...scoreSection(section, query) }))
    .filter((row) => row.score > 0 && matchesKind(row.section, kind));
  const narrowed = suppressLargeAncestors(scored).sort(
    (a, b) =>
      b.score - a.score ||
      a.section.path.localeCompare(b.section.path) ||
      a.section.lineStart - b.section.lineStart,
  );
  const ranked = narrowed[0]?.section.authority === 'router'
    ? followRouterLink(queryTokens(query), narrowed, scored)
    : narrowed;
  const normative = [];
  const proposalLane = [];
  const historic = [];
  for (const row of ranked) {
    const item = present(row.section, query);
    if (row.section.lane === 'proposal') proposalLane.push(item);
    else if (row.section.lane === 'historic') {
      if (includeHistoric) historic.push(item);
    } else normative.push(item);
  }
  let statusCompanion = null;
  if (STATUS_QUERY.test(query)) {
    const already = normative.find((item) => item.path === 'STATUS.md');
    const statusSection =
      index.sections.find((section) => section.path === 'STATUS.md' && section.anchor === 'orientation') ??
      index.sections.find((section) => section.path === 'STATUS.md');
    statusCompanion = already ?? (statusSection ? present(statusSection, query) : null);
    if (statusCompanion && statusCompanion.score === 0) statusCompanion = { ...statusCompanion, match: 'status-companion' };
  }
  const proposalQuestion = PROPOSAL_QUERY.test(query) && proposalLane.length > 0;
  return {
    schema: ROUTE_SCHEMA,
    query,
    kind,
    top,
    includeHistoric,
    primaryLane: proposalQuestion ? 'proposal' : 'normative',
    normative: normative.slice(0, top),
    proposalLane: proposalLane.slice(0, top).map((item) => ({ ...item, notice: 'NOT SELECTED' })),
    historic: historic.slice(0, top),
    statusCompanion,
  };
}

function sentenceCut(text) {
  return !/[.!?:"`|]$/.test(text.trimEnd());
}

export function readSection(root, request, options = {}) {
  const maxChars = options.maxChars ?? DEFAULT_MAX_CHARS;
  const fromLine = options.fromLine ?? null;
  const charOffset = options.charOffset ?? 0;
  const [filePart, anchor] = String(request).split('#');
  const rel = filePart.replaceAll('\\', '/');
  const abs = path.join(root, ...rel.split('/'));
  if (!existsSync(abs) || !rel.endsWith('.md')) {
    return {
      schema: ROUTE_SCHEMA,
      ok: false,
      error: 'missing-path',
      path: rel,
      message: `${rel} is not a Markdown page in this worktree.`,
    };
  }
  const text = readText(abs);
  const lines = text.split(/\r?\n/);
  const doc = parseMarkdownDocument(text);
  if (options.outline || !anchor) {
    const headings = [];
    doc.headings.forEach((heading, index) => {
      if (heading.depth < 2 || heading.depth > 4) return;
      const span = sectionSpan(doc.headings, index, lines.length);
      const body = lines.slice(span.lineStart - 1, span.lineEnd).join('\n');
      headings.push({
        depth: heading.depth,
        anchor: heading.id,
        heading: heading.text,
        lineStart: span.lineStart,
        lineEnd: span.lineEnd,
        bytes: Buffer.byteLength(body, 'utf8'),
      });
    });
    return {
      schema: ROUTE_SCHEMA,
      ok: true,
      mode: 'outline',
      path: rel,
      repoSha: options.repoSha ?? null,
      dirty: options.dirty ?? null,
      headings,
      message: anchor && !options.outline ? undefined : 'Pass path#heading to read one section. An outline is not the page body.',
    };
  }
  const index = doc.headings.findIndex((heading) => heading.id === anchor);
  if (index < 0) {
    return {
      schema: ROUTE_SCHEMA,
      ok: false,
      error: 'missing-heading',
      path: rel,
      anchor,
      nearby: doc.headings.slice(0, 8).map((heading) => ({
        anchor: heading.id,
        line: heading.line,
        heading: heading.text,
      })),
      message: `${rel} has no heading #${anchor}.`,
    };
  }
  const span = sectionSpan(doc.headings, index, lines.length);
  const start = fromLine == null ? span.lineStart : Number(fromLine);
  if (!Number.isInteger(start) || start < span.lineStart || start > span.lineEnd) {
    return {
      schema: ROUTE_SCHEMA,
      ok: false,
      error: 'from-line-outside-section',
      path: rel,
      anchor,
      lineStart: span.lineStart,
      lineEnd: span.lineEnd,
      message: `--from-line must sit inside ${span.lineStart}-${span.lineEnd}.`,
    };
  }
  const slice = lines.slice(start - 1, span.lineEnd);
  if (charOffset > 0 && slice.length > 0) slice[0] = slice[0].slice(charOffset);
  const full = slice.join('\n');
  let emitted = full;
  let truncated = false;
  let shownEnd = span.lineEnd;
  let nextOffset = 0;
  let nextLine = span.lineEnd + 1;
  if (full.length > maxChars) {
    truncated = true;
    const breakAt = full.lastIndexOf('\n', maxChars);
    if (breakAt > 0) {
      emitted = full.slice(0, breakAt);
      const consumed = emitted.split(/\n/).length;
      shownEnd = start + consumed - 1;
      nextLine = shownEnd + 1;
      nextOffset = 0;
    } else {
      emitted = full.slice(0, maxChars);
      shownEnd = start;
      nextLine = start;
      nextOffset = charOffset + maxChars;
    }
  }
  return {
    schema: ROUTE_SCHEMA,
    ok: true,
    mode: 'section',
    path: rel,
    anchor,
    heading: doc.headings[index].text,
    lineStart: start,
    lineEnd: span.lineEnd,
    shownThrough: truncated ? shownEnd : span.lineEnd,
    repoSha: options.repoSha ?? null,
    dirty: options.dirty ?? null,
    truncated,
    incompleteSentence: truncated && sentenceCut(emitted),
    continuation: truncated
      ? { fromLine: nextLine, charOffset: nextOffset, lineEnd: span.lineEnd, ref: `${rel}#${anchor}` }
      : null,
    bytes: Buffer.byteLength(emitted, 'utf8'),
    sectionBytes: Buffer.byteLength(lines.slice(span.lineStart - 1, span.lineEnd).join('\n'), 'utf8'),
    text: emitted,
  };
}

export function gitRouteMeta(root) {
  const sha = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' });
  const status = spawnSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' });
  if (sha.status !== 0) return { repoSha: null, dirty: null };
  return { repoSha: sha.stdout.trim(), dirty: Boolean(status.stdout && status.stdout.trim()) };
}
