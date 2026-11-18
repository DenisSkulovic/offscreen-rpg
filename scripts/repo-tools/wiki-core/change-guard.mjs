/**
 * Read-only Change reconciliation guard. It checks that a packet names
 * affected claims, source, and negative proof. It does not decide whether a
 * product rule is true, and it never writes or deletes a file.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { citationEdges } from '../maintenance-core.mjs';
import { parseMarkdownDocument } from './markdown.mjs';
import { claimImpactFindings } from './content-health.mjs';
import { buildWikiModel, collectMaintainedPages } from './model.mjs';
import { resolveHref } from './paths.mjs';

export const SCHEMA = 'wiki.change-guard.v1';

const LEDGER_KEYS = ['affected', 'authority', 'target', 'source', 'status', 'negative', 'map'];

function toRepoPath(value) {
  return String(value).replaceAll('\\', '/').replace(/^\.\//, '');
}

function finding(changePath, severity, code, line, field, message) {
  return {
    severity,
    code,
    path: changePath,
    line: line ?? null,
    field,
    message,
  };
}

function readText(abs) {
  return readFileSync(abs, 'utf8');
}

export function resolveInsideRepo(repo, rel) {
  const normalized = toRepoPath(rel).split('#')[0];
  if (!normalized || normalized.startsWith('/') || normalized.includes('..')) return null;
  const abs = path.resolve(repo, normalized);
  const escaped = path.relative(path.resolve(repo), abs);
  if (escaped.startsWith('..') || path.isAbsolute(escaped)) return null;
  return { rel: normalized, abs };
}

function stateOf(text) {
  const inline = text.match(/\*\*State:\*\*\s*([^\n*]+)/i);
  if (inline) return inline[1].trim();
  const wrapped = text.match(/\*\*State:\s*([^*]+)\*\*/i);
  if (wrapped) return wrapped[1].trim();
  return null;
}

function titleOf(text) {
  const match = text.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

function isDone(state) {
  return /^done\b/i.test(state ?? '');
}

function classifyHeader(text) {
  const value = text.toLowerCase();
  if (value.includes('affected')) return 'affected';
  if (value.includes('target delta')) return 'target';
  if (value.includes('source delta')) return 'source';
  if (value.includes('negative')) return 'negative';
  if (value.includes('map')) return 'map';
  if (value.includes('status') || value.includes('evidence tier')) return 'status';
  if (value.includes('authority')) return 'authority';
  return null;
}

function splitRow(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|')) return null;
  const parts = trimmed.split('|').map((cell) => cell.trim());
  if (parts[0] === '') parts.shift();
  if (parts.length > 0 && parts[parts.length - 1] === '') parts.pop();
  return parts;
}

function isSeparator(cells) {
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function placeholder(value) {
  return /^(?:\[?\.\.\.\]?|n\/a|na|docs updated|docs done|not needed|tbd|todo|-|—)?$/i.test(
    String(value ?? '').trim(),
  );
}

function reasonBody(target) {
  return String(target)
    .replace(/^(?:unchanged|changed|no product\/technical behavior impacted)\s*:?\s*/i, '')
    .trim();
}

function weakReason(reason) {
  const text = reason.trim();
  return text.length < 12 || /^(?:not needed|n\/a|docs updated|docs done)\.?$/i.test(text);
}

function lineNumberAt(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function extractPaths(cell) {
  const found = [];
  const pattern = /([A-Za-z0-9_./()+\-]+\.[A-Za-z0-9]+)(#[A-Za-z0-9._+\-]+)?/g;
  for (const match of String(cell).matchAll(pattern)) {
    found.push({ rel: match[1], fragment: match[2] ? match[2].slice(1) : null });
  }
  return found;
}

function parseLedger(text) {
  const lines = text.split(/\r?\n/);
  let header = null;
  const rows = [];
  for (let index = 0; index < lines.length; index += 1) {
    const cells = splitRow(lines[index]);
    if (!cells || isSeparator(cells)) continue;
    const keys = cells.map(classifyHeader);
    if (!header && keys.includes('affected') && keys.includes('target')) {
      header = { line: index + 1, keys };
      continue;
    }
    if (header && cells.length === header.keys.length) {
      const row = { line: index + 1 };
      header.keys.forEach((key, cellIndex) => {
        if (key) row[key] = cells[cellIndex];
      });
      rows.push(row);
    }
  }
  return { header, rows };
}

function gm07Finding(changePath, text) {
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!/gm07|gm-delegated-decision/i.test(line)) continue;
    if (/not ratified|unratified|without ratification|not approve|do not approve|remains proposed|not selected|\bproposed\b/i.test(line)) {
      continue;
    }
    if (/accepted|ratified|approved|selected product|product authority/i.test(line)) {
      return finding(
        changePath,
        'error',
        'unratified-product-reference',
        index + 1,
        'authority',
        'GM07 is still a proposal. Citing it does not ratify a product rule, and this guard will not write one.',
      );
    }
  }
  return null;
}

function pathRatificationFinding(changePath, text) {
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/docs\/technical\/\S+\.md/i.test(line) && /because/i.test(line) && /path|folder|location|directory/i.test(line)) {
      return finding(
        changePath,
        'error',
        'path-is-not-ratification',
        index + 1,
        'authority',
        'A path under docs/technical does not select a proposal. Report needs independent owner review; do not promote it from the folder name.',
      );
    }
  }
  return null;
}

function paidClaimFinding(changePath, text) {
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!/provider|paid/i.test(line) || !/passed|green|succeeded|verified/i.test(line)) continue;
    if (/not run|not performed|not executed|no provider|zero provider|0 paid|without (?:a )?provider|do not run/i.test(line)) {
      continue;
    }
    return finding(
      changePath,
      'error',
      'unperformed-paid-claim',
      index + 1,
      'evidence',
      'This packet claims a paid or provider result. The guard has no evidence that result was performed.',
    );
  }
  return null;
}

const PLAN_PLANES = ['product', 'technical', 'code', 'related'];

function declaresPlanSchema(text) {
  return /planned-impact\.v1/i.test(text);
}

function planeKey(cell) {
  const label = String(cell ?? '').replace(/\*\*/g, '').trim().toLowerCase();
  if (label.startsWith('product')) return 'product';
  if (label.startsWith('technical')) return 'technical';
  if (label.startsWith('code')) return 'code';
  if (label.startsWith('related') || label.startsWith('dependent')) return 'related';
  if (label.startsWith('development')) return 'development';
  return null;
}

function planSection(text) {
  const match = text.match(/^##\s+Planned specification and implementation delta[^\n]*$/im);
  if (!match) return null;
  const start = match.index + match[0].length;
  const rest = text.slice(start);
  const next = rest.search(/^##\s+/m);
  const body = next >= 0 ? rest.slice(0, next) : rest;
  return { line: lineNumberAt(text, match.index), body, offset: start };
}

function planRows(section, fullText) {
  const rows = [];
  const lines = section.body.split(/\r?\n/);
  let cursor = section.offset;
  for (const line of lines) {
    const cells = splitRow(line);
    const lineNumber = lineNumberAt(fullText, cursor);
    cursor += line.length + 1;
    if (!cells || isSeparator(cells)) continue;
    const key = planeKey(cells[0]);
    if (!key) continue;
    rows.push({ key, cells, line: lineNumber });
  }
  return rows;
}

function planPaths(cells) {
  const found = [];
  for (const cell of cells.slice(1)) {
    for (const item of extractPaths(cell)) {
      if (item.rel.includes('/')) found.push(item);
    }
  }
  return found;
}

const SHAPE_HEADING = /^##\s+Document shape\s+\|\s+shape-ops\.v1\s*$/im;
const RECEIPT_HEADING = /^##\s+Migration receipt\s+\|\s+shape-receipt\.v1\s*$/im;

function sectionBody(text, headingRe) {
  const match = text.match(headingRe);
  if (!match || match.index == null) return null;
  const start = match.index + match[0].length;
  const rest = text.slice(start);
  const next = rest.search(/^##\s+/m);
  const body = next >= 0 ? rest.slice(0, next) : rest;
  return { line: lineNumberAt(text, match.index), body, offset: start };
}

function tableCells(text) {
  const rows = [];
  for (const line of String(text).split(/\r?\n/)) {
    const cells = splitRow(line);
    if (!cells || isSeparator(cells)) continue;
    rows.push(cells);
  }
  return rows;
}

function parseRef(token) {
  const match = String(token ?? '').match(/([A-Za-z0-9_./()+\-]+\.md)(?:#([A-Za-z0-9._+\-]+))?/);
  if (!match) return null;
  return { rel: match[1], fragment: match[2] ?? null };
}

function parseMigrationCell(cell) {
  const arrows = [];
  for (const part of String(cell ?? '').split(';')) {
    const trimmed = part.trim();
    if (!trimmed || /^unchanged$/i.test(trimmed)) continue;
    const sides = trimmed.split(/\s*(?:->|→)\s*/);
    if (sides.length < 2) continue;
    const from = parseRef(sides[0]);
    const right = sides[1].trim();
    if (/^retired\b/i.test(right)) {
      arrows.push({ from, to: null, retired: true, unchanged: false });
      continue;
    }
    if (/^unchanged\b/i.test(right)) {
      arrows.push({ from, to: null, retired: false, unchanged: true });
      continue;
    }
    arrows.push({ from, to: parseRef(right), retired: false, unchanged: false });
  }
  return arrows;
}

function completeArrow(arrow) {
  return Boolean(arrow?.from?.rel && arrow.from.fragment && arrow.to?.rel && arrow.to.fragment);
}

function shapeKey(cell) {
  const value = String(cell ?? '').replace(/\*\*/g, '').trim().toLowerCase();
  if (value.includes('operation')) return 'op';
  if (value.includes('conservation') || value.includes('unique')) return 'conservation';
  if (value.includes('migration') || value.includes('heading')) return 'migration';
  if (value.includes('path') || value.includes('file')) return 'path';
  return null;
}

function receiptKey(cell) {
  const value = String(cell ?? '').replace(/\*\*/g, '').trim().toLowerCase();
  if (value.includes('unique') || value.includes('claim') || value.includes('conserv')) return 'claim';
  if (value.includes('successor') || value.includes('destination')) return 'successor';
  if (value.includes('old') || value.includes('from')) return 'old';
  return null;
}

function rowsInSection(text, section, classify) {
  if (!section) return [];
  const lines = section.body.split(/\r?\n/);
  let header = null;
  const rows = [];
  let cursor = section.offset;
  for (const line of lines) {
    const cells = splitRow(line);
    const lineNumber = lineNumberAt(text, cursor);
    cursor += line.length + 1;
    if (!cells || isSeparator(cells)) continue;
    const keys = cells.map(classify);
    if (!header && keys.filter(Boolean).length >= 2) {
      header = keys;
      continue;
    }
    if (!header || cells.length !== header.length) continue;
    const row = { line: lineNumber };
    header.forEach((key, index) => {
      if (key) row[key] = cells[index] ?? '';
    });
    rows.push(row);
  }
  return rows;
}

function parseShapeRows(text) {
  const section = sectionBody(text, SHAPE_HEADING);
  const rows = rowsInSection(text, section, shapeKey).map((row) => {
    const op = String(row.op ?? '').match(/\b(CREATE|SPLIT|MERGE|MOVE|RETIRE|NO-OP)\b/);
    const ref = parseRef(row.path ?? '');
    return {
      ...row,
      operation: op ? op[1] : null,
      rel: ref?.rel ?? null,
      fragment: ref?.fragment ?? null,
      arrows: parseMigrationCell(row.migration ?? ''),
    };
  });
  return { section, rows };
}

function parseSuccessor(cell) {
  const trimmed = String(cell ?? '').trim();
  if (/^retired\b/i.test(trimmed)) return { retired: true, unchanged: false, to: null };
  if (/^unchanged\b/i.test(trimmed)) return { retired: false, unchanged: true, to: null };
  return { retired: false, unchanged: false, to: parseRef(trimmed) };
}

function parseReceiptRows(text) {
  const section = sectionBody(text, RECEIPT_HEADING);
  const rows = rowsInSection(text, section, receiptKey).map((row) => ({
    ...row,
    old: parseRef(row.old ?? ''),
    successor: parseSuccessor(row.successor ?? ''),
  }));
  return { section, rows };
}

function inlineNewPaths(cell) {
  const text = String(cell ?? '');
  const found = new Set();
  const createRe = /\bCREATE\b/g;
  let match;
  while ((match = createRe.exec(text))) {
    const before = text.slice(Math.max(0, match.index - 32), match.index);
    if (/\b(?:do not|don't|without|not)\s+$/i.test(before)) continue;
    const ref = parseRef(text.slice(match.index, match.index + 300));
    if (ref) found.add(ref.rel);
  }
  if (/\b(?:SPLIT|MOVE)\b/.test(text)) {
    for (const arrow of parseMigrationCell(text)) {
      if (arrow.to?.rel) found.add(arrow.to.rel);
    }
  }
  return found;
}

function inlineLegacyPaths(cell) {
  const text = String(cell ?? '');
  const found = new Set();
  if (!/\b(?:SPLIT|MERGE|MOVE|RETIRE)\b/.test(text)) return found;
  for (const arrow of parseMigrationCell(text)) {
    if (arrow.from?.rel) found.add(arrow.from.rel);
  }
  return found;
}

function declaredNewMarkdown(text) {
  const found = new Set();
  for (const row of parseShapeRows(text).rows) {
    if (row.operation === 'CREATE' && row.rel) found.add(row.rel);
    if (row.operation === 'SPLIT' || row.operation === 'MOVE') {
      for (const arrow of row.arrows) {
        if (arrow.to?.rel) found.add(arrow.to.rel);
      }
    }
  }
  for (const cells of tableCells(text)) {
    for (const cell of cells) {
      for (const rel of inlineNewPaths(cell)) found.add(rel);
    }
  }
  return found;
}

function legacyMarkdown(text) {
  const found = new Set();
  for (const row of parseShapeRows(text).rows) {
    if (['SPLIT', 'MERGE', 'MOVE', 'RETIRE'].includes(row.operation) && row.rel) found.add(row.rel);
    for (const arrow of row.arrows) {
      if (arrow.from?.rel) found.add(arrow.from.rel);
    }
  }
  for (const row of parseReceiptRows(text).rows) {
    if (row.successor?.unchanged) continue;
    if (row.old?.rel) found.add(row.old.rel);
  }
  for (const cells of tableCells(text)) {
    for (const cell of cells) {
      for (const rel of inlineLegacyPaths(cell)) found.add(rel);
    }
  }
  return found;
}

function pathAllowance(mode, declaredNew, legacy) {
  return (rel) => {
    if (!String(rel).endsWith('.md')) return null;
    if (declaredNew.has(rel)) return 'skip';
    if (mode === 'close' && legacy.has(rel)) return 'skip';
    return null;
  };
}

function deniesRatification(cell) {
  return /\b(not ratified|unratified|remains proposed|not selected|do not ratify|is not ratified)\b/i.test(
    String(cell ?? ''),
  );
}

function claimNeedle(cell) {
  const text = String(cell ?? '').trim();
  const labeled = text.match(/^(?:unique negative|not ratified|conserved):\s*(.+)$/i);
  return (labeled ? labeled[1] : text).trim();
}

function includesClaim(text, needle) {
  const norm = (value) => String(value).toLowerCase().replace(/\s+/g, ' ').trim();
  return norm(text).includes(norm(needle));
}

function validatePlanRow(changePath, row, severity, repo, allowance = null) {
  const findings = [];
  const disposition = row.cells[1] ?? '';
  const bare = row.cells.slice(1).join(' ').replace(/\*\*/g, ' ');
  if (placeholder(disposition) || /\bdocs updated\b/i.test(disposition)) {
    findings.push(
      finding(
        changePath,
        severity,
        'plan-placeholder',
        row.line,
        row.key,
        `${row.key} needs a real disposition. N/A and "docs updated" are not a plan.`,
      ),
    );
    return findings;
  }
  const unchanged = /unchanged because\b/i.test(bare) || /\bunchanged:/i.test(bare);
  const changed = !unchanged && (/\bchange:/i.test(bare) || /\bchanged:/i.test(bare));
  if (!unchanged && !changed) {
    findings.push(
      finding(
        changePath,
        severity,
        'plan-missing-disposition',
        row.line,
        row.key,
        `${row.key} must say changed or unchanged because, with a concrete reason.`,
      ),
    );
    return findings;
  }
  const reason = bare
    .replace(/unchanged because/gi, '')
    .replace(/unchanged:/gi, '')
    .replace(/changed:/gi, '')
    .replace(/change:/gi, '')
    .trim();
  if (reason.length < 12) {
    findings.push(
      finding(
        changePath,
        severity,
        'plan-weak-reason',
        row.line,
        row.key,
        `${row.key} needs a concrete reason. A label alone is not a disposition.`,
      ),
    );
  }
  const paths = planPaths(row.cells);
  if (changed && paths.length === 0) {
    findings.push(
      finding(
        changePath,
        severity,
        'plan-missing-owner',
        row.line,
        row.key,
        `${row.key} says this plane changes and does not name an owner path.`,
      ),
    );
  }
  if (row.key === 'code' && changed && !/negative|disprove|reject/i.test(bare)) {
    findings.push(
      finding(
        changePath,
        severity,
        'plan-missing-negative',
        row.line,
        'code',
        'A code-bearing plan row needs its negative case.',
      ),
    );
  }
  if (repo) {
    for (const item of paths) {
      const heading = checkHeading(repo, changePath, item.rel, item.fragment, row.line, allowance);
      if (heading) findings.push({ ...heading, severity });
    }
  }
  return findings;
}

function planImpactFindings(changePath, text, repo, allowance = null) {
  const findings = [];
  const state = stateOf(text);
  const proposed = /\bproposed\b/i.test(state ?? '');
  const ready = /\bready\b/i.test(state ?? '') && !proposed;
  if (!declaresPlanSchema(text)) {
    if (ready) {
      const stateIndex = text.search(/\*\*State:?/i);
      findings.push(
        finding(
          changePath,
          'warning',
          'schema-upgrade',
          stateIndex >= 0 ? lineNumberAt(text, stateIndex) : 1,
          'planned-impact.v1',
          'This Ready packet has no planned-impact.v1 table. Upgrade it when it is selected. This guard does not fail the existing queue.',
        ),
      );
    }
    return findings;
  }
  const severity = proposed ? 'warning' : 'error';
  const section = planSection(text);
  if (!section) {
    findings.push(
      finding(
        changePath,
        severity,
        'missing-plan-section',
        null,
        'planned-impact.v1',
        'A planned-impact.v1 packet needs the Planned specification and implementation delta section.',
      ),
    );
    return findings;
  }
  const rows = planRows(section, text);
  const seen = new Map();
  for (const row of rows) {
    seen.set(row.key, row);
    findings.push(...validatePlanRow(changePath, row, severity, repo, allowance));
  }
  for (const key of PLAN_PLANES) {
    if (seen.has(key)) continue;
    findings.push(
      finding(
        changePath,
        severity,
        'plan-missing-plane',
        section.line,
        key,
        `The planned-impact.v1 table is missing the ${key} row.`,
      ),
    );
  }
  const product = seen.get('product');
  const code = seen.get('code');
  if (product && code) {
    const productText = product.cells.slice(1).join(' ');
    const codeText = code.cells.slice(1).join(' ');
    const combined = `${productText} ${codeText}`;
    if (
      /unchanged/i.test(productText) &&
      /unratified game promise|becomes the authority|rewrite the product to match/i.test(codeText) &&
      !/owner ratified|explicit owner decision/i.test(combined)
    ) {
      findings.push(
        finding(
          changePath,
          severity,
          'plan-contradiction',
          code.line,
          'code',
          'Code cannot become the authority for an unratified game promise while the product row says unchanged.',
        ),
      );
    }
  }
  return findings;
}

function planFindings(changePath, text, repo = null, mode = 'plan') {
  const findings = [];
  if (!titleOf(text)) {
    findings.push(finding(changePath, 'error', 'missing-title', 1, 'title', 'CHANGE.md needs an H1 title.'));
  }
  const state = stateOf(text);
  const stateIndex = text.search(/\*\*State:?/i);
  const stateLine = stateIndex >= 0 ? lineNumberAt(text, stateIndex) : 1;
  if (!state) {
    findings.push(finding(changePath, 'error', 'missing-state', stateLine, 'state', 'CHANGE.md needs a State line.'));
  }
  if (!/negative|must reject|disprove/i.test(text)) {
    findings.push(
      finding(
        changePath,
        'error',
        'missing-negative-proof',
        null,
        'negative proof',
        'Name a failure or negative case that would disprove the change.',
      ),
    );
  }
  if (!/[A-Za-z0-9_./()+\-]+\.[A-Za-z0-9]+/.test(text) && !/no intended code diff/i.test(text)) {
    findings.push(
      finding(
        changePath,
        'error',
        'missing-code-delta',
        null,
        'code scope',
        'Name the planned source path, or state that there is no intended code diff.',
      ),
    );
  }
  if (!/docs\/product|docs\/technical|\.agents\/|no product\/technical behavior/i.test(text)) {
    findings.push(
      finding(
        changePath,
        'error',
        'missing-owner',
        null,
        'authority',
        'Name a product, technical, or agent-rule owner, or state that no product/technical behavior is impacted.',
      ),
    );
  }
  const gm07 = gm07Finding(changePath, text);
  if (gm07) findings.push(gm07);
  const pathClaim = pathRatificationFinding(changePath, text);
  if (pathClaim) findings.push(pathClaim);
  const allowance = pathAllowance(mode, declaredNewMarkdown(text), legacyMarkdown(text));
  const shapeSeverity = /\bproposed\b/i.test(stateOf(text) ?? '') ? 'warning' : 'error';
  findings.push(...planImpactFindings(changePath, text, repo, allowance));
  findings.push(...shapePlanFindings(changePath, text, repo, mode, shapeSeverity, allowance));
  for (const item of claimImpactFindings(text)) {
    findings.push(finding(changePath, 'error', item.code, item.line, 'claim-impact', item.message));
  }
  return findings;
}

function checkHeading(repo, changePath, fileRel, fragment, line, allowance = null) {
  const resolved = resolveInsideRepo(repo, fileRel);
  if (!resolved) {
    return finding(changePath, 'error', 'unsafe-path', line, 'path', `Refused to resolve ${fileRel}.`);
  }
  if (!existsSync(resolved.abs)) {
    if (allowance && allowance(resolved.rel) === 'skip') return null;
    return finding(
      changePath,
      'error',
      'missing-path',
      line,
      'path',
      `${resolved.rel} does not exist at this worktree.`,
    );
  }
  if (!fragment || !resolved.rel.endsWith('.md')) return null;
  const parsed = parseMarkdownDocument(readText(resolved.abs));
  const ids = new Set(parsed.headings.map((heading) => heading.id));
  if (!ids.has(fragment)) {
    const sample = parsed.headings.slice(0, 6).map((heading) => heading.id).join(', ') || '(no headings)';
    return finding(
      changePath,
      'error',
      'missing-heading',
      line,
      'heading',
      `${resolved.rel} has no heading #${fragment}. Nearby ids: ${sample}.`,
    );
  }
  return null;
}

function exceptionCovers(text, rel) {
  const lines = text.split(/\r?\n/);
  return lines.some((line) => {
    if (!/^exception:/i.test(line.trim()) && !/\bexception:/i.test(line)) return false;
    return line.includes(rel) && /because\s+\S.{14,}/i.test(line);
  });
}

function closeFindings(repo, changePath, text, changedPaths, allowance = null) {
  const findings = [];
  const state = stateOf(text);
  const ledgerHeading = text.search(/^##\s+Reconciliation ledger/im);
  const { header, rows } = parseLedger(text);
  const reconciliation = ledgerHeading >= 0 ? text.slice(ledgerHeading) : '';
  if (!header || header.keys.filter(Boolean).length < LEDGER_KEYS.length || LEDGER_KEYS.some((key) => !header.keys.includes(key))) {
    const shallow = /docs updated|docs done/i.test(reconciliation || text);
    findings.push(
      finding(
        changePath,
        'error',
        shallow ? 'shallow-docs-checkbox' : 'missing-ledger',
        ledgerHeading >= 0 ? lineNumberAt(text, ledgerHeading) : null,
        'ledger',
        shallow
          ? 'A docs-updated checkbox is not a reconciliation ledger. Name the affected heading, source, tier, and negative proof.'
          : 'Close mode needs the affected-claim ledger and all seven columns.',
      ),
    );
    return findings;
  }
  if (rows.length === 0) {
    findings.push(
      finding(changePath, 'error', 'missing-ledger', header.line, 'ledger', 'The ledger has headings and no claim rows.'),
    );
  }
  for (const row of rows) {
    for (const key of LEDGER_KEYS) {
      if (row[key] == null) {
        findings.push(
          finding(changePath, 'error', 'malformed-ledger-row', row.line, key, 'This ledger row is missing a required column.'),
        );
      }
    }
    if (placeholder(row.affected) || placeholder(row.authority) || placeholder(row.status) || placeholder(row.negative)) {
      findings.push(
        finding(
          changePath,
          'error',
          'blank-ledger-field',
          row.line,
          'ledger',
          'Affected claim, authority, status, and negative proof must be filled in. N/A is not a reason.',
        ),
      );
    }
    if (!/(?:^|\b)(?:changed|unchanged|no product\/technical behavior impacted)\b/i.test(row.target ?? '')) {
      findings.push(
        finding(
          changePath,
          'error',
          'blank-ledger-field',
          row.line,
          'target delta',
          'Say changed, unchanged, or no product/technical behavior impacted, and give the reason.',
        ),
      );
    } else if (weakReason(reasonBody(row.target ?? ''))) {
      findings.push(
        finding(
          changePath,
          'error',
          'empty-unchanged-reason',
          row.line,
          'target delta',
          'Unchanged or changed needs a concrete reason. "not needed" and "docs updated" do not count.',
        ),
      );
    }
    const source = row.source ?? '';
    if (placeholder(source)) {
      findings.push(
        finding(changePath, 'error', 'blank-source-delta', row.line, 'source delta', 'Name the inspected source path and SHA, or say no source behavior changed.'),
      );
    }
    const claimsInspection = /source-observed|fixture-tested|tested|live-observed|implemented/i.test(row.status ?? '');
    const hasInspection = extractPaths(source).length > 0 || /[0-9a-f]{7,}/i.test(source) || /no source behavior/i.test(source);
    if (claimsInspection && !hasInspection) {
      findings.push(
        finding(
          changePath,
          'error',
          'status-without-inspection',
          row.line,
          'source delta',
          'A tested or source-observed tier needs an inspected path or SHA. The guard will not invent one.',
        ),
      );
    }
    if (isDone(state) && /not run/i.test(`${row.status ?? ''} ${row.source ?? ''}`)) {
      findings.push(
        finding(
          changePath,
          'error',
          'not-run-blocks-done',
          row.line,
          'state',
          'A not-run proof cannot be Done. Leave the packet open and name the remaining blocker.',
        ),
      );
    }
    const claimText = `${row.affected ?? ''} ${row.source ?? ''}`;
    for (const item of extractPaths(claimText)) {
      const heading = checkHeading(repo, changePath, item.rel, item.fragment, row.line, allowance);
      if (heading) findings.push(heading);
    }
    const productRewrite = /docs\/product/i.test(`${row.affected} ${row.authority}`)
      && /\bchanged\b/i.test(row.target ?? '')
      && /rewrite|looks compliant|match the (?:code|implementation)|rationaliz/i.test(row.target ?? '')
      && !/owner ratified|explicit owner decision/i.test(row.target ?? '');
    if (productRewrite) {
      findings.push(
        finding(
          changePath,
          'error',
          'needs-owner-review',
          row.line,
          'target delta',
          'needs independent owner review. The guard will not treat a product rewrite as proof that the code became compliant.',
        ),
      );
    }
  }
  const paid = paidClaimFinding(changePath, text);
  if (paid) findings.push(paid);
  const leaf = toRepoPath(changePath).replace(/\/CHANGE\.md$/i, '');
  for (const rel of changedPaths.map(toRepoPath)) {
    if (!rel || rel.startsWith(`${leaf}/`)) continue;
    if (text.includes(rel) || exceptionCovers(text, rel)) continue;
    findings.push(
      finding(
        changePath,
        'error',
        'undeclared-path',
        null,
        'source delta',
        `${rel} is in the diff and is not named by this packet. Declare it or add an exception with a because-reason.`,
      ),
    );
  }
  return findings;
}

function ledgerCovers(rows, rel) {
  return rows.some((row) => `${row.affected ?? ''}\n${row.source ?? ''}\n${row.target ?? ''}`.includes(rel));
}

function closeImpactFindings(repo, changePath, text, changedPaths, historyStatus) {
  if (!declaresPlanSchema(text)) return [];
  const findings = [];
  const proposed = /\bproposed\b/i.test(stateOf(text) ?? '');
  const severity = proposed ? 'warning' : 'error';
  if (historyStatus === 'unavailable') {
    findings.push(
      finding(
        changePath,
        'warning',
        'proof-blocked',
        null,
        'history',
        'History is shallow or unavailable. This guard will not treat the impact set as fresh.',
      ),
    );
  }
  let contractEdges = [];
  try {
    contractEdges = buildWikiModel(repo, { repoSha: null, dirty: true }).graph.contractEdges ?? [];
  } catch {
    findings.push(
      finding(changePath, 'warning', 'proof-blocked', null, 'graph', 'The contract graph could not be read. No freshness claim was made.'),
    );
    return findings;
  }
  const changed = changedPaths.map(toRepoPath);
  const changedSet = new Set(changed);
  const { rows } = parseLedger(text);
  for (const edge of contractEdges) {
    if (!changedSet.has(edge.to)) continue;
    if (ledgerCovers(rows, edge.from)) continue;
    findings.push(
      finding(
        changePath,
        severity,
        'missing-dependent-disposition',
        edge.line,
        edge.from,
        `Changing ${edge.to}#${edge.toAnchor} requires a disposition for ${edge.from}#${edge.fromAnchor} (${edge.relation}).`,
      ),
    );
  }
  const hasDependent = contractEdges.some((edge) => changedSet.has(edge.to));
  for (const row of rows) {
    if (!hasDependent || !/docs unaffected|no docs changes/i.test(row.target ?? '')) continue;
    findings.push(
      finding(
        changePath,
        severity,
        'blanket-disposition',
        row.line,
        'target delta',
        'A blanket docs-unaffected row cannot cover a known dependent.',
      ),
    );
  }
  for (const rel of changed) {
    if (!/^docs\/(product|technical)\//.test(rel)) continue;
    if (ledgerCovers(rows, rel)) continue;
    findings.push(
      finding(
        changePath,
        severity,
        'undeclared-changed-contract',
        null,
        rel,
        `${rel} changed and no ledger row disposes of that selected contract.`,
      ),
    );
  }
  for (const rel of changed) {
    if (!rel.endsWith('.md') || !rel.startsWith('docs/')) continue;
    if (!ledgerCovers(rows, rel)) continue;
    const namedHeading = rows.some((row) =>
      `${row.affected ?? ''}\n${row.source ?? ''}\n${row.target ?? ''}`.includes(`${rel}#`),
    );
    if (namedHeading) continue;
    findings.push(
      finding(
        changePath,
        'warning',
        'ambiguous-heading',
        null,
        rel,
        `${rel} changed and the ledger does not name a heading. Review the subsection before calling it fresh.`,
      ),
    );
  }
  if (historyStatus !== 'unavailable') {
    let citations = [];
    try {
      citations = citationEdges(repo, collectMaintainedPages(repo), (rel) =>
        readText(path.join(repo, ...rel.split('/'))),
      );
    } catch {
      citations = [];
    }
    const citedTargets = new Set(citations.map((edge) => edge.to));
    const contractTargets = new Set(contractEdges.map((edge) => edge.to));
    for (const edge of citations) {
      if (!changedSet.has(edge.to) || !edge.from.startsWith('docs/')) continue;
      if (ledgerCovers(rows, edge.from)) continue;
      if (contractEdges.some((item) => item.from === edge.from && changedSet.has(item.to))) continue;
      findings.push(
        finding(
          changePath,
          'warning',
          'citation-candidate',
          null,
          edge.from,
          `${edge.from} cites ${edge.to}. That is a review candidate, not a proof that the pages agree.`,
        ),
      );
    }
    let uncited = 0;
    for (const rel of changed) {
      if (!/^(?:packages|apps|tools|scripts)\//.test(rel)) continue;
      if (citedTargets.has(rel) || contractTargets.has(rel)) continue;
      uncited += 1;
      if (uncited > 10) continue;
      findings.push(
        finding(
          changePath,
          'warning',
          'no-known-relation',
          null,
          rel,
          `${rel} has no known contract edge or citation. That is an uncharted change, not a statement of no risk.`,
        ),
      );
    }
  }
  return findings;
}

function shapePlanFindings(changePath, text, repo, mode, severity, allowance) {
  const shape = parseShapeRows(text);
  if (!shape.section) return [];
  const findings = [];
  if (shape.rows.length === 0) {
    findings.push(
      finding(
        changePath,
        severity,
        'shape-missing-row',
        shape.section.line,
        'shape-ops.v1',
        'Document shape | shape-ops.v1 needs one row per CREATE, SPLIT, MERGE, MOVE, RETIRE, or NO-OP.',
      ),
    );
    return findings;
  }
  for (const row of shape.rows) {
    if (!row.operation) {
      findings.push(
        finding(
          changePath,
          severity,
          'shape-unknown-operation',
          row.line,
          'operation',
          'Operation must be CREATE, SPLIT, MERGE, MOVE, RETIRE, or NO-OP.',
        ),
      );
    }
    if (!row.rel) {
      findings.push(
        finding(
          changePath,
          severity,
          'shape-missing-path',
          row.line,
          'path',
          'Name the Markdown path for this file operation.',
        ),
      );
    }
    const conservation = String(row.conservation ?? '').trim();
    if (placeholder(conservation) || conservation.length < 12) {
      findings.push(
        finding(
          changePath,
          severity,
          'shape-weak-conservation',
          row.line,
          'conservation',
          'Say what meaning stays, or that a retired claim is not ratified.',
        ),
      );
    }
    if (row.operation === 'MERGE' && !/negative|must not|cannot|do not/i.test(`${conservation} ${row.migration ?? ''}`)) {
      findings.push(
        finding(
          changePath,
          severity,
          'shape-merge-drops-negative',
          row.line,
          'conservation',
          'A merge must name the unique negative constraint that the survivor keeps.',
        ),
      );
    }
    if (
      row.operation === 'RETIRE' &&
      !deniesRatification(conservation) &&
      !deniesRatification(row.migration ?? '')
    ) {
      findings.push(
        finding(
          changePath,
          severity,
          'retirement-ratifies',
          row.line,
          'conservation',
          'Retiring a page does not ratify its content. Say that the claim is not ratified.',
        ),
      );
    }
    if (row.operation === 'SPLIT' || row.operation === 'MERGE' || row.operation === 'MOVE') {
      const complete = row.arrows.filter(completeArrow);
      if (row.operation === 'SPLIT' && complete.length < 2) {
        findings.push(
          finding(
            changePath,
            severity,
            'shape-split-needs-two',
            row.line,
            'migration',
            'A split needs two old.md#heading -> new.md#heading migrations.',
          ),
        );
      } else if (complete.length < 1) {
        findings.push(
          finding(
            changePath,
            severity,
            'shape-bad-migration',
            row.line,
            'migration',
            'Use old.md#heading -> new.md#heading for this operation.',
          ),
        );
      }
    }
    if (row.operation === 'RETIRE') {
      const retired = row.arrows.some((arrow) => arrow.retired && arrow.from?.rel && arrow.from.fragment);
      if (!retired) {
        findings.push(
          finding(
            changePath,
            severity,
            'shape-bad-migration',
            row.line,
            'migration',
            'A retirement needs old.md#heading -> retired.',
          ),
        );
      }
    }
    if (repo && row.rel) {
      const heading = checkHeading(repo, changePath, row.rel, row.fragment, row.line, allowance);
      if (heading) findings.push({ ...heading, severity });
    }
    if (mode === 'plan' && repo && row.operation === 'MERGE') {
      for (const arrow of row.arrows.filter(completeArrow)) {
        const heading = checkHeading(repo, changePath, arrow.to.rel, arrow.to.fragment, row.line, null);
        if (heading) findings.push({ ...heading, severity });
      }
    }
  }
  return findings;
}

function issueTarget(repo, issue) {
  const href = String(issue.target ?? '').trim();
  if (!href || !issue.path) return '';
  const resolved = resolveHref(repo, issue.path, href);
  return toRepoPath(resolved.rel || resolved.requested || '');
}

function migrationCloseFindings(repo, changePath, text, changedPaths) {
  const findings = [];
  const shape = parseShapeRows(text);
  const receipt = parseReceiptRows(text);
  const declaredNew = declaredNewMarkdown(text);
  const changed = new Set((changedPaths ?? []).map(toRepoPath));
  for (const row of shape.rows) {
    if (row.operation !== 'NO-OP' || !row.rel || !changed.has(row.rel)) continue;
    findings.push(
      finding(
        changePath,
        'error',
        'noop-was-edited',
        row.line,
        row.rel,
        `${row.rel} is declared NO-OP and is in the diff.`,
      ),
    );
  }
  for (const rel of declaredNew) {
    const resolved = resolveInsideRepo(repo, rel);
    if (resolved && existsSync(resolved.abs)) continue;
    findings.push(
      finding(
        changePath,
        'error',
        'create-missing-at-close',
        null,
        rel,
        `${rel} was declared CREATE or as a split/move successor and does not exist at close.`,
      ),
    );
  }
  const needsGraph =
    Boolean(receipt.section) ||
    declaredNew.size > 0 ||
    shape.rows.some((row) => ['SPLIT', 'MERGE', 'MOVE', 'RETIRE'].includes(row.operation));
  if (!needsGraph) return findings;
  if (receipt.section && receipt.rows.length === 0) {
    findings.push(
      finding(
        changePath,
        'error',
        'receipt-missing-row',
        receipt.section.line,
        'shape-receipt.v1',
        'Migration receipt | shape-receipt.v1 needs one old owner, successor, and unique claim row.',
      ),
    );
  }
  let model = null;
  try {
    model = buildWikiModel(repo, { repoSha: null, dirty: true });
  } catch (error) {
    findings.push(
      finding(
        changePath,
        'error',
        'proof-blocked',
        null,
        'graph',
        `The wiki graph could not be read, so inbound anchors were not treated as healthy. ${error instanceof Error ? error.message : String(error)}`,
      ),
    );
    return findings;
  }
  const watch = new Set(declaredNew);
  for (const row of shape.rows) {
    if (row.rel && row.operation !== 'NO-OP') watch.add(row.rel);
    for (const arrow of row.arrows) {
      if (arrow.from?.rel) watch.add(arrow.from.rel);
      if (arrow.to?.rel) watch.add(arrow.to.rel);
    }
  }
  for (const row of receipt.rows) {
    if (!row.old?.rel || !row.old.fragment) {
      findings.push(
        finding(
          changePath,
          'error',
          'receipt-bad-row',
          row.line,
          'old owner',
          'The old owner must be path#heading.',
        ),
      );
    } else {
      watch.add(row.old.rel);
    }
    const claim = String(row.claim ?? '').trim();
    const needle = claimNeedle(claim);
    if (placeholder(claim) || needle.length < 12) {
      findings.push(
        finding(
          changePath,
          'error',
          'receipt-bad-row',
          row.line,
          'unique claim',
          'Name the unique claim that must survive, or the retired sentence that must not be ratified.',
        ),
      );
    }
    if (row.successor?.retired) {
      if (!deniesRatification(claim)) {
        findings.push(
          finding(
            changePath,
            'error',
            'retirement-ratifies',
            row.line,
            'successor',
            'A retired successor must say the old content is not ratified.',
          ),
        );
      }
      if (needle.length >= 20) {
        for (const node of model.graph.nodes) {
          if (node.id === row.old?.rel) continue;
          if (!/^docs\/(product|technical)\//.test(node.id)) continue;
          const abs = path.join(repo, ...node.id.split('/'));
          if (!existsSync(abs) || !includesClaim(readText(abs), needle)) continue;
          findings.push(
            finding(
              changePath,
              'error',
              'retirement-ratifies',
              row.line,
              node.id,
              `${node.id} contains the retired claim. Retiring a proposed page does not ratify it.`,
            ),
          );
        }
      }
      continue;
    }
    if (row.successor?.unchanged) {
      if (row.old?.rel && changed.has(row.old.rel)) {
        findings.push(
          finding(
            changePath,
            'error',
            'noop-was-edited',
            row.line,
            row.old.rel,
            `${row.old.rel} is an unchanged migration and is in the diff.`,
          ),
        );
      }
    } else if (!row.successor?.to?.rel || !row.successor.to.fragment) {
      findings.push(
        finding(
          changePath,
          'error',
          'receipt-bad-row',
          row.line,
          'successor',
          'Successor must be path#heading, retired, or unchanged.',
        ),
      );
      continue;
    } else {
      watch.add(row.successor.to.rel);
      const resolved = resolveInsideRepo(repo, row.successor.to.rel);
      if (!resolved || !existsSync(resolved.abs)) {
        findings.push(
          finding(
            changePath,
            'error',
            'create-missing-at-close',
            row.line,
            row.successor.to.rel,
            `${row.successor.to.rel} is a migration successor and does not exist at close.`,
          ),
        );
      }
    }
    const owner = row.successor?.unchanged ? row.old : row.successor?.to;
    if (!owner?.rel) continue;
    const resolved = resolveInsideRepo(repo, owner.rel);
    if (!resolved || !existsSync(resolved.abs)) continue;
    if (owner.fragment) {
      const heading = checkHeading(repo, changePath, owner.rel, owner.fragment, row.line, null);
      if (heading) findings.push(heading);
    }
    if (needle.length >= 12 && !includesClaim(readText(resolved.abs), needle)) {
      findings.push(
        finding(
          changePath,
          'error',
          'unique-claim-lost',
          row.line,
          owner.rel,
          `${owner.rel} does not contain the unique claim from ${row.old?.rel ?? 'the old owner'}#${row.old?.fragment ?? ''}.`,
        ),
      );
    }
  }
  for (const issue of model.issues) {
    if (issue.severity !== 'error') continue;
    if (!['broken-anchor', 'broken-path', 'directory-fragment'].includes(issue.code)) continue;
    const target = issueTarget(repo, issue);
    if (!watch.has(target)) continue;
    findings.push(
      finding(
        changePath,
        'error',
        'broken-inbound-anchor',
        issue.line,
        target,
        `${issue.path} still has a ${issue.code} to ${issue.target}. Inbound references to a created, split, moved, or merged owner must resolve.`,
      ),
    );
  }
  return findings;
}

/**
 * @param {{ repo: string, mode: 'plan' | 'close', changePath?: string | null, changedPaths?: string[], readmeText?: string, historyStatus?: string | null }} input
 */
export function guardChange(input) {
  const repo = input.repo;
  const mode = input.mode;
  const changedPaths = input.changedPaths ?? [];
  if (mode !== 'plan' && mode !== 'close') {
    return {
      schema: SCHEMA,
      mode,
      status: 'failed',
      change: null,
      findings: [finding(null, 'error', 'bad-mode', null, 'mode', 'Mode must be plan or close.')],
    };
  }
  if (!input.changePath) {
    const readme = input.readmeText ?? readText(path.join(repo, 'work', 'changes', 'README.md'));
    const selected = /Current change:\s*none/i.test(readme);
    return {
      schema: SCHEMA,
      mode,
      status: selected ? 'no-selected-change' : 'failed',
      change: null,
      findings: [
        finding(
          'work/changes/README.md',
          selected ? 'info' : 'error',
          selected ? 'no-selected-change' : 'change-not-specified',
          null,
          'change',
          selected
            ? 'No selected Change. That is a valid queue. This guard will not invent one.'
            : 'A Change appears selected. Pass --change. This guard will not choose one.',
        ),
      ],
    };
  }
  const changePath = toRepoPath(input.changePath).endsWith('/CHANGE.md') || toRepoPath(input.changePath).endsWith('CHANGE.md')
    ? toRepoPath(input.changePath)
    : `${toRepoPath(input.changePath).replace(/\/$/, '')}/CHANGE.md`;
  if (changePath.includes('work/changes/archive/')) {
    return {
      schema: SCHEMA,
      mode,
      status: 'historical',
      change: changePath,
      findings: [
        finding(
          changePath,
          'info',
          'historical-packet',
          null,
          'archive',
          'This archived packet is historical evidence, not current execution authority. The guard did not modify it.',
        ),
      ],
    };
  }
  const resolved = resolveInsideRepo(repo, changePath);
  if (!resolved || !existsSync(resolved.abs)) {
    return {
      schema: SCHEMA,
      mode,
      status: 'failed',
      change: changePath,
      findings: [finding(changePath, 'error', 'missing-change', null, 'change', 'CHANGE.md was not found under work/changes/open.')],
    };
  }
  const text = readText(resolved.abs);
  const allowance = pathAllowance(mode, declaredNewMarkdown(text), legacyMarkdown(text));
  const findings = planFindings(changePath, text, repo, mode);
  if (mode === 'close') {
    findings.push(...closeFindings(repo, changePath, text, changedPaths, allowance));
    findings.push(...closeImpactFindings(repo, changePath, text, changedPaths, input.historyStatus ?? null));
    findings.push(...migrationCloseFindings(repo, changePath, text, changedPaths));
  }
  const failed = findings.some((item) => item.severity === 'error');
  return {
    schema: SCHEMA,
    mode,
    status: failed ? 'failed' : 'ok',
    change: changePath,
    findings,
  };
}
