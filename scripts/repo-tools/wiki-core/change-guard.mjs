/**
 * Read-only Change reconciliation guard. It checks that a packet names
 * affected claims, source, and negative proof. It does not decide whether a
 * product rule is true, and it never writes or deletes a file.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parseMarkdownDocument } from './markdown.mjs';

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

function planFindings(changePath, text) {
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

/**
 * @param {{ repo: string, mode: 'plan' | 'close', changePath?: string | null, changedPaths?: string[], readmeText?: string }} input
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
  const findings = planFindings(changePath, text);
  if (mode === 'close') findings.push(...closeFindings(repo, changePath, text, changedPaths));
  const failed = findings.some((item) => item.severity === 'error');
  return {
    schema: SCHEMA,
    mode,
    status: failed ? 'failed' : 'ok',
    change: changePath,
    findings,
  };
}
