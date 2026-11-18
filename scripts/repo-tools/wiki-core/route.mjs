/**
 * Heading-level index and bounded read. Zero provider, zero writes.
 * Score = heading hits * 5 + question-row hits * 3 + intro-token hits.
 * A question that names product or technical follows that map's row when the row names a content word.
 * Otherwise a same-page link is followed before a router link, and a title yields to a child heading
 * whose opening contains a query word the title opening lacks. A heading that covers rarer
 * query words can replace a higher-scoring title. Route stemming is only hour/hours and commit/commits.
 * The static benchmark gold set is not an input.
 * Authority is section-local (wiki.route.v2). v1 copied the page opening onto every
 * heading. v2 uses an explicit status line or self-label, then inherits only when
 * the parent label is already settled. Normative authority stays separate from
 * realization. Uncertain headings stay in the index and out of the normative lane.
 * Portable WIKI-INDEX copies authority and lane from this same section record.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parseMarkdownDocument } from './markdown.mjs';
import { collectMaintainedPages } from './model.mjs';
import { classifyRepoPath, resolveHref } from './paths.mjs';
import { tokenize } from './search.mjs';

export const ROUTE_SCHEMA = 'wiki.route.v2';
export const DEFAULT_MAX_CHARS = 5000;
const PREVIEW_CHARS = 320;
const PROPOSAL_QUERY = /\b(proposal|proposed|not installed|not selected)\b/i;
const STATUS_QUERY = /\b(implemented|implementation|tested|available|live|source-observed|exist|exists)\b/i;
const ROUTE_GLUE = new Set('page still only where mention describe separate how does instructions'.split(' '));
const SCOPE_WORDS = new Set(['product', 'technical']);

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

function laneOf(authority) {
  if (authority === 'proposal') return 'proposal';
  if (authority === 'historic' || authority === 'evidence') return 'historic';
  if (authority === 'status') return 'status';
  if (authority === 'uncertain') return 'uncertain';
  return 'normative';
}

function stripMarks(text) {
  return String(text ?? '').replace(/[*_`]/g, '').replace(/\s+/g, ' ').trim();
}

function firstParagraph(intro) {
  const lines = String(intro ?? '').split(/\r?\n/);
  let index = 1;
  while (index < lines.length && lines[index].trim() === '') index += 1;
  const buffer = [];
  for (; index < lines.length; index += 1) {
    if (lines[index].trim() === '') break;
    buffer.push(lines[index]);
  }
  return stripMarks(buffer.join(' '));
}

function firstSentence(text) {
  const match = /^.+?[.!?](?=\s|$)/.exec(text);
  return (match ? match[0] : text).trim();
}

function hasBareWord(label, word) {
  const re = new RegExp(`(?<!\\b(?:not|no|un)\\s)\\b${word}\\b`, 'i');
  return re.test(label);
}

function pathDefault(rel, kind) {
  if (rel === 'STATUS.md') {
    return { authority: 'status', lane: 'status', realization: 'status-evidence', authorityBasis: 'path' };
  }
  if (kind === 'canonical-product') {
    return { authority: 'ratified-product', lane: 'normative', realization: 'unknown', authorityBasis: 'path' };
  }
  if (kind === 'canonical-technical') {
    return { authority: 'selected-technical', lane: 'normative', realization: 'unknown', authorityBasis: 'path' };
  }
  if (kind === 'canonical-support' || kind === 'canonical-page') {
    return { authority: 'selected-support', lane: 'normative', realization: 'unknown', authorityBasis: 'path' };
  }
  if (kind === 'open-design' || kind === 'open-change') {
    return { authority: 'proposal', lane: 'proposal', realization: 'proposed', authorityBasis: 'path' };
  }
  if (kind === 'historic' || kind === 'evidence') {
    return { authority: 'historic', lane: 'historic', realization: 'unknown', authorityBasis: 'path' };
  }
  if (kind === 'source-map') {
    return { authority: 'source-map', lane: 'normative', realization: 'unknown', authorityBasis: 'path' };
  }
  if (kind === 'canonical-router' || kind === 'root-index' || kind === 'work-index') {
    return { authority: 'router', lane: 'normative', realization: 'unknown', authorityBasis: 'path' };
  }
  return { authority: kind, lane: laneOf(kind), realization: 'unknown', authorityBasis: 'path' };
}

function realizationFrom(text, role) {
  if (role === 'proposal') return 'proposed';
  if (role === 'status') return 'status-evidence';
  if (role === 'uncertain') {
    if (/provider-writing|paid-provider|paid provider|provider call/i.test(text)) return 'not-paid-production';
    return 'unknown';
  }
  if (/\bnot implemented\b/i.test(text)) return 'unimplemented';
  if (/\bno table, api or code is authorized\b/i.test(text) || /\bno code(?:,| or)\b/i.test(text)) return 'unimplemented';
  if (/\bnot paid-provider permission\b/i.test(text) || /\bdoes not authorize a provider call\b/i.test(text)) return 'not-paid-production';
  if (/\bnot tested\b/i.test(text)) return 'unknown';
  if (/\bimplemented\b/i.test(text)) return 'implemented';
  if (/\btested\b/i.test(text)) return 'tested';
  return 'unknown';
}

function selectedName(rel, kind) {
  if (rel === 'STATUS.md') return 'status';
  if (kind === 'canonical-product') return 'ratified-product';
  if (kind === 'canonical-technical') return 'selected-technical';
  if (kind === 'canonical-support' || kind === 'canonical-page') return 'selected-support';
  return null;
}

function openingStatusText(intro) {
  const lines = String(intro ?? '')
    .split(/\r?\n/)
    .slice(1)
    .filter((line) => line.trim() !== '')
    .slice(0, 6)
    .map(stripMarks);
  const line = lines.find((item) => /^(?:status|state)\s*:/i.test(item));
  if (line) return line;
  const parts = firstParagraph(intro).split(/(?<=[.!?])\s+/);
  return parts.find((part) => /^(?:status|state)\s*:/i.test(part)) ?? null;
}

/**
 * Explicit labels only. A later sentence that mentions some other proposal
 * does not change this heading. A status line we cannot settle is uncertain.
 */
function explicitLabel(headingText, intro) {
  const heading = stripMarks(headingText);
  if (/^proposed\b/i.test(heading)) {
    return { role: 'proposal', realization: 'proposed', authorityBasis: 'heading' };
  }
  const paragraph = firstParagraph(intro);
  const sentence = firstSentence(paragraph);
  const self = selfLabel(sentence);
  const statusLine = openingStatusText(intro);
  if (!statusLine) return self;
  const body = statusLine.replace(/^(?:status|state)\s*:\s*/i, '').trim();
  const label = firstSentence(body);
  const realizationText = `${body} ${paragraph}`;
  if (/conditional technical target/i.test(label)) {
    return { role: 'uncertain', realization: 'not-paid-production', authorityBasis: 'status' };
  }
  const selectedWord = ['selected', 'ratified', 'accepted', 'adopted'].some((word) => hasBareWord(label, word));
  const proposedWord = /\bproposed\b/i.test(label) || /\bproposal only\b/i.test(label) || /\bproposed\/blocked\b/i.test(label);
  const bareProposal = /\bproposal\b/i.test(label) && !/\bnot a proposal\b/i.test(label) && !proposedWord;
  const recommendation = /\brecommendation\b/i.test(label);
  const withhold = /\bnot approved\b/i.test(label) || /\bnot installed or authorized\b/i.test(label) || /\bunaccepted future\b/i.test(label);
  if (selectedWord && (proposedWord || bareProposal || recommendation || withhold)) {
    return { role: 'uncertain', realization: realizationFrom(realizationText, 'uncertain'), authorityBasis: 'status-unrecognized' };
  }
  if (proposedWord || recommendation || withhold) {
    return { role: 'proposal', realization: 'proposed', authorityBasis: 'status' };
  }
  if (/\bnot a proposal\b/i.test(label) && selectedWord) {
    return { role: 'selected', realization: realizationFrom(realizationText, 'selected'), authorityBasis: 'status' };
  }
  if (selectedWord) {
    return { role: 'selected', realization: realizationFrom(realizationText, 'selected'), authorityBasis: 'status' };
  }
  if (bareProposal) {
    return { role: 'uncertain', realization: 'unknown', authorityBasis: 'status-unrecognized' };
  }
  return self;
}

function selfLabel(sentence) {
  if (/^this (?:page|section|family|document) is proposed\/blocked\b/i.test(sentence)) {
    return { role: 'proposal', realization: 'proposed', authorityBasis: 'self' };
  }
  if (/^this (?:page|section|family|document|queue) is (?:an illustrative evaluation|proposal only|(?:a )?proposed)\b/i.test(sentence)) {
    return { role: 'proposal', realization: 'proposed', authorityBasis: 'self' };
  }
  if (/^this page is proposal only\b/i.test(sentence)) {
    return { role: 'proposal', realization: 'proposed', authorityBasis: 'self' };
  }
  if (/^proposed\b/i.test(sentence)) {
    return { role: 'proposal', realization: 'proposed', authorityBasis: 'self' };
  }
  if (/^the proposed queue is\b/i.test(sentence)) {
    return { role: 'proposal', realization: 'proposed', authorityBasis: 'self' };
  }
  if (/^this (?:page|section|family|document|rehearsal boundary|evidence graph) is the selected\b/i.test(sentence)) {
    return { role: 'selected', realization: realizationFrom(sentence, 'selected'), authorityBasis: 'self' };
  }
  return null;
}

function settleExplicit(rel, kind, explicit, parent) {
  if (explicit.role === 'proposal') {
    return { authority: 'proposal', lane: 'proposal', realization: explicit.realization, authorityBasis: explicit.authorityBasis };
  }
  if (explicit.role === 'uncertain') {
    return {
      authority: 'uncertain',
      lane: 'uncertain',
      realization: explicit.realization,
      authorityBasis: explicit.authorityBasis,
    };
  }
  const named = selectedName(rel, kind);
  const parentWithholds = parent?.lane === 'proposal' || (!parent && pathDefault(rel, kind).lane === 'proposal');
  if (!named || parentWithholds) {
    return {
      authority: 'uncertain',
      lane: 'uncertain',
      realization: 'unknown',
      authorityBasis: 'selected-under-proposal',
    };
  }
  return {
    authority: named,
    lane: laneOf(named),
    realization: explicit.realization,
    authorityBasis: explicit.authorityBasis,
  };
}

function classifyHeadings(rel, kind, headings, lines) {
  const stack = [];
  return headings.map((heading, index) => {
    const span = sectionSpan(headings, index, lines.length);
    const nextHeading = headings[index + 1];
    const introEnd = nextHeading ? nextHeading.line - 1 : lines.length;
    const intro = lines.slice(span.lineStart - 1, Math.max(span.lineStart, introEnd)).join('\n');
    while (stack.length > 0 && stack[stack.length - 1].depth >= heading.depth) stack.pop();
    const parent = stack.length > 0 ? stack[stack.length - 1].decision : null;
    const explicit = explicitLabel(heading.text, intro);
    const decision = explicit
      ? settleExplicit(rel, kind, explicit, parent)
      : parent
        ? {
            authority: parent.authority,
            lane: parent.lane,
            realization: parent.realization,
            authorityBasis: 'inherited',
          }
        : pathDefault(rel, kind);
    stack.push({ depth: heading.depth, decision });
    return decision;
  });
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
        tableContext: reference.tableContext ?? '',
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
    const decisions = classifyHeadings(rel, kind, doc.headings, lines);
    doc.headings.forEach((heading, index) => {
      const span = sectionSpan(doc.headings, index, lines.length);
      const nextHeading = doc.headings[index + 1];
      const introEnd = nextHeading ? nextHeading.line - 1 : lines.length;
      const intro = lines.slice(span.lineStart - 1, Math.max(span.lineStart, introEnd)).join('\n');
      const body = lines.slice(span.lineStart - 1, span.lineEnd).join('\n');
      const specific = contexts.get(`${rel}#${heading.id}`) ?? [];
      const pageLevel = heading.depth === 1 ? (contexts.get(`${rel}#`) ?? []) : [];
      const decision = decisions[index];
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
        authority: decision.authority,
        lane: decision.lane,
        realization: decision.realization,
        authorityBasis: decision.authorityBasis,
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

const ROUTE_STEMS = new Map([
  ['hours', 'hour'],
  ['commits', 'commit'],
]);

function stem(token) {
  return ROUTE_STEMS.get(token) ?? token;
}

function tokenHit(token, found) {
  if (found.has(token) || found.has(stem(token))) return true;
  for (const item of found) if (stem(item) === stem(token)) return true;
  return false;
}

function tokenHits(tokens, haystack) {
  const found = new Set(tokenize(haystack ?? ''));
  let hits = 0;
  for (const token of tokens) if (tokenHit(token, found)) hits += 1;
  return hits;
}

function queryTokens(query) {
  return tokenize(query).filter((token) => !ROUTE_GLUE.has(token));
}

function matchedTokens(section, tokens) {
  const heading = new Set(tokenize(section.heading));
  const intro = new Set(section.introTokens ?? tokenize(section.preview));
  const row = new Set(tokenize(section.rowContext));
  return tokens.filter((token) => tokenHit(token, heading) || tokenHit(token, intro) || tokenHit(token, row));
}

export function scoreSection(section, query) {
  const tokens = queryTokens(query);
  const headingHits = tokenHits(tokens, section.heading);
  const rowHits = tokenHits(tokens, section.rowContext);
  const introSet = new Set(section.introTokens ?? []);
  const introHits = tokens.filter((token) => tokenHit(token, introSet)).length;
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

function moveToFront(ranked, chosen) {
  if (!chosen || chosen === ranked[0]) return ranked;
  return [chosen, ...ranked.filter((row) => row !== chosen)];
}

function destinationRow(index, pool, link, query) {
  const matches = (section) => {
    if (section.path !== link.path) return false;
    if (link.anchor) return section.anchor === link.anchor;
    return section.depth === 1;
  };
  return (
    pool.find((row) => matches(row.section)) ??
    (() => {
      const section = index.sections.find(matches);
      return section ? { section, ...scoreSection(section, query) } : null;
    })()
  );
}

function linkDestination(index, pool, section, tokens, query, { ignoreIntro = false } = {}) {
  const heading = new Set(tokenize(section.heading));
  const intro = ignoreIntro ? new Set() : new Set(section.introTokens ?? []);
  let choice = null;
  for (const link of section.outbound ?? []) {
    const haystack = `${link.label} ${link.tableContext ?? ''}`;
    const hits = tokenize(haystack).filter((token) => tokens.includes(token) && !heading.has(token) && !intro.has(token));
    if (hits.length === 0 || !link.path) continue;
    const dest = destinationRow(index, pool, link, query);
    if (!dest) continue;
    if (!choice || hits.length > choice.hits || (hits.length === choice.hits && dest.score > choice.dest.score)) {
      choice = { hits: hits.length, dest };
    }
  }
  return choice?.dest ?? null;
}

function scopeDestination(index, pool, tokens, query) {
  const wantsProduct = tokens.includes('product');
  const wantsTechnical = tokens.includes('technical');
  if (wantsProduct === wantsTechnical) return null;
  const path = wantsProduct ? 'docs/product/README.md' : 'docs/technical/README.md';
  const map = pool.find((row) => row.section.path === path && row.section.depth === 1);
  if (!map) return null;
  const content = tokens.filter((token) => !SCOPE_WORDS.has(token));
  return linkDestination(index, pool, map.section, content, query, { ignoreIntro: true });
}

function statusForPriority(index, tokens, query) {
  if (!tokens.includes('priority') || !tokens.includes('development')) return null;
  const hits = index.sections
    .filter((section) => section.path === 'STATUS.md')
    .map((section) => ({ section, ...scoreSection(section, query) }))
    .filter((row) => row.tokens.includes('priority'));
  hits.sort((a, b) => b.score - a.score || a.section.lineStart - b.section.lineStart);
  return hits[0] ?? null;
}

function specificChild(parent, ranked, tokens) {
  if (!parent) return null;
  const heading = new Set(tokenize(parent.section.heading));
  const intro = new Set(parent.section.introTokens ?? []);
  const parentExtra = parent.tokens.filter((token) => intro.has(token) && !heading.has(token)).length;
  let choice = null;
  for (const other of ranked) {
    if (other.section.lane === 'proposal' || other.section.lane === 'historic' || other.section.lane === 'uncertain') continue;
    if (other.section.path !== parent.section.path || other.section.anchor === parent.section.anchor) continue;
    if (other.section.depth <= parent.section.depth) continue;
    if (other.section.lineStart < parent.section.lineStart || other.section.lineEnd > parent.section.lineEnd) continue;
    const childIntro = other.section.introTokens ?? [];
    const extra = other.tokens.filter((token) => childIntro.includes(token) && !intro.has(token));
    const novel = extra.filter((token) => !parent.tokens.includes(token));
    const childHeading = new Set(tokenize(other.section.heading));
    const headingHit = [...childHeading].some((token) => tokens.includes(token) && !heading.has(token));
    if (extra.length === 0 || extra.length < parentExtra) continue;
    if (novel.length === 0 && !headingHit && proseCover(other.section, tokens).length < 2) continue;
    const parentProse = new Set(proseCover(parent.section, tokens));
    const childOnlyProse = proseCover(other.section, tokens).filter((token) => !parentProse.has(token));
    const dropped = coveredContent(parent, tokens).filter((token) => !coveredContent(other, tokens).includes(token));
    if (dropped.length > 0 && !headingHit && childOnlyProse.length < 2) continue;
    if (!choice || extra.length > choice.extra || (extra.length === choice.extra && other.score > choice.row.score)) {
      choice = { extra: extra.length, row: other };
    }
  }
  return choice?.row ?? null;
}

function contentTokens(tokens) {
  return tokens.filter((token) => !SCOPE_WORDS.has(token)).map(stem);
}

function coveredContent(row, tokens) {
  const matched = new Set(row.tokens.map(stem));
  return [...new Set(contentTokens(tokens).filter((token) => matched.has(token)))];
}

function orderedRun(section, tokens) {
  const hay = (section.introTokens ?? []).map(stem);
  const wanted = contentTokens(tokens);
  let best = 0;
  for (let start = 0; start < wanted.length; start += 1) {
    let at = 0;
    let run = 0;
    for (let index = start; index < wanted.length; index += 1) {
      const found = hay.indexOf(wanted[index], at);
      if (found < 0) break;
      at = found + 1;
      run += 1;
    }
    if (run > best) best = run;
  }
  return best;
}

function coverageWeight(ranked, tokens) {
  const present = new Map();
  for (const row of ranked) {
    if (row.section.lane === 'historic' || row.section.lane === 'uncertain') continue;
    for (const token of coveredContent(row, tokens)) present.set(token, (present.get(token) ?? 0) + 1);
  }
  return (row) => coveredContent(row, tokens).reduce((sum, token) => sum + 1 / Math.max(present.get(token) ?? 1, 1), 0);
}

function proseCover(section, tokens) {
  const hay = new Set([...(section.introTokens ?? []), ...tokenize(section.heading)].map(stem));
  return contentTokens(tokens).filter((token) => hay.has(token));
}

function tightSpan(section, tokens) {
  const hay = (section.introTokens ?? []).map(stem);
  const wanted = contentTokens(tokens);
  let best = 0;
  for (let start = 0; start < wanted.length; start += 1) {
    let at = 0;
    let run = 0;
    let from = -1;
    for (let index = start; index < wanted.length; index += 1) {
      const found = hay.indexOf(wanted[index], at);
      if (found < 0 || (from >= 0 && found - from > 12)) break;
      if (from < 0) from = found;
      at = found + 1;
      run += 1;
    }
    if (run > best) best = run;
  }
  return best;
}

function preferCoverage(ranked, tokens, lead) {
  if (!lead) return null;
  const weight = coverageWeight(ranked, tokens);
  const leadCover = new Set(coveredContent(lead, tokens));
  const leadWeight = weight(lead);
  const leadRun = orderedRun(lead.section, tokens);
  const leadProse = new Set(proseCover(lead.section, tokens));
  const leadWordsAreInProse = [...leadCover].every((token) => leadProse.has(token));
  let choice = null;
  for (const row of ranked) {
    if (row === lead || row.section.lane === 'historic' || row.section.lane === 'uncertain' || row.section.authority === 'router') continue;
    const cover = coveredContent(row, tokens);
    const missing = [...leadCover].filter((token) => !cover.includes(token));
    if (missing.length > 0) continue;
    const extra = cover.filter((token) => !leadCover.has(token));
    const rowWeight = weight(row);
    const sameWordsInOrder = extra.length === 0 && row.section.lane !== 'proposal' && leadWordsAreInProse && row.score >= lead.score - 6 && orderedRun(row.section, tokens) > leadRun;
    const rareExtra = extra.length > 0 && row.section.lane !== 'proposal' && rowWeight >= leadWeight + 0.2;
    const onlyPair = leadCover.size === 0 && tightSpan(row.section, tokens) >= 2;
    if (!sameWordsInOrder && !rareExtra && !onlyPair) continue;
    const product = row.section.path.startsWith('docs/product/') ? 1 : 0;
    const rank = (onlyPair ? tightSpan(row.section, tokens) * 100 : 0) + rowWeight * 1000 + product * 10 + orderedRun(row.section, tokens);
    if (!choice || rank > choice.rank || (rank === choice.rank && row.score > choice.row.score)) choice = { rank, row };
  }
  return choice?.row ?? null;
}

function samePageSection(index, pool, lead, tokens, query) {
  const heading = new Set(tokenize(lead.section.heading));
  let choice = null;
  for (const link of lead.section.outbound ?? []) {
    if (link.path !== lead.section.path || !link.anchor) continue;
    const hits = tokenize(`${link.label} ${link.tableContext ?? ''}`).filter((token) => tokens.includes(token) && !heading.has(token));
    if (hits.length === 0) continue;
    const dest = destinationRow(index, pool, link, query);
    if (!dest) continue;
    if (!choice || hits.length > choice.hits || (hits.length === choice.hits && dest.score > choice.dest.score)) {
      choice = { hits: hits.length, dest };
    }
  }
  return choice?.dest ?? null;
}

function namedProposal(ranked) {
  const seen = new Set();
  for (const row of ranked) {
    if (row.section.lane === 'proposal' || row.section.lane === 'historic' || row.section.lane === 'uncertain') continue;
    for (const token of row.tokens) seen.add(stem(token));
  }
  let choice = null;
  for (const row of ranked) {
    if (row.section.lane !== 'proposal') continue;
    const unique = row.tokens.filter((token) => !SCOPE_WORDS.has(token) && !seen.has(stem(token)));
    if (unique.length === 0) continue;
    if (!choice || unique.length > choice.unique || (unique.length === choice.unique && row.score > choice.row.score)) {
      choice = { unique: unique.length, row };
    }
  }
  return choice?.row ?? null;
}

function matchesKind(section, kind) {
  if (!kind) return true;
  if (kind === 'product') return section.path.startsWith('docs/product/');
  if (kind === 'technical') return section.path.startsWith('docs/technical/');
  if (kind === 'status') return section.path === 'STATUS.md';
  if (kind === 'proposal') return section.lane === 'proposal';
  return true;
}

function present(section, query, provenance = null) {
  const scored = scoreSection(section, query);
  return {
    path: section.path,
    anchor: section.anchor,
    heading: section.heading,
    lineStart: section.lineStart,
    lineEnd: section.lineEnd,
    authority: section.authority,
    lane: section.lane,
    realization: section.realization ?? 'unknown',
    authorityBasis: section.authorityBasis ?? null,
    selected: section.lane === 'normative' && section.authority !== 'uncertain',
    score: scored.score,
    match: scored.reason,
    preview: section.preview,
    rowContext: section.rowContext,
    bytes: section.bytes,
    ref: `${section.path}#${section.anchor}`,
    repoSha: provenance?.repoSha ?? null,
    dirty: provenance?.dirty ?? null,
  };
}

export function findSections(index, query, { kind = null, top = 5, includeHistoric = false } = {}) {
  const tokens = queryTokens(query);
  const scored = index.sections
    .map((section) => ({ section, ...scoreSection(section, query) }))
    .filter((row) => row.score > 0 && matchesKind(row.section, kind))
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.section.path.localeCompare(b.section.path) ||
        a.section.lineStart - b.section.lineStart,
    );
  let ranked = scored;
  const scoped = scopeDestination(index, scored, tokens, query);
  const lead = PROPOSAL_QUERY.test(query)
    ? ranked[0]
    : (ranked.find((row) => row.section.lane !== 'proposal' && row.section.lane !== 'historic' && row.section.lane !== 'uncertain') ?? ranked[0]);
  let promotedProposal = false;
  let focusLane = ranked[0]?.section.lane ?? 'normative';
  if (scoped) {
    ranked = moveToFront(ranked, scoped);
    focusLane = scoped.section.lane;
  } else if (lead) {
    const onPage = lead.section.authority === 'router' ? null : samePageSection(index, scored, lead, tokens, query);
    let focus = lead;
    if (onPage) focus = onPage;
    else {
      const covered = preferCoverage(ranked, tokens, lead);
      if (covered) focus = covered;
      else if (lead.section.authority === 'router') {
        const linked = linkDestination(index, scored, lead.section, tokens, query);
        if (linked) focus = linked;
      }
      if (focus === lead) {
        const child = specificChild(focus, ranked, tokens);
        const childCover = new Set(child ? coveredContent(child, tokens) : []);
        const richerRival = child && ranked.some((row) => {
          if (row === child || row === focus) return false;
          if (row.section.lane === 'proposal' || row.section.lane === 'historic' || row.section.lane === 'uncertain') return false;
          if (row.score <= focus.score) return false;
          const cover = coveredContent(row, tokens);
          const extra = cover.filter((token) => !childCover.has(token));
          const missing = [...childCover].filter((token) => !cover.includes(token));
          return extra.length > 0 && missing.length === 0;
        });
        if (child && !richerRival) focus = child;
      }
    }
    promotedProposal = focus.section.lane === 'proposal';
    focusLane = focus.section.lane;
    ranked = moveToFront(ranked, focus);
  }
  const status = statusForPriority(index, tokens, query);
  if (status) {
    ranked = moveToFront(ranked, status);
    promotedProposal = false;
    focusLane = status.section.lane;
  }
  const named = namedProposal(ranked);
  if (named) {
    ranked = moveToFront(ranked, named);
    promotedProposal = true;
    focusLane = named.section.lane;
  }
  const normative = [];
  const proposalLane = [];
  const historic = [];
  const uncertain = [];
  for (const row of ranked) {
    const item = present(row.section, query, index);
    if (row.section.lane === 'proposal') proposalLane.push(item);
    else if (row.section.lane === 'historic') {
      if (includeHistoric) historic.push(item);
    } else if (row.section.lane === 'uncertain') uncertain.push(item);
    else normative.push(item);
  }
  let statusCompanion = null;
  if (STATUS_QUERY.test(query)) {
    const already = normative.find((item) => item.path === 'STATUS.md');
    const statusSection =
      index.sections.find((section) => section.path === 'STATUS.md' && section.anchor === 'orientation') ??
      index.sections.find((section) => section.path === 'STATUS.md');
    statusCompanion = already ?? (statusSection ? present(statusSection, query, index) : null);
    if (statusCompanion && statusCompanion.score === 0) statusCompanion = { ...statusCompanion, match: 'status-companion' };
  }
  const proposalQuestion = PROPOSAL_QUERY.test(query) && proposalLane.length > 0;
  let primaryLane = 'normative';
  if (proposalQuestion || promotedProposal) primaryLane = 'proposal';
  else if (focusLane === 'uncertain') primaryLane = 'uncertain';
  return {
    schema: ROUTE_SCHEMA,
    query,
    kind,
    top,
    includeHistoric,
    repoSha: index.repoSha ?? null,
    dirty: index.dirty ?? null,
    primaryLane,
    normative: normative.slice(0, top),
    proposalLane: proposalLane.slice(0, top).map((item) => ({ ...item, notice: 'NOT SELECTED' })),
    uncertain: uncertain.slice(0, top).map((item) => ({ ...item, notice: 'UNCERTAIN — not a grant' })),
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
