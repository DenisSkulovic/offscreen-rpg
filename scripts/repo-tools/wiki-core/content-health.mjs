/**
 * Content-risk candidates. Zero model, zero writes, never rewrites a page.
 * A warning is a review prompt, not a verdict that the wiki is true or false.
 */
import { parseMarkdownDocument } from './markdown.mjs';

export const CONTENT_HEALTH_SCHEMA = 'wiki.content-health.v1';
const LARGE_SECTION_CHARS = 16000;
const UNRATIFIED = /proposal only|not installed or authorized|\bnot selected\b(?! here)/i;
const STALE_FUTURE = /not yet implemented/i;
const HISTORICAL_LINK = /\((?:\.\.\/)*[^)\s]*(?:research\/legacy-engineering|evidence\/inspections)[^)\s]*\)/i;
const HISTORICAL_ORDER = /chosen frontend execution playbook|for actual entry points|use the \[/i;
const DATED_EVIDENCE = /dated evidence|not the current owner|not the current executor/i;
const PATH_BACKTICK = /`((?:docs|apps|packages|scripts|\.agents|work)\/[A-Za-z0-9_./-]+\.(?:md|mjs|ts|tsx|json))`/g;

function lineOf(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function quoteAt(text, index) {
  const line = text.split(/\r?\n/)[lineOf(text, index) - 1] ?? '';
  return line.trim().slice(0, 180);
}

function issue(path, line, code, quote, message) {
  return { path, line, code, severity: 'warning', quote, message };
}

function paragraphsOf(text) {
  return text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0 && !block.startsWith('```'));
}

function sectionSizes(text) {
  const parsed = parseMarkdownDocument(text);
  const lines = text.split(/\r?\n/);
  return parsed.headings.map((heading, index) => {
    const start = (heading.line ?? 1) - 1;
    const next = parsed.headings[index + 1];
    const end = next?.line ? next.line - 1 : lines.length;
    const body = lines.slice(start, end).join('\n');
    return { id: heading.id, text: heading.text, line: heading.line, chars: body.length };
  });
}

export function scanDocuments(documents, options = {}) {
  const scripts = options.scripts ?? [];
  const exists = options.exists ?? (() => true);
  const issues = [];
  const seenParagraphs = new Map();
  for (const doc of documents) {
    const text = String(doc.text).replace(/^\uFEFF/, '');
    const prose = text.replace(/```[\s\S]*?```/g, '');
    const opening = prose.split(/^## /m)[0];
    if (doc.path.startsWith('docs/') && UNRATIFIED.test(opening)) {
      const at = prose.search(UNRATIFIED);
      issues.push(
        issue(
          doc.path,
          lineOf(prose, at),
          'unratified-canonical',
          quoteAt(prose, at),
          'A canonical page opening still says this is proposal-only or not selected. Review required. The scanner does not move the page.',
        ),
      );
    }
    for (const paragraph of paragraphsOf(prose)) {
      if (STALE_FUTURE.test(paragraph)) {
        const named = scripts.find((name) => paragraph.includes(name));
        if (named) {
          const at = prose.indexOf(paragraph);
          issues.push(
            issue(
              doc.path,
              lineOf(prose, Math.max(at, 0)),
              'stale-unimplemented-script',
              paragraph.replace(/\s+/g, ' ').slice(0, 180),
              `${named} is a package script. "Not yet implemented" is stale. A script name is not a passing test run.`,
            ),
          );
        }
      }
      if (HISTORICAL_LINK.test(paragraph) && HISTORICAL_ORDER.test(paragraph) && !DATED_EVIDENCE.test(paragraph)) {
        const at = prose.indexOf(paragraph);
        issues.push(
          issue(
            doc.path,
            lineOf(prose, Math.max(at, 0)),
            'historical-default',
            paragraph.replace(/\s+/g, ' ').slice(0, 180),
            'The default instruction sends the reader to a legacy research note or a dated inspection.',
          ),
        );
      }
      const compact = paragraph.replace(/\s+/g, ' ').trim();
      if (compact.length >= 160 && !compact.startsWith('|') && !compact.startsWith('#')) {
        const previous = seenParagraphs.get(compact);
        if (previous && previous !== doc.path) {
          issues.push(
            issue(doc.path, null, 'duplicate-paragraph', compact.slice(0, 180), `Same paragraph also appears in ${previous}.`),
          );
        } else if (!previous) seenParagraphs.set(compact, doc.path);
      }
    }
    for (const section of sectionSizes(text)) {
      if (section.chars >= LARGE_SECTION_CHARS) {
        issues.push(
          issue(
            doc.path,
            section.line,
            'large-section',
            section.text,
            `Heading #${section.id} is ${section.chars} characters. Read it by heading. This is not an order to split the page.`,
          ),
        );
      }
    }
    for (const match of prose.matchAll(PATH_BACKTICK)) {
      if (match[1].includes('YYYY') || match[1].endsWith('/FEATURE.md')) continue;
      if (!exists(match[1])) {
        issues.push(
          issue(doc.path, lineOf(prose, match.index ?? 0), 'missing-path', match[0], `${match[1]} is named and is not a file in this worktree.`),
        );
      }
    }
  }
  return { schema: CONTENT_HEALTH_SCHEMA, issues };
}

const CLAIM_IMPACT_HEADING = /^##\s+Claim impact\s+\|\s+claim-impact\.v1\s*$/im;
const CLAIM_DISPOSITIONS = new Set([
  'promoted',
  'illustrative',
  'parked',
  'source-observed',
  'selected-experience',
  'rejected',
]);

function claimCells(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|')) return null;
  const parts = trimmed.split('|').map((cell) => cell.trim());
  if (parts[0] === '') parts.shift();
  if (parts.length > 0 && parts[parts.length - 1] === '') parts.pop();
  return parts;
}

/**
 * Optional structured check for a Change packet. It does not read product prose.
 * A missing section is not a finding. English words such as "must" are not claims.
 */
export function claimImpactFindings(text) {
  const source = String(text);
  const match = source.match(CLAIM_IMPACT_HEADING);
  if (!match || match.index == null) return [];
  const start = match.index + match[0].length;
  const rest = source.slice(start);
  const next = rest.search(/^##\s+/m);
  const body = next >= 0 ? rest.slice(0, next) : rest;
  const baseLine = source.slice(0, start).split(/\r?\n/).length;
  const findings = [];
  let header = null;
  const lines = body.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const cells = claimCells(lines[index]);
    if (!cells) continue;
    if (cells.every((cell) => /^:?-{3,}:?$/.test(cell))) continue;
    const keys = cells.map((cell) => {
      const value = cell.toLowerCase();
      if (value.includes('disposition')) return 'disposition';
      if (value.includes('evidence')) return 'evidence';
      if (value.includes('claim')) return 'claim';
      return null;
    });
    if (!header && keys.includes('claim') && keys.includes('disposition') && keys.includes('evidence')) {
      header = keys;
      continue;
    }
    if (!header || cells.length !== header.length) continue;
    const row = {};
    header.forEach((key, cellIndex) => {
      if (key) row[key] = cells[cellIndex];
    });
    const line = baseLine + index;
    const disposition = String(row.disposition ?? '').trim().toLowerCase();
    const claim = String(row.claim ?? '');
    const evidence = String(row.evidence ?? '');
    if (!CLAIM_DISPOSITIONS.has(disposition)) {
      findings.push({
        line,
        code: 'unknown-claim-disposition',
        message: 'A claim-impact disposition must be promoted, illustrative, parked, source-observed, selected-experience, or rejected.',
      });
      continue;
    }
    if (disposition === 'promoted' && /cognee/i.test(claim)) {
      findings.push({
        line,
        code: 'rejected-research-promoted',
        message: 'Cognee stays rejected developer-agent research. A claim-impact row cannot promote it into game memory.',
      });
    }
    if (disposition === 'promoted' && !/\.md(?:#[A-Za-z0-9._+\-]+)?\b/i.test(evidence)) {
      findings.push({
        line,
        code: 'missing-evidence-route',
        message: 'A promoted claim needs a local Markdown evidence route. The checker does not decide whether the claim is fun or true.',
      });
    }
  }
  return findings;
}
