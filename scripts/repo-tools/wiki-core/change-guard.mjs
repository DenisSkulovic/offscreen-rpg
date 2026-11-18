/**
 * Read-only Change reconciliation guard. It checks that a packet names
 * affected claims, source, and negative proof. It does not decide whether a
 * product rule is true, and it never writes or deletes a file.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { citationEdges } from '../maintenance-core.mjs';
import { parseMarkdownDocument } from './markdown.mjs';
import { buildWikiModel, collectMaintainedPages } from './model.mjs';

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

function validatePlanRow(changePath, row, severity, repo) {
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
      const heading = checkHeading(repo, changePath, item.rel, item.fragment, row.line);
      if (heading) findings.push({ ...heading, severity });
    }
  }
  return findings;
}

function planImpactFindings(changePath, text, repo) {
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
    findings.push(...validatePlanRow(changePath, row, severity, repo));
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

function planFindings(changePath, text, repo = null) {
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
  findings.push(...planImpactFindings(changePath, text, repo));
  return findings;
}

function checkHeading(repo, changePath, fileRel, fragment, line) {
  const resolved = resolveInsideRepo(repo, fileRel);
  if (!resolved) {
    return finding(changePath, 'error', 'unsafe-path', line, 'path', `Refused to resolve ${fileRel}.`);
  }
  if (!existsSync(resolved.abs)) {
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

function closeFindings(repo, changePath, text, changedPaths) {
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
      const heading = checkHeading(repo, changePath, item.rel, item.fragment, row.line);
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
  const findings = planFindings(changePath, text, repo);
  if (mode === 'close') {
    findings.push(...closeFindings(repo, changePath, text, changedPaths));
    findings.push(...closeImpactFindings(repo, changePath, text, changedPaths, input.historyStatus ?? null));
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
